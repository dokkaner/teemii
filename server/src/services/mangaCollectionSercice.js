const { orm } = require('../loaders/sequelize.js')

module.exports = class MangaService {
  async generateMangas (count) {
    const mangas = await orm.manga.findAll()
    // use existing mangas to generate new ones
    for (let i = 0; i < count; i++) {
      const j = Math.floor(Math.random() * 4)
      const manga = mangas[j]
      const newManga = manga.toJSON()
      newManga.slug = `${manga.slug}-${i}`
      newManga.canonicalTitle = `${manga.canonicalTitle}-${i}`
      await orm.manga.create(newManga)
    }
  }
}
