import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'simple-webmcp',
  description: 'Turn any JS/TS function into a WebMCP tool — function-first, lean, typed.',
  base: '/simple-webmcp/',
  themeConfig: {
    nav: [
      { text: 'Guide', link: '/getting-started' },
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
          { text: 'Zod & StandardSchema', link: '/guide/zod' },
          { text: 'Polyfill', link: '/guide/polyfill' },
        ],
      },
      {
        text: 'API',
        items: [
          { text: 'Core — webmcp()', link: '/api/' },
          { text: 'React — useWebMCP / Scope', link: '/api/react' },
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
