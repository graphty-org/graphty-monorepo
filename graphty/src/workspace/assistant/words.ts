/**
 * Every word the Assistant's panel and its Settings section show, keyed as `design/ui/framework/
 * message-catalog.md` keys them. The element returns codes and parameters; these are the app's words
 * for them. The English the element writes for a log (a stage's message, an error's text, a result's
 * message) is never read here.
 */

import type { AiApprovalRequest, AiStatus } from "@graphty/graphty-element/ai";
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

import { wordsFor } from "../analyze/words";
import { type EffortLevel, providerDisclosure } from "../assistant-door/provider";
import { formatNumber } from "../settings/numberFormat";
import { attributeName, channelWord, plainRule, shownRule } from "../style/words";
import { PROVIDER_PAGES } from "./providerPages";

export const WORDS = {
    "assistant.name": "Assistant",
    "assistant.title.new": "New chat",
    "assistant.title.tooltip": "Chats",
    "assistant.new": "New chat",
    "assistant.close": "Close",
    "assistant.copy": "Copy chat",
    "assistant.copied": "Chat copied",
    "assistant.not-copied": "Chat not copied: the browser refused the clipboard",
    "assistant.intro": "Ask about this graph or change it. It can be wrong.",
    "assistant.wrong": "Answers can be wrong.",
    "assistant.setup.line": "Needs a key from an AI provider. Nothing is sent until you add one.",
    "assistant.setup.button": "AI provider...",
    "assistant.starter.matter": "Which nodes matter most?",
    "assistant.starter.groups": "What groups does this graph have?",
    "assistant.starter.stands-out": "What stands out in this graph?",
    "assistant.composer.placeholder": "Ask about this graph",
    "assistant.composer.placeholder.selection": "Ask about this selection",
    "assistant.composer.answer": "Or type an answer",
    "assistant.composer.name": "Message the assistant",
    "assistant.send": "Send",
    "assistant.stop": "Stop",
    "assistant.talk": "Talk",
    "assistant.talk.stop": "Stop talking",
    "assistant.talk.nothing": "Heard nothing.",
    "assistant.scope.graph": "Whole graph",
    "assistant.scope.selection": "Selection",
    "assistant.scope.about": "Ask about",
    "assistant.options": "Options",
    "assistant.options.selection": "Options, asking about the selection",
    "assistant.chips.name": "Results",
    "assistant.chip.gone": "Not in this graph",
    "assistant.table": "Show in table",
    "assistant.open-layer": "Open layer",
    "assistant.open-run": "Open run",
    "assistant.undo": "Undo",
    "assistant.undone": "Undone",
    "assistant.stopped": "Stopped",
    "assistant.waiting.name": "Waiting for you",
    "assistant.waiting.change": "Change this",
    "assistant.waiting.answer": "Answer",
    "assistant.waiting.invalid": "That is not one of the choices.",
    "assistant.answered": "The assistant answered",
    "assistant.log.name": "Chat",
    "assistant.jump": "Jump to newest",
    "assistant.turn.you": "You",
    "assistant.turn.you-spoken": "You (spoken)",
    "assistant.turn.assistant": "Assistant",
    "assistant.step.unnamed": "A step",
    "assistant.again": "Send again",
    "assistant.add-credit": "Add credit",
    "assistant.key-help.open": "Open the key page",
    "assistant.nothing-changed": "Nothing changed.",
    "assistant.list.name": "Chats",
    "assistant.list.delete": "Delete",
    "assistant.list.confirm": "Delete this chat?",
    "assistant.list.keep": "Keep it",
    "assistant.list.untitled": "New chat",
    "assistant.list.rename": "Rename",
    "assistant.list.name-field": "Chat name",
    "assistant.list.not-renamed": "Not renamed",
    "assistant.notice.open": "Open",
    "assistant.working.writing": "Writing",
    "assistant.status.working": "Working",
    "assistant.status.ready": "Answer ready",
    "assistant.status.waiting-answer": "Waiting for your answer",
    "assistant.status.waiting-approval": "Waiting for your approval",
    "assistant.status.listening": "Listening",
    "assistant.status.transcript": "Transcript in the message box",
    "assistant.provider.provider": "Provider",
    "assistant.provider.model": "Model",
    "assistant.provider.effort": "Effort",
    "assistant.effort.tooltip": "How hard the model thinks before it answers. Lower answers sooner.",
    "assistant.effort.off": "Off",
    "assistant.effort.minimal": "Minimal",
    "assistant.effort.low": "Low",
    "assistant.effort.medium": "Medium",
    "assistant.effort.high": "High",
    "assistant.provider.key": "API key",
    "assistant.provider.key-saved": "********************",
    "assistant.provider.remember": "Remember on this device",
    "assistant.provider.remember-note": "Stored in this browser, not encrypted.",
    "assistant.provider.history-note": "Chats stay in this browser, not encrypted.",
    "assistant.provider.save": "Save",
    "assistant.provider.forget": "Forget key",
    "assistant.provider.delete-all": "Delete all chats",
    "assistant.provider.delete-all-confirm": "Delete all chats?",
    "assistant.provider.delete-all-yes": "Delete all",
    "assistant.provider.delete-all-no": "Keep them",
} as const;

