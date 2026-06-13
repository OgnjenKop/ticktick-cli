const promptMock = jest.fn();
const openMock = jest.fn();

const apiMock = {
  login: jest.fn(),
  logout: jest.fn(),
  isAuthenticated: jest.fn(),
  getCurrentUser: jest.fn(),
  getTasks: jest.fn(),
  createTask: jest.fn(),
  createProject: jest.fn(),
  deleteTask: jest.fn(),
  deleteProject: jest.fn(),
  getProjects: jest.fn(),
  getTaskById: jest.fn(),
  updateTask: jest.fn(),
  completeTask: jest.fn(),
  uncompleteTask: jest.fn(),
  getProjectById: jest.fn(),
  updateProject: jest.fn(),
};

const configMock = {
  setUser: jest.fn(),
  getUser: jest.fn(),
  clearAll: jest.fn(),
};

const loggerMock = {
  info: jest.fn(),
  success: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  log: jest.fn(),
};

jest.mock('inquirer', () => ({
  __esModule: true,
  default: {
    prompt: promptMock,
  },
}));

jest.mock('open', () => ({
  __esModule: true,
  default: openMock,
}));

jest.mock('../src/core/api', () => ({
  api: apiMock,
}));

jest.mock('../src/core/config', () => ({
  ConfigManager: jest.fn(() => configMock),
}));

jest.mock('../src/utils/logger', () => ({
  logger: loggerMock,
}));

function getCommand(commandModulePath: string) {
  jest.resetModules();
  let commandModule: any;
  jest.isolateModules(() => {
    commandModule = require(commandModulePath);
  });
  return commandModule[Object.keys(commandModule)[0]];
}

async function runCommand(commandModulePath: string, argv: string[]) {
  const command = getCommand(commandModulePath);
  command.exitOverride();
  return command.parseAsync(argv, { from: 'user' });
}

