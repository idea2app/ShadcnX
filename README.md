# ShadcnX CLI

A command line helper for [Shadcn UI CLI][1], `git commit` modified component codes only.

[![CI & CD](https://github.com/idea2app/ShadcnX/actions/workflows/main.yml/badge.svg)][2]

## Features

- 🚀 Automatic framework detection (React, Vue, Svelte)
- 📦 Smart CLI selection based on `components.json#$schema` or `package.json`
- 🔧 Git-friendly: only commits modified component codes

## Installation

```bash
npm i shadcn-helper -g
```

## Framework Detection

ShadcnX automatically detects your project's framework and uses the appropriate CLI:

- **React** uses `shadcn` CLI with schema `https://ui.shadcn.com/schema.json`
- **Vue** uses `shadcn-vue` CLI with schema `https://www.shadcn-vue.com/schema.json`
- **Svelte** uses `shadcn-svelte` CLI with schema `https://www.shadcn-svelte.com/schema.json`

Detection priority:

1. If `components.json` exists, uses the `$schema` field to determine the framework
2. Otherwise, detects framework from `package.json` dependencies (`react`, `vue` or `svelte`)
3. Defaults to React if no framework is detected

## Usage

### add components

```bash
shadcn-helper add official-component-name https://third-party.org/path/to/component
```

### edit a component

```bash
shadcn-helper edit component-name
```

### install added components

```json
{
  "name": "my-web-app",
  "private": true,
  "scripts": {
    "install": "npx shadcn-helper install"
  }
}
```

## User cases

1. https://github.com/idea2app/Next-shadcn-ts

[1]: https://ui.shadcn.com/docs/cli
[2]: https://github.com/idea2app/ShadcnX/actions/workflows/main.yml
