const { morphism } = require('morphism')
const {
  getMostFrequentValue, mergeValuesWithoutDuplicates, formatFieldByLanguage, aggregateUniqueValues,
  mergeUniqueKeyValuePairs, getHighestNonEmptyValue, slugify
} = require('./utils-mapping')
const utils = require('../utils/agent.utils')
const { logger } = require('../loaders/logger')
const { top30Locales } = require('../utils/agent.utils')

// General genres
const generalGenres = [
  'action',
  'adventure',
  'comedy',
  'drama',
  'fantasy',
  'gender bender',
  'harem',
  'historical',
  'horror',
  'josei',
  'martial arts',
  'mecha',
  'mystery',
  'psychological',
  'romance',
  'school life',
  'sci-fi',
  'seinen',
  'shoujo',
  'shoujo ai',
  'shounen',
  'shounen ai',
  'slice of life',
  'sports',
  'supernatural',
  'tragedy'
]

// Sensitive or explicit content genres
const sensitiveContentGenres = [
  'adult',
  'doujinshi',
  'ecchi',
  'hentai',
  'lolicon',
  'mature',
  'smut',
  'yaoi',
  'yuri'
]

const publicationDemographics = [
  'shonen', // generally targeted towards young teen males
  'shoujo', // generally targeted towards young teen females
  'seinen', // generally targeted towards adult men
  'josei', // generally targeted towards adult women
  'kodomomuke', // literally meaning "for children", targeted towards young children
  // Manhwa (Korean comics) and Webtoons also have their own specific demographics, some of which overlap:
  'sunjeong', // the Korean equivalent of shoujo
  'sungnyung', // targeted at older teens and can be compared to late shōnen or early seinen
  // Chinese comics, known as Manhua, share similar demographics:
  'shaonian', // equivalent to shōnen, targeting young teen males
  'shaonv', // equivalent to shoujo, targeting young teen females
  'qingnian', // targeted at older teens and adults, similar to seinen
  'zhenren' // literally "real person", for adults, encompassing a range of mature content
]

const unifiedMangaSchema = {
  id: '',
  slug: '',
  type: (results) => getMostFrequentValue(results, 'type')?.toLowerCase(),
  publicationDemographics: (results) => getMostFrequentValue(results, 'publicationDemographics')?.toLowerCase(),
  genres: (results) => mergeValuesWithoutDuplicates(results, 'genres'),
  tags: (results) => mergeValuesWithoutDuplicates(results, 'tags'),
  canonicalTitle: (results) => getMostFrequentValue(results, 'canonicalTitle'),
  titles: (results) => {
    return formatFieldByLanguage(results, 'titles', top30Locales)
  },
  altTitles: (results) => aggregateUniqueValues(results, 'altTitles'),
  primaryAltTitle: (results) => getMostFrequentValue(results, 'primaryAltTitle'),
  synopsis: (results) => {
    return formatFieldByLanguage(results, 'synopsis', top30Locales)
  },
  description: (results) => {
    return formatFieldByLanguage(results, 'description', top30Locales)
  },
  status: (results) => getMostFrequentValue(results, 'status')?.toLowerCase(),
  isLicensed: (results) => getMostFrequentValue(results, 'isLicensed'),
  bannerImage: (results) => mergeUniqueKeyValuePairs(results, 'bannerImage'),
  posterImage: (results) => mergeUniqueKeyValuePairs(results, 'posterImage'),
  coverImage: (results) => mergeUniqueKeyValuePairs(results, 'coverImage'),
  color: (results) => getMostFrequentValue(results, 'color'),
  chapterCount: (results) => getHighestNonEmptyValue(results, 'chapterCount'),
  lastChapter: (results) => getHighestNonEmptyValue(results, 'lastChapter'),
  volumeCount: (results) => getHighestNonEmptyValue(results, 'volumeCount'),
  serialization: (results) => getMostFrequentValue(results, 'serialization'),
  lastRelease: (results) => getMostFrequentValue(results, 'lastRelease'),
  nextRelease: (results) => getMostFrequentValue(results, 'nextRelease'),
  popularityRank: (results) => getHighestNonEmptyValue(results, 'popularityRank'),
  favoritesCount: (results) => getHighestNonEmptyValue(results, 'favoritesCount'),
  score: (results) => getHighestNonEmptyValue(results, 'score'),
  contentRating: (results) => getMostFrequentValue(results, 'contentRating'),
  startYear: (results) => getMostFrequentValue(results, 'startYear'),
  endYear: (results) => getMostFrequentValue(results, 'endYear'),
  authors: (results) => mergeValuesWithoutDuplicates(results, 'authors'),
  publishers: (results) => mergeValuesWithoutDuplicates(results, 'publisher'),
  chapterNumbersResetOnNewVolume: (results) => getMostFrequentValue(results, 'chapterNumbersResetOnNewVolume') || false,
  externalIds: (results) => mergeUniqueKeyValuePairs(results, 'externalIds')
}

