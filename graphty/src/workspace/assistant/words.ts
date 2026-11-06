/**
 * Every word the Assistant's panel and its Settings section show, keyed as `design/ui/framework/
 * message-catalog.md` keys them. The element returns codes and parameters; these are the app's words
 * for them. The English the element writes for a log (a stage's message, an error's text, a result's
 * message) is never read here.
 */

import type { AiApprovalRequest } from "@graphty/graphty-element/ai";
import {
    AI_PROVIDER_DESCRIPTORS,
    type AiEffect,
    type AiKeyShapeCheck,
    type AiResultParams,
    algorithmByKey,
    ASSISTANT_TOOLS,
    calledAlgorithm,
    layoutDescriptor,
} from "@graphty/graphty-element/catalog";
import type { Channel } from "@graphty/graphty-element/schema";
import type { GraphSession } from "@graphty/graphty-element/session";

import { providerDisclosure } from "../assistant-door/provider";
import { formatNumber } from "../settings/numberFormat";
import { attributeName, channelWord } from "../style/words";

export const WORDS = {
    "assistant.name": "Assistant",
    "assistant.title.new": "New conversation",
    "assistant.title.tooltip": "Conversations",
    "assistant.new": "New conversation",
    "assistant.close": "Close",
    "assistant.intro": "Ask about this graph or change it. It can be wrong.",
    "assistant.setup.line": "Needs a key from an AI provider. Nothing is sent until you add one.",
    "assistant.setup.button": "AI provider...",
    "assistant.starter.matter": "Which nodes matter most?",
    "assistant.starter.groups": "What groups does this graph have?",
    "assistant.starter.stands-out": "What stands out in this graph?",
    "assistant.composer.placeholder": "Ask about this graph",
    "assistant.composer.answer": "Or type an answer",
    "assistant.composer.name": "Message the assistant",
    "assistant.send": "Send",
    "assistant.send.tooltip": "Enter sends, Shift+Enter makes a new line",
    "assistant.stop": "Stop Esc",
    "assistant.talk": "Talk",
    "assistant.talk.stop": "Stop talking",
    "assistant.scope.graph": "Whole graph",
    "assistant.scope.selection": "Selection",
    "assistant.scope.use": "Use selection",
    "assistant.scope.drop": "Ask about the whole graph",
    "assistant.chips.name": "Results",
    "assistant.chip.gone": "Not in this graph",
    "assistant.table": "Show in table",
    "assistant.open-layer": "Open layer",
    "assistant.open-run": "Open run",
    "assistant.undo": "Undo",
    "assistant.undone": "Undone",
    "assistant.waiting.name": "Waiting for you",
    "assistant.waiting.change": "Change this",
    "assistant.waiting.answer": "Answer",
    "assistant.waiting.invalid": "That is not one of the choices.",
    "assistant.answered": "The assistant answered",
    "assistant.model.tooltip": "Change provider or model",
    "assistant.log.name": "Conversation",
    "assistant.jump": "Jump to newest",
    "assistant.turn.you": "You",
    "assistant.turn.you-spoken": "You (spoken)",
    "assistant.turn.assistant": "Assistant",
    "assistant.step.unnamed": "A step",
    "assistant.again": "Send again",
    "assistant.nothing-changed": "Nothing changed.",
    "assistant.list.name": "Conversations",
    "assistant.list.open": "Open",
    "assistant.list.delete": "Delete",
    "assistant.list.confirm": "Delete this conversation?",
    "assistant.list.keep": "Keep it",
    "assistant.list.untitled": "New conversation",
    "assistant.working.writing": "Writing",
    "assistant.status.working": "Working",
    "assistant.status.ready": "Answer ready",
    "assistant.status.waiting-answer": "Waiting for your answer",
    "assistant.status.listening": "Listening",
    "assistant.status.transcript": "Transcript in the message box",
    "assistant.provider.provider": "Provider",
    "assistant.provider.model": "Model",
    "assistant.provider.key": "API key",
    "assistant.provider.key-saved": "********************",
    "assistant.provider.remember": "Remember on this device",
    "assistant.provider.remember-note": "Stored in this browser, not encrypted.",
    "assistant.provider.history-note": "Conversations stay in this browser, not encrypted.",
    "assistant.provider.save": "Save",
    "assistant.provider.forget": "Forget key",
    "assistant.provider.delete-all": "Delete all conversations",
    "assistant.provider.delete-all-confirm": "Delete all conversations?",
    "assistant.provider.delete-all-yes": "Delete all",
    "assistant.provider.delete-all-no": "Keep them",
} as const;

