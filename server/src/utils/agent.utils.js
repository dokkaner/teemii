const fs = require('fs')
const path = require('path')
const axios = require('axios').default
const { logger } = require('../loaders/logger.js')
const uuidv4 = require('uuid').v4
const Anilist = require('anilist-node')
const AniCli = new Anilist()

const langMap = generateLangMap()

function generateLangMap () {
  const langNames = new Intl.DisplayNames(['en'], { type: 'language' })
  const langMap = {}
  for (let i = 0; i < 26; i++) {
    for (let j = 0; j < 26; j++) {
      const code = String.fromCharCode(97 + i) + String.fromCharCode(97 + j)
      const name = langNames.of(code)
      if (name !== code) {
        langMap[name] = code
      }
    }
  }
  const langMap2 = {
    // Avoid using deprecated codes:
    Akan: 'ak',
    Hebrew: 'he',
    Indonesian: 'id',
    Javanese: 'jv',
    Romanian: 'ro',
    Yiddish: 'yi',
    // Optional extras:
    Tagalog: 'tl'
  }
  return { ...langMap, ...langMap2 }
}

const top30Locales = [
  'zh_cn', // Mandari
  'es_es', // Espagnol
  'es_la', // Espagnol Amérique Latine
  'en_us', // Anglais
  'hi_in', // Hindi
  'bn_bd', // Bengali
  'pt_pt', // Portugais
  'pt_br', // Portugais Brésilien
  'ru_ru', // Russe
  'ja_jp', // Japonais
  'pa_pk', // Pendjabi
  'mr_in', // Marathi
  'te_in', // Telugu
  'tr_tr', // Turc
  'ko_kr', // Coréen
  'fr_fr', // Français
  'de_de', // Allemand
  'vi_vn', // Vietnamien
  'ta_in', // Tamoul
  'jv_id', // Javanais
  'it_it', // Italien
  'ar_eg', // Arabe Égyptien
  'gu_in', // Gujarati
  'fa_ir', // Persan
  'bh_in', // Bhojpuri
  'ha_ng', // Haoussa
  'kn_in', // Kannada
  'id_id', // Indonésien
  'zh_cn', // Wu
  'zh_cn', // Min Nan
  'zh_cn', // Hakka
  'zh_cn', // Ji
  'th_th', // Thaï
  'uk_ua' // Ukrainien
]

function convertToLocale (languageCode) {
  const languageToLocaleMap = {
    zh: 'zh_cn',
    es: 'es_es',
    es_la: 'es_la',
    en: 'en_us',
    hi: 'hi_in',
    bn: 'bn_bd',
    pt: 'pt_pt',
    pt_br: 'pt_br',
    ru: 'ru_ru',
    ja: 'ja_jp',
    pa: 'pa_pk',
    mr: 'mr_in',
    te: 'te_in',
    tr: 'tr_tr',
    ko: 'ko_kr',
    fr: 'fr_fr',
    de: 'de_de',
    vi: 'vi_vn',
    ta: 'ta_in',
    jv: 'jv_id',
    it: 'it_it',
    ar: 'ar_eg',
    gu: 'gu_in',
    fa: 'fa_ir',
    bh: 'bh_in',
    ha: 'ha_ng',
    kn: 'kn_in',
    id: 'id_id',
    wu: 'zh_cn',
    mn: 'zh_cn',
    hak: 'zh_cn',
    jin: 'zh_cn',
    th: 'th_th',
    uk: 'uk_ua'
  }
  const langCode = languageCode.replace('-', '_').toLowerCase()
  return languageToLocaleMap[langCode] || null
}

const cleanStr = function (str) {
  let cleanStr = ''
  if (str) {
    const tempStr = str.toString().trim()
    cleanStr = tempStr.replace(/(\r\n|\n|\r)/gm, '')
    cleanStr = cleanStr.replace(/\s+/g, ' ')
    cleanStr = cleanStr.trim()
    return cleanStr
  } else {
    return ''
  }
}

const convertHumanReadableToDate = function (str) {
  const now = new Date()
  const amount = str.match('[0-9]+')[0]
  let publishDate = null
  str = str.toLowerCase()
  try {
    if (str.includes('min')) {
      publishDate = now - (amount * 60 * 1000)
    } else if (str.includes('hour')) {
      publishDate = now - (amount * 60 * 60 * 1000)
    } else if (str.includes('year')) {
      publishDate = now - (amount * 365 * 24 * 60 * 60 * 1000)
    } else if (str.includes('month')) {
      publishDate = now - (amount * 30 * 24 * 60 * 60 * 1000)
    } else if (str.includes('day')) {
      publishDate = now - (amount * 24 * 60 * 60 * 1000)
    }
  } catch (e) {
    logger.error({ err: e }, 'convertHumanReadableToDate error: ' + str)
    return null
  }

  return publishDate
}

