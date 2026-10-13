/**
 * @file The assistant's loop: ask the model, run the tools it calls, hand their results back, and
 * repeat until it answers. Everything it works on is passed in, so several conversations (a
 * helper beside the main one, later) can run it at once.
 *
 * The shape: the conversation so far, one model turn, the calls of that turn run as one batch
 * (all or nothing) in one short transaction, their results added to the conversation; up to
 * `MAX_ASSISTANT_TOOL_TURNS` such rounds, then one turn that may only answer in text.
 *
 * Each turn offers the profile's always-loaded tools plus the on-demand tools a `catalog` result
 * of this conversation named, most recent first: tool search lives here, in graphty's own loop,
 * so it works on every engine.
 */

import type { AiResultCode, AiResultParams } from "../catalog/ai";
import { GraphtyLogger, type Logger } from "../logging";
import type { GraphSession, HistoryStepId } from "../session/types";
import type { AiPlan } from "./agents";
import type { ExecutionResult } from "./AiController";
import type { CommandRegistry } from "./commands";
import type { CommandContext, GraphCommand } from "./commands/types";
import { DEFAULT_HISTORY_BUDGET_TOKENS, historyWindow } from "./conversation/Conversation";
import { toolJsonSchema } from "./engine/jsonSchema";
import { providerFailure } from "./engine/LlmProviderEngine";
import type {
    AiEngine,
    JsonSchema,
    SavedMessage,
    SavedPart,
    ToolResultOutcome,
    ToolSpec,
    TurnError,
    TurnEvent,
    TurnRequest,
} from "./engine/types";
import {
    type BatchOutcome,
    BatchThrew,
    type CallResult,
    type ConversationSink,
    type HeldBatch,
    knownToolName,
    modelView,
    type Outcome,
    runToolBatch,
    type ToolBatch,
    type ToolCallRequest,
} from "./ToolExecutor";
import { type HostedToolSetting, turnHostedTools } from "./tools/hosted";
import { MAX_LOADED_TOOLS, PROFILE_TOOLS } from "./tools/install";
import type { ToolProfile } from "./tools/prompt";
import { resultText } from "./tools/shape";
import { isAssistantTool } from "./tools/toolset";
import { DEFAULT_ASSISTANT_GATE_LIMITS, type GateKind, type MessageState, type ToolHost } from "./tools/types";

const logger: Logger = GraphtyLogger.getLogger(["graphty", "ai"]);

/** How many tool rounds one message may take before it must answer in text. */
export const MAX_ASSISTANT_TOOL_TURNS = 8;

/** The last ask's closing message, after the tool turns ran out: answer, do not call another tool. */
const ANSWER_NOW: SavedMessage = {
    id: "answer-now",
    role: "user",
    parts: [
        {
            type: "text",
            origin: "graphty",
            text: "No more tools can run for this message. Answer me now in plain text: say what you found and what you changed, and if my request was unclear, ask what I want.",
        },
    ],
};

/** How much of one tool result is handed back to the model, by profile. */
export const RESULT_CAP: Readonly<Record<ToolProfile, number>> = { standard: 8000, small: 1500 };

/** The loop's own tool for a question to the reader, offered only when questions are switched on. */
export const ASK_READER = "ask_reader";

/** A question the model asked, its arguments checked. */
export interface AskedQuestion {
    /** The `ask_reader` call. */
    readonly call: ToolCallRequest;
    readonly question: string;
    readonly choices: readonly string[];
    readonly multiple: boolean;
}

/** The `ask_reader` tool and how a call of it is checked: the questions module's, loaded when needed. */
export interface QuestionTool {
    readonly tool: ToolSpec;
    /** A call of the tool, checked: the question, or undefined when its arguments do not fit. */
    readonly parse: (call: ToolCallRequest) => AskedQuestion | undefined;
}

/** The loop's own tool for handing a task to a helper, offered only when helpers are configured. */
export const DELEGATE = "delegate";

/** The in-page code tool's name, which the loop offers when `tools.inPageCode` is on and can run. */
export const RUN_CODE = "run_code";

/** In-page code (`run_code`): the program module's, loaded only when it is on. */
export interface CodeTool {
    readonly tool: ToolSpec;
    /**
     * Run one call: its program, whose tool calls each run read-only through `callTool`.
     * @param call - The `run_code` call.
     * @param offered - The tools the turn offers.
     * @param callTool - Runs one of the program's calls as a read-only batch of its own.
     * @param signal - Cancels the program.
     * @param cap - The most characters the result may take.
     * @returns The call's result.
     */
    run(
        call: ToolCallRequest,
        offered: readonly GraphCommand[],
        callTool: (request: ToolCallRequest) => Promise<BatchOutcome>,
        signal: AbortSignal,
        cap: number,
    ): Promise<SavedPart>;
}

/** Tokens a model used. */
export interface TokenUsage {
    readonly inputTokens: number;
    readonly outputTokens: number;
}

/** No tokens. */
export const NO_USAGE: TokenUsage = Object.freeze({ inputTokens: 0, outputTokens: 0 });

/**
 * Two counts of tokens, summed.
 * @param a - One.
 * @param b - The other.
 * @returns Their sum.
 */
export function addUsage(a: TokenUsage, b: TokenUsage): TokenUsage {
    return { inputTokens: a.inputTokens + b.inputTokens, outputTokens: a.outputTokens + b.outputTokens };
}

/** What an earlier helper of the message answered, which a later one is told. */
export interface HelperAnswer {
    readonly agent: string;
    readonly code: AiResultCode;
    /** Its result, as the model reads it. */
    readonly content: string;
    /** Its result was read on the web: a later helper is told it as web content. */
    readonly web?: boolean;
}

/**
 * Helpers the model may hand tasks to (`delegate`), run by the plans module, which is loaded only
 * when helpers are configured.
 */
export interface Delegation {
    /** The `delegate` tool, its `agent` an enum of the role names. */
    readonly tool: ToolSpec;
    /**
     * The helpers that may fetch web pages: a task the model hands one can carry what it read
     * into a URL, so after web content it is judged as a write (`webContentWrites`).
     */
    readonly fetches: ReadonlySet<string>;
    /**
     * Run one turn's `delegate` calls, after the turn's other calls committed.
     * @param calls - The calls.
     * @param parent - The run that made them, whose message, session and abort the helpers share.
     * @param state - The message's state.
     * @param sequence - Run them one after another, each told what the ones before it answered,
     *     rather than at once and read-only.
     * @param prior - What earlier helpers answered, which each is told; for a plan's step, the
     *     plan's earlier hand-offs when absent.
     * @returns The parts the calls' tool message gets (each call's result and its helper's
     *     conversation), and the tokens the helpers used.
     */
    run(
        calls: readonly ToolCallRequest[],
        parent: ConversationRun,
        state: MessageState,
        sequence?: boolean,
        prior?: readonly HelperAnswer[],
    ): Promise<DelegatedRun>;
    /**
     * Continue a helper whose batch was held, with the reader's decision, until it answers; then
     * run the hand-offs of its turn that a sequence had not reached yet.
     * @param callId - The `delegate` call the helper answers.
     * @param decided - The decided batch its conversation ends in.
     * @param parent - The run continuing the message.
     * @param state - The message's state.
     * @returns The parts the parent's next tool message gets, as for `run`.
     */
    resume(callId: string, decided: DecidedBatch, parent: ConversationRun, state: MessageState): Promise<DelegatedRun>;
}

/** A helper whose batch was held: the message waits on the reader for it. */
export interface HeldHelper {
    readonly held: HeldBatch;
    /** The helper's message holding the calls. */
    readonly messageId: string;
    readonly agent: string;
    /** The `delegate` call the helper answers. */
    readonly callId: string;
}

