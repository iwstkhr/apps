import type { Config } from '@react-router/dev/config'

const basename =
  process.env.NODE_ENV === 'production' && process.env.BASE_PATH ? process.env.BASE_PATH : '/'

export default {
  ssr: false,
  basename,
} satisfies Config
