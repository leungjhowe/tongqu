import type { WorkflowGraph } from '@tps/workflow-core';
import type { LLMProvider } from './providers';

export interface CompileRequest {
  naturalLanguage: string;
  context?: { availableNodes?: string[]; projectId?: string };
}

export interface CompileResult {
  graph: WorkflowGraph;
  explanation: string;
  confidence?: number;
}

export interface WorkflowCompiler {
  compile(req: CompileRequest): Promise<CompileResult>;
}

/**
 * Default compiler: calls the LLM with a system prompt instructing it to
 * output a WorkflowGraph JSON. The caller must inject a real provider.
 */
export function createLLMCompiler(provider: LLMProvider): WorkflowCompiler {
  return {
    async compile(req) {
      const messages = [
        {
          role: 'system' as const,
          content:
            'You are a workflow compiler. Translate the user request into a WorkflowGraph JSON. Respond with JSON only.',
        },
        { role: 'user' as const, content: req.naturalLanguage },
      ];
      const res = await provider.complete({
        provider: 'claude',
        model: 'claude-sonnet',
        messages,
      });
      // Naive parse — real impl would validate with zod.
      try {
        const parsed = JSON.parse(res.content) as WorkflowGraph;
        return { graph: parsed, explanation: 'compiled', confidence: 0.5 };
      } catch {
        return {
          graph: { id: 'empty', name: 'empty', nodes: [], edges: [] },
          explanation: 'failed to parse LLM output',
          confidence: 0,
        };
      }
    },
  };
}