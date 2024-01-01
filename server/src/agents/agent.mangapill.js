const { Agent, AgentCapabilities } = require('../core/agent.js')
const Bottleneck = require('bottleneck')
const { logger } = require('../loaders/logger.js')
const cheerio = require('cheerio')
const utils = require('../utils/agent.utils')

// noinspection JSJQueryEfficiency
class Mangapill extends Agent {
  // #region private
  #limiter = new Bottleneck({
    maxConcurrent: 2, minTime: 1000
  })

  #lookupSchema = {
    id: 'id',
    title: 'name',
    altTitles: 'synonyms',
    desc: '',
    url: 'url',
    year: 'year',
    cover: 'cover',
    genre: '',
    score: '',
    status: 'state',
    lastChapter: '',
    authors: '',
    'externalIds.mangapill': 'id',
    'externalLinks.mangapill': 'uri'
  }

  #mangaSchema = {
    id: 'id',
    type: '',
    canonicalTitle: 'title',
    altTitles: 'altTitle',
    genres: 'genres',
    'synopsis.fr_fr': '',
    'description.en_us': 'desc',
    'coverImage.mangapill': 'cover',
    chapterCount: 'chapterCount',
    startYear: 'year',
    status: 'status',
    authors: 'authors',
    'externalIds.mangapill': 'id',
    'externalLinks.mangapill': 'uri'
  }

  #chapterSchema = {
    id: '',
    'titles.en': 'title',
    mangaId: '',
    langAvailable: 'lang',
    posterImage: '',
    volume: 'volume',
    chapter: 'chapter',
    pages: '',
    publishAt: '',
    readableAt: '',
    'externalIds.mangapill': 'id',
    'externalLinks.mangapill': 'uri',
    source: {
      path: '',
      fn: () => {
        return 'mangapill'
      }
    }
  }

  #pageSchema = {
    page: 'page',
    pageURL: 'url',
    chapterId: 'chapterId',
    mangaId: '',
    referer: 'referer'
  }

  async #parseSearch (host, doc) {
    const results = []
    const $ = cheerio.load(doc)

    $('body > div.container.py-3 > div.my-3.grid.justify-end.gap-3.grid-cols-2.md\\:grid-cols-3.lg\\:grid-cols-5 > div').each(function (i, e) {
      const result = {}
      result.id = $(this).find('a').attr('href')
      result.cover = $(this).find('a > figure > img').attr('src')
      result.url = host + result.id
      const regex = /\/(\d+)\//
      result.id = result.id.match(regex)[1]
      result.name = utils.cleanStr($(this).find('div > a > div:nth-child(1)').text())
      result.synonyms = utils.cleanStr($(this).find('div > a > div:nth-child(2)').text())
      if (result.synonyms) {
        result.synonyms = result.synonyms.split(',').filter(n => n)
      }
      result.year = utils.cleanStr($(this).find('div > div > div > div:nth-child(2)').text())
      result.state = utils.cleanStr($(this).find('div > div > div > div:nth-child(3)').text())
      results.push(result)
    })
    return results
  }

  async #parseManga (host, doc, id) {
    const result = {}
    const $ = cheerio.load(doc)

    result.title = $('body > div.container > div.flex.flex-col.sm\\:flex-row.my-3 > div.flex.flex-col > div:nth-child(1) > h1').text()
    result.score = ''
    result.altTitle = ''
    result.demographics = ''
    result.genres = $('body > div.container > div.flex.flex-col.sm\\:flex-row.my-3 > div.flex.flex-col > div:nth-child(4)').text().replace('Genres', '')
    result.genres = result.genres.split('\n').filter(n => n)
    result.authors = ''
    result.desc = $('body > div.container > div.flex.flex-col.sm\\:flex-row.my-3 > div.flex.flex-col > div:nth-child(2) > p').text()
    result.cover = $('body > div.container > div.flex.flex-col.sm\\:flex-row.my-3 > div.text-transparent.flex-shrink-0.w-60.h-80.relative.rounded.bg-card.mr-3.mb-3.md\\:mb-0 > img').attr('src')
    result.year = $('body > div.container > div.flex.flex-col.sm\\:flex-row.my-3 > div.flex.flex-col > div.grid.grid-cols-1.md\\:grid-cols-3.gap-3.mb-3 > div:nth-child(3) > div').text()
    result.url = id
    const regex = /\/(\d+)\//
    if (id.includes('/manga/')) {
      result.id = id.match(regex)[1]
    } else {
      result.id = id
    }
    return result
  }

  async #parseSearchChapters (doc, host, id) {
    const results = []
    const $ = cheerio.load(doc)

    $('#chapters > div > a').each(function () {
      const result = {}
      result.uri = host + utils.cleanStr($(this).attr('href'))
      result.title = utils.cleanStr($(this).text())
      result.lang = 'en'
      result.id = result.uri;
      [result.title, result.chapter] = utils.extractTitleNChapter(result.title)
      results.push(result)
    })
    return results
  }

  async #parseChapterPagesURL (doc, id) {
    const results = []
    const $ = cheerio.load(doc)
    $('img[class*="js-page"]').each(function (i, e) {
      i++
      const result = {}
      result.page = i
      result.chapterId = id
      result.url = $(e).attr('data-src')
      result.title = $(e).attr('alt')
      results.push(result)
    })

    return results
  }

  // ----------------------------------------------------------------------------------------------------------------
  async #helperLookupMangas (host, query, offset, page) {
    const url = `${this.host}/search?q=${encodeURIComponent(query)}`
    if (page === 1) {
      try {
        const body = await this.#limiter.schedule(() => utils.getBody(url, null, true, false))
        return await this.#parseSearch(this.host, body)
      } catch (e) {
        logger.error({ err: e }, 'Error in Mangapill helperLookupMangas')
        throw e
      }
    } else {
      return []
    }
  }

  async #getMangaById (host, ids) {
    try {
      if (ids.url?.includes('/manga/')) {
        const body = await this.#limiter.schedule(() => utils.getBody(ids.url, null, true, false))
        return await this.#parseManga(this.host, body, ids.url)
      } else {
        const url = `${this.host}/manga/${ids.id}`
        const body = await this.#limiter.schedule(() => utils.getBody(url, null, true, false))
        return await this.#parseManga(this.host, body, ids.id)
      }
    } catch (e) {
      logger.error({ err: e })
      throw e
    }
  }

  async #funcHelperLookupChapters (host, ids, offset, page, lang) {
    try {
      if (page === 1) {
        const url = `${this.host}/manga/${ids.id}`
        const body = await this.#limiter.schedule(() => utils.getBody(url, null, true, false))
        return await this.#parseSearchChapters(body, this.host, ids.url)
      } else {
        return []
      }
    } catch (e) {
      logger.error({ err: e })
      return null
    }
  }

  async #funcHelperChapterPagesURLByChapterId (host, ids) {
    try {
      const body = await this.#limiter.schedule(() => utils.getBody(ids.id, null, false, false))
      return await this.#parseChapterPagesURL(body, ids.url)
    } catch (e) {
      logger.error({ err: e }, 'Error in Mangapill helperChapterPagesURLByChapterId')
      throw e
    }
  }

  // #endregion

  // #region public
  constructor () {
    super()
    this.id = 'mangapill'
    this.label = 'Mangapill'
    this.url = 'https://mangapill.com'
    this.credits = 'Mangapill'
    this.tags = []
    this.iconURL = 'https://mangapill.com/static/favicon/favicon-32x32.png'
    this.sourceURL = 'https://www.mangapill.com/manga/[id]'
    this.options = ''
    this.lang = ['en']
    this.caps = [AgentCapabilities.MANGA_METADATA_FETCH, AgentCapabilities.CHAPTER_FETCH]
    this.host = 'https://mangapill.com'
    this.priority = 40
    this.coverPriority = 45
    // -------------------------------------------------
    this.limiter = this.#limiter
    this.offsetInc = 100
    this.maxPages = 1
    this.mangaSchema = this.#mangaSchema
    this.lookupSchema = this.#lookupSchema
    this.chapterSchema = this.#chapterSchema
    this.pageSchema = this.#pageSchema
    this.funcHelperLookupMangas = this.#helperLookupMangas
    this.funcGetMangaById = this.#getMangaById
    this.funcHelperLookupChapters = this.#funcHelperLookupChapters
    this.funcHelperChapterPagesURLByChapterId = this.#funcHelperChapterPagesURLByChapterId
  };

  // #endregion
}

module.exports = Mangapill
