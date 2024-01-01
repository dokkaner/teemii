const { Agent, AgentCapabilities } = require('../core/agent.js')
const Bottleneck = require('bottleneck')
const axios = require('axios')
const { logger } = require('../loaders/logger.js')

class Mal extends Agent {
  // #region private

  #limiter = new Bottleneck({
    maxConcurrent: 1,
    minTime: 1000
  })

  #lookupSchema = {
    id: 'mal_id',
    title: 'title',
    altTitles: '',
    synonyms: 'title_english',
    desc: 'synopsis',
    status: 'status',
    genre: (iteratee) => {
      const genres = iteratee.demographics
      if (genres.length > 0) {
        return genres.map((tag) => {
          return tag.name
        }).filter(n => n)
      } else { return [] }
    },
    year: 'published.prop.from.year',
    r: 'explicit_genres',
    score: 'scored',
    scoredBy: 'scored_by',
    popularity: 'popularity',
    faved: 'favorites',
    url: 'url',
    authors: (iteratee) => {
      const authors = iteratee.authors
      if (authors.length > 0) {
        return authors.map((tag) => {
          return tag.name
        }).filter(n => n)
      } else { return [] }
    },
    cover: 'images.jpg.large_image_url',
    'externalLinks.mal': 'url',
    'externalIds.mal': 'mal_id'
  }

  #mangaSchema = {
    id: 'mal_id',
    type: 'type',
    canonicalTitle: 'title',
    'titles.en_us': 'title_english',
    'titles.ja_jp': 'title_japanese',
    altTitles: (iteratee) => {
      const titles = iteratee.titles || []
      if (titles.length > 0) {
        return titles.map((any) => {
          if (any.type === 'Synonym') {
            return any.title
          } else { return null }
        }).filter(n => n)
      } else { return null }
    },
    primaryAltTitle: 'title_synonyms[0]',
    slug: {
      path: 'url',
      fn: (propertyValue, source) => {
        return propertyValue.replace('.html', '').split('/').pop()
      }
    },
    publicationDemographics: 'demographics.name',
    genres: (iteratee) => {
      return iteratee.genres.map((genre) => {
        return genre.name
      }).filter(n => n)
    },
    'synopsis.en_us': 'synopsis',
    'description.en_us': 'background',
    tags: null,
    status: 'status',
    isLicensed: 'publishing',
    'bannerImage.mal': '',
    'posterImage.mal': 'images.jpg.large_image_url',
    'coverImage.mal': '',
    chapterCount: 'chapters',
    volumeCount: 'volumes',
    serialization: 'serializations.name',
    nextRelease: '',
    lastRelease: '',
    popularityRank: 'popularity',
    favoritesCount: 'favorites',
    score: 'scored',
    contentRating: '',
    originalLanguage: '',
    startYear: 'published.prop.from.year',
    endYear: 'published.prop.to.year',
    authors: (iteratee) => {
      return iteratee.authors.map((author) => {
        return author.name.toUpperCase()
      })
    },
    publishers: '',
    chapterNumbersResetOnNewVolume: false,
    'externalLinks.mal': 'url',
    'externalIds.mal': 'mal_id'
  }

  #recommendationsSchema = {
    id: 'mal_id',
    title: 'title',
    altTitles: 'title_synonyms[0]',
    desc: 'background',
    status: 'status',
    genres: (iteratee) => {
      return iteratee.genres.map((genre) => {
        return genre.name
      }).filter(n => n)
    },
    year: 'published.prop.from.year',
    r: '',
    score: 'scored',
    scoredBy: '',
    popularity: '',
    faved: '',
    url: '',
    authors: (iteratee) => {
      return iteratee.authors.map((author) => {
        return author.name.toUpperCase()
      })
    },
    cover: 'images.webp.large_image_url'
  }

  async #helperMangaBasedRecommendations (id, limit = 10) {
    const url = `${this.host}/v4/manga/${id}/recommendations`
    const response = await this.#limiter.schedule(() => axios.get(encodeURI(url)))
    const recommends = response.data.data
    const mangas = []
    let i = 0
    for (const recommend of recommends) {
      if (i > limit) { break }
      const ids = { id: recommend.entry.mal_id }
      const manga = await this.#limiter.schedule(() => this.#getMangaById(this.host, ids))
      mangas.push(manga)
      i++
    }
    return mangas
  }

  #helperLookupMangas (host, query, offset, page) {
    const url = `${host}/v4/manga?q=${query}&limit=25&page=${page}`
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
          reject(e.message)
        })
    })
  };

  #getMangaById (host, ids) {
    const url = `${host}/v4/manga/${ids.id}`
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
          reject(e.message)
        })
    })
  };

  #getMangaPictures (host, ids) {
    const url = `${host}/v4/manga/${ids.id}/pictures`
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
          reject(e.message)
        })
    })
  }
  // #endregion

  // #region public

  constructor () {
    super()
    this.id = 'mal'
    this.label = 'MyAnimeList'
    this.url = 'https://myanimelist.net/'
    this.credits = 'MyAnimeList.net is a property of MyAnimeList Co.,Ltd.'
    this.tags = []
    this.iconURL = 'https://cdn.myanimelist.net/images/favicon.ico'
    this.sourceURL = 'https://myanimelist.net/manga/[id]'
    this.options = ''
    this.lang = ['en']
    this.caps = [AgentCapabilities.MANGA_METADATA_FETCH, AgentCapabilities.MANGA_BASIC_RECOMMENDATIONS]
    this.host = 'https://api.jikan.moe'
    this.coverPriority = 20
    // -------------------------------------------------
    this.offsetInc = 25
    this.maxPages = 3
    this.mangaSchema = this.#mangaSchema
    this.lookupSchema = this.#lookupSchema
    this.recommendationsSchema = this.#recommendationsSchema
    this.funcGetMangaById = this.#getMangaById
    this.funcHelperLookupMangas = this.#helperLookupMangas
    this.funcHelperLookupRecommendations = this.#helperMangaBasedRecommendations
    this.funcGetPicturesById = this.#getMangaPictures
    this.limiter = this.#limiter
  };

  // #endregion
}

module.exports = Mal
