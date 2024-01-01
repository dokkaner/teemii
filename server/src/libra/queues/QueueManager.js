const { Queue, QueueMode } = require('./Queue')
const schedulerManager = require('../schedulers/SchedulerManager')
const { validateJobData, Job } = require('../jobs/Job')
const uuidv4 = require('uuid').v4

class QueueManager {
  constructor () {
    this.queues = {}
  }

  async runImmediateJob (queueName, JobData) {
    const options = JobData.options
    validateJobData(JobData)

    const job = new Job(uuidv4(), JobData, options?.maxRetries || 3, options?.retryInterval || 5000,
      options?.timeout || 60 * 1000)
    job.setPersist(true)
    await job.initialize()
    await this.getQueue(queueName).addJob(job)
    await this.getQueue(queueName).runImmediate(job)
  }

  async injectJobs (queueName, Jobs) {
    const queue = this.getQueue(queueName)
    for (const job of Jobs) {
      const options = job.options
      const j = new Job(uuidv4(), job, options?.maxRetries || 3, options?.retryInterval || 5000,
        options?.timeout || 60 * 1000)
      j.setPersist(true)
      await queue.addJob(j)
    }
  }

  /**
   * Configures a queue with a scheduler.
   *
   * @param {string} queueName - Name of the queue.
   * @param {Worker} worker - Instance of the worker to use.
   * @param {string} schedulerName - Name of the scheduler.
   * @param {string} cronPattern - Cron pattern to use for the scheduler.
   * @param {QueueMode} mode - The mode of the queue (delayed or immediate).
   */
  async setupQueueWithScheduler (queueName, worker, schedulerName, cronPattern,
    mode = QueueMode.IMMEDIATE) {
    this.createQueue(queueName, mode)
    const scheduler = schedulerManager.createScheduler(schedulerName, cronPattern)

    scheduler.on('trigger', () => {
      this.getQueue(queueName).processQueue()
    })

    this.getQueue(queueName).addWorker(worker)
    await this.getQueue(queueName).start()
    scheduler.start()
  }

  /**
   * Configures a queue with a scheduler.
   *
   * @param {string} queueName - Name of the queue.
   * @param {Worker} worker - Instance of the worker to use.
   * @param {string} schedulerName - Name of the scheduler.
   * @param {string} cronPattern - Cron pattern to use for the scheduler.
   * @param {Object} JobData - The data associated with this job.
   * @param {QueueMode} mode - The mode of the queue (delayed or immediate).
   * @param {boolean} persist - Whether to persist the job or not.
   */
  async setupQueueWithSchedulerWithJob (queueName, worker, schedulerName, cronPattern,
    JobData, mode = QueueMode.CALLED, persist = false) {
    const options = JobData.options
    validateJobData(JobData)

    this.createQueue(queueName, mode)
    const scheduler = schedulerManager.createScheduler(schedulerName, cronPattern)
    scheduler.attachQueue(this.getQueue(queueName))
    scheduler.on('trigger', () => {
      const job = new Job(uuidv4(), JobData, options?.maxRetries || 3, options?.retryInterval || 5000,
        options?.timeout || 60 * 1000)
      job.setPersist(persist)
      job.initialize().then(() => {
        this.getQueue(queueName).addJob(job)
        this.getQueue(queueName).processQueue()
      })
    })

    this.getQueue(queueName).addWorker(worker)
    await this.getQueue(queueName).start()
    scheduler.start()
  }

  /**
   * Creates and registers a new queue with the given name.
   *
   * @param {string} name - The name of the new queue.
   * @param {QueueMode} mode - The mode of the new queue (delayed or immediate).
   * @returns {Queue} The newly created queue.
   */
  createQueue (name, mode = QueueMode.CALLED) {
    if (this.queues[name]) {
      throw new Error(`A queue with name '${name}' already exists.`)
    }

    const newQueue = new Queue(name, mode)
    this.queues[name] = newQueue
    return newQueue
  }

  /**
   * Retrieves a queue by name.
   *
   * @param {string} name - The name of the queue to retrieve.
   * @returns {Queue} The requested queue.
   */
  getQueue (name) {
    const queue = this.queues[name]
    if (!queue) {
      throw new Error(`Queue '${name}' not found.`)
    }

    return queue
  }

  /**
   * Removes a queue by name.
   *
   * @param {string} name - The name of the queue to remove.
   */
  removeQueue (name) {
    if (!this.queues[name]) {
      throw new Error(`Queue '${name}' not found.`)
    }

    // Additional cleanup if necessary
    delete this.queues[name]
  }

  /**
   * Returns a list of all queues.
   *
   * @returns {Array} An array of queue names.
   */
  listQueues () {
    return Object.keys(this.queues)
  }
}

// Singleton instance
const queueManager = new QueueManager()

module.exports = queueManager
