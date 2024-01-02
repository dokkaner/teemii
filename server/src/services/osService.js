const path = require('path')
const { exec } = require('child_process')
const fs = require('fs').promises
const fsSync = require('fs')
const readline = require('readline')
const checkDiskSpace = require('check-disk-space').default

/**
 * Reads and returns the first line from the specified file.
 * @param {string} filePath Path to the file.
 * @returns {Promise<>} The first line of the file, or null if the file is empty or an error occurs.
 */
async function readFirstLine (filePath) {
  let stream

  try {
    stream = fsSync.createReadStream(filePath, 'utf8')
    const rl = readline.createInterface({ input: stream })

    const lines = rl[Symbol.asyncIterator]()
    const firstLine = await lines.next()

    if (firstLine.done) {
      return null // Returns null if the file is empty
    }

    return firstLine.value // Returns the first line
  } catch (error) {
    console.error('Error reading the file:', error)
    return null
  } finally {
    if (stream) {
      stream.close()
    }
  }
}
/*
* Adapted from https://github.com/alexbbt/read-last-lines (MIT licenced)
*/

async function readLastLines (inputFilePath, maxLineCount, encoding = 'utf8') {
  const NEW_LINE_CHARACTERS = '\n'

  try {
    const fileHandle = await fs.open(inputFilePath, 'r')
    const stat = await fileHandle.stat()

    if (stat.size === 0) {
      await fileHandle.close()
      return ''
    }

    const bufferSize = Math.min(stat.size, 1024)
    const buffer = Buffer.alloc(bufferSize)
    let lines = ''
    let lineCount = 0
    let position = stat.size

    while (position > 0 && lineCount < maxLineCount) {
      const sizeToRead = Math.min(position, bufferSize)
      position -= sizeToRead
      await fileHandle.read(buffer, 0, sizeToRead, position)
      const chunk = buffer.toString(encoding, 0, sizeToRead)
      const chunkLines = chunk.split(NEW_LINE_CHARACTERS)
      lines = chunkLines[chunkLines.length - 1] + lines
      for (let i = chunkLines.length - 2; i >= 0; i--) {
        lines = chunkLines[i] + NEW_LINE_CHARACTERS + lines
        lineCount++
        if (lineCount === maxLineCount) {
          break
        }
      }
    }

    await fileHandle.close()
    return lines
  } catch (error) {
    throw new Error(`Error reading file: ${error.message}`)
  }
}

/**
 * @description Check if the app is running in a docker container
 * @returns {Promise<unknown>}
 *
 */
function isDocker () {
  return new Promise((resolve) => {
    fs.readFile('/proc/self/cgroup', 'utf8').then((data) => {
      resolve(data.indexOf('docker') !== -1)
    }).catch(() => {
      resolve(false)
    })
  })
}
/**
 * @description Check diskspace
 * @param {*} dir directoryPath - The file/folder path from where we want to know disk space
 * @returns {Promise<{success: boolean, error: *}|{success: boolean, body: *}>}
 */
async function diskSpace (dir) {
  return new Promise((resolve, reject) => {
    const space = checkDiskSpace(dir)

    space
      .then(function (result) {
        const response = { success: true, body: result }
        resolve(response)
      })
      .catch(function (err) {
        const response = { success: false, body: err }
        reject(response)
      })
  })
}

function extractFileExtension (input) {
  if (typeof input !== 'string') {
    throw new TypeError('Input must be a string.')
  }

  const cleanInput = input.split('?')[0]

  let pathname
  try {
    const urlObj = new URL(cleanInput)
    pathname = urlObj.pathname
  } catch (error) {
    pathname = cleanInput
  }

  const extension = path.extname(pathname)
  return extension ? extension.slice(1) : ''
}

function OSFunc () {
  const allowedCommands = ['waifu2x-ncnn-vulkan', 'convert', 'sequelize']

  // Check if the command is allowed. Command must contain one of the allowed commands.
  function isCommandAllowed (command) {
    return allowedCommands.some(allowedCommand => command.includes(allowedCommand))
  }
  /**
   * Executes a shell command in a specified directory.
   *
   * @param {string} cmd - The command to be executed.
   * @param {string} dir - The directory where the command is executed.
   * @returns {Promise<string>} - The output of the command execution.
   */
  this.execCommand = (cmd, dir) => {
    return new Promise((resolve, reject) => {
      if (!cmd || typeof cmd !== 'string') {
        reject(new Error('Command must be a valid string.'))
        return
      }

      if (!isCommandAllowed(cmd)) {
        reject(new Error('Command not allowed'))
        return
      }

      if (dir && typeof dir !== 'string') {
        reject(new Error('Directory must be a valid string.'))
        return
      }

      exec(cmd, { cwd: dir }, (error, stdout, stderr) => {
        if (error) {
          reject(stderr || error)
          return
        }
        resolve(stdout)
      })
    })
  }
}

async function renameFile (oldPath, newPath) {
  await fs.rename(oldPath, newPath)
}

