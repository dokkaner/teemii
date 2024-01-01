const Scheduler = require('../schedulers/Scheduler')

class SchedulerManager {
  constructor () {
    this.schedulers = {}
  }

  /**
   * Creates and registers a new scheduler.
   *
   * @param {string} name - The name of the scheduler.
   * @param {string} cronPattern - The cron pattern for the scheduler.
   * @returns {Scheduler} - The newly created scheduler instance.
   */
  createScheduler (name, cronPattern) {
    if (this.schedulers[name]) {
      throw new Error(`A scheduler with name '${name}' already exists.`)
    }

    const newScheduler = new Scheduler(name, cronPattern)
    this.schedulers[name] = newScheduler
    return newScheduler
  }

  /**
   * Retrieves a scheduler by name.
   *
   * @param {string} name - The name of the scheduler to retrieve.
   * @returns {Scheduler} - The requested scheduler.
   */
  getScheduler (name) {
    const scheduler = this.schedulers[name]
    if (!scheduler) {
      throw new Error(`Scheduler '${name}' not found.`)
    }

    return scheduler
  }

  /**
   * Removes a scheduler by name, stopping it if it's running.
   *
   * @param {string} name - The name of the scheduler to remove.
   */
  removeScheduler (name) {
    const scheduler = this.schedulers[name]
    if (!scheduler) {
      throw new Error(`Scheduler '${name}' not found.`)
    }

    if (scheduler.cronJob) {
      scheduler.cronJob.stop()
    }
    delete this.schedulers[name]
  }

  /**
   * Starts a scheduler by name.
   *
   * @param {string} name - The name of the scheduler to start.
   */
  startScheduler (name) {
    const scheduler = this.getScheduler(name)
    scheduler.start()
  }

  /**
   * Stops a scheduler by name.
   *
   * @param {string} name - The name of the scheduler to stop.
   */
  stopScheduler (name) {
    const scheduler = this.getScheduler(name)
    scheduler.stop()
  }

  /**
   * Returns a list of all scheduler objects.
   *
   * @returns {Map<scheduler>} - A map of scheduler objects.
   */
  listSchedulers () {
    return this.schedulers
  }
}

// Singleton instance
const schedulerManager = new SchedulerManager()

module.exports = schedulerManager
