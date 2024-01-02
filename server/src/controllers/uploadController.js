const { logger } = require('../loaders/logger')
const FileInfoExtractor = require('../services/fileInfoExtractorService')
const { Job } = require('../libra/jobs/Job')
const { v4: uuidv4 } = require('uuid')
const queueManager = require('../libra/queues/QueueManager')
const path = require('path')
const { mkdir } = require('../services/osService')
const { TEMP_DIR } = require('../loaders/configManager')
module.exports = class UploadController {
  /**
   * Handle requests to parse file information.
   *
   * @param {object} req - The request object containing the file name.
   * @param {object} res - The response object to send the parsed file information.
   */
  async parseFilesInfo (req, res) {
    try {
      const file = req.query.file

      // Validate if the file name is provided
      if (!file) {
        return res.status(400).json({ message: 'File name is required' })
      }

      const extractor = new FileInfoExtractor()
      const info = extractor.extractInfoFromFileName(file)

      res.status(200).json(info)
    } catch (e) {
      logger.error({ err: e }, 'Error in getOnePage Controller')
      res.status(500).json({ message: 'Internal server error' })
    }
  }

  /**
   * Handle requests to upload files and enqueue them for processing.
   *
   * @param {object} req - The request object containing the file and manga data.
   * @param {object} res - The response object to confirm the upload.
   */
  async uploadFiles (req, res) {
    try {
      if (!req.files?.file) {
        return res.status(400).send('No files were uploaded.')
      }

      const file = req.files.file
      const manga = JSON.parse(req.body.manga)

      await mkdir(TEMP_DIR)

      const fileName = path.basename(file.name)
      const filePath = path.join(TEMP_DIR, fileName)
      await file.mv(filePath)

      const JobData = {
        for: 'cbxImportQueue',
        options: {
          maxRetries: 1,
          retryInterval: 1000 * 5, // 5 seconds
          timeout: 1000 * 60 * 30 // 30 minutes
        },
        payload: {
          file: filePath,
          title: manga.title,
          year: manga.year,
          externalIds: manga.externalIds
        },
        entityId: null
      }
      const options = JobData.options
      const job = new Job(uuidv4(), JobData, options?.maxRetries || 3, options?.retryInterval || 5000,
        options?.timeout || 60 * 1000)
      await job.initialize()

      const queue = queueManager.getQueue(JobData.for)
      await queue.addJob(job)

      res.status(200).json({ success: true, message: 'File uploaded!' })
    } catch (e) {
      logger.error({ err: e }, 'Error in getOnePage Controller')
      res.status(500).json({ message: 'Internal server error' })
    }
  }
}
