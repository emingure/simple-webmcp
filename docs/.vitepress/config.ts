import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'simple-webmcp',
  description: 'Make your existing functions agent-ready — webmcp(fn) stays callable. Function-first, typed, lean.',
  base: '/simple-webmcp/',
  ignoreDeadLinks: true,
  themeConfig: {
    nav: [
      { text: 'Guide', link: '/getting-started' },
      { text: 'Demo', link: '/demo' },
      { text: 'API', link: '/api/' },
      { text: 'Examples', link: '/examples/' },
    ],
    sidebar: [
      {
        text: 'Guide',
        items: [
          { text: 'Introduction', link: '/' },
          { text: 'Getting Started', link: '/getting-started' },
          { text: 'Schema & Inference', link: '/guide/schema' },
          { text: 'React', link: '/guide/react' },
          { text: 'Hooks — before/after/error/denied', link: '/guide/hooks' },
          { text: 'Analytics & Observability', link: '/guide/analytics' },
          { text: 'Inspect', link: '/guide/inspect' },
          { text: 'Zod & StandardSchema', link: '/guide/zod' },
          { text: 'Polyfill', link: '/guide/polyfill' },
        ],
      },
      {
        text: 'API',
        items: [
          { text: 'Core — webmcp()', link: '/api/' },
          { text: 'React — useWebMCP / Scope', link: '/api/react' },
          { text: 'Hooks', link: '/api/hooks' },
          { text: 'Inspect', link: '/api/inspect' },
          { text: 'Zod Adapter', link: '/api/zod' },
          { text: 'Errors & Registry', link: '/api/errors' },
        ],
      },
      {
        text: 'Examples',
        items: [
          { text: 'Vanilla JS', link: '/examples/vanilla' },
          { text: 'React', link: '/examples/react' },
          { text: 'Zod', link: '/examples/zod' },
          { text: 'Demo — Shopping Cart', link: '/demo' },
        ],
      },
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/emingure/simple-webmcp' },
      { icon: 'npm', link: 'https://www.npmjs.com/package/simple-webmcp' },
    ],
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2026 Muhammed Emin Gure',
    },
    search: { provider: 'local' },
  },
  markdown: {
    theme: { light: 'github-light', dark: 'github-dark' },
  },
});
