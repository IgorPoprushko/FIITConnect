// backend/app/controllers/ws/ChannelsController.ts

import { inject } from '@adonisjs/core'
import Channel from '#models/channel'
import Member from '#models/member'
import User from '#models/user'
import Message from '#models/message'
import ChannelKickBan from '#models/channel_kick_ban'
import KickVote from '#models/kick_vote'
import db from '@adonisjs/lucid/services/db'
import { Exception } from '@adonisjs/core/exceptions'
import { BaseResponse, ChannelType, UserStatus } from '#enums/global_enums'
import type { AuthenticatedSocket } from '#services/ws'
import Ws from '#services/ws'
import type {
  JoinChannelPayload,
  ChannelDto,
  MemberDto,
  ChannelActionPayload,
  ManageMemberPayload,
} from '#contracts/channel_contracts'

@inject()
export default class ChannelsController {
  public async joinOrCreate(
    socket: AuthenticatedSocket,
    payload: JoinChannelPayload,
    callback?: (res: BaseResponse<ChannelDto>) => void
  ) {
    const { channelName, isPrivate } = payload
    const user = socket.user!

    try {
      let channel = await Channel.findBy('name', channelName)

      if (channel) {
        if (channel.type === ChannelType.PRIVATE) {
          const isMember = await Member.query()
            .where('channelId', channel.id)
            .where('userId', user.id)
            .first()

          if (!isMember && channel.ownerUserId !== user.id) {
            throw new Exception(`Channel is private. Invite required.`, { status: 403 })
          }
        }

        const isBanned = await ChannelKickBan.query()
          .where('channelId', channel.id)
          .where('targetUserId', user.id)
          .where('permanent', true)
          .first()

        if (isBanned)
          throw new Exception('You are permanently banned from this channel.', { status: 403 })

        const existing = await Member.query()
          .where('channelId', channel.id)
          .where('userId', user.id)
          .first()
        if (!existing) {
          const newMember = await Member.create({
            channelId: channel.id,
            userId: user.id,
            isNew: false,
          })
          await this.notifyJoin(socket, channel, newMember)
        } else {
          socket.join(channel.id)
        }
      } else {
        channel = await Channel.create({
          name: channelName,
          ownerUserId: user.id,
          type: isPrivate ? ChannelType.PRIVATE : ChannelType.PUBLIC,
          description: `Channel created by ${user.nickname}`,
        })
        const newMember = await Member.create({
          channelId: channel.id,
          userId: user.id,
          isNew: false,
        })
        await this.notifyJoin(socket, channel, newMember)
      }

      const data: ChannelDto = {
        id: channel.id,
        name: channel.name,
        type: channel.type,
        description: channel.description,
        ownerUserId: channel.ownerUserId,
        unreadCount: 0,
        isNew: false,
        lastMessage: null,
      }

      if (callback) callback({ status: 'ok', data })
    } catch (error) {
      if (callback) callback({ status: 'error', message: error.message })
    }
  }

  private async notifyJoin(socket: AuthenticatedSocket, channel: Channel, member: Member) {
    await member.load('user')
    socket.join(channel.id)

    const memberDto: MemberDto = {
      id: member.user.id,
      nickname: member.user.nickname,
      firstName: member.user.firstName,
      lastName: member.user.lastName,
      status: member.user.setting?.status ?? UserStatus.OFFLINE,
      lastSeenAt: member.user.lastSeenAt?.toISO() ?? null,
      joinedAt: member.joinedAt.toISO()!,
    }

    Ws.getIo().to(channel.id).emit('channel:member_joined', {
      channelId: channel.id,
      member: memberDto,
    })
  }

