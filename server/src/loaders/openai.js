const OpenAIApi = require('openai')
const { configManager } = require('../loaders/configManager.js')

class OpenAIsvc {
  #openai = null
  async reload () {
    await this.loadOpenAI()
  }

  async loadOpenAI () {
    try {
      const key = configManager.get('preferences.agentAuth.openai_key', true)
      if (!key) {
        console.warn('OpenAI API key is not set!')
      } else {
        this.#openai = new OpenAIApi.OpenAI({ apiKey: key, timeout: 180000 })
      }
    } catch (error) {
      console.log('OpenAI happen error!')
      console.log(error)
    }
  }

  async ctText (question) {
    try {
      return await this.#openai.chat.completions.create({
        stream: false,
        model: 'gpt-3.5-turbo',
        messages: [{
          role: 'system',
          content: `Your task is to provide good manga/manhwa recommendations based on a user list. 
                    The user will give you a list of their mangas/manhwas, formatted as follows: 
                    [{title, contentRating, [genres]}]. 
                    Analyze these preferences, focusing on genres, themes, and plot elements. 
                    Then, generate a list of high quality suggestions of mixed mangas and manhwas that closely match these aspects and are absent from the user's list.
                    If the user's list includes any Explicit content, ensure at least one of your recommendations is for an audience aged 18+. Provide up to five recommendations in English, 
                    Your response MUST follow this JSON format: 'suggestions': [{title, year, author, description}].`
        }, { role: 'user', content: question }],
        temperature: 0.2
      })
    } catch (error) {
      console.log('OpenAI happen error!')
      console.log(error)
    }
  }
}

const openAISvc = new OpenAIsvc()
module.exports = { openAISvc }
