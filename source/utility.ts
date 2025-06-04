export const localPathOf = (importMetaURL: string, relativePath: string) =>
  (new URL(relativePath, importMetaURL) + '')
    .replace('file://' + (process.platform === 'win32' ? '/' : ''), '')
    .replace(/\\/g, '/');
