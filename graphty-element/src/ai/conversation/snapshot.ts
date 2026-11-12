/**
 * @file What an application reads to draw a saved conversation (design/ai/tanstack-ai-harness-design.md,
 * Appendix A): the reader's words, the model's words and the calls it made, each with its outcome
 * as `{ code, params }`. It leaves out what graphty-element wrote itself -- the instructions, the
 * facts blocks, the nudges and the tool-result text the model read -- because that is English the
 * element wrote for a model, not for a reader.
 */

import type {
    AiCallInput,
    AiEffect,
    AiHostedToolId,
    AiMessageScope,
    AiPageRetrieval,
    AiResultCode,
    AiResultParams,
} from "../../catalog/ai";
import type { AiApprovalRequest, AiQuestionRequest } from "../../events";
import { ASK_READER } from "../runConversation";
import { callIntent, ruledEffects } from "../tools/inputs";
import type { ConversationRecord } from "./formats";
import type { SavedMessage, SavedPending } from "./formats/v1";

/** One call the model made, with what came of it. */
export interface AiCallRecord {
    /** The tool, as the model named it. */
    readonly command: string;
    /** Its arguments, as the model gave them. */
    readonly arguments: Readonly<Record<string, unknown>>;
    /** What came of it. */
    readonly code: AiResultCode;
    /** The facts behind the code. */
    readonly params: AiResultParams;
    /**
     * How long it ran, in milliseconds, under the generated tools with the `assistant` experiment
     * on; absent for a call that did not run.
     * @experimental assistant
     */
    readonly durationMs?: number;
    /**
     * What this call did, in order, under the generated tools with the `assistant` experiment on;
     * absent for a call that did nothing to report. The message's `effects` holds every call's.
     * @experimental assistant
     */
    readonly effects?: readonly AiEffect[];
    /**
     * The model's own few words for what this call does, as it gave them in the generated tools'
     * `intent` argument; absent when it gave none. It is the model's claim about the call, not what
     * the call did: `effects` and `code` say that.
     * @experimental assistant
     */
    readonly intent?: string;
    /**
     * What the model passed, each argument with its kind and its schema's default name, read
     * against the tool's own parameters (`action` and `intent` left out); absent when the
     * conversation is read without the tools (a list, an export) or the call passed nothing.
     * @experimental assistant
     */
    readonly inputs?: readonly AiCallInput[];
}

/** A page a tool the provider ran (a web search, reading a web page) found or read. */
export interface AiSource {
    /** The tool. */
    readonly tool: AiHostedToolId;
    /** The page's address: http or https. */
    readonly url: string;
    /** The page's title, when the provider gave one. */
    readonly title?: string;
    /** Whether the provider could load the page it was asked to read; absent when it does not say (a search result). */
    readonly retrieval?: AiPageRetrieval;
    /**
     * `false` when the provider read the page and answered from it but did not hand its text back
     * (Gemini's URL context): a later turn, or another helper, cannot read that text again
     * without reading the page again. Absent when the text came back, or for a search result.
     */
    readonly contentReturned?: false;
}

/**
 * One message of a conversation, as a reader sees it. OPEN UNION: roles may be added in a minor
 * release, so a `switch (message.role)` needs a `default` branch that skips (or generically draws)
 * a role it does not know.
 */