/** The pages a reader makes a key on, by provider id; the app's, not catalog data. */
export const KEY_PAGES: Readonly<Record<string, string>> = {
    google: "https://aistudio.google.com/apikey",
    openai: "https://platform.openai.com/api-keys",
    anthropic: "https://console.anthropic.com/settings/keys",
};

/**
 * What a run's model is told, written by the app for the model and never shown (design 5.4).
 */
export const MODEL_INSTRUCTIONS =
    "Keep answers short. Write plain text with no markdown. Never name a color or a position in an " +
    "answer. Ask the reader when a wrong guess would cost them.";

/** One fact behind a result's code, when it has it. */
type ResultParam = AiResultParams[string] | undefined;

/** One ended turn in words. */
export interface EndWords {
    /** The turn's line. */
    readonly line: string;
    /** The one button it offers. */
    readonly action: "again" | "provider" | null;
    /** Whether the row is a failure, spoken at once. */
    readonly failed: boolean;
}

/**
 * A provider's own name.
 * @param id - its id, or what a result's params say it is.
 * @returns its name.
 */
export function providerName(id: unknown): string {
    return AI_PROVIDER_DESCRIPTORS.find((entry) => entry.id === id)?.plainName ?? String(id);
}

/**
 * A tool's plain name, or for an algorithm the algorithm's.
 * @param tool - the tool's name.
 * @param args - what the model called it with, read only to name an algorithm.
 * @returns the name.
 */
export function stepName(tool: string, args?: Readonly<Record<string, unknown>>): string {
    return (
        calledAlgorithm(tool, args)?.plainName ??
        ASSISTANT_TOOLS.find((entry) => entry.name === tool)?.plainName ??
        WORDS["assistant.step.unnamed"]
    );
}

/**
 * Why a provider could not be reached.
 * @param status - the HTTP status, when it answered with one.
 * @returns the cause.
 */
function causeWords(status: ResultParam): string {
    const code = Number(status);
    if (status === undefined || Number.isNaN(code)) {
        return "the connection failed";
    }
    if (code === 401 || code === 403) {
        return "the key was refused";
    }
    if (code === 429) {
        return "too many requests or the spend limit was reached";
    }
    return code >= 500 ? "the service is unavailable" : `error ${code}`;
}

/**
 * Why a held change was not run.
 * @param reason - the result's reason.
 * @returns the line.
 */
function staleWords(reason: ResultParam): string {
    switch (reason) {
        case "graph-changed":
            return "Not run: the graph changed.";
        case "superseded":
            return "Not run: you sent a new message.";
        case "expired":
            return "Not run: the request expired.";
        default:
            return "Not run.";
    }
}

/**
 * Worded by code, a failure offering Send again.
 * @param line - the words.
 * @returns the row.
 */
const retry = (line: string): EndWords => ({ line, action: "again", failed: true });

/**
 * Worded by code, a failure sending the reader to setup.
 * @param line - the words.
 * @returns the row.
 */
const setup = (line: string): EndWords => ({ line, action: "provider", failed: true });

/**
 * Worded by code, a line that needs no button.
 * @param line - the words.
 * @returns the row.
 */
const note = (line: string): EndWords => ({ line, action: null, failed: false });

/**
 * The words for how a message ended (design 6.4).
 * @param code - the result's code, open: an unknown one falls back on `success`.
 * @param params - its facts.
 * @param provider - the provider's id, for a code that does not name it.
 * @param success - whether the message succeeded, for an unknown code.
 * @returns the row, or null for a message that ended in the reply itself.
 */
