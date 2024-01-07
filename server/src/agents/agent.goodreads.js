const { Agent, AgentCapabilities } = require('../core/agent.js')
const Bottleneck = require('bottleneck')
const axios = require('axios')
const { logger } = require('../loaders/logger')
const { configManager } = require('../loaders/configManager.js')

class Goodreads extends Agent {
  #limiter = new Bottleneck({
    maxConcurrent: 3,
    minTime: 1000
  })

  #lookupSchema = {
    id: 'node.id',
    title: 'node.title',
    altTitles: '',
    desc: 'node.description',
    status: '',
    genre: (iteratee) => {
      const bookGenres = iteratee.node.bookGenres
      if (bookGenres.length > 0) {
        return bookGenres.map((genre) => {
          return genre.genre.name
        }).filter(n => n)
      } else { return [] }
    },
    year: {
      path: 'node.details.publicationTime',
      fn: (propertyValue, source) => {
        if (propertyValue) {
          return new Date(propertyValue).getFullYear()
        } else {
          return null
        }
      }
    },
    r: '',
    score: 'node.stats.averageRating',
    scoredBy: 'node.stats.ratingsCount',
    popularity: '',
    faved: '',
    url: 'node.webUrl',
    authors: 'node.primaryContributorEdge.node.name',
    cover: 'node.imageUrl',
    'externalIds.goodreads': 'node.id',
    'externalIds.mangadex': '',
    'externalIds.anilist': '',
    'externalIds.animeplanet': '',
    'externalIds.kitsu': '',
    'externalIds.mangaupdates': '',
    'externalIds.mal': ''
  }

  #mangaSchema = {
    id: '',
    type: '',
    canonicalTitle: '',
    'titles.en_us': '',
    altTitles: '',
    slug: '',
    publicationDemographics: '',
    genres: '',
    'synopsis.en_us': '',
    'description.en_us': '',
    tags: '',
    status: '',
    isLicensed: '',
    'bannerImage.mangadex': '',
    'posterImage.mangadex': '',
    'coverImage.mangadex': '',
    chapterCount: '',
    volumeCount: '',
    serialization: '',
    nextRelease: '',
    lastRelease: '',
    popularityRank: '',
    favoritesCount: '',
    score: '',
    contentRating: '',
    originalLanguage: '',
    startYear: '',
    endYear: '',
    authors: '',
    publishers: '',
    chapterNumbersResetOnNewVolume: '',
    'externalLinks.mangadex': '',
    'externalIds.mangadex': ''
  }

  async #helperLookupMangas (host, query, offset, page) {
    const apikey = configManager.get('preferences.agentAuth.goodreads_key', true)
    if (!apikey) {
      logger.warn('Goodreads API key not set')
      return []
    }

    const q = 'query getSearchSuggestions($searchQuery: String!) { getSearchSuggestions(query: $searchQuery) { edges { ... on SearchBookEdge { node { id title description bookGenres { genre { name } } details { asin publisher publicationTime } stats { averageRating ratingsCount } primaryContributorEdge { node { name isGrAuthor } } webUrl imageUrl } } } } }'
    const variables = {
      searchQuery: query
    }

    const config = {
      headers: {
        'x-amz-user-agent': 'aws-amplify/3.3.27 js',
        'x-api-key': apikey
      }
    }

    const data = { query: q, variables }
    const url = `${host}/graphql`
    try {
      const results = await axios.post(url, data, config)
      return results.data.data.getSearchSuggestions.edges
    } catch (e) {
      logger.error({ err: e }, 'Error while getting search results from Goodreads')
      throw e
    }
  }

  /**
   * Retrieves manga data by its ID from the specified host, including details about the author, artist, and cover art.
   *
   * @param {string} host - The base URL of the Mangadex API.
   * @param {Object} ids - An object containing the manga's identifier.
   * @returns {Promise<Object>} - A promise that resolves with the manga data or rejects with an error message.
   */
  async #getMangaById (host, ids) {
    return 'Not implemented'
  }

  // #endregion

  // #region public
  constructor () {
    super()
    this.id = 'goodreads'
    this.label = 'goodreads'
    this.url = 'https://www.goodreads.com/'
    this.credits = 'Goodread 2023'
    this.tags = []
    this.iconURL = 'https://www.goodreads.com/favicon.ico'
    this.sourceURL = 'https://www.goodreads.com/book/show/[id]'
    this.options = ''
    this.lang = ['*']
    this.caps = [AgentCapabilities.MANGA_METADATA_FETCH]
    this.host = 'https://kxbwmqov6jgg3daaamb744ycu4.appsync-api.us-east-1.amazonaws.com'
    this.priority = 10
    this.coverPriority = 30
    this.supportPagination = false
    // -------------------------------------------------
    this.limiter = this.#limiter
    this.offsetInc = 100
    this.mangaSchema = this.#mangaSchema
    this.lookupSchema = this.#lookupSchema
    this.funcGetMangaById = this.#getMangaById
    this.funcHelperLookupMangas = this.#helperLookupMangas
    this.maxPages = 3
  };
  // #endregion
}

module.exports = Goodreads
