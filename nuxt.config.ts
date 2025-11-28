import pkg from './package.json';
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },
  future: { compatibilityVersion: 4 },
  modules: ['@nuxthub/core', 'nuxt-auth-utils', '@pinia/nuxt', '@pinia/colada-nuxt', '@nuxt/ui'],
  hub: {
    database: true,
  },
  colorMode: {
    preference: 'dark',
  },
  devServer: {
    port: 8888,
  },
  nitro: {
    rollupConfig: {
      external: ['picomatch'],
    },
  },
  runtimeConfig: {
    public: {
      version: pkg.version,
    },
  },
});
