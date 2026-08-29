import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    react: 'src/react/index.ts',
    polyfill: 'src/polyfill.ts',
    'dev-polyfill': 'src/dev-polyfill.ts',
    testing: 'src/testing.ts',
    zod: 'src/zod.ts',
    inspect: 'src/inspect.ts',
    devtools: 'src/devtools/index.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  treeshake: true,
  splitting: false,
  target: 'es2020',
  external: ['react', 'react-dom'],
  outDir: 'dist',
  minify: false,
});
