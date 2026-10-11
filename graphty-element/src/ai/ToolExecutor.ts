/**
 * @file Runs one batch of the model's tool calls: validates each call's arguments, runs the
 * commands in order inside one short transaction that joins the message's undo step, and reports
 * each call's outcome as a code. It keeps no state, so several conversations can run batches at
 * once. Asking the reader before a call runs, and refusing one, arrive with approvals, together
 * with their result codes.
 */

import type { AiResultCode, AiResultParams } from "../catalog/ai";
import type { AiEvent } from "../events";
import { GraphtyLogger, type Logger } from "../logging";
import type { GraphSession, HistoryStepId, TransactionScope } from "../session/types";
import type { AiStatusManager } from "./AiStatus";
import type { CommandRegistry } from "./commands";
import type { CommandContext, CommandResult } from "./commands/types";
import type { ProviderState } from "./engine/types";

const logger: Logger = GraphtyLogger.getLogger(["graphty", "ai"]);

/** One call the model asked for. */
export interface ToolCallRequest {
    readonly id: string;
    readonly name: string;
    readonly arguments: Readonly<Record<string, unknown>>;
    /** The engine's opaque round-trip data for this call, kept with it in the conversation. */
    readonly providerState?: ProviderState;
}

/** Where a conversation reports what it does: its events and the status a reader sees. */
export interface ConversationSink {
    emit(event: AiEvent): void;
    readonly status: AiStatusManager;
}

/** A result's code and its facts. */
export interface Outcome {
    readonly code: AiResultCode;
    readonly params: AiResultParams;
}

/** What one batch did. */
export interface BatchOutcome {
    /** The result of each call that ran, in order. A call after a failed one does not run. */
    readonly results: readonly CommandResult[];
    /** Why the call that failed failed, when one did. */
    readonly failure?: Outcome;
}

/**
 * A command threw inside the batch, so its transaction rolled back. Carries what the batch's
 * calls did before and including the one that threw.
 */
export class BatchThrew extends Error {
    /**
     * The batch threw.
     * @param outcome - What the batch's calls did.
     */
    constructor(readonly outcome: BatchOutcome) {
        super("A tool threw.");
    }
}

/** Everything a batch needs. */
export interface ToolBatch {
    readonly calls: readonly ToolCallRequest[];
    readonly registry: CommandRegistry;
    readonly graph: CommandContext["graph"];
    readonly session: GraphSession;
    /** The transaction's label: the reader's request. */
    readonly label: string;
    /** The message's id, stamped on its steps' provenance. */
    readonly message: string;
    /** The step the message recorded last, which this batch continues. */
    readonly after: HistoryStepId | undefined;
    /** The message's controller: an abort of the batch (an undo while it runs) stops the message too. */
    readonly abort: AbortController;
    readonly sink: ConversationSink;
}

/**
 * A tool name safe to log: a registered command's name, never a name the model made up, which is
 * model output and may carry anything.
 * @param registry - The commands.
 * @param name - The name the model called.
 * @returns The name when a command is registered under it, otherwise "(unknown)".
 */
export function knownToolName(registry: CommandRegistry, name: string): string {
    return registry.get(name) ? name : "(unknown)";
}

/**
 * Runs a batch in one transaction.
 * @param batch - The calls and where they run.
 * @returns What the batch did.
 * @throws {BatchThrew} When a command threw; the batch's transaction is rolled back.
 */
export async function runToolBatch(batch: ToolBatch): Promise<BatchOutcome> {
    const { session, label, message, after, abort } = batch;
    return session.transaction(
        label,
        async (tx, signal) => {
            // The batch's abort (an undo while it runs) stops the model and every tool.
            signal.addEventListener(
                "abort",
                () => {
                    abort.abort(signal.reason);
                },
                { once: true },
            );
            const { outcome, threw } = await runCalls(batch, tx);
            if (threw) {
                // Thrown inside the batch, so its own transaction rolls back.
                throw new BatchThrew(outcome);
            }

            return outcome;
        },
        { provenance: { via: "assistant", message }, after },
    );
}

