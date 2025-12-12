import { inject } from '@adonisjs/core'
import type { AuthenticatedSocket } from '#services/ws'
import ChannelService from '#services/channel_service'
import Channel from '#models/channel'
import MessagesController from '#controllers/ws/messages_controller'
import app from '@adonisjs/core/services/app'

@inject()
export default class CommandsController {
  constructor(
    private channelService: ChannelService,
    // private ws: Ws, // ВИДАЛЯЄМО з конструктора
    private messagesController: MessagesController
  ) {}

  private async getWs() {
    const { default: Ws } = await import('#services/ws')
    return app.container.make(Ws)
  }

  public async handleCommand(
    socket: AuthenticatedSocket,
    payload: { input: string; channelName: string }
  ) {
    const { input, channelName } = payload
    const trimmedInput = input.trim()

    if (!trimmedInput.startsWith('/')) {
      if (!channelName) {
        return this.emitError(socket, 'You must be in a channel to send messages.')
      }
      await this.messagesController.onNewMessage(socket, {
        channelName,
        content: trimmedInput,
      })
      return
    }

    const parts = trimmedInput.substring(1).split(' ')
    const command = parts[0].toLowerCase()
    const args = parts.slice(1)

    if (command === 'join') {
      await this.onJoin(socket, args)
      return
    }

    if (!channelName) {
      return this.emitError(socket, 'You must be in a channel to execute this command.')
    }

    switch (command) {
      case 'invite':
        await this.onInvite(socket, args, channelName)
        break
      case 'kick':
        await this.onKick(socket, args, channelName)
        break
      case 'revoke':
        await this.onRevoke(socket, args, channelName)
        break
      case 'quit':
      case 'cancel':
        await this.onLeaveChannel(socket, channelName)
        break
      case 'list':
        await this.onList(socket, channelName)
        break
      default:
        this.emitError(socket, `Unknown command: /${command}`)
    }
  }

  private async onJoin(socket: AuthenticatedSocket, args: string[]) {
    const [channelName, type] = args
    const user = socket.user!

    if (!channelName) {
      return this.emitError(socket, 'Usage: /join <channelName> [private]')
    }

    try {
      const isPrivate = type === 'private'
      const { channel, wasCreated } = await this.channelService.findOrCreate(
        user,
        channelName,
        isPrivate
      )

      socket.join(channel.name)

      const ws = await this.getWs()
      ws.getIo().to(socket.id).emit('channel:joined', {
        channel: channel.serialize(),
        wasCreated,
      })

      if (!wasCreated) {
        socket.to(channel.name).emit('memberJoined', {
          channelName: channel.name,
          user: user.serialize(),
        })
      }
    } catch (error) {
      this.emitError(socket, error.message || 'Could not join channel.')
    }
  }

  private async onLeaveChannel(socket: AuthenticatedSocket, channelName: string) {
    const user = socket.user!

    try {
      const { wasDeleted, leaver } = await this.channelService.leaveOrDeleteChannel({
        user,
        channelName,
      })

      const ws = await this.getWs()

      if (wasDeleted) {
        ws.getIo().to(channelName).emit('channelRemoved', { channelName })
        ws.getIo().in(channelName).socketsLeave(channelName)
      } else {
        socket.leave(channelName)
        ws.getIo().to(socket.id).emit('channelRemoved', { channelName })
        ws.getIo().to(channelName).emit('memberLeft', { channelName, user: leaver.serialize() })
      }
    } catch (error) {
      this.emitError(socket, error.message || 'Could not leave channel.')
    }
  }