/**
 * The header's count of chats, in its spoken name: "Chats, 3".
 * @param count - the chats
 * @returns the label
 */
export function chatsCountLabel(count: number): string {
    return `${WORDS["assistant.list.name"]}, ${formatNumber(count)}`;
}

/**
 * A chat row's menu button name: "{title} menu".
 * @param title - the chat's title
 * @returns the name
 */
export function chatMenuName(title: string): string {
    return `${title} menu`;
}

/**
 * An effort Select's rows.
 * @param levels - the levels the model takes.
 * @returns the rows.
 */
export const effortRows = (levels: readonly EffortLevel[]): { value: EffortLevel; label: string }[] =>
    levels.map((level) => ({ value: level, label: WORDS[`assistant.effort.${level}`] }));

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
    /** The button it offers: Send again, AI provider..., or both when either cause could be it. */
    readonly action: "again" | "provider" | "again-or-provider" | null;
    /** Whether the row is a failure, spoken at once. */
    readonly failed: boolean;
    /** Where the reader adds credit, for a provider out of it: the row is a warning with this link. */
    readonly billing?: string;
    /** For a stopped run: what shows beside the stop glyph, which stands for "Stopped." in the line. */
    readonly stopped?: string;
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
 * Whether a provider needs a key, from its catalog entry.
 * @param id - its id.
 * @returns true when it does.
 */
const needsKey = (id: unknown): boolean =>
    AI_PROVIDER_DESCRIPTORS.find((entry) => entry.id === id)?.requiresKey ?? false;

/**
 * Why a provider could not be reached. With no status a browser may have hidden a refused key,
 * so a provider that needs one names both causes.
 * @param status - the HTTP status, when it answered with one.
 * @param keyed - whether the provider needs a key.
 * @returns the cause.
 */
function causeWords(status: ResultParam, keyed: boolean): string {
    const code = Number(status);
    if (status === undefined || Number.isNaN(code)) {
        return keyed ? "the connection failed or the key was refused" : "the connection failed";
    }
    if (code === 401 || code === 403) {
        return "the key was refused";
    }
    if (code === 429) {
        return "too many requests or the spend limit was reached";
    }
    return code >= 500 ? "the service is unavailable" : `error ${code}`;
}

