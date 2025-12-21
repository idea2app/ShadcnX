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
  moveAll,
} from './utility.js';

$.verbose = true;

class ShadcnX {
  cliCommand = '';
  fileExtension = 'tsx';
  componentsFilePath = '';
  indexFilePath = '';

  async init() {
    const framework = await detectFramework();
    const { configPath, cliCommand, fileExtension } = frameworkConfigs[framework];

    this.cliCommand = cliCommand;
    this.fileExtension = fileExtension;

    if (!fs.existsSync(configurationTarget)) {
      const configurationSource = localPathOf(currentModulePath(), configPath);

      await fs.copy(configurationSource, configurationTarget);
    }
    this.componentsFilePath =
      (fs.existsSync('components') ? '' : fs.existsSync('app') ? 'app/' : '') + 'components/ui';

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
    const hasSource = fs.existsSync(this.componentsFilePath),
      stashPath = path.join(this.componentsFilePath, '../.stash').replace(/\\/g, '/');

    if (!components[0]) return console.warn('No component to add');

    const gitIgnored =
      fs.existsSync('.gitignore') &&
      ((await fs.readFile('.gitignore')) + '').match(
        new RegExp(String.raw`^${this.componentsFilePath}`, 'm')
      );
    if (!gitIgnored)
      await fs.appendFile(
        '.gitignore',
        `
# Shadcn UI components
${stashPath}/
${this.componentsFilePath}/
`
      );
    if (hasSource) await moveAll(this.componentsFilePath, stashPath);

    await $`npx ${this.cliCommand} add -y -o ${components}`;

    await this.addIndex(...components);

    if (hasSource) await moveAll(stashPath, this.componentsFilePath);
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
          `${component[0].toUpperCase() + component.slice(1)}.${this.fileExtension}`
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
    process.argv.slice(2)
  )
);
