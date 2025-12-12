import { UserStatus } from '#enums/user_status'
import { inject } from '@adonisjs/core'
import server from '@adonisjs/core/services/server'
import { Server, Socket } from 'socket.io'
import app from '@adonisjs/core/services/app'
import ActivitiesController from '#controllers/ws/activities_controller'
import MessagesController from '#controllers/ws/messages_controller'
import CommandsController from '#controllers/ws/commands_controller'
import User from '#models/user'
import { Exception } from '@adonisjs/core/exceptions'

// Розширюємо інтерфейс Socket, щоб додати нашого авторизованого користувача
export interface AuthenticatedSocket extends Socket {
  user?: User
}

@inject()
export default class Ws {
  public io: Server | undefined
  private booted = false

  // ВИПРАВЛЕНО: Використовуємо string, оскільки ID у нас UUID
  private socketIdToUserId = new Map<string, string>()
  private userIdToSocketId = new Map<string, string>()

  constructor() {}

  boot() {
    if (this.booted) return
    this.booted = true

    this.io = new Server(server.getNodeServer(), {
      cors: {
        origin: 'http://localhost:9000', // Дозволяємо фронтенд
        methods: ['GET', 'POST'],
        credentials: true,
      },
      path: '/ws',
    })

    this.io.use(this.authenticate.bind(this))
    this.io.on('connection', this.handleConnection.bind(this))

    console.log('WebSocket server booted.')
  }

  private async authenticate(socket: AuthenticatedSocket, next: (err?: Error) => void) {
    const token = socket.handshake.auth.token
    console.info('[WS][auth] incoming', { socket: socket.id, hasToken: Boolean(token) })

    if (!token) {
      return next(new Error('Authentication error: Token not provided'))
    }

    try {
      // ВИПРАВЛЕНО: Casting 'as any' виправляє помилку TS "Property 'use' does not exist".
      // Ми кажемо компілятору довіритися нам, що метод use там є.
      const authManager = (await app.container.make('auth.manager')) as any
      const user = await authManager.use('api').verify(token)

      if (!user) {
        return next(new Error('Authentication error: Invalid token'))
      }

      // Завантажуємо налаштування, щоб мати доступ до статусу
      await user.load('setting')
      socket.user = user
      console.info('[WS][auth] ok', { socket: socket.id, userId: user.id })
      next()
    } catch (error) {
      console.error('Socket authentication failed:', error.message)
      return next(new Error('Authentication error: Invalid token'))
    }
  }

  private async handleConnection(socket: AuthenticatedSocket) {
    const user = socket.user!
    console.log(`Socket connected: ${user.nickname} (ID: ${user.id}, Socket: ${socket.id})`)

    const activitiesController = await app.container.make(ActivitiesController)
    const messagesController = await app.container.make(MessagesController)
    const commandsController = await app.container.make(CommandsController)

    // ВИПРАВЛЕНО: Тепер ми записуємо string у Map
    this.socketIdToUserId.set(socket.id, user.id)
    this.userIdToSocketId.set(user.id, socket.id)

    await activitiesController.onConnected(user.id)

    // ВАЖЛИВО: Приєднуємо користувача до кімнат його каналів, щоб він отримував повідомлення
    await this.joinUserToChannels(socket, user.id)

    socket.on('command', (payload: { input: string; channelName: string }) => {
      commandsController.handleCommand(socket, payload)
    })

    socket.on('user:change:status', (payload: { newStatus: UserStatus }) => {
      activitiesController.onChangeStatus({ userId: user.id, newStatus: payload.newStatus })
    })

    socket.on('message:new', (payload: { channelName: string; content: string }) => {
      messagesController.onNewMessage(socket, payload)
    })

    socket.on('typing:start', (payload: { channelName: string }) => {
      activitiesController.onTypingStart(socket, payload.channelName)
    })

    socket.on('typing:stop', (payload: { channelName: string }) => {
      activitiesController.onTypingStop(socket, payload.channelName)
    })

    socket.on('typing:draft_update', (payload: { channelName: string; draft: string }) => {
      activitiesController.onDraftUpdate(socket, payload)
    })

    socket.on('disconnect', () => {
      // ВИПРАВЛЕНО: Отримуємо string (UUID)
      const userId = this.socketIdToUserId.get(socket.id)
      if (userId) {
        activitiesController.onDisconnected(userId)
        this.socketIdToUserId.delete(socket.id)
        this.userIdToSocketId.delete(userId)
        console.log(`Socket disconnected: ${user.nickname} (ID: ${userId})`)
      }
    })
  }

  // ВИПРАВЛЕНО: Метод тепер приймає string (UUID)
  public findSocketByUserId(userId: string): AuthenticatedSocket | undefined {
    const socketId = this.userIdToSocketId.get(userId)
    if (!socketId) return undefined
    return this.io?.sockets.sockets.get(socketId) as AuthenticatedSocket | undefined
  }

  public getIo(): Server {
    if (!this.io) {
      throw new Exception('Socket.IO server not booted.', { status: 500, code: 'E_WS_NOT_BOOTED' })
    }
    return this.io
  }

  // Допоміжний метод для приєднання до каналів
  private async joinUserToChannels(socket: AuthenticatedSocket, userId: string) {
    // eslint-disable-next-line @unicorn/no-await-expression-member
    const Member = (await import('#models/member')).default
    const memberships = await Member.query().where('userId', userId).preload('channel')

    memberships.forEach((member) => {
      if (member.channel && !member.isBanned) {
        socket.join(member.channel.name)
      }
    })
  }
}
