const Worker = require('./Worker')
const { logger } = require('../../loaders/logger')
const { orm } = require('../../loaders/sequelize')
const { socketIOLoader } = require('../../loaders/socketio')
const { fetchMangaData, fetchExtraMangaData, fetchMangaChapters, downloadAssets } = require('./MangaCommon')
const { compareUpdateMangas } = require('../../mappings/manga-mapping')
const _ = require('lodash')
const services = require('../../services')

class LibraryUpdateWorkerWorker extends Worker {
  /**
   * Process a library update job.
   *
   * @param {Object} job - The job to be processed.
   * @returns {Promise<void>}
   */
  processJob (job) {
    return LibraryUpdateWorkerWorker.#update()
  }

  /**
   * Update library with additional data retrieval and processing.
   *
   * @returns {Promise<Object>} - A success or error response.
   */
  static async #update () {
    // fetch all mangas from db that are monitored
    const mangas = await orm.manga.findAll({ where: { isDeleted: false, monitor: true } })
    for (const manga of mangas) {
      logger.info(`Processing library update job for '${manga.canonicalTitle}'.`)
      const lastUpdate = new Date(manga.updatedAt)
      const now = new Date()
      const diff = Math.abs(now - lastUpdate)
      const minutes = Math.floor((diff / 1000) / 60)

      // Skip manga if recently updated
      if (minutes > 2 * 30) {
        const id = manga.id
        const externalIds = manga.externalIds
        const lookupAgents = await services.agents.agentsEnabledForCapability('MANGA_METADATA_FETCH')
        const metadataAgents = []
        const extraAgents = []

        lookupAgents.forEach(agent => {
          // check if agent ID is in externalIds
          if (externalIds[agent.id] != null) {
            metadataAgents.push(agent.id)
          } else {
            extraAgents.push(agent.id)
          }
        })

        // Update the manga's state to indicate it's being processed
        await orm.manga.update({ state: 1 }, { where: { id }, returning: true, plain: true })
        const data = await fetchMangaData(externalIds, metadataAgents)
        await downloadAssets(data)
        await fetchExtraMangaData(data, extraAgents)
        const updatedManga = compareUpdateMangas(manga, data)

        updatedManga.id = id
        updatedManga.state = 2
        updatedManga.externalIds = _.defaultsDeep(updatedManga.externalIds, manga.externalIds)
        updatedManga.externalLinks = _.defaultsDeep(updatedManga.externalLinks, manga.externalLinks)
        updatedManga.updatedAt = new Date()

        await fetchMangaChapters(updatedManga)
        await orm.manga.update(updatedManga, { where: { id } }, { returning: true, plain: true })
      } else {
        logger.info(`Skipping '${manga.canonicalTitle}' because it was recently updated.`)
      }
    }
    socketIOLoader.emit('MANGA_UPDATE', { id: 0, title: 'all' })
    return { success: true, code: 200, body: 'OK' }
  }
}

module.exports = LibraryUpdateWorkerWorker
