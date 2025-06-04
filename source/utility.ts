import { fs, path } from 'zx';

export const localPathOf = (importMetaURL: string, relativePath: string) =>
  (new URL(relativePath, importMetaURL) + '')
    .replace('file://' + (process.platform === 'win32' ? '/' : ''), '')
    .replace(/\\/g, '/');

export async function moveAll(sourceFolder: string, targetFolder: string) {
  for (const file of await fs.readdir(sourceFolder))
    await fs.move(
      path.join(sourceFolder, file),
      path.join(targetFolder, file),
      { overwrite: true }
    );
  try {
    await fs.unlink(sourceFolder);
  } catch (error) {
    console.warn(error);
  }
}
