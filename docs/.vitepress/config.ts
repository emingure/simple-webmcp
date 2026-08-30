import { defineConfig } from 'vitepress';

const hostname = 'https://emingure.github.io/simple-webmcp/';

export default defineConfig({
  title: 'simple-webmcp — Make JS Functions Agent-Ready | WebMCP SDK',
  description:
    'Function-first WebMCP SDK for JavaScript & React. Turn any function into a Model Context Protocol browser tool — webmcp(fn) stays callable. Typed, lean, 6.26KB gz.',
  base: '/simple-webmcp/',
  lastUpdated: true,
  cleanUrls: true,
  sitemap: { hostname },
  ignoreDeadLinks: false,
  head: [
    ['link', { rel: 'icon', href: '/simple-webmcp/logo.svg', type: 'image/svg+xml' }],
    ['meta', { name: 'theme-color', content: '#0f172a' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:site_name', content: 'simple-webmcp' }],
    ['meta', { property: 'og:image', content: `${hostname}og.png` }],
    ['meta', { property: 'og:image:width', content: '1200' }],
    ['meta', { property: 'og:image:height', content: '630' }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['link', { rel: 'preconnect', href: 'https://developer.chrome.com' }],
  ],
  transformHead({ pageData }) {
    const path = pageData.relativePath.replace(/\.md$/, '').replace(/\/index$/, '/');
    const baseTrimmed = hostname.replace(/\/$/, '');
    const url = `${baseTrimmed}/${path === '' ? '' : path}`;
    const title = pageData.title ? `${pageData.title} — simple-webmcp | WebMCP SDK` : 'simple-webmcp — WebMCP SDK';
    const description = pageData.description || pageData.frontmatter?.description || '';
    const heads: [string, Record<string, string>, string?][] = [
      ['link', { rel: 'canonical', href: url }],
      ['meta', { property: 'og:title', content: title }],
      ['meta', { property: 'og:url', content: url }],
    ];
    if (description) {
      heads.push(['meta', { property: 'og:description', content: description }]);
      heads.push(['meta', { name: 'description', content: description }]);
    }
    heads.push([
      'script',
      { type: 'application/ld+json' },
      JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'TechArticle',
        headline: pageData.title || 'simple-webmcp',
        description,
        author: { '@type': 'Person', name: 'Muhammed Emin Gure' },
        url,
        isPartOf: { '@type': 'SoftwareApplication', name: 'simple-webmcp' },
      }),
    ]);
    return heads;
  },
  themeConfig: {
    nav: [
      { text: 'Guide', link: '/getting-started' },
      { text: 'Demo', link: '/demo' },
      { text: 'API', link: '/api/' },
      { text: 'Reference', link: '/reference/' },
      { text: 'Examples', link: '/examples/' },
    ],
    sidebar: [
      {
        text: 'Guide',
        collapsed: false,
        items: [
          { text: 'Introduction', link: '/' },
          { text: 'Getting Started', link: '/getting-started' },
          { text: 'Schema & Inference', link: '/guide/schema' },
          { text: 'React', link: '/guide/react' },
          { text: 'Hooks — before/after/error/denied', link: '/guide/hooks' },
          {
            text: 'Analytics & Observability',
            collapsed: false,
            items: [
              { text: 'Overview', link: '/guide/analytics/' },
              { text: 'Step-by-Step Setup', link: '/guide/analytics/step-by-step' },
              { text: 'PostHog', link: '/guide/analytics/posthog' },
              { text: 'Sentry', link: '/guide/analytics/sentry' },
              { text: 'GA4 (gtag)', link: '/guide/analytics/ga4' },
            ],
          },
          { text: 'Inspect', link: '/guide/inspect' },
          { text: 'Browser Support & Polyfill', link: '/guide/browser-support' },
        ],
      },
      {
        text: 'Reference',
        collapsed: false,
        items: [
          { text: 'Core — webmcp()', link: '/reference/' },
          { text: 'React — useWebMCP / Scope', link: '/reference/react' },
          { text: 'Hooks', link: '/reference/hooks' },
          { text: 'Inspect', link: '/reference/inspect' },
          { text: 'Errors & Registry', link: '/reference/errors' },
        ],
      },
      // Keep /api/ as canonical duplicate for backwards-compat; sidebar link points to /api/ but rewrites serve same content
      {
        text: 'API (alias → Reference)',
        collapsed: true,
        items: [
          { text: 'Core — webmcp()', link: '/api/' },
          { text: 'React — useWebMCP / Scope', link: '/api/react' },
          { text: 'Hooks', link: '/api/hooks' },
          { text: 'Inspect', link: '/api/inspect' },
          { text: 'Errors & Registry', link: '/api/errors' },
        ],
      },
      {
        text: 'Examples',
        collapsed: false,
        items: [
          { text: 'Vanilla JS', link: '/examples/vanilla' },
          { text: 'React', link: '/examples/react' },
          { text: 'Zod', link: '/examples/zod' },
          { text: 'Demo — Shopping Cart', link: '/demo' },
        ],
      },
    ],
    outline: [2, 3],
    lastUpdated: { text: 'Last updated' },
    editLink: {
      pattern: 'https://github.com/emingure/simple-webmcp/edit/main/docs/:path',
      text: 'Edit this page on GitHub',
    },
    docFooter: { prev: 'Previous', next: 'Next' },
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
