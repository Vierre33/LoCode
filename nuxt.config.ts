// https://nuxt.com/docs/api/configuration/nuxt-config
const mode = process.env.LOCODE_MODE || 'desktop'; // 'desktop' | 'web'

export default defineNuxtConfig({
    compatibilityDate: '2025-07-15',
    devtools: { enabled: false },
    modules: ['@nuxt/ui', '@nuxt/ui-pro'],
    css: ['~/assets/css/main.css'],
    runtimeConfig: {
        public: {
            mode, // 'desktop' = full (local + SSH), 'web' = SSH-only
        },
    },
    nitro: {
        experimental: { websocket: true },
        rollupConfig: {
            external: mode === 'web'
                ? [/^ssh2/]
                : [/^ssh2/, /^node-pty/],
        },
    },
});
