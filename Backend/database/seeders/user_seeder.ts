import { BaseSeeder } from '@adonisjs/lucid/seeders'
import User from '#models/user'
import hash from '@adonisjs/core/services/hash'
import Setting from '#models/setting'
import { DateTime } from 'luxon'
import { UserStatus } from '#enums/user_status'

export default class UserSeeder extends BaseSeeder {
  async run() {
    const passwordHash = await hash.make('password123')

    const usersData = [
      { email: 'admin@example.com', firstName: 'Admin', lastName: 'User', nickname: 'admin' },
      { email: 'igor@example.com', firstName: 'Igor', lastName: 'Poprushko', nickname: 'igor' },
      { email: 'andre@example.com', firstName: 'Andrii', lastName: 'Popovych', nickname: 'andre' },
    ]

    for (const user of usersData) {
      const newUser = await User.updateOrCreate(
        { email: user.email },
        {
          email: user.email,
          passwordHash: passwordHash,
          firstName: user.firstName,
          lastName: user.lastName,
          nickname: user.nickname,
          lastSeenAt: null,
          updatedAt: DateTime.now(),
          createdAt: DateTime.now(),
        }
      )
      await Setting.updateOrCreate(
        { userId: newUser.id },
        {
          userId: newUser.id,
          notificationsEnabled: true,
          directNotificationsOnly: false,
          status: UserStatus.ONLINE,
          updatedAt: DateTime.now(),
          createdAt: DateTime.now(),
        }
      )
    }
  }
}
