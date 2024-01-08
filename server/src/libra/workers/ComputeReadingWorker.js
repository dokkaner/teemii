const Worker = require('./Worker')
const { logger } = require('../../loaders/logger')
const { orm } = require('../../loaders/sequelize')
const {
  calculateProgressPercentage,
  calculateOverallProgress,
  updateChapterProgress,
  updateMangaProgress
} = require('../../services/readingService')
/**
 * Computes the progress for each manga.
 *
 * @param {Array} mangas - Array of manga objects.
 */
const computeMangaProgress = async (mangas) => {
  for (const manga of mangas) {
    const chaptersProgress = await orm.chapter.findAll({
      attributes: [
        [orm.Sequelize.fn('count', orm.Sequelize.col('mangaId')), 'chapterCount'],
        [orm.Sequelize.fn('sum', orm.Sequelize.col('readProgress')), 'totalProgress']
      ],
      group: ['chapter.mangaId'],
      where: { mangaId: manga.id },
      raw: true
    })

    if (chaptersProgress.length > 0 && chaptersProgress[0].chapterCount > 0) {
      const total = chaptersProgress[0].chapterCount * 100
      const percent = calculateOverallProgress(chaptersProgress[0].totalProgress, total)
      await updateMangaProgress(manga.id, percent)
    }
  }
}

/**
 * Computes the progress for each chapter.
 *
 * @param {Array} chapters - Array of chapter objects.
 * @param {Array} mangas - Array of manga objects.
 * @param {Array} readStatuses - Array of reading status objects.
 */
const computeChapterProgress = async (chapters, mangas, readStatuses) => {
  for (const chapter of chapters) {
    let progress = 0
    const manga = mangas.find(m => m.id === chapter.mangaId)

    if (manga) {
      readStatuses.forEach(status => {
        if (status.mangaSlug === manga.slug && status.chapterNumber.toString() === chapter.chapter.toString()) {
          progress += status.pageNumber
        }
      })

      if (progress > 0) {
        const percent = calculateProgressPercentage(progress, chapter.pages)
        await updateChapterProgress(chapter.id, percent)
      }
    }
  }
}

/**
 * Fetches all necessary data from the database.
 *
 * @return {Promise<Array>} Returns a promise that resolves with an array containing chapters, mangas, and readStatuses.
 */
const fetchAllData = async () => {
  try {
    const chapters = await orm.chapter.findAll({})
    const mangas = await orm.manga.findAll({})
    const readStatuses = await orm.stats.findAll({})

    return [chapters, mangas, readStatuses]
  } catch (e) {
    logger.error({ err: e }, 'Error fetching data')
    throw e
  }
}

/**
 * Computes the reading progress for each chapter and manga.
 * Updates the reading progress in the database.
 */
class ComputeReadingWorker extends Worker {
  /**
   * Process a library update job.
   *
   * @param {Object} job - The job to be processed.
   * @returns {Promise<void>}
   */
  processJob (job) {
    return ComputeReadingWorker.#compute()
  }

  static async #compute () {
    const [chapters, mangas, readStatuses] = await fetchAllData()

    await computeChapterProgress(chapters, mangas, readStatuses)
    await computeMangaProgress(mangas)

    return { success: true, code: 200, body: `Calculation of reading status for ${mangas.length} mangas completed.` }
  }
}

module.exports = ComputeReadingWorker
