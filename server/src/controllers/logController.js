const { logger } = require('../loaders/logger')

module.exports = class LogsController {
  async downloadLogs (req, res) {
    try {
      const logs = await logger.tail()
      res.setHeader('Content-disposition', 'attachment; filename=logs.txt')
      res.setHeader('Content-type', 'text/plain')
      res.charset = 'UTF-8'
      res.write(logs.join('\n'))
      res.end()
    } catch (e) {
      logger.error({ err: e }, 'Error processing log request')
      res.status(500).send('Error processing log request')
    }
  }

  /**
   * Handle requests to get the latest logs.
   *
   * @param {object} req - The request object from the client.
   * @param {object} res - The response object to send back the logs.
   */
  async getLogs (req, res) {
    try {
      // Return x lines from the end of the file
      const logs = await logger.tail(200)

      const parsed = logs.map(line => {
        try {
          return line ? JSON.parse(line) : {}
        } catch (error) {
          return null
        }
      }).filter(log => log !== null)

      // sort by date
      parsed.sort((a, b) => {
        if (a.time < b.time) {
          return 1
        } else if (a.time > b.time) {
          return -1
        } else {
          return 0
        }
      })
      res.json(parsed)
    } catch (e) {
      logger.error({ err: e }, 'Error processing log request')
      res.status(500).send('Error processing log request')
    }
  }
}
