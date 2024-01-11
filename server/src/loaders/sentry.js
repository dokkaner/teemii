const Sentry = require('@sentry/node')

class Reporter {
  constructor () {
    this.Sentry = null
  }

  init () {
    try {
      const release = require('../../package.json').version

      Sentry.init(
        {
          dsn: 'https://22d4b4b194f7efec0e9334f1dc9a8c98@o654102.ingest.sentry.io/450654932290764',
          instrumenter: 'otel',
          normalizeDepth: 6,
          maxValueLength: 500,
          release,
          environment: process.env.NODE_ENV || 'production'
        }
      )
      this.Sentry = Sentry
    } catch (e) {
      console.log('Issue initializing sentry!')
      console.error(e)
    }
  }

  captureException (e) {
    this.Sentry.captureException(e)
  }
}

const reporter = new Reporter()
module.exports = { reporter }
