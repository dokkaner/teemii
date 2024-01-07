const Worker = require('./Worker')
const { scrobblersManager } = require('../../services/scrobblerService')

/**
 * Scrobblers Job.
 */
class ScrobblersWorker extends Worker {
  processJob (job) {
    return this.#execute()
  }

  async #execute () {
    await scrobblersManager.sync()
    return { success: true, code: 200, body: 'OK' }
  }
}

module.exports = ScrobblersWorker
