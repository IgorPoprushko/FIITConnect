import type { HttpContext } from '@adonisjs/core/http'
import Channel from '#models/channel'
import User from '#models/user'
import Member from '#models/member'
import { ChannelType } from '#enums/channel_type'
import ChannelKickBan from '#models/channel_kick_ban'
import KickVote from '#models/kick_vote'
import { MemberRole } from '#enums/member_role'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import { inject } from '@adonisjs/core'
import Ws from '#services/ws'
import app from '@adonisjs/core/services/app'

const REQUIRED_KICK_VOTES = 3

@inject()
export default class CommandController {
  private async getWsService(): Promise<Ws> {
    return app.container.make(Ws)
  }

  async execute({ request, response, auth }: HttpContext) {
    if (!auth.user) {
      return response.unauthorized({ errors: [{ message: 'Not authenticated' }] })
    }

    const channelId = request.param('channelId')
    const { text } = request.only(['text'])

    if (!text || !channelId) {
      return response.badRequest({
        errors: [{ message: 'Text (command) and channelId are required' }],
      })
    }

    if (!text.startsWith('/')) {
      return response.badRequest({ errors: [{ message: 'Only commands allowed on this route' }] })
    }

    const commandText = text.toLowerCase()

    if (commandText.startsWith('/join')) {
      const parts = commandText.split(/\s+/)
      const args = parts.slice(1)
      return this.handleJoinCommand(args, auth.user, response)
    }

    const member = await Member.query()
      .where('channel_id', channelId)
      .where('user_id', auth.user.id)
      .first()

    if (!member) {
      return response.forbidden({
        errors: [{ message: 'You must be a member of this channel to execute this command' }],
      })
    }

    if (member.isBanned || member.isMuted) {
      return response.forbidden({
        errors: [{ message: 'You are restricted from executing commands' }],
      })
    }

    return this.handleCommand(text, channelId, auth.user, member, response)
  }

  // *** Handler for commands ***
  private async handleCommand(
    commandText: string,
    channelId: string,
    user: User,
    member: Member,
    response: HttpContext['response']
  ) {
    const parts = commandText.split(/\s+/)
    const command = parts[0].toLowerCase()
    const args = parts.slice(1)

    const channel = await Channel.find(channelId)
    if (!channel) {
      return response.notFound({ errors: [{ message: 'Channel not found' }] })
    }

    switch (command) {
      case '/cancel':
        return this.handleQuitCommand(channel, user, member, response)
      case '/quit':
        return this.handleQuitCommand(channel, user, member, response)
      case '/kick':
        return this.handleKickCommand(args, channel, user, member, response)
      case '/revoke':
        return this.handleRevokeCommand(args, channel, user, member, response)
      case '/invite':
        return this.handleInviteCommand(args, channel, user, member, response)
      default:
        return response.badRequest({ errors: [{ message: `Unknown command: ${command}` }] })
    }
  }

