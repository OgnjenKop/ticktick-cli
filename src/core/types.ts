// Type definitions for TickTick API

export interface ApiResponse<T> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
}

export interface ErrorResponse {
  errorId: string;
  errorCode: string;
  errorMessage: string;
  data: null;
}

export interface User {
  id: string;
  username: string;
  email: string;
  name: string;
}

export interface Task {
  id: string;
  title: string;
  content: string;
  projectId: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
  dueDate?: string;
  priority?: number;
  tags?: string[];
  status?: number;
  createdTime?: string;
  modifiedTime?: string;
  items?: unknown[];
}

export interface Project {
  id: string;
  name: string;
  color: string;
  sortOrder: number;
  isOwner: boolean;
  permission: string;
  createdAt: string;
  updatedAt: string;
  kind?: string;
  groupId?: string | null;
}

export interface AuthConfig {
  sessionCookie?: string;
  user?: User;
  lastLogin?: string;
}
