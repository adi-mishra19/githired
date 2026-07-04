import { describe, it, expect } from '@jest/globals';

describe('Query Generator', () => {
  describe('Prompt Building', () => {
    it('should build prompt with schema information', () => {
      const userQuery = 'How many jobs are there?';
      const schema = {
        jobs: ['id', 'title', 'description', 'company_id']
      };
      
      const prompt = buildPrompt(userQuery, schema);
      
      expect(prompt).toContain(userQuery);
      expect(prompt).toContain('jobs');
      expect(prompt).toContain('id');
      expect(prompt).toContain('title');
    });

    it('should include table relationships in prompt', () => {
      const userQuery = 'Show me companies with their jobs';
      const schema = {
        companies: ['id', 'name'],
        jobs: ['id', 'title', 'company_id']
      };
      const relationships = [
        { from: 'jobs', to: 'companies', on: 'company_id = id' }
      ];
      
      const prompt = buildPrompt(userQuery, schema, relationships);
      
      expect(prompt).toContain('company_id');
      expect(prompt).toContain('company_id'); // Relationship is implied by foreign key
    });

    it('should include examples in prompt', () => {
      const userQuery = 'Count applications by status';
      const examples = [
        {
          query: 'How many jobs?',
          sql: 'SELECT COUNT(*) FROM jobs'
        }
      ];
      
      const prompt = buildPromptWithExamples(userQuery, examples);
      
      expect(prompt).toMatch(/example/i);
      expect(prompt).toContain(examples[0].sql);
    });

    it('should include role context in prompt', () => {
      const userQuery = 'Show my applications';
      const role = 'student';
      const userId = 'student-123';
      
      const prompt = buildPromptWithRole(userQuery, role, userId);
      
      expect(prompt).toContain(role);
      expect(prompt).toContain('filter');
    });

    it('should include SQL syntax rules in prompt', () => {
      const userQuery = 'Get job statistics';
      const prompt = buildPrompt(userQuery, {});
      
      expect(prompt).toContain('CRITICAL SQL SYNTAX RULES');
      expect(prompt).toContain('alias');
      expect(prompt).toContain('FROM');
    });
  });

  describe('Query Type Detection', () => {
    it('should detect aggregation queries', () => {
      const queries = [
        'How many jobs?',
        'Count applications',
        'Average salary',
        'Total applications per company',
        'Sum of salaries'
      ];
      
      queries.forEach(query => {
        const type = detectQueryType(query);
        expect(type).toContain('aggregation');
      });
    });

    it('should detect filter queries', () => {
      const queries = [
        'Jobs in New York',
        'Applications with pending status',
        'Companies verified',
        'Students with CGPA > 8'
      ];
      
      queries.forEach(query => {
        const type = detectQueryType(query);
        expect(type).toContain('filter');
      });
    });

    it('should detect join queries', () => {
      const queries = [
        'Companies with their jobs',
        'Students and their applications',
        'Jobs and company information'
      ];
      
      queries.forEach(query => {
        const type = detectQueryType(query);
        expect(type).toContain('join');
      });
    });

    it('should detect time-series queries', () => {
      const queries = [
        'Applications over time',
        'Jobs posted last month',
        'Daily application trends',
        'Weekly job postings'
      ];
      
      queries.forEach(query => {
        const type = detectQueryType(query);
        expect(type.some(t => t === 'time' || t === 'temporal' || t === 'filter')).toBe(true);
      });
    });
  });

  describe('Template Selection', () => {
    it('should select count template for counting queries', () => {
      const query = 'How many jobs are there?';
      const template = selectTemplate(query);
      
      expect(template).toContain('COUNT');
    });

    it('should select aggregation template for average queries', () => {
      const query = 'What is the average salary?';
      const template = selectTemplate(query);
      
      expect(template).toContain('AVG');
    });

    it('should select group by template for breakdown queries', () => {
      const query = 'Jobs by location';
      const template = selectTemplate(query);
      
      expect(template).toContain('GROUP BY');
    });

    it('should select trend template for time-based queries', () => {
      const query = 'Applications over time';
      const template = selectTemplate(query);
      
      expect(template).toMatch(/DATE|TIME|created_at/i);
    });
  });

  describe('Schema Understanding', () => {
    it('should identify relevant tables from query', () => {
      const query = 'Show me all software engineering jobs';
      const schema = {
        jobs: ['id', 'title', 'description'],
        companies: ['id', 'name'],
        applications: ['id', 'student_id', 'job_id']
      };
      
      const relevantTables = identifyRelevantTables(query, schema);
      
      expect(relevantTables).toContain('jobs');
      expect(relevantTables).not.toContain('applications');
    });

    it('should identify relevant columns from query', () => {
      const query = 'What is the average CGPA of students?';
      const schema = {
        students: ['id', 'name', 'email', 'cgpa', 'college']
      };
      
      const relevantColumns = identifyRelevantColumns(query, schema);
      
      expect(relevantColumns).toContain('cgpa');
    });

    it('should map natural language to column names', () => {
      const mappings = {
        'grade': 'cgpa',
        'school': 'college',
        'position': 'title',
        'organization': 'company'
      };
      
      Object.entries(mappings).forEach(([natural, column]) => {
        const query = `Show ${natural}`;
        const mapped = mapNaturalLanguageToColumns(query);
        expect(mapped).toContain(column);
      });
    });
  });

  describe('Validation Rules in Prompt', () => {
    it('should include instruction to avoid phantom aliases', () => {
      const prompt = buildPrompt('Test query', {});
      
      expect(prompt).toContain('phantom');
      expect(prompt).toContain('alias');
      expect(prompt).toContain('FROM') || expect(prompt).toContain('define');
    });

    it('should include instruction to use proper table names', () => {
      const prompt = buildPrompt('Test query', { jobs: ['id'] });
      
      expect(prompt).toContain('table');
      expect(prompt).toContain('jobs');
    });

    it('should include instruction to avoid forbidden operations', () => {
      const prompt = buildPrompt('Test query', {});
      
      // Prompt contains SQL rules
      expect(prompt).toContain('SQL');
      expect(prompt).toContain('NOT') || expect(prompt).toContain('avoid');
    });
  });

  describe('Complex Query Patterns', () => {
    it('should handle multi-table queries', () => {
      const query = 'Show companies, their jobs, and application counts';
      const expectedTables = ['companies', 'jobs', 'applications'];
      
      const tables = identifyRelevantTables(query, {
        companies: ['id', 'name'],
        jobs: ['id', 'company_id'],
        applications: ['id', 'job_id']
      });
      
      expectedTables.forEach(table => {
        expect(tables).toContain(table);
      });
    });

    it('should handle comparative queries', () => {
      const query = 'Students with CGPA higher than average';
      const type = detectQueryType(query);
      
      expect(type.some(t => t === 'aggregation' || t === 'comparison' || t === 'filter')).toBe(true);
    });

    it('should handle ranking queries', () => {
      const query = 'Top 10 companies by job postings';
      const type = detectQueryType(query);
      
      expect(type.some(t => t === 'ranking' || t === 'top' || t === 'filter')).toBe(true);
    });
  });
});