export function endWords(code: string, params: AiResultParams, provider: string, success: boolean): EndWords | null {
    const name = providerName(params.provider ?? provider);
    switch (code) {
        case "AI_COMPLETED":
        case "AI_CONFIRMATION_NEEDED":
        case "AI_QUESTION_ASKED":
            return null;
        case "AI_NO_RESPONSE":
            return retry("No answer came back.");
        case "AI_NOT_ENABLED":
        case "AI_DISPOSED":
            return setup("The assistant is not connected.");
        case "AI_KEY_MISSING":
            return setup(`Add a key for ${name}.`);
        case "AI_KEY_REJECTED":
            return setup(`${name} refused the key.`);
        case "AI_CONFIG_INVALID":
            return setup("The AI provider settings cannot be used.");
        case "AI_HOSTED_TOOL_UNSUPPORTED":
            return note(`${name} cannot use this tool, so the assistant worked without it.`);
        case "AI_PROVIDER_ERROR":
            return retry(`Could not reach ${name}: ${causeWords(params.status)}.`);
        case "AI_PROVIDER_PAUSED":
            return retry(`${name} paused and did not finish.`);
        case "AI_FAILED":
        case "AI_TOOL_THREW":
        case "AI_TOOL_UNKNOWN":
        case "AI_TOOL_INVALID_ARGUMENTS":
            return retry("The assistant could not finish this step.");
        case "AI_TOOL_FAILED":
            return retry(`${stepName(String(params.tool))} failed.`);
        case "AI_CANCELLED":
            return note("Stopped. Changes taken back.");
        case "AI_UNDONE":
            return note("Undone while running. Changes taken back.");
        case "AI_ROLLBACK_PARTIAL":
            return note(`Stopped. ${params.steps} changes could not be taken back.`);
        case "AI_APPROVAL_DENIED":
            return note("Declined. Nothing changed.");
        case "AI_APPROVAL_STALE":
            return note(staleWords(params.reason));
        case "AI_TOOL_DENIED_BY_POLICY":
            return note("Not allowed here. Nothing changed.");
        case "AI_TOOL_NOT_RUN":
            return note("Not run.");
        case "AI_ANSWER_INVALID":
            return note("That is not one of the choices.");
        case "AI_HISTORY_UNAVAILABLE":
        case "AI_STORAGE_FAILED":
            return note("This conversation is not being saved.");
        case "AI_HISTORY_NEWER_FORMAT":
            return note("Saved by a newer version of graphty, so it was left as it is.");
        default:
            return success ? note("Finished.") : retry("Failed.");
    }
}

/**
 * The third starter.
 * @param column - the first categorical column's name.
 * @returns the question.
 */
export const starterColumn = (column: string): string => `Does ${column} line up with the groups?`;

/**
 * The steps row.
 * @param count - how many.
 * @returns its words.
 */
export const stepsWords = (count: number): string => `${count} ${count === 1 ? "step" : "steps"}`;

/**
 * A step's time.
 * @param ms - how long it ran.
 * @returns its words.
 */
export const durationWords = (ms: number): string => (ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`);

/**
 * The working line while a message is sent.
 * @param provider - the provider's name.
 * @returns the words.
 */
export const sendingWords = (provider: string): string => `Sending to ${provider}`;

/**
 * The working line while a tool runs.
 * @param name - the tool or algorithm's plain name.
 * @returns the words.
 */
export const runningWords = (name: string): string => `Running ${name}`;

/**
 * The words the provider section names a provider in.
 * @param provider - its name.
 * @returns the section's sentences and link.
 */
export const providerWords = (provider: string): { readonly disclosure: string; readonly link: string } => ({
    disclosure: providerDisclosure(provider),
    link: `Get a key from ${provider}`,
});

/**
 * The one line under the key field.
 * @param check - what `checkApiKeyShape` said.
 * @param provider - the provider's name.
 * @returns the line, or null for a key of the right shape.
 */
export function keyShapeWords(check: AiKeyShapeCheck, provider: string): string | null {
    if (check.valid) {
        return null;
    }
    switch (check.code) {
        case "E_KEY_EMPTY":
            return "Enter a key.";
        case "E_KEY_PREFIX":
            return `${provider} keys start with ${check.params.prefix}.`;
        default:
            return "This key is too short.";
    }
}

/**
 * A count of a thing.
 * @param count - how many.
 * @param one - the thing.
 * @returns such as "12 nodes".
 */
export const counted = (count: number, one: string): string => `${formatNumber(count)} ${one}${count === 1 ? "" : "s"}`;

/**
 * Nodes and edges in one phrase; a count of zero drops out.
 * @param nodes - how many nodes.
 * @param edges - how many edges.
 * @returns such as "12 nodes and 30 edges".
 */
function nodesAndEdges(nodes: number, edges: number): string {
    return [nodes > 0 ? counted(nodes, "node") : "", edges > 0 ? counted(edges, "edge") : ""]
        .filter((part) => part !== "")
        .join(" and ");
}

/** An approval card in words. */
export interface ApprovalWords {
    readonly title: string;
    readonly line: string | null;
    readonly primary: string;
    readonly decline: string;
}

const UNDO_REACHES = "Undo can bring them back.";

/**
 * What a held request's calls are, by name.
 * @param request - the request.
 * @returns the tools' plain names.
 */
function toolNames(request: AiApprovalRequest): string {
    return [...new Set(request.calls.map((call) => stepName(call.tool, call.arguments)))].join(", ");
}

/**
 * A `large` card: its removal, else the values it changes.
 * @param request - the request.
 * @returns the words.
 */
function largeWords(request: AiApprovalRequest): ApprovalWords {
    const { preview } = request;
    const removing = nodesAndEdges(preview.removeNodes ?? 0, preview.removeEdges ?? 0);
    return removing === ""
        ? {
              title: `Change ${counted(preview.changedValues ?? 0, "value")}?`,
              line: UNDO_REACHES,
              primary: "Change",
              decline: "Keep them",
          }
        : { title: `Remove ${removing}?`, line: UNDO_REACHES, primary: "Remove", decline: "Keep them" };
}

/**
 * An approval card's words, from its gate and what was measured, never the model's arguments
 * (design 6.5). Only `irreversible` says Undo cannot reach it.
 * @param request - the request.
 * @returns the words.
 */
export function approvalWords(request: AiApprovalRequest): ApprovalWords {
    const { gate, preview } = request;
    const algorithm = preview.algorithm === undefined ? undefined : algorithmByKey(preview.algorithm);
    const otherwise = { title: `Run ${toolNames(request)}?`, line: null, primary: "Allow", decline: "Decline" };
    switch (gate) {
        case "large":
            return largeWords(request);
        case "replaces":
            return {
                title: `Replace this graph's ${nodesAndEdges(preview.nodes ?? 0, preview.edges ?? 0)}?`,
                line: null,
                primary: "Replace",
                decline: "Keep this graph",
            };
        case "irreversible": {
            const removing = nodesAndEdges(preview.removeNodes ?? 0, preview.removeEdges ?? 0);
            return {
                title: removing === "" ? `Run ${toolNames(request)}?` : `Remove ${removing}?`,
                line: "Undo cannot bring this back.",
                primary: removing === "" ? "Run" : "Remove",
                decline: "Keep them",
            };
        }
        case "slow":
            return {
                title: `Run ${algorithm?.plainName ?? toolNames(request)}?`,
                line:
                    typeof preview.seconds === "number"
                        ? `About ${counted(preview.seconds, "second")}.`
                        : "May run for a long time.",
                primary: "Run",
                decline: "Skip",
            };
        case "network":
            return preview.url === undefined
                ? otherwise
                : {
                      title: `Load ${preview.url}?`,
                      line: "Reads a page outside graphty.",
                      primary: "Load",
                      decline: "Skip",
                  };
        default:
            return otherwise;
    }
}

