import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Setting from '#models/setting'
import { UserStatus } from '#enums/user_status'

export default class SettingSeeder extends BaseSeeder {
  async run() {
    await Setting.createMany([
      { status: UserStatus.ONLINE, notificationsEnabled: true, directNotificationsOnly: false },
      { status: UserStatus.OFFLINE, notificationsEnabled: true, directNotificationsOnly: false },
      { status: UserStatus.DND, notificationsEnabled: true, directNotificationsOnly: false },
    ])
  }
}
