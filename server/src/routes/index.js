const apiV1 = require('./v1')
const apiV2 = require('./v2')

const routes = (app) => {
  app.use('/api/v2/', apiV2)
  app.use('/api/v1/', apiV1)
}

module.exports = routes