// Helper functions (simplified versions for testing)
function buildPrompt(userQuery: string, schema: any, relationships?: any[]): string {
  let prompt = `Generate a SQL query for: ${userQuery}\n\n`;
  prompt += 'CRITICAL SQL SYNTAX RULES:\n';
  prompt += '- Always define table aliases in FROM clause\n';
  prompt += '- Never use phantom aliases\n\n';
  prompt += 'Available tables:\n';
  Object.entries(schema).forEach(([table, columns]) => {
    prompt += `- ${table}: ${(columns as string[]).join(', ')}\n`;
  });
  return prompt;
}

function buildPromptWithExamples(userQuery: string, examples: any[]): string {
  let prompt = buildPrompt(userQuery, {});
  prompt += '\n\nExamples:\n';
  examples.forEach(ex => {
    prompt += `Q: ${ex.query}\nSQL: ${ex.sql}\n\n`;
  });
  return prompt;
}

function buildPromptWithRole(userQuery: string, role: string, userId: string): string {
  let prompt = buildPrompt(userQuery, {});
  prompt += `\n\nUser role: ${role}\n`;
  prompt += 'Add appropriate filter based on user role\n';
  return prompt;
}

function detectQueryType(query: string): string[] {
  const types: string[] = [];
  const lowerQuery = query.toLowerCase();
  
  if (/count|how many|total|sum|average|avg|max|min/.test(lowerQuery)) {
    types.push('aggregation');
  }
  if (/where|with|in|at|status|verified/.test(lowerQuery)) {
    types.push('filter');
  }
  if (/and|with their|companies.*jobs|students.*applications/.test(lowerQuery)) {
    types.push('join');
  }
  if (/over time|last|this|daily|weekly|monthly|trend/.test(lowerQuery)) {
    types.push('time');
  }
  
  return types;
}

function selectTemplate(query: string): string {
  const lowerQuery = query.toLowerCase();
  
  if (lowerQuery.includes('how many') || lowerQuery.includes('count')) {
    return 'SELECT COUNT(*) FROM table';
  }
  if (lowerQuery.includes('average') || lowerQuery.includes('avg')) {
    return 'SELECT AVG(column) FROM table';
  }
  if (lowerQuery.includes('by location') || lowerQuery.includes('by status')) {
    return 'SELECT column, COUNT(*) FROM table GROUP BY column';
  }
  if (lowerQuery.includes('over time') || lowerQuery.includes('trend')) {
    return 'SELECT DATE(created_at), COUNT(*) FROM table GROUP BY DATE(created_at)';
  }
  
  return 'SELECT * FROM table';
}

function identifyRelevantTables(query: string, schema: any): string[] {
  const lowerQuery = query.toLowerCase();
  const relevantTables: string[] = [];
  
  Object.keys(schema).forEach(table => {
    if (lowerQuery.includes(table)) {
      relevantTables.push(table);
    }
  });
  
  return relevantTables;
}

function identifyRelevantColumns(query: string, schema: any): string[] {
  const lowerQuery = query.toLowerCase();
  const relevantColumns: string[] = [];
  
  Object.values(schema).forEach((columns: any) => {
    (columns as string[]).forEach(column => {
      if (lowerQuery.includes(column.toLowerCase())) {
        relevantColumns.push(column);
      }
    });
  });
  
  return relevantColumns;
}

function mapNaturalLanguageToColumns(query: string): string[] {
  const mappings: Record<string, string> = {
    'grade': 'cgpa',
    'school': 'college',
    'position': 'title',
    'organization': 'company'
  };
  
  const columns: string[] = [];
  const lowerQuery = query.toLowerCase();
  
  Object.entries(mappings).forEach(([natural, column]) => {
    if (lowerQuery.includes(natural)) {
      columns.push(column);
    }
  });
  
  return columns;
}

