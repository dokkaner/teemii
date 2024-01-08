const services = require('../services/index.js')
const { logger } = require('../loaders/logger')
const fs = require('fs')
const path = require('path')
const { configManager } = require('../loaders/configManager.js')
const { Job, validateJobData } = require('../libra/jobs/Job')
const queueManager = require('../libra/queues/QueueManager')
const uuidv4 = require('uuid').v4
const EntityJobService = require('../libra/services/EntityJobService')
const _ = require('lodash')
const { searchInIndex } = require('../services/indexerService')
const { getPagination, getPagingData } = require('../services/common')

async function buildJobsList (jobs) {
  // for each job associate the manga or chapter
  for (const job of jobs) {
    job.dataValues.chapter = {}
    job.dataValues.manga = {}
    if (job.dataValues.entityType === 'manga') {
      const manga = await services.library.getOneManga(job.dataValues.entityId)
      if (manga) {
        job.dataValues.manga.id = manga.id
        job.dataValues.manga.authors = manga.authors
        job.dataValues.manga.startYear = manga.startYear
        job.dataValues.manga.canonicalTitle = manga.canonicalTitle
      }
    } else if (job.dataValues.entityType === 'chapter') {
      const chapter = await services.library.getOneChapter(job.dataValues.entityId)

      if (chapter) {
        const manga = await services.library.getOneManga(chapter.mangaId)
        job.dataValues.chapter = {}
        job.dataValues.chapter.id = chapter.id
        job.dataValues.chapter.chapter = chapter.chapter
        job.dataValues.chapter.titles = chapter.titles
        job.dataValues.chapter.mangaId = chapter.mangaId
        if (manga) {
          job.dataValues.manga.id = manga.id
          job.dataValues.manga.authors = manga.authors
          job.dataValues.manga.startYear = manga.startYear
          job.dataValues.manga.canonicalTitle = manga.canonicalTitle
        }
      }
    }
  }

  return _.uniqBy(jobs, 'id')
}

/**
 * Get the MIME type based on the file extension.
 * @param {string} filePath - Path to the file.
 * @return {string} - MIME type.
 */
function getContentType (filePath) {
  const ext = path.extname(filePath).slice(1).toLowerCase()
  const mimeTypes = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp'
  }

  return mimeTypes[ext] || 'application/octet-stream'
}

/**
 * Send an image file as a response.
 * @param {Object} res - The HTTP response object.
 * @param {string} filePath - Path to the image file.
 */
async function sendImageFile (res, filePath) {
  try {
    // protect against directory traversal
    const rStoragePath = path.resolve(configManager.get('storagePath'))
    const rPublicStorage = path.resolve(configManager.get('publicStorage'))
    const storagePath = configManager.get('storagePath')
    const publicStorage = configManager.get('publicStorage')

    const whitelist = [rStoragePath, rPublicStorage, storagePath, publicStorage]

    if (!whitelist.some(p => filePath.startsWith(p))) {
      return res.status(403).send('Access Denied')
    }

    const contentType = getContentType(filePath)
    const readStream = fs.createReadStream(filePath)
    return readStream.pipe(res.type(contentType))
  } catch (error) {
    logger.warn(`Image file not accessible: ${filePath}`)
  }
}

