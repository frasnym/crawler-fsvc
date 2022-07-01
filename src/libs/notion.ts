import { Client } from '@notionhq/client'
import {
  CreatePageParameters,
  QueryDatabaseParameters,
  QueryDatabaseResponse,
  UpdateBlockParameters
} from '@notionhq/client/build/src/api-endpoints'
import { logger } from '../config/logger'

export class NotionApi {
  private client: Client

  constructor (accessToken: string) {
    this.client = new Client({ auth: accessToken })
  }

  public async updateBlock (params: UpdateBlockParameters): Promise<void> {
    try {
      await this.client.blocks.update(params)
      logger.info(`[updateBlock-${params.block_id}] success`)
    } catch (error) {
      logger.error(`[updateBlock-${params.block_id}] failed: ${error}`)
    }
  }

  public async createPage (params: CreatePageParameters): Promise<void> {
    try {
      const response = await this.client.pages.create(params)
      logger.info(`[createPage] success: ${response.id}`)
    } catch (error) {
      logger.error(`[createPage] failed: ${error}; payload: ${params}`)
    }
  }

  public async databaseQuery (
    params: QueryDatabaseParameters
  ): Promise<QueryDatabaseResponse | undefined> {
    try {
      const response = await this.client.databases.query(params)
      return response
    } catch (error) {
      logger.error(`[databaseQuery] failed: ${error}; payload: ${params}`)
    }
  }
}
