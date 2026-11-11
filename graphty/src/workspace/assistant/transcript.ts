/**
 * A chat as plain text, for Copy chat: each step as the panel says it, then every call exactly as it
 * ran. Everything here words what graphty-element reported; nothing is computed about the graph.
 */

import type { AiApprovalRequest, AiConversationSnapshot, AiQuestionRequest } from "@graphty/graphty-element/ai";
import type { AiEffect, AiTarget } from "@graphty/graphty-element/catalog";
import type { GraphSession } from "@graphty/graphty-element/session";

import {
    approvalWords,
    askedRows,
    changeLines,
    effectSentence,
    endWords,
    isChange,
    isResult,
    resultRows,
    type StepCall,
    stepLine,
} from "./words";

/** How many ids a copied result lists before "and N more". */
const IDS_MAX = 20;

/**
 * Ids as a list, cut short past a few.
 * @param ids - the ids.
 * @returns such as "1, 2, 3 and 4 more".
 */
function idList(ids: readonly (string | number)[]): string {
    const shown = ids.slice(0, IDS_MAX).map(String).join(", ");
    return ids.length > IDS_MAX ? `${shown} and ${ids.length - IDS_MAX} more` : shown;
}

/** What a copied chat says above its turns. */
export interface ChatHeading {
    readonly title: string;
    readonly graph: string | null;
    readonly nodes: number;
    readonly edges: number;
    readonly provider: string;
    readonly model: string;
    readonly effort: string | null;
    readonly scope: string;
    readonly at: Date;
}

/**
 * A time as the copy says it, in ASCII: "2026-11-07 16:20".
 * @param at - the time.
 * @returns the words.
 */
function stamp(at: Date): string {
    const two = (n: number): string => String(n).padStart(2, "0");
    return `${at.getFullYear()}-${two(at.getMonth() + 1)}-${two(at.getDate())} ${two(at.getHours())}:${two(at.getMinutes())}`;
}

/**
 * The ids a result names, read from the element as the result's chips read them.
 * @param session - the session.
 * @param target - what it names.
 * @returns the words, or null when it names none that can be read.
 */
async function namedIds(session: GraphSession | null, target: AiTarget | undefined): Promise<string | null> {
    if (session === null || target === undefined || "scope" in target) {
        return null;
    }
    try {
        const { nodes, edges } = await session.selection.members(target);
        const parts = [
            nodes.length > 0 ? `nodes ${idList(nodes)}` : "",
            edges.length > 0 ? `edges ${idList(edges)}` : "",
        ];
        const named = parts.filter((part) => part !== "").join("; ");
        return named === "" ? null : named;
    } catch {
        return null;
    }
}

/**
 * How a request that held calls ended, from its calls' outcomes.
 * @param codes - its calls' outcome codes.
 * @returns the words.
 */
function heldWords(codes: readonly string[]): string {
    if (codes.includes("AI_APPROVAL_DENIED")) {
        return "Approval asked: you declined";
    }
    if (codes.includes("AI_APPROVAL_STALE")) {
        return "Approval asked: it ended unanswered";
    }
    return "Approval asked: you allowed it";
}

/** What waits on the reader as the chat is copied. */
export interface ChatWaiting {
    readonly approvals: readonly AiApprovalRequest[];
    readonly questions: readonly AiQuestionRequest[];
}

/** A reader's or the assistant's message, as the chat holds it. */
type Message = AiConversationSnapshot["messages"][number];
type ReaderMessage = Extract<Message, { role: "reader" }>;
type AssistantMessage = Extract<Message, { role: "assistant" }>;

/**
 * Words in parentheses after a head, or nothing with none.
 * @param parts - the words, "" for none.
 * @returns such as " (answer, spoken)".
 */
function aside(parts: readonly string[]): string {
    const said = parts.filter((part) => part !== "");
    return said.length === 0 ? "" : ` (${said.join(", ")})`;
}

/**
 * A reader's message: how it was said, then its words.
 * @param message - the message.
 * @returns the lines.
 */
function readerLines(message: ReaderMessage): string[] {
    const { scope } = message;
    const how = aside([
        // A message the reader starts carries its own provenance; an answer goes on with the one asked.
        message.provenance === undefined ? "answer" : "",
        message.via === "voice" ? "spoken" : "",
        scope?.kind === "selection" ? `about the selection, ${scope.nodes} nodes` : "",
        message.undone === true ? "undone" : "",
    ]);
    return [`## You${how}`, ...message.text.split("\n")];
}

/**
 * A reply's steps, each with what it asked for and what came of it, as the panel says them.
 * @param session - the session.
 * @param message - the reply.
 * @returns the lines.
 */
