const { preferences } = require('../services/index.js')

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
        const secret = (req.query.secret === 'true') || false
        result = await preferences.getUserPreferences(req.params.name, secret)
      } else {
        result = await preferences.getAllUserPreferences()
      }
      return res.json(result)
    } catch (err) {
      res.status(500).send(err)
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
    } catch (err) {
      res.status(500).send(err)
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
    } catch (err) {
      res.status(500).send(err)
    }
  }
}
