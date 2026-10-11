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
import { type Conversation, latestStepOf, MessageRolledBack, runConversation, TurnFailed } from "./runConversation";
import { toSafeError } from "./safeError";
import type { SchemaManager } from "./schema";
import { type BatchOutcome, type HeldBatch, type Outcome, runToolBatch } from "./ToolExecutor";
import { hasAssistantTools, installAssistantTools } from "./tools/install";
import { assistantInstructions, factsBlock } from "./tools/prompt";
import { isAssistantTool } from "./tools/toolset";
import { type AssistantGateLimits, DEFAULT_ASSISTANT_GATE_LIMITS } from "./tools/types";

const logger: Logger = GraphtyLogger.getLogger(["graphty", "ai"]);

/** Numbers each message, so its steps can be found in the history by their provenance. */
let messageCount = 0;

/** Numbers each approval request. */
let approvalCount = 0;

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
 * @returns How many of the message's steps remain applied: zero when it was taken back whole.
 */
async function revertMessage(session: GraphSession, message: string): Promise<number> {
    for (;;) {
        const next = session.history.nextUndo;
        if (next?.kind !== "undo" || next.step.provenance.message !== message) {
            const { steps, position } = session.history;
            return steps.slice(0, position).filter((step) => step.provenance.message === message).length;
        }

        await session.undo();
    }
}

/** A batch held for the host's approval, until the reader's next message. */
interface PendingApproval {
    readonly message: string;
    readonly label: string;
    readonly held: HeldBatch;
    readonly revision: string;
    readonly readerText: string;
}

/**
 * What a settled turn of the controller's queue resolves to, however it ended.
 * @returns Nothing.
 */
function settled(): undefined {
    return undefined;
}

/**
 * What a held change was measured against: the history, which moves on every change a project
 * saves and on every undo. (The input tick moves on every frame of a live layout, which would make
 * every approval on a rendered graph stale.)
 * @param session - The session.
 * @returns The revision.
 */
