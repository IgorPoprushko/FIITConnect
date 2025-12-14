// backend/app/services/Ws.ts

import server from '@adonisjs/core/services/server'
import app from '@adonisjs/core/services/app'
import { Exception } from '@adonisjs/core/exceptions'
import { Server, Socket } from 'socket.io'
import { Secret } from '@adonisjs/core/helpers'
import ActivitiesController from '#controllers/ws/activities_controller'
import MessagesController from '#controllers/ws/messages_controller'
import UsersController from '#controllers/ws/users_controller'
import ChannelsController from '#controllers/ws/channels_controller'

import User from '#models/user'
import Member from '#models/member'

import type {
  JoinChannelPayload,
  ChannelActionPayload,
  ManageMemberPayload,
} from '#contracts/channel_contracts'
import { UserStatus } from '#enums/global_enums'
import type { UpdateSettingsPayload, UpdateProfilePayload } from '#contracts/user_contracts'
import type { GetMessagesPayload, SendMessagePayload } from '#contracts/message_contracts'

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
        origin: ['http://localhost:9000', 'http://10.78.101.15:9000'],
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

    const usersController = await app.container.make(UsersController)
    const channelsController = await app.container.make(ChannelsController)
    const messagesController = await app.container.make(MessagesController)
    const activitiesController = await app.container.make(ActivitiesController)

    this.socketIdToUserId.set(socket.id, user.id)
    this.userIdToSocketId.set(user.id, socket.id)

    console.log('[WS DEBUG] Registering all socket commands...')

    socket.on('user:get:public_info', (payload, cb) =>
      usersController.getPublicInfo(socket, payload, cb)
    )

    socket.on('user:get:full_info', (arg1, arg2) => {
      const cb = typeof arg1 === 'function' ? arg1 : arg2
      return usersController.getFullInfo(socket, cb)
    })

    socket.on('user:get:channels', (arg1, arg2) => {
      const cb = typeof arg1 === 'function' ? arg1 : arg2
      return usersController.listChannels(socket, cb)
    })

    socket.on('user:update:settings', (payload: UpdateSettingsPayload, cb) =>
      usersController.updateSettings(socket, payload, cb)
    )

    socket.on('user:update:profile', (payload: UpdateProfilePayload, cb) =>
      usersController.updateProfile(socket, payload, cb)
    )

    socket.on('channel:join', (payload: JoinChannelPayload, cb) =>
      channelsController.joinOrCreate(socket, payload, cb)
    )
    socket.on('channel:leave', (payload: ChannelActionPayload, cb) =>
      channelsController.leave(socket, payload, cb)
    )
    socket.on('channel:delete', (payload: ChannelActionPayload, cb) =>
      channelsController.deleteChannel(socket, payload, cb)
    )
    socket.on('channel:invite', (payload: ManageMemberPayload, cb) =>
      channelsController.invite(socket, payload, cb)
    )
    socket.on('channel:revoke', (payload: ManageMemberPayload, cb) =>
      channelsController.revoke(socket, payload, cb)
    )
    socket.on('channel:kick', (payload: ManageMemberPayload, cb) =>
      channelsController.kick(socket, payload, cb)
    )
    socket.on('channel:vote', (payload: ManageMemberPayload, cb) =>
      channelsController.vote(socket, payload, cb)
    )
    socket.on('channel:list_members', (payload: ChannelActionPayload, cb) =>
      channelsController.listMembers(socket, payload, cb)
    )

    socket.on('message:send', (payload: SendMessagePayload, cb) =>
      messagesController.sendMessage(socket, payload, cb)
    )
    socket.on('message:list', (payload: GetMessagesPayload, cb) =>
      messagesController.getMessages(socket, payload, cb)
    )
    socket.on('user:change:status', (payload: { newStatus: UserStatus }) =>
      activitiesController.onChangeStatus({ userId: user.id, newStatus: payload.newStatus })
    )
    socket.on('typing:start', (payload: { channelId: string; draft?: string }) =>
      activitiesController.onTypingStart(socket, payload)
    )
    socket.on('typing:stop', (payload: { channelId: string }) =>
      activitiesController.onTypingStop(socket, payload)
    )

    socket.on('disconnect', () => {
      const userId = this.socketIdToUserId.get(socket.id)
      if (userId) {
        activitiesController.onDisconnected(userId)
        this.socketIdToUserId.delete(socket.id)
        this.userIdToSocketId.delete(userId)
        console.log(`Socket disconnected: ${user.nickname} (ID: ${userId})`)
      }
    })

    console.log('[WS DEBUG] Successfully registered all commands.')
    const savedStatus = user.setting?.status ?? UserStatus.ONLINE

    if (savedStatus !== UserStatus.OFFLINE) {
      await activitiesController.onConnected(user.id)
      await this.joinUserToChannels(socket, user.id)
    } else {
      console.log(
        `[WS DEBUG] User ${user.nickname} connected silently (OFFLINE status). Skipping join/notify.`
      )
    }

    socket.join(user.id)
    console.log(`[WS DEBUG] Joined personal room: ${user.id}`)
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
