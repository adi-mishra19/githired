// SQL Validator to ensure safe query execution

const ALLOWED_KEYWORDS = [
  'SELECT', 'FROM', 'WHERE', 'JOIN', 'INNER', 'LEFT', 'RIGHT', 'ON', 
  'GROUP', 'BY', 'ORDER', 'LIMIT', 'OFFSET', 'AS', 'COUNT', 'SUM', 
  'AVG', 'MIN', 'MAX', 'HAVING', 'DISTINCT', 'AND', 'OR', 'NOT', 
  'IN', 'LIKE', 'BETWEEN', 'IS', 'NULL', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END'
];

const FORBIDDEN_KEYWORDS = [
  'DROP', 'DELETE', 'TRUNCATE', 'INSERT', 'UPDATE', 'ALTER', 'CREATE',
  'REPLACE', 'EXEC', 'EXECUTE', 'GRANT', 'REVOKE', 'COMMIT', 'ROLLBACK',
  'SAVEPOINT', 'TRANSACTION', 'DECLARE', 'CURSOR', 'PROCEDURE', 'FUNCTION'
];

const SENSITIVE_COLUMNS = [
  'password', 'access_token', 'refresh_token', 'id_token', 'api_key',
  'secret', 'token', 'admin_note'
];

export interface TablePermissions {
  [tableName: string]: {
    allowed: boolean;
    conditions?: string; // WHERE clause to append
    forbiddenColumns?: string[];
  };
}

export const ROLE_PERMISSIONS: Record<string, TablePermissions> = {
  student: {
    students: { 
      allowed: true, 
      conditions: "students.user_id = :currentUserId",
      forbiddenColumns: SENSITIVE_COLUMNS
    },
    jobs: { 
      allowed: true, 
      conditions: "jobs.status = 'active'",
      forbiddenColumns: SENSITIVE_COLUMNS
    },
    applications: { 
      allowed: true, 
      conditions: "applications.student_id = :currentStudentId",
      forbiddenColumns: SENSITIVE_COLUMNS
    },
    companies: { 
      allowed: true, // Can see company names/basic info for jobs
      forbiddenColumns: [...SENSITIVE_COLUMNS, 'admin_note', 'email', 'phone']
    },
    user: { allowed: false },
    account: { allowed: false },
    session: { allowed: false },
    verification: { allowed: false },
    ai_queries: { allowed: false },
    query_templates: { allowed: false }
  },
  company: {
    companies: { 
      allowed: true, 
      conditions: "companies.user_id = :currentUserId",
      forbiddenColumns: SENSITIVE_COLUMNS
    },
    jobs: { 
      allowed: true, 
      conditions: "jobs.company_id = :currentCompanyId",
      forbiddenColumns: SENSITIVE_COLUMNS
    },
    applications: { 
      allowed: true, 
      conditions: "applications.job_id IN (SELECT id FROM jobs WHERE company_id = :currentCompanyId)",
      forbiddenColumns: SENSITIVE_COLUMNS
    },
    students: { 
      allowed: true, 
      conditions: "students.id IN (SELECT student_id FROM applications WHERE job_id IN (SELECT id FROM jobs WHERE company_id = :currentCompanyId))",
      forbiddenColumns: [...SENSITIVE_COLUMNS, 'admin_note', 'phone', 'email'] // Can only see applicants' profiles
    },
    user: { allowed: false },
    account: { allowed: false },
    session: { allowed: false },
    verification: { allowed: false },
    ai_queries: { allowed: false },
    query_templates: { allowed: false }
  },
  admin: {
    // Admin has access to everything except sensitive auth fields
    students: { allowed: true, forbiddenColumns: SENSITIVE_COLUMNS },
    companies: { allowed: true, forbiddenColumns: SENSITIVE_COLUMNS },
    jobs: { allowed: true, forbiddenColumns: SENSITIVE_COLUMNS },
    applications: { allowed: true, forbiddenColumns: SENSITIVE_COLUMNS },
    user: { allowed: true, forbiddenColumns: SENSITIVE_COLUMNS },
    account: { allowed: false },
    session: { allowed: false },
    verification: { allowed: false },
    ai_queries: { allowed: true },
    query_templates: { allowed: true }
  }
};

export class SQLValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SQLValidationError';
  }
}