/** Why a tool's step failed, by the cause it reported. */
const STEP_CAUSES: Readonly<Record<string, string>> = {
    AI_EMPTY_MATCH: "nothing matched",
    AI_UNKNOWN_ENTRY: "the assistant named something that does not exist",
    AI_PAINTED_NOTHING: "other layers cover it",
    AI_BAD_SELECTOR: "its rule could not be read",
    E_BAD_SELECTOR: "its rule could not be read",
    E_SELECTOR_EMPTY: "its rule was empty",
    AI_UNKNOWN_COLUMN: "that column is not in this graph",
    E_UNKNOWN_ATTRIBUTE: "that column is not in this graph",
    AI_NOT_AVAILABLE: "it is not available here",
    E_UNSUPPORTED: "it is not available here",
    AI_UNKNOWN_RUN: "that result has not been computed",
    E_UNKNOWN_RUN: "that result has not been computed",
    AI_UNKNOWN_NODE: "that node is not in this graph",
    AI_UNKNOWN_EDGE: "that edge is not in this graph",
    AI_ARG_INVALID: "a value it passed was not valid",
    AI_ARG_OUT_OF_RANGE: "a value it passed was out of range",
    E_OPTION_RANGE: "a value it passed was out of range",
    E_BAD_LAYER: "the style it made was not valid",
    E_UNKNOWN_CHANNEL: "that property does not exist",
    E_UNKNOWN_PALETTE: "that palette does not exist",
    E_UNKNOWN_SCALE: "that scale does not exist",
    E_UNKNOWN_LAYER: "that layer does not exist",
    E_LOCKED: "it is locked",
    E_PROTECTED: "it is protected",
    E_CAP_EXCEEDED: "it is over the limit",
    AI_UNDO_NOTHING: "there was nothing to undo",
    AI_UNDO_NOT_MINE: "the last change was not the assistant's",
    AI_UNDO_NOT_ALONE: "only one undo goes in a reply",
    AI_UNDO_IN_MESSAGE: "it cannot undo a change from the same reply",
    AI_CURSOR_STALE: "the graph changed while it read",
    AI_IMPORT_URL_REFUSED: "that address is not allowed",
    E_INTERNAL: "an internal error",
};

/**
 * A failed step's line: its reason when the cause has words, and no reason for any other cause.
 * @param tool - the step's tool.
 * @param cause - the cause it reported.
 * @returns the line.
 */
