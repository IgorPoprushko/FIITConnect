import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Channel from '#models/channel'
import User from '#models/user'
import { ChannelType } from '#enums/channel_type'

export default class ChannelSeeder extends BaseSeeder {
  async run() {
    const owner = await User.findByOrFail('email', 'admin@example.com')

    await Channel.updateOrCreateMany('name', [
      {
        name: 'general',
        description: 'General discussion',
        type: ChannelType.PUBLIC,
        ownerUserId: owner.id,
      },
      {
        name: 'random',
        description: 'Random stuff',
        type: ChannelType.PUBLIC,
        ownerUserId: owner.id,
      },
    ])
  }
}
