/**
 * AI Controller Module - Orchestrates LLM providers and command execution.
 * @module ai/AiController
 */

import type { AiEvent } from "../events";
import { GraphtyLogger, type Logger } from "../logging";
import type { GraphSession, HistoryStepId, TransactionScope } from "../session/types";
import { type AiStatus, AiStatusManager, type StatusChangeCallback } from "./AiStatus";
import type { CommandRegistry } from "./commands";
import type { CommandContext, CommandResult } from "./commands/types";
import { MAX_TOOL_TURNS } from "./prompt/SystemPromptBuilder";
import type { LlmProvider, Message, ToolCall } from "./providers/types";
import { toSafeError } from "./safeError";
import type { SchemaManager } from "./schema";

const logger: Logger = GraphtyLogger.getLogger(["graphty", "ai"]);

/** The last ask's closing message, after the tool turns ran out: answer, do not call another tool. */
const ANSWER_NOW: Message = {
    role: "user",
    content:
        "No more tools can run for this message. Answer me now in plain text: say what you found and what you changed, and if my request was unclear, ask what I want.",
};

/** How much of one tool result is handed back to the model, so a large graph's answer stays a bounded prompt. */
const MAX_TOOL_RESULT_CHARS = 8000;

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

/** Numbers each message, so its steps can be found in the history by their provenance. */
let messageCount = 0;

/**
 * The newest applied step a message recorded.
 * @param session - The session.
 * @param message - The message's number, as its steps' `provenance.message` carries it.
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
 * Whether one of a message's steps has been undone.
 * @param session - The session.
 * @param message - The message's number.
 * @returns True when a step it recorded is past the history's cursor.
 */
function undoneStepOf(session: GraphSession, message: string): boolean {
    const { steps, position } = session.history;
    return steps.slice(position).some((step) => step.provenance.message === message);
}

/**
 * Take back what a message recorded: undo its steps while one of them is what the next undo would
 * undo. Stops at a step of anyone else's, or at pending work, which the person's own later edit
 * is: reverting under it could clobber it, so the message's older steps stay, undoable in order.
 * @param session - The session.
 * @param message - The message's number.
 */
async function revertMessage(session: GraphSession, message: string): Promise<void> {
    for (;;) {
        const next = session.history.nextUndo;
        if (next?.kind !== "undo" || next.step.provenance.message !== message) {
            return;
        }

        await session.undo();
    }
}

/** Event emitter callback type */
export type AiEventEmitter = (event: AiEvent) => void;

/** Options for creating an AiController */
export interface AiControllerOptions {
    /** The LLM provider to use */
    provider: LlmProvider;
    /** The command registry containing available commands */
    commandRegistry: CommandRegistry;
    /** The graph instance to operate on */
    graph: CommandContext["graph"];
    /** Optional event emitter for AI events */
    emitEvent?: AiEventEmitter;
    /** Optional schema manager for data schema in prompts */
    schemaManager?: SchemaManager | null;
}

/** Combined result from execution */
export interface ExecutionResult extends CommandResult {
    /** Raw response text from LLM (if any) */
    llmText?: string;
}

/**
 * A tool threw, so its batch's transaction rolled back, and the message's earlier batches are
 * taken back too. Carries the result the reader is told, which reports the failure.
 */
class MessageRolledBack extends Error {
    constructor(readonly result: ExecutionResult) {
        super(result.message);
    }
}

/**
 * Controller that orchestrates LLM providers and command execution.
 * Manages the conversation flow, command dispatch, and status updates.
 */
export class AiController {
    private provider: LlmProvider;
    private commandRegistry: CommandRegistry;
    private graph: CommandContext["graph"];
    private statusManager: AiStatusManager;
    private schemaManager: SchemaManager | null;
    private abortController: AbortController | null = null;
    private disposed = false;
    private emitEvent: AiEventEmitter | undefined;
    private currentInput: string | null = null;
    private startTime: number | null = null;
    private lastInput: string | null = null;
    private lastError: Error | null = null;