function failedStepWords(tool: ResultParam, cause: ResultParam): string {
    const reason = STEP_CAUSES[String(cause)];
    const because = reason === undefined ? "" : `: ${reason}`;
    return `${stepName(String(tool))} failed${because}.`;
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
    const id = params.provider ?? provider;
    const name = providerName(id);
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
        case "AI_PROVIDER_ERROR": {
            if (params.cause === "quota") {
                const billing = PROVIDER_PAGES[String(id)]?.billing;
                return {
                    ...setup(
                        `${name} has no credit left on this key. Add credit with ${name}, or choose another provider.`,
                    ),
                    action: "again-or-provider",
                    ...(billing === undefined ? {} : { billing }),
                };
            }
            if (params.cause === "rate-limit") {
                return retry(`${name} is getting too many requests. Wait a moment, then send again.`);
            }
            const keyed = needsKey(id);
            const words = retry(`Could not reach ${name}: ${causeWords(params.status, keyed)}.`);
            const unknown = params.status === undefined || Number.isNaN(Number(params.status));
            return keyed && unknown ? { ...words, action: "again-or-provider" } : words;
        }
        case "AI_PROVIDER_PAUSED":
            return retry(`${name} paused and did not finish.`);
        case "AI_FAILED":
        case "AI_TOOL_THREW":
        case "AI_TOOL_UNKNOWN":
        case "AI_TOOL_INVALID_ARGUMENTS":
            return retry("The assistant could not finish this step.");
        case "AI_TOOL_FAILED":
            return retry(failedStepWords(params.tool, params.cause));
        case "AI_CANCELLED":
            return Number(params.steps) > 0
                ? {
                      line: "Stopped. Changes taken back.",
                      stopped: "Changes taken back.",
                      action: "again",
                      failed: false,
                  }
                : { line: "Stopped.", stopped: "", action: "again", failed: false };
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
            return note("This chat is not being saved.");
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
 * The Steps button's name and tooltip.
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
 * The working line: what is happening now, from what waits on the reader, the stage and the running tool.
 * @param status - the status.
 * @param provider - the provider's id.
 * @returns the line.
 */
export function workingLine(status: AiStatus, provider: string): string {
    if ((status.pending?.approvals ?? 0) > 0) {
        return WORDS["assistant.status.waiting-approval"];
    }
    if ((status.pending?.questions ?? 0) > 0) {
        return WORDS["assistant.status.waiting-answer"];
    }
    const tool = status.toolCalls?.findLast((call) => call.status === "executing");
    if (status.stage === "executing" || tool !== undefined) {
        return runningWords(stepName(tool?.name ?? "", tool?.arguments));
    }
    return status.stage === "generating" ? WORDS["assistant.working.writing"] : sendingWords(providerName(provider));
}

/**
 * The words the provider section names a provider in.
 * @param provider - its name.
 * @returns the section's sentences and link.
 */
export const providerWords = (provider: string): { readonly disclosure: string; readonly link: string } => ({
    disclosure: providerDisclosure(provider),
    link: `Get a key from ${provider}`,
});

/** Where each provider's key page sends a reader, and what it calls the button that makes a key. */
const KEY_SITES: Readonly<
    Partial<Record<string, { readonly site: string; readonly button: string; readonly paid: boolean }>>
> = {
    google: { site: "Google AI Studio", button: "Create API key", paid: false },
    openai: { site: "the OpenAI platform", button: "Create new secret key", paid: true },
    anthropic: { site: "the Claude Console", button: "Create Key", paid: true },
};

/**
 * The key field's help: how to make a key with a provider, step by step, and what its button is called.
 * @param id - the provider's id.
 * @param provider - the provider's name.
 * @returns the help, or null for a provider with no key page.
 */
export function keyHelpWords(
    id: string,
    provider: string,
): { readonly name: string; readonly steps: readonly string[]; readonly note: string } | null {
    const site = KEY_SITES[id];
    if (site === undefined) {
        return null;
    }
    return {
        name: `How to get a key from ${provider}`,
        steps: [
            `Open the key page and sign in to ${site.site}.`,
            `Choose ${site.button}.`,
            "Copy the key. It may be shown only once.",
            "Paste it into API key here, then Save.",
        ],
        note: site.paid
            ? `${provider} needs credit on the account before a key answers.`
            : `${provider} has a free tier. Heavier use needs billing set up.`,
    };
}

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
            // A clear reports what it removes; nothing replaces the graph, so it reads as a removal.
            if (preview.removeNodes !== undefined) {
                return largeWords(request);
            }
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
 * What a style effect's source is called: a run's result by its algorithm, a column by its name.
 * @param session - the session.
 * @param path - the source's path.
 * @returns the name.
 */
function sourceName(session: GraphSession, path: string): string {
    // A run's result, `results.<run>.<field>`, is named by the algorithm that made it.
    const run = /^results\.([^.]+)\./.exec(path)?.[1];
    const algorithm = run === undefined ? undefined : session.runs.get(run)?.algorithm;
    return (algorithm === undefined ? undefined : algorithmByKey(algorithm)?.plainName) ?? attributeName(session, path);
}

/**
 * A style effect's line.
 * @param session - the session, for column names.
 * @param params - the effect's facts.
 * @returns the line.
 */
function styleLine(session: GraphSession | null, params: AiEffect["params"]): string {
    const channel = String(params.channel);
    const count =
        params.edges === undefined ? counted(Number(params.nodes), "node") : counted(Number(params.edges), "edge");
    const source = typeof params.source === "string" ? params.source : undefined;
    const named = session === null || source === undefined ? source : sourceName(session, source);
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
            const layout = layoutDescriptor(String(params.layout))?.plainName ?? String(params.layout);
            return params.nodes === undefined
                ? `Arranged as ${layout}`
                : `Arranged ${counted(Number(params.nodes), "node")} as ${layout}`;
        }
        case "AI_EFFECT_FILTER":
            return `Filtered to ${formatNumber(Number(params.kept))} of ${counted(Number(params.total), "node")}`;
        case "AI_EFFECT_RUN": {
            const name = algorithmByKey(String(params.algorithm))?.plainName ?? String(params.algorithm);
            let computed = `Computed ${name}`;
            if (params.groups !== undefined) {
                computed += `: ${counted(Number(params.groups), "group")}, largest ${counted(Number(params.largest), "node")}`;
            } else if (params.nodes !== undefined) {
                computed += ` for ${counted(Number(params.nodes), "node")}`;
            }
            return params.painted === undefined ? computed : `${computed}, colored by it`;
        }
        case "AI_EFFECT_RUN_REMOVED": {
            const algorithm = algorithmByKey(String(params.algorithm));
            return `Removed ${algorithm === undefined ? String(params.algorithm) : wordsFor(algorithm).name}`;
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
 * A turn's change lines, each said once. Runs paint over each other, so only the turn's last painting
 * run says it colored the graph: the runs under it show no color of theirs. A selection replaces the
 * one before it, so only the turn's last selection has a line. Two calls that did the same thing read
 * alike, and their line shows once.
 * ponytail: a run painting edges beside one painting nodes loses its words, which understates;
 * name the channel on the effect if that matters.
 * @param session - the session, to name a source.
 * @param changes - the turn's changes, in order.
 * @returns one line per distinct change, in the order first made.
 */
export function changeLines(session: GraphSession | null, changes: readonly AiEffect[]): string[] {
    const last = changes.findLastIndex((effect) => effect.params.painted !== undefined);
    const selection = changes.findLastIndex((effect) => effect.code === "AI_EFFECT_SELECTION");
    const lines = changes.flatMap((effect, index) => {
        if (effect.code === "AI_EFFECT_SELECTION" && index !== selection) {
            return [];
        }
        const { painted: _covered, ...params } = effect.params;
        return [effectLine(session, index < last ? { ...effect, params } : effect)];
    });
    return [...new Set(lines)];
}

/**
 * What the status line says as Open run or Open layer opens its thing.
 * @param name - the run's or the layer's name.
 * @returns the words.
 */
export const openedWords = (name: string): string => `Opened ${name}`;

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
 * The composer's options tooltip while the next message is about the selection.
 * @param nodes - how many nodes are selected.
 * @param edges - how many edges are selected.
 * @returns such as "Options: selection, 5 nodes".
 */
export const optionsSelectionTip = (nodes: number, edges: number): string =>
    `${WORDS["assistant.options"]}: selection, ${nodesAndEdges(nodes, edges)}`;

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
        case "recognition-failed":
            return "Speech stopped before it heard you. Try again.";
        case "no-key":
            return "Speech needs a key.";
        default:
            return "Speech is not available.";
    }
}