  // *** Handler for /join command ***
  private async handleJoinCommand(args: string[], user: User, response: HttpContext['response']) {
    const [channelName] = args
    if (!channelName) {
      return response.badRequest({ errors: [{ message: 'Channel name is required for /join' }] })
    }

    const wsService = await this.getWsService()

    if (channelName.length < 2 || channelName.length > 50) {
      return response.badRequest({ errors: [{ message: 'Invalid channel name length' }] })
    }

    let channel = await Channel.findBy('name', channelName)

    if (channel) {
      // If channel exists
      const isMember = await Member.query()
        .where('channel_id', channel.id)
        .where('user_id', user.id)
        .first()

      if (isMember) {
        return response.ok({
          status: 'already_member',
          message: `You are already a member of ${channel.name}`,
        })
      }

      if (channel.type === ChannelType.PRIVATE) {
        return response.forbidden({
          errors: [{ message: 'Cannot join private channel without invite' }],
        })
      }
      // Connecting to Public Channel
      await Member.create({
        userId: user.id,
        channelId: channel.id,
        role: MemberRole.MEMBER,
        isMuted: false,
        isBanned: false,
        joinedAt: DateTime.now(),
      })
      // Notify all members about new member
      wsService.io?.to(`channel:${channel.id}`).emit('channel:member_joined', {
        channelId: channel.id,
        userId: user.id,
        nickname: user.nickname,
      })

      return response.ok({ status: 'joined', message: `Joined public channel ${channel.name}` })
    } else {
      // If channel does not exist, create it
      try {
        await db.transaction(async (trx) => {
          channel = await Channel.create(
            {
              name: channelName,
              description: `Auto-created public channel: ${channelName}`,
              type: ChannelType.PUBLIC,
              ownerUserId: user.id,
            },
            { client: trx }
          )
          // Add creator as admin member
          await Member.create(
            {
              userId: user.id,
              channelId: channel.id,
              role: MemberRole.ADMIN,
              isMuted: false,
              isBanned: false,
              joinedAt: DateTime.now(),
            },
            { client: trx }
          )
        })
        // Notify via WebSocket
        wsService.io?.to(`channel:${channel!.id}`).emit('channel:member_joined', {
          channelId: channel!.id,
          userId: user.id,
          nickname: user.nickname,
        })

        return response.created({ status: 'created_and_joined', channel: channel!.serialize() })
      } catch (error) {
        console.error(error)
        return response.internalServerError({
          errors: [{ message: 'Could not create or join channel' }],
        })
      }
    }
  }

  // *** Handler for /quit command ***
  private async handleQuitCommand(
    channel: Channel,
    user: User,
    member: Member,
    response: HttpContext['response']
  ) {
    const wsService = await this.getWsService()

    try {
      await member.delete()

      wsService.io?.to(`channel:${channel.id}`).emit('channel:member_left', {
        channelId: channel.id,
        userId: user.id,
        nickname: user.nickname,
      })

      const remainingMembersCount = await Member.query()
        .where('channel_id', channel.id)
        .count('* as total')
      const totalMembers = remainingMembersCount[0].$extras.total as number

      if (totalMembers === 0) {
        await db.transaction(async (trx) => {
          await channel.useTransaction(trx).delete()
        })
        return response.ok({
          status: 'quit_and_deleted',
          message: `Left and deleted channel ${channel.name}`,
        })
      }

      return response.ok({ status: 'quit', message: `Left channel ${channel.name}` })
    } catch (error) {
      console.error('Error handling /quit:', error)
      return response.internalServerError({ errors: [{ message: 'Could not leave channel' }] })
    }
  }

