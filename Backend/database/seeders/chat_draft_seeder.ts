import { BaseSeeder } from '@adonisjs/lucid/seeders'
import ChatDraft from '#models/chat_draft'
import User from '#models/user'
import Chat from '#models/chat'
import { DateTime } from 'luxon'

export default class ChatDraftSeeder extends BaseSeeder {
  async run() {
    const user = await User.findByOrFail('email', 'igor@example.com')
    const chat = await Chat.firstOrFail()

    await ChatDraft.updateOrCreate(
      { userId: user.id, chatId: chat.id, channelId: null },
      {
        content: 'Draft message...',
        updatedAt: DateTime.now(),
      }
    )
  }
}
