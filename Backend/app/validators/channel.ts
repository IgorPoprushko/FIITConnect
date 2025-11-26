import vine from '@vinejs/vine'
import { ChannelType } from '#enums/channel_type'

export const createChannelValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(3).maxLength(30),
    type: vine.enum(Object.values(ChannelType)),
    description: vine.string().trim().maxLength(255).optional(),
    is_private: vine.boolean().optional(),
  })
)

export const manageMemberValidator = vine.compile(
  vine.object({
    nickname: vine.string().trim().minLength(3).maxLength(30),
  })
)

export const messageValidator = vine.compile(
  vine.object({
    content: vine.string().trim().minLength(1).maxLength(2000),
  })
)
