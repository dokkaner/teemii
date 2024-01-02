const { logger } = require('../loaders/logger')
const { listAllBackups, backup, restore } = require('../services/backupService')
const path = require('path')
const fs = require('fs')
const { BACKUP_DIR } = require('../loaders/configManager')
module.exports = class BackupController {
  async fetchBackups (req, res) {
    try {
      const backups = await listAllBackups()
      res.json(backups)
    } catch (e) {
      logger.error({ e }, 'Error processing backup request')
      res.status(500).send('Error processing backup request')
    }
  }

  async doBackup (req, res) {
    try {
      await backup()
      res.json({ success: true })
    } catch (e) {
      logger.error({ e }, 'Error processing backup request')
      res.status(500).send('Error processing backup request')
    }
  }

  async doRestore (req, res) {
    try {
      await restore(req.body.path)
      res.json({ success: true })
    } catch (e) {
      logger.error({ e }, 'Error processing backup request')
      res.status(500).send('Error processing backup request')
    }
  }

  async downloadBackup (req, res) {
    try {
      const backupPathInput = req.body.path

      if (!backupPathInput?.endsWith('.zip')) {
        return res.status(400).send('Invalid backup file path')
      }

      const backupFileName = path.basename(backupPathInput)

      // secure directory traversal
      const backupPath = path.join(BACKUP_DIR, backupFileName)

      if (!fs.existsSync(backupPath)) {
        return res.status(404).send('Backup file not found')
      }

      res.setHeader('Content-Disposition', `attachment; filename=${path.basename(backupPath)}`)
      res.setHeader('Content-Type', 'application/octet-stream')

      const fileStream = fs.createReadStream(backupPath)
      fileStream.pipe(res)

      fileStream.on('error', (error) => {
        logger.error({ error }, 'Error sending backup file')
        res.status(500).send('Error sending backup file')
      })
    } catch (e) {
      logger.error({ e }, 'Error processing backup request')
      res.status(500).send('Error processing backup request')
    }
  }
}
