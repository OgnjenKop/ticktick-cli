import { Command } from 'commander';
import inquirer from 'inquirer';
import { logger } from '../utils/logger';
import { TickTickApi } from '../core/api';
import { Task } from '../core/types';
import { validators, validationMessages } from '../utils/validation';

const api = new TickTickApi();

const tasksCommand = new Command('tasks').description('Task management commands');

tasksCommand
  .command('list')
  .description('List all tasks')
  .option('-p, --project <projectId>', 'Filter by project ID')
  .option('-c, --completed', 'Show completed tasks')
  .option('-u, --uncompleted', 'Show uncompleted tasks only')
  .option('-l, --limit <number>', 'Maximum number of tasks to fetch', '50')
  .option('-o, --offset <number>', 'Number of tasks to skip', '0')
  .action(async (options) => {
    try {
      if (!api.isAuthenticated()) {
        logger.error('Not authenticated. Please login first.');
        return process.exit(1);
      }

      if (!validators.isValidNumber(options.limit, 1, 500)) {
        logger.error(validationMessages.number(1, 500));
        return process.exit(1);
      }

      if (!validators.isValidNumber(options.offset, 0, 100000)) {
        logger.error(validationMessages.number(0, 100000));
        return process.exit(1);
      }

      logger.info('Fetching tasks...');

      const completed = options.completed ? true : options.uncompleted ? false : undefined;
      const limit = parseInt(options.limit, 10);
      const offset = parseInt(options.offset, 10);
      const result = await api.getTasks(options.project, completed, limit, offset);

      if (result.tasks.length === 0) {
        logger.info('No tasks found');
        return;
      }

      result.tasks.forEach((task) => {
        const status = task.completed ? '✓' : '○';
        const project = task.projectId === 'inbox' ? 'Inbox' : task.projectId;
        console.log(`${status} ${task.title} (${project})`);
      });

      if (result.hasMore) {
        logger.info(`Showing ${result.tasks.length} tasks. Use --limit/--offset for more.`);
      }
    } catch (error: any) {
      logger.error(`Failed to list tasks: ${error.message}`);
      return process.exit(1);
    }
  });

tasksCommand
  .command('add')
  .description('Add a new task')
  .option('-t, --title <title>', 'Task title')
  .option('-c, --content <content>', 'Task content')
  .option('-p, --project <projectId>', 'Project ID (default: inbox)')
  .option('-d, --due <dueDate>', 'Due date (YYYY-MM-DD)')
  .action(async (options) => {
    try {
      if (!api.isAuthenticated()) {
        logger.error('Not authenticated. Please login first.');
        return process.exit(1);
      }

      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'title',
          message: 'Task title:',
          validate: (input) => {
            if (!input || input.trim().length === 0) return 'Title is required';
            if (!validators.isValidTaskTitle(input)) return validationMessages.taskTitle;
            return true;
          },
          when: !options.title,
        },
        {
          type: 'input',
          name: 'content',
          message: 'Task description (optional):',
          when: !options.content,
        },
        {
          type: 'input',
          name: 'projectId',
          message: 'Project ID (default: inbox):',
          default: 'inbox',
          when: !options.project,
        },
        {
          type: 'input',
          name: 'dueDate',
          message: 'Due date (YYYY-MM-DD, optional):',
          validate: (input) => {
            if (!input) return true;
            return validators.isValidDate(input) || validationMessages.date;
          },
          when: !options.due,
        },
      ]);

      if (options.title && !validators.isValidTaskTitle(options.title)) {
        logger.error(validationMessages.taskTitle);
        return process.exit(1);
      }

      if (options.due && !validators.isValidDate(options.due)) {
        logger.error(validationMessages.date);
        return process.exit(1);
      }

      const task: Partial<Task> = {
        title: options.title || answers.title,
        content: options.content || answers.content,
        projectId: options.project || answers.projectId,
        dueDate: options.due || answers.dueDate,
      };

      logger.info('Adding task...');

      const createdTask = await api.createTask(task);

      logger.success(`Task "${createdTask.title}" added successfully`);
      console.log(`Task ID: ${createdTask.id}`);
    } catch (error: any) {
      logger.error(`Failed to add task: ${error.message}`);
      return process.exit(1);
    }
  });

