const { orm } = require('../loaders/sequelize')
const { socketIOLoader } = require('../loaders/socketio')
const { configManager } = require('../loaders/configManager')
const path = require('path')
const os = require('./osService')
const { logger } = require('../loaders/logger')
const utils = require('../utils/agent.utils')
const fs = require('fs').promises
const { Semaphore } = require('await-semaphore')
const ips = require('./imageProcessingService')

/**
 * Downloads a manga page and records its metadata in the database.
 *
 * @param {Object} page - The page object containing URLs and identifiers.
 * @param {string} absolutePath - The absolute path where the file should be stored.
 * @param {string} filename - The filename to be used when saving the file.
 * @param {string} folder - The folder where the file should be stored.
 * @return {Promise<boolean>} - A promise that resolves with true if the page was successfully downloaded and recorded, false otherwise.
 */
async function downloadPage (page, absolutePath, filename, folder) {
  let sourceDomain = null
  const url = page.pageURL
  try {
    // Determine the source domain if chapterId is a URL.
    sourceDomain = url.startsWith('http') ? utils.domain(url) : null
  } catch (e) {
    logger.info('Failed to parse domain from chapterId', { page, e })
  }

  // Attempt to download the page.

  try {
    await utils.downloadPage(url, folder, filename, page.referer)
    const fullPath = path.join(folder, filename)
    const enhancedPages = configManager.get('preferences.advancedFeatures.enhancedPages') || false
    if (enhancedPages) {
      const outputFile = await ips.processImage(fullPath, ['eh_waifu2x', 'cv_webp', 'ex_downscale2x',
        'cl_trim'])
      absolutePath = outputFile
      filename = path.basename(outputFile)
    }
  } catch (e) {
    logger.error({ page, err: e }, 'Page download failed')
    return false
  }

  let stats = null
  try {
    stats = await fs.stat(absolutePath)
  } catch (e) {
    logger.error({ page, err: e }, 'Failed to get file stats:')
    throw e
  }
  // Prepare file metadata object.
  try {
    const fileSizeInBytes = stats.size
    const file = {
      mangaId: page.mangaId,
      chapterId: page.chapterId,
      fileSytem: null,
      chapterNumber: page.chapterNum,
      pageNumber: page.index,
      relativePath: folder,
      path: absolutePath,
      fileName: filename,
      lang: page.lang,
      quality: 0,
      scanGroup: '',
      source: sourceDomain || '',
      format: 'jpg', // Consider determining the format dynamically from the content-type or file extension
      type: 'image',
      size: fileSizeInBytes,
      state: 2 // State '2' needs to be clarified
    }

    // Insert or update the file metadata in the database.
    await orm.file.upsert(file)
    return true
  } catch (e) {
    logger.error({ err: e }, 'File metadata recording failed')
    return false
  }
}

module.exports = {

  /**
   * Downloads all pages for a given chapter of a manga in parallel with rate limiting.
   *
   * @param {Object} job - The job object.
   * @param {Object} chapter - Chapter object with details such as chapter number.
   * @param {Object} settings - Settings object for download configurations.
   * @param {Object} manga - Manga object with details such as title.
   * @param {Array} pages - Array of page objects to be downloaded.
   * @param {string} lang - Language of the chapter pages.
   * @return {Promise<void>} - A promise that resolves when all downloads are complete.
   */
  async downloadChapterPages (job, chapter, settings, manga, pages, lang) {
    logger.info(`Downloading ${pages.length} pages for chapter ${chapter.chapter} of ${manga.canonicalTitle} (${manga.startYear})`)
    if (!pages || pages.length === 0) {
      await orm.chapter.update({ state: 3, pages: 0 }, { where: { id: chapter.id } })
      return
    }
    // build Job object for socket.io
    job.entityType = 'chapter'
    job.entityId = chapter.id
    job.chapter = { id: chapter.id, chapter: chapter.chapter, titles: chapter.titles, mangaId: manga.id }
    job.manga = { id: manga.id, canonicalTitle: manga.canonicalTitle, startYear: manga.startYear, authors: manga.authors }

    const mangaTitle = `${manga.canonicalTitle} (${manga.startYear})`
    const mangaFolder = os.sanitizeDirectoryName(mangaTitle, 200)
    socketIOLoader.emit('notification', {
      title: manga.canonicalTitle,
      message: `Download started for chapter ${chapter.chapter}`
    })

    const rootStorage = configManager.get('storagePath')
    const rootDir = path.join(rootStorage, 'mangas', mangaFolder, 'raw', chapter.chapter.toString())
    await os.mkdir(rootDir)

    await orm.chapter.update({ state: 2 }, { where: { id: chapter.id } })
    chapter.state = 2
    const concurrencyLimit = 2
    const semaphore = new Semaphore(concurrencyLimit)

    const downloadPromises = pages.map((page, index) => {
      return semaphore.use(async () => {
        const ext = os.extractFileExtension(page.pageURL)
        const filename = `${index + 1}.${ext}`
        page.index = index + 1
        page.lang = lang
        const absolutePath = path.join(rootDir, filename)
        let success
        try {
          page.mangaId = manga.id
          page.chapterId = chapter.id
          page.mangaName = manga.canonicalTitle
          page.chapterNum = chapter.chapter
          success = await downloadPage(page, absolutePath, filename, rootDir)
        } catch (e) {
          logger.error({ page, err: e }, 'Failed to download page')
          success = false
        }
        if (success) {
          const progress = ((index / pages.length) * 100).toFixed(0)
          const progressMsg = `downloading page ${index} of ${pages.length}`
          job.reportProgress({ value: progress, msg: progressMsg })
        } else {
          throw new Error(`Failed to download page ${index + 1}`)
        }
      }).then(() => {
        job.chapter = {}
        job.manga = {}
        job.chapter.mangaId = manga.id
        job.manga.id = manga.id
        socketIOLoader.emit('CHAPTER_UPDATE', {
          chapter,
          job
        })
      })
    })

    const results = await Promise.allSettled(downloadPromises)
    const failedDownloads = results.filter(result => result.status === 'rejected')
    const finalState = failedDownloads.length > 0 ? 4 : 3 // 4 = Failed, 3 = Completed

    await orm.chapter.update({
      state: finalState,
      pages: pages.length - failedDownloads.length
    }, { where: { id: chapter.id } })

    logger.info(`Chapter ${chapter.chapter} of ${manga.canonicalTitle} (${manga.startYear}) download complete.`)
    if (failedDownloads.length > 0) {
      logger.error(`Failed to download ${failedDownloads.length} pages for chapter ${chapter.chapter}.`)
    }
  }
}
