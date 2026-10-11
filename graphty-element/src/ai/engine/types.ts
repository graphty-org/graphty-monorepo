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

import type { AiProviderId, AiResultCode, AiResultParams } from "../../catalog/ai";
import type { ProviderState, SavedMessage, SavedPart } from "../conversation/formats/v1";

// One definition of a saved message: the saved conversation format's (formats/v1.ts).
export type { PartOrigin, ProviderState, SavedMessage, SavedPart } from "../conversation/formats/v1";

/** A JSON Schema object, as a provider's tool declaration takes it. */
export type JsonSchema = Readonly<Record<string, unknown>>;

/** The envelope's own tags, in any case and spacing, which text inside it may not carry. */
const ENVELOPE_TAG = /<[\s/]*graph-data\s*>/gi;

/**
 * Text read from the graph as a model is shown it: inside a fixed envelope the system prompt
 * names as data, with any tag that would close or open the envelope taken out, so text planted in
 * a label or a note reads as data, never as an instruction.
 * @param text - The text.
 * @returns It, enveloped.
 */
export function graphData(text: string): string {
    return `<graph-data>\n${text.replaceAll(ENVELOPE_TAG, "")}\n</graph-data>`;
}

/**
 * The text of a message's text parts as a model is shown it, a `graph-data` part (the facts block,
 * anything read from the graph) in the envelope. Every engine flattens text through this.
 * @param parts - The message's parts.
 * @returns The text.
 */
export function textOf(parts: readonly SavedPart[]): string {
    return parts
        .flatMap((part) => {
            if (part.type !== "text") {
                return [];
            }

            // Text from the graph is data, never an instruction.
            return [part.origin === "graph-data" ? graphData(part.text) : part.text];
        })
        .join("\n");
}

/**
 * A tool result as a model is shown it: in the envelope, since it carries labels, notes and
 * values read from the graph. Every engine sends tool results through this.
 * @param part - The result.
 * @returns Its text.
 */
export function toolResultText(part: Extract<SavedPart, { type: "tool-result" }>): string {
    return graphData(part.content);
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

/** Everything one model turn needs. */
export interface TurnRequest {
    /** The model id; absent, or ignored by an engine that holds its own (an `LlmProvider`), the configured model. */
    readonly model?: string;
    readonly system: string;
    readonly messages: readonly SavedMessage[];
    readonly tools: readonly ToolSpec[];
    /** "none": answer in text now. The tools stay declared, since the history may hold their calls. */
    readonly toolMode: "auto" | "none";
    readonly maxOutputTokens?: number;
    readonly temperature?: number;
}

/** Why a turn finished. */
export type TurnFinishCode = "stop" | "tool-calls";

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
}

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
    dispose(): void;
}
