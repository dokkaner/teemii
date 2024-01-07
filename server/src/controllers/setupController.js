const { configManager, SQLITE_DIR, MEDIAS_DIR } = require('../loaders/configManager')
const { checkValidPath, createDatabase, createStorage, startDatabase, createDefaultJobs } =
  require('../services/setupService')
const path = require('path')
const os = require('../services/osService')
const services = require('../services')
const { logger } = require('../loaders/logger')
const { scrobblersManager } = require('../services/scrobblerService')

/**
 * Handle requests to get the initial launch configuration of the system.
 *
 * @param {object} req - The request object.
 * @param {object} res - The response object to send the configuration data.
 */
async function getFirstLaunch (req, res) {
  try {
    // Assuming configManager properties are always defined and valid
    const response = {
      setupCompleted: configManager.setupCompleted,
      system: configManager.system
    }

    res.status(200).json(response)
  } catch (e) {
    const statusCode = e.isOperational ? 400 : 500
    logger.error({ err: e }, 'Failed to get first launch configuration')
    res.status(statusCode).json({ message: e.message })
  }
}

/**
 * Handle requests to set user preferences.
 *
 * @param {object} req - The request object containing user preferences.
 * @param {object} res - The response object to send back the preferences.
 */
async function setUserPreferences (req, res) {
  try {
    const preferences = req.body.preferences

    if (!preferences) {
      return res.status(400).json({ message: 'Invalid preferences format' })
    }

    configManager.set('preferences', preferences)

    res.status(200).json(preferences)
  } catch (e) {
    const statusCode = e.isOperational ? 400 : 500
    logger.error({ err: e }, 'Failed to set user preferences')
    res.status(statusCode).json({ message: e.message })
  }
}

/**
 * Handle requests to set up storage for the application.
 *
 * @param {object} req - The request object.
 * @param {object} res - The response object to send the confirmation.
 */
async function setupStorage (req, res) {
  try {
    const path = MEDIAS_DIR

    const isValidPath = await checkValidPath({ path })
    if (!isValidPath) {
      return res.status(400).json({ message: 'Invalid path' })
    }

    // Create directory if it doesn't exist
    await os.mkdir(path)
    await createStorage({ path })

    configManager.set('storagePath', path)
    res.status(200).json({ path })
  } catch (e) {
    const statusCode = e.isOperational ? 400 : 500
    logger.error({ err: e }, 'Failed to setup storage')
    res.status(statusCode).json({ message: e.message })
  }
}

/**
 * Handle requests to deploy a database at a specified path.
 *
 * @param {object} req - The request object.
 * @param {object} res - The response object to send the confirmation.
 */
async function deployDB (req, res) {
  try {
    const dbPath = SQLITE_DIR

    const isValidPath = await checkValidPath({ path: dbPath })
    if (!isValidPath) {
      return res.status(400).json({ message: 'Invalid path' })
    }

    // Create directory if it doesn't exist
    await os.mkdir(dbPath)

    const dbFile = 'teemii.db'
    const dbFullPath = path.join(dbPath, dbFile)

    await createDatabase({ path: dbFullPath })
    configManager.set('databasePath', dbFullPath)

    res.status(200).json({ path: dbFullPath })
  } catch (e) {
    const statusCode = e.isOperational ? 400 : 500
    logger.error({ err: e }, 'Failed to deploy database')
    res.status(statusCode).json({ message: e.message })
  }
}

/**
 * Finalize the setup process for the application.
 *
 * @param {object} req - The request object.
 * @param {object} res - The response object to send the finalization status.
 */
async function setupFinalize (req, res) {
  try {
    const databasePath = configManager.get('databasePath', false, true)

    // Verify if the database path is set
    if (!databasePath) {
      return res.status(500).json({ message: 'Database path is not set' })
    }

    await startDatabase({ path: databasePath })
    await services.preferences.initializeUserPreferences()
    await configManager.saveConfig()
    await configManager.loadSecretKey()
    configManager.setSetupCompleted(true)

    await createDefaultJobs()
    await scrobblersManager.registerScrobblers()

    res.status(200).json({ setupCompleted: true })
  } catch (e) {
    logger.error({ err: e }, 'Failed to finalize setup')
    res.status(500).json({ message: 'Failed to finalize setup' })
  }
}

async function restart (req, res) {
  try {
    // sleep 1 second to allow response to be sent
    setTimeout(() => {
      process.exit(1)
    }, 1000)
    res.status(200).json({ message: 'Restarted' })
  } catch (e) {
    logger.error({ err: e }, 'Failed to restart')
    res.status(500).json({ message: 'Failed to restart' })
  }
}

module.exports = { restart, getFirstLaunch, deployDB, setupStorage, setUserPreferences, setupFinalize }
