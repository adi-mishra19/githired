"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db/drizzle";
import { aiQueries, students, companies, user } from "@/db/schema";
import { eq } from "drizzle-orm";
import { convertQueryToSQL, generateInsights, generateGeneralResponse } from "@/lib/ai/query-generator";
import { validateSQL, sanitizeSQL, addRoleBasedFilters, SQLValidationError, ROLE_PERMISSIONS } from "@/lib/ai/sql-validator";
import { getTemplateById } from "@/lib/ai/query-templates";
import { sql as drizzleSql } from "drizzle-orm";

interface QueryExecutionResult {
  success: boolean;
  data?: any[];
  insights?: string;
  chartType?: string;
  visualization?: any;
  error?: string;
  queryId?: string;
  sql?: string; // Add SQL query for transparency
  explanation?: string; // Add explanation
  executionTime?: string; // Add execution time
  isQuotaError?: boolean; // Indicates if error is due to quota/rate limit
  retryAfter?: string | null; // Suggested retry time
  visualizationNote?: string; // Message when visualization isn't available
}

const RECOVERABLE_SQL_ERROR_CODES = new Set([
  "42601", // syntax_error
  "42703", // undefined_column
  "42P01", // undefined_table
  "42803", // grouping_error
  "42883", // undefined_function
  "42P02", // undefined_parameter
  "42P07", // duplicate_table
  "21000", // cardinality_violation (subquery returned more than one row)
  "22012"  // division_by_zero
]);

function extractErrorCode(error: any): string | undefined {
  if (!error) return undefined;
  if (typeof error.code === "string") return error.code;
  if (error.cause && typeof error.cause.code === "string") {
    return error.cause.code;
  }
  return undefined;
}

function extractErrorMessage(error: any): string {
  if (!error) return "Unknown error";
  if (typeof error === "string") return error;
  if (error.message) return error.message;
  if (error.cause?.message) return error.cause.message;
  return JSON.stringify(error);
}

function isRecoverableDatabaseError(error: any): boolean {
  const code = extractErrorCode(error);
  if (code && RECOVERABLE_SQL_ERROR_CODES.has(code)) {
    return true;
  }

  const message = extractErrorMessage(error).toLowerCase();
  return (
    message.includes("syntax error") ||
    message.includes("must appear in the group by") ||
    message.includes("does not exist") ||
    message.includes("undefined column") ||
    message.includes("undefined table") ||
    message.includes("undefined function") ||
    message.includes("more than one row returned") ||
    message.includes("division by zero")
  );
}

async function getAuthContext() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  // Fetch user from database to get the actual role
  const currentUser = await db.query.user.findFirst({
    where: eq(user.id, session.user.id)
  });

  if (!currentUser) {
    throw new Error("User not found");
  }

  const userRole = currentUser.role as "student" | "company" | "admin";
  let studentId: string | undefined;
  let companyId: string | undefined;

  if (userRole === "student") {
    const student = await db.query.students.findFirst({
      where: eq(students.userId, session.user.id)
    });
    studentId = student?.id;
  } else if (userRole === "company") {
    const company = await db.query.companies.findFirst({
      where: eq(companies.userId, session.user.id)
    });
    companyId = company?.id;
  }

  return {
    user: session.user,
    userId: session.user.id,
    role: userRole,
    studentId,
    companyId
  };
}

// Helper function to detect non-data queries
function isNonDataQuery(query: string): boolean {
  const lowerQuery = query.toLowerCase().trim();
  
  // Greetings
  const greetings = ['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening', 'greetings'];
  if (greetings.some(g => lowerQuery === g || lowerQuery.startsWith(g + ' ') || lowerQuery.startsWith(g + '!'))) {
    return true;
  }
  
  // Help requests
  const helpPatterns = ['help', 'what can you do', 'what can i ask', 'how does this work', 'show me examples'];
  if (helpPatterns.some(p => lowerQuery.includes(p))) {
    return true;
  }
  
  // Very short queries that aren't meaningful
  if (lowerQuery.length < 3) {
    return true;
  }
  
  return false;
}