/**
 * Sanitize a string to be used as a directory name.
 *
 * @param {string} input - The input string to sanitize.
 * @param {number} maxLength - The maximum allowed length of the directory name.
 * @returns {string} - The sanitized directory name.
 */
function sanitizeDirectoryName (input, maxLength) {
  // Replace invalid characters with hyphens.
  let sanitized = input.replace(/[/\\?%*:|"<>]/g, '-')

  // Remove periods (.)
  sanitized = sanitized.replace(/\./g, '')

  // Remove leading and trailing spaces.
  sanitized = sanitized.trim()

  // Ensure the directory name is not empty.
  if (sanitized.length === 0) {
    sanitized = 'unnamed'
  }

  // Truncate to maxLength if specified.
  if (maxLength && sanitized.length > maxLength) {
    sanitized = sanitized.slice(0, maxLength)
  }

  // Ensure that the directory name is valid on Windows by removing additional invalid characters.
  // Windows has some additional reserved characters, such as < > : " / \ | ? *.
  sanitized = sanitized.replace(/[<>:"/\\|?*]/g, '-')

  return sanitized
}
/**
 * Attempts to delete a file with a delay in case of access issues.
 * Retries deletion for a specified number of attempts.
 *
 * @param {string} file Path of the file to be deleted.
 * @param {number} [retryDelay=1000] Delay before retrying deletion (in milliseconds).
 * @param {number} [maxRetries=5] Maximum number of retry attempts.
 * @returns {Promise<{ success: boolean, message: string }>} Result of the delete operation.
 */
async function deleteFile (file, retryDelay = 2500, maxRetries = 5) {
  try {
    await fs.access(file)
    return await attemptDeletion(file, retryDelay, maxRetries)
  } catch (error) {
    if (error.code === 'ENOENT') {
      return { success: true, message: `File ${file} does not exist, no need to delete.` }
    }
    return { success: false, message: `deleteFile: An error occurred while accessing file ${file}: ${error.message}` }
  }
}

/**
 * Tries to delete a file and retries with a delay if necessary.
 *
 * @param {string} file Path of the file to be deleted.
 * @param {number} retryDelay Delay before retrying deletion (in milliseconds).
 * @param {number} maxRetries Maximum number of retry attempts.
 * @returns {Promise<{ success: boolean, message: string }>} Result of the delete operation.
 */
async function attemptDeletion (file, retryDelay, maxRetries) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await fs.unlink(file)
      return { success: true, message: `File ${file} was deleted successfully.` }
    } catch (unlinkError) {
      if (unlinkError.code === 'EPERM' && attempt < maxRetries) {
        // back off and retry
        const newDelay = retryDelay * attempt
        await delay(newDelay)
      } else {
        return { success: false, message: unlinkError.message }
      }
    }
  }
  return { success: false, message: `deleteFile: File ${file} could not be deleted after ${maxRetries} attempts.` }
}

/**
 * Delays execution for a specified amount of time.
 *
 * @param {number} ms Number of milliseconds to delay.
 * @returns {Promise<void>} Promise that resolves after the delay.
 */
function delay (ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Asynchronously creates a directory if it does not exist.
 * @param {string} dir - The path to the directory that should be created.
 * @returns {Promise<{success: boolean, message: string, path: string}>} A promise that resolves to an object indicating the result.
 */
async function mkdir (dir) {
  const validDirPath = getValidFilepath(path.resolve(dir))

  try {
    try {
      await fs.access(validDirPath)
      // If the directory access check succeeds, it exists, no need to create.
      return { success: true, message: `Directory ${validDirPath} already exists.`, path: validDirPath }
    } catch (accessError) {
      if (accessError.code === 'ENOENT') {
        // If the directory does not exist, create it.
        await fs.mkdir(validDirPath, { recursive: true })
        return { success: true, message: `Directory ${validDirPath} was created successfully.`, path: validDirPath }
      } else {
        return { success: false, message: accessError.message, path: validDirPath }
      }
    }
  } catch (error) {
    // Return an object indicating failure, the error message, and the intended path.
    return {
      success: false,
      message: `An error occurred while creating directory ${validDirPath}: ${error.message}`,
      path: validDirPath
    }
  }
}

/**
 * Asynchronously removes a directory and its contents if it exists.
 * @param {string} dir - The path to the directory that should be removed.
 * @returns {Promise<{success: boolean, message: string, path: string}>} A promise that resolves to an object indicating the result.
 */
async function rmdir (dir) {
  const validDirPath = getValidFilepath(path.resolve(dir)) // Assume `getValidFilepath` returns a validated directory path.

  try {
    await fs.rm(validDirPath, { recursive: true })
    return { success: true, message: `Directory ${validDirPath} has been removed successfully.`, path: validDirPath }
  } catch (error) {
    // If the error is that the directory does not exist, consider the operation successful.
    if (error.code === 'ENOENT') {
      return {
        success: true,
        message: `Directory ${validDirPath} does not exist. No action needed.`,
        path: validDirPath
      }
    } else {
      return {
        success: false,
        message: `An error occurred while removing directory ${validDirPath}: ${error.message}`,
        path: validDirPath
      }
    }
  }
}

/**
 * Removes the extension from a filename, if present.
 * @param {string} filename - The full name of the file, including the extension.
 * @returns {{filename: string, extension: string}} An object containing the filename without its extension and the extension itself.
 */
function removeExtension (filename) {
  // Check if filename is valid, if not return the original input without modification.
  if (typeof filename !== 'string' || filename.trim() === '') {
    return { filename, extension: '' }
  }

  // Find the last dot in the filename to support multiple dots in filenames.
  const extensionIndex = filename.lastIndexOf('.')

  // Initialize variables for the case where there's no extension.
  let filenameNoExt = filename
  let extension = ''

  // Check if the dot is in a valid position for an extension.
  if (extensionIndex > 0 && extensionIndex !== filename.length - 1) {
    filenameNoExt = filename.substring(0, extensionIndex)
    extension = filename.substring(extensionIndex + 1)
  }

  return { filename: filenameNoExt, extension }
}

/**
 * Sanitizes and formats a file path to be valid for the current platform's file system.
 * @param {string} filepath - The original file path to be sanitized.
 * @returns {string} The sanitized and valid file path.
 */
function getValidFilepath (filepath) {
  // Validate input
  if (typeof filepath !== 'string' || filepath.trim() === '') {
    return ''
  }

  let validPath = filepath.trim()

  // Process Windows file paths
  if (process.platform === 'win32') {
    let drive = ''
    // Check if the path starts with a drive letter
    const regex = /^[A-Za-z]:\\/
    if (regex.exec(validPath)) {
      drive = validPath.substring(0, 3) // Includes the drive letter and ":\\"
      validPath = validPath.substring(3)
    }
    // Replace illegal characters
    validPath = validPath.replace(/[><:*"?/|]/g, '')
    validPath = drive + validPath
  } else {
    // For Unix, Linux, macOS and others: remove only the characters that are not allowed in file names.
    validPath = validPath.replace(/:/g, '')
  }
  // Return the sanitized path
  return validPath
}

/**
 * Generates a unique filename within the specified directory by appending a counter to the filename.
 * @param {Object} params - An object containing the filename and directory.
 * @param {string} params.filename - The original filename.
 * @param {string} params.dir - The directory to check for uniqueness.
 * @returns {Promise<string>} A promise that resolves to a unique filename.
 */
// eslint-disable-next-line no-unused-vars
async function getUniqueFilename ({ filename, dir }) {
  const { filename: filenameNoExt, extension } = removeExtension(filename)

  let newFilename
  let counter = 0
  let alreadyExists = false

  do {
    const newFilenameNoExt = counter ? `${filenameNoExt}(${counter})` : filenameNoExt
    newFilename = extension ? `${newFilenameNoExt}.${extension}` : newFilenameNoExt
    try {
      await fs.stat(path.join(dir, newFilename))
      alreadyExists = true
    } catch (error) {
      if (error.code === 'ENOENT') { // File does not exist
        alreadyExists = false
      } else {
        throw error // Rethrow unexpected errors
      }
    }
    counter++
  } while (alreadyExists)

  return newFilename
}

/**
 * Asynchronously copies a file or directory to a specified destination.
 * @param {string} source - The path of the source file or directory.
 * @param {string} destination - The path of the destination.
 * @returns {Promise<{success: boolean, message: string}>} A promise that resolves to an object indicating the result.
 */
async function copyFileOrDirectory (source, destination) {
  try {
    // Check if the source exists.
    const stats = await fs.stat(source)
    if (stats.isDirectory()) {
      // If the source is a directory, use the recursive option to copy it.
      await fs.cp(source, destination, { recursive: true })
    } else {
      // If the source is a file, use the fs.copyFile method.
      await fs.copyFile(source, destination)
    }
    return { success: true, message: `Successfully copied ${source} to ${destination}.` }
  } catch (error) {
    return { success: false, message: `An error occurred while copying ${source} to ${destination}: ${error.message}` }
  }
}

/**
 * Asynchronously moves a file or directory to a specified destination.
 * @param {string} source - The path of the source file or directory.
 * @param {string} destination - The path of the destination.
 * @returns {Promise<{success: boolean, message: string}>} A promise that resolves to an object indicating the result.
 */
async function moveFileOrDirectory (source, destination) {
  try {
    // Use fs.rename for moving files or directories.
    await fs.rename(source, destination)
    return { success: true, message: `Successfully moved ${source} to ${destination}.` }
  } catch (error) {
    return { success: false, message: `An error occurred while moving ${source} to ${destination}: ${error.message}` }
  }
}

module.exports = {
  readFirstLine,
  readLastLines,
  diskSpace,
  isDocker,
  copyFileOrDirectory,
  moveFileOrDirectory,
  extractFileExtension,
  OSFunc,
  renameFile,
  sanitizeDirectoryName,
  deleteFile,
  mkdir,
  rmdir
}
