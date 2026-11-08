/**
 * A chat as plain text, for Copy chat, and each step's details: what the model asked for and what
 * came of it. Everything here words what graphty-element reported; nothing is computed about the graph.
 */

import type { AiApprovalRequest, AiConversationSnapshot, AiQuestionRequest } from "@graphty/graphty-element/ai";
import type { AiEffect, AiTarget } from "@graphty/graphty-element/catalog";
import type { GraphSession } from "@graphty/graphty-element/session";

import { shownRule } from "../style/words";
import {
    approvalWords,
    changeLines,
    durationWords,
    endWords,
    isChange,
    isResult,
    type StepCall,
    stepLine,
} from "./words";

/** The longest an argument's value is said in a step's details. */
const VALUE_MAX = 300;
/** How many ids a step's details or a copied result lists before "and N more". */
const IDS_MAX = 20;

/** What an effect's details are headed with. */
const EFFECT_HEADS: Readonly<Record<string, string>> = {
    AI_EFFECT_STYLE: "Style",
    AI_EFFECT_LAYOUT: "Layout",
    AI_EFFECT_FILTER: "Filter",
    AI_EFFECT_RUN: "Run",
    AI_EFFECT_RUN_REMOVED: "Run removed",
    AI_EFFECT_DATA: "Data",
    AI_EFFECT_SELECTION: "Selection",
    AI_EFFECT_VIEW: "View",
    AI_EFFECT_FOUND: "Found",
    AI_EFFECT_EMPTY: "Matched nothing",
    AI_EFFECT_OTHER: "Changed",
};

/**
 * Ids as a list, cut short past a few.
 * @param ids - the ids.
 * @returns such as "1, 2, 3 and 4 more".
 */
function idList(ids: readonly (string | number)[]): string {
    const shown = ids.slice(0, IDS_MAX).map(String).join(", ");
    return ids.length > IDS_MAX ? `${shown} and ${ids.length - IDS_MAX} more` : shown;
}

/**
 * A rule as the details say it: columns by their shown names.
 * @param session - the session, or null to say it as written.
 * @param rule - the rule.
 * @returns the words.
 */
const ruleWords = (session: GraphSession | null, rule: string): string =>
    session === null ? rule : shownRule(session, rule);

/**
 * One argument's value in words: text as it is, a rule by shown names, anything else as JSON.
 * @param session - the session.
 * @param key - the argument's name.
 * @param value - its value.
 * @returns the words, cut short when long.
 */
function valueWords(session: GraphSession | null, key: string, value: unknown): string {
    let words: string;
    if (typeof value === "string") {
        words = key === "where" ? ruleWords(session, value) : value;
    } else if (Array.isArray(value) && value.every((each) => typeof each !== "object")) {
        words = value.map(String).join(", ");
    } else {
        words = JSON.stringify(value);
    }
    return words.length > VALUE_MAX ? `${words.slice(0, VALUE_MAX - 3)}...` : words;
}

/**
 * What an effect names, in words.
 * @param session - the session.
 * @param target - what it names.
 * @returns the words.
 */
function targetWords(session: GraphSession | null, target: AiTarget): string {
    if ("where" in target) {
        return `rule ${ruleWords(session, target.where)}`;
    }
    if ("text" in target) {
        return `text "${target.text}"`;
    }
    if ("layer" in target) {
        return `layer ${target.layer}`;
    }
    if ("range" in target) {
        return `run ${target.range.run}`;
    }
    if ("top" in target) {
        return `top ${target.top.n} of run ${target.top.run}`;
    }
    if ("ids" in target) {
        return `ids ${idList(target.ids)}`;
    }
    return `the ${target.scope} graph`;
}

/**
 * One effect's facts, as the details list them: "Style: channel node.color, layer l1, nodes 3".
 * @param session - the session.
 * @param effect - the effect.
 * @returns the line.
 */
