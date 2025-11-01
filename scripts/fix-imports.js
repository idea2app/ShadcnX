#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const commandPath = join(__dirname, '../dist/command.js');

let content = readFileSync(commandPath, 'utf8');
content = content.replace(
  'from "commander-jsx/jsx-runtime"',
  'from "commander-jsx/jsx-runtime.js"'
);
writeFileSync(commandPath, content, 'utf8');

console.log('✓ Fixed ESM imports');
