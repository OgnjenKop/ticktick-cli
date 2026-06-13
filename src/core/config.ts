import ConfigStore from 'configstore';
import { AuthConfig, User } from './types';
import { packageInfo } from '../utils/package-info';

export class ConfigManager {
  private config: ConfigStore;

  constructor() {
    this.config = new ConfigStore(packageInfo.name);
  }

  public getConfig(): AuthConfig {
    return this.config.all;
  }

  public setConfig(config: AuthConfig): void {
    Object.entries(config).forEach(([key, value]) => {
      this.config.set(key, value);
    });
  }

  public setUser(user: User): void {
    this.config.set('user', user);
    this.config.set('lastLogin', new Date().toISOString());
  }

  public getUser(): User | undefined {
    return this.config.get('user');
  }

  public clearUser(): void {
    this.config.delete('user');
    this.config.delete('lastLogin');
  }

  public clearAll(): void {
    Object.keys(this.config.all).forEach((key) => {
      this.config.delete(key);
    });
  }
}
