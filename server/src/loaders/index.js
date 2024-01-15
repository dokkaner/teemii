const { logger } = require('./logger.js')
const ExpressLoader = require('./express.js')
const { openAISvc } = require('./openai')
const { agents } = require('../core/agentsManager')
const { socketIOLoader } = require('./socketio')
const { configManager } = require('./configManager')
const { reporter } = require('./sentry')
const { realm } = require('./realm')

async function load () {
  try {
    await openAISvc.loadOpenAI()
    reporter.init()
    await realm.init()

    logger.info('✓ Config Initialized. Setup completed: ' + configManager.setupCompleted)

    const express = new ExpressLoader()
    logger.info({ express: express.App }, '✓ Express Initialized')

    socketIOLoader.initialize()

    await agents.initialize()
    const count = agents.internalAgents.length
    logger.info(`Loaded ${count} agents`)
  } catch (e) {
    logger.error({ err: e }, 'Principal loader face an issue.')
    throw e
  }
}

module.exports = { load }
