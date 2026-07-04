import { describe, it, expect } from '@jest/globals';

describe('Helpers Library', () => {
  describe('String Utilities', () => {
    it('should capitalize first letter', () => {
      const result = capitalize('hello');
      expect(result).toBe('Hello');
    });

    it('should handle empty string', () => {
      const result = capitalize('');
      expect(result).toBe('');
    });

    it('should truncate long string', () => {
      const longString = 'This is a very long string that should be truncated';
      const result = truncate(longString, 20);
      
      expect(result.length).toBeLessThanOrEqual(23); // 20 + '...'
      expect(result).toContain('...');
    });

    it('should not truncate short string', () => {
      const shortString = 'Short';
      const result = truncate(shortString, 20);
      
      expect(result).toBe(shortString);
    });

    it('should slugify string', () => {
      const text = 'Hello World! This is a Test';
      const slug = slugify(text);
      
      expect(slug).toBe('hello-world-this-is-a-test');
      expect(slug).not.toContain(' ');
      expect(slug).not.toContain('!');
    });
  });

  describe('Date Utilities', () => {
    it('should format date', () => {
      const date = new Date('2025-01-15');
      const formatted = formatDate(date);
      
      expect(formatted).toContain('2025');
      expect(formatted).toContain('01');
    });

    it('should calculate relative time', () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const result = getRelativeTime(yesterday);
      
      expect(result).toContain('day');
    });

    it('should check if date is in past', () => {
      const pastDate = new Date('2020-01-01');
      const futureDate = new Date('2030-01-01');
      
      expect(isInPast(pastDate)).toBe(true);
      expect(isInPast(futureDate)).toBe(false);
    });

    it('should calculate days between dates', () => {
      const date1 = new Date('2025-01-01');
      const date2 = new Date('2025-01-11');
      const days = daysBetween(date1, date2);
      
      expect(days).toBe(10);
    });
  });

  describe('Array Utilities', () => {
    it('should chunk array', () => {
      const array = [1, 2, 3, 4, 5, 6, 7];
      const chunks = chunk(array, 3);
      
      expect(chunks.length).toBe(3);
      expect(chunks[0]).toEqual([1, 2, 3]);
      expect(chunks[1]).toEqual([4, 5, 6]);
      expect(chunks[2]).toEqual([7]);
    });

    it('should remove duplicates', () => {
      const array = [1, 2, 2, 3, 3, 3, 4];
      const unique = removeDuplicates(array);
      
      expect(unique).toEqual([1, 2, 3, 4]);
    });

    it('should group by property', () => {
      const items = [
        { category: 'A', value: 1 },
        { category: 'B', value: 2 },
        { category: 'A', value: 3 }
      ];
      const grouped = groupBy(items, 'category');
      
      expect(grouped.A).toHaveLength(2);
      expect(grouped.B).toHaveLength(1);
    });
  });

  describe('Object Utilities', () => {
    it('should pick properties', () => {
      const obj = { a: 1, b: 2, c: 3, d: 4 };
      const picked = pick(obj, ['a', 'c']);
      
      expect(picked).toEqual({ a: 1, c: 3 });
      expect(picked).not.toHaveProperty('b');
    });

    it('should omit properties', () => {
      const obj = { a: 1, b: 2, c: 3 };
      const omitted = omit(obj, ['b']);
      
      expect(omitted).toEqual({ a: 1, c: 3 });
      expect(omitted).not.toHaveProperty('b');
    });

    it('should deep clone object', () => {
      const obj = { a: 1, b: { c: 2 } };
      const cloned = deepClone(obj);
      
      cloned.b.c = 3;
      expect(obj.b.c).toBe(2);
      expect(cloned.b.c).toBe(3);
    });

    it('should merge objects', () => {
      const obj1 = { a: 1, b: 2 };
      const obj2 = { b: 3, c: 4 };
      const merged = merge(obj1, obj2);
      
      expect(merged).toEqual({ a: 1, b: 3, c: 4 });
    });
  });

  describe('Validation Utilities', () => {
    it('should validate email', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('invalid-email')).toBe(false);
      expect(isValidEmail('test@')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
    });

    it('should validate URL', () => {
      expect(isValidUrl('https://example.com')).toBe(true);
      expect(isValidUrl('http://example.com')).toBe(true);
      expect(isValidUrl('not-a-url')).toBe(false);
      expect(isValidUrl('ftp://example.com')).toBe(false);
    });

    it('should validate phone number', () => {
      expect(isValidPhone('+1234567890')).toBe(true);
      expect(isValidPhone('1234567890')).toBe(true);
      expect(isValidPhone('123')).toBe(false);
    });

    it('should validate CGPA', () => {
      expect(isValidCGPA(8.5)).toBe(true);
      expect(isValidCGPA(10.0)).toBe(true);
      expect(isValidCGPA(0)).toBe(true);
      expect(isValidCGPA(10.5)).toBe(false);
      expect(isValidCGPA(-1)).toBe(false);
    });
  });

  describe('Number Utilities', () => {
    it('should format number with commas', () => {
      const result = formatNumber(1234567);
      expect(result).toContain(',');
    });

    it('should format currency', () => {
      const result = formatCurrency(1234.56);
      expect(result).toContain('$');
      expect(result).toContain('1,234.56');
    });

    it('should format percentage', () => {
      const result = formatPercentage(0.8567);
      expect(result).toContain('%');
      expect(result).toContain('85.67');
    });

    it('should clamp number', () => {
      expect(clamp(5, 0, 10)).toBe(5);
      expect(clamp(-5, 0, 10)).toBe(0);
      expect(clamp(15, 0, 10)).toBe(10);
    });
  });

  describe('Async Utilities', () => {
    it('should delay execution', async () => {
      const start = Date.now();
      await delay(100);
      const end = Date.now();
      
      expect(end - start).toBeGreaterThanOrEqual(90);
    });

    it('should retry failed operations', async () => {
      let attempts = 0;
      const operation = async () => {
        attempts++;
        if (attempts < 3) throw new Error('Failed');
        return 'success';
      };
      
      const result = await retry(operation, 3);
      
      expect(result).toBe('success');
      expect(attempts).toBe(3);
    });

    it('should timeout long operations', async () => {
      const longOperation = async () => {
        await delay(1000);
        return 'done';
      };
      
      await expect(withTimeout(longOperation(), 100)).rejects.toThrow('timeout');
    });
  });

  describe('Error Handling', () => {
    it('should create standardized error', () => {
      const error = createError('NOT_FOUND', 'Resource not found');
      
      expect(error.code).toBe('NOT_FOUND');
      expect(error.message).toBe('Resource not found');
    });

    it('should check error type', () => {
      const error = createError('VALIDATION_ERROR', 'Invalid input');
      
      expect(isValidationError(error)).toBe(true);
      expect(isNotFoundError(error)).toBe(false);
    });
  });

  describe('Pagination Utilities', () => {
    it('should calculate pagination', () => {
      const total = 100;
      const page = 3;
      const limit = 10;
      
      const pagination = calculatePagination(total, page, limit);
      
      expect(pagination.total).toBe(100);
      expect(pagination.page).toBe(3);
      expect(pagination.limit).toBe(10);
      expect(pagination.totalPages).toBe(10);
      expect(pagination.hasNext).toBe(true);
      expect(pagination.hasPrev).toBe(true);
    });

    it('should handle first page', () => {
      const pagination = calculatePagination(100, 1, 10);
      
      expect(pagination.hasPrev).toBe(false);
      expect(pagination.hasNext).toBe(true);
    });

    it('should handle last page', () => {
      const pagination = calculatePagination(100, 10, 10);
      
      expect(pagination.hasPrev).toBe(true);
      expect(pagination.hasNext).toBe(false);
    });
  });
});

