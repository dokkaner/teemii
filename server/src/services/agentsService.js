const utils = require('../utils/agent.utils')
const { agents } = require('../core/agentsManager')
const _ = require('lodash')
const { logger } = require('../loaders/logger')
const services = require('./index.js')

async function determineSearchTerms (term, forceSearch) {
  if (forceSearch) {
    return [term]
  } else {
    const altTitle = await utils.userPreferredMangaTitle(term)
    return (term.toUpperCase() !== altTitle.toUpperCase()) ? [altTitle] : [term]
  }
}

async function matchByMangaupdatesId (manga, existingManga) {
  // if one of the manga is from mangaupdates, match by mangaupdates id
  const mu = manga.source === 'mangaupdates' ? manga : existingManga
  const other = manga.source === 'mangaupdates' ? existingManga : manga

  // take mu id from other
  const muId = other.externalIds?.mangaupdates
  let match = false
  if (muId) {
    const searchId = await agents.agent('mangaupdates').instance.getCanonicalID(muId)
    match = (searchId.toString() === mu.id.toString())
  }
  return match
}

const CRITERIA_WEIGHTS = {
  title: 2,
  authors: 2,
  year: 2,
  genres: 1
}

async function matchManga (manga, existingManga, yearDifference = 2) {
  let matchScore = 0
  const totalWeight = Object.values(CRITERIA_WEIGHTS).reduce((sum, weight) => sum + weight, 0)

  if (manga.title && existingManga.title && manga.title.toLowerCase() === existingManga.title.toLowerCase()) {
    matchScore += CRITERIA_WEIGHTS.title
  }

  if (manga.authors && existingManga.authors && manga.authors.some(author => existingManga.authors.includes(author))) {
    matchScore += CRITERIA_WEIGHTS.authors
  }

  // Match by Year (allow a 2 years difference)
  if (manga.year && existingManga.year && Math.abs(manga.year - existingManga.year) <= yearDifference) {
    matchScore += CRITERIA_WEIGHTS.year
  }

  // Match by Genres
  if (manga.genre && existingManga.genre && manga.genre.some(genre => existingManga.genre.includes(genre))) {
    matchScore += CRITERIA_WEIGHTS.genres
  }

  if (await matchByMangaupdatesId(manga, existingManga)) {
    matchScore = totalWeight
  }

  return (matchScore / totalWeight) * 100
}
function getBestCover (A, B) {
  // lower is better
  const priorities = agents.getCoverPriority()

  const priorityA = priorities[A.source]
  const priorityB = priorities[B.source]

  return priorityA < priorityB ? A.cover : B.cover
}

async function mergeManga (existingManga, manga) {
  const existingID = existingManga.externalIds?.[manga.source]

  // only merge the empty fields
  let mergedManga = {}
  _.assign(mergedManga, existingManga)

  mergedManga = _.mergeWith(mergedManga, manga, (objValue, srcValue) => {
    // keep only the non-empty fields
    if (objValue === undefined || objValue === null || objValue === '') {
      return srcValue
    } else {
      return objValue
    }
  })
  // merge the external ids
  mergedManga.externalIds = _.merge(existingManga.externalIds, manga.externalIds)
  mergedManga.externalLinks = _.merge(existingManga.externalLinks, manga.externalLinks)
  mergedManga.cover = getBestCover(existingManga, manga)

  if (manga.source !== existingManga.source && existingID) {
    mergedManga.externalIds[manga.source] = existingID
  }

  return mergedManga
}

async function processSearchResults (results, excludeGenres) {
  const mergedResults = []
  const uniqueMangaMap = new Map()

  // flatten results
  const flattenedResults = []
  for (const sourceResults of results) {
    flattenedResults.push(...sourceResults)
  }

  // compare each manga with the rest of the mangas
  for (const manga of flattenedResults) {
    const key = manga.title.toLowerCase()
    // clean key from special characters
    // (e.g. "Komi-san wa, Comyushou desu." -> "komisan wa comyushou desu")
    const cleanKey = key.replace(/[^a-zA-Z0-9 ]/g, ' ')
    const existingManga = uniqueMangaMap.get(cleanKey)
    if (existingManga) {
      // if there is a manga with the same id, compare them
      const matchPercentage = await matchManga(manga, existingManga)
      if (matchPercentage > 50) {
        const mergedManga = await mergeManga(existingManga, manga)
        uniqueMangaMap.set(cleanKey, mergedManga)
      } else {
        // if the match percentage is lower than 50%, add the manga to the map
        uniqueMangaMap.set(cleanKey, manga)
      }
    } else {
      // if there is no manga with the same id, add the manga to the map
      uniqueMangaMap.set(cleanKey, manga)
    }
  }

  mergedResults.push(...uniqueMangaMap.values())
  return filterResults(excludeGenres, mergedResults)
}

