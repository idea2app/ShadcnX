# ShadcnX

A command line helper for [Shadcn UI CLI][1], `git commit` modified component codes only.

## Installation

```bash
npm i shadcn-x -g
```

## Usage

### add components

```bash
shadcn-x add official-component-name https://third-party.org/path/to/component
```

### edit a component

```bash
shadcn-x edit component-name
```

### install added components

```json
{
  "name": "my-web-app",
  "private": true,
  "scripts": {
    "install": "npx shadcn-x install"
  }
}
```

## User cases

1. https://github.com/idea2app/Next-shadcn-ts

[1]: https://ui.shadcn.com/docs/cli
