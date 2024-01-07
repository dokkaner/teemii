const { Agent, AgentCapabilities } = require('../core/agent.js')
const Bottleneck = require('bottleneck')
const axios = require('axios')
const AnilistNode = require('anilist-node')
const { logger } = require('../loaders/logger')
const { configManager } = require('../loaders/configManager')

class Anilist extends Agent {
  // #region private

  #convertRating (rating) {
    const ratingSystem = this.user.mediaListOptions.scoreFormat
    switch (ratingSystem) {
      case 'POINT_100':
        return rating * 20
      case 'POINT_10_DECIMAL':
        return rating * 2
      case 'POINT_10':
        return Math.round(rating * 2)
      case 'POINT_5':
        return rating
      case 'POINT_3':
        return Math.round(rating / 1.67)
      default:
        return rating
    }
  }

  #convertStatus (status) {
    switch (status) {
      case 'current':
        return 'CURRENT'
      case 'completed':
        return 'COMPLETED'
      case 'on_hold':
        return 'PAUSED'
      case 'dropped':
        return 'DROPPED'
      case 'planned':
        return 'PLANNING'
      default:
        return 'CURRENT'
    }
  }

  #convertBackStatus (status) {
    switch (status) {
      case 'CURRENT':
        return 'current'
      case 'COMPLETED':
        return 'completed'
      case 'PAUSED':
        return 'on_hold'
      case 'DROPPED':
        return 'dropped'
      case 'PLANNING':
        return 'planned'
      default:
        return 'current'
    }
  }

  #convertBackRating (rating) {
    const ratingSystem = this.user.mediaListOptions.scoreFormat
    switch (ratingSystem) {
      case 'POINT_100':
        return rating / 20
      case 'POINT_10_DECIMAL':
        return rating / 2
      case 'POINT_10':
        return Math.round(rating / 2)
      case 'POINT_5':
        return rating
      case 'POINT_3':
        return Math.round(rating * 1.67)
      default:
        return rating
    }
  }

  #limiter = new Bottleneck({
    maxConcurrent: 1,
    minTime: 1000
  })

  #lookupSchema = {
    id: 'id',
    title: 'title.userPreferred',
    altTitles: '',
    synonyms: 'synonyms',
    desc: 'description',
    status: 'status',
    genre: 'genres',
    year: 'startDate.year',
    r: 'isAdult',
    score: {
      path: 'averageScore',
      fn: (propertyValue) => {
        if (propertyValue) {
          return (propertyValue / 10).toFixed(2)
        } else {
          return null
        }
      }
    },
    scoredBy: '',
    popularity: 'popularity',
    faved: 'favourites',
    url: '',
    authors: '',
    type: 'type',
    cover: 'coverImage.extraLarge',
    'externalLinks.anilist': 'siteUrl',
    'externalIds.anilist': 'id'
  }

  #mangaSchema = {
    id: 'id',
    type: 'format',
    canonicalTitle: 'title.userPreferred',
    'titles.en_us': 'title.english',
    altTitles: 'synonyms',
    slug: '',
    publicationDemographics: '',
    genres: 'genres',
    'synopsis.en_us': '',
    'description.en_us': 'description',
    tags: (iteratee) => {
      const tags = iteratee.tags
      if (tags.length > 0) {
        return tags.map((tag) => {
          // avoid tags that are spoilers
          if (!tag.isMediaSpoiler) {
            return tag.name
          } else {
            return null
          }
        }).filter(n => n)
      } else { return [] }
    },
    status: 'status',
    isLicensed: 'isLicensed',
    'bannerImage.anilist': 'bannerImage',
    'posterImage.anilist': '',
    'coverImage.anilist': 'coverImage.large',
    color: 'coverImage.color',
    chapterCount: 'chapters',
    volumeCount: 'volumes',
    serialization: '',
    nextRelease: '',
    lastRelease: '',
    popularityRank: 'popularity',
    favoritesCount: 'favourites',
    score: {
      path: 'averageScore',
      fn: (propertyValue) => {
        return (propertyValue / 10).toFixed(2)
      }
    },
    contentRating: {
      path: 'isAdult',
      fn: (propertyValue) => {
        return (propertyValue ? 'Safe' : 'Explicit')
      }
    },
    originalLanguage: 'countryOfOrigin',
    startYear: 'startDate.year',
    endYear: 'endDate.year',
    authors: (iteratee) => {
      const authors = iteratee.staff || []
      if (authors.length > 0) {
        return authors.map((auth) => {
          return auth.name.toUpperCase()
        }).filter(n => n)
      } else { return [] }
    },
    publisher: 'studios[0].name',
    chapterNumbersResetOnNewVolume: false,
    'externalLinks.anilist': 'siteUrl',
    'externalIds.anilist': 'id'
  }

  #characterSchema = {
    id: 'node.id',
    'name.alt': 'node.name.alternative',
    'name.altSpoiler': 'node.name.alternativeSpoiler',
    'name.userPreferred': 'node.name.userPreferred',
    image: 'node.image.large',
    desc: 'node.description',
    age: 'node.age',
    gender: 'node.gender',
    role: 'role'
  }

  #recommendationsSchema = {
    id: 'node.id',
    title: 'node.mediaRecommendation.title.userPreferred',
    altTitles: 'node.mediaRecommendation.synonyms',
    desc: 'node.mediaRecommendation.description',
    status: 'node.mediaRecommendation.status',
    genres: 'node.mediaRecommendation.genres',
    year: 'node.mediaRecommendation.startDate.year',
    r: {
      path: 'node.mediaRecommendation.isAdult',
      fn: (propertyValue) => {
        return (propertyValue ? 'Safe' : 'Explicit')
      }
    },
    score: {
      path: 'node.mediaRecommendation.averageScore',
      fn: (propertyValue) => {
        return (propertyValue / 10).toFixed(2)
      }
    },
    url: '',
    authors: '',
    cover: 'node.mediaRecommendation.coverImage.large'
  }

  #scrobblerSchema = {
    id: 'id',
    type: 'media.format',
    status: {
      path: 'status',
      fn: (propertyValue, source) => {
        if (propertyValue) { return (this.#convertBackStatus(propertyValue)) }
      }
    },
    progress: 'progress',
    reconsuming: {
      path: 'repeat',
      fn: (propertyValue, source) => {
        return propertyValue > 0
      }
    },
    reconsumeCount: 'repeat',
    startedAt: 'dates.startedAt',
    finishedAt: 'dates.completedAt',
    rating: {
      path: 'score',
      fn: (propertyValue, source) => {
        if (propertyValue) { return (this.#convertBackRating(propertyValue)) }
      }
    },
    ratingTwenty: {
      path: 'score',
      fn: (propertyValue, source) => {
        if (propertyValue) { return (this.#convertBackRating(propertyValue) * 4) }
      }
    },
    mangaId: 'media.id',
    mangaType: 'media.format',
    mangaTitle: 'media.title.english',
    mangaYear: 'media.startDate.year',
    mangaAuthors: ''
  }

  #getMangaById (host, manga) {
    return this.AniCli.media.manga(parseInt(manga.id))
  };

  async #helperLookupRecommendations (host, ask, limit, offset, page) {
    const query = `
        query($page:Int,$perPage:Int = 30,$sort:[RecommendationSort],$onList:Boolean){Page(page:$page,perPage:$perPage){pageInfo{total perPage currentPage lastPage hasNextPage}recommendations(sort:$sort,onList:$onList){id rating userRating media{id title{userPreferred} synonyms format type status(version:2) genres bannerImage averageScore popularity favourites isAdult description coverImage{extraLarge large}}mediaRecommendation{id title{userPreferred}format type status(version:2)bannerImage isAdult coverImage{large}}user{id name avatar{large}}}}}
        `

    const variables = {
      page,
      sort: 'RATING_DESC',
      onList: false
    }
    const url = 'https://graphql.anilist.co'
    try {
      const results = await axios.post(url, { query, variables })
      const mangas = results.data.data.Page.recommendations.filter(x => x.media.type.toString() === 'MANGA')
      const medias = []
      mangas.forEach(manga => { medias.push(manga.media) })
      return medias
    } catch (e) {
      logger.error({ err: e }, 'Anilist API error')
      throw e
    }
  };

  async #helperLookupCharacters (host, id, offset, page) {
    const query = `
        query media($id:Int,$page:Int){Media(id:$id){id characters(page:$page,sort:[ROLE,RELEVANCE,ID]){pageInfo{total perPage currentPage lastPage hasNextPage}edges{id role name voiceActorRoles(sort:[RELEVANCE,ID]){roleNotes dubGroup voiceActor{id name{userPreferred}language:languageV2 image{large}}}node{id name{alternative alternativeSpoiler userPreferred}image{large} age gender description}}}}}
        `

    const variables = {
      id,
      page,
      type: 'MANGA'
    }
    try {
      const url = 'https://graphql.anilist.co'
      const results = await axios.post(url, { query, variables })
      const characters = results.data.data.Media.characters.edges
      const chars = []
      characters.forEach(character => { chars.push(character) })
      return chars
    } catch (e) {
      logger.error({ err: e }, 'Anilist API error')
      throw e
    }
  }

  async #helperMangaBasedRecommendations (id, limit = 10) {
    const query = `
    query ($mangaId: Int, $limit: Int) {
      Media (id: $mangaId, type: MANGA) {
        recommendations(perPage: $limit, sort: RATING_DESC) {
          edges {
            node {
              id
              rating
              mediaRecommendation {
                id
                title {
                  userPreferred
                  english
                }
                format
                status
                genres
                description
                coverImage {
                  extraLarge
                  large
                  color
                }
                startDate {
                  year
                }
                averageScore
                popularity
                favourites
                bannerImage
                isAdult
              }
            }
          }
        }
      }
    }
  `

    const variables = {
      mangaId: parseInt(id),
      limit
    }

    try {
      const url = 'https://graphql.anilist.co'
      const results = await axios.post(url, { query, variables })
      return results.data.data.Media.recommendations.edges
    } catch (e) {
      logger.error({ err: e }, 'Anilist API error')
      throw e
    }
  }

  async #helperLookupAuthorByName (host, authorName) {
    const query = `
        query ($search: String) {
            Staff(search: $search) {
                id
                name {
                    first
                    last
                    full
                    native
                }
                language
                image {
                    large
                    medium
                }
                description
                staffMedia {
                    edges {
                        node {
                            id
                            title {
                                userPreferred
                            }
                            type
                        }
                    }
                }
                siteUrl
            }
        }
    `

    const variables = { search: authorName }

    try {
      const url = 'https://graphql.anilist.co'
      const results = await axios.post(url, { query, variables })
      return results.data.data.Staff
    } catch (e) {
      logger.error({ err: e }, 'Anilist API error')
      throw e
    }
  }

  async getAuthorDetailsByName (authorName) {
    return this.#helperLookupAuthorByName(this.host, authorName)
  }

  async #helperLookupMangas (host, term, offset, page) {
    const query = `
        query ($page:Int = 1 $id:Int $type:MediaType $isAdult:Boolean = false $search:String $format:[MediaFormat]$status:MediaStatus $countryOfOrigin:CountryCode $source:MediaSource $season:MediaSeason $seasonYear:Int $year:String $onList:Boolean $yearLesser:FuzzyDateInt $yearGreater:FuzzyDateInt $episodeLesser:Int $episodeGreater:Int $durationLesser:Int $durationGreater:Int $chapterLesser:Int $chapterGreater:Int $volumeLesser:Int $volumeGreater:Int $licensedBy:[Int]$isLicensed:Boolean $genres:[String]$excludedGenres:[String]$tags:[String]$excludedTags:[String]$minimumTagRank:Int $sort:[MediaSort]=[POPULARITY_DESC,SCORE_DESC]){Page(page:$page,perPage:20){pageInfo{total perPage currentPage lastPage hasNextPage}media(id:$id type:$type season:$season format_in:$format status:$status countryOfOrigin:$countryOfOrigin source:$source search:$search onList:$onList seasonYear:$seasonYear startDate_like:$year startDate_lesser:$yearLesser startDate_greater:$yearGreater episodes_lesser:$episodeLesser episodes_greater:$episodeGreater duration_lesser:$durationLesser duration_greater:$durationGreater chapters_lesser:$chapterLesser chapters_greater:$chapterGreater volumes_lesser:$volumeLesser volumes_greater:$volumeGreater licensedById_in:$licensedBy isLicensed:$isLicensed genre_in:$genres genre_not_in:$excludedGenres tag_in:$tags tag_not_in:$excludedTags minimumTagRank:$minimumTagRank sort:$sort isAdult:$isAdult){id title{userPreferred}coverImage{extraLarge large color}startDate{year month day}endDate{year month day}bannerImage season seasonYear description type format status(version:2)episodes duration chapters volumes genres isAdult averageScore popularity synonyms nextAiringEpisode{airingAt timeUntilAiring episode}mediaListEntry{id status}studios(isMain:true){edges{isMain node{id name}}}}}}
        `

    const variables = {
      page,
      type: 'MANGA',
      search: term,
      sort: 'SEARCH_MATCH'
    }
    try {
      if (page === 1) {
        const url = 'https://graphql.anilist.co'
        const results = await axios.post(url, { query, variables })
        return results.data.data.Page.media
      } else {
        return []
      }
    } catch (e) {
      logger.error({ err: e }, 'Anilist API error')
      throw e
    }
  };

  /**
   * Helper function to push scrobbler updates to AniList.
   * It handles both updating an existing entry and adding a new entry based on the presence of a tracking ID.
   *
   * @param {string} host - The AniList API host.
   * @param {Object} entry - The entry data to be pushed to AniList.
   * @returns {Object} - The result of the push operation with agent, ID, and status.
   */
  async #helperScrobblerPush (host, entry) {
    try {
      const UpdateEntryOptions = {
        mediaId: entry.mediaId,
        status: this.#convertStatus(entry.status),
        score: this.#convertRating(entry.rating),
        progress: entry.progress,
        startedAt: entry.startedAt
          ? {
              year: entry.startedAt.getFullYear(),
              month: entry.startedAt.getMonth() + 1,
              day: entry.startedAt.getDate()
            }
          : null,
        completedAt: entry.finishedAt
          ? {
              year: entry.finishedAt.getFullYear(),
              month: entry.finishedAt.getMonth() + 1,
              day: entry.finishedAt.getDate()
            }
          : null
      }

      if (entry.trackingId) {
        const data = await this.AniCli.lists.updateEntry(entry.trackingId, UpdateEntryOptions)
        return { agent: 'anilist', id: data.id, status: 'success' }
      } else {
        const data = await this.AniCli.lists.addEntry(entry.mediaId, UpdateEntryOptions)
        return { agent: 'anilist', id: data.id, status: 'success' }
      }
    } catch (e) {
      logger.error({ err: e }, 'Anilist API error')
      return { agent: 'anilist', id: null, status: 'error' }
    }
  }

  async #helperScrobblerPull (host, offset, page) {
    if (page > 1) return []
    const data = await this.AniCli.lists.manga(this.user.id)

    // Flatten results into a single array of entries
    const entries = data.reduce((acc, list) => {
      list.entries.forEach(entry => acc.push(entry))
      return acc
    }, [])

    return entries
  }

  // #endregion

  // #region public

  constructor () {
    super()
    this.id = 'anilist'
    this.label = 'Anilist'
    this.url = 'https://anilist.co/'
    this.credits = 'Anilist'
    this.tags = []
    this.iconURL = 'https://anilist.co/img/icons/favicon-32x32.png'
    this.logoURL = 'https://anilist.co/img/icons/apple-touch-icon.png'
    this.sourceURL = 'https://anilist.co/manga/[id]'
    this.options = ''
    this.lang = ['en']
    this.caps = [AgentCapabilities.MANGA_METADATA_FETCH, AgentCapabilities.MANGA_BASIC_RECOMMENDATIONS, AgentCapabilities.OPT_AUTH, AgentCapabilities.SCROBBLER]
    this.host = 'https://anilist.co'
    this.priority = 5
    this.coverPriority = 35
    this.loginRedirectURL = 'https://anilist.co/api/v2/oauth/authorize?client_id=16136&response_type=token'
    // -------------------------------------------------
    this.limiter = this.#limiter
    this.offsetInc = 100
    this.maxPages = 3
    this.mangaSchema = this.#mangaSchema
    this.lookupSchema = this.#lookupSchema
    this.characterSchema = this.#characterSchema
    this.recommendationsSchema = this.#recommendationsSchema
    this.funcGetMangaById = this.#getMangaById
    this.funcHelperLookupMangas = this.#helperLookupMangas
    this.helperLookupRecommendations = this.#helperLookupRecommendations
    this.funcHelperLookupRecommendations = this.#helperMangaBasedRecommendations
    this.helperLookupCharacters = this.#helperLookupCharacters
    this.helperScrobblerPull = this.#helperScrobblerPull
    this.helperScrobblerPush = this.#helperScrobblerPush
    this.scrobblerSchema = this.#scrobblerSchema
    this.loggedIn = false
    this.AniCli = null
    this.user = null
  };

  async login () {
    const token = configManager.get('preferences.integrations.anilist.security.token')
    try {
      if (token) {
        this.AniCli = new AnilistNode(token)
        this.user = await this.AniCli.user.getAuthorized()
        this.loggedIn = true
      } else {
        this.AniCli = new AnilistNode()
      }
    } catch (e) {
      this.loggedIn = false
      logger.error({ err: e }, 'Anilist API error - login failed')
      logger.warn('Anilist Login failed', e)
    }
  }

  async refreshTokens () {
    await this.login()
  }

  // #endregion
}

module.exports = Anilist
