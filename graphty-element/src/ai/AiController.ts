/**
 * AI Controller Module - Orchestrates LLM providers and command execution.
 * @module ai/AiController
 */

import type { AiResultCode, AiResultParams } from "../catalog/ai";
import type { AiEvent } from "../events";
import { GraphtyLogger, type Logger } from "../logging";
import type { GraphSession } from "../session/types";
import { type AiStatus, AiStatusManager, type StatusChangeCallback } from "./AiStatus";
import type { CommandRegistry } from "./commands";
import type { CommandContext, CommandResult } from "./commands/types";
import { ENGINE_OVERRIDE, engineFor } from "./engine/load";
import type { AiEngine } from "./engine/types";
import type { LlmProvider } from "./providers/types";
import { type Conversation, MessageRolledBack, runConversation, TurnFailed } from "./runConversation";
import { toSafeError } from "./safeError";
import type { SchemaManager } from "./schema";
import type { Outcome } from "./ToolExecutor";

const logger: Logger = GraphtyLogger.getLogger(["graphty", "ai"]);

/** Numbers each message, so its steps can be found in the history by their provenance. */
let messageCount = 0;

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
    /**
     * What happened, as a stable code to switch on; `AI_RESULT_CODES` in `./catalog` lists them all.
     * Every result the element returns sets it.
     */
    code?: AiResultCode;
    /** The facts behind the code (a provider id, a tool name, an HTTP status); empty when there are none. */
    params?: AiResultParams;
}

/**
 * Controller that orchestrates LLM providers and command execution.
 * Manages the conversation flow, command dispatch, and status updates.
 */
export class AiController {
    private readonly engine: AiEngine;
    private commandRegistry: CommandRegistry;
    private graph: CommandContext["graph"];
    private statusManager: AiStatusManager;
    private schemaManager: SchemaManager | null;
    /** The messages running now, each with its request: several may run at once. */
    private readonly running = new Map<AbortController, string>();
    private disposed = false;
    private emitEvent: AiEventEmitter | undefined;
    private lastInput: string | null = null;
    private lastError: Error | null = null;
    /** The messages `cancel()` ended, so their results say cancelled, not undone. */
    private readonly cancelled = new WeakSet<AbortController>();

    /**
     * Creates a new AiController instance.
     * @param options - Configuration options for the controller
     */
    constructor(options: AiControllerOptions) {
        // The regression harness's recording decorator comes in under an internal option.
        this.engine =
            (options as AiControllerOptions & { [ENGINE_OVERRIDE]?: AiEngine })[ENGINE_OVERRIDE] ??
            engineFor(options.provider);
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
                code: "AI_DISPOSED",
                params: {},
            };
        }

        // Track input for retry
        this.lastInput = input;
        const startTime = Date.now();
        this.lastError = null;

        // Create new abort controller for this execution
        const abortController = new AbortController();
        this.running.set(abortController, input);

        // Emit command start event
        this.emitAiEvent({
            type: "ai-command-start",
            input,
            timestamp: startTime,
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
                result = await runConversation({
                    conversation: this.startConversation(input),
                    engine: this.engine,
                    tools: this.commandRegistry,
                    graph: this.graph,
                    session,
                    label: input,
                    message,
                    abort: abortController,
                    sink: {
                        emit: (event) => {
                            this.emitAiEvent(event);
                        },
                        status: this.statusManager,
                    },
                });
            } catch (error) {
                // A tool threw, the message was cancelled or undone, or the model failed: what the
                // message's earlier batches recorded is taken back, as one transaction's rollback was.
                await revertMessage(session, message);
                if (!(error instanceof MessageRolledBack)) {
                    throw error;
                }

                ({ result } = error);
                // The batch's rollback aborts the message too, so only a cancel overrides the tool's code.
                if (this.cancelled.has(abortController)) {
                    result = { ...result, code: "AI_CANCELLED", params: {} };
                }
            }

            // Complete
            this.statusManager.complete();

            // Emit complete event
            this.emitAiEvent({
                type: "ai-command-complete",
                result,
                duration: Date.now() - startTime,
            });

            return result;
        } catch (error) {
            // Any provider's error, a consumer's own included, may carry the prompt and the
            // response; only its name, message and stack go on.
            const original = error instanceof TurnFailed ? error.failure.cause : error;
            const errorObj = toSafeError(original);
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
                ...this.failureOutcome(error, abortController),
            };
        } finally {
            stopWatching?.();
            this.running.delete(abortController);
        }
    }

    /**
     * Why a message that was aborted ended.
     * @param abortController - The message's abort controller.
     * @returns Cancelled when `cancel()` ended it, undone otherwise.
     */
    private abortOutcome(abortController: AbortController): Outcome {
        return { code: this.cancelled.has(abortController) ? "AI_CANCELLED" : "AI_UNDONE", params: {} };
    }

    /**
     * Why a message that threw failed.
     * @param error - What the loop threw.
     * @param abortController - The message's abort controller.
     * @returns The code and its facts.
     */
    private failureOutcome(error: unknown, abortController: AbortController): Outcome {
        if (abortController.signal.aborted) {
            return this.abortOutcome(abortController);
        }

        if (error instanceof TurnFailed) {
            const { code, params } = error.failure;
            return { code, params };
        }

        return { code: "AI_FAILED", params: {} };
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
     * A new conversation for one message: the instructions, with the commands and the data's
     * schema, and the reader's request.
     * @param input - User input
     * @returns The conversation
     */
    private startConversation(input: string): Conversation {
        const commands = this.commandRegistry.getAll();
        const commandDescriptions = commands.map((cmd) => `- ${cmd.name}: ${cmd.description}`).join("\n");
        const schemaSection = this.buildSchemaSection();

        const system = `You are an AI assistant that helps users interact with a graph visualization.

Available commands:
${commandDescriptions}
${schemaSection}
When the user asks you to perform an action, use the appropriate tool. If no tool is needed, respond conversationally.`;

        return {
            system,
            messages: [{ id: "m1", role: "user", parts: [{ type: "text", origin: "reader", text: input }] }],
        };
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
     * Cancel every message that is running.
     */
    cancel(): void {
        for (const [abortController, input] of this.running) {
            if (abortController.signal.aborted) {
                continue;
            }

            this.cancelled.add(abortController);
            abortController.abort();
            this.emitAiEvent({ type: "ai-command-cancelled", input, reason: "user" });
        }
    }

    /**
     * Dispose of the controller and clean up resources.
     */
    dispose(): void {
        this.disposed = true;
        this.cancel();
        this.engine.dispose();
        this.statusManager.reset();
    }
}
