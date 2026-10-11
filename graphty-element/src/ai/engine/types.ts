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

import type { AiResultCode, AiResultParams } from "../../catalog/ai";

/** A JSON Schema object, as a provider's tool declaration takes it. */
export type JsonSchema = Readonly<Record<string, unknown>>;

/**
 * Opaque provider round-trip data (Gemini thought signatures, Anthropic thinking signatures,
 * OpenAI encrypted reasoning). Only the engine that wrote it reads `data`, and it is sent back
 * only when engine, provider and model all match.
 */
export interface ProviderState {
    readonly engine: string;
    readonly provider: string;
    readonly model: string;
    readonly data: unknown;
}

/** Where a part of a message came from. */
export type PartOrigin = "reader" | "model" | "graph-data" | "graphty";

/** One part of a message the engine is shown. */
export type SavedPart =
    | { readonly type: "text"; readonly origin: PartOrigin; readonly text: string }
    | {
          readonly type: "tool-call";
          readonly origin: "model";
          readonly callId: string;
          readonly command: string;
          readonly arguments: Readonly<Record<string, unknown>>;
          readonly providerState?: ProviderState;
      }
    | {
          readonly type: "tool-result";
          readonly origin: "graph-data";
          readonly callId: string;
          readonly code: AiResultCode;
          readonly params: AiResultParams;
          /** The text the model reads: the result as JSON, truncated. */
          readonly content: string;
      };

/**
 * One message of a conversation, in graphty's own shape. The saved conversation format
 * (milestone 3) is built on it.
 */
export interface SavedMessage {
    readonly id: string;
    readonly role: "user" | "assistant" | "tool";
    readonly parts: readonly SavedPart[];
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

/** Talks to a model, one turn per call. */
export interface AiEngine {
    readonly kind: "provider-api" | "llm-provider" | "fake";
    capabilities(model: string): EngineCapabilities;
    /** One model turn: one request to the model, no tool run. Ends with a `finish` or an `error`. */
    turn(request: TurnRequest, signal: AbortSignal): AsyncIterable<TurnEvent>;
    /** Whether the configured key is accepted: `AI_COMPLETED` when it is. */
    checkKey(signal: AbortSignal): Promise<EngineOutcome>;
    dispose(): void;
}
