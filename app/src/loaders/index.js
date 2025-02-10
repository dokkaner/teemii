export function initializeLogging (app, config) {
  if (config.debug) {
    app.config.errorHandler = (err, vm, info) => {
      console.error('Vue Error:', err)
      console.error('Component:', vm)
      console.error('Info:', info)
    }

    app.config.warnHandler = (msg, vm, trace) => {
      console.warn('Vue Warning:', msg)
      console.warn('Component:', vm)
      console.warn('Trace:', trace)
    }
  }
}
