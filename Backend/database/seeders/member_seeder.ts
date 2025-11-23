import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Member from '#models/member'
import User from '#models/user'
import Channel from '#models/channel'
import { MemberRole } from '#enums/member_role'
import { DateTime } from 'luxon'

export default class MemberSeeder extends BaseSeeder {
  async run() {
    const users = await User.all()
    const channels = await Channel.all()

    for (const channel of channels) {
      for (const user of users) {
        await Member.updateOrCreate(
          { userId: user.id, channelId: channel.id },
          {
            userId: user.id,
            channelId: channel.id,
            role: user.email === 'admin@example.com' ? MemberRole.ADMIN : MemberRole.MEMBER,
            isMuted: false,
            isBanned: false,
            joinedAt: DateTime.now(),
          }
        )
      }
    }
  }
}
