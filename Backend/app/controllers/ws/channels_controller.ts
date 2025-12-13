// backend/app/controllers/ws/ChannelsController.ts

import { inject } from '@adonisjs/core'
import Channel from '#models/channel'
import Member from '#models/member'
import User from '#models/user'
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
  /**
   * 1. JOIN OR CREATE
   * Об'єднує логіку приєднання та створення.
   */
  public async joinOrCreate(
    socket: AuthenticatedSocket,
    payload: JoinChannelPayload,
    callback?: (res: BaseResponse<ChannelDto>) => void
  ) {
    const { channelName, isPrivate } = payload
    const user = socket.user!

    try {
      let channel = await Channel.findBy('name', channelName) // --- СЦЕНАРІЙ А: КАНАЛ ВЖЕ ІСНУЄ ---

      if (channel) {
        // Перевірки приватності, бану та додавання існуючих учасників...
        if (channel.type === ChannelType.PRIVATE) {
          const isMember = await Member.query()
            .where('channelId', channel.id)
            .where('userId', user.id)
            .first()

          if (!isMember && channel.ownerUserId !== user.id) {
            throw new Exception(`Channel is private. Invite required.`, { status: 403 })
          }
        } // Перевірка бану

        const isBanned = await ChannelKickBan.query()
          .where('channelId', channel.id)
          .where('targetUserId', user.id)
          .where('permanent', true)
          .first()

        if (isBanned)
          throw new Exception('You are permanently banned from this channel.', { status: 403 }) // Якщо ще не учасник - додаємо

        const existing = await Member.query()
          .where('channelId', channel.id)
          .where('userId', user.id)
          .first()
        if (!existing) {
          const newMember = await Member.create({ channelId: channel.id, userId: user.id })
          await this.notifyJoin(socket, channel, newMember)
        } else {
          socket.join(channel.id)
        } // --- СЦЕНАРІ Б: СТВОРЕННЯ НОВОГО ---
      } else {
        channel = await Channel.create({
          name: channelName,
          ownerUserId: user.id,
          type: isPrivate ? ChannelType.PRIVATE : ChannelType.PUBLIC,
          description: `Channel created by ${user.nickname}`,
        })
        const newMember = await Member.create({ channelId: channel.id, userId: user.id })
        await this.notifyJoin(socket, channel, newMember)
      }

      const data: ChannelDto = {
        id: channel.id,
        name: channel.name,
        type: channel.type,
        description: channel.description,
        ownerUserId: channel.ownerUserId,
        unreadCount: 0,
        lastMessage: null,
      }

      if (callback) callback({ status: 'ok', data })
    } catch (error) {
      if (callback) callback({ status: 'error', message: error.message })
    }
  } // Допоміжний метод: підключає сокет і шле подію всім

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
  } /**
   * 2. LEAVE (/cancel)
   * ВИПРАВЛЕНО: Приймає ChannelActionPayload { channelId: string }
   */

  public async leave(
    socket: AuthenticatedSocket,
    payload: ChannelActionPayload, // ВИПРАВЛЕНО: використовуємо ChannelActionPayload
    callback?: (res: BaseResponse) => void
  ) {
    const { channelId } = payload
    const user = socket.user!

    try {
      const channel = await Channel.findOrFail(channelId) // Якщо ВЛАСНИК виходить -> видаляємо канал
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
  } /**
   * 3. DELETE (/quit)
   * ВИПРАВЛЕНО: Приймає ChannelActionPayload { channelId: string }
   */

  public async deleteChannel(
    socket: AuthenticatedSocket,
    payload: ChannelActionPayload, // ВИПРАВЛЕНО: використовуємо ChannelActionPayload
    callback?: (res: BaseResponse) => void
  ) {
    const { channelId } = payload
    const user = socket.user!

    try {
      const channel = await Channel.findOrFail(channelId)

      if (channel.ownerUserId !== user.id) {
        throw new Exception('Only the channel owner can close the channel.')
      } // Сповіщаємо про видалення

      Ws.getIo().to(channel.id).emit('channel:deleted', { channelId: channel.id }) // Викидаємо всіх з кімнати
      Ws.getIo().in(channel.id).socketsLeave(channel.id)

      await channel.delete()

      if (callback) callback({ status: 'ok', message: `Channel ${channel.name} closed.` })
    } catch (error) {
      if (callback) callback({ status: 'error', message: error.message })
    }
  } /**
   * 4. INVITE (/invite)
   * ВИПРАВЛЕНО: Приймає ManageMemberPayload { channelId: string; nickname: string }
   */

  public async invite(
    socket: AuthenticatedSocket,
    payload: ManageMemberPayload, // ВИПРАВЛЕНО: використовуємо ManageMemberPayload
    callback?: (res: BaseResponse) => void
  ) {
    const { channelId, nickname } = payload
    const currentUser = socket.user!

    try {
      const channel = await Channel.findOrFail(channelId)
      const targetUser = await User.findBy('nickname', nickname)
      if (!targetUser) throw new Exception(`User ${nickname} not found`) // Перевірка прав

      const inviterMember = await Member.query()
        .where('channelId', channel.id)
        .where('userId', currentUser.id)
        .first()
      if (!inviterMember) throw new Exception('You must be a member to invite.')

      if (channel.type === ChannelType.PRIVATE && channel.ownerUserId !== currentUser.id) {
        throw new Exception('Only owner can invite to private channels.')
      }

      const existing = await Member.query()
        .where('channelId', channel.id)
        .where('userId', targetUser.id)
        .first()
      if (existing) throw new Exception(`${nickname} is already here.`) // Логіка розбану (Restore)

      const ban = await ChannelKickBan.query()
        .where('channelId', channel.id)
        .where('targetUserId', targetUser.id)
        .first()
      if (ban) {
        if (channel.ownerUserId !== currentUser.id) {
          throw new Exception(`User is banned. Only owner can restore access.`)
        }
        await ban.delete()
      }

      const newMember = await Member.create({ channelId: channel.id, userId: targetUser.id })
      await newMember.load('user') // Магія: додаємо сокети запрошеного юзера в кімнату примусово

      const io = Ws.getIo()
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

      if (callback) callback({ status: 'ok', message: `Invited ${nickname}` })
    } catch (error) {
      if (callback) callback({ status: 'error', message: error.message })
    }
  } /**
   * 5. REVOKE (/revoke)
   * ВИПРАВЛЕНО: Приймає ManageMemberPayload { channelId: string; nickname: string }
   */

  public async revoke(
    socket: AuthenticatedSocket,
    payload: ManageMemberPayload, // ВИПРАВЛЕНО: використовуємо ManageMemberPayload
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

      const member = await Member.query()
        .where('channelId', channel.id)
        .where('userId', targetUser.id)
        .first()
      if (!member) throw new Exception('User not in channel')

      await member.delete()

      Ws.getIo().in(targetUser.id).socketsLeave(channel.id)
      Ws.getIo().to(channel.id).emit('channel:member_left', {
        channelId: channel.id,
        userId: targetUser.id,
        reason: 'Revoked by owner',
      })

      if (callback) callback({ status: 'ok', message: `Revoked ${nickname}` })
    } catch (error) {
      if (callback) callback({ status: 'error', message: error.message })
    }
  } /**
   * 6. KICK (/kick)
   * ВИПРАВЛЕНО: Приймає ManageMemberPayload { channelId: string; nickname: string }
   */

  public async kick(
    socket: AuthenticatedSocket,
    payload: ManageMemberPayload, // ВИПРАВЛЕНО: використовуємо ManageMemberPayload
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

      const io = Ws.getIo()
      const isOwner = channel.ownerUserId === currentUser.id // 1. АДМІН КІКАЄ

      if (isOwner) {
        await this.performBan(channel, targetUser, 'Kicked by owner')
        if (callback) callback({ status: 'ok', message: `${nickname} kicked and banned.` })
        return
      } // 2. ГОЛОСУВАННЯ

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
    io.to(channel.id).emit('channel:member_kicked', {
      channelId: channel.id,
      userId: user.id,
      reason,
    })
  } /**
   * 7. LIST MEMBERS (/list)
   * ВИПРАВЛЕНО: Приймає ChannelActionPayload { channelId: string }
   */

  public async listMembers(
    socket: AuthenticatedSocket,
    payload: ChannelActionPayload, // ВИПРАВЛЕНО: використовуємо ChannelActionPayload
    callback?: (res: BaseResponse<MemberDto[]>) => void
  ) {
    try {
      const channel = await Channel.findOrFail(payload.channelId) // Шукаємо за ID

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
