import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, statSync } from 'fs';
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

  // In CI the build always precedes the tests, so a missing dist/ there is a
  // broken pipeline, not first-time setup — fail loudly instead of skipping
  // every assertion on the artifacts a release would publish.
  it.runIf(!!process.env.CI)('dist/ exists in CI (build ran before tests)', () => {
    expect(distExists, 'dist/ missing — the CI build step did not run or failed silently').toBe(true);
  });

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

  it.skipIf(!distExists)('dist/svelte/index.js exists and is non-empty', () => {
    expect(fileExists('svelte/index.js')).toBe(true);
  });

  // dist/svelte/index.d.ts is hand-written by scripts/build-svelte.js, so it
  // can drift from src/svelte/index.ts — every type the source entry exports
  // must be exported by the published declarations too.
  it.skipIf(!distExists)('dist/svelte/index.d.ts exports every type src/svelte/index.ts does', () => {
    const typeNames = (text: string) => {
      const names = new Set<string>();
      for (const block of text.matchAll(/export type \{([^}]*)\}/g)) {
        for (const raw of block[1].split(',')) {
          const name = raw.replace(/\/\/.*$/gm, '').trim();
          if (name) names.add(name);
        }
      }
      return names;
    };
    const src = typeNames(readFileSync(resolve(__dirname, '../svelte/index.ts'), 'utf-8'));
    const dist = typeNames(readFileSync(distFile('svelte/index.d.ts'), 'utf-8'));
    expect(src.size).toBeGreaterThan(0);
    expect(src).toContain('QuerriErrorDetail');
    expect(src).toContain('QuerriErrorCode');
    expect([...src].filter((n) => !dist.has(n))).toEqual([]);
  });
});
