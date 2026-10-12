/**
 * @file The engine seam: the one internal interface every model call goes through.
 *
 * An engine talks to a model for exactly one turn: it is handed the conversation so far and the
 * tools the model may call, and it streams back text, the tool calls the model asked for, usage
 * and a finish reason, or a coded error. It never runs a tool and never decides anything; the
 * loop (`runConversation`) and the tool executor own that. Every type here is graphty's own and
 * none is exported from a public entry point, so the framework underneath can change without a
 * consumer noticing (design/ai/tanstack-ai-harness-design.md, section 2.3).
 */

import type { z } from "zod";

import type { AiHostedToolId, AiProviderId, AiResultCode, AiResultParams } from "../../catalog/ai";
import type { ProviderState, SavedMessage, SavedPart } from "../conversation/formats/v1";

// One definition of a saved message: the saved conversation format's (formats/v1.ts).
export type { PartOrigin, ProviderState, SavedMessage, SavedPart } from "../conversation/formats/v1";

/** A JSON Schema object, as a provider's tool declaration takes it. */
export type JsonSchema = Readonly<Record<string, unknown>>;

/** Each envelope's own tags, in any case and spacing, which text inside it may not carry. */
const ENVELOPE_TAGS = {
    "graph-data": /<[\s/]*graph-data\s*>/gi,
    "web-content": /<[\s/]*web-content\s*>/gi,
} as const;

/**
 * Text in a fixed envelope the system prompt names as data, with every tag that would open or
 * close the envelope taken out (again until none is left, so a tag split by another cannot
 * reassemble), so text planted in it reads as data, never as an instruction.
 * @param tag - The envelope's tag.
 * @param text - The text.
 * @returns It, enveloped.
 */
function envelope(tag: keyof typeof ENVELOPE_TAGS, text: string): string {
    let inside = text;
    let before: string;
    do {
        before = inside;
        inside = inside.replaceAll(ENVELOPE_TAGS[tag], "");
    } while (inside !== before);

    return `<${tag}>\n${inside}\n</${tag}>`;
}

/**
 * Text read from the graph, as a model is shown it: in the `<graph-data>` envelope.
 * @param text - The text.
 * @returns It, enveloped.
 */
export function graphData(text: string): string {
    return envelope("graph-data", text);
}

/**
 * Text read on the web by a tool the provider ran, as a model is shown it: in the `<web-content>`
 * envelope.
 * @param text - The text.
 * @returns It, enveloped.
 */
export function webContent(text: string): string {
    return envelope("web-content", text);
}

/**
 * The text of a message's text parts as a model is shown it, a `graph-data` part (the facts block,
 * anything read from the graph) and a `web` part in their envelopes. Every engine flattens text
 * through this.
 * @param parts - The message's parts.
 * @returns The text.
 */
export function textOf(parts: readonly SavedPart[]): string {
    return parts
        .flatMap((part) => {
            if (part.type !== "text") {
                return [];
            }

            // Text from the graph or the web is data, never an instruction.
            if (part.origin === "graph-data") {
                return [graphData(part.text)];
            }

            return [part.origin === "web" ? webContent(part.text) : part.text];
        })
        .join("\n");
}

/**
 * A tool result as a model is shown it: in an envelope, since it carries labels, notes and values
 * read from the graph, or a helper's answer drawn from the web. Every engine sends tool results
 * through this.
 * @param part - The result.
 * @returns Its text.
 */
export function toolResultText(part: Extract<SavedPart, { type: "tool-result" }>): string {
    return part.origin === "web" ? webContent(part.content) : graphData(part.content);
}

/**
 * What one tool call did, as its result part records it: a command result's code, or
 * `AI_TOOL_NOT_RUN` (`{ tool }`) for a call that did not run because an earlier call in its batch
 * failed.
 */
export interface ToolResultOutcome {
    readonly code: AiResultCode;
    readonly params: AiResultParams;
}

/** One tool the model may call: a command's name, description and parameter schema. */
export interface ToolSpec {
    readonly name: string;
    readonly description: string;
    /** What the arguments are validated with. */
    readonly schema: z.ZodType;
    /** The same schema as JSON Schema, for an engine that declares tools to a provider API. */
    readonly jsonSchema: JsonSchema;
}

/** The tools a provider runs itself; in-page code runs in the page, not at the provider. */
export type EngineHostedTool = Exclude<AiHostedToolId, "in-page-code">;

/** One tool the provider runs itself, offered for a turn. */
export interface HostedToolRequest {
    readonly tool: EngineHostedTool;
    /** The provider's own cap on uses in the turn, where it has one. */
    readonly maxUses?: number;
    /** The only hosts the tool may reach. */
    readonly allowedDomains?: readonly string[];
}

/** A page a tool the provider ran found or read. */
export interface HostedToolSource {
    readonly url: string;
    readonly title?: string;
}

