import path from 'path'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxtjs/tailwindcss',
    '@nuxtjs/strapi',
    '@nuxtjs/google-fonts',
    'nuxt-svgo',
    '@zadigetvoltaire/nuxt-gtm',
    'nuxt-simple-sitemap',
    '@nuxt/image',
  ],

  app: {
    head: {
      title: 'Bracket Bear',
      titleTemplate: '%s | Bracket Bear',
    },
  },

  alias: {
    '%': path.resolve(__dirname, '../cms/types/generated'),
  },

  css: [
    '@/assets/styles/main.css',
  ],

  runtimeConfig: {
    public: {
      appName: 'Bracket Bear',
      appUrl: 'https://bracketbear.com',
      appDescription: 'Bracket Bear is a web application that allows you to create and manage tournaments.',
      blogEnabled: false,
    },
  },

  image: {
    providers: {
      strapi: {
        url: process.env.STRAPI_URL || '127.0.0.1:1337',
      },
      ipxStatic: {},
    },
    domains: ['127.0.0.1:1337', 'bracket-bear-cms-uploads.s3.amazonaws.com'],
    alias: {
      'aws-s3': 'https://bracket-bear-cms-uploads.s3.amazonaws.com',
      strapi: process.env.STRAPI_URL || 'http://127.0.0.1:1337',
    },
  },

  googleFonts: {
    families: {
      Bungee: true,
      Heebo: [400, 500, 700],
    },
  },

  devtools: {
    enabled: true,
  },

  gtm: {
    id: process.env.NUXT_GTM_ID || 'GTM-KX3KKDT9',
  },

  // https://sitemap.nuxtjs.org/
  site: {
    url: 'https://bracketbear.com',
  },

  strapi: {
    url: process.env.STRAPI_URL || 'http://127.0.0.1:1337',
    prefix: '/api',
  },
})
