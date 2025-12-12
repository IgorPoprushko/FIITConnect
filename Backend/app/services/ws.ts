import { UserStatus } from '#enums/user_status'
// import { inject } from '@adonisjs/core'  <-- ❌ Прибираємо inject
import server from '@adonisjs/core/services/server'
import app from '@adonisjs/core/services/app'
import { Exception } from '@adonisjs/core/exceptions'
import { Server, Socket } from 'socket.io'
import { Secret } from '@adonisjs/core/helpers'

import ActivitiesController from '#controllers/ws/activities_controller'
import MessagesController from '#controllers/ws/messages_controller'
import CommandsController from '#controllers/ws/commands_controller'
import User from '#models/user'
import Member from '#models/member'

export interface AuthenticatedSocket extends Socket {
  user?: User
}

// 👇 1. Прибрали "export default" і "@inject()"
class Ws {
  public io: Server | undefined
  private booted = false

  private socketIdToUserId = new Map<string, string>()
  private userIdToSocketId = new Map<string, string>()

  // 👇 2. Робимо boot публічним, щоб викликати його ззовні
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

  private async handleConnection(socket: AuthenticatedSocket) {
    const user = socket.user!
    console.log(`Socket connected: ${user.nickname} (ID: ${user.id}, Socket: ${socket.id})`)

    const activitiesController = await app.container.make(ActivitiesController)
    const messagesController = await app.container.make(MessagesController)
    const commandsController = await app.container.make(CommandsController)

    this.socketIdToUserId.set(socket.id, user.id)
    this.userIdToSocketId.set(user.id, socket.id)

    // Тепер це викличе метод у контролера, а контролер звернеться до цього ж екземпляра Ws
    await activitiesController.onConnected(user.id)
    await this.joinUserToChannels(socket, user.id)

    socket.on('command', (payload: { input: string; channelName: string }) => {
      commandsController.handleCommand(socket, payload)
    })

    socket.on('chat:send', (payload: { channelId: string; content: string }) => {
      messagesController.onNewMessage(socket, {
        channelId: payload.channelId,
        content: payload.content,
      })
    })

    socket.on('chat:join', (payload: { channelId: string }) => {
      socket.join(payload.channelId)
      console.log(`User ${user.nickname} joined room: ${payload.channelId}`)
    })

    socket.on('chat:leave', (payload: { channelId: string }) => {
      socket.leave(payload.channelId)
      console.log(`User ${user.nickname} left room: ${payload.channelId}`)
    })

    socket.on('user:joinChannels', (_, channelIds: string[]) => {
      if (!channelIds?.length) return
      channelIds.forEach((id) => socket.join(id))
      console.log(`User ${user.nickname} mass-joined ${channelIds.length} channels.`)
    })

    socket.on('user:change:status', (payload: { newStatus: UserStatus }) => {
      activitiesController.onChangeStatus({ userId: user.id, newStatus: payload.newStatus })
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

// 👇 3. СТВОРЮЄМО І ЕКСПОРТУЄМО ЄДИНИЙ ЕКЗЕМПЛЯР
export default new Ws()
