const fs = require('fs')
const readline = require('readline')
const pino = require('pino')
const pretty = require('pino-pretty')
const path = require('path')
const osSvc = require('../services/osService')

const DEFAULT_MAX_ROTATIONS = 7
const DAY = 24 * 60 * 60 * 1000
const MAX_RETRY_COUNT = 12
const RETRY_DELAY = 5 * 1000
const MAX_LOG_LINES = 100_000

let retryCount = 0

/**
 * Fetches logs from a file.
 * @param {string} logFile Path to the log file.
 * @param {number} maxLogLines Maximum number of log lines to read.
 * @returns {Promise<Array>} An array of parsed log lines.
 */
async function fetchLog (logFile, maxLogLines) {
  const results = []
  let stream

  try {
    stream = fs.createReadStream(logFile)
    const rl = readline.createInterface({
      input: stream,
      crlfDelay: Infinity
    })

    for await (const line of rl) {
      if (results.length >= maxLogLines) {
        break
      }

      try {
        const parsedLine = JSON.parse(line)
        results.push(parsedLine)
      } catch {
        // Ignoring lines that cannot be parsed as JSON
      }
    }
  } catch (error) {
    console.error('Error accessing or reading log file:', error)
  } finally {
    if (stream) {
      stream.close()
    }
  }

  return results
}

/**
 * Checks if the time in the log line is after the specified date.
 * @param {string} line The log line in JSON format.
 * @param {Date} compareDate The date to compare against.
 * @returns {boolean} True if the time in the log line is after the specified date, false otherwise.
 */
function isLineAfterDate (line, compareDate) {
  if (!line || !(compareDate instanceof Date) || isNaN(compareDate.getTime())) {
    return false
  }

  try {
    const data = JSON.parse(line)
    const lineDate = new Date(data.time)
    return lineDate.getTime() > compareDate.getTime()
  } catch (e) {
    return false
  }
}

/**
 * Eliminates log entries older than a specified date from a set of log files.
 * @param {Array} files Array of file paths.
 * @param {Date} date The date threshold for removing old entries.
 */
async function eliminateOldEntries (files, date) {
  const dateThreshold = date.getTime()

  await Promise.all(files.map(async file => {
    try {
      const lines = await fetchLog(file.path, MAX_LOG_LINES)
      const recent = lines.filter(line => new Date(line.time).getTime() >= dateThreshold)
      const text = recent.map(line => JSON.stringify(line)).join('\n')

      await fs.promises.writeFile(file.path, `${text}\n`)
    } catch (error) {
      console.error(`Error processing file ${file.path}:`, error)
    }
  }))
}

function eliminateOutOfDateFiles (logPath, date) {
  const files = fs.readdirSync(logPath)
  const paths = files.map(file => path.join(logPath, file))

  return Promise.all(paths.map(target => {
    return Promise.all([osSvc.readFirstLine(target), osSvc.readLastLines(target, 2)]).then(results => {
      const start = results[0]
      const end = results[1].split('\n')

      const file = {
        path: target,
        start: isLineAfterDate(start, date),
        end: isLineAfterDate(end[end.length - 1], date) || isLineAfterDate(end[end.length - 2], date)
      }

      if (!file.start && !file.end) {
        fs.unlinkSync(file.path)
      }

      return file
    })
  }))
}

function isMoreRecentThan (timestamp, delta) {
  return timestamp > Date.now() - delta
}

function createLogRotation ({ logFile, maxSavedLogFiles = DEFAULT_MAX_ROTATIONS, interval = DAY }) {
  const boom = pino.destination({
    dest: logFile,
    sync: true,
    mkdir: true
  })
  const warn = (msg) => {
    const line = JSON.stringify({
      level: 40,
      time: new Date(),
      msg
    })
    boom.write(`${line}\n`)
  }

  function maybeRotate (startingIndex = maxSavedLogFiles - 1) {
    let pendingFileIndex = startingIndex
    try {
      const { birthtimeMs } = fs.statSync(logFile)

      if (isMoreRecentThan(birthtimeMs, interval)) {
        return
      }

      for (; pendingFileIndex >= 0; pendingFileIndex -= 1) {
        const currentPath = pendingFileIndex === 0 ? logFile : `${logFile}.${pendingFileIndex}`
        const nextPath = `${logFile}.${pendingFileIndex + 1}`

        if (fs.existsSync(nextPath)) {
          fs.unlinkSync(nextPath)
        }
        if (!fs.existsSync(currentPath)) {
          continue
        }
        fs.renameSync(currentPath, nextPath)
      }
    } catch (error) {
      if (
        retryCount < MAX_RETRY_COUNT &&
        (error.code === 'EACCES' || error.code === 'EPERM')
      ) {
        retryCount += 1
        warn(`createLogRotation: retrying rotation, retryCount = ${retryCount}`)
        setTimeout(() => maybeRotate(pendingFileIndex), RETRY_DELAY)
        return
      }

      boom.destroy()
      boom.emit('error', error)
      return
    }

    boom.reopen()

    if (retryCount !== 0) {
      warn(`createLogRotation: rotation succeeded after ${retryCount} retries`)
    }

    retryCount = 0
  }

  maybeRotate()
  setInterval(maybeRotate, interval)

  return boom
}

