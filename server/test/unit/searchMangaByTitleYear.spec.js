const { expect } = require('chai')
const sinon = require('sinon')
const { agents } = require('../../src/core/agentsManager')

describe('AgentsClass', function () {
  describe('#searchMangaByTitleYear', function () {
    this.timeout(15000)
    let sandbox

    beforeEach(function () {
      // Set up the sandbox for Sinon
      sandbox = sinon.createSandbox()
    })

    afterEach(function () {
      // Restore the sandbox to make sure we do not affect other tests
      sandbox.restore()
    })

    it('should return a unified object when results are found', async function () {
      const result = await agents.searchMangaByTitleYearAuthors('dragon ball', [], 1984, null, ['mangadex'])
      expect(result).to.be.an('object')
    })

    // ...
  })
})
