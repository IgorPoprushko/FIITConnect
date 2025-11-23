import { defineConfig, drivers } from '@adonisjs/core/hash'

const hashConfig = defineConfig({
  default: 'argon2',

  list: {
    argon2: drivers.argon2({
      memory: 65536,
      iterations: 4,
      parallelism: 1,
      variant: 'id',
      saltSize: 16,
    }),
  },
})

export default hashConfig

/**
 * Inferring types for the list of hashers you have configured
 * in your application.
 */
declare module '@adonisjs/core/types' {
  export interface HashersList extends InferHashers<typeof hashConfig> {}
}
