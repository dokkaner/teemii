const path = require('path')
const os = require('../../services/osService')
const utils = require('../../utils/agent.utils')
const sharp = require('sharp')
const { logger } = require('../../loaders/logger')
const { AddChaptersToCollection } = require('../../services/chapterCollectionService')
const { configManager } = require('../../loaders/configManager')
const Vibrant = require('node-vibrant')
const { agents } = require('../../core/agentsManager')
const { validateMangaData, mangasToUnified } = require('../../mappings/manga-mapping')
const { orm } = require('../../loaders/sequelize')
const { socketIOLoader } = require('../../loaders/socketio')
const ips = require('../../services/imageProcessingService')
const services = require('../../services')
const EntityJobService = require('../services/EntityJobService')
const { realm } = require('../../loaders/realm')
const Downloader = require('nodejs-file-downloader')

function mergeAndNormalizeDescriptions (existingDescriptions, newDescriptions) {
  const normalizedDescriptions = { ...existingDescriptions }

  Object.keys(newDescriptions).forEach(key => {
    if (key !== 'null') {
      const lowerCaseKey = key.toLowerCase()
      normalizedDescriptions[lowerCaseKey] = newDescriptions[key]
    }
  })

  return normalizedDescriptions
}

function findHighestPriorityUrl (asset, priorities, manga) {
  const result = asset.agents.reduce((acc, agent) => {
    const priority = priorities[agent]
    const urlAgent = manga[`${asset.type}Image`][agent]

    if (urlAgent && priority < acc.currentPriority) {
      return { url: urlAgent, source: agent, currentPriority: priority }
    }

    return acc
  }, { url: null, source: null, currentPriority: Infinity })

  return {
    url: result.url,
    source: result.source
  }
}

/**
 * Downloads an image from a given URL and saves it to the specified path with given dimensions and format.
 * If `replace` is false, it will not download the image if it already exists.
 *
 * @param {object} manga - The manga object to download the image for.
 * @param {string} url - The URL of the image to download.
 * @param {string} origin - The origin of the image to download.
 * @param {string} outputPath - The output path where the image will be saved.
 * @param {Object} dimensions - The dimensions to resize the image to.
 * @param {boolean} getColor - Whether to get the color of the image.
 * @returns {Promise<void>}
 */
async function processImage (manga, url, origin, outputPath, dimensions, getColor = false) {
  if (!url) {
    return
  }

  try {
    const folder = path.dirname(outputPath)
    const filename = path.basename(outputPath)

    // Ensures the target directory exists.
    await os.mkdir(folder)

    // Download the file to a temporary path.
    // get file extension
    const ext = os.extractFileExtension(origin)
    const tempPath = path.join(folder, `${filename}.${ext}`)

    // await utils.downloadFile(url, folder, null, `${filename}.${ext}`)
    let sourceDomain = null
    try {
      sourceDomain = url.startsWith('http') ? utils.domain(url) : null
    } catch (e) {
      logger.info('Failed to parse domain from url')
    }
    const downloader = new Downloader({
      url,
      directory: folder,
      fileName: `${filename}.${ext}`,
      cloneFiles: false,
      maxAttempts: 2,
      headers: {
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
        Referer: sourceDomain || 'https://www.google.com/',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'cross-site',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1'
      }
    })

    await downloader.download()

    const enhancedAssets = configManager.get('preferences.advancedFeatures.enhancedAssets') || false

    if (getColor) {
      const palette = await Vibrant.from(tempPath).getPalette()
      manga.color = palette.Vibrant.hex
    }

    if (enhancedAssets) {
      await ips.processImage(tempPath, ['eh_waifu2x', 'cl_trim'])
    }

    await sharp(tempPath)
      .resize({
        width: dimensions.width,
        height: dimensions.height,
        fit: 'cover',
        position: 'attention'
      })
      .toFormat('webp', { lossless: true })
      .toFile(outputPath + '.webp').then(() => {
        os.deleteFile(tempPath).then(result => logger.trace(result))
      })
  } catch (e) {
    logger.error(e, 'downloadImage')
    throw e
  }
}

function calculateAverageReleaseInterval (chapters, maxSamples = 12) {
  const now = new Date()
  const lastDays = new Date(now.getTime() - (365 * 24 * 60 * 60 * 1000))
  chapters = chapters.filter(c => {
    const createdAt = new Date(c.readableAt || c.publishAt)
    return createdAt > lastDays
  })
  chapters = chapters.sort((a, b) => {
    return (parseInt(a.chapter) < parseInt(b.chapter)) ? 1 : -1
  })
  const max = Math.min(chapters.length, maxSamples)
  const dates = chapters.map(c => c.readableAt || c.publishAt).slice(0, max)

  let totalDays = 0
  const intervals = []

  for (let i = 0; i < dates.length - 1; i++) {
    const date1 = new Date(dates[i])
    const date2 = new Date(dates[i + 1])
    const diffTime = Math.abs(date2 - date1)
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays >= 7) {
      intervals.push(diffDays)
    }
  }

  if (intervals.length === 0) {
    return -1
  }

  intervals.forEach(interval => {
    totalDays += interval
  })

  const averageIntervalDays = Math.round((totalDays / intervals.length) + 1)

  if (averageIntervalDays < 7) {
    return averageIntervalDays
  } else if (averageIntervalDays < 30) {
    return 7
  } else if (averageIntervalDays < 60) {
    return 30
  } else if (averageIntervalDays < 90) {
    return 60
  } else {
    return averageIntervalDays
  }
}