/** One call as its step line reads it: the tool, what the model passed, and what came of it. */
export interface StepCall {
    readonly tool: string;
    readonly arguments?: Readonly<Record<string, unknown>>;
    /** Its outcome's code, once it has one. */
    readonly code?: string;
    readonly params?: AiResultParams;
    /** What it did, once it ran. */
    readonly effects?: readonly AiEffect[];
}

/** The longest stretch of the model's own words a step line quotes. */
const QUOTED_MAX = 32;

/**
 * Some of the model's words, as a step line quotes them: cut short past a few words.
 * @param value - an argument.
 * @returns the words, or undefined for anything but text.
 */
function quoted(value: unknown): string | undefined {
    if (typeof value !== "string" || value.trim() === "") {
        return undefined;
    }
    const words = value.trim();
    return words.length > QUOTED_MAX ? `${words.slice(0, QUOTED_MAX - 3).trimEnd()}...` : words;
}

/**
 * A rule as a step line says it: its columns by their shown names, its numbers bare.
 * @param session - the session, to name columns; null says the rule as written.
 * @param where - the rule.
 * @returns the words.
 */
const ruleSaid = (session: GraphSession | null, where: string): string =>
    quoted(session === null ? plainRule(where) : shownRule(session, where)) ?? where;

/**
 * An algorithm's name for a run, from the run's id.
 * @param session - the session.
 * @param run - the run's id.
 * @returns the algorithm's name, else the id.
 */
