/**
 * @file Runs one batch of the model's tool calls, all or nothing:
 *
 * 1. every call's structure is checked before any runs -- the tool and action exist, the
 *    arguments pass the action's own schema -- and a failure runs none of the batch;
 * 2. the calls run in order inside one short transaction that joins the message's undo step, so
 *    each sees what the ones before it did;
 * 3. what the batch did is measured, and a batch past the gate's limits (or one an action held
 *    itself: slow, replacing, irreversible, a URL the reader did not give) is rolled back and held
 *    for the reader's approval, which belongs to the host and never to the model;
 * 4. any call failing rolls the whole batch back.
 *
 * An `undo` call runs alone, outside a transaction (an undo inside one would cancel the batch
 * itself). The executor keeps no state of its own, so several conversations can run batches at once.
 */

import type { AiResultCode, AiResultParams } from "../catalog/ai";
import type { AiEvent } from "../events";
import { GraphtyLogger, type Logger } from "../logging";
import type { GraphSession, HistoryStepId, TransactionScope } from "../session/types";
import type { AiStatusManager } from "./AiStatus";
import type { CommandRegistry } from "./commands";
import type { CommandContext, CommandResult, GraphCommand } from "./commands/types";
import type { ProviderState } from "./engine/types";
import { UNDO_TOOL } from "./tools/families/undo";
import { suggest } from "./tools/search";
import { toJson } from "./tools/shape";
import { type CheckedCall, isAssistantTool } from "./tools/toolset";
import {
    type ActionResult,
    GateHold,
    type GateKind,
    type JsonObject,
    type Measure,
    type MessageState,
    type ToolHost,
    ToolRefusal,
} from "./tools/types";

const logger: Logger = GraphtyLogger.getLogger(["graphty", "ai"]);