export type AiConversationMessage =
    | {
          /** The message's id, stable across saves and reloads. */
          readonly id: string;
          readonly role: "reader";
          /** What the reader said. */
          readonly text: string;
          /** How they said it. */
          readonly via: "text" | "voice";
          /**
           * What the message was about, when it was sent with a scope.
           * @experimental assistant
           */
          readonly scope?: AiMessageScope;
          /**
           * The id its changes carry on the history (`step.provenance.message`), so an application
           * can tell whether `session.history.nextUndo` would take this message back. Under the
           * generated tools with the `assistant` experiment on.
           * @experimental assistant
           */
          readonly provenance?: string;
          /**
           * Set once none of the message's changes stands: its steps were undone. It stays through
           * later edits and reloads, which drop those steps from `session.history`, and goes if they
           * are redone.
           * @experimental assistant
           */
          readonly undone?: true;
      }
    | {
          /** The message's id, stable across saves and reloads. */
          readonly id: string;
          readonly role: "assistant";
          /**
           * What the model said in this message, a question it asked included once the question no
           * longer waits (`pending` and `ai-question-asked` carry a waiting one); empty when it only
           * called tools.
           */
          readonly text: string;
          /** The calls it made, in order. */
          readonly calls: readonly AiCallRecord[];
          /** The pages the provider's tools found or read for it, in order; empty when none ran. */
          readonly sources: readonly AiSource[];
          /**
           * How the reader's message ended when it failed or was taken back: the code (and facts)
           * `aiCommand` resolved with. Absent on an answer. `text` beside it is what the model had
           * said by then, which no longer stands.
           */
          readonly outcome?: { readonly code: AiResultCode; readonly params: AiResultParams };
          /** The helper (`AiAgentRole.name`) that said it, when a helper did; absent for the assistant itself. */
          readonly agent?: string;
          /**
           * What its calls did, in order, under the generated tools with the `assistant` experiment
           * on; absent when they did nothing to report.
           * @experimental assistant
           */
          readonly effects?: readonly AiEffect[];
          /**
           * Set when `text` was said while earlier calls waited on the reader (an approval or a
           * question) and the reader has since decided, or the request ended: it describes the wait,
           * which no longer stands. Absent while the request still waits.
           * @experimental assistant
           */
          readonly saidWhileHeld?: true;
      };

/** A conversation, as an application draws it. */
export interface AiConversationSnapshot {
    /** The conversation's id, as `openAiConversation` and `aiCommand(text, { conversation })` take it. */
    readonly id: string;
    /** The scope it is saved under. */
    readonly key: string;
    /** The version of the saved format it is kept in. */
    readonly formatVersion: number;
    /** Its messages, oldest first. */
    readonly messages: readonly AiConversationMessage[];
    /** What waits on the reader. */
    readonly pending: readonly AiApprovalRequest[];
    /**
     * The reader's own name for it (`renameAiConversation`), or null when they have not named it:
     * the reader's data.
     * @experimental assistant
     */
    readonly name: string | null;
    /**
     * The reader's own first message, or null before there is one: the reader's data, as
     * `AiConversationSummary.firstWords`.
     * @experimental assistant
     */
    readonly firstWords: string | null;
}

/** One saved conversation, for a list. */
export interface AiConversationSummary {
    /** The conversation's id, as `openAiConversation` and `aiCommand(text, { conversation })` take it. */
    readonly id: string;
    /** The scope it is saved under. */
    readonly key: string;
    /** The host's name for the data it was about, or null. */
    readonly dataKey: string | null;
    /** When it was started, as an ISO time. */
    readonly createdAt: string;
    /** When it was last saved, as an ISO time. */
    readonly updatedAt: string;
    /** How many messages its snapshot holds. */
    readonly messageCount: number;
    /** How many things wait on the reader. */
    readonly pendingCount: number;
    /**
     * The reader's own first message, or null before there is one: the reader's data, for a list
     * of conversations to title it by.
     * @experimental assistant
     */
    readonly firstWords: string | null;
    /**
     * The reader's own name for it (`renameAiConversation`), or null when they have not named it:
     * the reader's data.
     * @experimental assistant
     */
    readonly name: string | null;
}

/**
 * The choices a reader's answer picked, as its tool result records them.
 * @param content - The result's text.
 * @returns The choices.
 */
function answerValues(content: string): string[] {
    try {
        const { data } = JSON.parse(content) as { data?: { answer?: unknown } };
        return Array.isArray(data?.answer) ? data.answer.filter((value) => typeof value === "string") : [];
    } catch {
        return [];
    }
}

/**
 * The messages of a record, as a reader sees them.
 * @param messages - The saved messages.
 * @param pending - The record's waiting entries: an unanswered question's call reads as asked.
 * @returns The reader's and the assistant's messages; tool messages fold into the calls, and a
 *     reader's answer to a question is the reader's message.
 */
function snapshotMessages(
    messages: readonly SavedMessage[],
    pending: readonly SavedPending[] = [],
): AiConversationMessage[] {
    const outcomes = callOutcomes(messages, pending);
    const helperSources = helperSourcesOf(messages);
    const effects = callEffects(messages);
    const questions = questionsAsked(messages, pending, outcomes);
    const held = saidWhileHeld(messages, pending);
    return messages.flatMap((message): AiConversationMessage[] => {
        switch (message.role) {
            case "tool":
                return toolEntries(message);
            case "user":
                return readerEntry(message);
            case "assistant":
                return assistantEntry(message, outcomes, helperSources, effects, questions).map((entry) =>
                    held.has(message.id) ? { ...entry, saidWhileHeld: true } : entry,
                );
            default:
                return [];
        }
    });
}