/** What one turn's hand-offs did. */
export interface DelegatedRun {
    /** The parts the calls' tool message gets: each result, and each helper's conversation. */
    readonly parts: readonly SavedPart[];
    readonly usage: TokenUsage;
    /** A helper's held batch, which ends the message there; its call has no result yet. */
    readonly held?: HeldHelper;
    /**
     * A helper's provider stopped its turn mid-search, and kept stopping when the turn was sent
     * back to continue (`AI_PROVIDER_PAUSED`'s params): the message ends there.
     */
    readonly paused?: AiResultParams;
}

/** One step of a router's plan: its `delegate` calls, and whether they run one after another. */
export interface PlannedStep {
    readonly calls: readonly ToolCallRequest[];
    readonly sequence: boolean;
}

/** A router's plan, which the loop runs as `delegate` calls of graphty's own before the model's turns. */
export interface PlanSteps {
    /**
     * The next step.
     * @param newId - Makes a call's id.
     * @returns The step, or undefined once the plan is done.
     */
    next(newId: () => string): PlannedStep | undefined;
    /** Whether the step `next` returned last runs one after another (false once the plan is done). */
    readonly sequence: boolean;
    /**
     * The plan and the step it runs next, as a saved `plan-step` entry keeps them.
     * @returns Them.
     */
    saved(): { readonly plan: AiPlan; readonly next: number };
}

/** A conversation: the instructions and the messages so far. The loop appends to `messages`. */
export interface Conversation {
    readonly system: string;
    readonly messages: SavedMessage[];
}

/** One run of the loop for one message. */
export interface ConversationRun {
    readonly conversation: Conversation;
    readonly engine: AiEngine;
    /** The commands the model may call. */
    readonly tools: CommandRegistry;
    readonly graph: CommandContext["graph"];
    readonly session: GraphSession;
    /** The reader's request, the label of the message's undo step. */
    readonly label: string;
    /** The message's id, stamped on its steps' provenance. */
    readonly message: string;
    /** Fires when the message is cancelled or undone; a batch's abort aborts it too. */
    readonly abort: AbortController;
    readonly sink: ConversationSink;
    /** The model, when the engine does not hold its own. */
    readonly model?: string;
    /** Which tools a turn offers; standard when absent. */
    readonly profile?: ToolProfile;
    /** How many tokens of history a turn is shown; the profile's default when absent. */
    readonly historyBudgetTokens?: number;
    /** The message's state; one with the default gate when absent. */
    readonly state?: MessageState;
    /** Where export payloads go, the reader's text, the URL policy. */
    readonly host?: ToolHost;
    /**
     * Store a held batch for the host's approval. The conversation then ends in the assistant
     * message holding its calls, whose results the decision adds.
     * @returns The approval request's id, or undefined when nothing can approve it; settles once
     *     the request is saved and the host told.
     */
    readonly hold?: (
        held: HeldBatch,
        messageId: string,
        helper?: { readonly agent: string; readonly callId: string },
    ) => Promise<string | undefined>;
    /** End the run at a hold, with no answer-only turn: a helper's hold ends the whole message. */
    readonly endAtHold?: boolean;
    /** A helper's held batch the reader decided, which the run continues first. */
    readonly resume?: { readonly callId: string; readonly decided: DecidedBatch };
    /**
     * A held batch the reader decided, which the run starts with: its results answer the calls
     * the conversation ends in, and ordinary turns follow until the model answers.
     */
    readonly decided?: DecidedBatch;
    /**
     * Ids for the messages the loop adds; `m<n>` (the message's place) when absent. A saved
     * conversation passes unique ones, so two copies merged by id keep both.
     */
    readonly newId?: () => string;
    /**
     * Store a question the model asked (`ask_reader`), which the loop offers only when this and
     * `questions` are set. The conversation then ends in the call, whose result the reader's answer adds.
     * @returns The question's id, once it is saved and the host told.
     */
    readonly ask?: (question: AskedQuestion, messageId: string) => Promise<string>;
    /** The `ask_reader` tool, with `ask`. */
    readonly questions?: QuestionTool;
    /** The reader's answer to a question, which the run starts with: the result of its call. */
    readonly answer?: ReaderAnswer;
    /** Helpers the model may hand tasks to; the loop offers `delegate` only when this is set. */
    readonly delegation?: Delegation;
    /** A router's plan, run before the model's turns; needs `delegation`. */
    readonly plan?: PlanSteps;
    /** Hold every hand-off to helpers for the reader's approval first (gate `"plan"`). */
    readonly confirmDelegates?: boolean;
    /** Offer every command of `tools` each turn, not the profile's: a helper gets exactly its own. */
    readonly allTools?: boolean;
    /** Told each turn's token usage. */
    readonly onUsage?: (usage: TokenUsage) => void;
    /**
     * The tools the provider runs itself that each turn may use (a helper's web tools); absent,
     * none. Counted across the message in `state.hostedUses`.
     */
    readonly hostedTools?: readonly HostedToolSetting[];
    /** In-page code; the loop offers `run_code` only when this is set. */
    readonly code?: CodeTool;
}

/** The reader's answer to a question. */
export interface ReaderAnswer {
    /** The `ask_reader` call it answers. */
    readonly callId: string;
    /** The choices picked, by value. */
    readonly values: readonly string[];
}

/** A held batch, decided. */
export interface DecidedBatch {
    /** The calls to run, with any arguments the reader edited. */
    readonly calls: readonly ToolCallRequest[];
    /**
     * Absent to run them; otherwise what every call reports instead (`AI_APPROVAL_DENIED`,
     * `AI_APPROVAL_STALE`), which is also the message's result unless a later batch runs.
     */
    readonly outcome?: Outcome;
    /** The hold the reader approved, which this batch alone is let through. */
    readonly approved?: GateKind;
}

/** The model's turn failed: the provider refused or failed, or the turn was cancelled. */
export class TurnFailed extends Error {
    /**
     * The turn failed.
     * @param failure - The turn's error event.
     */
    constructor(readonly failure: TurnError) {
        super(failure.cause.message);
    }
}

/**
 * The message is to be taken back: a tool threw, or its last write batch failed with no later
 * write batch succeeding. Carries the result the reader is told, which reports the failure.
 */
export class MessageRolledBack extends Error {
    /**
     * The message is rolled back.
     * @param result - The message's result, reporting the failure.
     */
    constructor(readonly result: ExecutionResult) {
        super(result.message);
    }
}

/**
 * The model's text across every turn of one message.
 * @param texts - Each turn's text, empty ones left out.
 * @returns The text, or undefined when the model wrote none.
 */
function joinTexts(texts: readonly string[]): string | undefined {
    return texts.length === 0 ? undefined : texts.join("\n");
}

/**
 * The newest applied step a message recorded.
 * @param session - The session.
 * @param message - The message's id, as its steps' `provenance.message` carries it.
 * @returns The step, or undefined when the message has recorded none that is applied.
 */
export function latestStepOf(session: GraphSession, message: string): HistoryStepId | undefined {
    const { steps, position } = session.history;
    for (let index = position - 1; index >= 0; index--) {
        if (steps[index].provenance.message === message) {
            return steps[index].id;
        }
    }

    return undefined;
}

/**
 * A command as a tool the model may call. Its JSON Schema is made only when an engine asks.
 * @param command - The command.
 * @returns The tool.
 */
export function toolSpec(command: GraphCommand): ToolSpec {
    let jsonSchema: JsonSchema | undefined;
    return {
        name: command.name,
        description: command.description,
        schema: command.parameters,
        get jsonSchema(): JsonSchema {
            // A generated tool sends its own compact schema; any other command's is derived.
            jsonSchema ??= isAssistantTool(command) ? command.jsonSchema : toolJsonSchema(command.parameters);
            return jsonSchema;
        },
    };
}

/**
 * The on-demand tools a conversation's catalog results named, most recent first.
 * @param messages - The conversation.
 * @returns The tool names.
 */
function loadedTools(messages: readonly SavedMessage[]): string[] {
    const named = new Set<string>();
    for (const message of [...messages].reverse()) {
        for (const part of message.parts) {
            for (const tool of part.type === "tool-result" ? toolsNamed(part.content) : []) {
                named.add(tool);
            }
        }
    }

    return [...named].slice(0, MAX_LOADED_TOOLS);
}

