const { logger } = require('../../loaders/logger')

class TimeoutError extends Error {
  constructor (message) {
    super(message)
    this.name = 'TimeoutError'
  }
}

class NoAvailableWorkerError extends Error {
  constructor (message) {
    super(message)
    this.name = 'NoAvailableWorkerError'
  }
}

const QueueMode = {
  CALLED: 'called', // the queue will process jobs when processQueue is called
  IMMEDIATE: 'immediate' // the queue will process jobs as soon as they are added
}

/**
 * Represents a queue that manages jobs and distributes them to workers.
 */
class Queue {
  /**
   * Constructs a new Queue instance.
   * Initializes the queue with a name, an empty job list, and an array of workers.
   *
   * @param {string} name - The name of the queue.
   * @param {QueueMode} mode - The mode of the queue (delayed or immediate).
   */
  constructor (name, mode = QueueMode.CALLED) {
    if (!name) {
      throw new Error('A queue must have a name.')
    }

    this.name = name
    this.lanes = {
      backlog: [],
      pending: [],
      processing: [],
      delayed: [],
      completed: [],
      errors: []
    }
    this.workers = []
    this.isProcessing = false
    this.mode = mode
    this.countJobs = 0
    this.countErrors = 0
    this.lastProcessedMessage = null
  }

  async start () {
    await this.#startCyclicUpdate(5)
  }

  /**
   * Update the lanes by moving jobs to the appropriate lane based on their status.
   * This method should be called periodically to ensure the lanes are up-to-date.
   */
  async updateLanes () {
    // Log current status of each lane & workers
    let logMessage = `Queue ${this.name} Status: Lanes [`
    Object.keys(this.lanes).forEach(laneKey => {
      logMessage += `${laneKey.charAt(0).toUpperCase() + laneKey.slice(1)}: ${this.lanes[laneKey].length}, `
    })
    logMessage += '] Workers ['
    this.workers.forEach(worker => {
      logMessage += `${worker.name}: ${worker.isBusy ? 'busy' : 'available'}, `
    })
    logger.trace(logMessage + ']')

    // Process each lane separately
    Object.keys(this.lanes).forEach(laneKey => {
      this.lanes[laneKey].forEach(job => {
        // Check if the job's status matches the current lane
        if (job.status !== laneKey) {
          // Move the job to the appropriate lane based on its status
          job.setOrigin(laneKey)
          this.lanes[job.status] = this.lanes[job.status] || []
          this.lanes[job.status].push(job)

          // Remove the job from the current lane
          this.lanes[laneKey] = this.lanes[laneKey].filter(j => j !== job)
          logger.trace(`Job lane move. '${job.id}' out: '${laneKey}' in: '${job.status}'.`)
        }
      })
    })
  }

  /**
   * Start a cyclic process that updates the lanes every x seconds.
   *
   * @param {number} interval - The interval in seconds for the cyclic process.
   */
  async #startCyclicUpdate (interval) {
    const intervalMs = interval * 1000 // Convert seconds to milliseconds

    const process = () => {
      try {
        // pick up jobs from backlog, only 1 job at a time
        if (this.lanes.pending.length === 0 && this.lanes.backlog.length > 0) {
          const job = this.lanes.backlog[0]
          if (job) {
            job.pickUp(this.name)
          }
        }

        this.updateLanes()
      } catch (e) {
        logger.error({ err: e }, 'Error during lane update')
      }

      // Schedule the next execution
      setTimeout(process, intervalMs)
    }

    process() // Start the cyclic process
  }

  /**
   * Adds a job to the queue and starts processing if not already doing so.
   * The method now properly handles the promise returned by processQueue.
   *
   * @param {Job} job - The job to be added to the queue.
   */
  async addJob (job) {
    this.lanes.backlog.push(job)
    // await job.pickUp(this.name)
    if ((this.mode.toString() === QueueMode.IMMEDIATE) && !this.isProcessing) {
      await this.processQueue()
    }
  }

  /**
   * Gets the next job in the queue.
   *
   */
  getNextJobInQueue () {
    // get the job with the earliest createdAt date and with status 'pending'
    const nextJob = this.lanes.pending.reduce((prev, current) => {
      return (prev.createdAt < current.createdAt && current.status === 'pending') ? prev : current
    })

    // remove the job from the queue
    this.lanes.pending = this.lanes.pending.filter(job => job.id !== nextJob.id)

    // add the job to the processing queue
    this.lanes.processing.push(nextJob)
    return nextJob
  }

  /**
   * Adds a worker to the queue.
   *
   * @param {Worker} worker - The worker to be added to the queue.
   */
  addWorker (worker) {
    this.workers.push(worker)
  }

  async #processJobAsync (job) {
    if (!job) {
      return
    }

    this.assignJobToWorker(job).catch(e => {
      // possible no available worker
      if (e instanceof NoAvailableWorkerError) {
        logger.warn(`No available worker found for job '${job.id}'.`)
        return
      }
      logger.error({ err: e }, `Error processing job in queue '${this.name}'`)
    })
  }

  /**
   * Processes jobs in the queue.
   * Iterates over each job and assigns it to an available worker.
   */
  async processQueue () {
    this.isProcessing = true
    try {
      while (this.lanes.pending.length > 0) {
        const job = this.getNextJobInQueue()
        await this.#processJobAsync(job)
      }
      logger.trace(`${this.name} - [${this.countJobs}/${this.countErrors}] (jobs/errors).`)
    } finally {
      this.isProcessing = false
    }
  }

  async runImmediate (job) {
    this.isProcessing = true
    try {
      await this.#processJobAsync(job)
    } finally {
      this.isProcessing = false
    }
  }

  /**
   * Finds an available worker and assigns the job to it.
   *
   * @param {Job} job - The job to be processed.
   * @throws {Error} Throws an error if no available worker is found.
   */
  async assignJobToWorker (job) {
    const availableWorker = this.workers.find(worker => !worker.isBusy)

    if (!availableWorker) {
      throw new NoAvailableWorkerError(`No available worker found for job '${job.id}'.`)
    }

    availableWorker.setBusy(true)
    try {
      const timeoutPromise = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          clearTimeout(timeout)
          reject(new TimeoutError('Job execution timed out.'))
        }, job.timeout)
      })
      await job.startProcessing()
      const jobProcessingPromise = availableWorker.processJob(job).then((res) => {
        this.lastProcessedMessage = res
        this.countJobs++
        job.complete(res)
      })

      await Promise.race([jobProcessingPromise, timeoutPromise])
    } catch (error) {
      this.countErrors++
      if (error instanceof TimeoutError) {
        await job.delay()
        logger.error(`Job processing timed out for worker '${availableWorker.name}'.`)
        throw error
      } else {
        await job.fail(error)
        logger.error(`Error processing job by worker '${availableWorker.name}': ${error}`)
      }
    } finally {
      availableWorker.setBusy(false)
    }
  }
}

module.exports = { Queue, QueueMode }
