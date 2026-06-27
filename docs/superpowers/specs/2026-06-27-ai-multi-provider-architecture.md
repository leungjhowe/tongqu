# AI Multi-Provider Architecture

- **Status**: draft
- **Date**: 2026-06-27
- **Author**: designer-agent
- **Scope**: `@tps/ai-core` provider layer + node-level model binding in `@tps/desktop`

---

## §1. Goals & Constraints

### Goals

1. **Multiple LLM providers** — first-class support for Claude, OpenAI, DeepSeek, and Ollama.
2. **Node-level model binding** — every node in a `WorkflowGraph` declares which model powers its chat; the same graph can mix Claude for analysis with a local Ollama model for drafting.
3. **Config-file driven registry** — providers and model IDs are declared in a JSON/TOML file, not hardcoded in TypeScript. Adding a new model (e.g. `claude-opus-4`) is a one-line config change, not a redeploy.
4. **Runtime provider factory** — given a model ID, resolve the right `LLMProvider` instance on demand, with cached client construction.
5. **Backwards compatibility** — the existing `ClaudeProvider` API (`new ClaudeProvider(key).complete(req)`) keeps working; `createLLMCompiler(provider)` in `workflow-compiler.ts` keeps its single-arg signature.

### Non-goals (this iteration)

- Streaming responses (token-by-token). Out of scope — add in §8 as a follow-up.
- Tool-use / function-calling. Provider-agnostic abstraction is deferred.
- Server-side proxy. The desktop webview calls provider SDKs directly with `dangerouslyAllowBrowser: true` (already established in `providers.ts:78`).
- Multi-modal inputs (images, PDFs).

### Constraints

- **Tauri 2 desktop** runtime — `@anthropic-ai/sdk` is currently used browser-side via `dangerouslyAllowBrowser: true` (`packages/ai-core/src/providers.ts:78`). All four providers follow the same pattern.
- **Workspace is a pnpm monorepo** — new SDK deps go in `packages/ai-core/package.json` so `@tps/desktop` re-exports them transitively.
- **No server in this stack** — no API gateway, no proxy. Each client hits its provider directly. CORS / auth headers are baked into the SDKs already.
- **Existing surface area is small** — only one consumer today (`apps/desktop/src/pages/WorkspaceProject.tsx:79`). Refactors here are safe.

---

## §2. Config File Format

### Location

`apps/desktop/ai.config.json` — sits next to `package.json`, picked up by Vite's static-asset import (`import config from "@/ai.config.json"`). Committed to the repo so a fresh clone works; user secrets (API keys) are resolved at runtime from `localStorage` / Tauri keychain, **never** written into the config file.

If we want zero-key onboarding later, swap to `.toml` and load via `smol-toml` — but JSON is enough for v1 and matches existing project style.

### Example — `apps/desktop/ai.config.json`

```json
{
  "$schema": "./ai.config.schema.json",
  "version": 1,
  "defaultModel": "claude-sonnet-4",
  "providers": {
    "claude": {
      "type": "anthropic",
      "apiKeyEnv": "ANTHROPIC_API_KEY",
      "baseUrl": null
    },
    "openai": {
      "type": "openai",
      "apiKeyEnv": "OPENAI_API_KEY",
      "baseUrl": null
    },
    "deepseek": {
      "type": "openai-compatible",
      "apiKeyEnv": "DEEPSEEK_API_KEY",
      "baseUrl": "https://api.deepseek.com"
    },
    "ollama": {
      "type": "ollama",
      "apiKeyEnv": null,
      "baseUrl": "http://localhost:11434"
    }
  },
  "models": [
    {
      "id": "claude-sonnet-4",
      "provider": "claude",
      "model": "claude-sonnet-4-20250514",
      "displayName": "Claude Sonnet 4",
      "contextWindow": 200000,
      "capabilities": ["chat", "vision"]
    },
    {
      "id": "claude-haiku-4",
      "provider": "claude",
      "model": "claude-haiku-4-20250514",
      "displayName": "Claude Haiku 4",
      "contextWindow": 200000,
      "capabilities": ["chat"]
    },
    {
      "id": "gpt-4o",
      "provider": "openai",
      "model": "gpt-4o",
      "displayName": "GPT-4o",
      "contextWindow": 128000,
      "capabilities": ["chat", "vision"]
    },
    {
      "id": "gpt-4o-mini",
      "provider": "openai",
      "model": "gpt-4o-mini",
      "displayName": "GPT-4o mini",
      "contextWindow": 128000,
      "capabilities": ["chat"]
    },
    {
      "id": "deepseek-chat",
      "provider": "deepseek",
      "model": "deepseek-chat",
      "displayName": "DeepSeek-V3",
      "contextWindow": 64000,
      "capabilities": ["chat"]
    },
    {
      "id": "deepseek-reasoner",
      "provider": "deepseek",
      "model": "deepseek-reasoner",
      "displayName": "DeepSeek-R1",
      "contextWindow": 64000,
      "capabilities": ["chat", "reasoning"]
    },
    {
      "id": "llama3.1-local",
      "provider": "ollama",
      "model": "llama3.1",
      "displayName": "Llama 3.1 (本地)",
      "contextWindow": 8192,
      "capabilities": ["chat"]
    },
    {
      "id": "qwen2.5-local",
      "provider": "ollama",
      "model": "qwen2.5",
      "displayName": "Qwen 2.5 (本地)",
      "contextWindow": 32768,
      "capabilities": ["chat"]
    }
  ]
}
```