/**
 * The on-demand tools one catalog result names (`params.load`).
 * @param content - The result's text.
 * @returns The tool names; none for a result that is not JSON.
 */
function toolsNamed(content: string): string[] {
    try {
        const { params } = JSON.parse(content) as { params?: { load?: unknown } };
        return (Array.isArray(params?.load) ? params.load : []).filter(
            (tool): tool is string => typeof tool === "string",
        );
    } catch {
        return [];
    }
}

/**
 * The tools one turn offers: the profile's always-loaded ones, the consumer's always-offered
 * commands, and the on-demand tools this conversation loaded.
 * @param registry - Every command.
 * @param profile - The profile.
 * @param messages - The conversation, for what it loaded.
 * @returns The tools.
 */
export function turnTools(
    registry: CommandRegistry,
    profile: ToolProfile,
    messages: readonly SavedMessage[],
): GraphCommand[] {
    const all = registry.getAll();
    if (!all.some(isAssistantTool)) {
        // A registry of the consumer's own commands only: every one, every turn, as before.
        return all;
    }

    if (profile === "small") {
        return all.filter((command) => PROFILE_TOOLS.small.has(command.name));
    }

    const loaded = new Set(loadedTools(messages));
    return all.filter((command) => {
        if (isAssistantTool(command) && !PROFILE_TOOLS.standard.has(command.name)) {
            return false;
        }

        return (command.load ?? "always") === "always" || loaded.has(command.name);
    });
}

/**
 * For the small profile: only the last two rounds of tool results kept in full.
 * @param messages - The conversation.
 * @returns The messages the model is shown.
 */
function trimmedHistory(messages: readonly SavedMessage[]): SavedMessage[] {
    const rounds = messages.filter((message) => message.role === "tool");
    const keep = new Set(rounds.slice(-2));
    return messages.map((message) =>
        message.role !== "tool" || keep.has(message)
            ? message
            : {
                  ...message,
                  parts: message.parts.map((part): SavedPart =>
                      part.type === "tool-result"
                          ? { ...part, content: JSON.stringify({ code: part.code, trimmed: true }) }
                          : part,
                  ),
              },
    );
}

/** A saved tool result. */
type ResultPart = Extract<SavedPart, { type: "tool-result" }>;

/**
 * The conversation as a model may be sent it: every call followed at once by exactly one result.
 * A result saved further on (another tab appended between) is moved up to its call, a second one
 * is dropped, and a call with none -- a record cut short when a tab closed, or a request ended
 * there -- is answered `AI_TOOL_NOT_RUN`, since a provider rejects a call left unanswered. An
 * `outcome` part goes as the text it stands for. The saved messages are never changed.
 * @param messages - The conversation.
 * @returns The messages to send.
 */
export function pairedForModel(messages: readonly SavedMessage[]): SavedMessage[] {
    const results = new Map<string, ResultPart>();
    for (const part of messages.flatMap((message) => message.parts)) {
        if (part.type === "tool-result" && !results.has(part.callId)) {
            results.set(part.callId, part);
        }
    }

    const out: SavedMessage[] = [];
    messages.forEach((message, index) => {
        if (message.role === "tool") {
            // Sent only right after its calls, below.
            return;
        }

        out.push(
            message.parts.some((part) => part.type === "outcome")
                ? {
                      ...message,
                      parts: message.parts.map((part): SavedPart =>
                          part.type === "outcome"
                              ? {
                                    type: "text",
                                    origin: "graphty",
                                    text: `This request ended without an answer: ${JSON.stringify({ code: part.code, ...part.params })}`,
                                }
                              : part,
                      ),
                  }
                : message,
        );
        const calls = message.parts.flatMap((part) => (part.type === "tool-call" ? [part] : []));
        if (calls.length === 0) {
            return;
        }

        const next = messages[index + 1];
        const exact =
            next?.role === "tool" &&
            next.parts.length === calls.length &&
            next.parts.every((part, at) => part.type === "tool-result" && part.callId === calls[at].callId);
        out.push(
            exact
                ? next
                : {
                      id: `${message.id}:results`,
                      role: "tool",
                      parts: calls.map((call): SavedPart => {
                          const params = { tool: call.command };
                          return (
                              results.get(call.callId) ?? {
                                  type: "tool-result",
                                  origin: "graph-data",
                                  callId: call.callId,
                                  code: "AI_TOOL_NOT_RUN",
                                  params,
                                  content: resultText({ code: "AI_TOOL_NOT_RUN", params }, RESULT_CAP.small),
                              }
                          );
                      }),
                  },
        );
    });
    return out;
}

/** What the message's batches added up to. */
interface MessageTally {
    readonly results: CallResult[];
    failure?: Outcome;
    /** The failure of the last write batch, cleared by a later successful one. */
    pending?: Outcome;
    /** Write batches committed. */
    committed: number;
    /** The approval request a held batch made, and its gate. */
    held?: { readonly request: string | undefined; readonly gate: string };
    /** The reader's decision the run started with, until a batch runs after it. */
    decision?: Outcome;
    /** The question the message asked, which it now waits on. */
    asked?: string;
    /** The tokens the message used: its own model turns and its helpers'. */
    usage: TokenUsage;
    /** The provider stopped a turn mid-search: `AI_PROVIDER_PAUSED`'s params. */
    paused?: AiResultParams;
}

/**
 * Combine the results of every tool that ran into the message's result.
 * @param tally - What the batches did.
 * @param llmText - Optional text from the model
 * @returns Combined execution result
 */
function combineResults(tally: MessageTally, llmText?: string): ExecutionResult {
    return { ...combined(tally, llmText), usage: tally.usage };
}

/**
 * The message's result, but for its tokens.
 * @param tally - What the batches did.
 * @param llmText - Optional text from the model
 * @returns Combined execution result
 */
function combined(tally: MessageTally, llmText?: string): ExecutionResult {
    const { results, failure, held, asked, paused } = tally;
    if (paused !== undefined) {
        return { success: false, message: llmText ?? "", llmText, code: "AI_PROVIDER_PAUSED", params: paused };
    }

    if (asked !== undefined) {
        return {
            success: true,
            message: llmText ?? "",
            llmText,
            code: "AI_QUESTION_ASKED",
            params: { request: asked },
        };
    }

    if (held !== undefined) {
        return {
            success: true,
            message: llmText ?? "",
            llmText,
            code: "AI_CONFIRMATION_NEEDED",
            params: { gate: held.gate, ...(held.request === undefined ? {} : { request: held.request }) },
        };
    }

    if (results.length === 0) {
        return {
            success: true,
            message: llmText ?? "No response from AI",
            llmText,
            ...(llmText === undefined
                ? { code: "AI_NO_RESPONSE", params: {} }
                : { code: "AI_COMPLETED", params: { toolCalls: 0 } }),
        };
    }

    // Earlier failures the model got past do not fail the message; only an unresolved one does.
    const allSucceeded = failure === undefined;
    const messages = results.map((r) => r.message).filter((message) => message !== "");
    if (llmText) {
        messages.unshift(llmText);
    }

    const affectedNodes = [...new Set(results.flatMap((r) => r.affectedNodes ?? []))];
    const affectedEdges = [...new Set(results.flatMap((r) => r.affectedEdges ?? []))];
    // Data from the last successful result (or the last result)
    const lastResult = [...results].reverse().find((r) => r.success) ?? results.at(-1);

    return {
        success: allSucceeded,
        message: messages.join("\n"),
        data: lastResult?.data,
        affectedNodes: affectedNodes.length > 0 ? affectedNodes : undefined,
        affectedEdges: affectedEdges.length > 0 ? affectedEdges : undefined,
        llmText,
        ...(allSucceeded || failure === undefined
            ? { code: "AI_COMPLETED", params: { toolCalls: results.length } }
            : failure),
    };
}

