import puppeteer from 'puppeteer'
import fs from 'fs'
import { logger } from '../config/logger'
import BBPromise from 'bluebird'
import { envVars } from '../config/env-vars'
import { NotionApi } from './notion'
import { ApotekResult } from '../types/toped'
import {
  FILE_NAME_FOR_URL,
  FILE_NAME_RESULT_FILTERED,
  FILE_NAME_RESULT_RAW
} from '../utils/constant'

export class TokopediaCrawler {
  private defaultUserAgent =
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/44.0.2403.157 Safari/537.36'

  /**
   * Ref:
   * https://puppeteer.github.io/puppeteer/docs/puppeteer.page.emulate/
   * https://github.com/puppeteer/puppeteer/blob/main/src/common/DeviceDescriptors.ts
   */
  private iPhoneDevice = puppeteer.devices['iPhone 6']

  private today = `${new Date().getFullYear()}${String(
    new Date().getMonth() + 1
  ).padStart(2, '0')}${String(new Date().getDate() + 1).padStart(2, '0')}`

  private targetUrlFileName = FILE_NAME_FOR_URL

  public async generateTargetUrls (): Promise<void> {
    const mainUrl =
      'https://www.tokopedia.com/search?shop_tier=2&page={pageNumber}&q=apotek&st=shop'
    const targetUrls: (string | null)[] = [] // result container that will be saved either success or error

    try {
      const browser = await puppeteer.launch({ headless: true })
      const page = await browser.newPage()
      await page.setUserAgent(this.defaultUserAgent)

      let currentPage = 1
      let currentPageResult = 0

      // Create an infinite loop, stop until no result
      do {
        const url = mainUrl.replace('{pageNumber}', currentPage.toString())
        await page.goto(url, { waitUntil: 'networkidle2' })

        // Get all store on the page
        const urls = await page.evaluate(() => {
          return Array.from(document.querySelectorAll('.css-1tuarat'), (a) =>
            a.getAttribute('href')
          )
        })

        currentPageResult = urls.length // update loop handler
        logger.info(
          `Inspecting page ${currentPage}: Got ${currentPageResult} result`
        )

        targetUrls.push(...urls) // save temporary result
        currentPage++ // increase target page number
      } while (currentPageResult > 0)

      await browser.close()
    } catch (error) {
      console.error(error)
      logger.error(error)
    }

    await this.storeResult(
      'url',
      JSON.stringify(targetUrls),
      this.targetUrlFileName
    )
  }

  public async generateTargetResult (): Promise<void> {
    console.time('generateTargetResult')

    // const fileName = `./results/${this.today}-urlsResult.json`
    const tempResultRaw: ApotekResult[] = [] // result container that will be saved either success or error
    const resultFiltered: ApotekResult[] = [] // result container that will be saved either success or error

    try {
      // Read the generated urls from file
      const rawUrls = fs.readFileSync(this.targetUrlFileName, 'utf-8')
      const urls = JSON.parse(rawUrls.toString()) as string[]

      const browser = await puppeteer.launch({ headless: true }) // default is true
      const triggerPage = await browser.newPage()
      await triggerPage.setUserAgent(this.defaultUserAgent)
      await triggerPage.setViewport({ width: 375, height: 667, isMobile: true })
      await triggerPage.emulate(this.iPhoneDevice)
      await triggerPage.goto(urls[0], { waitUntil: 'networkidle0' })
      await triggerPage.reload({ waitUntil: 'networkidle0' })
      await triggerPage.close()

      // Create a promise call with limited concurrency
      const resultRaw = await BBPromise.map(
        urls,
        async (url) => {
          const lastOnline = await this.getLastOnline(url, browser)
          const retVal = { url, lastOnline }

          tempResultRaw.push(retVal) // send temporary result
          if (lastOnline?.toLocaleLowerCase().includes('hari')) {
            resultFiltered.push(retVal)
          }

          return retVal
        },
        { concurrency: 5 }
      )

      await browser.close()

      fs.writeFileSync(FILE_NAME_RESULT_RAW, JSON.stringify(resultRaw))
      fs.writeFileSync(
        FILE_NAME_RESULT_FILTERED,
        JSON.stringify(resultFiltered)
      )
      logger.info('Result is saved.')

      console.timeEnd('generateTargetResult')
    } catch (error) {
      console.error(error)
      logger.error(error)

      fs.writeFileSync(FILE_NAME_RESULT_RAW, JSON.stringify(tempResultRaw))
      logger.info('Result is saved.')
    }
  }

  private async getLastOnline (
    url: string,
    browser: puppeteer.Browser
  ): Promise<string | null> {
    try {
      const detailPage = await browser.newPage()
      await detailPage.setUserAgent(this.defaultUserAgent)
      await detailPage.setViewport({ width: 375, height: 667, isMobile: true })
      await detailPage.emulate(this.iPhoneDevice)
      await detailPage.goto(url, { waitUntil: 'networkidle2' })

      const lastOnline = await detailPage.evaluate(() => {
        const time = document.querySelector(
          '.shop_name .css-dye9e5+ .css-dye9e5'
        )
        return time?.textContent
      })

      logger.info(`Inspecting page ${url}, Result: ${lastOnline}`)

      await detailPage.close() // close tab

      if (!lastOnline) return null
      return lastOnline
    } catch (error) {
      console.error(error)
      logger.error(error)

      return null
    }
  }

  private async storeResult (type: 'url', result: string, fileName: string) {
    if (envVars.isStoreLocal) {
      fs.writeFileSync(fileName, result)
      logger.info('Result is saved locally.')
    }

    const typeMap = {
      url: envVars.notion.blocks.tkpApoJsonUrlId
    }

    const notion = new NotionApi(envVars.notion.accessToken)
    await notion.updateBlock({
      block_id: typeMap[type],
      code: {
        rich_text: [
          {
            text: { content: result }
          }
        ],
        caption: [
          {
            text: {
              content: `Last Updated: ${new Intl.DateTimeFormat('id-ID', {
                dateStyle: 'full',
                timeStyle: 'long'
              }).format(new Date())}`
            }
          }
        ]
      }
    })
  }
}
