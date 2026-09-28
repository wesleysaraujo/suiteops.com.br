// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';
import tailwindcss from '@tailwindcss/vite';

// SuiteOps — site institucional e landing comercial.
// Pré-renderizado estaticamente para máxima velocidade, indexação e SEO impecável.
export default defineConfig({
  site: 'https://www.suiteops.com.br',
  output: 'static',
  integrations: [
    sitemap({
      filter: (page) => !page.includes('/api/'),
      serialize: (item) => ({
        ...item,
        url: item.url.replace(/(.+)\/$/, '$1'),
      }),
    }),
  ],
  adapter: vercel({
    webAnalytics: { enabled: true },
  }),
  vite: {
    plugins: [tailwindcss()],
  },
});
