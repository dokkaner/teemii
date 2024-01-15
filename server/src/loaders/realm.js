const { logger } = require('./logger.js')
const axios = require('axios')
const path = require('path')
const { CONFIG_DIR } = require('./configManager')
const { promises: fs } = require('fs')

/**
 * RealmIO Class
 *
 * This class is designed to handle interactions with MongoDB Realm. It provides functionalities
 * for performing CRUD (Create, Read, Update, Delete) operations on manga data, synchronizing
 * it with a MongoDB Realm database in the cloud. The primary purpose of this class is to centralize
 * data from various instances of the Teemii application to build a comprehensive and up-to-date
 * database on mangas (hopefully).
 *
 */
class RealmSvc {
  constructor () {
    this.appid = 'data-glgqr'
    this.url = 'eu-west-2.aws.realm.mongodb.com'
    this.token = null
    this.tokenPath = path.join(CONFIG_DIR, 'token.key')
  }

  /**
   * Asynchronously logs in to the MongoDB Realm app using anonymous authentication.
   * Sets the access token for the current instance upon successful login.
   *
   * This method uses Axios to send a GET request to the MongoDB Realm authentication endpoint.
   * It should be called before any operations requiring authentication are performed.
   *
   * @throws {Error} Throws an error if the login request fails.
   */
  async #login (forceRefresh = false) {
    try {
      // check if file exists
      this.token = await fs.readFile(this.tokenPath, 'utf8')
    } catch (e) {
      logger.error({ err: e }, 'Error reading token')
    }