export function validateSQL(sql: string, role: string): void {
  // Strip SQL comments for validation (comments are harmless but we validate without them)
  // First, protect string literals, then remove comments, then restore strings
  const stringPlaceholders: string[] = [];
  let placeholderIndex = 0;
  
  // Replace string literals with placeholders
  let sqlWithoutStrings = sql.replace(/'[^']*'/g, (match) => {
    const placeholder = `__STRING_${placeholderIndex}__`;
    stringPlaceholders[placeholderIndex] = match;
    placeholderIndex++;
    return placeholder;
  });
  
  // Remove single-line comments (-- until end of line)
  sqlWithoutStrings = sqlWithoutStrings.replace(/--[^\r\n]*/g, '');
  
  // Remove multi-line comments (/* ... */)
  sqlWithoutStrings = sqlWithoutStrings.replace(/\/\*[\s\S]*?\*\//g, '');
  
  // Restore string literals
  stringPlaceholders.forEach((str, index) => {
    sqlWithoutStrings = sqlWithoutStrings.replace(`__STRING_${index}__`, str);
  });
  
  // Clean up SQL - remove extra whitespace and newlines for validation
  const cleanSQL = sqlWithoutStrings.trim().replace(/\s+/g, ' ');
  const upperSQL = cleanSQL.toUpperCase();

  console.log("🔍 Validating SQL:", cleanSQL);
  console.log("🔍 Upper SQL:", upperSQL);

  // Check for forbidden keywords (use cleaned SQL)
  for (const keyword of FORBIDDEN_KEYWORDS) {
    // Use word boundaries to avoid false positives (e.g., "INSERT" in "INSERTING")
    const regex = new RegExp(`\\b${keyword}\\b`, 'i');
    if (regex.test(cleanSQL)) {
      throw new SQLValidationError(
        `Forbidden SQL operation detected: ${keyword}. Only SELECT queries are allowed.`
      );
    }
  }

  // Must start with SELECT or WITH (CTE - Common Table Expression)
  // WITH is valid for complex queries that eventually SELECT
  if (!upperSQL.startsWith('SELECT') && !upperSQL.startsWith('WITH')) {
    console.error("❌ SQL doesn't start with SELECT or WITH:", upperSQL.substring(0, 50));
    throw new SQLValidationError('Only SELECT queries are allowed');
  }

  // If starts with WITH, ensure it contains SELECT
  if (upperSQL.startsWith('WITH')) {
    if (!upperSQL.includes('SELECT')) {
      console.error("❌ CTE query doesn't contain SELECT");
      throw new SQLValidationError('WITH queries must contain SELECT statement');
    }
    console.log("✅ Valid CTE query detected (starts with WITH)");
  }

  // Check for multiple statements (SQL injection attempt) - use cleaned SQL
  const semicolonCount = (cleanSQL.match(/;/g) || []).length;
  if (semicolonCount > 1) {
    throw new SQLValidationError('Multiple SQL statements are not allowed');
  }

  // Validate table access
  const permissions = ROLE_PERMISSIONS[role];
  if (!permissions) {
    throw new SQLValidationError('Invalid role specified');
  }

  // PostgreSQL built-in functions that shouldn't be treated as tables
  const PG_FUNCTIONS = new Set([
    'unnest', 'jsonb_array_elements', 'jsonb_array_elements_text',
    'jsonb_each', 'jsonb_each_text', 'generate_series', 'json_array_elements',
    'string_to_array', 'array_agg', 'json_build_array', 'jsonb_build_array'
  ]);

  const sqlKeywords = new Set(['on', 'where', 'join', 'left', 'right', 'inner', 'cross', 'group', 'order', 'limit', 'having', 'select', 'from', 'union', 'except', 'intersect']);

  // Extract CTE names (Common Table Expressions) if query uses WITH
  const cteNames = new Set<string>();
  const cteBodies: { name: string; body: string }[] = [];
  
  // Initialize validPrefixes early so parseFromClause can use it
  const validPrefixes = new Set<string>();
  
  // Add actual table names
  Object.keys(permissions).forEach(table => {
    if (permissions[table].allowed) {
      validPrefixes.add(table.toLowerCase());
    }
  });
  
  // Helper function to parse FROM clause and extract aliases
  const parseFromClause = (fromClause: string) => {
    // Split by commas to handle comma-separated tables
    // But be careful - commas can appear in subqueries, so we need to handle parentheses
    const tableParts = [];
    let currentPart = '';
    let parenDepth = 0;
    
    for (let i = 0; i < fromClause.length; i++) {
      const char = fromClause[i];
      if (char === '(') parenDepth++;
      else if (char === ')') parenDepth--;
      else if (char === ',' && parenDepth === 0) {
        tableParts.push(currentPart.trim());
        currentPart = '';
        continue;
      }
      currentPart += char;
    }
    if (currentPart.trim()) {
      tableParts.push(currentPart.trim());
    }
    
    // Now parse each table part for aliases
    for (const tablePart of tableParts) {
      // Match: table alias or table AS alias
      // Handle both "table alias" and "table AS alias" patterns
      const aliasMatch = tablePart.match(/^(\w+)(?:\s+(?:AS\s+)?(\w+))?$/i);
      if (aliasMatch) {
        const tableName = aliasMatch[1].toLowerCase();
        const alias = aliasMatch[2]?.toLowerCase();
        
        // Add the table/CTE name itself
        if (permissions[tableName]?.allowed || cteNames.has(tableName)) {
          validPrefixes.add(tableName);
        }
        
        // Add the alias if it exists and is valid
        if (alias && !sqlKeywords.has(alias)) {
          if (permissions[tableName]?.allowed || cteNames.has(tableName)) {
            validPrefixes.add(alias);
          }
        }
      }
    }
  };
  
  if (upperSQL.startsWith('WITH')) {
    // Extract CTE names and bodies from WITH clause
    // Pattern: WITH CteName AS (...), AnotherCTE AS (...)
    const cteMatches = cleanSQL.match(/WITH\s+(\w+)\s+AS|,\s*(\w+)\s+AS/gi) || [];
    cteMatches.forEach(match => {
      const name = match.replace(/WITH\s+/i, '')
                        .replace(/,\s*/i, '')
                        .replace(/\s+AS/i, '')
                        .trim()
                        .toLowerCase();
      if (name) {
        cteNames.add(name);
      }
    });
    
    // Extract CTE bodies to parse their FROM clauses
    // Use a simpler approach: find each CTE definition and extract its body
    // Pattern: CTEName AS (body)
    let cteStart = 0;
    const withMatch = cleanSQL.match(/^WITH\s+/i);
    if (withMatch) {
      cteStart = withMatch[0].length;
    }
    
    // Find all CTE definitions by looking for "CTEName AS ("
    const cteDefPattern = /(\w+)\s+AS\s*\(/gi;
    let cteDefMatch;
    const ctePositions: { name: string; start: number }[] = [];
    while ((cteDefMatch = cteDefPattern.exec(cleanSQL)) !== null) {
      const cteName = cteDefMatch[1].toLowerCase();
      const startPos = cteDefMatch.index + cteDefMatch[0].length - 1; // Position of opening (
      ctePositions.push({ name: cteName, start: startPos });
    }
    
    // Extract CTE bodies by finding matching closing parentheses
    for (let i = 0; i < ctePositions.length; i++) {
      const ctePos = ctePositions[i];
      const nextPos = i < ctePositions.length - 1 ? ctePositions[i + 1].start : cleanSQL.length;
      
      // Find the matching closing parenthesis
      let parenDepth = 1;
      let endPos = ctePos.start + 1;
      while (endPos < nextPos && parenDepth > 0) {
        if (cleanSQL[endPos] === '(') parenDepth++;
        else if (cleanSQL[endPos] === ')') parenDepth--;
        endPos++;
      }
      
      if (parenDepth === 0) {
        const cteBody = cleanSQL.substring(ctePos.start + 1, endPos - 1);
        cteBodies.push({ name: ctePos.name, body: cteBody });
      }
    }
    
    console.log("🔍 CTEs found:", Array.from(cteNames));
    
    // Parse FROM clauses in each CTE body to extract aliases
    for (const cte of cteBodies) {
      const cteFromPattern = /\bFROM\s+([\s\S]+?)(?=\b(?:WHERE|GROUP\s+BY|ORDER\s+BY|HAVING|LIMIT|SELECT)\b|$)/gi;
      let cteFromMatch;
      while ((cteFromMatch = cteFromPattern.exec(cte.body)) !== null) {
        const cteFromClause = cteFromMatch[1].trim();
        const beforeJoin = cteFromClause.split(/\b(?:JOIN|LEFT\s+JOIN|RIGHT\s+JOIN|INNER\s+JOIN|CROSS\s+JOIN)\b/i)[0];
        if (beforeJoin) {
          parseFromClause(beforeJoin.trim());
        }
        // Also parse JOINs in CTE FROM clause
        const cteJoinMatches = cteFromClause.matchAll(/(?:JOIN|LEFT\s+JOIN|RIGHT\s+JOIN|INNER\s+JOIN|CROSS\s+JOIN)\s+(\w+)(?:\s+(?:AS\s+)?(\w+))?(?=\s+(?:ON|(?:LEFT|RIGHT|INNER|CROSS)\s+JOIN|JOIN|WHERE|GROUP|ORDER|HAVING|LIMIT)|$)/gi);
        for (const joinMatch of cteJoinMatches) {
          const tableName = joinMatch[1].toLowerCase();
          const alias = joinMatch[2]?.toLowerCase();
          if (permissions[tableName]?.allowed || cteNames.has(tableName)) {
            validPrefixes.add(tableName);
          }
          if (alias && !sqlKeywords.has(alias)) {
            if (permissions[tableName]?.allowed || cteNames.has(tableName)) {
              validPrefixes.add(alias);
            }
          }
        }
        
        // Parse CROSS JOIN unnest(...) AS alias patterns
        // Pattern: CROSS JOIN unnest(...) AS alias or CROSS JOIN unnest(...) AS alias (column)
        // Handle nested parentheses by finding matching closing paren
        const crossJoinUnnestRegex = /CROSS\s+JOIN\s+unnest\s*\(/gi;
        let unnestStart;
        while ((unnestStart = crossJoinUnnestRegex.exec(cte.body)) !== null) {
          const startPos = unnestStart.index + unnestStart[0].length - 1; // Position of opening (
          // Find matching closing parenthesis
          let parenDepth = 1;
          let endPos = startPos + 1;
          while (endPos < cte.body.length && parenDepth > 0) {
            if (cte.body[endPos] === '(') parenDepth++;
            else if (cte.body[endPos] === ')') parenDepth--;
            endPos++;
          }
          // Now look for AS alias after the closing paren
          const afterUnnest = cte.body.substring(endPos);
          const aliasMatch = afterUnnest.match(/^\s+AS\s+(\w+)(?:\s*\([^)]+\))?/i);
          if (aliasMatch) {
            const alias = aliasMatch[1].toLowerCase();
            if (alias && !sqlKeywords.has(alias)) {
              validPrefixes.add(alias);
            }
          }
        }
      }
    }
  }

  // Extract table names from SQL (improved parsing)
  // Match FROM/JOIN followed by table name (not function calls with parentheses)
  const tableMatches = cleanSQL.match(/(?:FROM|JOIN)\s+(\w+)(?:\s|,|$|\))/gi) || [];
  const allReferences = tableMatches.map(match => {
    const parts = match.split(/\s+/);
    const candidate = parts[parts.length - 1].toLowerCase().replace(/[,;)\s]/g, '');
    return candidate;
  }).filter(ref => {
    // Filter out empty strings and check if next character after match is '('
    if (!ref) return false;
    
    // Find this reference in cleaned SQL and check if it's followed by '('
    const refPattern = new RegExp(`(?:FROM|JOIN)\\s+${ref}\\s*\\(`, 'i');
    if (refPattern.test(cleanSQL)) {
      return false; // It's a function call, not a table
    }
    
    return true;
  });

  // Filter out CTE names and PostgreSQL functions - only validate actual database tables
  const actualTables = allReferences.filter(ref => 
    !cteNames.has(ref) && !PG_FUNCTIONS.has(ref)
  );
  
  console.log("🔍 All references found:", allReferences);
  console.log("🔍 Actual database tables to validate:", actualTables);

  // Remove duplicates
  const uniqueTables = Array.from(new Set(actualTables));

  for (const table of uniqueTables) {
    if (!permissions[table] || !permissions[table].allowed) {
      throw new SQLValidationError(
        `Access denied to table: ${table}. Your role does not have permission to query this table.`
      );
    }
  }

  // Check for sensitive columns (use cleaned SQL)
  for (const column of SENSITIVE_COLUMNS) {
    const regex = new RegExp(`\\b${column}\\b`, 'i');
    if (regex.test(cleanSQL)) {
      throw new SQLValidationError(
        `Access denied to sensitive column: ${column}`
      );
    }
  }

  // Check for incorrect PERCENT_RANK syntax
  // PERCENT_RANK() is a window function and must use OVER, not WITHIN GROUP
  if (/\bPERCENT_RANK\s*\(\s*\)\s+WITHIN\s+GROUP/i.test(cleanSQL)) {
    throw new SQLValidationError(
      'PERCENT_RANK() is a window function and must use OVER (ORDER BY ...), not WITHIN GROUP. ' +
      'Use: PERCENT_RANK() OVER (ORDER BY column) instead of PERCENT_RANK() WITHIN GROUP (ORDER BY column). ' +
      'If you need aggregate percentiles, use PERCENTILE_CONT() WITHIN GROUP or PERCENTILE_DISC() WITHIN GROUP instead.'
    );
  }

  // Check for phantom table aliases
  // Find all table/CTE names and aliases
  // Note: validPrefixes is already initialized above
  
  // Add CTEs (if not already added during CTE parsing)
  cteNames.forEach(cte => validPrefixes.add(cte));
  
  // Add table aliases (e.g., "FROM students s" -> "s" is valid)
  // Improved pattern to handle aliases in CTEs and regular queries
  // Pattern matches: FROM table alias, FROM table AS alias, JOIN table alias, comma-separated tables, etc.
  
  // Extract main query's FROM clause separately for CTE queries
  if (upperSQL.startsWith('WITH')) {
    // Find the main SELECT after all CTEs
    const mainSelectMatch = cleanSQL.match(/WITH\s+[\s\S]+?\bSELECT\s+([\s\S]+)$/i);
    if (mainSelectMatch) {
      const mainQuery = mainSelectMatch[1];
      // Extract FROM clause from main query - capture everything until WHERE/GROUP BY/etc (not stopping at JOINs)
      const mainFromMatch = mainQuery.match(/\bFROM\s+([\s\S]+?)(?=\b(?:WHERE|GROUP\s+BY|ORDER\s+BY|HAVING|LIMIT)\b|$)/i);
      if (mainFromMatch) {
        const fullFromClause = mainFromMatch[1].trim();
        // Parse the first table before any JOINs
        const beforeJoin = fullFromClause.split(/\b(?:JOIN|LEFT\s+JOIN|RIGHT\s+JOIN|INNER\s+JOIN|CROSS\s+JOIN)\b/i)[0];
        if (beforeJoin) {
          parseFromClause(beforeJoin.trim());
        }
        // Also parse JOINs in the main query
        // Pattern matches: JOIN table alias (where alias can be followed by ON, another JOIN, or end)
        const mainJoinMatches = fullFromClause.matchAll(/(?:JOIN|LEFT\s+JOIN|RIGHT\s+JOIN|INNER\s+JOIN|CROSS\s+JOIN)\s+(\w+)(?:\s+(?:AS\s+)?(\w+))?(?=\s+(?:ON|(?:LEFT|RIGHT|INNER|CROSS)\s+JOIN|JOIN|WHERE|GROUP|ORDER|HAVING|LIMIT)|$)/gi);
        for (const joinMatch of mainJoinMatches) {
          const tableName = joinMatch[1].toLowerCase();
          const alias = joinMatch[2]?.toLowerCase();
          
          if (permissions[tableName]?.allowed || cteNames.has(tableName)) {
            validPrefixes.add(tableName);
          }
          
          if (alias && !sqlKeywords.has(alias)) {
            if (permissions[tableName]?.allowed || cteNames.has(tableName)) {
              validPrefixes.add(alias);
            }
          }
        }
        
        // Parse CROSS JOIN unnest(...) AS alias patterns in main query FROM clause
        const mainCrossJoinUnnestRegex = /CROSS\s+JOIN\s+unnest\s*\(/gi;
        let mainUnnestStart;
        while ((mainUnnestStart = mainCrossJoinUnnestRegex.exec(fullFromClause)) !== null) {
          const startPos = mainUnnestStart.index + mainUnnestStart[0].length - 1;
          let parenDepth = 1;
          let endPos = startPos + 1;
          while (endPos < fullFromClause.length && parenDepth > 0) {
            if (fullFromClause[endPos] === '(') parenDepth++;
            else if (fullFromClause[endPos] === ')') parenDepth--;
            endPos++;
          }
          const afterUnnest = fullFromClause.substring(endPos);
          const aliasMatch = afterUnnest.match(/^\s+AS\s+(\w+)(?:\s*\([^)]+\))?/i);
          if (aliasMatch) {
            const alias = aliasMatch[1].toLowerCase();
            if (alias && !sqlKeywords.has(alias)) {
              validPrefixes.add(alias);
            }
          }
        }
      }
    }
  }
  
  // Also match all FROM clauses (including CTEs) for completeness
  // Improved pattern that captures FROM clause including JOINs
  const fromClausePattern = /\bFROM\s+([\s\S]+?)(?=\b(?:WHERE|GROUP\s+BY|ORDER\s+BY|HAVING|LIMIT)\b|$)/gi;
  let fromMatch;
  while ((fromMatch = fromClausePattern.exec(cleanSQL)) !== null) {
    const fullFromClause = fromMatch[1].trim();
    // First parse the initial table(s) before any JOINs
    const beforeJoin = fullFromClause.split(/\b(?:JOIN|LEFT\s+JOIN|RIGHT\s+JOIN|INNER\s+JOIN|CROSS\s+JOIN)\b/i)[0];
    if (beforeJoin) {
      parseFromClause(beforeJoin.trim());
    }
    // Also parse JOINs in this FROM clause
    const fromJoinMatches = fullFromClause.matchAll(/(?:JOIN|LEFT\s+JOIN|RIGHT\s+JOIN|INNER\s+JOIN|CROSS\s+JOIN)\s+(\w+)(?:\s+(?:AS\s+)?(\w+))?(?=\s+(?:ON|(?:LEFT|RIGHT|INNER|CROSS)\s+JOIN|JOIN|WHERE|GROUP|ORDER|HAVING|LIMIT)|$)/gi);
    for (const joinMatch of fromJoinMatches) {
      const tableName = joinMatch[1].toLowerCase();
      const alias = joinMatch[2]?.toLowerCase();
      if (permissions[tableName]?.allowed || cteNames.has(tableName)) {
        validPrefixes.add(tableName);
      }
      if (alias && !sqlKeywords.has(alias)) {
        if (permissions[tableName]?.allowed || cteNames.has(tableName)) {
          validPrefixes.add(alias);
        }
      }
    }
  }
  
  // Also handle JOIN syntax aliases - this captures aliases from JOINs
  // Pattern matches: JOIN table alias (where alias can be followed by ON, another JOIN, or end)
  const joinAliasPattern = /(?:JOIN|LEFT\s+JOIN|RIGHT\s+JOIN|INNER\s+JOIN|CROSS\s+JOIN)\s+(\w+)(?:\s+(?:AS\s+)?(\w+))?(?=\s+(?:ON|(?:LEFT|RIGHT|INNER|CROSS)\s+JOIN|JOIN|WHERE|GROUP|ORDER|HAVING|LIMIT)|$)/gi;
  let joinMatch;
  while ((joinMatch = joinAliasPattern.exec(cleanSQL)) !== null) {
    const tableName = joinMatch[1].toLowerCase();
    const alias = joinMatch[2]?.toLowerCase();
    
    // Add the table/CTE name itself
    if (permissions[tableName]?.allowed || cteNames.has(tableName)) {
      validPrefixes.add(tableName);
    }
    
    // Add the alias if it exists and is valid
    if (alias && !sqlKeywords.has(alias)) {
      if (permissions[tableName]?.allowed || cteNames.has(tableName)) {
        validPrefixes.add(alias);
      }
    }
  }
  
  // Parse CROSS JOIN unnest(...) AS alias patterns in the entire query
  // Handle nested parentheses by finding matching closing paren
  const crossJoinUnnestRegex = /CROSS\s+JOIN\s+unnest\s*\(/gi;
  let unnestStart;
  while ((unnestStart = crossJoinUnnestRegex.exec(cleanSQL)) !== null) {
    const startPos = unnestStart.index + unnestStart[0].length - 1; // Position of opening (
    // Find matching closing parenthesis
    let parenDepth = 1;
    let endPos = startPos + 1;
    while (endPos < cleanSQL.length && parenDepth > 0) {
      if (cleanSQL[endPos] === '(') parenDepth++;
      else if (cleanSQL[endPos] === ')') parenDepth--;
      endPos++;
    }
    // Now look for AS alias after the closing paren
    const afterUnnest = cleanSQL.substring(endPos);
    const aliasMatch = afterUnnest.match(/^\s+AS\s+(\w+)(?:\s*\([^)]+\))?/i);
    if (aliasMatch) {
      const alias = aliasMatch[1].toLowerCase();
      if (alias && !sqlKeywords.has(alias)) {
        validPrefixes.add(alias);
      }
    }
  }
  
  // Also parse comma-separated unnest() patterns: FROM table, unnest(array) AS alias
  // Handle nested parentheses
  const commaUnnestRegex = /,\s*unnest\s*\(/gi;
  let commaUnnestStart;
  while ((commaUnnestStart = commaUnnestRegex.exec(cleanSQL)) !== null) {
    const startPos = commaUnnestStart.index + commaUnnestStart[0].length - 1; // Position of opening (
    // Find matching closing parenthesis
    let parenDepth = 1;
    let endPos = startPos + 1;
    while (endPos < cleanSQL.length && parenDepth > 0) {
      if (cleanSQL[endPos] === '(') parenDepth++;
      else if (cleanSQL[endPos] === ')') parenDepth--;
      endPos++;
    }
    // Now look for AS alias after the closing paren
    const afterUnnest = cleanSQL.substring(endPos);
    const aliasMatch = afterUnnest.match(/^\s+AS\s+(\w+)(?:\s*\([^)]+\))?/i);
    if (aliasMatch) {
      const alias = aliasMatch[1].toLowerCase();
      if (alias && !sqlKeywords.has(alias)) {
        validPrefixes.add(alias);
      }
    }
  }
  
  console.log("🔍 Valid table prefixes:", Array.from(validPrefixes));
  
  // Now find all column references with prefixes (e.g., "table.column")
  const columnRefs = cleanSQL.match(/\b(\w+)\.(\w+)/g) || [];
  for (const ref of columnRefs) {
    const [prefix] = ref.split('.');
    const lowerPrefix = prefix.toLowerCase();
    
    // Skip if it's a valid prefix
    if (validPrefixes.has(lowerPrefix)) continue;
    
    // Skip if it's a PostgreSQL function
    if (PG_FUNCTIONS.has(lowerPrefix)) continue;
    
    // Skip if it's a numeric literal (e.g., "100.0", "5.5")
    // Check if the prefix is a number
    if (/^\d+$/.test(prefix)) {
      continue;
    }
    
    // Skip if the entire reference looks like a numeric literal (e.g., "100.0", "5.5")
    if (/^\d+\.\d+$/.test(ref)) {
      continue;
    }
    
    // This is a phantom alias!
    throw new SQLValidationError(
      `Invalid table reference: "${prefix}" in "${ref}". This table or alias was not defined in the FROM clause.`
    );
  }

  console.log("✅ SQL validation passed");
}

