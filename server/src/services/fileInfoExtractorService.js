/**
 * Filename Information Extractor for Node.js
 *
 * This module is designed to extract series, volume, chapter, and year information from a filename.
 * It iteratively tests a set of regular expressions for each component to handle various naming conventions.
 * The regular expressions are defined in the constructor.
 */

const path = require('path')
const { extractFileExtension } = require('./osService')

class FileInfoExtractor {
  addChapterPart (value) {
    if (value.includes('.')) {
      return value
    }

    return `${value}.5`
  }

  formatChapterValue (value, hasPart) {
    if (!value.includes('-')) {
      return this.removeLeadingZeroes(hasPart ? this.addChapterPart(value) : value)
    }

    const tokens = value.split('-')
    const from = this.removeLeadingZeroes(tokens[0])
    if (tokens.length !== 2) return from

    const to = this.removeLeadingZeroes(hasPart ? this.addChapterPart(tokens[1]) : tokens[1])
    return `${from}-${to}`
  }

  removeLeadingZeroes (str) {
    return str.replace(/^0+/, '')
  }

  constructor () {
    this.pageRegex = /(?:p|page|pg|pgs|pages)[._]?(\d+)/i
    this.seriesRegexes = [
      '(?<Series>.+?)Том(а?)(\\.?)(\\s|_)?(?<Volume>\\d+(?:(\\-)?\\d+)?)',
      '(?<Series>.+?)(\\s|_)?(?<Volume>\\d+(?:(\\-)?\\d+)?)(\\s|_)Том(а?)',
      '(?<Series>.+?)(?!Том)(?<!Том\\.)\\s\\d+(\\s|_)?(?<Chapter>\\d+(?:\\.\\d+|\\-\\d+)?)(\\s|_)(Глава|глава|Главы|Глава)',
      '(?<Series>.+?)(Глава|глава|Главы|Глава)(\\.?)(\\s|_)?(?<Chapter>\\d+(?:.\\d+|\\-\\d+)?)',
      '(?<Series>.*)(\\b|_|\\-|\\s)(?:sp)\\d',
      '^(?<Series>.*)( |_)Vol\\.?(\\d+|tbd)',
      '(?<Series>.+?)(\\s|_|\\-)+(?:Vol(ume|\\.)?(\\s|_|\\-)+\\d+)(\\s|_|\\-)+(?:(Ch|Chapter|Ch)\\.?)(\\s|_|\\-)+(?<Chapter>\\d+)',
      '(?<Series>.*)(\\b|_)v(?<Volume>\\d+-?\\d*)(\\s|_|\\-)',
      '(?<Series>.*)( - )(?:v|vo|c|chapters)\\d',
      '(?<Series>.*)(?:, Chapter )(?<Chapter>\\d+)',
      '(?<Series>.+?)(\\s|_|\\-)(?!Vol)(\\s|_|\\-)((?:Chapter)|(?:Ch\\.))(\\s|_|\\-)(?<Chapter>\\d+)',
      '(?<Series>.+?):? (\\b|_|\\-)(vol)\\.?(\\s|\\-|_)?\\d+',
      '(?<Series>.+?):?(\\s|\\b|_|\\-)Chapter(\\s|\\b|_|\\-)\\d+(\\s|\\b|_|\\-)(vol)(ume)',
      '(?<Series>.+?):? (\\b|_|\\-)(vol)(ume)',
      '(?<Series>.*)(\\bc\\d+\\b)',
      '(?<Series>.*)(?: _|-|\\[|\\()\\s?vol(ume)?',
      '^(?<Series>(?!Vol).+?)(?:(ch(apter|\\.)(\\b|_|\\-|\\s))|sp)\\d',
      '(?<Series>.*) (\\b|_|\\-)(v|ch\\.?|c|s)\\d+',
      '(?<Series>.*)\\s+(?<Chapter>\\d+)\\s+(?:\\(\\d{4}\\))\\s',
      '(?<Series>.*) (-)?(?<Chapter>\\d+(?:.\\d+|\\-\\d+)?) \\(\\d{4}\\)',
      '(?<Series>.*)(\\s|_)(?:Episode|Ep\\.?)(\\s|_)(?<Chapter>\\d+(?:.\\d+|\\-\\d+)?)',
      '(?<Series>.*)\\(\\d',
      '(?<Series>.*)(\\s|_)\\((c\\s|ch\\s|chapter\\s)',
      '(?<Series>.+?)(\\s|_\\-)+?chapters(\\s|_\\-)+?\\d+(\\s|_\\-)+?',
      '(?<Series>.+?)(\\s|_\\-)+?\\d+(\\s|_\\-)\\(',
      '(?<Series>.*)(v|s)\\d+(-\\d+)?(_|\\s)',
      '(?<Series>.*)(v|s)\\d+(-\\d+)?',
      '(?<Series>.*)(_)(v|vo|c|volume)( |_|)\\d+',
      '(?<Series>.*)( |_)(vol\\d+)?( |_)(?:Chp\\.? ?\\d+)',
      '(?<Series>.*)( |_)(?:Chp.? ?\\d+)',
      '^(?!Vol)(?<Series>.*)( |_)Chapter( |_)(\\d+)',
      '^(?!vol)(?<Series>.*)( |_)(chapters( |_)?)\\d+-?\\d*',
      '^(?!Vol\\.?)(?<Series>.*)( |_|-)(?<!-)(episode|chapter|(ch\\.?) ?)\\d+-?\\d*',
      '^(?!Vol)(?<Series>.*)ch\\d+-?\\d?',
      '(?<Series>.*)( ?- ?)Ch\\.\\d+-?\\d*',
      '^(?!Vol)(?!Chapter)(?<Series>.+?)(-|_|s|#)\\d+(-\\d+)?(권|화|話)',
      '^(?!Vol)(?!Chapter)(?<Series>.+?)(-|_|s|#)\\d+(-\\d+)?',
      '^(?!Vol\\.?)(?!Chapter)(?<Series>.+?)(\\s|_|\\-)(?<!-)(ch|chapter)?\\.?\\d+-?\\d*',
      '^(?!Vol)(?<Series>.*)( |_|-)(ch?)\\d+',
      '(?<Series>.+?)第(?<Volume>\\d+(?:(\\-)\\d+)?)巻'
    ]
    const regexNumber = '(\\d+(\\.\\d+)?)'
    const regexNumberRange = regexNumber + '(\\-|~)' + regexNumber
    this.volumeRegexes = [
      '(?<Series>.*)(\\b|_)v(?<Volume>\\d+-?\\d+)( |_)',
      '(?<Series>.*)(\\b|_)(?!\\[)(vol\\.?)(?<Volume>\\d+(-\\d+)?)(?!\\])',
      '(?<Series>.*)(\\b|_)(?!\\[)v(?<Volume>' + regexNumberRange + ')(?!\\])',
      '(?<Series>.*)(\\b|_)(vol\\.? ?)(?<Volume>\\d+(\\.\\d)?(-\\d+)?(\\.\\d)?)',
      '(vol\\.? ?)(?<Volume>\\d+(\\.\\d)?)',
      '(volume )(?<Volume>\\d+(\\.\\d)?)',
      '(?<Series>.*)(\\b|_|)(S(?<Volume>\\d+))',
      '(vol_)(?<Volume>\\d+(\\.\\d)?)',
      '第(?<Volume>\\d+)(卷|册)',
      '(卷|册)(?<Volume>\\d+)',
      '제?(?<Volume>\\d+(\\.\\d)?)(권|회|화|장)',
      '시즌(?<Volume>\\d+\\-?\\d+)',
      '(?<Volume>\\d+(\\-|~)?\\d+?)시즌',
      '시즌(?<Volume>\\d+(\\-|~)?\\d+?)',
      '(?<Volume>\\d+(?:(\\-)\\d+)?)巻',
      'Том(а?)(\\.?)(\\s|_)?(?<Volume>\\d+(?:(\\-)\\d+)?)',
      '(\\s|_)?(?<Volume>\\d+(?:(\\-)\\d+)?)(\\s|_)Том(а?)'
    ]
    this.chapterRegexes = [
      '(\\b|_)(c|ch)(\\.?\\s?)(?<Chapter>(\\d+(\\.\\d)?)-?(\\d+(\\.\\d)?)?)',
      'v\\d+\\.(\\s|_)(?<Chapter>\\d+(?:.\\d+|\\-\\d+)?)',
      '^(?<Series>.*)(?: |_)#(?<Chapter>\\d+)',
      '^(?!Vol)(?<Series>.*)\\s?(?<!vol\\. )\\sChapter\\s(?<Chapter>\\d+(?:\\.?[\\d-]+)?)',
      '(Глава|глава|Главы|Глава)(\\.?)(\\s|_)?(?<Chapter>\\d+(?:.\\d+|\\-\\d+)?)',
      '^(?<Series>.+?)(?<!Vol)(?<!Vol.)(?<!Volume)\\s(\\d\\s)?(?<Chapter>\\d+(?:\\.\\d+|\\-\\d+)?)(?:\\s\\(\\d{4}\\))?(\\b|_|\\-)',
      '(?<Series>.*)\\sS(?<Volume>\\d+)\\s(?<Chapter>\\d+(?:.\\d+|\\-\\d+)?)',
      '^((?!v|vo|vol|Volume).)*(\\s|_)(?<Chapter>\\.?\\d+(?:.\\d+|\\-\\d+)?)(?<Part>b)?(\\s|_|\\[|\\()',
      'Chapter(?<Chapter>\\d+(-\\d+)?)',
      '(?<Series>.*)(\\s|_)(vol\\d+)?(\\s|_)Chp\\.? ?(?<Chapter>\\d+)',
      '(?<Volume>((vol|volume|v))?(\\s|_)?\\.?\\d+)(\\s|_)(Chp|Chapter)\\.?(\\s|_)?(?<Chapter>\\d+)',
      '第(?<Chapter>\\d+)话',
      '제?(?<Chapter>\\d+\\.?\\d+)(회|화|장)',
      '第?(?<Chapter>\\d+(?:\\.\\d+|\\-\\d+)?)話',
      '(?!Том)(?<!Том\\.)\\s\\d+(\\s|_)?(?<Chapter>\\d+(?:\\.\\d+|\\-\\d+)?)(\\s|_)(Глава|глава|Главы|Глава)'
    ]
    this.yearRegex = /(?:19|20)\d{2}/ // Matches years in the range 1900-2099
    this.editionRegex = '\\b(?:Omnibus(?:\\s?Edition)?|Uncensored)\\b'
  }

