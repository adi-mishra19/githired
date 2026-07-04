/**
 * LLM Provider Abstraction Layer
 * 
 * This allows you to use multiple LLM providers (Gemini, GPT, fine-tuned models, etc.)
 * Switch providers via environment variable: LLM_PROVIDER=gemini|openai|custom|anthropic
 */

export interface LLMProvider {
  /**
   * Generate a simple text completion
   */
  generateCompletion(prompt: string, options?: LLMOptions): Promise<string>;

  /**
   * Generate a structured JSON response matching a schema
   */
  generateStructuredResponse<T>(
    prompt: string,
    schema: string,
    options?: LLMOptions
  ): Promise<T>;
}

export interface LLMOptions {
  temperature?: number;
  maxTokens?: number;
  model?: string; // Override default model for this request
  systemPrompt?: string;
}

/**
 * Get the configured LLM provider
 * ONLY loads the provider specified in LLM_PROVIDER env variable
 */
export function getLLMProvider(): LLMProvider {
  const provider = process.env.LLM_PROVIDER || "gemini";
  
  console.log(`[LLM] Using provider: ${provider.toUpperCase()}`);

  switch (provider.toLowerCase()) {
    case "gemini":
      return getGeminiProvider();
    
    case "openai":
    case "gpt":
      return getOpenAIProvider();
    
    case "anthropic":
    case "claude":
      return getAnthropicProvider();
    
    case "custom":
    case "fine-tuned":
    case "huggingface":
    case "hf":
      return getCustomProvider();
    
    default:
      console.warn(`[LLM] Unknown provider: ${provider}, falling back to Gemini`);
      return getGeminiProvider();
  }
}

/**
 * Gemini Provider Implementation
 */
