import Channel from '#models/channel'
import Message from '#models/message'
import Member from '#models/member'
import ChannelKickBan from '#models/channel_kick_ban'
import { DateTime } from 'luxon'
import Ws from '#services/ws'

export default class ChannelCleanupService {
  public async cleanupInactiveChannels(): Promise<{
    deletedCount: number
    deletedChannels: string[]
  }> {
    const thirtyDaysAgo = DateTime.now().minus({ days: 30 })
    const deletedChannels: string[] = []

    try {
      // Get all channels
      const channels = await Channel.all()

      for (const channel of channels) {
        let shouldDelete = false

        // Get the last message for this channel
        const lastMessage = await Message.query()
          .where('channelId', channel.id)
          .orderBy('createdAt', 'desc')
          .first()

        if (lastMessage) {
          // Channel has messages - check if last message is older than 30 days
          const lastMessageDate =
            typeof lastMessage.createdAt === 'string'
              ? DateTime.fromISO(lastMessage.createdAt)
              : DateTime.fromJSDate(lastMessage.createdAt as any)

          if (lastMessageDate < thirtyDaysAgo) {
            shouldDelete = true
          }
        } else {
          // Channel has no messages - check if channel was created more than 30 days ago
          const channelCreatedDate =
            typeof channel.createdAt === 'string'
              ? DateTime.fromISO(channel.createdAt)
              : DateTime.fromJSDate(channel.createdAt as any)

          if (channelCreatedDate < thirtyDaysAgo) {
            shouldDelete = true
          }
        }

        if (shouldDelete) {
          console.log(`[CLEANUP] Deleting inactive channel: ${channel.name} (ID: ${channel.id})`)

          // Notify all users in the channel that it's being deleted
          const ws = Ws.getIo()
          if (ws) {
            ws.to(channel.id).emit('channel:deleted', { channelId: channel.id })
          }

          // Delete all related data
          await Message.query().where('channelId', channel.id).delete()
          await Member.query().where('channelId', channel.id).delete()
          await ChannelKickBan.query().where('channelId', channel.id).delete()

          // Delete the channel itself
          await channel.delete()

          deletedChannels.push(channel.name)
        }
      }

      console.log(
        `[CLEANUP] Deleted ${deletedChannels.length} inactive channels: ${deletedChannels.join(', ')}`
      )

      return {
        deletedCount: deletedChannels.length,
        deletedChannels,
      }
    } catch (error) {
      console.error('[CLEANUP] Error during channel cleanup:', error)
      throw error
    }
  }

  public async getChannelActivityStats(): Promise<{
    totalChannels: number
    activeChannels: number
    inactiveChannels: number
    channelsWithoutMessages: number
  }> {
    const thirtyDaysAgo = DateTime.now().minus({ days: 30 })
    const channels = await Channel.all()

    let activeChannels = 0
    let inactiveChannels = 0
    let channelsWithoutMessages = 0

    for (const channel of channels) {
      const lastMessage = await Message.query()
        .where('channelId', channel.id)
        .orderBy('createdAt', 'desc')
        .first()

      if (lastMessage) {
        const lastMessageDate =
          typeof lastMessage.createdAt === 'string'
            ? DateTime.fromISO(lastMessage.createdAt)
            : DateTime.fromJSDate(lastMessage.createdAt as any)

        if (lastMessageDate >= thirtyDaysAgo) {
          activeChannels++
        } else {
          inactiveChannels++
        }
      } else {
        channelsWithoutMessages++
        const channelCreatedDate =
          typeof channel.createdAt === 'string'
            ? DateTime.fromISO(channel.createdAt)
            : DateTime.fromJSDate(channel.createdAt as any)

        if (channelCreatedDate >= thirtyDaysAgo) {
          activeChannels++
        } else {
          inactiveChannels++
        }
      }
    }

    return {
      totalChannels: channels.length,
      activeChannels,
      inactiveChannels,
      channelsWithoutMessages,
    }
  }
}
