const { Agent, AgentCapabilities, AgentHTTPClient } = require('../core/agent.js')
const Bottleneck = require('bottleneck')
const axios = require('axios')
const { logger } = require('../loaders/logger')
const { configManager } = require('../loaders/configManager')
const { convertToLocale } = require('../utils/agent.utils')

class Teemii extends Agent {
  #apiKey = ''

  #limiter = new Bottleneck({
    maxConcurrent: 3,
    minTime: 999
  })

  #lookupSchema = {
    id: 'id',
    title: 'canonicalTitle',
    altTitles: 'altTitles',
    desc: 'description.en_us',
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

  #helperLookupMangas (host, query, offset, page) {
    const url = `${host}/mangas/search?q=${query}`
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
    const url = `${host}/mangas/${ids}`
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
    /*
    this.mangaSchema = this.#mangaSchema
    this.chapterSchema = this.#chapterSchema
    this.pageSchema = this.#pageSchema
    this.funcHelperLookupChapters = this.#helperLookupChapters
    */

    this.httpClient = AgentHTTPClient.HTTP
    this.maxPages = 5
  };
}

module.exports = Teemii
