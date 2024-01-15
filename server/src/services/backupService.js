const AdmZip = require('adm-zip')
const fs = require('fs')
const path = require('path')
const { logger } = require('../loaders/logger')
const { configManager, BACKUP_DIR, CONFIG_DIR } = require('../loaders/configManager')
const osSvc = require('./osService')

/**
 * Parses the timestamp from the backup file name.
 * Assumes file names are in the format: "backup-YYYYMMDDHHMMSS.zip"
 *
 * @param {string} fileName - The backup file name.
 * @returns {Date} The date object parsed from the file name.
 */
function parseTimestampFromFileName (fileName) {
  const regex = /_backup_(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})\.zip/
  const match = regex.exec(fileName)
  if (match) {
    return new Date(`${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6]}Z`)
  }
  return null
}

/**
 * Deletes old backups based on retention policy.
 *
 * This function applies a retention policy to the backup files, either by
 * keeping a certain number of recent backups or deleting backups older than
 * a specified number of days.
 *
 * @param {number} maxBackups - Maximum number of backups to retain.
 * @param {number} maxAgeInDays - Maximum age of backups to retain in days.
 */
async function applyRetentionPolicy (maxBackups, maxAgeInDays) {
  try {
    const backupDir = BACKUP_DIR
    const files = fs.readdirSync(backupDir)

    // Get backup file details with timestamps
    const backupDetails = files.map(file => {
      const timestamp = parseTimestampFromFileName(file)
      return { file, timestamp }
    }).filter(backup => backup.timestamp) // Filter out files without a valid timestamp

    // Sort by timestamp, most recent first
    backupDetails.sort((a, b) => b.timestamp - a.timestamp)

    // Apply retention policy
    for (const [index, backup] of backupDetails.entries()) {
      const backupAge = (Date.now() - backup.timestamp.getTime()) / (1000 * 60 * 60 * 24)

      if (index >= maxBackups || backupAge > maxAgeInDays) {
        fs.unlinkSync(path.join(backupDir, backup.file))
      }
    }
  } catch (error) {
    throw new Error(`Failed to apply retention policy: ${error.message}`)
  }
}

/**
 * Formats current date and time as YYYYMMDDHHMMSS.
 *
 * @returns {string} Formatted timestamp.
 */
function getFormattedTimestamp () {
  const now = new Date()
  return now.toISOString()
    .replace(/[-T:.Z]/g, '')
    .slice(0, 14)
}

/**
 * Creates a ZIP backup of specified files.
 *
 * @param {string[]} filesToBackup - Array of file paths to be backed up.
 * @param {string} backupDir - Directory where the backup ZIP will be stored.
 * @returns {Promise<string>} Path of the created backup file.
 */
async function createBackup (filesToBackup, backupDir) {
  await applyRetentionPolicy(5, 7)
  try {
    const zip = new AdmZip(null, {})
    for (const filePath of filesToBackup) {
      if (fs.existsSync(filePath)) {
        zip.addLocalFile(filePath, null, null, 'Backup')
      } else {
        logger.warn(`createBackup. File not found: ${filePath}`)
      }
    }
    const version = configManager.system.appVersion
    const prefix = 'teemii_' + version
    const backupFilePath = path.join(backupDir, `${prefix}_backup_${getFormattedTimestamp()}.zip`)
    zip.writeZip(backupFilePath, null)
    return backupFilePath
  } catch (error) {
    throw new Error(`Failed to create backup: ${error.message}`)
  }
}

/**
 * Restores files from a given ZIP backup to specified locations.
 *
 * @param {string} backupFilePath - Path to the backup ZIP file.
 * @param {Object} fileDestinationMapping - Mapping of file names to their restoration paths.
 */
async function restoreBackup (backupFilePath, fileDestinationMapping) {
  try {
    const zip = new AdmZip(backupFilePath, {})
    const zipEntries = zip.getEntries()

    for (const entry of zipEntries) {
      const destPath = fileDestinationMapping[entry.entryName]
      if (destPath) {
        zip.extractEntryTo(entry, path.dirname(destPath), false, true, false, null)
      }
    }
  } catch (error) {
    throw new Error(`Failed to restore backup: ${error.message}`)
  }
}

/**
 * Creates a backup of specified files.
 *
 * This function ensures that the backup directory exists, and then creates
 * a backup of the specified files. It logs the outcome of the operation.
 */
async function backup () {
  // check first if setup is completed
  if (!configManager.setupCompleted) {
    logger.warn('Setup is not completed. Skipping backup.')
    return
  }

  const backupDir = BACKUP_DIR

  try {
    await osSvc.mkdir(backupDir)

    const filesToBackup = [
      configManager.configPath, // config.json
      configManager.get('databasePath'), // teemii.db
      path.join(CONFIG_DIR, 'secret.key'), // secret.key
      path.join(CONFIG_DIR, 'token.key') // token.key
    ]

    const backupFilePath = await createBackup(filesToBackup, backupDir)
    logger.info(`✓ Backup created: ${backupFilePath}`)
  } catch (error) {
    logger.error(`✗ Failed to create backup: ${error.message}`)
  }
}

async function restore (archive) {
  const fileDestinationMapping = {
    'config.json': configManager.configPath,
    'teemii.db': configManager.get('databasePath'),
    'secret.key': path.join(CONFIG_DIR, 'secret.key'),
    'token.key': path.join(CONFIG_DIR, 'token.key')
  }

  try {
    await restoreBackup(archive, fileDestinationMapping)
    logger.info(`✓ Backup restored: ${archive}`)
  } catch (error) {
    logger.error(`✗ Failed to restore backup: ${error.message}`)
  }
}

/**
 * Lists all backup files in the backup directory.
 *
 * This function reads the backup directory and returns a list of all backup
 * files along with their full paths.
 *
 * @returns {Promise<Object[]>} Array of backup details.
 */
async function listAllBackups () {
  try {
    const backupDir = BACKUP_DIR
    // return as a JSON array as : file, timestamp, size, path
    const files = fs.readdirSync(backupDir)

    return files.map(file => {
      const filePath = path.join(backupDir, file)
      const timestamp = parseTimestampFromFileName(file)
      const stats = fs.statSync(filePath)
      return { file, timestamp, size: stats.size, path: filePath }
    }).filter(backup => backup.timestamp)
  } catch (error) {
    throw new Error(`Failed to list backups: ${error.message}`)
  }
}

module.exports = { backup, restore, listAllBackups }
