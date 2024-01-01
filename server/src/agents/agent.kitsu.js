const { Agent, AgentCapabilities } = require('../core/agent.js')
const Bottleneck = require('bottleneck')
const axios = require('axios')
const { logger } = require('../loaders/logger')
const utils = require('../utils/agent.utils')
const cheerio = require('cheerio')

class Kitsu extends Agent {
  // #region private

  #limiter = new Bottleneck({
    maxConcurrent: 5,
    minTime: 1000
  })

  #lookupSchema = {
    id: 'id',
    title: {
      path: 'attributes.titles',
      fn: (propertyValue, source) => {
        return propertyValue.en || propertyValue.en_jp || propertyValue.en_us
      }
    },
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
    const url = `${host}/api/edge/manga/?filter[text]=${query}&page[limit]=20&page[offset]=${offset}&filter[subtype]=manga&sort=-userCount`
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
    this.sourceURL = 'https://kitsu.io/manga/[id]'
    this.options = ''
    this.lang = ['en']
    this.caps = [AgentCapabilities.MANGA_METADATA_FETCH]
    this.host = 'https://kitsu.io'
    this.limiter = this.#limiter
    this.offsetInc = 100
    this.maxPages = 3
    this.mangaSchema = this.#mangaSchema
    this.lookupSchema = this.#lookupSchema
    this.funcGetMangaById = this.#getMangaById
    this.funcHelperLookupMangas = this.#helperLookupMangas
    this.getCanonicalID = this.#getCanonicalID
    this.helperLookupRecommendations = this.#helperLookupRecommendations
    this.coverPriority = 10
  };

  // #endregion
}

module
  .exports = Kitsu