  /**
   * Applies a set of regex patterns to a string and returns the first successful match.
   * @param {RegExp[]} patterns Array of regular expressions.
   * @param {string} str The string to be tested.
   * @return {string|null} The matched group or null if no match is found.
   */
  applyRegexPatterns (patterns, str) {
    for (const pattern of patterns) {
      const regex = new RegExp(pattern)
      const match = regex.exec(str)
      if (match?.groups) {
        return match.groups
      }
    }
    return null
  }

  extractVolume (filename) {
    const volumeMatch = this.applyRegexPatterns(this.volumeRegexes, filename)
    return volumeMatch ? volumeMatch.Volume : 'Unknown'
  }

  extractChapter (filename) {
    for (const regex of this.chapterRegexes) {
      const match = filename.match(regex)
      if (match?.groups && match?.groups.Chapter) {
        const chapter = match.groups.Chapter
        const hasPart = match.groups.Part !== undefined
        return this.formatChapterValue(chapter, hasPart)
      }
    }
    return 'Unknown'
  }

  /**
   * Extracts the series name from a filename.
   * @param {string} filename The filename to process.
   * @return {string} The extracted series name or 'Unknown' if not found.
   */
  extractSeries (filename) {
    const seriesMatch = this.applyRegexPatterns(this.seriesRegexes, filename)
    return seriesMatch ? seriesMatch.Series : 'Unknown'
  }

