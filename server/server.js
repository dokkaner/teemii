require('dotenv').config()
const loaders = require('./src/loaders/index.js')
const { agents } = require('./src/core/agentsManager')
const fs = require('fs')
const path = require('path')
const { configManager } = require('./src/loaders/configManager.js')
const { startDatabase, createDefaultJobs } = require('./src/services/setupService')
const { buildIndexFromCSV } = require('./src/services/indexerService')
const { logger } = require('./src/loaders/logger')
const { backup } = require('./src/services/backupService')
const { LOGS_DIR } = require('./src/loaders/configManager')
const { scrobblersManager } = require('./src/services/scrobblerService')

async function startServer () {
  try {
    await configManager.loadConfig()
    await logger.initialize(LOGS_DIR)

    const packageJsonPath = path.join(__dirname, 'package.json')
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, { encoding: 'utf8' }))
    const version = packageJson.version
    const name = packageJson.name
    const author = packageJson.author

    await backup()

    await loaders.load()
    const dbReady = await startDatabase({ path: configManager.get('databasePath') })
    if (!dbReady) {
      console.error('Database is not ready')
    } else {
      await createDefaultJobs()
    }

    buildIndexFromCSV('./index/manga.csv')
    await agents.setCacheMode(true)
    await agents.agentsLogin()
    await scrobblersManager.registerScrobblers()

    logger.log('-----------------------------------')
    logger.log(`${name} v${version} (c) ${author}`)
    logger.log(`Environment: ${process.env.NODE_ENV}`)
    logger.log('server started successfully')
    logger.log('-----------------------------------')
  } catch (e) {
    // reporter.captureException(e)
    logger.error({ err: e }, 'Failed to start the server:')
  }
}

process.on('unhandledRejection', (reason, promise) => {
  // reporter.captureException(reason)
  console.error('Unhandled Rejection at:', promise, 'reason:', reason)
})

startServer().catch(error => {
  // reporter.captureException(error)
  console.error('Unhandled error occurred during server start:', error)
})
