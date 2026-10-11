/**
 * @file The assistant's loop: ask the model, run the tools it calls, hand their results back, and
 * repeat until it answers. Everything it works on is passed in, so several conversations (a
 * helper beside the main one, later) can run it at once.
 *
 * The shape: the conversation so far, one model turn, the calls of that turn run in order in one
 * short transaction, their results added to the conversation; up to `MAX_TOOL_TURNS` such rounds,
 * then one turn that may only answer in text.
 */

import { GraphtyLogger, type Logger } from "../logging";
import type { GraphSession, HistoryStepId } from "../session/types";
import type { ExecutionResult } from "./AiController";
import type { CommandRegistry } from "./commands";
import type { CommandContext, CommandResult, GraphCommand } from "./commands/types";
import { toolJsonSchema } from "./engine/jsonSchema";
import type { AiEngine, JsonSchema, SavedMessage, ToolSpec, TurnError, TurnRequest } from "./engine/types";
import { MAX_TOOL_TURNS } from "./prompt/SystemPromptBuilder";
import {
    type BatchOutcome,
    BatchThrew,
    type ConversationSink,
    knownToolName,
    type Outcome,
    runToolBatch,
    type ToolCallRequest,
} from "./ToolExecutor";

const logger: Logger = GraphtyLogger.getLogger(["graphty", "ai"]);

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

/** How much of one tool result is handed back to the model, so a large graph's answer stays a bounded prompt. */
const MAX_TOOL_RESULT_CHARS = 8000;

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
 * A tool threw, so its batch's transaction rolled back, and the message's earlier batches are to
 * be taken back too. Carries the result the reader is told, which reports the failure.
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
 * What the model is told a tool did: its success, its message and its data, as JSON.
 * @param result - The tool's result, or undefined for a tool that did not run because an earlier one failed.
 * @returns The tool message's content.
 */
function toolResultContent(result: CommandResult | undefined): string {
    if (result === undefined) {
        return JSON.stringify({ success: false, message: "Not run: an earlier tool call in this step failed." });
    }

    const content = JSON.stringify({ success: result.success, message: result.message, data: result.data });
    return content.length > MAX_TOOL_RESULT_CHARS
        ? `${content.slice(0, MAX_TOOL_RESULT_CHARS)}... (truncated)`
        : content;
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
function latestStepOf(session: GraphSession, message: string): HistoryStepId | undefined {
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
            jsonSchema ??= toolJsonSchema(command.parameters);
            return jsonSchema;
        },
    };
}

/**
 * Combine the results of every tool that ran into the message's result.
 * @param results - Results from executed commands
 * @param llmText - Optional text from the model
 * @param failure - Why the tool that failed failed, when one did
 * @returns Combined execution result
 */
function combineResults(results: CommandResult[], llmText?: string, failure?: Outcome): ExecutionResult {
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

    const allSucceeded = results.every((r) => r.success);
    const messages = results.map((r) => r.message);
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
 * @throws {TurnFailed} When the turn ends with an error.
 */
async function modelTurn(
    run: ConversationRun,
    request: TurnRequest,
    earlier: readonly string[],
): Promise<{ text: string; calls: ToolCallRequest[] }> {
    const { engine, sink, abort } = run;
    let text = "";
    const calls: ToolCallRequest[] = [];
    for await (const event of engine.turn(request, abort.signal)) {
        if (event.type === "text") {
            text += event.delta;
            sink.status.appendStreamedText(event.delta);
            sink.emit({ type: "ai-stream-chunk", text: event.delta, accumulated: [...earlier, text].join("\n") });
        } else if (event.type === "tool-call") {
            calls.push({ id: event.id, name: event.name, arguments: event.arguments });
        } else if (event.type === "error") {
            throw new TurnFailed(event);
        } else if (event.type === "finish") {
            break;
        }
    }

    return { text, calls };
}

/**
 * Add one round to the conversation: the model's text and calls, then each call's result.
 * @param conversation - The conversation.
 * @param text - The model's text this turn.
 * @param calls - The calls it made.
 * @param batch - What running them did.
 */
function appendRound(conversation: Conversation, text: string, calls: ToolCallRequest[], batch: BatchOutcome): void {
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
                })),
            ],
        },
        {
            id: `m${id + 1}`,
            role: "tool",
            parts: calls.map((call, index) => {
                const result = batch.results.at(index);
                const outcome: Outcome =
                    result?.success === true
                        ? { code: "AI_COMPLETED", params: {} }
                        : (batch.failure ?? { code: "AI_TOOL_FAILED", params: { tool: call.name } });
                return {
                    type: "tool-result" as const,
                    origin: "graph-data" as const,
                    callId: call.id,
                    ...outcome,
                    content: toolResultContent(result),
                };
            }),
        },
    );
}

