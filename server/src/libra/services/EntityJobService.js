const { orm } = require('../../loaders/sequelize')
const { logger } = require('../../loaders/logger')

class EntityJobService {
  async createEntityJob (entityId, entityType, jobId) {
    try {
      await orm.entityJob.create({
        entityId,
        entityType,
        jobId
      })
    } catch (e) {
      if (e.name === 'SequelizeUniqueConstraintError' || e.name === 'SequelizeForeignKeyConstraintError') {
        logger.warn(`EntityJob already exists for entity ${entityType} ${entityId} and job ${jobId}`)
        return
      }
      throw e
    }
  }

  async getAllJobsWithEntity (limit = 100, offset = 0) {
    return orm.entityJob.findAndCountAll({
      limit,
      offset,
      include: [orm.job],
      // sort on join table
      order: [[orm.job, 'createdAt', 'DESC']]
    })
  }

  async getJobsForEntity (entityId, entityType) {
    return orm.entityJob.findAll({
      where: { entityId, entityType },
      include: [orm.job]
    })
  }

  async updateEntityJob (entityJobId, updates) {
    return await orm.entityJob.update(updates, { where: { id: entityJobId } })
  }

  async deleteEntityJob (entityJobId) {
    return await orm.entityJob.destroy({ where: { id: entityJobId } })
  }

  async getLastJobWithEntity (entityId, entityType) {
    const lastJob = await orm.entityJob.findAll({ where: { entityId, entityType } })
    if (lastJob.length === 0) return null
    const lastJobId = lastJob[lastJob.length - 1].jobId
    return orm.job.findOne({ where: { id: lastJobId } })
  }

  async deleteOrphanEntityJobs () {
    // check if orm is connected
    if (!orm.sequelize) return

    // 1. delete all entityJobs with no jobId
    const where = { jobId: null }
    await orm.entityJob.destroy({ where })

    // 2. delete all entityJobs with no corresponding job
    const entityJobs = await orm.entityJob.findAll()
    const jobs = await orm.job.findAll()
    const validJobIds = new Set(jobs.map(j => j.id))

    const orphans = entityJobs
      .filter(ej => !validJobIds.has(ej.jobId))
      .map(ej => ej.id)

    await orm.entityJob.destroy({ where: { id: orphans } })

    // 3. delete all entityJobs with no corresponding entity
    const e = await orm.entityJob.findAll()
    const mangaIds = e.filter(ej => ej.entityType === 'manga').map(ej => ej.entityId)
    const chapterIds = e.filter(ej => ej.entityType === 'chapter').map(ej => ej.entityId)

    const existingMangas = await orm.manga.findAll({ where: { id: mangaIds } })
    const existingChapters = await orm.chapter.findAll({ where: { id: chapterIds } })

    const existingMangaIds = new Set(existingMangas.map(m => m.id))
    const existingChapterIds = new Set(existingChapters.map(c => c.id))

    const orphanEntityJobIds = e
      .filter(ej => {
        return ((ej.entityType === 'manga' && !existingMangaIds.has(ej.entityId)) ||
         (ej.entityType === 'chapter' && !existingChapterIds.has(ej.entityId)))
      })
      .map(ej => ej.id)

    await orm.entityJob.destroy({ where: { id: orphanEntityJobIds } })
  }

  async deleteAllJobs (status = 'any', since = '') {
    const where = {}
    if (status !== 'any') where.status = status
    if (since !== '') where.createdAt = { [orm.Sequelize.Op.gte]: since }

    const jobs = await orm.job.findAll({ where })
    const jobsIds = jobs.map(ej => ej.id)
    await orm.entityJob.destroy({ where: { jobId: jobsIds } })
    await orm.job.destroy({ where })
  }

  async deleteOneJob (jobId) {
    await orm.entityJob.destroy({ where: { jobId } })
    await orm.job.destroy({ where: { id: jobId } })
  }
}

module.exports = new EntityJobService()
