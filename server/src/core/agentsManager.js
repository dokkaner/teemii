const fs = require('fs')
const {
  validateSchema,
  refLookupSchema,
  refMangaSchema,
  refChapterSchema,
  refPageSchema
} = require('../core/schemas.js')
const { logger } = require('../loaders/logger.js')
const { AgentCapabilities } = require('./agent.js')
const _ = require('lodash')
require('../utils/agent.utils')
require('fuse.js')

class AgentsManager {
  // #region private
  #internalAgents

  // turn on/off cache for each agent
  async setCacheMode (active) {
    for (const a of this.#internalAgents) {
      a.instance.cacheEnabled = active
    }
  }

  async #loadAgents (list, relFolder, folder) {
    fs.readdirSync(relFolder).forEach(file => {
      const Agent = {}
      Agent.file = folder + file
      Agent.Require = require(Agent.file)
      Agent.instance = new Agent.Require()
      Agent.id = Agent.instance.id
      Agent.caps = Agent.instance.caps
      Agent.limiter = Agent.instance.limiter
      Agent.priority = Agent.instance.priority || 50
      // --
      Agent.getCanonicalID = Agent.instance.getCanonicalID
      Agent.funcGetMangaById = Agent.instance.funcGetMangaById
      Agent.mangaSchema = Agent.instance.mangaSchema
      Agent.lookupSchema = Agent.instance.lookupSchema
      Agent.chapterSchema = Agent.instance.chapterSchema
      Agent.characterSchema = Agent.instance.characterSchema
      Agent.pageSchema = Agent.instance.pageSchema
      Agent.funcPreRecoSchema = Agent.instance.funcPreRecoSchema
      Agent.funcPrePageSchema = Agent.instance.funcPrePageSchema
      Agent.funcPostMangaSchema = Agent.instance.funcPostMangaSchema
      Agent.funcPostLookupSchema = Agent.instance.funcPostLookupSchema
      Agent.funcHelperLookupMangas = Agent.instance.funcHelperLookupMangas
      Agent.funcHelperLookupChapters = Agent.instance.funcHelperLookupChapters
      Agent.funcHelperChapterPagesURLByChapterId = Agent.instance.funcHelperChapterPagesURLByChapterId
      Agent.helperLookupRecommendations = Agent.instance.helperLookupRecommendations
      Agent.helperLookupCharacters = Agent.instance.helperLookupCharacters
      Agent.offsetInc = Agent.instance.offsetInc || 100
      Agent.maxPages = Agent.instance.maxPages || 3
      logger.trace(file, 'load agent')

      // validate schemas
      validateSchema(refLookupSchema, Agent.lookupSchema, Agent.id, 'lookupSchema')
      validateSchema(refMangaSchema, Agent.mangaSchema, Agent.id, 'mangaSchema')
      validateSchema(refChapterSchema, Agent.chapterSchema, Agent.id, 'chapterSchema')
      validateSchema(refPageSchema, Agent.pageSchema, Agent.id, 'pageSchema')

      this.#internalAgents.push(Agent)
    })
  }

  // #endregion

  // #region public
  constructor () {
    this.#internalAgents = []
  }

  async initialize () {
    await this.#loadAgents(this.#internalAgents, './src/agents/', '../agents/')
  }

  get internalAgents () {
    return this.#internalAgents
  }

  agent (id) {
    return this.#internalAgents.find((el) => el.id === id)
  }

  /**
   * return a list of coverPriority for each agent
   */
  getCoverPriority (agentsToExclude = []) {
    // return ID:priority
    const coverPriority = {}
    for (const a of this.#internalAgents) {
      if (agentsToExclude.includes(a.id)) {
        coverPriority[a.id] = 999
        continue
      }
      coverPriority[a.id] = a.instance.coverPriority
    }
    return coverPriority
  }

  /**
   * Attempts to fetch manga information by ID, with a single retry in case of failure.
   *
   * @param {object} data - The data object containing agent and ID information.
   * @returns {Promise<{source: string, result: any} | null>} An object containing the agent source
   *          and the fetched manga information or null if both attempts fail.
   */
  async #runAgentRequestGetManga (data) {
    // Define the structure of the IDs object once, as it's reused.
    const IDs = { url: null, id: data.id }

    // Helper function to execute the manga fetch operation.
    const fetchManga = async () => {
      try {
        return {
          source: data.agent.id,
          result: await data.agent.instance.getMangaById(IDs)
        }
      } catch (e) {
        logger.error({ err: e }, `Error for agent ${data.agent.id}`)
        return null
      }
    }

    // First attempt to fetch the manga.
    const result = await fetchManga()
    if (result) {
      return result
    }

    // If the first attempt fails, wait a short interval and then retry once.
    // The delay helps mitigate the chance of immediate consecutive failures due to temporary issues.
    await new Promise(resolve => setTimeout(resolve, 1000))
    return fetchManga()
  }

  /**
   * Tries to fetch manga chapter information by ID, retrying once if the first attempt fails.
   *
   * @param {object} data - The data object containing agent, ID, and language information.
   * @returns {Promise<{source: string, result: any} | null>} - An object containing the agent source
   *          and the fetched chapter information or null if both attempts fail.
   */
  async #runAgentRequestGetMangaChapter (data) {
    // Define the parameters for chapter lookup once.
    const chapterParams = { url: null, id: data.id }

    // Helper function to perform the chapter lookup.
    const lookupChapters = async () => {
      try {
        return {
          source: data.agent.id,
          result: await data.agent.instance.lookupChaptersByMangaId(chapterParams, data.lang)
        }
      } catch (e) {
        logger.error({ err: e }, `Error for agent ${data.agent.id}`)
        return null
      }
    }

    // First attempt to fetch the chapters.
    const result = await lookupChapters()
    if (result) {
      return result
    }

    // If the first attempt fails, wait a brief period before retrying.
    // The delay can help with transient issues like rate limits or temporary network errors.
    await new Promise(resolve => setTimeout(resolve, 1000))
    // Retrying without language parameter was likely a bug in the original code, so ensure
    // the retry also includes the language parameter.
    return lookupChapters()
  }

  /**
   * Fetches the URLs for pages of a chapter by its source ID using a specified agent. Retries once if the initial attempt fails.
   *
   * @param {string} chapterSourceId - The ID of the chapter to grab the pages for.
   * @param {string} agentId - The ID of the agent to use for fetching the chapter pages.
   * @returns {Promise<Array<string> | null>} - A list of page URLs or null if the process fails after one retry.
   */
  async grabChapterById (chapterSourceId, agentId) {
    const agent = this.#internalAgents.find((el) => el.id === agentId)
    if (!agent) {
      logger.error(`Agent with ID ${agentId} not found.`)
      return null
    }

    // Helper function to perform the grab chapter pages action.
    const grabPages = async () => {
      try {
        const IDs = { url: null, id: chapterSourceId }
        return await agent.instance.grabChapterPagesURLByChapterId(IDs)
      } catch (e) {
        logger.error({ err: e }, `Error for agent ${agent.id}`)
        return null
      }
    }

    // First attempt to fetch the chapter pages.
    const result = await grabPages()
    if (result) {
      return result
    }

    // If the first attempt fails, we wait for a short delay before the retry.
    await new Promise(resolve => setTimeout(resolve, 1000))
    // Second attempt to fetch the chapter pages.
    return grabPages()
  }

  /**
   * Searches for manga chapters using specified IDs and agents, with an optional language filter.
   * This method returns the successful results after executing the agent's chapter search.
   *
   * @param {Object} IDs - An object mapping agent IDs to manga IDs.
   * @param {Array<object>} agents - An optional list of agent IDs to include in the search.
   * @param {string|null} lang - An optional language specifier to filter the search.
   * @returns {Promise<Array>} - A promise that resolves to an array of successful search results.
   */
  async searchMangaChapters (IDs, agents = [], lang = null) {
    const start = performance.now()
    const searchPromises = []

    // Loop over each agent ID provided in the IDs object
    for (const agentId in IDs) {
      if (!(agentId in IDs && IDs[agentId] !== Object.prototype[agentId])) continue

      // Skip if a specific list of agents is provided and the current ID is not included
      // n.b: agents is an array of objects, not strings
      if (agents.length > 0 && !agents.map((a) => a.id).includes(agentId)) continue

      const mangaId = IDs[agentId]
      if (mangaId) {
        const agent = this.#internalAgents.find((el) => el.id === agentId)
        if (agent) {
          const data = { agent, id: mangaId, lang }
          // Instead of awaiting each request, push the promise to an array to run in parallel
          searchPromises.push(this.#runAgentRequestGetMangaChapter(data))
        }
      }
    }

    // Wait for all the search operations to settle (either fulfill or reject)
    const results = await Promise.allSettled(searchPromises)

    const end = performance.now()
    logger.trace(`searchMangaChapters execution time: ${(end - start).toFixed(1)} ms`)

    // Filter out only fulfilled promises and extract their values
    return results
      .filter(result => result.status === 'fulfilled')
      .map(result => result.value)
  }

  /**
   * Searches for manga across different agents using various identifiers.
   * Handles specific logic for 'kitsu' and 'mangaupdates' agents to retrieve canonical IDs.
   *
   * @param {Object} IDs - An object mapping agent IDs to their external manga IDs.
   * @param {Array<string>} agents - Optional list of agent IDs to include in the search.
   * @returns {Promise<Array>} - A promise that resolves to an array of search results.
   */
  async searchManga (IDs, agents = []) {
    const start = performance.now()
    const searchPromises = []

    for (const agentId in IDs) {
      if (!(agentId in IDs && IDs[agentId] !== Object.prototype[agentId])) continue

      if (agents.length && !agents.includes(agentId)) continue

      const agent = this.#internalAgents.find((a) => a.id === agentId)
      if (agent) {
        let searchId = IDs[agentId]
        if (['kitsu', 'mangaupdates'].includes(agent.id)) {
          // Convert to canonical ID if necessary, asynchronously
          searchId = await agent.instance.getCanonicalID(searchId)
        }
        // Only add to the promises array if a valid searchId is obtained
        if (searchId) {
          const data = { agent, id: searchId }
          searchPromises.push(this.#runAgentRequestGetManga(data))
        }
      }
    }

    // Handle all promises together to utilize concurrency
    const results = await Promise.allSettled(searchPromises)

    const end = performance.now()
    logger.trace(` searchManga execution time: ${(end - start).toFixed(1)} ms`)

    // Filter only successfully resolved promises and map to their values
    return results
      .filter((result) => result.status === 'fulfilled')
      .map((result) => result.value)
  }

  /**
   * Searches for manga by title and year across specified agents.
   * Merge results from different sources into a single unified object.
   *
   * @param {string} title - The title of the manga to search for.
   * @param {Array<string>} altTitles - The alternative titles of the manga.
   * @param {number} year - The release year of the manga.
   * @param {string} authors - The author of the manga.
   * @param {Array<string>} agents - Optional list of agent IDs to narrow down the search.
   * @returns {Promise<Object|null>} - A promise that resolves to a unified result object or null if no results are found.
   */
  async searchMangaByTitleYearAuthors (title, altTitles, year, authors, agents = []) {
    if (!title) return null
    const searchPromises = []
    for (const agent of this.#internalAgents) {
      // Check if agents array is specified and contains the current agent's ID
      if (agents.length && !agents.includes(agent.instance.id)) {
        continue
      }
      // Handle individual promise rejections
      try {
        // remove special characters from title
        let sanitisedTitle = title.replace(/[^\w\s!]/gi, '').trim()
        sanitisedTitle = sanitisedTitle.replace(/\s{2,}/g, ' ')
        const promise = agent.instance.getMangaByName(sanitisedTitle, altTitles, year, authors)
        searchPromises.push(promise)
      } catch (e) {
        logger.error({ err: e }, `Error searching manga by title and year for agent ${agent.instance.id}`)
      }
    }

    try {
      const results = await Promise.all(searchPromises)
      // Use reduce to merge the results
      const unified = results.reduce((acc, result) => {
        return result ? _.defaultsDeep(acc, result) : acc
      }, {})

      return Object.keys(unified).length > 0 ? unified : null
    } catch (e) {
      logger.error({ err: e }, 'Error in searchMangaByTitleYear')
      return null
    }
  }

  async searchMangaBasedRecommendations (IDs, agents = []) {
    const start = performance.now()
    const searchPromises = []

    for (const agentId in IDs) {
      if (!(agentId in IDs && IDs[agentId] !== Object.prototype[agentId])) continue

      // Skip if a specific list of agents is provided and the current ID is not included
      // n.b: agents is an array of objects, not strings
      if (agents.length > 0 && !agents.map((a) => a.id).includes(agentId)) continue

      const agent = this.#internalAgents.find((a) => a.id === agentId)
      if (agent) {
        searchPromises.push(agent.instance.lookupMangaBasedRecommendations(IDs[agentId]))
      }
    }

    const results = await Promise.allSettled(searchPromises)

    const end = performance.now()
    logger.trace(`searchMangaBasedRecommendations execution time: ${(end - start).toFixed(1)} ms`)

    return results
      .filter((result) => result.status === 'fulfilled')
      .map((result) => result.value)
  }

  async agentsLogin () {
    try {
      for (const a of this.#internalAgents) {
        if (a.caps.includes(AgentCapabilities.OPT_AUTH)) {
          await a.instance.login()
        }
      }
    } catch (e) {
      logger.error({ err: e }, 'Something went wrong while logging in to agents')
    }
  }

  getAgents (caps = []) {
    if (caps.length === 0) {
      return this.#internalAgents
    }
    const agents = []
    for (const a of this.#internalAgents) {
      // check if agent has all the capabilities
      if (caps.every((cap) => a.caps.includes(cap))) {
        agents.push(a)
      }
    }
    return agents
  }

  // #endregion
}

const agents = new AgentsManager()

module.exports = { agents }
