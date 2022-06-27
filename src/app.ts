import { generateTargetResult, getTargetUrls } from './libs/puppeteer'
;(async () => {
  try {
    await getTargetUrls()
    // await generateTargetResult()
  } catch (error) {
    console.error(error)
  }
})()
