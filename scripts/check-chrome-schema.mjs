#!/usr/bin/env node
// Checks that the vendored schema/chrome-schema.json still matches the
// published schema. Reachable-and-different exits 1 (re-vendor + regenerate
// types); network failure is neutral — a warning and exit 0 — so offline/CI
// sandboxes don't fail the build on connectivity.
//
// Override the source with QUERRI_SCHEMA_URL (e.g. a staging deploy).

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const SCHEMA_PATH = fileURLToPath(new URL('../schema/chrome-schema.json', import.meta.url));
const SCHEMA_URL = process.env.QUERRI_SCHEMA_URL || 'https://app.querri.com/sdk/chrome-schema.json';

async function main() {
  const local = readFileSync(SCHEMA_PATH, 'utf8');

  let remote;
  try {
    const res = await fetch(SCHEMA_URL, { headers: { Accept: 'application/json' } });
    if (!res.ok) {
      console.warn(`check-chrome-schema: ${SCHEMA_URL} answered ${res.status}; skipping check (neutral).`);
      process.exit(0);
    }
    remote = await res.text();
  } catch (err) {
    console.warn(`check-chrome-schema: could not reach ${SCHEMA_URL} (${err && err.message}); skipping check (neutral).`);
    process.exit(0);
  }

  // A deploy that doesn't serve the schema yet answers with the SPA catch-all
  // HTML page (status 200). That is "schema not published here", not "schema
  // differs" — treat it like unreachable so the check stays neutral.
  try {
    JSON.parse(remote);
  } catch {
    console.warn(`check-chrome-schema: ${SCHEMA_URL} did not return JSON (SPA catch-all?); skipping check (neutral).`);
    process.exit(0);
  }

  if (remote === local) {
    console.log(`check-chrome-schema: schema/chrome-schema.json matches ${SCHEMA_URL}.`);
    process.exit(0);
  }

  console.error(
    `check-chrome-schema: schema/chrome-schema.json DIFFERS from ${SCHEMA_URL}.\n` +
    '  Re-vendor the published schema and regenerate the types:\n' +
    `    curl -fsSL ${SCHEMA_URL} -o schema/chrome-schema.json\n` +
    '    npm run generate:types',
  );
  process.exit(1);
}

main();
