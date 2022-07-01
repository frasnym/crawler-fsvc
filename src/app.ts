import fs from 'fs'
import { envVars } from './config/env-vars'
import { NotionApi } from './libs/notion'
import { TokopediaCrawler } from './libs/puppeteer'
import { ApotekResult } from './types/toped'
;(async () => {
  try {
    // const topedCrawler = new TokopediaCrawler()
    // await topedCrawler.generateTargetUrls()
    // await topedCrawler.generateTargetResult()

    const rawUrls = fs.readFileSync(
      './results/20220628-urlsResult.json',
      'utf-8'
    )
    const results = JSON.parse(rawUrls.toString()) as ApotekResult[]

    const notion = new NotionApi(envVars.notion.accessToken)

    for (const result of results) {
      const resp = await notion.databaseQuery({
        database_id: envVars.notion.databases.tkpApoDatabase,
        filter: {
          property: 'Url',
          url: {
            equals: result.url
          }
        }
      })
      if (!resp) continue

      if (resp.results.length > 0) {
        // update
        continue
      } else {
        // insert
        notion.createPage({
          parent: {
            database_id: envVars.notion.databases.tkpApoDatabase
          },
          properties: {
            Url: { url: result.url },
            'Last Online': {
              rich_text: [
                {
                  type: 'text',
                  text: {
                    content: result.lastOnline || '',
                    link: null
                  }
                }
              ]
            },
            'Updated At': {
              number: Date.now()
            }
          }
        })
      }
    }
  } catch (error) {
    console.error(error)
  }
})()
