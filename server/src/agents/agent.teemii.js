const { Agent, AgentHTTPClient } = require('../core/agent.js')
const Bottleneck = require('bottleneck')
const axios = require('axios')
const _ = require('lodash')
const { configManager } = require('../loaders/configManager')

class Teemii extends Agent {
  #apiKey = ''

  #limiter = new Bottleneck({
    maxConcurrent: 10,
    minTime: 999
  })

  #getAPIKey () {
    this.#apiKey = configManager.get('preferences.agentAuth.teemii_key') || ''
  }

  #chapterSchema = {
    titles: (iteratee) => {
      const langs = {}
      iteratee.titles?.forEach((data) => {
        const lang = data.split(': ')[0]
        langs[lang] = data.split(': ').slice(1).join(': ')
      })
      return langs
    },
    mangaId: 'mangaId',
    langAvailable: (iteratee) => {
      const langs = []
      iteratee.langAvailable?.forEach((data) => {
        const lang = data.split(': ')[1]
        langs.push(lang)
      })
      return langs
    },
    posterImage: 'posterImage',
    volume: 'volumeNum',
    chapter: 'chapterNum',
    pages: 'pages',
    publishAt: 'publishAt',
    readableAt: 'readableAt',
    metadata: (iteratee) => {
      const metadata = []
      iteratee.metadata?.forEach((str) => {
        const keyValuePairs = _.split(str, ', ')
        const pairs = _.map(keyValuePairs, pair => _.split(pair, ': '))
        const object = _.fromPairs(pairs)
        metadata.push(object)
      })
      return metadata
    },
    externalIds: (iteratee) => {
      const exIds = {}
      iteratee.externalIds?.forEach((id) => {
        const [source, url] = id.split(': ')
        exIds[source] = url
      })
      return exIds
    },
    externalLinks: (iteratee) => {
      const exIds = {}
      iteratee.externalLinks?.forEach((id) => {
        const [source, url] = id.split(': ')
        exIds[source] = url
      })
      return exIds
    }
  }

  #mangaSchema = {
    id: 'id',
    type: 'type',
    canonicalTitle: 'canonicalTitle',
    titles: 'titles',
    altTitles: 'altTitles',
    slug: 'slug',
    publicationDemographics: 'publicationDemographic',
    genres: 'genres',
    synopsis: 'synopsis',
    description: (iteratee) => {
      const desc = {}
      iteratee.description?.forEach((data) => {
        const cleanData = data.replace(/^\d+: /, '')
        const lang = cleanData.split(': ')[0]
        desc[lang] = cleanData.split(': ').slice(1).join(': ')
      })
      return desc
    },
    tags: 'tags',
    status: 'status',
    isLicensed: 'isLicensed',
    bannerImage: (iteratee) => {
      const covers = {}
      iteratee.bannerImage.forEach((id) => {
        const [source, url] = id.split(': ')
        if (source !== 'bato') covers[source] = url
      })
      return covers
    },
    posterImage: (iteratee) => {
      const covers = {}
      iteratee.posterImage.forEach((id) => {
        const [source, url] = id.split(': ')
        if (source !== 'bato') covers[source] = url
      })
      return covers
    },
    coverImage: (iteratee) => {
      const covers = {}
      iteratee.coverImage.forEach((id) => {
        const [source, url] = id.split(': ')
        if (source !== 'bato') covers[source] = url
      })
      return covers
    },
    chapterCount: 'chapterCount',
    volumeCount: 'volumeCount',
    serialization: 'serialization',
    nextRelease: 'nextRelease',
    lastRelease: 'lastRelease',
    popularityRank: 'popularityRank',
    favoritesCount: 'favoritesCount',
    score: 'score',
    contentRating: 'contentRating',
    originalLanguage: 'originalLanguage',
    startYear: 'startYear',
    endYear: 'endYear',
    authors: 'authors',
    publishers: 'publishers',
    chapterNumbersResetOnNewVolume: 'chapterNumbersResetOnNewVolume',
    externalLinks: (iteratee) => {
      const exIds = {}
      iteratee.externalLinks?.forEach((id) => {
        const [source, url] = id.split(': ')
        exIds[source] = url
      })
      exIds.teemii = 'https://teemii.io/'
      return exIds
    },
    externalIds: (iteratee) => {
      const exIds = {}
      iteratee.externalIds?.forEach((id) => {
        const [source, url] = id.split(': ')
        exIds[source] = url
      })
      exIds.teemii = iteratee.slug
      return exIds
    }
  }

  #lookupSchema = {
    id: 'id',
    title: 'canonicalTitle',
    altTitles: 'altTitles',
    desc: (iteratee) => {
      const desc = {}
      iteratee.description?.forEach((data) => {
        const cleanData = data.replace(/^\d+: /, '')
        const lang = cleanData.split(': ')[0]
        desc[lang] = cleanData.split(': ').slice(1).join(': ')
      })
      return desc
    },
    status: 'status',
    genre: 'genres',
    year: 'startYear',
    r: 'contentRating',
    score: 'score',
    scoredBy: '',
    popularity: 'popularityRank',
    faved: 'favoritesCount',
    url: '',
    authors: 'authors',
    cover: (iteratee) => {
      const covers = {}
      iteratee.coverImage.forEach((id) => {
        const [source, url] = id.split(': ')
        if (source !== 'bato') covers[source] = url
        if (source === 'mangadex') covers[source] = url + '.256.jpg'
      })
      return covers
    },
    externalIds: (iteratee) => {
      const exIds = {}
      iteratee.externalIds.forEach((id) => {
        const [source, url] = id.split(': ')
        exIds[source] = url
      })
      exIds.teemii = iteratee.id
      return exIds
    }
  }

  #helperLookupMangas (host, query) {
    this.#getAPIKey()
    const url = `${host}/mangas/search?q=${query}&size=100&sortBy=_score`
    const config = {
      headers: { 'x-api-key': `${this.#apiKey}` }
    }

    return new Promise(function (resolve, reject) {
      axios
        .get(url, config)
        .then((res) => {
          const data = res.data.items
          resolve(data)
        })
        .catch(function (err) {
          reject(err.message)
        })
    })
  }

  async #getMangaById (host, ids) {
    this.#getAPIKey()
    const url = `${host}/mangas/${ids.id}`
    const config = {
      headers: { 'x-api-key': `${this.#apiKey}` }
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
  }

  #helperLookupChapters (host, ids, offset, page) {
    this.#getAPIKey()
    const url = `${host}/mangas/${ids.id}/chapters?offset=${offset}&limit=${this.offsetInc}`
    const config = {
      headers: { 'x-api-key': `${this.#apiKey}` }
    }

    if (page > 1) return Promise.resolve([])
    return new Promise(function (resolve, reject) {
      axios
        .get(url, config)
        .then((res) => {
          const data = res.data.items
          resolve(data)
        })
        .catch(function (err) {
          reject(err.message)
        })
    })
  }

  constructor () {
    super()
    this.id = 'teemii'
    this.label = 'Teemii'
    this.url = 'https://teemii.io/'
    this.credits = 'Teemii 2024'
    this.tags = []
    this.iconURL = 'https://www.teemii.io/_next/static/media/teemii.4d5b6c0e.svg'
    this.sourceURL = ''
    this.options = ''
    this.lang = ['*']
    this.caps = []
    this.host = 'https://api.pencilectric.org'
    this.priority = 10
    this.coverPriority = 10
    // -------------------------------------------------
    this.limiter = this.#limiter
    this.offsetInc = 100
    this.funcHelperLookupMangas = this.#helperLookupMangas
    this.lookupSchema = this.#lookupSchema
    this.funcGetMangaById = this.#getMangaById
    this.mangaSchema = this.#mangaSchema
    this.chapterSchema = this.#chapterSchema
    this.funcHelperLookupChapters = this.#helperLookupChapters
    this.supportPagination = true

    this.httpClient = AgentHTTPClient.HTTP
    this.maxPages = 1
  };
}

module.exports = Teemii