    /**
     * Creates a new AiController instance.
     * @param options - Configuration options for the controller
     */
    constructor(options: AiControllerOptions) {
        this.provider = options.provider;
        this.commandRegistry = options.commandRegistry;
        this.graph = options.graph;
        this.statusManager = new AiStatusManager();
        this.schemaManager = options.schemaManager ?? null;
        this.emitEvent = options.emitEvent;

        // Subscribe to status changes to emit events
        this.statusManager.subscribe((status) => {
            this.emitAiEvent({
                type: "ai-status-change",
                status,
            });
        });
    }

    /**
     * Emit an AI event if an emitter is configured.
     * @param event - The AI event to emit
     */
    private emitAiEvent(event: AiEvent): void {
        if (this.emitEvent) {
            this.emitEvent(event);
        }
    }

    /**
     * Execute a natural language command.
     * @param input - The user's natural language input
     * @returns Promise resolving to the execution result
     */
    async execute(input: string): Promise<ExecutionResult> {
        logger.debug("User input", { inputLength: input.length });

        if (this.disposed) {
            return {
                success: false,
                message: "Controller has been disposed",
            };
        }

        // Track input for retry
        this.currentInput = input;
        this.lastInput = input;
        this.startTime = Date.now();
        this.lastError = null;

        // Create new abort controller for this execution
        const abortController = new AbortController();
        this.abortController = abortController;

        // Emit command start event
        this.emitAiEvent({
            type: "ai-command-start",
            input,
            timestamp: this.startTime,
        });

        // Transition to submitted state
        this.statusManager.submit();

        // One message is one undoable step, made of short transactions: each batch of tool calls
        // the model returns runs in its own, which commits before the model is asked again, so
        // nothing is held while the model thinks and the person's own edits go through. Every
        // batch after the first continues the message's step (`after`), merging into it while it
        // is the newest step. An undo of one of its steps while the message is going ends it.
        const message = String(++messageCount);
        let stopWatching: (() => void) | undefined;
        try {
            const session = this.graph.getSession();
            stopWatching = session.on("history:changed", () => {
                if (!abortController.signal.aborted && undoneStepOf(session, message)) {
                    abortController.abort(new DOMException("The message was undone.", "AbortError"));
                }
            });

            let result: ExecutionResult;
            try {
                result = await this.converse(input, session, message, abortController.signal);
            } catch (error) {
                // A tool threw, the message was cancelled or undone, or the model failed: what the
                // message's earlier batches recorded is taken back, as one transaction's rollback was.
                await revertMessage(session, message);
                if (!(error instanceof MessageRolledBack)) {
                    throw error;
                }

                ({ result } = error);
            }

            // Complete
            this.statusManager.complete();

            // Emit complete event
            this.emitAiEvent({
                type: "ai-command-complete",
                result,
                duration: Date.now() - this.startTime,
            });

            return result;
        } catch (error) {
            // Any provider's error, a consumer's own included, may carry the prompt and the
            // response; only its name, message and stack go on.
            const errorObj = toSafeError(error);
            const errorMessage = errorObj.message;

            this.lastError = errorObj;

            this.statusManager.setError(errorObj, true);

            // Emit error event
            this.emitAiEvent({
                type: "ai-command-error",
                error: errorObj,
                input,
                canRetry: true,
            });

            return {
                success: false,
                message: `Error: ${errorMessage}`,
            };
        } finally {
            stopWatching?.();
            this.abortController = null;
            this.currentInput = null;
        }
    }

    /**
     * Get the last input that was executed.
     * @returns The last input or null if no command has been executed
     */
    getLastInput(): string | null {
        return this.lastInput;
    }

    /**
     * Get the last error that occurred.
     * @returns The last error or null if no error occurred
     */
    getLastError(): Error | null {
        return this.lastError;
    }

    /**
     * Clear the last error.
     */
    clearLastError(): void {
        this.lastError = null;
    }

