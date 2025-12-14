import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

router.get('/', async () => {
  return {
    hello: 'world',
  }
})

router
  .group(() => {
    router.post('register', '#controllers/http/auth_controller.register')

    router.post('login', '#controllers/http/auth_controller.login')

    router
      .group(() => {
        router.post('logout', '#controllers/http/auth_controller.logout')

        router.get('me', '#controllers/http/auth_controller.me')
      })
      .middleware([middleware.auth()])
  })
  .prefix('auth')
