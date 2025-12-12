import User from '#models/user'
import Channel from '#models/channel'
import Message from '#models/message' // Імпортуємо модель Message напряму
import { ChannelType } from '#enums/channel_type'
import { Exception } from '@adonisjs/core/exceptions'
import { inject } from '@adonisjs/core'
import KickVote from '#models/kick_vote'
import Member from '#models/member'
import { DateTime } from 'luxon'

// --- DTOs ---
interface InviteUserDTO {
  inviter: User
  inviteeNickName: string // Це назва параметру DTO, тут camelCase ок
  channelName: string
}
interface KickUserDTO {
  kicker: User
  targetNickName: string
  channelName: string
}
interface LeaveChannelDTO {
  user: User
  channelName: string
}
interface RevokeAccessDTO {
  admin: User
  targetNickName: string
  channelName: string
}

// --- Return Types ---
interface KickResult {
  wasKicked: boolean
  message: string
  kickedUser: User | null
}
interface LeaveResult {
  wasDeleted: boolean
  leaver: User
}
interface RevokeAccessResult {
  revokedUser: User
}

@inject()
export default class ChannelService {
  /**
   * Знаходить або створює канал.
   * Реалізує логіку: "якщо канал не активний > 30 днів, він перестає існувати"
   */
  public async findOrCreate(
    user: User,
    channelName: string,
    isPrivate: boolean
  ): Promise<{ channel: Channel; wasCreated: boolean }> {
    const standardizedChannelName = channelName.toLowerCase().trim()
    if (!standardizedChannelName) {
      throw new Exception('Channel name cannot be empty.', { status: 400 })
    }

    let existingChannel = await Channel.query().where('name', standardizedChannelName).first()

    if (existingChannel) {
      // Перевірка на неактивність (30 днів)
      // Оскільки у Channel немає relation 'messages', робимо запит через модель Message
      const lastMessage = await Message.query()
        .where('channelId', existingChannel.id)
        .orderBy('createdAt', 'desc')
        .first()

      const lastActivityTime = lastMessage ? lastMessage.createdAt : existingChannel.createdAt
      const cutoffDate = DateTime.now().minus({ days: 30 })

      // Якщо остання активність була раніше ніж 30 днів тому
      if (lastActivityTime < cutoffDate) {
        await existingChannel.delete()
        // Канал видалено, створюємо новий "чистий" канал з тим самим ім'ям
        return {
          channel: await this.createNewChannel(user, standardizedChannelName, isPrivate),
          wasCreated: true,
        }
      }

      return {
        channel: await this.joinExistingChannel(user, existingChannel),
        wasCreated: false,
      }
    } else {
      return {
        channel: await this.createNewChannel(user, standardizedChannelName, isPrivate),
        wasCreated: true,
      }
    }
  }

  /**
   * Логіка виходу з каналу.
   * Якщо виходить власник (адмін) -> канал видаляється.
   */
  public async leaveOrDeleteChannel({ user, channelName }: LeaveChannelDTO): Promise<LeaveResult> {
    const channel = await Channel.findByOrFail('name', channelName)
    const membership = await Member.query()
      .where('userId', user.id)
      .andWhere('channelId', channel.id)
      .first()

    if (!membership) {
      throw new Exception('You are not a member of this channel.', { status: 403 })
    }

    // Якщо власник виходить, канал видаляється
    if (channel.ownerUserId === user.id) {
      await channel.delete()
      return { wasDeleted: true, leaver: user }
    } else {
      await membership.delete()
      return { wasDeleted: false, leaver: user }
    }
  }

  public async inviteUser({
    inviter,
    inviteeNickName,
    channelName,
  }: InviteUserDTO): Promise<{ channel: Channel; invitee: User }> {
    const channel = await Channel.findBy('name', channelName)
    if (!channel) {
      throw new Exception('Channel not found.', { status: 404 })
    }

    // Виправлено: використовуємо 'nickname' згідно з моделлю User
    const invitee = await User.findBy('nickname', inviteeNickName)
    if (!invitee) {
      throw new Exception(`User with nickname "${inviteeNickName}" not found.`, { status: 404 })
    }

    if (inviter.id === invitee.id) {
      throw new Exception('You cannot invite yourself.', { status: 400 })
    }

    const inviterMembership = await Member.query()
      .where('channelId', channel.id)
      .andWhere('userId', inviter.id)
      .first()

    if (!inviterMembership || inviterMembership.isBanned) {
      throw new Exception('You are not an active member of this channel.', { status: 403 })
    }

    if (channel.type === ChannelType.PRIVATE && channel.ownerUserId !== inviter.id) {
      throw new Exception('Only the channel owner can invite users to a private channel.', {
        status: 403,
      })
    }

    const inviteeMembership = await Member.query()
      .where('channelId', channel.id)
      .andWhere('userId', invitee.id)
      .first()

    if (inviteeMembership) {
      if (inviteeMembership.isBanned) {
        if (channel.ownerUserId !== inviter.id) {
          throw new Exception('Only the channel owner can un-ban a member.', { status: 403 })
        }
        inviteeMembership.isBanned = false
        await inviteeMembership.save()

        await KickVote.query()
          .where('channelId', channel.id)
          .andWhere('targetUserId', invitee.id)
          .delete()

        return { channel, invitee }
      } else {
        throw new Exception(`${invitee.nickname} is already a member of this channel.`, {
          status: 409,
        })
      }
    }

    await channel.related('members').create({ userId: invitee.id })

    return { channel, invitee }
  }