    /**
     * Build the message array for the LLM.
     * @param input - User input
     * @returns Array of messages
     */
    private buildMessages(input: string): Message[] {
        // Build a system prompt with available commands
        const commands = this.commandRegistry.getAll();
        const commandDescriptions = commands.map((cmd) => `- ${cmd.name}: ${cmd.description}`).join("\n");

        // Build schema section if available
        const schemaSection = this.buildSchemaSection();

        const systemPrompt = `You are an AI assistant that helps users interact with a graph visualization.

Available commands:
${commandDescriptions}
${schemaSection}
When the user asks you to perform an action, use the appropriate tool. If no tool is needed, respond conversationally.`;

        // Some providers (WebLLM's Hermes models) refuse a custom system prompt alongside tools:
        // the instructions then lead the user's turn instead, so the model still gets them.
        if (this.provider.supportsSystemPromptWithTools === false) {
            return [{ role: "user", content: `${systemPrompt}\n\n${input}` }];
        }

        return [
            { role: "system", content: systemPrompt },
            { role: "user", content: input },
        ];
    }

    /**
     * Build the schema section for the system prompt.
     * @returns Formatted schema section or empty string if no schema
     */
    private buildSchemaSection(): string {
        if (!this.schemaManager) {
            return "";
        }

        const schema = this.schemaManager.getSchema();

        if (!schema || (schema.nodeCount === 0 && schema.edgeCount === 0)) {
            return "";
        }

        return `\n${this.schemaManager.getFormattedSchema()}\n`;
    }

    /**
     * One message: ask the model, then run the tools it calls, each batch in a short transaction.
     * @param input - The user's natural language input
     * @param session - The session the batches' transactions open on
     * @param message - The message's number, stamped on its steps' provenance
     * @param aborted - Fires when the message is cancelled or undone
     * @returns The execution result
     */
    private async converse(
        input: string,
        session: GraphSession,
        message: string,
        aborted: AbortSignal,
    ): Promise<ExecutionResult> {
        // Build messages for LLM
        const messages: Message[] = this.buildMessages(input);

        // Get tool definitions from registry
        const tools = this.commandRegistry.toToolDefinitions();

        logger.debug("Request", {
            messageCount: messages.length,
            promptLength: messages.reduce((sum, m) => sum + m.content.length, 0),
            tools: tools.map((t) => t.name),
        });

        // Transition to streaming state
        this.statusManager.startStreaming();

        // Every tool result goes back to the model, which then calls more tools or answers. A
        // model that looks before it acts -- findNodes, then zoomToNodes on what it found -- gets
        // to act; asked only once, it would stop after looking and the person would get nothing.
        const results: CommandResult[] = [];
        const texts: string[] = [];

        for (let turn = 1; ; turn++) {
            // Past the tool turns, a text answer only: a model that spent every turn looking
            // (sampleData, describeProperty, findNodes) and never acted would otherwise end the
            // message with nothing said, and the person would get no answer at all.
            // toolChoice "none" alone is not enough: gemini-3.8-flash still answers it with a tool
            // call and no text, so the ask also says, in words, that it is time to answer.
            const answerOnly = turn > MAX_TOOL_TURNS;
            const response = await this.provider.generate(answerOnly ? [...messages, ANSWER_NOW] : messages, tools, {
                signal: aborted,
                toolChoice: answerOnly ? "none" : "auto",
            });

            logger.debug("Response", {
                turn,
                textLength: response.text.length,
                toolCalls: response.toolCalls.map((tc) => this.knownToolName(tc.name)),
            });

            // Append any text response and emit stream chunk event
            if (response.text) {
                texts.push(response.text);
                this.statusManager.appendStreamedText(response.text);
                this.emitAiEvent({
                    type: "ai-stream-chunk",
                    text: response.text,
                    accumulated: texts.join("\n"),
                });
            }

            // A provider that ignores toolChoice may still call tools on the answer-only ask: they do not run.
            if (answerOnly || response.toolCalls.length === 0) {
                break;
            }

            // Transition to executing state
            this.statusManager.startExecuting();

            const { toolCalls } = response;
            const step = await session.transaction(
                input,
                async (tx, signal) => {
                    // The batch's abort (an undo while it runs) stops the model and every tool.
                    signal.addEventListener(
                        "abort",
                        () => {
                            this.abortController?.abort(signal.reason);
                        },
                        { once: true },
                    );
                    const ran = await this.executeToolCalls(toolCalls, tx, aborted);
                    results.push(...ran.results);
                    if (ran.threw) {
                        // Thrown inside the batch, so its own transaction rolls back.
                        throw new MessageRolledBack(this.combineResults(results, joinTexts(texts)));
                    }

                    return ran;
                },
                { provenance: { via: "assistant", message }, after: latestStepOf(session, message) },
            );

            if (turn === MAX_TOOL_TURNS) {
                logger.debug("Out of tool turns: asking for a text answer only", { turns: turn });
            }

            messages.push({ role: "assistant", content: response.text, toolCalls: response.toolCalls });
            response.toolCalls.forEach((toolCall, index) => {
                messages.push({
                    role: "tool",
                    toolCallId: toolCall.id,
                    content: toolResultContent(step.results.at(index)),
                });
            });
        }

        return this.combineResults(results, joinTexts(texts));
    }