const extractTitleNChapter = function (str) {
  let chapter = ''
  let title
  const match = str.match('[0-9,\\.]+')
  if (match) {
    chapter = match[0]
    title = str.replace(chapter, '')
    title = title.replace('Chapter', '')
    title = title.replace('chapter', '')
    title = title.replace(': ', '')

    if (title.length > 0) {
      title = title.trim()
    }
  } else {
    title = str
  }

  return [title, chapter]
}

/**
 * Searches for a user-preferred manga title from AniCli and Mangadex APIs.
 *
 * @param {string} q - The query string for the manga title.
 * @returns {string|null} - Returns the most appropriate alternative title or null.
 */
const userPreferredMangaTitle = async function (q) {
  const contentRating = '&contentRating[]=safe&contentRating[]=suggestive&contentRating[]=erotica&contentRating[]=pornographic'
  const mangadexUrl = `https://api.mangadex.org/manga?title=${encodeURIComponent(q)}&limit=100${contentRating}`

  try {
    const [aniCliResult, mangadexResult] = await Promise.all([
      AniCli.search('manga', q).catch(err => console.error('AniCli search failed:', err)),
      axios.get(mangadexUrl).catch(err => console.error('Mangadex search failed:', err))
    ])

    const altTitleAniCli = aniCliResult?.media?.length > 0 ? aniCliResult.media[0].title.userPreferred : ''
    const altTitleMdex = mangadexResult?.status === 200 && mangadexResult.data.data.length > 0 ? mangadexResult.data.data[0].attributes.title.en : ''

    let altTitle = null
    if (altTitleMdex && altTitleMdex !== q) {
      altTitle = altTitleMdex
    } else if (altTitleAniCli && altTitleAniCli !== q) {
      altTitle = altTitleAniCli
    }

    return altTitle || q
  } catch (error) {
    console.error('Error in fetching manga titles:', error)
    return q
  }
}

function domain (url) {
  let host = ''
  try {
    const urlObject = new URL(url)
    host = urlObject.hostname
  } catch (e) {
    logger.error({ err: e }, 'domain error: ' + url)
  }
  return host
}

const downloadFile = async (fileUrl, downloadFolder, origin, fileName) => {
  logger.trace('downloading file: ' + fileUrl + ' to: ' + downloadFolder + ' .origin: ' + origin)
  let autoOrigin
  if (!origin) {
    autoOrigin = domain(fileUrl)
  } else {
    autoOrigin = origin
  }

  const config = {
    headers: {
      // "User-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/55.0.2883.95 Safari/537.36'",
      'User-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.5112.102 Safari/537.36 Edg/104.0.1293.63',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
      referer: autoOrigin,
      origin: autoOrigin
    }
  }

  const guid = uuidv4()
  const localFilePathTmp = path.join(downloadFolder, guid + '.tmp')
  const localFilePath = path.join(downloadFolder, fileName)

  try {
    const writer = fs.createWriteStream(localFilePathTmp)
    return axios({
      method: 'get',
      url: fileUrl,
      headers: config.headers,
      responseType: 'stream'
    }).then(response => {
      return new Promise((resolve, reject) => {
        response.data.pipe(writer)
        let error = null
        writer.on('error', err => {
          error = err
          writer.close()
          reject(err)
        })
        writer.on('close', () => {
          if (!error) {
            fs.copyFile(localFilePathTmp, localFilePath, fs.constants.COPYFILE_FICLONE, (e) => {
              if (e) {
                logger.trace(localFilePathTmp, 'tmp')
                logger.trace(localFilePath, 'dest')
                logger.error({ err: e }, 'copyFile error')
              } else {
                fs.unlinkSync(localFilePathTmp)
                resolve(true)
              }
            })
          }
        })
      })
    })
  } catch (err) {
    throw new Error(err)
  }
}

module.exports = {
  top30Locales,
  convertToLocale,
  extractTitleNChapter,
  domain,
  userPreferredMangaTitle,
  cleanStr,
  downloadFile,
  convertHumanReadableToDate,
  langMap
}