/** Everything one model turn needs. */
export interface TurnRequest {
    /** The model id; absent, or ignored by an engine that holds its own (an `LlmProvider`), the configured model. */
    readonly model?: string;
    readonly system: string;
    readonly messages: readonly SavedMessage[];
    readonly tools: readonly ToolSpec[];
    /** Tools the provider runs itself in the turn; absent, none. */
    readonly hostedTools?: readonly HostedToolRequest[];
    /** "none": answer in text now. The tools stay declared, since the history may hold their calls. */
    readonly toolMode: "auto" | "none";
    readonly maxOutputTokens?: number;
    readonly temperature?: number;
}

/**
 * Why a turn finished: `paused` when the provider stopped a turn that used one of its own tools
 * before the model answered; sending the turn back continues it.
 */
export type TurnFinishCode = "stop" | "tool-calls" | "paused";

/** What a turn streams back. */
export type TurnEvent =
    | { readonly type: "text"; readonly delta: string; readonly providerState?: ProviderState }
    | {
          readonly type: "tool-call";
          readonly id: string;
          readonly name: string;
          readonly arguments: Readonly<Record<string, unknown>>;
          /**
           * The model's argument text was not a JSON object (malformed, or cut off at the output
           * limit): `arguments` is empty, and the call is refused as invalid without running.
           */
          readonly invalidArguments?: true;
          readonly providerState?: ProviderState;
      }
    | {
          /** A tool the provider ran in the turn finished; never a call for the loop to run. */
          readonly type: "hosted-tool";
          readonly tool: EngineHostedTool;
          readonly status: "done" | "result-unavailable";
          readonly sources: readonly HostedToolSource[];
          /**
           * The call and its result as the provider wrote them, for an engine that sends them
           * back (a paused turn continues from them); opaque to everything else.
           */
          readonly providerState?: ProviderState;
      }
    | { readonly type: "usage"; readonly inputTokens: number; readonly outputTokens: number }
    | { readonly type: "finish"; readonly reason: TurnFinishCode }
    | {
          readonly type: "error";
          readonly code: AiResultCode;
          readonly params: AiResultParams;
          /**
           * What failed, already safe to hand on: name, message and stack with every credential
           * removed (`toSafeError`), plus the HTTP status. `AI_CANCELLED` means the turn's signal fired.
           */
          readonly cause: Error;
          /** Whether asking again may succeed: a rate limit, a server error, a lost connection. */
          readonly retryable?: boolean;
          /** How long the provider asked to wait before asking again, when it said. */
          readonly retryAfterMs?: number;
      };

/** A turn's error event. */
export type TurnError = Extract<TurnEvent, { type: "error" }>;

/** Whether something an engine might do is available, as a code. */
export type EngineCapabilityStatus = "available" | "unsupported";

/** What an engine can do with one model. */
export interface EngineCapabilities {
    readonly toolCalls: EngineCapabilityStatus;
    /** Each tool the provider runs itself, and whether this engine can offer it. */
    readonly hostedTools: Readonly<Record<EngineHostedTool, EngineCapabilityStatus>>;
}

/**
 * How a provider's own tools sit beside graphty's: the facts the engine-neutral core reads (which
 * web tools to offer, which helpers can run) instead of comparing provider names.
 */
export interface HostedToolLimits {
    /** Web search takes a domain filter (`allowedDomains`). */
    readonly searchDomainFilter: boolean;
    /** A turn that offers one of the provider's tools may also declare function tools. */
    readonly withFunctionTools: boolean;
}

/** The providers whose own tools are limited: Gemini's Google Search has no domain filter and no function tools beside it. */
const HOSTED_TOOL_LIMITS: ReadonlyMap<string, HostedToolLimits> = new Map([
    ["google", { searchDomainFilter: false, withFunctionTools: false }],
]);

/**
 * How a provider's own tools sit beside graphty's. The one place these facts live: the adapter
 * and the core both read them.
 * @param provider - The provider's name.
 * @returns Its limits; none for a provider not listed.
 */
export function hostedToolLimits(provider: string): HostedToolLimits {
    return HOSTED_TOOL_LIMITS.get(provider) ?? { searchDomainFilter: true, withFunctionTools: true };
}

/** No tool the provider runs itself. */
export const NO_HOSTED_TOOLS: EngineCapabilities["hostedTools"] = Object.freeze({
    "web-search": "unsupported",
    "web-fetch": "unsupported",
});

/** A coded outcome. */
export interface EngineOutcome {
    readonly code: AiResultCode;
    readonly params: AiResultParams;
}

/** The providers whose APIs the provider-API engine calls from the page. */
export type ProviderApiId = Exclude<AiProviderId, "webllm" | "mock">;

/**
 * What the provider-API engine reads before every turn: the provider's configuration as it is
 * now, so a `configure()` after the first turn reaches the next one.
 */
export interface ProviderApiSettings {
    readonly provider: ProviderApiId;
    readonly apiKey?: string;
    readonly model: string;
    /** The AI SDK's meaning: the API's base URL, its version path included. */
    readonly baseUrl?: string;
    readonly maxTokens?: number;
    readonly temperature?: number;
}

