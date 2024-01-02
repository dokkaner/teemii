const { configManager } = require('../loaders/configManager')
const jwt = require('jsonwebtoken')

module.exports = {
  /**
   * Generates a JWT token.
   * @param {object} payload - The payload to encrypt.
   * @param {string} expiresIn - The token expiration time.
   * @returns {string} The generated token.
   */
  jwtSign (payload, expiresIn = '8h') {
    const JWT_SECRET = configManager.getSecretKey().toString()
    return jwt.sign(payload, JWT_SECRET, { expiresIn })
  },

  /**
   * Validates the provided password against the one stored in the config file.
   * @param {string} password - The password to validate.
   * @returns {boolean} True if the password is valid, false otherwise.
   */
  validatePassword (password) {
    const passwordFromConfig = configManager.get('preferences.security.password', true)
    return (password === passwordFromConfig)
  }
}