    try {
      if (this.token?.length !== 469 || forceRefresh) {
        const endpoint = `https://${this.url}/api/client/v2.0/app/${this.appid}/auth/providers/anon-user/login`
        const response = await axios.get(endpoint)
        this.token = response.data.access_token
        await fs.writeFile(this.tokenPath, this.token, { encoding: 'utf8', mode: 0o600 })
      }
    } catch (e) {
      logger.error({ err: e }, 'Error logging in to MongoDB Realm')
    }
  }

  /**
   * Converts an object of external IDs into an array of strings.
   * Each string in the array represents a key-value pair from the original object.
   *
   * Example:
   *   Input: { "mangadex": "123", "anilist": "456" }
   *   Output: ["mangadex: 123", "anilist: 456"]
   *
   * @param {Object} externalIds - The object containing external IDs.
   * @returns {Array} An array of strings, each representing a key-value pair.
   */
  #convertExternalIds (externalIds) {
    return Object.entries(externalIds).reduce((arr, [key, value]) => {
      if (value) {
        arr.push(`${key}: ${value}`)
      }
      return arr
    }, [])
  }

  /**
   * Converts an object containing image URLs from various agents into an array of strings.
   * Each string in the array is a concatenation of the agent's name and the corresponding URL.
   *
   * Example:
   *   Input: { "mangadex": "https://example.com/image.jpg", "anilist": null }
   *   Output: ["mangadex: https://example.com/image.jpg"]
   *
   * @param {Object} imageObject - The object containing image URLs keyed by agent names.
   * @returns {Array} An array of strings, each representing an agent and its image URL.
   */
  #convertImageUrls (imageObject) {
    return Object.entries(imageObject).reduce((arr, [agent, url]) => {
      if (url) {
        arr.push(`${agent}: ${url}`)
      }
      return arr
    }, [])
  }

  #convertKeyValues (keyValues) {
    return Object.entries(keyValues).reduce((arr, [key, value]) => {
      if (value) {
        arr.push(`${key}: ${value}`)
      }
      return arr
    }, [])
  }

  /**
   * Converts a manga object from the internal data model to a format suitable for external use.
   * This includes transforming certain fields and formatting dates and URLs appropriately.
   *
   * @param {Object} manga - The manga object to be converted.
   * @returns {Object} A manga object formatted for external use.
   */
  convertManga (manga) {
    return {
      canonicalTitle: manga.canonicalTitle,
      slug: manga.slug,
      type: manga.type,
      publicationDemographics: manga.publicationDemographics,
      genres: manga.genres,
      tags: manga.tags,
      titles: this.#convertKeyValues(manga.titles),
      altTitles: manga.altTitles,
      synopsis: this.#convertKeyValues(manga.synopsis),
      description: this.#convertKeyValues(manga.description),
      status: manga.status,
      isLicensed: manga.isLicensed,
      bannerImage: this.#convertImageUrls(manga.bannerImage),
      posterImage: this.#convertImageUrls(manga.posterImage),
      coverImage: this.#convertImageUrls(manga.coverImage),
      color: manga.color,
      chapterCount: manga.chapterCount,
      lastChapter: manga.lastChapter,
      volumeCount: manga.volumeCount || 0,
      serialization: manga.serialization,
      lastRelease: manga.lastRelease ? new Date(manga.lastRelease).toISOString() : null,
      nextRelease: manga.nextRelease ? new Date(manga.nextRelease).toISOString() : null,
      averageReleaseInterval: manga.averageReleaseInterval,
      popularityRank: manga.popularityRank,
      favoritesCount: manga.favoritesCount,
      score: manga.score,
      contentRating: manga.contentRating,
      startYear: manga.startYear,
      endYear: manga.endYear || 0,
      authors: manga.authors,
      publishers: manga.publishers,
      chapterNumbersResetOnNewVolume: manga.chapterNumbersResetOnNewVolume,
      externalIds: this.#convertExternalIds(manga.externalIds),
      state: manga.state,
      isDeleted: manga.isDeleted,
      updatedAt: new Date().toISOString()
    }
  }

  /**
   * Performs an upsert operation for a manga document in MongoDB Realm using GraphQL.
   * It either updates an existing manga if the slug matches or inserts a new manga.
   *
   * @param {Object} manga - The manga object to be upserted.
   * @returns {Object} The response from the MongoDB Realm server or an error object.
   */
  async upsertOneManga (manga) {
    const mangaData = this.convertManga(manga)
    const query = `
    mutation UpsertOneManga($query: MangaQueryInput!, $data: MangaInsertInput!) {
      upsertOneManga(query: $query, data: $data) {
        _id
      }
    }
  `
    const variables = {
      query: { slug: mangaData.slug },
      data: mangaData
    }
    const postEndpoint = `https://${this.url}/api/client/v2.0/app/${this.appid}/graphql`

    try {
      const postResponse = await axios.post(postEndpoint, {
        query,
        variables
      }, {
        headers: {
          Authorization: `Bearer ${this.token}`
        }
      })

      return postResponse.data
    } catch (e) {
      // handle token expiration
      if (e.response.status === 401) {
        logger.info('Token expired. Logging in again...')
        await this.#login(true)
        return e
      }
      logger.error({ err: e }, 'Error upserting manga')
      return e
    }
  }

  /**
   * Searches for manga titles by a given title.
   *
   * @param {string} title - The title to search for.
   * @returns {Promise<Array<Object>>} - A Promise that resolves to an array of manga titles matching the search.
   * @throws {Error} - Throws an error if the search fails.
   */
  async searchMangaByTitle (title) {
    const graphqlEndpoint = `https://${this.url}/api/client/v2.0/app/${this.appid}/graphql`

    const query = `
    query SearchByTitle($input: SearchInput!) {
      searchByTitle(input: $input) {
        _id
        canonicalTitle
        slug
        altTitles,
        posterImage,
        genres,
        externalIds,
        startYear,
        updatedAt,
        score,
        authors
      }
    }
  `
    const variables = {
      input: { term: title }
    }

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.token}`
      },
      body: JSON.stringify({
        query,
        variables
      })
    }

    try {
      const response = await fetch(graphqlEndpoint, options)
      const data = await response.json()

      if (data?.error && (data?.error_code === 'InvalidSession')) {
        // token expired
        await this.#login(true)
        return 'Token expired. Logging in again...'
      } else if (data?.error) {
        logger.error({ err: data.error }, 'Error searching manga by title: ' + title)
        return data.error
      }

      return data.data.searchByTitle
    } catch (e) {
      logger.error({ err: e }, 'Error searching manga by title: ' + title)
      throw e
    }
  }

  /**
   * Initializes the MongoDB Realm connection by performing a login.
   * It calls the private #login method and handles any errors that occur during the login process.
   */
  async init () {
    try {
      await this.#login()
    } catch (e) {
      logger.error({ err: e }, 'Error initializing MongoDB Realm')
      throw new Error('Failed to initialize MongoDB Realm connection.')
    }
  }
}

const realm = new RealmSvc()
module.exports = { realm }