function runName(session: GraphSession | null, run: string): string {
    const algorithm = session?.runs.get(run)?.algorithm ?? run;
    return algorithmByKey(algorithm)?.plainName ?? run;
}

/**
 * Which elements a call's arguments name, as a step line says it: "with Degree > 10", "in the
 * largest group of Communities", or nothing for a call that names none by a rule.
 * @param session - the session.
 * @param args - the call's arguments.
 * @returns the words, or "".
 */
function ruleOf(session: GraphSession | null, args: Readonly<Record<string, unknown>>): string {
    // "all" is every element: the count says it.
    if (typeof args.where === "string" && args.where !== "" && args.where !== "all") {
        return `with ${ruleSaid(session, args.where)}`;
    }
    const result = args.result as { op?: unknown; run?: unknown } | undefined;
    if (typeof result?.run === "string" && (result.op === "largest" || result.op === "smallest")) {
        return `in the ${result.op} group of ${runName(session, result.run)}`;
    }
    return "";
}

/**
 * The step line of a read that named elements: how many, and the rule or text it read by.
 * @param session - the session.
 * @param args - the call's arguments.
 * @param effect - the found effect.
 * @returns the line.
 */
function foundLine(session: GraphSession | null, args: Readonly<Record<string, unknown>>, effect: AiEffect): string {
    const count = nodesAndEdges(Number(effect.params.nodes ?? 0), Number(effect.params.edges ?? 0)) || "0 nodes";
    const { target } = effect;
    const { action } = args;
    if (target !== undefined && "scope" in target) {
        return `${action === "statistics" ? "Read graph statistics" : "Read the graph summary"}: ${count.replace(" and ", ", ")}`;
    }
    if (target !== undefined && "text" in target) {
        return `Found ${count} matching ${quoted(target.text) ?? ""}`.trimEnd();
    }
    if (target !== undefined && "top" in target) {
        const algorithm = session?.runs.get(target.top.run)?.algorithm;
        const name = (algorithm === undefined ? undefined : algorithmByKey(algorithm)?.plainName) ?? target.top.run;
        return `Found top ${count} by ${name}`;
    }
    const rule = ruleOf(session, args);
    let by = "";
    if (rule !== "") {
        by = ` ${rule}`;
    } else if (target !== undefined && "where" in target) {
        by = ` with ${ruleSaid(session, target.where)}`;
    }
    return `${action === "count" ? "Counted" : "Found"} ${count}${by}`;
}

/**
 * A page of records in words, from what the model asked for: "Read top 5 nodes by Degree".
 * @param session - the session.
 * @param args - the call's arguments.
 * @param kind - nodes or edges.
 * @returns the line.
 */
function recordsLine(session: GraphSession | null, args: Readonly<Record<string, unknown>>, kind: string): string {
    const limit = typeof args.limit === "number" ? `${formatNumber(args.limit)} ` : "";
    const sort = quoted(args.sort);
    if (sort === undefined) {
        return `Read ${limit}${kind}`;
    }
    const path = sort.replace(/^-/, "");
    const name = session === null ? path : attributeName(session, path.replace(/^data\./, ""));
    return `Read ${sort.startsWith("-") ? "top" : "bottom"} ${limit}${kind} by ${name}`;
}

/**
 * A query that named nothing, in words from its action and what the model asked for.
 * @param session - the session.
 * @param args - the call's arguments.
 * @returns the line, or undefined for an action with no words.
 */
