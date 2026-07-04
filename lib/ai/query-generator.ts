import { generateStructuredResponse } from "./llm-provider";
import { ROLE_PERMISSIONS } from "./sql-validator";

interface QueryResponse {
  sql: string;
  explanation: string;
  chartType: "bar" | "line" | "pie" | "radar" | "table" | "metric" | "funnel";
  visualization: {
    xAxis?: string;
    yAxis?: string;
    groupBy?: string;
  };
}

// Database schema information for AI context
const DATABASE_SCHEMA = `
TABLES:

students:
  - id (text, primary key)
  - user_id (text, foreign key to user.id, unique)
  - email (text, not null)
  - name (text)
  - srn (text, unique) - student registration number
  - phone (text)
  - location (text)
  - preferred_locations (text[]) - ARRAY of location strings
  - bio (text)
  - about_me (text)
  - headline (text)
  - cgpa (text) - student's current CGPA (stored as text, cast to NUMERIC for calculations)
  - degree (text) - BTech, MTech, MCA
  - course (text) - CSE, ECE, EEE, AIML
  - education (jsonb) - array of education objects
  - experience (jsonb) - array of experience objects with start_year and end_year
  - projects (jsonb) - array of project objects
  - certifications (jsonb) - array of certification objects
  - achievements (jsonb) - array of achievement objects
  - skills (text[]) - ARRAY of skill strings, use unnest(skills) to expand or array_length(skills, 1) to count
  - github_url (text)
  - linkedin_url (text)
  - portfolio_url (text)
  - leetcode_url (text)
  - resumes (jsonb) - array of resume objects {label, url, uploadedAt}
  - resume_url (text) - legacy field, kept for backward compatibility
  - status (text) - pending, approved, rejected, banned (default: pending)
  - created_at (timestamp)
  - updated_at (timestamp)

companies:
  - id (text, primary key)
  - user_id (text, foreign key to user.id, unique)
  - name (text, not null)
  - contact_email (text, not null)
  - contact_phone (text)
  - logo_url (text)
  - website_url (text)
  - linkedin_url (text)
  - twitter_url (text)
  - location (text)
  - about (text)
  - industry (text)
  - size (text) - e.g., "1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"
  - founded_year (text)
  - specialties (text[]) - ARRAY of specialty strings
  - tech_stack (text[]) - ARRAY of technology strings
  - benefits (jsonb) - array of benefit objects
  - culture (text)
  - office_locations (jsonb) - array of location objects
  - verified (boolean, default: false)
  - status (text) - pending, approved, rejected, banned (default: pending)
  - analytics (jsonb) - {profileViews, jobPosts, applications}
  - created_at (timestamp)
  - updated_at (timestamp)

jobs:
  - id (text, primary key)
  - company_id (text, foreign key to companies.id)
  - title (text, not null)
  - description (text, not null)
  - type (text, not null) - internship, full-time
  - location (text, not null)
  - cgpa_cutoff (text) - minimum CGPA required (stored as text, cast to NUMERIC for comparisons)
  - eligible_courses (text[]) - ARRAY of allowed courses (CSE, ECE, EEE, AIML), use = ANY(eligible_courses) to check
  - eligible_degrees (text[]) - ARRAY of allowed degrees (BTech, MTech, MCA), use = ANY(eligible_degrees) to check
  - salary (text) - salary in INR (e.g., "10 LPA" or "10-15 LPA")
  - skills (text[]) - ARRAY of required skill strings, use unnest(skills) to expand or = ANY(skills) to check
  - benefits (text[]) - ARRAY of benefit strings
  - deadline (timestamp) - application deadline
  - jd_url (text) - job description PDF URL
  - about_role (jsonb) - rich text content
  - status (text) - active, stopped (default: active)
  - analytics (jsonb) - {views: number, applications: number}
  - created_at (timestamp)
  - updated_at (timestamp)

applications:
  - id (text, primary key)
  - job_id (text, foreign key to jobs.id)
  - student_id (text, foreign key to students.id)
  - status (text) - pending, oa, interview_round_1, interview_round_2, interview_round_3, selected, rejected (default: pending)
  - student_cgpa (text) - CGPA at time of application (snapshot)
  - student_course (text) - course at time of application (snapshot)
  - student_degree (text) - degree at time of application (snapshot)
  - cover_letter (text)
  - resume_url (text) - specific resume used for this application
  - resume_label (text) - label of the resume chosen by student
  - applied_at (timestamp, not null)
  - created_at (timestamp)
  - updated_at (timestamp)
  - UNIQUE constraint on (job_id, student_id) - one application per student per job

user:
  - id (text, primary key)
  - name (text, not null)
  - email (text, not null, unique)
  - email_verified (boolean, not null)
  - image (text)
  - role (text, not null) - student, company, admin
  - created_at (timestamp)
  - updated_at (timestamp)

IMPORTANT NOTES AND EXAMPLES:

1. TEXT[] Array Operations:
   - To expand array into rows: Use comma syntax or LATERAL
     ✅ CORRECT: SELECT skill FROM jobs, unnest(skills) AS skill
     ✅ CORRECT: SELECT skill FROM jobs CROSS JOIN LATERAL unnest(skills) AS skill
     ❌ WRONG: SELECT skill FROM jobs CROSS JOIN unnest(skills) AS skill (missing LATERAL)
   
   - To check if value exists in array:
     ✅ CORRECT: WHERE 'CSE' = ANY(eligible_courses)
     ✅ CORRECT: WHERE skill = ANY(student_skills_array)
     ❌ WRONG: WHERE skill = student_skills_array (comparing text to text[] - type mismatch)
   
   - To check if value does NOT exist in array:
     ✅ CORRECT: WHERE skill NOT IN (SELECT unnest(student_skills_array))
     ✅ CORRECT: WHERE NOT (skill = ANY(student_skills_array))
     ❌ WRONG: WHERE student_skill = job_skills (comparing single text to text array)
   
   - To count array elements:
     ✅ CORRECT: SELECT array_length(skills, 1) FROM students
   
   - CRITICAL: When comparing skills from jobs vs student skills:
     ✅ CORRECT: Expand both arrays, then compare individual values:
       WITH JobSkills AS (SELECT job_id, unnest(skills) AS skill FROM jobs),
            StudentSkills AS (SELECT unnest(skills) AS skill FROM students WHERE id = 'x')
       SELECT js.skill FROM JobSkills js 
       WHERE js.skill NOT IN (SELECT skill FROM StudentSkills)
     ❌ WRONG: Comparing arrays directly or comparing single value to array

2. JSONB Operations:
   - To expand JSONB array: jsonb_array_elements(column)
     ✅ CORRECT: SELECT * FROM students, jsonb_array_elements(certifications) AS cert
   
   - To count JSONB array: jsonb_array_length(column)
     ✅ CORRECT: SELECT jsonb_array_length(certifications) FROM students

3. CGPA and Numeric Comparisons:
   - Always cast TEXT to NUMERIC for math operations
     ✅ CORRECT: WHERE CAST(cgpa AS NUMERIC) >= CAST(cgpa_cutoff AS NUMERIC)
     ✅ CORRECT: AVG(CAST(cgpa AS NUMERIC))
   - ALWAYS use ROUND() for CGPA calculations to avoid excessive decimal places:
     ✅ CORRECT: ROUND(AVG(CAST(cgpa AS NUMERIC)), 2) -- rounds to 2 decimal places
     ✅ CORRECT: ROUND(CAST(cgpa AS NUMERIC), 3) -- rounds to 3 decimal places
     ❌ WRONG: AVG(CAST(cgpa AS NUMERIC)) -- produces 15+ decimal places
   - CRITICAL: ROUND() in PostgreSQL requires NUMERIC type, not DOUBLE PRECISION:
     ✅ CORRECT: ROUND(CAST(value AS NUMERIC), 2) or ROUND(value::numeric, 2)
     ❌ WRONG: ROUND(value, 2) if value is double precision -- will fail

4. Common Query Patterns:
   - Top skills from students:
     SELECT skill, COUNT(*) as count 
     FROM students, unnest(skills) AS skill 
     GROUP BY skill ORDER BY count DESC LIMIT 10
   - CRITICAL: When using unnest() or array operations with COUNT(), you MUST use GROUP BY:
     ✅ CORRECT: SELECT skill, COUNT(*) FROM jobs, unnest(skills) AS skill GROUP BY skill ORDER BY COUNT(*) DESC LIMIT 10
     ❌ WRONG: SELECT skill, COUNT(*) FROM jobs, unnest(skills) AS skill (missing GROUP BY - will fail or return wrong results)
   - Always include ORDER BY and LIMIT when query asks for "top N" or "most frequent"
   
   - Students eligible for a job:
     SELECT s.* FROM students s 
     WHERE s.course = ANY((SELECT eligible_courses FROM jobs WHERE id = 'job_id'))
   
   - Jobs with specific skill:
     SELECT * FROM jobs WHERE 'Python' = ANY(skills)

5. All timestamps are in UTC
6. Use PostgreSQL syntax (ILIKE for case-insensitive search, || for concatenation)
`;