### Field semantics

| Field | Type | Meaning |
|---|---|---|
| `version` | `1` | Schema version. Bump if shape changes; loader can migrate. |
| `defaultModel` | model id | Used when a node has no explicit model binding (§4). |
| `providers.<id>.type` | `'anthropic' \| 'openai' \| 'openai-compatible' \| 'ollama'` | Selects which `LLMProvider` class to instantiate. |
| `providers.<id>.apiKeyEnv` | `string \| null` | Environment variable name holding the key. `null` = no key required (Ollama). The factory falls back to `localStorage.tps-ai-provider-key-<id>` if env var is unset (see §8). |
| `providers.<id>.baseUrl` | `string \| null` | Override the SDK's default endpoint. Required for DeepSeek; ignored by Anthropic. |
| `models[].id` | string | Stable identifier referenced by `WorkflowNode.params.model`. Must be unique. |
| `models[].provider` | provider id | Foreign key into `providers`. |
| `models[].model` | string | Actual model string passed to the upstream API (e.g. `'claude-sonnet-4-20250514'`). Distinct from `id` so we can rename display without breaking wire format. |
| `models[].displayName` | string | Shown in the dropdown UI. |
| `models[].contextWindow` | number | Informational — used to truncate inputs in a future phase. |
| `models[].capabilities` | `string[]` | `'chat' \| 'vision' \| 'reasoning' \| ...` — UI filter hints. |

### Load semantics

