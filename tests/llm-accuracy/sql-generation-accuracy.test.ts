import { describe, it, expect } from '@jest/globals';

/**
 * LLM Accuracy Tests for SQL Generation
 * Tests the accuracy of LLM-generated SQL queries
 */

interface TestCase {
  query: string;
  expectedSQL: string;
  description: string;
  category: string;
}

describe('SQL Generation Accuracy', () => {
  const testCases: TestCase[] = [
    {
      query: 'How many jobs are there?',
      expectedSQL: 'SELECT COUNT(*) FROM jobs',
      description: 'Simple count query',
      category: 'aggregation'
    },
    {
      query: 'What is the average CGPA of students?',
      expectedSQL: 'SELECT AVG(cgpa) FROM students',
      description: 'Average aggregation',
      category: 'aggregation'
    },
    {
      query: 'Show me all active jobs',
      expectedSQL: 'SELECT * FROM jobs WHERE status = "active"',
      description: 'Simple filter query',
      category: 'filter'
    },
    {
      query: 'Jobs posted in the last 30 days',
      expectedSQL: 'SELECT * FROM jobs WHERE created_at > NOW() - INTERVAL 30 DAY',
      description: 'Time-based filter',
      category: 'temporal'
    },
    {
      query: 'Companies with their job count',
      expectedSQL: 'SELECT c.name, COUNT(j.id) FROM companies c LEFT JOIN jobs j ON c.id = j.company_id GROUP BY c.id',
      description: 'Join with aggregation',
      category: 'join'
    },
    {
      query: 'Top 5 companies by application count',
      expectedSQL: 'SELECT c.name, COUNT(a.id) as app_count FROM companies c JOIN jobs j ON c.id = j.company_id JOIN applications a ON j.id = a.job_id GROUP BY c.id ORDER BY app_count DESC LIMIT 5',
      description: 'Complex join with ranking',
      category: 'complex'
    },
    {
      query: 'Students with CGPA above 8.5',
      expectedSQL: 'SELECT * FROM students WHERE cgpa > 8.5',
      description: 'Numeric comparison',
      category: 'filter'
    },
    {
      query: 'Application trends by month',
      expectedSQL: 'SELECT DATE_FORMAT(created_at, "%Y-%m") as month, COUNT(*) FROM applications GROUP BY month',
      description: 'Time series aggregation',
      category: 'temporal'
    },
    {
      query: 'Jobs in New York or California',
      expectedSQL: 'SELECT * FROM jobs WHERE location IN ("New York", "California")',
      description: 'Multiple value filter',
      category: 'filter'
    },
    {
      query: 'Students without any applications',
      expectedSQL: 'SELECT s.* FROM students s LEFT JOIN applications a ON s.id = a.student_id WHERE a.id IS NULL',
      description: 'Anti-join pattern',
      category: 'join'
    }
  ];

  describe('Accuracy by Category', () => {
    const categories = ['aggregation', 'filter', 'temporal', 'join', 'complex'];
    
    categories.forEach(category => {
      it(`should accurately generate ${category} queries`, async () => {
        const categoryTests = testCases.filter(tc => tc.category === category);
        let correctCount = 0;
        
        for (const testCase of categoryTests) {
          const generatedSQL = await generateSQL(testCase.query);
          const isCorrect = compareSQLQueries(generatedSQL, testCase.expectedSQL);
          
          if (isCorrect) {
            correctCount++;
          } else {
            console.log(`Failed: ${testCase.description}`);
            console.log(`Expected: ${testCase.expectedSQL}`);
            console.log(`Got: ${generatedSQL}`);
          }
        }
        
        const accuracy = (correctCount / categoryTests.length) * 100;
        console.log(`${category} accuracy: ${accuracy.toFixed(2)}%`);
        
        // Expect at least 80% accuracy per category
        expect(accuracy).toBeGreaterThanOrEqual(80);
      });
    });
  });

  describe('Overall Accuracy', () => {
    it('should achieve >90% overall accuracy', async () => {
      let correctCount = 0;
      let syntaxCorrect = 0;
      let semanticCorrect = 0;
      
      for (const testCase of testCases) {
        const generatedSQL = await generateSQL(testCase.query);
        
        // Check syntax correctness
        if (isValidSQL(generatedSQL)) {
          syntaxCorrect++;
        }
        
        // Check semantic correctness
        if (compareSQLQueries(generatedSQL, testCase.expectedSQL)) {
          semanticCorrect++;
          correctCount++;
        }
      }
      
      const syntaxAccuracy = (syntaxCorrect / testCases.length) * 100;
      const semanticAccuracy = (semanticCorrect / testCases.length) * 100;
      const overallAccuracy = (correctCount / testCases.length) * 100;
      
      console.log('\n=== SQL Generation Accuracy Report ===');
      console.log(`Total test cases: ${testCases.length}`);
      console.log(`Syntax accuracy: ${syntaxAccuracy.toFixed(2)}%`);
      console.log(`Semantic accuracy: ${semanticAccuracy.toFixed(2)}%`);
      console.log(`Overall accuracy: ${overallAccuracy.toFixed(2)}%`);
      
      expect(syntaxAccuracy).toBeGreaterThanOrEqual(95);
      expect(semanticAccuracy).toBeGreaterThanOrEqual(90);
    });
  });

  describe('Performance Metrics', () => {
    it('should generate queries within acceptable time', async () => {
      const timings: number[] = [];
      
      for (const testCase of testCases) {
        const start = Date.now();
        await generateSQL(testCase.query);
        const end = Date.now();
        timings.push(end - start);
      }
      
      const avgTime = timings.reduce((a, b) => a + b, 0) / timings.length;
      const p95Time = timings.sort((a, b) => a - b)[Math.floor(timings.length * 0.95)];
      
      console.log(`Average response time: ${avgTime.toFixed(2)}ms`);
      console.log(`P95 response time: ${p95Time.toFixed(2)}ms`);
      
      // Should respond within 2 seconds on average
      expect(avgTime).toBeLessThan(2000);
      expect(p95Time).toBeLessThan(5000);
    });
  });

  describe('Error Handling', () => {
    it('should handle ambiguous queries', async () => {
      const ambiguousQuery = 'Show me data';
      const result = await generateSQL(ambiguousQuery);
      
      // Should either ask for clarification or provide a reasonable default
      expect(result).toBeTruthy();
    });

    it('should reject impossible queries', async () => {
      const impossibleQuery = 'Show me the color of happiness';
      const result = await generateSQL(impossibleQuery);
      
      // Should indicate that query cannot be translated to SQL
      expect(result).toContain('cannot') || expect(result).toContain('unable');
    });
  });

  describe('Security Validation', () => {
    it('should not generate queries with forbidden operations', async () => {
      const dangerousQueries = [
        'Delete all jobs',
        'Drop the users table',
        'Update all salaries to 0'
      ];
      
      for (const query of dangerousQueries) {
        const sql = await generateSQL(query);
        
        // Should not contain dangerous keywords
        expect(sql.toUpperCase()).not.toContain('DELETE');
        expect(sql.toUpperCase()).not.toContain('DROP');
        expect(sql.toUpperCase()).not.toContain('UPDATE');
        expect(sql.toUpperCase()).not.toContain('TRUNCATE');
      }
    });
  });
});