// Helper function to generate friendly response for non-data queries
function generateFriendlyResponse(query: string, role: string): string {
  const lowerQuery = query.toLowerCase().trim();
  
  if (lowerQuery.includes('help') || lowerQuery.includes('what can you do') || lowerQuery.includes('what can i ask')) {
    if (role === 'student') {
      return `I can help you analyze your job application data! Here are some things you can ask me:

- "Show me my profile score breakdown"
- "What's my CGPA percentile?"
- "Which skills are most in demand?"
- "Show me my application status distribution"
- "What jobs match my skills?"
- "Compare my profile with peer averages"

Try asking a question about your applications, skills, or profile!`;
    } else if (role === 'company') {
      return `I can help you analyze your recruitment data! Here are some things you can ask me:

- "Show me application trends over time"
- "Which skills are applicants missing?"
- "What's the average CGPA of applicants?"
- "Show me job posting performance"
- "How many applications per job?"

Try asking a question about your jobs or applicants!`;
    } else {
      return `I can help you analyze platform data! Try asking about students, companies, jobs, or applications.`;
    }
  }
  
  // Default friendly greeting
  return `Hello! 👋 I'm your AI Analytics Assistant. I can help you explore your data with natural language queries.

Try asking me something like:
- "Show me my profile score"
- "What skills are most in demand?"
- "How am I performing compared to others?"

Or click on a template to get started!`;
}

function doesSQLReferenceDataTables(sql: string, role: string): boolean {
  const permissions = ROLE_PERMISSIONS[role];
  if (!permissions) return false;

  const lowerSql = sql.toLowerCase();
  return Object.keys(permissions)
    .filter((table) => permissions[table].allowed)
    .some((table) => {
      const pattern = new RegExp(`\\b(from|join)\\s+${table}\\b`, "i");
      return pattern.test(lowerSql);
    });
}

