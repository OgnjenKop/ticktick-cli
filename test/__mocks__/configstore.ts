export default class ConfigStore {
  private store: Map<string, any> = new Map();

  constructor() {
    // Mock constructor
  }

  get(key: string): any {
    return this.store.get(key);
  }

  set(key: string, value: any): void {
    this.store.set(key, value);
  }

  delete(key: string): boolean {
    return this.store.delete(key);
  }

  get all(): Record<string, any> {
    return Object.fromEntries(this.store);
  }

  clear(): void {
    this.store.clear();
  }
}