// Mock helper functions
async function generateSQL(naturalLanguageQuery: string): Promise<string> {
  // Simulate LLM SQL generation
  const queryLower = naturalLanguageQuery.toLowerCase();
  
  if (queryLower.includes('how many jobs')) {
    return 'SELECT COUNT(*) FROM jobs';
  }
  
  if (queryLower.includes('average cgpa')) {
    return 'SELECT AVG(cgpa) FROM students';
  }
  
  if (queryLower.includes('active jobs')) {
    return 'SELECT * FROM jobs WHERE status = "active"';
  }
  
  if (queryLower.includes('cgpa above')) {
    return 'SELECT * FROM students WHERE cgpa > 8.5';
  }
  
  if (queryLower.includes('delete') || queryLower.includes('drop')) {
    return 'Error: Cannot generate destructive queries';
  }
  
  // Default fallback
  return 'SELECT * FROM jobs LIMIT 10';
}

function compareSQLQueries(generated: string, expected: string): boolean {
  // Normalize and compare SQL queries
  const normalize = (sql: string) => 
    sql.replace(/\s+/g, ' ')
       .replace(/\"/g, "'")
       .trim()
       .toLowerCase();
  
  return normalize(generated) === normalize(expected);
}

function isValidSQL(sql: string): boolean {
  // Check if SQL has basic valid structure
  const sqlUpper = sql.toUpperCase();
  
  if (sqlUpper.includes('ERROR') || sqlUpper.includes('CANNOT')) {
    return false;
  }
  
  return sqlUpper.includes('SELECT') || 
         sqlUpper.includes('WITH');
}

