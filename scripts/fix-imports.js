#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const commandPath = join(__dirname, '../dist/command.js');

let content = readFileSync(commandPath, 'utf8');

// Fix commander-jsx/jsx-runtime import to include .js extension for ESM compatibility
const fixedContent = content.replace(
  /from\s+["']commander-jsx\/jsx-runtime["']/g,
  'from "commander-jsx/jsx-runtime.js"'
);

if (content === fixedContent) {
  console.warn('⚠ No jsx-runtime imports found to fix');
} else {
  writeFileSync(commandPath, fixedContent, 'utf8');
  console.log('✓ Fixed ESM imports');
}
