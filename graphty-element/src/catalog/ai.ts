/**
 * @file The AI catalogue: the assistant's providers, their models and keys, and the stages its
 * status reports, as plain data.
 *
 * The provider classes need a DOM and three LLM SDKs, so they live behind
 * `@graphty/graphty-element/ai`. A settings screen only needs the facts about them -- which
 * providers exist, whether one needs a key and what that key looks like, which models it offers
 * and whether each can call the assistant's tools -- and those live here, where Node can read
 * them. The providers read the same tables (`VercelAiProvider`'s default models,
 * `WebLlmProvider`'s model list), and `ProviderType` is {@link AiProviderId}, so the catalogue
 * and the providers cannot disagree.
 *
 * Neutral facts only: no placeholder text, no labels, no display order. An application writes its
 * own words keyed by id and arranges the providers as it likes.
 */

/** Every state an AI command's status passes through (`AiStatus.state`). */
export const AI_STATES = Object.freeze(["ready", "submitted", "streaming", "executing", "error"] as const);

/** Every stage within processing (`AiStatus.stage`). */
export const AI_STAGES = Object.freeze(["processing", "generating", "executing"] as const);

/** Every status a tool call passes through (`ToolCallStatus.status`). */
export const AI_TOOL_CALL_STATUSES = Object.freeze(["pending", "executing", "complete", "error"] as const);

/** Every AI provider id the element accepts (`ProviderType`). */
export const AI_PROVIDER_IDS = Object.freeze(["openai", "anthropic", "google", "webllm", "mock"] as const);

/** One AI provider id. */
export type AiProviderId = (typeof AI_PROVIDER_IDS)[number];

/** What a provider's API keys look like. */
export interface AiKeyShape {
    /** The prefix every key starts with, when the provider has one. */
    readonly prefix?: string;
    /** The fewest characters a key can have. */
    readonly minLength: number;
}

/** One model a provider offers. */
export interface AiModelDescriptor {
    /** The model id passed as `ProviderOptions.model`. */
    readonly id: string;
    /** The model's own name. */
    readonly plainName: string;
    /** Whether the model can call the assistant's tools; one that cannot answers in text only. */
    readonly supportsTools: boolean;
    /** Approximate download size in megabytes, for a model that runs in the browser. */
    readonly downloadMB?: number;
}

/** One AI provider. */
export interface AiProviderDescriptor {
    /** The provider id, as `createProvider` and the key store take it. */
    readonly id: AiProviderId;
    /** The provider's own name. */
    readonly plainName: string;
    /** Whether the provider needs an API key. */
    readonly requiresKey: boolean;
    /** What its keys look like; absent for a provider that takes none. */
    readonly keyShape?: AiKeyShape;
    /** Whether the model runs in this browser rather than on the provider's servers. */
    readonly runsLocally: boolean;
    /** Whether the provider is a scripted stand-in for tests rather than a real model. */
    readonly testOnly: boolean;
    /** The model used when `ProviderOptions.model` is not set. */
    readonly defaultModel: string;
    /** The models the element knows this provider offers. Any other model id may still be configured. */
    readonly models: readonly AiModelDescriptor[];
}

const WEBLLM_DEFAULT_MODEL = "Llama-3.2-1B-Instruct-q4f32_1-MLC";

/**
 * Every AI provider the element ships, in no particular order.
 *
 * WebLLM's `supportsTools` mirrors WebLLM's exported `functionCallingModelIds`, which cannot be
 * read here without loading the whole optional package; test/ai/providers/WebLlmProvider.test.ts
 * checks every entry against that export.
 */
export const AI_PROVIDER_DESCRIPTORS: readonly AiProviderDescriptor[] = Object.freeze([
    {
        id: "openai",
        plainName: "OpenAI",
        requiresKey: true,
        keyShape: { prefix: "sk-", minLength: 21 },
        runsLocally: false,
        testOnly: false,
        defaultModel: "gpt-4o",
        models: [{ id: "gpt-4o", plainName: "GPT-4o", supportsTools: true }],
    },
    {
        id: "anthropic",
        plainName: "Anthropic",
        requiresKey: true,
        keyShape: { prefix: "sk-ant-", minLength: 21 },
        runsLocally: false,
        testOnly: false,
        defaultModel: "claude-haiku-4-5-20251001",
        models: [{ id: "claude-haiku-4-5-20251001", plainName: "Claude Haiku 4.5", supportsTools: true }],
    },
    {
        id: "google",
        plainName: "Google",
        requiresKey: true,
        keyShape: { minLength: 11 },
        runsLocally: false,
        testOnly: false,
        defaultModel: "gemini-3.8-flash",
        models: [{ id: "gemini-3.8-flash", plainName: "Gemini 3.8 Flash", supportsTools: true }],
    },
    {
        id: "webllm",
        plainName: "WebLLM",
        requiresKey: false,
        runsLocally: true,
        testOnly: false,
        defaultModel: WEBLLM_DEFAULT_MODEL,
        models: [
            { id: WEBLLM_DEFAULT_MODEL, plainName: "Llama 3.2 1B", supportsTools: false, downloadMB: 500 },
            {
                id: "Llama-3.2-3B-Instruct-q4f32_1-MLC",
                plainName: "Llama 3.2 3B",
                supportsTools: false,
                downloadMB: 1500,
            },
            {
                id: "Phi-3.5-mini-instruct-q4f16_1-MLC",
                plainName: "Phi 3.5 Mini",
                supportsTools: false,
                downloadMB: 2000,
            },
            {
                id: "Qwen2.5-1.5B-Instruct-q4f16_1-MLC",
                plainName: "Qwen 2.5 1.5B",
                supportsTools: false,
                downloadMB: 800,
            },
            {
                id: "SmolLM2-360M-Instruct-q4f16_1-MLC",
                plainName: "SmolLM2 360M",
                supportsTools: false,
                downloadMB: 200,
            },
            {
                id: "Hermes-3-Llama-3.1-8B-q4f16_1-MLC",
                plainName: "Hermes 3 Llama 3.1 8B",
                supportsTools: true,
                downloadMB: 4500,
            },
            {
                id: "Hermes-2-Pro-Mistral-7B-q4f16_1-MLC",
                plainName: "Hermes 2 Pro Mistral 7B",
                supportsTools: true,
                downloadMB: 4000,
            },
        ],
    },
    {
        id: "mock",
        plainName: "Mock",
        requiresKey: false,
        runsLocally: true,
        testOnly: true,
        defaultModel: "mock",
        models: [{ id: "mock", plainName: "Mock", supportsTools: true }],
    },
]);

