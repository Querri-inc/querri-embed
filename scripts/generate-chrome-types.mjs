#!/usr/bin/env node
// Generates src/core/chrome-types.d.ts from schema/chrome-schema.json.
//
// The schema is the published server truth (app.querri.com/sdk/chrome-schema.json,
// vendored byte-identical in schema/). Types are emitted in schema order, so the
// output is deterministic for a given schema file. Leaves with phase > 4 are
// not yet served to SDK embeds and are skipped.
//
// Usage: node scripts/generate-chrome-types.mjs
// Verify freshness: src/core/chrome-types.test.ts regenerates and compares.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

/** Highest phase served to SDK embeds today. Leaves above this are skipped. */
const MAX_PHASE = 4;

function isLeaf(node) {
  return node && typeof node === 'object' && typeof node.type === 'string';
}

function leafTsType(node, path) {
  switch (node.type) {
    case 'bool':
      return 'boolean';
    case 'number':
      return 'number';
    case 'string':
    case 'url':
    case 'color':
      return 'string';
    case 'stringList':
      return 'string[]';
    case 'enum':
      return node.options.map((o) => `'${o}'`).join(' | ');
    case 'promptButtons':
      return 'Array<{ id?: string; label: string; prompt: string }>';
    case 'colorMap':
      return 'Record<string, string>';
    default:
      throw new Error(`Unknown schema leaf type "${node.type}" at ${path}`);
  }
}

function leafDoc(node, indent) {
  const parts = [];
  if (node.default !== undefined) parts.push(`@default ${JSON.stringify(node.default)}`);
  if (typeof node.dependsOn === 'string') parts.push(`Depends on \`${node.dependsOn}\`.`);
  if (parts.length === 0) return '';
  return `${indent}/** ${parts.join(' ')} */\n`;
}

/** Emit the members of a group node (object without `type`) as `key?: ...;` lines. */
function emitGroup(node, indent, path) {
  let out = '';
  for (const [key, child] of Object.entries(node)) {
    const childPath = path ? `${path}.${key}` : key;
    if (isLeaf(child)) {
      if (typeof child.phase === 'number' && child.phase > MAX_PHASE) continue;
      out += leafDoc(child, indent);
      out += `${indent}${key}?: ${leafTsType(child, childPath)};\n`;
    } else if (child && typeof child === 'object') {
      const body = emitGroup(child, indent + '  ', childPath);
      if (body === '') continue; // every leaf inside was above MAX_PHASE
      out += `${indent}${key}?: {\n${body}${indent}};\n`;
    }
  }
  return out;
}

export function generateChromeTypes(schema) {
  const lines = [];
  lines.push('// GENERATED from schema/chrome-schema.json — do not edit; npm run generate:types');
  lines.push(`// Schema version: ${schema.version}`);
  lines.push('');
  lines.push('/**');
  lines.push(' * Chrome (UI surface) configuration for an embedded Querri app, v2 vocabulary.');
  lines.push(' *');
  lines.push(' * Every key is optional; omitted keys keep the runtime default. The runtime');
  lines.push(' * REPLACES the customer config layer on `updateConfig`, so send the whole');
  lines.push(' * object, not a patch.');
  lines.push(' */');
  lines.push('export interface QuerriChromeConfig {');
  for (const [branch, node] of Object.entries(schema.chrome)) {
    const body = emitGroup(node, '    ', branch);
    if (body === '') continue;
    lines.push(`  ${branch}?: {\n${body}  };`);
  }
  lines.push('}');
  lines.push('');
  lines.push('/** Theme overrides applied to the embedded application. */');
  lines.push('export interface QuerriThemeConfig {');
  for (const [key, node] of Object.entries(schema.theme)) {
    if (typeof node.phase === 'number' && node.phase > MAX_PHASE) continue;
    const doc = leafDoc(node, '  ');
    if (doc) lines.push(doc.trimEnd());
    if (node.type === 'colorMap') {
      lines.push(`  ${key}?: Record<string, string>;`);
    } else {
      lines.push(`  ${key}?: ${leafTsType(node, `theme.${key}`)};`);
    }
  }
  lines.push('}');
  lines.push('');
  lines.push('/** Privacy controls for analytics/telemetry inside the embed. */');
  lines.push('export interface QuerriPrivacyConfig {');
  for (const [key, node] of Object.entries(schema.privacy)) {
    if (typeof node.phase === 'number' && node.phase > MAX_PHASE) continue;
    const doc = leafDoc(node, '  ');
    if (doc) lines.push(doc.trimEnd());
    lines.push(`  ${key}?: ${leafTsType(node, `privacy.${key}`)};`);
  }
  lines.push('}');
  lines.push('');
  lines.push('/**');
  lines.push(" * What the runtime actually applied on init/updateConfig, and what it changed");
  lines.push(' * on the way. Each list carries one entry per affected key (typically with a');
  lines.push(' * `path` and a reason); lists are omitted when empty.');
  lines.push(' */');
  lines.push('export interface QuerriConfigChanges {');
  // The change taxonomy is part of the runtime protocol, not the key schema.
  for (const kind of ['upgraded', 'dropped', 'inherited', 'coupled', 'capped', 'pinned', 'truncated']) {
    lines.push(`  ${kind}?: Array<Record<string, unknown>>;`);
  }
  lines.push('}');
  lines.push('');
  lines.push("/** Payload of the `'config'` event (runtime message `config-applied`). */");
  lines.push('export interface QuerriConfigAppliedEvent {');
  lines.push("  type?: 'config-applied';");
  lines.push('  schemaVersion: number;');
  lines.push('  changes: QuerriConfigChanges;');
  lines.push('}');
  lines.push('');
  return lines.join('\n');
}

function main() {
  // Paths resolved here, not at module top level: test runners import this
  // module through a transform where import.meta.url is not a file: URL.
  const schemaPath = fileURLToPath(new URL('../schema/chrome-schema.json', import.meta.url));
  const outputPath = fileURLToPath(new URL('../src/core/chrome-types.d.ts', import.meta.url));
  const schema = JSON.parse(readFileSync(schemaPath, 'utf8'));
  writeFileSync(outputPath, generateChromeTypes(schema));
  console.log(`Wrote ${outputPath}`);
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  main();
}
