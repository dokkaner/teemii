const { orm } = require('../loaders/sequelize.js')
const { logger } = require('../loaders/logger.js')
const os = require('./osService.js')
const { computeMangaProgress } = require('./readingService')
const { scrobblersManager } = require('./scrobblerService')

function addStatsTo (statArray, items, pagesRead) {
  if (items?.length < 1) return
  try {
    items = items.filter(item => item !== null)
    items.forEach(item => {
      statArray.push({ name: item, pagesRead })
    })
  } catch (e) {
    logger.warn({ err: e }, 'Failed to add stats')
  }
}

function calculateAndSortStats (data, totalPagesRead) {
  const statsMap = new Map()

  // Accumulate pagesRead for each name
  data.forEach(({ name, pagesRead }) => {
    if (!statsMap.has(name)) {
      statsMap.set(name, { name, pagesRead: 0 })
    }
    statsMap.get(name).pagesRead += pagesRead
  })

  // Convert to array, sort, and calculate the ratio
  const arr = Array.from(statsMap.values())
    .sort((a, b) => b.pagesRead - a.pagesRead)
    .map(stat => ({
      ...stat,
      ratio: ((stat.pagesRead / totalPagesRead) * 100).toFixed(2)
    }))

  const totalRatios = arr.reduce((sum, item) => sum + parseFloat(item.ratio), 0)

  return arr.map(item => {
    return {
      ...item,
      normalized: ((parseFloat(item.ratio) / totalRatios) * 100).toFixed(2)
    }
  })
}

