// Package the built dist/ directory into a versioned, store-uploadable zip.
// Usage: npm run package   (runs build first, then zips dist/ -> releases/)
import { execFileSync } from 'node:child_process';
import { readFileSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
const distDir = resolve(root, 'dist');
const releasesDir = resolve(root, 'releases');

if (!existsSync(distDir)) {
  console.error('[package] dist/ not found — run "npm run build" first.');
  process.exit(1);
}

mkdirSync(releasesDir, { recursive: true });
const zipPath = resolve(releasesDir, `irb-citi-checker-v${pkg.version}.zip`);
if (existsSync(zipPath)) rmSync(zipPath);

// Zip the *contents* of dist/ so the extension root sits at the archive root
// (Chrome Web Store and "Load unpacked" both expect manifest.json at the top).
// execFileSync with an argument array avoids invoking a shell.
execFileSync('zip', ['-r', '-q', zipPath, '.'], { cwd: distDir, stdio: 'inherit' });
console.log(`[package] Created ${zipPath}`);