/**
 * The model's words saved while earlier calls had no result yet, their wait since ended: a
 * request no longer waiting (decided, or claimed and running) or calls answered later.
 * @param messages - The saved messages.
 * @param pending - The record's waiting entries.
 * @returns The ids of those messages.
 */
function saidWhileHeld(messages: readonly SavedMessage[], pending: readonly SavedPending[]): Set<string> {
    const waiting = new Set(pending.filter((entry) => entry.claim === null).map((entry) => entry.messageId));
    // Each call with no result yet, and the message that made it.
    const open = new Map<string, string>();
    const held = new Set<string>();
    for (const message of messages) {
        for (const part of message.parts) {
            if (part.type === "tool-call") {
                open.set(part.callId, message.id);
            } else if (part.type === "tool-result") {
                open.delete(part.callId);
            }
        }

        const words =
            message.role === "assistant" &&
            message.parts.length > 0 &&
            message.parts.every((part) => part.type === "text" && part.origin === "model");
        if (words && [...open.values()].some((id) => !waiting.has(id))) {
            held.add(message.id);
        }
    }

    return held;
}

/** A call's outcome, as a reader sees it. */
type CallOutcome = { code: AiResultCode; params: AiResultParams; durationMs?: number };

/**
 * Each call's outcome: its tool result, or `AI_QUESTION_ASKED` for a question still waiting.
 * @param messages - The saved messages.
 * @param pending - The record's waiting entries.
 * @returns The outcomes, by call id.
 */
function callOutcomes(messages: readonly SavedMessage[], pending: readonly SavedPending[]): Map<string, CallOutcome> {
    const outcomes = new Map<string, CallOutcome>();
    for (const entry of pending) {
        if (entry.kind === "question") {
            outcomes.set(entry.callId, { code: "AI_QUESTION_ASKED", params: { request: entry.id } });
        }
    }

    for (const part of messages.flatMap((message) => message.parts)) {
        if (part.type === "tool-result") {
            outcomes.set(part.callId, {
                code: part.code as AiResultCode,
                params: { ...part.params },
                ...(part.durationMs === undefined ? {} : { durationMs: part.durationMs }),
            });
        }
    }

    return outcomes;
}

/**
 * The questions the reader was shown and that no longer wait: answered, or ended unanswered, or
 * with no result yet and no entry because the answer is running. A call answered as not run never
 * showed, and a waiting question is `pending`'s to carry.
 * @param messages - The saved messages.
 * @param pending - The record's waiting entries.
 * @param outcomes - Each call's outcome.
 * @returns Each question's text, by call id.
 */
function questionsAsked(
    messages: readonly SavedMessage[],
    pending: readonly SavedPending[],
    outcomes: ReadonlyMap<string, CallOutcome>,
): Map<string, string> {
    const questions = new Map<string, string>();
    for (const part of messages.flatMap((message) => message.parts)) {
        if (part.type === "tool-call" && part.command === ASK_READER && typeof part.arguments.question === "string") {
            const entry = pending.find((waiting) => waiting.kind === "question" && waiting.callId === part.callId);
            const code = outcomes.get(part.callId)?.code;
            const shown = code !== "AI_TOOL_NOT_RUN" && code !== "AI_TOOL_INVALID_ARGUMENTS";
            if (entry === undefined ? shown : entry.claim !== null) {
                questions.set(part.callId, part.arguments.question);
            }
        }
    }

    return questions;
}

/**
 * What each call did, as its tool result records it.
 * @param messages - The saved messages.
 * @returns The effects, by call id.
 */
function callEffects(messages: readonly SavedMessage[]): Map<string, readonly AiEffect[]> {
    const effects = new Map<string, readonly AiEffect[]>();
    for (const part of messages.flatMap((message) => message.parts)) {
        if (part.type === "tool-result" && part.effects !== undefined) {
            // A saved code may be one a newer release wrote: the union is open, as `AI_EFFECT_CODES` says.
            effects.set(part.callId, part.effects as readonly AiEffect[]);
        }
    }

    return effects;
}

/**
 * The pages each helper's tools found, by the `delegate` call it answers: the delegating
 * message's sources too.
 * @param messages - The saved messages.
 * @returns The sources, by call id.
 */
