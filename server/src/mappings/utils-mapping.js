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

function extractNewestDate (results, fieldName) {
  let newestDate = null

  for (const manga of results) {
    const value = manga[fieldName]

    if (value) {
      const date = new Date(value)
      if (newestDate === null || date > newestDate) {
        newestDate = date
      }
    }
  }

  return newestDate
}

function extractOldestDate (results, fieldName) {
  let oldestDate = null

  for (const manga of results) {
    const value = manga[fieldName]

    if (value) {
      const date = new Date(value)
      if (oldestDate === null || date < oldestDate) {
        oldestDate = date
      }
    }
  }

  return oldestDate
}

function mergeUniqueKeyValuePairs (results, fieldName) {
  const mergedValues = {}

  for (const manga of results) {
    const value = manga[fieldName]

    if (value) {
      const key = Object.keys(value)[0]
      mergedValues[key] = value[key]
    }
  }

  return mergedValues
}

const mergeValuesWithoutDuplicates = (results, fieldName) => {
  const mergedValues = new Set()

  for (const manga of results) {
    const value = manga[fieldName]
    if (value) {
      if (Array.isArray(value)) {
        value.forEach((v) => mergedValues.add(v))
      } else {
        mergedValues.add(value)
      }
    }
  }

  return Array.from(mergedValues)
}

const aggregateUniqueValues = (results, fieldName) => {
  const uniqueValues = new Set()

  for (const manga of results) {
    const value = manga[fieldName]
    if (value) {
      uniqueValues.add(value)
    }
  }

  return Array.from(uniqueValues)
}

const formatFieldByLanguage = (results, fieldName, languages) => {
  const titlesByLanguages = {}

  for (const manga of results) {
    const titles = manga[fieldName]
    for (const language of languages) {
      if (titles?.[language]) {
        titlesByLanguages[language] = titles[language]
      }
    }
  }

  return titlesByLanguages
}

const getMostFrequentValue = (results, fieldName) => {
  const valueCounts = {}
  let mostFrequentValue = null
  let maxCount = 0

  for (const manga of results) {
    const value = manga[fieldName]
    if (value) {
      valueCounts[value] = (valueCounts[value] || 0) + 1

      if (valueCounts[value] > maxCount) {
        maxCount = valueCounts[value]
        mostFrequentValue = value
      }
    }
  }

  return mostFrequentValue
}

const getHighestNonEmptyValue = (results, fieldName) => {
  let highestValue = -1

  for (const manga of results) {
    const value = manga[fieldName]

    if (value && !isNaN(value) && value > highestValue) {
      highestValue = value
    }
  }

  if (highestValue >= 0) {
    return highestValue
  }

  return null
}

module.exports = {
  // exports all functions
  slugify,
  extractOldestDate,
  extractNewestDate,
  mergeUniqueKeyValuePairs,
  mergeValuesWithoutDuplicates,
  aggregateUniqueValues,
  formatFieldByLanguage,
  getMostFrequentValue,
  getHighestNonEmptyValue
}