  private async onList(socket: AuthenticatedSocket, channelName: string) {
    try {
      const channel = await Channel.findByOrFail('name', channelName)
      await channel.load('members', (query) => {
        query.where('isBanned', false).preload('user')
      })

      const memberNickNames = channel.members.map((member) => member.user.nickname).join(', ')
      const messageContent = `Members in #${channelName}: ${memberNickNames}`

      const ws = await this.getWs()
      ws.getIo()
        .to(socket.id)
        .emit('message:new', {
          id: '-1',
          user: { id: '-1', nickname: 'System', status: 'online' },
          content: messageContent,
          channelName,
          createdAt: new Date().toISOString(),
          mentionedUserIds: [],
        })
    } catch (error) {
      this.emitError(socket, 'Could not retrieve member list.')
    }
  }

  private async onInvite(socket: AuthenticatedSocket, args: string[], channelName: string) {
    const [nickname] = args
    const inviter = socket.user!

    if (!nickname) return this.emitError(socket, 'Usage: /invite <nickname>')

    try {
      const { channel, invitee } = await this.channelService.inviteUser({
        inviter,
        inviteeNickName: nickname,
        channelName,
      })

      await this.broadcastSystemMessage(
        channelName,
        `${inviter.nickname} invited ${invitee.nickname}`
      )

      const ws = await this.getWs()
      const inviteeSocket = ws.findSocketByUserId(invitee.id)
      if (inviteeSocket) {
        inviteeSocket.join(channel.name)
        ws.getIo().to(inviteeSocket.id).emit('channel:invited', channel.serialize())
      }

      ws.getIo().to(channel.name).emit('memberJoined', {
        channelName: channel.name,
        user: invitee.serialize(),
      })
    } catch (error) {
      this.emitError(socket, error.message)
    }
  }

  private async onKick(socket: AuthenticatedSocket, args: string[], channelName: string) {
    const [nickname] = args
    const kicker = socket.user!

    if (!nickname) return this.emitError(socket, 'Usage: /kick <nickname>')

    try {
      const { wasKicked, message, kickedUser } = await this.channelService.kickUser({
        kicker,
        targetNickName: nickname,
        channelName,
      })

      await this.broadcastSystemMessage(channelName, message)

      if (wasKicked && kickedUser) {
        const ws = await this.getWs()
        const kickedSocket = ws.findSocketByUserId(kickedUser.id)
        if (kickedSocket) {
          kickedSocket.leave(channelName)
          ws.getIo().to(kickedSocket.id).emit('channelRemoved', { channelName })
        }
        ws.getIo().to(channelName).emit('memberLeft', { channelName, user: kickedUser.serialize() })
      }
    } catch (error) {
      this.emitError(socket, error.message)
    }
  }

  private async onRevoke(socket: AuthenticatedSocket, args: string[], channelName: string) {
    const [nickname] = args
    const admin = socket.user!

    if (!nickname) return this.emitError(socket, 'Usage: /revoke <nickname>')

    try {
      const { revokedUser } = await this.channelService.revokeAccess({
        admin,
        targetNickName: nickname,
        channelName,
      })

      const ws = await this.getWs()
      const revokedSocket = ws.findSocketByUserId(revokedUser.id)
      if (revokedSocket) {
        revokedSocket.leave(channelName)
        ws.getIo().to(revokedSocket.id).emit('channelRemoved', { channelName })
      }

      ws.getIo().to(channelName).emit('memberLeft', {
        channelName,
        user: revokedUser.serialize(),
      })

      await this.broadcastSystemMessage(
        channelName,
        `${admin.nickname} revoked access for ${revokedUser.nickname}.`
      )
    } catch (error) {
      this.emitError(socket, error.message)
    }
  }

  private emitError(socket: AuthenticatedSocket, message: string) {
    socket.emit('error', { message })
  }

  private async broadcastSystemMessage(channelName: string, content: string) {
    const ws = await this.getWs()
    ws.getIo()
      .to(channelName)
      .emit('message:new', {
        id: Date.now().toString(),
        user: { id: '-1', nickname: 'System', status: 'online' },
        content,
        channelName,
        createdAt: new Date().toISOString(),
        mentionedUserIds: [],
      })
  }
}
