/**
 * @file The saved conversation format, version 1 (design/ai/tanstack-ai-harness-design.md,
 * section 5.1), as strict zod schemas.
 *
 * This is the one definition of a saved message: the engine's `SavedMessage` and `SavedPart` are
 * these types. It defines only the part and pending kinds the element's features write: a kind a
 * later feature needs is added with that feature, before the version is released. Every part has an
 * `origin`; `providerState` is the only opaque field.
 *
 * Once this file's JSON Schema (`graphty-ai-conversation.v1.schema.json`) is on master it never
 * changes: a change to the format is version 2, with an upgrade from version 1.
 */

import { z } from "zod";

import { AI_CONVERSATION_FORMAT } from "../../../catalog/ai";

/** Every field, nested ones included, read-only. */
type DeepReadonly<T> = T extends object ? { readonly [K in keyof T]: DeepReadonly<T[K]> } : T;

/** The most characters a saved tool result's text may have: the standard profile's cap. */
export const TOOL_RESULT_MAX_CHARS = 8000;

const id = z.string().min(1);
const timestamp = z.iso.datetime();
/** A result code. Open: a record written by a newer release may carry a code this one does not know. */
const resultCode = z.string().regex(/^AI_[A-Z0-9_]+$/);
const resultParams = z.record(z.string(), z.union([z.string(), z.number()]));
const callArguments = z.record(z.string(), z.unknown());
/** Who claimed a pending entry to resolve it, or null while nobody has. */
const claim = z.string().min(1).nullable();

/**
 * Opaque provider round-trip data (Gemini thought signatures, Anthropic thinking signatures,
 * OpenAI encrypted reasoning). Only the engine that wrote it reads `data`, and it is sent back
 * only when engine, provider and model all match. Any reader may drop it.
 */
const providerStateSchema = z.strictObject({
    engine: id,
    provider: id,
    model: id,
    data: z.unknown(),
});

/** Where a part of a message came from. */
const originSchema = z.enum(["reader", "model", "graph-data", "graphty"]);

const textPart = z.strictObject({
    type: z.literal("text"),
    origin: originSchema,
    text: z.string(),
    /** How the reader gave it, for a reader's text. */
    via: z.enum(["text", "voice"]).optional(),
});

const toolCallPart = z.strictObject({
    type: z.literal("tool-call"),
    /** `model` for a call the model made; `graphty` for a hand-off a router's plan made. */
    origin: z.enum(["model", "graphty"]),
    callId: id,
    command: id,
    arguments: callArguments,
    providerState: providerStateSchema.optional(),
});

const toolResultPart = z.strictObject({
    type: z.literal("tool-result"),
    /** `graph-data` for what a tool returned; `reader` for the reader's answer to a question. */
    origin: z.enum(["graph-data", "reader"]),
    callId: id,
    code: resultCode,
    params: resultParams,
    /** The text the model read: the result as JSON, truncated. */
    content: z.string().max(TOOL_RESULT_MAX_CHARS),
});

const reasoningPart = z.strictObject({
    type: z.literal("reasoning"),
    origin: z.literal("model"),
    /** The model's reasoning text, when the provider returned it in the clear. */
    text: z.string().optional(),
    providerState: providerStateSchema.optional(),
});

/** How a message that was taken back, or failed, ended: what the reader is told instead of an answer. */
const outcomePart = z.strictObject({
    type: z.literal("outcome"),
    origin: z.literal("graphty"),
    code: resultCode,
    params: resultParams,
});

const role = z.enum(["user", "assistant", "tool"]);

/** One message of a helper's conversation: any part but another helper's (helpers do not delegate). */
const helperMessageSchema = z.strictObject({
    id,
    role,
    parts: z.array(z.discriminatedUnion("type", [textPart, toolCallPart, toolResultPart, reasoningPart, outcomePart])),
});

/** A helper's conversation, run for one `delegate` call of the message it sits in. */
const agentRefPart = z.strictObject({
    type: z.literal("agent-ref"),
    origin: z.literal("graphty"),
    /** The helper's role name. */
    agent: id,
    /** The `delegate` call it answers. */
    callId: id,
    messages: z.array(helperMessageSchema),
});

/** One part of a message. */
export const partSchema = z.discriminatedUnion("type", [
    textPart,
    toolCallPart,
    toolResultPart,
    reasoningPart,
    outcomePart,
    agentRefPart,
]);

