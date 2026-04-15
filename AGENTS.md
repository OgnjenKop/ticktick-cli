# AGENTS.md

## Scope
These instructions apply to the entire repository.

## Project Overview
- This is a TypeScript CLI for TickTick.
- The source of truth is `src/`; compiled output lives in `dist/`.
- The CLI entrypoint is `src/index.ts` and is exposed as `tt`.

## Repository Layout
- `src/commands/`: Commander command definitions for auth, tasks, and projects.
- `src/core/`: API, config, and shared domain types.
- `src/utils/`: Logging and validation helpers.
- `test/`: Jest test suite and mocks.
- `dist/`: Generated build artifacts; do not hand-edit unless the user explicitly asks.

## Working Rules
- Prefer minimal, surgical changes that match the existing TypeScript style.
- Make behavior changes in `src/`, not `dist/`.
- Keep CommonJS compatibility unless the user asks for a module-system migration.
- Reuse existing helpers before adding new abstractions.
- When changing CLI behavior or flags, update `README.md` if the user-facing usage changes.
- Preserve interactive CLI behavior for missing required options where possible.

## Validation
- Install dependencies with `npm install` if needed.
- Build with `npm run build`.
- Run tests with `npm test`.
- Lint with `npm run lint`.
- Prefer targeted test runs first, then broader validation if the touched area warrants it.

## Testing Notes
- Tests use Jest and live under `test/`.
- Existing mocks are under `test/__mocks__/`.
- If adding tests, follow the current `*.test.ts` naming pattern.

## Agent Guidance
- Before editing, check for any deeper `AGENTS.md` files in subdirectories you touch.
- Mention assumptions briefly when requirements are unclear.
- Avoid committing generated secrets, tokens, or local config data.
