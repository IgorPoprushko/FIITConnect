import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Chat from '#models/chat'
import User from '#models/user'

export default class ChatSeeder extends BaseSeeder {
  async run() {
    const user1 = await User.findByOrFail('email', 'igor@example.com')
    const user2 = await User.findByOrFail('email', 'andre@example.com')

    await Chat.updateOrCreate(
      { user1Id: user1.id, user2Id: user2.id },
      {
        user1Id: user1.id,
        user2Id: user2.id,
      }
    )
  }
}
