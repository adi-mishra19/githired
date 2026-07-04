import { NextRequest, NextResponse } from "next/server";
import { executeAIQuery, getQueryHistory, clearAllQueryHistory } from "@/server/ai/query-executor";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, templateId } = body;

    if (!query) {
      return NextResponse.json(
        { error: "Query is required" },
        { status: 400 }
      );
    }

    const result = await executeAIQuery(query, templateId);
    
    // If it's a quota error, return 429 status
    if (!result.success && result.isQuotaError) {
      return NextResponse.json(
        { 
          error: result.error,
          isQuotaError: true,
          retryAfter: result.retryAfter
        },
        { status: 429 }
      );
    }
    
    return NextResponse.json(result);
  } catch (error: any) {
    // Check if it's a quota error
    if (error.isQuotaError || 
        error.message?.includes("quota") || 
        error.message?.includes("rate limit")) {
      return NextResponse.json(
        { 
          error: error.message || "AI service quota exceeded. Please try again later.",
          isQuotaError: true,
          retryAfter: error.retryAfter
        },
        { status: 429 }
      );
    }
    
    return NextResponse.json(
      { error: error.message || "Failed to execute query" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "10");

    const history = await getQueryHistory(limit);
    return NextResponse.json(history);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch history" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const result = await clearAllQueryHistory();
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to clear history" },
      { status: 500 }
    );
  }
}

