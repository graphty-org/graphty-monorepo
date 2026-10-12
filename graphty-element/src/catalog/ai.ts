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

/**
 * Every tool the assistant can use beyond its own commands (`AiToolOptions`): a web search and
 * reading a given web page, both run by the provider, and running a program the model writes in a
 * sandbox in the page. OPEN UNION: ids may be added in a minor release.
 */
export const AI_HOSTED_TOOL_IDS = Object.freeze(["web-search", "web-fetch", "in-page-code"] as const);

/** One tool beyond the assistant's own commands; see {@link AI_HOSTED_TOOL_IDS}. OPEN UNION. */
export type AiHostedToolId = (typeof AI_HOSTED_TOOL_IDS)[number];

/**
 * Whether a provider and model can use a tool: `"available"`; `"unsupported"` (no such tool);
 * `"results-not-returned"` (the provider runs it, but does not hand its results back, so the
 * assistant does not offer it); `"unknown"`. OPEN UNION: statuses may be added in a minor release.
 */
export type AiCapabilityStatus = "available" | "unsupported" | "results-not-returned" | "unknown";

/** Each tool beyond the assistant's own commands, and whether it can be used. */
export type AiToolCapabilities = Readonly<Record<AiHostedToolId, AiCapabilityStatus>>;

/** What the assistant can use with a provider and model (`getAiCapabilities()`). */
export interface AiCapabilities {
    /** The provider: one of `AI_PROVIDER_IDS`, or the `name` of a provider instance of your own. */
    readonly provider: AiProviderId | (string & {}); // NOSONAR(S4335): the open-union idiom
    /** The model id; empty when a provider instance of your own does not say. */
    readonly model: string;
    /** Each tool, and whether it can be used. */
    readonly tools: AiToolCapabilities;
}

/**
 * Which tools each provider offers, for its every model. In-page code runs in the page whatever
 * model wrote it; it is still unavailable where the page forbids WebAssembly, which only the
 * running page can tell (`getAiCapabilities()`). Web fetch on Google is URL context, whose
 * results the provider does not hand back.
 */
export const AI_HOSTED_TOOL_CAPABILITIES: Readonly<Record<AiProviderId, AiToolCapabilities>> = Object.freeze({
    openai: { "web-search": "available", "web-fetch": "unsupported", "in-page-code": "available" },
    anthropic: { "web-search": "available", "web-fetch": "available", "in-page-code": "available" },
    google: { "web-search": "available", "web-fetch": "results-not-returned", "in-page-code": "available" },
    webllm: { "web-search": "unsupported", "web-fetch": "unsupported", "in-page-code": "available" },
    mock: { "web-search": "unsupported", "web-fetch": "unsupported", "in-page-code": "available" },
});

/**
 * The models whose provider runs no web search for them (audio, codex, search-preview and o1
 * models, the oldest chat models, some pro and fast tiers), as each provider's model list says;
 * test/ai/engine/tanstack/capabilities.test.ts checks this against those lists. First match wins.
 */
const NO_WEB_TOOLS: readonly (readonly [AiProviderId, RegExp])[] = [
    ["openai", /^(?:gpt-3\.5|gpt-4(?:-turbo)?(?:$|-\d)|o1(?:$|-)|computer-use|codex-)|codex|audio|search-preview/],
    ["openai", /^gpt-(?:5\.6|6)-[a-z]+-pro(?:$|-)/],
    ["anthropic", /^claude-opus-5-fast/],
];

/**
 * Whether a provider and model can use a tool, as {@link AI_HOSTED_TOOL_CAPABILITIES} lists it,
 * except for a model the provider runs no web tool for. A model no list names has its provider's
 * status.
 * @param provider - The provider.
 * @param model - The model id.
 * @param tool - The tool.
 * @returns Its status.
 */
export function aiHostedToolStatus(provider: AiProviderId, model: string, tool: AiHostedToolId): AiCapabilityStatus {
    const status = AI_HOSTED_TOOL_CAPABILITIES[provider][tool];
    const web = tool === "web-search" || tool === "web-fetch";
    return web && status === "available" && NO_WEB_TOOLS.some(([p, pattern]) => p === provider && pattern.test(model))
        ? "unsupported"
        : status;
}

