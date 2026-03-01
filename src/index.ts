#!/usr/bin/env node

import { Command } from 'commander';
import { authCommand } from './commands/auth';
import { tasksCommand } from './commands/tasks';
import { projectsCommand } from './commands/projects';

const program = new Command();

program
  .name('tt')
  .description('TickTick CLI - A command-line interface for TickTick API')
  .version('1.0.0');

program.addCommand(authCommand);
program.addCommand(tasksCommand);
program.addCommand(projectsCommand);

program.parse();
