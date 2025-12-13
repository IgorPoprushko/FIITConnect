/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

router.get('/', async () => {
  return {
    hello: 'world',
  }
})

// Public routes
// Auth
router.post('auth/register', '#controllers/auth_controller.register') //V
router.post('auth/login', '#controllers/auth_controller.login') //V

// Guarded routes
router
  .group(() => {
    // Auth -> V
    router.post('auth/logout', '#controllers/auth_controller.logout') //V
    router.get('me', '#controllers/auth_controller.me') //V
  })
  .middleware([middleware.auth()])
