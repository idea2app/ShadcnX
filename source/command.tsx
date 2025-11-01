#!/usr/bin/env node

import 'array-unique-proposal';

import { Command } from 'commander-jsx';
import { $, fs, path } from 'zx';
import open from 'open';

import {
  configurationTarget,
  detectFramework,
  frameworkConfigs,
  localPathOf,
  moveAll,
} from './utility.js';

$.verbose = true;

const framework = await detectFramework();
const { configPath, cliCommand, fileExtension } = frameworkConfigs[framework];

if (!fs.existsSync(configurationTarget)) {
  const configurationSource = localPathOf(import.meta.url, configPath);

  await fs.copy(configurationSource, configurationTarget);
}
const componentsFilePath =
  (fs.existsSync('components') ? '' : fs.existsSync('app') ? 'app/' : '') + 'components/ui';

const indexFilePath = path.join(componentsFilePath, '../index.ini');

const loadIndex = async () =>
  (fs.existsSync(indexFilePath) ? (await fs.readFile(indexFilePath)) + '' : '')
    .split(/[\r\n]+/)
    .filter(Boolean);

const saveIndex = (list: string[]) => fs.writeFile(indexFilePath, list.join('\n'), { mode: 0o777 });

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

  if (!components[0]) return console.warn('No component to add');

  const gitIgnored =
    fs.existsSync('.gitignore') &&
    ((await fs.readFile('.gitignore')) + '').match(
      new RegExp(String.raw`^${componentsFilePath}`, 'm')
    );
  if (!gitIgnored)
    await fs.appendFile(
      '.gitignore',
      `
# Shadcn UI components
${stashPath}/
${componentsFilePath}/*
`
    );
  if (hasSource) await moveAll(componentsFilePath, stashPath);

  await $`npx ${cliCommand} add -y -o ${components}`;

  await addIndex(...components);

  if (hasSource) await moveAll(stashPath, componentsFilePath);
}

async function editComponent(component: string) {
  const oldList = await loadIndex();

  const sameIndex = oldList.findIndex(URI => URI === component);
  const nameIndex =
    sameIndex < 0 ? oldList.findIndex(URI => URI.endsWith(`/${component}`)) : sameIndex;
  if (nameIndex < 0)
    throw new ReferenceError(`Component "${component}" is not found in ${indexFilePath}`);
  oldList.splice(nameIndex, 1);

  await saveIndex(oldList);

  const isReact = fileExtension === 'tsx';
  const folderPath = path.join(componentsFilePath, component).replace(/\\/g, '/');
  const filePath = isReact
    ? `${folderPath}.tsx`
    : path.join(folderPath, `${component[0].toUpperCase() + component.slice(1)}.${fileExtension}`);
  const gitPath = isReact ? filePath : folderPath;

  await fs.appendFile('.gitignore', `\n!${gitPath}`);

  if (fs.existsSync('.git')) await $`git add ${gitPath}`;

  try {
    await $`code ${filePath}`;
  } catch {
    await open(filePath, { wait: true });
  }
}

const installComponents = async () => addComponents(...(await loadIndex()));

Command.execute(
  <Command parameters="[command] [options]">
    <Command
      name="add"
      parameters="<component...>"
      description="Add official component or components from third-party URL"
      executor={({}, ...components) => addComponents(...(components as string[]))}
    />
    <Command
      name="edit"
      parameters="<component>"
      description="Edit a component and add it to git"
      executor={({}, component) => editComponent(component as string)}
    />
    <Command
      name="install"
      description="Install added components"
      executor={installComponents}
    />
  </Command>,
  process.argv.slice(2)
);