/**
 * Stream one piece of a turn's text out: to the status (a later turn's text on a new line, as
 * `accumulated` joins them) and as an `ai-stream-chunk`.
 * @param sink - Where the host hears of it.
 * @param text - The turn's text so far.
 * @param delta - The new piece.
 * @param earlier - The text of the message's earlier turns.
 * @returns The turn's text with the piece.
 */
function streamText(sink: ConversationRun["sink"], text: string, delta: string, earlier: readonly string[]): string {
    const later = text === "" && delta !== "" && (sink.status.current.streamedText ?? "") !== "";
    const next = text + delta;
    sink.status.appendStreamedText(later ? `\n${delta}` : delta);
    sink.emit({ type: "ai-stream-chunk", text: delta, accumulated: [...earlier, next].join("\n") });
    return next;
}

/**
 * A tool the provider ran, as the message keeps it: its sources are the reader's to see, and web
 * content. The host is told of it.
 * @param event - The turn's event.
 * @param sink - Where the host hears of it.
 * @returns The part.
 */
function hostedPart(event: Extract<TurnEvent, { type: "hosted-tool" }>, sink: ConversationRun["sink"]): HostedPart {
    const sources = event.sources.map((source) => ({ ...source }));
    sink.emit({
        type: "ai-hosted-tool-result",
        tool: event.tool,
        status: event.status,
        sources: sources.map((source) => ({ tool: event.tool, ...source })),
    });
    return {
        type: "hosted-tool",
        origin: "web",
        tool: event.tool,
        status: event.status,
        sources,
        ...(event.providerState && { providerState: event.providerState }),
    };
}

/**
 * One model turn: stream its text out as it arrives and collect the calls it asks for.
 * @param run - The loop's run.
 * @param request - The turn.
 * @param earlier - The text of the message's earlier turns, for the accumulated text.
 * @param onUsage - Told each usage the turn reports.
 * @returns The turn's text and calls.
 * @throws {TurnFailed} When the turn ends with an error, ends without a `finish` (a dropped
 *   stream: its calls may be cut short, so none runs), or finishes after the message was cancelled.
 */
async function modelTurn(
    run: ConversationRun,
    request: TurnRequest,
    earlier: readonly string[],
    onUsage: (usage: TokenUsage) => void,
): Promise<{ text: string; calls: ToolCallRequest[]; hosted: HostedPart[]; paused: boolean }> {
    const { engine, sink, abort } = run;
    let text = "";
    let finished = false;
    let paused = false;
    const calls: ToolCallRequest[] = [];
    const hosted: HostedPart[] = [];
    for await (const event of engine.turn(request, abort.signal)) {
        if (event.type === "text") {
            text = streamText(sink, text, event.delta, earlier);
        } else if (event.type === "tool-call") {
            calls.push({
                id: event.id,
                name: event.name,
                arguments: event.arguments,
                ...(event.invalidArguments && { invalidArguments: true }),
                ...(event.providerState && { providerState: event.providerState }),
            });
        } else if (event.type === "hosted-tool") {
            hosted.push(hostedPart(event, sink));
        } else if (event.type === "usage") {
            onUsage({ inputTokens: event.inputTokens, outputTokens: event.outputTokens });
        } else if (event.type === "error") {
            throw new TurnFailed(event);
        } else if (event.type === "finish") {
            finished = true;
            paused = event.reason === "paused";
            break;
        }
    }

    // A provider that ignores the signal may still answer after a cancel: the answer is dropped.
    if (abort.signal.aborted || !finished) {
        const cause = abort.signal.aborted
            ? abort.signal.reason
            : new Error("The model's turn ended without finishing.");
        throw new TurnFailed(providerFailure(cause, engine.providerName, abort.signal));
    }

    return { text, calls, hosted, paused };
}

/** A saved part for a tool the provider ran. */
type HostedPart = Extract<SavedPart, { type: "hosted-tool" }>;

/**
 * The outcome a tool-result part records for one call.
 * @param call - The call.
 * @param result - Its result, or undefined when it did not run.
 * @param batch - The batch it was in.
 * @returns The outcome.
 */
function partOutcome(call: ToolCallRequest, result: CallResult | undefined, batch: BatchOutcome): ToolResultOutcome {
    if (batch.held !== undefined) {
        return { code: "AI_CONFIRMATION_NEEDED", params: { tool: call.name, gate: batch.held.gate } };
    }

    if (result === undefined || (result.success && batch.failure !== undefined && batch.committed !== true)) {
        // Not run, or rolled back with the batch.
        return { code: "AI_TOOL_NOT_RUN", params: { tool: call.name } };
    }

    if (result.success) {
        return { code: "AI_COMPLETED", params: {} };
    }

    return batch.failure ?? { code: "AI_TOOL_FAILED", params: { tool: call.name, cause: result.code } };
}

/**
 * Add the model's turn to the conversation: its text and the calls it made.
 * @param conversation - The conversation.
 * @param text - The model's text this turn.
 * @param calls - The calls it made.
 * @param newId - Makes the message's id.
 * @param origin - Who made the calls: the model, or a router's plan.
 * @param hosted - The tools the provider ran in the turn.
 * @returns The message's id.
 */
function appendCalls(
    conversation: Conversation,
    text: string,
    calls: readonly ToolCallRequest[],
    newId: () => string,
    origin: "model" | "graphty" = "model",
    hosted: readonly HostedPart[] = [],
): string {
    const id = newId();
    conversation.messages.push({
        id,
        role: "assistant",
        parts: [
            ...hosted,
            ...(text ? [{ type: "text" as const, origin: "model" as const, text }] : []),
            ...calls.map((call) => ({
                type: "tool-call" as const,
                origin,
                callId: call.id,
                command: call.name,
                arguments: call.arguments,
                // Opaque round-trip data (Gemini's thought signature): the engine that wrote it
                // sends it back with the call; any other engine ignores it.
                ...(call.providerState && { providerState: call.providerState }),
            })),
        ],
    });
    return id;
}

/**
 * Add each call's result to the conversation.
 * @param conversation - The conversation.
 * @param calls - The calls.
 * @param batch - What running them did.
 * @param cap - The most characters one result may take.
 * @param newId - Makes the message's id.
 * @returns The message added.
 */
function appendResults(
    conversation: Conversation,
    calls: readonly ToolCallRequest[],
    batch: BatchOutcome,
    cap: number,
    newId: () => string,
): SavedMessage {
    const message: SavedMessage = {
        id: newId(),
        role: "tool",
        parts: calls.map((call, index) => {
            const result = batch.results.at(index);
            const outcome = partOutcome(call, result, batch);
            const view =
                outcome.code === "AI_TOOL_NOT_RUN" && result?.success === true
                    ? { code: "AI_TOOL_NOT_RUN", params: { tool: call.name, rolledBack: true } }
                    : modelView(result, call.name);
            return {
                type: "tool-result" as const,
                origin: "graph-data" as const,
                callId: call.id,
                ...outcome,
                content: resultText(view, cap),
            };
        }),
    };
    conversation.messages.push(message);
    return message;
}

/**
 * The results a held batch's calls get when they do not run: each reports why.
 * @param calls - The calls.
 * @param outcome - Why they did not run.
 * @param id - The message's id.
 * @returns The tool message.
 */
export function closingResults(calls: readonly ToolCallRequest[], outcome: Outcome, id: string): SavedMessage {
    return {
        id,
        role: "tool",
        parts: calls.map((call) => {
            const params = { ...outcome.params, tool: call.name };
            return {
                type: "tool-result" as const,
                origin: "graph-data" as const,
                callId: call.id,
                code: outcome.code,
                params,
                content: resultText({ code: outcome.code, params }, RESULT_CAP.small),
            };
        }),
    };
}

/**
 * Why a question's call did not ask anything: its arguments do not fit `ask_reader`.
 * @returns The outcome.
 */
function invalidQuestion(): Outcome {
    return { code: "AI_TOOL_INVALID_ARGUMENTS", params: {} };
}

/**
 * The reader's answer as the result of the question's call.
 * @param answer - The answer.
 * @param id - The message's id.
 * @returns The tool message.
 */
