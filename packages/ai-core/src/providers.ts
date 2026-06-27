import Anthropic from '@anthropic-ai/sdk';

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

/** localStorage key for storing the user's Claude API key. */
const STORAGE_KEY = 'tps-ai-provider-key';

/**
 * Get stored API key from localStorage (works in Tauri webview).
 * The user sets it via DevTools console or a settings UI in future.
 */
export function getStoredApiKey(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
}

export function storeApiKey(key: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, key);
  } catch {
    // localStorage unavailable — silently ignore
  }
}

/**
 * Claude provider — calls Anthropic API via the browser SDK.
 * Uses dangerouslyAllowBrowser: true because we're in a Tauri desktop
 * webview (not a public web page).
 */
export class ClaudeProvider implements LLMProvider {
  readonly id = 'claude' as const;
  private client: Anthropic | null = null;

  constructor(private apiKey?: string) {}

  private getClient(): Anthropic {
    if (!this.client) {
      const key = this.apiKey || getStoredApiKey();
      if (!key) {
        throw new Error(
          'Claude API key not set. Call storeApiKey("sk-...") or set localStorage.tps-ai-provider-key',
        );
      }
      this.client = new Anthropic({
        apiKey: key,
        dangerouslyAllowBrowser: true,
      });
    }
    return this.client;
  }

  async complete(req: LLMRequest): Promise<LLMResponse> {
    const client = this.getClient();

    // Map system message separately (Anthropic API uses a separate system param).
    const systemMsg = req.messages.find((m) => m.role === 'system');
    const nonSystemMessages = req.messages.filter((m) => m.role !== 'system');

    try {
      const msg = await client.messages.create({
        model: req.model || 'claude-sonnet-4-20250514',
        max_tokens: req.maxTokens ?? 4096,
        system: systemMsg?.content,
        messages: nonSystemMessages.map((m) => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content,
        })),
        temperature: req.temperature ?? 0.7,
      });

      // Extract text content from the response.
      const content = msg.content
        .filter((b) => b.type === 'text')
        .map((b) => (b as { text: string }).text)
        .join('\n');

      return {
        content,
        usage: {
          promptTokens: msg.usage?.input_tokens,
          completionTokens: msg.usage?.output_tokens,
          totalTokens: (msg.usage?.input_tokens ?? 0) + (msg.usage?.output_tokens ?? 0),
        },
        raw: msg,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`Claude API error: ${message}`);
    }
  }
}