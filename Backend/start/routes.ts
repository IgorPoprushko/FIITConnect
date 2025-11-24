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
router.post('register', '#controllers/auth_controller.register')
router.post('login', '#controllers/auth_controller.login')

// Guarded routes
router
  .group(() => {
    router.get('me', '#controllers/auth_controller.me')
    router.delete('logout', '#controllers/auth_controller.logout')
    router.get('channels', '#controllers/channels_controller.getJoinChannels')
    router.post('channels', '#controllers/channels_controller.createChannel')
    router.delete('channels/:id', '#controllers/channels_controller.deleteChannel')
  })
  .middleware([middleware.auth()])
