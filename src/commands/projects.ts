import { Command } from 'commander';
import inquirer from 'inquirer';
import { logger } from '../utils/logger';
import { TickTickApi } from '../core/api';
import { Project } from '../core/types';

const api = new TickTickApi();

const projectsCommand = new Command('projects').description('Project management commands');

projectsCommand
  .command('list')
  .description('List all projects')
  .action(async () => {
    try {
      if (!api.isAuthenticated()) {
        logger.error('Not authenticated. Please login first.');
        process.exit(1);
      }

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
      process.exit(1);
    }
  });

projectsCommand
  .command('add')
  .description('Add a new project')
  .option('-n, --name <name>', 'Project name')
  .option('-c, --color <color>', 'Project color (hex code)')
  .action(async (options) => {
    try {
      if (!api.isAuthenticated()) {
        logger.error('Not authenticated. Please login first.');
        process.exit(1);
      }

      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'name',
          message: 'Project name:',
          validate: (input) => input.trim().length > 0 || 'Name is required',
          when: !options.name,
        },
        {
          type: 'input',
          name: 'color',
          message: 'Project color (hex code, optional):',
          default: '#4A90E2',
          when: !options.color,
        },
      ]);

      const name = options.name || answers.name;
      const color = options.color || answers.color;

      logger.info('Adding project...');

      const createdProject = await api.createProject(name, color);

      logger.success(`Project "${createdProject.name}" added successfully`);
      console.log(`Project ID: ${createdProject.id}`);
    } catch (error: any) {
      logger.error(`Failed to add project: ${error.message}`);
      process.exit(1);
    }
  });

projectsCommand
  .command('show <id>')
  .description('Show project details')
  .action(async (id) => {
    try {
      if (!api.isAuthenticated()) {
        logger.error('Not authenticated. Please login first.');
        process.exit(1);
      }

      logger.info(`Fetching project ${id}...`);

      const project = await api.getProjectById(id);

      console.log(JSON.stringify(project, null, 2));
    } catch (error: any) {
      logger.error(`Failed to show project: ${error.message}`);
      process.exit(1);
    }
  });

projectsCommand
  .command('update <id>')
  .description('Update a project')
  .option('-n, --name <name>', 'New project name')
  .option('-c, --color <color>', 'New project color (hex code)')
  .action(async (id, options) => {
    try {
      if (!api.isAuthenticated()) {
        logger.error('Not authenticated. Please login first.');
        process.exit(1);
      }

      logger.info(`Updating project ${id}...`);

      const updates: Partial<Project> = {};
      if (options.name) updates.name = options.name;
      if (options.color) updates.color = options.color;

      if (Object.keys(updates).length === 0) {
        logger.error('No updates specified');
        process.exit(1);
      }

      const updatedProject = await api.updateProject(id, updates);

      logger.success(`Project ${id} updated successfully`);
      console.log(`New name: ${updatedProject.name}`);
      console.log(`New color: ${updatedProject.color}`);
    } catch (error: any) {
      logger.error(`Failed to update project: ${error.message}`);
      process.exit(1);
    }
  });

projectsCommand
  .command('delete <id>')
  .description('Delete a project')
  .action(async (id) => {
    try {
      if (!api.isAuthenticated()) {
        logger.error('Not authenticated. Please login first.');
        process.exit(1);
      }

      logger.info(`Deleting project ${id}...`);

      await api.deleteProject(id);

      logger.success(`Project ${id} deleted successfully`);
    } catch (error: any) {
      logger.error(`Failed to delete project: ${error.message}`);
      process.exit(1);
    }
  });

export { projectsCommand };
