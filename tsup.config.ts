import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    react: 'src/react/index.ts',
    polyfill: 'src/polyfill.ts',
    zod: 'src/zod.ts',
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
