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

import { GraphtyLogger, type Logger } from "../logging";
import type { GraphSession, HistoryStepId } from "../session/types";
import type { ExecutionResult } from "./AiController";
import type { CommandRegistry } from "./commands";
import type { CommandContext, GraphCommand } from "./commands/types";
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
    type ToolCallRequest,
} from "./ToolExecutor";
import { MAX_LOADED_TOOLS, PROFILE_TOOLS } from "./tools/install";
import type { ToolProfile } from "./tools/prompt";
import { resultText } from "./tools/shape";
import { isAssistantTool } from "./tools/toolset";
import { DEFAULT_ASSISTANT_GATE_LIMITS, type MessageState, type ToolHost } from "./tools/types";

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
const RESULT_CAP: Readonly<Record<ToolProfile, number>> = { standard: 8000, small: 1500 };

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
    /** The message's state; one with the default gate when absent. */
    readonly state?: MessageState;
    /** Where export payloads go, the reader's text, the URL policy. */
    readonly host?: ToolHost;
    /**
     * Store a held batch for the host's approval.
     * @returns The approval request's id, or undefined when nothing can approve it.
     */
    readonly hold?: (held: HeldBatch) => string | undefined;
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
function toolSpec(command: GraphCommand): ToolSpec {
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
}

/**
 * Combine the results of every tool that ran into the message's result.
 * @param tally - What the batches did.
 * @param llmText - Optional text from the model
 * @returns Combined execution result
 */
