# TickTick CLI

A command-line interface for TickTick API.

## Installation

```bash
npm install -g ticktick-cli
```

## Usage

```bash
tt [command] [options]
```

## Commands

### Authentication
- `tt auth login` - Login to TickTick
- `tt auth logout` - Logout from TickTick
- `tt auth status` - Check authentication status

### Tasks
- `tt tasks list` - List all tasks
- `tt tasks add` - Add a new task
- `tt tasks show <id>` - Show task details
- `tt tasks update <id>` - Update a task
- `tt tasks delete <id>` - Delete a task

### Projects
- `tt projects list` - List all projects
- `tt projects add` - Add a new project
- `tt projects show <id>` - Show project details
- `tt projects update <id>` - Update a project
- `tt projects delete <id>` - Delete a project

## Configuration

The CLI stores configuration in `~/.config/ticktick-cli/config.json`

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run in development
npm run dev

# Test
npm test

# Lint
npm run lint
```