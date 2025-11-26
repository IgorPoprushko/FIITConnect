import type { HttpContext } from '@adonisjs/core/http'
import Channel from '#models/channel'
import Member from '#models/member'
import db from '@adonisjs/lucid/services/db'
import { inject } from '@adonisjs/core'
import app from '@adonisjs/core/services/app'
import Ws from '#services/ws'
import {
  createChannelValidator,
  manageMemberValidator,
  messageValidator,
} from '#validators/channel'
import { ChannelType } from '#enums/channel_type'
import {
  ChannelMinResponse,
  CreateChannelPayload,
  ChannelSuccessResponse,
  ChannelFullResponse,
  ManageMemberPayload,
  ChannelMemberJoinedEvent,
  ChannelMemberLeftEvent,
  SerializedMember,
  MessageSentPayload,
  MessageSentEvent,
  GetMessagesPayload,
} from '#contracts/channel_contracts'
import User from '#models/user'
import ChannelKickBan from '#models/channel_kick_ban'
import KickVote from '#models/kick_vote'
import Message from '#models/message'

@inject()
export default class ChannelsController {
  private async getWsService(): Promise<Ws> {
    return app.container.make(Ws)
  }

  async getChannelsMin({ auth, response }: HttpContext) {
    if (!auth.user) return response.unauthorized()

    const userId = auth.user.id

    const channels = await db
      .from('members as m')
      .where('m.user_id', userId)
      .join('channels as c', 'm.channel_id', 'c.id')
      .joinRaw(
        `
        LEFT JOIN (
          SELECT
            messages.channel_id,
            messages.content AS last_message_content,
            messages.created_at AS last_message_sent_at,
            ROW_NUMBER() OVER (
              PARTITION BY messages.channel_id
              ORDER BY messages.created_at DESC
            ) AS rn
          FROM messages
        ) lm ON lm.channel_id = c.id AND lm.rn = 1
      `
      )
      .select([
        'c.id',
        'c.name',
        'c.type',
        'lm.last_message_content',
        'lm.last_message_sent_at',
        db.raw(`
          (
            SELECT COUNT(*)
            FROM messages AS msg
            WHERE msg.channel_id = c.id
              AND (
                m.last_read_message_id IS NULL
                OR msg.id > m.last_read_message_id
              )
          ) AS unread_count
        `),
      ])
      .orderBy('lm.last_message_sent_at', 'desc')
      .exec()

    const formatted: ChannelMinResponse['channels'] = channels.map((row) => ({
      id: row.id,
      name: row.name,
      type: row.type as ChannelType,
      lastMessage: {
        content: row.last_message_content ?? null,
        sentAt: row.last_message_sent_at ?? null,
      },
      unreadCount: Number(row.unread_count ?? 0),
    }))

    return response.ok({ channels: formatted })
  }

  async createChannel({ auth, request, response }: HttpContext) {
    if (!auth.user) return response.unauthorized()

    const { name, type, description } = (await request.validateUsing(
      createChannelValidator
    )) as CreateChannelPayload

    const exists = await Channel.findBy('name', name)
    if (exists) {
      return response.badRequest({
        errors: [{ message: `Channel "${name}" already exists` }],
      })
    }

    const channel = await db.transaction(async (trx) => {
      const newChannel = await Channel.create(
        {
          name,
          type,
          description,
          ownerUserId: auth.user!.id,
        },
        { client: trx }
      )

      await Member.create(
        {
          channelId: newChannel.id,
          userId: auth.user!.id,
          lastReadMessageId: null,
        },
        { client: trx }
      )

      return newChannel
    })

    await channel.load('owner')

    return response.created({
      message: `Channel "${channel.name}" created successfully.`,
    } as ChannelSuccessResponse)
  }

  async getChannelInfoFull({ auth, params, response }: HttpContext) {
    if (!auth.user) return response.unauthorized()

    const channelId = params.channelId

    const member = await Member.query()
      .where('channelId', channelId)
      .andWhere('userId', auth.user.id)
      .first()

    if (!member) {
      return response.forbidden({ message: 'You are not a member of this channel.' })
    }

    const channel = await Channel.query().where('id', channelId).preload('owner').firstOrFail()

    const members = await Member.query().where('channelId', channelId).preload('user').exec()

    const fullResponse: ChannelFullResponse = {
      name: channel.name,
      description: channel.description,
      type: channel.type,
      ownerUserId: channel.ownerUserId,
      lastMessageAt: null,
      createdAt: channel.createdAt,
      updatedAt: channel.updatedAt,
      countOfMembers: members.length,
    }

    return response.ok(fullResponse)
  }

