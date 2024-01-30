const StealthPlugin = require('puppeteer-extra-plugin-stealth')
const AdblockerPlugin = require('puppeteer-extra-plugin-adblocker')
const puppeteer = require('puppeteer-extra')
const genericPool = require('generic-pool')
const { rmdir } = require('../services/osService')
const { logger } = require('../loaders/logger')
const path = require('path')
const fs = require('fs')
const { TEMP_DIR } = require('../loaders/configManager')

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) coc_coc_browser/93.0.148 Chrome/87.0.4280.148 Safari/537.36'

const minimalArgs = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-backgrounding-occluded-windows',
  '--disable-notifications'
]

async function autoScroll (page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let totalHeight = 0
      const distance = 100
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight
        window.scrollBy(0, distance)
        totalHeight += distance

        if (totalHeight >= scrollHeight - window.innerHeight) {
          clearInterval(timer)
          resolve()
        }
      }, 1)
    })
  })
}

class PuppeteerPool {
  destructor () {
    return this.pool.drain().then(() => this.pool.clear())
  }

  constructor (maxBrowsers = 10, minBrowsers = 2) {
    puppeteer.use(AdblockerPlugin())
    puppeteer.use(StealthPlugin())
    const CHROME_PROFILE_PATH = path.join(TEMP_DIR, 'chrome-profile')

    const factory = {
      create: async () => {
        const browser = await puppeteer.launch({
          headless: 'true',
          defaultViewport: null,
          args: minimalArgs,
          userDataDir: CHROME_PROFILE_PATH
        })

        let chromeTmpDataDir = null
        const chromeSpawnArgs = browser.process().spawnargs
        for (const element of chromeSpawnArgs) {
          if (element.startsWith('--user-data-dir=')) {
            chromeTmpDataDir = element.replace('--user-data-dir=', '')
            break
          }
        }
        await browser.newPage()
        browser._chromeTmpDataDir = chromeTmpDataDir
        return browser
      },
      destroy: async (browser) => {
        await browser.close()
        if (browser._chromeTmpDataDir !== null) {
          await rmdir(browser._chromeTmpDataDir)
        }
      }
    }

    this.pool = genericPool.createPool(factory, {
      max: maxBrowsers,
      min: minBrowsers,
      validate: () => Promise.resolve(true)
    })
  }

  async getBrowser () {
    return await this.pool.acquire()
  }

  async releaseBrowser (browser) {
    await this.pool.release(browser)
  }

  async getBody (url, clickOn, AdBlock = false, Intercept = true, textOnly = false, selectorNum = 0) {
    const browser = await this.getBrowser()

    const page = (await browser.pages())[0]

    const requestListener = req => {
      // 'image', 'stylesheet', 'script', 'font'
      if (['script'].indexOf(req.resourceType()) !== -1) {
        req.abort()
      } else {
        req.continue()
      }
    }

    try {
      await page.setUserAgent(USER_AGENT)

      if (Intercept) {
        await page.setRequestInterception(true)
        page.on('request', requestListener)
      } else {
        await page.setJavaScriptEnabled(true)
      }

      await page.goto(url, {
        timeout: 15000,
        waitUntil: 'domcontentloaded',
        referer: 'https://www.google.com/'
      })

      await page.content()
      await new Promise(resolve => setTimeout(resolve, 1000))

      if (clickOn) {
        await autoScroll(page)
        await new Promise(resolve => setTimeout(resolve, 3000))
        const buttons = await page.$$(clickOn)
        if (buttons.length > 0) {
          await buttons[selectorNum].click()
          await new Promise(resolve => setTimeout(resolve, 3000))
        }
      }

      let data
      if (textOnly) {
        data = await page.evaluate(() => document.body.innerText)
      } else {
        data = await page.evaluate(() => document.body.innerHTML)
      }
      return data
    } catch (e) {
      logger.error({ err: e }, 'Error while getting body ' + url)
      return ''
    } finally {
      await page.setRequestInterception(false)
      page.removeListener('request', requestListener)
      await this.releaseBrowser(browser)
    }
  }

  async downloadPage (url, downloadFolder, fileName, referer = '') {
    const localFilePath = path.join(downloadFolder, fileName)
    const browser = await this.getBrowser()
    const page = (await browser.pages())[0]
    const requestListener = req => {
      req.continue()
    }

    const responseListener = async response => {
      const rURL = response.url()
      const rOK = response.ok()
      if (rURL === url && rOK) {
        try {
          const buffer = await response.buffer()
          if (buffer) {
            const stream = fs.createWriteStream(localFilePath)
            stream.write(buffer)
            stream.end()
          } else {
            logger.warn('Empty buffer')
          }
        } catch (e) {
          logger.error({ err: e }, 'Error while handling the response buffer:')
        }
      }
    }

    try {
      page.on('error', e => {
        logger.error({ err: e }, 'error happen at the page')
      })

      page.on('pageerror', e => {
        logger.trace('Puppeteer page error: ' + e.message)
      })

      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36')
      await page.setExtraHTTPHeaders({
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
        Referer: referer || 'https://www.google.com/',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'cross-site',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1'
      })

      await page.setRequestInterception(true)
      page.on('request', requestListener)
      page.on('response', responseListener)

      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 25000
      })
    } catch (e) {
      logger.error({ err: e })
    } finally {
      await page.setRequestInterception(false)
      page.removeListener('request', requestListener)
      page.removeListener('response', responseListener)
      await this.releaseBrowser(browser)
    }
  }
}

const puppet = new PuppeteerPool(10, 6)
module.exports = puppet
