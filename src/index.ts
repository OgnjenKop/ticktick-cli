#!/usr/bin/env node

import { Command } from 'commander';
import { authCommand } from './commands/auth';
import { doctorCommand } from './commands/doctor';
import { tasksCommand } from './commands/tasks';
import { projectsCommand } from './commands/projects';
import { packageInfo } from './utils/package-info';

const program = new Command();

program
  .name('tt')
  .description('TickTick CLI - A command-line interface for TickTick API')
  .version(packageInfo.version);

program.addCommand(authCommand);
program.addCommand(doctorCommand);
program.addCommand(tasksCommand);
program.addCommand(projectsCommand);

program.parse();