/** One message of a conversation. */
export const messageSchema = z.strictObject({
    id,
    role,
    parts: z.array(partSchema),
});

/** What a held change would do, as `AiApprovalPreview` states it. */
const previewSchema = z.strictObject({
    removeNodes: z.number().int().nonnegative().optional(),
    removeEdges: z.number().int().nonnegative().optional(),
    changedValues: z.number().int().nonnegative().optional(),
    ids: z.array(z.strictObject({ id: z.string(), label: z.string() })).optional(),
    algorithm: z.string().optional(),
    seconds: z.union([z.number().nonnegative(), z.literal("unbounded")]).optional(),
    costClass: z.string().optional(),
    run: z.string().optional(),
    nodes: z.number().int().nonnegative().optional(),
    edges: z.number().int().nonnegative().optional(),
    mode: z.enum(["merge", "replace"]).optional(),
    url: z.string().optional(),
});

const approvalPending = z.strictObject({
    kind: z.literal("approval"),
    id,
    /** The assistant message whose calls are held. */
    messageId: id,
    /** Why it was held (`large`, `policy`, `plan`, ...). Open. */
    gate: id,
    /** The helper whose calls are held, when a helper made them. */
    agent: id.optional(),
    calls: z.array(z.strictObject({ callId: id, command: id, arguments: callArguments })).min(1),
    preview: previewSchema,
    /** The graph when it was held, to tell whether it changed since. */
    graph: z.strictObject({
        dataKey: z.string().nullable(),
        fingerprint: z.string(),
        nodes: z.number().int().nonnegative(),
        edges: z.number().int().nonnegative(),
    }),
    /** The element's history revision when it was held. */
    historyRevision: z.number().int().nonnegative(),
    claim,
    createdAt: timestamp,
});

/** A question the model asked the reader, waiting on the answer. */
const questionPending = z.strictObject({
    kind: z.literal("question"),
    id,
    /** The assistant message that asked. */
    messageId: id,
    /** The `ask_reader` call the answer becomes the result of. */
    callId: id,
    question: z.string(),
    choices: z.array(z.string()).min(2).max(10),
    /** Whether the reader may pick more than one. */
    multiple: z.boolean(),
    claim,
    createdAt: timestamp,
});

/** A plan's steps still to run once what holds the message ends. */
const planStepPending = z.strictObject({
    kind: z.literal("plan-step"),
    id,
    messageId: id,
    plan: z.strictObject({
        steps: z
            .array(
                z.strictObject({
                    agents: z.array(id).min(1),
                    order: z.enum(["parallel", "sequence"]).optional(),
                }),
            )
            .min(1),
    }),
    /** The index in `plan.steps` of the step to run next. */
    next: z.number().int().nonnegative(),
    claim,
    createdAt: timestamp,
});

/** Something waiting on the reader. */
export const pendingSchema = z.discriminatedUnion("kind", [approvalPending, questionPending, planStepPending]);

/** One saved conversation. */
export const conversationSchema = z.strictObject({
    format: z.literal(AI_CONVERSATION_FORMAT),
    version: z.literal(1),
    /** Bumped by every save, so a save from a stale copy is detected. */
    revision: z.number().int().nonnegative(),
    id,
    /** The scope it belongs to (by default the element's id and the page's path). */
    key: z.string(),
    createdAt: timestamp,
    updatedAt: timestamp,
    /** The graph it was about. */
    graph: z.strictObject({ dataKey: z.string().nullable(), fingerprint: z.string().nullable() }),
    messages: z.array(messageSchema),
    pending: z.array(pendingSchema),
});

/** Opaque provider round-trip data; see `providerState` above. */
export type ProviderState = DeepReadonly<z.infer<typeof providerStateSchema>>;
/** Where a part of a message came from. */
export type PartOrigin = z.infer<typeof originSchema>;
/** One part of a message. */
export type SavedPart = DeepReadonly<z.infer<typeof partSchema>>;
/** One message of a conversation. */
export type SavedMessage = DeepReadonly<z.infer<typeof messageSchema>>;
/** Something waiting on the reader. */
export type SavedPending = DeepReadonly<z.infer<typeof pendingSchema>>;
/** One saved conversation, format version 1. */
export type ConversationRecordV1 = DeepReadonly<z.infer<typeof conversationSchema>>;
