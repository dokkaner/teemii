const { Agent, AgentCapabilities } = require('../core/agent.js')
const Bottleneck = require('bottleneck')
const { logger } = require('../loaders/logger')
const utils = require('../utils/agent.utils')
const cheerio = require('cheerio')
const axios = require('axios')
const { configManager } = require('../loaders/configManager')

class Bato extends Agent {
  // #region private
  #limiter = new Bottleneck({
    maxConcurrent: 3,
    minTime: 1000
  })

  #lookupSchema = {
    id: 'data.id',
    title: {
      path: 'data.name',
      fn: (propertyValue) => {
        // remove (Official) from title if present because it can prevent mangas from being found
        return propertyValue.replace(/\(Official\)/i, '').trim()
      }
    },
    altTitles: 'data.altNames',
    desc: 'data.summary.text',
    status: 'data.originalStatus',
    genre: 'data.genres',
    year: 'data.originalPubFrom',
    r: '',
    score: 'data.stat_score_avg',
    scoredBy: '',
    popularity: '',
    faved: '',
    url: 'data.urlPath',
    authors: 'data.authors',
    cover: 'data.urlCoverOri',
    lang: 'data.tranLang',
    originalLanguage: 'data.origLang',
    'externalLinks.bato': 'urlPath',
    'externalIds.bato': 'id'
  }

  #chapterSchema = {
    id: 'data.id',
    'titles.en': 'data.title',
    mangaId: '',
    langAvailable: {
      path: 'data.lang',
      fn: (propertyValue) => {
        const lang = utils.langMap[propertyValue]
        return lang || 'en'
      }
    },
    posterImage: '',
    volume: '',
    chapter: {
      path: 'data',
      fn: (propertyValue, source) => {
        const dnameRegex = /\b(?:ch(?:apter)?|ep(?:isode)?|volume|v)\s*([\d.]+)\b/i
        const urlPathRegex = /-ch_([\d.]+)/i

        const urlPathMatch = source.data.urlPath.match(urlPathRegex)
        if (urlPathMatch) {
          return parseFloat(urlPathMatch[1]).toString()
        }
        const dnameMatch = source.data.dname.match(dnameRegex)
        if (dnameMatch) {
          return parseFloat(dnameMatch[1]).toString()
        }
        return 'unknown'
      }
    },
    pages: 'data.count_images',
    publishAt: 'data.dateCreate',
    readableAt: 'data.datePublic',
    'externalIds.bato': 'data.urlPath',
    'externalLinks.bato': 'data.urlPath',
    source: {
      path: '',
      fn: () => {
        return 'bato'
      }
    }
  }

  #mangaSchema = {
    id: 'id',
    type: '',
    canonicalTitle: 'name',
    'titles.en_us': 'name',
    altTitles: 'altNames',
    slug: '',
    publicationDemographics: '',
    genres: 'genres',
    'synopsis.en_us': '',
    'description.en_us': 'summary.text',
    tags: '',
    status: 'originalStatus',
    isLicensed: '',
    'bannerImage.bato': '',
    'posterImage.bato': '',
    'coverImage.bato': 'urlCoverOri',
    chapterCount: 'stat_count_chapters_normal',
    lastChapter: 'stat_count_chapters_normal',
    volumeCount: '',
    serialization: '',
    nextRelease: '',
    lastRelease: '',
    popularityRank: '',
    favoritesCount: '',
    score: 'stat_score_avg',
    contentRating: '',
    originalLanguage: 'origLang',
    startYear: 'originalPubFrom',
    endYear: 'originalPubTill',
    authors: 'authors',
    publishers: '',
    chapterNumbersResetOnNewVolume: '',
    'externalLinks.bato': 'urlPath',
    'externalIds.bato': 'id',
    lang: 'tranLang'
  }

  #pageSchema = {
    page: 'page',
    pageURL: 'url',
    chapterId: 'chapterId',
    mangaId: '',
    referer: 'referer'
  }

  // #region graphql
  #lookupQuery = `query ($search: String) {