interface QueryGenerationOptions {
  previousSQL?: string;
  errorMessage?: string;
}

function buildPrompt(
  naturalQuery: string,
  role: string,
  context: {
    userId?: string;
    studentId?: string;
    companyId?: string;
  },
  options: QueryGenerationOptions = {}
): string {
  const permissions = ROLE_PERMISSIONS[role];
  
  if (!permissions) {
    throw new Error(`Invalid role: ${role}. Must be student, company, or admin.`);
  }
  
  const allowedTables = Object.keys(permissions).filter(t => permissions[t].allowed);

  let prompt = `You are a PostgreSQL SQL expert. Convert the following natural language query to a valid PostgreSQL SELECT query.

================================================================================
DATABASE SCHEMA - USE THIS EXACT STRUCTURE FOR ALL QUERIES
================================================================================
${DATABASE_SCHEMA}
================================================================================

USER ROLE: ${role}
ALLOWED TABLES: ${allowedTables.join(', ')}

CONTEXT:
${role === 'student' ? `- Current student ID: ${context.studentId}` : ''}
${role === 'company' ? `- Current company ID: ${context.companyId}` : ''}
${role !== 'admin' ? `- Current user ID: ${context.userId}` : ''}

QUERY: "${naturalQuery}"

REQUIREMENTS:
1. Generate a valid PostgreSQL SELECT query
2. Only use tables from ALLOWED TABLES list
3. Handle array columns correctly:
   - For TEXT[] arrays (skills, eligible_courses, etc.): Use comma syntax with unnest() or = ANY()
     Example: FROM students, unnest(skills) AS skill
   - For JSONB arrays: Use jsonb_array_elements() or jsonb_array_length()
   - NEVER use "CROSS JOIN unnest()" without LATERAL - use comma syntax instead
4. Cast text columns to appropriate types when needed (CAST(cgpa AS NUMERIC))
5. For CGPA comparisons, always cast to NUMERIC
6. For salary, assume format is "X LPA" or "X-Y LPA", extract and convert as needed
7. When filtering by current user/student/company, the filtering will be handled automatically - don't add WHERE clauses for this
8. Suggest appropriate chart type based on data (bar, line, pie, radar, table, metric, funnel)
9. For metrics (single number), return as a single row with column name "value" and optionally "label"
10. Limit results to reasonable numbers (e.g., top 10, top 20)
11. NEVER use jsonb_array_elements() on TEXT[] columns - use unnest() instead
12. Use comma syntax for simple joins/unnest: "FROM table1, unnest(array) AS item" instead of CROSS JOIN
13. CRITICAL SQL SYNTAX RULES:
    - NEVER use phantom table aliases (e.g., "WHERE GROUP.job_id" is WRONG - should be "WHERE job_id")
    - Only use table aliases that you explicitly defined in the FROM clause
    - Column references should ONLY be prefixed with actual table names or aliases you created
    - Example CORRECT: "FROM applications a WHERE a.job_id IN (...)"
    - Example WRONG: "FROM applications WHERE GROUP.job_id IN (...)" (GROUP is not a table)
    - When using aliases in CTEs, make sure to define them in the CTE's FROM clause:
      ✅ CORRECT: WITH MyCTE AS (SELECT s.cgpa FROM students s) SELECT * FROM MyCTE
      ❌ WRONG: WITH MyCTE AS (SELECT s.cgpa FROM students) SELECT * FROM MyCTE (alias 's' not defined)
    - Always define table aliases in FROM/JOIN clauses before using them in SELECT
    - CRITICAL: When creating CTEs, SELECT ALL columns you will reference later in the query:
      ✅ CORRECT: WITH StudentData AS (SELECT id, course, degree, cgpa, skills FROM students WHERE id = 'x') ... WHERE StudentData.course = ANY(...)
      ❌ WRONG: WITH StudentData AS (SELECT skills FROM students WHERE id = 'x') ... WHERE StudentData.course = ANY(...) (course not in CTE)
      - If you need to check eligibility (course, degree, cgpa), include those columns in the CTE SELECT
      - If you need to compare values later, include them in the CTE SELECT
    - CRITICAL: When referencing columns from CTEs, use the ACTUAL column names from that CTE's SELECT clause:
      ✅ CORRECT: WITH EligibleJobs AS (SELECT id, title FROM jobs) ... SELECT job_id FROM EligibleJobs, unnest(skills) AS skill GROUP BY id (use 'id', not 'job_id')
      ✅ CORRECT: WITH EligibleJobs AS (SELECT id AS job_id, title FROM jobs) ... SELECT job_id FROM EligibleJobs (if you aliased it in SELECT)
      ❌ WRONG: WITH EligibleJobs AS (SELECT id, title FROM jobs) ... SELECT job_id FROM EligibleJobs (job_id doesn't exist - use 'id')
      - If a CTE selects 'id', use 'id' (or 'EligibleJobs.id'), not 'job_id' unless you explicitly aliased it
      - Always check what columns are actually SELECTed in each CTE before referencing them
    - CRITICAL: When using JOINs, ALWAYS qualify column names to avoid ambiguity:
      ✅ CORRECT: FROM table1 t1 JOIN table2 t2 ON t1.id = t2.id WHERE t1.name = 'x'
      ❌ WRONG: FROM table1 JOIN table2 ON table1.id = table2.id WHERE name = 'x' (which table's name?)
      ✅ CORRECT: SELECT CourseCGPAs.cgpa FROM CourseCGPAs JOIN StudentData ON CourseCGPAs.cgpa = StudentData.cgpa
      ❌ WRONG: SELECT cgpa FROM CourseCGPAs JOIN StudentData ON CourseCGPAs.cgpa = StudentData.cgpa (ambiguous cgpa)
    - In window functions with JOINs, qualify all column references:
      ✅ CORRECT: PERCENT_RANK() OVER (ORDER BY CAST(CourseCGPAs.cgpa AS NUMERIC))
      ❌ WRONG: PERCENT_RANK() OVER (ORDER BY CAST(cgpa AS NUMERIC)) when multiple tables have cgpa
14. Always use proper spacing and line breaks in SQL for readability
15. CRITICAL: Prevent division by zero errors:
    - ALWAYS check for NULL or zero before dividing
    - Use NULLIF() to prevent division by zero: NULLIF(divisor, 0)
    - Use COALESCE() to handle NULL values: COALESCE(value, 0)
    - Example: CASE WHEN divisor > 0 THEN numerator / divisor ELSE 0 END
    - Example: numerator / NULLIF(divisor, 0) - this returns NULL instead of error
    - When calculating percentages or ratios, always wrap division in CASE statements that check for zero/NULL
    - CRITICAL ERROR TO FIX: If you see "division by zero", you MUST protect the DENOMINATOR:
      ❌ WRONG: CASE WHEN numerator IS NULL THEN 0 ELSE ROUND((numerator / denominator) * 100) END
                -- checks numerator but denominator could be NULL or 0!
      ✅ CORRECT: CASE WHEN numerator IS NULL OR denominator IS NULL OR denominator = 0 THEN 0 
                      ELSE ROUND((numerator / NULLIF(denominator, 0)) * 100) END
      ✅ CORRECT: CASE WHEN numerator IS NULL THEN 0 
                      ELSE ROUND((numerator / COALESCE(NULLIF(denominator, 0), 1)) * 100) END
      - Always check BOTH numerator AND denominator before dividing!
16. CRITICAL: Percentile calculations (PERCENT_RANK, PERCENTILE_CONT, etc.):
    - PERCENT_RANK() is a WINDOW FUNCTION, NOT an aggregate function
    - CORRECT syntax: PERCENT_RANK() OVER (ORDER BY column)
    - WRONG syntax: PERCENT_RANK() WITHIN GROUP (ORDER BY column) - this is for aggregate functions like PERCENTILE_CONT
    - PERCENT_RANK() returns 0-1 (0% to 100%), so multiply by 100 to get percentage: PERCENT_RANK() * 100
    - PERCENT_RANK() returns DOUBLE PRECISION - must CAST to NUMERIC before ROUND():
      ✅ CORRECT: ROUND(CAST(PERCENT_RANK() OVER (...) * 100 AS NUMERIC), 1)
      ✅ CORRECT: ROUND((PERCENT_RANK() OVER (...) * 100)::numeric, 1)
      ❌ WRONG: ROUND(PERCENT_RANK() OVER (...) * 100, 1) -- fails with "function does not exist"
    - ALWAYS calculate percentiles over ALL rows first, then filter to get the specific student's value
    - WRONG: SELECT PERCENT_RANK() OVER (...) FROM students WHERE id = 'student_id' (filters before calculating)
    - CORRECT: Calculate percentile in a CTE over all students, then filter in the final SELECT:
      WITH PercentileData AS (
        SELECT id, ROUND(CAST(PERCENT_RANK() OVER (ORDER BY CAST(cgpa AS NUMERIC)) * 100 AS NUMERIC), 1) AS cgpa_percentile
        FROM students
      )
      SELECT cgpa_percentile FROM PercentileData WHERE id = 'student_id'
    - Always ROUND percentile to 1 decimal place for readability
    - The percentile window function MUST see all students to calculate correctly
    - Only filter AFTER the percentile is calculated, not before
    - When using PERCENT_RANK() in CTEs, ensure the window function operates on the full dataset without WHERE filters
    - NEVER use PERCENT_RANK() WITHIN GROUP - use PERCENT_RANK() OVER instead
    - If you need aggregate percentiles, use PERCENTILE_CONT() WITHIN GROUP (ORDER BY column) or PERCENTILE_DISC() WITHIN GROUP (ORDER BY column)
    - IMPORTANT: There is NO 'percentile' column in any table - percentiles must be calculated using PERCENT_RANK() window function
17. CRITICAL: Distribution queries with student-specific metrics:
    - When showing distributions (e.g., CGPA distribution) with student-specific values (e.g., student's percentile):
      - Calculate the student's metric ONCE in a separate CTE using PERCENT_RANK() over the full dataset
      - Include that value in ALL distribution rows using a scalar subquery or CROSS JOIN
      - NEVER recalculate the student's metric per row with a WHERE condition that might not match
    - CORRECT pattern for CGPA metrics (single row):
      WITH CourseStudents AS (
        SELECT id, CAST(cgpa AS NUMERIC) AS cgpa_num 
        FROM students 
        WHERE course = (SELECT course FROM students WHERE id = 'current_student_id')
      ),
      PercentileData AS (
        SELECT id, ROUND(CAST(PERCENT_RANK() OVER (ORDER BY cgpa_num) * 100 AS NUMERIC), 1) AS percentile
        FROM CourseStudents
      )
      SELECT 
        (SELECT cgpa FROM students WHERE id = 'current_student_id') AS my_cgpa,
        (SELECT COUNT(*) FROM CourseStudents) AS total_students,
        ROUND((SELECT AVG(cgpa_num) FROM CourseStudents), 2) AS course_avg_cgpa,
        (SELECT percentile FROM PercentileData WHERE id = 'current_student_id') AS my_percentile
    - This ensures the student's percentile (calculated over ALL students) appears correctly in all distribution rows
    - The percentile value should be the same in every row since it represents the student's position in the overall distribution
    - CRITICAL SUBQUERY ERROR FIX: When a CTE calculates percentiles/rankings for ALL rows, you MUST include the id column:
      ❌ WRONG: WITH CGPAPercentile AS (SELECT ROUND(...percentile...) AS cgpa_percentile FROM students)
                SELECT (SELECT cgpa_percentile FROM CGPAPercentile) ... -- ERROR: multiple rows returned
      ✅ CORRECT: WITH CGPAPercentile AS (SELECT id, ROUND(...percentile...) AS cgpa_percentile FROM students)
                  SELECT (SELECT cgpa_percentile FROM CGPAPercentile WHERE id = 'student_id') ... -- OK: filtered to one row
      - Always add "WHERE id = 'specific_id'" when selecting from a multi-row CTE in a scalar subquery context
      - If you see "more than one row returned by a subquery", add the id column to the CTE and filter by it

OUTPUT FORMAT: Return ONLY a valid JSON object with these exact fields:
- sql: (string) The PostgreSQL SELECT query
- explanation: (string) Plain English explanation
- chartType: (string) One of: bar, line, pie, radar, table, metric, funnel
- visualization: (object) Optional fields: xAxis, yAxis, groupBy
Example response:
{"sql":"SELECT COUNT(*) FROM students","explanation":"Counts total students","chartType":"metric","visualization":{}}

CRITICAL: Respond with ONLY the JSON object, no markdown, no explanations, no code blocks.`;

  if (options.previousSQL && options.errorMessage) {
    prompt += `

PREVIOUS ATTEMPT (FIX REQUIRED):
- The last SQL attempt was:
${options.previousSQL}
- PostgreSQL returned this error:
${options.errorMessage}

You MUST correct the SQL so it avoids this error while still satisfying all requirements above. Return a brand new, corrected SQL query and respond using the same JSON format described earlier.`;
  }

  return prompt;
}

