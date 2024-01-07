const Fuse = require('fuse.js')
const { morphism } = require('morphism')
const { orm } = require('../loaders/sequelize.js')
const crypto = require('crypto')
const { logger } = require('../loaders/logger.js')

// Maximum number of errors allowed before deactivating the agent.
// This number should be set based on how critical the errors are and how often they are expected.
const MAX_ERRORS = 5

// Time window for counting errors in milliseconds.
// This defines how long an error remains relevant for the error count.
// For example, 10 minutes can be a reasonable window.
const ERROR_WINDOW = 10 * 60 * 1000 // 10 minutes in milliseconds

// Time to wait before reactivating the agent in milliseconds.
// This should be long enough to allow any temporary issues to resolve themselves,
// but not so long that it significantly disrupts the service.
const REACTIVATION_TIME = 10 * 60 * 1000 // 10 minutes in milliseconds

const AgentCapabilities = Object.freeze({
  MANGA_CROSS_LOOKUP: 0,
  MANGA_METADATA_FETCH: 1,
  CHAPTER_FETCH: 2,
  MANGA_BASIC_RECOMMENDATIONS: 3,
  MANGA_ADVANCED_RECOMMENDATIONS: 4,
  OPT_AUTH: 5,
  SCROBBLER: 6
})

/**
 * Filters a list of mangas based on a specific year, if provided.
 * If no year is provided, or no manga is found for the given year, defaults to the first manga.
 *
 * @param {Array} mangas - Array of manga objects to filter.
 * @param {string} name - Name of the manga (used for logging).
 * @param {number} year - The year to filter the mangas by.
 * @param {number} bias - The bias to use when filtering mangas by year.
 * @returns {Object} The filtered manga, or the first manga if no year is specified or no match is found.
 */
function filterMangasByYear (mangas, name, year, bias = 0) {
  // Filter mangas by year if a year is provided and there are mangas available
  if (!year || mangas?.length === 0) {
    return mangas[0] || null
  }

  const filtered = [...mangas]
  return filtered.filter(
    manga => Math.abs(Number(manga.year) - Number(year)) <= bias
  )[0] || null
}

/**
 * Filters a list of mangas based on a specific author or authors, if provided.
 * Uses a fuzzy search to match authors to the mangas. If a match is found with a high enough score,
 * it selects that manga.
 *
 * @param {Array} mangas - Array of manga objects to filter.
 * @param {string} name - Name of the manga (used for logging).
 * @param {Array} authors - Array of authors to filter the mangas by.
 * @returns {Object|null} The manga that matches the author criteria, or null if no match is found.
 */
function filterMangasByAuthors (mangas, name, authors) {
  if (authors?.length === 0 || mangas?.length === 0) {
    return null
  }

  for (const manga of mangas) {
    const options = { includeScore: true }
    const fuse = new Fuse(manga.authors, options)

    for (const author of authors) {
      const results = [fuse.search(author), fuse.search(author.split(' ').reverse().join(' '))]

      // Check if any result has a score less than 0.3
      if (results.some(result => result.length > 0 && result[0]?.score < 0.3)) {
        return manga
      }
    }
  }

  return null
}

class Agent {
  constructor () {
    this.id = ''
    this.label = ''
    this.url = ''
    this.credits = ''
    this.tags = []
    this.iconURL = ''
    this.logoURL = ''
    this.options = ''
    this.lang = []
    this.caps = []
    this.host = ''
    this.sourceURL = ''
    this.priority = 50
    this.coverPriority = 0
    this.supportPagination = true
    this.loggedIn = false
    this.loginRedirectURL = ''
    // ---
    this.limiter = {}
    this.funcGetMangaById = null
    this.mangaSchema = {}
    this.lookupSchema = {}
    this.chapterSchema = {}
    this.characterSchema = {}
    this.recommendationsSchema = {}
    this.pageSchema = {}
    this.scrobblerSchema = {}
    this.funcPreRecoSchema = null
    this.funcPrePageSchema = null
    this.funcPostMangaSchema = null
    this.funcPostLookupSchema = null
    this.funcHelperLookupMangas = null
    this.funcHelperLookupChapters = null
    this.funcHelperChapterPagesURLByChapterId = null
    this.funcHelperLookupRecommendations = null
    this.helperLookupRecommendations = null
    this.helperLookupCharacters = null
    this.helperScrobblerPull = null
    this.helperScrobblerPush = null
    this.loginRedirectURL = ''
    this.offsetInc = 100
    this.maxPages = 3
    this.cacheEnabled = false
    this.errorTimestamps = []
    this.isActive = true
  }

