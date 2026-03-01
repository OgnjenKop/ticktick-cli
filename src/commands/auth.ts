import { Command } from 'commander';
import inquirer from 'inquirer';
import open from 'open';
import { logger } from '../utils/logger';
import { TickTickApi } from '../core/api';
import { ConfigManager } from '../core/config';

const api = new TickTickApi();
const config = new ConfigManager();

const authCommand = new Command('auth').description('Authentication commands').alias('login');

authCommand
  .command('login')
  .description('Login to TickTick')
  .option('-u, --username <username>', 'TickTick username')
  .option('-p, --password <password>', 'TickTick password')
  .option('-b, --browser', 'Login via browser (default: true)')
  .action(async (options) => {
    try {
      logger.info('Starting authentication...');

      // Use password login if credentials are provided, otherwise use browser
      const usePasswordLogin = options.username && options.password;

      if (!usePasswordLogin && options.browser !== false) {
        logger.info('Opening browser for authentication...');

        // Open TickTick website for user to login
        await open('https://ticktick.com/signin');

        logger.info('Please login in the browser and then press Enter to continue...');

        await inquirer.prompt([
          {
            type: 'input',
            name: 'continue',
            message: 'Press Enter after you have logged in',
          },
        ]);

        // TODO: Need to figure out how to capture session cookie
        // This is a challenge since TickTick doesn't have public OAuth API

        logger.warn(
          'Browser authentication not fully implemented yet. Need to manually extract session cookie.'
        );
        logger.info('To get your session cookie:');
        logger.info('1. Login to https://ticktick.com in your browser');
        logger.info('2. Open Developer Tools (F12)');
        logger.info('3. Go to Application/Storage > Cookies > https://ticktick.com');
        logger.info('4. Find the "t" cookie and copy its value');

        const { sessionCookie } = await inquirer.prompt([
          {
            type: 'input',
            name: 'sessionCookie',
            message: 'Paste your session cookie (t=...)',
            validate: (input) => input.trim().length > 0 || 'Session cookie is required',
          },
        ]);

        // Extract token from cookie (e.g., "t=abc123" -> "abc123")
        const token = sessionCookie.replace(/^t=/, '').trim();
        api.setToken(token);

        // Test the authentication
        try {
          const response = await api.get<any>('/user/preferences/settings', {
            params: { includeWeb: true },
          });
          const user = {
            id: response.data.id,
            username: response.data.email || 'unknown',
            email: response.data.email || 'unknown',
            name: response.data.name || response.data.email || 'unknown',
          };
          config.setUser(user);
          logger.success('Authentication successful!');
        } catch (error: any) {
          logger.error('Authentication failed. Invalid session cookie.');
          api.logout();
          process.exit(1);
        }
      } else if (usePasswordLogin) {
        // Use API login with provided credentials
        const username = options.username;
        const password = options.password;

        logger.info('Logging in...');

        const user = await api.login(username, password);
        config.setUser(user);

        logger.success(`Logged in as ${user.name || user.username}!`);
      } else {
        // Prompt for credentials interactively
        const answers = await inquirer.prompt([
          {
            type: 'input',
            name: 'username',
            message: 'TickTick username/email:',
            validate: (input) => input.trim().length > 0 || 'Username is required',
          },
          {
            type: 'password',
            name: 'password',
            message: 'Password:',
            mask: '*',
            validate: (input) => input.trim().length > 0 || 'Password is required',
          },
        ]);

        logger.info('Logging in...');

        const user = await api.login(answers.username, answers.password);
        config.setUser(user);

        logger.success(`Logged in as ${user.name || user.username}!`);
      }
    } catch (error: any) {
      logger.error(`Authentication failed: ${error.message}`);
      process.exit(1);
    }
  });

authCommand
  .command('logout')
  .description('Logout from TickTick')
  .action(() => {
    api.logout();
    config.clearAll();
    logger.success('Logged out successfully');
  });

authCommand
  .command('status')
  .description('Check authentication status')
  .action(() => {
    if (api.isAuthenticated()) {
      const user = config.getUser();
      if (user) {
        logger.success(`Authenticated as: ${user.name} (${user.email})`);
      } else {
        logger.success('Authenticated (user info not available)');
      }
    } else {
      logger.warn('Not authenticated');
    }
  });

authCommand
  .command('whoami')
  .description('Show current user info')
  .action(async () => {
    if (!api.isAuthenticated()) {
      logger.error('Not authenticated. Please login first.');
      process.exit(1);
    }

    try {
      const user = config.getUser();
      if (user) {
        console.log(JSON.stringify(user, null, 2));
      } else {
        logger.warn('User info not available. Try logging in again.');
      }
    } catch (error: any) {
      logger.error(`Failed to get user info: ${error.message}`);
    }
  });

export { authCommand };
