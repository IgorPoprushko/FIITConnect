import Ws from '#services/ws'
import app from '@adonisjs/core/services/app'

app.ready(async () => {
  const wsInstance = await app.container.make(Ws)
  wsInstance.boot()
})