tasksCommand
  .command('show <id>')
  .description('Show task details')
  .action(async (id) => {
    try {
      if (!api.isAuthenticated()) {
        logger.error('Not authenticated. Please login first.');
        return process.exit(1);
      }

      logger.info(`Fetching task ${id}...`);

      const task = await api.getTaskById(id);

      console.log(JSON.stringify(task, null, 2));
    } catch (error: any) {
      logger.error(`Failed to show task: ${error.message}`);
      return process.exit(1);
    }
  });

tasksCommand
  .command('update <id>')
  .description('Update a task')
  .option('-t, --title <title>', 'New task title')
  .option('-c, --content <content>', 'New task content')
  .option('-p, --project <projectId>', 'New project ID')
  .option('-d, --due <dueDate>', 'New due date (YYYY-MM-DD)')
  .option('--completed', 'Mark task as completed')
  .option('--uncompleted', 'Mark task as uncompleted')
  .action(async (id, options) => {
    try {
      if (!api.isAuthenticated()) {
        logger.error('Not authenticated. Please login first.');
        return process.exit(1);
      }

      logger.info(`Updating task ${id}...`);

      const updates: Partial<Task> = {};
      if (options.title) {
        if (!validators.isValidTaskTitle(options.title)) {
          logger.error(validationMessages.taskTitle);
          return process.exit(1);
        }
        updates.title = options.title;
      }
      if (options.content) updates.content = options.content;
      if (options.project) updates.projectId = options.project;
      if (options.due) {
        if (!validators.isValidDate(options.due)) {
          logger.error(validationMessages.date);
          return process.exit(1);
        }
        updates.dueDate = options.due;
      }
      if (options.completed !== undefined) updates.completed = true;
      if (options.uncompleted !== undefined) updates.completed = false;

      if (Object.keys(updates).length === 0) {
        logger.error('No updates specified');
        return process.exit(1);
      }

      const updatedTask = await api.updateTask(id, updates);

      logger.success(`Task ${id} updated successfully`);
      console.log(`New title: ${updatedTask.title}`);
      console.log(`Completed: ${updatedTask.completed}`);
    } catch (error: any) {
      logger.error(`Failed to update task: ${error.message}`);
      return process.exit(1);
    }
  });

tasksCommand
  .command('delete <id>')
  .description('Delete a task')
  .action(async (id) => {
    try {
      if (!api.isAuthenticated()) {
        logger.error('Not authenticated. Please login first.');
        return process.exit(1);
      }

      logger.info(`Deleting task ${id}...`);

      await api.deleteTask(id);

      logger.success(`Task ${id} deleted successfully`);
    } catch (error: any) {
      logger.error(`Failed to delete task: ${error.message}`);
      return process.exit(1);
    }
  });

tasksCommand
  .command('complete <id>')
  .description('Mark task as complete')
  .action(async (id) => {
    try {
      if (!api.isAuthenticated()) {
        logger.error('Not authenticated. Please login first.');
        return process.exit(1);
      }

      logger.info(`Completing task ${id}...`);

      await api.completeTask(id);

      logger.success(`Task ${id} marked as complete`);
    } catch (error: any) {
      logger.error(`Failed to complete task: ${error.message}`);
      return process.exit(1);
    }
  });

tasksCommand
  .command('uncomplete <id>')
  .description('Mark task as uncomplete')
  .action(async (id) => {
    try {
      if (!api.isAuthenticated()) {
        logger.error('Not authenticated. Please login first.');
        return process.exit(1);
      }

      logger.info(`Marking task ${id} as uncomplete...`);

      await api.uncompleteTask(id);

      logger.success(`Task ${id} marked as uncomplete`);
    } catch (error: any) {
      logger.error(`Failed to uncomplete task: ${error.message}`);
      return process.exit(1);
    }
  });

export { tasksCommand };
