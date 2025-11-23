import vine from '@vinejs/vine'

export const registerValidator = vine.compile(
  vine.object({
    first_name: vine.string().trim().minLength(2).maxLength(15),
    last_name: vine.string().trim().minLength(2).maxLength(15),
    nickname: vine
      .string()
      .trim()
      .minLength(3)
      .maxLength(20)
      .regex(/^[a-zA-Z0-9_]+$/),
    email: vine.string().trim().email(),
    password: vine.string().minLength(6).maxLength(50),
  })
)

export const loginValidator = vine.compile(
  vine.object({
    email: vine.string().trim().email(),
    password: vine.string().minLength(6).maxLength(50),
  })
)
