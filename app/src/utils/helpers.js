export default {
  Paginator (items, sort, page, perPage) {
    const data = [...items].toSorted((a, b) => {
      const valA = Number(a[sort.fieldName])
      const valB = Number(b[sort.fieldName])

      if (!isNaN(valA) && !isNaN(valB)) {
        return sort.order === 'asc' ? valA - valB : valB - valA
      } else {
        if (sort.order === 'asc') {
          return a[sort.fieldName]?.localeCompare(b[sort.fieldName])
        } else {
          return b[sort.fieldName]?.localeCompare(a[sort.fieldName])
        }
      }
    })

    // paginate the items
    const offset = (page - 1) * perPage
    const paginatedItems = data.slice(offset, offset + perPage)
    const totalPages = Math.ceil(items.length / perPage)

    // return the paginated items
    return {
      data: paginatedItems,
      pagination: {
        totalPages,
        page,
        totalCount: items.length,
        limit: perPage
      }
    }
  },

  formatBytes (bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const dm = decimals < 0 ? 0 : decimals
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
  },

  humanizeNumber (number) {
    if (number < 1000) {
      return number
    }
    const si = ['', 'K', 'M', 'G', 'T', 'P', 'E']
    const exp = Math.floor(Math.log(number) / Math.log(1000))
    const result = number / Math.pow(1000, exp)
    return result.toFixed(1) + si[exp]
  },

  convertDateToHumanReadable (date) {
    if (!date) return ''

    const now = new Date()
    const givenDate = new Date(date)
    const isFuture = givenDate > now
    const diffInSeconds = Math.abs(Math.floor((now - givenDate) / 1000))

    const timeUnits = [
      { unit: 'years', seconds: 31536000 },
      { unit: 'months', seconds: 2592000 },
      { unit: 'days', seconds: 86400 },
      { unit: 'hours', seconds: 3600 },
      { unit: 'minutes', seconds: 60 }
    ]

    for (const { unit, seconds } of timeUnits) {
      const interval = diffInSeconds / seconds
      if (interval > 1) {
        return `${Math.floor(interval)} ${unit} ${isFuture ? 'from now' : 'ago'}`
      }
    }

    return `${diffInSeconds} seconds ${isFuture ? 'from now' : 'ago'}`
  },

  convertDateToLocale (date, withMilliseconds = false) {
    // Define options for the toLocaleString method
    const options = {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      ...(withMilliseconds && { fractionalSecondDigits: 3 }) // Include milliseconds if requested
    }

    // Convert the date to a locale string with the specified options
    const lang = navigator.language
    return new Date(date).toLocaleString(lang, options)
  },

  convertUptimeToHumanReadable (startTime) {
    // convert startTIme to date
    const startDate = new Date(startTime)

    // compute uptime
    const uptime = Date.now() - startDate
    const uptimeInSeconds = Math.floor(uptime / 1000)

    // convert uptime to human-readable format
    const timeUnits = [
      { unit: 'years', seconds: 31536000 },
      { unit: 'months', seconds: 2592000 },
      { unit: 'days', seconds: 86400 },
      { unit: 'hours', seconds: 3600 },
      { unit: 'minutes', seconds: 60 }
    ]

    for (const { unit, seconds } of timeUnits) {
      const interval = uptimeInSeconds / seconds
      if (interval > 1) {
        return `${Math.floor(interval)} ${unit}`
      }
    }
  }
}