/**
 * Run one batch of calls in its transaction.
 * @param run - The loop's run.
 * @param calls - The calls.
 * @param resultOf - The message's result once a call threw, given what the batch ran.
 * @returns What the batch did.
 * @throws {MessageRolledBack} When a call threw.
 */
async function runBatch(
    run: ConversationRun,
    calls: ToolCallRequest[],
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
            message,
            after: latestStepOf(session, message),
            abort: run.abort,
            sink: run.sink,
        });
    } catch (error) {
        if (error instanceof BatchThrew) {
            throw new MessageRolledBack(resultOf(error.outcome));
        }

        throw error;
    }
}

/**
 * Run the loop for one message: ask the model, then run the tools it calls, each batch in a short
 * transaction that joins the message's one undo step.
 * @param run - What to run, and where.
 * @returns The message's result.
 * @throws {TurnFailed} When a model turn failed.
 * @throws {MessageRolledBack} When a tool threw; its batch is rolled back, earlier batches are the caller's to take back.
 */
export async function runConversation(run: ConversationRun): Promise<ExecutionResult> {
    const { conversation, tools, sink } = run;
    const specs = tools.getAll().map(toolSpec);

    logger.debug("Request", {
        messageCount: conversation.messages.length + 1,
        promptLength: conversation.messages.reduce(
            (sum, m) => sum + m.parts.reduce((n, p) => n + (p.type === "text" ? p.text.length : 0), 0),
            conversation.system.length,
        ),
        tools: specs.map((t) => t.name),
    });

    sink.status.startStreaming();

    // Every tool result goes back to the model, which then calls more tools or answers. A model
    // that looks before it acts -- findNodes, then zoomToNodes on what it found -- gets to act;
    // asked only once, it would stop after looking and the person would get nothing.
    const results: CommandResult[] = [];
    const texts: string[] = [];
    let failure: Outcome | undefined;

    for (let turn = 1; ; turn++) {
        // Past the tool turns, a text answer only: a model that spent every turn looking
        // (sampleData, describeProperty, findNodes) and never acted would otherwise end the
        // message with nothing said, and the person would get no answer at all.
        // toolMode "none" alone is not enough: gemini-3.8-flash still answers it with a tool
        // call and no text, so the ask also says, in words, that it is time to answer.
        const answerOnly = turn > MAX_TOOL_TURNS;
        const { text, calls } = await modelTurn(
            run,
            {
                model: run.model,
                system: conversation.system,
                messages: answerOnly ? [...conversation.messages, ANSWER_NOW] : [...conversation.messages],
                tools: specs,
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

        const batch = await runBatch(run, calls, (threw) => {
            results.push(...threw.results);
            failure ??= threw.failure;
            return combineResults(results, joinTexts(texts), failure);
        });
        results.push(...batch.results);
        failure ??= batch.failure;

        if (turn === MAX_TOOL_TURNS) {
            logger.debug("Out of tool turns: asking for a text answer only", { turns: turn });
        }

        appendRound(conversation, text, calls, batch);
    }

    return combineResults(results, joinTexts(texts), failure);
}