    /**
     * Execute one turn's tool calls, in order, stopping at the first that fails.
     * @param toolCalls - Tool calls to execute
     * @param tx - The batch's transaction
     * @param signal - Fires when the message is cancelled
     * @returns The result of each tool that ran, and whether one threw, which rolls the message back.
     */
    private async executeToolCalls(
        toolCalls: ToolCall[],
        tx: TransactionScope,
        signal: AbortSignal,
    ): Promise<{ results: CommandResult[]; threw: boolean }> {
        const results: CommandResult[] = [];
        let threw = false;
        for (const toolCall of toolCalls) {
            // Cancelled, or undone while the message was going: no further tool runs.
            signal.throwIfAborted();

            // Add tool call to status
            this.statusManager.addToolCall(toolCall.name);
            this.statusManager.updateToolCallStatus(toolCall.name, "executing");

            // Emit tool call event
            this.emitAiEvent({
                type: "ai-stream-tool-call",
                name: toolCall.name,
                params: toolCall.arguments,
            });

            try {
                const result = await this.executeToolCall(toolCall, tx);

                results.push(result);

                // Update tool call status
                this.statusManager.updateToolCallStatus(
                    toolCall.name,
                    result.success ? "complete" : "error",
                    result.data ?? { message: result.message },
                );

                // Emit tool result event
                this.emitAiEvent({
                    type: "ai-stream-tool-result",
                    name: toolCall.name,
                    result: result.data ?? { message: result.message },
                    success: result.success,
                });

                // If any command fails, stop executing remaining
                if (!result.success) {
                    break;
                }
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                const errorResult: CommandResult = {
                    success: false,
                    message: `Error executing ${toolCall.name}: ${errorMessage}`,
                };

                results.push(errorResult);

                this.statusManager.updateToolCallStatus(toolCall.name, "error", { error: errorMessage });

                // Emit tool result event for error
                this.emitAiEvent({
                    type: "ai-stream-tool-result",
                    name: toolCall.name,
                    result: { error: errorMessage },
                    success: false,
                });
                threw = true;
                break;
            }
        }

        return { results, threw };
    }

    /**
     * A tool name safe to log: a registered command's name, never a name the model made up,
     * which is model output and may carry anything.
     * @param name - The name the model called.
     * @returns The name when a command is registered under it, otherwise "(unknown)".
     */
    private knownToolName(name: string): string {
        return this.commandRegistry.get(name) ? name : "(unknown)";
    }

