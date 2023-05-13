import { defineConfig } from 'vitest/config'

export default defineConfig({
  define: {
    __VUE_OPTIONS_API__: 'true',
    __VUE_PROD_DEVTOOLS__: 'false',
  },
  test: {
    reporters: 'dot',
    deps: {
      inline: ['@vue'],
    },
  },
})
