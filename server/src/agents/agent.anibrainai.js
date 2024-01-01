const { Agent, AgentCapabilities } = require('../core/agent.js')
const Bottleneck = require('bottleneck')
const utils = require('../utils/agent.utils')

class Anibrain extends Agent {
  // #region private

  #limiter = new Bottleneck({
    maxConcurrent: 3,
    minTime: 1000
  })

  #lookupSchema = {
    id: 'id',
    title: 'titleRomaji',
    altTitles: 'titleRomaji',
    desc: 'description',
    status: '',
    genre: (iteratee) => {
      return iteratee.genres.map((tag) => {
        return tag
      }).filter(n => n)
    },
    year: '',
    r: '',
    score: 'score',
    scoredBy: '',
    popularity: '',
    faved: '',
    url: '',
    authors: '',
    cover: 'imgURLs[0]'
  }
  // #endregion

  // #region public
  constructor () {
    super()
    this.id = 'anibrain'
    this.label = 'anibrain'
    this.url = 'https://anibrain.ai/'
    this.credits = '© 2022 AniBrain'
    this.tags = []
    this.iconURL = 'https://anibrain.ai/favicons/favicon-32x32.png'
    this.options = ''
    this.lang = ['en']
    this.caps = [AgentCapabilities.MANGA_ADVANCED_RECOMMENDATIONS]
    this.host = 'https://anibrain.ai'
    this.priority = 10
    this.coverPriority = 85
    this.lookupSchema = this.#lookupSchema
  };

  async lookupRecommendations (id, adult = false) {
    const endpoint = `${this.host}/api/-/recommender/recs/manga`
    const mediaType = 'MANGA'
    const countries = ''
    const genres = ''
    const releasePeriodes = '1930,2023'
    const minimalScore = '0'
    const weightGenre = 0.3
    const weightSetting = 0.15
    const weightSynopsis = 0.4
    const weightTheme = 0.2
    const page = '1'

    const queryParams = {
      filterCountry: `[${countries}]`,
      filterFormat: `["${mediaType}"]`,
      filterGenre: `{${genres}}`,
      filterRelease: `[${releasePeriodes}]`,
      filterScore: minimalScore,
      algorithmWeights: JSON.stringify({
        genre: weightGenre,
        setting: weightSetting,
        synopsis: weightSynopsis,
        theme: weightTheme
      }),
      mediaId: id,
      mediaType,
      adult,
      page
    }

    const queryParts = Object.entries(queryParams)
      .map(([key, value]) => `${key}=${(value)}`)// encodeURIComponent
      .join('&')

    const requestURL = `${endpoint}?${queryParts}`
    try {
      const response = await this.#limiter.schedule(() => utils.getBody(requestURL, null, false, false, true))
      const json = JSON.stringify(response)
      const suggests = JSON.parse(json)
      return super.noFilterResult(this.#lookupSchema, JSON.parse(suggests).data)
    } catch (err) {
      return { success: false, code: 500, body: err }
    }
  }

  async lookupMangas (title, adult = false) {
    const endpoint = `${this.host}/api/-/recommender/autosuggest`
    const mediaType = 'MANGA'
    const requestURL = `${endpoint}?searchValue=${title}&mediaType=${mediaType}&adult=${adult}`
    try {
      const response = await this.#limiter.schedule(() => utils.getBody(requestURL, null, false, false, true))
      const json = JSON.stringify(response)
      return JSON.parse(json)
    } catch (err) {
      return { success: false, code: 500, body: err }
    }
  }

  // #endregion
}

module.exports = Anibrain
