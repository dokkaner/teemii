const { agents } = require('../core/agentsManager')
const { AgentCapabilities } = require('../core/agent')
const { orm } = require('../loaders/sequelize.js')
const { logger } = require('../loaders/logger')
const queueManager = require('../libra/queues/QueueManager')
const { Job } = require('../libra/jobs/Job')
const { v4: uuidv4 } = require('uuid')
const { configManager } = require('../loaders/configManager')
const services = require('./index')
const { getLastGreaterChapterProgress, computeMangaProgressFromScrobbler } = require('./readingService')

const scrobblerEntryStatus = Object.freeze({
  CURRENT: 'current',
  COMPLETED: 'completed',
  PAUSED: 'on_hold',
  DROPPED: 'dropped',
  PLAN_TO_READ: 'planned'
})

const MAX_MANGA_IMPORT_PER_RUN = 10

/**
 * Calculates the read progress of a manga based on its chapter count and read progress percentage.
 * Ensures the manga data is valid and handles edge cases gracefully.
 *
 * @param {Object} manga - The manga object with chapterCount and readProgress properties.
 * @returns {number} The calculated read progress, or 0 in case of invalid data or errors.
 */
async function getReadProgress (manga) {
  try {
    // Validate manga data
    if (!manga || typeof manga.chapterCount !== 'number' || typeof manga.readProgress !== 'number') {
      logger.error('Invalid manga data for calculating read progress')
      return 0
    }
    const progress = await getLastGreaterChapterProgress(manga)
    return Math.round(Number(progress.chapterNumber))
  } catch (e) {
    logger.error({ err: e }, 'Failed to get read progress')
    return 0
  }
}

class ScrobblersManager {
  constructor () {
    this.scrobblers = []
    this.mangasToImport = {}
    this.mangasToSync = []
    this.scrobblersSettings = {}
    this.scrobblersSecurity = {}
    this.PushTotal = 0
    this.PullTotal = 0
    this.PushErrors = 0
    this.PullErrors = 0
    this.needInit = true
  }

  queueSync (manga) {
    this.mangasToSync.push(manga.id)
  }

