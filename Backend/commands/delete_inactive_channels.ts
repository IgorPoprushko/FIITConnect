import { BaseCommand } from '@adonisjs/core/commands'
import { CommandOptions } from '@adonisjs/core/types/ace'
import Channel from '#models/channel'
import Message from '#models/message'
import { DateTime } from 'luxon'

export default class DeleteInactiveChannels extends BaseCommand {
  static commandName = 'delete:inactive_channels'
  static description = 'Deletes channels that have been inactive for more than 30 days.'

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    this.logger.info('Starting inactive channel cleanup...')

    const thirtyDaysAgo = DateTime.now().minus({ days: 30 })

    const channels = await Channel.query()
      .preload('messages', (query) => {
        query.orderBy('createdAt', 'desc').limit(1)
      })
      .preload('members')
      .preload('kickVotes')
      .preload('channelDrafts')

    for (const channel of channels) {
      const latestMessage = channel.messages[0]

      let shouldDelete = false

      if (latestMessage) {
        // Channel has messages, check the latest message's timestamp
        if (latestMessage.createdAt < thirtyDaysAgo) {
          shouldDelete = true
        }
      } else {
        // Channel has no messages, check the channel's creation timestamp
        if (channel.createdAt < thirtyDaysAgo) {
          shouldDelete = true
        }
      }

      if (shouldDelete) {
        this.logger.info(`Deleting inactive channel: ${channel.name} (ID: ${channel.id})`)
        await channel.delete() // This assumes cascading deletes are configured for relationships
      }
    }

    this.logger.info('Inactive channel cleanup finished.')
  }
}
