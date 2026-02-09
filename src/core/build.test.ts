import { describe, it, expect } from 'vitest';
import { existsSync, statSync } from 'fs';
import { resolve } from 'path';

const DIST = resolve(__dirname, '../../dist');

function distFile(rel: string) {
  return resolve(DIST, rel);
}

function fileExists(rel: string) {
  const p = distFile(rel);
  return existsSync(p) && statSync(p).size > 0;
}

describe('Build outputs', () => {
  // Guard: skip all if dist/ doesn't exist (first-time dev setup before build)
  const distExists = existsSync(DIST);

  it.skipIf(!distExists)('dist/core/index.mjs exists and is non-empty', () => {
    expect(fileExists('core/index.mjs')).toBe(true);
  });

  it.skipIf(!distExists)('dist/core/index.cjs exists and is non-empty', () => {
    expect(fileExists('core/index.cjs')).toBe(true);
  });

  it.skipIf(!distExists)('dist/core/index.d.ts exists and is non-empty', () => {
    expect(fileExists('core/index.d.ts')).toBe(true);
  });

  it.skipIf(!distExists)('dist/core/querri-embed.iife.global.js exists and is non-empty', () => {
    expect(fileExists('core/querri-embed.iife.global.js')).toBe(true);
  });

  it.skipIf(!distExists)('dist/react/index.mjs exists and is non-empty', () => {
    expect(fileExists('react/index.mjs')).toBe(true);
  });

  it.skipIf(!distExists)('dist/react/index.cjs exists and is non-empty', () => {
    expect(fileExists('react/index.cjs')).toBe(true);
  });

  it.skipIf(!distExists)('dist/vue/index.mjs exists and is non-empty', () => {
    expect(fileExists('vue/index.mjs')).toBe(true);
  });

  it.skipIf(!distExists)('dist/vue/index.cjs exists and is non-empty', () => {
    expect(fileExists('vue/index.cjs')).toBe(true);
  });

  it.skipIf(!distExists)('dist/vue/index.d.ts exists and is non-empty', () => {
    expect(fileExists('vue/index.d.ts')).toBe(true);
  });

  it.skipIf(!distExists)('dist/angular/index.mjs exists and is non-empty', () => {
    expect(fileExists('angular/index.mjs')).toBe(true);
  });

  it.skipIf(!distExists)('dist/angular/index.cjs exists and is non-empty', () => {
    expect(fileExists('angular/index.cjs')).toBe(true);
  });

  it.skipIf(!distExists)('dist/angular/index.d.ts exists and is non-empty', () => {
    expect(fileExists('angular/index.d.ts')).toBe(true);
  });

  it.skipIf(!distExists)('dist/svelte/QuerriEmbed.svelte exists and is non-empty', () => {
    expect(fileExists('svelte/QuerriEmbed.svelte')).toBe(true);
  });

  it.skipIf(!distExists)('dist/svelte/index.js exists and is non-empty', () => {
    expect(fileExists('svelte/index.js')).toBe(true);
  });
});