function answerResult(answer: ReaderAnswer, id: string): SavedMessage {
    return {
        id,
        role: "tool",
        parts: [
            {
                type: "tool-result",
                origin: "reader",
                callId: answer.callId,
                code: "AI_COMPLETED",
                params: {},
                content: resultText({ code: "AI_COMPLETED", data: { answer: [...answer.values] } }, RESULT_CAP.small),
            },
        ],
    };
}

/**
 * Whether the model may act from text read on the web: the conversation holds a part read there
 * (a research helper's answer), or the run is a helper a marked conversation started. The whole
 * conversation, not the window the model is shown: the model's own words restating the page stay
 * in the window after the page has left it. Derived, never stored: it survives a reload with the
 * conversation, and a new conversation has none.
 * @param run - The loop's run.
 * @param state - The message's state.
 * @returns True when it may.
 */
function readFromWeb(run: ConversationRun, state: MessageState): boolean {
    return (
        state.webContent === true ||
        run.conversation.messages.some((message) => message.parts.some((part) => part.origin === "web"))
    );
}

/**
 * The message's state, marked when the conversation holds web content: what a batch and a helper
 * the run starts are judged with.
 * @param run - The loop's run.
 * @param state - The message's state.
 * @returns The state, marked or as it was.
 */
function marked(run: ConversationRun, state: MessageState): MessageState {
    return readFromWeb(run, state) && state.webContent !== true ? { ...state, webContent: true } : state;
}

/**
 * A batch of calls, as the tool executor runs it.
 * @param run - The loop's run.
 * @param calls - The calls.
 * @param state - The message's state.
 * @returns The batch.
 */
function toolBatch(run: ConversationRun, calls: readonly ToolCallRequest[], state: MessageState): ToolBatch {
    const { session, message } = run;
    return {
        calls,
        registry: run.tools,
        graph: run.graph,
        session,
        label: run.label,
        message: marked(run, state),
        after: latestStepOf(session, message),
        abort: run.abort,
        sink: run.sink,
        host: run.host ?? {
            emit: (event) => {
                run.sink.emit(event);
            },
            readerText: run.label,
        },
    };
}

/**
 * Run a turn's `run_code` calls once its other calls committed, one after another. Each call the
 * program makes is a batch of its own that may only read (`readOnly: "in-page-code"`).
 * @param run - The loop's run.
 * @param code - The code tool.
 * @param calls - The `run_code` calls.
 * @param offered - The tools the turn offers.
 * @param state - The message's state.
 * @param cap - The most characters a result may take.
 * @returns Their results.
 */
async function runCoded(
    run: ConversationRun,
    code: CodeTool,
    calls: readonly ToolCallRequest[],
    offered: readonly GraphCommand[],
    state: MessageState,
    cap: number,
): Promise<SavedPart[]> {
    const readOnly: MessageState = { ...state, readOnly: "in-page-code" };
    const callTool = async (request: ToolCallRequest): Promise<BatchOutcome> => {
        try {
            return await runToolBatch(toolBatch(run, [request], readOnly));
        } catch (error) {
            // A tool that threw rolled its own batch back; the program reads that it failed.
            if (error instanceof BatchThrew) {
                return error.outcome;
            }

            throw error;
        }
    };
    const parts: SavedPart[] = [];
    for (const call of calls) {
        parts.push(await code.run(call, offered, callTool, run.abort.signal, cap));
    }

    return parts;
}

/**
 * Run one batch of calls in its transaction.
 * @param run - The loop's run.
 * @param calls - The calls.
 * @param state - The message's state.
 * @param resultOf - The message's result once a call threw, given what the batch ran.
 * @returns What the batch did.
 * @throws {MessageRolledBack} When a call threw.
 */
async function runBatch(
    run: ConversationRun,
    calls: ToolCallRequest[],
    state: MessageState,
    resultOf: (threw: BatchOutcome) => ExecutionResult,
): Promise<BatchOutcome> {
    try {
        return await runToolBatch(toolBatch(run, calls, state));
    } catch (error) {
        if (error instanceof BatchThrew) {
            throw new MessageRolledBack(resultOf(error.outcome));
        }

        throw error;
    }
}

/**
 * Add what a batch did to the message's tally.
 * @param tally - The tally.
 * @param batch - The batch.
 * @param run - The loop's run, for its approval store.
 * @param messageId - The assistant message holding the batch's calls.
 * @returns When tallied: a held batch once its request is saved and the host told.
 */
async function tallyBatch(
    tally: MessageTally,
    batch: BatchOutcome,
    run: ConversationRun,
    messageId: string,
): Promise<void> {
    tally.results.push(...batch.results.filter((result): result is CallResult => result !== undefined));
    tally.decision = undefined;
    if (batch.held !== undefined) {
        tally.held = { request: await run.hold?.(batch.held, messageId), gate: batch.held.gate };
        return;
    }

    // The message's outcome is its last batch's: a failure a later batch got past is not the message's.
    tally.failure = batch.failure;
    if (batch.failure !== undefined) {
        if (batch.writes) {
            tally.pending = batch.failure;
        }
    } else if (batch.writes) {
        tally.pending = undefined;
        tally.committed++;
    }
}

/**
 * Run one turn's `delegate` calls once the turn's other calls committed, and add their results to
 * the turn's tool message. When those calls failed, the helpers do not run.
 * @param loop - The message's loop: its run (with the delegation), state and tally.
 * @param calls - The `delegate` calls.
 * @param batch - What the turn's other calls did.
 * @param added - The turn's tool message, when its other calls had one.
 * @param sequence - Run them one after another.
 * @returns True when a helper's batch was held: the message ends there, waiting on the reader.
 */
async function runDelegated(
    loop: Loop,
    calls: readonly ToolCallRequest[],
    batch: BatchOutcome,
    added: SavedMessage | undefined,
    sequence = false,
): Promise<boolean> {
    const { run, state, tally, newId } = loop;
    if (batch.failure === undefined && run.delegation !== undefined) {
        const ran = await run.delegation.run(calls, run, marked(run, state), sequence);
        return applyDelegated(run, ran, tally, added, newId);
    }

    addParts(run, closingResults(calls, { code: "AI_TOOL_NOT_RUN", params: {} }, "").parts, added, newId);
    return false;
}

/**
 * Add what hand-offs did to the conversation and the tally; a helper's held batch becomes the
 * message's approval request, saved with the conversation that now holds the helper's.
 * @param run - The loop's run.
 * @param ran - What the hand-offs did.
 * @param tally - The message's tally.
 * @param added - The turn's tool message, when its other calls had one.
 * @param newId - Makes a message's id.
 * @returns True when the message ends there: a helper's batch was held, or its provider paused.
 */
async function applyDelegated(
    run: ConversationRun,
    ran: DelegatedRun,
    tally: MessageTally,
    added: SavedMessage | undefined,
    newId: () => string,
): Promise<boolean> {
    tally.usage = addUsage(tally.usage, ran.usage);
    addParts(run, ran.parts, added, newId);
    if (ran.paused !== undefined) {
        tally.paused = ran.paused;
        return true;
    }

    if (ran.held === undefined) {
        return false;
    }

    const { held, messageId, agent, callId } = ran.held;
    tally.held = { request: await run.hold?.(held, messageId, { agent, callId }), gate: held.gate };
    return true;
}

/**
 * Add parts to the turn's tool message, or as a tool message of their own.
 * @param run - The loop's run.
 * @param parts - The parts.
 * @param added - The turn's tool message, when its other calls had one.
 * @param newId - Makes a message's id.
 * @returns The tool message, which later parts of the turn join.
 */
function addParts(
    run: ConversationRun,
    parts: readonly SavedPart[],
    added: SavedMessage | undefined,
    newId: () => string,
): SavedMessage {
    if (added === undefined) {
        const message: SavedMessage = { id: newId(), role: "tool", parts: [...parts] };
        run.conversation.messages.push(message);
        return message;
    }

    // The turn's one tool message answers every call of the turn.
    const at = run.conversation.messages.indexOf(added);
    const message: SavedMessage = { ...added, parts: [...added.parts, ...parts] };
    run.conversation.messages[at] = message;
    return message;
}