function helperSourcesOf(messages: readonly SavedMessage[]): Map<string, AiSource[]> {
    const helperSources = new Map<string, AiSource[]>();
    for (const part of messages.flatMap((message) => message.parts)) {
        if (part.type === "agent-ref") {
            helperSources.set(part.callId, [
                ...(helperSources.get(part.callId) ?? []),
                ...part.messages.flatMap((said) => sourcesOf(said.parts)),
            ]);
        }
    }

    return helperSources;
}

/**
 * A tool message as the reader sees it: a helper's words and calls under its name, and a
 * reader's answer to a question as the reader's message.
 * @param message - The tool message.
 * @returns Its entries.
 */
function toolEntries(message: SavedMessage): AiConversationMessage[] {
    return message.parts.flatMap((part): AiConversationMessage[] => {
        if (part.type === "agent-ref") {
            return snapshotMessages(part.messages).flatMap((said) =>
                said.role === "assistant" ? [{ ...said, agent: part.agent }] : [],
            );
        }

        if (part.type === "tool-result" && part.origin === "reader") {
            return [{ id: message.id, role: "reader", text: answerValues(part.content).join("\n"), via: "text" }];
        }

        return [];
    });
}

/**
 * A user message as the reader sees it: what the reader said, none when it held only facts.
 * @param message - The user message.
 * @returns Its entry, or none.
 */
function readerEntry(message: SavedMessage): AiConversationMessage[] {
    const said = message.parts.flatMap((part) => (part.type === "text" && part.origin === "reader" ? [part] : []));
    if (said.length === 0) {
        return [];
    }

    return [
        {
            id: message.id,
            role: "reader",
            text: said.map((part) => part.text).join("\n"),
            via: said.some((part) => part.via === "voice") ? "voice" : "text",
            ...(said[0].scope === undefined ? {} : { scope: said[0].scope }),
            ...(said[0].provenance === undefined ? {} : { provenance: said[0].provenance }),
            ...(said[0].undone === undefined ? {} : { undone: said[0].undone }),
        },
    ];
}

/**
 * An assistant message as the reader sees it: the model's words, its calls with their outcomes,
 * the pages its and its helpers' tools found, and how it ended when it failed.
 * @param message - The assistant message.
 * @param outcomes - Each call's outcome.
 * @param helperSources - The pages each helper found, by its call.
 * @param effects - What each call did.
 * @param questions - The questions that read as said, by call.
 * @returns Its entry, or none when it holds nothing a reader sees.
 */
function assistantEntry(
    message: SavedMessage,
    outcomes: ReadonlyMap<string, CallOutcome>,
    helperSources: ReadonlyMap<string, AiSource[]>,
    effects: ReadonlyMap<string, readonly AiEffect[]>,
    questions: ReadonlyMap<string, string>,
): AiConversationMessage[] {
    const text = message.parts
        .flatMap((part) => {
            if (part.type === "tool-call") {
                return questions.get(part.callId) ?? [];
            }

            return part.type === "text" && part.origin === "model" ? [part.text] : [];
        })
        .join("\n");
    const ruled = new Map<string, readonly AiEffect[]>();
    for (const part of message.parts) {
        const did = part.type === "tool-call" ? effects.get(part.callId) : undefined;
        if (part.type === "tool-call" && did !== undefined) {
            ruled.set(part.callId, ruledEffects(did, part.arguments));
        }
    }

    const calls = message.parts.flatMap((part): AiCallRecord[] =>
        part.type === "tool-call"
            ? [
                  {
                      command: part.command,
                      arguments: part.arguments,
                      ...(outcomes.get(part.callId) ?? { code: "AI_TOOL_NOT_RUN", params: { tool: part.command } }),
                      ...(ruled.has(part.callId) && { effects: ruled.get(part.callId) }),
                      ...intentOf(part.arguments),
                  },
              ]
            : [],
    );
    const sources = [
        ...sourcesOf(message.parts),
        ...message.parts.flatMap((part) => (part.type === "tool-call" ? (helperSources.get(part.callId) ?? []) : [])),
    ];
    const ended = message.parts.find((part) => part.type === "outcome");
    const outcome =
        ended?.type === "outcome" ? { outcome: { code: ended.code as AiResultCode, params: { ...ended.params } } } : {};
    if (text === "" && calls.length === 0 && sources.length === 0 && ended === undefined) {
        return [];
    }

    const did = message.parts.flatMap((part) => (part.type === "tool-call" ? (ruled.get(part.callId) ?? []) : []));
    return [
        {
            id: message.id,
            role: "assistant",
            text,
            calls,
            sources,
            ...outcome,
            ...(did.length > 0 && { effects: did }),
        },
    ];
}