  async deleteChannel({ auth, params, response }: HttpContext) {
    if (!auth.user) return response.unauthorized()

    const channelId = params.channelId

    const channel = await Channel.findBy('id', channelId)

    if (!channel) {
      return response.notFound({ message: 'Channel not found.' })
    }

    if (channel.ownerUserId !== auth.user.id) {
      return response.forbidden({ message: 'You must be the channel owner to delete it.' })
    }

    await channel.delete()

    const ws = await this.getWsService()
    ws.io?.to(`channel:${channelId}`).emit('channel:deleted', { channelId })

    return response.ok({
      message: `Channel "${channel.name}" deleted successfully.`,
    } as ChannelSuccessResponse)
  }

  async joinChannel({ auth, params, response }: HttpContext) {
    if (!auth.user) return response.unauthorized()

    const channelId = params.channelId

    const channel = await Channel.findBy('id', channelId)
    if (!channel) {
      return response.notFound({ message: 'Channel not found.' })
    }

    if (channel.type !== ChannelType.PUBLIC) {
      return response.forbidden({
        message: 'This is a private channel. You must be invited to join.',
      })
    }

    const existingMember = await Member.query()
      .where('channelId', channelId)
      .andWhere('userId', auth.user.id)
      .first()

    if (existingMember) {
      return response.badRequest({ message: 'You are already a member of this channel.' })
    }

    const newMember = await Member.create({
      channelId: channel.id,
      userId: auth.user.id,
      lastReadMessageId: null,
    })

    await newMember.load('user')
    const ws = await this.getWsService()
    ws.io?.to(`channel:${channelId}`).emit('channel:memberJoined', {
      channelId,
      member: {
        ...newMember.serialize(),
        user: newMember.user.serialize(),
      },
    })

    return response.ok({
      message: `Successfully joined channel "${channel.name}".`,
    } as ChannelSuccessResponse)
  }

  async leaveChannel({ auth, params, response }: HttpContext) {
    if (!auth.user) return response.unauthorized()

    const channelId = params.channelId

    const member = await Member.query()
      .where('channelId', channelId)
      .andWhere('userId', auth.user.id)
      .first()

    if (!member) {
      return response.notFound({ message: 'You are not a member of this channel.' })
    }

    await member.delete()

    const ws = await this.getWsService()
    ws.io?.to(`channel:${channelId}`).emit('channel:memberLeft', {
      channelId,
      userId: auth.user.id,
    })

    return response.ok({ message: 'Successfully left the channel.' } as ChannelSuccessResponse)
  }

  async inviteUserToChannel({ auth, params, request, response }: HttpContext) {
    if (!auth.user) return response.unauthorized()

    const channelName = params.name
    const { nickname } = (await request.validateUsing(manageMemberValidator)) as ManageMemberPayload

    const [channel, inviterMember, invitedUser] = await Promise.all([
      Channel.findBy('name', channelName),
      Member.query().where('channelId', channelName).andWhere('userId', auth.user.id).first(),
      User.findBy('nickname', nickname),
    ])

    if (!channel) return response.notFound({ message: 'Channel not found.' })
    if (!invitedUser)
      return response.notFound({ message: `User with nickname "${nickname}" not found.` })
    if (!inviterMember)
      return response.forbidden({
        message: 'You must be a member of the channel to invite others.',
      })

    const existingMember = await Member.query()
      .where('channelId', channel.id)
      .andWhere('userId', invitedUser.id)
      .first()

    if (existingMember) {
      return response.badRequest({ message: `${nickname} is already a member of this channel.` })
    }

    const isOwner = auth.user.id === channel.ownerUserId
    if (channel.type === ChannelType.PRIVATE && !isOwner) {
      return response.forbidden({
        message: 'Only the channel owner can invite users to private channels.',
      })
    }

    const newMember = await Member.create({
      channelId: channel.id,
      userId: invitedUser.id,
      lastReadMessageId: null,
    })

    await newMember.load('user')
    const ws = await this.getWsService()
    ws.io?.to(`channel:${channel.id}`).emit('channel:memberJoined', {
      channelId: channel.id,
      member: {
        ...newMember.serialize(),
        user: newMember.user.serialize(),
      },
    } as ChannelMemberJoinedEvent)

    return response.ok({
      message: `${nickname} successfully invited to channel "${channel.name}".`,
    } as ChannelSuccessResponse)
  }

