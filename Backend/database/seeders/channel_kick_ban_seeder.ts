import { BaseSeeder } from '@adonisjs/lucid/seeders'
import ChannelKickBan from '#models/channel_kick_ban'
import User from '#models/user'
import Channel from '#models/channel'
import { DateTime } from 'luxon'

export default class ChannelKickBanSeeder extends BaseSeeder {
  async run() {
    const user = await User.findByOrFail('email', 'andre@example.com')
    const channel = await Channel.findByOrFail('name', 'general')

    await ChannelKickBan.updateOrCreate(
      { channelId: channel.id, targetUserId: user.id },
      {
        channelId: channel.id,
        targetUserId: user.id,
        permanent: false,
        reason: 'Spamming emojis',
        kickedAt: DateTime.now(),
      }
    )
  }
}