    /**
     * Execute a single tool call.
     * @param toolCall - The tool call to execute
     * @param tx - The batch's transaction, handed to the command as `ctx.tx`
     * @returns Command result
     */
    private async executeToolCall(toolCall: ToolCall, tx: TransactionScope): Promise<CommandResult> {
        logger.debug("Executing command", { name: this.knownToolName(toolCall.name) });

        const command = this.commandRegistry.get(toolCall.name);

        if (!command) {
            logger.debug("Command result: FAILED - Unknown command", { nameLength: toolCall.name.length });
            return {
                success: false,
                message: `Unknown command: ${toolCall.name}. Command not found in registry.`,
            };
        }

        // Validate and transform arguments through the command's Zod schema
        // This ensures: 1) valid data, 2) transforms applied (e.g., color names → hex),
        // 3) default values applied
        let validatedArguments: Record<string, unknown>;
        try {
            validatedArguments = command.parameters.parse(toolCall.arguments);
            logger.debug("Validated arguments", {
                name: command.name,
                argumentCount: Object.keys(validatedArguments).length,
            });
        } catch (validationError) {
            const errorMessage = validationError instanceof Error ? validationError.message : String(validationError);
            logger.debug("Command result: FAILED - Invalid arguments", {
                name: command.name,
                errorType: validationError instanceof Error ? validationError.name : typeof validationError,
            });
            return {
                success: false,
                message: `Invalid arguments for ${toolCall.name}: ${errorMessage}`,
            };
        }

        // Create execution context
        const context: CommandContext = {
            graph: this.graph,
            tx,
            abortSignal: this.abortController?.signal ?? new AbortController().signal,
            emitEvent: (type: string, _data: unknown) => {
                // Bridge from string-based events to AiEvent
                // Commands can emit events using simple type/data format
                logger.debug("Command emitted event", { name: command.name, type });
            },
            updateStatus: (updates) => {
                if (updates.stageMessage) {
                    this.statusManager.setStage("executing", updates.stageMessage);
                }
            },
        };

        // Execute the command with validated arguments
        const result = await command.execute(this.graph, validatedArguments, context);

        logger.debug("Command result", {
            name: command.name,
            success: result.success,
            messageLength: result.message.length,
            hasData: result.data !== undefined,
        });

        return result;
    }

    /**
     * Combine multiple command results into a single result.
     * @param results - Results from executed commands
     * @param llmText - Optional text from LLM
     * @returns Combined execution result
     */
    private combineResults(results: CommandResult[], llmText?: string): ExecutionResult {
        if (results.length === 0) {
            return {
                success: true,
                message: llmText ?? "No response from AI",
                llmText,
            };
        }

        // Check if all succeeded
        const allSucceeded = results.every((r) => r.success);

        // Combine messages
        const messages = results.map((r) => r.message);

        if (llmText) {
            messages.unshift(llmText);
        }

        // Combine affected nodes/edges
        const affectedNodes = [...new Set(results.flatMap((r) => r.affectedNodes ?? []))];

        const affectedEdges = [...new Set(results.flatMap((r) => r.affectedEdges ?? []))];

        // Use data from last successful result (or last result)
        const lastResult = results.filter((r) => r.success).pop() ?? results[results.length - 1];

        return {
            success: allSucceeded,
            message: messages.join("\n"),
            data: lastResult.data,
            affectedNodes: affectedNodes.length > 0 ? affectedNodes : undefined,
            affectedEdges: affectedEdges.length > 0 ? affectedEdges : undefined,
            llmText,
        };
    }

    /**
     * Get the current status snapshot.
     * @returns Current AI status
     */
    getStatus(): AiStatus {
        return this.statusManager.getSnapshot();
    }

    /**
     * Subscribe to status changes.
     * @param callback - Function to call on status change
     * @returns Unsubscribe function
     */
    onStatusChange(callback: StatusChangeCallback): () => void {
        return this.statusManager.subscribe(callback);
    }

    /**
     * Cancel the current operation.
     */
    cancel(): void {
        if (this.abortController) {
            this.abortController.abort();

            // Emit cancelled event
            if (this.currentInput) {
                this.emitAiEvent({
                    type: "ai-command-cancelled",
                    input: this.currentInput,
                    reason: "user",
                });
            }
        }
    }

    /**
     * Dispose of the controller and clean up resources.
     */
    dispose(): void {
        this.disposed = true;
        this.cancel();
        this.statusManager.reset();
    }
}
