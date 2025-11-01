#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packagePath = join(__dirname, '../node_modules/commander-jsx/package.json');

try {
  const pkg = JSON.parse(readFileSync(packagePath, 'utf8'));
  
  if (!pkg.exports) {
    pkg.exports = {
      ".": "./dist/index.js",
      "./jsx-runtime": "./jsx-runtime.js",
      "./jsx-dev-runtime": "./jsx-dev-runtime.js"
    };
    
    writeFileSync(packagePath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
    console.log('✓ Patched commander-jsx package.json with exports field');
  }
} catch (error) {
  console.error('Failed to patch commander-jsx:', error.message);
  process.exit(1);
}