  async #queueManga (title, year, author, agent, id, trackingId) {
    const key = `${title}_${year}`
    const agentID = agent.id
    if (!this.mangasToImport[key]) {
      this.mangasToImport[key] = { title, year, author, id, agentID, trackingIds: {} }
    }
    this.mangasToImport[key].trackingIds[agent.id] = trackingId
  }

  async processMangaImports () {
    for (const key in this.mangasToImport) {
      const { title, year, author, id, agentID, trackingIds } = this.mangasToImport[key]

      const manga = await agents.searchMangaByTitleYearAuthors(title, [], year, author, [])
      if (manga && manga.externalIds?.[agentID] === id) {
        logger.info(`Scrobbler #importManga found: ${title} (${year}), ID: ${id}`)

        const jobData = {
          for: 'mangaImportQueue',
          options: { timeout: 600000 }, // 10 minutes
          payload: {
            id,
            title,
            year,
            externalIds: manga.externalIds,
            source: agentID,
            tracking: trackingIds
          },
          entityId: id
        }

        const job = new Job(uuidv4(), jobData, 0, jobData.options.retryInterval, jobData.options.timeout)
        await job.initialize()
        const queue = queueManager.getQueue(jobData.for)
        await queue.addJob(job)
        // wait 30 seconds between manga imports
        await new Promise(resolve => setTimeout(resolve, 30000))
      }
      if (manga) {
        logger.warn(`Scrobbler #importManga Manga found by title, year, and author, but ID doesn't match: ${title} (${year}), ID: ${id}`)
      } else {
        logger.warn(`Scrobbler #importManga Manga not found by title, year, and author: ${title} (${year}), ID: ${id}`)
      }
    }
    this.mangasToImport = {}
  }

  /**
   * Creates a scrobbler entry object for a manga with the tracking status, progress, and other relevant data.
   * Handles different scenarios for manga reading status and progress.
   *
   * @param {Object} manga - The manga object with relevant tracking and progress information.
   * @param {Object} agent - The agent object used for tracking.
   * @returns {Object} The scrobbler entry object with tracking details.
   */
  async #scrobblerEntry (manga, agent) {
    const now = new Date()
    return {
      status: manga.readProgress > 0 ? scrobblerEntryStatus.CURRENT : scrobblerEntryStatus.PLAN_TO_READ,
      progress: await getReadProgress(manga),
      rating: manga.userRating,
      trackingId: manga.scrobblersKey?.[agent.id] ?? null,
      mediaId: manga.externalIds?.[agent.id] ?? null,
      startedAt: (manga.scrobblersKey?.[agent.id] && manga.readProgress > 0) ? now : null,
      finishedAt: manga.readProgress === 100 ? now : null
    }
  }

  /**
   * Saves the scrobblers settings and updates their status based on login success.
   * @param {string} name - The name of the scrobbler.
   * @param {object} settings - The scrobbler settings to save.
   * @param {object} security - The scrobbler security details.
   */
  async saveScrobblersSettings (name, settings, security) {
    const scrobblers = configManager.get('preferences.integrations')

    // Update the settings and security for the specific scrobbler
    scrobblers[name] = { scrobbler: settings, security }

    // Attempt to log in and update the status accordingly
    try {
      scrobblers[name].scrobbler.status = 1 // Status indicating a successful login
      // encrypt the password
      if (security.password) {
        configManager.set(`preferences.integrations.${name}.security.password`, security.password, true)
      }
      await configManager.saveConfig()
      await agents.agent(name).instance.login()
      await this.registerScrobblers()
    } catch (e) {
      logger.error({ e }, 'Error processing updateScrobblers request')
      scrobblers[name].scrobbler.status = 3 // Status indicating a login failure
    }

    // Persist the updated settings regardless of login outcome
    configManager.set('preferences.integrations', scrobblers)
  }

  /**
   * Determines the status of a scrobbler based on its enabled state and login status.
   *
   * @param {boolean} isEnabled - Indicates if the scrobbler is enabled.
   * @param {boolean} isLoggedIn - Indicates if the scrobbler is currently logged in.
   * @returns {number} The status code of the scrobbler (0 = disabled, 1 = connected, 3 = needs attention).
   */
  determineScrobblerStatus (isEnabled, isLoggedIn) {
    if (!isEnabled) {
      return 0 // Disabled
    }
    return isLoggedIn ? 1 : 3 // 1 = Connected, 3 = Needs attention
  }

  /**
   * Registers agents with SCROBBLER capability to the scrobblers list.
   * Iterates through each agent and adds them to the scrobblers array if they have SCROBBLER capability.
   */
  async registerScrobblers () {
    // be sure that the conf entries are up-to-date
    const currentsAgents = configManager.get('preferences.integrations')
    if (!currentsAgents) {
      await services.preferences.defaultScrobblersEntries()
    }

    const scrobblerAgents = agents.getAgents([AgentCapabilities.SCROBBLER])
    this.scrobblers = []
    for (const agent of scrobblerAgents) {
      this.scrobblers.push(agent)
    }

    this.scrobblersSettings = {}
    this.scrobblersSecurity = {}

    for (const agent of this.scrobblers) {
      const settings = configManager.get(`preferences.integrations.${agent.id}.scrobbler`)
      const security = configManager.get(`preferences.integrations.${agent.id}.security`)

      let pwd = security.password ?? ''
      if (pwd) {
        pwd = configManager.get(`preferences.integrations.${agent.id}.security.password`, true)
      }

      this.scrobblersSettings[agent.id] = {}
      this.scrobblersSettings[agent.id].Sync2Way = settings.Sync2Way ?? false
      this.scrobblersSettings[agent.id].ImportNew = false // settings.ImportNew ??
      this.scrobblersSettings[agent.id].enabled = settings.enabled ?? false
      // status: 0 = disabled, 1 = connected, 2 = syncing, 3 = needs attention
      // if disabled = 0, if enabled and logged in = 1, if enabled and not logged in = 3
      this.scrobblersSettings[agent.id].status = this.determineScrobblerStatus(settings.enabled, agent.instance.loggedIn)
      this.scrobblersSettings[agent.id].excludedGenres = settings.excludedGenres ?? []
      this.scrobblersSettings[agent.id].serviceURL = agent.instance.url ?? ''
      this.scrobblersSettings[agent.id].logo = agent.instance.logoURL ?? ''

      this.scrobblersSecurity[agent.id] = {}
      this.scrobblersSecurity[agent.id].username = security.username ?? ''
      this.scrobblersSecurity[agent.id].password = pwd
      this.scrobblersSecurity[agent.id].token = security.token ?? ''
      this.scrobblersSecurity[agent.id].loginRedirectURL = agent.instance.loginRedirectURL ?? ''
    }

    logger.info(`Registered ${this.scrobblers.length} scrobblers`)
  }

  getSettings () {
    return { settings: this.scrobblersSettings, security: this.scrobblersSecurity }
  }

  getStatistics () {
    return {
      PushTotal: this.PushTotal,
      PullTotal: this.PullTotal,
      PushErrors: this.PushErrors,
      PullErrors: this.PullErrors
    }
  }

  /**
   * Checks if any of the provided genres are in the list of excluded genres.
   * Iterates through each genre in the input array and returns true if any genre matches an excluded genre.
   * @param {string} agentName - The name of the agent to check.
   * @param {Array} genres - Array of genres to check against excluded genres.
   * @returns {boolean} - True if any genre is excluded, otherwise false.
   */
  #genresAreExcluded (agentName, genres) {
    for (const genre of genres) {
      if (this.scrobblersSettings[agentName].excludedGenres.includes(genre)) return true
    }
    return false
  }

  /**
   * Updates the tracking ID for a specific agent in the manga object.
   * It retrieves the existing tracking IDs, sets or updates the tracking ID for the specified agent,
   * and then persists these changes to the database.
   * @param {Object} manga - The manga object to update.
   * @param {Object} agent - The agent for which the tracking ID should be updated.
   * @param {Number} trackingId - The new tracking ID to set.
   */
  async #updateTrackingId (manga, agent, trackingId) {
    const scrobblersKey = manga.scrobblersKey ?? {}
    scrobblersKey[agent.id] = trackingId
    manga.scrobblersKey = scrobblersKey

    await orm.manga.update({ scrobblersKey }, { where: { id: manga.id } })
  }

  async #processScrobblerResults (results, agent, updatedEntries, importedMangas) {
    let localUpdatedEntries = updatedEntries
    for (const result of results ?? []) {
      const manga = await orm.manga.findOne({ where: { externalIds: { [agent.id]: result.mangaId } } })
      if (!manga) {
        if (importedMangas >= MAX_MANGA_IMPORT_PER_RUN || !this.scrobblersSettings[agent.id].ImportNew) continue
        importedMangas++
        await this.#queueManga(result.mangaTitle, result.mangaYear, result.mangaAuthors, agent, result.mangaId, result.id)
        continue
      }

      if (this.scrobblersSettings[agent.id].Sync2Way) {
        localUpdatedEntries++
        await this.#updateTrackingId(manga, agent, Number(result.id))
        await computeMangaProgressFromScrobbler(manga, result.progress)
      }
    }
    return localUpdatedEntries
  }

  /**
   * Pulls updates from all registered scrobblers.
   * Processes each result to update manga's read progress in the local database.
   * Handles errors gracefully and logs important information for monitoring and debugging.
   */
  async #scrobblerPull () {
    logger.info('Pulling updates from scrobblers...')
    let updatedEntries = 0
    let errors = 0
    const importedMangas = 0

    for (const agent of this.scrobblers) {
      try {
        // check if agent is enabled and logged in
        if (!this.scrobblersSettings[agent.id].enabled || !agent.instance.loggedIn) continue

        const results = await agent.instance.scrobblerPull()
        updatedEntries += await this.#processScrobblerResults(results, agent, updatedEntries, importedMangas)
      } catch (error) {
        errors++
        logger.error(`Error pulling from scrobbler for agent ID ${agent.id}: ${error}`)
      }
    }

    this.PullTotal = updatedEntries
    this.PullErrors = errors
    logger.info(`Scrobbler pulled ${updatedEntries} total entries from scrobblers with ${errors} errors.`)
  }

  /**
   * Pushes updates to all scrobblers for each manga in the database.
   * Iterates through each scrobbler agent and manga, checking if the manga's genres are excluded.
   * If not, it creates a scrobbler entry and pushes it to the respective agent.
   * Updates the tracking ID in the database if it's a new entry and the push was successful.
   */
  async #scrobblerPush () {
    logger.info('Pushing updates to scrobblers...')
    const mangas = await orm.manga.findAll({})
    let updatedEntries = 0
    let errors = 0

    for (const agent of this.scrobblers.filter(a => a.instance.loggedIn)) {
      const mangasToPush = this.needInit ? mangas : mangas.filter(manga => this.mangasToSync.includes(manga.id))

      for (const manga of mangasToPush) {
        if (this.#genresAreExcluded(agent.id, manga.genres)) continue

        try {
          const entry = await this.#scrobblerEntry(manga, agent)
          const result = await agent.instance.scrobblerPush(entry)

          if (result?.status === 'success') {
            await this.#updateTrackingId(manga, agent, Number(result.id))
            updatedEntries++
          } else if (result?.status === 'error') {
            errors++
            await this.#updateTrackingId(manga, agent, null)
            logger.warn(`Error pushing to scrobbler for manga ID ${manga.id} and agent ID ${agent.id}: ${result.message}`)
          }
        } catch (error) {
          errors++
          logger.error(`Error pushing to scrobbler for manga ID ${manga.id} and agent ID ${agent.id}: ${error}`)
        }
      }
    }

    this.needInit = false
    this.mangasToSync = []
    this.PushTotal = updatedEntries
    this.PushErrors = errors
    logger.info(`Scrobbler pushed ${updatedEntries} total entries to scrobblers with ${errors} errors.`)
  }

  #setScrobblersStatus (status) {
    for (const agent of this.scrobblers) {
      // check if agent is enabled and logged in
      if (!this.scrobblersSettings[agent.id].enabled || !agent.instance.loggedIn) continue
      this.scrobblersSettings[agent.id].status = status
    }
  }

  async sync () {
    logger.info('Syncing updates with scrobblers...')
    if (this.mangasToImport.length > 0) {
      logger.info('Syncing updates with scrobblers... waiting for manga imports to finish')
      return {
        success: false,
        code: 400,
        body: 'Syncing updates with scrobblers... waiting for manga imports to finish'
      }
    }
    this.#setScrobblersStatus(2) // 2 = syncing
    this.PushTotal = 0
    this.PullTotal = 0
    this.PushErrors = 0
    this.PullErrors = 0
    this.getSettings()
    await this.#scrobblerPull()
    await this.#scrobblerPush()
    logger.info('Finished syncing updates with scrobblers.')
    await this.processMangaImports()
    this.#setScrobblersStatus(1) // 1 = connected
    return { success: true, code: 200, body: 'OK' }
  }
}

const scrobblersManager = new ScrobblersManager()

module.exports = { scrobblersManager }
