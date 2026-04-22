import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte({ hot: false })],
  resolve: {
    conditions: ['browser'],
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    include: ['src/**/*.test.{ts,tsx}'],
    // happy-dom still logs a DOMException to console.error on every iframe
    // append even when page loading is disabled — filter that one message so
    // real test failures stay legible.
    onConsoleLog(log, type) {
      if (type === 'stderr' && log.includes('Iframe page loading is disabled')) {
        return false;
      }
    },
    environmentOptions: {
      happyDOM: {
        settings: {
          disableIframePageLoading: true,
        },
      },
    },
    environmentMatchGlobs: [
      ['src/server/**', 'node'],
    ],
  },
});
