import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Message from '#models/message'
import User from '#models/user'
import Channel from '#models/channel'

export default class MessageSeeder extends BaseSeeder {
  async run() {
    const user = await User.findByOrFail('email', 'igor@example.com')
    const channel = await Channel.findByOrFail('name', 'general')

    await Message.createMany([
      {
        userId: user.id,
        channelId: channel.id,
        content: 'Hello general channel!',
      },
      {
        userId: user.id,
        channelId: channel.id,
        content: 'Private channel message',
      },
    ])
  }
}
