import type { HttpContext } from '@adonisjs/core/http'
import { registerValidator, loginValidator } from '#validators/auth'
import User from '#models/user'
import hash from '@adonisjs/core/services/hash'
import Setting from '#models/setting'
import { UserStatus } from '#enums/user_status'

export default class AuthController {
  async register({ request, response }: HttpContext) {
    // Get validated data
    const payload = (await request.validateUsing(registerValidator)) as {
      first_name: string
      last_name: string
      nickname: string
      email: string
      password: string
    }

    // Create default setting for the new user
    const setting = await Setting.create({
      status: UserStatus.ONLINE,
      notificationsEnabled: true,
      directNotificationsOnly: false,
    })

    const user = await User.create({
      firstName: payload.first_name,
      lastName: payload.last_name,
      nickname: payload.nickname,
      email: payload.email,
      passwordHash: await hash.use('scrypt').make(payload.password),
      settingId: setting.id,
    })

    setting.userId = user.id
    await setting.save()

    // Create access token for the user
    const token = await User.accessTokens.create(user)

    return response.created({
      user: user.serialize(),
      token: token,
    })
  }

  async login({ request, response }: HttpContext) {
    const { email, password } = await request.validateUsing(loginValidator)

    try {
      const user = await User.verifyCredentials(email, password)
      const token = await User.accessTokens.create(user)
      return response.ok({ user, token })
    } catch (e) {
      return response.badRequest({ errors: [{ message: 'Invalid email or password' }] })
    }
  }

  async me({ auth, response }: HttpContext) {
    if (!auth.isAuthenticated || !auth.user) {
      return response.unauthorized({ errors: [{ message: 'Not authenticated' }] })
    }

    return response.ok({
      user: auth.user.serialize(),
    })
  }

  async logout({ auth, response }: HttpContext) {
    if (auth.isAuthenticated) {
      await auth.use('api').invalidateToken()
      return response.noContent()
    }
    return response.unauthorized({ errors: [{ message: 'Not authenticated' }] })
  }
}
