import dotenv from 'dotenv'
import path from 'path'
import Joi from 'joi'
import { EnvVars } from '../types/rest-api'

dotenv.config({ path: path.join(__dirname, '../../.env') })

const envVarsSchema = Joi.object({
  NODE_ENV: Joi.string().valid('production', 'development', 'test').required(),
  IS_STORE_LOCAL: Joi.bool().default(false),
  PORT: Joi.number().default(3000),
  NOTION_ACCESS_TOKEN: Joi.string().required(),
  BLOCK_TKP_APO_JSON_URL: Joi.string().required(),
  DATABASE_TKP_APO: Joi.string().required()
}).unknown()

const { value, error } = envVarsSchema.validate(process.env)
if (error) {
  throw new Error(`Environment validation error: ${error.message}`)
}

const envVarsMap: EnvVars = value
const envVars = {
  env: envVarsMap.NODE_ENV,
  isStoreLocal: envVarsMap.IS_STORE_LOCAL,
  port: envVarsMap.PORT,
  notion: {
    accessToken: envVarsMap.NOTION_ACCESS_TOKEN,
    blocks: {
      tkpApoJsonUrlId: envVarsMap.BLOCK_TKP_APO_JSON_URL
    },
    databases: {
      tkpApoDatabase: envVarsMap.DATABASE_TKP_APO
    }
  }
}

export { envVars }
