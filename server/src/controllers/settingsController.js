const schedulerManager = require('../libra/schedulers/SchedulerManager')
const { logger } = require('../loaders/logger')

module.exports = class SettingsController {
  /**
   * Handle requests to get the list of schedulers.
   *
   * @param {object} req - The request object.
   * @param {object} res - The response object to send the schedulers data.
   */
  async getSchedulers (req, res) {
    try {
      const schedulers = schedulerManager.listSchedulers()

      const schedulersSerializable = Object.entries(schedulers).reduce((acc, [key, scheduler]) => {
        acc[key] = {
          name: scheduler?.name,
          cronPattern: scheduler?.cronPattern,
          lastRun: scheduler?.lastRun,
          nextRun: scheduler?.getNextRun ? scheduler.getNextRun() : undefined,
          lastLog: scheduler?.queue?.lastProcessedMessage
        }
        return acc
      }, {})

      res.status(200).json(schedulersSerializable)
    } catch (e) {
      logger.error({ err: e }, 'Failed to get schedulers')
      // Send a generic error message
      res.status(500).send('Unable to retrieve scheduler information')
    }
  }
}
