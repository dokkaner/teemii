import { defineStore } from 'pinia'
import libraryAPI from '@/api/library'
import logger from '@/utils/logger'
import helpers from '@/stores/utils'

const TTL = 1000 * 60 * 60 // 1 hour

/**
 * @typedef mangaStore
 * @type { actions | getters | state | import('pinia').Store }
 */
/**
 * @typedef useMangaStore
 * @type function
 * @param {import('pinia').Pinia | null | undefined} [pinia] - Pinia instance to retrieve the store
 * @param {import('pinia').StoreGeneric} [hot] - dev only hot module replacement
 * @returns mangaStore
 */
/**
 * @type useMangaStore
 */
export const useMangaStore = defineStore('manga', {
  state: () => ({
    // current context as seen by the user
    manga: null,
    lastManga: null,
    characters: [],
    diskSize: 0,
    suggestions: [],
    chapters: [],
    lastChapters: [],
    chapterCount: 0,
    ownedChapters: 0,
    // collection
    mangas: [],
    mangasUnread: [],
    mangasRead: [],
    mangasLastAdded: [],
    mangasLastPublished: [],
    mangasTopRead: [],
    randomMangas: [],
    mangaCount: 0,
    // helpers for filtering
    yearsMinMax: [],
    years: [],
    scoresMinMax: [],
    scores: [],
    // common store properties
    isLoading: false,
    updatedAt: null
  }),
  getters: {
    getLastManga: (state) => {
      if (!state.lastManga) {
        return state.manga
      } else {
        return state.lastManga
      }
    },
    getRandomMangas: (state) => {
      return state.randomMangas
    },
    getMangasTopRead: (state) => {
      return state.mangasTopRead
    },
    getMangasFiltered: (state) => (filters) => {
      const filteredMangas = state.mangas.filter(manga => {
        let isFiltered = true
        if (filters.searchText?.trim().length > 0) {
          isFiltered &&= helpers.filterBySearchText(manga, filters.searchText)
        }
        if (filters.years?.length === 2) {
          isFiltered &&= helpers.filterByYears(manga, filters.years)
        }
        if (filters.scores?.length === 2) {
          isFiltered &&= helpers.filterByScores(manga, filters.scores)
        }
        if (filters.genres?.length > 0) {
          isFiltered &&= helpers.filterByGenres(manga, filters.genres)
        }
        if (filters.types?.length > 0 && filters.types !== 'ALL') {
          isFiltered &&= helpers.filterByTypes(manga, filters.types)
        }
        return isFiltered
      })
      return helpers.sortMangas(filteredMangas, filters.orderByField, filters.orderBy)
    },
    getScores: (state) => {
      return state.scores
    },
    getScoresMinMAX: (state) => {
      return state.scoresMinMax
    },
    getYears: (state) => {
      return state.years
    },
    getYearsMinMAX: (state) => {
      return state.yearsMinMax
    },
    getMangaCount: (state) => {
      return state.mangaCount
    },
    getLastPublishedMangas: (state) => {
      return state.mangasLastPublished.map((m) => {
        return helpers.mapMangaToSlide(m)
      })
    },
    getLastAddedMangas: (state) => (variant = 'primary') => {
      return state.mangasLastAdded.map((m) => {
        return helpers.mapMangaToSlide(m, variant)
      })
    },
    getMangasRead: (state) => (variant = 'primary') => {
      return state.mangasRead.map((m) => {
        return helpers.mapMangaToSlide(m, variant)
      })
    },
    getMangasByGenre: (state) => (genreFilter) => {
      return state.mangas.map((m) => {
        return helpers.mapMangaToSlide(m)
      }).filter((m) => {
        return m.tags.includes(genreFilter)
      })
    },
    getMangaUnread: (state) => {
      return state.mangasUnread.map((m) => {
        return helpers.mapMangaToSlide(m)
      })
    },
    getMangas: (state) => {
      return state.mangas
    },
    getOwnedChapters: (state) => {
      return state.ownedChapters
    },
    getIsLoading: (state) => {
      return state.isLoading
    },
    getMangaChapterCount: (state) => {
      return state.chapterCount
    },
    getMangaLastPublishedChapters: (state) => {
      return state.lastChapters
    },
    getMangaChapters: (state) => {
      return state.chapters
    },
    getManga: (state) => {
      return state.manga
    },
    getCharacters: (state) => {
      return state.characters
    },
    getDiskSize: (state) => {
      return state.diskSize
    },
    getSuggestions: (state) => {
      return state.suggestions.map((m) => {
        return {
          id: m.id,
          to: { name: 'Search', params: { q: m.title || m.altTitles } },
          title: m.title,
          image: m.cover,
          progress: 0,
          tags: m.genre,
          state: 2,
          variant: 'primary'
        }
      })
    }
  },
  actions: {
    async updateMangaReaded (mangaId) {
      try {
        this.manga.readed = !this.manga.readed
        const data = {
          id: mangaId,
          readed: this.manga.readed,
          readProgress: this.manga.readed ? 100 : 0
        }
        const res = await libraryAPI.postManga(mangaId, data)
        if (res.success) {
          this.updatedAt = Date.now()
        } else {
          logger.warn('API call succeeded but returned failure: ', res)
        }
      } catch (e) {
        logger.error('API call failed: ', e)
      }
    },
    async updateMangaBookmark (mangaId) {
      try {
        this.manga.bookmark = !this.manga.bookmark
        const data = {
          id: mangaId,
          bookmark: this.manga.bookmark
        }
        const res = await libraryAPI.postManga(mangaId, data)
        if (res.success) {
          this.updatedAt = Date.now()
        } else {
          logger.warn('API call succeeded but returned failure: ', res)
        }
      } catch (e) {
        logger.error('API call failed: ', e)
      }
    },
    async updateMangaMonitor (mangaId) {
      try {
        this.manga.monitor = !this.manga.monitor
        const data = {
          id: mangaId,
          monitor: this.manga.monitor
        }
        const res = await libraryAPI.postManga(mangaId, data)
        if (res.success) {
          this.updatedAt = Date.now()
        } else {
          logger.warn('API call succeeded but returned failure: ', res)
        }
      } catch (e) {
        logger.error('API call failed: ', e)
      }
    },
    async updateChapterStatus (data) {
      // the item need to be replaced in the chapters array for reactive updates
      const index = this.chapters.findIndex(c => c.id === data.chapter.id)
      const updatedChapter = data.chapter
      updatedChapter.job = data.job

      if (index !== -1) {
        this.chapters[index] = {
          ...updatedChapter
        }
      }
    },
    async prepareChapterForDownload (chapterId) {
      // lookup chapters state and change state to 1
      const chapter = this.chapters.find(c => c.id === chapterId)
      if (chapter) {
        chapter.state = 1
      }
    },
    async fetchMangas () {
      this.isLoading = true
      try {
        const res = await libraryAPI.getMangas()
        if (res.success) {
          this.updatedAt = Date.now()
          this.mangas = [...res.body]

          // get 10 random mangas which have a banner
          this.randomMangas = [...res.body].filter(manga => (manga.bannerImage?.anilist || manga.bannerImage?.kitsu))
          helpers.shuffleArray(this.randomMangas)
          this.randomMangas = this.randomMangas.slice(0, 10)

          this.mangasRead = [...res.body].filter(manga => manga.readProgress >= 1).sort((a, b) => {
            return helpers.compareDates(a.lastRead, b.lastRead, 'desc')
          })
          this.mangasUnread = [...res.body].filter(manga => manga.readProgress <= 1)
          this.mangasLastAdded = [...res.body].sort((a, b) => {
            return helpers.compareDates(a.createdAt, b.createdAt, 'desc')
          })
          this.mangasLastPublished = [...res.body].sort((a, b) => {
            return helpers.compareDates(a.lastRelease, b.lastRelease, 'desc')
          })

          this.mangaCount = res.body.length

          // get years
          const years = [...res.body].flatMap(manga => [
            parseInt(manga.startYear, 10),
            parseInt(manga.endYear, 10)
          ])
          const validYears = years.filter(year => !isNaN(year))
          const minYear = Math.min(...validYears)
          const maxYear = Math.max(...validYears)
          this.yearsMinMax = [minYear, maxYear]
          this.years = [...new Set(validYears)].sort((a, b) => a - b)

          // get scores
          const scores = [...res.body].flatMap(manga => [
            Number(manga.score)
          ])

          const validScores = scores.filter(score => !isNaN(score))
          const minScore = Math.min(...validScores) || 0
          const maxScore = Math.max(...validScores) || 10
          this.scoresMinMax = [minScore, maxScore]
          this.scores = [...new Set(validScores)].sort((a, b) => a - b)
        } else {
          logger.warn('API call succeeded but returned failure: ', res)
        }

        // get top read mangas
        this.mangasTopRead = [...this.mangas].sort((a, b) => {
          return parseInt(b.readProgress) - parseInt(a.readProgress)
        })
      } catch (e) {
        logger.error('API call failed: ', e)
      } finally {
        this.isLoading = false
      }
    },
    async fetchChapters (mangaId) {
      this.isLoading = true
      try {
        const res = await libraryAPI.getChapterManga(mangaId)
        if (res.success) {
          this.updatedAt = Date.now()
          this.chapters = res.body
          this.chapterCount = this.chapters.length

          // get last 10 chapters sorted by chapter number
          this.lastChapters = this.chapters.toSorted((a, b) => {
            return b.chapter - a.chapter
          }).slice(0, 10)

          this.ownedChapters = res.body.reduce((count, chapter) => {
            return count + (chapter.state === 3 ? 1 : 0)
          }, 0)
        } else {
          logger.warn('API call succeeded but returned failure: ', res)
        }
      } catch (e) {
        logger.error('API call failed: ', e)
      } finally {
        this.isLoading = false
      }
    },
    async fetchSuggestions (manga, explicit = false) {
      const delta = Date.now() - this.updatedAt
      if (this.suggestions.length > 0 && delta < TTL) {
        return
      }
      this.isLoading = true
      try {
        const sources = manga.value.externalIds
        const res = await libraryAPI.getAISuggests(manga.value.canonicalTitle, explicit, sources)
        if (res.success) {
          this.updatedAt = Date.now()
          Object.freeze(res.body)
          this.suggestions = res.body
        } else {
          logger.warn('API call succeeded but returned failure: ', res)
        }
      } catch (e) {
        logger.error('API call failed: ', e)
      } finally {
        this.isLoading = false
      }
    },
    async fetchDiskSize (mangaId) {
      this.isLoading = true
      try {
        const res = await libraryAPI.getMangaSize(mangaId)
        if (res.success) {
          this.updatedAt = Date.now()
          this.diskSize = res.body.totalSize
        } else {
          logger.warn('API call succeeded but returned failure: ', res)
        }
      } catch (e) {
        logger.error('API call failed: ', e)
      } finally {
        this.isLoading = false
      }
    },
    async fetchManga (mangaId) {
      this.isLoading = true
      try {
        const res = await libraryAPI.getManga(mangaId)
        if (res.success) {
          this.lastManga = this.manga
          this.updatedAt = Date.now()
          this.manga = res.body
          // remove links from description
          this.manga.description.en = this.manga.description.en_us.replace(/https?:\/\/\S+/g, '')
          this.manga.description.fr = this.manga.description.fr_fr.replace(/https?:\/\/\S+/g, '')

          this.suggestions = []
        } else {
          logger.warn('API call succeeded but returned failure: ', res)
        }
      } catch (e) {
        logger.error('API call failed: ', e)
      } finally {
        this.isLoading = false
      }
    },
    async fetchCharacters (mangaId) {
      const delta = Date.now() - this.updatedAt
      if (this.characters.length > 0 && delta < TTL) {
        return
      }
      this.isLoading = true
      try {
        const res = await libraryAPI.getCharactersManga(mangaId)
        if (res.success) {
          Object.freeze(res.body)
          this.updatedAt = Date.now()
          this.characters = res.body
        } else {
          logger.warn('API call succeeded but returned failure: ', res)
        }
      } catch (e) {
        logger.error('API call failed: ', e)
      } finally {
        this.isLoading = false
      }
    }
  }
})