export async function convertQueryToSQL(
  naturalQuery: string,
  role: "student" | "company" | "admin",
  context: {
    userId?: string;
    studentId?: string;
    companyId?: string;
  },
  options: QueryGenerationOptions = {}
): Promise<QueryResponse> {
  if (!naturalQuery || naturalQuery.trim().length === 0) {
    throw new Error("Query cannot be empty");
  }

  const prompt = buildPrompt(naturalQuery, role, context, options);
  
  const schema = `{
    "sql": string,
    "explanation": string,
    "chartType": "bar" | "line" | "pie" | "radar" | "table" | "metric" | "funnel",
    "visualization": {
      "xAxis"?: string,
      "yAxis"?: string,
      "groupBy"?: string
    }
  }`;

  try {
    const response = await generateStructuredResponse<QueryResponse>(prompt, schema);
    
    if (!response || !response.sql) {
      throw new Error("Invalid response from AI - missing SQL query");
    }
    
    return response;
  } catch (error: any) {
    console.error("Query generation error:", error);
    const errorMessage = error.message || "Failed to convert natural language to SQL. Please try rephrasing your question.";
    throw new Error(errorMessage);
  }
}

export async function generateInsights(
  query: string,
  results: any[],
  chartType: string
): Promise<string> {
  // Handle empty results
  if (!results || results.length === 0) {
    return "No data found for this query. This could mean:\n- There are no active jobs posted yet\n- The skills arrays in jobs are empty\n- Try checking if there are any jobs with skills listed";
  }

  const prompt = `Analyze the following data and provide 3-5 key insights in natural language.

ORIGINAL QUERY: "${query}"
CHART TYPE: ${chartType}
DATA: ${JSON.stringify(results.slice(0, 20))} ${results.length > 20 ? '(showing first 20 rows)' : ''}

IMPORTANT CONTEXT:
- All salaries are in INR (Indian Rupees) and are in LPA (Lakhs Per Annum) format
- If you see a salary value like "30" or "30.00", it means "30 LPA" (30 Lakhs Per Annum = ₹30,00,000 per year)
- Salary values like "10-15" mean "10-15 LPA" (₹10-15 Lakhs Per Annum)
- NEVER interpret salary values as dollars ($) or per hour - they are always annual salaries in Lakhs (INR)
- When mentioning salaries, always include "LPA" or "Lakhs Per Annum" in your response

Provide insights that are:
1. Actionable and specific
2. Highlight important patterns or trends
3. Written in friendly, professional tone
4. Relevant to the user who asked the query
5. Always use correct salary units (LPA/Lakhs Per Annum in INR)

Format as markdown with bullet points. Keep it concise (max 200 words).`;

  try {
    const insights = await generateStructuredResponse<{insights: string}>(
      prompt,
      '{"insights": "markdown formatted insights"}'
    );
    return insights.insights;
  } catch (error) {
    console.error("Insights generation error:", error);
    return "Unable to generate insights at this time.";
  }
}