  async revokeUserFromChannel({ auth, params, request, response }: HttpContext) {
    if (!auth.user) return response.unauthorized()

    const channelName = params.name
    const { nickname } = (await request.validateUsing(manageMemberValidator)) as ManageMemberPayload

    const [channel, revokerMember, targetUser] = await Promise.all([
      Channel.findBy('name', channelName),
      Member.query().where('channelId', channelName).andWhere('userId', auth.user.id).first(),
      User.findBy('nickname', nickname),
    ])

    if (!channel) return response.notFound({ message: 'Channel not found.' })
    if (!targetUser)
      return response.notFound({ message: `User with nickname "${nickname}" not found.` })
    if (!revokerMember)
      return response.forbidden({ message: 'You must be a member of the channel.' })

    if (auth.user.id !== channel.ownerUserId) {
      return response.forbidden({ message: 'Only the channel owner can revoke membership.' })
    }

    const targetMember = await Member.query()
      .where('channelId', channel.id)
      .andWhere('userId', targetUser.id)
      .first()

    if (!targetMember) {
      return response.badRequest({ message: `${nickname} is not a member of this channel.` })
    }

    if (targetUser.id === auth.user.id) {
      return response.badRequest({ message: 'You cannot revoke yourself. Use /leave instead.' })
    }
    if (targetUser.id === channel.ownerUserId) {
      return response.badRequest({ message: 'The channel owner cannot be revoked.' })
    }

    await targetMember.delete()

    const ws = await this.getWsService()
    ws.io?.to(`channel:${channel.id}`).emit('channel:memberLeft', {
      channelId: channel.id,
      userId: targetUser.id,
    } as ChannelMemberLeftEvent)

    return response.ok({
      message: `${nickname} successfully revoked from channel "${channel.name}".`,
    } as ChannelSuccessResponse)
  }

  async kickUserFromChannel({ auth, params, request, response }: HttpContext) {
    if (!auth.user) return response.unauthorized()

    const channelName = params.name
    const { nickname } = (await request.validateUsing(manageMemberValidator)) as ManageMemberPayload

    const [channel, kickerMember, targetUser] = await Promise.all([
      Channel.findBy('name', channelName),
      Member.query().where('channelId', channelName).andWhere('userId', auth.user.id).first(),
      User.findBy('nickname', nickname),
    ])

    if (!channel) return response.notFound({ message: 'Channel not found.' })
    if (!targetUser)
      return response.notFound({ message: `User with nickname "${nickname}" not found.` })
    if (!kickerMember)
      return response.forbidden({ message: 'You must be a member of the channel to kick others.' })
    if (targetUser.id === auth.user.id)
      return response.badRequest({ message: 'You cannot kick yourself.' })
    if (targetUser.id === channel.ownerUserId)
      return response.badRequest({ message: 'The channel owner cannot be kicked.' })

    const targetMember = await Member.query()
      .where('channelId', channel.id)
      .andWhere('userId', targetUser.id)
      .first()

    if (!targetMember) {
      return response.badRequest({
        message: `${nickname} is not currently a member of this channel.`,
      })
    }

    const ws = await this.getWsService()
    const isOwner = auth.user.id === channel.ownerUserId

    if (isOwner) {
      await db.transaction(async (trx) => {
        await targetMember.useTransaction(trx).delete()
        await ChannelKickBan.updateOrCreate(
          { channelId: channel.id, targetUserId: targetUser.id },
          { permanent: true, reason: 'Kicked permanently by owner' },
          { client: trx }
        )
        await KickVote.query()
          .where('channelId', channel.id)
          .where('targetUserId', targetUser.id)
          .useTransaction(trx)
          .delete()
      })

      ws.io?.to(`channel:${channel.id}`).emit('channel:memberLeft', {
        channelId: channel.id,
        userId: targetUser.id,
      } as ChannelMemberLeftEvent)

      return response.ok({
        message: `${nickname} was kicked and permanently banned from channel "${channel.name}" by the owner.`,
      } as ChannelSuccessResponse)
    }

    if (channel.type !== ChannelType.PUBLIC) {
      return response.forbidden({
        message: 'Only the channel owner can kick users from private channels.',
      })
    }

    const existingVote = await KickVote.query()
      .where('channelId', channel.id)
      .where('targetUserId', targetUser.id)
      .where('voterUserId', auth.user.id)
      .first()

    if (existingVote) {
      return response.badRequest({ message: 'You have already voted for this users Kik.' })
    }

    await KickVote.create({
      channelId: channel.id,
      targetUserId: targetUser.id,
      voterUserId: auth.user.id,
    })

    const votesCount = await KickVote.query()
      .where('channelId', channel.id)
      .where('targetUserId', targetUser.id)
      .count('* as total')

    const totalVotes = Number(votesCount[0].$extras.total)
    const requiredVotes = 3

    if (totalVotes >= requiredVotes) {
      await db.transaction(async (trx) => {
        await targetMember.useTransaction(trx).delete()
        await ChannelKickBan.updateOrCreate(
          { channelId: channel.id, targetUserId: targetUser.id },
          { permanent: true, reason: `Kicked permanently by member votes (${totalVotes} votes)` },
          { client: trx }
        )
        await KickVote.query()
          .where('channelId', channel.id)
          .where('targetUserId', targetUser.id)
          .useTransaction(trx)
          .delete()
      })
      ws.io?.to(`channel:${channel.id}`).emit('channel:memberLeft', {
        channelId: channel.id,
        userId: targetUser.id,
      } as ChannelMemberLeftEvent)

      return response.ok({
        message: `${nickname} reached the threshold of exile (${totalVotes}/${requiredVotes} votes) and permanently blocked from the channel "${channel.name}".`,
      } as ChannelSuccessResponse)
    }

    const remaining = requiredVotes - totalVotes
    return response.ok({
      message: `Your vote to expel ${nickname} has been counted. Current votes: ${totalVotes}/${requiredVotes}. ${remaining} vote(s) needed for a permanent ban.`,
    } as ChannelSuccessResponse)
  }

