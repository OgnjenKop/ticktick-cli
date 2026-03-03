// Mock configstore for tests
jest.mock('configstore', () => {
  return jest.fn().mockImplementation(() => {
    const store = new Map();
    return {
      get: (key: string) => store.get(key),
      set: (key: string, value: any) => store.set(key, value),
      delete: (key: string) => store.delete(key),
      get all() {
        return Object.fromEntries(store);
      },
    };
  });
});
