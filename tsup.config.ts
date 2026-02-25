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
  // Angular wrapper
  {
    entry: { 'angular/index': 'src/angular/index.ts' },
    format: ['esm', 'cjs'],
    dts: true,
    outDir: 'dist',
    external: ['@angular/core'],
    sourcemap: true,
    outExtension({ format }) {
      return { js: format === 'esm' ? '.mjs' : '.cjs' };
    },
  },
  // Server SDK — ESM + CJS (Node.js only)
  {
    entry: { 'server/index': 'src/server/index.ts' },
    format: ['esm', 'cjs'],
    dts: true,
    outDir: 'dist',
    platform: 'node',
    target: 'node18',
    sourcemap: true,
    outExtension({ format }) {
      return { js: format === 'esm' ? '.mjs' : '.cjs' };
    },
  },
  // Server framework integrations
  {
    entry: {
      'server/integrations/sveltekit': 'src/server/integrations/sveltekit.ts',
      'server/integrations/nextjs': 'src/server/integrations/nextjs.ts',
      'server/integrations/nuxt': 'src/server/integrations/nuxt.ts',
      'server/integrations/angular': 'src/server/integrations/angular.ts',
      'server/integrations/react-router': 'src/server/integrations/react-router.ts',
      'server/integrations/express': 'src/server/integrations/express.ts',
    },
    format: ['esm', 'cjs'],
    dts: true,
    outDir: 'dist',
    platform: 'node',
    target: 'node18',
    sourcemap: true,
    outExtension({ format }) {
      return { js: format === 'esm' ? '.mjs' : '.cjs' };
    },
  },
]);
