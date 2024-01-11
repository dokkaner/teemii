const LibraryController = require('./libraryController.js')
const PreferencesController = require('./preferencesController')
const SettingsController = require('./settingsController')
const LogController = require('./logController')
const UploadController = require('./uploadController')
const ChapterController = require('./chapterController')
const AuthController = require('./authController')
const BackupController = require('./backupController')
const ServicesController = require('./servicesController')
const ReleaseController = require('./releaseController')

const libCtl = new LibraryController()
const preferencesCtl = new PreferencesController()
const settingsCtl = new SettingsController()
const logCtl = new LogController()
const uploadCtl = new UploadController()
const chapterCtl = new ChapterController()
const authCtl = new AuthController()
const backupCtl = new BackupController()
const servicesCtl = new ServicesController()
const releaseCtl = new ReleaseController()

module.exports = {
  releaseCtl,
  authCtl,
  chapterCtl,
  libCtl,
  preferencesCtl,
  settingsCtl,
  logCtl,
  uploadCtl,
  backupCtl,
  servicesCtl
}