  async getChannelMembers({ auth, params, response }: HttpContext) {
    if (!auth.user) return response.unauthorized()

    const channelId = params.channelId

    const channel = await Channel.findBy('id', channelId)
    if (!channel) {
      return response.notFound({ message: 'Channel not found.' })
    }

    const isMember = await Member.query()
      .where('channelId', channelId)
      .andWhere('userId', auth.user.id)
      .first()

    if (!isMember) {
      return response.forbidden({
        message: 'You must be a member of this channel to view its members.',
      })
    }

    const members = await Member.query().where('channelId', channelId).preload('user').exec()

    const serializedMembers: SerializedMember[] = members.map(
      (m) => m.serialize() as SerializedMember
    )

    return response.ok({ members: serializedMembers })
  }

  async getChannelMessages({ auth, params, request, response }: HttpContext) {
    if (!auth.user) return response.unauthorized()

    const channelId = params.channelId
    const { limit = 50, beforeTime, beforeId } = request.qs() as GetMessagesPayload

    const actualLimit = Math.min(limit, 100)

    const channel = await Channel.findBy('id', channelId)
    if (!channel) {
      return response.notFound({ message: 'Channel not found.' })
    }

    const member = await Member.query()
      .where('channelId', channelId)
      .andWhere('userId', auth.user.id)
      .first()

    if (!member) {
      return response.forbidden({
        message: 'You must be a member of this channel to view messages.',
      })
    }

    let query = Message.query()
      .where('channelId', channelId)
      .preload('user')
      .orderBy('createdAt', 'desc')
      .orderBy('id', 'desc')
      .limit(actualLimit)

    if (beforeTime && beforeId) {
      query = query.whereRaw(`("created_at" < ?) OR ("created_at" = ? AND "id" < ?)`, [
        beforeTime,
        beforeTime,
        beforeId,
      ])
    }

    const messages = await query.exec()
    const serializedMessages = messages.map((m) => ({
      id: m.id,
      content: m.content,
      sentAt: m.createdAt,
      sender: {
        id: m.user.id,
        nickname: m.user.nickname,
      },
    }))

    if (!beforeTime && !beforeId && messages.length > 0) {
      const newestMessage = messages[0]

      if (member.lastReadMessageId !== newestMessage.id) {
        member.lastReadMessageId = newestMessage.id
        await member.save()
      }
    }

    return response.ok({ messages: serializedMessages })
  }

  async sendMessageToChannel({ auth, params, request, response }: HttpContext) {
    if (!auth.user) return response.unauthorized()

    const channelId = params.channelId
    const { content } = (await request.validateUsing(messageValidator)) as MessageSentPayload

    const channel = await Channel.findBy('id', channelId)
    if (!channel) {
      return response.notFound({ message: 'Channel not found.' })
    }

    const member = await Member.query()
      .where('channelId', channelId)
      .andWhere('userId', auth.user.id)
      .first()

    if (!member) {
      return response.forbidden({
        message: 'You must be a member of this channel to send messages.',
      })
    }

    const isBanned = await ChannelKickBan.query()
      .where('channelId', channelId)
      .where('targetUserId', auth.user.id)
      .where('permanent', true)
      .first()

    if (isBanned) {
      return response.forbidden({
        message: 'You have been permanently banned from this channel and cannot send messages.',
      })
    }

    const newMessage = await Message.create({
      channelId: channel.id,
      userId: auth.user.id,
      content: content,
    })

    await newMessage.load('user')

    member.lastReadMessageId = newMessage.id
    await member.save()

    const ws = await this.getWsService()

    const serializedMessage = {
      id: newMessage.id,
      content: newMessage.content,
      sentAt: newMessage.createdAt,
      sender: {
        id: newMessage.user.id,
        nickname: newMessage.user.nickname,
      },
    }

    ws.io?.to(`channel:${channelId}`).emit('channel:messageSent', {
      channelId: channel.id,
      message: serializedMessage,
    } as MessageSentEvent)

    return response.created({
      message: 'Message sent successfully.',
    } as ChannelSuccessResponse)
  }
}
