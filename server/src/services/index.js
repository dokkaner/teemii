const LibraryService = require('./libraryService.js')
const MangaService = require('./mangaCollectionSercice.js')
const PreferencesService = require('./preferencesService')
const AgentsService = require('./agentsService')

exports.manga = new MangaService()
exports.library = new LibraryService()
exports.preferences = new PreferencesService()
exports.agents = new AgentsService()
