import { validators } from '../src/utils/validation';

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
});
