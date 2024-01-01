const { Agent } = require('../core/agent.js')
const Bottleneck = require('bottleneck')
const { logger } = require('../loaders/logger')
const cheerio = require('cheerio')
const utils = require('../utils/agent.utils')
const { AgentCapabilities } = require('../core/agent')

class Nautiljon extends Agent {
  // #region private
  #limiter = new Bottleneck({
    maxConcurrent: 3,
    minTime: 1000
  })

  #lookupSchema = {
    id: 'id',
    title: 'title',
    altTitles: 'altTitle',
    desc: 'desc',
    status: '',
    genre: 'genre',
    year: 'year',
    r: '',
    score: '',
    scoredBy: '',
    popularity: '',
    faved: '',
    url: 'id',
    authors: '',
    cover: 'cover',
    'externalIds.nautiljon': 'id'
  }

  #mangaSchema = {
    id: -1,
    type: 'type',
    'titles.fr_fr': 'name',
    altTitles: '{}',
    slug: '',
    publicationDemographics: 'publicationDemographics',
    genres: 'genres',
    'synopsis.fr_fr': '',
    'description.fr_fr': 'desc',
    canonicalTitle: '',
    status: '',
    'bannerImage.nautiljon': '',
    'posterImage.nautiljon': '',
    'coverImage.nautiljon': 'cover',
    chapterCount: '',
    volumeCount: '',
    serialization: '',
    nextRelease: '',
    lastRelease: '',
    popularityRank: '',
    favoritesCount: '',
    score: '',
    ageRating: '',
    contentRating: '',
    originalLanguage: '',
    startYear: '',
    endYear: '',
    authors: '',
    chapterNumbersResetOnNewVolume: '',
    'externalLinks.nautiljon': 'id',
    'externalIds.nautiljon': 'id'
  }

  async #parseManga (doc, id) {
    const result = {}
    try {
      const $ = cheerio.load(doc)
      result.name = utils.cleanStr($('.h1titre').find('span').text())
      result.year = utils.cleanStr($('.liste_infos').find('ul > li:nth-child(2)').text())
      result.year = result.year.substring(result.year.indexOf('-') + 1)

      result.publicationDemographics = utils.cleanStr($('.liste_infos').find('ul > li:nth-child(3)').text())
      result.publicationDemographics = result.publicationDemographics.substring(result.publicationDemographics.indexOf(': ') + 1).trim()

      result.genres = utils.cleanStr($('.liste_infos').find('ul > li:nth-child(4)').text())
      result.genres = result.genres.substring(result.genres.indexOf(': ') + 1).trim()
      result.genres = result.genres.split(' - ')

      result.tags = utils.cleanStr($('.liste_infos').find('ul > li:nth-child(5)').text())
      result.tags = result.tags.substring(result.tags.indexOf(': ') + 1).trim()
      result.tags = result.tags.split(' - ')

      result.cover = utils.cleanStr($('.image_fiche').find('img').attr('src'))
      result.cover = this.host + result.cover
      result.desc = utils.cleanStr($('.description').text())
      result.id = id
    } catch (e) {
      logger.error({ err: e })
      return {}
    }
    return result
  }

  async #parseSearch (host, doc) {
    const $ = cheerio.load(doc)
    const results = []
    $('#content > div.border_div > table > tbody > tr').each(function () {
      const result = {}
      result.url = $(this).find('td > a').attr('href')
      if (result.url) {
        result.id = result.url
        result.cover = this.host + utils.cleanStr($(this).find('td > a > img').attr('src'))
        result.title = utils.cleanStr($(this).find('td > a').attr('title'))
        result.altTitle = utils.cleanStr($(this).find('td:nth-child(2) > span').text())
        // replace ( and ) from altTitle
        result.altTitle = result.altTitle.replace(/\(/g, '')
        result.altTitle = result.altTitle.replace(/\)/g, '')
        result.desc = utils.cleanStr($(this).find('td:nth-child(2) > p').text())
        // remove text "Lire la suite" from desc
        result.desc = result.desc.replace(/Lire la suite/g, '')
        result.genre = utils.cleanStr($(this).find('td:nth-child(3)').text())
        result.year = utils.cleanStr($(this).find('td:nth-child(8)').text())
        result.score = utils.cleanStr($(this).find('td:nth-child(9)').text())
        // score is in format "x/10" so we remove the "/10" part
        result.score = result.score.substring(0, result.score.indexOf('/'))
        results.push(result)
      }
    })
    return results
  };

  // ------------------------------------------------------------------------------------------------------------------
  async #helperLookupMangas (host, query, offset, page) {
    query = query.replace(/,/g, ' ')
    query = query.replace(/\s+/g, ' ')
    query = query.trim()
    const params = 'q=' + encodeURIComponent(query)
    const url = `${host}/mangas/?${params}`
    if (page === 1) {
      try {
        const body = await this.#limiter.schedule(() => utils.getBody(url, null, true, false))
        return await this.#parseSearch(this.host, body)
      } catch (e) {
        logger.error({ err: e }, 'Error in Nautiljon helperLookupMangas')
        throw e
      }
    } else {
      return []
    }
  };

  async #getMangaById (host, ids) {
    try {
      const url = `${host}${ids.id}`
      const body = await this.#limiter.schedule(() => utils.getBody(url, null, false, true))
      return await this.#parseManga(body, ids.id)
    } catch (e) {
      logger.error({ err: e }, 'Error in Nautiljon getMangaById')
      throw e
    }
  }
  // #endregion

  // #region public
  constructor () {
    super()
    this.id = 'nautiljon'
    this.label = 'Nautiljon'
    this.url = 'https://www.nautiljon.com/'
    this.credits = 'Nautiljon.com.'
    this.tags = []
    this.iconURL = 'https://www.nautiljon.com/static/favicon.ico'
    this.sourceURL = 'https://www.nautiljon.com/[id]'
    this.options = ''
    this.lang = ['fr']
    this.caps = [AgentCapabilities.MANGA_METADATA_FETCH]
    this.host = 'https://www.nautiljon.com'
    this.endpoint = 'scrapper'
    this.coverPriority = 60
    // -------------------------------------------------
    this.limiter = this.#limiter
    this.offsetInc = 100
    this.maxPages = 3
    this.mangaSchema = this.#mangaSchema
    this.lookupSchema = this.#lookupSchema
    this.funcGetMangaById = this.#getMangaById
    this.funcHelperLookupMangas = this.#helperLookupMangas
  };

  // #endregion
}

module.exports = Nautiljon
