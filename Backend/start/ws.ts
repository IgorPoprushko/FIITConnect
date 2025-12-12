import Ws from '#services/ws'
import app from '@adonisjs/core/services/app'

app.ready(async () => {
  Ws.boot()
})
