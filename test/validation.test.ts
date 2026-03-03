import { validators } from '../src/utils/validation';

describe('Validation Utils', () => {
  describe('isValidDate', () => {
    it('should accept valid dates in YYYY-MM-DD format', () => {
      expect(validators.isValidDate('2024-03-15')).toBe(true);
      expect(validators.isValidDate('2024-01-01')).toBe(true);
      expect(validators.isValidDate('2024-12-31')).toBe(true);
    });

    it('should reject invalid date formats', () => {
      expect(validators.isValidDate('2024/03/15')).toBe(false);
      expect(validators.isValidDate('03-15-2024')).toBe(false);
      expect(validators.isValidDate('2024-3-15')).toBe(false);
      expect(validators.isValidDate('')).toBe(false);
      expect(validators.isValidDate(null as any)).toBe(false);
    });

    it('should reject invalid dates', () => {
      expect(validators.isValidDate('2024-02-30')).toBe(false);
      expect(validators.isValidDate('2024-04-31')).toBe(false);
      expect(validators.isValidDate('2024-13-01')).toBe(false);
    });
  });

  describe('isValidHexColor', () => {
    it('should accept valid hex colors', () => {
      expect(validators.isValidHexColor('#FFF')).toBe(true);
      expect(validators.isValidHexColor('#FFFFFF')).toBe(true);
      expect(validators.isValidHexColor('#FFFFFFFF')).toBe(true);
      expect(validators.isValidHexColor('#abc')).toBe(true);
      expect(validators.isValidHexColor('#abcdef')).toBe(true);
      expect(validators.isValidHexColor('#FF5733')).toBe(true);
    });

    it('should reject invalid hex colors', () => {
      expect(validators.isValidHexColor('FFF')).toBe(false);
      expect(validators.isValidHexColor('#GGG')).toBe(false);
      expect(validators.isValidHexColor('#FFFFF')).toBe(false);
      expect(validators.isValidHexColor('#FFFFFFF')).toBe(false);
      expect(validators.isValidHexColor('')).toBe(false);
      expect(validators.isValidHexColor(null as any)).toBe(false);
    });
  });

  describe('isValidId', () => {
    it('should accept non-empty strings', () => {
      expect(validators.isValidId('123')).toBe(true);
      expect(validators.isValidId('abc')).toBe(true);
      expect(validators.isValidId('inbox')).toBe(true);
    });

    it('should reject empty strings', () => {
      expect(validators.isValidId('')).toBe(false);
      expect(validators.isValidId('   ')).toBe(false);
      expect(validators.isValidId(null as any)).toBe(false);
      expect(validators.isValidId(undefined as any)).toBe(false);
    });
  });

  describe('isValidUsername', () => {
    it('should accept valid usernames', () => {
      expect(validators.isValidUsername('john')).toBe(true);
      expect(validators.isValidUsername('john@example.com')).toBe(true);
      expect(validators.isValidUsername('user123')).toBe(true);
    });

    it('should reject short usernames', () => {
      expect(validators.isValidUsername('jo')).toBe(false);
      expect(validators.isValidUsername('j')).toBe(false);
      expect(validators.isValidUsername('')).toBe(false);
    });
  });

  describe('isValidPassword', () => {
    it('should accept valid passwords', () => {
      expect(validators.isValidPassword('123456')).toBe(true);
      expect(validators.isValidPassword('password')).toBe(true);
      expect(validators.isValidPassword('secure123')).toBe(true);
    });

    it('should reject short passwords', () => {
      expect(validators.isValidPassword('12345')).toBe(false);
      expect(validators.isValidPassword('pass')).toBe(false);
      expect(validators.isValidPassword('')).toBe(false);
    });
  });

  describe('isValidTaskTitle', () => {
    it('should accept valid titles', () => {
      expect(validators.isValidTaskTitle('Buy milk')).toBe(true);
      expect(validators.isValidTaskTitle('Task with reasonable length')).toBe(true);
    });

    it('should reject empty titles', () => {
      expect(validators.isValidTaskTitle('')).toBe(false);
      expect(validators.isValidTaskTitle('   ')).toBe(false);
    });

    it('should reject very long titles', () => {
      const longTitle = 'a'.repeat(501);
      expect(validators.isValidTaskTitle(longTitle)).toBe(false);
    });
  });

  describe('isValidProjectName', () => {
    it('should accept valid project names', () => {
      expect(validators.isValidProjectName('Work')).toBe(true);
      expect(validators.isValidProjectName('Personal Projects')).toBe(true);
    });

    it('should reject empty names', () => {
      expect(validators.isValidProjectName('')).toBe(false);
      expect(validators.isValidProjectName('   ')).toBe(false);
    });

    it('should reject very long names', () => {
      const longName = 'a'.repeat(101);
      expect(validators.isValidProjectName(longName)).toBe(false);
    });
  });

  describe('isValidPriority', () => {
    it('should accept valid priorities', () => {
      expect(validators.isValidPriority(0)).toBe(true);
      expect(validators.isValidPriority(5)).toBe(true);
      expect(validators.isValidPriority(9)).toBe(true);
      expect(validators.isValidPriority('5')).toBe(true);
    });

    it('should reject invalid priorities', () => {
      expect(validators.isValidPriority(-1)).toBe(false);
      expect(validators.isValidPriority(10)).toBe(false);
      expect(validators.isValidPriority('abc')).toBe(false);
    });
  });
});
