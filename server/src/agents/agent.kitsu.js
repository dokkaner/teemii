const { Agent, AgentCapabilities } = require('../core/agent.js')
const Bottleneck = require('bottleneck')
const axios = require('axios')
const { logger } = require('../loaders/logger')
const utils = require('../utils/agent.utils')
const cheerio = require('cheerio')
const { configManager } = require('../loaders/configManager')

class Kitsu extends Agent {
  // #region private
  #jwtSession = ''
  #jwtRefresh = ''
  #userId = ''

  #limiter = new Bottleneck({
    maxConcurrent: 5,
    minTime: 1000
  })

  #scrobblerSchema = {
    id: 'id',
    type: 'type',
    status: 'attributes.status',
    progress: 'attributes.progress',
    reconsuming: 'attributes.reconsuming',
    reconsumeCount: 'attributes.reconsumeCount',
    startedAt: 'attributes.startedAt',
    finishedAt: 'attributes.finishedAt',
    rating: 'attributes.rating',
    ratingTwenty: 'attributes.ratingTwenty',
    mangaId: 'relationships.manga.data.id',
    mangaType: 'relationships.manga.data.type',
    mangaTitle: 'manga.attributes.canonicalTitle',
    mangaYear: {
      path: 'manga.attributes.startDate',
      fn: (propertyValue, source) => {
        if (propertyValue) { return (propertyValue.slice(0, 4)) }
      }
    },
    mangaAuthors: ''
  }

  #lookupSchema = {
    id: 'id',
    title: 'attributes.canonicalTitle',
    altTitles: '',
    desc: 'attributes.synopsis',
    status: 'attributes.status',
    genres: '',
    year: {
      path: 'attributes.startDate',
      fn: (propertyValue, source) => {
        if (propertyValue) { return (propertyValue.slice(0, 4)) }
      }
    },
    r: 'attributes.ageRating',
    score: {
      path: 'attributes.averageRating',
      fn: (propertyValue, source) => {
        return (propertyValue / 10).toFixed(2)
      }
    },
    scoredBy: '',
    popularity: 'attributes.popularityRank',
    faved: 'attributes.favoritesCount',
    url: 'attributes.links.self',
    authors: '',
    cover: 'attributes.posterImage.original',
    'externalLinks.kitsu': 'links.self',
    'externalIds.kitsu': 'id'
  }

  #mangaSchema = {
    id: 'id',
    type: 'type',
    canonicalTitle: 'attributes.canonicalTitle',
    'titles.en_us': 'attributes.titles.en_us',
    'titles.ja_jp': 'attributes.titles.ja_jp',
    altTitles: null,
    slug: 'attributes.slug',
    publicationDemographics: '',
    genres: '',
    'synopsis.en_us': 'attributes.synopsis',
    'description.en_us': 'attributes.description',
    tags: null,
    status: 'attributes.status',
    isLicensed: '',
    'bannerImage.kitsu': 'attributes.coverImage.original',
    'posterImage.kitsu': 'attributes.posterImage.original',
    'coverImage.kitsu': 'attributes.posterImage.original',
    chapterCount: 'attributes.chapterCount',
    volumeCount: 'attributes.volumeCount',
    serialization: 'attributes.serialization',
    nextRelease: 'attributes.nextRelease',
    lastRelease: '',
    popularityRank: 'attributes.popularityRank',
    favoritesCount: 'attributes.favoritesCount',
    score: {
      path: 'attributes.averageRating',
      fn: (propertyValue, source) => {
        return (propertyValue / 10).toFixed(2)
      }
    },
    contentRating: {
      path: 'attributes.ageRating',
      fn: (propertyValue, source) => {
        return (propertyValue === 'R' ? 'Explicit' : 'Safe')
      }
    },
    originalLanguage: '',
    startYear: {
      path: 'attributes.startDate',
      fn: (propertyValue, source) => {
        if (propertyValue) { return propertyValue.slice(0, 4) }
      }
    },
    endYear: {
      path: 'attributes.enDate',
      fn: (propertyValue, source) => {
        if (propertyValue) { return propertyValue.slice(0, 4) }
      }
    },
    authors: '',
    chapterNumbersResetOnNewVolume: false,
    'externalLinks.kitsu': 'links.self',
    'externalIds.kitsu': 'id'
  }

  #helperLookupRecommendations (host, ask, limit, offset, page) {
    let url
    switch (parseInt(ask)) {
      case 0: // weekly trending
        url = `${host}/api/edge/trending/manga?limit=${limit}`
        break
      case 1: // top
        url = `${host}/api/edge/manga?filter[status]=current&page[limit]=${limit}&sort=-user_count`
        break
      case 2: // top inconming
        url = `${host}/api/edge/manga?filter[status]=upcoming&page[limit]=${limit}&sort=-user_count`
        break
      case 3: // top popular
        url = `${host}/api/edge/manga?page[limit]=${limit}&sort=-user_count`
        break
    }

    return new Promise(function (resolve, reject) {
      axios
        .get(url, {
          headers: {
            Accept: 'application/vnd.api+json',
            'Content-Type': 'application/vnd.api+json'
          }
        })
        .then((res) => {
          const data = res.data.data
          resolve(data)
        })
        .catch(function (e) {
          logger.error({ err: e })
          reject(e)
        })
    })
  };

  #helperLookupMangas (host, query, offset, page) {
    const url = `${host}/api/edge/manga/?filter[text]=${query}&page[limit]=20&page[offset]=${offset}&filter[subtype]=Manhwa,Manga&sort=-userCount`
    return new Promise(function (resolve, reject) {
      axios
        .get(url, {
          headers: {
            Accept: 'application/vnd.api+json',
            'Content-Type': 'application/vnd.api+json'
          }
        })
        .then((res) => {
          const data = res.data.data
          resolve(data)
        })
        .catch(function (e) {
          logger.error({ err: e })
          reject(e)
        })
    })
  };

  async #getCanonicalID (slug) {
    if (!slug.match(/[a-z]/i)) {
      return slug
    }

    const body = await this.#limiter.schedule(() => utils.getBody(`${this.host}/manga/${slug}`, null, false, false, false))
    // get canonical id from body html with cheerio
    // canonicalID is in the url of the media-poster span image
    // in the form of data-src="https://media.kitsu.io/manga/[canonicalID]/poster_image/large-.jpeg"
    const $ = cheerio.load(body)
    const span = $('span.media-poster').find('img').attr('data-src')

    // if found, return canonicalID
    if (span) {
      return span.split('/')[4]
    } else {
      return null
    }
  }

  #getMangaById (host, ids) {
    try {
      if (!ids?.id || ids.id.match(/[a-z]/i)) {
        logger.warn(`Kitsu: ${ids.id} is not a valid id`)
        return []
      }
    } catch (e) {
      logger.error({ err: e }, `Kitsu: ${ids} is not a valid id`)
      return null
    }

    const url = `${host}/api/edge/manga/${ids.id}`
    return new Promise(function (resolve, reject) {
      axios
        .get(encodeURI(url), {
          headers: {
            Accept: 'application/vnd.api+json',
            'Content-Type': 'application/vnd.api+json'
          }
        })
        .then((res) => {
          const data = res.data.data
          resolve(data)
        })
        .catch(function (e) {
          logger.error({ err: e })
          reject(e)
        })
    })
  };

  async #helperScrobblerPush (host, entry) {
    const url = entry.trackingId ? `${host}/api/edge/library-entries/${entry.trackingId}` : `${host}/api/edge/library-entries`
    const method = entry.trackingId ? 'patch' : 'post'
    const data = {
      ...(entry.trackingId && { id: entry.trackingId }),
      attributes: {
        status: entry.status,
        progress: entry.progress,
        // volumesOwned:
        rating: entry.rating,
        ratingTwenty: entry.rating * 4,
        ...(entry.startedAt && { startedAt: entry.startedAt }),
        ...(entry.finishedAt && { finishedAt: entry.finishedAt })
      },
      relationships: {
        manga: {
          data: {
            type: 'manga',
            id: entry.mediaId
          }
        },
        user: {
          data: {
            type: 'users',
            id: this.#userId
          }
        }
      },
      type: 'library-entries'
    }

    const config = {
      headers: {
        Authorization: `Bearer ${this.#jwtSession}`,
        'Content-Type': 'application/vnd.api+json',
        Accept: 'application/vnd.api+json'
      }
    }

    try {
      const res = await axios[method](encodeURI(url), { data }, config)
      return { agent: 'kitsu', id: res.data.data.id, status: 'success' }
    } catch (e) {
      logger.error({ err: e }, 'Kitsu API error')
      return { agent: 'kitsu', id: null, status: 'error' }
    }
  }

  #helperScrobblerPull (host, offset, page) {
    const url = `${host}/api/edge/library-entries?filter[userId]=${this.#userId}&filter[kind]=manga&include=manga&page[limit]=20&page[offset]=${offset}`
    const config = {
      headers: {
        Authorization: `Bearer ${this.#jwtSession}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/vnd.api+json'
      }
    }
    return new Promise(function (resolve, reject) {
      axios
        .get(encodeURI(url), config)
        .then((res) => {
          const data = res.data.data

          for (const entry of data) {
            entry.manga = res.data.included.find((m) => m.id === entry.relationships.manga.data.id)
          }

          resolve(data)
        })
        .catch(function (e) {
          logger.error({ err: e })
          reject(e)
        })
    })
  }

  // #endregion

  // #region public
  constructor () {
    super()
    this.id = 'kitsu'
    this.label = 'Kitsu'
    this.url = 'https://kitsu.io/'
    this.credits = 'kitsu'
    this.tags = []
    this.iconURL = 'https://kitsu.io/favicon-32x32-3e0ecb6fc5a6ae681e65dcbc2bdf1f17.png'
    this.logoURL = 'https://kitsu.io/apple-touch-icon-c0052e253a1d5fabba7e20b97b1b8ad6.png'
    this.sourceURL = 'https://kitsu.io/manga/[id]'
    this.options = ''
    this.lang = ['en']
    this.caps = [AgentCapabilities.MANGA_METADATA_FETCH, AgentCapabilities.OPT_AUTH, AgentCapabilities.SCROBBLER]
    this.host = 'https://kitsu.io'
    this.limiter = this.#limiter
    this.offsetInc = 100
    this.maxPages = 3
    this.mangaSchema = this.#mangaSchema
    this.lookupSchema = this.#lookupSchema
    this.scrobblerSchema = this.#scrobblerSchema
    this.funcGetMangaById = this.#getMangaById
    this.funcHelperLookupMangas = this.#helperLookupMangas
    this.getCanonicalID = this.#getCanonicalID
    this.helperLookupRecommendations = this.#helperLookupRecommendations
    this.helperScrobblerPull = this.#helperScrobblerPull
    this.helperScrobblerPush = this.#helperScrobblerPush
    this.loggedIn = false
    this.coverPriority = 10
  };

  async login () {
    const username = configManager.get('preferences.integrations.kitsu.security.username')
    const password = configManager.get('preferences.integrations.kitsu.security.password', true)
    if (!username || !password) {
      logger.warn('Kitsu Login failed: No username or password provided')
      return
    }
    const data = {
      grant_type: 'password',
      username,
      password: encodeURIComponent(password) //  RFC3986
    }

    const config = {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/vnd.api+json'
      }
    }
    await axios.post('https://kitsu.io/api/oauth/token', data, config)
      .then(res => {
        logger.info('Kitsu Logged in')
        this.#jwtSession = res?.data?.access_token
        this.#jwtRefresh = res?.data?.refresh_token
        this.getUser()
        this.loggedIn = true
      })
      .catch(e => {
        this.loggedIn = false
        logger.warn({ err: e }, 'Kitsu Login failed')
        throw new Error('Kitsu Login failed')
      })
  }

  async refreshTokens () {
    const data = {
      grant_type: 'refresh_token',
      refresh_token: this.#jwtRefresh
    }

    const config = {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/vnd.api+json'
      }
    }
    await axios.post('https://kitsu.io/api/oauth/token', data, config)
      .then(res => {
        logger.info('Kitsu Tokens refreshed')
        this.#jwtSession = res?.data?.access_token
        this.#jwtRefresh = res?.data?.refresh_token
      })
      .catch(err => {
        this.loggedIn = false
        logger.warn('Kitsu Tokens refresh failed', err)
      })
  }

  async getUser () {
    const url = 'https://kitsu.io/api/edge/users?filter[self]=true'
    const config = {
      headers: {
        'Content-Type': 'application/vnd.api+json',
        Accept: 'application/vnd.api+json',
        Authorization: `Bearer ${this.#jwtSession}`
      }
    }
    const res = await axios.get(url, config)
    this.#userId = res?.data?.data[0]?.id
  }

  // #endregion
}

module
  .exports = Kitsu
