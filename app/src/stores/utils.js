import libraryAPI from '@/api/library'
import { useUserInterfaceStore } from '@/stores/userInterfaceStore.js'

function convertToHex (rgb) {
  return '#' + rgb.map(x => x.toString(16).padStart(2, '0')).join('')
}

function convertToRGB (hex) {
  const trimmedHex = hex.startsWith('#') ? hex.substring(1) : hex

  const r = parseInt(trimmedHex.substring(0, 2), 16)
  const g = parseInt(trimmedHex.substring(2, 4), 16)
  const b = parseInt(trimmedHex.substring(4, 6), 16)

  return [r, g, b]
}

function secureRandom () {
  const buffer = new Uint32Array(1)
  window.crypto.getRandomValues(buffer)
  return buffer[0] / (0xFFFFFFFF + 1)
}

export default {
  isR18 (rating, genres) {
    const adultGenres = ['hentai', 'smut', 'yaoi', 'yuri', 'lolicon', 'adult', 'josei']

    const isAdultRating = typeof rating === 'string' && rating.toLowerCase() === 'pornographic'

    const hasAdultGenre = Array.isArray(genres) && genres.some(genre =>
      typeof genre === 'string' && adultGenres.includes(genre.toLowerCase())
    )

    return isAdultRating || hasAdultGenre
  },

  shuffleArray (array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(secureRandom() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]]
    }
  },

  generateColor (colorStart, colorEnd, colorCount) {
    // const [cs, ce] = generateRandomComplementaryColors()

    const start = convertToRGB(colorStart)
    const end = convertToRGB(colorEnd)

    const saida = []
    let alpha = 0.0

    for (let i = 0; i < colorCount; i++) {
      alpha += (1.0 / colorCount)
      const c = [
        Math.round(start[0] * alpha + (1 - alpha) * end[0]),
        Math.round(start[1] * alpha + (1 - alpha) * end[1]),
        Math.round(start[2] * alpha + (1 - alpha) * end[2])
      ]
      saida.push(convertToHex(c))
    }

    return saida
  },

  getChapterCoverPage (id, state) {
    return `/api/v1/chapters/${id}/cover?t=${state}`
  },

  getChapterRouterTo (chapter) {
    if (chapter.state === 3) {
      return {
        name: 'Chapter', params: { id: chapter.id, page: (chapter.readProgress * chapter.pages / 100).toFixed(0) }
      }
    } else {
      return { name: null, params: {} }
    }
  },

  async downloadChapter (mangaId, chapterId, sourceId = null) {
    const job = {
      for: 'chapterDownloadQueue',
      options: {
        maxRetries: 1,
        retryInterval: 1000 * 5, // 5 seconds
        timeout: 1000 * 60 * 60 // 1 hour
      },
      payload: {
        id: chapterId,
        source: sourceId,
        parentId: mangaId
      },
      entityId: chapterId
    }

    await libraryAPI.publishCommand(job, 0)
  },

  async deleteManga (mangaId) {
    await libraryAPI.deleteManga(mangaId)
  },

  getMangaCover (id, w, h, type = 'cover', state = 0) {
    return `/api/v1/mangas/${id}/cover?width=${w}&height=${w}&type=${type}&s=${state}`
  },

  getMangaRouterTo (manga) {
    return {
      name: 'Manga', params: { id: manga.id, page: 1 }
    }
  },

  getMangaDescription (manga) {
    const UserInterfaceStore = useUserInterfaceStore()
    const lang = UserInterfaceStore.userLanguage || 'en'
    const description = manga.description || {}
    const matchedDescription = Object.keys(description).find(key => key.startsWith(lang + '_'))

    if (matchedDescription) {
      return description[matchedDescription] || description.en_us || 'No description available.'
    } else {
      return description.en_us || 'No description available.'
    }
  },

  getMangaHREF (manga) {
    return `/mangas/${manga.id}/1`
  },

  getMangaSearchRouterTo (manga) {
    return {
      name: 'Search', params: { q: manga.title || manga.altTitles }
    }
  },

  mapMangaToSlide (manga, variant = 'primary') {
    return {
      id: `${manga.id}`,
      to: { name: 'Manga', params: { id: manga.id, page: 1 } },
      title: manga.canonicalTitle,
      image: `/api/v1/mangas/${manga.id}/cover?width=240&height=360&type=cover&s=${manga.state}`,
      progress: manga.readProgress,
      tags: manga.genres,
      state: parseInt(manga.state),
      variant
    }
  },

  // macro for comparing 2 dates and returning the diff for sorting
  compareDates (a, b, direction = 'asc') {
    const dA = new Date(a)
    const dB = new Date(b)
    return direction === 'asc' ? (dA - dB) : (dB - dA)
  },

  filterBySearchText (manga, searchText) {
    return manga.canonicalTitle.toLowerCase().includes(searchText.toLowerCase())
  },

  filterByYears (manga, years) {
    const [minYear, maxYear] = years
    return manga.startYear >= minYear && manga.startYear <= maxYear
  },

  filterByScores (manga, scores) {
    const [minScore, maxScore] = scores
    const score = manga.score || 0
    return (!minScore || score >= minScore) && (!maxScore || score <= maxScore)
  },

  filterByGenres (manga, genres) {
    return genres.some(genre => manga.genres.includes(genre))
  },

  filterByTypes (manga, types) {
    return types.includes(manga.publicationDemographics)
  },

  sortMangas (mangas, orderByField, orderByDirection) {
    return mangas.sort((a, b) => {
      if (a[orderByField] < b[orderByField]) return orderByDirection === 'asc' ? -1 : 1
      if (a[orderByField] > b[orderByField]) return orderByDirection === 'asc' ? 1 : -1
      return 0
    })
  }
}
