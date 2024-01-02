const fs = require('fs').promises
const path = require('path')
const crypto = require('crypto')
const osSvc = require('../services/osService')

const BASE_DIR = process.env.TEEMII_DATA_PATH || '/data'

const CONFIG_DIR = path.join(BASE_DIR, 'conf')
const MEDIAS_DIR = path.join(BASE_DIR, 'medias')
const BACKUP_DIR = path.join(BASE_DIR, 'backups')
const LOGS_DIR = path.join(BASE_DIR, 'logs')
const SQLITE_DIR = path.join(BASE_DIR, 'sqlite')
const TEMP_DIR = path.join(BASE_DIR, 'temp')

const configFilePath = path.join(CONFIG_DIR, 'config.json')

/**
 * Configuration manager class for loading and providing access to application configuration.
 */
class ConfigManager {
  #isLoaded = false
  #secretKey = null

  /**
   * Encrypts a given text using AES-256-GCM algorithm.
   * @param {string} text - The text to encrypt.
   * @returns {string} - The encrypted text in 'iv:encryptedData' format.
   */
  encrypt (text) {
    try {
      const iv = crypto.randomBytes(16)
      const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(this.#secretKey, 'hex'), iv)
      let encrypted = cipher.update(text, 'utf8', 'hex')
      encrypted += cipher.final('hex')
      const authTag = cipher.getAuthTag().toString('hex')
      return iv.toString('hex') + ':' + encrypted + ':' + authTag
    } catch (e) {
      throw new Error('Encryption failed')
    }
  }

  /**
   * Decrypts a given text using AES-256-GCM algorithm.
   * @param {string} text - The text to decrypt in 'iv:encryptedData' format.
   * @returns {Buffer} - The decrypted text.
   */
  #decrypt (text) {
    try {
      const textParts = text.split(':')
      const iv = Buffer.from(textParts.shift(), 'hex')
      const encryptedText = Buffer.from(textParts.shift(), 'hex')
      const authTag = Buffer.from(textParts.shift(), 'hex')
      const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(this.#secretKey, 'hex'), iv)
      decipher.setAuthTag(authTag)
      let decrypted = decipher.update(encryptedText, 'hex', 'utf8')
      decrypted += decipher.final('utf8')
      return decrypted
    } catch (e) {
      throw new Error('Decryption failed')
    }
  }

  /**
   * The constructor for the ConfigManager class.
   *
   * @param {string} configPath - The path to the configuration file.
   */
  constructor (configPath) {
    this.configPath = configPath
    this.config = {}
    this.setupCompleted = false
    this.system = {}
    this.system.platform = process.platform
    this.system.nodeversion = process.version
    this.system.appVersion = require('../../package.json').version
    this.system.isUnixBased = this.system.platform !== 'win32'
    this.system.isDocker = false
    this.system.configPath = configPath
    this.system.startTime = new Date()
    this.system.paths = {
      config: CONFIG_DIR,
      medias: MEDIAS_DIR,
      backup: BACKUP_DIR,
      logs: LOGS_DIR,
      sqlite: SQLITE_DIR
    }

    osSvc.isDocker().then((isDocker) => {
      if (isDocker) {
        this.system.platform += '-docker'
        this.system.isDocker = true
      }
    })
  }

  /**
   * Loads the secret key from a file or generates a new one.
   * @returns {Promise<void>}
   */
  async loadSecretKey () {
    try {
      const secretKeyPath = path.join(CONFIG_DIR, 'secret.key')
      this.#secretKey = await fs.readFile(secretKeyPath, 'utf8')

      if (this.#secretKey.length !== 64) {
        this.#secretKey = crypto.randomBytes(32).toString('hex')
        await this.saveSecretKey()
      }
    } catch (e) {
      this.#secretKey = crypto.randomBytes(32).toString('hex')
      await this.saveSecretKey()
    }
  }

  /**
   * Saves the secret key to a file.
   * @returns {Promise<void>}
   */
  async saveSecretKey () {
    try {
      const secretKeyPath = path.join(CONFIG_DIR, 'secret.key')
      await fs.writeFile(secretKeyPath, this.#secretKey, { encoding: 'utf8', mode: 0o600 })
    } catch (e) {
      throw new Error('Error saving secret key')
    }
  }

  /**
   * Loads the existing configuration from the file.
   *
   * @returns {Promise<void>}
   */
  async #loadExistingConfig () {
    const rawData = await fs.readFile(this.configPath, { encoding: 'utf8' })
    this.config = JSON.parse(rawData)
  }

  /**
   * Gets all configuration values.
   * @returns {Object} - The entire configuration object.
   */
  async getAll () {
    return this.config
  }

  /**
   * Loads the configuration from the file or creates a default configuration if the file does not exist.
   *
   * @returns {Promise<void>}
   */
  async loadConfig () {
    try {
      await this.#loadExistingConfig()
      await this.loadSecretKey()
      this.setupCompleted = true
      this.#isLoaded = true
    } catch (error) {
      this.#isLoaded = false
      if (error.code === 'ENOENT') {
        this.setupCompleted = false
      } else {
        console.error('Error loading configuration. Possible file corruption:', error)
        throw error
      }
    }
  }

  /**
   * Gets a configuration value by key, supporting nested keys.
   *
   * @param {string} key - The configuration key (supports "dot" notation for nested keys).
   * @param {boolean} secret - Whether the value is expected to be encrypted.
   * @param {boolean} bypassIsLoaded - Whether to bypass the isLoaded check.
   * @returns {*}
   */
  get (key, secret = false, bypassIsLoaded = false) {
    if (!this.#isLoaded && !bypassIsLoaded) {
      return undefined
    }

    const keys = key.split('.')
    let result = this.config
    for (const k of keys) {
      if (result[k] === undefined) {
        return undefined // or a default value, if you prefer
      }
      result = result[k]
    }

    if (secret) {
      const regex = /^[0-9a-f]{32}:[0-9a-f]+:[0-9a-f]+$/i
      if (typeof result === 'string' && regex.exec(result)) {
        return this.#decrypt(result)
      } else {
        return null
      }
    }
    return result
  }

  /**
   * Sets a configuration value by key, supporting nested keys.
   *
   * @param {string} key - The configuration key (supports "dot" notation for nested keys).
   * @param {*} value - The value to set.
   * @param {boolean} secret - Whether the value is expected to be encrypted.
   */
  set (key, value, secret = false) {
    const keys = key.split('.')
    let obj = this.config

    // validate the key format
    const keyRegex = /^[a-zA-Z0-9_-]+$/
    for (const k of keys) {
      if (!keyRegex.test(k)) {
        throw new Error(`Invalid configuration key format: ${k}`)
      }
    }

    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i]

      if (!obj[k]) {
        obj[k] = {} // create a new object if the key doesn't exist
      }
      obj = obj[k]
    }

