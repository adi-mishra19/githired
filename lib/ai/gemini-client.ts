/**
 * @deprecated This file is kept for backward compatibility.
 * Please use `lib/ai/llm-provider.ts` instead for provider-agnostic LLM access.
 * 
 * This file now re-exports from the new provider abstraction.
 */
import { generateCompletion, generateStructuredResponse } from "./llm-provider";

// Re-export for backward compatibility
export { generateCompletion, generateStructuredResponse };

// Legacy export - kept for compatibility but not used
export const geminiModel = null;