  /**
   * Handles an error occurrence within the agent.
   * Adds the current timestamp to the errorTimestamps array,
   * cleans out old timestamps, and deactivates the agent if the error threshold is exceeded.
   */
  handleError () {
    const now = Date.now()
    this.errorTimestamps.push(now)
    this.cleanErrorTimestamps(now)

    logger.warn(`${this.id}: Error occurred, error count: ${this.errorTimestamps.length}`)
    if (this.errorTimestamps.length > MAX_ERRORS && this.isActive) {
      logger.warn(`${this.id}: Deactivating agent due to excessive errors.`)
      this.isActive = false
      setTimeout(() => this.reactivateAgent(), REACTIVATION_TIME)
    }
  }

  /**
   * Cleans the errorTimestamps array by removing timestamps that are outside the error window.
   * @param {number} currentTime - The current time in milliseconds.
   */
  cleanErrorTimestamps (currentTime) {
    this.errorTimestamps = this.errorTimestamps.filter(timestamp =>
      currentTime - timestamp < ERROR_WINDOW)
  }

  /**
   * Reactivates the agent after it has been deactivated.
   * Clears the errorTimestamps array and sets the agent's active status to true.
   */
  reactivateAgent () {
    logger.warn(`${this.id}: Reactivating agent.`)
    this.errorTimestamps = []
    this.isActive = true
  }

  /**
   * Retrieves cached values based on the given key and objectType.
   * It computes a hash for the key to look up the cached value, checks for expiry,
   * and returns the value if it is still valid.
   *
   * @param {string} objectType The type of the object to be retrieved from cache.
   * @param {object} key The key object used to generate a unique hash for caching.
   * @returns {Promise<string|null>} The cached value if available and not expired, otherwise null.
   */
  async getCacheValues (objectType, key) {
    // Directly return null if caching is not enabled
    if (!this.cacheEnabled) {
      return null
    }

    // Generate a unique cache key using MD5 hash
    const hash = crypto.createHash('md5').update(JSON.stringify(key)).digest('hex')

    // Attempt to retrieve the cache object from the storage
    const object = await orm.storage.findOne({
      where: { callerId: this.id, type: objectType, key: hash },
      raw: true
    }).catch(e => {
      // If an error occurs, log it and return null to prevent application crash
      logger.error({ err: e }, `${this.id}: Error retrieving cache for ${objectType}`)
      return null // Return null to handle the error without re-throwing
    })

    // If an object is not found or an error occurred, null will be returned
    if (!object) return null

    // Calculate the elapsed time since the object was last updated
    const now = new Date()
    const elapsed = now - new Date(object.updatedAt)

    // Check if the cache has expired
    if (isNaN(elapsed) || elapsed > object.ttl) {
      logger.trace(`${this.id}: ${objectType} - Cache for key expired or updatedAt invalid.`)
      return null
    }

    // If cache is valid, return the value
    return object.value
  }

  /**
   * Caches a value with a specific key and type, with an optional Time To Live (TTL).
   * It uses an MD5 hash of the key to ensure a unique cache entry.
   *
   * @param {string} objectType The type of the object to be cached.
   * @param {object} key The key object to be hashed and used for storing the cache.
   * @param {string} value The value to be cached.
   * @param {number} ttl The time to live for the cache in milliseconds. Defaults to 1 day.
   * @returns {Promise<void>}
   */
  async storeCacheValues (objectType, key, value, ttl = 1000 * 60 * 60 * 24) {
    // Return early if caching is disabled.
    if (!this.cacheEnabled) {
      logger.trace(`${this.id}: Caching is disabled, skipping storing values for ${objectType}.`)
      return
    }

    // Generate a unique cache key using MD5 hash.
    const hashKey = crypto.createHash('md5').update(JSON.stringify(key)).digest('hex')

    // Construct the cache object.
    const cacheObject = {
      callerId: this.id,
      type: objectType,
      key: hashKey,
      value,
      ttl,
      updatedAt: new Date() // Use a Date object instead of timestamp for better compatibility.
    }

    try {
      // Attempt to upsert the cache object into storage.
      await orm.storage.upsert(cacheObject)
      logger.debug(`${this.id}: Successfully stored cache for ${objectType} with key hash ${hashKey}.`)
    } catch (e) {
      // Log any errors during cache storage.
      logger.error({ err: e }, `${this.id}: Error storing cache for ${objectType}`)
    }
  }

