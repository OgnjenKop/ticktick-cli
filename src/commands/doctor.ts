import { Command } from 'commander';
import { TickTickApi } from '../core/api';
import { logger } from '../utils/logger';

const api = new TickTickApi();

const doctorCommand = new Command('doctor')
  .description('Run live connectivity and API smoke checks')
  .option('--json', 'Output structured JSON instead of human-readable logs')
  .option('--write', 'Run a disposable write test by creating and deleting a task')
  .option(
    '--project <projectId>',
    'Project ID to use for the disposable write test (defaults to inbox)'
  )
  .action(async (options) => {
    let createdTaskId: string | null = null;
    const result: Record<string, unknown> = {
      ok: false,
      checks: {} as Record<string, unknown>,
    };
    const jsonMode = Boolean(options.json);
    const log = {
      info: (message: string) => {
        if (!jsonMode) logger.info(message);
      },
      success: (message: string) => {
        if (!jsonMode) logger.success(message);
      },
      warn: (message: string) => {
        if (!jsonMode) logger.warn(message);
      },
      error: (message: string) => {
        if (!jsonMode) logger.error(message);
      },
    };

    try {
      if (!api.isAuthenticated()) {
        result.error = 'Not authenticated. Please login first.';
        if (jsonMode) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          logger.error('Not authenticated. Please login first.');
        }
        return process.exit(1);
      }

      log.info('Checking current user...');
      const user = await api.getCurrentUser();
      (result.checks as Record<string, unknown>).auth = {
        ok: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
      };
      log.success(`Authenticated as ${user.name} (${user.email})`);

      log.info('Checking projects endpoint...');
      const projects = await api.getProjects(false);
      (result.checks as Record<string, unknown>).projects = {
        ok: true,
        count: projects.length,
      };
      log.success(`Projects endpoint OK (${projects.length} projects visible)`);

      log.info('Checking tasks endpoint...');
      const taskResult = await api.getTasks(undefined, undefined, 5, 0);
      (result.checks as Record<string, unknown>).tasks = {
        ok: true,
        sampleCount: taskResult.tasks.length,
      };
      log.success(`Tasks endpoint OK (${taskResult.tasks.length} tasks returned in sample)`);

      if (options.write) {
        const projectId = options.project || 'inbox';
        const title = `ticktick-cli doctor ${new Date().toISOString()}`;

        log.info(`Running disposable write test in project ${projectId}...`);
        const createdTask = await api.createTask({
          title,
          projectId,
          content: 'Disposable task created by tt doctor --write',
        });
        createdTaskId = createdTask.id;
        (result.checks as Record<string, unknown>).write = {
          ok: true,
          projectId,
          createdTaskId,
        };
        log.success(`Task creation OK (${createdTaskId})`);

        await api.deleteTask(createdTaskId);
        createdTaskId = null;
        log.success('Task deletion OK');
      }

      result.ok = true;
      if (jsonMode) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        logger.success('Doctor checks passed');
      }
    } catch (error: any) {
      result.error = error.message;

      if (createdTaskId) {
        try {
          await api.deleteTask(createdTaskId);
          result.cleanup = { ok: true, deletedTaskId: createdTaskId };
          log.warn(`Cleaned up disposable task ${createdTaskId}`);
        } catch (cleanupError: any) {
          result.cleanup = {
            ok: false,
            deletedTaskId: createdTaskId,
            error: cleanupError.message,
          };
          log.warn(`Cleanup failed for disposable task ${createdTaskId}: ${cleanupError.message}`);
        }
      }

      if (jsonMode) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        logger.error(`Doctor failed: ${error.message}`);
      }

      return process.exit(1);
    }
  });

export { doctorCommand };
