/**
 * @file agent.mangakakalot.js
 * based on https://github.com/LuckyYam/MangaKakalotScrapper
 */
const { Agent, AgentCapabilities } = require('../core/agent.js')
const Bottleneck = require('bottleneck')
const axios = require('axios')
const { logger } = require('../loaders/logger')
const cheerio = require('cheerio')

function parseCustomDate (dateStr) {
  // Extraction des parties de la date
  const parts = dateStr.match(/(\w+)\s(\d+),(\d+)/)
  if (!parts) {
    // possible that the date is "hour ago" or "yesterday"
    return new Date()
  }

  const month = parts[1]
  const day = parts[2]
  let year = parts[3]

  year = '20' + year
  const fullDateStr = `${month} ${day}, ${year}`
  return new Date(fullDateStr)
}

class Mangakakalot extends Agent {
  // #region private
  #limiter = new Bottleneck({
    maxConcurrent: 3,
    minTime: 1000
  })

  #lookupSchema = {
    id: 'id',
    title: 'name',
    authors: 'author',
    year: '',
    cover: 'thumbnail',
    'externalIds.mangakakalot': 'id',
    'externalLinks.mangakakalot': 'slug'
  }

  #chapterSchema = {
    id: 'id',
    'titles.en': 'title',
    mangaId: 'mangaId',
    langAvailable: 'lang',
    posterImage: '',
    chapter: 'chapter',
    publishAt: 'uploadedAt',
    readableAt: 'uploadedAt',
    vote: 0,
    'externalIds.mangakakalot': 'id',
    'externalLinks.mangakakalot': '',
    source: {
      path: '',
      fn: () => {
        return 'mangakakalot'
      }
    }
  }

  #mangaSchema = {
    id: 'id',
    canonicalTitle: 'name',
    altTitles: 'alternateNames',
    slug: 'slug',
    genres: (iteratee) => {
      const genres = iteratee.genres
      if (genres.length > 0) {
        return genres.map((tag) => {
          return tag
        }).filter(n => n)
      } else { return [] }
    },
    'synopsis.en_us': '',
    'description.en_us': 'summary',
    status: 'status',
    'coverImage.mangakakalot': 'thumbnail',
    chapterCount: 'attributes.lastChapter',
    volumeCount: 'attributes.lastVolume',
    authors: 'author',
    'externalIds.mangakakalot': 'id',
    'externalLinks.mangakakalot': 'slug'
  }

  #pageSchema = {
    page: 'page',
    pageURL: 'url',
    chapterId: 'chapterId',
    mangaId: '',
    referer: 'referer'
  }

  /**
   * Parses page data from HTML content to extract information about each page in a manga chapter.
   * Utilizes cheerio for parsing the HTML.
   *
   * @param {string} data - HTML content to be parsed.
   * @param {string} chapterId - Unique identifier for the chapter.
   * @returns {Array} An array of objects, each representing a page in the manga chapter.
   */
  #parsePages (data, chapterId) {
    const $ = cheerio.load(data)
    const pages = []

    // Iterating over each element that represents a page
    $('.img-loading').each((i, el) => {
      const title = $(el).attr('title') || ''
      const url = $(el).attr('data-src')

      // Check if the URL is present before adding to pages array
      if (url) {
        pages.push({
          chapterId,
          title,
          page: i + 1, // Adjusting index to start from 1 for page number
          url
        })
      }
    })

    return pages
  }

  /**
   * Parses chapter data from HTML content to extract details about each chapter of a manga.
   * Utilizes cheerio for parsing HTML and structures the data in a more manageable format.
   *
   * @param {string} data - HTML content to be parsed.
   * @param {string} mangaId - Unique identifier for the manga.
   * @returns {Array} An array of objects, each representing a chapter of the manga.
   */
  #parseChapters (data, mangaId) {
    // Load the HTML content using cheerio
    const $ = cheerio.load(data)

    // Initializing an array to hold chapter data
    const chapters = []

    // Iterating over each element representing a chapter
    $('.chapter-list > .row').each((i, el) => {
      let title = ''
      let uploadedAt = ''
      let chapterNumber = 0
      let chapterId = ''
      const baseChapterUrl = 'https://ww3.mangakakalot.tv'
      let chapterUrl = baseChapterUrl
      const lang = 'en' // Language is set as 'en' for English

      // Processing each span element within a chapter row
      $(el).find('span').each((index, element) => {
        switch (index) {
          case 0:{ // Title and URL
            title = $(element).find('a').text().trim()
            const slug = $(element).find('a').attr('href')
            if (slug) {
              chapterId = slug.split('manga-')[1]
              chapterUrl += slug
              chapterNumber = parseInt(chapterId.split('-')[1], 10) || 0
            }
            break
          }
          case 2: // Uploaded date
            uploadedAt = parseCustomDate($(element).text().trim())
            break
        }
      })

      // Adding chapter details to the array
      if (chapterUrl !== baseChapterUrl) {
        chapters.push({
          chapter: chapterNumber,
          title,
          id: chapterId,
          lang,
          mangaId,
          uploadedAt,
          url: chapterUrl
        })
      }
    })

    // Returning chapters in reverse order to maintain chronological order
    return chapters.reverse()
  }

  /**
   * Parses manga data from HTML content using cheerio.
   * Extracts various details about the manga including name, author, genres, and more.
   *
   * @param {string} data - HTML content to be parsed.
   * @param {string} id - Unique identifier for the manga.
   * @returns {Object} An object containing parsed manga details.
   */
  #parseManga (data, id) {
    // Load HTML data using cheerio
    const $ = cheerio.load(data)

    // Extracting manga details
    const detailsElement = $('.manga-info-text').find('li')
    const namesElement = detailsElement.first()
    const name = namesElement.find('h1').text().trim()
    let author = ''
    let genres = []
    let lastUpdated = ''
    let status = ''
    const thumbnailSlug = $('.manga-info-pic').find('img').attr('src')
    const thumbnailBaseURL = 'https://ww3.mangakakalot.tv'
    const defaultThumbnail = `${thumbnailBaseURL}/static/images/404-avatar.png`
    const thumbnail = thumbnailSlug ? `${thumbnailBaseURL}${thumbnailSlug}` : defaultThumbnail
    const alternateNames = namesElement.find('.story-alternative').text().trim().split(';').filter(name => name)
    const slug = $('head > link:nth-child(1)').attr('href') || '/'
    const url = `${thumbnailBaseURL}${slug}`

    // Processing each detail element
    detailsElement.each((i, el) => {
      const text = $(el).text().trim()
      if (text.startsWith('Author(s) :')) {
        author = text.replace('Author(s) :', '').split(';')[0].trim()
      }
      if (text.startsWith('Status :')) {
        status = text.replace('Status :', '').trim()
      }
      if (text.startsWith('Last updated :')) {
        lastUpdated = text.replace('Last updated :', '').trim()
      }
      if (text.startsWith('Genres :')) {
        genres = text.replace('Genres :', '').split(',').map(genre => genre.trim()).filter(genre => genre)
      }
    })

    // Extracting summary
    const summary = $('#noidungm').text().split('summary:', 2)[1]?.trim() || ''

    // Constructing and returning the manga object
    return { id, name, slug, url, thumbnail, alternateNames, author, genres, lastUpdated, status, summary }
  }

  /**
   * Parses search results data from HTML content to extract details about each manga found in the search.
   * Utilizes cheerio for parsing HTML and structures the data for easy access.
   *
   * @param {string} data - HTML content to be parsed for search results.
   * @returns {Array} An array of objects, each representing a manga found in the search.
   */
  #parseSearch (data) {
    const $ = cheerio.load(data)
    const searchResults = []

    // Iterating over each element representing a search result
    $('.story_item').each((i, el) => {
      // Extracting thumbnail URL or using a default if not found
      const thumbnail = $(el).find('a > img').attr('src') || 'https://ww3.mangakakalot.tv/static/images/404-avatar.png'

      // Extracting details from the search result item
      const detailsElement = $(el).find('.story_item_right')
      const nameAndSlugElement = detailsElement.find('h3 > a')
      const name = nameAndSlugElement.text().trim()
      const slug = nameAndSlugElement.attr('href')
      const id = slug ? slug.split('manga-')[1] : ''

      let author = []
      let views = 0
      let lastUpdated = ''

      detailsElement.find('span').each((index, element) => {
        const text = $(element).text()
        if (text.includes('Author(s)')) {
          author = text.replace('Author(s) : ', '').trim().split('\n').filter(n => n).map(a => a.trim().toUpperCase())
        }
        if (text.includes('Updated')) {
          lastUpdated = text.replace('Updated : ', '').trim()
        }
        if (text.includes('View')) {
          views = parseInt(text.replace('View : ', '').replace(/,/g, ''), 10) || 0
        }
      })

      searchResults.push({ id, name, slug, author, views, lastUpdated, thumbnail })
    })

    return searchResults
  }

  async #helperLookupChapters (host, ids, offset, page) {
    const url = `https://ww3.mangakakalot.tv/manga/manga-${ids.id}`
    try {
      if (page > 1) return []
      const response = await axios.get(url)
      return this.#parseChapters(response.data, ids.id)
    } catch (e) {
      logger.error({ err: e }, 'Failed to get search results from mangakakalot')
      throw e
    }
  };

  async #helperLookupMangas (host, query, offset, page) {
    const url = `${host}/search/${query}?page=${page}`
    try {
      if (page > 1) return []
      const response = await axios.get(url)
      return this.#parseSearch(response.data)
    } catch (e) {
      logger.error({ err: e }, 'Failed to get search results from mangakakalot')
      throw e
    }
  };

  /**
   * Retrieves manga data by its ID from the specified host, including details about the author, artist, and cover art.
   *
   * @param {string} host - The base URL of the API.
   * @param {Object} ids - An object containing the manga's identifier.
   * @returns {Promise<Object>} - A promise that resolves with the manga data or rejects with an error message.
   */
  async #getMangaById (host, ids) {
    const url = `https://ww3.mangakakalot.tv/manga/manga-${ids.id}`
    try {
      const response = await axios.get(url)
      return this.#parseManga(response.data, ids.id)
    } catch (e) {
      logger.error({ err: e }, 'Failed to get search results from mangakakalot')
      throw e
    }
  }

  async #ChapterPagesURLByChapterId (host, ids) {
    const url = `https://ww3.mangakakalot.tv/chapter/manga-${ids.id}`
    try {
      const response = await axios.get(url)
      return this.#parsePages(response.data, ids.id)
    } catch (e) {
      logger.error({ err: e }, 'Failed to get search results from mangakakalot')
      throw e
    }
  };
  // #endregion

  // #region public
  constructor () {
    super()
    this.id = 'mangakakalot'
    this.label = 'MangaKakalot'
    this.url = 'https://ww3.mangakakalot.tv/'
    this.credits = 'MangaKakalot 2022'
    this.tags = []
    this.iconURL = 'https://ww7.mangakakalot.tv/static/images/favicon.ico'
    this.sourceURL = 'https://ww7.mangakakalot.tv/manga/manga-[id]'
    this.options = ''
    this.lang = ['*']
    this.caps = [AgentCapabilities.MANGA_METADATA_FETCH, AgentCapabilities.CHAPTER_FETCH]
    this.host = 'https://ww3.mangakakalot.tv/'
    this.priority = 50
    this.coverPriority = 100
    this.supportPagination = false
    // -------------------------------------------------
    this.limiter = this.#limiter
    this.offsetInc = 100
    this.mangaSchema = this.#mangaSchema
    this.lookupSchema = this.#lookupSchema
    this.chapterSchema = this.#chapterSchema
    this.pageSchema = this.#pageSchema
    this.funcGetMangaById = this.#getMangaById
    this.funcHelperLookupMangas = this.#helperLookupMangas
    this.funcHelperLookupChapters = this.#helperLookupChapters
    this.funcHelperChapterPagesURLByChapterId = this.#ChapterPagesURLByChapterId
    this.maxPages = 3
  };
  // #endregion
}

module.exports = Mangakakalot
