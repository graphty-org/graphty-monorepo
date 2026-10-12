/**
 * @file What an application reads to draw a saved conversation (design/ai/tanstack-ai-harness-design.md,
 * Appendix A): the reader's words, the model's words and the calls it made, each with its outcome
 * as `{ code, params }`. It leaves out what graphty-element wrote itself -- the instructions, the
 * facts blocks, the nudges and the tool-result text the model read -- because that is English the
 * element wrote for a model, not for a reader.
 */

import type { AiHostedToolId, AiResultCode, AiResultParams } from "../../catalog/ai";
import type { AiApprovalRequest, AiQuestionRequest } from "../../events";
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
}

/** A page a tool the provider ran (a web search, reading a web page) found or read. */
export interface AiSource {
    /** The tool. */
    readonly tool: AiHostedToolId;
    /** The page's address: http or https. */
    readonly url: string;
    /** The page's title, when the provider gave one. */
    readonly title?: string;
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
      }
    | {
          /** The message's id, stable across saves and reloads. */
          readonly id: string;
          readonly role: "assistant";
          /** What the model said in this message; empty when it only called tools. */
          readonly text: string;
          /** The calls it made, in order. */
          readonly calls: readonly AiCallRecord[];
          /** The pages the provider's tools found or read for it, in order; empty when none ran. */
          readonly sources: readonly AiSource[];
          /**
           * How the reader's message ended when it failed or was taken back, instead of an answer:
           * the code (and facts) `aiCommand` resolved with. Absent on an answer.
           */
          readonly outcome?: { readonly code: AiResultCode; readonly params: AiResultParams };
          /** The helper (`AiAgentRole.name`) that said it, when a helper did; absent for the assistant itself. */
          readonly agent?: string;
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
    return messages.flatMap((message): AiConversationMessage[] => {
        switch (message.role) {
            case "tool":
                return toolEntries(message);
            case "user":
                return readerEntry(message);
            case "assistant":
                return assistantEntry(message, outcomes, helperSources);
            default:
                return [];
        }
    });
}

/** A call's outcome, as a reader sees it. */
type CallOutcome = { code: AiResultCode; params: AiResultParams };

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
            outcomes.set(part.callId, { code: part.code as AiResultCode, params: { ...part.params } });
        }
    }

    return outcomes;
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
        },
    ];
}

/**
 * An assistant message as the reader sees it: the model's words, its calls with their outcomes,
 * the pages its and its helpers' tools found, and how it ended when it failed.
 * @param message - The assistant message.
 * @param outcomes - Each call's outcome.
 * @param helperSources - The pages each helper found, by its call.
 * @returns Its entry, or none when it holds nothing a reader sees.
 */
function assistantEntry(
    message: SavedMessage,
    outcomes: ReadonlyMap<string, CallOutcome>,
    helperSources: ReadonlyMap<string, AiSource[]>,
): AiConversationMessage[] {
    const text = message.parts
        .flatMap((part) => (part.type === "text" && part.origin === "model" ? [part.text] : []))
        .join("\n");
    const calls = message.parts.flatMap((part): AiCallRecord[] =>
        part.type === "tool-call"
            ? [
                  {
                      command: part.command,
                      arguments: part.arguments,
                      ...(outcomes.get(part.callId) ?? { code: "AI_TOOL_NOT_RUN", params: { tool: part.command } }),
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

    return [{ id: message.id, role: "assistant", text, calls, sources, ...outcome }];
}

/**
 * The pages the provider's tools found, as saved parts record them.
 * @param parts - The parts.
 * @returns The sources, in order.
 */
function sourcesOf(parts: readonly SavedMessage["parts"][number][]): AiSource[] {
    return parts.flatMap((part): AiSource[] =>
        part.type === "hosted-tool"
            ? part.sources.map((source) => ({ tool: part.tool as AiHostedToolId, ...source }))
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
    };
}
