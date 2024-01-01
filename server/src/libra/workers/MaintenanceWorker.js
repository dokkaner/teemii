const Worker = require('./Worker')
const fs = require('fs')
const { orm } = require('../../loaders/sequelize')
const { logger } = require('../../loaders/logger')
const EntityJobService = require('../services/EntityJobService')

/**
 * Maintenance Job.
 */
class MaintenanceWorker extends Worker {
  processJob (job) {
    logger.info('Processing maintenance job.')
    return MaintenanceWorker.#execute()
  }

  static async #execute () {
    // cleaning jobs
    await EntityJobService.deleteOrphanEntityJobs()
    await EntityJobService.deleteAllJobs('pending')
    await EntityJobService.deleteAllJobs('processing')
    await EntityJobService.deleteAllJobs('backlog')

    // cleanup files
    const files = await orm.file.findAll({})
    await files.forEach((F) => {
      const filepath = F.path
      orm.file.update({
        isDeleted: fs.existsSync(filepath) ? 0 : 1
      }, {
        where: { id: F.id }
      })
    })

    // reset state of chapters that are staled (state 1 or 2) since 10 minutes
    const chapters = await orm.chapter.findAll({
      where: {
        state: [1, 2],
        updatedAt: {
          [orm.Sequelize.Op.lt]: new Date(new Date() - 10 * 60 * 1000)
        }
      }
    })
    await chapters.forEach((C) => {
      orm.chapter.update({
        state: 0
      }, {
        where: { id: C.id }
      })
    })
  }
}

module.exports = MaintenanceWorker
