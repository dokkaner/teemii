const Worker = require('./Worker')
const { logger } = require('../../loaders/logger')
const { importOrCreateManga } = require('./MangaCommon')

class MangaImportWorker extends Worker {
  /**
   * Process a manga import job.
   *
   * @param {Object} job - The job to be processed.
   * @returns {Promise<void>}
   */
  processJob (job) {
    return MangaImportWorker.#AddMangaToCollection(job, job.data.payload).catch(e => {
      logger.error(e, 'Manga import job failed.')
      job.reportProgress({ value: 0, msg: 'failed.' })
      throw e
    })
  }

  /**
   * Add a manga to the collection with additional data retrieval and processing.
   *
   * @param {Object} job - The current job
   * @param {Object} payload - The manga data payload.
   * @returns {Promise<Object>} - A success or error response.
   */
  static async #AddMangaToCollection (job, payload) {
    logger.info(`Processing manga import job for '${payload.title}'.`)
    const { title, year, externalIds } = payload

    await importOrCreateManga(job.id, title, year, externalIds, payload.tracking, payload.monitor)

    return { success: true, code: 200, body: 'OK' }
  }
}

module.exports = MangaImportWorker
