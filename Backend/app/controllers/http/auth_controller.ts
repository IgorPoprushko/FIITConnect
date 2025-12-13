import type { HttpContext } from '@adonisjs/core/http'
import { registerValidator, loginValidator } from '#validators/auth'
import User from '#models/user'
import { UserStatus } from '#enums/global_enums'
import { RegisterPayload, LoginPayload, AuthResponse, MeResponse } from '#contracts/auth_contracts'

export default class AuthController {
  async register({ request, response }: HttpContext) {
    // Get validated data
    const payload = (await request.validateUsing(registerValidator)) as RegisterPayload
    const passwordHash = payload.password
    console.info('[AUTH][register] payload', { email: payload.email, nickname: payload.nickname })

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

    console.info('[AUTH][register] created user', { id: user.id, email: user.email })
    return response.created({
      user: user.serialize(),
      token: token,
    } as AuthResponse)
  }

  async login({ request, response }: HttpContext) {
    const { email, password } = (await request.validateUsing(loginValidator)) as LoginPayload

    try {
      const user = await User.verifyCredentials(email, password)
      await user.load('setting')
      const token = await User.accessTokens.create(user)
      console.info('[AUTH][login] success', { id: user.id, email: user.email })
      return response.ok({ user, token } as AuthResponse)
    } catch (e) {
      console.warn('[AUTH][login] failed', { email })
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
    } as MeResponse)
  }

  async logout({ auth, response }: HttpContext) {
    if (auth.isAuthenticated) {
      await auth.use('api').invalidateToken()
      return response.noContent()
    }
    return response.unauthorized({ errors: [{ message: 'Not authenticated' }] })
  }
}