/**
 * One provider's voice: whether it transcribes speech and speaks text, and with which model.
 * `viaChatModel` marks transcription done by the configured chat model itself (Google), so no
 * `model` is named. A provider with neither can still be spoken to through browser recognition,
 * or through another provider's transcription (`AiVoiceOptions.transcription`).
 */
export interface AiProviderVoice {
    /** Speech to text through the provider. */
    readonly transcription: {
        readonly status: AiCapabilityStatus;
        /** The default transcription model; absent when the chat model transcribes or there is none. */
        readonly model?: string;
        /** True when the configured chat model transcribes, in one chat turn with the audio. */
        readonly viaChatModel?: boolean;
    };
    /** Text to speech through the provider. */
    readonly speech: {
        readonly status: AiCapabilityStatus;
        /** The default speech model; absent when there is none. */
        readonly model?: string;
    };
}

const NO_PROVIDER_VOICE: AiProviderVoice = {
    transcription: { status: "unsupported" },
    speech: { status: "unsupported" },
};

/**
 * What each provider does with speech. Google's speech model is marked experimental upstream.
 * Anthropic transcribes nothing itself; set `AiVoiceOptions.transcription` to send its readers'
 * speech to another provider.
 */
export const AI_VOICE_CAPABILITIES: Readonly<Record<AiProviderId, AiProviderVoice>> = Object.freeze({
    openai: {
        transcription: { status: "available", model: "gpt-4o-mini-transcribe" },
        speech: { status: "available", model: "tts-1" },
    },
    google: {
        transcription: { status: "available", viaChatModel: true },
        speech: { status: "available", model: "gemini-3.1-flash-tts-preview" },
    },
    anthropic: NO_PROVIDER_VOICE,
    webllm: NO_PROVIDER_VOICE,
    mock: NO_PROVIDER_VOICE,
});

/** Which way speech goes: `"input"` (speech to text) or `"output"` (text to speech). */
export type AiVoiceDirection = "input" | "output";

/**
 * Whether a provider can carry one direction of speech itself: transcription for `"input"`,
 * speech for `"output"`, as {@link AI_VOICE_CAPABILITIES} lists it.
 * @param provider - The provider.
 * @param direction - Which way.
 * @returns Its status.
 */
export function aiVoiceStatus(provider: AiProviderId, direction: AiVoiceDirection): AiCapabilityStatus {
    const voice = AI_VOICE_CAPABILITIES[provider];
    return direction === "input" ? voice.transcription.status : voice.speech.status;
}

/**
 * How one direction of speech is carried (`AiVoicePath.path`): browser recognition or synthesis,
 * the provider, a model on the device, or nothing. OPEN UNION.
 */
export type AiVoiceRoute = "browser" | "provider" | "on-device" | "none";

/**
 * Whether one direction of speech can be used now (`AiVoicePath.status`): `"needs-permission"`
 * until the reader allows the microphone. OPEN UNION.
 */
export type AiVoiceReadiness = "ready" | "needs-permission" | "unavailable";

/**
 * Where the reader's audio, or the text to speak, goes (`AiVoicePath.destination`): stays on the
 * device, goes to the browser's vendor (Chrome's default recognition), or to the provider. OPEN
 * UNION.
 */
export type AiVoiceDestination = "on-device" | "browser-vendor" | "provider" | "none";

/**
 * Why speech cannot be used, the `reason` of `AI_VOICE_UNAVAILABLE`. OPEN UNION: reasons may be
 * added in a minor release.
 */
export const AI_VOICE_UNAVAILABLE_REASONS = Object.freeze([
    "no-recognition",
    "no-microphone",
    "permission-denied",
    "insecure-context",
    "no-provider-transcription",
    "no-provider-speech",
    "no-key",
    "no-synthesis",
    "playback-failed",
] as const);