  /**
   * Maps the input data to the given schema and optionally filters out duplicate entries.
   * This method is designed for performance and should be used with large datasets where efficiency is crucial.
   *
   * @param {Object} schema The schema definition used for mapping the data.
   * @param {Array} data The array of data to be mapped.
   * @param {boolean} [filterDuplicates=false] Flag to determine if duplicate items should be filtered out.
   * @param {string} [dupKey='id'] The key to use for identifying duplicates.
   * @returns {Array} The mapped and optionally deduplicated array of data.
   */
  noFilterResult (schema, data, filterDuplicates = false, dupKey = 'id') {
    // Early exit if there's no data to process.
    if (!Array.isArray(data) || data.length === 0) {
      return []
    }

    // Map the data to the schema using morphism.
    const mapped = morphism(schema, data)

    // If not filtering duplicates, return the mapped data immediately.
    if (!filterDuplicates) {
      return mapped
    }

    // Filter out duplicates by constructing a Map with unique keys.
    const uniqueResults = new Map(mapped.map((item) => [item[dupKey], item]))

    // Return the de-duplicated data as an array.
    return Array.from(uniqueResults.values())
  }

  /**
   * Filters results based on a search query and a scoring threshold. It maps the input data
   * using a specified schema and performs a fuzzy search to find matching items.
   *
   * @param {string} q The search query string.
   * @param {Object} schema The schema to which the input data should be mapped.
   * @param {Array} data The data to be searched through.
   * @param {number} maxFuseScore The maximum score threshold for including an item in the result.
   * @param {Array} keys The keys within the schema items to search against.
   * @param {Array} [alts=[]] The alternative keys within the schema items to search against.
   * @returns {Array} An array of items that match the search query and score criteria.
   */
  filteredResult (q, schema, data, maxFuseScore, keys, alts = []) {
    // Return an empty array immediately if there's no data to process.
    if (!Array.isArray(data) || data.length === 0) {
      return []
    }

    // Map the data to the provided schema.
    const mappedData = morphism(schema, data)

    // Initialize Fuse.js with the mapped data and provided keys for searching.
    const fuse = new Fuse(mappedData, {
      includeScore: true,
      keys,
      threshold: maxFuseScore // Use the maximum score as the threshold for Fuse.js.
    })

    // Conduct the search and filter based on the maximum score.
    const fuseResults = fuse.search(q).filter(item => item.score <= maxFuseScore)

    // If there are alternative keys, conduct a second search and filter based on the maximum score.
    if (alts.length > 0) {
      // for each alt use them as a query and filter the results
      for (const alt of alts) {
        const altFuseResults = fuse.search(alt).filter(item =>
          item.score <= maxFuseScore
        )
        fuseResults.push(...altFuseResults)
      }
    }

    // Return the filtered and mapped results.
    return fuseResults.map(item => item.item)
  }

  // -----------------------------------------------------------------------------------------------------------------
  /**
   * Searches for mangas with a given query.
   *
   * @param {string} query - The search string.
   * @returns {Promise<Array>} - A promise that resolves to an array of search results.
   */
  async searchMangas (query) {
    const start = performance.now()

    try {
      // Use the limiter to schedule the lookup task.
      const rawResults = await this.limiter.schedule(() => this.funcHelperLookupMangas(this.host, query, 0, 1))

      // Filter the results based on a schema and threshold.
      const filteredResults = this.filteredResult(query, this.lookupSchema, rawResults, 0.3, ['title', 'synonyms'])

      // Apply post-lookup schema modification if available.
      for (const manga of filteredResults) {
        this.funcPostLookupSchema?.(manga)
        manga.source = this.id
      }

      // Log the execution time for the search operation.
      const end = performance.now()
      logger.trace(`${this.id} searchMangas execution time: ${(end - start).toFixed(1)} ms`)

      return filteredResults
    } catch (e) {
      logger.error({ err: e }, 'Error during searchMangas:')
      this.handleError()
      return []
    }
  }

  async lookupMangaBasedRecommendations (id, limit = 10) {
    const start = performance.now()
    try {
      const mangas = await this.funcHelperLookupRecommendations(id, limit)

      return this.noFilterResult(this.recommendationsSchema, mangas)
    } catch (e) {
      logger.error({ err: e }, 'Error during lookupMangaBasedRecommendations:')
      this.handleError()
      return []
    } finally {
      const end = performance.now()
      logger.trace(`${this.id} lookupMangaBasedRecommendations time: ${(end - start).toFixed(1)} ms`)
    }
  }

