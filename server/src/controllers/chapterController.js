const { getPagination, getPagingData } = require('../services/common')
const services = require('../services/index.js')
module.exports = class ChapterController {
  async getChapters (req, res) {
    const { page, size, sortBy, order } = req.query

    const { limit, offset } = getPagination(page, size)

    const data = await services.library.selectChapters(limit, offset, sortBy, order)
    const response = getPagingData(data, page, limit)

    res.send(response)
  }
}
