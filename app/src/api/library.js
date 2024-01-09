import axios from 'axios'
import { useAuthStore } from '@/stores/authStore.js'

class BaseError extends Error {
  constructor (name, statusCode, isOperational, description) {
    super(description)

    Object.setPrototypeOf(this, new.target.prototype)
    this.name = name
    this.statusCode = statusCode
    this.isOperational = isOperational
    Error.captureStackTrace(this)
  }
}

const isRetryableError = (error) => {
  // retry on network errors or server 5xx errors
  if (!error.response) return true // Network error or no response
  const { status } = error.response
  return status >= 500 && status < 600 // Server error
}

/**
 * Performs an HTTP DELETE request to the specified URL and returns a Promise.
 *
 * This function sends an HTTP DELETE request to the provided URL and handles
 * both the success and error responses. In case of a successful request,
 * the Promise is resolved with the response data. If the request fails,
 * the Promise is rejected with an error object that includes the error details
 * and status code if available.
 *
 * @param {string} url - The URL where the HTTP DELETE request should be sent.
 *
 * @returns {Promise<Object>} A Promise that resolves with the deletion response or rejects
 *                            with an error object containing the error details.
 *
 * @example
 * // Usage example
 * deleteWithResponse('https://api.example.com/items/123')
 *   .then(result => {
 *     console.log('Delete successful', result);
 *   })
 *   .catch(error => {
 *     console.error('Delete failed', error);
 *   });
 */
const deleteWithResponse = (url) => {
  return new Promise((resolve, reject) => {
    const headers = {}
    const authStore = useAuthStore()
    if (authStore.isLoggedIn) {
      headers.Authorization = `Bearer ${authStore.getJWT}`
    }
    axios.delete(url, { headers })
      .then(response => {
        resolve({ success: true, data: response.data, status: response.status })
      })
      .catch(error => {
      // If error.response is available, it's an error response from the server
        if (error.response) {
        // Server responded with a status code outside the 2xx rangec
          const errorObj = {
            success: false,
            message: error.message,
            status: error.response.status,
            data: error.response.data
          }
          reject(new Error(JSON.stringify(errorObj)))
        } else if (error.request) {
        // Request was made but no response was received
          const errorObj = {
            success: false,
            message: 'No response was received',
            data: null
          }
          reject(new Error(JSON.stringify(errorObj)))
        } else {
        // Something happened in setting up the request that triggered an error
          const errorObj = {
            success: false,
            message: error.message,
            data: null
          }
          reject(new Error(JSON.stringify(errorObj)))
        }
      })
  })
}

/**
 * Fetches data from a specified URL with retry logic.
 *
 * This function attempts to make a GET request to a URL with the ability to retry the request
 * in case of a failure that is deemed retryable (e.g., network issues, 5xx server errors).
 * It implements an exponential backoff strategy for retries, and optionally leverages a caching
 * mechanism to avoid redundant network calls.
 *
 * @param {string} url - The URL to fetch the data from.
 * @param {boolean} [useCache=false] - A boolean flag to indicate whether to use caching for the requests.
 * @param {number} [retries=3] - The maximum number of retry attempts to make before failing.
 * @param {number} [backoff=300] - The initial backoff delay in milliseconds before the first retry. The delay doubles with each retry.
 *
 * @returns {Promise<Object>} An object containing either the response data in case of success
 *                            or an error message in case of failure. The object has a `success`
 *                            property which indicates the outcome of the fetch operation.
 *
 * @example
 * // Usage without cache
 * fetchWithRetry('https://api.example.com/data').then(response => {
 *   if (response.success) {
 *     console.log('Data fetched successfully:', response.body);
 *   } else {
 *     console.error('Failed to fetch data:', response.message);
 *   }
 * });
 *
 * @example
 * // Usage with cache and custom retry settings
 * fetchWithRetry('https://api.example.com/data', true, 5, 500).then(response => {
 *   // Handle response...
 * });
 */