function getGeminiProvider(): LLMProvider {
  const { GoogleGenerativeAI } = require("@google/generative-ai");
  
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not set in environment variables");
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const modelName = process.env.GEMINI_MODEL || "gemini-2.0-flash-exp";
  const geminiModel = genAI.getGenerativeModel({ model: modelName });

  return {
    async generateCompletion(prompt: string, options?: LLMOptions): Promise<string> {
      try {
        const model = options?.model 
          ? genAI.getGenerativeModel({ model: options.model })
          : geminiModel;

        const generationConfig: any = {};
        if (options?.temperature !== undefined) {
          generationConfig.temperature = options.temperature;
        }
        if (options?.maxTokens !== undefined) {
          generationConfig.maxOutputTokens = options.maxTokens;
        }

        const fullPrompt = options?.systemPrompt 
          ? `${options.systemPrompt}\n\n${prompt}`
          : prompt;

        const result = await model.generateContent({
          contents: [{ parts: [{ text: fullPrompt }] }],
          generationConfig,
        });
        
        const response = await result.response;
        return response.text();
      } catch (error: any) {
        console.error("Gemini API Error:", error);
        throw new Error("Failed to generate AI response: " + (error.message || "Unknown error"));
      }
    },

    async generateStructuredResponse<T>(
      prompt: string,
      schema: string,
      options?: LLMOptions
    ): Promise<T> {
      try {
        // Use systemInstruction for better JSON compliance
        const model = options?.model 
          ? genAI.getGenerativeModel({ 
              model: options.model,
              systemInstruction: "You are a helpful assistant that responds ONLY with valid JSON. Never include explanations, markdown formatting, or any text outside the JSON object."
            })
          : genAI.getGenerativeModel({ 
              model: modelName,
              systemInstruction: "You are a helpful assistant that responds ONLY with valid JSON. Never include explanations, markdown formatting, or any text outside the JSON object."
            });

        // The prompt already contains instructions, and systemInstruction handles JSON-only requirement
        // Add the schema reference to ensure proper format
        const fullPrompt = options?.systemPrompt 
          ? `${options.systemPrompt}\n\n${prompt}\n\nSchema to match:\n${schema}`
          : `${prompt}\n\nSchema to match:\n${schema}`;
        
        const generationConfig: any = {
          temperature: options?.temperature ?? 0.3,
        };
        if (options?.maxTokens !== undefined) {
          generationConfig.maxOutputTokens = options.maxTokens;
        }

        const result = await model.generateContent({
          contents: [{ parts: [{ text: fullPrompt }] }],
          generationConfig,
        });
        
        const response = await result.response;
        const text = response.text();
        
        // Log the raw response for debugging (first 500 chars)
        console.log("[LLM] Raw Gemini response:", text.substring(0, 500));
        
        // Extract JSON from response (handle cases where model adds markdown)
        let jsonText = text.trim();
        
        // Try to extract JSON from markdown code blocks first
        const jsonInMarkdown = text.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonInMarkdown) {
          jsonText = jsonInMarkdown[1].trim();
        } else {
          // Try to extract JSON from plain code blocks
          const jsonInCode = text.match(/```\s*([\s\S]*?)\s*```/);
          if (jsonInCode) {
            jsonText = jsonInCode[1].trim();
          } else {
            // Try to find JSON object in the text
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              jsonText = jsonMatch[0];
            }
          }
        }
        
        // If the response looks like it contains prompt instructions, it's an error
        if (jsonText.includes("REQUIREMENTS:") || jsonText.includes("RESPONSE SCHEMA:") || jsonText.includes("You are a PostgreSQL")) {
          console.error("[LLM] Error: LLM returned prompt instructions instead of JSON response");
          throw new Error("LLM returned prompt instructions instead of JSON response. This may indicate an API issue or invalid model configuration.");
        }
        
        try {
          const parsed = JSON.parse(jsonText);
          
          // Validate that we got a proper response
          if (!parsed || typeof parsed !== 'object') {
            throw new Error("Parsed JSON is not an object");
          }
          
          return parsed;
        } catch (parseError: any) {
          console.error("[LLM] JSON parse error. Attempted to parse:", jsonText.substring(0, 1000));
          throw new Error(`Failed to parse JSON response: ${parseError.message}. Response preview: ${jsonText.substring(0, 200)}...`);
        }
      } catch (error: any) {
        console.error("Gemini Structured Response Error:", error);
        
        // Check for quota/rate limit errors
        if (error.status === 429 || 
            error.message?.includes("429") || 
            error.message?.includes("quota") || 
            error.message?.includes("rate limit") ||
            error.message?.includes("Too Many Requests")) {
          const quotaError = new Error(
            "AI service quota exceeded. The free tier has been reached. Please try again later or upgrade your API plan."
          );
          (quotaError as any).isQuotaError = true;
          (quotaError as any).retryAfter = error.message?.match(/retry.*?(\d+)/i)?.[1] || null;
          throw quotaError;
        }
        
        if (error.message?.includes("404") || error.message?.includes("not found")) {
          throw new Error(
            "Gemini API Error: Model not found. Please check your GEMINI_API_KEY and model name."
          );
        }
        
        // If it's already our custom error, re-throw it
        if (error.message?.includes("LLM returned prompt instructions")) {
          throw error;
        }
        
        throw new Error("Failed to generate AI response: " + (error.message || "Unknown error"));
      }
    },
  };
}

/**
 * OpenAI (GPT) Provider Implementation
 * Only loaded when LLM_PROVIDER=openai
 */
