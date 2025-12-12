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

    // User -> X
    router.get('users/:nickname', '#controllers/users_controller.getUserByNickname') //P
    router.get('users/me/status', '#controllers/users_controller.getMyStatus') //P
    router.get('users/me/settings', '#controllers/users_controller.getMySettings') //P
    router.patch('users/me/status', '#controllers/users_controller.updateMyStatus') //P
    router.patch('users/me/settings', '#controllers/users_controller.updateMySettings') //P

    // Channel -> X
    router.get('channels', '#controllers/channels_controller.getChannelsMin') //V
    router.post('channels', '#controllers/channels_controller.createChannel') //V
    router.get('channels/:name', '#controllers/channels_controller.getChannelInfoFull') //P
    router.delete('channels/:name', '#controllers/channels_controller.deleteChannel') //P
    router.post('channels/:name/join', '#controllers/channels_controller.joinChannel') //P
    router.post('channels/:name/leave', '#controllers/channels_controller.leaveChannel') //P
    router.post('channels/:name/invite', '#controllers/channels_controller.inviteUserToChannel') //P
    router.post('channels/:name/revoke', '#controllers/channels_controller.revokeUserFromChannel') //P
    router.post('channels/:name/kick', '#controllers/channels_controller.kickUserFromChannel') //P
    router.get('channels/:name/members', '#controllers/channels_controller.getChannelMembers') //P
    router.get('channels/:name/messages', '#controllers/messages_controller.getHistory') //P
    router.post('channels/:name/messages', '#controllers/channels_controller.sendMessageToChannel') //P
  })
  .middleware([middleware.auth()])
