import ActivitiesController from '#controllers/ws/activities_controller'
import MessagesController from '#controllers/ws/messages_controller'
import { UserStatus } from '#enums/user_status'
import { inject } from '@adonisjs/core'
import server from '@adonisjs/core/services/server'
import { CreateMessagePayload } from '#contracts/message_repository_contract'
import { Server, Socket } from 'socket.io'

@inject()
export default class Ws {
  io: Server | undefined
  private booted = false

  private socketIdToUserId = new Map<string, string>()

  constructor(
    protected activitiesController: ActivitiesController,
    protected messagesController: MessagesController
  ) {}

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

  private handleConnection(socket: Socket) {
    console.log(`Socket connected: ${socket.id}`)

    socket.on('user:connected', (userId: string) => {
      this.socketIdToUserId.set(socket.id, userId)
      this.activitiesController.onConnected(socket, userId)
    })
    socket.on('user:change:status', (payload: { userId: string; newStatus: UserStatus }) => {
      this.activitiesController.onChangeStatus(socket, payload)
    })

    socket.on('user:disconnected', () => {
      const userId = this.socketIdToUserId.get(socket.id)

      if (userId) {
        this.activitiesController.onDisconnected(socket, userId)
        this.socketIdToUserId.delete(socket.id)
      }
      console.log(`Socket disconnected: ${socket.id}`)
    })

    socket.on(
      'message:join:place',
      (payload: { placeId: string; placeType: 'chat' | 'channel'; userId: string }) => {
        this.messagesController.onJoinPlace(
          socket,
          payload.placeId,
          payload.placeType,
          payload.userId
        )
      }
    )

    socket.on('message:new', (payload: CreateMessagePayload) => {
      this.messagesController.onNewMessage(socket, payload)
    })
  }
}
