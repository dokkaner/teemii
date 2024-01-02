const { preferences } = require('../services/index.js')
const { logger } = require('../loaders/logger')

function toBoolean (str) {
  return str === 'true'
}

module.exports = class PreferencesController {
  /**
   * Returns one or all preferences for a user.
   *
   * @param {object} req - The request object.
   * @param {object} res - The response object.
   */
  async getPreferences (req, res) {
    try {
      let result
      if (req.params?.name) {
        // QL: secret is a boolean
        const secret = toBoolean(req.query.secret)
        result = await preferences.getUserPreferences(req.params.name, secret)
      } else {
        result = await preferences.getAllUserPreferences()
      }
      return res.json(result)
    } catch (e) {
      logger.error({ err: e }, 'getPreferences failed.')
      res.status(500).send('An exception occurred.')
    }
  };

  /**
   * Updates one or all preferences for a user.
   *
   * @param {object} req - The request object.
   * @param {object} res - The response object.
   */
  async upsertPreferences (req, res) {
    try {
      const newPreferences = req.body.preferences
      const updatedPreferences = await preferences.upsertUserPreferences(req.params.name, newPreferences)
      return res.json(updatedPreferences)
    } catch (e) {
      logger.error({ err: e }, 'upsertPreferences failed.')
      res.status(500).send('An exception occurred.')
    }
  }

  // update a specific preference call to setUserPreferencesKey(key, value, isSecret)
  async setPreferences (req, res) {
    try {
      const key = req.params.name
      const value = req.body.value
      const isSecret = (req.query.isSecret === 'true') || false
      const updatedPreferences = await preferences.setUserPreferencesKey(key, value, isSecret)
      return res.json(updatedPreferences)
    } catch (e) {
      logger.error({ err: e }, 'setPreferences failed.')
      res.status(500).send('An exception occurred.')
    }
  }
}
