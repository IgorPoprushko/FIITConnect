import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import MessageRepository from '#repositories/message_repository'
import Channel from '#models/channel'
import Member from '#models/member'
import { Exception } from '@adonisjs/core/exceptions'

@inject()
export default class MessagesController {
  constructor(private messageRepository: MessageRepository) {}

  public async getHistory({ request, response, auth, params }: HttpContext) {
    const user = auth.user!
    const { channelName } = params
    const { limit = 50, offset = 0 } = request.qs()

    const channel = await Channel.findBy('name', channelName)
    if (!channel) {
      return response.notFound({ message: 'Channel not found' })
    }

    const membership = await Member.query()
      .where('userId', user.id)
      .andWhere('channelId', channel.id)
      .first()

    if (!membership || membership.isBanned) {
      return response.forbidden({ message: 'You are not an active member of this channel.' })
    }

    const history = await this.messageRepository.getHistory(channel.id, limit, offset)

    return response.ok(history)
  }
}
