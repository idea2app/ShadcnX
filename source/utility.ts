import { fs, path } from 'zx';

export const localPathOf = (importMetaURL: string, relativePath: string) =>
  (new URL(relativePath, importMetaURL) + '')
    .replace('file://' + (process.platform === 'win32' ? '/' : ''), '')
    .replace(/\\/g, '/');

export async function moveAll(sourceFolder: string, targetFolder: string) {
  for (const file of await fs.readdir(sourceFolder))
    await fs.move(path.join(sourceFolder, file), path.join(targetFolder, file), {
      overwrite: true,
    });
  try {
    await fs.unlink(sourceFolder);
  } catch (error) {
    console.warn(error);
  }
}

export const configurationTarget = 'components.json';

type Framework = 'react' | 'vue' | 'svelte';

type FrameworkConfig = Record<'cliCommand' | 'configPath' | 'fileExtension', string>;

export const frameworkConfigs: Record<Framework, FrameworkConfig> = {
  react: {
    cliCommand: 'shadcn',
    configPath: 'configuration/components-react.json',
    fileExtension: 'tsx',
  },
  vue: {
    cliCommand: 'shadcn-vue',
    configPath: 'configuration/components-vue.json',
    fileExtension: 'vue',
  },
  svelte: {
    cliCommand: 'shadcn-svelte',
    configPath: 'configuration/components-svelte.json',
    fileExtension: 'svelte',
  },
};

const detectFrameworkFromSchema = (schema: string): Framework =>
  schema.includes('shadcn-vue') ? 'vue' : schema.includes('shadcn-svelte') ? 'svelte' : 'react';

async function detectFrameworkFromPackageJson(): Promise<Framework> {
  const packageJsonPath = 'package.json';

  if (!fs.existsSync(packageJsonPath)) return 'react';

  try {
    const packageJson = await fs.readJSON(packageJsonPath);
    const allDeps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };
    return allDeps.vue || allDeps['@vue/cli'] || allDeps.nuxt
      ? 'vue'
      : allDeps.svelte || allDeps['@sveltejs/kit']
      ? 'svelte'
      : 'react';
  } catch (error) {
    console.warn('Failed to read package.json, defaulting to React:', error);
    return 'react';
  }
}

export async function detectFramework(): Promise<Framework> {
  if (fs.existsSync(configurationTarget))
    try {
      const { $schema } = await fs.readJSON(configurationTarget);

      if ($schema) return detectFrameworkFromSchema($schema);
    } catch (error) {
      console.warn('Failed to parse components.json:', error);
    }
  return detectFrameworkFromPackageJson();
}
