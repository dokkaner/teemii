const { Agent, AgentCapabilities } = require('../core/agent.js')
const Bottleneck = require('bottleneck')
const axios = require('axios')
const { logger } = require('../loaders/logger')
const { configManager } = require('../loaders/configManager')
const { convertToLocale } = require('../utils/agent.utils')

class Mangadex extends Agent {
  // #region private
  #jwtSession = ''
  #jwtRefresh = ''

  #limiter = new Bottleneck({
    maxConcurrent: 2,
    minTime: 900
  })

  #lookupSchema = {
    id: 'id',
    title: {
      path: 'attributes.title',
      fn: (propertyValue, source) => {
        if (propertyValue) {
          // return en title if available, otherwise return first title. Return the value only
          return propertyValue.en || propertyValue[Object.keys(propertyValue)[0]]
        } else {
          return ''
        }
      }
    },
    altTitles: 'attributes.altTitles',
    desc: 'attributes.description.en',
    status: 'attribute.state',
    genre: (iteratee) => {
      return iteratee.attributes.tags.map((tag) => {
        return tag.attributes.group.toString() === 'genre' ? tag.attributes.name.en : null
      }).filter(n => n) || []
    },
    year: 'attributes.year',
    r: 'attributes.contentRating',
    score: '',
    scoredBy: '',
    popularity: '',
    faved: '',
    url: '',
    authors: '',
    cover: (iteratee) => {
      return iteratee.relationships.map((rel) => {
        return rel.type.toString() === 'cover_art' ? rel.attributes.fileName + '.256.jpg' : null
      }).filter(n => n) || ''
    },
    'externalIds.mangadex': 'id',
    'externalIds.anilist': 'attributes.links.al',
    'externalIds.animeplanet': 'attributes.links.ap',
    'externalIds.kitsu': 'attributes.links.kt',
    'externalIds.mangaupdates': 'attributes.links.mu',
    'externalIds.mal': 'attributes.links.mal'
  }

  #chapterSchema = {
    id: '',
    titles: {
      path: 'attributes.title',
      fn: (propertyValue, source) => {
        if (propertyValue) {
          const title = {}
          title[source.attributes.translatedLanguage] = propertyValue
          return title
        } else {
          return ''
        }
      }
    },
    mangaId: (iteratee) => {
      return iteratee.relationships.map((rel) => {
        return rel.type.toString() === 'manga' ? rel.id : null
      }).filter(n => n) || ''
    },
    langAvailable: 'attributes.translatedLanguage',
    posterImage: '',
    volume: 'attributes.volume',
    chapter: 'attributes.chapter',
    pages: 'attributes.pages',
    publishAt: 'attributes.updatedAt',
    readableAt: 'attributes.readableAt',
    version: 'attributes.version',
    vote: 1,
    groupScan: (iteratee) => {
      return iteratee.relationships.map((rel) => {
        return rel.type.toString() === 'scanlation_group' ? rel.attributes.name : null
      })[0] || ''
    },
    'externalIds.mangadex': 'id',
    'externalLinks.mangadex': '',
    source: {
      path: '',
      fn: () => {
        return 'mangadex'
      }
    }
  }

  #recommendationsSchema = {
    id: 'id',
    title: 'attributes.title.en',
    altTitles: 'attributes.altTitles',
    desc: 'attributes.description.en',
    status: 'attributes.status',
    genres: (iteratee) => {
      const genres = iteratee.attributes.tags
      if (genres.length > 0) {
        return genres.map((tag) => {
          return tag.attributes.group.toString() === 'genre' ? tag.attributes.name.en : null
        }).filter(n => n)
      } else { return [] }
    },
    year: 'attributes.year',
    r: 'attributes.contentRating',
    cover: (iteratee) => {
      return iteratee.relationships.map((rel) => {
        const cover = rel.type.toString() === 'cover_art' ? rel.attributes.fileName : null
        if (cover) {
          const url = 'https://uploads.mangadex.org/covers/' + iteratee.id + '/' + cover + '.256.jpg'
          const urlBase64 = Buffer.from(url).toString('base64')
          const proxyUrl = `https://wsrv.nl/?url=https://services.f-ck.me/v1/image/${urlBase64}`
          return proxyUrl
        }
        return null
      }).filter(n => n)
    }
  }

  #mangaSchema = {
    id: 'id',
    type: 'type',
    canonicalTitle: 'attributes.title.en',
    'titles.en_us': 'attributes.title.en',
    altTitles: 'attributes.altTitles',
    slug: '',
    publicationDemographics: 'attributes.publicationDemographic',
    genres: (iteratee) => {
      const genres = iteratee.attributes.tags
      if (genres.length > 0) {
        return genres.map((tag) => {
          return tag.attributes.group.toString() === 'genre' ? tag.attributes.name.en : null
        }).filter(n => n)
      } else { return [] }
    },
    'synopsis.en_us': '',
    description: (iteratee) => {
      const desc = iteratee.attributes.description
      const languages = Object.keys(desc)
      const descriptions = {}
      languages.forEach((lang) => {
        const langCode = convertToLocale(lang)
        descriptions[langCode] = desc[lang]
      })
      return descriptions
    },
    tags: (iteratee) => {
      const genres = iteratee.attributes.tags
      if (genres.length > 0) {
        return genres.map((tag) => {
          return tag.attributes.group.toString() !== 'genre' ? tag.attributes.name.en : null
        }).filter(n => n)
      } else { return [] }
    },
    status: 'attributes.status',
    isLicensed: '',
    'bannerImage.mangadex': '',
    'posterImage.mangadex': '',
    'coverImage.mangadex': (iteratee) => {
      return iteratee.relationships.map((rel) => {
        return rel.type.toString() === 'cover_art' ? rel.attributes.fileName : null
      }).filter(n => n)
    },
    chapterCount: 'attributes.lastChapter',
    volumeCount: 'attributes.lastVolume',
    serialization: '',
    nextRelease: '',
    lastRelease: '',
    popularityRank: '',
    favoritesCount: '',
    score: '',
    contentRating: 'attributes.contentRating',
    originalLanguage: 'attributes.originalLanguage',
    startYear: 'attributes.year',
    endYear: '',
    authors: '',
    publishers: '',
    chapterNumbersResetOnNewVolume: 'attributes.chapterNumbersResetOnNewVolume',
    'externalLinks.mangadex': 'id',
    'externalIds.mangadex': 'id'
  }

  #pageSchema = {
    page: 'page',
    pageURL: 'url',
    chapterId: 'chapterId',
    mangaId: '',
    referer: 'referer'
  }

  #helperGetScanlationGroup (host, id) {
    const url = `${host}/group/${id}`
    const config = {
      headers: { Authorization: `Bearer ${this.#jwtSession}` }
    }
    const response = this.#limiter.schedule(() => axios.get(url, config))
    return new Promise(function (resolve, reject) {
      response
        .then((res) => {
          const data = res.data.data
          resolve(data)
        })
        .catch(function (err) {
          reject(err.message)
        })
    })
  };

  #helperLookupChapters (host, ids, offset, page, lang) {
    let langParam = ''
    if (lang) {
      langParam = `&translatedLanguage[]=${lang}`
    }
    const vars = '&includes[]=scanlation_group&contentRating[]=safe&contentRating[]=suggestive&contentRating[]=erotica&contentRating[]=pornographic'
    const url = `${host}/chapter?manga=${ids.id}&limit=100&offset=${offset}${vars}${langParam}`
    const config = {
      headers: { Authorization: `Bearer ${this.#jwtSession}` }
    }

    return new Promise(function (resolve, reject) {
      axios
        .get(url, config)
        .then((res) => {
          const data = res.data.data
          // exclude chapters with externalUrl
          const filtered = data.filter((chapter) => {
            return chapter.attributes.externalUrl === null
          })

          resolve(filtered)
        })
        .catch(function (err) {
          reject(err.message)
        })
    })
  };

  #helperLookupMangas (host, query, offset, page) {
    const contentRating = '&contentRating[]=safe&contentRating[]=suggestive&contentRating[]=erotica&contentRating[]=pornographic'
    let url
    if (query === '') {
      url = `${host}/manga?&limit=100&offset=${offset}${contentRating}&includes[]=cover_art`
    } else {
      url = `${host}/manga?title=${encodeURIComponent(query)}&limit=100&offset=${offset}${contentRating}&includes[]=cover_art`
    }

    const config = {
      headers: { Authorization: `Bearer ${this.#jwtSession}` }
    }
    return new Promise(function (resolve, reject) {
      axios
        .get(url, config)
        .then((res) => {
          const data = res.data.data
          resolve(data)
        })
        .catch(function (err) {
          reject(err.message)
        })
    })
  };

  /**
   * Retrieves manga data by its ID from the specified host, including details about the author, artist, and cover art.
   *
   * @param {string} host - The base URL of the Mangadex API.
   * @param {Object} ids - An object containing the manga's identifier.
   * @returns {Promise<Object>} - A promise that resolves with the manga data or rejects with an error message.
   */
  async #getMangaById (host, ids) {
    const url = new URL(`/manga/${encodeURIComponent(ids.id)}`, host)
    url.searchParams.append('includes[]', 'author')
    url.searchParams.append('includes[]', 'artist')
    url.searchParams.append('includes[]', 'cover_art')

    const config = {
      headers: { Authorization: `Bearer ${this.#jwtSession}` }
    }

    try {
      const response = await axios.get(url.href, config)
      return response.data.data
    } catch (e) {
      logger.error({ err: e }, `Error fetching manga with ID ${ids.id}`)
      throw new Error(`Could not retrieve manga data: ${e.message}`)
    }
  }

  #ChapterPagesURLByChapterId (host, ids) {
    const url = `${host}/at-home/server/${ids.id}`
    const config = {
      headers: { Authorization: `Bearer ${this.#jwtSession}` }
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

  #funcPrePageSchema (pages, chapterId) {
    const lowQuality = false
    const mode = lowQuality ? 'data-saver' : 'data'
    const chapterHash = pages.chapter.hash
    const homeLink = pages.baseUrl

    const unmappedPages = []
    const data = JSON.parse(JSON.stringify(pages))
    let i = 0

    let root

    if (lowQuality) {
      root = data['chapter.data-saver']
    } else {
      root = data.chapter.data
    }

    root.forEach((page) => {
      const item = {}
      i++
      // { server .baseUrl }/{ quality mode }/{ chapter .chapter.hash }/{ chapter .chapter.{ quality mode }.[*] }
      item.url = `${homeLink}/${mode}/${chapterHash}/${page}`
      item.page = i
      item.chapterId = chapterId.id
      unmappedPages.push(item)
    })

    return unmappedPages
  }

  #funcPostMangaSchema (manga) {
    if (manga.coverImage.mangadex[0]) {
      manga.coverImage.mangadex = 'https://uploads.mangadex.org/covers/' + manga.id + '/' + manga.coverImage.mangadex[0]
    }
  }

  #funcPostLookupSchema (manga) {
    if (manga.cover) {
      manga.cover = 'https://uploads.mangadex.org/covers/' + manga.id + '/' + manga.cover
    }
  }

  async #helperMangaBasedRecommendations (id, limit = 10) {
    const url = `https://api.similarmanga.com/similar/${id}.json`
    const response = await this.#limiter.schedule(() => axios.get(url))

    const recommends = response.data.matches
    const mangas = []
    let i = 0
    for (const recommend of recommends) {
      const ids = { id: recommend.id }
      const manga = await this.#limiter.schedule(() => this.#getMangaById(this.host, ids))
      mangas.push(manga)
      if (i > limit) { break }
      i++
    }
    return mangas
  }

  // #endregion

  // #region public

  constructor () {
    super()
    this.id = 'mangadex'
    this.label = 'Mangadex'
    this.url = 'https://mangadex.org/'
    this.credits = 'MangaDex 2022'
    this.tags = []
    this.iconURL = 'https://mangadex.org/favicon.ico'
    this.sourceURL = 'https://mangadex.org/title/[id]'
    this.options = ''
    this.lang = ['*']
    this.caps = [AgentCapabilities.MANGA_BASIC_RECOMMENDATIONS, AgentCapabilities.MANGA_CROSS_LOOKUP,
      AgentCapabilities.MANGA_METADATA_FETCH, AgentCapabilities.CHAPTER_FETCH, AgentCapabilities.OPT_AUTH]
    this.host = 'https://api.mangadex.org'
    this.priority = 10
    this.coverPriority = 90
    // -------------------------------------------------
    this.limiter = this.#limiter
    this.offsetInc = 100
    this.mangaSchema = this.#mangaSchema
    this.lookupSchema = this.#lookupSchema
    this.chapterSchema = this.#chapterSchema
    this.pageSchema = this.#pageSchema
    this.funcPrePageSchema = this.#funcPrePageSchema
    this.funcPostMangaSchema = this.#funcPostMangaSchema
    this.funcPostLookupSchema = this.#funcPostLookupSchema
    this.funcGetMangaById = this.#getMangaById
    this.funcHelperLookupMangas = this.#helperLookupMangas
    this.funcHelperLookupChapters = this.#helperLookupChapters
    this.funcHelperChapterPagesURLByChapterId = this.#ChapterPagesURLByChapterId
    this.funcHelperLookupRecommendations = this.#helperMangaBasedRecommendations
    this.recommendationsSchema = this.#recommendationsSchema
    this.maxPages = 3
  };

  async refreshTokens () {
    await new Promise(resolve => setTimeout(resolve, 300))
    const endpoint = 'https://api.mangadex.org/auth/refresh'
    const config = {
      headers: {
        'Content-Type': 'application/json'
      }
    }
    const data = {
      token: this.#jwtRefresh
    }

    axios.post(endpoint, data, config)
      .then(() => {
        console.log('Token refreshed')
      })
      .catch(err => {
        console.log('Not able to refresh session token')
        console.log({
          status: err.status,
          errors: err.message
        })
      })
  }

  async login () {
    const username = configManager.get('preferences.mangadex.username')
    const password = configManager.get('preferences.mangadex.password', true)
    if (!username || !password) {
      logger.warn('Mangadex Login failed: No username or password provided')
      return
    }
    await new Promise(resolve => setTimeout(resolve, 300))
    await axios.post('https://api.mangadex.org/auth/login', {
      username,
      password
    })
      .then(res => {
        logger.info('Mangadex Logged in')
        this.#jwtSession = res.data.token.session
        this.#jwtRefresh = res.data.token.refresh
      })
      .catch(err => {
        logger.warn('Mangadex Login failed', err)
      })
  }

  // #endregion
}

module.exports = Mangadex