  public async leave(
    socket: AuthenticatedSocket,
    payload: ChannelActionPayload,
    callback?: (res: BaseResponse) => void
  ) {
    const { channelId } = payload
    const user = socket.user!

    try {
      const channel = await Channel.findOrFail(channelId)
      if (channel.ownerUserId === user.id) {
        return this.deleteChannel(socket, { channelId }, callback)
      }

      const member = await Member.query()
        .where('channelId', channel.id)
        .where('userId', user.id)
        .first()
      if (!member) throw new Exception('You are not in this channel')

      await member.delete()

      Ws.getIo()
        .to(channel.id)
        .emit('channel:member_left', { channelId: channel.id, userId: user.id })
      socket.leave(channel.id)

      if (callback) callback({ status: 'ok', message: `Left channel ${channel.name}` })
    } catch (error) {
      if (callback) callback({ status: 'error', message: error.message })
    }
  }

  public async deleteChannel(
    socket: AuthenticatedSocket,
    payload: ChannelActionPayload,
    callback?: (res: BaseResponse) => void
  ) {
    const { channelId } = payload
    const user = socket.user!

    try {
      const channel = await Channel.findOrFail(channelId)

      if (channel.ownerUserId !== user.id) {
        throw new Exception('Only the channel owner can close the channel.')
      }

      Ws.getIo().to(channel.id).emit('channel:deleted', { channelId: channel.id })
      Ws.getIo().in(channel.id).socketsLeave(channel.id)

      await channel.delete()

      if (callback) callback({ status: 'ok', message: `Channel ${channel.name} closed.` })
    } catch (error) {
      if (callback) callback({ status: 'error', message: error.message })
    }
  }

  private async unbanUser(channelId: string, targetUserId: string): Promise<void> {
    const ban = await ChannelKickBan.query()
      .where('channelId', channelId)
      .where('targetUserId', targetUserId)
      .first()

    if (ban) {
      await ban.delete()
    }
  }

  public async invite(
    socket: AuthenticatedSocket,
    payload: ManageMemberPayload,
    callback?: (res: BaseResponse) => void
  ) {
    const { channelId, nickname } = payload
    const currentUser = socket.user!

    try {
      // Fetch and validate channel and target user
      const channel = await Channel.findOrFail(channelId)
      const targetUser = await User.findBy('nickname', nickname)
      if (!targetUser) throw new Exception(`User @${nickname} not found`)

      // Verify inviter is a member
      const inviterMember = await Member.query()
        .where('channelId', channel.id)
        .where('userId', currentUser.id)
        .first()
      if (!inviterMember) throw new Exception('You must be a member to invite.')

      // Check permissions based on channel type and user role
      const isAdmin = channel.ownerUserId === currentUser.id

      if (channel.type === ChannelType.PRIVATE && !isAdmin) {
        throw new Exception('Only the owner can invite to private channels.')
      }

      // Check if target is already a member
      const existing = await Member.query()
        .where('channelId', channel.id)
        .where('userId', targetUser.id)
        .first()
      if (existing) throw new Exception(`${nickname} is already in the channel.`)

      // Handle ban status
      const ban = await ChannelKickBan.query()
        .where('channelId', channel.id)
        .where('targetUserId', targetUser.id)
        .first()

      if (ban) {
        if (!isAdmin) {
          // Non-admins cannot unban
          throw new Exception(`User is banned. Only the owner can restore access.`)
        }
        // Admins can unban
        await this.unbanUser(channel.id, targetUser.id)
      }

      // Create the new member
      const newMember = await Member.create({
        channelId: channel.id,
        userId: targetUser.id,
        isNew: true,
      })
      await newMember.load('user')

      // Add target user to the channel room
      const io = Ws.getIo()
      io.in(targetUser.id).socketsJoin(channel.id)

      // Notify all channel members about the new member
      const memberDto: MemberDto = {
        id: newMember.user.id,
        nickname: newMember.user.nickname,
        firstName: newMember.user.firstName,
        lastName: newMember.user.lastName,
        status: newMember.user.setting?.status ?? UserStatus.OFFLINE,
        lastSeenAt: newMember.user.lastSeenAt?.toISO() ?? null,
        joinedAt: newMember.joinedAt.toISO()!,
      }

      io.to(channel.id).emit('channel:member_joined', {
        channelId: channel.id,
        member: memberDto,
        isInvite: true,
      })

      // Fetch last message for preview
      const lastMsg = await Message.query()
        .where('channelId', channel.id)
        .orderBy('createdAt', 'desc')
        .preload('user')
        .first()

      let lastMessageDto = null
      if (lastMsg) {
        const sentAtString =
          typeof lastMsg.createdAt === 'string'
            ? lastMsg.createdAt
            : ((lastMsg.createdAt as any)?.toISO?.() ?? new Date().toISOString())

        lastMessageDto = {
          content: lastMsg.content,
          sentAt: sentAtString,
          senderNick: lastMsg.user.nickname,
        }
      }

      // Send personal invitation notification to target user
      const channelDto: ChannelDto = {
        id: channel.id,
        name: channel.name,
        type: channel.type,
        description: channel.description,
        ownerUserId: channel.ownerUserId,
        unreadCount: 1,
        isNew: true,
        lastMessage: lastMessageDto,
      }

      io.to(targetUser.id).emit('user:invited', channelDto)

      if (callback) callback({ status: 'ok', message: `Invited ${nickname}` })
    } catch (error) {
      if (callback) callback({ status: 'error', message: error.message })
    }
  }

