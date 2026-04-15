import { Command } from 'commander';
import inquirer from 'inquirer';
import open from 'open';
import { logger } from '../utils/logger';
import { TickTickApi } from '../core/api';
import { ConfigManager } from '../core/config';
import { validators, validationMessages } from '../utils/validation';

const api = new TickTickApi();
const config = new ConfigManager();

const authCommand = new Command('auth').description('Authentication commands');

async function getValidatedUser(): Promise<ReturnType<ConfigManager['getUser']>> {
  if (!api.isAuthenticated()) {
    logger.warn('Not authenticated');
    return undefined;
  }

  try {
    const user = await api.getCurrentUser();
    config.setUser(user);
    return user;
  } catch (error: any) {
    config.clearAll();
    logger.warn(`Authentication is no longer valid: ${error.message}`);
    return undefined;
  }
}

authCommand
  .command('login')
  .description('Login to TickTick')
  .option('-u, --username <username>', 'TickTick username')
  .option('-p, --password <password>', 'TickTick password')
  .option('-b, --browser', 'Login via browser')
  .option('--no-browser', 'Use credential login instead of browser login')
  .action(async (options) => {
    try {
      logger.info('Starting authentication...');

      const hasAnyCredentials = Boolean(options.username || options.password);
      const useBrowserLogin = options.browser !== false && !hasAnyCredentials;

      if (useBrowserLogin) {
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
            validate: (input) => {
              if (!input || input.trim().length === 0) return 'Session cookie is required';
              // Validate cookie format (should start with t= or be the token itself)
              const cookie = input.trim();
              if (!cookie.startsWith('t=') && !/^[a-zA-Z0-9_-]+$/.test(cookie)) {
                return 'Invalid cookie format. Should be "t=..." or just the token value';
              }
              return true;
            },
          },
        ]);

        // Extract token from cookie (e.g., "t=abc123" -> "abc123")
        const token = sessionCookie.replace(/^t=/, '').trim();
        api.setToken(token);

        // Test the authentication
        try {
          const user = await api.getCurrentUser();
          config.setUser(user);
          logger.success('Authentication successful!');
        } catch (error: any) {
          logger.error('Authentication failed. Invalid session cookie.');
          api.logout();
          return process.exit(1);
        }
      } else {
        const answers = await inquirer.prompt([
          {
            type: 'input',
            name: 'username',
            message: 'TickTick username/email:',
            validate: (input) => {
              if (!input || input.trim().length === 0) return 'Username is required';
              if (!validators.isValidUsername(input)) return validationMessages.username;
              return true;
            },
            when: !options.username,
          },
          {
            type: 'password',
            name: 'password',
            message: 'Password:',
            mask: '*',
            validate: (input) => {
              if (!input || input.trim().length === 0) return 'Password is required';
              if (!validators.isValidPassword(input)) return validationMessages.password;
              return true;
            },
            when: !options.password,
          },
        ]);

        const username = options.username || answers.username;
        const password = options.password || answers.password;

        logger.info('Logging in...');

        const user = await api.login(username, password);
        config.setUser(user);

        logger.success(`Logged in as ${user.name || user.username}!`);
      }
    } catch (error: any) {
      logger.error(`Authentication failed: ${error.message}`);
      return process.exit(1);
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
  .action(async () => {
    const user = await getValidatedUser();
    if (user) {
      logger.success(`Authenticated as: ${user.name} (${user.email})`);
    }
  });

authCommand
  .command('whoami')
  .description('Show current user info')
  .action(async () => {
    try {
      const user = await getValidatedUser();
      if (user) {
        console.log(JSON.stringify(user, null, 2));
      } else {
        return process.exit(1);
      }
    } catch (error: any) {
      logger.error(`Failed to get user info: ${error.message}`);
    }
  });

export { authCommand };