/** How often a turn the provider paused is sent back to continue before the message ends `AI_PROVIDER_PAUSED`. */
const MAX_PAUSED_RESENDS = 3;

/** A batch with nothing in it, which delegate calls of their own run after. */
const NO_BATCH: BatchOutcome = { results: [], writes: false };

/**
 * Hold hand-offs to helpers for the reader's approval: `confirmDelegates` (gate `"plan"`), or the
 * host's policy asked (gate `"policy"`).
 * @param run - The loop's run.
 * @param calls - The `delegate` calls.
 * @param state - The message's state.
 * @param tally - The message's tally, which records the hold.
 * @param messageId - The assistant message holding the calls.
 * @param gate - Why they are held.
 */
async function holdDelegates(
    run: ConversationRun,
    calls: readonly ToolCallRequest[],
    state: MessageState,
    tally: MessageTally,
    messageId: string,
    gate: "plan" | "policy" | "web-content",
): Promise<void> {
    const held: HeldBatch = { gate, preview: {}, calls, totals: { ...state.totals } };
    tally.held = { request: await run.hold?.(held, messageId), gate: held.gate };
}

/**
 * The host's approval policy on hand-offs to helpers, judged as a read-only call of `delegate`
 * with its arguments: any `deny` refuses them all, any `ask` (or anything but a verdict, or a
 * policy that throws) holds them. Without a policy, they run.
 * @param state - The message's state, with the policy.
 * @param calls - The `delegate` calls.
 * @returns The verdict.
 */
function delegateVerdict(state: MessageState, calls: readonly ToolCallRequest[]): "allow" | "deny" | "ask" {
    const { policy } = state;
    if (policy === undefined) {
        return "allow";
    }

    const verdicts = calls.map((call) => {
        try {
            return policy({
                command: DELEGATE,
                arguments: call.arguments,
                effect: "read",
                ...(state.webContent === true ? { webContent: true } : {}),
            });
        } catch {
            return "deny";
        }
    });
    if (verdicts.includes("deny")) {
        return "deny";
    }

    return verdicts.every((verdict) => verdict === "allow") ? "allow" : "ask";
}

/** The outcome of hand-offs the host's policy refused. */
const DELEGATE_DENIED: Outcome = { code: "AI_TOOL_DENIED_BY_POLICY", params: {} };

/** The outcome of hand-offs refused because a page read on the web may have written their task. */
const DELEGATE_WEB_DENIED: Outcome = { code: "AI_TOOL_DENIED_BY_POLICY", params: { reason: "web-content" } };

/**
 * The model's hand-offs after the conversation read the web: a task for a helper that fetches
 * pages may carry what a page asked for (graph data in a URL), so it is judged as a write is,
 * by `webContentWrites`. Search alone reaches only the provider's search, so it is not.
 * @param run - The loop's run, with its delegation.
 * @param state - The message's state, marked.
 * @param calls - The `delegate` calls.
 * @returns `"allow"`, or what `webContentWrites` says to do.
 */
function webDelegate(
    run: ConversationRun,
    state: MessageState,
    calls: readonly ToolCallRequest[],
): "allow" | "refuse" | "ask" {
    const mode = state.webContentWrites ?? "refuse";
    const fetches = run.delegation?.fetches;
    return state.webContent === true &&
        mode !== "allow" &&
        calls.some((call) => fetches?.has(String(call.arguments.agent)) === true)
        ? mode
        : "allow";
}

/** The outcome of a turn's calls that a hold before them kept from running. */
const NOT_RUN_HELD: Outcome = { code: "AI_TOOL_NOT_RUN", params: { reason: "held" } };

/** The loop's question tool, with the store that saves a question for the reader. */
type Asks = QuestionTool & { readonly store: NonNullable<ConversationRun["ask"]> };

/** One message's loop: its run and state, and what it has gathered so far. */
interface Loop {
    readonly run: ConversationRun;
    readonly state: MessageState;
    readonly tally: MessageTally;
    /** The model's words so far, one per turn. */
    readonly texts: string[];
    readonly newId: () => string;
    readonly profile: ToolProfile;
    /** The most characters a tool result may take. */
    readonly cap: number;
    /** Questions, when both the store and the tool are there. */
    readonly asks: Asks | undefined;
    /** How often each web tool was used in the message: the state's, shared with its helpers, or this run's own. */
    readonly uses: Record<string, number>;
    readonly readerText: string;
    readonly report: (used: TokenUsage) => void;
    readonly resultOf: (threw: BatchOutcome) => ExecutionResult;
    /** The held batch's results, shown to the model for its answer only: the decision adds the real ones. */
    heldResults: SavedMessage | undefined;
    /** Paused turns sent back to continue so far. */
    resent: number;
}

/**
 * A message's loop, before its first turn.
 * @param run - What to run.
 * @returns The loop.
 */
function startLoop(run: ConversationRun): Loop {
    const { conversation } = run;
    const profile = run.profile ?? "standard";
    const state: MessageState = run.state ?? {
        id: run.message,
        gate: DEFAULT_ASSISTANT_GATE_LIMITS,
        runs: new Set(),
        undo: { calls: 0 },
        hostedUses: {},
        totals: { removeNodes: 0, removeEdges: 0, changedValues: 0 },
    };
    // Every tool result goes back to the model, which then calls more tools or answers. A model
    // that looks before it acts -- query, then view on what it found -- gets to act; asked only
    // once, it would stop after looking and the person would get nothing.
    const tally: MessageTally = { results: [], committed: 0, usage: NO_USAGE };
    const texts: string[] = [];
    return {
        run,
        state,
        tally,
        texts,
        newId: run.newId ?? ((): string => `m${String(conversation.messages.length + 1)}`),
        profile,
        cap: RESULT_CAP[profile],
        asks: run.ask === undefined || run.questions === undefined ? undefined : { ...run.questions, store: run.ask },
        uses: state.hostedUses ?? {},
        readerText: run.host?.readerText ?? run.label,
        report: (used) => {
            tally.usage = addUsage(tally.usage, used);
            run.onUsage?.(used);
        },
        resultOf: (threw) => {
            tally.results.push(...threw.results.filter((result): result is CallResult => result !== undefined));
            tally.failure ??= threw.failure;
            return combineResults(tally, joinTexts(texts));
        },
        heldResults: undefined,
        resent: 0,
    };
}

/**
 * Run the loop for one message: ask the model, then run the tools it calls, each batch in a short
 * transaction that joins the message's one undo step.
 * @param run - What to run, and where.
 * @returns The message's result.
 * @throws {TurnFailed} When a model turn failed.
 * @throws {MessageRolledBack} When a tool threw, or the message's last write batch failed; the
 *   caller takes the message's earlier batches back.
 */
export async function runConversation(run: ConversationRun): Promise<ExecutionResult> {
    const { conversation, sink } = run;
    const loop = startLoop(run);

    logger.debug("Request", {
        messageCount: conversation.messages.length + 1,
        promptLength: conversation.messages.reduce(
            (sum, m) => sum + m.parts.reduce((n, p) => n + (p.type === "text" ? p.text.length : 0), 0),
            conversation.system.length,
        ),
    });

    sink.status.startStreaming();

    if (run.answer !== undefined) {
        conversation.messages.push(answerResult(run.answer, loop.newId()));
    }

    // Set when the message ends without another model turn: it waits on the reader.
    let stopped = run.decided === undefined ? false : await continueDecided(loop, run.decided);
    if (run.resume !== undefined && run.delegation !== undefined) {
        // A helper held for the reader continues with the decision, then the message goes on.
        sink.status.startExecuting();
        const ran = await run.delegation.resume(run.resume.callId, run.resume.decided, run, marked(run, loop.state));
        stopped = await applyDelegated(run, ran, loop.tally, undefined, loop.newId);
    }

    if (!stopped && run.decided?.outcome === undefined && run.delegation !== undefined) {
        stopped = await runPlan(loop);
    }

    let turn = 0;
    while (!stopped) {
        turn++;
        stopped = await modelStep(loop, turn);
    }

    return finishMessage(loop);
}

