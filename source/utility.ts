import { fileURLToPath } from 'url';
import { fs } from 'zx';

export const localPathOf = (pathOrURL: string, relativePath: string) =>
  fileURLToPath(
    new URL(relativePath, (/^.{3,}:\/\//.test(pathOrURL) ? '' : 'file://') + pathOrURL)
  );

export const configurationTarget = 'components.json';

export type ShadcnSchemaURL =
  | 'https://ui.shadcn.com/schema.json'
  | 'https://www.shadcn-vue.com/schema.json'
  | 'https://www.shadcn-svelte.com/schema.json';

export interface ShadcnComponentsConfig {
  $schema?: ShadcnSchemaURL | (string & {});
  style?: string;
  tsx?: boolean;
  rsc?: boolean;
  aliases?: {
    components?: string;
    utils?: string;
    [key: string]: string | undefined;
  };
  tailwind?: {
    config?: string;
    css?: string;
    baseColor?: string;
    cssVariables?: boolean;
    prefix?: string;
  };
  iconLibrary?: string;
}

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
      const { $schema } = await fs.readJSON(configurationTarget) as ShadcnComponentsConfig;

      if ($schema) return detectFrameworkFromSchema($schema);
    } catch (error) {
      console.warn('Failed to parse components.json:', error);
    }
  return detectFrameworkFromPackageJson();
}
