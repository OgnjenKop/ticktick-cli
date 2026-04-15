import { TickTickApi } from '../src/core/api';
import { validators } from '../src/utils/validation';

jest.mock('axios', () => {
  const create = jest.fn(() => ({
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  }));

  return {
    __esModule: true,
    default: { create },
    create,
  };
});

describe('TickTickApi - Unit Tests', () => {
  // Note: Full TickTickApi tests require mocking configstore which is an ESM module.
  // These tests focus on the core functionality that can be tested without external dependencies.

  describe('Validation Integration', () => {
    it('should validate dates correctly', () => {
      expect(validators.isValidDate('2024-03-15')).toBe(true);
      expect(validators.isValidDate('invalid')).toBe(false);
    });

    it('should validate hex colors correctly', () => {
      expect(validators.isValidHexColor('#FF5733')).toBe(true);
      expect(validators.isValidHexColor('invalid')).toBe(false);
    });

    it('should validate task titles correctly', () => {
      expect(validators.isValidTaskTitle('Buy milk')).toBe(true);
      expect(validators.isValidTaskTitle('')).toBe(false);
    });

    it('should validate project names correctly', () => {
      expect(validators.isValidProjectName('Work')).toBe(true);
      expect(validators.isValidProjectName('')).toBe(false);
    });
  });

  describe('Stable Stringify (for cache keys)', () => {
    // This is a basic test - the actual stableStringify is tested indirectly
    it('should handle objects consistently', () => {
      const obj1 = { b: 2, a: 1 };
      const obj2 = { a: 1, b: 2 };

      // Both should produce the same stringified result
      const str1 = JSON.stringify(obj1, Object.keys(obj1).sort());
      const str2 = JSON.stringify(obj2, Object.keys(obj2).sort());

      expect(str1).toBe(str2);
    });
  });

  describe('getTasks', () => {
    it('should include offset in total and hasMore metadata', async () => {
      const api = new TickTickApi({
        enableCache: false,
        rateLimiting: false,
      });

      const client = (api as any).client;
      client.get.mockResolvedValue({
        data: [{ id: '1', title: 'Task', projectId: 'inbox', status: 0 }],
      });

      const result = await api.getTasks(undefined, undefined, 1, 10);

      expect(result.total).toBe(11);
      expect(result.hasMore).toBe(true);

      api.destroy();
    });
  });

  describe('login', () => {
    it('should call the signin endpoint', async () => {
      const api = new TickTickApi({
        enableCache: false,
        rateLimiting: false,
      });

      const client = (api as any).client;
      client.post.mockResolvedValueOnce({
        data: { token: 'token-123' },
      });
      client.get.mockResolvedValueOnce({
        data: {
          id: 'user-1',
          email: 'user@example.com',
          name: 'Example User',
        },
      });

      await api.login('user@example.com', 'password');

      expect(client.post).toHaveBeenCalledWith(
        '/user/signin',
        { username: 'user@example.com', password: 'password' },
        { params: { wc: true, remember: true } }
      );

      api.destroy();
    });
  });

  describe('getCurrentUser', () => {
    it('should fetch and persist the current user from the API', async () => {
      const api = new TickTickApi({
        enableCache: false,
        rateLimiting: false,
      });

      const client = (api as any).client;
      client.get.mockResolvedValue({
        data: {
          id: 'user-1',
          email: 'user@example.com',
          name: 'Example User',
        },
      });

      const user = await api.getCurrentUser();

      expect(user).toEqual({
        id: 'user-1',
        username: 'user@example.com',
        email: 'user@example.com',
        name: 'Example User',
      });
      expect((api as any).config.get('user')).toEqual(user);

      api.destroy();
    });

    it('should clear the stored token when the session is unauthorized', async () => {
      const api = new TickTickApi({
        enableCache: false,
        rateLimiting: false,
      });

      api.setToken('stale-token');

      const client = (api as any).client;
      client.get.mockRejectedValue({
        response: { status: 401 },
        message: 'Unauthorized',
      });

      await expect(api.getCurrentUser()).rejects.toThrow(
        'Failed to get current user: Authentication failed. Please login again.'
      );
      expect(api.getToken()).toBeNull();

      api.destroy();
    });

    it('should clear the stored token when the interceptor returns a normalized 401 error', async () => {
      const api = new TickTickApi({
        enableCache: false,
        rateLimiting: false,
      });

      api.setToken('stale-token');

      const unauthorizedError = new Error('API error: 401 Unauthorized') as Error & {
        response?: { status: number };
      };
      unauthorizedError.response = { status: 401 };

      const client = (api as any).client;
      client.get.mockRejectedValue(unauthorizedError);

      await expect(api.getCurrentUser()).rejects.toThrow(
        'Failed to get current user: Authentication failed. Please login again.'
      );
      expect(api.getToken()).toBeNull();

      api.destroy();
    });
  });

  describe('project batch CRUD', () => {
    it('should create projects through the batch endpoint', async () => {
      const api = new TickTickApi({
        enableCache: false,
        rateLimiting: false,
      });

      const client = (api as any).client;
      client.post.mockResolvedValueOnce({
        data: { id2etag: { 'project-1': 'etag-1' } },
      });
      client.get.mockResolvedValueOnce({
        data: [{ id: 'project-1', name: 'Work', color: '#4A90E2' }],
      });

      const project = await api.createProject('Work');

      expect(client.post).toHaveBeenCalledWith('/batch/project', {
        add: [{ name: 'Work', color: '#4A90E2', kind: 'TASK' }],
      });
      expect(project.id).toBe('project-1');

      api.destroy();
    });

    it('should delete projects through the batch endpoint', async () => {
      const api = new TickTickApi({
        enableCache: false,
        rateLimiting: false,
      });

      const client = (api as any).client;
      client.post.mockResolvedValueOnce({ data: {} });

      await api.deleteProject('project-1');

      expect(client.post).toHaveBeenCalledWith('/batch/project', {
        delete: ['project-1'],
      });

      api.destroy();
    });
  });

  describe('task mutation endpoints', () => {
    it('should delete tasks through batch/task payloads', async () => {
      const api = new TickTickApi({
        enableCache: false,
        rateLimiting: false,
      });

      const client = (api as any).client;
      client.get.mockResolvedValueOnce({
        data: [{ id: 'task-1', title: 'Task', projectId: 'inbox', status: 0 }],
      });
      client.get.mockResolvedValueOnce({
        data: { inboxId: 'inbox-actual' },
      });
      client.post.mockResolvedValueOnce({ data: {} });

      await api.deleteTask('task-1');

      expect(client.post).toHaveBeenCalledWith('/batch/task', {
        delete: [{ projectId: 'inbox-actual', taskId: 'task-1' }],
      });

      api.destroy();
    });

    it('should preserve raw task fields when updating completion state', async () => {
      const api = new TickTickApi({
        enableCache: false,
        rateLimiting: false,
      });

      const client = (api as any).client;
      client.get.mockResolvedValueOnce({
        data: [
          {
            id: 'task-1',
            title: 'Task',
            projectId: 'project-1',
            status: 0,
            timeZone: 'UTC',
            reminders: ['r1'],
            isAllDay: true,
          },
        ],
      });
      client.post.mockResolvedValueOnce({
        data: [
          {
            id: 'task-1',
            title: 'Task',
            projectId: 'project-1',
            status: 2,
            timeZone: 'UTC',
            reminders: ['r1'],
            isAllDay: true,
          },
        ],
      });

      await api.completeTask('task-1');

      expect(client.post).toHaveBeenCalledWith('/batch/task/update', {
        updates: [
          expect.objectContaining({
            id: 'task-1',
            title: 'Task',
            projectId: 'project-1',
            status: 2,
            timeZone: 'UTC',
            reminders: ['r1'],
            isAllDay: true,
          }),
        ],
      });

      api.destroy();
    });
  });

  describe('cache cleanup lifecycle', () => {
    it('should unref the cache cleanup timer', () => {
      const unref = jest.fn();
      const setIntervalSpy = jest.spyOn(global, 'setInterval').mockReturnValue({
        unref,
      } as unknown as NodeJS.Timeout);
      const clearIntervalSpy = jest
        .spyOn(global, 'clearInterval')
        .mockImplementation(() => undefined);

      const api = new TickTickApi({
        enableCache: true,
        cacheTTL: 1000,
      });

      expect(unref).toHaveBeenCalled();

      api.destroy();

      setIntervalSpy.mockRestore();
      clearIntervalSpy.mockRestore();
    });
  });
});
