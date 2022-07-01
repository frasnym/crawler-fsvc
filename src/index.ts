import { Server } from 'http'
import { envVars } from './config/env-vars'
import { logger } from './config/logger'
import app from './app'

const server: Server = app.listen(envVars.port, () =>
  logger.info(`Application is up and running on port ${envVars.port}`)
)

const exitHandler = () => {
  if (server) {
    server.close(() => {
      logger.info('Server closed')
      process.exit(1)
    })
  } else {
    process.exit(1)
  }
}

const unexpectedErrorHandler = (error: Error) => {
  logger.error(error)
  exitHandler()
}

process.on('uncaughtException', unexpectedErrorHandler)
process.on('unhandledRejection', unexpectedErrorHandler)

process.on('SIGTERM', () => {
  logger.info('SIGTERM received')
  if (server) {
    server.close()
  }
})
