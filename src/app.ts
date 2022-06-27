import { TokopediaCrawler } from './libs/puppeteer'
;(async () => {
  try {
    const topedCrawler = new TokopediaCrawler()
    await topedCrawler.generateTargetUrls()
    await topedCrawler.generateTargetResult()
  } catch (error) {
    console.error(error)
  }
})()
