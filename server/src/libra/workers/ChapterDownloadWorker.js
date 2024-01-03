const Worker = require('./Worker')
const { logger } = require('../../loaders/logger')
const { orm } = require('../../loaders/sequelize')
const { socketIOLoader } = require('../../loaders/socketio')
const EntityJobService = require('../services/EntityJobService')
const services = require('../../services')
const { agents } = require('../../core/agentsManager')
const { downloadChapterPages } = require('../../services/pageCollectionService')
const { configManager } = require('../../loaders/configManager')
const path = require('path')

function calculateScore (chapterData, currentDate) {
  let score = Number(chapterData.version) || 0

  if (chapterData.votes > 0 && chapterData.lastUpdated) {
    const updateDate = new Date(chapterData.lastUpdated)
    const daysSinceUpdate = (currentDate - updateDate) / (1000 * 60 * 60 * 24)
    score += daysSinceUpdate > 0 ? chapterData.votes / daysSinceUpdate : 0
  } else {
    score += Number(chapterData.votes) || 0
  }

  return score
}

/**
 * Chooses the best source from a list of chapter data based on a list of target languages and source ID.
 * Languages are prioritized based on their order in the array.
 * The best source is determined by the number of votes per day since last update and the version number.
 * If a source ID is provided and matches a chapter, it returns that chapter immediately.
 *
 * @param {Array} chaptersData - Array of objects containing chapter information.
 * @param {Array<string>}  languages - Array of target languages in order of priority.
 * @param {string} [sourceId] - Optional specific source ID to look for.
 * @returns {Object|null} - The chapter data that best matches the criteria or null if none found.
 */
function chooseBestSource (chaptersData, languages, sourceId) {
  if (sourceId) return chaptersData.find(chapterData => chapterData.id === sourceId)

  const currentDate = new Date()
  const considerAllLanguages = !languages || languages.length === 0

  for (const lang of considerAllLanguages ? [null] : languages) {
    const filteredChapters = considerAllLanguages ? chaptersData : chaptersData.filter(chapter => chapter.lang === lang)
    const bestSource = filteredChapters.reduce((best, chapter) => {
      const score = calculateScore(chapter, currentDate)
      return (score > best.score) ? { chapter, score } : best
    }, { chapter: null, score: -1 })

    if (bestSource.chapter) {
      return bestSource.chapter
    }
  }

  return null
}

/**
 * Attempts to grab a chapter of a manga, choosing the best source and downloading it.
 * It updates the chapter's source information in the database after a successful download.
 *
 */
class ChapterDownloadWorker extends Worker {
  processJob (job) {
    return ChapterDownloadWorker.#downloadChapter(job, job.data.payload).catch(e => {
      // If the job fails, update the chapter state back to 1.
      orm.chapter.update({ state: 1 }, { where: { id: job.data.payload.id } })
      logger.error(e, 'Chapter download job failed.')
      job.reportProgress({ value: 0, msg: 'failed.' })
      throw e
    })
  }

  static async #downloadChapter (job, payload) {
    logger.info('Processing chapter download import job.')

    const chapterId = payload.id
    const chapterSource = payload.source

    await EntityJobService.createEntityJob(chapterId, 'chapter', job.id)

    job.reportProgress({ value: 0, msg: 'Checking data...' })
    const chapter = await orm.chapter.findOne({ where: { id: chapterId } })

    if (!chapter) {
      const msg = `Chapter with id '${chapterId}' not found.`
      throw new Error(msg)
    }

    const manga = await orm.manga.findOne({ where: { id: chapter.mangaId } })
    if (!manga) {
      const msg = `Manga with id '${chapter.mangaId}' not found.`
      throw new Error(msg)
    }

    job.chapter = {}
    job.manga = {}
    job.chapter.mangaId = manga.id
    job.manga.id = manga.id

    await orm.chapter.update({ state: 1 }, { where: { id: chapterId } })
    socketIOLoader.emit('CHAPTER_UPDATE', {
      chapter,
      job
    })

    const metadata = chapter.metadata

    const preferences = configManager.get('preferences.agentOptions')

    job.reportProgress({ value: 0, msg: 'Choosing best source...' })
    const bestChoice = chooseBestSource(metadata, preferences?.languages, chapterSource) || null

    if (!bestChoice) {
      const msg = `No suitable source found for chapter ${chapter.chapter} of manga ${manga.canonicalTitle}`
      logger.warn({ mangaId: manga.id }, msg)
      throw new Error(msg)
    }

    await services.library.deletePages(chapterId)
    job.reportProgress({ value: 1, msg: 'retrieving pages..' })
    const result = await agents.grabChapterById(bestChoice.id, bestChoice.source)

    if (!result || result.length === 0) {
      const msg = `No pages found for chapter ${chapter.chapter} of manga ${manga.canonicalTitle}`
      logger.warn({ mangaId: manga.id }, msg)
      throw new Error(msg)
    }

    await downloadChapterPages(job, chapter, {}, manga, result, 'en')
    const mangaName = manga.canonicalTitle.replace(/[/\\?%*:|"<>]/g, '-')
    const rootStorage = configManager.get('storagePath')

    // Update the chapter information with the local directory of the downloaded chapter.
    bestChoice.local = path.join(rootStorage, 'mangas', mangaName, 'raw', chapter.chapter)
    job.reportProgress({ value: 100, msg: 'done.' })
    job.status = 'completed'
    await orm.chapter.update({ state: 3, dlSource: bestChoice }, { where: { id: chapterId } })
    chapter.state = 3

    socketIOLoader.emit('CHAPTER_UPDATE', {
      chapter,
      job
    })
    return { success: true, code: 200, body: 'OK' }
  }
}

module.exports = ChapterDownloadWorker
