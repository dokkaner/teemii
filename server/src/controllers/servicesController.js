const { scrobblersManager } = require('../services/scrobblerService')
const { logger } = require('../loaders/logger')

function statusText (status) {
  switch (status) {
    case 0:
      return 'Syncing'
    case 1:
      return 'Connected'
    case 2:
      return 'Disconnected'
    default:
      return 'Unknown'
  }
}

module.exports = class ServicesController {
  async getScrobblerStatistics (req, res) {
    try {
      const stats = scrobblersManager.getStatistics()
      res.json(stats)
    } catch (e) {
      logger.error({ e }, 'Error processing getScrobblerStatus request')
      res.status(500).send('Internal Server Error')
    }
  }

  /**
   * Updates the settings and security information for a specific scrobbler.
   * Only modifies the fields provided in the request body.
   * @param {object} req - The request object containing parameters and body.
   * @param {object} res - The response object.
   */
  async updateScrobblers (req, res) {
    const { name } = req.params
    const { enabled, Sync2Way, ImportNew, excludedGenres, username, password, token } = req.body
    const scrobblers = scrobblersManager.getSettings()

    try {
      if (!scrobblers.settings[name]) {
        return res.status(404).send('Scrobbler not found')
      }

      // Update settings
      Object.assign(scrobblers.settings[name], { enabled, Sync2Way, ImportNew, excludedGenres })

      // Update security only if values are provided
      const securityUpdates = { username, password, token }
      for (const [key, value] of Object.entries(securityUpdates)) {
        if (value !== undefined) {
          scrobblers.security[name][key] = value
        }
      }

      await scrobblersManager.saveScrobblersSettings(name, scrobblers.settings[name], scrobblers.security[name])
      res.json({ success: true })
    } catch (e) {
      logger.error({ e }, 'Error processing updateScrobblers request')
      res.status(500).send('Internal Server Error')
    }
  }

  /**
   * Retrieves the settings and security information for all scrobblers.
   * Combines settings and security data into a single response for each scrobbler.
   * @param {object} req - The request object.
   * @param {object} res - The response object.
   */
  async getScrobblers (req, res) {
    try {
      const scrobblers = scrobblersManager.getSettings()
      const combinedData = Object.entries(scrobblers.settings).map(([key, settingsValue]) => {
        const securityValue = scrobblers.security[key]
        return {
          name: key,
          Sync2Way: settingsValue.Sync2Way,
          ImportNew: settingsValue.ImportNew,
          imageUrl: settingsValue.logo,
          href: settingsValue.serviceURL,
          statusText: statusText(settingsValue.status),
          excludedGenres: settingsValue.excludedGenres,
          status: settingsValue.status,
          enabled: settingsValue.enabled,
          username: securityValue?.username || '',
          password: securityValue?.password || '',
          token: securityValue?.token || '',
          loginRedirectURL: securityValue?.loginRedirectURL || ''
        }
      })

      res.json(combinedData)
    } catch (e) {
      logger.error({ e }, 'Error processing getScrobblers request')
      res.status(500).send('Internal Server Error')
    }
  }
}