  public async revoke(
    socket: AuthenticatedSocket,
    payload: ManageMemberPayload,
    callback?: (res: BaseResponse) => void
  ) {
    const { channelId, nickname } = payload
    const currentUser = socket.user!

    try {
      const channel = await Channel.findOrFail(channelId)
      if (channel.type !== ChannelType.PRIVATE)
        throw new Exception('Revoke is for private channels only.')
      if (channel.ownerUserId !== currentUser.id) throw new Exception('Only owner can revoke.')

      const targetUser = await User.findBy('nickname', nickname)
      if (!targetUser) throw new Exception('User not found')
      if (channel.ownerUserId === targetUser.id) {
        return this.deleteChannel(socket, { channelId }, callback)
      }
      const member = await Member.query()
        .where('channelId', channel.id)
        .where('userId', targetUser.id)
        .first()
      if (!member) throw new Exception('User not in channel')

      await member.delete()

      Ws.getIo().in(targetUser.id).socketsLeave(channel.id)
      Ws.getIo().to(targetUser.id).emit('channel:member_kicked', {
        channelId: channel.id,
        userId: targetUser.id,
        reason: 'Revoked by owner',
      })
      Ws.getIo().to(channel.id).emit('channel:member_left', {
        channelId: channel.id,
        userId: targetUser.id,
        reason: 'Revoked by owner',
      })

      if (callback) callback({ status: 'ok', message: `Revoked ${nickname}` })
    } catch (error) {
      if (callback) callback({ status: 'error', message: error.message })
    }
  }

  public async kick(
    socket: AuthenticatedSocket,
    payload: ManageMemberPayload,
    callback?: (res: BaseResponse) => void
  ) {
    const { channelId, nickname } = payload
    const currentUser = socket.user!

    try {
      const channel = await Channel.findOrFail(channelId)
      const targetUser = await User.findBy('nickname', nickname)
      if (!targetUser) throw new Exception('User not found')

      if (targetUser.id === currentUser.id) throw new Exception('Cannot kick yourself')
      if (targetUser.id === channel.ownerUserId) throw new Exception('Cannot kick owner')

      const targetMember = await Member.query()
        .where('channelId', channel.id)
        .where('userId', targetUser.id)
        .first()
      if (!targetMember) throw new Exception('User is not in channel')

      if (channel.ownerUserId !== currentUser.id) {
        throw new Exception('Only the channel owner can kick directly. Use vote instead.')
      }

      await this.performBan(channel, targetUser, 'Kicked by owner')
      if (callback) callback({ status: 'ok', message: `${nickname} kicked and banned.` })
    } catch (error) {
      if (callback) callback({ status: 'error', message: error.message })
    }
  }

