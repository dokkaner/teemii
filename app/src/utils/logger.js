const isDebug = true
export default {
  error (message, details) {
    if (isDebug) {
      console.error(message, details)
    }
  },

  warn  (message, details) {
    if (isDebug) {
      console.warn(message, details)
    }
  },

  debug (message, details) {
    if (isDebug) {
      console.info(message, details)
    }
  }
}
