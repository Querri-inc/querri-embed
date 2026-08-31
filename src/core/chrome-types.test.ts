import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — plain .mjs build script, no type declarations
import { generateChromeTypes } from '../../scripts/generate-chrome-types.mjs';

const SCHEMA_PATH = resolve(__dirname, '../../schema/chrome-schema.json');
const GENERATED_PATH = resolve(__dirname, './chrome-types.d.ts');

const schema = JSON.parse(readFileSync(SCHEMA_PATH, 'utf8'));
const generated = readFileSync(GENERATED_PATH, 'utf8');

describe('chrome-types.d.ts', () => {
  it('is up to date with schema/chrome-schema.json (run npm run generate:types)', () => {
    expect(generated).toBe(generateChromeTypes(schema));
  });

  it('types every chrome branch the schema serves', () => {
    const branches = Object.keys(schema.chrome);
    expect(branches.length).toBeGreaterThanOrEqual(10);
    for (const branch of branches) {
      expect(generated, `missing chrome branch "${branch}"`).toMatch(
        new RegExp(`^  ${branch}\\?: \\{$`, 'm'),
      );
    }
  });

  it('every typed top-level branch exists in the schema', () => {
    // Top-level members of QuerriChromeConfig are emitted at two-space indent.
    const body = generated.slice(
      generated.indexOf('export interface QuerriChromeConfig {'),
      generated.indexOf('export interface QuerriThemeConfig {'),
    );
    const typedBranches = [...body.matchAll(/^  (\w+)\?: \{$/gm)].map((m) => m[1]);
    expect(typedBranches.length).toBeGreaterThan(0);
    for (const branch of typedBranches) {
      expect(schema.chrome, `typed branch "${branch}" not in schema`).toHaveProperty(branch);
    }
  });

  it('skips leaves with phase > 4 and phase-5 theme keys', () => {
    // phase-5 chat/dashboard leaves must not be typed
    expect(generated).not.toContain('defaultWorkspaceId');
    expect(generated).not.toContain('defaultProjectUuid');
    expect(generated).not.toContain('tableAgentMode');
    // theme: allowUserOverride is phase 5; scheme never existed in v2
    expect(generated).not.toContain('allowUserOverride');
    expect(generated).not.toContain('scheme?:');
  });

  it('types the theme name enum from the schema options', () => {
    const options: string[] = schema.theme.name.options;
    expect(options).toEqual(['', 'querri', 'querri-dark', 'night']);
    expect(generated).toContain("name?: '' | 'querri' | 'querri-dark' | 'night';");
  });

  it('carries the seven config-applied change lists', () => {
    for (const kind of ['upgraded', 'dropped', 'inherited', 'coupled', 'capped', 'pinned', 'truncated']) {
      expect(generated).toContain(`${kind}?: Array<Record<string, unknown>>;`);
    }
    expect(generated).toContain('schemaVersion: number;');
  });

  it('starts with the generated-file header', () => {
    expect(generated.startsWith('// GENERATED from schema/chrome-schema.json')).toBe(true);
  });
});
