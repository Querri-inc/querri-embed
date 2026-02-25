import { existsSync, statSync } from 'fs';
import { resolve } from 'path';

const DIST = resolve(__dirname, '../../../dist');

function fileExists(rel: string) {
  const p = resolve(DIST, rel);
  return existsSync(p) && statSync(p).size > 0;
}

describe('Server build outputs', () => {
  const distExists = existsSync(DIST);

  // server/index
  it.skipIf(!distExists)('dist/server/index.mjs exists and is non-empty', () => {
    expect(fileExists('server/index.mjs')).toBe(true);
  });

  it.skipIf(!distExists)('dist/server/index.cjs exists and is non-empty', () => {
    expect(fileExists('server/index.cjs')).toBe(true);
  });

  it.skipIf(!distExists)('dist/server/index.d.ts exists and is non-empty', () => {
    expect(fileExists('server/index.d.ts')).toBe(true);
  });

  // integrations/sveltekit
  it.skipIf(!distExists)('dist/server/integrations/sveltekit.mjs exists and is non-empty', () => {
    expect(fileExists('server/integrations/sveltekit.mjs')).toBe(true);
  });

  it.skipIf(!distExists)('dist/server/integrations/sveltekit.cjs exists and is non-empty', () => {
    expect(fileExists('server/integrations/sveltekit.cjs')).toBe(true);
  });

  it.skipIf(!distExists)('dist/server/integrations/sveltekit.d.ts exists and is non-empty', () => {
    expect(fileExists('server/integrations/sveltekit.d.ts')).toBe(true);
  });

  // integrations/nextjs
  it.skipIf(!distExists)('dist/server/integrations/nextjs.mjs exists and is non-empty', () => {
    expect(fileExists('server/integrations/nextjs.mjs')).toBe(true);
  });

  it.skipIf(!distExists)('dist/server/integrations/nextjs.cjs exists and is non-empty', () => {
    expect(fileExists('server/integrations/nextjs.cjs')).toBe(true);
  });

  it.skipIf(!distExists)('dist/server/integrations/nextjs.d.ts exists and is non-empty', () => {
    expect(fileExists('server/integrations/nextjs.d.ts')).toBe(true);
  });

  // integrations/nuxt
  it.skipIf(!distExists)('dist/server/integrations/nuxt.mjs exists and is non-empty', () => {
    expect(fileExists('server/integrations/nuxt.mjs')).toBe(true);
  });

  it.skipIf(!distExists)('dist/server/integrations/nuxt.cjs exists and is non-empty', () => {
    expect(fileExists('server/integrations/nuxt.cjs')).toBe(true);
  });

  it.skipIf(!distExists)('dist/server/integrations/nuxt.d.ts exists and is non-empty', () => {
    expect(fileExists('server/integrations/nuxt.d.ts')).toBe(true);
  });

  // integrations/angular
  it.skipIf(!distExists)('dist/server/integrations/angular.mjs exists and is non-empty', () => {
    expect(fileExists('server/integrations/angular.mjs')).toBe(true);
  });

  it.skipIf(!distExists)('dist/server/integrations/angular.cjs exists and is non-empty', () => {
    expect(fileExists('server/integrations/angular.cjs')).toBe(true);
  });

  it.skipIf(!distExists)('dist/server/integrations/angular.d.ts exists and is non-empty', () => {
    expect(fileExists('server/integrations/angular.d.ts')).toBe(true);
  });

  // integrations/react-router
  it.skipIf(!distExists)('dist/server/integrations/react-router.mjs exists and is non-empty', () => {
    expect(fileExists('server/integrations/react-router.mjs')).toBe(true);
  });

  it.skipIf(!distExists)('dist/server/integrations/react-router.cjs exists and is non-empty', () => {
    expect(fileExists('server/integrations/react-router.cjs')).toBe(true);
  });

  it.skipIf(!distExists)('dist/server/integrations/react-router.d.ts exists and is non-empty', () => {
    expect(fileExists('server/integrations/react-router.d.ts')).toBe(true);
  });

  // integrations/express
  it.skipIf(!distExists)('dist/server/integrations/express.mjs exists and is non-empty', () => {
    expect(fileExists('server/integrations/express.mjs')).toBe(true);
  });

  it.skipIf(!distExists)('dist/server/integrations/express.cjs exists and is non-empty', () => {
    expect(fileExists('server/integrations/express.cjs')).toBe(true);
  });

  it.skipIf(!distExists)('dist/server/integrations/express.d.ts exists and is non-empty', () => {
    expect(fileExists('server/integrations/express.d.ts')).toBe(true);
  });
});