module.exports = class libraryService {
  async findNextChapter (chapterId) {
    try {
      const currentChapter = await orm.chapter.findOne({ where: { id: chapterId } })
      if (!currentChapter) return null

      const candidateChapters = await orm.chapter.findAll({
        where: { mangaId: currentChapter.mangaId },
        order: orm.Sequelize.literal('CAST(chapter AS FLOAT) ASC')
      })

      const currentChapterIndex = candidateChapters.findIndex(ch => ch.id === chapterId)
      const nextChapterIndex = candidateChapters.findIndex(
        (ch, index) => index > currentChapterIndex && parseFloat(ch.chapter) > parseFloat(currentChapter.chapter)
      )

      return nextChapterIndex !== -1 ? candidateChapters[nextChapterIndex] : null
    } catch (e) {
      logger.error({ err: e }, 'Failed to get next chapter')
      throw e
    }
  }

  async findPrevChapter (chapterId) {
    try {
      const currentChapter = await orm.chapter.findOne({ where: { id: chapterId } })
      if (!currentChapter) return null

      const candidateChapters = await orm.chapter.findAll({
        where: { mangaId: currentChapter.mangaId },
        order: [['chapter', 'ASC']]
      })

      const currentChapterNumber = parseFloat(currentChapter.chapter)
      const currentChapterIndex = candidateChapters.findIndex(ch => ch.id === chapterId)

      let prevChapterIndex = -1
      for (let i = currentChapterIndex - 1; i >= 0; i--) {
        if (parseFloat(candidateChapters[i].chapter) < currentChapterNumber) {
          prevChapterIndex = i
          break
        }
      }

      return prevChapterIndex !== -1 ? candidateChapters[prevChapterIndex] : null
    } catch (e) {
      logger.error({ err: e }, 'Failed to get prev chapter')
      throw e
    }
  }

  /**
   * Update chapter state and download source.
   *
   * @param {number} chapterId - The ID of the chapter to update.
   * @param {string} source - The source from where the chapter will be downloaded.
   * @returns {Promise<Object>} - The updated chapter data.
   */
  async updateChapterStateAndSource (chapterId, source) {
    try {
      const [updateCount, updatedChapter] = await orm.chapter.update({
        state: 1,
        dlSource: source
      }, {
        where: { id: chapterId },
        returning: true,
        plain: true
      })

      if (updateCount === 0) {
        return []
      }
      return { updatedChapter }
    } catch (e) {
      logger.error({ err: e }, 'Failed to update chapter state and source')
      throw e
    }
  }

  /**
   * Retrieves all suggestions from the database.
   * Throws an error if the database query fails to allow the controller layer to handle it.
   *
   * @returns {Promise<Array>} The list of suggestions.
   * @throws Will throw an error if the database query fails.
   */
  async getAllSuggestions () {
    try {
      return await orm.suggestion.findAll()
    } catch (e) {
      logger.error({ err: e }, 'Failed to get all suggestions')
      throw new Error('Error fetching suggestions')
    }
  }

  /**
   * Calculates the total file size of all chapters for a specified manga.
   * It sums the 'size' field for all files associated with the manga.
   * If no files are found or the manga doesn't exist, it returns an error message.
   * Throws an error for any internal processing issues.
   *
   * @param {string|number} mangaId - The identifier of the manga to calculate size for.
   * @returns {Promise<number|Object>} - The total size of the manga files or an error object.
   */
  async getMangaTotalSize (mangaId) {
    try {
      return await orm.file.sum('size', {
        where: { mangaId }
      })
    } catch (e) {
      logger.error({ err: e }, `Failed to get total size for manga ID: ${mangaId}`)
      throw e
    }
  }

  /**
   * Deletes a manga and all of its associated chapters.
   * @param {number|string} mangaId - The ID of the manga to delete.
   * @throws {Error} Throws an error if the operation fails.
   */
  async deleteManga (mangaId) {
    const t = await orm.sequelize.transaction() // Start a new transaction

    try {
      // Delete all chapters and their associated pages for this manga in a transaction
      await orm.chapter.destroy({
        where: { mangaId },
        transaction: t
      })

      // After chapters are deleted, delete the manga
      await orm.manga.destroy({
        where: { id: mangaId },
        transaction: t
      })

      await t.commit() // If everything is successful, commit the transaction
    } catch (e) {
      await t.rollback() // If there is an error, rollback all changes
      logger.error({ err: e }, `Failed to delete manga ID: ${mangaId}`)
      throw e // Rethrow the error to be handled by error-handling middleware
    }
  }

  /**
   * Delete a chapter and all its pages.
   * @param {number|string} chapterId - The ID of the chapter to be deleted.
   * @throws {Error} Throws an error if the chapter cannot be deleted.
   */
  async deleteChapter (chapterId) {
    const t = await orm.sequelize.transaction() // Start a new transaction

    try {
      // Delete pages associated with the chapter first.
      const deletePagesResult = await this.deletePages(chapterId, t)
      if (!deletePagesResult.success) {
        await t.rollback() // If deleting pages failed, rollback any changes.
        return deletePagesResult // Return the error from deletePages.
      }

      await orm.chapter.destroy({
        where: { id: chapterId },
        transaction: t
      })

      await t.commit() // Commit the transaction if all operations are successful.
    } catch (e) {
      await t.rollback() // Rollback the transaction if any operation fails.
      logger.error({ err: e }, `Failed to delete chapter ID: ${chapterId}`)
      throw e // Rethrow the error to be handled by error-handling middleware
    }
  }

  /**
   * Delete all pages and associated files for a given chapter.
   * @param {number|string} chapterId - The ID of the chapter whose pages are to be deleted.
   * @param {transaction} [t] - An optional transaction if this is part of a larger db operation.
   * @returns {Promise<Object>} An object with the status of the operation.
   */
  async deletePages (chapterId, t = null) {
    try {
      const pages = await orm.file.findAll({ where: { chapterId } }, { transaction: t })

      // Create a promise for each file deletion and await all of them together.
      const deletionPromises = pages.map(async (page) => {
        await orm.file.destroy({ where: { id: page.id } }, { transaction: t })
        await os.deleteFile(page.path) // Use the async version of unlink.
        logger.trace(`File ${page.id} deleted.`)
      })

      // Await all file deletions.
      await Promise.all(deletionPromises)

      return { success: true, message: 'All pages deleted successfully' }
    } catch (e) {
      logger.error({ err: e }, `Failed to delete pages for chapter ID: ${chapterId}`)
      throw new Error('Deletion of pages failed.') // Throw an error to be caught by the controller.
    }
  }

  /**
   * Retrieves the reading status for all mangas in the library.
   * This method interacts with the ORM to fetch read status and does not handle HTTP status codes or response objects.
   * Any exception thrown is to be caught by the calling controller, which will handle the HTTP response.
   *
   * @returns {Promise<Array|undefined>} A promise that resolves to an array of reading status objects, or undefined if an error occurs.
   */
  async getReadStatus () {
    try {
      return await orm.stats.findAll({ raw: true }) // Return array of status objects or an empty array if no records found
    } catch (e) {
      logger.error({ err: e }, 'Error retrieving read status')
      return undefined
    }
  }

  async getStatisticalData () {
    try {
      // start performance measurement const start = process.hrtime()

      const result = {}
      const mangas = await orm.manga.findAll({
        attributes: ['slug', 'genres', 'authors', 'tags'],
        raw: true,
        where: { state: 2 }
      })
      const readStatus = await orm.stats.findAll({
        attributes: ['mangaSlug', 'pageNumber'],
        raw: true
      })

      const stats = new Map()
      const genreStats = []
      const authorStats = []
      const tagStats = []

      // for each manga accumulate the total pages read and the total chapters read
      for (const manga of mangas) {
        const mangaSlug = manga.slug
        for (const status of readStatus) {
          if (!stats.has(mangaSlug)) {
            stats.set(mangaSlug, { totalPagesRead: 0, totalChaptersRead: 0 })
          }
          if (status.mangaSlug === mangaSlug) {
            stats.get(mangaSlug).totalPagesRead += status.pageNumber
            stats.get(mangaSlug).totalChaptersRead += 1
          }
        }
      }
      let totalPagesRead = 0

      for (const manga of mangas) {
        const mangaStatus = stats.get(manga.slug) || { totalPagesRead: 0 }
        const pagesRead = mangaStatus.totalPagesRead

        if (pagesRead === 0) {
          continue
        }

        totalPagesRead += pagesRead
        const genres = JSON.parse(manga.genres)
        const authors = JSON.parse(manga.authors)
        const tags = JSON.parse(manga.tags)

        addStatsTo(genreStats, genres, pagesRead)
        addStatsTo(authorStats, authors, pagesRead)
        addStatsTo(tagStats, tags, pagesRead)
      }

      result.authors = calculateAndSortStats(authorStats, totalPagesRead)
      result.genres = calculateAndSortStats(genreStats, totalPagesRead)
      result.tags = calculateAndSortStats(tagStats, totalPagesRead)
      result.totalPagesRead = totalPagesRead
      result.getMangaReadStatus = stats

      // end performance measurement const end = process.hrtime(start) logger.info(`Execution time: ${end[0]}s ${end[1]}ns`)
      return result
    } catch (e) {
      logger.error({ err: e }, 'Error retrieving statistical data:')
      return e
    }
  }

  /**
   * Retrieves the last read status for a given manga by its slug.
   * It finds the latest chapter and the latest page read by the user.
   * Assumes 'stats' table keeps user reading progress records.
   *
   * @param {string} slug - The slug identifier for a manga.
   * @returns {Promise<Object|null>} An object containing read status information if successful, or null if no records are found.
   * @throws {Error} Throws an error if a database operation fails.
   */
  async getMangaReadStatus (slug) {
    try {
      // Retrieve manga ID based on slug with a direct and lean query
      const manga = await orm.manga.findOne({
        attributes: ['id'],
        where: { slug },
        raw: true
      })

      // If manga is not found, return null immediately to avoid further unnecessary queries
      if (!manga) {
        return null
      }

      // Use aggregate functions to retrieve the last read chapter number , its last read page and the last updated date
      const readStatus = await orm.stats.findOne({
        attributes: [
          [orm.Sequelize.fn('MAX', orm.Sequelize.col('chapterNumber')), 'lastReadChapter'],
          [orm.Sequelize.fn('MAX', orm.Sequelize.col('pageNumber')), 'lastReadPage'],
          [orm.Sequelize.fn('MAX', orm.Sequelize.col('updatedAt')), 'lastUpdated']
        ],
        where: {
          mangaSlug: slug
        },
        raw: true
      })

      if (!readStatus || readStatus.lastReadChapter === null) {
        return null
      }

      // Construct the result with necessary details only
      return {
        mangaId: manga.id,
        lastChapter: readStatus.lastReadChapter,
        lastPage: readStatus.lastReadPage,
        lastUpdated: readStatus.lastUpdated
      }
    } catch (e) {
      logger.error({ err: e }, `Error fetching read status for manga with slug: ${slug}`)
      throw e
    }
  }

  /**
   * Sets the read status for a page, and if necessary, updates the stats.
   *
   * @param {string} pageId - The ID of the page.
   * @param {number} pageNumber - The page number to set as read.
   * @param {Object} data - The data to be used to update the read status.
   * @returns {Promise<Object>} The updated read status, if successful.
   * @throws Will throw an error if there is any issue with the database operations.
   */
  async setReadStatus (pageId, pageNumber, data) {
    try {
      const chapter = await this.getOneChapter(data.chapterId)
      const manga = await this.getOneManga(data.mangaId)

      if (!chapter || !manga) {
        logger.info(`Chapter or Manga not found for page id ${pageId}.`)
        return false
      }

      const statusPayload = {
        mangaSlug: manga.slug,
        chapterNumber: chapter.chapter,
        pageNumber,
        updatedAt: new Date()
      }

      const updated = await orm.stats.upsert(statusPayload)
      if (!updated) {
        logger.info(`Failed to update read status for page id ${pageId}.`)
        return false
      }
      await computeMangaProgress(manga, chapter, pageNumber)
      scrobblersManager.queueSync(manga)
      return true
    } catch (e) {
      logger.error({ err: e }, 'Failed to set read status')
      throw e
    }
  }

  /**
   * Retrieves a single page by its identifier.
   *
   * @param {string} pageId - The unique identifier of the page.
   * @returns {Promise<{page: Object|null, error: string|null}>}
   * An object containing the page if found, otherwise null, and an error message if an error occurred.
   */
  async getOnePage (pageId) {
    try {
      return await orm.file.findOne({
        where: { id: pageId }
      })
    } catch (err) {
      logger.error({ err }, 'Failed to get page from database')
      throw err
    }
  }

  /**
   * Retrieves all page images for a given chapter by its GUID.
   *
   * @param {string} chapterId The GUID of the chapter whose pages are to be retrieved.
   * @returns {Promise<Array>} A promise that resolves with an array of image files for the chapter.
   * @throws Will throw an error if the database query fails.
   */
  async getChapterPages (chapterId) {
    try {
      return await orm.file.findAll({
        where: {
          chapterId,
          type: 'image'
        }
      })
    } catch (err) {
      logger.error({ err }, `Error retrieving pages for chapter with GUID: ${chapterId}`)
      throw err
    }
  }

  /**
   * Retrieves a single chapter by its ID.
   *
   * @param {number} chapterId The ID of the chapter to retrieve.
   * @returns {Promise<Object|null>} A promise that resolves with the chapter object, or null if not found.
   * @throws Will throw an error if the database query fails.
   */
  async getOneChapter (chapterId) {
    try {
      return await orm.chapter.findOne({
        where: { id: chapterId }
      })
    } catch (err) {
      // Log the error with a meaningful message
      logger.error({ err }, 'Error retrieving chapter with ID: ' + chapterId)
      // Propagate the error up to the controller
      throw err
    }
  }

  async selectChapters (limit = 25, offset = 0, sortBy = 'createdAt', order = 'DESC') {
    try {
      return orm.chapter.findAndCountAll({
        limit,
        offset,
        order: [[sortBy, order]],
        include: {
          model: orm.manga,
          attributes: ['id', 'canonicalTitle', 'state', 'readProgress']
        }
      })
    } catch (err) {
      // Log the error with a meaningful message
      logger.error({ err }, 'Error retrieving chapters')
      // Propagate the error up to the controller
      throw err
    }
  }

  /**
   * Retrieves all chapters for a given manga ID, or all chapters if no ID is provided.
   *
   * @param {number|null} mangaId The ID of the manga to retrieve chapters for, or null to retrieve all chapters.
   * @returns {Promise<Array>} A promise that resolves with an array of chapters.
   * @throws Will throw an error if the database query fails.
   */
  async getChaptersManga (mangaId) {
    try {
      const queryOptions = {}
      if (mangaId) {
        queryOptions.where = { mangaId }
      }
      // join with manga table to get manga details
      return await orm.chapter.findAll({
        ...queryOptions,
        include: {
          model: orm.manga,
          attributes: ['id', 'canonicalTitle', 'state', 'readProgress']
        }
      })
    } catch (err) {
      logger.error({ err }, 'Failed to retrieve chapters for manga ID: ' + mangaId)
      // Propagate the error up to the controller
      throw err
    }
  }

  /**
   * Retrieves all chapters that match a given state.
   *
   * @param {string} state The state of the chapters to retrieve.
   * @returns {Promise<Array|Object>} A promise that resolves with an array of chapters if successful, or an error object if an error occurs.
   */
  async getAllChapters (state) {
    try {
      return await orm.chapter.findAll({
        where: {
          state
        }
      })
    } catch (err) {
      logger.error({ err }, 'Error retrieving chapters by state')
      throw err
    }
  }

  /**
   * Retrieves a list of all manga from the database.
   *
   * @returns {Promise<Array>} An array of manga objects.
   * @throws Will throw an error if the database operation fails.
   */
  async getAllManga () {
    try {
      return await orm.manga.findAll() // Simply return the result.
    } catch (err) {
      logger.error({ err }, 'Error retrieving mangas')
      throw new Error('Error retrieving mangas') // Throw a new error that the controller will handle.
    }
  }

  /**
   * Retrieves a single manga from the database by its ID.
   *
   * @param {number|string} id The ID of the manga to retrieve.
   * @returns {Promise<Object|null>} The manga object if found, or null if not.
   * @throws Will throw an error if the database operation fails.
   */
  async getOneManga (id) {
    try {
      return await orm.manga.findOne({
        where: { id }
      })
    } catch (err) {
      logger.error({ err }, 'Error retrieving manga by ID')
      // Throw a general error for the controller to catch.
      throw new Error('Error retrieving manga by ID')
    }
  }

  /**
   * Update a manga's data in the database.
   *
   * @param {string} mangaId - The ID of the manga to be updated.
   * @param {object} mangaData - The updated manga data.
   * @returns {Promise<object>} - An object containing the updated manga.
   * @throws {Error} - Throws an error if the update fails.
   */
  async updateManga (mangaId, mangaData) {
    try {
      // Update the manga's data in the database and return the number of updated rows and the updated manga.
      const [updateCount, updatedManga] = await orm.manga.update(mangaData, {
        where: { id: mangaId },
        returning: true, // Return the updated manga.
        plain: true // Return only the updated manga as a plain object.
      })

      if (updateCount === 0) {
        // No manga was updated.
        return []
      }

      // Return the updated manga.
      return { updatedManga }
    } catch (error) {
      // Handle and log any errors that occur during the update process.
      logger.error({ err: error }, 'Failed to update manga')
      throw error
    }
  }

  /**
   * Update a chapter's data in the database.
   *
   * @param {string} chapterId - The ID of the chapter to be updated.
   * @param {object} chapterData - The updated chapter data.
   * @returns {Promise<object>} - An object containing the updated chapter.
   * @throws {Error} - Throws an error if the update fails.
   */
  async updateChapter (chapterId, chapterData) {
    try {
      // Update the chapter's data in the database and return the number of updated rows and the updated chapter.
      const [updateCount, updatedChapter] = await orm.chapter.update(chapterData, {
        where: { id: chapterId },
        returning: true, // Return the updated chapter.
        plain: true // Return only the updated chapter as a plain object.
      })

      if (updateCount === 0) {
        // No chapter was updated.
        return []
      }

      // Return the updated chapter.
      return { updatedChapter }
    } catch (error) {
      // Handle and log any errors that occur during the update process.
      logger.error({ err: error }, 'Failed to update chapter')
      throw error
    }
  }
}