  // *** Handler for /kick command ***
  private async handleKickCommand(
    args: string[],
    channel: Channel,
    user: User, // User, who issued the command
    member: Member, // Member, who issued the command
    response: HttpContext['response']
  ) {
    const [targetNickname] = args
    if (!targetNickname) {
      return response.badRequest({ errors: [{ message: 'Username is required for /kick' }] })
    }

    const wsService = await this.getWsService()

    const targetUser = await User.findBy('nickname', targetNickname)
    if (!targetUser) {
      return response.notFound({ errors: [{ message: `User ${targetNickname} not found` }] })
    }

    if (targetUser.id === user.id) {
      return response.badRequest({ errors: [{ message: 'You cannot kick yourself. Use /quit' }] })
    }

    const targetMember = await Member.query()
      .where('channel_id', channel.id)
      .where('user_id', targetUser.id)
      .first()

    if (!targetMember) {
      return response.badRequest({
        errors: [{ message: `User ${targetNickname} is not a member of this channel` }],
      })
    }

    // If user is Admin
    if (member.role === MemberRole.ADMIN) {
      // ADMIN CAN KICK ANYONE IMMEDIATELY
      await db.transaction(async (trx) => {
        await ChannelKickBan.create(
          {
            channelId: channel.id,
            targetUserId: targetUser.id,
            permanent: true,
            reason: `Banned by Admin: ${user.nickname}`,
          },
          { client: trx }
        )

        targetMember.isBanned = true
        await targetMember.useTransaction(trx).save()
        await targetMember.useTransaction(trx).delete()

        await KickVote.query({ client: trx })
          .where('channel_id', channel.id)
          .where('target_user_id', targetUser.id)
          .delete()
      })

      wsService.io?.to(`channel:${channel.id}`).emit('channel:member_banned', {
        channelId: channel.id,
        userId: targetUser.id,
        nickname: targetUser.nickname,
        bannedBy: user.nickname,
        reason: 'Admin kick and permanent ban',
      })

      return response.ok({
        status: 'banned_by_admin',
        message: `Admin has permanently banned and kicked ${targetNickname} from ${channel.name}`,
      })
    }

    // If user is Member
    else if (member.role === MemberRole.MEMBER) {
      // Check that target is not Admin
      if (targetMember.role === MemberRole.ADMIN) {
        return response.forbidden({ errors: [{ message: 'Members cannot vote to kick an Admin' }] })
      }

      // Check if user has already voted to kick this target in this channel
      const existingVote = await KickVote.query()
        .where('channel_id', channel.id)
        .where('target_user_id', targetUser.id)
        .where('voter_user_id', user.id)
        .first()

      if (existingVote) {
        return response.badRequest({
          errors: [{ message: `You have already voted to kick ${targetNickname}` }],
        })
      }

      let status: string = 'voted'
      let totalVotes = 0

      await db.transaction(async (trx) => {
        await KickVote.create(
          {
            channelId: channel.id,
            targetUserId: targetUser.id,
            voterUserId: user.id,
          },
          { client: trx }
        )

        const currentVotes = await KickVote.query({ client: trx })
          .where('channel_id', channel.id)
          .where('target_user_id', targetUser.id)
          .count('* as total')

        totalVotes = currentVotes[0].$extras.total as number

        if (totalVotes >= REQUIRED_KICK_VOTES) {
          await ChannelKickBan.create(
            {
              channelId: channel.id,
              targetUserId: targetUser.id,
              permanent: true,
              reason: 'Banned by member vote',
            },
            { client: trx }
          )

          targetMember.isBanned = true
          await targetMember.useTransaction(trx).save()
          await targetMember.useTransaction(trx).delete()
          status = 'banned_by_vote'
        }
      })

      if (status === 'banned_by_vote') {
        wsService.io?.to(`channel:${channel.id}`).emit('channel:member_banned', {
          channelId: channel.id,
          userId: targetUser.id,
          nickname: targetUser.nickname,
          reason: 'Voted out',
          votes: totalVotes,
        })
        return response.ok({
          status: 'banned_by_vote',
          message: `User ${targetNickname} has been permanently banned from ${channel.name} by popular vote! (${totalVotes}/${REQUIRED_KICK_VOTES})`,
        })
      } else {
        wsService.io?.to(`channel:${channel.id}`).emit('channel:kick_vote', {
          channelId: channel.id,
          userId: targetUser.id,
          nickname: targetUser.nickname,
          voter: user.nickname,
          currentVotes: totalVotes,
          requiredVotes: REQUIRED_KICK_VOTES,
        })
        return response.ok({
          status: 'voted',
          message: `Your vote to kick ${targetNickname} was recorded. ${REQUIRED_KICK_VOTES - totalVotes} more votes needed.`,
        })
      }
    } else {
      return response.forbidden({
        errors: [{ message: 'Your role does not permit executing the /kick command' }],
      })
    }
  }

  // *** Handler for /revoke command ***
  private async handleRevokeCommand(
    args: string[],
    channel: Channel,
    user: User, // Admin, who issued the command
    member: Member,
    response: HttpContext['response']
  ) {
    const [targetNickname] = args
    if (!targetNickname) {
      return response.badRequest({ errors: [{ message: 'Username is required for /revoke' }] })
    }

    const wsService = await this.getWsService()

    if (channel.type !== ChannelType.PRIVATE) {
      return response.forbidden({
        errors: [{ message: '/revoke is only permitted in private channels for removal.' }],
      })
    }

    if (member.role !== MemberRole.ADMIN) {
      return response.forbidden({
        errors: [{ message: 'Only channel admins can use /revoke to remove members.' }],
      })
    }

    const targetUser = await User.findBy('nickname', targetNickname)
    if (!targetUser) {
      return response.notFound({ errors: [{ message: `User ${targetNickname} not found` }] })
    }

    const targetMember = await Member.query()
      .where('channel_id', channel.id)
      .where('user_id', targetUser.id)
      .first()

    if (!targetMember) {
      return response.ok({
        status: 'not_member',
        message: `User ${targetNickname} is not a member of this channel.`,
      })
    }

    if (targetUser.id === user.id) {
      return response.badRequest({
        errors: [{ message: 'You cannot revoke yourself. Use /quit.' }],
      })
    }

    await targetMember.delete()

    wsService.io?.to(`channel:${channel.id}`).emit('channel:member_left', {
      channelId: channel.id,
      userId: targetUser.id,
      nickname: targetUser.nickname,
      removedBy: user.nickname,
      reason: 'Revoked by Admin',
    })

    return response.ok({
      status: 'member_removed',
      message: `Admin ${user.nickname} removed ${targetNickname} from ${channel.name}.`,
    })
  }

