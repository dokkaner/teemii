const express = require('express')
const { createServer } = require('http')
const { Server } = require('socket.io')
const { logger } = require('./logger')
const cors = require('cors')

class SocketIOLoader {
  constructor () {
    this.app = express()
    this.app.use(cors())
  }

  emit (event, data) {
    this.io.compress(true).emit(event, data)
  }

  get socket () {
    return this.io
  }

  initialize () {
    logger.info({ cors: process.env.CORS_ORIGIN }, 'SocketIOLoader: initializing')
    this.httpServer = createServer(this.app)
    this.io = new Server(this.httpServer, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      }
    })

    this.io.on('connection', (socket) => {
      logger.trace('SocketIO: connection')
      socket.on('disconnect', () => {
        logger.trace('client disconnected')
      })
    })

    const PORT = process.env.SOCKET_IO_PORT
    try {
      this.httpServer.listen(PORT, '0.0.0.0', () => {
        logger.info(`Socket.io server listening on port ${PORT}`)
      })
    } catch (e) {
      logger.error({ err: e })
    }
  }
}

const socketIOLoader = new SocketIOLoader()

module.exports = { socketIOLoader }
