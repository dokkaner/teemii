const CronJob = require('cron').CronJob
const EventEmitter = require('events')
const { logger } = require('../../loaders/logger')

/**
 * Scheduler class to handle scheduled jobs using cron patterns.
 * This class extends EventEmitter to emit events on specific scheduler actions.
 */
class Scheduler extends EventEmitter {
  /**
   * Constructs a new Scheduler instance.
   * Validates the provided cron pattern and initializes the scheduler.
   *
   * @param {string} name - The name of the scheduler.
   * @param {string} cronPattern - The cron pattern defining the schedule.
   * @throws {Error} Throws an error if the cron pattern is invalid.
   */
  constructor (name, cronPattern) {
    super()
    this.name = name
    this.cronPattern = cronPattern
    this.cronJob = null
    this.lastRun = null
    this.queue = null
  }

  attachQueue (queue) {
    this.queue = queue
  }

  /**
   * Starts the scheduler using the provided cron pattern.
   * Emits 'started' event on successful start and logs the action.
   * Emits 'error' event if there's an issue starting the scheduler.
   */
  start () {
    try {
      this.cronJob = new CronJob(
        this.cronPattern,
        () => {
          this.lastRun = new Date()
          this.emit('trigger')
        },
        null,
        true
      )

      logger.info(`Scheduler ${this.name} started with pattern ${this.cronPattern}`)
      logger.info(`Next run: ${this.cronJob.nextDate()}`)
      this.emit('started', this.name)
    } catch (e) {
      logger.error({ err: e }, `Failed to start Scheduler ${this.name}`)
      this.emit('error', e)
    }
  }

  /**
   * Stops the scheduler if it's currently running.
   * Emits 'stopped' event and logs the action.
   */
  stop () {
    if (this.cronJob) {
      this.cronJob.stop()
      logger.info(`Scheduler ${this.name} stopped.`)
      this.emit('stopped', this.name)
    }
  }

  /**
   * Destroys the scheduler, cleaning up resources.
   * Emits 'destroyed' event and logs the action.
   */
  destroy () {
    if (this.cronJob) {
      this.cronJob.destroy()
      logger.info(`Scheduler ${this.name} destroyed.`)
      this.emit('destroyed', this.name)
    }
  }

  /**
   * Returns the last run date of the scheduler.
   * @returns {Date} The last run date of the scheduler.
   */
  getLastRun () {
    return this.lastRun
  }

  /**
   * Returns the next run date of the scheduler.
   * @returns {string | IfInvalid<"Invalid DateTime">} The next run date of the scheduler.
   */
  getNextRun () {
    const nextRun = this.cronJob.nextDate()
    return new Date(nextRun)
  }
}

module.exports = Scheduler
