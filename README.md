# TickTick CLI

An unofficial TypeScript command-line client for managing TickTick tasks and projects.

This project is not affiliated with, endorsed by, or sponsored by TickTick.

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

### From npm

After the package is published to npm:

```bash
npm install -g ticktick-cli
```

### From source

```bash
npm install
npm run build
npm link
```

Then run:

```bash
tt --help
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
- `tt tasks delete <id>` (interactive confirmation; use `--yes` to skip)

Notes:
- `--completed` and `--uncompleted` are mutually exclusive.
- In non-interactive environments (scripts/CI), use `tt tasks delete <id> --yes`; otherwise the command will error because it cannot prompt.
- Passing an empty string to an update flag (e.g., `--content ''`) clears that field.

### Projects

- `tt projects list`
- `tt projects add --name <name> [--color <hex>]`
- `tt projects show <id>`
- `tt projects update <id> [--name <name>] [--color <hex>]`
- `tt projects delete <id>` (interactive confirmation; use `--yes` to skip)

Notes:
- In non-interactive environments (scripts/CI), use `tt projects delete <id> --yes`; otherwise the command will error because it cannot prompt.
- Passing an empty string to an update flag clears that field.

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

## Contributing

Issues and pull requests are welcome. Please keep changes focused, update tests when behavior changes, and run the validation commands before opening a PR:

```bash
npm run build
npm test
npm run lint
```

## License

MIT
