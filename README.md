# ShadcnX CLI

A command line helper for [Shadcn UI CLI][1], `git commit` modified component codes only.

[![CI & CD](https://github.com/idea2app/ShadcnX/actions/workflows/main.yml/badge.svg)][2]

## Installation

```bash
npm i shadcn-helper -g
```

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
