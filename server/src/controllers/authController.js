const jwt = require('jsonwebtoken')
const { configManager } = require('../loaders/configManager')
const { validatePassword, jwtSign } = require('../services/authService')
const { logger } = require('../loaders/logger')

/** Class representing an authentication controller. */

module.exports = class AuthController {
  /**
   * Handles user login.
   * @param {Request} req - The request object containing login credentials.
   * @param {Response} res - The response object.
   * @returns A JWT token upon successful authentication.
   */
  async login (req, res) {
    try {
      const { login, password } = req.body

      // Validate request parameters
      if (!login || !password) {
        return res.status(400).json({ message: 'Login and password are required.' })
      }

      const userFromConfig = (login === configManager.get('preferences.security.login'))
        ? { login }
        : null

      if (!userFromConfig) {
        // User not found
        logger.warn(`User '${login}' not found.`)
        return res.status(401).json({ message: 'Invalid login credentials.' })
      }

      if (!validatePassword(password)) {
        // Invalid password
        logger.warn(`Invalid password for user '${login}'.`)
        return res.status(401).json({ message: 'Invalid login credentials.' })
      }

      // Generate a JWT token
      // build a JWT payload
      const payload = { login: userFromConfig.login, timestamp: Date.now() }
      const token = jwtSign(payload)

      // Send the token to the client
      res.json({ token })
    } catch (e) {
      logger.error({ err: e }, 'An error occurred during login.')
      res.status(500).json({ message: e.message })
    }
  }

  /**
   * Handles JWT token refresh.
   * @param {Request} req - The request object containing the refresh token.
   * @param {Response} res - The response object.
   * @returns A new JWT token upon successful verification of the refresh token.
   */
  async refresh (req, res) {
    try {
      const { refreshToken } = req.body

      // Validate request parameter
      const jwtRegex = /^[A-Za-z0-9-_=]+\.([A-Za-z0-9-_=]+)\.?[A-Za-z0-9-_.+/=]*$/
      if (!refreshToken || typeof refreshToken !== 'string' || !jwtRegex.exec(refreshToken)) {
        logger.warn('Invalid or missing refresh token.')
        return res.status(400).json({ message: 'Invalid or missing refresh token.' })
      }

      // Verify the refresh token
      const JWT_SECRET = configManager.getSecretKey().toString()

      const payload = jwt.verify(refreshToken, JWT_SECRET)

      // Ensure the user still exists and is valid
      const userFromConfig = (payload.login === configManager.get('preferences.security.login'))
        ? { login: payload.login }
        : null

      if (!userFromConfig) {
        // User not found
        logger.warn(`User '${payload.login}' not found.`)
        return res.status(401).json({ message: 'Invalid refresh token.' })
      }

      // Generate a new JWT token
      const newPayload = { login: userFromConfig.login, timestamp: Date.now() }
      const newToken = jwtSign(newPayload)

      // Send the new token to the client
      res.json({ token: newToken })
    } catch (e) {
      logger.error({ err: e }, 'An error occurred during token refresh.')
      res.status(500).json({ message: 'An error occurred during token refresh.' })
    }
  }

  /**
   * Handles new user registration.
   * Note: In our case, it's designed to register a single user and then be disabled.
   * @param {Request} req - The request object containing user registration data.
   * @param {Response} res - The response object.
   * @returns A confirmation message upon successful registration.
   */
  async register (req, res) {
    try {
      const { login, password } = req.body

      // Validate request parameters
      if (!login || !password) {
        logger.warn('Login and password are required.')
        return res.status(400).json({ message: 'Login and password are required.' })
      }

      // store login and password in config
      configManager.set('preferences.security.login', login)
      configManager.set('preferences.security.password', password, true)
      await configManager.saveConfig()

      res.status(201).json({ message: 'User registered successfully.' })
    } catch (e) {
      logger.error({ err: e }, 'An error occurred during registration.')
      res.status(500).json({ message: 'An error occurred during registration.' })
    }
  }
}