  public async vote(
    socket: AuthenticatedSocket,
    payload: ManageMemberPayload,
    callback?: (res: BaseResponse) => void
  ) {
    const { channelId, nickname } = payload
    const currentUser = socket.user!

    try {
      const channel = await Channel.findOrFail(channelId)
      const targetUser = await User.findBy('nickname', nickname)
      if (!targetUser) throw new Exception('User not found')

      if (targetUser.id === currentUser.id) throw new Exception('Cannot vote against yourself')
      if (targetUser.id === channel.ownerUserId) throw new Exception('Cannot vote against owner')

      const targetMember = await Member.query()
        .where('channelId', channel.id)
        .where('userId', targetUser.id)
        .first()
      if (!targetMember) throw new Exception('User is not in channel')

      if (channel.type !== ChannelType.PUBLIC)
        throw new Exception('Voting is only for public channels.')

      const existingVote = await KickVote.query()
        .where('channelId', channel.id)
        .where('targetUserId', targetUser.id)
        .where('voterUserId', currentUser.id)
        .first()

      if (existingVote) throw new Exception('You already voted.')

      await KickVote.create({
        channelId: channel.id,
        targetUserId: targetUser.id,
        voterUserId: currentUser.id,
      })

      const votes = await KickVote.query()
        .where('channelId', channel.id)
        .where('targetUserId', targetUser.id)
        .count('* as total')

      const total = Number(votes[0].$extras.total)
      const REQUIRED = 3

      const io = Ws.getIo()
      io.to(channel.id).emit('channel:vote_update', {
        channelId: channel.id,
        targetUserId: targetUser.id,
        currentVotes: total,
        requiredVotes: REQUIRED,
      })

      if (total >= REQUIRED) {
        await this.performBan(channel, targetUser, `Voted out (${total} votes)`)
        if (callback) callback({ status: 'ok', message: `${nickname} voted out.` })
      } else {
        if (callback) callback({ status: 'ok', message: `Vote counted: ${total}/${REQUIRED}` })
      }
    } catch (error) {
      if (callback) callback({ status: 'error', message: error.message })
    }
  }

  public async voteAndKick(
    socket: AuthenticatedSocket,
    payload: ManageMemberPayload,
    callback?: (res: BaseResponse) => void
  ) {
    return this.vote(socket, payload, callback)
  }

  private async performBan(channel: Channel, user: User, reason: string) {
    await db.transaction(async (trx) => {
      await Member.query()
        .where('channelId', channel.id)
        .where('userId', user.id)
        .useTransaction(trx)
        .delete()

      await ChannelKickBan.updateOrCreate(
        { channelId: channel.id, targetUserId: user.id },
        { permanent: true, reason },
        { client: trx }
      )

      await KickVote.query()
        .where('channelId', channel.id)
        .where('targetUserId', user.id)
        .useTransaction(trx)
        .delete()
    })

    const io = Ws.getIo()
    io.in(user.id).socketsLeave(channel.id)
    io.to(user.id).emit('channel:member_kicked', {
      channelId: channel.id,
      userId: user.id,
      reason,
    })
  }

  public async listMembers(
    socket: AuthenticatedSocket,
    payload: ChannelActionPayload,
    callback?: (res: BaseResponse<MemberDto[]>) => void
  ) {
    try {
      const channel = await Channel.findOrFail(payload.channelId)

      const me = await Member.query()
        .where('channelId', channel.id)
        .where('userId', socket.user!.id)
        .first()
      if (!me) throw new Exception('Access denied')

      const members = await Member.query()
        .where('channelId', channel.id)
        .preload('user', (q) => q.preload('setting'))
        .exec()

      const data: MemberDto[] = members.map((m) => ({
        id: m.user.id,
        nickname: m.user.nickname,
        firstName: m.user.firstName,
        lastName: m.user.lastName,
        status: m.user.setting?.status ?? UserStatus.OFFLINE,
        lastSeenAt: m.user.lastSeenAt?.toISO() ?? null,
        joinedAt: m.joinedAt.toISO()!,
      }))

      if (callback) callback({ status: 'ok', data })
    } catch (e) {
      if (callback) callback({ status: 'error', message: e.message })
    }
  }
}