/** One reason speech cannot be used; see {@link AI_VOICE_UNAVAILABLE_REASONS}. OPEN UNION. */
export type AiVoiceUnavailableReason = (typeof AI_VOICE_UNAVAILABLE_REASONS)[number];

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
 *   A helper with web tools also states `{ hostedToolUses }` on its `delegate` result: how many
 *   searches and page reads ran, 0 when it answered from the model's own knowledge.
 * - `AI_NO_RESPONSE` -- the model wrote nothing and called no tool.
 *
 * Failed (`success: false`):
 * - `AI_NOT_ENABLED` -- the assistant is not switched on (`enableAiControl()` not called).
 * - `AI_DISPOSED` -- the assistant was shut down.
 * - `AI_KEY_MISSING` -- the provider needs an API key and has none. `{ provider }`.
 * - `AI_KEY_REJECTED` -- the provider refused the key (HTTP 401 or 403, or 400 from Google, which
 *   answers a wrong key that way). `{ provider, status }`.
 * - `AI_PROVIDER_ERROR` -- the provider or the network failed. `{ provider }`, and `{ status }`
 *   when the provider answered with an HTTP status.
 * - `AI_CANCELLED` -- the command was cancelled (`cancelAiCommand()`); what it changed is taken back.
 * - `AI_UNDONE` -- the command was undone while it ran; what it changed is taken back.
 * - `AI_TOOL_UNKNOWN` -- the model called a tool that does not exist. `{ tool }`.
 * - `AI_TOOL_INVALID_ARGUMENTS` -- the model called a tool with arguments it refused. `{ tool }`.
 * - `AI_TOOL_FAILED` -- a tool ran and reported failure, and the message's changes were taken
 *   back. `{ tool, cause, rolledBack }`: `cause` is the tool's own code (`AI_TOOL_CAUSE_CODES`),
 *   `rolledBack` how many of the message's batches were undone.
 * - `AI_TOOL_THREW` -- a tool threw; what the command changed is taken back. `{ tool }`, or
 *   `{ request }` from `resolveAiApproval`.
 * - `AI_CONFIRMATION_NEEDED` -- a change was held for the reader's approval and nothing of it
 *   happened. `{ gate, request }`: answer with `resolveAiApproval(request, { approve })`, which
 *   continues the message and resolves with its final result -- this code again, with a new
 *   request, when the change is held for another reason.
 * - `AI_QUESTION_ASKED` -- the model asked the reader a question and waits for the answer.
 *   `{ request }`: answer with `answerAiQuestion(request, answer)`, which continues the message and
 *   resolves with its final result.
 * - `AI_ANSWER_INVALID` -- an answer to a question is not one of its choices (or more than one
 *   for a question that takes one). `{ request }`: nothing continued and the question stays open;
 *   its choices are in `getPendingAiQuestions()`.
 * - `AI_CONFIG_INVALID` -- the assistant's configuration names something it cannot use (the
 *   code of an `AiConfigError` from `enableAiControl`), or a function router threw, returned no
 *   plan or a plan naming an unknown helper; nothing was sent. `{ agent, field, reason }`: the
 *   helper (absent for a setting of no one helper), the field (`"agents"`, `"name"`, `"purpose"`,
 *   `"commands"`, `"provider"`, `"model"`, `"classifierModel"`, `"router"`) and why
 *   (`"unknown-command"`, `"unknown-agent"`, `"duplicate"`, `"reserved"`, `"empty"`,
 *   `"too-long"`, `"too-many"`, `"unsupported"`, `"threw"`, `"invalid-plan"`), for an unknown
 *   command, `command`, and for a reason past a limit, `limit`. Field `"tools"` with reason
 *   `"web-tools-with-writes"`: a helper given web tools may also run commands that change the
 *   graph, which web content must not drive; with reason `"unsupported"`: a helper given web tools
 *   beside any command, on a provider whose searching turn cannot also call commands (Google).
 * - `AI_ROLLBACK_PARTIAL` -- taking the message back stopped at someone else's step. `{ steps }`.
 * - `AI_APPROVAL_STALE` -- a held change was not run because its request ended without a
 *   decision. `{ request, reason }`: `"graph-changed"` (answered after the graph changed; the
 *   model is told and answers), `"superseded"` (a new message or a new conversation came
 *   first), or `"expired"` (no such request is open).
 * - `AI_APPROVAL_DENIED` -- the reader declined a held change; the model is told and answers.
 *   `{ request }`.
 * - `AI_TOOL_DENIED_BY_POLICY` -- the host's approval policy refused a call, so none of its batch
 *   ran. `{ tool }`, and `reason`: `"parallel-helper"` for a call that does more than read a helper
 *   tried while other helpers ran beside it (helpers that run at once may only read);
 *   `"web-content"` for a call that does more than read, or a hand-off to a helper that fetches
 *   web pages, while the conversation holds web content (`AiToolOptions.webContentWrites`);
 *   `"in-page-code"` for a call that does more than read
 *   made from a program the model wrote (in-page code may only read).
 * - `AI_HOSTED_TOOL_UNSUPPORTED` -- a tool the configuration marks `required` cannot be used with
 *   this provider and model, so nothing was sent; it also states, on `ai-capability-unavailable`,
 *   that a tool was left out. `{ provider, model, tool }` (`AiHostedToolId`).
 * - `AI_PROVIDER_PAUSED` -- the provider stopped a turn that used one of its own tools before the
 *   model answered (a long search), and stopped again each time the turn was sent back to
 *   continue. `{ provider }`. What it found is not kept: asking again searches afresh.
 * - `AI_FAILED` -- anything else went wrong while the command ran.
 *
 * Carried by the voice events (`ai-voice-end`, `ai-speech-end`) rather than ending a command:
 * - `AI_VOICE_UNAVAILABLE` -- speech cannot be used. `{ path, reason }`: `path` is `"input"` or
 *   `"output"` ({@link AiVoiceDirection}), `reason` one of {@link AI_VOICE_UNAVAILABLE_REASONS}.
 *
 * Carried by saved conversations and the conversation events rather than ending a command:
 * - `AI_TOOL_NOT_RUN` -- a saved tool result: the call did not run, because an earlier call in its
 *   batch failed or the batch was taken back. `{ tool }`, and `reason`: `"held"` when a held batch
 *   of its turn kept it from running, `"limit"` for a hand-off past the turn's
 *   `MAX_HELPERS_PER_TURN`.
 * - `AI_HISTORY_UNAVAILABLE` -- saved history cannot be used. `{ reason }`: `"invalid-record"`
 *   for a saved conversation that is not a valid record (it is skipped, never thrown);
 *   `"storage-unavailable"` when the browser's storage cannot open, and history is kept in memory;
 *   `"unknown-conversation"` when `aiCommand` names a conversation that is not saved, or any
 *   conversation while the assistant keeps no history (nothing is sent).
 * - `AI_HISTORY_NEWER_FORMAT` -- a saved conversation was written by a newer release, in a format
 *   version this one cannot read; it is left untouched. `{ version }`.
 * - `AI_STORAGE_FAILED` -- saving the conversation failed (quota, private mode); it continues in
 *   memory. `{ reason }`: the error's name, such as `"QuotaExceededError"`. From
 *   `resolveAiApproval`, `{ request }`: the store could not record who runs the request, so
 *   nothing ran and the request stays open.
 *
 * OPEN UNION: codes may be added in a minor release. Handle a code you do not know, for example
 * by `success` alone.
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
    "AI_CONFIRMATION_NEEDED",
    "AI_ROLLBACK_PARTIAL",
    "AI_APPROVAL_STALE",
    "AI_APPROVAL_DENIED",
    "AI_TOOL_DENIED_BY_POLICY",
    "AI_TOOL_NOT_RUN",
    "AI_HISTORY_UNAVAILABLE",
    "AI_HISTORY_NEWER_FORMAT",
    "AI_STORAGE_FAILED",
    "AI_QUESTION_ASKED",
    "AI_ANSWER_INVALID",
    "AI_CONFIG_INVALID",
    "AI_HOSTED_TOOL_UNSUPPORTED",
    "AI_PROVIDER_PAUSED",
    "AI_VOICE_UNAVAILABLE",
] as const);

/**
 * One AI command result code; see {@link AI_RESULT_CODES}. OPEN UNION: codes may be added in a
 * minor release, so a `switch` over it needs a `default`.
 */
export type AiResultCode = (typeof AI_RESULT_CODES)[number];

/** The facts an AI command result states, keyed by name; which ones each code carries is listed in {@link AI_RESULT_CODES}. */
export type AiResultParams = Readonly<Record<string, string | number>>;

/** The `format` of a saved assistant conversation (an exported conversation's JSON). */
export const AI_CONVERSATION_FORMAT = "graphty-ai-conversation";

/**
 * The newest saved conversation format version this release writes and reads. A record of an
 * older version is upgraded when read; a newer one is left untouched (`AI_HISTORY_NEWER_FORMAT`).
 */
export const AI_CONVERSATION_FORMAT_VERSION = 1;
