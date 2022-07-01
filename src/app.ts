import express, { Application } from 'express'

import fs from 'fs'
import { envVars } from './config/env-vars'
import { NotionApi } from './libs/notion'
import { TokopediaCrawler } from './libs/puppeteer'
import { ApotekResult } from './types/toped'

const app: Application = express()

app.use('v1/tokopedia/generate-url', (_req, res) => {
  const topedCrawler = new TokopediaCrawler()
  topedCrawler.generateTargetUrls()

  res.send('Success generate url')
})

app.use('v1/tokopedia/generate-result', (_req, res) => {
  const topedCrawler = new TokopediaCrawler()
  topedCrawler.generateTargetResult()

  res.send('Success generate result')
})

app.use('v1/tokopedia/save-to-notion', async (_req, res) => {
  const rawUrls = fs.readFileSync('./results/20220628-urlsResult.json', 'utf-8')
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
})

// Exactly base url
app.use(/^[/]{1}$/, (_req, res) => {
  res.send('Crawler furazoo service')
})

export default app
