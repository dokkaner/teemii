const { authCtl, chapterCtl, backupCtl } = require('../controllers')
const { restart } = require('../controllers/setupController.js')
const express = require('express')
const router = express.Router()

router.route('/chapters').get(chapterCtl.getChapters)

// Auth routes
router.route('/auth/login').post(authCtl.login)
router.route('/auth/refresh').post(authCtl.refresh)
router.route('/auth/register').post(authCtl.register)
router.route('/system/restart').post(restart)

// backup routes
router.route('/backup').get(backupCtl.fetchBackups)
router.route('/backup').post(backupCtl.doBackup)
router.route('/backup/restore').post(backupCtl.doRestore)
router.route('/backup/download').post(backupCtl.downloadBackup)

module.exports = router
