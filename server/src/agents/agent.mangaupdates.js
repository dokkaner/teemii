const { Agent, AgentCapabilities } = require('../core/agent.js')
const Bottleneck = require('bottleneck')
const axios = require('axios')
const { logger } = require('../loaders/logger')
const cheerio = require('cheerio')
const { configManager } = require('../loaders/configManager')

class Mangaupdates extends Agent {
  // #region private
  #jwtSession = ''

  #limiter = new Bottleneck({
    maxConcurrent: 3,
    minTime: 1000
  })

  #lookupSchema = {
    id: 'record.series_id',
    title: 'record.title',
    altTitles: null,
    desc: 'record.description',
    status: '',
    genre: (iteratee) => {
      const genres = iteratee.record.genres || []
      if (genres.length > 0) {
        return genres.map((tag) => {
          return tag.genre
        }).filter(n => n)
      } else { return [] }
    },
    year: 'record.year',
    r: '',
    score: 'record.bayesian_rating',
    scoredBy: 'record.rating_votes',
    popularity: '',
    faved: '',
    url: 'record.url',
    authors: [],
    cover: 'record.image.url.original',
    'externalIds.mangadex': null,
    'externalIds.anilist': null,
    'externalIds.animeplanet': null,
    'externalIds.kitsu': null,
    'externalIds.mangaupdates': 'record.series_id',
    'externalIds.mal': null
  }

  #mangaSchema = {
    id: 'series_id',
    type: 'type',
    canonicalTitle: 'title',
    'titles.en_us': 'title',
    'titles.ja_jp': '',
    'titles.fr_fr': '',
    'titles.de_de': '',
    'titles.es_la': '',
    altTitles: null,
    slug: '',
    publicationDemographics: '',
    genres: (iteratee) => {
      const genres = iteratee.genres || []
      if (genres.length > 0) {
        return genres.map((tag) => {
          return tag.genre
        }).filter(n => n)
      } else { return [] }
    },
    'synopsis.en_us': '',
    'description.en_us': 'description',
    tags: (iteratee) => {
      const tags = iteratee.categories
      if (tags.length > 0) {
        return tags.map((tag) => {
          if (tag.votes > 1) {
            return tag.category
          } else { return null }
        }).filter(n => n)
      } else { return [] }
    },
    status: {
      path: 'completed',
      fn: (propertyValue) => {
        return (propertyValue ? 'Completed' : 'OnGoing')
      }
    },
    isLicensed: 'licensed',
    'bannerImage.mangaupdates': '',
    'posterImage.mangaupdates': '',
    'coverImage.mangaupdates': 'image.url.original',
    chapterCount: 'latest_chapter',
    lastChapter: 'latest_chapter',
    volumeCount: '',
    serialization: 'publications[0].publication_name',
    nextRelease: '',
    lastRelease: '',
    popularityRank: '',
    favoritesCount: '',
    score: 'bayesian_rating',
    contentRating: '',
    originalLanguage: '',
    startYear: 'year',
    endYear: '',
    authors: (iteratee) => {
      const authors = iteratee.authors || []
      if (authors.length > 0) {
        return authors.map((auth) => {
          return auth.name.toUpperCase()
        }).filter(n => n)
      } else { return [] }
    },
    publisher: (iteratee) => {
      const publishers = iteratee.publishers || []
      if (publishers.length > 0) {
        return publishers.map((any) => {
          if (any.type === 'Original') {
            return any.publisher_name
          } else { return null }
        }).filter(n => n)
      } else { return null }
    },
    chapterNumbersResetOnNewVolume: null,
    'externalLinks.mangaupdates': 'id',
    'externalIds.mangaupdates': 'series_id'
  }

  #recommendationsSchema = {
    id: 'series_id',
    title: 'title',
    desc: 'description',
    status: {
      path: 'completed',
      fn: (propertyValue) => {
        return (propertyValue ? 'Completed' : 'OnGoing')
      }
    },
    genres: (iteratee) => {
      const genres = iteratee.genres || []
      if (genres.length > 0) {
        return genres.map((tag) => {
          return tag.genre
        }).filter(n => n)
      } else { return [] }
    },
    year: 'year',
    r: '',
    score: 'bayesian_rating',
    scoredBy: '',
    popularity: '',
    faved: '',
    url: 'url',
    authors: (iteratee) => {
      const authors = iteratee.authors || []
      if (authors.length > 0) {
        return authors.map((auth) => {
          return auth.name.toUpperCase()
        }).filter(n => n)
      } else { return [] }
    },
    cover: 'image.url.original'
  }

  #helperLookupMangas (host, query, offset, page) {
    const data = { search: query, page, perpage: 50, filter_types: ['Novel'] }//, licensed: 'yes'
    const url = `${host}/v1/series/search`
    const config = {
      'Content-Type': 'application/json'
    }
    return new Promise(function (resolve, reject) {
      axios
        .post(url, data, config)
        .then((res) => {
          const data = res.data.results
          resolve(data)
        })
        .catch(function (err) {
          reject(err.message)
        })
    })
  };

  async #getCanonicalID (slug) {
    let url
    if (slug.toString().match(/[a-z]/i)) {
      url = `https://www.mangaupdates.com/series/${slug}/`
    } else {
      url = `https://www.mangaupdates.com/series.html?id=${slug}`
    }

    const body = await axios.get(url)
    // get canonical id from body html with cheerio
    // canonicalID is in the url of the rss feed
    // in the form of<a href="https://api.mangaupdates.com/v1/series/[canonicalID]/rss">"
    const $ = cheerio.load(body.data)
    const rssLink = $('a[href*="https://api.mangaupdates.com/v1/series/"]').attr('href')
    if (!rssLink) {
      return slug
    } else {
      return rssLink.split('/')[5] || null
    }
  }

  async #helperMangaBasedRecommendations (id, limit = 10) {
    const url = `${this.host}/v1/series/${id}`
    const response = await this.#limiter.schedule(() => axios.get(encodeURI(url)))

    let recommends = response.data.recommendations
    if (recommends?.length === 0) {
      recommends = response.data.category_recommendations
    }

    const mangas = []
    let i = 0
    for (const recommend of recommends) {
      if (i > limit) { break }
      const ids = { id: recommend.series_id.toString() }
      const manga = await this.#limiter.schedule(() => this.#getMangaById(this.host, ids))
      mangas.push(manga)
      i++
    }
    return mangas
  }

  #getMangaById (host, ids) {
    // check if ids.id contains letters
    if (!ids?.id || ids.id.toString().match(/[a-z]/i)) {
      logger.warn(`mangaupdates: ${ids.id} is not a valid id`)
      return []
    }

    const url = `${host}/v1/series/${ids.id}`
    const config = {
      headers: {
        accept: 'application/json'
        // Authorization: `Bearer ${this.#jwtSession}`
      }
    }
    return new Promise(function (resolve, reject) {
      axios
        .get(url, config)
        .then((res) => {
          const data = res.data
          resolve(data)
        })
        .catch(function (err) {
          reject(err.message)
        })
    })
  };

  // #endregion

  // #region public

  constructor () {
    super()
    this.id = 'mangaupdates'
    this.label = 'MangaUpdates'
    this.url = 'https://www.mangaupdates.com/'
    this.credits = 'MangaUpdates 2022 https://www.mangaupdates.com/aboutus.html'
    this.tags = []
    this.iconURL = 'https://www.mangaupdates.com/images/manga-updates.svg'
    this.sourceURL = 'https://www.mangaupdates.com/series.html?id=[id]'
    this.options = ''
    this.lang = ['*']
    this.caps = [AgentCapabilities.MANGA_CROSS_LOOKUP, AgentCapabilities.MANGA_METADATA_FETCH, AgentCapabilities.OPT_AUTH,
      AgentCapabilities.MANGA_BASIC_RECOMMENDATIONS]
    this.host = 'https://api.mangaupdates.com'
    this.priority = 10
    this.coverPriority = 90
    // -------------------------------------------------
    this.limiter = this.#limiter
    this.offsetInc = 100
    this.mangaSchema = this.#mangaSchema
    this.lookupSchema = this.#lookupSchema
    this.recommendationsSchema = this.#recommendationsSchema
    this.funcGetMangaById = this.#getMangaById
    this.funcHelperLookupMangas = this.#helperLookupMangas
    this.funcHelperLookupRecommendations = this.#helperMangaBasedRecommendations
    this.getCanonicalID = this.#getCanonicalID
    this.maxPages = 3
  };

  async refreshTokens () {
    await this.login()
  }

  async login () {
    const username = configManager.get('preferences.mangadex.username')
    const password = configManager.get('preferences.mangadex.password', true)

    if (!username || !password) {
      logger.warn('Mangadex Login failed: No username or password provided')
      return
    }

    await new Promise(resolve => setTimeout(resolve, 300))

    await axios.put('https://api.mangaupdates.com/v1/account/login', {
      username,
      password
    })
      .then(res => {
        this.#jwtSession = res.data.context.session_token
        logger.info(`mangaupdates: logged in as ${username}`, this.#jwtSession)
      })
      .catch(err => {
        console.log(err)
      })
  }

  // #endregion
}

module.exports = Mangaupdates