/**
 * A call's intent, as its record holds it.
 * @param args - The call's arguments.
 * @returns `{ intent }`, or nothing when the model gave none.
 */
function intentOf(args: Readonly<Record<string, unknown>>): { intent?: string } {
    const intent = callIntent(args);
    return intent === undefined ? {} : { intent };
}

/**
 * The pages the provider's tools found, as saved parts record them.
 * @param parts - The parts.
 * @returns The sources, in order.
 */
function sourcesOf(parts: readonly SavedMessage["parts"][number][]): AiSource[] {
    return parts.flatMap((part): AiSource[] =>
        part.type === "hosted-tool"
            ? part.sources.map(({ retrieval, ...source }) => ({
                  tool: part.tool as AiHostedToolId,
                  ...source,
                  ...(retrieval !== undefined && { retrieval: retrieval as AiPageRetrieval }),
              }))
            : [],
    );
}

/** A saved approval entry. */
export type SavedApproval = Extract<SavedPending, { kind: "approval" }>;

/**
 * A saved approval entry as the request `ai-approval-requested` carries.
 * @param entry - The entry.
 * @param conversationId - Its conversation.
 * @returns The request.
 */
export function approvalRequest(entry: SavedApproval, conversationId: string): AiApprovalRequest {
    return {
        id: entry.id,
        gate: entry.gate,
        calls: entry.calls.map((call) => ({ tool: call.command, arguments: call.arguments })),
        preview: entry.preview,
        conversationId,
        messageId: entry.messageId,
        createdAt: entry.createdAt,
        ...(entry.agent === undefined ? {} : { agent: entry.agent }),
    };
}

/** A saved question entry. */
export type SavedQuestion = Extract<SavedPending, { kind: "question" }>;

/**
 * A saved question entry as the request `ai-question-asked` carries.
 * @param entry - The entry.
 * @param conversationId - Its conversation.
 * @returns The request.
 */
export function questionRequest(entry: SavedQuestion, conversationId: string): AiQuestionRequest {
    return {
        id: entry.id,
        question: entry.question,
        choices: [...entry.choices],
        multiple: entry.multiple,
        conversationId,
        messageId: entry.messageId,
        createdAt: entry.createdAt,
    };
}

/**
 * The questions of a record still waiting: unclaimed.
 * @param record - The saved conversation.
 * @returns The entries.
 */
export function waitingQuestions(record: ConversationRecord): SavedQuestion[] {
    return record.pending.filter((entry): entry is SavedQuestion => entry.kind === "question" && entry.claim === null);
}

/**
 * The approvals of a record still waiting: unclaimed. A claimed one is being resolved, here or in
 * another tab, and is never asked about again.
 * @param record - The saved conversation.
 * @returns The entries.
 */
export function waitingApprovals(record: ConversationRecord): SavedApproval[] {
    return record.pending.filter((entry): entry is SavedApproval => entry.kind === "approval" && entry.claim === null);
}

/**
 * A record as an application reads it.
 * @param record - The saved conversation.
 * @returns Its snapshot.
 */
export function conversationSnapshot(record: ConversationRecord): AiConversationSnapshot {
    return {
        id: record.id,
        key: record.key,
        formatVersion: record.version,
        messages: snapshotMessages(record.messages, record.pending),
        pending: waitingApprovals(record).map((entry) => approvalRequest(entry, record.id)),
        name: record.name ?? null,
        firstWords: firstWordsOf(record),
    };
}

/**
 * A record for a list.
 * @param record - The saved conversation.
 * @returns Its summary.
 */
export function conversationSummary(record: ConversationRecord): AiConversationSummary {
    return {
        id: record.id,
        key: record.key,
        dataKey: record.graph.dataKey,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
        messageCount: snapshotMessages(record.messages).length,
        pendingCount: record.pending.length,
        firstWords: firstWordsOf(record),
        name: record.name ?? null,
    };
}

/**
 * The reader's first message.
 * @param record - The conversation.
 * @returns Its text, or null when the reader has said nothing.
 */
function firstWordsOf(record: ConversationRecord): string | null {
    for (const message of record.messages) {
        for (const part of message.parts) {
            if (part.type === "text" && part.origin === "reader") {
                return part.text;
            }
        }
    }

    return null;
}