/**
 * The adapter folder's one entry: one turn, one request, no retry (retries are the engine's).
 * Ends with a `finish` or an `error`, like `AiEngine.turn`.
 */
export type ProviderApiTurn = (
    settings: ProviderApiSettings,
    request: TurnRequest,
    signal: AbortSignal,
) => AsyncIterable<TurnEvent>;

/** How to transcribe one clip. */
export interface TranscribeOptions {
    /** The language spoken, a BCP 47 tag; absent, the provider guesses. */
    readonly language?: string;
    /** The transcription model; absent, the provider's default (`AI_VOICE_CAPABILITIES`). */
    readonly model?: string;
}

/** How to speak one text. */
export interface SpeakOptions {
    /** The provider's name for the voice; absent, its default. */
    readonly voiceName?: string;
    /** The speech model; absent, the provider's default (`AI_VOICE_CAPABILITIES`). */
    readonly model?: string;
}

/**
 * What a transcription heard: `AI_COMPLETED` with the text, or the code it failed with
 * (`AI_KEY_REJECTED`, `AI_PROVIDER_ERROR`, `AI_CANCELLED`, `AI_VOICE_UNAVAILABLE`) and no text.
 * Never thrown.
 */
export type TurnText =
    | { readonly code: "AI_COMPLETED"; readonly params: AiResultParams; readonly text: string }
    | { readonly code: Exclude<AiResultCode, "AI_COMPLETED">; readonly params: AiResultParams };

/**
 * What speaking produced: `AI_COMPLETED` with the audio (a `Blob` of the provider's content
 * type), or the code it failed with and no audio. Never thrown.
 */
export type SpokenAudio =
    | { readonly code: "AI_COMPLETED"; readonly params: AiResultParams; readonly audio: Blob }
    | { readonly code: Exclude<AiResultCode, "AI_COMPLETED">; readonly params: AiResultParams };

/** Talks to a model, one turn per call. */
export interface AiEngine {
    readonly kind: "provider-api" | "llm-provider" | "fake";
    /** The provider's name, the `provider` of a failure's params. */
    readonly providerName: string;
    capabilities(model: string): EngineCapabilities;
    /** One model turn: one request to the model, no tool run. Ends with a `finish` or an `error`. */
    turn(request: TurnRequest, signal: AbortSignal): AsyncIterable<TurnEvent>;
    /** Whether the configured key is accepted: `AI_COMPLETED` when it is. */
    checkKey(signal: AbortSignal): Promise<EngineOutcome>;
    /**
     * Speech to text through the provider. Absent (never a throwing stub) on an engine whose
     * provider cannot, so `"transcribe" in engine` is the capability.
     */
    transcribe?(audio: Blob, options: TranscribeOptions, signal: AbortSignal): Promise<TurnText>;
    /** Text to speech through the provider; absent, like `transcribe`, where it cannot. */
    speak?(text: string, options: SpeakOptions, signal: AbortSignal): Promise<SpokenAudio>;
    dispose(): void;
}

/**
 * One host function a program written by the model calls as `await tools.<name>(input)`. What it
 * resolves with must survive `JSON.stringify`; a throw reaches the program as an `Error`.
 */
export type ProgramBinding = (input: unknown) => Promise<unknown>;

/** The host functions a program may call, by name (a JavaScript identifier). */
export type ProgramBindings = Readonly<Record<string, ProgramBinding>>;

/** How far a program may go before it is stopped. */
export interface ProgramLimits {
    /** Wall time, in milliseconds, before the program is interrupted (`program-timeout`). */
    readonly timeoutMs: number;
    /** Binding calls allowed; the next one fails and the program ends `program-call-limit`. */
    readonly maxCalls: number;
    /** Characters of console output kept; the rest is dropped. */
    readonly maxLogChars: number;
    /** The sandbox's memory, in megabytes (`program-memory` past it). */
    readonly memoryMb: number;
}

/** Why a program failed: the `cause` of its `AI_TOOL_FAILED`. */
export type ProgramFailureCause =
    "program-threw" | "program-timeout" | "program-memory" | "program-call-limit" | "program-cancelled";

/**
 * What a program did. `AI_COMPLETED` with the value it returned, or `AI_TOOL_FAILED` with
 * `{ tool: "run_code", cause }` (`ProgramFailureCause`), plus the program's own error `name` and
 * `message` for `program-threw`. `logs` is its console output, at most `maxLogChars` characters.
 */
export interface ProgramResult {
    readonly code: "AI_COMPLETED" | "AI_TOOL_FAILED";
    readonly params: AiResultParams;
    readonly value?: unknown;
    readonly logs: readonly string[];
}

/** Runs one program in a fresh sandbox, disposed on every path (`loadProgramRunner()` in load.ts). */
export type ProgramRunner = (
    source: string,
    bindings: ProgramBindings,
    limits: ProgramLimits,
    signal: AbortSignal,
) => Promise<ProgramResult>;