/**
 * A waiting request's notice, for a reader away from the panel.
 * @param title - an approval's title, or null for a question.
 * @returns the words, such as "Waiting: remove 12 nodes".
 */
export function awayWords(title: string | null): string {
    if (title === null) {
        return WORDS["assistant.status.waiting-answer"];
    }
    return `Waiting: ${title.charAt(0).toLowerCase()}${title.slice(1).replace(/\?$/, "")}`;
}

/**
 * Whether an effect is what a read found, or that it found nothing.
 * @param effect - the effect.
 * @returns true for a result.
 */
export const isResult = (effect: AiEffect): boolean =>
    effect.code === "AI_EFFECT_FOUND" || effect.code === "AI_EFFECT_EMPTY";

/**
 * Whether an effect draws a change line: not a read, and not a selection of nothing.
 * @param effect - the effect.
 * @returns true for a change.
 */
export const isChange = (effect: AiEffect): boolean =>
    !isResult(effect) &&
    (effect.code !== "AI_EFFECT_SELECTION" || Number(effect.params.nodes ?? 0) + Number(effect.params.edges ?? 0) > 0);

/**
 * A style effect's line.
 * @param session - the session, to name a source.
 * @param params - the effect's facts.
 * @returns the line.
 */
function styleLine(session: GraphSession | null, params: AiEffect["params"]): string {
    const channel = String(params.channel);
    const count =
        params.edges === undefined ? counted(Number(params.nodes), "node") : counted(Number(params.edges), "edge");
    const source = typeof params.source === "string" ? params.source : undefined;
    const named = session === null || source === undefined ? source : attributeName(session, source);
    const by = named === undefined ? "" : ` by ${named}`;
    if (channel.endsWith(".color")) {
        return `Colored ${count}${by}`;
    }
    if (channel.endsWith(".size")) {
        return `Sized ${count}${by}`;
    }
    return `Set ${(channelWord(channel as Channel) ?? channel).toLowerCase()} on ${count}`;
}

/**
 * A data effect's line.
 * @param params - the effect's facts.
 * @returns the line.
 */
