import { inject } from '@adonisjs/core'
import type { AuthenticatedSocket } from '#services/ws'
import MessageRepository from '#repositories/message_repository'
import Channel from '#models/channel'
import Message from '#models/message'
import User from '#models/user'
import Member from '#models/member'
import { Exception } from '@adonisjs/core/exceptions'
import Ws from '#services/ws'
import { BaseResponse } from '#enums/response_type'
import { SendMessagePayload, MessageDto, GetMessagesPayload } from '#contracts/message_contracts'

@inject()
export default class MessagesController {
  constructor(private messageRepository: MessageRepository) {}

  // 1. SEND MESSAGE
  public async sendMessage(
    socket: AuthenticatedSocket,
    payload: SendMessagePayload,
    callback?: (res: BaseResponse<MessageDto>) => void
  ) {
    const { channelId, content } = payload
    const user = socket.user!

    try {
      const channel = await Channel.find(channelId)
      if (!channel) throw new Exception('Channel not found', { status: 404 })

      const membership = await Member.query()
        .where('userId', user.id)
        .where('channelId', channel.id)
        .first()

      if (!membership || membership.isBanned) {
        throw new Exception('You are not an active member.', { status: 403 })
      }

      // Mentions
      const mentionRegex = /@(\w+)/g
      const mentionedNicknames = [...content.matchAll(mentionRegex)].map((m) => m[1])
      let mentionedUserIds: string[] = []

      if (mentionedNicknames.length > 0) {
        const users = await User.query().whereIn('nickname', mentionedNicknames).exec()
        mentionedUserIds = users.map((u) => u.id)
      }

      const newMessage = await this.messageRepository.create({
        content,
        userId: user.id,
        channelId: channel.id,
      })

      membership.lastReadMessageId = newMessage.id
      await membership.save()

      const messageDto: MessageDto = {
        id: Number(newMessage.id),
        content: newMessage.content,
        // FIX: Гарантуємо рядок, якщо toISO поверне null
        sentAt: newMessage.createdAt,
        userId: user.id,
        user: {
          id: user.id,
          nickname: user.nickname,
          firstName: user.firstName,
          lastName: user.lastName,
          status: user.setting?.status,
          lastSeenAt: user.lastSeenAt?.toISO() ?? null,
        },
        mentions: mentionedUserIds,
      }

      Ws.getIo().to(channel.id).emit('message:new', messageDto)

      if (callback) callback({ status: 'ok', data: messageDto })
    } catch (error) {
      if (callback) callback({ status: 'error', message: error.message })
    }
  }

  // 2. GET MESSAGES
  public async getMessages(
    socket: AuthenticatedSocket,
    payload: GetMessagesPayload,
    callback?: (res: BaseResponse<MessageDto[]>) => void
  ) {
    const { channelId, cursor, limit = 50 } = payload
    const user = socket.user!

    try {
      const membership = await Member.query()
        .where('userId', user.id)
        .where('channelId', channelId)
        .first()

      if (!membership) throw new Exception('Access denied', { status: 403 })

      const query = Message.query()
        .where('channelId', channelId)
        .preload('user', (q) => q.preload('setting'))
        .orderBy('id', 'desc')
        .limit(limit)

      if (cursor) {
        query.where('id', '<', cursor)
      }

      const messages = await query.exec()

      if (!cursor && messages.length > 0) {
        const newest = messages[0]
        if (!membership.lastReadMessageId || newest.id > membership.lastReadMessageId) {
          membership.lastReadMessageId = newest.id
          await membership.save()
        }
      }

      const sortedMessages: MessageDto[] = messages.reverse().map((m) => ({
        id: Number(m.id),
        content: m.content,
        // FIX: Гарантуємо рядок
        sentAt: m.createdAt.toISO() ?? '',
        userId: m.user.id,
        user: {
          id: m.user.id,
          nickname: m.user.nickname,
          firstName: m.user.firstName,
          lastName: m.user.lastName,
          status: m.user.setting?.status,
          lastSeenAt: m.user.lastSeenAt?.toISO() ?? null,
        },
        mentions: [],
      }))

      if (callback) callback({ status: 'ok', data: sortedMessages })
    } catch (error) {
      if (callback) callback({ status: 'error', message: error.message })
    }
  }
}