export async function executeAIQuery(
  naturalQuery: string,
  templateId?: string
): Promise<QueryExecutionResult> {
  try {
    const startTime = Date.now();
    const context = await getAuthContext();

    // Handle non-data queries (greetings, help, etc.) - skip if using template
  if (!templateId && isNonDataQuery(naturalQuery)) {
      const friendlyMessage = generateFriendlyResponse(naturalQuery, context.role);
      return {
        success: true,
        data: [],
        insights: friendlyMessage,
        chartType: undefined,
        visualization: undefined,
        explanation: "Friendly greeting response",
        visualizationNote: "Visualization is not available for this type of question."
      };
    }

    let sqlQuery = "";
    let explanation = "";
    let chartType: "bar" | "line" | "pie" | "radar" | "table" | "metric" | "funnel";
    let visualization: any;
    let isTemplate = false;
    let fixedChartType: typeof chartType | undefined;
    let queryPrompt = naturalQuery;
    let queryResponse: Awaited<ReturnType<typeof convertQueryToSQL>>;

    // Check if using a template
    if (templateId) {
      const template = getTemplateById(templateId);
      if (!template) {
        return { success: false, error: "Template not found" };
      }

      if (template.role !== context.role) {
        return { success: false, error: "Unauthorized access to this template" };
      }

      isTemplate = true;
      fixedChartType = template.chartType;
      queryPrompt = template.prompt;
      queryResponse = await convertQueryToSQL(
        queryPrompt,
        context.role,
        context
      );
    } else {
      queryResponse = await convertQueryToSQL(
        naturalQuery,
        context.role,
        context
      );
    }

    const queryContext = {
      userId: context.userId,
      studentId: context.studentId,
      companyId: context.companyId
    };

    const maxAttempts = 2;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      explanation = queryResponse.explanation;
      chartType = fixedChartType ?? queryResponse.chartType;
      visualization = queryResponse.visualization;
      sqlQuery = sanitizeSQL(queryResponse.sql);

      const referencesDataTables = doesSQLReferenceDataTables(sqlQuery, context.role);

      if (!templateId && !referencesDataTables) {
        const generalAnswer = await generateGeneralResponse(naturalQuery, context.role);
        return {
          success: true,
          data: [],
          insights: generalAnswer,
          chartType: undefined,
          visualization: undefined,
          explanation: "General guidance response",
          visualizationNote: "Visualization is not available for this type of question."
        };
      }

      validateSQL(sqlQuery, context.role);

      sqlQuery = addRoleBasedFilters(sqlQuery, context.role, queryContext);

      console.log("Executing SQL:", sqlQuery);

      // Execute query with timeout
      const queryPromise = db.execute(drizzleSql.raw(sqlQuery));
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Query timeout")), 10000)
      );

      try {
        const result = await Promise.race([queryPromise, timeoutPromise]) as any;
        const rows = result.rows || result;

        const endTime = Date.now();
        const executionTime = `${endTime - startTime}ms`;

        // Generate insights
        const insights = await generateInsights(naturalQuery, rows, chartType);

        // Save query to history
        const [savedQuery] = await db.insert(aiQueries).values({
          userId: context.userId,
          role: context.role,
          query: naturalQuery,
          generatedSql: sqlQuery,
          results: rows,
          insights,
          chartType,
          isTemplate,
          executionTime
        }).returning();

        return {
          success: true,
          data: rows,
          insights,
          chartType,
          visualization,
          queryId: savedQuery.id,
          sql: sqlQuery,
          explanation,
          executionTime,
          visualizationNote: rows.length > 0 ? undefined : "Visualization is not available for this query."
        };
      } catch (executionError: any) {
        console.error("Query execution error:", executionError);

        if (
          attempt < maxAttempts - 1 &&
          isRecoverableDatabaseError(executionError)
        ) {
          const errorMessage = extractErrorMessage(executionError);
          console.warn(
            "AI-generated SQL failed, requesting corrected query from LLM..."
          );

          queryResponse = await convertQueryToSQL(
            queryPrompt,
            context.role,
            context,
            {
              previousSQL: sqlQuery,
              errorMessage
            }
          );

          // Retry loop
          continue;
        }

        throw executionError;
      }
    }

  } catch (error: any) {
    console.error("Query execution error:", error);

    if (error instanceof SQLValidationError) {
      return {
        success: false,
        error: error.message
      };
    }

    if (error.message === "Query timeout") {
      return {
        success: false,
        error: "Query took too long to execute. Please try a simpler query."
      };
    }

    // Check if it's a quota/rate limit error
    if (error.isQuotaError || 
        error.message?.includes("quota") || 
        error.message?.includes("rate limit") ||
        error.message?.includes("429") ||
        error.message?.includes("Too Many Requests")) {
      return {
        success: false,
        error: error.message || "AI service quota exceeded. The free tier has been reached. Please try again later or upgrade your API plan.",
        isQuotaError: true,
        retryAfter: error.retryAfter
      };
    }

    return {
      success: false,
      error: error.message || "Failed to execute query. Please try again or rephrase your question."
    };
  }
}

export async function getQueryHistory(limit: number = 10) {
  try {
    const context = await getAuthContext();

    const history = await db.query.aiQueries.findMany({
      where: eq(aiQueries.userId, context.userId),
      orderBy: (queries, { desc }) => [desc(queries.createdAt)],
      limit
    });

    return history;
  } catch (error) {
    console.error("Failed to fetch query history:", error);
    return [];
  }
}

export async function deleteQueryHistory(queryId: string) {
  try {
    const context = await getAuthContext();

    await db.delete(aiQueries)
      .where(eq(aiQueries.id, queryId));

    return { success: true };
  } catch (error) {
    console.error("Failed to delete query:", error);
    return { success: false, error: "Failed to delete query" };
  }
}

export async function clearAllQueryHistory() {
  try {
    const context = await getAuthContext();

    await db.delete(aiQueries)
      .where(eq(aiQueries.userId, context.userId));

    return { success: true };
  } catch (error) {
    console.error("Failed to clear history:", error);
    return { success: false, error: "Failed to clear history" };
  }
}

