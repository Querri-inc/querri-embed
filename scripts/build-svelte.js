/**
 * Build script for the Svelte component.
 *
 * - Copies the raw .svelte source to dist/ (for svelte-aware bundlers)
 * - Compiles a JS fallback (for non-Svelte bundlers using the "import" condition)
 * - Generates a minimal .d.ts file
 */

import { compile } from 'svelte/compiler';
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'fs';

const SVELTE_SRC = 'src/svelte/QuerriEmbed.svelte';
const OUT_DIR = 'dist/svelte';

mkdirSync(OUT_DIR, { recursive: true });

// 1. Copy raw .svelte source for svelte-aware bundlers
copyFileSync(SVELTE_SRC, `${OUT_DIR}/QuerriEmbed.svelte`);

// 2. Compile to JS fallback
const source = readFileSync(SVELTE_SRC, 'utf-8');
const result = compile(source, {
  generate: 'client',
  css: 'injected',
  filename: 'QuerriEmbed.svelte',
});

// Fix the relative import path: source uses ../core/querri-embed.js but
// dist/core/ has index.mjs (tsup output). Also add a named export so
// consumers can use either `import QuerriEmbed` or `import { QuerriEmbed }`.
let compiledCode = result.js.code;
compiledCode = compiledCode.replace(
  `from '../core/querri-embed.js'`,
  `from '../core/index.mjs'`,
);
compiledCode += '\nexport { QuerriEmbed };\n';

writeFileSync(`${OUT_DIR}/index.js`, compiledCode);

// 3. Generate type declarations
writeFileSync(
  `${OUT_DIR}/index.d.ts`,
  `import type { SvelteComponent } from 'svelte';
import type {
  QuerriAuth,
  QuerriChromeConfig,
  QuerriInstance,
} from '../core/index.js';

export interface QuerriEmbedProps {
  serverUrl: string;
  auth: QuerriAuth;
  startView?: string;
  chrome?: QuerriChromeConfig;
  theme?: Record<string, unknown>;
  [key: string]: unknown;
}

export declare class QuerriEmbed extends SvelteComponent<QuerriEmbedProps> {
  getInstance(): QuerriInstance | null;
  getIframe(): HTMLIFrameElement | null;
}

export default QuerriEmbed;

export type {
  QuerriAuth,
  QuerriShareKeyAuth,
  QuerriTokenAuth,
  QuerriChromeConfig,
  QuerriInstance,
  QuerriEmbedOptions,
  QuerriEventType,
  QuerriEventCallback,
  QuerriErrorEvent,
  QuerriNavigationEvent,
} from '../core/index.js';
`
);

console.log('Svelte build complete: dist/svelte/');
