#!/usr/bin/env node

import 'array-unique-proposal';

import { currentModulePath } from '@tech_query/node-toolkit';
import { Command } from 'commander-jsx';
import { $, fs, path } from 'zx';
import open from 'open';

import {
  configurationTarget,
  detectFramework,
  frameworkConfigs,
  localPathOf,
  type ShadcnComponentsConfig,
} from './utility.js';

$.verbose = true;

class ShadcnX {
  cliCommand = '';
  fileExtension = 'tsx';
  componentsFilePath = '';
  tailwindStylePath = '';
  indexFilePath = '';

  private toLocalPath(aliasPath: string) {
    const normalized = aliasPath.trim().replace(/\\/g, '/');

    if (!normalized) return 'components';
    // Svelte default configuration
    if (normalized === '$lib') return 'src/lib';
    if (normalized.startsWith('$lib/')) return `src/lib/${normalized.slice('$lib/'.length)}`;
    if (normalized.startsWith('@/')) return normalized.slice(2);
    if (normalized.startsWith('~/')) return normalized.slice(2);

    return normalized.replace(/^\.?\//, '');
  }

  private resolveComponentsFilePath(config: ShadcnComponentsConfig) {
    const aliasPath = this.toLocalPath(config.aliases?.components || 'components');

    return aliasPath.endsWith('/ui') ? aliasPath : path.join(aliasPath, 'ui').replace(/\\/g, '/');
  }

  private async ensureTailwindSource() {
    const { tailwindStylePath } = this;

    if (!tailwindStylePath) return;

    const relativeComponentsPath = path
      .relative(path.dirname(tailwindStylePath), this.componentsFilePath)
      .replace(/\\/g, '/');
    const sourcePath = `${relativeComponentsPath || '.'}/**/*.{js,jsx,ts,tsx,mdx}`;
    const sourceRule = `@source "${sourcePath}";`;

    const styleFile = fs.existsSync(tailwindStylePath)
      ? (await fs.readFile(tailwindStylePath)) + ''
      : '';
    if (styleFile.includes(sourceRule)) return;

    const updatedStyle = `${styleFile.trimEnd()}

/*
 * ShadcnX CLI sets up the source rule for Tailwind CSS to include Git ignored components.
 * Don't modify this rule if you are not a Tailwind CSS expert.
 */
${sourceRule}
`;
    await fs.ensureFile(tailwindStylePath);
    await fs.writeFile(tailwindStylePath, updatedStyle);
  }

  async init() {
    const framework = await detectFramework();
    const { configPath, cliCommand, fileExtension } = frameworkConfigs[framework];

    this.cliCommand = cliCommand;
    this.fileExtension = fileExtension;

    if (!fs.existsSync(configurationTarget)) {
      const configurationSource = localPathOf(currentModulePath(), configPath);

      await fs.copy(configurationSource, configurationTarget);
    }
    const configuration = (await fs.readJSON(configurationTarget)) as ShadcnComponentsConfig;

    this.componentsFilePath = this.resolveComponentsFilePath(configuration);
    this.tailwindStylePath = (configuration.tailwind?.css || '').replace(/\\/g, '/');
    this.indexFilePath = path.join(this.componentsFilePath, '../index.ini');

    return this;
  }

  private loadIndex = async () =>
    (fs.existsSync(this.indexFilePath) ? (await fs.readFile(this.indexFilePath)) + '' : '')
      .split(/[\r\n]+/)
      .filter(Boolean);

  private saveIndex = (list: string[]) =>
    fs.writeFile(this.indexFilePath, list.join('\n'), { mode: 0o777 });

  private async addIndex(...URIs: string[]) {
    const oldList = await this.loadIndex();

    oldList.push(...URIs);

    const newList = oldList.uniqueBy();

    await this.saveIndex(newList);

    return newList;
  }

  addComponents = async (...components: string[]) => {
    const hasSource = fs.existsSync(this.componentsFilePath);

    if (!components[0]) return console.warn('No component to add');

    const gitIgnored =
      fs.existsSync('.gitignore') &&
      ((await fs.readFile('.gitignore')) + '').match(
        new RegExp(String.raw`^${this.componentsFilePath}`, 'm'),
      );

    if (!gitIgnored)
      await fs.appendFile(
        '.gitignore',
        `
# Shadcn UI components
${this.componentsFilePath}/
`,
      );

    await this.ensureTailwindSource();

    await $`npx ${this.cliCommand} add -y -o ${components}`;

    await this.addIndex(...components);

    if (hasSource)
      try {
        await $`git restore ${this.componentsFilePath}`;
      } catch {}
  };

  editComponent = async (component: string) => {
    const oldList = await this.loadIndex();

    const sameIndex = oldList.findIndex(URI => URI === component);
    const nameIndex =
      sameIndex < 0 ? oldList.findIndex(URI => URI.endsWith(`/${component}`)) : sameIndex;

    if (nameIndex < 0)
      throw new ReferenceError(`Component "${component}" is not found in ${this.indexFilePath}`);

    oldList.splice(nameIndex, 1);

    await this.saveIndex(oldList);

    const isReact = this.fileExtension === 'tsx';
    const folderPath = path.join(this.componentsFilePath, component).replace(/\\/g, '/');
    const filePath = isReact
      ? `${folderPath}.tsx`
      : path.join(
          folderPath,
          `${component[0].toUpperCase() + component.slice(1)}.${this.fileExtension}`,
        );
    const gitPath = isReact ? filePath : folderPath;

    await fs.appendFile('.gitignore', `\n!${gitPath}`);

    if (fs.existsSync('.git')) await $`git add ${gitPath}`;

    try {
      await $`code ${filePath}`;
    } catch {
      await open(filePath, { wait: true });
    }
  };

  installComponents = async () => this.addComponents(...(await this.loadIndex()));
}

new ShadcnX().init().then(({ addComponents, editComponent, installComponents }) =>
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
      <Command name="install" description="Install added components" executor={installComponents} />
    </Command>,
    process.argv.slice(2),
  ),
);