  /**
   * Performs a scrobbler push operation for a given entry.
   * This method schedules the push operation using a limiter and logs the time taken for the operation.
   *
   * @param {Object} entry - The scrobbler entry data to be pushed.
   * @returns {Promise<Array>} - A promise that resolves to the result of the push operation.
   */
  async scrobblerPush (entry) {
    const start = performance.now()
    try {
      if (!entry.mediaId) {
        logger.warn(`${this.id} scrobblerPush - No mediaId provided`)
        return []
      }
      return await this.limiter.schedule(() => this.helperScrobblerPush(this.host, entry))
    } catch (e) {
      logger.error({ err: e }, 'Error during scrobblerPush:')
      throw e
    } finally {
      const end = performance.now()
      logger.trace(`${this.id} scrobblerPush time: ${(end - start).toFixed(1)} ms`)
    }
  }

  /**
   * Performs a scrobbler pull operation.
   *
   * @returns {Promise<Array|*[]>}
   */
  async scrobblerPull () {
    const start = performance.now()
    let offset = 0
    let page = 1
    const unmappedResults = []
    try {
      let currentPageResults
      do {
        currentPageResults = await this.limiter.schedule(() => this.helperScrobblerPull(this.host, offset, page))
        unmappedResults.push(...currentPageResults)
        offset += this.offsetInc
        page++
      } while (currentPageResults.length > 0 && page <= this.maxPages)

      return this.noFilterResult(this.scrobblerSchema, unmappedResults)
    } catch (e) {
      logger.error({ err: e }, 'Error during scrobblerPull:')
      this.handleError()
      return []
    } finally {
      const end = performance.now()
      logger.trace(`${this.id} scrobblerPull time: ${(end - start).toFixed(1)} ms`)
    }
  }

  /**
   * Looks up mangas based on a query and compiles a list from paginated results.
   *
   * @param {string} query - The search query for the manga.
   * @param {Array} [altTitles=[]] - The alternative titles of the manga for more accurate filtering.
   * @returns {Promise<Array>} - A promise that resolves to an array of manga information.
   */
  async lookupMangas (query, altTitles = []) {
    const start = performance.now()
    let offset = 0
    let page = 1
    const unmappedMangas = []

    try {
      if (this.supportPagination) {
        // Paginate through the manga results until maxPages is reached or no more results are found.
        let currentPageResults
        do {
          currentPageResults = await this.limiter.schedule(() =>
            this.funcHelperLookupMangas(this.host, query, offset, page))
          unmappedMangas.push(...currentPageResults)
          offset += this.offsetInc
          page++
        } while (currentPageResults.length > 0 && page <= this.maxPages)
      } else {
        // If pagination is not supported, fetch the first page of results.
        unmappedMangas.push(...await this.limiter.schedule(() =>
          this.funcHelperLookupMangas(this.host, query, offset, page)))
      }

      // Filter and map the results using a given schema.
      const results = this.filteredResult(query, this.lookupSchema, unmappedMangas, 0.3, ['title', 'altTitles'], altTitles)

      // Apply a post-lookup schema modification function if defined.
      if (this.funcPostLookupSchema) {
        for (const manga of results) {
          this.funcPostLookupSchema(manga)
        }
      }

      // Log the execution time for the lookup operation.
      const end = performance.now()
      logger.trace(`${this.id} lookupMangas execution time: ${(end - start).toFixed(1)} ms`)

      return results
    } catch (e) {
      logger.error({ err: e }, 'Error during lookupMangas:')
      this.handleError()
      return []
    }
  }

  /**
   * Retrieves manga details by its unique ID.
   *
   * @param {Object} ids - An object that contains the ID of the manga.
   * @returns {Promise<Object|null>} - A promise that resolves to the manga object or null if not found.
   */
  async getMangaById (ids) {
    // Validate the ID input; log a warning and return null if the ID is not provided.
    if (!ids?.id) {
      logger.warn(`${this.id}: Invalid ID provided for getMangaById`)
      return null
    }

    try {
      const start = performance.now()

      // Schedule the request within the limiter's constraints.
      const mangaData = await this.limiter.schedule(() => this.funcGetMangaById(this.host, ids))

      // Apply the predefined schema filter to the result.
      const filteredResults = this.noFilterResult(this.mangaSchema, [mangaData])

      // Execute post-schema function if defined.
      if (this.funcPostMangaSchema) {
        this.funcPostMangaSchema(filteredResults[0])
      }

      const end = performance.now()
      // Log the time taken to execute the function.
      logger.trace(`${this.id} getMangaById execution time: ${(end - start).toFixed(1)} ms`)
      filteredResults[0] ? logger.info(`${this.id}: Found manga for ID: ${ids.id}`) : logger.warn(`${this.id}: Manga not found for ID: ${ids.id}`)
      return filteredResults[0]
    } catch (e) {
      // handle http status code 404
      if (e.response?.status === 404) {
        logger.warn(`${this.id}: Manga not found for ID: ${ids.id}`)
        return null
      }
      // Log any errors encountered during execution.
      logger.error({ err: e, agent: this, id: ids }, 'Error in getMangaById, ID:')
      this.handleError()
      return null
    }
  }