function slugify (str) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 -]/g, ' ')
    .replace(/\s+/g, '-')
    .trim()
    .replace(/-+/g, '-')
}

/**
 * Fetches manga chapters and updates the manga object with relevant information.
 *
 * @param {object} manga - The manga object to fetch chapters for and update.
 */
async function fetchMangaChapters (manga) {
  try {
    const useTeemii = false
    let chapters = null
    // check if we have a teemii id in externalIds
    if (manga.externalIds.teemii && useTeemii) {
      const teemii = await services.agents.getAgentInstance('teemii')
      chapters = await teemii.lookupChaptersByMangaId({ id: manga.externalIds.teemii })
      chapters = await AddChaptersToCollection(manga, null, chapters)
    }

    if (!chapters && (!manga.externalIds.teemii || !useTeemii)) {
      const agentsToSearchChapters = await services.agents.agentsEnabledForCapability('CHAPTER_FETCH')
      chapters = await AddChaptersToCollection(manga, agentsToSearchChapters)
    }

    if (chapters?.length === 0) {
      logger.warn(`No chapters found for Manga ${manga.id}`)
      return
    }

    // if chapterCount is null or 0, set it to chapters.length
    if (manga.chapterCount === null || manga.chapterCount === 0) {
      manga.chapterCount = chapters?.length || 0
    }
    manga.averageReleaseInterval = calculateAverageReleaseInterval(chapters, 20)
    manga.lastRelease = chapters[0].readableAt || chapters[0].publishAt
    if (manga.externalIds.teemii) manga.lastRelease = new Date(manga.lastRelease)
    manga.nextRelease = new Date(manga.lastRelease?.getTime() + (manga.averageReleaseInterval * 24 * 60 * 60 * 1000))
  } catch (error) {
    logger.error('Error fetching manga chapters:', error)
    throw error
  }
}

async function downloadAssets (manga) {
  if (!manga) {
    logger.error('downloadAssets: manga is null')
    return
  }

  const assets = [
    {
      type: 'cover',
      dimensions: { width: 480, height: 720 },
      agents: ['anilist', 'kitsu', 'mangadex', 'bato', 'mangaupdates']
    },
    { type: 'poster', dimensions: { width: 480, height: 720 }, agents: ['mal', 'kitsu', 'mangaupdates'] },
    { type: 'banner', dimensions: { width: 1440, height: 403 }, agents: ['anilist', 'kitsu'] }
  ]

  const rootStorage = configManager.get('storagePath')
  const agentsToExclude = []

  for (const asset of assets) {
    let success = false
    let maxErrors = 0
    while (!success && maxErrors < 3) {
      const priorities = agents.getCoverPriority(agentsToExclude)
      const { url, source } = findHighestPriorityUrl(asset, priorities, manga)

      if (!url) break

      const urlBase64 = Buffer.from(url).toString('base64')
      let proxyUrl = `https://services.f-ck.me/v1/image/${urlBase64}`

      // check if agent allow proxy use
      if (agents.allowProxyImage(source)) {
        proxyUrl = `https://wsrv.nl/?url=https://services.f-ck.me/v1/image/${urlBase64}`
      }

      const imageVPath = path.join(rootStorage, `${asset.type}s`, `${manga.id}`)

      try {
        logger.info('Downloading asset' + asset.type + ' from ' + source + ' for ' + manga.canonicalTitle)
        await processImage(manga, proxyUrl, url, imageVPath, asset.dimensions, (asset.type === 'cover' && !manga.color))
        success = true
      } catch (e) {
        success = false
        maxErrors++
        agentsToExclude.push(source)
        logger.error(e, 'downloadAssets')
      }
    }
  }
}

/**
 * Fetches extra manga data and updates the manga object with relevant information.
 *
 * @param {object} manga - The manga object to fetch extra data for and update.
 * @param {Array} agentsList - The metadata agents to search for manga data.
 * @returns {object} - The updated manga object.
 */