function queryLine(session: GraphSession | null, args: Readonly<Record<string, unknown>>): string | undefined {
    const first = Array.isArray(args.ids) ? quoted(args.ids[0]) : undefined;
    const where = typeof args.where === "string" && args.where !== "" ? args.where : undefined;
    switch (args.action) {
        case "overview":
            return "Read the graph summary";
        case "nodes":
        case "edges":
            return recordsLine(session, args, args.action);
        case "node":
            return first === undefined ? "Read a node" : `Read ${first}`;
        case "neighbors":
            return first === undefined ? "Read neighbors" : `Read neighbors of ${first}`;
        case "find":
            return `Searched for ${quoted(args.text) ?? "text"}`;
        case "attributes":
            return "Read the columns";
        case "histogram": {
            const column = quoted(args.column);
            const name = session === null || column === undefined ? column : attributeName(session, column);
            return name === undefined ? "Read a histogram" : `Read values of ${name}`;
        }
        case "statistics":
            return "Read graph statistics";
        case "count":
            return where === undefined ? "Counted nodes" : `Counted nodes with ${ruleSaid(session, where)}`;
        default:
            return undefined;
    }
}

/**
 * A call that changed nothing it reports, in words from its tool, its action and what the model
 * asked for.
 * @param session - the session.
 * @param call - the call.
 * @returns the line, or undefined for a call with no words of its own.
 */
function argumentsLine(session: GraphSession | null, call: StepCall): string | undefined {
    const args = call.arguments ?? {};
    switch (call.tool) {
        case "query":
            return queryLine(session, args);
        case "catalog":
            return args.action === "describe"
                ? `Looked up ${quoted(args.name) ?? "an entry"}`
                : `Searched tools for ${quoted(args.text) ?? quoted(args.kind) ?? "a tool"}`;
        case "run_algorithm": {
            const name = calledAlgorithm(call.tool, args)?.plainName ?? quoted(args.name);
            return name === undefined ? undefined : `Ran ${name}`;
        }
        case "undo":
            return { undo: "Undid the last change", redo: "Redid the last change", recent: "Read recent changes" }[
                String(args.action)
            ];
        case "export_graph": {
            const format = session?.catalog.formats().find((each) => each.id === args.format)?.plainName;
            const what = args.whole === true ? "the whole graph " : "";
            return `Exported ${what}as ${format ?? quoted(args.format) ?? "a file"}`;
        }
        case "filter":
            return args.action === "clear" ? "Cleared the filter" : undefined;
        case "select":
            return args.action === "clear" ? "Cleared the selection" : undefined;
        case "ask_reader":
            return "Asked you";
        default:
            return undefined;
    }
}

/**
 * A selection's step line, from what the model asked for and how many it left selected.
 * @param args - the call's arguments.
 * @param line - the change line, such as "Selected 17 nodes".
 * @param count - how many it left selected, in words.
 * @param rule - which elements its rule names, or "".
 * @returns the line.
 */
function selectionStep(args: Readonly<Record<string, unknown>>, line: string, count: string, rule: string): string {
    const ids = Array.isArray(args.ids) ? args.ids.map(String) : [];
    const named = ids.length > 0 && ids.length <= 3 ? ids.join(", ") : counted(ids.length, "element");
    switch (args.action) {
        case "neighborhood": {
            const hops = typeof args.hops === "number" ? args.hops : 1;
            return `Selected ${count} within ${counted(hops, "hop")}`;
        }
        case "remove":
            return ids.length > 0 ? `Deselected ${named}: ${count} left` : `${line} left`;
        default:
            if (rule !== "") {
                return `${line} ${rule}`;
            }
            return ids.length > 0 && ids.length <= 3 ? `${line}: ${named}` : line;
    }
}

/**
 * One change as a step line says it: the change line, with the rule or action the model asked for.
 * @param session - the session.
 * @param effect - the change.
 * @param call - the call that made it.
 * @returns the line.
 */
