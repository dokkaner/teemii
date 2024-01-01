import { defineStore } from 'pinia'
import { io } from 'socket.io-client'
import logger from '@/utils/logger'
import { useMangaStore } from '@/stores/mangasStore'
import { useJobStore } from '@/stores/jobsStore'

/**
 * @typedef socketStore
 * @type { actions | getters | state | import('pinia').Store }
 */
/**
 * @typedef useSocketStore
 * @type function
 * @param {import('pinia').Pinia | null | undefined} [pinia] - Pinia instance to retrieve the store
 * @param {import('pinia').StoreGeneric} [hot] - dev only hot module replacement
 * @returns socketStore
 */
/**
 * @type useSocketStore
 */
export const useSocketStore = defineStore('socket', {
  state: () => ({
    socket: null,
    isConnected: false,
    notificationReceived: false,
    // common store properties
    isLoading: false,
    updatedAt: null
  }),
  getters: {
    getSocket () {
      return this.socket
    },
    getIsConnected: (state) => {
      return state.isConnected
    },
    getNotificationReceived: (state) => {
      return state.notificationReceived
    },
    getIsLoading: (state) => {
      return state.isLoading
    }
  },
  actions: {
    initializeSocket () {
      console.log('Socket.io connecting...')
      this.isLoading = true
      try {
        if (!this.isConnected) {
          console.log('Socket.io connecting...', window.location.origin)
          this.socket = io(window.location.origin)

          this.socket.on('connect', () => {
            console.log('Socket.io connected')
            this.isConnected = true
          })

          this.socket.on('disconnect', () => {
            console.log('Socket.io disconnected')
            this.isConnected = false
          })

          this.socket.on('notification', this.handleNotification)
          this.socket.on('MANGA_CREATE', this.handleNotification)
          this.socket.on('MANGA_UPDATE', this.handleNotification)
          this.socket.on('CHAPTER_UPDATE', this.handleChapterUpdate)
        }
      } catch (e) {
        logger.error({ err: e }, 'SocketIO call failed: ')
      } finally {
        this.isLoading = false
      }
    },
    disconnectSocket () {
      this.isLoading = true
      try {
        if (this.socket) {
          this.socket.disconnect()
        }
      } catch (e) {
        logger.error('SocketIO call failed: ', e)
      } finally {
        this.isLoading = false
      }
    },
    handleChapterUpdate (data) {
      // in this case we must inform:
      // the mangasStore that a chapter has been updated
      // the jobsStore that a chapter has been updated
      const mangasStore = useMangaStore()
      mangasStore.updateChapterStatus(data)

      const jobsStore = useJobStore()
      jobsStore.updateJob(data)

      this.handleNotification()
    },
    handleNotification () {
      this.notificationReceived = true
      // reset status after 1 second
      setTimeout(() => {
        this.notificationReceived = false
      }, 1000)
    }
  }
})