function effectFacts(session: GraphSession | null, effect: AiEffect): string {
    const facts = Object.entries(effect.params).map(([key, value]) =>
        key === "searched" && typeof value === "string" ? `${key} ${ruleWords(session, value)}` : `${key} ${value}`,
    );
    const named = effect.target === undefined ? undefined : targetWords(session, effect.target);
    if (named !== undefined && !facts.includes(named)) {
        facts.push(named);
    }
    const head = EFFECT_HEADS[effect.code] ?? effect.code;
    return facts.length === 0 ? head : `${head}: ${facts.join(", ")}`;
}

/**
 * A step's details, under its line: the tool and what the model passed, what it did, and how it
 * ended when not as planned.
 * @param session - the session, to name columns.
 * @param call - the call.
 * @returns the lines.
 */
export function stepDetail(session: GraphSession | null, call: StepCall): string[] {
    const args = Object.entries(call.arguments ?? {}).map(
        ([key, value]) => `${key} ${valueWords(session, key, value)}`,
    );
    const lines = [args.length === 0 ? `Tool ${call.tool}` : `Tool ${call.tool}: ${args.join("; ")}`];
    lines.push(...(call.effects ?? []).map((effect) => effectFacts(session, effect)));
    if (call.code !== undefined && call.code !== "AI_COMPLETED") {
        const cause = call.params?.cause;
        lines.push(`Ended ${call.code}${cause === undefined ? "" : `, cause ${cause}`}`);
    }
    return lines;
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
 * Text set off under its head, each line indented.
 * @param text - the text.
 * @param indent - the indent.
 * @returns the lines.
 */
const indented = (text: string, indent: string): string[] => text.split("\n").map((line) => `${indent}${line}`);

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
        out.push("");
        if (message.role === "reader") {
            const how = [
                // A message the reader starts carries its own provenance; an answer goes on with the one asked.
                message.provenance === undefined ? "answer" : "",
                message.via === "voice" ? "spoken" : "",
                message.scope?.kind === "selection" ? `about the selection, ${message.scope.nodes} nodes` : "",
                message.undone === true ? "undone" : "",
            ].filter((part) => part !== "");
            out.push(`## You${how.length === 0 ? "" : ` (${how.join(", ")})`}`, ...indented(message.text, ""));
            continue;
        }
        out.push(`## Assistant${message.agent === undefined ? "" : ` (${message.agent})`}`);
        if (message.text !== "") {
            out.push(...indented(message.text, ""));
        }
        if (message.saidWhileHeld === true) {
            out.push(heldWords(message.calls.map((call) => call.code)));
        }
        if (message.calls.length > 0) {
            out.push("Steps:");
            message.calls.forEach((record, index) => {
                const call: StepCall = { ...record, tool: record.command };
                const ms = record.durationMs === undefined ? "" : ` (${durationWords(record.durationMs)})`;
                out.push(`${index + 1}. ${stepLine(session, call)}${ms}`);
                out.push(...stepDetail(session, call).map((line) => `   - ${line}`));
            });
        }
        const effects = message.effects ?? [];
        const changes = changeLines(session, effects.filter(isChange));
        if (changes.length > 0) {
            out.push("Changes:", ...changes.map((line) => `- ${line}`));
        }
        const results = effects.filter(isResult);
        if (results.length > 0) {
            out.push("Results:");
            for (const effect of results) {
                const ids = await namedIds(session, effect.target);
                out.push(`- ${effectFacts(session, effect)}${ids === null ? "" : ` -- ${ids}`}`);
            }
        }
        if (message.outcome !== undefined) {
            const words = endWords(message.outcome.code, message.outcome.params, heading.provider, false);
            const { code } = message.outcome;
            out.push(words === null ? `Ended: ${code}` : `Ended: ${words.line} (${code})`);
        }
    }
    for (const request of waiting.approvals) {
        out.push("", `Waiting for you: ${approvalWords(request).title}`);
    }
    for (const request of waiting.questions) {
        out.push("", `Waiting for your answer: ${request.question}`, `Choices: ${request.choices.join(" | ")}`);
    }
    return `${out.join("\n")}\n`;
}