function changeStep(session: GraphSession | null, effect: AiEffect, call: StepCall): string {
    const args = call.arguments ?? {};
    const line = effectLine(session, effect);
    const rule = ruleOf(session, args);
    const { params } = effect;
    switch (effect.code) {
        case "AI_EFFECT_STYLE":
            return params.source === undefined && rule !== "" ? `${line} ${rule}` : line;
        case "AI_EFFECT_FILTER": {
            const total = counted(Number(params.total), "node");
            if (args.action === "clear") {
                return `Cleared the filter: ${total} shown`;
            }
            return rule === ""
                ? line
                : `Filtered to nodes ${rule}: ${formatNumber(Number(params.kept))} of ${total} shown`;
        }
        case "AI_EFFECT_DATA":
            return rule === "" ? line : `${line}, nodes ${rule}`;
        case "AI_EFFECT_SELECTION":
            return selectionStep(args, line, nodesAndEdges(Number(params.nodes ?? 0), Number(params.edges ?? 0)), rule);
        case "AI_EFFECT_VIEW":
            return args.action === "fit" ? "Fit the graph in view" : line;
        case "AI_EFFECT_OTHER":
            return argumentsLine(session, call) ?? line;
        default:
            return line;
    }
}

/** Why a step did not run, by its outcome's code. */
const NOT_RUN: Readonly<Record<string, string>> = {
    AI_TOOL_NOT_RUN: "not run: an earlier step failed",
    AI_APPROVAL_DENIED: "not run: you declined",
    AI_APPROVAL_STALE: "not run: the request ended",
    AI_TOOL_DENIED_BY_POLICY: "not allowed here",
};

/**
 * A step that failed or did not run, in words: what failed and why.
 * @param call - the call.
 * @returns the line, or undefined for a step that ran.
 */
function failedStep(call: StepCall): string | undefined {
    const name = stepName(call.tool, call.arguments);
    switch (call.code) {
        case "AI_TOOL_FAILED":
            return failedStepWords(call.tool, call.params?.cause).replace(/\.$/, "");
        case "AI_TOOL_INVALID_ARGUMENTS":
            return `${name} failed: the assistant passed values it does not take`;
        case "AI_TOOL_THREW":
            return `${name} failed: an internal error`;
        case "AI_TOOL_UNKNOWN":
            return "A step failed: the assistant named a tool that does not exist";
        default: {
            const reason = call.code === undefined ? undefined : NOT_RUN[call.code];
            return reason === undefined ? undefined : `${name} ${reason}`;
        }
    }
}

/**
 * A step's line: what the call did, on what, and with what result, in one compact line --
 * "Counted 22 nodes with Degree >= 3", "Colored 3 nodes with Degree > 10", "Computed Communities:
 * 4 groups, largest 12 nodes" -- from what it did when it reports that, else from what the model
 * asked for, else the tool's name. A failed step says what failed and why.
 * @param session - the session, to name columns and formats; null words without them.
 * @param call - the call.
 * @returns the line.
 */
export function stepLine(session: GraphSession | null, call: StepCall): string {
    const failed = failedStep(call);
    if (failed !== undefined) {
        return failed;
    }
    const effects = call.effects ?? [];
    const changes = [...new Set(effects.filter(isChange).map((effect) => changeStep(session, effect, call)))];
    if (changes.length > 0) {
        return changes.join(", ");
    }
    const found = effects.find((effect) => effect.code === "AI_EFFECT_FOUND");
    if (found !== undefined) {
        return foundLine(session, call.arguments ?? {}, found);
    }
    const empty = effects.find((effect) => effect.code === "AI_EFFECT_EMPTY");
    if (empty !== undefined) {
        const searched = quoted(empty.params.searched);
        return searched === undefined ? "No matches" : `No matches for ${ruleSaid(session, searched)}`;
    }
    return argumentsLine(session, call) ?? stepName(call.tool, call.arguments);
}
