import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';
import ConfigStore from 'configstore';
import { User, Project, Task } from './types';
import * as fs from 'fs';
import * as path from 'path';
import Bottleneck from 'bottleneck';
import EventEmitter from 'events';
import { networkInterfaces } from 'os';

interface TickTickApiConfig {
  baseURL?: string;
  timeout?: number;
  maxRetries?: number;
  enableCache?: boolean;
  cacheTTL?: number;
  cacheMaxSize?: number;
  rateLimiting?: boolean;
  maxConcurrent?: number;
  minTimeBetweenRequests?: number;
}

interface TickTickApiError extends Error {
  response?: {
    status?: number;
    statusText?: string;
    data?: any;
  };
  code?: string;
}

const pkgPath = path.join(__dirname, '../../package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));

// Stable JSON serialization for cache keys
function stableStringify(obj: any): string {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return '[' + obj.map(stableStringify).join(',') + ']';
  }
  const keys = Object.keys(obj).sort();
  return '{' + keys.map((k) => `"${k}":${stableStringify(obj[k])}`).join(',') + '}';
}

export class TickTickApi {
  private client: AxiosInstance;
  private config: ConfigStore;
  private token: string | null = null;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private rateLimiter: Bottleneck.Group;
  private eventEmitter: EventEmitter;
  private offlineQueue: Array<() => Promise<any>> = [];
  private configOptions: TickTickApiConfig;
  private cacheCleanupInterval: NodeJS.Timeout | null = null;

  constructor(config?: TickTickApiConfig) {
    this.config = new ConfigStore(pkg.name);
    this.configOptions = {
      baseURL: process.env.TICKTICK_API_BASE_URL || 'https://api.ticktick.com/api/v2',
      timeout: 10000,
      maxRetries: 3,
      enableCache: true,
      cacheTTL: 300000, // 5 minutes
      cacheMaxSize: 100,
      rateLimiting: true,
      maxConcurrent: 5,
      minTimeBetweenRequests: 100,
      ...config,
    };

    // Initialize rate limiter
    this.rateLimiter = new Bottleneck.Group({
      maxConcurrent: this.configOptions.maxConcurrent,
      minTime: this.configOptions.minTimeBetweenRequests,
    });

    // Initialize event emitter with max listeners
    this.eventEmitter = new EventEmitter();
    this.eventEmitter.setMaxListeners(100);

    this.client = axios.create({
      baseURL: this.configOptions.baseURL,
      timeout: this.configOptions.timeout,
      headers: {
        'User-Agent': `${pkg.name}/${pkg.version}`,
        'Content-Type': 'application/json',
      },
      withCredentials: true,
    });

    // Load token from config
    this.token = this.config.get('token') || null;

    // Add request interceptor for authentication
    this.client.interceptors.request.use((config) => {
      if (this.token) {
        config.headers.Cookie = `t=${this.token}`;
        config.headers['X-Device'] = 'web';
        config.headers['X-Client-Version'] = pkg.version;
      }
      return config;
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        const apiError = new Error(error.message) as TickTickApiError;
        apiError.code = error.code;

        if (error.response) {
          apiError.response = {
            status: error.response.status,
            statusText: error.response.statusText,
            data: error.response.data,
          };
        }

        // Handle specific error codes
        if (error.response) {
          const data = error.response.data as any;
          if (data && data.errorCode) {
            if (data.errorCode === 'user_not_sign_on') {
              apiError.message = 'Authentication required. Please login first.';
              throw apiError;
            }
            apiError.message = `${data.errorCode}: ${data.errorMessage || 'Unknown error'}`;
            throw apiError;
          }
          const status = error.response.status;
          apiError.message = `API error: ${status} ${error.response.statusText}`;
          throw apiError;
        }

        // Handle network errors
        apiError.message = `Network error: ${error.message}`;
        throw apiError;
      }
    );

    // Start cache cleanup interval
    this.startCacheCleanup();
  }

  private startCacheCleanup(): void {
    if (this.configOptions.enableCache && this.configOptions.cacheTTL) {
      this.cacheCleanupInterval = setInterval(() => {
        this.cleanupCache();
      }, this.configOptions.cacheTTL);
      this.cacheCleanupInterval.unref?.();
    }
  }

  private stopCacheCleanup(): void {
    if (this.cacheCleanupInterval) {
      clearInterval(this.cacheCleanupInterval);
      this.cacheCleanupInterval = null;
    }
  }