const fetchWithRetry = async (url, useCache = false, retries = 3, backoff = 300) => {
  let lastError

  for (let i = 0; i < retries; i++) {
    try {
      const headers = {}
      const authStore = useAuthStore()

      headers.Authorization = `Bearer ${authStore.getJWT}`
      const response = await axios.get(url, { headers })

      if (response.status >= 200 && response.status < 300) {
        // Success block
        return { success: true, body: response.data }
      } else {
        // Non-success status codes are treated as retryable errors
        const code = response.status
        const message = response.statusText

        // throw new httpError(code, message)
        lastError = new BaseError('httpError', code, true, message)
        continue // This will proceed to the next iteration of the loop
      }
    } catch (error) {
      if (isRetryableError(error)) {
        // Log and prepare for a retry
        console.warn(`Retryable error occurred, attempt ${i + 1} of ${retries}: ${error.message}`)
        lastError = error
      } else {
        // Break on non-retryable error
        return {
          code: error.response?.status,
          success: false,
          message: error.response?.data?.error || error.message || 'An unknown error occurred'
        }
      }
    }

    // Wait for a specified backoff period before retrying
    await new Promise(resolve => setTimeout(resolve, backoff * (2 ** i)))
  }

  // If the loop completes without returning, it means all retries have failed
  console.error(`Failed to get response from ${url} after ${retries} attempts`, lastError)
  return {
    success: false,
    status: lastError.response?.status || null,
    message: lastError.response?.data?.error || lastError.message || 'An unknown error occurred after retries'
  }
}

