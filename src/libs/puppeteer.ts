import puppeteer from 'puppeteer'
import fs from 'fs'

const mainUrl =
  'https://www.tokopedia.com/search?shop_tier=2&page={pageNumber}&q=apotek&st=shop'
const targetPage = 68
/**
 * Ref:
 * https://puppeteer.github.io/puppeteer/docs/puppeteer.page.emulate/
 * https://github.com/puppeteer/puppeteer/blob/main/src/common/DeviceDescriptors.ts
 */
const iPhoneDevice = puppeteer.devices['iPhone 6']

export async function getTargetUrls (): Promise<void> {
  const targetUrls: (string | null)[] = []

  try {
    const browser = await puppeteer.launch({ headless: true }) // default is true

    const page = await browser.newPage()
    await page.setUserAgent(
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/44.0.2403.157 Safari/537.36'
    )

    for (let currentPage = 1; currentPage <= targetPage; currentPage++) {
      const url = mainUrl.replace('{pageNumber}', currentPage.toString())

      await page.goto(url, { waitUntil: 'networkidle2' })
      console.log(`Page ${currentPage} is loaded`)

      // Get all store href
      const urls = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('.css-1tuarat'), (a) =>
          a.getAttribute('href')
        )
      })
      console.log('urls', urls)
      targetUrls.push(...urls)
    }

    await browser.close()

    console.log('targetUrls', targetUrls)

    fs.writeFileSync('urls.json', JSON.stringify(targetUrls))
    console.log('JSON data is saved.')
  } catch (error) {
    console.error(error)
  }
}

export async function getLastOnline (
  url: string,
  storeDetailPage: puppeteer.Page
): Promise<void | string> {
  try {
    console.log('Inspecting', url)
    await storeDetailPage.goto(url, { waitUntil: 'networkidle2' })

    const lastOnline = await storeDetailPage.evaluate(() => {
      const time = document.querySelector('.shop_name .css-dye9e5+ .css-dye9e5')
      return time?.textContent
    })

    console.log('lastOnline', lastOnline)
    if (!lastOnline) return

    return lastOnline
  } catch (error) {
    console.error(error)
  }
}

export async function generateTargetResult (): Promise<void> {
  console.time('generateTargetResult')

  try {
    const rawUrls = fs.readFileSync('urls.json', 'utf-8')
    const urls = JSON.parse(rawUrls.toString()) as string[]

    const browser = await puppeteer.launch({ headless: true }) // default is true
    const storeDetailPage = await browser.newPage()

    await storeDetailPage.setViewport({
      width: 375,
      height: 667,
      isMobile: true
    })
    await storeDetailPage.emulate(iPhoneDevice)
    await storeDetailPage.reload({ waitUntil: 'networkidle2' })
    await storeDetailPage.goto(urls[0], { waitUntil: 'networkidle2' })

    const result: { url: string; lastOnline: string }[] = []
    for (const url of urls) {
      if (!url) continue

      const lastOnline = await getLastOnline(url, storeDetailPage)
      if (!lastOnline) continue

      result.push({ url, lastOnline })
    }

    await browser.close()

    console.log('result', result)

    fs.writeFileSync('urlsResult.json', JSON.stringify(result))
    console.log('JSON data is saved.')

    console.timeEnd('generateTargetResult')
  } catch (error) {
    console.error(error)
  }
}
