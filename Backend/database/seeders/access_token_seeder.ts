import { BaseSeeder } from '@adonisjs/lucid/seeders'
import User from '#models/user'

export default class AccessTokenSeeder extends BaseSeeder {
  async run() {
    const users = await User.query().select('*')

    for (const user of users) {
      const token = await User.accessTokens.create(user, ['*'], {
        name: `${user.email}-token`,
        expiresIn: '5 days',
      })
      console.log(`Created access token for ${user.email}: ${token.value!.release()}`)
    }
  }
}
