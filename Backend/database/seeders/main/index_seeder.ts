import { BaseSeeder } from '@adonisjs/lucid/seeders'

export default class IndexSeeder extends BaseSeeder {
  private async seed(Seeder: { default: typeof BaseSeeder }) {
    console.log('Seeding:', Seeder.default.name)
    try {
      await new Seeder.default(this.client).run()
      console.log('Finished seeding:', Seeder.default.name)
    } catch (error) {
      console.error('Seeder failed:', Seeder.default.name, error)
    }
  }

  public async run() {
    await this.seed(await import('#database/seeders/user_seeder'))
    await this.seed(await import('#database/seeders/access_token_seeder'))
    await this.seed(await import('#database/seeders/channel_seeder'))
    await this.seed(await import('#database/seeders/member_seeder'))
    await this.seed(await import('#database/seeders/channel_seeder'))
    await this.seed(await import('#database/seeders/message_seeder'))
    await this.seed(await import('#database/seeders/channel_draft_seeder'))
    await this.seed(await import('#database/seeders/channel_kick_ban_seeder'))
  }
}
