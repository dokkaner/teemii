import { defineStore } from 'pinia'
import libraryAPI from '@/api/library'
import logger from '@/utils/logger'
import helpers from '@/stores/utils'
import { useDark } from '@vueuse/core'

/**
 * @typedef useStatStore
 * @type { actions | getters | state | import('pinia').Store }
 */
/**
 * @typedef useStatStore
 * @type function
 * @param {import('pinia').Pinia | null | undefined} [pinia] - Pinia instance to retrieve the store
 * @param {import('pinia').StoreGeneric} [hot] - dev only hot module replacement
 * @returns jobStore
 */
/**
 * @type useJobStore
 */
export const useStatStore = defineStore('stat', {
  state: () => ({
    stats: [],
    // common store properties
    isLoading: false,
    updatedAt: null
  }),
  getters: {
    getStats () {
      return this.stats
    },
    getStatsByGenre () {
      // detect dark mode
      const isDark = useDark()

      const genres = this.stats.genres
      const maxGenres = 5
      const data = []
      const labels = []
      let colors = []
      if (isDark) {
        colors = helpers.generateColor('#fdf1ff', '#7a7482', maxGenres + 1)
      } else {
        colors = helpers.generateColor('#fcf0ff', '#6a6472', maxGenres + 1)
      }
      // const colors = helpers.generateColor('#fcf0ff', '#6a6472', maxGenres + 1)

      let others = 0
      genres.slice(maxGenres + 1, genres.length).forEach(stat => {
        others += stat.normalized
      })

      genres.slice(0, maxGenres).forEach(stat => {
        labels.push(stat.name)
        data.push(stat.normalized)
      })

      if (labels?.length < 1) {
        return {}
      }

      labels.push('Others')
      data.push(others)

      return JSON.parse(JSON.stringify({
        labels: [...labels],
        datasets: [{
          backgroundColor: [...colors], data: [...data]
        }]
      }))
    },
    getIsLoading: (state) => {
      return state.isLoading
    }
  },
  actions: {
    async fetchStats () {
      this.isLoading = true
      try {
        const res = await libraryAPI.getReadingStats()
        if (res.success) {
          this.updatedAt = Date.now()
          this.stats = res.body
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
