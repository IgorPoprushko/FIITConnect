import { BaseSeeder } from '@adonisjs/lucid/seeders'
import User from '#models/user'
import hash from '@adonisjs/core/services/hash'
import Setting from '#models/setting'
import { DateTime } from 'luxon'

export default class UserSeeder extends BaseSeeder {
  async run() {
    const passwordHash = await hash.make('password123')

    const usersData = [
      { email: 'admin@example.com', firstName: 'Admin', lastName: 'User', nickname: 'admin' },
      { email: 'igor@example.com', firstName: 'Igor', lastName: 'Poprushko', nickname: 'igor' },
      { email: 'andre@example.com', firstName: 'Andrii', lastName: 'Popovych', nickname: 'andre' },
    ]

    const settings = await Setting.query().whereNull('userId')
    let i = 0
    for (const user of usersData) {
      await User.updateOrCreate(
        { email: user.email },
        {
          email: user.email,
          passwordHash: passwordHash,
          firstName: user.firstName,
          lastName: user.lastName,
          nickname: user.nickname,
          settingId: settings[i].id,
          lastSeenAt: null,
          updatedAt: DateTime.now(),
          createdAt: DateTime.now(),
        }
      )
      i++
    }
  }
}