function combineResults(tally: MessageTally, llmText?: string): ExecutionResult {
    const { results, failure, held } = tally;
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
 * One model turn: stream its text out as it arrives and collect the calls it asks for.
 * @param run - The loop's run.
 * @param request - The turn.
 * @param earlier - The text of the message's earlier turns, for the accumulated text.
 * @returns The turn's text and calls.
 * @throws {TurnFailed} When the turn ends with an error, ends without a `finish` (a dropped
 *   stream: its calls may be cut short, so none runs), or finishes after the message was cancelled.
 */
async function modelTurn(
    run: ConversationRun,
    request: TurnRequest,
    earlier: readonly string[],
): Promise<{ text: string; calls: ToolCallRequest[] }> {
    const { engine, sink, abort } = run;
    let text = "";
    let finished = false;
    const calls: ToolCallRequest[] = [];
    for await (const event of engine.turn(request, abort.signal)) {
        if (event.type === "text") {
            text += event.delta;
            sink.status.appendStreamedText(event.delta);
            sink.emit({ type: "ai-stream-chunk", text: event.delta, accumulated: [...earlier, text].join("\n") });
        } else if (event.type === "tool-call") {
            calls.push({
                id: event.id,
                name: event.name,
                arguments: event.arguments,
                ...(event.invalidArguments && { invalidArguments: true }),
                ...(event.providerState && { providerState: event.providerState }),
            });
        } else if (event.type === "error") {
            throw new TurnFailed(event);
        } else if (event.type === "finish") {
            finished = true;
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

    return { text, calls };
}

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
 * Add one round to the conversation: the model's text and calls, then each call's result.
 * @param conversation - The conversation.
 * @param text - The model's text this turn.
 * @param calls - The calls it made.
 * @param batch - What running them did.
 * @param cap - The most characters one result may take.
 */
function appendRound(
    conversation: Conversation,
    text: string,
    calls: ToolCallRequest[],
    batch: BatchOutcome,
    cap: number,
): void {
    const { messages } = conversation;
    const id = messages.length + 1;
    messages.push(
        {
            id: `m${id}`,
            role: "assistant",
            parts: [
                ...(text ? [{ type: "text" as const, origin: "model" as const, text }] : []),
                ...calls.map((call) => ({
                    type: "tool-call" as const,
                    origin: "model" as const,
                    callId: call.id,
                    command: call.name,
                    arguments: call.arguments,
                    // Opaque round-trip data (Gemini's thought signature): the engine that wrote it
                    // sends it back with the call; any other engine ignores it.
                    ...(call.providerState && { providerState: call.providerState }),
                })),
            ],
        },
        {
            id: `m${id + 1}`,
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
        },
    );
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
    const { session, message } = run;
    try {
        return await runToolBatch({
            calls,
            registry: run.tools,
            graph: run.graph,
            session,
            label: run.label,
            message: state,
            after: latestStepOf(session, message),
            abort: run.abort,
            sink: run.sink,
            host: run.host ?? {
                emit: (event) => {
                    run.sink.emit(event);
                },
                readerText: run.label,
            },
        });
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
 */
function tallyBatch(tally: MessageTally, batch: BatchOutcome, run: ConversationRun): void {
    tally.results.push(...batch.results.filter((result): result is CallResult => result !== undefined));
    if (batch.held !== undefined) {
        tally.held = { request: run.hold?.(batch.held), gate: batch.held.gate };
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
 * Run the loop for one message: ask the model, then run the tools it calls, each batch in a short
 * transaction that joins the message's one undo step.
 * @param run - What to run, and where.
 * @returns The message's result.
 * @throws {TurnFailed} When a model turn failed.
 * @throws {MessageRolledBack} When a tool threw, or the message's last write batch failed; the
 *   caller takes the message's earlier batches back.
 */
export async function runConversation(run: ConversationRun): Promise<ExecutionResult> {
    const { conversation, tools, sink } = run;
    const profile = run.profile ?? "standard";
    const state: MessageState = run.state ?? {
        id: run.message,
        gate: DEFAULT_ASSISTANT_GATE_LIMITS,
        runs: new Set(),
        undoCalls: 0,
        totals: { removeNodes: 0, removeEdges: 0, changedValues: 0 },
    };

    logger.debug("Request", {
        messageCount: conversation.messages.length + 1,
        promptLength: conversation.messages.reduce(
            (sum, m) => sum + m.parts.reduce((n, p) => n + (p.type === "text" ? p.text.length : 0), 0),
            conversation.system.length,
        ),
    });

    sink.status.startStreaming();

    // Every tool result goes back to the model, which then calls more tools or answers. A model
    // that looks before it acts -- query, then view on what it found -- gets to act; asked only
    // once, it would stop after looking and the person would get nothing.
    const tally: MessageTally = { results: [], committed: 0 };
    const texts: string[] = [];

    for (let turn = 1; ; turn++) {
        // Past the tool turns, a text answer only: a model that spent every turn looking and never
        // acted would otherwise end the message with nothing said. toolMode "none" alone is not
        // enough: gemini-3.8-flash still answers it with a tool call and no text, so the ask also
        // says, in words, that it is time to answer. A held batch ends the tool turns too: a later
        // write would move the history under the request and make the reader's approval stale.
        const answerOnly = turn > MAX_ASSISTANT_TOOL_TURNS || tally.held !== undefined;
        const offered = turnTools(tools, profile, conversation.messages);
        const history = profile === "small" ? trimmedHistory(conversation.messages) : [...conversation.messages];
        const { text, calls } = await modelTurn(
            run,
            {
                model: run.model,
                system: conversation.system,
                messages: answerOnly ? [...history, ANSWER_NOW] : history,
                tools: offered.map(toolSpec),
                toolMode: answerOnly ? "none" : "auto",
            },
            texts,
        );

        logger.debug("Response", {
            turn,
            textLength: text.length,
            toolCalls: calls.map((call) => knownToolName(tools, call.name)),
        });

        if (text) {
            texts.push(text);
        }

        // A provider that ignores toolMode may still call tools on the answer-only ask: they do not run.
        if (answerOnly || calls.length === 0) {
            break;
        }

        sink.status.startExecuting();

        const batch = await runBatch(run, calls, state, (threw) => {
            tally.results.push(...threw.results.filter((result): result is CallResult => result !== undefined));
            tally.failure ??= threw.failure;
            return combineResults(tally, joinTexts(texts));
        });
        tallyBatch(tally, batch, run);
        appendRound(conversation, text, calls, batch, RESULT_CAP[profile]);
    }

    const result = combineResults(tally, joinTexts(texts));
    if (tally.pending !== undefined && tally.held === undefined && tally.committed > 0) {
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
