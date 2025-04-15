#!/usr/bin/env node

import { $ } from 'zx';
import fs from 'fs';
import path from 'path';

const args = process.argv.slice(2);
const command = args[0];

const componentsFilePath = path.join(__dirname, 'components', 'ui', 'index.ini');

async function addComponents(components: string[]) {
  for (const component of components) {
    await $`npx shadcn add ${component}`;
    fs.appendFileSync(componentsFilePath, `${component}\n`);
  }
}

async function editComponent(component: string) {
  const gitignorePath = path.join(__dirname, '.gitignore');
  const gitignoreContent = fs.readFileSync(gitignorePath, 'utf-8');
  const newGitignoreContent = gitignoreContent.replace(new RegExp(`^${component}$`, 'm'), '');
  fs.writeFileSync(gitignorePath, newGitignoreContent);

  await $`git add ${component}`;
  await $`git commit -m "Add ${component}"`;

  try {
    await $`code ${component}`;
  } catch {
    await $`open-cli ${component}`;
  }
}

async function installComponents() {
  const components = fs.readFileSync(componentsFilePath, 'utf-8').split('\n').filter(Boolean);
  await $`npx shadcn add ${components.join(' ')}`;
}

(async () => {
  switch (command) {
    case 'add':
      const componentsToAdd = args.slice(1);
      await addComponents(componentsToAdd);
      break;
    case 'edit':
      const componentToEdit = args[1];
      await editComponent(componentToEdit);
      break;
    case 'install':
      await installComponents();
      break;
    default:
      console.log('Unknown command');
  }
})();
