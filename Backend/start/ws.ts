import Ws from '#services/ws'
import scheduler from '#services/scheduler'
import app from '@adonisjs/core/services/app'

app.ready(async () => {
  Ws.boot()
  scheduler.start()
})

app.terminating(async () => {
  scheduler.stop()
})
