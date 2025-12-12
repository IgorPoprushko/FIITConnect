import { UserStatus } from '#enums/user_status'
import { inject } from '@adonisjs/core'
import server from '@adonisjs/core/services/server'
import { CreateMessagePayload } from '#contracts/message_repository_contract'
import { Server, Socket } from 'socket.io'
import app from '@adonisjs/core/services/app'
import ActivitiesController from '#controllers/ws/activities_controller'
import MessagesController from '#controllers/ws/messages_controller'

@inject()
export default class Ws {
  io: Server | undefined
  private booted = false

  private socketIdToUserId = new Map<string, string>()

  constructor() {}

  boot() {
    if (this.booted) return
    this.booted = true

    this.io = new Server(server.getNodeServer(), {
      cors: {
        origin: 'http://localhost:9000',
      },
    })

    this.io.on('connection', this.handleConnection.bind(this))
  }

  private async handleConnection(socket: Socket) {
    console.log(`Socket connected: ${socket.id}`)
    const activitiesController = await app.container.make(ActivitiesController)
    const messagesController = await app.container.make(MessagesController)

    socket.on('user:connected', (userId: string) => {
      this.socketIdToUserId.set(socket.id, userId)
      activitiesController.onConnected(userId)
    })
    socket.on('user:change:status', (payload: { userId: string; newStatus: UserStatus }) => {
      activitiesController.onChangeStatus(payload)
    })

    socket.on('user:disconnected', () => {
      const userId = this.socketIdToUserId.get(socket.id)

      if (userId) {
        activitiesController.onDisconnected(userId)
        this.socketIdToUserId.delete(socket.id)
      }
      console.log(`Socket disconnected: ${socket.id}`)
    })

    socket.on('message:new', (payload: CreateMessagePayload) => {
      messagesController.onNewMessage(socket, payload)
    })
  }
}
