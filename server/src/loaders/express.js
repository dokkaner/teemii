const express = require('express')
const compression = require('compression')
const RateLimit = require('express-rate-limit')
const routes = require('../routes')
const { logger } = require('./logger.js')
const cors = require('cors')
const { configManager } = require('./configManager')
const fileUpload = require('express-fileupload')
const jwt = require('jsonwebtoken')

/**
 * Middleware to authenticate JWT.
 * This middleware verifies the JWT token in the request header and determines if the user is authorized.
 * @param {Request} req - The request object.
 * @param {Response} res - The response object.
 * @param {Function} next - The next middleware function in the request-response cycle.
 */
const authenticateJWT = (req, res, next) => {
  const { path } = req
  // Check if the request path matches any of the image access URLs
  const isAccessUrl = /^\/api\/v1\/(mangas\/.+\/cover|pages\/.+|chapters\/.+\/cover)/.test(path)

  if (isAccessUrl) {
    return next()
  }

  // check if auth is needed
  const authNeeded = configManager.get('preferences.security.enable')
  if (!authNeeded) {
    next()
    return
  }

  const authHeader = req.headers.authorization

  // Check if the authorization header exists
  if (!authHeader) {
    logger.warn('Authorization header is missing.')
    return res.status(401).json({ message: 'Authorization header is missing.' })
  }

  // Extract the token from the authorization header
  const token = authHeader.split(' ')[1]

  // Verify the token
  const JWT_SECRET = configManager.getSecretKey().toString()
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      logger.warn('Invalid or expired token.')
      return res.status(403).json({ message: 'Invalid or expired token.' })
    }

    // Token is valid, add user info to request object and proceed to next middleware
    req.user = user
    next()
  })
}

/**
 * Middleware to block all routes except /api/v1/setup during first launch
 * @param req
 * @param res
 * @param next
 */
function blockOtherRoutesDuringFirstLaunch (req, res, next) {
  const setupCompleted = configManager.setupCompleted || false
  if (!setupCompleted) {
    res.status(403).json({ message: 'Access denied during first launch' })
  } else {
    authenticateJWT(req, res, next)
  }
}

class ExpressLoader {
  constructor () {
    const app = express()

    app.enable('trust proxy')
    const limiter = RateLimit({
      windowMs: 1000, // 1 second
      max: 100, // max 100 requests per windowMs
      validate: { trustProxy: false }
    })
    app.use(limiter)

    // Set up middleware
    app.use(cors())
    app.use(fileUpload({}))
    app.use(express.json())

    app.use(compression({
      level: 6,
      filter: (req, res) => {
        if (req.headers['x-no-compression']) {
          return false
        }
        return compression.filter(req, res)
      }
    }))

    app.use((req, res, next) => {
      res.removeHeader('X-Powered-By')
      if (req.path.startsWith('/api/v1/setup') || req.path.startsWith('/api/v2/auth')) {
        next()
      } else {
        blockOtherRoutesDuringFirstLaunch(req, res, next)
      }

      // Setup error handling, this must be after all other middleware
      app.use(this.errorHandler)
    })

    routes(app)

    // Start application
    const PORT = process.env.EXPRESS_PORT || 3000
    this.server = app.listen(PORT, '0.0.0.0', () => {
      logger.info(`Express running, now listening on port ${PORT}`)
    })

    const exitHandler = this.terminate({
      coredump: false,
      timeout: 500
    })

    process.on('uncaughtException', exitHandler(1, 'Unexpected Error'))
    process.on('unhandledRejection', exitHandler(1, 'Unhandled Promise'))
    process.on('SIGTERM', exitHandler(0, 'SIGTERM'))
    process.on('SIGINT', exitHandler(0, 'SIGINT'))

    const connections = new Set()
    this.server.on('connection', connection => {
      connections.add(connection)
      connection.on('close', () => connections.delete(connection))
    })
  }

  terminate (options = { coredump: false, timeout: 500 }) {
    const exit = code => {
      logger.trace('Closed out remaining connections')
      options.coredump ? process.abort() : process.exit(code)
    }

    return () => (err) => {
      if (err && err instanceof Error) {
        logger.trace(err.message, err.stack)
      }

      this.server.close(exit)

      // noinspection JSUnresolvedReference
      setTimeout(exit, options.timeout).unref()
    }
  }

  App () {
    return this.app
  }

  /**
   * @description Default error handler to be used with express
   * @param error Error object
   * @param req {object} Express req object
   * @param res {object} Express res object
   * @param next {function} Express next object
   * @returns {*}
   */
  errorHandler (error, req, res, next) {
    let parsedError

    // Attempt to gracefully parse error object
    try {
      if (error && typeof error === 'object') {
        parsedError = JSON.stringify(error)
      } else {
        parsedError = error
      }
    } catch (e) {
      logger.error({ err: e })
    }

    // Log the original error
    logger.error(parsedError)

    // If response is already sent, don't attempt to respond to client
    if (res.headersSent) {
      return next(error)
    }

    res.status(400).json({
      success: false,
      error
    })
  }
}

module.exports = ExpressLoader