/**
 * A helper ends at its hold: the reader's decision continues it, and the message with it.
 * @param loop - The message's loop.
 * @returns True when the run ends here.
 */
function endHeld(loop: Loop): boolean {
    const { run, tally, heldResults } = loop;
    if (run.endAtHold !== true || tally.held === undefined) {
        return false;
    }

    if (heldResults !== undefined) {
        run.conversation.messages.splice(run.conversation.messages.indexOf(heldResults), 1);
    }

    return true;
}

/**
 * Continue a message after the reader's decision on its held batch: an approved hand-off runs its
 * helpers, an approved batch runs, a denied or stale one is answered so.
 * @param loop - The message's loop.
 * @param decided - The decided batch.
 * @returns True when the message ends without another model turn.
 */
async function continueDecided(loop: Loop, decided: DecidedBatch): Promise<boolean> {
    const { run, state, tally, newId } = loop;
    const { conversation, sink } = run;
    const { calls, outcome } = decided;
    if (outcome !== undefined) {
        tally.decision = outcome;
        conversation.messages.push(closingResults(calls, outcome, newId()));
        return false;
    }

    sink.status.startExecuting();
    if (calls.every((call) => call.name === DELEGATE)) {
        // An approved hand-off: the helpers run, as the step that held them said.
        return runDelegated(loop, calls, NO_BATCH, undefined, run.plan?.sequence);
    }

    // The assistant message holding the calls: the turn's calls a hold kept from running may
    // be answered after it.
    const callsMessage = [...conversation.messages].reverse().find((message) => message.role === "assistant")?.id ?? "";
    // Only the hold the reader approved is let through, and only for this batch; every
    // other limit still holds, counted on from what the message did before it.
    const approved = decided.approved === undefined ? state : { ...state, approved: decided.approved };
    const batch = await runBatch(run, [...calls], approved, loop.resultOf);
    await tallyBatch(tally, batch, run, callsMessage);
    const added = appendResults(conversation, calls, batch, loop.cap, newId);
    loop.heldResults = batch.held === undefined ? undefined : added;
    return endHeld(loop);
}

/**
 * A router's plan runs first, as hand-offs of graphty's own, step by step; a denied step ends it.
 * A step held for approval ends the message there: its calls wait on the reader, not the model.
 * @param loop - The message's loop.
 * @returns True when the message ends without another model turn.
 */
async function runPlan(loop: Loop): Promise<boolean> {
    const { run, state, tally, newId } = loop;
    for (let step = run.plan?.next(newId); step !== undefined; step = run.plan?.next(newId)) {
        const callsMessage = appendCalls(run.conversation, "", step.calls, newId, "graphty");
        const verdict = delegateVerdict(state, step.calls);
        if (verdict === "deny") {
            // The plan ends there; the model reads why and answers.
            addParts(run, closingResults(step.calls, DELEGATE_DENIED, "").parts, undefined, newId);
            return false;
        }

        if (run.confirmDelegates === true || verdict === "ask") {
            const gate = run.confirmDelegates === true ? "plan" : "policy";
            await holdDelegates(run, step.calls, state, tally, callsMessage, gate);
            return true;
        }

        run.sink.status.startExecuting();
        if (await runDelegated(loop, step.calls, NO_BATCH, undefined, step.sequence)) {
            return true;
        }
    }

    return false;
}

/**
 * One model turn and the calls it makes.
 * @param loop - The message's loop.
 * @param turn - The turn's number, from 1.
 * @returns True when the message ends after it.
 */
async function modelStep(loop: Loop, turn: number): Promise<boolean> {
    const { run, tally, texts } = loop;
    // Past the tool turns, a text answer only: a model that spent every turn looking and never
    // acted would otherwise end the message with nothing said. toolMode "none" alone is not
    // enough: gemini-3.8-flash still answers it with a tool call and no text, so the ask also
    // says, in words, that it is time to answer. A held batch ends the tool turns too: a later
    // write would move the history under the request and make the reader's approval stale.
    const answerOnly = turn > MAX_ASSISTANT_TOOL_TURNS || tally.held !== undefined;
    const offered =
        run.allTools === true ? run.tools.getAll() : turnTools(run.tools, loop.profile, run.conversation.messages);
    const said = await askModel(loop, offered, answerOnly);
    for (const part of said.hosted) {
        loop.uses[part.tool] = (loop.uses[part.tool] ?? 0) + 1;
    }

    logger.debug("Response", {
        turn,
        textLength: said.text.length,
        toolCalls: said.calls.map((call) => knownToolName(run.tools, call.name)),
    });

    if (said.text) {
        texts.push(said.text);
    }

    // A provider that ignores toolMode may still call tools on the answer-only ask: they do not run.
    if (answerOnly || said.calls.length === 0 || said.paused) {
        return answered(loop, said);
    }

    run.sink.status.startExecuting();
    return runTurnCalls(loop, said, offered);
}

/** What one model turn said. */
type Said = Awaited<ReturnType<typeof modelTurn>>;

/**
 * Ask the model for one turn, with the tools it may call and the history it is shown.
 * @param loop - The message's loop.
 * @param offered - The tools the turn offers.
 * @param answerOnly - Whether the turn may only answer.
 * @returns What it said.
 */
function askModel(loop: Loop, offered: readonly GraphCommand[], answerOnly: boolean): Promise<Said> {
    const { run, asks, profile } = loop;
    const shown = historyWindow(
        pairedForModel(run.conversation.messages),
        run.historyBudgetTokens ?? DEFAULT_HISTORY_BUDGET_TOKENS[profile],
    );
    const history = profile === "small" ? trimmedHistory(shown) : shown;
    const hostedTools =
        run.hostedTools === undefined || answerOnly ? [] : turnHostedTools(run.hostedTools, loop.readerText, loop.uses);
    return modelTurn(
        run,
        {
            model: run.model,
            system: run.conversation.system,
            messages: answerOnly ? [...history, ANSWER_NOW] : history,
            tools: [
                ...offered.map(toolSpec),
                ...(run.delegation === undefined ? [] : [run.delegation.tool]),
                ...(asks === undefined ? [] : [asks.tool]),
                ...(run.code === undefined ? [] : [run.code.tool]),
            ],
            ...(hostedTools.length === 0 ? {} : { hostedTools }),
            toolMode: answerOnly ? "none" : "auto",
        },
        loop.texts,
        loop.report,
    );
}

/**
 * A turn that called no tools (or may not): its answer is kept, and a turn the provider paused
 * is sent back to continue, a few times.
 * @param loop - The message's loop.
 * @param said - What the turn said.
 * @returns True when the message ends; false to send the paused turn back.
 */
function answered(loop: Loop, said: Said): boolean {
    const { run, tally, heldResults } = loop;
    const { text, hosted, paused } = said;
    const { messages } = run.conversation;
    if (heldResults !== undefined) {
        // Waiting on the reader: the conversation ends in the held calls, and the answer
        // about them is the reader's alone, so it never sits between a call and its result.
        messages.splice(messages.indexOf(heldResults), 1);
    } else if (text || hosted.length > 0) {
        // The answer stays in the conversation, for a host that keeps it.
        messages.push({
            id: loop.newId(),
            role: "assistant",
            parts: [...hosted, ...(text ? [{ type: "text" as const, origin: "model" as const, text }] : [])],
        });
    }

    if (paused && heldResults === undefined && loop.resent < MAX_PAUSED_RESENDS) {
        // The provider stopped mid-search: the turn, sent back, continues where it stopped.
        loop.resent++;
        return false;
    }

    if (paused) {
        tally.paused = { provider: run.engine.providerName };
    }

    return true;
}

