# TickTick CLI

A TypeScript command-line client for managing TickTick tasks and projects.

## Features

- Authenticate with TickTick (credentials or browser-assisted flow)
- List, create, update, complete, and delete tasks
- List, create, update, and delete projects
- Interactive prompts for missing command options
- Built-in `doctor` command for live smoke checks

## Requirements

- Node.js 18+
- npm

## Installation

### Local development

```bash
npm install
npm run build
npm link
```

After linking, use the CLI with:

```bash
tt --help
```

### From npm (when published)

```bash
npm install -g ticktick-cli
```

## Quick Start

1. Authenticate:

```bash
tt auth login
```

2. Check auth status:

```bash
tt auth status
```

3. Create a task:

```bash
tt tasks add --title "Pay electricity bill" --project inbox --due 2026-03-05
```

4. List tasks:

```bash
tt tasks list
```

## Commands

### Authentication

- `tt auth login`
- `tt auth login --username <username> --password <password>`
- `tt auth login --no-browser`
- `tt auth logout`
- `tt auth status`
- `tt auth whoami`

Notes:
- Browser login is partially manual in the current implementation.
- You may be prompted to paste TickTick session cookie `t=...`.

### Diagnostics

- `tt doctor`
- `tt doctor --json`
- `tt doctor --write`
- `tt doctor --json --write`
- `tt doctor --write --project <projectId>`

Notes:
- `tt doctor` is read-only and checks auth, project listing, and task listing.
- `tt doctor --json` prints structured output for scripts and CI.
- `tt doctor --write` creates and deletes a disposable task to verify live write access.

### Tasks

- `tt tasks list`
- `tt tasks list --project <projectId>`
- `tt tasks list --completed`
- `tt tasks list --uncompleted`
- `tt tasks list --limit <number> --offset <number>`
- `tt tasks add --title <title> [--content <content>] [--project <projectId>] [--due YYYY-MM-DD]`
- `tt tasks show <id>`
- `tt tasks update <id> [--title <title>] [--content <content>] [--project <projectId>] [--due YYYY-MM-DD] [--completed|--uncompleted]`
- `tt tasks complete <id>`
- `tt tasks uncomplete <id>`
- `tt tasks delete <id>`

### Projects

- `tt projects list`
- `tt projects add --name <name> [--color <hex>]`
- `tt projects show <id>`
- `tt projects update <id> [--name <name>] [--color <hex>]`
- `tt projects delete <id>`

## Development

```bash
npm install
npm run build
npm run dev
npm test
npm run lint
```

## Configuration

Authentication and user data are stored locally via `configstore` under the package name `ticktick-cli`.

## License

MIT
