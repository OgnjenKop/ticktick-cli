import { Command } from 'commander';
import inquirer from 'inquirer';
import { logger } from '../utils/logger';
import { api } from '../core/api';
import { Project } from '../core/types';
import { validators, validationMessages } from '../utils/validation';

const projectsCommand = new Command('projects').description('Project management commands');

function checkAuth(): boolean {
  if (!api.isAuthenticated()) {
    logger.error('Not authenticated. Please login first.');
    process.exitCode = 1;
    return false;
  }
  return true;
}

async function confirmDelete(resource: string, id: string, yes: boolean): Promise<boolean> {
  if (yes) return true;

  const { confirmed } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirmed',
      message: `Are you sure you want to delete ${resource} ${id}?`,
      default: false,
    },
  ]);

  return confirmed;
}

projectsCommand
  .command('list')
  .description('List all projects')
  .action(async () => {
    try {
      if (!checkAuth()) return;

      logger.info('Fetching projects...');

      const projects = await api.getProjects();

      if (projects.length === 0) {
        logger.info('No projects found');
        return;
      }

      projects.forEach((project) => {
        console.log(`${project.name} (${project.id}) - ${project.color}`);
      });
    } catch (error: any) {
      logger.error(`Failed to list projects: ${error.message}`);
      process.exitCode = 1;
    }
  });

projectsCommand
  .command('add')
  .description('Add a new project')
  .option('-n, --name <name>', 'Project name')
  .option('-c, --color <color>', 'Project color (hex code)')
  .action(async (options) => {
    try {
      if (!checkAuth()) return;

      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'name',
          message: 'Project name:',
          validate: (input) => {
            if (!input || input.trim().length === 0) return 'Name is required';
            if (!validators.isValidProjectName(input)) return validationMessages.projectName;
            return true;
          },
          when: !options.name,
        },
        {
          type: 'input',
          name: 'color',
          message: 'Project color (hex code, optional):',
          default: '#4A90E2',
          validate: (input) => {
            if (!input) return true;
            return validators.isValidHexColor(input) || validationMessages.hexColor;
          },
          when: !options.color,
        },
      ]);

      if (options.name && !validators.isValidProjectName(options.name)) {
        logger.error(validationMessages.projectName);
        process.exitCode = 1;
        return;
      }

      if (options.color && !validators.isValidHexColor(options.color)) {
        logger.error(validationMessages.hexColor);
        process.exitCode = 1;
        return;
      }

      const name = options.name || answers.name;
      const color = options.color || answers.color;

      logger.info('Adding project...');

      const createdProject = await api.createProject(name, color);

      logger.success(`Project "${createdProject.name}" added successfully`);
      console.log(`Project ID: ${createdProject.id}`);
    } catch (error: any) {
      logger.error(`Failed to add project: ${error.message}`);
      process.exitCode = 1;
    }
  });

projectsCommand
  .command('show <id>')
  .description('Show project details')
  .action(async (id) => {
    try {
      if (!checkAuth()) return;

      logger.info(`Fetching project ${id}...`);

      const project = await api.getProjectById(id);

      console.log(JSON.stringify(project, null, 2));
    } catch (error: any) {
      logger.error(`Failed to show project: ${error.message}`);
      process.exitCode = 1;
    }
  });

projectsCommand
  .command('update <id>')
  .description('Update a project')
  .option('-n, --name <name>', 'New project name')
  .option('-c, --color <color>', 'New project color (hex code)')
  .action(async (id, options) => {
    try {
      if (!checkAuth()) return;

      logger.info(`Updating project ${id}...`);

      const updates: Partial<Project> = {};
      if (options.name !== undefined) {
        if (!validators.isValidProjectName(options.name)) {
          logger.error(validationMessages.projectName);
          process.exitCode = 1;
          return;
        }
        updates.name = options.name;
      }
      if (options.color !== undefined) {
        if (options.color && !validators.isValidHexColor(options.color)) {
          logger.error(validationMessages.hexColor);
          process.exitCode = 1;
          return;
        }
        updates.color = options.color;
      }

      if (Object.keys(updates).length === 0) {
        logger.error('No updates specified');
        process.exitCode = 1;
        return;
      }

      const updatedProject = await api.updateProject(id, updates);

      logger.success(`Project ${id} updated successfully`);
      console.log(`New name: ${updatedProject.name}`);
      console.log(`New color: ${updatedProject.color}`);
    } catch (error: any) {
      logger.error(`Failed to update project: ${error.message}`);
      process.exitCode = 1;
    }
  });

projectsCommand
  .command('delete <id>')
  .description('Delete a project')
  .option('-y, --yes', 'Skip confirmation prompt')
  .action(async (id, options) => {
    try {
      if (!checkAuth()) return;

      if (!options.yes && process.stdin.isTTY === false) {
        logger.error(
          'Cannot prompt for confirmation in non-interactive mode. Use --yes to confirm.'
        );
        process.exitCode = 1;
        return;
      }

      if (!(await confirmDelete('project', id, options.yes))) {
        logger.info('Delete cancelled');
        return;
      }

      logger.info(`Deleting project ${id}...`);

      await api.deleteProject(id);

      logger.success(`Project ${id} deleted successfully`);
    } catch (error: any) {
      logger.error(`Failed to delete project: ${error.message}`);
      process.exitCode = 1;
    }
  });

export { projectsCommand };
