import { defineStore } from 'pinia'
import libraryAPI from '@/api/library'
import logger from '@/utils/logger'
import helpers from '@/stores/utils'

/**
 * @typedef jobStore
 * @type { actions | getters | state | import('pinia').Store }
 */
/**
 * @typedef useJobStore
 * @type function
 * @param {import('pinia').Pinia | null | undefined} [pinia] - Pinia instance to retrieve the store
 * @param {import('pinia').StoreGeneric} [hot] - dev only hot module replacement
 * @returns jobStore
 */
/**
 * @type useJobStore
 */
export const useJobStore = defineStore('job', {
  state: () => ({
    jobs: [],
    // common store properties
    isLoading: false,
    updatedAt: null
  }),
  getters: {
    getJobs () {
      return this.jobs
    },
    getIsLoading: (state) => {
      return state.isLoading
    }
  },
  actions: {
    async updateJob (data) {
      // the item need to be replaced in the chapters array for reactive updates
      const index = this.jobs.findIndex(j => j.id === data.job.id)
      // if job is done refresh all jobs
      if (data.job.status === 'completed') {
        await this.fetchJobs()
        return
      }
      if (index !== -1) {
        this.jobs[index] = {
          ...data.job
        }
      } else {
        this.jobs.push(data.job)
        this.updatedAt = Date.now()
        this.jobs = [...this.jobs].sort((a, b) => {
          return helpers.compareDates(a.createdAt, b.createdAt, 'desc')
        })
      }
    },
    async fetchJobs () {
      this.isLoading = true
      try {
        const res = await libraryAPI.getTasks()
        if (res.success) {
          this.updatedAt = Date.now()
          this.jobs = [...res.body].sort((a, b) => {
            return helpers.compareDates(a.createdAt, b.createdAt, 'desc')
          })
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
