import server from '@adonisjs/core/services/server'
import app from '@adonisjs/core/services/app'
import { Exception } from '@adonisjs/core/exceptions'
import { Server, Socket } from 'socket.io'
import { Secret } from '@adonisjs/core/helpers'

// 👇 Імпорт наших потужних контролерів
import ActivitiesController from '#controllers/ws/activities_controller'
import MessagesController from '#controllers/ws/messages_controller'
import UsersController from '#controllers/ws/users_controller'
import ChannelsController from '#controllers/ws/channels_controller'

import User from '#models/user'
import Member from '#models/member'

export interface AuthenticatedSocket extends Socket {
  user?: User
}

class Ws {
  public io: Server | undefined
  private booted = false

  private socketIdToUserId = new Map<string, string>()
  private userIdToSocketId = new Map<string, string>()

  public boot() {
    if (this.booted) return
    this.booted = true

    this.io = new Server(server.getNodeServer(), {
      cors: {
        origin: 'http://localhost:9000',
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
    const rawToken = socket.handshake.auth.token

    if (!rawToken) {
      return next(new Error('Authentication error: Token not provided'))
    }

    if (typeof rawToken !== 'string') {
      return next(new Error('Authentication error: Token must be a string'))
    }

    const pureToken = rawToken.replace('Bearer ', '').trim()

    try {
      const token = await User.accessTokens.verify(new Secret(pureToken))

      if (!token) {
        return next(new Error('Authentication error: Invalid token struct'))
      }

      const user = await User.query()
        .where('id', token.tokenableId as string)
        .preload('setting')
        .first()

      if (!user) {
        return next(new Error('Authentication error: User not found'))
      }

      socket.user = user
      console.log(`[WS AUTH] User authenticated: ${user.id} (${user.nickname})`)

      next()
    } catch (error) {
      console.error('WS authentication failed:', error.message)
      next(new Error('Authentication error: Invalid or expired token'))
    }
  }

  /**
   * 🎛️ ГОЛОВНИЙ ПУЛЬТ КЕРУВАННЯ
   * Тут ми підключаємо контролери до подій
   */
  private async handleConnection(socket: AuthenticatedSocket) {
    const user = socket.user!
    console.log(`Socket connected: ${user.nickname} (ID: ${user.id}, Socket: ${socket.id})`)

    // 1. Ініціалізуємо контролери (Adonis Container сам розрулить залежності)
    const usersController = await app.container.make(UsersController)
    const channelsController = await app.container.make(ChannelsController)
    const messagesController = await app.container.make(MessagesController)
    const activitiesController = await app.container.make(ActivitiesController)

    // Мапінг сокетів для внутрішніх потреб
    this.socketIdToUserId.set(socket.id, user.id)
    this.userIdToSocketId.set(user.id, socket.id)

    // Дії при підключенні (статус онлайн, джойн в кімнати)
    await activitiesController.onConnected(user.id)
    await this.joinUserToChannels(socket, user.id)

    // ==========================================
    // 👤 USERS CONTROLLER (Профіль, налаштування)
    // ==========================================
    socket.on('user:get:public_info', (payload, cb) =>
      usersController.getPublicInfo(socket, payload, cb)
    )
    socket.on('user:get:full_info', (cb) => usersController.getFullInfo(socket, cb))
    socket.on('user:get:channels', (cb) => usersController.listChannels(socket, cb))
    socket.on('user:update:settings', (payload, cb) =>
      usersController.changeSettings(socket, payload, cb)
    )

    // ==========================================
    // 📺 CHANNELS CONTROLLER (Команди каналів)
    // ==========================================
    // /join або /create (якщо не існує)
    socket.on('channel:join', (payload, cb) => channelsController.joinOrCreate(socket, payload, cb))
    // /cancel (leave)
    socket.on('channel:leave', (payload, cb) => channelsController.leave(socket, payload, cb))
    // /quit (delete channel)
    socket.on('channel:delete', (payload, cb) =>
      channelsController.deleteChannel(socket, payload, cb)
    )
    // /invite
    socket.on('channel:invite', (payload, cb) => channelsController.invite(socket, payload, cb))
    // /revoke
    socket.on('channel:revoke', (payload, cb) => channelsController.revoke(socket, payload, cb))
    // /kick (vote or owner kick)
    socket.on('channel:kick', (payload, cb) => channelsController.kick(socket, payload, cb))
    // /list (members)
    socket.on('channel:list_members', (payload, cb) =>
      channelsController.listMembers(socket, payload, cb)
    )

    // ==========================================
    // 💬 MESSAGES CONTROLLER (Чат)
    // ==========================================
    // Відправка повідомлення (з обробкою mentions)
    socket.on('message:send', (payload, cb) => messagesController.sendMessage(socket, payload, cb))
    // Отримання історії (infinite scroll)
    socket.on('message:list', (payload, cb) => messagesController.getMessages(socket, payload, cb))

    // ==========================================
    // ⚡ ACTIVITIES CONTROLLER (Статуси, тайпінг)
    // ==========================================
    socket.on('user:change:status', (payload) =>
      activitiesController.onChangeStatus({ userId: user.id, newStatus: payload.newStatus })
    )
    socket.on('typing:start', (payload) =>
      activitiesController.onTypingStart(socket, payload.channelName)
    ) // Тут краще слати channelId, перевір фронт
    socket.on('typing:stop', (payload) =>
      activitiesController.onTypingStop(socket, payload.channelName)
    )
    socket.on('typing:draft_update', (payload) =>
      activitiesController.onDraftUpdate(socket, payload)
    )

    // ==========================================
    // 🔌 DISCONNECT
    // ==========================================
    socket.on('disconnect', () => {
      const userId = this.socketIdToUserId.get(socket.id)
      if (userId) {
        activitiesController.onDisconnected(userId)
        this.socketIdToUserId.delete(socket.id)
        this.userIdToSocketId.delete(userId)
        console.log(`Socket disconnected: ${user.nickname} (ID: ${userId})`)
      }
    })
  }

  public findSocketByUserId(userId: string): AuthenticatedSocket | undefined {
    const socketId = this.userIdToSocketId.get(userId)
    if (!socketId) return undefined
    return this.io?.sockets.sockets.get(socketId) as AuthenticatedSocket | undefined
  }

  public getIo(): Server {
    if (!this.io) {
      throw new Exception('Socket.IO server not booted.', {
        status: 500,
        code: 'E_WS_NOT_BOOTED',
      })
    }
    return this.io
  }

  private async joinUserToChannels(socket: AuthenticatedSocket, userId: string) {
    const memberships = await Member.query().where('userId', userId).preload('channel')

    memberships.forEach((member) => {
      if (member.channel && !member.isBanned) {
        socket.join(member.channel.id)
      }
    })
  }
}

export default new Ws()
