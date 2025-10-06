#!/usr/bin/env node

import 'array-unique-proposal';

import { $, fs, path } from 'zx';
import open from 'open';

import { localPathOf, moveAll } from './utility.js';

$.verbose = true;

const [command, ...args] = process.argv.slice(2);

const configurationTarget = 'components.json';

type Framework = 'react' | 'vue' | 'svelte';

interface FrameworkConfig {
  cliCommand: string;
  schema: string;
  defaultConfig: object;
}

const frameworkConfigs: Record<Framework, FrameworkConfig> = {
  react: {
    cliCommand: 'shadcn',
    schema: 'https://ui.shadcn.com/schema.json',
    defaultConfig: {
      $schema: 'https://ui.shadcn.com/schema.json',
      tsx: true,
      rsc: true,
      aliases: {
        components: '@/components',
        utils: '@/lib/utils',
      },
      style: 'default',
      tailwind: {
        css: 'styles/global.css',
        cssVariables: true,
        config: 'tailwind.config.ts',
        baseColor: 'gray',
      },
    },
  },
  vue: {
    cliCommand: 'shadcn-vue',
    schema: 'https://www.shadcn-vue.com/schema.json',
    defaultConfig: {
      $schema: 'https://www.shadcn-vue.com/schema.json',
      aliases: {
        components: '@/components',
        utils: '@/lib/utils',
      },
      style: 'default',
      tailwind: {
        css: 'src/assets/index.css',
        cssVariables: true,
        config: 'tailwind.config.js',
        baseColor: 'slate',
      },
    },
  },
  svelte: {
    cliCommand: 'shadcn-svelte',
    schema: 'https://www.shadcn-svelte.com/schema.json',
    defaultConfig: {
      $schema: 'https://www.shadcn-svelte.com/schema.json',
      aliases: {
        components: '$lib/components',
        utils: '$lib/utils',
      },
      style: 'default',
      tailwind: {
        css: 'src/app.pcss',
        cssVariables: true,
        config: 'tailwind.config.js',
        baseColor: 'slate',
      },
    },
  },
};

function detectFrameworkFromSchema(schema: string): Framework {
  if (schema.includes('shadcn-vue')) return 'vue';
  if (schema.includes('shadcn-svelte')) return 'svelte';
  return 'react';
}

async function detectFrameworkFromPackageJson(): Promise<Framework> {
  const packageJsonPath = 'package.json';
  
  if (!fs.existsSync(packageJsonPath)) return 'react';
  
  try {
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
    const allDeps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };
    
    // Check for Vue
    if (allDeps.vue || allDeps['@vue/cli'] || allDeps.nuxt) {
      return 'vue';
    }
    
    // Check for Svelte
    if (allDeps.svelte || allDeps['@sveltejs/kit']) {
      return 'svelte';
    }
    
    // Default to React
    return 'react';
  } catch (error) {
    console.warn('Failed to read package.json, defaulting to React:', error);
    return 'react';
  }
}

async function detectFramework(): Promise<Framework> {
  if (fs.existsSync(configurationTarget)) {
    try {
      const config = JSON.parse(await fs.readFile(configurationTarget, 'utf-8'));
      if (config.$schema) {
        return detectFrameworkFromSchema(config.$schema);
      }
    } catch (error) {
      console.warn('Failed to parse components.json:', error);
    }
  }
  
  return await detectFrameworkFromPackageJson();
}

const framework = await detectFramework();
const frameworkConfig = frameworkConfigs[framework];

if (!fs.existsSync(configurationTarget)) {
  await fs.writeJSON(configurationTarget, frameworkConfig.defaultConfig, { spaces: 2 });
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

  if (!components[0]) return console.warn('No component to add');

  const gitIgnored =
    fs.existsSync('.gitignore') &&
    ((await fs.readFile('.gitignore')) + '').match(
      new RegExp(String.raw`^${componentsFilePath}`, 'm')
    );
  if (!gitIgnored)
    await fs.appendFile('.gitignore', `\n${componentsFilePath}/*`);

  if (hasSource) await moveAll(componentsFilePath, stashPath);

  const cliCommand = frameworkConfig.cliCommand;
  await $`${cliCommand} add -y -o ${components}`;

  await addIndex(...components);

  if (hasSource) await moveAll(stashPath, componentsFilePath);
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

  await fs.appendFile('.gitignore', `\n!${filePath}`);

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