async function fetchExtraMangaData (manga, agentsList) {
  try {
    // Search for extra manga data using specified external agents
    const extManga = await agents.searchMangaByTitleYearAuthors(manga.canonicalTitle, manga.altTitles, manga.startYear, manga.authors, agentsList)

    // Update manga properties with data from external sources
    if (extManga) {
      manga.externalIds.comickfun = extManga.externalIds?.comickfun ?? null
      manga.externalIds.mangapill = extManga.externalIds?.mangapill ?? null
      manga.externalIds.nautiljon = extManga.externalIds?.nautiljon ?? null
      manga.externalIds.mangakakalot = extManga.externalIds?.mangakakalot ?? null
      manga.externalIds.bato = extManga.externalIds?.bato ?? null

      // initialize altTitles if null
      manga.altTitles = manga.altTitles || {}

      manga.titles.fr_fr = extManga.titles?.fr_fr ?? null
      manga.description = mergeAndNormalizeDescriptions(manga.description, extManga.description)
      manga.altTitles.fr = extManga.titles?.fr_fr ?? null
      manga.score = manga.score ?? extManga.score ?? null
      manga.favoritesCount += extManga.favoritesCount
      manga.coverImage.bato = extManga.coverImage?.bato ?? null
    }

    return validateMangaData(manga)
  } catch (e) {
    logger.error({ err: e }, 'Error fetching extra manga data:')
    throw e
  }
}

/**
 * Fetches manga data from various agents and maps it to a unified format.
 *
 * @param {object} externalIds - External IDs for the manga.
 * @param {Array} agentsList - The metadata agents to search for manga data.
 * @returns {object} - The unified manga object.
 */
async function fetchMangaData (externalIds, agentsList) {
  try {
    // Search for manga data using specified agents
    const mangas = await agents.searchManga(externalIds, agentsList)

    // Map the retrieved manga data to a unified format
    return mangasToUnified(mangas)
  } catch (error) {
    console.error('Error fetching manga data:', error)
    throw error
  }
}

/**
 * Creates or updates a manga in the collection based on its slug and start year.
 *
 * @param {string} slug - The slug of the manga.
 * @param {number} year - The year the manga started.
 * @returns {object} - An object containing newId and insertMode.
 */
async function upsertManga (slug, year) {
  try {
    // Check if it already exists in the collection
    const exist = await orm.manga.findOne({ where: { slug, startYear: year } })
    let insertMode = 0
    let newId

    if (exist) {
      // The manga already exists, update insertMode and get its ID
      insertMode = 1
      newId = exist.dataValues.id
    } else {
      // The manga does not exist, create a new entry in the collection
      const temp = await orm.manga.create({
        slug,
        titles: ' ', // for avoid null
        canonicalTitle: slug, // for letter sorting
        chapterNumbersResetOnNewVolume: false,
        startYear: year
      })
      newId = temp.dataValues.id
    }

    // Update the manga's state to indicate it's being processed
    await orm.manga.update({ state: 1 }, { where: { id: newId }, returning: true, plain: true })

    // Emit a notification indicating the manga is being fetched
    socketIOLoader.emit('notification', { title: 'Library', message: `Start fetching ${slug}` })

    // Return an object with newId and insertMode
    return { newId, insertMode }
  } catch (error) {
    console.error('Error creating or updating manga:', error)
    throw error
  }
}

async function teemiiImportOrCreateManga (id) {
  // get teemii agent
  const teemii = await services.agents.getAgentInstance('teemii')
  // get manga from teemii
  return await teemii.getMangaById({ id })
}

async function importOrCreateManga (jobID, title, year, externalIds, trackingInfo, monitor) {
  // instrumentation
  const start = performance.now()
  // end instrumentation

  // check if we have a teemii id in externalIds
  let manga
  if (externalIds.teemii) {
    manga = await teemiiImportOrCreateManga(externalIds.teemii)
  }

  if (!manga) {
    const lookupAgents = await services.agents.agentsEnabledForCapability('MANGA_METADATA_FETCH')
    const metadataAgents = []
    const extraAgents = []

    lookupAgents.forEach(agent => {
      // check if agent ID is in externalIds
      if (externalIds[agent.id] != null) {
        metadataAgents.push(agent.id)
      } else {
        extraAgents.push(agent.id)
      }
    })

    manga = await fetchMangaData(externalIds, metadataAgents)
    await fetchExtraMangaData(manga, extraAgents)
  } else {
    manga.externalIds.teemii = externalIds.teemii
  }

  const slug = `${slugify(manga.canonicalTitle)}-(${year})`
  const meta = await upsertManga(slug, year)
  manga.id = meta.newId
  await EntityJobService.createEntityJob(meta.newId, 'manga', jobID)

  await Promise.all([
    downloadAssets(manga),
    fetchMangaChapters(manga)
  ])

  manga.state = 2
  manga.slug = slug
  if (trackingInfo) manga.scrobblersKey = trackingInfo
  if (monitor) manga.monitor = monitor

  if (meta.insertMode === 0) {
    await orm.manga.upsert(manga, { returning: true, plain: true })
  } else {
    await orm.manga.update(manga, { where: { id: manga.id } }, { returning: true, plain: true })
  }
  await realm.upsertOneManga(manga)

  // instrumentation
  const end = performance.now()
  logger.info(`_________ importOrCreateManga execution time: ${(end - start).toFixed(1)} ms`)
  // end instrumentation
  return { success: true, code: 200, body: manga }
}

module.exports = {
  importOrCreateManga,
  fetchMangaData,
  fetchExtraMangaData,
  fetchMangaChapters,
  downloadAssets
}
