import { ConfigManager } from '../src/core/config';
import { User } from '../src/core/types';

describe('ConfigManager', () => {
  let configManager: ConfigManager;

  beforeEach(() => {
    configManager = new ConfigManager();
    configManager.clearAll();
  });

  afterEach(() => {
    configManager.clearAll();
  });

  describe('setUser and getUser', () => {
    it('should set and retrieve user', () => {
      const user: User = {
        id: '123',
        username: 'testuser',
        email: 'test@example.com',
        name: 'Test User',
      };

      configManager.setUser(user);
      const retrieved = configManager.getUser();

      expect(retrieved).toEqual(user);
    });

    it('should return undefined when no user is set', () => {
      const retrieved = configManager.getUser();
      expect(retrieved).toBeUndefined();
    });
  });

  describe('clearUser', () => {
    it('should clear user and lastLogin', () => {
      const user: User = {
        id: '123',
        username: 'testuser',
        email: 'test@example.com',
        name: 'Test User',
      };

      configManager.setUser(user);
      expect(configManager.getUser()).toBeDefined();

      configManager.clearUser();
      expect(configManager.getUser()).toBeUndefined();
    });
  });

  describe('setConfig and getConfig', () => {
    it('should set and retrieve config', () => {
      const config = {
        sessionCookie: 'test-token',
      };

      configManager.setConfig(config);
      const retrieved = configManager.getConfig();

      expect(retrieved.sessionCookie).toBe('test-token');
    });
  });

  describe('clearAll', () => {
    it('should clear all config entries', () => {
      const user: User = {
        id: '123',
        username: 'testuser',
        email: 'test@example.com',
        name: 'Test User',
      };

      configManager.setUser(user);
      configManager.setConfig({ sessionCookie: 'test' });

      configManager.clearAll();
      expect(configManager.getConfig()).toEqual({});
    });
  });
});
