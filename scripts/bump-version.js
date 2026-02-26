/**
 * Syncs the version from package.json into all source and test files.
 *
 * Wired as the npm "version" lifecycle script so that `npm version patch`
 * (or minor/major) updates everything automatically.
 */

import { readFileSync, writeFileSync } from 'fs';

const { version } = JSON.parse(readFileSync('package.json', 'utf-8'));

/** @type {Array<{ file: string, pattern: RegExp, replacement: string }>} */
const targets = [
  // Source files
  {
    file: 'src/core/querri-embed.js',
    pattern: /version: '\d+\.\d+\.\d+'/,
    replacement: `version: '${version}'`,
  },
  {
    file: 'src/core/querri-embed.d.ts',
    pattern: /SDK version string \(semver, e\.g\. `'\d+\.\d+\.\d+'`\)/,
    replacement: `SDK version string (semver, e.g. \`'${version}'\`)`,
  },
  {
    file: 'src/server/http/base-client.ts',
    pattern: /const VERSION = '\d+\.\d+\.\d+'/,
    replacement: `const VERSION = '${version}'`,
  },
  // Test files
  {
    file: 'src/core/querri-embed.test.ts',
    pattern: /expect\(QuerriEmbed\.version\)\.toBe\('\d+\.\d+\.\d+'\)/,
    replacement: `expect(QuerriEmbed.version).toBe('${version}')`,
  },
  {
    file: 'src/react/QuerriEmbed.test.tsx',
    pattern: /version: '\d+\.\d+\.\d+'/,
    replacement: `version: '${version}'`,
  },
  {
    file: 'src/vue/QuerriEmbed.test.ts',
    pattern: /version: '\d+\.\d+\.\d+'/,
    replacement: `version: '${version}'`,
  },
  {
    file: 'src/svelte/QuerriEmbed.test.ts',
    pattern: /version: '\d+\.\d+\.\d+'/,
    replacement: `version: '${version}'`,
  },
  {
    file: 'src/angular/querri-embed.component.test.ts',
    pattern: /version: '\d+\.\d+\.\d+'/,
    replacement: `version: '${version}'`,
  },
];

for (const { file, pattern, replacement } of targets) {
  const content = readFileSync(file, 'utf-8');
  const updated = content.replace(pattern, replacement);
  if (updated === content) {
    console.error(`  WARN: no change in ${file}`);
  }
  writeFileSync(file, updated);
  console.log(`  ${file}`);
}

console.log(`\nVersion synced to ${version} across ${targets.length} files.`);
