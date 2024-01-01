const express = require('express')
const router = express.Router()
const { uploadCtl, libCtl, preferencesCtl, settingsCtl, logCtl } = require('../controllers/index.js')
const {
  getFirstLaunch,
  deployDB,
  setupStorage,
  setUserPreferences,
  setupFinalize
} = require('../controllers/setupController.js')

// upload / import
router.route('/upload').post(uploadCtl.uploadFiles)
router.route('/upload/parse').get(uploadCtl.parseFilesInfo)
// setup
router.route('/setup').get(getFirstLaunch)
router.route('/setup/deployDB').post(deployDB)
router.route('/setup/setupStorage').post(setupStorage)
router.route('/setup/setUserPreferences').post(setUserPreferences)
router.route('/setup/finalize').post(setupFinalize)

// preferences
router.route('/preferences')
  .get(preferencesCtl.getPreferences)
  .post(preferencesCtl.upsertPreferences)
router.route('/preferences/:name').post(preferencesCtl.setPreferences)

// settings
router.route('/settings/schedulers').get(settingsCtl.getSchedulers)

// log: stream log from log file
router.route('/log').get(logCtl.getLogs)
router.route('/log/download').get(logCtl.downloadLogs)

// autocomplete
router.route('/autocomplete').get(libCtl.autoComplete)

// ping
router.route('/ping').get(
  function (req, res) {
    res.status(200).send('Teemii!')
  })

// tasks
router.route('/tasks').get(libCtl.getAllTasks)

// commands
router.route('/commands').post(libCtl.postCommand)

// chapters
router.route('/chapters').get(libCtl.getAllChaptersManga)
router.route('/chapters/:id')
  .get(libCtl.getOneChapter)
  .post(libCtl.updateChapter)
router.route('/chapters/:id/grab').get(libCtl.getGrabChapter)
router.route('/chapters/:id/pages').get(libCtl.getChapterPages)
router.route('/chapters/:id/cover').get(libCtl.getChapterCover)
router.route('/chapters/:id/next').get(libCtl.getNextChapter)
router.route('/chapters/:id/previous').get(libCtl.getPreviousChapter)

// read status & stats
router.route('/reading/:pageId/:pageNumber').post(libCtl.postReadingStatus)
router.route('/reading/status/').get(libCtl.getReadingStatus)
router.route('/reading/stats').get(libCtl.getReadingStats)

// pages
router.route('/pages/:id').get(libCtl.getOnePage)

// mangas
router.route('/mangas/lookup').get(libCtl.mangasLookup)
router.route('/mangas/trending/:ask').get(libCtl.mangasTrending)
router.route('/mangas/recommendations').get(libCtl.mangasRecommendations)
router.route('/mangas/aisuggests').post(libCtl.mangasGetAISuggests)
router.route('/mangas/suggestions').get(libCtl.mangasGetSuggestions)
router.route('/mangas').get(libCtl.getAllManga)
router.route('/mangas/:id')
  .get(libCtl.getOneManga)
  .delete(libCtl.deleteManga)
  .post(libCtl.updateManga)
router.route('/mangas/:id/cover').get(libCtl.getMangaCover)
router.route('/mangas/:id/tasks').get(libCtl.getMangaFeed)
router.route('/mangas/:id/size').get(libCtl.getMangaTotalSize)
router.route('/mangas/:id/characters').get(libCtl.getMangaCharacters)
router.route('/mangas/:id/chapters').get(libCtl.getMangaChapters)

module.exports = router
