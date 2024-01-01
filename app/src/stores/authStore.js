import { defineStore } from 'pinia'
import { useStorage } from '@vueuse/core'

import libraryAPI from '@/api/library'
import logger from '@/utils/logger.js'

/**
 * @typedef authStore
 * @type { actions | getters | state | import('pinia').Store }
 */
/**
 * @typedef useAuthStore
 * @type function
 * @param {import('pinia').Pinia | null | undefined} [pinia] - Pinia instance to retrieve the store
 * @param {import('pinia').StoreGeneric} [hot] - dev only hot module replacement
 * @returns authStore
 */
/**
 * @type useAuthStore
 */
export const useAuthStore = defineStore('auth', {
  state: () => ({
    username: useStorage('username', ''),
    JWT: useStorage('JWT', '')
  }),
  getters: {
    isLoggedIn () {
      return this.JWT !== ''
    },
    getLogin () {
      return this.username
    },
    getJWT () {
      return this.JWT
    }
  },
  actions: {
    async refresh () {
      try {
        const res = await libraryAPI.authRefresh(this.JWT)
        if (res.success) {
          this.JWT = res.body.token
        } else {
          this.username = ''
          this.JWT = ''
          logger.error('User login failed.')
          throw new Error('User login failed.')
        }
        return res
      } catch (e) {
        this.username = ''
        this.JWT = ''
        logger.error('User login failed.')
        throw new Error('User login failed.')
      }
    },
    async login (login, password) {
      try {
        const res = await libraryAPI.authLogin(login, password)
        if (res.success) {
          this.username = login
          this.JWT = res.body.token

          // refresh token every 15 minutes
          setInterval(() => {
            this.refresh()
          }, 15 * 60 * 1000)
        } else {
          this.username = ''
          this.JWT = ''
        }
        return res
      } catch (e) {
        this.username = ''
        this.JWT = ''
        throw new Error('User login failed.')
      }
    },
    async register (login, password) {
      try {
        const res = await libraryAPI.authRegister(login, password)
        if (res.success) {
          this.username = login
        } else {
          this.username = ''
        }
        return res
      } catch (e) {
        this.username = ''
        throw new Error('User registration failed.')
      }
    }
  }
})