// Mock helper functions
function capitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function truncate(str: string, length: number) {
  return str.length > length ? str.substring(0, length) + '...' : str;
}

function slugify(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function formatDate(date: Date) {
  return date.toISOString().split('T')[0];
}

function getRelativeTime(date: Date) {
  const diff = Date.now() - date.getTime();
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  return `${days} day${days !== 1 ? 's' : ''} ago`;
}

function isInPast(date: Date) {
  return date.getTime() < Date.now();
}

function daysBetween(date1: Date, date2: Date) {
  const diff = Math.abs(date2.getTime() - date1.getTime());
  return Math.floor(diff / (24 * 60 * 60 * 1000));
}

function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

function removeDuplicates<T>(array: T[]): T[] {
  return [...new Set(array)];
}

function groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
  return array.reduce((groups, item) => {
    const groupKey = String(item[key]);
    if (!groups[groupKey]) groups[groupKey] = [];
    groups[groupKey].push(item);
    return groups;
  }, {} as Record<string, T[]>);
}

function pick<T, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
  const result = {} as Pick<T, K>;
  keys.forEach(key => {
    if (key in obj) result[key] = obj[key];
  });
  return result;
}

function omit<T, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
  const result = { ...obj };
  keys.forEach(key => delete result[key]);
  return result as Omit<T, K>;
}

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

function merge<T>(obj1: T, obj2: Partial<T>): T {
  return { ...obj1, ...obj2 };
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidUrl(url: string) {
  return /^https?:\/\/.+/.test(url);
}

function isValidPhone(phone: string) {
  return /^\+?\d{10,}$/.test(phone);
}

function isValidCGPA(cgpa: number) {
  return cgpa >= 0 && cgpa <= 10;
}

function formatNumber(num: number) {
  return num.toLocaleString();
}

function formatCurrency(num: number) {
  return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatPercentage(num: number) {
  return `${(num * 100).toFixed(2)}%`;
}

function clamp(num: number, min: number, max: number) {
  return Math.min(Math.max(num, min), max);
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function retry<T>(operation: () => Promise<T>, maxAttempts: number): Promise<T> {
  let lastError;
  for (let i = 0; i < maxAttempts; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error('Operation timeout')), ms)
    )
  ]);
}

function createError(code: string, message: string) {
  return { code, message };
}

function isValidationError(error: any) {
  return error.code === 'VALIDATION_ERROR';
}

function isNotFoundError(error: any) {
  return error.code === 'NOT_FOUND';
}

function calculatePagination(total: number, page: number, limit: number) {
  const totalPages = Math.ceil(total / limit);
  return {
    total,
    page,
    limit,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1
  };
}