/** One call the model asked for. */
export interface ToolCallRequest {
    readonly id: string;
    readonly name: string;
    readonly arguments: Readonly<Record<string, unknown>>;
    /** The model's argument text did not parse: the call is refused as invalid, never run with `arguments`. */
    readonly invalidArguments?: true;
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

/** One call's result: the command's, with what the model reads and what the gate counts. */
export interface CallResult extends CommandResult {
    /** The code the model reads: the session's own, `AI_OK`, or a cause. */
    readonly code: string;
    readonly params: Readonly<Record<string, unknown>>;
    readonly page?: ActionResult["page"];
    readonly measure?: Measure;
    /** On-demand tools the result names. */
    readonly load?: readonly string[];
    /** Whether the call changes the project (a write), so its failure counts for the message. */
    readonly writes: boolean;
}

/** A batch held for the reader's approval. */
export interface HeldBatch {
    readonly gate: GateKind;
    readonly preview: JsonObject;
    readonly calls: readonly ToolCallRequest[];
}

/** What one batch did. */
export interface BatchOutcome {
    /** The result of each call, in order; undefined for a call that did not run. */
    readonly results: readonly (CallResult | undefined)[];
    /** Why the batch failed, when it did: it was rolled back. */
    readonly failure?: Outcome;
    /** The batch was rolled back and held for approval. */
    readonly held?: HeldBatch;
    /** Whether any of its calls writes. */
    readonly writes: boolean;
}

/**
 * A command threw (a bug, not a refusal), so its transaction rolled back and the message is to be
 * taken back. Carries what the batch's calls did.
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

/** Thrown inside the transaction to roll a failed or held batch back. */
class RollBack extends Error {
    /**
     * A rollback.
     * @param outcome - What the batch did.
     */
    constructor(readonly outcome: BatchOutcome) {
        super("rolled back");
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
    /** The message's state: its id, the gate, its totals. */
    readonly message: MessageState;
    /** The step the message recorded last, which this batch continues. */
    readonly after: HistoryStepId | undefined;
    /** The message's controller: an abort of the batch (an undo while it runs) stops the message too. */
    readonly abort: AbortController;
    readonly sink: ConversationSink;
    readonly host: ToolHost;
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

/** A call whose structure passed, ready to run. */
interface PreparedCall {
    readonly request: ToolCallRequest;
    readonly command: GraphCommand;
    /** A generated tool's checked call; absent for a consumer command. */
    readonly checked?: CheckedCall;
    readonly args: Record<string, unknown>;
    readonly writes: boolean;
}

/**
 * A refusal as a call's failed result.
 * @param code - The cause.
 * @param params - Its facts.
 * @param writes - Whether the call writes.
 * @returns The result.
 */
function refused(code: string, params: Readonly<Record<string, unknown>>, writes: boolean): CallResult {
    return { success: false, message: "", code, params, writes };
}

/**
 * Check one call's structure, running nothing.
 * @param batch - The batch.
 * @param request - The call.
 * @returns The prepared call, or its refusal.
 */
function prepare(batch: ToolBatch, request: ToolCallRequest): PreparedCall | CallResult {
    const command = batch.registry.get(request.name);
    if (command === undefined) {
        return refused(
            "AI_TOOL_UNKNOWN",
            { tool: request.name, didYouMean: suggest(request.name, batch.registry.getNames()) },
            false,
        );
    }

    if (request.invalidArguments) {
        return refused("AI_TOOL_INVALID_ARGUMENTS", { tool: command.name }, command.effect !== "read");
    }

    if (isAssistantTool(command)) {
        try {
            const checked = command.check(request.arguments);
            // `call` hands back the call it stands for; that tool's own action runs.
            return {
                request,
                command: checked.tool,
                checked,
                args: checked.args,
                writes: checked.action.effect === "write",
            };
        } catch (error) {
            if (error instanceof ToolRefusal) {
                return refused(error.code, error.params, true);
            }

            throw error;
        }
    }

    const parsed = command.parameters.safeParse(request.arguments);
    if (!parsed.success) {
        const issue = parsed.error.issues[0];
        return refused(
            "AI_ARG_INVALID",
            { tool: command.name, path: issue.path.join("."), expected: issue.code },
            true,
        );
    }

    return {
        request,
        command,
        args: parsed.data as Record<string, unknown>,
        writes: (command.effect ?? "write") === "write",
    };
}

/**
 * Report a call starting.
 * @param batch - The batch.
 * @param request - The call.
 */
function started(batch: ToolBatch, request: ToolCallRequest): void {
    batch.sink.status.addToolCall(request.name);
    batch.sink.status.updateToolCallStatus(request.name, "executing");
    batch.sink.emit({ type: "ai-stream-tool-call", name: request.name, params: request.arguments });
}

/**
 * Report a call's result.
 * @param batch - The batch.
 * @param request - The call.
 * @param result - Its result.
 */
function finished(batch: ToolBatch, request: ToolCallRequest, result: CallResult): void {
    const shown = result.data ?? { code: result.code, params: result.params };
    batch.sink.status.updateToolCallStatus(request.name, result.success ? "complete" : "error", shown);
    batch.sink.emit({ type: "ai-stream-tool-result", name: request.name, result: shown, success: result.success });
}

/**
 * Runs a batch: structure first, then the calls in one transaction, measured and gated.
 * @param batch - The calls and where they run.
 * @returns What the batch did; a failed or held batch is rolled back.
 * @throws {BatchThrew} When a command threw; the batch's transaction is rolled back.
 */
export async function runToolBatch(batch: ToolBatch): Promise<BatchOutcome> {
    const { calls } = batch;
    const prepared = calls.map((request) => prepare(batch, request));
    const writes = prepared.some((call) => ("writes" in call ? call.writes : false));
    const refusedAt = prepared.findIndex((call) => !("request" in call));
    if (refusedAt !== -1) {
        // Structure failed: none of the batch runs.
        const result = prepared[refusedAt] as CallResult;
        const results = prepared.map((_, index) => (index === refusedAt ? result : undefined));
        finished(batch, calls[refusedAt], result);
        return { results, failure: failureOf(result, calls[refusedAt].name), writes };
    }

    const ready = prepared as PreparedCall[];
    const undoAt = ready.findIndex((call) => call.command.name === UNDO_TOOL && call.checked !== undefined);
    if (undoAt !== -1) {
        if (ready.length > 1) {
            const result = refused("AI_UNDO_NOT_ALONE", { calls: ready.length }, false);
            finished(batch, calls[undoAt], result);
            return {
                results: ready.map((_, index) => (index === undoAt ? result : undefined)),
                failure: failureOf(result, UNDO_TOOL),
                writes,
            };
        }

        // An undo runs with no transaction open: one would cancel the batch itself.
        const result = await runOne(batch, ready[0], batch.session);
        return {
            results: [result],
            ...(result.success ? {} : { failure: failureOf(result, UNDO_TOOL) }),
            writes: false,
        };
    }

    // Set while the batch rolls itself back: that abort is the batch's own, not an undo of the message.
    let ownRollback = false;
    try {
        return await batch.session.transaction(
            batch.label,
            async (tx, signal) => {
                // The batch's abort (an undo while it runs) stops the model and every tool.
                signal.addEventListener(
                    "abort",
                    () => {
                        if (!ownRollback) {
                            batch.abort.abort(signal.reason);
                        }
                    },
                    { once: true },
                );
                try {
                    return await runInTransaction(batch, ready, tx, writes);
                } catch (error) {
                    ownRollback = error instanceof RollBack;
                    throw error;
                }
            },
            { provenance: { via: "assistant", message: batch.message.id }, after: batch.after },
        );
    } catch (error) {
        if (error instanceof RollBack) {
            return error.outcome;
        }

        throw error;
    }
}

/**
 * Run the calls in order in the batch's transaction; roll back on a failure or a hold.
 * @param batch - The batch.
 * @param ready - The calls.
 * @param tx - The transaction.
 * @param writes - Whether any call writes.
 * @returns What the batch did, when it committed.
 */
async function runInTransaction(
    batch: ToolBatch,
    ready: readonly PreparedCall[],
    tx: TransactionScope,
    writes: boolean,
): Promise<BatchOutcome> {
    const results: (CallResult | undefined)[] = ready.map(() => undefined);
    const measured = { removeNodes: 0, removeEdges: 0, changedValues: 0 };
    const affected: string[] = [];
    for (const [index, call] of ready.entries()) {
        // Cancelled, or undone while the message was going: no further tool runs.
        batch.abort.signal.throwIfAborted();
        let result: CallResult;
        try {
            result = await runOne(batch, call, tx);
        } catch (error) {
            if (error instanceof GateHold) {
                throw new RollBack(held(error.gate, error.preview, batch, ready, writes));
            }

            results[index] = refused("AI_TOOL_THREW", { tool: call.command.name }, call.writes);
            finished(batch, call.request, results[index]);
            throw new BatchThrew({
                results,
                failure: { code: "AI_TOOL_THREW", params: { tool: call.command.name } },
                writes,
            });
        }

        results[index] = result;
        if (!result.success) {
            throw new RollBack({ results, failure: failureOf(result, call.command.name), writes });
        }

        measured.removeNodes += result.measure?.removeNodes ?? 0;
        measured.removeEdges += result.measure?.removeEdges ?? 0;
        measured.changedValues += result.measure?.changedValues ?? 0;
        affected.push(...(result.affectedNodes ?? []));
    }

    const { gate, totals } = batch.message;
    if (gate !== false) {
        const removeNodes = totals.removeNodes + measured.removeNodes;
        // The share is of the graph before the message removed anything: what is left plus what went.
        const large =
            removeNodes >= gate.removeNodes ||
            (removeNodes > 0 && removeNodes / (tx.status.counts.nodes + removeNodes) >= gate.removeNodesShare) ||
            totals.removeEdges + measured.removeEdges >= gate.removeEdges ||
            totals.changedValues + measured.changedValues >= gate.changedValues;
        if (large) {
            throw new RollBack(
                held(
                    "large",
                    {
                        removeNodes,
                        removeEdges: totals.removeEdges + measured.removeEdges,
                        changedValues: totals.changedValues + measured.changedValues,
                        ids: affected.slice(0, 10).map((id) => ({ id, label: tx.data.name(id) ?? id })),
                    },
                    batch,
                    ready,
                    writes,
                ),
            );
        }
    }

    totals.removeNodes += measured.removeNodes;
    totals.removeEdges += measured.removeEdges;
    totals.changedValues += measured.changedValues;
    return { results, writes };
}

/**
 * A held batch's outcome: every call reports the hold.
 * @param gate - Why.
 * @param preview - What the reader is shown.
 * @param batch - The batch.
 * @param ready - Its calls.
 * @param writes - Whether any call writes.
 * @returns The outcome.
 */
function held(
    gate: GateKind,
    preview: JsonObject,
    batch: ToolBatch,
    ready: readonly PreparedCall[],
    writes: boolean,
): BatchOutcome {
    const confirm = refused("AI_CONFIRM_REQUIRED", { gate, ...preview }, true);
    const out = ready.map((call) => {
        finished(batch, call.request, confirm);
        return confirm;
    });
    return { results: out, held: { gate, preview, calls: ready.map((call) => call.request) }, writes };
}

/**
 * The outcome a failed call gives the batch.
 * @param result - The call's result.
 * @param tool - Its tool.
 * @returns The outcome.
 */
function failureOf(result: CallResult, tool: string): Outcome {
    const params = { tool, cause: result.code };
    if (
        result.code === "AI_TOOL_UNKNOWN" ||
        result.code === "AI_TOOL_INVALID_ARGUMENTS" ||
        result.code === "AI_TOOL_THREW"
    ) {
        return { code: result.code, params };
    }

    const invalid = result.code === "AI_ARG_INVALID" || result.code === "AI_UNKNOWN_ACTION";
    return { code: invalid ? "AI_TOOL_INVALID_ARGUMENTS" : "AI_TOOL_FAILED", params };
}

/**
 * Run one prepared call.
 * @param batch - The batch.
 * @param call - The call.
 * @param tx - Where it writes: the transaction, or the session for an undo.
 * @returns Its result.
 * @throws {GateHold} When the action held itself for approval.
 */
async function runOne(batch: ToolBatch, call: PreparedCall, tx: TransactionScope): Promise<CallResult> {
    const { graph, sink, abort, session } = batch;
    const { request, command } = call;
    logger.debug("Executing command", { name: command.name });
    started(batch, request);
    let result: CallResult;
    if (call.checked !== undefined) {
        try {
            const outcome = await call.checked.tool.run(call.checked, {
                tx,
                session,
                graph,
                signal: abort.signal,
                message: batch.message,
                host: batch.host,
            });
            result = {
                success: true,
                message: "",
                code: outcome.code ?? "AI_OK",
                params: outcome.params ?? {},
                data: outcome.data,
                writes: call.writes,
                ...(outcome.page === undefined ? {} : { page: outcome.page }),
                ...(outcome.measure === undefined ? {} : { measure: outcome.measure }),
                ...(outcome.load === undefined ? {} : { load: outcome.load }),
                ...(outcome.affectedNodes === undefined ? {} : { affectedNodes: [...outcome.affectedNodes] }),
            };
        } catch (error) {
            if (!(error instanceof ToolRefusal)) {
                throw error;
            }

            // A failed write leaves the message's earlier writes pending: fix and retry, or they go.
            result = refused(
                error.code,
                call.writes ? { ...error.params, rollback: "pending" } : error.params,
                call.writes,
            );
        }
    } else {
        const context: CommandContext = {
            graph,
            tx,
            abortSignal: abort.signal,
            emitEvent: (type: string) => {
                // Commands emit plain type/data events; they are logged, not forwarded.
                logger.debug("Command emitted event", { name: command.name, type });
            },
            updateStatus: (updates) => {
                if (updates.stageMessage) {
                    sink.status.setStage("executing", updates.stageMessage);
                }
            },
        };
        const own = await command.execute(graph, call.args, context);
        // A consumer command with no code keeps showing the model its message.
        result = {
            ...own,
            code: own.code ?? (own.success ? "AI_OK" : "AI_TOOL_FAILED"),
            params: own.params ?? (own.message === "" ? {} : { message: own.message }),
            writes: call.writes,
        };
    }

    finished(batch, request, result);
    return result;
}

/**
 * What the model reads for one call: `{ code, params, data, page }`, compact.
 * @param result - The call's result, or undefined for one that did not run.
 * @param tool - The call's tool.
 * @returns The JSON value.
 */
export function modelView(result: CallResult | undefined, tool: string): ActionResult & { code: string } {
    if (result === undefined) {
        return { code: "AI_TOOL_NOT_RUN", params: { tool } };
    }

    return {
        code: result.code,
        params: toJson(result.params) as JsonObject,
        ...(result.data === undefined ? {} : { data: toJson(result.data) }),
        ...(result.page === undefined ? {} : { page: result.page }),
    };
}