function dataLine(params: AiEffect["params"]): string {
    const n = (name: string): number => Number(params[name] ?? 0);
    const added = nodesAndEdges(n("addedNodes"), n("addedEdges"));
    const removed = nodesAndEdges(n("removedNodes"), n("removedEdges"));
    return [
        added === "" ? "" : `Added ${added}`,
        removed === "" ? "" : `Removed ${removed}`,
        n("changedValues") > 0 ? `Changed ${counted(n("changedValues"), "value")}` : "",
    ]
        .filter((part) => part !== "")
        .join(", ");
}

/**
 * One effect's change line (design 6.6).
 * @param session - the session, to name a source.
 * @param effect - the effect.
 * @returns the line.
 */
export function effectLine(session: GraphSession | null, effect: AiEffect): string {
    const { code, params } = effect;
    switch (code) {
        case "AI_EFFECT_STYLE":
            return styleLine(session, params);
        case "AI_EFFECT_LAYOUT": {
            const layout = layoutDescriptor(String(params.layout));
            return `Arranged as ${layout?.plainName ?? String(params.layout)}`;
        }
        case "AI_EFFECT_FILTER":
            return `Filtered to ${formatNumber(Number(params.kept))} of ${counted(Number(params.total), "node")}`;
        case "AI_EFFECT_RUN": {
            const name = algorithmByKey(String(params.algorithm))?.plainName ?? String(params.algorithm);
            return params.nodes === undefined
                ? `Computed ${name}`
                : `Computed ${name} for ${counted(Number(params.nodes), "node")}`;
        }
        case "AI_EFFECT_DATA":
            return dataLine(params);
        case "AI_EFFECT_SELECTION":
            return `Selected ${nodesAndEdges(Number(params.nodes ?? 0), Number(params.edges ?? 0))}`;
        case "AI_EFFECT_VIEW":
            return "Moved the view";
        default:
            return "Changed the graph";
    }
}

/**
 * The line for what a style left out because a filter hides it.
 * @param effects - a turn's changes.
 * @returns the line, or null with nothing left out.
 */
export function excludedLine(effects: readonly AiEffect[]): string | null {
    const styles = effects.filter((effect) => effect.code === "AI_EFFECT_STYLE" && Number(effect.params.hidden) > 0);
    const worst = styles.reduce((most, effect) => Math.max(most, Number(effect.params.hidden)), 0);
    if (worst === 0) {
        return null;
    }
    const colored = styles.every((effect) => String(effect.params.channel).endsWith(".color"));
    return `${formatNumber(worst)} hidden ${worst === 1 ? "node" : "nodes"} ${colored ? "not colored" : "not changed"}`;
}

/**
 * An empty result's row.
 * @param searched - what was searched for.
 * @returns the words.
 */
export const emptyWords = (searched: unknown): string =>
    typeof searched === "string" && searched !== "" ? `No matches for ${searched}.` : "No matches.";

/**
 * The row of more change lines.
 * @param count - how many more.
 * @returns the words.
 */
export const moreWords = (count: number): string => `and ${formatNumber(count)} more`;

/**
 * A chip's spoken name: the count, because the peek shows only on the canvas.
 * @param kind - nodes or edges.
 * @param count - how many.
 * @returns the name.
 */
export const chipName = (kind: "node" | "edge", count: number): string => `${counted(count, kind)}, select`;

/**
 * The hidden part of the scope line.
 * @param count - how many nodes a filter hides.
 * @returns the words.
 */
export const hiddenWords = (count: number): string => `${formatNumber(count)} hidden`;

/**
 * Where a first press of Talk says the audio goes.
 * @param destination - the element's fact.
 * @param provider - the provider's name.
 * @returns the words, or null when it stays on the device.
 */
export function audioWords(destination: string, provider: string): string | null {
    switch (destination) {
        case "browser-vendor":
            return "Speech goes to your browser's maker.";
        case "provider":
            return `Speech goes to ${provider}.`;
        default:
            return null;
    }
}

/**
 * A voice failure's line (design 6.4).
 * @param reason - the reason in `AI_VOICE_UNAVAILABLE`'s params.
 * @returns the line.
 */
export function voiceWords(reason: string | number | undefined): string {
    switch (reason) {
        case "permission-denied":
            return "Allow the microphone to talk.";
        case "no-microphone":
            return "No microphone found.";
        case "insecure-context":
        case "no-recognition":
        case "no-provider-transcription":
            return "This browser cannot take speech here.";
        case "recognition-network":
            return "Speech stopped: the connection dropped.";
        case "no-key":
            return "Speech needs a key.";
        default:
            return "Speech is not available.";
    }
}