  // *** Handler for /invite command ***
  private async handleInviteCommand(
    args: string[],
    channel: Channel,
    user: User, // Inviter/Admin
    member: Member, // Inviter/Admin Role
    response: HttpContext['response']
  ) {
    const [targetNickname] = args

    if (!targetNickname) {
      return response.badRequest({ errors: [{ message: 'Username is required for /invite' }] })
    }

    const wsService = await this.getWsService()

    const targetUser = await User.findBy('nickname', targetNickname)
    if (!targetUser) {
      return response.notFound({ errors: [{ message: `User ${targetNickname} not found` }] })
    }

    if (targetUser.id === user.id) {
      return response.badRequest({ errors: [{ message: 'You cannot invite yourself.' }] })
    }

    const existingMember = await Member.query()
      .where('channel_id', channel.id)
      .where('user_id', targetUser.id)
      .first()

    if (existingMember) {
      return response.ok({
        status: 'already_member',
        message: `User ${targetNickname} is already a member of this channel.`,
      })
    }

    const activeBan = await ChannelKickBan.query()
      .where('channel_id', channel.id)
      .where('target_user_id', targetUser.id)
      .where('permanent', true)
      .first()

    // If there is an active ban, only Admin can revoke it
    if (activeBan) {
      if (member.role !== MemberRole.ADMIN) {
        return response.forbidden({
          errors: [{ message: 'Only admins can revoke bans using /invite.' }],
        })
      }

      await db.transaction(async (trx) => {
        await activeBan.useTransaction(trx).delete()

        await KickVote.query({ client: trx })
          .where('channel_id', channel.id)
          .where('target_user_id', targetUser.id)
          .delete()

        await Member.create(
          {
            userId: targetUser.id,
            channelId: channel.id,
            role: MemberRole.MEMBER,
            isMuted: false,
            isBanned: false,
            joinedAt: DateTime.now(),
          },
          { client: trx }
        )
      })

      wsService.io?.to(`channel:${channel.id}`).emit('channel:member_joined', {
        channelId: channel.id,
        userId: targetUser.id,
        nickname: targetUser.nickname,
        invitedBy: user.nickname,
        action: 'unbanned_and_joined',
      })
      return response.ok({
        status: 'unbanned_and_joined',
        message: `Admin ${user.nickname} revoked the ban and added ${targetNickname} to ${channel.name}.`,
      })
    }

    // If no active ban

    if (channel.type === ChannelType.PRIVATE && member.role !== MemberRole.ADMIN) {
      return response.forbidden({
        errors: [{ message: 'Only admins can invite new users to a private channel.' }],
      })
    }

    const newMember = await Member.create({
      userId: targetUser.id,
      channelId: channel.id,
      role: MemberRole.MEMBER,
      isMuted: false,
      isBanned: false,
      joinedAt: DateTime.now(),
    })

    wsService.io?.to(`channel:${channel.id}`).emit('channel:member_joined', {
      channelId: channel.id,
      userId: newMember.userId,
      nickname: targetUser.nickname,
      invitedBy: user.nickname,
    })

    return response.ok({
      status: 'invited_and_joined',
      message: `Successfully invited ${targetNickname} to channel ${channel.name}.`,
    })
  }
}
