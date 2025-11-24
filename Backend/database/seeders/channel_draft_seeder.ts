import { BaseSeeder } from '@adonisjs/lucid/seeders'
import ChannelDraft from '#models/channel_draft'
import User from '#models/user'
import { DateTime } from 'luxon'
import Channel from '#models/channel'

export default class ChannelDraftSeeder extends BaseSeeder {
  async run() {
    const user = await User.findByOrFail('email', 'igor@example.com')
    const channel = await Channel.firstOrFail()

    await ChannelDraft.updateOrCreate(
      { userId: user.id, channelId: channel.id },
      {
        content: 'Draft message...',
        updatedAt: DateTime.now(),
      }
    )
  }
}
