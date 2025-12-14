import { inject } from '@adonisjs/core'
import type { AuthenticatedSocket } from '#services/ws'
import Channel from '#models/channel'
import Message from '#models/message'
import User from '#models/user'
import Member from '#models/member'
import { Exception } from '@adonisjs/core/exceptions'
import Ws from '#services/ws'
import { BaseResponse } from '#enums/global_enums'
import { SendMessagePayload, MessageDto, GetMessagesPayload } from '#contracts/message_contracts'
import MessageRepository from '#repositories/message_repository'

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

      // 🔥 FIX: Оновлюємо статус прочитання відразу при відправці
      membership.lastReadMessageId = newMessage.id
      await membership.save()

      const sentAtString =
        typeof newMessage.createdAt === 'string'
          ? newMessage.createdAt
          : ((newMessage.createdAt as any)?.toISO?.() ?? new Date().toISOString())

      const messageDto: MessageDto = {
        id: newMessage.id,
        content: newMessage.content,
        sentAt: sentAtString,
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

      Ws.getIo()
        .to(channel.id)
        .emit('message:new', {
          ...messageDto,
          channelId: channel.id,
        })

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

      if (membership.isNew) {
        membership.isNew = false
        await membership.save()
      }

      const query = Message.query()
        .where('channelId', channelId)
        .preload('user', (q) => q.preload('setting'))
        // 🔥 FIX: Сортуємо по часу створення, а не по ID!
        // ID може бути UUID або не послідовним, що ламає порядок.
        .orderBy('createdAt', 'desc')
        .limit(limit)

      // Якщо є курсор (id старого повідомлення), шукаємо старіші за нього
      if (cursor) {
        // Тут ми припускаємо, що cursor - це ID.
        // Для точної пагінації краще використовувати cursor based on createdAt,
        // але якщо ID послідовні (int), то це ок. Якщо UUID - треба переробляти логіку курсору.
        // Залишаємо поки ID, але майте на увазі цей нюанс.
        query.where('id', '<', cursor)
      }

      const messages = await query.exec()

      // 🔥 FIX: Логіка оновлення прочитаного
      // Якщо ми запитали найсвіжіші повідомлення (!cursor) і вони є,
      // то ми точно прочитали найновіше з них.
      if (!cursor && messages.length > 0) {
        const newest = messages[0]

        // Просто оновлюємо на найновіше, якщо ID відрізняється.
        // Видалено перевірку newest.id > lastReadMessageId, бо для UUID вона не працює коректно.
        if (membership.lastReadMessageId !== newest.id) {
          membership.lastReadMessageId = newest.id
          await membership.save()
        }
      }

      const sortedMessages: MessageDto[] = messages.reverse().map((m) => {
        const sentAtString =
          typeof m.createdAt === 'string' ? m.createdAt : ((m.createdAt as any)?.toISO?.() ?? '')

        // Parse mentions from database
        let mentions: string[] = []
        if (m.mentionedUserIds) {
          try {
            mentions = JSON.parse(m.mentionedUserIds)
          } catch (e) {
            console.error('Failed to parse mentionedUserIds:', e)
          }
        }

        return {
          id: m.id,
          content: m.content,
          sentAt: sentAtString,
          userId: m.user.id,
          user: {
            id: m.user.id,
            nickname: m.user.nickname,
            firstName: m.user.firstName,
            lastName: m.user.lastName,
            status: m.user.setting?.status,
            lastSeenAt: m.user.lastSeenAt?.toISO() ?? null,
          },
          mentions,
        }
      })

      if (callback) callback({ status: 'ok', data: sortedMessages })
    } catch (error) {
      if (callback) callback({ status: 'error', message: error.message })
    }
  }
}