const postWithRetry = async (url, payload, retries = 3, backoff = 300) => {
  let lastError

  for (let i = 0; i < retries; i++) {
    try {
      const headers = {}
      const authStore = useAuthStore()
      headers.Authorization = `Bearer ${authStore.getJWT}`
      const response = await axios.post(url, payload, { headers })

      if (response.status >= 200 && response.status < 300) {
        // Success block
        return { success: true, body: response.data }
      } else {
        // Non-success status codes are treated as retryable errors
        const code = response.status
        const message = response.statusText

        // throw new httpError(code, message)
        lastError = new BaseError('httpError', code, true, message)
        continue // This will proceed to the next iteration of the loop
      }
    } catch (error) {
      if (isRetryableError(error)) {
        // Log and prepare for a retry
        console.warn(`Retryable error occurred, attempt ${i + 1} of ${retries}: ${error.message}`)
        lastError = error
      } else {
        // Break on non-retryable error
        return {
          success: false,
          status: lastError.response?.status,
          message: error.response?.data?.error || error.message || 'An unknown error occurred',
          data: error.response?.data || null
        }
      }
    }

    // Wait for a specified backoff period before retrying
    await new Promise(resolve => setTimeout(resolve, backoff * (2 ** i)))
  }

  // If the loop completes without returning, it means all retries have failed
  console.error(`Failed to get response from ${url} after ${retries} attempts`, lastError)
  return {
    success: false,
    message: lastError?.response?.data?.error || lastError?.message || 'An unknown error occurred after retries'
  }
}
export default {
  async publishCommand (data, immediate = 0) {
    const endpoint = `/api/v1/commands?immediate=${immediate}`
    return await postWithRetry(endpoint, data, 1)
  },

  async publishReadStatus (pageId, pageNumber, payload) {
    const endpoint = `/api/v1/reading/${pageId}/${pageNumber}`
    return await postWithRetry(endpoint, payload, 1)
  },

  async postCreateDB () {
    const endpoint = '/api/v1/setup/deployDB'
    return await postWithRetry(endpoint, {}, 1)
  },

  async postSetupStorage () {
    const endpoint = '/api/v1/setup/setupStorage'
    return await postWithRetry(endpoint, {}, 1)
  },

  async getUserPreferences () {
    const endpoint = '/api/v1/preferences'
    return await fetchWithRetry(endpoint, false)
  },

  async getSettings () {
    const endpoint = '/api/v1/settings/schedulers'
    return await fetchWithRetry(endpoint, false)
  },

  async getLogs () {
    const endpoint = '/api/v1/log'
    return await fetchWithRetry(endpoint, false)
  },

  async getLogsDownload () {
    const endpoint = '/api/v1/log/download'
    return await fetchWithRetry(endpoint, false)
  },

  async getAutocomplete (term) {
    const endpoint = `/api/v1/autocomplete?q=${term}`
    return await fetchWithRetry(endpoint, false, 1)
  },

  async postUserPreferenceValue (key, value, isSecret = false) {
    const endpoint = `/api/v1/preferences/${key}?isSecret=${isSecret}`
    const payload = { value }
    return await postWithRetry(endpoint, payload, 1)
  },

  async postUserPreferences (payload) {
    const endpoint = '/api/v1/setup/setUserPreferences'
    return await postWithRetry(endpoint, payload, 1)
  },

  async postSetupFinalize (payload) {
    const endpoint = '/api/v1/setup/finalize'
    return await postWithRetry(endpoint, payload, 1)
  },

  async getSystemStatus () {
    const endpoint = '/api/v1/setup'
    return await fetchWithRetry(endpoint, false)
  },

  async getReadStatus () {
    const endpoint = '/api/v1/reading/status'
    return await fetchWithRetry(endpoint, false)
  },

  async getReadingStats () {
    const endpoint = '/api/v1/reading/stats'
    return await fetchWithRetry(endpoint, false)
  },

  async getMangaReadStatus (slug) {
    const endpoint = `/api/v1/reading/status/?slug=${slug}`
    return await fetchWithRetry(endpoint, false)
  },

  async getMangaTasks (mangaId) {
    const endpoint = `/api/v1/mangas/${mangaId}/tasks`
    return await fetchWithRetry(endpoint, false)
  },

  async getChapter (chapterId) {
    const endpoint = `/api/v1/chapters/${chapterId}`
    return await fetchWithRetry(endpoint, false)
  },

  async getNextChapter (chapterId) {
    const endpoint = `/api/v1/chapters/${chapterId}/next`
    return await fetchWithRetry(endpoint, false)
  },

  async getPreviousChapter (chapterId) {
    const endpoint = `/api/v1/chapters/${chapterId}/previous`
    return await fetchWithRetry(endpoint, false)
  },

  async getPage (pageId) {
    const endpoint = `/api/v1/pages/${pageId}`
    return await fetchWithRetry(endpoint, false)
  },

  async getCharactersManga (mangaId) {
    const endpoint = `/api/v1/mangas/${mangaId}/characters`
    return await fetchWithRetry(endpoint, true)
  },

  async getChapterManga (mangaId) {
    const endpoint = `/api/v1/mangas/${mangaId}/chapters`
    return await fetchWithRetry(endpoint, true)
  },

  async getChapterPages (chapterId) {
    const endpoint = `/api/v1/chapters/${chapterId}/pages`
    return await fetchWithRetry(endpoint, false)
  },

  async getGrabChapter (chapterId, sourceId) {
    const endpoint = `/api/v1/chapters/${chapterId}/grab?source=${sourceId}`
    return await fetchWithRetry(endpoint, false)
  },

  async getPersonalSuggestions () {
    const endpoint = '/api/v1/mangas/suggestions'
    return await fetchWithRetry(endpoint, true)
  },

  async getRecommendations (mode, limit = 10) {
    const endpoint = `/api/v1/mangas/recommendations/${mode}?limit=${limit}`
    return await fetchWithRetry(endpoint, true)
  },

  async getTrending (mode, limit = 10) {
    const endpoint = `/api/v1/mangas/trending/${mode}?limit=${limit}`
    return await fetchWithRetry(endpoint, true)
  },

  async searchMangas (term, force, limit = 10, page = 0) {
    const endpoint = `/api/v1/mangas/lookup?term=${term}&force=${force}&limit=${limit}&page=${page}`
    return await fetchWithRetry(endpoint, true)
  },

  async deleteManga (mangaId) {
    const endpoint = `/api/v1/mangas/${mangaId}`
    return await deleteWithResponse(endpoint)
  },

  async getTasks () {
    const endpoint = '/api/v1/tasks'
    return await fetchWithRetry(endpoint, false)
  },

  async getAllChapters () {
    const endpoint = '/api/v1/chapters'
    return await fetchWithRetry(endpoint, false)
  },

  async getChapters (page, size, sortBy, order) {
    const endpoint = `/api/v2/chapters?page=${page}&size=${size}&sortBy=${sortBy}&order=${order}`
    return await fetchWithRetry(endpoint, false)
  },

  async getMangaSize (mangaId) {
    const endpoint = `/api/v1/mangas/${mangaId}/size`
    return await fetchWithRetry(endpoint, false)
  },

  async getManga (id) {
    const endpoint = `/api/v1/mangas/${id}`
    return await fetchWithRetry(endpoint, false)
  },

  async getMangas () {
    const endpoint = '/api/v1/mangas/'
    return await fetchWithRetry(endpoint, false)
  },

  async getAISuggests (title, isAdult = false, payload = {}) {
    const endpoint = `/api/v1/mangas/aisuggests?title=${encodeURIComponent(title)}&isAdult=${isAdult}`
    return await postWithRetry(endpoint, payload, 1)
  },

  async postManga (id, payload) {
    const endpoint = `/api/v1/mangas/${id}`
    return await postWithRetry(endpoint, payload, 1)
  },

  async postChapter (id, payload) {
    const endpoint = `/api/v1/chapters/${id}`
    return await postWithRetry(endpoint, payload, 1)
  },

  async uploadCBx (manga, file, progressCallback) {
    const endpoint = '/api/v1/upload'
    const formData = new FormData()
    formData.append('file', file)
    formData.append('manga', JSON.stringify(manga))

    const authStore = useAuthStore()
    const config = {
      headers: {
        'Content-Type': 'multipart/form-data',
        Authorization: `Bearer ${authStore.getJWT}`
      },
      onUploadProgress: progressCallback
    }
    return await axios.post(endpoint, formData, config)
  },

  async backendRestart () {
    const endpoint = '/api/v2/system/restart'
    return await postWithRetry(endpoint, {}, 1)
  },

  async uploadGetFileInfo (file) {
    const endpoint = `/api/v1/upload/parse?file=${file}`
    return await fetchWithRetry(endpoint, false)
  },

  // Auth API

  async authRegister (login, password) {
    const endpoint = '/api/v2/auth/register'
    const payload = { login, password }
    return await postWithRetry(endpoint, payload, 1)
  },

  async authLogin (login, password) {
    const endpoint = '/api/v2/auth/login'
    const payload = { login, password }
    return await postWithRetry(endpoint, payload, 1)
  },

  async authRefresh (token) {
    const endpoint = '/api/v2/auth/refresh'
    const payload = { refreshToken: token }
    return await postWithRetry(endpoint, payload, 1)
  },

  // backup API
  async fetchBackups () {
    const endpoint = '/api/v2/backup'
    return await fetchWithRetry(endpoint, false)
  },

  async doBackup () {
    const endpoint = '/api/v2/backup'
    return await postWithRetry(endpoint, {}, 1)
  },

  async doRestore (payload) {
    const endpoint = '/api/v2/backup/restore'
    return await postWithRetry(endpoint, payload, 1)
  },

  async downloadBackup (payload) {
    const endpoint = '/api/v2/backup/download'
    return await axios.post(endpoint, payload, { responseType: 'blob' })
  },

  // scrobblers API
  async getScrobblers () {
    const endpoint = '/api/v2/scrobblers'
    return await fetchWithRetry(endpoint, false)
  },

  async postScrobblerSettings (name, payload) {
    const endpoint = `/api/v2/scrobblers/${name}`
    return await postWithRetry(endpoint, payload, 1)
  },

  async getScrobblersStatistics () {
    const endpoint = '/api/v2/scrobblers/statistics'
    return await fetchWithRetry(endpoint, false)
  },

  // Releases
  async getReleasesLatest () {
    const endpoint = '/api/v2/releases/latest'
    return await fetchWithRetry(endpoint, false)
  }
}
