/**
 * Define all of variable available inside of .env file
 */
export interface EnvVars {
  NODE_ENV: string
  IS_STORE_LOCAL: boolean
  PORT: number
  NOTION_ACCESS_TOKEN: string
  BLOCK_TKP_APO_JSON_URL: string
  DATABASE_TKP_APO: string
}
