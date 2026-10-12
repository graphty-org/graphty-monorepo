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
    const outcomes = new Map<string, { code: AiResultCode; params: AiResultParams }>();
    for (const entry of pending) {
        if (entry.kind === "question") {
            outcomes.set(entry.callId, { code: "AI_QUESTION_ASKED", params: { request: entry.id } });
        }
    }

    for (const message of messages) {
        for (const part of message.parts) {
            if (part.type === "tool-result") {
                outcomes.set(part.callId, { code: part.code as AiResultCode, params: { ...part.params } });
            }
        }
    }

    const out: AiConversationMessage[] = [];
    for (const message of messages) {
        if (message.role === "tool") {
            for (const part of message.parts) {
                if (part.type === "agent-ref") {
                    // A helper's words and calls, under its name.
                    for (const said of snapshotMessages(part.messages)) {
                        if (said.role === "assistant") {
                            out.push({ ...said, agent: part.agent });
                        }
                    }
                } else if (part.type === "tool-result" && part.origin === "reader") {
                    out.push({
                        id: message.id,
                        role: "reader",
                        text: answerValues(part.content).join("\n"),
                        via: "text",
                    });
                }
            }
        } else if (message.role === "user") {
            const said = message.parts.filter((part) => part.type === "text" && part.origin === "reader");
            if (said.length > 0) {
                out.push({
                    id: message.id,
                    role: "reader",
                    text: said.map((part) => (part.type === "text" ? part.text : "")).join("\n"),
                    via: said.some((part) => part.type === "text" && part.via === "voice") ? "voice" : "text",
                });
            }
        } else if (message.role === "assistant") {
            const text = message.parts
                .flatMap((part) => (part.type === "text" && part.origin === "model" ? [part.text] : []))
                .join("\n");
            const calls = message.parts.flatMap((part): AiCallRecord[] =>
                part.type === "tool-call"
                    ? [
                          {
                              command: part.command,
                              arguments: part.arguments,
                              ...(outcomes.get(part.callId) ?? {
                                  code: "AI_TOOL_NOT_RUN",
                                  params: { tool: part.command },
                              }),
                          },
                      ]
                    : [],
            );
            const sources = message.parts.flatMap((part): AiSource[] =>
                part.type === "hosted-tool"
                    ? part.sources.map((source) => ({ tool: part.tool as AiHostedToolId, ...source }))
                    : [],
            );
            const ended = message.parts.find((part) => part.type === "outcome");
            const outcome =
                ended?.type === "outcome"
                    ? { outcome: { code: ended.code as AiResultCode, params: { ...ended.params } } }
                    : {};
            if (text !== "" || calls.length > 0 || sources.length > 0 || ended !== undefined) {
                out.push({ id: message.id, role: "assistant", text, calls, sources, ...outcome });
            }
        }
    }

    return out;
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