  /**
   * Clean up resources (cache interval, event listeners)
   * Call this when shutting down the application
   */
  public destroy(): void {
    this.stopCacheCleanup();
    this.eventEmitter.removeAllListeners();
    this.cache.clear();
    this.offlineQueue = [];
  }

  private cleanupCache(): void {
    const now = Date.now();
    const ttl = this.configOptions.cacheTTL || 300000;

    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > ttl) {
        this.cache.delete(key);
      }
    }

    // Enforce max size by removing oldest entries
    const maxSize = this.configOptions.cacheMaxSize || 100;
    if (this.cache.size > maxSize) {
      const entries = Array.from(this.cache.entries()).sort(
        (a, b) => a[1].timestamp - b[1].timestamp
      );
      for (let i = 0; i < this.cache.size - maxSize; i++) {
        this.cache.delete(entries[i][0]);
      }
    }
  }

  /**
   * Check if the system has network connectivity
   * Note: This checks for network interfaces, not actual internet connectivity
   * For reliable connectivity checks, make a test request to the API
   */
  private isOnline(): boolean {
    try {
      const nets = networkInterfaces();
      for (const name of Object.keys(nets)) {
        const net = nets[name];
        if (!net) continue;
        for (const netaddr of net) {
          // Skip internal (loopback) interfaces
          if (netaddr.family === 'IPv4' && !netaddr.internal) {
            return true;
          }
        }
      }
      return false;
    } catch {
      // If we can't check network interfaces, assume online
      return true;
    }
  }

  private formatErrorMessage(error: TickTickApiError): string {
    if (error.response?.status === 401) {
      return 'Authentication failed. Please login again.';
    }
    if (error.response?.status === 403) {
      return 'Permission denied.';
    }
    if (error.response?.status === 404) {
      return 'Resource not found.';
    }
    if (error.code === 'ECONNABORTED') {
      return 'Request timeout. Please try again.';
    }
    if (error.code === 'ENOTFOUND') {
      return 'Network error. Please check your connection.';
    }
    return error.message || 'An unexpected error occurred.';
  }

  // Event emitter methods
  public on(
    event: 'authChange' | 'taskCreated' | 'projectUpdated' | 'error',
    callback: (...args: any[]) => void
  ): void {
    this.eventEmitter.on(event, callback);
  }

  public off(event: string, callback: (...args: any[]) => void): void {
    this.eventEmitter.off(event, callback);
  }

  // Cache management methods
  private getCacheKey(method: string, ...args: any[]): string {
    return `${method}:${stableStringify(args)}`;
  }

  private getFromCache<T>(key: string): T | null {
    if (!this.configOptions.enableCache) return null;

    const cached = this.cache.get(key);
    if (
      cached &&
      cached.timestamp &&
      this.configOptions.cacheTTL &&
      Date.now() - cached.timestamp < this.configOptions.cacheTTL
    ) {
      return cached.data as T;
    }

    return null;
  }

  private setInCache(key: string, data: any): void {
    if (!this.configOptions.enableCache) return;

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  private clearCache(): void {
    this.cache.clear();
  }

  // Rate limiting wrapper
  private async withRateLimiting<T>(fn: () => Promise<T>, key: string = 'default'): Promise<T> {
    if (!this.configOptions.rateLimiting) {
      return fn();
    }

    return this.rateLimiter.key(key).schedule(fn);
  }

  // Offline queue management
  private async processOfflineQueue(): Promise<void> {
    if (this.isOnline() && this.offlineQueue.length > 0) {
      const queue = [...this.offlineQueue];
      this.offlineQueue = [];

      for (const operation of queue) {
        try {
          await operation();
        } catch (error) {
          console.error('Failed to process offline operation:', error);
        }
      }
    }
  }

  private buildUser(settings: any, fallbackUsername: string = 'unknown'): User {
    return {
      id: settings.id,
      username: settings.username || settings.email || fallbackUsername,
      email: settings.email || fallbackUsername,
      name: settings.name || settings.email || fallbackUsername,
    };
  }

  private normalizeTask(task: any): Task {
    const completed = task.completed ?? task.status === 2;
    return {
      id: task.id,
      title: task.title || '',
      content: task.content || '',
      projectId: task.projectId || 'inbox',
      completed,
      createdAt: task.createdAt || task.createdTime || '',
      updatedAt: task.updatedAt || task.modifiedTime || '',
      dueDate: task.dueDate,
      priority: task.priority,
      tags: task.tags,
      status: task.status,
      createdTime: task.createdTime,
      modifiedTime: task.modifiedTime,
      items: task.items,
    };
  }

  private normalizeProject(project: any): Project {
    return {
      id: project.id,
      name: project.name || '',
      color: project.color || '',
      sortOrder: project.sortOrder || 0,
      isOwner: project.isOwner ?? true,
      permission: project.permission || '',
      createdAt: project.createdAt || '',
      updatedAt: project.updatedAt || '',
      kind: project.kind,
      groupId: project.groupId,
    };
  }

  private async getRawTaskById(taskId: string): Promise<any> {
    const response = await this.withRateLimiting(() =>
      this.client.get('/batch/task', {
        params: { taskId, getAll: true },
      })
    );

    const task = response.data?.[0];
    if (!task) {
      throw new Error('Task not found');
    }

    return task;
  }

  private async getInboxProjectId(): Promise<string> {
    const cachedInboxId = this.config.get('inboxId');
    if (typeof cachedInboxId === 'string' && cachedInboxId.length > 0) {
      return cachedInboxId;
    }

    const response = await this.withRateLimiting(() => this.client.get('/batch/check/0'));
    const inboxId = response.data?.inboxId;

    if (!inboxId) {
      throw new Error('Unable to determine inbox project ID');
    }

    this.config.set('inboxId', inboxId);
    return inboxId;
  }

  private async findProjectById(projectId: string): Promise<Project> {
    const projects = await this.getProjects(false);
    const project = projects.find((item) => item.id === projectId);

    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    this.setInCache(this.getCacheKey('getProjectById', projectId), project);
    return project;
  }

  public async login(username: string, password: string): Promise<User> {
    try {
      const response = await this.client.post(
        '/user/signin',
        {
          username,
          password,
        },
        {
          params: {
            wc: true,
            remember: true,
          },
        }
      );

      const { token } = response.data;
      if (!token) {
        throw new Error('Login failed: No token received');
      }

      this.token = token;
      this.config.set('token', token);

      const user = await this.getCurrentUser(username);

      this.config.set('user', user);
      this.eventEmitter.emit('authChange', { authenticated: true, user });

      return user;
    } catch (error: any) {
      this.eventEmitter.emit('error', error);
      throw new Error(`Login failed: ${this.formatErrorMessage(error)}`);
    }
  }

  public async getCurrentUser(fallbackUsername?: string): Promise<User> {
    try {
      const userResponse = await this.withRateLimiting(() =>
        this.client.get('/user/preferences/settings', {
          params: { includeWeb: true },
        })
      );

      const user = this.buildUser(userResponse.data, fallbackUsername);
      this.config.set('user', user);
      return user;
    } catch (error: any) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        this.clearToken();
      }
      throw new Error(`Failed to get current user: ${this.formatErrorMessage(error)}`);
    }
  }

  public async getProjectById(projectId: string): Promise<Project> {
    const cacheKey = this.getCacheKey('getProjectById', projectId);

    const cached = this.getFromCache<Project>(cacheKey);
    if (cached) return cached;

    try {
      return await this.findProjectById(projectId);
    } catch (error: any) {
      this.eventEmitter.emit('error', error);
      throw new Error(`Failed to get project: ${this.formatErrorMessage(error)}`);
    }
  }

  public async createProject(name: string, color: string = '#4A90E2'): Promise<Project> {
    try {
      const response = await this.withRateLimiting(() =>
        this.client.post('/batch/project', {
          add: [{ name, color, kind: 'TASK' }],
        })
      );

      const projectId = Object.keys(response.data?.id2etag || {})[0];
      if (!projectId) {
        throw new Error('Project creation did not return an ID');
      }

      this.clearCache(); // Invalidate cache after creation
      const project = await this.findProjectById(projectId);
      this.eventEmitter.emit('projectUpdated', project);

      return project;
    } catch (error: any) {
      this.eventEmitter.emit('error', error);
      throw new Error(`Failed to create project: ${this.formatErrorMessage(error)}`);
    }
  }

  public async updateProject(projectId: string, updates: Partial<Project>): Promise<Project> {
    try {
      const response = await this.withRateLimiting(() =>
        this.client.post('/batch/project', {
          update: [{ id: projectId, ...updates }],
        })
      );

      const updatedProjectId = Object.keys(response.data?.id2etag || {})[0] || projectId;
      this.clearCache(); // Invalidate cache after update
      const project = await this.findProjectById(updatedProjectId);
      this.eventEmitter.emit('projectUpdated', project);

      return project;
    } catch (error: any) {
      this.eventEmitter.emit('error', error);
      throw new Error(`Failed to update project: ${this.formatErrorMessage(error)}`);
    }
  }

  public async deleteProject(projectId: string): Promise<void> {
    try {
      await this.withRateLimiting(() =>
        this.client.post('/batch/project', {
          delete: [projectId],
        })
      );

      this.clearCache(); // Invalidate cache after deletion
      this.eventEmitter.emit('projectDeleted', projectId);
    } catch (error: any) {
      this.eventEmitter.emit('error', error);
      throw new Error(`Failed to delete project: ${this.formatErrorMessage(error)}`);
    }
  }

  public async getTaskById(taskId: string): Promise<Task> {
    const cacheKey = this.getCacheKey('getTaskById', taskId);

    const cached = this.getFromCache<Task>(cacheKey);
    if (cached) return cached;

    try {
      const response = await this.withRateLimiting(() =>
        this.client.get('/batch/task', {
          params: { taskId, getAll: true },
        })
      );

      const task = this.normalizeTask(response.data[0]);
      this.setInCache(cacheKey, task);
      return task;
    } catch (error: any) {
      this.eventEmitter.emit('error', error);
      throw new Error(`Failed to get task: ${this.formatErrorMessage(error)}`);
    }
  }

  public async updateTask(taskId: string, updates: Partial<Task>): Promise<Task> {
    try {
      const currentTask = await this.getRawTaskById(taskId);
      const rawTask = {
        ...currentTask,
        ...updates,
        id: taskId,
        status:
          updates.completed === undefined ? (currentTask.status ?? 0) : updates.completed ? 2 : 0,
      };
      delete (rawTask as Partial<Task>).completed;
      delete (rawTask as Partial<Task>).createdAt;
      delete (rawTask as Partial<Task>).updatedAt;

      const response = await this.withRateLimiting(() =>
        this.client.post('/batch/task/update', {
          updates: [rawTask],
        })
      );

      const task = this.normalizeTask((response.data as any[])[0] || rawTask);
      this.clearCache(); // Invalidate cache after update
      this.eventEmitter.emit('taskUpdated', task);

      return task;
    } catch (error: any) {
      this.eventEmitter.emit('error', error);
      throw new Error(`Failed to update task: ${this.formatErrorMessage(error)}`);
    }
  }

  public async deleteTask(taskId: string): Promise<void> {
    try {
      const task = await this.getRawTaskById(taskId);
      const projectId =
        task.projectId === 'inbox' ? await this.getInboxProjectId() : task.projectId;

      await this.withRateLimiting(() =>
        this.client.post('/batch/task', {
          delete: [
            {
              projectId,
              taskId,
            },
          ],
        })
      );

      this.clearCache(); // Invalidate cache after deletion
      this.eventEmitter.emit('taskDeleted', taskId);
    } catch (error: any) {
      this.eventEmitter.emit('error', error);
      throw new Error(`Failed to delete task: ${this.formatErrorMessage(error)}`);
    }
  }

  public async completeTask(taskId: string): Promise<Task> {
    try {
      const task = await this.updateTask(taskId, { completed: true });
      this.eventEmitter.emit('taskCompleted', task);
      return task;
    } catch (error: any) {
      this.eventEmitter.emit('error', error);
      throw new Error(`Failed to complete task: ${this.formatErrorMessage(error)}`);
    }
  }

  public async uncompleteTask(taskId: string): Promise<Task> {
    try {
      const task = await this.updateTask(taskId, { completed: false });
      this.eventEmitter.emit('taskUncompleted', task);
      return task;
    } catch (error: any) {
      this.eventEmitter.emit('error', error);
      throw new Error(`Failed to uncomplete task: ${this.formatErrorMessage(error)}`);
    }
  }

  // Enhanced API methods with caching and pagination

  public async getProjects(useCache: boolean = true): Promise<Project[]> {
    const cacheKey = this.getCacheKey('getProjects');

    if (useCache) {
      const cached = this.getFromCache<Project[]>(cacheKey);
      if (cached) return cached;
    }

    try {
      const response = await this.withRateLimiting(() => this.client.get('/projects'));

      const projects = (response.data as any[]).map((project) => this.normalizeProject(project));
      this.setInCache(cacheKey, projects);
      return projects;
    } catch (error: any) {
      this.eventEmitter.emit('error', error);
      throw new Error(`Failed to get projects: ${this.formatErrorMessage(error)}`);
    }
  }

  public async getTasks(
    projectId?: string,
    completed?: boolean,
    limit: number = 50,
    offset: number = 0
  ): Promise<{ tasks: Task[]; total: number; hasMore: boolean }> {
    const cacheKey = this.getCacheKey('getTasks', { projectId, completed, limit, offset });

    const cached = this.getFromCache<{ tasks: Task[]; total: number; hasMore: boolean }>(cacheKey);
    if (cached) return cached;

    try {
      const params: any = {
        limit,
        offset,
        getAll: true,
        includeAll: true,
      };

      if (projectId) params.projectId = projectId;
      if (completed !== undefined) params.completed = completed;

      const response = await this.withRateLimiting(() =>
        this.client.get('/batch/task', { params })
      );

      const tasks = (response.data as any[]).map((task) => this.normalizeTask(task));
      const result = {
        tasks,
        total: offset + tasks.length,
        hasMore: tasks.length === limit,
      };

      this.setInCache(cacheKey, result);
      return result;
    } catch (error: any) {
      this.eventEmitter.emit('error', error);
      throw new Error(`Failed to get tasks: ${this.formatErrorMessage(error)}`);
    }
  }

  public async batchUpdateTasks(
    updates: { id: string; updates: Partial<Task> }[]
  ): Promise<Task[]> {
    try {
      const response = await this.withRateLimiting(() =>
        this.client.post('/batch/task/update', { updates })
      );

      this.clearCache(); // Invalidate cache after batch updates
      this.eventEmitter.emit(
        'taskUpdated',
        updates.map((u) => u.id)
      );

      return response.data as Task[];
    } catch (error: any) {
      this.eventEmitter.emit('error', error);
      throw new Error(`Failed to batch update tasks: ${this.formatErrorMessage(error)}`);
    }
  }

  // Offline support
  public async createTask(task: Partial<Task>, offline: boolean = false): Promise<Task> {
    if (offline || !this.isOnline()) {
      const offlineTask = { ...task, id: 'offline-' + Date.now() } as Task;
      this.offlineQueue.push(() => this.createTask(task, false));
      return offlineTask;
    }

    try {
      const response = await this.withRateLimiting(() => this.client.post('/batch/task', task));

      const createdTask = this.normalizeTask(response.data);
      this.clearCache(); // Invalidate cache after creation
      this.eventEmitter.emit('taskCreated', createdTask);

      return createdTask;
    } catch (error: any) {
      this.eventEmitter.emit('error', error);
      throw new Error(`Failed to create task: ${this.formatErrorMessage(error)}`);
    }
  }

  // Add method to process offline queue
  public async syncOfflineChanges(): Promise<void> {
    await this.processOfflineQueue();
  }

  // Add analytics method
  public async trackEvent(event: string, data?: any): Promise<void> {
    if (this.config.get('enableAnalytics')) {
      try {
        await this.withRateLimiting(() => this.client.post('/analytics/event', { event, data }));
      } catch (error) {
        // Silent fail for analytics
        console.debug('Analytics error:', error);
      }
    }
  }

  // Basic methods for backward compatibility
  public isAuthenticated(): boolean {
    return !!this.token;
  }

  public setToken(token: string): void {
    this.token = token;
    this.config.set('token', token);
  }

  public clearToken(): void {
    this.token = null;
    this.config.delete('token');
    this.config.delete('user');
    this.config.delete('inboxId');
  }

  public getToken(): string | null {
    return this.token;
  }

  public logout(): void {
    this.clearToken();
    this.clearCache();
    this.eventEmitter.emit('authChange', { authenticated: false });
  }

  // Generic HTTP methods that return raw data (not AxiosResponse)
  public async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.withRateLimiting(() => this.client.get<T>(url, config));
    return response.data;
  }

  public async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.withRateLimiting(() => this.client.post<T>(url, data, config));
    return response.data;
  }

  public async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.withRateLimiting(() => this.client.put<T>(url, data, config));
    return response.data;
  }

  public async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.withRateLimiting(() => this.client.delete<T>(url, config));
    return response.data;
  }
}