function customFlatten (items) {
  const flat = []

  items.forEach(item => {
    if (Array.isArray(item)) {
      flat.push(...customFlatten(item))
    } else if (typeof item === 'object' && item !== null) {
      Object.values(item).forEach(value => {
        if (Array.isArray(value)) {
          flat.push(...customFlatten(value))
        } else {
          flat.push(value)
        }
      })
    } else {
      flat.push(item)
    }
  })

  return flat
}

const mangasToUnified = async (mangas, searchPrefTitle = true) => {
  const results = mangas.map(manga => manga.result).filter(result => result)
  const uni = morphism(unifiedMangaSchema, [results])[0]

  if (!uni) {
    logger.warn('Something wrong - Unified manga was not generated')
    return null
  }

  if (searchPrefTitle) {
    // noinspection ES6RedundantAwait
    uni.primaryAltTitle = await utils.userPreferredMangaTitle(uni.canonicalTitle)
  }

  // flatten altTitles
  uni.altTitles = customFlatten(uni.altTitles)

  uni.slug = slugify(uni.canonicalTitle)
  return uni
}

const validateMangaData = (manga) => {
  // Normalize and filter publication demographics
  if (Array.isArray(manga.publicationDemographics)) {
    manga.publicationDemographics = manga.publicationDemographics.map(demo => demo.toLowerCase())
      .filter(demo => publicationDemographics.includes(demo))
  }

  // determine the content rating based on the genres
  if (Array.isArray(manga.genres)) {
    // Normalize and filter genres
    manga.genres = manga.genres.map(genre => genre.toLowerCase())
      .filter(genre => generalGenres.includes(genre) || sensitiveContentGenres.includes(genre))

    if (manga.genres.some(genre => sensitiveContentGenres.includes(genre))) {
      manga.contentRating = 'explicit'
    } else {
      manga.contentRating = 'safe'
    }
  }

  // find publicationDemographics from genres
  if (!manga.publicationDemographics && manga.genres) {
    const genres = manga.genres.map(function (x) {
      return x.toUpperCase()
    })
    if (genres.includes('SHOUNEN')) {
      manga.publicationDemographics = 'Shounen'
    } else if (genres.includes('SHOUJO')) {
      manga.publicationDemographics = 'Shoujo'
    } else if (genres.includes('SEINEN')) {
      manga.publicationDemographics = 'Seinen'
    } else if (genres.includes('JOSEI')) {
      manga.publicationDemographics = 'Josei'
    }
  }
  return manga // Return the validated and sanitized array of manga objects
}
/**
 * Compares two manga objects and returns fields that need to be updated.
 *
 * @param {Object} manga - The original manga object.
 * @param {Object} updatedManga - The updated manga object.
 * @returns {Object} - An object containing fields to update.
 */
const compareUpdateMangas = (manga, updatedManga) => {
  const fieldsToUpdate = [
    'chapterCount',
    'lastChapter',
    'volumeCount',
    'lastRelease',
    'nextRelease',
    'popularityRank',
    'favoritesCount',
    'score',
    'startYear',
    'endYear',
    'authors',
    'publishers',
    'externalIds',
    'coverImage',
    'bannerImage',
    'posterImage',
    'publicationDemographics',
    'tags',
    'synopsis',
    'serialization',
    'contentRating',
    'censorship'
  ]

  const result = {}
  fieldsToUpdate.forEach((field) => {
    if (updatedManga[field] &&
      updatedManga[field] !== undefined &&
      updatedManga[field] !== manga[field]
    ) {
      result[field] = updatedManga[field]
    }
  })

  return result
}

module.exports = {
  validateMangaData,
  mangasToUnified,
  compareUpdateMangas
}
