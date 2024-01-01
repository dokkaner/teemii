const { logger } = require('../loaders/logger.js')
const { agents } = require('../core/agentsManager')
const { AgentCapabilities } = require('../core/agent')
const { configManager } = require('../loaders/configManager.js')

module.exports = class preferencesService {
  async #checkAndCreatePreference (key, defaultValue) {
    const currentPreference = await this.getUserPreferences(key)
    if (currentPreference.body == null) {
      await this.upsertUserPreferences(key, defaultValue)
    }
  }

  async initializeUserPreferences () {
    try {
      const newPreferences = {}
      const currentPreferences = await this.getUserPreferences('AGENTS')
      let currentsAgents = {}
      if (currentPreferences.body != null) {
        currentsAgents = currentPreferences.body
      }

      for (const agent of agents.internalAgents) {
        newPreferences[agent.id] = {}
        if (currentsAgents[agent.id] == null) {
          for (const cap in AgentCapabilities) {
            const index = Object.keys(AgentCapabilities).indexOf(cap)
            const value = Object.values(AgentCapabilities)[index]
            newPreferences[agent.id][cap] = agent.caps.includes(value) ? 'TRUE' : 'UNAVAILABLE'
          }
        } else {
          newPreferences[agent.id] = currentsAgents[agent.id]
        }
      }

      await this.upsertUserPreferences('AGENTS', newPreferences)

      await this.#checkAndCreatePreference('preferences.agentOptions.excludeGenres', ['hentai', 'smut'])
      await this.#checkAndCreatePreference('preferences.security', {
        login: '',
        password: '',
        enable: false
      })
      await this.#checkAndCreatePreference('preferences.advancedFeatures', {
        waifu2xPath: '/usr/local/bin/waifu2x-ncnn-vulkan-20220728-ubuntu/waifu2x-ncnn-vulkan',
        scale: 2,
        noise: 0,
        imageMagickPath: 'convert',
        enhancedPages: false,
        enhancedAssets: false
      })
      await this.#checkAndCreatePreference('preferences.agentOptions.languages', ['en'])
      await this.#checkAndCreatePreference('preferences.agentAuth.openai_key', '')
      await this.#checkAndCreatePreference('preferences.agentAuth.goodreads_key', '')
      return { success: true, code: 200, body: 'OK' }
    } catch (e) {
      logger.error({ err: e }, 'initializeUserPreferences')
      return { success: false, code: 500, error: e }
    }
  }

  async getAllUserPreferences () {
    try {
      await this.initializeUserPreferences()
      const preferences = await configManager.getAll()
      return { success: true, code: 200, body: preferences }
    } catch (e) {
      logger.error({ err: e }, 'getAllUserPreferences')
      return { success: false, code: 500, error: e }
    }
  }

  async getUserPreferences (name, secret = false) {
    try {
      const preferences = configManager.get(name, secret)
      return { success: true, code: 200, body: preferences }
    } catch (e) {
      logger.error({ err: e }, 'getUserPreferences')
      return { success: false, code: 500, error: e }
    }
  }

  async setUserPreferencesKey (key, value, isSecret = false) {
    try {
      configManager.set(key, value, isSecret)
      await configManager.saveConfig()
      return { success: true, code: 200, body: 'ok' }
    } catch (e) {
      logger.error({ err: e }, 'setUserPreferences')
      return { success: false, code: 500, error: e }
    }
  }

  async upsertUserPreferences (name, newPreferences) {
    try {
      configManager.set(name, newPreferences)
      await configManager.saveConfig()
      return { success: true, code: 200, body: 'ok' }
    } catch (e) {
      logger.error({ err: e }, 'updateUserPreferences')
      return { success: false, code: 500, error: e }
    }
  }

  async getUserPreferencesOrDefault (prefKey, defaultValue) {
    const preferencesResult = await this.getUserPreferences(prefKey)
    return preferencesResult.body ? preferencesResult.body : defaultValue
  }
}
