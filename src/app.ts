import { generateTargetResult, generateTargetUrls } from './libs/puppeteer'
;(async () => {
  try {
    await generateTargetUrls()
    await generateTargetResult()
  } catch (error) {
    console.error(error)
  }
})()