\tget_content_searchComic(
\t\tselect: { page: 1, size: 1000, where: "browse", word: $search }
\t) {
\t\treqPage
\t\treqSize
\t\treqSort
\t\treqWord
\t\tnewPage
\t\tpaging {
\t\t\ttotal
\t\t\tpages
\t\t\tpage
\t\t\tinit
\t\t\tsize
\t\t\tskip
\t\t\tlimit
\t\t}
\t\titems {
\t\t\tdata {
\t\t\t\tid
\t\t\t\tdbStatus
\t\t\t\tslug
\t\t\t\turlPath
\t\t\t\tname
\t\t\t\taltNames
\t\t\t\tauthors
\t\t\t\tartists
\t\t\t\tgenres
\t\t\t\torigLang
\t\t\t\ttranLang
\t\t\t\tuploadStatus
\t\t\t\toriginalStatus
\t\t\t\toriginalPubFrom
\t\t\t\toriginalPubTill
\t\t\t\turlCover600
\t\t\t\turlCover300
\t\t\t\turlCoverOri
\t\t\t\tstat_score_avg
\t\t\t\tstat_score_bay
\t\t\t\tstat_count_chapters_normal
\t\t\t\tstat_count_chapters_others
\t\t\t\tsummary {
\t\t\t\t\ttext
\t\t\t\t}
\t\t\t}
\t\t}
\t}
}`

  #comicNodeQuery = `query ($manga: ID!) {
\tget_content_comicNode(id: $manga) {
\t\tdata {
\t\t\tid
\t\t\tdbStatus
\t\t\tslug
\t\t\turlPath
\t\t\tname
\t\t\taltNames
\t\t\tauthors
\t\t\tartists
\t\t\tgenres
\t\t\torigLang
\t\t\ttranLang
\t\t\tuploadStatus
\t\t\toriginalStatus
\t\t\toriginalPubFrom
\t\t\toriginalPubTill
\t\t\turlCover600
\t\t\turlCover300
\t\t\turlCoverOri
\t\t\tstat_score_avg
\t\t\tstat_score_bay
\t\t\tstat_count_chapters_normal
\t\t\tstat_count_chapters_others
\t\t\t\tsummary {
\t\t\t\t\ttext
\t\t\t\t}
\t\t}
\t}
}`

  #chapterNodeQuery = `query ($manga: ID!) {
\tget_content_chapterList(comicId: $manga) {
\t\tdata {
\t\t\tid
\t\t\tdbStatus
\t\t\tisNormal
\t\t\tisHidden
\t\t\tisDeleted
\t\t\tisFinal
\t\t\tdateCreate
\t\t\tdatePublic
\t\t\tdateModify
\t\t\tlang
\t\t\tdname
\t\t\ttitle
\t\t\turlPath
\t\t\tcount_images
\t\t}
\t}
}`

  // #endregion

  async #parseChapterPagesURL (doc, id) {
    const results = []

    // replace string doc "div name=" by "div class="
    const modified = doc.replaceAll('<div name="image-item"', '<div class="image-item"')

    const $ = cheerio.load(modified)
    let i = 0
    $('.image-item').each((index, element) => {
      const result = {}
      i++
      result.page = i
      result.url = $(element).find('img').attr('src')
      result.chapterId = id
      results.push(result)
    })
    return results
  }

  async #helperLookupMangas (host, query, offset, page) {
    if (page !== 1) return []
    const preferences = configManager.get('preferences.agentOptions')
    const langs = preferences.languages || ['en']
    const url = 'https://bato.to/apo'
    const variables = {
      search: query
    }
    try {
      const results = await axios.post(url, { query: this.#lookupQuery, variables })
      // keep only those having lang in langs or null
      results.data.data.get_content_searchComic.items = results.data.data.get_content_searchComic.items.filter((item) => {
        return langs.includes(item.data.tranLang) || item.data.tranLang === null
      })
      return results.data.data.get_content_searchComic.items
    } catch (e) {
      logger.error({ err: e })
      throw e
    }
  }

  async #getMangaById (host, ids) {
    const url = 'https://bato.to/apo'
    const variables = {
      manga: ids.id
    }
    try {
      const results = await axios.post(url, { query: this.#comicNodeQuery, variables })
      return results.data.data.get_content_comicNode.data
    } catch (e) {
      logger.error({ err: e })
      throw e
    }
  }

  async #funcHelperLookupChapters (host, ids, offset, page) {
    if (page !== 1) return []
    const url = 'https://bato.to/apo'

    let chapterLang = 'en'
    if (typeof ids.id === 'object' && ids.id) {
      const idObject = ids.id
      const languages = Object.keys(idObject)
      chapterLang = languages[0]
      ids.id = idObject[chapterLang]
    }

    if (!ids.id) {
      logger.error({ ids }, 'bato: funcHelperLookupChapters: ids.id is null')
      return []
    }

    const variables = {
      manga: ids.id
    }
    try {
      const results = await axios.post(url, { query: this.#chapterNodeQuery, variables })
      const chapters = results.data.data.get_content_chapterList
      // force lang of each chapter to chapterLang
      chapters.forEach((chapter) => {
        chapter.lang = [chapterLang]
      })
      return chapters
    } catch (e) {
      logger.error({ err: e })
      throw e
    }
  }

  async #funcHelperChapterPagesURLByChapterId (host, ids) {
    try {
      const url = host + ids.id
      const body = await this.#limiter.schedule(() => utils.getBody(url, '.btn.btn-sm.btn-info.btn-outline.btn-block.normal-case.opacity-80', false, false, false, 1))
      return await this.#parseChapterPagesURL(body, url)
    } catch (e) {
      logger.error({ err: e }, 'bato: funcHelperChapterPagesURLByChapterId')
      throw e
    }
  }

  // #endregion

  // #region public
  constructor () {
    super()
    this.id = 'bato'
    this.label = 'Bato.to'
    this.url = 'https://batotoo.com/'
    this.credits = 'https://batotoo.com/'
    this.tags = []
    this.iconURL = 'https://batotoo.com/public-assets/img/favicon.ico'
    this.sourceURL = 'https://batotoo.com/series/[id]'
    this.options = ''
    this.lang = ['en']
    this.caps = [AgentCapabilities.MANGA_METADATA_FETCH, AgentCapabilities.CHAPTER_FETCH]
    this.host = 'https://batotoo.com'
    this.priority = 55
    this.offsetInc = 100
    this.limiter = this.#limiter
    this.maxPages = 1
    this.mangaSchema = this.#mangaSchema
    this.lookupSchema = this.#lookupSchema
    this.chapterSchema = this.#chapterSchema
    this.pageSchema = this.#pageSchema
    this.funcGetMangaById = this.#getMangaById
    this.funcHelperLookupMangas = this.#helperLookupMangas
    this.funcHelperLookupChapters = this.#funcHelperLookupChapters
    this.funcHelperChapterPagesURLByChapterId = this.#funcHelperChapterPagesURLByChapterId
    this.coverPriority = 10
  };

  // #endregion
}

module.exports = Bato
