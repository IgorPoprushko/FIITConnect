import type { HttpContext } from '@adonisjs/core/http'
import { registerValidator, loginValidator } from '#validators/auth'
import User from '#models/user'
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
    const passwordHash = payload.password

    const user = await User.create({
      firstName: payload.first_name,
      lastName: payload.last_name,
      nickname: payload.nickname,
      email: payload.email,
      passwordHash,
    })

    await user.related('setting').create({
      status: UserStatus.ONLINE,
      notificationsEnabled: true,
      directNotificationsOnly: false,
    })

    await user.load('setting')
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
      await user.load('setting')
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

    await auth.user.load('setting')

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