function getOpenAIProvider(): LLMProvider {
  // Check if we're actually using OpenAI before loading the package
  const provider = (process.env.LLM_PROVIDER || "gemini").toLowerCase();
  if (!["openai", "gpt"].includes(provider)) {
    throw new Error("OpenAI provider should only be loaded when LLM_PROVIDER=openai");
  }

  let OpenAI: any;
  
  try {
    OpenAI = require("openai");
  } catch (e) {
    throw new Error(
      "OpenAI package not installed. Run: npm install openai\n" +
      "Or switch to Gemini: LLM_PROVIDER=gemini"
    );
  }

  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set in environment variables");
  }

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const defaultModel = process.env.OPENAI_MODEL || "gpt-4o-mini";

  return {
    async generateCompletion(prompt: string, options?: LLMOptions): Promise<string> {
      try {
        const response = await openai.chat.completions.create({
          model: options?.model || defaultModel,
          messages: [
            ...(options?.systemPrompt ? [{ role: "system", content: options.systemPrompt }] : []),
            { role: "user", content: prompt },
          ],
          temperature: options?.temperature ?? 0.7,
          max_tokens: options?.maxTokens,
        });

        return response.choices[0]?.message?.content || "";
      } catch (error: any) {
        console.error("OpenAI API Error:", error);
        throw new Error("Failed to generate AI response: " + (error.message || "Unknown error"));
      }
    },

    async generateStructuredResponse<T>(
      prompt: string,
      schema: string,
      options?: LLMOptions
    ): Promise<T> {
      try {
        // Parse schema to create function calling format
        let responseFormat: any = { type: "json_object" };
        
        // Try to use function calling for better structured responses
        // For GPT-4 and newer models, use JSON mode
        const model = options?.model || defaultModel;
        const useJsonMode = model.includes("gpt-4") || model.includes("o1");

        const messages: any[] = [
          ...(options?.systemPrompt 
            ? [{ role: "system", content: `${options.systemPrompt}\n\nYou must respond with valid JSON matching this schema:\n${schema}` }]
            : [{ role: "system", content: `You must respond with valid JSON matching this schema:\n${schema}` }]
          ),
          { role: "user", content: prompt },
        ];

        const response = await openai.chat.completions.create({
          model,
          messages,
          temperature: options?.temperature ?? 0.3, // Lower temp for structured responses
          max_tokens: options?.maxTokens,
          response_format: useJsonMode ? responseFormat : undefined,
        });

        const text = response.choices[0]?.message?.content || "";
        
        // Extract JSON if wrapped in markdown
        const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/\{[\s\S]*\}/);
        const jsonText = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : text;
        
        return JSON.parse(jsonText);
      } catch (error: any) {
        console.error("OpenAI Structured Response Error:", error);
        throw new Error("Failed to generate AI response: " + (error.message || "Unknown error"));
      }
    },
  };
}

/**
 * Anthropic (Claude) Provider Implementation
 * Only loaded when LLM_PROVIDER=anthropic
 */
function getAnthropicProvider(): LLMProvider {
  // Check if we're actually using Anthropic before loading the package
  const provider = (process.env.LLM_PROVIDER || "gemini").toLowerCase();
  if (!["anthropic", "claude"].includes(provider)) {
    throw new Error("Anthropic provider should only be loaded when LLM_PROVIDER=anthropic");
  }

  let Anthropic: any;
  
  try {
    Anthropic = require("@anthropic-ai/sdk");
  } catch (e) {
    throw new Error(
      "Anthropic SDK not installed. Run: npm install @anthropic-ai/sdk\n" +
      "Or switch to Gemini: LLM_PROVIDER=gemini"
    );
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not set in environment variables");
  }

  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const defaultModel = process.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-20241022";

  return {
    async generateCompletion(prompt: string, options?: LLMOptions): Promise<string> {
      try {
        const response = await anthropic.messages.create({
          model: options?.model || defaultModel,
          max_tokens: options?.maxTokens || 1024,
          temperature: options?.temperature ?? 0.7,
          messages: [
            ...(options?.systemPrompt ? [{ role: "user", content: options.systemPrompt }] : []),
            { role: "user", content: prompt },
          ],
        });

        return response.content[0].type === "text" 
          ? response.content[0].text 
          : "";
      } catch (error: any) {
        console.error("Anthropic API Error:", error);
        throw new Error("Failed to generate AI response: " + (error.message || "Unknown error"));
      }
    },

    async generateStructuredResponse<T>(
      prompt: string,
      schema: string,
      options?: LLMOptions
    ): Promise<T> {
      try {
        const fullPrompt = `${prompt}\n\nRespond with valid JSON matching this schema:\n${schema}\n\nReturn ONLY the JSON, no additional text.`;

        const response = await anthropic.messages.create({
          model: options?.model || defaultModel,
          max_tokens: options?.maxTokens || 4096,
          temperature: options?.temperature ?? 0.3,
          messages: [
            ...(options?.systemPrompt 
              ? [{ role: "user", content: `${options.systemPrompt}\n\nYou must respond with valid JSON.` }]
              : []
            ),
            { role: "user", content: fullPrompt },
          ],
        });

        const text = response.content[0].type === "text" 
          ? response.content[0].text 
          : "";
        
        // Extract JSON if wrapped in markdown
        const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/\{[\s\S]*\}/);
        const jsonText = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : text;
        
        return JSON.parse(jsonText);
      } catch (error: any) {
        console.error("Anthropic Structured Response Error:", error);
        throw new Error("Failed to generate AI response: " + (error.message || "Unknown error"));
      }
    },
  };
}

