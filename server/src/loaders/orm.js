const { logger } = require('./logger')
const { orm } = require('./sequelize.js')

/**
 * Syncs the ORM with the database
 * @param force - Force sync. Be careful, if true, all tables will be dropped and recreated
 * @returns {Promise<*>}
 */
async function ormSync (force = false) {
  const results = await orm.sequelize.sync({ force })
  logger.info('✓ sequelize Synced')
  return results
}

async function checkApplyMigrations () {
  try {
    const results = await orm.checkApplyMigrations()
    logger.info('✓ All migrations applied')
    return results
  } catch (error) {
    logger.error({ err: error }, '✗ Failed to apply migrations')
    throw error
  }
}

async function ormConnect (path) {
  const sequelizeConf = {
    teemii: {
      storage: path,
      dialect: 'sqlite',
      logging: false // console.log
    }
  }

  try {
    await orm.connect(sequelizeConf.teemii)

    const migrationsResults = await checkApplyMigrations()
    if (migrationsResults?.length > 0) {
      await ormSync()
    }

    orm.manga = require('../models/manga')(orm.sequelize, orm.Sequelize)
    orm.chapter = require('../models/chapter')(orm.sequelize, orm.Sequelize)
    orm.file = require('../models/file')(orm.sequelize, orm.Sequelize)
    orm.stats = require('../models/stats')(orm.sequelize, orm.Sequelize)
    orm.storage = require('../models/storage')(orm.sequelize, orm.Sequelize)
    orm.suggestion = require('../models/suggestion')(orm.sequelize, orm.Sequelize)
    orm.job = require('../models/job')(orm.sequelize, orm.Sequelize)
    orm.entityJob = require('../models/entityJob')(orm.sequelize, orm.Sequelize)

    // relations
    orm.manga.hasMany(orm.chapter, { as: 'chapters', foreignKey: 'mangaId' })
    orm.chapter.belongsTo(orm.manga, { foreignKey: 'mangaId' })
    orm.entityJob.belongsTo(orm.job, { foreignKey: 'jobId' })

    // await orm.sequelize.query('PRAGMA optimize;')
    // await orm.sequelize.query('VACUUM;')

    logger.trace('✓ sequelize model loaded')
  } catch (e) {
    logger.error({ err: e }, '✗ sequelize model failed')
    throw e
  }
}

module.exports = { ormConnect, ormSync }