  /**
   * Retrieves characters for a given manga ID, paginated by `offsetInc`.
   *
   * @param {string} mangaId - The unique identifier for the manga.
   * @returns {Promise<Array>} - A promise that resolves to an array of character objects.
   */
  async lookupCharactersByMangaId (mangaId) {
    if (!mangaId) {
      logger.warn(`${this.id}: Invalid mangaId provided for lookupCharactersByMangaId`)
      return []
    }

    try {
      const start = performance.now()
      let page = 1
      let offset = 0
      const characters = []

      // Initial fetch of characters
      let charactersBatch = await this.helperLookupCharacters(this.host, mangaId, offset, page)

      while (charactersBatch.length > 0) {
        characters.push(...charactersBatch)
        page += 1
        offset += this.offsetInc
        charactersBatch = await this.helperLookupCharacters(this.host, mangaId, offset, page)
      }

      const end = performance.now()
      logger.trace(`${this.id} lookupCharactersByMangaId execution time: ${(end - start).toFixed(1)} ms`)

      return this.noFilterResult(this.characterSchema, characters)
    } catch (e) {
      logger.error({ err: e }, 'Error in lookupCharactersByMangaId:')
      this.handleError()
      return []
    }
  }

  /**
   * Retrieves all chapters for a given manga ID, optionally filtered by language.
   * Pagination is handled by incrementing page and offset.
   *
   * @param {object} ids - The manga ID for which chapters are being looked up.
   * @param {string|null} [lang=null] - Optional language code to filter chapters.
   * @returns {Promise<Array>} - A promise that resolves to an array of chapter objects.
   */
  async lookupChaptersByMangaId (ids, lang = null) {
    if (!ids) {
      logger.error(`${this.id}: Invalid manga ID provided for lookupChaptersByMangaId.`)
      return []
    }
    logger.info(`${this.id}: Looking up chapters for manga ID: ${ids.id}`)
    const start = performance.now()

    try {
      let page = 1
      let offset = 0
      const chapters = []
      let batch = await this.limiter.schedule(() => this.funcHelperLookupChapters(this.host, ids, offset, page, lang))

      while (batch.length > 0) {
        chapters.push(...batch)
        page += 1
        offset += this.offsetInc
        batch = await this.limiter.schedule(() => this.funcHelperLookupChapters(this.host, ids, offset, page, lang))
      }

      const filteredChapters = lang
        ? chapters.filter(chapter => {
          const chapterLang = chapter.lang || chapter.attributes?.translatedLanguage || ''
          if (!chapterLang) {
            logger.warn('Chapter language is empty for chapter:', chapter)
          }
          return chapterLang.toLowerCase() === lang.toLowerCase()
        })
        : chapters

      logger.info(`${this.id}: Found ${filteredChapters.length} chapters for manga ID: ${ids.id}`)
      const end = performance.now()
      logger.trace(`${this.id} lookupChaptersByMangaId execution time: ${(end - start).toFixed(1)} ms`)
      return this.noFilterResult(this.chapterSchema, filteredChapters)
    } catch (e) {
      logger.error({ err: e }, 'Error in lookupChaptersByMangaId:')
      this.handleError()
      return []
    }
  }

