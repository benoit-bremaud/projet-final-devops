import {
  calculateAge,
  isAdult,
  isPlausibleBirthDate,
  isValidEmail,
  isValidName,
  isValidPostalCode,
  MAX_AGE,
} from './validators';

describe('happy path', () => {
  describe('calculateAge', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-05-05T00:00:00Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('returns 0 when the birth date is today', () => {
      const today = new Date('2026-05-05T00:00:00Z');
      expect(calculateAge(today)).toBe(0);
    });

    test('returns 25 when the user was born exactly 25 years ago', () => {
      const birth = new Date('2001-05-05T00:00:00Z');
      expect(calculateAge(birth)).toBe(25);
    });

    test('returns N-1 when the birthday has not occurred yet this year', () => {
      const birth = new Date('2001-12-25T00:00:00Z');
      expect(calculateAge(birth)).toBe(24);
    });
  });

  describe('isAdult', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-05-05T00:00:00Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('returns true when the user is exactly 18', () => {
      const birth = new Date('2008-05-05T00:00:00Z');
      expect(isAdult(birth)).toBe(true);
    });
  });

  describe('isValidName', () => {
    test('returns true for valid names', () => {
      expect(isValidName('Bremaud')).toBe(true);
      expect(isValidName('Béatrice')).toBe(true);
      expect(isValidName('Jean-Pierre')).toBe(true);
      expect(isValidName("O'Brien")).toBe(true);
      expect(isValidName('Saint-Jean-de-Luz')).toBe(true);
      expect(isValidName('François')).toBe(true);
    });
  });

  describe('isValidPostalCode', () => {
    test('returns true for valid French postal codes', () => {
      expect(isValidPostalCode('75001')).toBe(true);
      expect(isValidPostalCode('01000')).toBe(true);
      expect(isValidPostalCode('99999')).toBe(true);
    });
  });

  describe('isValidEmail', () => {
    test('returns true for valid emails', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('benoit.bremaud@vev.com')).toBe(true);
      expect(isValidEmail('user+tag@domain.fr')).toBe(true);
    });
  });
});

describe('sad path', () => {
  describe('calculateAge', () => {
    test('throws when birthDate is not a Date', () => {
      expect(() => calculateAge(undefined)).toThrow('birthDate must be a Date');
      expect(() => calculateAge('1990-01-01')).toThrow('birthDate must be a Date');
      expect(() => calculateAge(null)).toThrow('birthDate must be a Date');
      expect(() => calculateAge(123456789)).toThrow('birthDate must be a Date');
    });

    test('throws when birthDate is an Invalid Date', () => {
      expect(() => calculateAge(new Date('not a date'))).toThrow('birthDate is invalid');
    });
  });

  describe('isAdult', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-05-05T00:00:00Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('returns false when the user is one day under 18', () => {
      const birth = new Date('2008-05-06T00:00:00Z');
      expect(isAdult(birth)).toBe(false);
    });
  });

  describe('isValidName', () => {
    test('returns false for invalid names', () => {
      expect(isValidName('')).toBe(false);
      expect(isValidName('John123')).toBe(false);
      expect(isValidName('John@Doe')).toBe(false);
      expect(isValidName('!!!')).toBe(false);
      expect(isValidName(undefined)).toBe(false);
      expect(isValidName(null)).toBe(false);
      expect(isValidName(42)).toBe(false);
    });
  });

  describe('isValidPostalCode', () => {
    test('returns false for invalid postal codes', () => {
      expect(isValidPostalCode('1234')).toBe(false);
      expect(isValidPostalCode('123456')).toBe(false);
      expect(isValidPostalCode('7500A')).toBe(false);
      expect(isValidPostalCode('')).toBe(false);
      expect(isValidPostalCode(75001)).toBe(false);
      expect(isValidPostalCode(undefined)).toBe(false);
      expect(isValidPostalCode(null)).toBe(false);
    });
  });

  describe('isValidEmail', () => {
    test('returns false for invalid emails', () => {
      expect(isValidEmail('plop')).toBe(false);
      expect(isValidEmail('plop@')).toBe(false);
      expect(isValidEmail('@domain.com')).toBe(false);
      expect(isValidEmail('user@domain')).toBe(false);
      expect(isValidEmail('user @domain.com')).toBe(false);
      expect(isValidEmail('')).toBe(false);
      expect(isValidEmail(undefined)).toBe(false);
      expect(isValidEmail(null)).toBe(false);
      expect(isValidEmail(42)).toBe(false);
    });
  });
});

describe('edge cases', () => {
  describe('aberrant birth dates', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-05-05T00:00:00Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('calculateAge returns an implausible age for 0001-01-01', () => {
      const birth = new Date('0001-01-01T00:00:00Z');
      expect(calculateAge(birth)).toBeGreaterThan(MAX_AGE);
    });

    test('isPlausibleBirthDate rejects 0001-01-01', () => {
      const birth = new Date('0001-01-01T00:00:00Z');
      expect(isPlausibleBirthDate(birth)).toBe(false);
    });

    test('isPlausibleBirthDate rejects a future birth date', () => {
      const birth = new Date('2030-05-05T00:00:00Z');
      expect(isPlausibleBirthDate(birth)).toBe(false);
    });
  });

  describe('isPlausibleBirthDate age bounds', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-05-05T00:00:00Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('accepts the minimum age of 18', () => {
      const birth = new Date('2008-05-05T00:00:00Z');
      expect(isPlausibleBirthDate(birth)).toBe(true);
    });

    test('rejects an age below 18', () => {
      const birth = new Date('2009-05-05T00:00:00Z');
      expect(isPlausibleBirthDate(birth)).toBe(false);
    });

    test('accepts the maximum plausible age of 120', () => {
      const birth = new Date('1906-05-05T00:00:00Z');
      expect(isPlausibleBirthDate(birth)).toBe(true);
    });

    test('rejects an age above 120', () => {
      const birth = new Date('1905-05-05T00:00:00Z');
      expect(isPlausibleBirthDate(birth)).toBe(false);
    });
  });
});