  public async kickUser({ kicker, targetNickName, channelName }: KickUserDTO): Promise<KickResult> {
    const channel = await Channel.findByOrFail('name', channelName)
    // Виправлено: 'nickname'
    const targetUser = await User.findByOrFail('nickname', targetNickName)

    const kickerMembership = await Member.query()
      .where('userId', kicker.id)
      .andWhere('channelId', channel.id)
      .first()

    if (!kickerMembership || kickerMembership.isBanned) {
      throw new Exception('You are not a member of this channel.')
    }

    const targetMembership = await Member.query()
      .where('userId', targetUser.id)
      .andWhere('channelId', channel.id)
      .first()

    if (!targetMembership) {
      throw new Exception(`${targetNickName} is not a member of this channel.`)
    }

    if (kicker.id === targetUser.id) {
      throw new Exception('You cannot kick yourself.')
    }

    if (targetUser.id === channel.ownerUserId) {
      throw new Exception('You cannot kick the channel owner.')
    }

    if (kicker.id === channel.ownerUserId) {
      await this.banUser(targetMembership)
      return {
        wasKicked: true,
        message: `${targetNickName} has been permanently kicked by the owner.`,
        kickedUser: targetUser,
      }
    }

    if (channel.type === ChannelType.PUBLIC) {
      const existingVote = await KickVote.query()
        .where('channelId', channel.id)
        .andWhere('targetUserId', targetUser.id)
        .andWhere('voterUserId', kicker.id)
        .first()

      if (existingVote) {
        throw new Exception('You have already voted to kick this user.')
      }

      await KickVote.create({
        channelId: channel.id,
        targetUserId: targetUser.id,
        voterUserId: kicker.id,
      })

      const voteCount = await KickVote.query()
        .where('channelId', channel.id)
        .andWhere('targetUserId', targetUser.id)
        .count('* as total')

      const totalVotes = Number(voteCount[0].$extras.total)

      if (totalVotes >= 3) {
        await this.banUser(targetMembership)
        await KickVote.query()
          .where('channelId', channel.id)
          .andWhere('targetUserId', targetUser.id)
          .delete()

        return {
          wasKicked: true,
          message: `${targetNickName} has been kicked by vote (${totalVotes} votes).`,
          kickedUser: targetUser,
        }
      }

      return {
        wasKicked: false,
        message: `${kicker.nickname} voted to kick ${targetNickName}. Total votes: ${totalVotes}/3`,
        kickedUser: null,
      }
    }

    throw new Exception('Only the channel owner can kick members from a private channel.', {
      status: 403,
    })
  }

  public async revokeAccess({
    admin,
    targetNickName,
    channelName,
  }: RevokeAccessDTO): Promise<RevokeAccessResult> {
    const channel = await Channel.findByOrFail('name', channelName)
    // Виправлено: 'nickname'
    const targetUser = await User.findByOrFail('nickname', targetNickName)

    if (channel.type !== ChannelType.PRIVATE) {
      throw new Exception(
        'Access can only be revoked in private channels. Use /kick for public channels.',
        { status: 403 }
      )
    }

    if (channel.ownerUserId !== admin.id) {
      throw new Exception('Only the channel owner can revoke access.', { status: 403 })
    }

    if (admin.id === targetUser.id) {
      throw new Exception('You cannot revoke your own access.', { status: 400 })
    }

    const targetMembership = await Member.query()
      .where('channelId', channel.id)
      .andWhere('userId', targetUser.id)
      .first()

    if (!targetMembership) {
      throw new Exception(`${targetNickName} is not a member of this channel.`, { status: 404 })
    }

    await targetMembership.delete()

    return { revokedUser: targetUser }
  }

  // --- Helpers ---

  private async banUser(membership: Member) {
    membership.isBanned = true
    await membership.save()
  }

  private async joinExistingChannel(user: User, channel: Channel): Promise<Channel> {
    const membership = await channel.related('members').query().where('userId', user.id).first()

    if (membership) {
      if (membership.isBanned) {
        throw new Exception('You are banned from this channel.', { status: 403 })
      }
      return channel
    }

    if (channel.type === ChannelType.PRIVATE) {
      throw new Exception('This channel is private. You need an invite to join.', { status: 403 })
    }

    await channel.related('members').create({ userId: user.id })
    return channel
  }

  private async createNewChannel(
    user: User,
    channelName: string,
    isPrivate: boolean
  ): Promise<Channel> {
    const channel = await Channel.create({
      name: channelName,
      ownerUserId: user.id,
      type: isPrivate ? ChannelType.PRIVATE : ChannelType.PUBLIC,
    })

    await channel.related('members').create({
      userId: user.id,
    })

    return channel
  }
}
