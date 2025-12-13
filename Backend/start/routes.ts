// start/routes.ts (ВИПРАВЛЕНИЙ ТА ОЧИЩЕНИЙ)

import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

router.get('/', async () => {
  return {
    hello: 'world',
  }
})

// === ГРУПА РОУТІВ ДЛЯ АУТЕНТИФІКАЦІЇ ===
router
  .group(() => {
    // 1. ПУБЛІЧНІ РОУТИ (НЕ ВИМАГАЮТЬ ТОКЕНА)

    // Роут буде: POST /auth/register
    router.post('register', '#controllers/http/auth_controller.register') // ВИПРАВЛЕНО!

    // Роут буде: POST /auth/login
    router.post('login', '#controllers/http/auth_controller.login') // ВИПРАВЛЕНО!

    // 2. ЗАХИЩЕНІ РОУТИ (ВИМАГАЮТЬ ТОКЕН)
    router
      .group(() => {
        // Роут буде: POST /auth/logout
        router.post('logout', '#controllers/http/auth_controller.logout') // ВИПРАВЛЕНО!

        // Роут буде: GET /auth/me
        router.get('me', '#controllers/http/auth_controller.me') // ВИПРАВЛЕНО!
      })
      .middleware([middleware.auth()]) // Застосовуємо auth-middleware
  })
  .prefix('auth') // Цей префікс додає /auth до всіх роутів у групі
// =====================================