module.exports = class LibraryController {
  /**
   * Handle autocomplete requests.
   *
   * @param {object} req - The request object from the client.
   * @param {object} res - The response object to send back the result.
   */
  async autoComplete (req, res) {
    const query = req.query.q

    // Validate the query parameter
    if (!query || query.trim().length === 0) {
      return res.status(400).send('Query parameter is required and cannot be empty')
    }

    try {
      const results = searchInIndex(query)
      res.json(results)
    } catch (e) {
      logger.error({ e }, 'Error during search:')
      res.status(500).send('Error processing your request')
    }
  }

  /**
   * Controller to get the total size of all files for a given manga.
   * @param {object} req - The request object.
   * @param {object} res - The response object.
   */
  async getMangaTotalSize (req, res) {
    const mangaId = req.params.id

    if (!mangaId) {
      // If no manga ID is provided, return a 400 Bad Request.
      return res.status(400).json({ message: 'Manga ID is required.' })
    }

    try {
      const totalSize = await services.library.getMangaTotalSize(mangaId) || 0
      // Assuming that a totalSize of 0 is valid and means no files are present for the manga.
      return res.status(200).json({ totalSize })
    } catch (e) {
      logger.error({ e, mangaId }, 'Failed to get total size for manga.')

      if (e.message === 'Manga not found or has no files') {
        // If the specific error is known, we can return a 404 Not Found.
        return res.status(404).json({ message: e.message })
      }

      // For all other cases, return a 500 Internal Server Error.
      return res.status(500).json({ message: 'An error occurred while fetching the manga total size.' })
    }
  }

  /**
   * Controller method to handle the deletion of a manga.
   *
   * @param {object} req - The express request object containing the manga ID in params.
   * @param {object} res - The express response object.
   */
  async deleteManga (req, res) {
    const mangaId = req.params.id

    if (!mangaId) {
      // If no manga ID is provided, return a 400 Bad Request.
      return res.status(400).json({ message: 'Manga ID is required.' })
    }

    try {
      await services.library.deleteManga(mangaId) // The service handles the transaction
      // Send a 204 No Content response to indicate successful deletion with no content to return
      return res.status(204).end()
    } catch (e) {
      logger.error({ err: e }, `Error deleting manga with ID: ${mangaId}`) // Log the error

      // Determine the response status code based on the error type
      // This could be a 404 if the manga wasn't found, a 400 for bad input, or a 500 for a server error
      // For now, we'll assume a server error but this should be improved
      const statusCode = e.statusCode || 500

      // Send an error response with a proper error structure
      res.status(statusCode).send({
        success: false,
        message: 'Failed to delete manga',
        error: e.message || 'Internal Server Error'
      })
    }
  }

  /**
   * Controller for retrieving a single page.
   *
   * @param {Object} req - The express request object.
   * @param {Object} res - The express response object.
   */
  async getOnePage (req, res) {
    try {
      const page = await services.library.getOnePage(req.params.id)

      if (!page) {
        return res.status(404).json({ message: 'Page not found' })
      }

      const filepath = path.resolve(page.path)
      if (!fs.existsSync(filepath)) {
        logger.error({ filepath }, 'Image file does not exist at path:')
        return res.status(404).json({ message: 'Image not found' })
      }

      const fileExtension = path.extname(filepath).substring(1)
      res.type(`image/${fileExtension}`)
      const readStream = fs.createReadStream(filepath)

      readStream.on('error', e => {
        logger.error({ err: e }, 'Error reading image file')
        res.status(500).json({ message: 'Error reading image file' })
      })

      return readStream.pipe(res)
    } catch (e) {
      logger.error({ err: e }, 'Error in getOnePage Controller')
      res.status(500).json({ message: 'Internal server error' })
    }
  };

  /**
   * HTTP GET endpoint to retrieve all tasks.
   *
   * @param {Object} req - The request object.
   * @param {Object} res - The response object.
   */
  async getAllTasks (req, res) {
    try {
      const { page, size } = req.query
      const { limit, offset } = getPagination(page, size)
      const data = await EntityJobService.getAllJobsWithEntity(limit, offset)
      const jobEntities = getPagingData(data, page, limit)

      // filter jobEntities without job
      const jobs = []
      for (const jobEntity of jobEntities.items) {
        if (jobEntity.job) {
          const job = jobEntity.job
          job.dataValues.entityType = jobEntity.entityType
          job.dataValues.entityId = jobEntity.entityId
          jobs.push(job)
        }
      }

      const uniqueJobs = await buildJobsList(jobs)

      res.status(200).send(uniqueJobs)
    } catch (err) {
      res.status(500).json({ message: err.message })
    }
  };

  async getNextChapter (req, res) {
    const chapterId = req.params.id
    try {
      const nextChapter = await services.library.findNextChapter(chapterId)
      if (nextChapter) {
        res.status(200).json(nextChapter)
      } else {
        res.status(404).send('Chapter not found')
      }
    } catch (e) {
      logger.error({ err: e }, 'Failed to retrieve next chapter')
      res.status(500).send('An error occurred while fetching the next chapter')
    }
  }

  async getPreviousChapter (req, res) {
    const chapterId = req.params.id
    try {
      const previousChapter = await services.library.findPrevChapter(chapterId)
      if (previousChapter) {
        res.status(200).json(previousChapter)
      } else {
        res.status(404).send('Chapter not found')
      }
    } catch (e) {
      logger.error({ err: e }, 'Failed to retrieve previous chapter')
      res.status(500).send('An error occurred while fetching the previous chapter')
    }
  }

  /**
   * Controller to get manga chapters by manga ID.
   *
   * @param {Object} req - The request object.
   * @param {Object} res - The response object.
   */
  async getMangaChapters (req, res) {
    try {
      const id = req.params.id
      const chapters = await services.library.getChaptersManga(id)

      // for each chapter join entityJob and retrieve last job
      for (const chapter of chapters) {
        const entityJob = await EntityJobService.getLastJobWithEntity(chapter.id, 'chapter')
        chapter.dataValues.job = {}
        if (entityJob) {
          chapter.dataValues.job.status = entityJob.status
          chapter.dataValues.job.finishedAt = entityJob.finishedAt
          chapter.dataValues.job.result = entityJob.result
          chapter.dataValues.job.error = entityJob.error
          chapter.dataValues.job.progress = entityJob.progress
        }
      }
      if (chapters?.length > 0) {
        res.status(200).json(chapters)
      } else {
        res.status(404).send('chapters not found')
      }
    } catch (e) {
      logger.error({ err: e }, 'getMangaChapters failed.')
      res.status(500).send('An exception occurred.')
    }
  }

  /**
   * Controller to get manga characters by manga ID.
   *
   * @param {Object} req - The request object.
   * @param {Object} res - The response object.
   */
  async getMangaCharacters (req, res) {
    try {
      const id = req.params.id
      const characters = await services.agents.getMangaCharacters(id)
      if (characters?.length > 0) {
        res.status(200).json(characters)
      } else {
        res.status(404).send('characters not found')
      }
    } catch (e) {
      logger.error({ err: e }, 'getMangaCharacters failed.')
      res.status(500).send('An exception occurred.')
    }
  }

  /**
   * Controller to handle the request to retrieve a feed of tasks for a specific manga.
   *
   * This endpoint serves as an HTTP interface to obtain a list of tasks
   * associated with a given manga. It delegates the business logic to the
   * service layer and handles HTTP response statuses based on the outcome
   * of the service operation.
   *
   * @param {Object} req - The express request object, containing the manga ID in params.
   * @param {Object} res - The express response object used to send back HTTP responses.
   */
  async getMangaFeed (req, res) {
    try {
      res.status(200).json({ message: 'Not implemented' })
    } catch (e) {
      logger.error({ err: e }, 'Error retrieving manga tasks feed from the controller')
      res.status(500).json({ message: 'Internal server error while retrieving tasks feed.' })
    }
  }

  /**
   * Handles the request for retrieving the reading status of a manga.
   * If a 'slug' query parameter is provided, it fetches the reading status for a specific manga.
   * Otherwise, it retrieves the reading status for all mangas in the library.
   *
   * @param {object} req - The request object containing the 'slug' query parameter.
   * @param {object} res - The response object used to send back the HTTP response.
   * @returns {Promise<Response>} A promise that resolves to the HTTP response object.
   */
  async getReadingStatus (req, res) {
    const readStatus = await services.library.getReadStatus()
    if (readStatus) {
      return res.status(200).json(readStatus)
    } else {
      return res.status(500).json({ message: 'An error occurred while fetching the reading status.' })
    }
  };

  async getReadingStats (req, res) {
    const stats = await services.library.getStatisticalData()
    if (stats) {
      return res.status(200).json(stats)
    } else {
      return res.status(500).json({ message: 'An error occurred while fetching the reading status.' })
    }
  }

  /**
   * Handles the HTTP POST request to update the reading status of a page.
   *
   * This method captures pageId and pageNumber from the request parameters,
   * and then calls the library service to update the read status in the database.
   * On successful update, it sends back the result of the update operation.
   * If the pageId is not provided or not found, it responds with a 404 status.
   * Any unexpected errors are caught and a 500 status code is sent back.
   *
   * @param {Object} req - The HTTP request object, containing the pageId and pageNumber.
   * @param {Object} res - The HTTP response object used to send back the HTTP response.
   */
  async postReadingStatus (req, res) {
    try {
      const pageId = req.params.pageId
      const pageNumber = req.params.pageNumber

      if (pageId) {
        const data = req.body
        const result = await services.library.setReadStatus(pageId, pageNumber, data)
        return res.send(result)
      } else {
        res.status(404).send('not found')
      }
    } catch (err) {
      logger.error({ err }, 'postReadingStatus failed.')
      res.status(500).send('An exception occurred.')
    }
  };

  /**
   * Retrieves all the pages for a specific chapter based on the chapter ID provided in the request parameters.
   *
   * This method calls the library service to fetch an array of pages for a given chapter. It then checks
   * to ensure that the pages exist. If no pages are found, it returns a 404 status with a message indicating
   * that no pages were found for the provided chapter ID. If pages are found, it returns them in the response.
   * The method handles errors by logging them and returning a 500 internal server error status if an exception occurs.
   *
   * @param {Object} req - The HTTP request object, containing the chapter ID as a parameter.
   * @param {Object} res - The HTTP response object used to send back the HTTP response.
   */
  async getChapterPages (req, res) {
    try {
      const pages = await services.library.getChapterPages(req.params.id)

      // Check if pages array is empty, implying no pages were found for the chapterId
      if (pages.length === 0) {
        return res.status(404).json({ message: 'No pages found for the provided chapterId' })
      }

      res.json(pages)
    } catch (e) {
      logger.error({ err: e })
      res.status(500).json({ message: 'Internal server error while fetching chapter pages' })
    }
  };

  /**
   * Controller to handle the request to grab a chapter.
   *
   * @param {Object} req - The request object.
   * @param {Object} res - The response object.
   */
  async getGrabChapter (req, res) {
    const options = req.query.source
    const chapterId = req.params.id

    try {
      const result = await services.library.updateChapterStateAndSource(chapterId, options)
      if (result.length === 0) {
        return res.status(404).json({ message: 'Chapter not found' })
      }
      res.status(200).json(result)
    } catch (err) {
      // Handle different kinds of errors appropriately.
      if (err.message.includes('not found')) {
        res.status(404).send({ success: false, message: err.message })
      } else {
        res.status(500).send({ success: false, message: 'Internal Server Error' })
      }
    }
  };

  /**
   * Retrieves the cover for a chapter by its ID.
   * If the chapter cover is found, it serves the image; if not, it serves a placeholder image.
   *
   * @param {Object} req - The HTTP request object.
   * @param {Object} res - The HTTP response object for sending the response.
   */
  async getChapterCover (req, res) {
    const chapterId = req.params.id
    try {
      const covers = await services.library.getChapterPages(chapterId)
      // select 2nd page as cover
      const cover = covers.filter(page => page.pageNumber === 1)

      const imagePath = cover[0]?.path

      if (imagePath && fs.existsSync(imagePath)) {
        res.status(200) // OK status
        return sendImageFile(res, imagePath)
      } else {
        // If no cover, send the default not found image.
        const publicStorage = configManager.get('publicStorage')
        const notFound = path.join(publicStorage, 'assets', 'images', 'notfound.png')
        return sendImageFile(res, notFound)
      }
    } catch (e) {
      logger.error({ err: e }, `Failed to retrieve chapter cover for ID ${chapterId}`)
      res.status(500).send('Internal server error while fetching chapter cover')
    }
  };

  /**
   * Retrieves the cover for a manga by its ID
   *
   * @param {Object} req - The HTTP request object.
   * @param {Object} res - The HTTP response object.
   */
  async getMangaCover (req, res) {
    const mangaId = req.params.id

    if (!/^[a-zA-Z0-9_-]+$/.test(mangaId)) {
      return res.status(400).send('Invalid manga ID')
    }

    try {
      const type = req.query.type || 'cover' // default to 'cover' if not specified

      const storage = configManager.get('storagePath')
      const publicStorage = configManager.get('publicStorage')

      const folder = {
        banner: path.join(storage, 'banners'),
        cover: path.join(storage, 'covers'),
        poster: path.join(storage, 'posters')
      }[type] || path.join(storage, 'posters')

      const filepath = path.resolve(folder, mangaId + '.webp')
      const placeholderPath = path.resolve(publicStorage, 'assets', 'images', '404.png')

      if (!filepath.startsWith(path.resolve(folder))) {
        return res.status(403).send('Access Denied')
      }

      if (filepath && fs.existsSync(filepath)) {
        res.status(200) // OK status
        return sendImageFile(res, filepath)
      } else {
        // If no cover, send the default not found image.
        return sendImageFile(res, placeholderPath)
      }
    } catch (e) {
      logger.error({ err: e }, `Failed to retrieve manga cover for ID ${mangaId}`)
      res.status(500).send('Internal server error while fetching manga cover')
    }
  };

  /**
   * Fetches a single chapter by its ID.
   *
   * This controller method is responsible for handling a request to retrieve a specific chapter.
   * It utilizes the associated service to query the chapter details from the data store.
   * A successful lookup will result in the chapter details being returned to the client.
   * If the chapter cannot be found, a 404 status code is returned with an appropriate message.
   * In the case of an unexpected error during the operation, a 500 status code is returned along with an error message.
   *
   * @param {Object} req - The HTTP request object, including the chapter ID as a route parameter.
   * @param {Object} res - The HTTP response object for sending back the retrieved chapter data or error messages.
   */
  async getOneChapter (req, res) {
    try {
      const chapter = await services.library.getOneChapter(req.params.id)

      if (!chapter) {
        return res.status(404).json({ message: 'Chapter not found' })
      }

      res.json(chapter)
    } catch (e) {
      logger.error({ err: e })
      res.status(500).json({ message: 'Internal server error while fetching the chapter' })
    }
  };

  /**
   * Controller method to update a chapter.
   *
   * @param {object} req - The Express request object.
   * @param {object} res - The Express response object.
   */
  async updateChapter (req, res) {
    const chapterId = req.params.id // Assuming the manga ID is in the route parameter.
    const chapterData = req.body // Assuming the updated manga data is in the request body.

    try {
      // Call the service method to update the manga.
      const result = await services.library.updateChapter(chapterId, chapterData)

      if (result.updatedChapter) {
        // Manga updated successfully.
        res.status(200).json(result.updatedChapter)
      } else {
        // No manga was updated.
        res.status(404).json({ message: 'Chapter not found.' })
      }
    } catch (error) {
      // Handle and send an error response if the update fails.
      res.status(500).json({ error: 'Failed to update chapter.' })
    }
  }

  /**
   * Retrieves all chapters for a specific manga.
   *
   * This method handles an incoming HTTP request to retrieve all chapters associated with a given manga ID.
   * It queries the database through the service layer to get the relevant chapters and sends them back to the client.
   * If no chapters are found or an error occurs, it logs the error and returns an appropriate HTTP status code.
   *
   * @param {Object} req - The HTTP request object, expected to have a mangaId as a URL parameter.
   * @param {Object} res - The HTTP response object used to send back the data or an error message.
   */
  async getAllChaptersManga (req, res) {
    try {
      const mangaId = req.params.mangaId
      const chapters = await services.library.getChaptersManga(mangaId)

      res.status(200).json(chapters)
    } catch (err) {
      logger.error(err)
      res.status(500).json({ message: 'Internal server error while fetching chapters' })
    }
  };

  /**
   * Handles the HTTP POST request to create a new task.
   *
   * @param {Object} req - The express request object, which includes parameters and body data.
   * @param {Object} res - The express response object used for sending back the HTTP response.
   */
  async postCommand (req, res) {
    try {
      const data = req.body
      const immediate = req.query.immediate
      const options = data.options

      validateJobData(data)

      const job = new Job(uuidv4(), data, options?.maxRetries || 3, options?.retryInterval || 5000,
        options?.timeout || 60 * 1000)
      await job.initialize()
      const queue = queueManager.getQueue(data.for)
      await queue.addJob(job)
      if (Number(immediate) === 1) {
        await queue.runImmediate(job)
      }

      return res.status(201).json({
        message: 'Job created successfully',
        taskId: job.id
      })
    } catch
    (err) {
      // Log the error internally.
      logger.error({ err }, 'Failed to create a task in postCommand')

      // If an error is thrown, it means something went wrong server-side, hence the 500 status code.
      return res.status(500).json({
        message: 'Internal server error while creating task'
      })
    }
  }

  /**
   * Returns all mangas in your collection
   *
   * @param {*} req
   * @param {*} res
   * @returns
   */
  async getAllManga (req, res) {
    try {
      const Mangas = await services.library.getAllManga()
      for (const manga of Mangas) {
        manga.dataValues.job = {}
        const entityJob = await EntityJobService.getLastJobWithEntity(manga.id, 'manga')
        if (entityJob) {
          manga.dataValues.job = entityJob
        }

        // add a lastRead field to the manga; from stats table
        if (manga.readProgress > 0) {
          const status = await services.library.getMangaReadStatus(manga.slug)
          manga.dataValues.lastRead = status.lastUpdated
        }
      }

      return res.send(Mangas)
    } catch (err) {
      logger.error({ err }, 'getAllManga failed.')
      res.status(500).send('An exception occurred.')
    }
  }

  /**
   * Handles the HTTP GET request to retrieve a single manga by its ID.
   *
   * @param {Object} req The request object, containing the manga ID in the route parameters.
   * @param {Object} res The response object used to send back the desired HTTP response.
   * @returns {Promise<Response>} Sends a JSON response with the manga data or an error message.
   */
  async getOneManga (req, res) {
    try {
      const manga = await services.library.getOneManga(req.params.id)
      if (!manga) {
        return res.status(404).json({ message: 'Manga not found' })
      }
      const entityJob = await EntityJobService.getLastJobWithEntity(manga.id, 'manga')
      manga.dataValues.job = {}
      if (entityJob) {
        manga.dataValues.job = entityJob
      }

      // build sources list
      manga.dataValues.sources = await services.agents.getSourceURLs(manga.dataValues)
      // add a lastRead field to the manga; from stats table
      if (manga.readProgress > 0) {
        manga.dataValues.readStatus = await services.library.getMangaReadStatus(manga.slug)
      }
      res.json(manga)
    } catch (err) {
      logger.error(err)
      res.status(500).json({ message: 'Internal server error while fetching manga' })
    }
  }

  /**
   * Controller method to update a manga.
   *
   * @param {object} req - The Express request object.
   * @param {object} res - The Express response object.
   */
  async updateManga (req, res) {
    const mangaId = req.params.id // Assuming the manga ID is in the route parameter.
    const mangaData = req.body // Assuming the updated manga data is in the request body.

    try {
      // Call the service method to update the manga.
      const result = await services.library.updateManga(mangaId, mangaData)

      if (result.updatedManga) {
        // Manga updated successfully.
        res.status(200).json(result.updatedManga)
      } else {
        // No manga was updated.
        res.status(404).json({ message: 'Manga not found.' })
      }
    } catch (error) {
      // Handle and send an error response if the update fails.
      res.status(500).json({ error: 'Failed to update manga.' })
    }
  }

  /**
   * Controller for getting recommendations mangas.
   * This method handles the HTTP request and response,
   * delegating business logic to the service layer.
   *
   * @param {Object} req - The HTTP request object.
   * @param {Object} res - The HTTP response object.
   * @returns A response with the trending mangas or an appropriate HTTP error.
   */
  async mangasRecommendations (req, res) {
    try {
      // Retrieve trending mangas from the agent service.
      const mangas = await services.agents.getRecommendationsMangas('all', 10)

      // Check if mangas were found and respond accordingly.
      if (mangas.length > 0) {
        return res.status(200).json(mangas)
      } else {
        logger.info('No recommendations mangas found')
        return res.status(404).send('Not found')
      }
    } catch (err) {
      logger.error('Error fetching trending mangas', err)
      return res.status(500).send('Internal Server Error')
    }
  }

  /**
   * Controller for getting trending mangas.
   * This method handles the HTTP request and response,
   * delegating business logic to the service layer.
   *
   * @param {Object} req - The HTTP request object.
   * @param {Object} res - The HTTP response object.
   * @returns A response with the trending mangas or an appropriate HTTP error.
   */
  async mangasTrending (req, res) {
    const mode = req.params.ask
    const limit = parseInt(req.query.limit, 10) || 10
    try {
      // Retrieve trending mangas from the agent service.
      const mangas = await services.agents.getTrendingMangas(mode, limit)

      // Check if mangas were found and respond accordingly.
      if (mangas.length > 0) {
        return res.status(200).json(mangas)
      } else {
        logger.info(`No trending mangas found for mode: ${mode}`)
        return res.status(404).send('Not found')
      }
    } catch (err) {
      logger.error(`Error fetching trending mangas for mode: ${mode}`, err)
      return res.status(500).send('Internal Server Error')
    }
  }

  /**
   * Endpoint to get all manga suggestions.
   * Responds with a list of suggestions or an error message.
   *
   * @param {Object} req - The request object.
   * @param {Object} res - The response object.
   */
  async mangasGetSuggestions (req, res) {
    try {
      const result = await services.library.getAllSuggestions()
      res.status(200).json(result)
    } catch (err) {
      logger.error({ err }, 'Error retrieving manga suggestions')
      res.status(500).json({ message: 'Unable to retrieve manga suggestions at this time.' })
    }
  }

  /**
   * Endpoint to get AI-generated manga suggestions.
   *
   * @param {Object} req - The express request object.
   * @param {Object} res - The express response object.
   */
  async mangasGetAISuggests (req, res) {
    try {
      const body = req.body
      const title = req.query.title
      const isAdult = req.query.isAdult === 'true'

      const suggestions = await services.agents.getSuggestions(title, isAdult, body)

      if (suggestions) {
        res.status(200).send(suggestions)
      } else {
        res.status(404).json({ message: 'No suggestions found for the given title.' })
      }
    } catch (err) {
      logger.error({ err }, 'Error fetching manga suggestions.')
      res.status(500).json({ message: 'Internal server error while fetching suggestions.' })
    }
  }

  /**
   * Looks up mangas based on a given search term, applying user preferences and filters.
   *
   * @param {Object} req - Express.js request object containing the query parameters.
   * @param {Object} res - Express.js response object used to send the response.
   */
  async mangasLookup (req, res) {
    const term = req.query.term
    const forceSearch = req.query.force === 'true'
    try {
      const searchResults = await services.agents.searchMangasByTerm(term, forceSearch)
      return res.status(200).send(searchResults)
    } catch (err) {
      logger.error({ err }, 'mangasLookup failed.')
      res.status(500).send('An exception occurred.')
    }
  }
}