export async function generateGeneralResponse(
  query: string,
  role: "student" | "company" | "admin"
): Promise<string> {
  const roleContext = role === "student"
    ? "You are helping a student preparing for placements."
    : role === "company"
    ? "You are helping a recruiter or company representative."
    : "You are assisting an administrator overseeing the entire platform.";

  const prompt = `${roleContext}

The user asked: "${query}"

Provide a concise, friendly, and practical response (max 200 words). Use markdown bullet points if it improves readability.`;

  try {
    const response = await generateStructuredResponse<{ answer: string }>(
      prompt,
      '{"answer": string}'
    );
    return response.answer;
  } catch (error) {
    console.error("General response generation error:", error);
    return "I’m here to help with your analytics and preparation questions. Try asking about your applications, skills, or opportunities on the platform.";
  }
}

export async function generateSuggestions(
  role: "student" | "company" | "admin",
  recentQueries: string[]
): Promise<string[]> {
  const prompt = `Based on the user's role and recent queries, suggest 3-5 relevant follow-up questions they might want to ask.

USER ROLE: ${role}
RECENT QUERIES: ${recentQueries.join(', ')}

Suggest natural language questions that would provide valuable insights for this role.
Return as a JSON array of strings.`;

  try {
    const suggestions = await generateStructuredResponse<{suggestions: string[]}>(
      prompt,
      '{"suggestions": ["question 1", "question 2", ...]}'
    );
    return suggestions.suggestions;
  } catch (error) {
    console.error("Suggestions generation error:", error);
    return [];
  }
}

