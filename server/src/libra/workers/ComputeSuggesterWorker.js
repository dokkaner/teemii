const Worker = require('./Worker')
const { logger } = require('../../loaders/logger')
const { orm } = require('../../loaders/sequelize')
const { openAISvc } = require('../../loaders/openai')
const { agents } = require('../../core/agentsManager')

const anibrainSuggesters = async (mangas) => {
  const results = []
  for (const m of mangas) {
    const title = m.canonicalTitle
    const isAdult = (m.contentRating === 'explicit')

    try {
      let mangaData = await agents.agent('anibrain').instance.lookupMangas(title, isAdult)
      mangaData = JSON.parse(mangaData)
      if (mangaData.data?.length === 0) continue
      const suggestions = await agents.agent('anibrain').instance.lookupRecommendations(mangaData.data?.[0]?.id)

      let count = 0
      suggestions.forEach(suggestion => {
        if (count++ > 5) return
        const { title, desc, genre, score, cover, id } = suggestion
        const recommendation = {
          title,
          desc,
          genre,
          score: score / 10,
          cover,
          'externalIds.mal': id,
          recommendationScore: (score / 10) * (m.readProgress + 10) / 100
        }
        results.push(recommendation)
        count++
      })
    } catch (e) {
      logger.warn({ err: e }, 'anibrainSuggesters error: ' + title)
    }
  }
  return results
}

const chatGPTSuggesters = async (mangas) => {
  const results = []

  const mangaTitles = mangas.map(m => m.canonicalTitle)
  const mangaContentRating = mangas.map(m => m.contentRating)
  const mangaGenres = mangas.map(m => m.genres)
  const mangaTitlesWithContentRating = mangaTitles.reduce((acc, title, index) => {
    if (title.length > 1) {
      acc.push(`${title}, ${mangaContentRating[index]}, [${mangaGenres[index]}]`)
    }
    return acc
  }, [])

  if (mangaTitlesWithContentRating.length === 0) {
    return results
  }

  try {
    const res = await openAISvc.ctText('Here my list of mangas and/or manwhas: ' + mangaTitlesWithContentRating)
    // ensure we have a valid response
    const isValid = (res.choices.length > 0 && res.choices[0].message?.content.length > 0)
    if (!isValid) {
      return results
    }

    const content = res.choices[0].message.content
    // ensure we have a valid response & json content
    const isValidContent = (content.length > 0) && (content[0] === '{') && (content[content.length - 1] === '}')

    if (!isValidContent) {
      logger.warn({ msg: 'Invalid response from OpenAI', content })
      return results
    }
    const suggestions = JSON.parse(content).suggestions
    for (const suggestion of suggestions) {
      const manga = await agents.searchMangaByTitleYearAuthors(suggestion.title, [], suggestion.year, suggestion.authors, ['kitsu', 'mangaupdates', 'mangadex'])
      suggestion.cover = manga.posterImage.kitsu || manga.coverImage.kitsu || manga.coverImage.mangaupdates || manga.coverImage.mangadex
      suggestion.genre = manga.genres
      suggestion.score = manga.score
      suggestion.recommendationScore = '9.93'
      suggestion.externalIds = manga.externalIds
      results.push(suggestion)
    }
  } catch (e) {
    logger.error({ err: e })
    throw e
  }
}

/**
 * Computes manga suggestions.
 * It retrieves all mangas from the database, fetches recommendations for each manga,
 * and inserts the unique suggestions into the database.
 */
class ComputeSuggesterWorker extends Worker {
  /**
   * Process a library update job.
   *
   * @param {Object} job - The job to be processed.
   * @returns {Promise<void>}
   */
  processJob (job) {
    return ComputeSuggesterWorker.#compute()
  }

  static async #compute () {
    const mangas = await orm.manga.findAll({})
    const suggestions = []

    suggestions.push(await chatGPTSuggesters(mangas))
    suggestions.push(await anibrainSuggesters(mangas))

    if (suggestions.length > 0) {
      // dedupe
      const uniqueSuggestions = []
      const map = new Map()
      for (const item of suggestions.flat()) {
        try {
          const title = item.title || null
          if (!map.has(title) && title) {
            map.set(title, true)
            uniqueSuggestions.push(item)
          }
        } catch (e) {
          logger.warn({ err: e }, 'ComputeSuggesterWorker error. Skipping item.')
        }
      }

      // sort by recommendationScore
      uniqueSuggestions.sort((a, b) => b.recommendationScore - a.recommendationScore)

      await orm.suggestion.destroy({ truncate: true })
      await orm.suggestion.bulkCreate(uniqueSuggestions)
    }
    return { success: true, code: 200, body: 'OK' }
  }
}

module.exports = ComputeSuggesterWorker
