/**
 * Input validation utilities for TickTick CLI
 */

export const validators = {
  /**
   * Validates a date string in YYYY-MM-DD format
   */
  isValidDate(dateString: string): boolean {
    if (!dateString) return false;

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateString)) return false;

    const date = new Date(dateString);
    if (isNaN(date.getTime())) return false;

    // Check that the date components match (to catch invalid dates like 2024-02-30)
    const parts = dateString.split('-');
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);

    return date.getFullYear() === year && date.getMonth() + 1 === month && date.getDate() === day;
  },

  /**
   * Validates a hex color code
   * Accepts formats: #RGB, #RRGGBB, #RRGGBBAA
   */
  isValidHexColor(color: string): boolean {
    if (!color) return false;

    const hexRegex = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/;
    return hexRegex.test(color);
  },

  /**
   * Validates a project/task ID (non-empty string)
   */
  isValidId(id: string): boolean {
    return typeof id === 'string' && id.trim().length > 0;
  },

  /**
   * Validates a username/email (basic validation)
   */
  isValidUsername(username: string): boolean {
    if (!username) return false;
    return username.trim().length >= 3;
  },

  /**
   * Validates a password (minimum length)
   */
  isValidPassword(password: string): boolean {
    if (!password) return false;
    return password.length >= 6;
  },

  /**
   * Validates a task title (non-empty, reasonable length)
   */
  isValidTaskTitle(title: string): boolean {
    if (!title) return false;
    const trimmed = title.trim();
    return trimmed.length > 0 && trimmed.length <= 500;
  },

  /**
   * Validates a project name (non-empty, reasonable length)
   */
  isValidProjectName(name: string): boolean {
    if (!name) return false;
    const trimmed = name.trim();
    return trimmed.length > 0 && trimmed.length <= 100;
  },

  /**
   * Validates a number is within a range
   */
  isValidNumber(value: number | string, min: number, max: number): boolean {
    const num = typeof value === 'string' ? parseInt(value, 10) : value;
    return !isNaN(num) && num >= min && num <= max;
  },

  /**
   * Validates a priority value (0-9 for TickTick)
   */
  isValidPriority(priority: number | string): boolean {
    return this.isValidNumber(priority, 0, 9);
  },
};

/**
 * Validation error messages
 */
export const validationMessages = {
  date: 'Invalid date format. Use YYYY-MM-DD (e.g., 2024-03-15)',
  hexColor: 'Invalid color format. Use hex format like #FF5733 or #F53',
  id: 'ID cannot be empty',
  username: 'Username must be at least 3 characters',
  password: 'Password must be at least 6 characters',
  taskTitle: 'Task title must be between 1 and 500 characters',
  projectName: 'Project name must be between 1 and 100 characters',
  priority: 'Priority must be between 0 and 9',
  number: (min: number, max: number) => `Value must be between ${min} and ${max}`,
};
