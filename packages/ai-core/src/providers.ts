export type LLMProviderId = 'claude' | 'openai' | 'deepseek' | 'ollama';

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMRequest {
  provider: LLMProviderId;
  model: string;
  messages: LLMMessage[];
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
}

export interface LLMResponse {
  content: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  raw?: unknown;
}

export interface LLMProvider {
  id: LLMProviderId;
  complete(req: LLMRequest): Promise<LLMResponse>;
}