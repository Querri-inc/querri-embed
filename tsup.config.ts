import { defineConfig } from 'tsup';

export default defineConfig([
  // Core SDK — ESM + CJS
  {
    entry: { 'core/index': 'src/core/index.ts' },
    format: ['esm', 'cjs'],
    dts: true,
    outDir: 'dist',
    clean: true,
    sourcemap: true,
    outExtension({ format }) {
      return { js: format === 'esm' ? '.mjs' : '.cjs' };
    },
  },
  // Core SDK — IIFE for script tag consumers
  {
    entry: { 'core/querri-embed.iife': 'src/core/iife.ts' },
    format: ['iife'],
    globalName: 'QuerriEmbedModule',
    outDir: 'dist',
    minify: true,
    sourcemap: true,
    footer: {
      // Unwrap the module to expose QuerriEmbed directly on window
      js: 'if(typeof window!=="undefined"&&window.QuerriEmbedModule){window.QuerriEmbed=window.QuerriEmbedModule.QuerriEmbed;delete window.QuerriEmbedModule;}',
    },
  },
  // React wrapper
  {
    entry: { 'react/index': 'src/react/index.ts' },
    format: ['esm', 'cjs'],
    dts: true,
    outDir: 'dist',
    external: ['react', 'react-dom', 'react/jsx-runtime'],
    sourcemap: true,
    outExtension({ format }) {
      return { js: format === 'esm' ? '.mjs' : '.cjs' };
    },
  },
  // Vue wrapper
  {
    entry: { 'vue/index': 'src/vue/index.ts' },
    format: ['esm', 'cjs'],
    dts: true,
    outDir: 'dist',
    external: ['vue'],
    sourcemap: true,
    outExtension({ format }) {
      return { js: format === 'esm' ? '.mjs' : '.cjs' };
    },
  },
]);
