import { describe, it, expect } from '@jest/globals';
import { validateSQL } from '@/lib/ai/sql-validator';

describe('SQL Validator', () => {
  describe('SQL Injection Prevention', () => {
    it('should reject SQL with DROP statement', () => {
      const sql = 'SELECT * FROM users; DROP TABLE users;';
      
      expect(() => validateSQL(sql, 'student', 'user-id')).toThrow(/DROP/i);
    });

    it('should reject SQL with DELETE statement without WHERE', () => {
      const sql = 'DELETE FROM users';
      
      expect(() => validateSQL(sql, 'student', 'user-id')).toThrow(/DELETE|forbidden/i);
    });

    it('should reject SQL with UPDATE without WHERE', () => {
      const sql = 'UPDATE users SET email = "hacked@example.com"';
      
      expect(() => validateSQL(sql, 'student', 'user-id')).toThrow(/UPDATE|forbidden/i);
    });

    it('should reject SQL with TRUNCATE statement', () => {
      const sql = 'TRUNCATE TABLE users';
      
      expect(() => validateSQL(sql, 'student', 'user-id')).toThrow(/TRUNCATE/i);
    });

    it('should reject SQL with ALTER statement', () => {
      const sql = 'ALTER TABLE users ADD COLUMN is_admin BOOLEAN';
      
      expect(() => validateSQL(sql, 'student', 'user-id')).toThrow(/ALTER/i);
    });

    it('should reject SQL with CREATE statement', () => {
      const sql = 'CREATE TABLE malicious (id INT)';
      
      expect(() => validateSQL(sql, 'student', 'user-id')).toThrow(/CREATE/i);
    });

    it('should reject SQL with GRANT statement', () => {
      const sql = 'GRANT ALL PRIVILEGES ON *.* TO "hacker"';
      
      expect(() => validateSQL(sql, 'student', 'user-id')).toThrow(/GRANT/i);
    });

    it('should reject SQL with EXEC/EXECUTE statement', () => {
      const sql = 'EXEC sp_configure';
      
      expect(() => validateSQL(sql, 'student', 'user-id')).toThrow(/EXEC/i);
    });

    it('should reject SQL with multiple statements', () => {
      const sql = 'SELECT * FROM jobs; SELECT * FROM users;';
      
      expect(() => validateSQL(sql, 'student', 'user-id')).toThrow(/multiple/i);
    });

    it('should reject SQL with comment-based injection', () => {
      const sql = "SELECT * FROM users WHERE id = 1 OR 1=1 --";
      
      // Should be caught by users table access restriction
      expect(() => validateSQL(sql, 'student', 'user-id')).toThrow();
    });
  });

  describe('Sensitive Column Access', () => {
    it('should reject queries accessing password columns', () => {
      const sql = 'SELECT password FROM users';
      
      // Will fail on table access (users) and sensitive column
      expect(() => validateSQL(sql, 'student', 'user-id')).toThrow();
    });

    it('should reject queries accessing emailVerificationToken', () => {
      const sql = 'SELECT emailVerificationToken FROM users';
      
      // Will fail on table access (users)
      expect(() => validateSQL(sql, 'student', 'user-id')).toThrow();
    });

    it('should reject queries accessing resetPasswordToken', () => {
      const sql = 'SELECT resetPasswordToken FROM users';
      
      // Will fail on table access (users)
      expect(() => validateSQL(sql, 'student', 'user-id')).toThrow();
    });

    it('should reject queries with password column even in context', () => {
      const sql = 'SELECT * FROM jobs WHERE description LIKE "%password%"';
      
      // Sensitive column validation is strict
      expect(() => validateSQL(sql, 'company', 'user-id')).toThrow(/sensitive/i);
    });
  });

  describe('Role-Based Filtering', () => {
    it('should validate and return SQL for student role', () => {
      const sql = 'SELECT * FROM applications';
      const result = validateSQL(sql, 'student', 'student-123');
      
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result).toContain('applications');
    });

    it('should validate and return SQL for company role', () => {
      const sql = 'SELECT * FROM jobs';
      const result = validateSQL(sql, 'company', 'company-456');
      
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should allow admin to query allowed tables', () => {
      const sql = 'SELECT * FROM jobs';
      const result = validateSQL(sql, 'admin', 'admin-789');
      
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should validate queries with WHERE clauses', () => {
      const sql = 'SELECT * FROM applications WHERE status = "pending"';
      const result = validateSQL(sql, 'student', 'student-123');
      
      expect(result).toBeDefined();
      expect(result).toContain('status');
    });
  });

  describe('Phantom Alias Detection', () => {
    it('should reject queries with undefined table aliases', () => {
      const sql = 'SELECT GROUP.job_id FROM applications';
      
      expect(() => validateSQL(sql, 'student', 'user-id')).toThrow(/GROUP/i);
    });

    it('should accept queries with properly defined aliases', () => {
      const sql = 'SELECT j.title FROM jobs AS j WHERE j.status = "active"';
      const result = validateSQL(sql, 'company', 'company-id');
      
      expect(result).toBeDefined();
    });

    it('should accept queries with multiple valid aliases', () => {
      const sql = `
        SELECT j.title, c.name 
        FROM jobs AS j 
        JOIN companies AS c ON j.company_id = c.id
      `;
      const result = validateSQL(sql, 'admin', 'admin-id');
      
      expect(result).toBeDefined();
    });

    it('should detect phantom aliases in subqueries', () => {
      const sql = `
        SELECT * FROM (
          SELECT PHANTOM.id FROM jobs
        ) AS subquery
      `;
      
      expect(() => validateSQL(sql, 'student', 'user-id')).toThrow(/PHANTOM/i);
    });
  });

  describe('Valid Query Patterns', () => {
    it('should accept simple SELECT query', () => {
      const sql = 'SELECT id, title FROM jobs WHERE status = "active"';
      const result = validateSQL(sql, 'student', 'user-id');
      
      expect(result).toBeDefined();
    });

    it('should accept query with JOIN', () => {
      const sql = `
        SELECT j.title, c.name 
        FROM jobs j 
        JOIN companies c ON j.company_id = c.id
      `;
      const result = validateSQL(sql, 'student', 'user-id');
      
      expect(result).toBeDefined();
    });

    it('should accept query with aggregations', () => {
      const sql = 'SELECT COUNT(*) as total FROM jobs';
      const result = validateSQL(sql, 'admin', 'admin-id');
      
      expect(result).toBeDefined();
    });

    it('should accept query with GROUP BY', () => {
      const sql = 'SELECT location, COUNT(*) FROM jobs GROUP BY location';
      const result = validateSQL(sql, 'admin', 'admin-id');
      
      expect(result).toBeDefined();
    });

    it('should accept query with ORDER BY', () => {
      const sql = 'SELECT * FROM jobs ORDER BY created_at DESC LIMIT 10';
      const result = validateSQL(sql, 'student', 'user-id');
      
      expect(result).toBeDefined();
    });

    it('should accept query with subquery', () => {
      const sql = `
        SELECT * FROM jobs 
        WHERE company_id IN (SELECT id FROM companies WHERE verified = true)
      `;
      const result = validateSQL(sql, 'student', 'user-id');
      
      expect(result).toBeDefined();
    });

    it('should accept query with CTE', () => {
      const sql = `
        WITH recent_jobs AS (
          SELECT * FROM jobs WHERE created_at > NOW() - INTERVAL '30 days'
        )
        SELECT COUNT(*) FROM recent_jobs
      `;
      const result = validateSQL(sql, 'admin', 'admin-id');
      
      expect(result).toBeDefined();
    });
  });

  describe('SQL Processing', () => {
    it('should process valid SQL', () => {
      const sql = '  SELECT * FROM jobs  ';
      const result = validateSQL(sql, 'student', 'user-id');
      
      expect(result).toBeDefined();
    });

    it('should handle normalized whitespace', () => {
      const sql = 'SELECT  *   FROM    jobs';
      const result = validateSQL(sql, 'student', 'user-id');
      
      expect(result).toBeDefined();
    });

    it('should detect comments in SQL', () => {
      const sql = 'SELECT * FROM jobs;--comment';
      
      // Multiple statements will be caught
      expect(() => validateSQL(sql, 'student', 'user-id')).toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should reject empty query', () => {
      const sql = '';
      
      expect(() => validateSQL(sql, 'student', 'user-id')).toThrow();
    });

    it('should reject whitespace-only query', () => {
      const sql = '   \n  \t  ';
      
      expect(() => validateSQL(sql, 'student', 'user-id')).toThrow();
    });

    it('should handle very long queries', () => {
      const sql = 'SELECT ' + 'id, '.repeat(100) + 'title FROM jobs';
      const result = validateSQL(sql, 'admin', 'admin-id');
      
      expect(result).toBeDefined();
    });

    it('should handle case-insensitive keywords', () => {
      const sql = 'select * from jobs where status = "active"';
      const result = validateSQL(sql, 'student', 'user-id');
      
      expect(result).toBeDefined();
    });
  });
});

