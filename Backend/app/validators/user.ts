import vine from '@vinejs/vine'
import { UserStatus } from '#enums/user_status'

const UserStatusValues = Object.values(UserStatus).filter((v) => typeof v === 'number') as number[]

export const getUserByNicknameValidator = vine.compile(
  vine.object({
    nickname: vine.string().trim().minLength(3),
  })
)

export const updateStatusValidator = vine.compile(
  vine.object({
    status: vine
      .number()
      .in(UserStatusValues)
      .transform((value) => value as UserStatus),
  })
)

export const updateSettingsValidator = vine.compile(
  vine.object({
    notificationsEnabled: vine.boolean().optional(),
    directNotificationsOnly: vine.boolean().optional(),
  })
)
