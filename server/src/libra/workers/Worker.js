/**
 * Base class for a Worker in the job processing system.
 * This class is designed to be extended by specific worker implementations.
 */
class Worker {
  /**
   * Constructs a new Worker instance.
   * Initializes the worker with a name and a busy status flag.
   *
   * @param {string} name - The name of the worker, used for identification and logging.
   */
  constructor (name) {
    if (!name) {
      throw new Error('A worker must have a name.')
    }

    this.name = name
    this.isBusy = false
  }

  /**
   * Processes a given job.
   * This method should be overridden in subclasses to implement specific job processing logic.
   *
   * @param {Object} job - The job object to be processed.
   * @returns {Promise<void>} - A promise that resolves when the job is processed.
   * @throws {Error} Throws an error if not implemented in subclass.
   */
  async processJob (job) {
    throw new Error('processJob() must be implemented by subclasses')
  }

  /**
   * Marks the worker as busy or not busy.
   *
   * @param {boolean} status - The busy status to set for the worker.
   */
  setBusy (status) {
    this.isBusy = status
  }
}

module.exports = Worker