export function canAccessTable(table: string, role: string): boolean {
  const permissions = ROLE_PERMISSIONS[role];
  return permissions?.[table]?.allowed || false;
}

export function getTableCondition(table: string, role: string): string | undefined {
  const permissions = ROLE_PERMISSIONS[role];
  return permissions?.[table]?.conditions;
}

export function sanitizeSQL(sql: string): string {
  // Remove leading/trailing whitespace
  let cleaned = sql.trim();
  
  // Remove trailing semicolon if present
  if (cleaned.endsWith(';')) {
    cleaned = cleaned.slice(0, -1);
  }
  
  return cleaned;
}

export function addRoleBasedFilters(
  sql: string, 
  role: string, 
  context: {
    userId?: string;
    studentId?: string;
    companyId?: string;
  }
): string {
  const permissions = ROLE_PERMISSIONS[role];
  if (!permissions) return sql;

  // PostgreSQL built-in functions that shouldn't be treated as tables
  const PG_FUNCTIONS = new Set([
    'unnest', 'jsonb_array_elements', 'jsonb_array_elements_text',
    'jsonb_each', 'jsonb_each_text', 'generate_series', 'json_array_elements',
    'string_to_array', 'array_agg', 'json_build_array', 'jsonb_build_array'
  ]);

  // Helper function to replace placeholders in conditions
  const replacePlaceholders = (condition: string): string => {
    let replaced = condition;
      if (context.userId) {
      replaced = replaced.replace(':currentUserId', `'${context.userId}'`);
      }
      if (context.studentId) {
      replaced = replaced.replace(':currentStudentId', `'${context.studentId}'`);
    }
    if (context.companyId) {
      replaced = replaced.replace(':currentCompanyId', `'${context.companyId}'`);
    }
    return replaced;
  };

  // Helper function to check if a table is in the FROM clause of a query (not in subqueries)
  const isTableInFromClause = (sqlPart: string, tableName: string): boolean => {
    // Remove all subqueries first to avoid false positives
    let cleaned = sqlPart;
    let depth = 0;
    let result = '';
    
    for (let i = 0; i < sqlPart.length; i++) {
      const char = sqlPart[i];
      if (char === '(') {
        depth++;
      } else if (char === ')') {
        depth--;
      } else if (depth === 0) {
        result += char;
      }
    }
    
    // Now check if table is in FROM/JOIN of this level only
    const fromPattern = new RegExp(`\\bFROM\\s+${tableName}\\b`, 'i');
    const joinPattern = new RegExp(`\\bJOIN\\s+${tableName}\\b`, 'i');
    const aliasPattern = new RegExp(`\\bFROM\\s+${tableName}\\s+\\w+\\b`, 'i');
    
    return fromPattern.test(result) || joinPattern.test(result) || aliasPattern.test(result);
  };

  // Helper function to check if all tables referenced in a condition are in the FROM clause
  const areConditionTablesInFromClause = (sqlPart: string, condition: string): boolean => {
    // Extract table references from condition (e.g., "students.user_id", "applications.student_id")
    const tableRefs = condition.match(/(\w+)\.\w+/g) || [];
    const tablesInCondition = new Set(tableRefs.map(ref => ref.split('.')[0].toLowerCase()));
    
    // Check if each table in the condition is actually in the FROM clause
    for (const table of tablesInCondition) {
      if (!isTableInFromClause(sqlPart, table)) {
        return false;
      }
    }
    return true;
  };

  // Helper function to add filter to a specific table reference
  const addFilterToTableQuery = (sqlPart: string, tableName: string, alreadyFiltered: Set<string>): string => {
    const tablePerms = permissions[tableName];
    if (!tablePerms || !tablePerms.conditions) return sqlPart;

    const sqlKeywordSet = new Set([
      'where', 'group', 'order', 'having', 'limit', 'join', 'inner', 'left',
      'right', 'full', 'cross', 'outer', 'on', 'using'
    ]);

    // Check if table is actually in the FROM clause at this query level
    if (!isTableInFromClause(sqlPart, tableName)) {
      return sqlPart; // Table not in FROM clause at this level
    }

    // Create a unique key for this table in this context
    const filterKey = `${tableName}-${sqlPart.substring(0, 100)}`;
    if (alreadyFiltered.has(filterKey)) return sqlPart;
    
    alreadyFiltered.add(filterKey);
    
    let condition = replacePlaceholders(tablePerms.conditions);
    
    // CRITICAL: Check if all tables referenced in the condition are actually in the FROM clause
    // This prevents adding conditions like "students.user_id" when only "applications" is in the FROM clause
    if (!areConditionTablesInFromClause(sqlPart, condition)) {
      // Condition references tables not in FROM clause - skip this filter
      return sqlPart;
    }
    
    // Check if table has an alias in this query
    const aliasMatch = sqlPart.match(new RegExp(`\\bFROM\\s+${tableName}\\s+(\\w+)\\b`, 'i'));
    if (aliasMatch && aliasMatch[1]) {
      const alias = aliasMatch[1];
      if (!sqlKeywordSet.has(alias.toLowerCase())) {
        // Replace table name with alias in condition
        condition = condition.replace(new RegExp(`\\b${tableName}\\.`, 'g'), `${alias}.`);
      }
    }
    
    let modified = sqlPart;
    
    // Find the position to insert WHERE clause
    // It must come AFTER all FROM/JOIN clauses (including CROSS JOIN, LATERAL, etc.)
    // but BEFORE GROUP BY, HAVING, ORDER BY, LIMIT
    
    // Look for WHERE clause (but not in subqueries)
    let whereIndex = -1;
    let parenDepth = 0;
    const upperSQL = modified.toUpperCase();
    
    for (let i = 0; i < modified.length; i++) {
      if (modified[i] === '(') parenDepth++;
      else if (modified[i] === ')') parenDepth--;
      else if (parenDepth === 0 && upperSQL.substring(i, i + 5) === 'WHERE') {
        whereIndex = i;
        break;
      }
    }
    
    if (whereIndex !== -1) {
      // Add to existing WHERE
      modified = 
        modified.slice(0, whereIndex) +
        `WHERE ${condition} AND ` +
        modified.slice(whereIndex + 5);
    } else {
      // No WHERE clause exists - we need to add one
      // Find the position after all FROM/JOIN clauses
      
      // Look for these terminating keywords that come after FROM/JOIN
      const terminatorMatch = modified.match(/\b(GROUP\s+BY|HAVING|ORDER\s+BY|LIMIT)\b/i);
      
      if (terminatorMatch && terminatorMatch.index !== undefined) {
        // Insert WHERE before the terminator
        modified = 
          modified.slice(0, terminatorMatch.index).trim() +
          ` WHERE ${condition} ` +
          modified.slice(terminatorMatch.index);
      } else {
        // No terminator found - add WHERE at the end
        modified = modified.trim() + ` WHERE ${condition}`;
      }
    }
    
    return modified;
  };

  let modifiedSQL = sql;
  const alreadyFiltered = new Set<string>();

  // Check if query uses CTEs
  if (sql.trim().toUpperCase().startsWith('WITH')) {
    // Parse CTEs and main query separately
    const ctePattern = /WITH\s+([\s\S]+?)(\bSELECT\s+[\s\S]+)$/i;
    const match = sql.match(ctePattern);
    
    if (match) {
      let cteSection = match[1];
      let mainQuery = match[2];
      
      // Process each CTE individually
      // Split by CTE boundaries (look for pattern: name AS ()
      const cteBlocks = [];
      let currentBlock = '';
      let parenDepth = 0;
      let inCTE = false;
      
      for (let i = 0; i < cteSection.length; i++) {
        const char = cteSection[i];
        currentBlock += char;
        
        if (char === '(') {
          parenDepth++;
          inCTE = true;
        } else if (char === ')') {
          parenDepth--;
          if (parenDepth === 0 && inCTE) {
            cteBlocks.push(currentBlock);
            currentBlock = '';
            inCTE = false;
          }
        }
      }
      
      // Add any remaining text
      if (currentBlock.trim()) {
        cteBlocks.push(currentBlock);
      }
      
      // Extract CTE names to avoid treating them as base tables
      const cteNames = new Set<string>();
      cteBlocks.forEach(block => {
        const cteNameMatch = block.match(/^[\s,]*(\w+)\s+AS\s*\(/i);
        if (cteNameMatch && cteNameMatch[1]) {
          cteNames.add(cteNameMatch[1].toLowerCase());
        }
      });
      
      // Process each CTE block
      const processedCTEs = cteBlocks.map(block => {
        let processed = block;
        
        // Check if this CTE contains percentile calculations (PERCENT_RANK, PERCENTILE_CONT, etc.)
        // These need to see ALL data, so we should NOT add filters to them
        const hasPercentileFunction = /\bPERCENT_RANK\s*\(|\bPERCENTILE_CONT\s*\(|\bPERCENTILE_DISC\s*\(/i.test(block);
        
        if (hasPercentileFunction) {
          // Skip adding filters to percentile calculation CTEs
          // The filtering should happen in the final SELECT, not in the percentile CTE
          return processed;
        }
        
        // Find which tables are used in this CTE
        const tableMatches = block.match(/(?:FROM|JOIN)\s+(\w+)(?:\s|,|$|\))/gi) || [];
        const tables = [...new Set(tableMatches.map(m => {
          const parts = m.split(/\s+/);
          const candidate = parts[parts.length - 1].toLowerCase().replace(/[,;)\s]/g, '');
          return candidate;
        }).filter(ref => {
          if (!ref) return false;
          // Check if it's a function call
          const refPattern = new RegExp(`(?:FROM|JOIN)\\s+${ref}\\s*\\(`, 'i');
          if (refPattern.test(block)) return false;
          // Skip if it's a CTE name (not a base table)
          if (cteNames.has(ref.toLowerCase())) return false;
          return !PG_FUNCTIONS.has(ref);
        }))];
        
        // Apply filters for each table in this CTE (only base tables, not CTEs)
        for (const table of tables) {
          if (permissions[table]) {
            processed = addFilterToTableQuery(processed, table, alreadyFiltered);
          }
        }
        
        return processed;
      }).join('');
      
      // Process main query
      const mainQueryTables = mainQuery.match(/(?:FROM|JOIN)\s+(\w+)(?:\s|,|$|\))/gi) || [];
      const mainTables = [...new Set(mainQueryTables.map(m => {
        const parts = m.split(/\s+/);
        const candidate = parts[parts.length - 1].toLowerCase().replace(/[,;)\s]/g, '');
        return candidate;
      }).filter(ref => {
        if (!ref) return false;
        // Check if it's a function call
        const refPattern = new RegExp(`(?:FROM|JOIN)\\s+${ref}\\s*\\(`, 'i');
        if (refPattern.test(mainQuery)) return false;
        // Skip if it's a CTE name (not a base table)
        if (cteNames.has(ref.toLowerCase())) return false;
        return !PG_FUNCTIONS.has(ref);
      }))];
      
      for (const table of mainTables) {
        if (permissions[table]) {
          mainQuery = addFilterToTableQuery(mainQuery, table, alreadyFiltered);
        }
      }
      
      modifiedSQL = 'WITH ' + processedCTEs + mainQuery;
    }
  } else {
    // Simple query without CTEs - process normally
    const tableMatches = sql.match(/(?:FROM|JOIN)\s+(\w+)(?:\s|,|$|\))/gi) || [];
    const tables = [...new Set(tableMatches.map(m => {
      const parts = m.split(/\s+/);
      const candidate = parts[parts.length - 1].toLowerCase().replace(/[,;)\s]/g, '');
      return candidate;
    }).filter(ref => {
      if (!ref) return false;
      // Check if it's a function call
      const refPattern = new RegExp(`(?:FROM|JOIN)\\s+${ref}\\s*\\(`, 'i');
      if (refPattern.test(sql)) return false;
      return !PG_FUNCTIONS.has(ref);
    }))];
    
    for (const table of tables) {
      if (permissions[table]) {
        modifiedSQL = addFilterToTableQuery(modifiedSQL, table, alreadyFiltered);
      }
    }
  }

  return modifiedSQL;
}