function isInLibrary (result, libraryMangas) {
  return libraryMangas.some(manga => {
    const externalIds = manga.externalIds
    const externalIdsValues = Object.values(externalIds).join('|')
    return externalIdsValues.includes(result.id)
  })
}

function filterResults (excludeGenres, inputs) {
  const filtered = []
  const uniqueIds = new Set()

  for (const input of inputs) {
    if (!input) continue
    const shouldExcludeGenre = excludeGenres && excludeGenres.length > 0 && hasExcludedGenre(input.genre, excludeGenres)
    if (input.cover && !uniqueIds.has(input.id) && !shouldExcludeGenre) {
      filtered.push(input)
      uniqueIds.add(input.id)
    }
  }
  return filtered
}

function hasExcludedGenre (genres, excludeGenres) {
  if (!genres) return false
  return genres.some(genre => excludeGenres.includes(genre))
}

module.exports = class AgentsService {
  /**
   * Asynchronously retrieves agents enabled for a specific capability.
   *
   * @param {string} capability - The capability to check for each agent.
   * @returns {Promise<Array>} - The list of agents enabled for the given capability.
   */
  async agentsEnabledForCapability (capability) {
    const agentsSettings = await services.preferences.getUserPreferencesOrDefault('AGENTS', {})
    return agents.internalAgents.filter(agent => {
      const agentPreferences = agentsSettings[agent.id]
      return agentPreferences && agentPreferences[capability] === 'TRUE'
    })
  }

  async getSourceURLs (manga) {
    // for each key:value from externalIds build an url
    const sources = []
    const externalIds = manga.externalIds
    for (const key in externalIds) {
      const id = externalIds[key]
      if ((!id) || (!agents.agent(key))) continue
      let url = await agents.agent(key).instance.sourceURL
      // replace the id placeholder with the actual id
      url = url.replace('[id]', id)
      const favicon = await agents.agent(key).instance.iconURL
      const name = await agents.agent(key).instance.label
      sources.push({ name, url, favicon })
    }
    return sources.sort((a, b) => a.name.localeCompare(b.name))
  }

  /**
   * Retrieves manga suggestions based on the title and adult content flag.
   * @param {string} title - The title of the manga.
   * @param {boolean} isAdult - Flag indicating whether to include adult content.
   * @param {object} ids - The external IDs of the manga.
   * @param {boolean} useAnibrain - Flag indicating whether to use Anibrain as the source.
   * @returns {Promise<object|null>} - The manga suggestions or null if not found.
   */
  async getSuggestions (title, isAdult, ids, useAnibrain = false) {
    // Helper function to safely parse JSON and catch any errors.
    const safeParse = (json) => {
      try {
        return JSON.parse(json)
      } catch (e) {
        logger.error({ err: e }, 'Failed to parse JSON')
        return null
      }
    }

    // Helper function to fetch recommendations for a manga.
    const fetchRecommendations = async (mangaTitle) => {
      const response = await agents.agent('anibrain').instance.lookupMangas(mangaTitle, isAdult)
      const mangaData = safeParse(response)
      if (mangaData?.data?.length === 0) {
        return null
      }
      return agents.agent('anibrain').instance.lookupRecommendations(mangaData.data[0].id, isAdult)
    }

    const agentsList = await this.agentsEnabledForCapability('MANGA_BASIC_RECOMMENDATIONS')
    const results = await agents.searchMangaBasedRecommendations(ids, agentsList)

    const flattenedResults = _.flatten(results)
    // build a list of suggestions unique by title
    const suggestions = []
    const uniqueTitles = new Set()
    for (const suggestion of flattenedResults) {
      if (!uniqueTitles.has(suggestion.title)) {
        suggestions.push(suggestion)
        uniqueTitles.add(suggestion.title)
      }
    }

    if (useAnibrain) {
      // Attempt to fetch recommendations with the given title.
      let suggestions = await fetchRecommendations(title)

      // If no suggestions are found, try with an alternate title.
      if (!suggestions) {
        const altTitle = await utils.userPreferredMangaTitle(title)
        suggestions = await fetchRecommendations(altTitle)
        return suggestions
      }
    }

    return suggestions
  }

  /**
   * Retrieves manga characters by manga ID.
   *
   * @param {number} mangaId - The ID of the manga to fetch characters for.
   * @returns {Promise<Object>} - An object containing either the characters data or an error message.
   */
  async getMangaCharacters (mangaId) {
    try {
      const manga = await services.library.getOneManga(mangaId)

      if (!manga) {
        logger.warn(`getMangaCharacters: Manga not found: ${mangaId}`)
        return []
      }

      if (!manga.externalIds?.anilist) {
        logger.warn(`getMangaCharacters: Manga has no AniList ID: ${mangaId}`)
        return []
      }

      const anilistId = manga.externalIds.anilist
      const characters = await agents.agent('anilist').instance.lookupCharactersByMangaId(anilistId)

      if (!characters || characters.length === 0) {
        logger.warn(`getMangaCharacters: Manga has no characters: ${mangaId}`)
        return []
      }

      return characters
    } catch (e) {
      logger.error({ err: e }, `Failed to retrieve characters for manga: ${mangaId}`)
      throw e
    }
  }

  /**
   * Fetches recommendations mangas from various agents.
   *
   * @param {string} mode - The mode of the recommendations.
   * @returns {Promise<Array>} - The data array containing recommendations mangas.
   * @throws Will throw an error if the underlying agent fetch fails.
   */
  async getRecommendationsMangas (mode) {
    try {
      const agent = agents.agent('anilist').instance
      return await agent.lookupRecommendations()
    } catch (e) {
      logger.error({ err: e }, `Failed to get recommendations : ${mode}`)
      throw e
    }
  }

  /**
   * Fetches trending mangas from various agents.
   *
   * @param {string} mode - The mode of the trending request (e.g., 'weekly', 'daily').
   * @param {number} limit - Maximum number of mangas to retrieve.
   * @returns {Promise<Array>} - The data array containing trending mangas.
   * @throws Will throw an error if the underlying agent fetch fails.
   */
  async getTrendingMangas (mode, limit) {
    try {
      const agent = agents.agent('kitsu').instance
      return await agent.lookupRecommendations(mode, limit)
    } catch (e) {
      logger.error({ err: e }, `Failed to get trending mangas: ${mode}`)
      throw e
    }
  }

  /**
   * Search for manga titles using external agents.
   *
   * @param {string} term - The search term provided by the user.
   * @param {boolean} forceSearch - Flag to force the search without using cached results.
   * @returns {Promise<Object>} An object containing the search results and any additional metadata.
   * @throws {Error} Throws an error if the search could not be completed.
   */
  async searchMangasByTerm (term, forceSearch) {
    try {
      const excludeGenres = await services.preferences.getUserPreferencesOrDefault('preferences.agentOptions.excludeGenres', [])

      // Determine the search terms based on force search flag and user preferences
      const searchTerms = await determineSearchTerms(term, forceSearch)

      // Execute manga search through enabled agents
      const enabledAgents = await this.agentsEnabledForCapability('MANGA_CROSS_LOOKUP')
      const searchPromises = searchTerms.flatMap(searchTerm =>
        enabledAgents.map(agent => agent.instance.searchMangas(searchTerm))
      )
      const results = await Promise.all(searchPromises)

      // Process and filter search results
      const filteredResults = await processSearchResults(results, excludeGenres)

      // Check for existing mangas in the library
      const libraryMangas = await services.library.getAllManga()
      const finalResults = filteredResults.map(result => {
        return {
          ...result,
          alreadyInLibrary: isInLibrary(result, libraryMangas)
        }
      })

      // proxy the cover image
      finalResults.forEach(result => {
        const urlBase64 = Buffer.from(result.cover).toString('base64')
        result.cover = `https://wsrv.nl/?url=https://services.f-ck.me/v1/image/${urlBase64}&w=240&h=360`
      })

      // order final results by score
      finalResults.sort((a, b) => {
        return parseInt(b.score) - parseInt(a.score)
      })

      // Send the response
      return {
        correctedQuery: searchTerms.includes(term) ? null : searchTerms[0],
        results: finalResults
      }
    } catch (e) {
      logger.error({ err: e }, `Failed to search for manga titles using external agents: ${term}`)
      throw e
    }
  }
}