    const lastKey = keys[keys.length - 1]
    // check for possible pollution
    const pollution = (key === '__proto__' || key === 'constructor')
    if (pollution) {
      throw new Error(`Invalid configuration key: ${key}`)
    }
    if (secret) {
      // check if the value is already encrypted. use regex matching
      const regex = /^[0-9a-f]{32}:[0-9a-f]+:[0-9a-f]+$/i
      if (typeof value === 'string' && regex.exec(value)) {
        // already encrypted, just set it
        obj[lastKey] = value
      } else {
        obj[lastKey] = this.encrypt(value)
      }
    } else {
      obj[lastKey] = value
    }
  }

  setSetupCompleted (value) {
    this.setupCompleted = value
  }

  /**
   * Saves the current configuration to the file.
   *
   * @returns {Promise<void>}
   */
  async saveConfig () {
    try {
      await fs.writeFile(this.configPath, JSON.stringify(this.config, null, 2))
      this.#isLoaded = true
    } catch (e) {
      throw new Error('Error saving configuration')
    }
  }

  /**
   * Gets the secret key.
   * @returns {string|null} - The secret key.
   */
  getSecretKey () {
    return this.#secretKey
  }
}

const configManager = new ConfigManager(configFilePath)

module.exports = {
  configManager,
  CONFIG_DIR,
  MEDIAS_DIR,
  BACKUP_DIR,
  LOGS_DIR,
  SQLITE_DIR,
  TEMP_DIR
}