  extractEdition (filename) {
    const editionMatch = filename.match(this.editionRegex)
    return editionMatch ? editionMatch[0] : 'Unknown'
  }

  /**
   * Extracts the year from a filename.
   * @param {string} filename The filename to process.
   * @return {string} The extracted year or 'Unknown' if not found.
   */
  extractYear (filename) {
    const regex = new RegExp(this.yearRegex)
    const yearMatch = regex.exec(filename)
    return yearMatch ? yearMatch[0] : undefined
  }

  extractPageNumber (filename) {
    const pageMatch = filename.match(this.pageRegex)
    return pageMatch ? pageMatch[1] : undefined
  }

  /**
   * Processes a filename and extracts information about the series, volume, chapter, and year.
   * @param {string} filename The filename to process.
   * @return {object} An object containing extracted details.
   */
  extractInfoFromFileName (filename) {
    const extension = '.' + extractFileExtension(filename)
    let baseName = path.basename(filename, extension)
    // replace underscores with spaces
    baseName = baseName.replace(/_/g, ' ')

    const year = Number(this.extractYear(baseName)?.trim())
    const series = this.extractSeries(baseName)?.trim()
    const volume = this.extractVolume(baseName)?.trim()
    const edition = this.extractEdition(baseName)?.trim()

    let chapter = this.extractChapter(baseName)?.trim()
    if (chapter === year.toString()) {
      chapter = 'Unknown' // Avoid misinterpreting the year as a chapter
    }

    const page = Number(this.extractPageNumber(baseName)?.trim())
    return { series, volume, chapter, year, edition, page }
  }
}

module.exports = FileInfoExtractor