/**
 * Run the calls in order, stopping at the first that fails.
 * @param batch - The calls.
 * @param tx - The batch's transaction.
 * @returns What ran, and whether a command threw.
 */
async function runCalls(batch: ToolBatch, tx: TransactionScope): Promise<{ outcome: BatchOutcome; threw: boolean }> {
    const { calls, sink, abort } = batch;
    const results: CommandResult[] = [];
    for (const call of calls) {
        // Cancelled, or undone while the message was going: no further tool runs.
        abort.signal.throwIfAborted();

        sink.status.addToolCall(call.name);
        sink.status.updateToolCallStatus(call.name, "executing");
        sink.emit({ type: "ai-stream-tool-call", name: call.name, params: call.arguments });

        try {
            const { result, code } = await runCall(batch, call, tx);
            results.push(result);
            sink.status.updateToolCallStatus(
                call.name,
                result.success ? "complete" : "error",
                result.data ?? { message: result.message },
            );
            sink.emit({
                type: "ai-stream-tool-result",
                name: call.name,
                result: result.data ?? { message: result.message },
                success: result.success,
            });

            // If any command fails, stop executing remaining
            if (!result.success) {
                return {
                    outcome: { results, failure: { code: code ?? "AI_TOOL_FAILED", params: { tool: call.name } } },
                    threw: false,
                };
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            results.push({ success: false, message: `Error executing ${call.name}: ${errorMessage}` });
            sink.status.updateToolCallStatus(call.name, "error", { error: errorMessage });
            sink.emit({
                type: "ai-stream-tool-result",
                name: call.name,
                result: { error: errorMessage },
                success: false,
            });
            return {
                outcome: { results, failure: { code: "AI_TOOL_THREW", params: { tool: call.name } } },
                threw: true,
            };
        }
    }

    return { outcome: { results }, threw: false };
}

/**
 * Run one call: find the command, validate and transform its arguments through its schema
 * (colour names to hex, defaults filled in), and run it.
 * @param batch - The batch it is in.
 * @param call - The call.
 * @param tx - The batch's transaction, handed to the command as `ctx.tx`.
 * @returns The command's result, and the code of a call that never reached the command.
 */
async function runCall(
    batch: ToolBatch,
    call: ToolCallRequest,
    tx: TransactionScope,
): Promise<{ result: CommandResult; code?: AiResultCode }> {
    const { registry, graph, sink, abort } = batch;
    logger.debug("Executing command", { name: knownToolName(registry, call.name) });

    const command = registry.get(call.name);
    if (!command) {
        logger.debug("Command result: FAILED - Unknown command", { nameLength: call.name.length });
        return {
            result: { success: false, message: `Unknown command: ${call.name}. Command not found in registry.` },
            code: "AI_TOOL_UNKNOWN",
        };
    }

    let validatedArguments: Record<string, unknown>;
    try {
        validatedArguments = command.parameters.parse(call.arguments) as Record<string, unknown>;
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
            result: { success: false, message: `Invalid arguments for ${call.name}: ${errorMessage}` },
            code: "AI_TOOL_INVALID_ARGUMENTS",
        };
    }

    const context: CommandContext = {
        graph,
        tx,
        abortSignal: abort.signal,
        emitEvent: (type: string, _data: unknown) => {
            // Commands emit plain type/data events; they are logged, not forwarded.
            logger.debug("Command emitted event", { name: command.name, type });
        },
        updateStatus: (updates) => {
            if (updates.stageMessage) {
                sink.status.setStage("executing", updates.stageMessage);
            }
        },
    };

    const result = await command.execute(graph, validatedArguments, context);
    logger.debug("Command result", {
        name: command.name,
        success: result.success,
        messageLength: result.message.length,
        hasData: result.data !== undefined,
    });

    return { result };
}