class Logger {
  constructor () {
    this.logger = null
    this.shouldRestart = false
    this.logPath = null
    this.logFile = null
    this.maxRotations = DEFAULT_MAX_ROTATIONS
    this.interval = DAY
  }

  trace (...args) {
    this.logger ? this.logger.trace(...args) : console.trace(...args)
  }

  debug (...args) {
    this.logger ? this.logger.debug(...args) : console.debug(...args)
  }

  log (...args) {
    this.logger ? this.logger.info(...args) : console.log(...args)
  }

  info (...args) {
    this.logger ? this.logger.info(...args) : console.info(...args)
  }

  warn (...args) {
    this.logger ? this.logger.warn(...args) : console.warn(...args)
  }

  error (...args) {
    this.logger ? this.logger.error(...args) : console.error(...args)
  }

  async deleteAllLogs () {
    const files = await fs.promises.readdir(this.logPath)

    for (const file of files) {
      const filePath = path.join(this.logPath, file)
      await fs.promises.unlink(filePath)
    }

    await fs.promises.rmdir(this.logPath)
  }

  async cleanupLogs (logPath) {
    const now = new Date()
    const earliestDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - DEFAULT_MAX_ROTATIONS))

    try {
      const remaining = await eliminateOutOfDateFiles(logPath, earliestDate)
      const files = remaining.filter(file => !file.start && file.end)

      if (files.length > 0) {
        await eliminateOldEntries(files, earliestDate)
      }
    } catch (error) {
      console.error('Error cleaning logs; deleting and starting over from scratch.', error)

      // delete and re-create the log directory
      await this.deleteAllLogs()
      fs.mkdirSync(logPath, { recursive: true })
    }
  }

  async fetch (maxLogLines = MAX_LOG_LINES) {
    return await fetchLog(this.logFile, maxLogLines)
  }

  async tail (lines = MAX_LOG_LINES) {
    const results = await osSvc.readLastLines(this.logFile, lines)
    return results.split('\n')
  }

  async initialize (dir) {
    this.logPath = dir
    await osSvc.mkdir(this.logPath)

    try {
      await this.cleanupLogs(this.logPath)
    } catch (error) {
      const errorString = 'Failed to clean logs; deleting all. ' + `Error: ${error}`
      console.error(errorString)
      await this.deleteAllLogs(this.logPath)
      fs.mkdirSync(this.logPath, { recursive: true })

      setTimeout(() => {
        console.error(errorString)
      }, 500)
    }

    this.logFile = path.join(this.logPath, 'main.log')
    const rotatingStream = createLogRotation({
      logFile: this.logFile,
      maxSavedLogFiles: this.maxRotations,
      interval: this.interval
    })

    const onClose = () => {
      this.logger = undefined

      if (this.shouldRestart) {
        this.initialize()
      }
    }

    rotatingStream.on('close', onClose)
    rotatingStream.on('error', onClose)

    const streams = []
    streams.push({ stream: rotatingStream })

    streams.push({
      level: process.env.LOG_LEVEL || 'debug',
      stream: pretty({ colorize: true, translateTime: 'SYS:standard', ignore: 'pid,hostname' })
    })

    this.logger = pino(
      {
        formatters: {
          level: (label) => {
            return { level: label.toUpperCase() }
          },
          bindings: () => ({})
        },
        redact: {
          paths: ['email', 'password', 'token', 'secret']
        },
        timestamp: pino.stdTimeFunctions.isoTime
      },
      pino.multistream(streams)
    )
  }
}

const logger = new Logger()
module.exports = { logger }
