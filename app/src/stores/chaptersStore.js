import { defineStore } from 'pinia'
import libraryAPI from '@/api/library'
import logger from '@/utils/logger'

const TTL = 1000 * 60 // 1 min

function getChapterTitle (chapter) {
  const title = `c. ${chapter.chapter}`
  if (chapter.titles?.length < 3) return title
  if (chapter.titles?.en) return title + ' - ' + chapter.titles.en
  const key = chapter.titles ? Object.keys(chapter.titles)[0] : null
  if (key) {
    return title + ' - ' + Object.values(chapter.titles)[key]
  }
  return title
}
/**
 * @typedef chapterStore
 * @type { actions | getters | state | import('pinia').Store }
 */
/**
 * @typedef useChapterStore
 * @type function
 * @param {import('pinia').Pinia | null | undefined} [pinia] - Pinia instance to retrieve the store
 * @param {import('pinia').StoreGeneric} [hot] - dev only hot module replacement
 * @returns chapterStore
 */
/**
 * @type useChapterStore
 */
export const useChapterStore = defineStore('chapter', {
  state: () => ({
    // current context as seen by the user
    chapter: null,
    nextChapter: null,
    previousChapter: null,
    manga: null,
    pages: [],
    pagesCount: 0,
    // collection
    chapters: [],
    chaptersCount: 0,
    // helpers for filtering
    // common store properties
    isLoading: false,
    updatedAt: null
  }),
  getters: {
    getManga: (state) => {
      return state.manga
    },
    getChapters: (state) => {
      return state.chapters
    },
    getNextChapter: (state) => {
      return state.nextChapter
    },
    getPreviousChapter: (state) => {
      return state.previousChapter
    },
    getChaptersCount: (state) => {
      return state.chaptersCount
    },
    getChapter: (state) => {
      return state.chapter
    },
    getPages: (state) => {
      return state.pages
    },
    getPagesCount: (state) => {
      return state.pagesCount
    },
    getIsLoading: (state) => {
      return state.isLoading
    }
  },
  actions: {
    async fetchChapterPages (chapterId) {
      this.isLoading = true
      try {
        const res = await libraryAPI.getChapterPages(chapterId)
        if (res.success) {
          this.updatedAt = Date.now()
          this.pages = res.body.sort((a, b) => ((b.pageNumber - a.pageNumber) < 0) ? 1 : -1)
          this.pagesCount = res.body.length
        } else {
          logger.warn('API call succeeded but returned failure: ', res)
        }
      } catch (e) {
        logger.error({ err: e }, 'API call failed')
      } finally {
        this.isLoading = false
      }
    },
    async fetchChapter (chapterId) {
      this.isLoading = true
      try {
        const c = await libraryAPI.getChapter(chapterId)
        if (c.success) {
          this.updatedAt = Date.now()
          this.chapter = c.body
          // helper to set the chapter title
          this.chapter.canonicalTitle = getChapterTitle(this.chapter)
          // fetch manga
          const m = await libraryAPI.getManga(this.chapter.mangaId)
          if (m.success) {
            this.updatedAt = Date.now()
            this.manga = m.body
          } else {
            logger.warn('API call succeeded but returned failure: ', m)
          }

          const next = await libraryAPI.getNextChapter(this.chapter.id)
          if (next.success) {
            this.nextChapter = next.body
          } else {
            logger.warn('API call succeeded but returned failure: ', next)
          }

          const previous = await libraryAPI.getPreviousChapter(this.chapter.id)
          if (previous.success) {
            this.previousChapter = previous.body
          } else {
            logger.warn('API call succeeded but returned failure: ', previous)
          }
        } else {
          logger.warn('API call succeeded but returned failure: ', c)
        }
      } catch (e) {
        logger.error({ err: e }, 'API call failed: ')
      } finally {
        this.isLoading = false
      }
    },
    async fetchChapters () {
      const delta = Date.now() - this.updatedAt
      if (this.chapters.length > 0 && delta < TTL) {
        return
      }
      this.isLoading = true
      try {
        const res = await libraryAPI.getChapters(0, 25, 'readableAt', 'DESC')
        if (res.success) {
          this.updatedAt = Date.now()
          this.chapters = res.body.items
          this.chaptersCount = res.body.totalItems
        } else {
          logger.warn('API call succeeded but returned failure: ', res)
        }
      } catch (e) {
        logger.error({ err: e }, 'API call failed')
      } finally {
        this.isLoading = false
      }
    }
  }
})