describe('CLI commands', () => {
  beforeEach(() => {
    Object.values(apiMock).forEach((mockFn) => mockFn.mockReset());
    Object.values(configMock).forEach((mockFn) => mockFn.mockReset());
    Object.values(loggerMock).forEach((mockFn) => mockFn.mockReset());
    promptMock.mockReset();
    openMock.mockReset();
    process.exitCode = undefined;
  });

  describe('auth login', () => {
    it('uses credential login when username is provided with --no-browser', async () => {
      promptMock.mockResolvedValue({ password: 'secret123' });
      apiMock.login.mockResolvedValue({
        id: 'user-1',
        username: 'person@example.com',
        email: 'person@example.com',
        name: 'Person',
      });

      await runCommand('../src/commands/auth', [
        'login',
        '--username',
        'person@example.com',
        '--no-browser',
      ]);

      expect(openMock).not.toHaveBeenCalled();
      expect(apiMock.login).toHaveBeenCalledWith('person@example.com', 'secret123');
      expect(configMock.setUser).toHaveBeenCalled();
      expect(process.exitCode).toBeUndefined();
    });

    it('warns and clears config when stored auth is stale', async () => {
      apiMock.isAuthenticated.mockReturnValue(true);
      apiMock.getCurrentUser.mockRejectedValue(
        new Error('Failed to get current user: Authentication failed. Please login again.')
      );

      await runCommand('../src/commands/auth', ['status']);

      expect(configMock.clearAll).toHaveBeenCalled();
      expect(loggerMock.warn).toHaveBeenCalledWith(
        'Authentication is no longer valid: Failed to get current user: Authentication failed. Please login again.'
      );
    });
  });

  describe('tasks list', () => {
    it('passes parsed limit and offset to the API', async () => {
      apiMock.isAuthenticated.mockReturnValue(true);
      apiMock.getTasks.mockResolvedValue({
        tasks: [{ id: '1', title: 'Task one', projectId: 'inbox', completed: false }],
        total: 26,
        hasMore: true,
      });

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);

      await runCommand('../src/commands/tasks', [
        'list',
        '--project',
        'inbox',
        '--uncompleted',
        '--limit',
        '25',
        '--offset',
        '10',
      ]);

      expect(apiMock.getTasks).toHaveBeenCalledWith('inbox', false, 25, 10);
      expect(loggerMock.info).toHaveBeenCalledWith(
        'Showing 1 tasks. Use --limit/--offset for more.'
      );

      consoleSpy.mockRestore();
    });

    it('rejects invalid limit values before calling the API', async () => {
      apiMock.isAuthenticated.mockReturnValue(true);

      await runCommand('../src/commands/tasks', ['list', '--limit', '0', '--offset', '0']);

      expect(loggerMock.error).toHaveBeenCalledWith('Value must be between 1 and 500');
      expect(process.exitCode).toBe(1);
    });

    it('rejects mutually exclusive completed filters', async () => {
      apiMock.isAuthenticated.mockReturnValue(true);

      await runCommand('../src/commands/tasks', ['list', '--completed', '--uncompleted']);

      expect(loggerMock.error).toHaveBeenCalledWith(
        'Cannot use both --completed and --uncompleted'
      );
      expect(process.exitCode).toBe(1);
    });
  });

  describe('tasks delete', () => {
    it('deletes a task after confirmation', async () => {
      apiMock.isAuthenticated.mockReturnValue(true);
      promptMock.mockResolvedValue({ confirmed: true });
      apiMock.deleteTask.mockResolvedValue(undefined);

      await runCommand('../src/commands/tasks', ['delete', 'task-1']);

      expect(promptMock).toHaveBeenCalledWith([
        expect.objectContaining({
          message: 'Are you sure you want to delete task task-1?',
        }),
      ]);
      expect(apiMock.deleteTask).toHaveBeenCalledWith('task-1');
    });

    it('skips confirmation with --yes', async () => {
      apiMock.isAuthenticated.mockReturnValue(true);
      apiMock.deleteTask.mockResolvedValue(undefined);

      await runCommand('../src/commands/tasks', ['delete', 'task-1', '--yes']);

      expect(promptMock).not.toHaveBeenCalled();
      expect(apiMock.deleteTask).toHaveBeenCalledWith('task-1');
    });

    it('cancels delete when user declines confirmation', async () => {
      apiMock.isAuthenticated.mockReturnValue(true);
      promptMock.mockResolvedValue({ confirmed: false });

      await runCommand('../src/commands/tasks', ['delete', 'task-1']);

      expect(apiMock.deleteTask).not.toHaveBeenCalled();
      expect(loggerMock.info).toHaveBeenCalledWith('Delete cancelled');
    });
  });

  describe('tasks update', () => {
    it('allows clearing content by passing an empty string', async () => {
      apiMock.isAuthenticated.mockReturnValue(true);
      apiMock.updateTask.mockResolvedValue({
        id: 'task-1',
        title: 'Title',
        content: '',
        completed: false,
      });

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);

      await runCommand('../src/commands/tasks', ['update', 'task-1', '--content', '']);

      expect(apiMock.updateTask).toHaveBeenCalledWith(
        'task-1',
        expect.objectContaining({ content: '' })
      );

      consoleSpy.mockRestore();
    });

    it('rejects mutually exclusive completed flags', async () => {
      apiMock.isAuthenticated.mockReturnValue(true);

      await runCommand('../src/commands/tasks', [
        'update',
        'task-1',
        '--completed',
        '--uncompleted',
      ]);

      expect(loggerMock.error).toHaveBeenCalledWith(
        'Cannot use both --completed and --uncompleted'
      );
      expect(process.exitCode).toBe(1);
    });
  });

  describe('projects add', () => {
    it('rejects invalid color flags before creating a project', async () => {
      apiMock.isAuthenticated.mockReturnValue(true);

      await runCommand('../src/commands/projects', [
        'add',
        '--name',
        'Work',
        '--color',
        'not-a-color',
      ]);

      expect(loggerMock.error).toHaveBeenCalledWith(
        'Invalid color format. Use hex format like #FF5733 or #F53'
      );
      expect(process.exitCode).toBe(1);
    });
  });

  describe('projects delete', () => {
    it('deletes a project after confirmation', async () => {
      apiMock.isAuthenticated.mockReturnValue(true);
      promptMock.mockResolvedValue({ confirmed: true });
      apiMock.deleteProject.mockResolvedValue(undefined);

      await runCommand('../src/commands/projects', ['delete', 'project-1']);

      expect(promptMock).toHaveBeenCalledWith([
        expect.objectContaining({
          message: 'Are you sure you want to delete project project-1?',
        }),
      ]);
      expect(apiMock.deleteProject).toHaveBeenCalledWith('project-1');
    });

    it('skips confirmation with --yes', async () => {
      apiMock.isAuthenticated.mockReturnValue(true);
      apiMock.deleteProject.mockResolvedValue(undefined);

      await runCommand('../src/commands/projects', ['delete', 'project-1', '--yes']);

      expect(promptMock).not.toHaveBeenCalled();
      expect(apiMock.deleteProject).toHaveBeenCalledWith('project-1');
    });
  });

  describe('doctor', () => {
    it('runs read-only checks by default', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);

      apiMock.isAuthenticated.mockReturnValue(true);
      apiMock.getCurrentUser.mockResolvedValue({
        id: 'user-1',
        name: 'Person',
        email: 'person@example.com',
      });
      apiMock.getProjects.mockResolvedValue([{ id: 'project-1', name: 'Work' }]);
      apiMock.getTasks.mockResolvedValue({ tasks: [], total: 0, hasMore: false });

      await runCommand('../src/commands/doctor', []);

      expect(apiMock.getCurrentUser).toHaveBeenCalled();
      expect(apiMock.getProjects).toHaveBeenCalledWith(false);
      expect(apiMock.getTasks).toHaveBeenCalledWith(undefined, undefined, 5, 0);
      expect(apiMock.createTask).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('runs disposable write checks when requested', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);

      apiMock.isAuthenticated.mockReturnValue(true);
      apiMock.getCurrentUser.mockResolvedValue({
        id: 'user-1',
        name: 'Person',
        email: 'person@example.com',
      });
      apiMock.getProjects.mockResolvedValue([]);
      apiMock.getTasks.mockResolvedValue({ tasks: [], total: 0, hasMore: false });
      apiMock.createTask.mockResolvedValue({ id: 'task-1', title: 'doctor' });
      apiMock.deleteTask.mockResolvedValue(undefined);

      await runCommand('../src/commands/doctor', ['--write', '--project', 'project-1']);

      expect(apiMock.createTask).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: 'project-1',
        })
      );
      expect(apiMock.deleteTask).toHaveBeenCalledWith('task-1');

      consoleSpy.mockRestore();
    });

    it('prints structured JSON in json mode', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);

      apiMock.isAuthenticated.mockReturnValue(true);
      apiMock.getCurrentUser.mockResolvedValue({
        id: 'user-1',
        name: 'Person',
        email: 'person@example.com',
      });
      apiMock.getProjects.mockResolvedValue([{ id: 'project-1', name: 'Work' }]);
      apiMock.getTasks.mockResolvedValue({ tasks: [{ id: 'task-1' }], total: 1, hasMore: false });

      await runCommand('../src/commands/doctor', ['--json']);

      expect(loggerMock.info).not.toHaveBeenCalled();
      expect(loggerMock.success).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        JSON.stringify(
          {
            ok: true,
            checks: {
              auth: {
                ok: true,
                user: {
                  id: 'user-1',
                  name: 'Person',
                  email: 'person@example.com',
                },
              },
              projects: {
                ok: true,
                count: 1,
              },
              tasks: {
                ok: true,
                sampleCount: 1,
              },
            },
          },
          null,
          2
        )
      );

      consoleSpy.mockRestore();
    });
  });
});
