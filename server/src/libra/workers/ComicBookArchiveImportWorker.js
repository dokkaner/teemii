const unrar = require('unrar-js')
const Worker = require('./Worker')
const fs = require('fs').promises
const AdmZip = require('adm-zip')
const { logger } = require('../../loaders/logger')
const path = require('path')
const FileInfoExtractor = require('../../services/fileInfoExtractorService')
const { importOrCreateManga } = require('./MangaCommon')
const { orm } = require('../../loaders/sequelize')
const { configManager, TEMP_DIR } = require('../../loaders/configManager')
const { extractFileExtension, rmdir } = require('../../services/osService')

/**
 * Moves and upsert a page into the database.
 * @param {Object} manga - Manga object.
 * @param {Object} chapter - Chapter object.
 * @param {number} pageIndex - Index of the page.
 * @param {string} inputPath - Path of the input file.
 * @returns {Promise<boolean>} - Returns true if successful.
 */
async function moveAndUpsertPage (manga, chapter, pageIndex, inputPath) {
  const mangaName = manga.canonicalTitle.replace(/[/\\?%*:|"<>]/g, '-')
  const rootStorage = configManager.get('storagePath')
  const relativePath = path.join(rootStorage, 'mangas', mangaName, 'raw', chapter.chapter.toString())
  const extension = '.' + extractFileExtension(inputPath)
  const filename = `${pageIndex}${extension}`
  const absolutePath = path.join(rootStorage, 'mangas', mangaName, 'raw', chapter.chapter.toString(), filename)

  try {
    const stats = await fs.stat(inputPath)
    const fileSizeInBytes = stats.size
    const file = {
      mangaId: manga.id,
      chapterId: chapter.id,
      chapterNumber: chapter.chapter,
      pageNumber: pageIndex,
      relativePath,
      path: absolutePath,
      fileName: filename,
      source: 'CBx',
      format: extension,
      type: 'image',
      size: fileSizeInBytes,
      state: 2
    }

    // Upsert logic
    const [existingPage, created] = await orm.file.findOrCreate({
      where: { mangaId: manga.id, chapterId: chapter.id, pageNumber: pageIndex },
      defaults: file
    })

    if (!created) {
      await orm.file.update(file, { where: { id: existingPage.id } })
    }

    // move the file
    await fs.copyFile(inputPath, absolutePath)
    return true
  } catch (e) {
    logger.error({ err: e }, 'FFailed to move and upsert page:')
    return false
  }
}

/**
 * Creates or retrieves a chapter entity from the database.
 * @param {Object} manga - Manga object.
 * @param {number} chapter - Chapter number.
 * @param {number} volume - Volume number.
 * @returns {Promise<Object>} - Returns the chapter entity.
 */
async function createGetChapter (manga, chapter, volume) {
  // check if 'chapter' is a number
  if (isNaN(chapter)) {
    logger.error(`createGetChapter - Chapter ${chapter} is not a number`)
  }

  let chapterEntity = await orm.chapter.findOne({ where: { mangaId: manga.id, chapter } })
  const chapterData = {
    mangaId: manga.id,
    chapter,
    volume,
    state: 3,
    createdAt: new Date(),
    updatedAt: new Date()
  }
  if (!chapterEntity) {
    chapterEntity = await orm.chapter.create(chapterData)
  } else {
    await orm.chapter.update(chapterData, { where: { id: chapterEntity.id } })
  }
  return chapterEntity
}

/** Imports a chapter of manga.
 *
 * @param manga
 * @param chapter
 * @param tempDir
 * @returns {Promise<{success: boolean, totalPageCount: number}>}
 */
async function importChapter (manga, chapter, tempDir) {
  let totalPageCount = 0

  const mangaName = manga.canonicalTitle.replace(/[/\\?%*:|"<>]/g, '-')
  const rootStorage = configManager.get('storagePath')
  const files = await fs.readdir(tempDir)
  // filters only images
  const imageFiles = files.filter(file => {
    const extension = extractFileExtension(file)
    return ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(extension)
  })

  let pageIndex = 0
  let success = true
  const chapterEntity = await createGetChapter(manga, Number(chapter), 0)
  const rootChapterDestination = path.join(rootStorage, 'mangas', mangaName, 'raw', chapterEntity.chapter.toString())
  await fs.mkdir(rootChapterDestination, { recursive: true })
  for (const file of imageFiles) {
    pageIndex++
    totalPageCount++
    try {
      const result = await moveAndUpsertPage(manga, chapterEntity, pageIndex, path.join(tempDir, file))
      success = success && result
    } catch (e) {
      logger.error({ err: e }, 'Failed to import chapter. Page:' + file)
      return { success: false, totalPageCount }
    }
  }
  return { success, chapterCount: 1, totalPageCount }
}
/**
 * Imports a volume of manga.
 * @param {Object} manga - Manga object.
 * @param {number} volume - Volume number.
 * @param {string} tempDir - Temporary directory path.
 * @returns {Promise<Object>} - Returns the result of the import.
 */
async function importVolume (manga, volume, tempDir) {
  let totalPageCount = 0
  let chapterCount = 0

  const mangaName = manga.canonicalTitle.replace(/[/\\?%*:|"<>]/g, '-')
  const rootStorage = configManager.get('storagePath')
  const files = await fs.readdir(tempDir)
  // filters only images
  const imageFiles = files.filter(file => {
    const extension = extractFileExtension(file)
    return ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(extension)
  })
  const extractor = new FileInfoExtractor()

  let pageIndex = 0
  let precedingChapter = -1
  let success = true
  for (const file of imageFiles) {
    const { chapter } = extractor.extractInfoFromFileName(file)
    if (chapter.toString() !== precedingChapter.toString()) {
      chapterCount++
      precedingChapter = chapter
      pageIndex = 0
    }

    pageIndex++
    totalPageCount++
    try {
      const chapterEntity = await createGetChapter(manga, Number(chapter), volume)
      const rootChapterDestination = path.join(rootStorage, 'mangas', mangaName, 'raw', chapterEntity.chapter.toString())
      await fs.mkdir(rootChapterDestination, { recursive: true })
      const result = await moveAndUpsertPage(manga, chapterEntity, pageIndex, path.join(tempDir, file))
      success = success && result
    } catch (e) {
      logger.error({ err: e }, 'Failed to import volume. Page:' + file)
      return { success: false, chapterCount, totalPageCount }
    }
  }
  return { success, chapterCount, totalPageCount }
}

/**
 * Extracts a CBx file to a destination directory.
 * @param {string} sourceFile - Source CBx file path.
 * @param {string} destinationDir - Destination directory path.
 */
async function extractCBx (sourceFile, destinationDir) {
  const extension = extractFileExtension(sourceFile)

  let mimetype = ''
  switch (extension) {
    case 'cbz':
    case 'zip':
      mimetype = 'application/zip'
      break
    case 'cbr':
    case 'rar':
      mimetype = 'application/x-rar-compressed'
      break
  }

  if (mimetype === 'application/zip') {
    const zip = new AdmZip(sourceFile, {})
    await zip.extractAllTo(destinationDir, true, true, '')
  } else if (mimetype === 'application/x-rar-compressed') {
    await unrar.unrar(sourceFile, destinationDir)
  }

  return mimetype
}

/**
 * Imports a CBZ file.
 *
 * @param {string} JobId - Job ID.
 * @param {object} params - Import parameters.
 * @returns {Promise<Object>} - Result of the import operation.
 */
async function importCBx (JobId, params) {
  try {
    // 1. Detect name / year of the comic book / manga from the filename
    const extractor = new FileInfoExtractor()
    const { series, volume, chapter, year, edition } = extractor.extractInfoFromFileName(params.file)
    logger.info(`Importing CBZ: Series: ${series} - Volume: ${volume} - Chapter: ${chapter} - Year: ${year} - Edition: ${edition}`)

    // 2. Create or retrieve the manga entity
    let manga = null
    const response = await importOrCreateManga(JobId, params.title, params.year, params.externalIds)
    if (!response.success) {
      logger.error({ err: response.body }, 'Error importing CBx file: Failed to create or retrieve manga')
      return response
    } else {
      manga = response.body
    }

    // 3. Extract the CBZ file to a temporary directory
    const tempDir = TEMP_DIR
    await extractCBx(params.file, tempDir)

    // setup mode: have we a volume or a chapter?
    const mode = volume !== 'Unknown' ? 'volume' : 'chapter'

    let result = null
    if (mode === 'volume') {
      result = await importVolume(manga, Number(volume), tempDir)
    } else {
      result = await importChapter(manga, Number(chapter), tempDir)
    }

    if (result?.success) {
      await rmdir(tempDir)
      let msg = `Imported ${mode} ${volume} of manga ${series} (${manga.id})`
      msg += ` with ${result?.chapterCount} chapters and ${result?.totalPageCount} pages`
      logger.info(msg)
      return { success: true, code: 200, body: msg }
    }
  } catch (e) {
    logger.error({ err: e }, 'Error importing CBZ file:')
    return { success: false, code: 500, body: e.message }
  }
}
class CBxImportWorker extends Worker {
  /**
   * Processes a job.
   *
   * @param {Object} job - The job to be processed.
   * @returns {Promise<void>}
   */
  processJob (job) {
    return CBxImportWorker.#import(job, job.data.payload)
  }

  static async #import (job, payload) {
    const params = {
      file: payload.file,
      title: payload.title,
      year: payload.year,
      externalIds: payload.externalIds
    }

    await importCBx(job.id, params)
    return { success: true, code: 200, body: '.' }
  }
}

module.exports = CBxImportWorker
