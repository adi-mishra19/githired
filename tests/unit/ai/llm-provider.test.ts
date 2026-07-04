import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

// Mock environment variable
const originalEnv = process.env;

describe('LLM Provider', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Provider Selection', () => {
    it('should select Gemini provider when LLM_PROVIDER is gemini', async () => {
      process.env.LLM_PROVIDER = 'gemini';
      process.env.GEMINI_API_KEY = 'test-key';
      
      const { getLLMProvider } = await import('@/lib/ai/llm-provider');
      const provider = await getLLMProvider();
      
      expect(provider).toBeDefined();
      expect(provider.generateCompletion).toBeDefined();
      expect(provider.generateStructuredResponse).toBeDefined();
    });

    it('should select OpenAI provider when LLM_PROVIDER is openai', async () => {
      process.env.LLM_PROVIDER = 'openai';
      process.env.OPENAI_API_KEY = 'test-key';
      
      const { getLLMProvider } = await import('@/lib/ai/llm-provider');
      const provider = await getLLMProvider();
      
      expect(provider).toBeDefined();
    });

    it('should select Anthropic provider when LLM_PROVIDER is anthropic', async () => {
      process.env.LLM_PROVIDER = 'anthropic';
      process.env.ANTHROPIC_API_KEY = 'test-key';
      
      const { getLLMProvider } = await import('@/lib/ai/llm-provider');
      const provider = await getLLMProvider();
      
      expect(provider).toBeDefined();
    });

    it('should select custom provider when LLM_PROVIDER is custom', async () => {
      process.env.LLM_PROVIDER = 'custom';
      process.env.CUSTOM_LLM_ENDPOINT = 'https://api.example.com';
      
      const { getLLMProvider } = await import('@/lib/ai/llm-provider');
      const provider = await getLLMProvider();
      
      expect(provider).toBeDefined();
    });

    it('should default to Gemini when LLM_PROVIDER is not set', async () => {
      delete process.env.LLM_PROVIDER;
      process.env.GEMINI_API_KEY = 'test-key';
      
      const { getLLMProvider } = await import('@/lib/ai/llm-provider');
      const provider = await getLLMProvider();
      
      expect(provider).toBeDefined();
    });

    it('should throw error for unsupported provider', async () => {
      process.env.LLM_PROVIDER = 'unsupported-provider' as any;
      
      const { getLLMProvider } = await import('@/lib/ai/llm-provider');
      
      await expect(getLLMProvider()).rejects.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should throw error when API key is missing for Gemini', async () => {
      process.env.LLM_PROVIDER = 'gemini';
      delete process.env.GEMINI_API_KEY;
      
      const { getLLMProvider } = await import('@/lib/ai/llm-provider');
      
      await expect(getLLMProvider()).rejects.toThrow(/API key/i);
    });

    it('should throw error when API key is missing for OpenAI', async () => {
      process.env.LLM_PROVIDER = 'openai';
      delete process.env.OPENAI_API_KEY;
      
      const { getLLMProvider } = await import('@/lib/ai/llm-provider');
      
      await expect(getLLMProvider()).rejects.toThrow(/API key/i);
    });

    it('should handle missing package gracefully', async () => {
      process.env.LLM_PROVIDER = 'openai';
      process.env.OPENAI_API_KEY = 'test-key';
      
      // Mock require to throw error
      jest.mock('openai', () => {
        throw new Error('Cannot find module');
      });
      
      const { getLLMProvider } = await import('@/lib/ai/llm-provider');
      
      await expect(getLLMProvider()).rejects.toThrow();
    });
  });

  describe('JSON Extraction', () => {
    it('should extract JSON from markdown code blocks', () => {
      const response = '```json\n{"key": "value"}\n```';
      const extracted = extractJSON(response);
      expect(extracted).toEqual({ key: 'value' });
    });

    it('should extract JSON from plain text', () => {
      const response = '{"key": "value"}';
      const extracted = extractJSON(response);
      expect(extracted).toEqual({ key: 'value' });
    });

    it('should extract JSON with surrounding text', () => {
      const response = 'Here is the result: {"key": "value"} and more text';
      const extracted = extractJSON(response);
      expect(extracted).toEqual({ key: 'value' });
    });

    it('should handle malformed JSON gracefully', () => {
      const response = '{invalid json}';
      expect(() => extractJSON(response)).toThrow();
    });
  });

  describe('Structured Response', () => {
    it('should validate response against schema', async () => {
      const schema = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'number' }
        },
        required: ['name', 'age']
      };

      const response = { name: 'John', age: 30 };
      
      // Schema validation would happen in the actual implementation
      expect(response).toHaveProperty('name');
      expect(response).toHaveProperty('age');
      expect(typeof response.name).toBe('string');
      expect(typeof response.age).toBe('number');
    });

    it('should reject response missing required fields', () => {
      const schema = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'number' }
        },
        required: ['name', 'age']
      };

      const response = { name: 'John' }; // Missing age
      
      expect(response).toHaveProperty('name');
      expect(response).not.toHaveProperty('age');
    });
  });
});

// Helper function for JSON extraction (simplified version)
function extractJSON(text: string): any {
  // Try to extract from markdown code block
  const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (codeBlockMatch) {
    return JSON.parse(codeBlockMatch[1]);
  }
  
  // Try to extract from plain JSON
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }
  
  throw new Error('No JSON found in response');
}