/**
 * The descriptor of one AI provider.
 * @param id - The provider id.
 * @returns The provider's descriptor.
 */
export function aiProviderDescriptor(id: AiProviderId): AiProviderDescriptor {
    const found = AI_PROVIDER_DESCRIPTORS.find((entry) => entry.id === id);
    if (!found) {
        throw new Error(`Unknown AI provider: ${id}`);
    }

    return found;
}

/** Why a key does not have the shape of its provider's keys. */
export type AiKeyShapeCode = "E_KEY_EMPTY" | "E_KEY_PREFIX" | "E_KEY_TOO_SHORT";

/** The verdict of {@link checkApiKeyShape}. */
export type AiKeyShapeCheck =
    | { readonly valid: true }
    | { readonly valid: false; readonly code: "E_KEY_EMPTY"; readonly params: Record<string, never> }
    | { readonly valid: false; readonly code: "E_KEY_PREFIX"; readonly params: { readonly prefix: string } }
    | { readonly valid: false; readonly code: "E_KEY_TOO_SHORT"; readonly params: { readonly minLength: number } };

/**
 * Whether a key has the shape of a provider's keys, without calling the provider. A key of the
 * right shape can still be refused; `LlmProvider.validateApiKey` asks the provider itself.
 * @param id - The provider the key is for.
 * @param key - The key.
 * @returns `{ valid: true }`, or the code saying what is wrong and its parameters.
 */
export function checkApiKeyShape(id: AiProviderId, key: string): AiKeyShapeCheck {
    const shape = aiProviderDescriptor(id).keyShape;
    if (key.length === 0) {
        return { valid: false, code: "E_KEY_EMPTY", params: {} };
    }

    if (shape?.prefix !== undefined && !key.startsWith(shape.prefix)) {
        return { valid: false, code: "E_KEY_PREFIX", params: { prefix: shape.prefix } };
    }

    if (shape && key.length < shape.minLength) {
        return { valid: false, code: "E_KEY_TOO_SHORT", params: { minLength: shape.minLength } };
    }

    return { valid: true };
}

/**
 * Every code an AI command's result carries (`ExecutionResult.code` from `aiCommand()`), with
 * the facts it states in `ExecutionResult.params`. Switch on the code and write your own words;
 * `ExecutionResult.message` is English for a log and may change in any release.
 *
 * Succeeded (`success: true`):
 * - `AI_COMPLETED` -- the model answered, running every tool it called. `{ toolCalls }`: how many ran.
 * - `AI_NO_RESPONSE` -- the model wrote nothing and called no tool.
 *
 * Failed (`success: false`):
 * - `AI_NOT_ENABLED` -- the assistant is not switched on (`enableAiControl()` not called).
 * - `AI_DISPOSED` -- the assistant was shut down.
 * - `AI_KEY_MISSING` -- the provider needs an API key and has none. `{ provider }`.
 * - `AI_KEY_REJECTED` -- the provider refused the key (HTTP 401 or 403). `{ provider, status }`.
 * - `AI_PROVIDER_ERROR` -- the provider or the network failed. `{ provider }`, and `{ status }`
 *   when the provider answered with an HTTP status.
 * - `AI_CANCELLED` -- the command was cancelled (`cancelAiCommand()`); what it changed is taken back.
 * - `AI_UNDONE` -- the command was undone while it ran; what it changed is taken back.
 * - `AI_TOOL_UNKNOWN` -- the model called a tool that does not exist. `{ tool }`.
 * - `AI_TOOL_INVALID_ARGUMENTS` -- the model called a tool with arguments it refused. `{ tool }`.
 * - `AI_TOOL_FAILED` -- a tool ran and reported failure. `{ tool }`.
 * - `AI_TOOL_THREW` -- a tool threw; what the command changed is taken back. `{ tool }`.
 * - `AI_FAILED` -- anything else went wrong while the command ran.
 */
export const AI_RESULT_CODES = Object.freeze([
    "AI_COMPLETED",
    "AI_NO_RESPONSE",
    "AI_NOT_ENABLED",
    "AI_DISPOSED",
    "AI_KEY_MISSING",
    "AI_KEY_REJECTED",
    "AI_PROVIDER_ERROR",
    "AI_CANCELLED",
    "AI_UNDONE",
    "AI_TOOL_UNKNOWN",
    "AI_TOOL_INVALID_ARGUMENTS",
    "AI_TOOL_FAILED",
    "AI_TOOL_THREW",
    "AI_FAILED",
] as const);

/** One AI command result code; see {@link AI_RESULT_CODES}. */
export type AiResultCode = (typeof AI_RESULT_CODES)[number];

/** The facts an AI command result states, keyed by name; which ones each code carries is listed in {@link AI_RESULT_CODES}. */
export type AiResultParams = Readonly<Record<string, string | number>>;
