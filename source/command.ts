#!/usr/bin/env node

import 'array-unique-proposal';

import { $, fs, path } from 'zx';
import open from 'open';

import { localPathOf } from './utility.js';

$.verbose = true;

const [command, ...args] = process.argv.slice(2);

const configurationTarget = 'components.json';

if (!fs.existsSync(configurationTarget)) {
  const configurationSource = localPathOf(import.meta.url, configurationTarget);

  await fs.copy(configurationSource, configurationTarget);
}
const componentsFilePath = 'components/ui';
const indexFilePath = path.join(componentsFilePath, '../index.ini');

const loadIndex = async () =>
  (fs.existsSync(indexFilePath) ? (await fs.readFile(indexFilePath)) + '' : '')
    .split(/[\r\n]+/)
    .filter(Boolean);

const saveIndex = (list: string[]) =>
  fs.writeFile(indexFilePath, list.join('\n'));

async function addIndex(...URIs: string[]) {
  const oldList = await loadIndex();

  oldList.push(...URIs);

  const newList = oldList.uniqueBy();

  await saveIndex(newList);

  return newList;
}

async function addComponents(...components: string[]) {
  const hasSource = fs.existsSync(componentsFilePath),
    stashPath = path.join(componentsFilePath, '../.stash');

  if (hasSource)
    await fs.move(componentsFilePath, stashPath, { overwrite: true });

  await $`shadcn add -y -o ${components}`;

  await addIndex(...components);

  if (hasSource)
    await fs.move(stashPath, componentsFilePath, { overwrite: true });
}

async function editComponent(component: string) {
  const oldList = await loadIndex();

  const sameIndex = oldList.findIndex(URI => URI === component);
  const nameIndex =
    sameIndex < 0
      ? oldList.findIndex(URI => URI.endsWith(`/${component}`))
      : sameIndex;
  if (nameIndex < 0)
    throw new ReferenceError(
      `Component "${component}" is not found in ${indexFilePath}`
    );
  oldList.splice(nameIndex, 1);

  await saveIndex(oldList);

  const filePath = path
    .join(componentsFilePath, `${component}.tsx`)
    .replace(/\\/g, '/');

  await fs.appendFile('.gitignore', `!${filePath}`);

  if (fs.existsSync('.git')) await $`git add ${filePath}`;

  try {
    await $`code ${filePath}`;
  } catch {
    await open(filePath, { wait: true });
  }
}

const installComponents = async () => addComponents(...(await loadIndex()));

switch (command) {
  case 'add':
    await addComponents(...args);
    break;
  case 'edit':
    await editComponent(args[0]);
    break;
  case 'install':
    await installComponents();
    break;
  default:
    throw new ReferenceError(`Unsupported "${command}" command`);
}
