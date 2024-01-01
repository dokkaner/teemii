const { logger } = require('../loaders/logger')
const refPageSchema = {
  // Number or identifier of the page within the chapter.
  page: 'string',

  // URL of the page image.
  pageURL: 'string',

  // Identifier of the chapter to which this page belongs.
  chapterId: 'string',

  // Identifier of the manga to which this page belongs.
  mangaId: 'string',

  // Referrer information, typically used for tracking or source identification.
  referer: 'string'
}

const refChapterSchema = {
  // Unique identifier of the chapter.
  id: 'string',

  // Titles of the chapter in different languages.
  titles: 'object',

  // Identifier of the manga to which this chapter belongs.
  mangaId: 'string',

  // Languages available for this chapter.
  langAvailable: 'array',

  // URL or path to the poster image of the chapter, if available.
  posterImage: 'string',

  // Volume number in which this chapter is included.
  volume: 'string',

  // Chapter number or identifier.
  chapter: 'string',

  // Number of pages in the chapter.
  pages: 'number',

  // Publication date of the chapter.
  publishAt: 'string',

  // Date when the chapter becomes available for reading.
  readableAt: 'string',

  // Vote or rating of the chapter, if available.
  vote: 'number',

  // Name of the group that scanned or translated the chapter, if applicable.
  groupScan: 'string',

  // External identifiers specific to different sources.
  externalIds: 'object',

  // External links specific to different sources.
  externalLinks: 'object',

  // Source from which the chapter information is derived.
  source: 'string'
}

const refMangaSchema = {
  // Unique identifier of the manga.
  id: 'string',

  // The main or canonical title of the manga.
  canonicalTitle: 'string',

  // Array of alternate titles for the manga.
  altTitles: 'array',

  // Array of Description or synopsis of the manga.
  description: 'array',

  // Publication status of the manga (e.g., ongoing, completed).
  status: 'string',

  // Array of genres associated with the manga.
  genres: 'array',

  // Cover image of the manga. Note: The specific mapping depends on the data source.
  coverImage: 'string',

  // Score or rating of the manga.
  score: 'number',

  // The start year of the manga's publication.
  startYear: 'number',

  // URL to the manga's web page.
  url: 'string',

  // Array of authors or contributors to the manga.
  authors: 'array'
}

const refLookupSchema = {
  // Unique identifier for the manga. This field is consistently present across all schemas.
  id: 'string',

  // Primary title of the manga. Always present and important for identification.
  title: 'string',

  // Description or synopsis of the manga. Generally available across different sources.
  desc: 'string',

  // URL to the manga's web page. Important for redirection to the original source.
  url: 'string',

  // URL of the manga's cover image. Essential for visual representation.
  cover: 'string'
}

/**
 * Validate the schema of the agent reference against the schema of the agent.
 * @param {Object} ref - The agent reference schema.
 * @param {Object} schema - The agent schema.
 * @param {string} agentName - The name of the agent.
 * @param {string} schemaName - The name of the schema.
 * @returns {Object} - The validation result.
 */
function validateSchema (ref, schema, agentName, schemaName) {
  if (!ref || !schema || Object.keys(schema).length === 0) {
    return { success: false, errors: ['Reference or schema is undefined'] }
  }
  const referenceSchemaKeys = Object.keys(ref)
  const agentSchemaKeys = Object.keys(schema)
  const errors = []
  referenceSchemaKeys.forEach(key => {
    if (key && !agentSchemaKeys.includes(key)) {
      errors.push(`Key ${key} is missing from agent schema`)
    }
  })

  if (errors.length > 0) {
    logger.warn({ errors }, `Schema ${schemaName} validation failed for ${agentName}`)
  }
  return { success: errors.length === 0, errors }
}

module.exports = {
  validateSchema,
  refMangaSchema,
  refLookupSchema,
  refChapterSchema,
  refPageSchema
}