function stepLines(session: GraphSession | null, message: AssistantMessage): string[] {
    if (message.calls.length === 0) {
        return [];
    }
    return [
        "Steps:",
        ...message.calls.flatMap((record, index) => {
            const call: StepCall = { ...record, tool: record.command };
            const asked = askedRows(session, call).map((row) => `${row.label}: ${row.value}`);
            const result = resultRows(session, call);
            return [
                `${index + 1}. ${stepLine(session, call)}`,
                ...(asked.length === 0 ? [] : [`   - Asked for: ${asked.join("; ")}`]),
                ...(result.length === 0 ? [] : [`   - Result: ${result.join("; ")}`]),
            ];
        }),
    ];
}

/**
 * A reply's calls exactly as they ran, for whoever reads a pasted chat to help: each tool, its
 * arguments, and its outcome with what it did.
 * @param message - the reply.
 * @returns the lines.
 */
function supportLines(message: AssistantMessage): string[] {
    if (message.calls.length === 0) {
        return [];
    }
    return [
        "For support:",
        ...message.calls.flatMap((record, index) => {
            const did = record.effects === undefined ? "" : ` ${JSON.stringify(record.effects)}`;
            return [
                `${index + 1}. ${record.command} ${JSON.stringify(record.arguments)}`,
                `   -> ${record.code} ${JSON.stringify(record.params)}${did}`,
            ];
        }),
    ];
}

/**
 * A reply's results, each with the ids it names.
 * @param session - the session.
 * @param effects - the reply's effects.
 * @returns the lines.
 */
async function resultLines(session: GraphSession | null, effects: readonly AiEffect[]): Promise<string[]> {
    const results = effects.filter(isResult);
    const lines = await Promise.all(
        results.map(async (effect) => {
            const ids = await namedIds(session, effect.target);
            const named = ids === null ? "" : ` -- ${ids}`;
            return `- ${effectSentence(session, effect)}${named}`;
        }),
    );
    return lines.length === 0 ? [] : ["Results:", ...lines];
}

/**
 * The assistant's message: its words, its steps, its changes, its results and how it ended.
 * @param session - the session.
 * @param message - the message.
 * @param provider - the provider's name.
 * @returns the lines.
 */
async function replyLines(
    session: GraphSession | null,
    message: AssistantMessage,
    provider: string,
): Promise<string[]> {
    const effects = message.effects ?? [];
    const changes = changeLines(session, effects.filter(isChange));
    const lines = [
        `## Assistant${aside([message.agent ?? ""])}`,
        ...(message.text === "" ? [] : message.text.split("\n")),
        ...(message.saidWhileHeld === true ? [heldWords(message.calls.map((call) => call.code))] : []),
        ...stepLines(session, message),
        ...(changes.length === 0 ? [] : ["Changes:", ...changes.map((line) => `- ${line}`)]),
        ...(await resultLines(session, effects)),
        ...supportLines(message),
    ];
    if (message.outcome !== undefined) {
        const { code, params } = message.outcome;
        const words = endWords(code, params, provider, false);
        lines.push(words === null ? `Ended: ${code}` : `Ended: ${words.line} (${code})`);
    }
    return lines;
}

/**
 * The whole chat as plain text, for a developer to see what the reader saw: a heading, then each
 * message, each reply's steps with their details, its changes and results, and how it ended.
 * @param session - the session, to name columns and read the ids a result names.
 * @param chat - the open chat.
 * @param heading - what goes above it.
 * @param waiting - what waits on the reader.
 * @returns the text.
 */
export async function chatText(
    session: GraphSession | null,
    chat: AiConversationSnapshot,
    heading: ChatHeading,
    waiting: ChatWaiting,
): Promise<string> {
    const effort = heading.effort === null ? "" : `, effort ${heading.effort}`;
    const out = [
        `# ${heading.title}`,
        `Graph: ${heading.graph ?? "untitled"} -- ${heading.nodes} nodes, ${heading.edges} edges`,
        `Assistant: ${heading.provider}, ${heading.model}${effort}, asking about: ${heading.scope}`,
        `Copied: ${stamp(heading.at)}`,
    ];
    for (const message of chat.messages) {
        const lines =
            message.role === "reader" ? readerLines(message) : await replyLines(session, message, heading.provider);
        out.push("", ...lines);
    }
    for (const request of waiting.approvals) {
        out.push("", `Waiting for you: ${approvalWords(request).title}`);
    }
    for (const request of waiting.questions) {
        out.push("", `Waiting for your answer: ${request.question}`, `Choices: ${request.choices.join(" | ")}`);
    }
    return `${out.join("\n")}\n`;
}
