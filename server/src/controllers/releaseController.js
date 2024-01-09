const { logger } = require('../loaders/logger')
const axios = require('axios')
const fs = require('fs')
const path = require('path')
const REPO = 'dokkaner/teemii'

function getPackageVersion () {
  const packageJsonPath = path.join(process.cwd(), 'package.json')
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, { encoding: 'utf8' }))
  return packageJson.version
}

function compareVersions (currentVersion, newVersion) {
  const currentParts = currentVersion.split('.').map(Number)
  const newParts = newVersion.split('.').map(Number)

  for (let i = 0; i < Math.max(currentParts.length, newParts.length); i++) {
    const currentValue = currentParts[i] || 0
    const newValue = newParts[i] || 0

    if (newValue > currentValue) {
      return true
    } else if (newValue < currentValue) {
      return false
    }
  }

  return false
}

module.exports = class ReleasesController {
  async getReleasesLatest (req, res) {
    try {
      const url = `https://api.github.com/repos/${REPO}/releases/latest`
      const response = await axios.get(url)
      const release = response.data

      const formattedRelease = {
        url: release.html_url,
        version: release.tag_name,
        name: release.name,
        published_at: release.published_at,
        body: release.body,
        isUpdateAvailable: compareVersions(getPackageVersion(), release.tag_name)
      }

      res.json(formattedRelease)
    } catch (e) {
      logger.error({ err: e }, 'Error processing release request')
      res.status(500).send('Error processing release request')
    }
  }
}