function revisionOf(session: GraphSession): string {
    const { history } = session;
    return `${String(history.version)}:${String(history.position)}`;
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
    /**
     * Which tools a model is offered when the registry holds the generated ones: `"standard"` (the
     * core tools plus those a catalog search loads) or `"small"` (catalog, query, call and undo,
     * for a model that breaks past a handful of tools). Default `"standard"`.
     */
    toolProfile?: "standard" | "small";
    /**
     * The limits past which the assistant's changes are held for the reader's approval
     * (`ai-approval-requested`), or `false` to run every change without asking. Default
     * `DEFAULT_ASSISTANT_GATE_LIMITS`.
     */
    gate?: Partial<AssistantGateLimits> | false;
    /**
     * Admits a URL the reader did not type for an import; an admitted URL is still held for
     * approval. Absent, only URLs in the reader's own message are imported.
     */
    allowImportUrl?: (url: URL) => boolean;
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
    /** Batches held for approval, by request id, until the reader's next message. */
    private readonly approvals = new Map<string, PendingApproval>();
    private readonly profile: "standard" | "small";
    private readonly gate: Readonly<AssistantGateLimits> | false;
    private readonly allowImportUrl: ((url: URL) => boolean) | undefined;
    /** Runs the assistant started, which it may cancel without asking. */
    private readonly assistantRuns = new Set<string>();
    /**
     * The controller's turns, one at a time: a message, or an approval, waits for the one before
     * it, so two never write into each other's transactions or share the status.
     */
    private queue: Promise<unknown> = Promise.resolve();

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
        this.profile = options.toolProfile ?? "standard";
        this.gate = options.gate === false ? false : { ...DEFAULT_ASSISTANT_GATE_LIMITS, ...options.gate };
        this.allowImportUrl = options.allowImportUrl;

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

        // Registered now, so `cancel()` reaches a message still waiting for the one before it.
        const abortController = new AbortController();
        this.running.set(abortController, input);
        return this.enqueue(async () => {
            if (abortController.signal.aborted) {
                this.running.delete(abortController);
                return { success: false, message: "", code: "AI_CANCELLED", params: {} };
            }

            return this.executeNow(input, abortController);
        });
    }

    /**
     * Run a turn of the controller once the turns before it have settled.
     * @param turn - The turn.
     * @returns What the turn returned.
     */
    private enqueue<T>(turn: () => Promise<T>): Promise<T> {
        const result = this.queue.then(turn);
        this.queue = result.then(settled, settled);
        return result;
    }

    /**
     * Run one message, its turn come.
     * @param input - The reader's request.
     * @param abortController - The message's controller, which `cancel()` aborts.
     * @returns The message's result.
     */
    private async executeNow(input: string, abortController: AbortController): Promise<ExecutionResult> {
        const startTime = Date.now();
        this.lastError = null;

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
        // A held batch's approval expires when the reader says something new.
        this.approvals.clear();
        let stopWatching = (): void => undefined;
        try {
            const session = this.graph.getSession();
            if (hasAssistantTools(this.commandRegistry)) {
                // A plugin registered since the last message reaches the model now.
                installAssistantTools(this.commandRegistry, session);
            }
            stopWatching = session.on("history:changed", () => {
                if (!abortController.signal.aborted && undoneStepOf(session, message)) {
                    abortController.abort(new DOMException("The message was undone.", "AbortError"));
                }
            });

            let result: ExecutionResult;
            try {
                const emit = (event: AiEvent): void => {
                    this.emitAiEvent(event);
                };
                result = await runConversation({
                    conversation: this.startConversation(input, session),
                    engine: this.engine,
                    tools: this.commandRegistry,
                    graph: this.graph,
                    session,
                    label: input,
                    message,
                    abort: abortController,
                    sink: { emit, status: this.statusManager },
                    profile: this.profile,
                    state: {
                        id: message,
                        gate: this.gate,
                        runs: this.assistantRuns,
                        undoCalls: 0,
                        totals: { removeNodes: 0, removeEdges: 0, changedValues: 0 },
                    },
                    host: {
                        emit,
                        readerText: input,
                        ...(this.allowImportUrl === undefined ? {} : { allowImportUrl: this.allowImportUrl }),
                    },
                    hold: (held) => this.hold(held, message, input, session),
                });
            } catch (error) {
                // A tool threw, the message was cancelled or undone, or the model failed: what the
                // message's earlier batches recorded is taken back, as one transaction's rollback was.
                // The message's own revert is no undo by the reader: stop watching first, so it
                // does not read as one and hide why the message failed.
                stopWatching();
                stopWatching = (): void => undefined;
                const remaining = await revertMessage(session, message);
                if (!(error instanceof MessageRolledBack)) {
                    throw error;
                }

                ({ result } = error);
                if (remaining > 0) {
                    result = { ...result, code: "AI_ROLLBACK_PARTIAL", params: { ...result.params, steps: remaining } };
                }
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
            stopWatching();
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
     * Store a held batch and ask the host about it.
     * @param held - The batch.
     * @param message - The message that made it.
     * @param label - The message's text, its step's label.
     * @param session - The session, for its revision.
     * @returns The request's id.
     */
    private hold(held: HeldBatch, message: string, label: string, session: GraphSession): string {
        const id = `approval-${String(++approvalCount)}`;
        this.approvals.set(id, { message, label, held, revision: revisionOf(session), readerText: label });
        this.emitAiEvent({
            type: "ai-approval-requested",
            request: {
                id,
                gate: held.gate,
                calls: held.calls.map((call) => ({ tool: call.name, arguments: call.arguments })),
                preview: held.preview,
            },
        });
        return id;
    }

    /**
     * Answer an approval request: approve runs the held change as one more step of its message;
     * deny drops it. A request expires at the reader's next message, and one answered after the
     * graph changed is refused as stale.
     * @param id - The request's id, from `ai-approval-requested`.
     * @param answer - Whether the reader approves.
     * @param answer.approve - True to run the change.
     * @returns What happened: the batch's result, `AI_CONFIRMATION_NEEDED` when another limit holds
     *     it again, `AI_APPROVAL_DENIED` or `AI_APPROVAL_STALE`.
     */
    resolveAiApproval(id: string, answer: { readonly approve: boolean }): Promise<ExecutionResult> {
        // An answer given while its message still runs (from inside the listener) waits for it.
        return this.enqueue(() => this.resolveNow(id, answer));
    }

    /**
     * Answer an approval request, its turn come.
     * @param id - The request's id.
     * @param answer - Whether the reader approves.
     * @param answer.approve - True to run the change.
     * @returns What happened.
     */
    private async resolveNow(id: string, answer: { readonly approve: boolean }): Promise<ExecutionResult> {
        const pending = this.approvals.get(id);
        this.approvals.delete(id);
        const session = this.graph.getSession();
        if (pending?.revision !== revisionOf(session)) {
            return { success: false, message: "", code: "AI_APPROVAL_STALE", params: { request: id } };
        }

        if (!answer.approve) {
            return { success: true, message: "", code: "AI_APPROVAL_DENIED", params: { request: id } };
        }

        const abort = new AbortController();
        this.running.set(abort, pending.label);
        const emit = (event: AiEvent): void => {
            this.emitAiEvent(event);
        };
        let batch: BatchOutcome;
        try {
            batch = await runToolBatch({
                calls: pending.held.calls,
                registry: this.commandRegistry,
                graph: this.graph,
                session,
                label: pending.label,
                // Only the hold the reader approved is let through; every other limit still holds,
                // counted on from what the message had done before the held batch.
                message: {
                    id: pending.message,
                    gate: this.gate,
                    approved: pending.held.gate,
                    runs: this.assistantRuns,
                    undoCalls: 0,
                    totals: { ...pending.held.totals },
                },
                after: latestStepOf(session, pending.message),
                abort,
                sink: { emit, status: this.statusManager },
                host: {
                    emit,
                    readerText: pending.readerText,
                    ...(this.allowImportUrl === undefined ? {} : { allowImportUrl: this.allowImportUrl }),
                },
                settleAfterCommit: false,
            });
        } catch {
            // A call threw (a bug, or the batch was cancelled): its transaction rolled back.
            return {
                success: false,
                message: "",
                code: abort.signal.aborted && this.cancelled.has(abort) ? "AI_CANCELLED" : "AI_TOOL_THREW",
                params: { request: id },
            };
        } finally {
            this.running.delete(abort);
        }

        if (batch.held !== undefined) {
            // Another limit held the batch: the reader is asked again, about that one.
            const request = this.hold(batch.held, pending.message, pending.label, session);
            return {
                success: true,
                message: "",
                code: "AI_CONFIRMATION_NEEDED",
                params: { gate: batch.held.gate, request },
            };
        }

        const results = batch.results.filter((result) => result !== undefined);
        return batch.failure === undefined
            ? {
                  success: true,
                  message: "",
                  data: results.at(-1)?.data,
                  code: "AI_COMPLETED",
                  params: { request: id, toolCalls: results.length },
              }
            : {
                  success: false,
                  message: "",
                  code: batch.failure.code,
                  params: { ...batch.failure.params, request: id },
              };
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
     * A new conversation for one message: the instructions, the facts about the graph and the
     * reader's request.
     * @param input - User input
     * @param session - The session, for the facts.
     * @returns The conversation
     */
    private startConversation(input: string, session: GraphSession): Conversation {
        if (hasAssistantTools(this.commandRegistry)) {
            // The generated tools: fixed instructions, and the facts as graph data, never in them.
            const consumer = this.commandRegistry
                .getAll()
                .filter((command) => !isAssistantTool(command) && (command.load ?? "always") === "always");
            return {
                system: assistantInstructions(this.profile, consumer),
                messages: [
                    {
                        id: "m1",
                        role: "user",
                        parts: [
                            { type: "text", origin: "graph-data", text: factsBlock(session, this.profile) },
                            { type: "text", origin: "reader", text: input },
                        ],
                    },
                ],
            };
        }

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