  /**
   * Searches for manga by its name with optional year and author filters. Cache results.
   *
   * @param {string} name - The name of the manga to search for.
   * @param {array} [altTitles=null] - The alternative titles of the manga for more accurate filtering.
   * @param {number|null} [year=null] - The publication year of the manga for more accurate filtering.
   * @param {array} [authors=[]] - The authors of the manga for more accurate filtering.
   * @returns {Promise<object|array>} - A promise that resolves to a manga object or an empty array if not found.
   */
  async getMangaByName (name, altTitles, year = null, authors = []) {
    const start = performance.now()

    const key = { name, year }
    try {
      const cached = await this.getCacheValues('manga', key)
      if (cached) {
        logger.trace(`${this.id} getMangaByName - Cached: ${name}, ${year}`)
        return JSON.parse(cached)
      }

      const mangas = await this.lookupMangas(name, altTitles)
      let manga = mangas[0] || null

      manga = year ? filterMangasByYear(mangas, name, year, 2) : manga
      manga = (!manga && authors) ? filterMangasByAuthors(mangas, name, authors) : manga

      if (!manga) {
        logger.warn(`${this.id} getMangaByName - Not found: ${name}, ${year}`)

        if (!(mangas.length === 1 && mangas[0].title === name)) return []
        logger.info(`${this.id} getMangaByName - Found manga with same name, but different year / author`)
        manga = mangas[0]
      }

      const result = await this.getMangaById({ id: manga.id, url: manga.url })
      if (result?.id) {
        await this.storeCacheValues('manga', key, JSON.stringify(result))
      }

      logger.info(`${this.id} getMangaByName - Found: ${manga.title}. Query: ${name}, ${year}`)
      return result || []
    } catch (error) {
      logger.error(`${this.id} getMangaByName - Error: ${error.message}`)
      this.handleError()
      return []
    } finally {
      const end = performance.now()
      logger.trace(`${this.id} getMangaByName time: ${(end - start).toFixed(1)} ms`)
    }
  }

  /**
   * Retrieves the page URLs for a given chapter identifier.
   * Applies pre-schema mapping if defined and then a final schema mapping to the result.
   *
   * @param {Object} ids - The identifiers for the chapter, typically including chapter id, and potentially other metadata.
   * @returns {Promise<Array|Null>} - A promise that resolves to an array of page URLs or null if an error occurs.
   */
  async grabChapterPagesURLByChapterId (ids) {
    const start = performance.now()

    try {
      // Schedule the retrieval of chapter pages URL using a rate limiter
      const pageData = await this.limiter.schedule(() => this.funcHelperChapterPagesURLByChapterId(this.host, ids))

      // Apply pre-mapping schema if one is defined, otherwise use the raw data
      const unmappedPages = this.funcPrePageSchema ? this.funcPrePageSchema(pageData, ids) : pageData

      // for each page, add the referer
      for (const page of unmappedPages) {
        page.referer = this.url
      }

      // Log the execution time for fetching chapter pages URL
      const end = performance.now()
      logger.trace(`${this.id} grabChapterPagesURLByChapterId execution time: ${(end - start).toFixed(1)} ms`)

      // Apply final filtering and mapping to the result
      return this.noFilterResult(this.pageSchema, unmappedPages)
    } catch (error) {
      // Log the error with more details
      logger.error(`${this.id} grabChapterPagesURLByChapterId - Error: ${error.message}`)
      this.handleError()
      return null
    }
  }

  /**
   * Fetches recommendations based on the provided query and within a set limit.
   * Paginate requests to fetch up to the maximum allowed pages.
   *
   * @param {string} ask - The search query or criteria for recommendations.
   * @param {number} limit - The maximum number of recommendations to fetch.
   * @returns {Promise<Array>} - A promise that resolves to an array of recommended manga objects or an empty array if an error occurs.
   */
  async lookupRecommendations (ask, limit) {
    const start = performance.now()
    let page = 1
    const recommendations = []

    try {
      // Initial request for recommendations
      let currentBatch = await this.limiter.schedule(() => this.helperLookupRecommendations(this.host, ask, limit, 0, page))

      while (currentBatch && currentBatch.length > 0 && page <= this.maxPages) {
        // Apply pre-mapping schema if one is defined
        if (this.funcPreRecoSchema) {
          currentBatch = this.funcPreRecoSchema(currentBatch)
        }

        // Aggregate the recommendations
        recommendations.push(...currentBatch)

        // Prepare for the next iteration
        page += 1
        currentBatch = await this.limiter.schedule(() => this.helperLookupRecommendations(this.host, ask, limit, 0, page))
      }

      // Log the execution time for fetching recommendations
      const end = performance.now()
      logger.trace(`${this.id} lookupRecommendations execution time: ${(end - start).toFixed(1)} ms`)

      // Apply final filtering and mapping to the results
      return this.noFilterResult(this.lookupSchema, recommendations, true, 'id')
    } catch (error) {
      // Log the error and return an empty array to maintain consistency
      logger.error(`${this.id} lookupRecommendations - Error: ${error.message}`)
      return []
    }
  }
}

module
  .exports = { Agent, AgentCapabilities }