/** A turn's calls, sorted by how they run. */
interface TurnCalls {
    /** The calls that run in the turn's batch. */
    readonly before: readonly ToolCallRequest[];
    /** `run_code` calls, run after the batch commits. */
    readonly coded: readonly ToolCallRequest[];
    /** `delegate` calls, run after the batch commits. */
    readonly delegated: readonly ToolCallRequest[];
    /** A question to the reader, which ends the turn's calls. */
    readonly asking: ToolCallRequest | undefined;
}

/**
 * Sort a turn's calls: a question ends the batch (the calls before it run first, and none after
 * it), and `run_code` and `delegate` calls run after the batch commits, outside its transaction.
 * @param loop - The message's loop.
 * @param calls - The turn's calls.
 * @returns The calls, sorted.
 */
function sortCalls(loop: Loop, calls: readonly ToolCallRequest[]): TurnCalls {
    const { run, asks } = loop;
    const at = asks === undefined ? -1 : calls.findIndex((call) => call.name === ASK_READER);
    const upTo = at === -1 ? calls : calls.slice(0, at);
    const delegated = run.delegation === undefined ? [] : upTo.filter((call) => call.name === DELEGATE);
    const coded = run.code === undefined ? [] : upTo.filter((call) => call.name === RUN_CODE);
    const before = upTo.filter((call) => !delegated.includes(call) && !coded.includes(call));
    return { before, coded, delegated, asking: at === -1 ? undefined : calls[at] };
}

/**
 * Answer the turn's calls a hold keeps from running, apart from the held results the decision
 * replaces, so the model reads why they did not run.
 * @param loop - The message's loop.
 * @param calls - The calls, any of them absent.
 */
function notRun(loop: Loop, calls: readonly (ToolCallRequest | undefined)[]): void {
    const kept = calls.filter((call): call is ToolCallRequest => call !== undefined);
    if (kept.length > 0) {
        loop.run.conversation.messages.push(closingResults(kept, NOT_RUN_HELD, loop.newId()));
    }
}

/**
 * Run a turn's calls: its batch, then its programs, its hand-offs and its question.
 * @param loop - The message's loop.
 * @param said - What the turn said.
 * @param offered - The tools the turn offered.
 * @returns True when the message ends after them.
 */
async function runTurnCalls(loop: Loop, said: Said, offered: readonly GraphCommand[]): Promise<boolean> {
    const { run, state, tally, newId } = loop;
    const sorted = sortCalls(loop, said.calls);
    const { before, coded, delegated, asking } = sorted;
    const callsMessage = appendCalls(
        run.conversation,
        said.text,
        [...before, ...coded, ...delegated, ...(asking === undefined ? [] : [asking])],
        newId,
        "model",
        said.hosted,
    );
    const batch: BatchOutcome =
        before.length === 0 ? { results: [], writes: false } : await runBatch(run, [...before], state, loop.resultOf);
    await tallyBatch(tally, batch, run, callsMessage);
    let added = before.length === 0 ? undefined : appendResults(run.conversation, before, batch, loop.cap, newId);
    if (batch.held !== undefined) {
        // Held: the question is not asked, the helpers do not run, and the model reads it.
        loop.heldResults = added;
        if (endHeld(loop)) {
            return true;
        }

        notRun(loop, [...coded, ...delegated, asking]);
        return false;
    }

    if (run.code !== undefined && coded.length > 0) {
        const parts =
            batch.failure === undefined
                ? await runCoded(run, run.code, coded, offered, state, loop.cap)
                : closingResults(coded, { code: "AI_TOOL_NOT_RUN", params: {} }, "").parts;
        added = addParts(run, parts, added, newId);
    }

    const handed = await handOff(loop, sorted, batch, added, callsMessage);
    if (handed !== "go-on") {
        return handed === "end";
    }

    return askReader(loop, asking, batch, callsMessage);
}

/**
 * Run or hold a turn's hand-offs to helpers: refused after web content or by the host's policy,
 * held for the reader when asked, else run.
 * @param loop - The message's loop.
 * @param sorted - The turn's calls.
 * @param batch - What the turn's batch did.
 * @param added - The turn's tool message, when it has one.
 * @param callsMessage - The assistant message holding the calls.
 * @returns `"end"` when the message ends, `"next"` for the next model turn, `"go-on"` to the turn's question.
 */
async function handOff(
    loop: Loop,
    sorted: TurnCalls,
    batch: BatchOutcome,
    added: SavedMessage | undefined,
    callsMessage: string,
): Promise<"end" | "next" | "go-on"> {
    const { run, state, tally, newId } = loop;
    const { delegated, asking } = sorted;
    const judged = marked(run, state);
    const live = delegated.length > 0 && batch.failure === undefined;
    const web = live ? webDelegate(run, judged, delegated) : "allow";
    const verdict = live && web !== "refuse" ? delegateVerdict(judged, delegated) : "allow";
    if (web === "refuse") {
        addParts(run, closingResults(delegated, DELEGATE_WEB_DENIED, "").parts, added, newId);
        return "go-on";
    }

    if (verdict === "deny") {
        addParts(run, closingResults(delegated, DELEGATE_DENIED, "").parts, added, newId);
        return "go-on";
    }

    if (live && (run.confirmDelegates === true || verdict === "ask" || web === "ask")) {
        // Held: the model reads that they wait on the reader, as for any held batch.
        const gate = delegateGate(run, web);
        await holdDelegates(run, delegated, state, tally, callsMessage, gate);
        loop.heldResults = closingResults(delegated, { code: "AI_CONFIRMATION_NEEDED", params: { gate } }, newId());
        run.conversation.messages.push(loop.heldResults);
        notRun(loop, [asking]);
        return "next";
    }

    // A helper's batch waits on the reader: so does the message, and no question is asked.
    return delegated.length > 0 && (await runDelegated(loop, delegated, batch, added)) ? "end" : "go-on";
}

/**
 * Why hand-offs are held: every hand-off with `confirmDelegates`, else after web content, else the policy.
 * @param run - The loop's run.
 * @param web - What `webContentWrites` said of them.
 * @returns The gate.
 */
function delegateGate(run: ConversationRun, web: "allow" | "refuse" | "ask"): "plan" | "policy" | "web-content" {
    if (run.confirmDelegates === true) {
        return "plan";
    }

    return web === "ask" ? "web-content" : "policy";
}

/**
 * Ask the reader the turn's question, when it made one and its batch did not fail: the message
 * then waits on the answer. A question that does not parse is answered so.
 * @param loop - The message's loop.
 * @param asking - The question's call.
 * @param batch - What the turn's batch did.
 * @param callsMessage - The assistant message holding the calls.
 * @returns True when the message waits on the reader.
 */
async function askReader(
    loop: Loop,
    asking: ToolCallRequest | undefined,
    batch: BatchOutcome,
    callsMessage: string,
): Promise<boolean> {
    const { asks } = loop;
    if (asking === undefined || asks === undefined || batch.failure !== undefined) {
        return false;
    }

    const question = asks.parse(asking);
    if (question !== undefined) {
        loop.tally.asked = await asks.store(question, callsMessage);
        return true;
    }

    loop.run.conversation.messages.push(closingResults([asking], invalidQuestion(), loop.newId()));
    return false;
}

/**
 * The message's result, once no turn is left.
 * @param loop - The message's loop.
 * @returns The result.
 * @throws {MessageRolledBack} When the last write batch failed and nothing fixed it.
 */
function finishMessage(loop: Loop): ExecutionResult {
    const { tally } = loop;
    let result = combineResults(tally, joinTexts(loop.texts));
    if (tally.decision !== undefined) {
        result = { ...result, success: tally.decision.code !== "AI_APPROVAL_STALE", ...tally.decision };
    }

    if (tally.pending !== undefined && tally.held === undefined && tally.asked === undefined && tally.committed > 0) {
        // The last write batch failed and nothing fixed it: the message's writes are taken back.
        throw new MessageRolledBack({
            ...result,
            success: false,
            code: "AI_TOOL_FAILED",
            params: { ...tally.pending.params, rolledBack: tally.committed },
        });
    }

    return result;
}
