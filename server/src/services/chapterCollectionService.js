const { orm } = require('../loaders/sequelize')
const { agents } = require('../core/agentsManager')
const { logger } = require('../loaders/logger')
const chaptersMapper = require('../mappings/chapter-mapping')
const _ = require('lodash')

module.exports = {

  async AddChaptersToCollection (manga, probes) {
    try {
      const chapters = await agents.searchMangaChapters(manga.externalIds, probes, null)
      const chaptersUnified = await chaptersMapper.chaptersToUnified(manga, chapters)

      logger.trace(chaptersUnified.length + ' chapters to save.')
      const uniqueIds = []
      let i = 0
      for (const c of chaptersUnified) {
        // check if chapter already exists
        const existing = await orm.chapter.findOne({
          where: { mangaId: manga.id, chapter: c.chapter },
          raw: true
        })

        if (!existing) {
          try {
            if (!uniqueIds.includes(c?.chapter)) {
              await orm.chapter.upsert(c)
              uniqueIds.push(c.chapter)
            }
          } catch (e) {
            logger.warn({ err: e }, 'insertNewChaptersToCollection')
          }
        } else {
          i++
          // update only metadata
          // convert existing metadata to object
          existing.metadata = JSON.parse(existing.metadata)
          const metadata = _.defaultsDeep(existing.metadata, c.metadata)
          await orm.chapter.update({ metadata }, {
            where: { id: existing.id }
          })
        }
      }
      logger.info(uniqueIds.length + ' new chapter(s) inserted.')
      logger.info(i + ' chapter(s) updated.')
      return chaptersUnified
    } catch (e) {
      logger.error({ err: e }, `Error fetching chapters data for manga id ${manga.id}`)
      throw e
    }
  }

}
