const { logger } = require('../loaders/logger.js')
const {
  getMostFrequentValue,
  mergeUniqueKeyValuePairs,
  extractOldestDate,
  extractNewestDate
} = require('./utils-mapping')

/**
 * Maps and unifies chapter information for a given manga.
 *
 * This function processes a list of chapters from various sources and languages
 * to produce a unified list of chapters with consolidated metadata.
 *
 * @param {Object} manga - The manga object containing metadata like chapter count.
 * @param {Array} chapters - An array of chapter objects from different sources.
 * @returns {Array} An array of unified chapter objects for the manga.
 */
const chaptersToUnified = async (manga, chapters) => {
  const results = chapters.map(chapter => chapter.result).filter(Boolean)
  logger.trace(`Start chapters mapping for Manga ${manga.id} with ${results.length} results`)

  // Extract distinct languages and count chapters per language
  const chaptersList = [].concat(...results) // Flatten the results
  if (chaptersList.length === 0) {
    logger.warn(`No chapters found for Manga ${manga.id}`)
    return []
  }

  const chapterCountByLanguage = chaptersList.reduce((acc, chapter) => {
    const langAvailable = chapter.langAvailable || 'unknown'
    const chapterNumber = chapter.chapter || 0
    acc[langAvailable] = acc[langAvailable] || new Set()
    acc[langAvailable].add(chapterNumber)
    return acc
  }, {})

  // Determine the language with the highest number of chapters
  let highestChapterCount = 0
  let selectedLanguage = ''
  for (const [lang, chaptersSet] of Object.entries(chapterCountByLanguage)) {
    const len = chaptersSet.size
    if (len > highestChapterCount) {
      highestChapterCount = len
      selectedLanguage = lang
    }
  }

  // Extract unique chapter numbers for the selected language
  const chapterNumbers = [...chapterCountByLanguage[selectedLanguage]]

  // sort the chapter numbers from lowest to highest
  chapterNumbers.sort((a, b) => parseFloat(a) - parseFloat(b))

  // for each, build chapter object
  const chaptersUnified = []
  const distinct = (value, index, self) => {
    return self.indexOf(value) === index
  }
  for (const chapterNumber of chapterNumbers) {
    const chapterSources = chaptersList.filter(chapter => {
      const chapterNum = Number(chapter.chapter)
      return chapterNum === Number(chapterNumber)
    })
    // find the uniques languages available for this chapterNumber
    const languages = chapterSources.map(chapter => chapter.langAvailable).filter(distinct)

    const metadata = chapterSources.map(chapter => ({
      source: chapter.source,
      id: chapter.externalIds[chapter.source],
      lang: chapter.langAvailable,
      votes: chapter.votes || 0,
      version: chapter.version,
      groupScan: chapter.groupScan,
      lastUpdated: chapter.publishAt,
      pages: chapter.pages,
      title: chapter.titles[chapter.langAvailable]
    }))

    const chapter = {
      mangaId: manga.id,
      // aggregate the titles longer than 3 chars for each language thank to metadata
      titles: metadata.reduce((acc, chapter) => {
        if (chapter.title?.length > 3) {
          acc[chapter.lang] = chapter.title
        }
        return acc
      }, {}),

      langAvailable: languages,
      posterImage: null,
      volume: getMostFrequentValue(chapterSources, 'volume'),
      chapter: chapterNumber || 0,
      pages: getMostFrequentValue(chapterSources, 'pages'),
      publishAt: extractNewestDate(chapterSources, 'publishAt') || extractOldestDate(chapterSources, 'readableAt'),
      readableAt: extractOldestDate(chapterSources, 'readableAt') || extractNewestDate(chapterSources, 'publishAt'),
      externalIds: mergeUniqueKeyValuePairs(chapterSources, 'externalIds'),
      externalLinks: mergeUniqueKeyValuePairs(chapterSources, 'externalLinks'),
      metadata,
      state: 0,
      isDeleted: false
    }

    chaptersUnified.push(chapter)
  }
  logger.trace(`End chapters mapping for Manga ${manga.id} with ${chaptersUnified.length} results`)
  return chaptersUnified
}

module.exports = {
  chaptersToUnified
}
