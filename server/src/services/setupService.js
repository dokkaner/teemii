const { ormConnect, ormSync } = require('../loaders/orm')
const { logger } = require('../loaders/logger')
const os = require('./osService')
const path = require('path')
const queueManager = require('../libra/queues/QueueManager')
const MangaImportWorker = require('../libra/workers/MangaImportWorker')
const ChapterDownloadWorker = require('../libra/workers/ChapterDownloadWorker')
const MaintenanceWorker = require('../libra/workers/MaintenanceWorker')
const LibraryUpdateWorker = require('../libra/workers/LibraryUpdateWorker')
const ComputeReadingWorker = require('../libra/workers/ComputeReadingWorker')
const ComputeSuggesterWorker = require('../libra/workers/ComputeSuggesterWorker')
const { QueueMode } = require('../libra/queues/Queue')
const { configManager, BACKUP_DIR, LOGS_DIR, CONFIG_DIR, TEMP_DIR } = require('../loaders/configManager')
const CBxImportWorker = require('../libra/workers/ComicBookArchiveImportWorker')
const ScrobblersWorker = require('../libra/workers/ScrobblersWorker')

async function createDefaultJobs () {
  try {
    const computeSuggesterJob = {
      for: 'computeSuggesterQueue',
      options: {
        maxRetries: 1,
        retryInterval: 1000 * 5, // 5 seconds
        timeout: 1000 * 60 * 30 // 30 minutes
      },
      payload: {},
      entityId: null
    }

    const computeReadJob = {
      for: 'computeReadingQueue',
      options: {
        maxRetries: 1,
        retryInterval: 1000 * 5, // 5 seconds
        timeout: 1000 * 60 * 10 // 10 minutes
      },
      payload: {},
      entityId: null
    }

    const maintenanceJob = {
      for: 'maintenanceQueue',
      options: {
        maxRetries: 1,
        retryInterval: 1000 * 5, // 5 seconds
        timeout: 1000 * 60 * 10 // 10 minutes
      },
      payload: {},
      entityId: null
    }

    const libUpdateJob = {
      for: 'libraryUpdateQueue',
      options: {
        maxRetries: 1,
        retryInterval: 1000 * 60, // 1 minute
        timeout: 1000 * 60 * 60 // 60 minutes
      },
      payload: {},
      entityId: null
    }

    const scrobblerJob = {
      for: 'scrobblersQueue',
      options: {
        maxRetries: 1,
        retryInterval: 10 * 1000 * 60, // 10 minutes
        timeout: 1000 * 60 * 60 // 60 minutes
      },
      payload: {},
      entityId: null
    }

    // workers
    const importWorker = new MangaImportWorker('MangaImportWorker')
    const downloadWorker = new ChapterDownloadWorker('ChapterDownloadWorker')
    const maintenanceWorker = new MaintenanceWorker('MaintenanceWorker')
    const libUpdateWorker = new LibraryUpdateWorker('LibraryUpdateWorker')
    const computeReadingWorker = new ComputeReadingWorker('ComputeReadingWorker')
    const computeSuggesterWorker = new ComputeSuggesterWorker('ComputeSuggesterWorker')
    const importCBXWorker = new CBxImportWorker('CBxImportWorker')
    const scrobblersWorker = new ScrobblersWorker('ScrobblerWorker')

    // queues
    await queueManager.setupQueueWithScheduler('mangaImportQueue', importWorker, 'mangaImportScheduler', '*/10 * * * * *')
    await queueManager.setupQueueWithScheduler('chapterDownloadQueue', downloadWorker, 'chapterDownloadScheduler', '*/60 * * * * *')
    await queueManager.setupQueueWithScheduler('cbxImportQueue', importCBXWorker, 'importCBXScheduler', '*/11 * * * * *')
    await queueManager.setupQueueWithSchedulerWithJob('maintenanceQueue', maintenanceWorker, 'maintenanceScheduler', '*/11 * * * *', maintenanceJob)
    await queueManager.setupQueueWithSchedulerWithJob('libraryUpdateQueue', libUpdateWorker, 'libraryUpdateScheduler', '0 * * * *', libUpdateJob, QueueMode.CALLED, true)
    await queueManager.setupQueueWithSchedulerWithJob('computeReadingQueue', computeReadingWorker, 'computeReadingScheduler', '*/9 * * * *', computeReadJob)
    await queueManager.setupQueueWithSchedulerWithJob('computeSuggesterQueue', computeSuggesterWorker, 'computeSuggesterScheduler', '0 1 * * *', computeSuggesterJob, QueueMode.IMMEDIATE, true)
    await queueManager.setupQueueWithSchedulerWithJob('scrobblersQueue', scrobblersWorker, 'scrobblersScheduler', '10 * * * *', scrobblerJob)

    // await queueManager.runImmediateJob('computeSuggesterQueue', computeSuggesterJob)
    // await queueManager.injectJobs('cbxImportQueue', [testImportCBZ])
    await queueManager.runImmediateJob('maintenanceQueue', maintenanceJob)
  } catch (e) {
    logger.error({ err: e }, 'createDefaultJobs error')
    throw e
  }
}

async function createStorage (options) {
  if (!options.path) {
    throw Error('No storage path provided')
  }
  try {
    const publicStorage = path.join(process.cwd(), 'public')
    configManager.set('publicStorage', publicStorage)

    await os.mkdir(options.path)
    await os.mkdir(path.join(options.path, 'mangas'))
    await os.mkdir(path.join(options.path, 'covers'))
    await os.mkdir(path.join(options.path, 'posters'))
    await os.mkdir(path.join(options.path, 'banners'))

    await os.mkdir(BACKUP_DIR)
    await os.mkdir(LOGS_DIR)
    await os.mkdir(CONFIG_DIR)
    await os.mkdir(TEMP_DIR)

    logger.info('✓ Storage Initialized')
  } catch (e) {
    logger.error({ err: e }, 'setupStorage error')
    throw e
  }
}

async function checkValidPath (options) {
  if (!options.path) {
    throw Error('No path provided')
  }
  let success = false
  try {
    // try to create the folder and delete it
    await os.mkdir(options.path)
    await os.rmdir(options.path)
    success = true
    return success
  } catch (e) {
    logger.error({ err: e }, 'checkValidPath error')
    throw e
  }
}

async function createDatabase (options) {
  if (!options.path) {
    throw Error('No database path provided')
  }
  try {
    await ormConnect(options.path)
    await ormSync()
    logger.info('✓ Database Initialized')
    return true
  } catch (error) {
    console.error('createDatabase error', error)
    throw error
  }
}

async function startDatabase (options) {
  if (!options.path) {
    logger.warn('No database path provided')
    logger.warn('if it\'s the first launch, consider it as normal')
    return false
  }
  try {
    await ormConnect(options.path)
    logger.info('✓ Database Initialized')
    return true
  } catch (e) {
    logger.error({ err: e }, 'loadDatabase error')
    throw e
  }
}

module.exports = { createStorage, createDatabase, startDatabase, createDefaultJobs, checkValidPath }