/**
 * Custom/Fine-tuned Model Provider Implementation
 * 
 * Supports:
 * - ✅ Hugging Face Inference API (free & paid)
 * - ✅ Fine-tuned OpenAI models (ft:gpt-...)
 * - ✅ Self-hosted models (LLaMA, Mistral, etc.)
 * - ✅ OpenAI-compatible endpoints (LocalAI, Ollama, etc.)
 * 
 * Examples:
 * - Hugging Face: CUSTOM_LLM_API_URL=https://api-inference.huggingface.co/models/your-model
 * - Local LLaMA: CUSTOM_LLM_API_URL=http://localhost:8080/v1
 * - Fine-tuned GPT: CUSTOM_LLM_API_URL=https://api.openai.com/v1 + CUSTOM_LLM_MODEL=ft:gpt-4o-...
 */
function getCustomProvider(): LLMProvider {
  const apiUrl = process.env.CUSTOM_LLM_API_URL || process.env.OPENAI_API_BASE;
  const apiKey = process.env.CUSTOM_LLM_API_KEY || process.env.OPENAI_API_KEY;
  const defaultModel = process.env.CUSTOM_LLM_MODEL || "gpt-4o-mini";
  const isHuggingFace = apiUrl?.includes("huggingface.co");

  if (!apiUrl || !apiKey) {
    throw new Error(
      "CUSTOM_LLM_API_URL and CUSTOM_LLM_API_KEY must be set for custom provider\n\n" +
      "Examples:\n" +
      "  Hugging Face: CUSTOM_LLM_API_URL=https://api-inference.huggingface.co/models/your-model\n" +
      "  Local: CUSTOM_LLM_API_URL=http://localhost:8080/v1\n" +
      "  Fine-tuned: CUSTOM_LLM_API_URL=https://api.openai.com/v1\n"
    );
  }

  // Hugging Face uses simple fetch, others use OpenAI client
  let client: any = null;

  if (!isHuggingFace) {
    // Use OpenAI-compatible client for non-HF endpoints
    let OpenAI: any;
    
    try {
      OpenAI = require("openai");
    } catch (e) {
      throw new Error(
        "OpenAI package required for custom endpoints (except Hugging Face).\n" +
        "Run: npm install openai\n" +
        "Or use Hugging Face API directly"
      );
    }

    client = new OpenAI({
      apiKey: apiKey,
      baseURL: apiUrl, // Custom base URL
    });
  }

  return {
    async generateCompletion(prompt: string, options?: LLMOptions): Promise<string> {
      try {
        // Hugging Face Inference API
        if (isHuggingFace) {
          const response = await fetch(apiUrl!, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              inputs: prompt,
              parameters: {
                temperature: options?.temperature ?? 0.7,
                max_new_tokens: options?.maxTokens || 1024,
                return_full_text: false,
              },
            }),
          });

          if (!response.ok) {
            const error = await response.text();
            throw new Error(`Hugging Face API error (${response.status}): ${error}`);
          }

          const data = await response.json();
          return Array.isArray(data) ? data[0]?.generated_text || "" : data.generated_text || "";
        }

        // OpenAI-compatible endpoint
        const response = await client.chat.completions.create({
          model: options?.model || defaultModel,
          messages: [
            ...(options?.systemPrompt ? [{ role: "system", content: options.systemPrompt }] : []),
            { role: "user", content: prompt },
          ],
          temperature: options?.temperature ?? 0.7,
          max_tokens: options?.maxTokens,
        });

        return response.choices[0]?.message?.content || "";
      } catch (error: any) {
        console.error("Custom LLM API Error:", error);
        throw new Error("Failed to generate AI response: " + (error.message || "Unknown error"));
      }
    },

    async generateStructuredResponse<T>(
      prompt: string,
      schema: string,
      options?: LLMOptions
    ): Promise<T> {
      try {
        const fullPrompt = `${prompt}\n\nRespond with ONLY valid JSON (no markdown, no explanations) matching this schema:\n${schema}`;

        // Hugging Face Inference API
        if (isHuggingFace) {
          const response = await fetch(apiUrl!, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              inputs: fullPrompt,
              parameters: {
                temperature: options?.temperature ?? 0.3,
                max_new_tokens: options?.maxTokens || 2048,
                return_full_text: false,
              },
            }),
          });

          if (!response.ok) {
            const error = await response.text();
            throw new Error(`Hugging Face API error (${response.status}): ${error}`);
          }

          const data = await response.json();
          const text = Array.isArray(data) ? data[0]?.generated_text || "" : data.generated_text || "";
          
          // Extract JSON if wrapped in markdown
          const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/\{[\s\S]*\}/);
          const jsonText = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : text;
          
          return JSON.parse(jsonText);
        }

        // OpenAI-compatible endpoint
        const messages: any[] = [
          ...(options?.systemPrompt 
            ? [{ role: "system", content: `${options.systemPrompt}\n\nYou must respond with valid JSON matching this schema:\n${schema}` }]
            : [{ role: "system", content: `You must respond with valid JSON matching this schema:\n${schema}` }]
          ),
          { role: "user", content: prompt },
        ];

        const response = await client.chat.completions.create({
          model: options?.model || defaultModel,
          messages,
          temperature: options?.temperature ?? 0.3,
          max_tokens: options?.maxTokens || 4096,
          response_format: { type: "json_object" }, // Use JSON mode if supported
        });

        const text = response.choices[0]?.message?.content || "";
        
        // Extract JSON if wrapped in markdown
        const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/\{[\s\S]*\}/);
        const jsonText = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : text;
        
        return JSON.parse(jsonText);
      } catch (error: any) {
        console.error("Custom LLM Structured Response Error:", error);
        throw new Error("Failed to generate AI response: " + (error.message || "Unknown error"));
      }
    },
  };
}

// Export singleton instance
let llmProviderInstance: LLMProvider | null = null;

export function getLLMProviderInstance(): LLMProvider {
  if (!llmProviderInstance) {
    llmProviderInstance = getLLMProvider();
  }
  return llmProviderInstance;
}

// Convenience functions for backward compatibility
export async function generateCompletion(prompt: string, options?: LLMOptions): Promise<string> {
  return getLLMProviderInstance().generateCompletion(prompt, options);
}

export async function generateStructuredResponse<T>(
  prompt: string,
  schema: string,
  options?: LLMOptions
): Promise<T> {
  return getLLMProviderInstance().generateStructuredResponse<T>(prompt, schema, options);
}

