const { orm } = require('../loaders/sequelize')

const readingService = {
  /**
   * Calculates the overall progress percentage for a manga.
   *
   * @param {number} totalProgress - The sum of progress of all chapters.
   * @param {number} maxProgress - The maximum possible progress.
   * @return {number} The calculated overall percentage.
   */
  calculateOverallProgress (totalProgress, maxProgress) {
    const percent = ((totalProgress / maxProgress) * 100).toFixed(0)
    return percent >= 94 ? 100 : percent
  },

  /**
   * Calculates the progress percentage.
   *
   * @param {number} progress - The progress made.
   * @param {number} total - The total pages.
   * @return {number} The calculated percentage.
   */
  calculateProgressPercentage (progress, total) {
    const percent = ((progress / total) * 100).toFixed(0)
    return percent >= 94 ? 100 : percent
  },

  /**
   * Updates the progress of a manga in the database.
   *
   * @param {number} mangaId - The ID of the manga to update.
   * @param {number} newPercent - The progress percentage to set.
   */
  async updateMangaProgress (mangaId, newPercent) {
    await orm.manga.update(
      { readProgress: newPercent },
      { where: { id: mangaId, readProgress: { [orm.Sequelize.Op.lt]: newPercent } } }
    )
  },

  /**
   * Updates the progress of a chapter in the database.
   *
   * @param {number} chapterId - The ID of the chapter to update.
   * @param {number} newPercent - The progress percentage to set.
   */
  async updateChapterProgress (chapterId, newPercent) {
    await orm.chapter.update(
      { readProgress: newPercent },
      { where: { id: chapterId, readProgress: { [orm.Sequelize.Op.lt]: newPercent } } }
    )
  },

  /**
   * Updates the progress of a chapter in the database.
   * @param manga
   * @param chapter
   * @param pageNumber
   * @returns {Promise<void>}
   */
  computeMangaProgress: async function (manga, chapter, pageNumber) {
    // start performance measurement const start = process.hrtime()
    // Fetch read statuses only for the specified chapter
    const chapterStatuses = await orm.stats.findAll({
      attributes: ['pageNumber'],
      where: { mangaSlug: manga.slug, chapterNumber: chapter.chapter }
    })

    // Calculate chapter progress
    let chapterProgress = 0
    if (chapterStatuses.length > 0) {
      chapterProgress = Math.round((pageNumber / chapter.pages) * 100)
    }

    if (chapterProgress > 100) {
      chapterProgress = 100
    }

    // no need to update if progress is lower than current
    if (chapterProgress <= chapter.readProgress) {
      return
    }

    // Update chapter progress
    await orm.chapter.update({ readProgress: chapterProgress }, { where: { id: chapter.id } })

    // Compute and update manga progress
    const chapters = await orm.chapter.findAll({ where: { mangaId: manga.id } })
    const mangaProgress = Math.round(chapters.reduce((acc, ch) => acc + ch.readProgress, 0) / chapters.length)
    await orm.manga.update({ readProgress: mangaProgress }, { where: { id: manga.id } })

    // end performance measurement const end = process.hrtime(start) logger.info(`computeMangaProgress Execution time: ${end[0]}s ${end[1]}ns`)
  },

  /**
   * Updates the progress of a chapter in the database (from scrobbler).
   * @param manga
   * @param ChapterNumber
   * @returns {Promise<void>}
   */
  computeMangaProgressFromScrobbler: async function (manga, ChapterNumber) {
    const chapterNum = parseFloat(ChapterNumber).toString()
    // get total number of pages in the chapter
    const chapter = await orm.chapter.findOne({ where: { mangaId: manga.id, chapter: chapterNum } })
    if (!chapter) {
      return
    }
    const pages = chapter.pages
    await readingService.computeMangaProgress(manga, chapter, pages)
  },

  /**
   * Gets the last read chapter for a manga.
   * @param manga
   * @returns {Promise<*|{pageNumber: number, chapterNumber: number}>}
   */
  async getLastGreaterChapterProgress (manga) {
    const readStatus = await orm.stats.findOne({
      attributes: ['chapterNumber', 'pageNumber'],
      where: { mangaSlug: manga.slug },
      order: orm.Sequelize.literal('CAST(chapterNumber AS FLOAT) DESC'),
      limit: 1
    })

    return readStatus || { chapterNumber: 0, pageNumber: 0 }
  }

}
module.exports = readingService
