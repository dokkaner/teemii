const { Agent, AgentCapabilities } = require('../core/agent.js')
const Bottleneck = require('bottleneck')
const { logger } = require('../loaders/logger')
const utils = require('../utils/agent.utils')

class ComickFun extends Agent {
  // #region private
  #limiter = new Bottleneck({
    maxConcurrent: 3,
    minTime: 1000
  })

  #lookupSchema = {
    id: 'hid',
    title: 'title',
    altTitles: '',
    desc: 'desc',
    status: '',
    genre: '',
    year: 'year',
    r: '',
    score: 'rating',
    scoredBy: 'rating_count',
    popularity: 'follow_count',
    faved: '',
    url: '',
    authors: '',
    cover: 'cover_url',
    'externalIds.comickfun': 'hid',
    'externalLinks.comickfun': 'id'
  }

  #chapterSchema = {
    id: 'hid',
    titles: {
      path: 'title',
      fn: (propertyValue, source) => {
        if (propertyValue) {
          // return "lang", "title"
          const title = {}
          title[source.lang] = propertyValue
          return title
        } else {
          return ''
        }
      }
    },
    mangaId: '',
    langAvailable: 'lang',
    posterImage: '',
    volume: 'vol',
    chapter: 'chap',
    pages: '',
    publishAt: 'updated_at',
    readableAt: '',
    version: 0,
    votes: {
      path: 'up_count',
      fn: (propertyValue, source) => {
        if (propertyValue) {
          return parseInt(propertyValue) - parseInt(source.down_count)
        } else {
          return 0
        }
      }
    },
    groupScan: {
      path: 'group_name',
      fn: (propertyValue) => {
        return propertyValue ? propertyValue[0] : 'official'
      }
    },
    'externalIds.comickfun': 'hid',
    'externalLinks.comickfun': 'id',
    source: {
      path: '',
      fn: () => {
        return 'comickfun'
      }
    }
  }

  #mangaSchema = {
    id: 'comic.hid',
    type: '',
    canonicalTitle: 'comic.title',
    'titles.en_us': 'comic.title',
    altTitles: {
      path: 'comic.md_titles',
      fn: (propertyValue) => {
        return propertyValue.reduce((acc, titleObj) => {
          acc[titleObj.lang] = titleObj.title
          return acc
        }, {})
      }
    },
    slug: 'comic.slug',
    publicationDemographics: 'demographic',
    genres: '',
    'synopsis.en_us': '',
    'description.en_us': 'comic.desc',
    tags: (iteratee) => {
      const tags = iteratee.comic?.mu_comics?.mu_comic_categories
      if (tags && tags.length > 0) {
        return tags.map((tag) => {
          return tag.mu_categories.title
        }).filter(n => n)
      } else { return [] }
    },
    status: {
      path: 'status',
      fn: (propertyValue) => {
        return propertyValue === 1 ? 'ongoing' : 'completed'
      }
    },
    isLicensed: 'comic.mu_comics.licensed_in_english',
    'bannerImage.comickfun': '',
    'posterImage.comickfun': '',
    'coverImage.comickfun': 'comic.cover_url',
    chapterCount: 'comic.last_chapter',
    lastChapter: 'comic.last_chapter',
    volumeCount: 'comic.final_volume',
    serialization: '',
    nextRelease: '',
    lastRelease: '',
    popularityRank: 'comic.follow_rank',
    favoritesCount: 'comic.user_follow_count',
    score: 'comic.bayesian_rating',
    contentRating: 'comic.content_rating',
    originalLanguage: 'comic.iso639_1',
    startYear: 'comic.year',
    endYear: '',
    authors: 'authors[0].name',
    publishers: (iteratee) => {
      const publishers = iteratee.comic.mu_comics?.mu_comic_publishers || []
      if (publishers.length > 0) {
        return publishers.map((any) => {
          return any.mu_publishers.title?.toLowerCase()
        }).filter(n => n)
      } else { return null }
    },
    chapterNumbersResetOnNewVolume: 'comic.chapter_numbers_reset_on_new_volume_manual',
    'externalLinks.comickfun': 'comic.id',
    'externalIds.comickfun': 'comic.hid'
  }

  #pageSchema = {
    page: 'page',
    pageURL: 'url',
    chapterId: 'chapterId',
    mangaId: '',
    referer: 'referer'
  }

  async #helperLookupChapters (host, ids, _offset, page, lang) {
    let langParam = ''
    if (lang) {
      langParam = `&lang=${lang}`
    }

    const url = `${host}/comic/${ids.id}/chapters?limit=${this.offsetInc}&page=${page}${langParam}`
    try {
      const response = await utils.getBody(url, null, false, false, true)
      return JSON.parse(response).chapters
    } catch (e) {
      logger.error({ err: e }, 'Error in comicfun helperLookupChapters')
      throw e
    }
  }

  async #helperLookupMangas (host, query, offset, page) {
    const url = `${host}/v1.0/search?page=${page}&limit=${this.offsetInc}&tachiyomi=true&q=${encodeURIComponent(
      query
    )}`

    try {
      const response = await utils.getBody(url, null, false, false, true)
      return JSON.parse(response)
    } catch (e) {
      logger.error({ err: e }, 'Error in comicfun helperLookupMangas')
      throw e
    }
  }

  async #getMangaById (host, ids) {
    const url = `${host}/comic/${ids.id}?tachiyomi=true`
    try {
      const response = await utils.getBody(url, null, false, false, true)
      return JSON.parse(response)
    } catch (e) {
      logger.error({ err: e }, 'Error in comicfun getMangaById')
      throw e
    }
  }

  async #ChapterPagesURLByChapterId (host, ids) {
    const url = `${host}/chapter/${ids.id}?tachiyomi=true`
    try {
      const response = await utils.getBody(url, null, false, false, true)
      return JSON.parse(response)
    } catch (e) {
      logger.error({ err: e }, 'Error in comicfun ChapterPagesURLByChapterId')
      throw e
    }
  }

  #funcPrePageSchema (pages, chapterId) {
    const unmappedPages = []
    let i = 0
    if (pages.chapter.images) {
      pages.chapter.images.forEach((image) => {
        const item = {}
        i++
        item.url = image.url
        item.page = i
        item.chapterId = chapterId.id
        unmappedPages.push(item)
      })
    }
    return unmappedPages
  }

  // #endregion

  // #region public
  constructor () {
    super()
    this.id = 'comickfun'
    this.label = 'ComickFun'
    this.url = 'https://comick.cc/'
    this.credits = 'https://comick.cc/'
    this.tags = []
    this.iconURL = 'https://comick.cc/favicon.ico'
    this.sourceURL = 'https://comick.cc/comic/[id]'
    this.options = ''
    this.lang = ['*']
    this.caps = [AgentCapabilities.MANGA_METADATA_FETCH, AgentCapabilities.CHAPTER_FETCH]
    this.host = 'https://api.comick.cc'
    this.priority = 5
    this.coverPriority = 40
    // -------------------------------------------------
    this.limiter = this.#limiter
    this.offsetInc = 300
    this.maxPages = 3
    this.mangaSchema = this.#mangaSchema
    this.lookupSchema = this.#lookupSchema
    this.chapterSchema = this.#chapterSchema
    this.pageSchema = this.#pageSchema
    this.funcPrePageSchema = this.#funcPrePageSchema
    this.funcGetMangaById = this.#getMangaById
    this.funcHelperLookupMangas = this.#helperLookupMangas
    this.funcHelperLookupChapters = this.#helperLookupChapters
    this.funcHelperChapterPagesURLByChapterId =
      this.#ChapterPagesURLByChapterId
  }

  // #endregion
}

module.exports = ComickFun
