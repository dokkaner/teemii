const fs = require('fs')
const path = require('path')
const sharp = require('sharp')
const { logger } = require('../loaders/logger')
const EventEmitter = require('events')
const os = require('./osService')
const { configManager } = require('../loaders/configManager')

async function autoEnhance (input) {
  const directory = path.dirname(input)

  // get full path to directory
  const fullPath = path.resolve(directory)
  // get image full path
  const imageFullPath = path.resolve(input)

  const execPath = configManager.get('preferences.advancedFeatures.imageMagickPath')
  if (!execPath) {
    logger.warn('autoEnhance: ImageMagick path is not set.')
    return
  }
  const command = `${execPath} "${imageFullPath}" "-auto-gamma"  "-auto-level" "-normalize" "${imageFullPath}"`

  const OS = new os.OSFunc()
  await OS.execCommand(command, fullPath)
}

async function fuzzTrim (input) {
  const directory = path.dirname(input)

  // get full path to directory
  const fullPath = path.resolve(directory)
  // get image full path
  const imageFullPath = path.resolve(input)

  const execPath = configManager.get('preferences.advancedFeatures.imageMagickPath')
  if (!execPath) {
    logger.warn('autoEnhance: ImageMagick path is not set.')
    return
  }
  const command = `${execPath} "${imageFullPath}" "-fuzz" "30%" "-trim" "${imageFullPath}"`

  const OS = new os.OSFunc()
  await OS.execCommand(command, fullPath)
}

async function waifu2x (input) {
  const directory = path.dirname(input)
  const fileName = path.basename(input)

  // https://github.com/nihui/waifu2x-ncnn-vulkan
  const execPath = configManager.get('preferences.advancedFeatures.waifu2xPath')
  if (!execPath) {
    logger.warn('autoEnhance: waifu2xPath path is not set.')
    return
  }
  const command = `${execPath} -i ${fileName} -o ${fileName} -n 3 -s 2`

  const OS = new os.OSFunc()
  await OS.execCommand(command, directory)
}

async function downscale2x (input) {
  const tempFile = input + '.sharp'
  const image = sharp(input)
  const metadata = await image.metadata()
  const width = metadata.width
  const height = metadata.height
  const resizedWidth = Math.floor(width * 0.5)
  const resizedHeight = Math.floor(height * 0.5)
  try {
    await image.resize(resizedWidth, resizedHeight, { kernel: sharp.kernel.cubic }).toFile(tempFile)
    await fs.promises.rename(tempFile, input)
  } catch (e) {
    logger.error({ input, e }, 'Failed to downscale image')
  }
}

async function toWebp (input) {
  const ext = '.' + os.extractFileExtension(input)
  const output = input.replace(ext, '.webp')

  try {
    let image = await sharp(input).toBuffer()
    const stream = fs.createWriteStream(output)
    stream.write(await sharp(image.buffer).webp({ lossless: true }).toBuffer())
    await new Promise((resolve) => stream.end(resolve))
    // close the stream
    stream.close()
    // free image buffer
    image.buffer = null
    // free image object
    image = null
    return output
  } catch (e) {
    logger.error({ input, e }, 'Failed to convert image to webp')
    return input
  }
}

//
class ImageProcessingService extends EventEmitter {
  /**
   * Processes an image based on a series of commands.
   *
   * @param {string} fileInput Path to the input file.
   * @param {Array<string>} commands Array of commands to execute.
   * commands can be:
   * - eh_auto: auto contrast level
   * - cl_trim: trim the image
   * - eh_waifu2x: convert to webp
   * - cv_webp: convert to webp
   * - ex_downscale2x: downscale the image
   * @returns {Promise<string>} Path to the output file.
   */
  async processImage (fileInput, commands) {
    // make sure commands is an array and each command is unique
    commands = commands || []
    commands = [...new Set(commands)].sort(
      (a, b) => a.localeCompare(b)
    )

    // check if file exists
    if (!fs.existsSync(fileInput)) {
      logger.error('autoEnhance: File does not exist.')
    }

    try {
      // process commands
      for (const command of commands) {
        switch (command) {
          case 'cl_trim':
            await fuzzTrim(fileInput)
            break
          case 'eh_waifu2x':
            await waifu2x(fileInput)
            break
          case 'eh_auto':
            await autoEnhance(fileInput)
            break
          case 'ex_downscale2x':
            await downscale2x(fileInput)
            break
        }
      }
    } catch (e) {
      logger.error({ e }, 'Failed to process image')
    }

    let outputFilename = fileInput
    // apply file conversion at the end if needed
    if (commands.includes('cv_webp')) {
      outputFilename = await toWebp(fileInput)
      if (outputFilename !== fileInput) {
        os.deleteFile(fileInput).then(result => logger.trace(result))
      }
    }
    return outputFilename
  }
}

const ips = new ImageProcessingService()
module.exports = ips
