import app from '@adonisjs/core/services/app'
import { Server } from 'socket.io'
import server from '@adonisjs/core/services/server'

app.ready(() => {
  const io = new Server(server.getNodeServer(), {
    cors: {
      origin: 'http://localhost:9000',
    },
  })
  io?.on('connection', (socket) => {
    console.log('A new connection', socket.id, socket.handshake.headers['user-agent'])
    // Server send message to client who just connected
    socket.emit('server', { msg: 'Welcome to AdonisJS Socket.io server!' })
    socket.on('frontend', (data) => {
      console.log('Message from frontend:', data)
      socket.emit('server', { msg: 'Message received loud and clear!' })
    })
  })
})
