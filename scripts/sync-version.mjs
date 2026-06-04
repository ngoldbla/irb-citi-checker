// Keep manifest.json's version in sync with package.json.
// Runs automatically before every build (npm "prebuild" hook).
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
const manifestPath = resolve(root, 'manifest.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

if (manifest.version !== pkg.version) {
  manifest.version = pkg.version;
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  console.log(`[sync-version] manifest.json -> ${pkg.version}`);
} else {
  console.log(`[sync-version] manifest.json already at ${pkg.version}`);
}
