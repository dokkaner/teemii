const { orm } = require('../../loaders/sequelize.js')
const { logger } = require('../../loaders/logger')
/**
 * Enum for job status values.
 */
const JobStatus = {
  BACKLOG: 'backlog',
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  DELAYED: 'delayed',
  FAILED: 'failed'
}

/**
 *  Persist a job in the database.
 */
async function persistJob (job) {
  if (!job.persist) {
    return
  }
  try {
    await orm.job.create(job)
  } catch (e) {
    logger.error({ err: e }, `Error persisting job '${job.id}' to database`)
    throw e
  }
}

/**
 *  Update a job in the database.
 */
async function updateJob (job) {
  if (!job.persist) {
    return
  }
  try {
    await orm.job.update(job, { where: { id: job.id } })
  } catch (e) {
    logger.error({ err: e }, `Error updating job '${job.id}' in database`)
    throw e
  }
}

/** job data schema
 * for (Required)
 *
 * Type: String
 * Description: Identifies the queue for which the job is intended.
 * Example: "downloadQueue"
 *
 *
 * options (Optional)
 *
 * Type: Object
 * Description: Contains configurable options for processing the job.
 * Example: { priority: 'high', delay: 1000 }
 *
 *
 * payload (Required)
 *
 * Type: Object
 * Description: Data specific to the job.
 * Example: { url: 'http://example.com/file', destination: '/local/path' }
 *
 *
 * entityId (Optional)
 *
 * Type: UUID
 * Description: Unique identifier of the entity associated with the job.
 * Example: "123e4567-e89b-12d3-a456-426655440000"
 */

function validateJobData (data) {
  if (!data) {
    throw new Error('Job data is required.')
  }

  if (!data.for || typeof data.for !== 'string') {
    throw new Error('Job data must include a valid "for" property.')
  }

  if (!data.payload) {
    throw new Error('Job data must include a "payload" property.')
  }

  if (data.options && typeof data.options !== 'object') {
    throw new Error('Job "options" must be an object.')
  }
}

/**
 * Represents a job to be processed in a job queue.
 */
class Job {
  /**
   * Constructs a new job instance.
   *
   * @param {string} id - The unique identifier of the job.
   * @param {Object} data - The data associated with this job.
   * @param {number} maxRetries - The maximum number of retries allowed for the job.
   * @param {number} retryInterval - The interval (in milliseconds) between retry attempts.
   * @param {number} timeout - The maximum allowed time (in milliseconds) for the job to complete.
   */
  constructor (id, data, maxRetries = 3, retryInterval = 5000, timeout = 60 * 1000) {
    this.id = id
    this.status = JobStatus.BACKLOG
    this.result = null
    this.error = null
    this.progress = null
    this.maxRetries = maxRetries
    this.retryInterval = retryInterval
    this.retryCount = 0
    this.timeout = timeout
    this.createdAt = new Date()
    this.updatedAt = new Date()
    this.queue = ''
    this.origin = ''
    this.persist = true

    validateJobData(data)
    this.data = data
  }

  /**
   * Initializes the job and persists it in the database.
   * @returns {Promise<void>}
   */
  async initialize () {
    await persistJob(this)
  }

  setPersist (persist) {
    this.persist = persist
  }

  /**
   *  Sets the origin lane of the job.
   */
  async setOrigin (origin) {
    this.origin = origin
    await updateJob(this)
  }

  /**
   * Sets the job status to 'pending'.
   */
  async pickUp (QueueName) {
    this.status = JobStatus.PENDING
    this.updatedAt = new Date()
    this.queue = QueueName
    await updateJob(this)
  }

  /**
   * Sets the job status to 'processing'.
   */
  async startProcessing () {
    this.status = JobStatus.PROCESSING
    this.updatedAt = new Date()
    await updateJob(this)
  }

  /**
   * Updates the job progress.
   */
  async reportProgress (progress) {
    this.progress = progress
    this.updatedAt = new Date()
    await updateJob(this)
  }

  /**
   * Marks the job as completed and records its result.
   *
   * @param {Object} result - The result of the job execution.
   */
  async complete (result) {
    this.status = JobStatus.COMPLETED
    this.result = result
    this.updatedAt = new Date()
    this.finishedAt = new Date()
    await updateJob(this)
  }

  /**
   * Marks the job as failed and records the error.
   * If the maximum number of retries has not been reached, schedules a retry.
   *
   * @param {Error} error - The error that occurred during job execution.
   */
  async fail (error) {
    this.status = JobStatus.FAILED
    // ensure error is JSON serializable
    if (error instanceof Error) {
      this.error = { message: error.message }
    } else {
      this.error = error
    }
    this.updatedAt = new Date()
    await updateJob(this)

    if (this.retryCount < this.maxRetries) {
      setTimeout(() => {
        this.retryCount++
        this.status = JobStatus.BACKLOG
      }, this.retryInterval)
    }
  }

  /**
   * Marks the job as delayed.
   * @returns {Promise<void>}
   */
  async delay () {
    this.status = JobStatus.DELAYED
    this.error = { message: 'Job execution timed out.' }
    this.updatedAt = new Date()
    await updateJob(this)
  }
}

module.exports = { Job, JobStatus, validateJobData }