- **Loaded once at app startup**, not on every provider call. The loader runs inside a `useEffect` in the desktop shell (or eagerly in `@tps/ai-core`'s entry module) and stashes the parsed config in a module-level singleton.
- **No hot-reload in v1.** Edits to `ai.config.json` require a `pnpm tauri:dev` restart. Hot-reload is tracked as an open question in §8.
- **Validation** uses a hand-rolled type guard (`isAiConfig(x): x is AiConfig`) at the loader boundary — no need to pull in Zod for ~30 lines of shape.

---

## §3. Model Registry & Provider Factory

### TypeScript surface — new file `packages/ai-core/src/registry.ts`

```ts
import type { LLMProvider, LLMProviderId } from './providers';

export interface ProviderConfig {
  type: 'anthropic' | 'openai' | 'openai-compatible' | 'ollama';
  apiKeyEnv: string | null;
  baseUrl: string | null;
}

export interface ModelDef {
  id: string;
  provider: LLMProviderId;
  model: string;
  displayName: string;
  contextWindow: number;
  capabilities: string[];
}

export interface AiConfig {
  version: 1;
  defaultModel: string;
  providers: Record<LLMProviderId, ProviderConfig>;
  models: ModelDef[];
}
```

### Factory functions

```ts
/** Resolve modelId → ModelDef. Throws if not in registry. */
export function findModel(config: AiConfig, modelId: string): ModelDef;

/** All models — for the dropdown UI. Optionally filtered by capability. */
export function listModels(
  config: AiConfig,
  filter?: { capability?: string; providerId?: LLMProviderId }
): ModelDef[];

/** Construct (or return cached) LLMProvider for a given model. */
export function getProvider(
  config: AiConfig,
  modelId: string
): LLMProvider;

/** The module-level singleton — set once at app boot via setConfig(). */
export function setConfig(config: AiConfig): void;
export function getConfig(): AiConfig;
export function getProviderForModel(modelId: string): LLMProvider; // uses singleton
```

### Caching strategy

- A `Map<string, LLMProvider>` keyed by `${providerId}:${apiKeyHash}` lives in `registry.ts`. Two requests for `claude-sonnet-4` with the same stored key return the **same** `ClaudeProvider` instance (and therefore the same SDK client). This is important — `Anthropic` client construction is non-trivial and the SDK is happy to be reused.
- When `apiKeyEnv` resolves to an env var, the hash includes the key bytes (first 8 chars + length, never the full key) so a key change invalidates the cache automatically.
- Ollama bypasses the hash (no key) — `OllamaProvider` is cached once.
- `setConfig()` clears the cache. We never mutate config in place.

### Loader module — `packages/ai-core/src/config-loader.ts`

```ts
import aiConfig from './ai.config.json'; // vite handles JSON import
import type { AiConfig } from './registry';

let cached: AiConfig | null = null;

export function loadConfig(): AiConfig {
  if (cached) return cached;
  if (!isAiConfig(aiConfig)) {
    throw new Error('Invalid ai.config.json — see docs/superpowers/specs/2026-06-27-ai-multi-provider-architecture.md §2');
  }
  cached = aiConfig;
  setConfig(cached);
  return cached;
}
```

`packages/ai-core/src/index.ts` re-exports `loadConfig`, `getProviderForModel`, `listModels`, `findModel`, plus all existing `ClaudeProvider` / `LLMProvider` / `LLMMessage` symbols.

---

## §4. Node-Level Model Binding

### Where the model lives

`WorkflowNode.params` already exists (`packages/workflow-core/src/types/index.ts:7`) as a `Record<string, unknown>` — no schema change needed. We use a reserved key:

```ts
params: {
  // existing node-specific fields
  content: "...",
  model: "claude-sonnet-4",   // ← reserved key, ignored by execute.ts
  // ...
}
```

The reserved key is documented in the spec; runtime ignores any `params.model` when executing the graph (`packages/workflow-core/src/execute.ts`) since it's metadata only. The chat handler in `WorkspaceProject.tsx` is the only consumer that reads it.

### Resolution order in `WorkspaceProject.handleNodeChat` (replaces lines 71–98)

```ts
import { getConfig, getProviderForModel } from '@tps/ai-core';

const config = getConfig();
const modelId = (currentNode?.params?.model as string) ?? config.defaultModel;

let aiContent: string;
try {
  const provider = getProviderForModel(modelId);
  const messages: LLMMessage[] = [/* unchanged */];
  const res = await provider.complete({
    provider: provider.id,
    model: modelId,         // registry resolves to wire model internally
    messages,
    maxTokens: 512,
  });
  aiContent = res.content;
} catch (err) {
  aiContent = `AI 回复失败：${err instanceof Error ? err.message : '未知错误'}`;
}
```

A subtle but important detail: `provider.complete()`'s `req.model` currently takes the **wire model string** (`claude-sonnet-4-20250514`), not the registry id (`claude-sonnet-4`). To avoid leaking the registry id into the wire format, the provider implementation looks up the actual wire model from the singleton config. Concretely:

- `ClaudeProvider.complete({ model: 'claude-sonnet-4', ... })` — internally calls `findModel(config, 'claude-sonnet-4').model` → `'claude-sonnet-4-20250514'`.
- This means `req.model` becomes the **registry id** going forward; the wire mapping happens inside the provider. Backward-compat: if the registry has no entry for the id, fall back to passing `req.model` verbatim (covers existing callers passing the wire model directly, like `createLLMCompiler` at `workflow-compiler.ts:36`).

### Backward compatibility

- Nodes with **no** `params.model` → use `config.defaultModel`. Today `WorkspaceProject.tsx:90` hardcodes `claude-sonnet-4-20250514`; after refactor it falls back to `config.defaultModel` (`"claude-sonnet-4"`).
- Nodes with **stale** `params.model` (registry id not in config) → log a warning to console, fall back to `defaultModel`. Better than crashing mid-chat.
- `createLLMCompiler(provider)` in `workflow-compiler.ts:23` keeps its current shape. It can be migrated in a follow-up PR to use `getProviderForModel("claude-sonnet-4")` instead of receiving a provider directly.

---

## §5. Per-Provider Implementations

### Common base — `packages/ai-core/src/providers/base.ts`

```ts
import type { LLMProvider, LLMRequest, LLMResponse, LLMMessage } from './types';
import { findModel, getConfig } from '../registry';

export abstract class BaseProvider implements LLMProvider {
  abstract readonly id: LLMProvider['id'];
  protected abstract send(req: ResolvedRequest): Promise<LLMResponse>;

  async complete(req: LLMRequest): Promise<LLMResponse> {
    // Resolve registry id → wire model. Pass-through if unknown.
    let wireModel = req.model;
    try {
      wireModel = findModel(getConfig(), req.model).model;
    } catch {
      // req.model is already a wire-format string (legacy callers)
    }
    return this.send({ ...req, model: wireModel });
  }
}

interface ResolvedRequest extends LLMRequest {
  // wire-format model guaranteed by BaseProvider
}
```

This keeps each concrete provider focused on the actual SDK call and the request/response shape translation.

### `ClaudeProvider` — refactor of existing impl

- File: `packages/ai-core/src/providers/claude.ts`
- Inherits `BaseProvider`, overrides `send()`.
- Constructor unchanged in spirit: `new ClaudeProvider(apiKey?)`. API key resolution order:
  1. constructor arg
  2. `process.env[config.providers.claude.apiKeyEnv]` (i.e. `ANTHROPIC_API_KEY`)
  3. `localStorage['tps-ai-provider-key-claude']` (provider-scoped, see §8)
- SDK: `@anthropic-ai/sdk` already in `packages/ai-core/package.json:22`.
- Implementation: extract from `providers.ts:62-122`, no behavior change. The fallback to `'claude-sonnet-4-20250514'` when `model` is empty (line 93) goes away — the base provider guarantees resolution.

### `OpenAIProvider` — new

- File: `packages/ai-core/src/providers/openai.ts`
- Dep: `openai` (^4.x) — add to `packages/ai-core/package.json`.
- `send()` maps:
  - `req.messages[0].role === 'system'` → `messages[0]` of OpenAI Chat Completions (`role: 'system'`).
  - `req.temperature`, `req.maxTokens` → `temperature`, `max_tokens`.
- Response: extract `choices[0].message.content`, map `usage.{prompt_tokens, completion_tokens, total_tokens}`.
- `dangerouslyAllowBrowser: true` in the constructor — same pattern as Claude.

### `DeepSeekProvider` — new

- File: `packages/ai-core/src/providers/deepseek.ts`
- **Does not subclass `OpenAIProvider`** — keep them siblings. Reason: DeepSeek's `baseUrl` routing lives in provider config, not subclass behavior; subclassing would force an `isDeepSeek` branch in every method.
- Internally instantiates `new OpenAI({ apiKey, baseURL: config.providers.deepseek.baseUrl, dangerouslyAllowBrowser: true })`. That's it — DeepSeek's API is OpenAI Chat Completions wire-compatible.
- Inherits `BaseProvider`, overrides `send()` with the same body as `OpenAIProvider.send()` minus the base URL (which is already baked into the client).
- **DRY note**: factor a `chatCompletionsSend(openai, req)` helper into `providers/openai-shared.ts` so both providers reuse the message mapping. Single source of truth for Chat Completions translation.

### `OllamaProvider` — new

- File: `packages/ai-core/src/providers/ollama.ts`
- No SDK dep — uses `fetch` against `config.providers.ollama.baseUrl` (default `http://localhost:11434`).
- Endpoint: `POST {baseUrl}/api/chat` with `{ model, messages: [...], stream: false }`.
- Response: `{ message: { role, content }, ... }`. No `usage` block — Ollama's `/api/show` endpoint reports tokens but we skip it for v1; just return `undefined` for usage.
- No api key; constructor takes the baseUrl from config.
- **Optional optimization** (deferred): discover installed models at startup via `GET /api/tags` and cross-check the registry — flag a model as `available: false` in the UI if not pulled locally. This is §8's "open question."

### Public exports — `packages/ai-core/src/index.ts`

```ts
export * from './providers';          // existing ClaudeProvider, types
export * from './providers/base';     // BaseProvider
export * from './providers/openai';
export * from './providers/deepseek';
export * from './providers/ollama';
export * from './registry';           // AiConfig, ModelDef, factory functions
export * from './config-loader';      // loadConfig()
```

---

## §6. UI / Interaction Design

### Model selector in `NodeDetailPanel`

Add a new row above the existing `参数` section (currently `NodeDetailPanel.tsx:139`). Layout:

```
┌─ 标题栏 (type tag + node.title) ────── [×] ┐
├─ 模型: [Claude Sonnet 4 ▾]                 ┤   ← new
├─ 参数                                     ┤
│   content → ...                           ┤
├─ 对话                                     ┤
│   ...                                     ┤
└─ [输入...]                          [➤]  ┘
```

Component: `ModelSelector` (new file `apps/desktop/src/components/workflow/ModelSelector.tsx`).

- Receives `currentModelId: string | undefined` and `onChange(modelId: string)`.
- Internally calls `listModels(getConfig())` to populate a `<select>` (styled with the project's `text-micro` + `bg-secondary` look — match the input at `NodeDetailPanel.tsx:196`).
- Groups options by `provider.displayName` using `<optgroup>`.
- On change, calls back into the parent which mutates `node.params.model` via `setGraph`.

### Wiring back into `WorkspaceProject`

`NodeDetailPanel` gains two new props:
- `availableModels: ModelDef[]` — passed from the page (already loaded via `loadConfig()` in a top-level `useEffect`).
- `onModelChange: (modelId: string) => void` — mutates the graph in `WorkspaceProject`.

The `handleNodeChat` refactor (§4) reads `params.model` at call time, so the UI change and the resolution change are decoupled.

### Error surfacing

Two error paths, two surfaces:

| Error | Surface |
|---|---|
| Provider not in registry (`getProviderForModel('foo')` throws) | Inline above chat input: `未知模型: foo` + button to pick from dropdown. |
| Missing API key at request time | Same place: `未配置 {provider} API Key。[打开设置]` (link to settings panel — Phase 4 placeholder for now). |
| Provider SDK error (4xx/5xx) | Rendered as an `ai` chat message (`AI 回复失败：…`) — same as today's behavior at `WorkspaceProject.tsx:96`. Don't crash the panel. |
| Network unreachable (Ollama down) | Distinct message: `无法连接本地 Ollama (http://localhost:11434)。请确认 Ollama 正在运行。` |

No toast / modal popups in v1 — keep the chat panel self-contained.

### Future: settings panel

Phase 4 (deferred) — `apps/desktop/src/pages/Settings.tsx` mounted at `/app/settings`. Out of scope for this spec but reserved as the destination for the "open settings" link above. Renders the live `AiConfig`, lets the user edit API keys per provider (writes back to `localStorage.tps-ai-provider-key-<id>`), and triggers `setConfig()` to clear the provider cache.

---

## §7. Build / Phasing Plan

Each phase is a self-contained PR. File targets are **specific** — by the end of Phase 3 the system should work end-to-end with all 4 providers.

### Phase 1 — Registry skeleton + OpenAI stub

**Goal**: prove the registry pattern; ship config file + factory; one new provider (OpenAI) compiles but doesn't ship user-facing.

| File | Change |
|---|---|
| `apps/desktop/ai.config.json` | New. Contents from §2. |
| `packages/ai-core/src/registry.ts` | New. `AiConfig`, `ModelDef`, `findModel`, `listModels`, `setConfig`, `getConfig`, `getProviderForModel`. |
| `packages/ai-core/src/providers/base.ts` | New. `BaseProvider` with registry-id → wire-model resolution. |
| `packages/ai-core/src/providers/openai.ts` | New. Real `OpenAIProvider` impl using `openai` SDK. |
| `packages/ai-core/src/providers/claude.ts` | Extract from `providers.ts:62-122`, inherit `BaseProvider`. Delete the old `ClaudeProvider` from `providers.ts` (keep types). |
| `packages/ai-core/src/providers/types.ts` | Move `LLMProvider`, `LLMRequest`, `LLMResponse`, `LLMMessage`, `LLMProviderId` here. `providers.ts` re-exports for backwards compat. |
| `packages/ai-core/src/config-loader.ts` | New. `loadConfig()` + `isAiConfig` guard. |
| `packages/ai-core/src/index.ts` | Re-export new modules. |
| `packages/ai-core/package.json` | Add `openai: ^4.50.0`. |

Commit: `feat(ai-core): registry + provider factory + OpenAI + Claude refactor`

### Phase 2 — DeepSeek + Ollama providers

**Goal**: complete provider coverage. No UI changes yet; selectable via direct calls.

| File | Change |
|---|---|
| `packages/ai-core/src/providers/openai-shared.ts` | New. `chatCompletionsSend(openai, req)` helper. |
| `packages/ai-core/src/providers/deepseek.ts` | New. `DeepSeekProvider` extending `BaseProvider`, reusing `chatCompletionsSend` with a `baseURL`-configured `OpenAI` client. |
| `packages/ai-core/src/providers/ollama.ts` | New. `OllamaProvider` extending `BaseProvider`, `fetch`-based against `/api/chat`. |
| `packages/ai-core/src/index.ts` | Re-export `DeepseekProvider`, `OllamaProvider`. |

Commit: `feat(ai-core): add DeepSeek + Ollama providers`

### Phase 3 — Node-level model binding in `WorkspaceProject`

**Goal**: the existing chat panel works against any model the user picks; default falls back to config.

| File | Change |
|---|---|
| `apps/desktop/src/pages/WorkspaceProject.tsx` | Replace `handleNodeChat` lines 71–98 per §4. Add `availableModels` + `onModelChange` plumbing. Boot `loadConfig()` in a top-level `useEffect`. |
| `apps/desktop/src/components/workflow/ModelSelector.tsx` | New. Dropdown component. |
| `apps/desktop/src/components/workflow/NodeDetailPanel.tsx` | Insert `ModelSelector` above `参数` section (around line 139). Accept `availableModels`, `currentModelId`, `onModelChange` props. |

Commit: `feat(desktop): per-node model selector + registry-backed chat`

### Phase 4 — Settings panel + provider error UX

**Goal**: user-facing config; no more DevTools console for API keys.

| File | Change |
|---|---|
| `apps/desktop/src/pages/Settings.tsx` | New. Renders form for each provider's API key + baseUrl override; calls `setConfig()` after edits. |
| `apps/desktop/src/router/index.tsx` | Add `<Route path="settings" element={<Settings />} />`. |
| `apps/desktop/src/components/shell/Sidebar.tsx` (if present) | Add a settings nav item. |
| `apps/desktop/src/components/workflow/ModelSelector.tsx` | Surface "未配置 Key" inline state. |
| `apps/desktop/src/pages/WorkspaceProject.tsx` | Replace console-hint at line 76 with a toast + "打开设置" link. |

Commit: `feat(desktop): settings panel for AI provider config`

---

## §8. Open Questions / Risks

### API key storage

Today `getStoredApiKey()` reads `localStorage.tps-ai-provider-key` (`providers.ts:35-47`) — a single, un-scoped slot. After this change we need **per-provider** keys, plus a place for the `baseUrl` override (DeepSeek) and future proxies.

Decision for v1: namespace by provider, i.e. `localStorage['tps-ai-provider-key-claude']`, `…-openai`, `…-deepseek`. Ollama stores its baseUrl at `…-ollama-baseurl`. Migration: read the legacy `tps-ai-provider-key` once, write it to `…-claude`, delete the old key.

Long-term: Tauri 2 ships `@tauri-apps/plugin-stronghold` for OS-keychain-backed secrets. Tracked as a follow-up — out of scope for this spec, but the key-resolution helper in `ClaudeProvider`'s constructor should be a single function (`resolveApiKey(providerId)`) so swapping the backend is one PR.

### Per-node key override

Should a node be able to declare its **own** API key (e.g. for testing a colleague's key without touching global config)? Out of scope — `params.model` is a model-id reference, not a credential bundle. If we want it later, store at `params._modelKeyOverride` and treat as ephemeral (never persisted to disk in the project file).

### Caching for Ollama model discovery

Ollama can pull / delete models out-of-band. Stale "available" flags in the dropdown would mislead users. Three options:

1. **Lazy probe** — when the user picks an Ollama model, `GET /api/show` to confirm before sending. Adds one round-trip on selection.
2. **Background refresh** — poll `/api/tags` every N minutes. Tighter UX but extra plumbing.
3. **On-error only** — assume available; if the request 404s on the model name, surface a "model not pulled locally — run `ollama pull llama3.1`" error.

Recommend (3) for v1 — minimum surface area, error UX already covers the failure mode. Revisit if user feedback says the dropdown is misleading.

### Hot-reload of config during dev

Not supported in v1. The `ai.config.json` is bundled by Vite at build time; editing it after `vite` is running requires a restart. A proper hot-reload implementation would:

- Read the file at runtime via Tauri's `fs` plugin instead of `import`.
- Watch for changes via `fs.watch` or chokidar.
- Call `setConfig()` from a `useEffect` cleanup.

Defer until there's a real dev-loop pain point. Until then, the `pnpm tauri:dev` restart cost is < 5 seconds.

### Provider-specific gotchas

- **Anthropic** uses a separate `system` param (`providers.ts:88-89` already handles this). Keep it.
- **OpenAI** system messages live in `messages[0]` with `role: 'system'`. The shared `chatCompletionsSend` must filter / reorder.
- **DeepSeek** supports the same Chat Completions shape but its `reasoner` model (`deepseek-reasoner`) has a different token-pricing model and may emit reasoning content separately. For v1, strip any `<thinking>` tags from response content if present — revisit when we add a reasoning-capable UI affordance.
- **Ollama** `num_ctx` defaults to 2048 regardless of the model's actual context window — `models[].contextWindow` in the config is aspirational until we pass `options: { num_ctx }` in the request body. Add this in a follow-up.

### Test coverage

`packages/ai-core` has no test setup today (no `vitest` dep, no `*.test.ts` files). The factory pattern is highly testable — recommend adding Vitest in Phase 1 with at least:

- `findModel` lookup (hit / miss / default fallback)
- `getProvider` cache hit / cache invalidation on `setConfig`
- `BaseProvider.complete` registry-id → wire-model resolution

Provider SDK integration tests can be deferred — they're network-dependent and flaky in CI.

---

## Appendix — file:line citation index

- `packages/ai-core/src/providers.ts:1-123` — current `LLMProvider` interface and `ClaudeProvider` impl to be refactored.
- `packages/ai-core/src/providers.ts:35-55` — single-slot API key storage to be migrated to per-provider keys.
- `packages/ai-core/src/providers.ts:62-82` — `ClaudeProvider` lazy client construction pattern to preserve.
- `packages/ai-core/src/providers.ts:84-122` — `ClaudeProvider.complete()` to extract into `providers/claude.ts`.
- `packages/ai-core/src/workflow-compiler.ts:23-52` — `createLLMCompiler`; signature unchanged in this spec.
- `packages/ai-core/src/index.ts:1-2` — re-export surface to extend.
- `packages/ai-core/package.json:22` — `@anthropic-ai/sdk` already present; `openai` to be added.
- `packages/workflow-core/src/types/index.ts:3-9` — `WorkflowNode.params: Record<string, unknown>`; no schema change required.
- `apps/desktop/src/pages/WorkspaceProject.tsx:7` — current hardcoded `ClaudeProvider` import.
- `apps/desktop/src/pages/WorkspaceProject.tsx:71-98` — chat handler to be refactored for registry lookup.
- `apps/desktop/src/pages/WorkspaceProject.tsx:90` — hardcoded `'claude-sonnet-4-20250514'` to become `params.model ?? defaultModel`.
- `apps/desktop/src/components/workflow/NodeDetailPanel.tsx:139` — insertion point for `ModelSelector`.
- `apps/desktop/src/components/shell/NewProjectModal.tsx:1-92` — modal styling reference for future Settings panel.
- `apps/desktop/src/router/index.tsx:25-42` — router; settings route added in Phase 4.
- `package.json:1-35` — workspace config; no top-level changes needed.