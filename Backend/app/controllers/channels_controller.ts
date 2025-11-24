import type { HttpContext } from '@adonisjs/core/http'
import Channel from '#models/channel'
import Member from '#models/member'
import db from '@adonisjs/lucid/services/db'
import { ChannelType } from '#enums/channel_type'
import { MemberRole } from '#enums/member_role'

export default class ChannelsController {
  async getJoinChannels({ auth, response }: HttpContext) {
    if (!auth.user) {
      return response.unauthorized({ errors: [{ message: 'Not authenticated' }] })
    }
    const channels = await Channel.query()
      .whereHas('members', (builder) => {
        builder.where('user_id', auth.user!.id)
      })
      .preload('owner')
      .withAggregate('members', (query) => {
        query.count('*').as('members_count')
      })
      .orderBy('lastMessageAt', 'desc')

    return response.ok(
      channels.map((channel) => {
        const serializedData = channel.serialize()
        return {
          ...serializedData,
          members_count: channel.$extras.members_count,
        }
      })
    )
  }

  async createChannel({ request, response, auth }: HttpContext) {
    if (!auth.user) {
      return response.unauthorized({ errors: [{ message: 'Not authenticated' }] })
    }

    const { name, description, type } = request.only(['name', 'description', 'type'])

    const existingChannel = await Channel.findBy('name', name)
    if (existingChannel) {
      return response.badRequest({ errors: [{ message: 'Channel with this name already exists' }] })
    }

    if (!Object.values(ChannelType).includes(type)) {
      return response.badRequest({ errors: [{ message: 'Invalid channel type' }] })
    }

    try {
      const channel = await db.transaction(async (trx) => {
        const newChannel = await Channel.create(
          {
            name,
            description,
            type,
            ownerUserId: auth.user!.id,
          },
          { client: trx }
        )

        await Member.create(
          {
            userId: auth.user!.id,
            channelId: newChannel.id,
            role: MemberRole.ADMIN,
            isMuted: false,
            isBanned: false,
          },
          { client: trx }
        )

        return newChannel
      })

      await channel.load('owner')
      return response.created({ channel: channel.serialize() })
    } catch (error) {
      console.error('Error creating channel:', error)
      return response.internalServerError({ errors: [{ message: 'Failed to create channel' }] })
    }
  }

  async deleteChannel({ params, response, auth }: HttpContext) {
    if (!auth.user) {
      return response.unauthorized({ errors: [{ message: 'Not authenticated' }] })
    }

    const channelId = params.id
    const channel = await Channel.find(channelId)

    if (!channel) {
      return response.notFound({ errors: [{ message: 'Channel not found' }] })
    }

    const member = await Member.query()
      .where('channel_id', channelId)
      .andWhere('user_id', auth.user.id)
      .first()

    if (!member || member.role !== MemberRole.ADMIN) {
      return response.forbidden({
        errors: [{ message: 'You do not have permission to delete this channel' }],
      })
    }

    try {
      await db.transaction(async (trx) => {
        await Member.query({ client: trx }).where('channel_id', channelId).delete()
        await channel.useTransaction(trx).delete()
      })
      return response.noContent()
    } catch (error) {
      console.error('Error deleting channel:', error)
      return response.internalServerError({ errors: [{ message: 'Failed to delete channel' }] })
    }
  }
}
