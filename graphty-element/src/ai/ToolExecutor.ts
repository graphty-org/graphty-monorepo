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
import { asRefusal, coded } from "./tools/families/common";
import { UNDO_TOOL } from "./tools/families/undo";
import { suggest } from "./tools/search";
import { toJson } from "./tools/shape";
import { type AssistantTool, type CheckedCall, isAssistantTool } from "./tools/toolset";
import {
    type ActionResult,
    gated,
    GateHold,
    type GateKind,
    type JsonObject,
    type Measure,
    type MessageState,
    type SettleContext,
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
    /** The rest of the call, awaited once its batch has committed (`ActionResult.settle`). */
    readonly settle?: NonNullable<ActionResult["settle"]>;
}

/** A batch held for the reader's approval. */
export interface HeldBatch {
    readonly gate: GateKind;
    readonly preview: JsonObject;
    readonly calls: readonly ToolCallRequest[];
    /** The message's running totals before the batch, which an approved run counts on from. */
    readonly totals: MessageState["totals"];
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
    /**
     * Its last call failed only after the batch had committed (a run that failed once started):
     * the calls before it stand, as the earlier batches of a failing message do.
     */
    readonly committed?: true;
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
            "AI_UNKNOWN_TOOL",
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
            // A check that throws anything but a refusal met arguments it could not read: the
            // call is invalid, and nothing of the message is taken back for it.
            return error instanceof ToolRefusal
                ? refused(error.code, error.params, writesFor(command, request))
                : refused("AI_TOOL_INVALID_ARGUMENTS", { tool: command.name }, writesFor(command, request));
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
 * Whether a refused call to a generated tool names a write action, false when even that cannot
 * be read.
 * @param command - The tool.
 * @param request - The call.
 * @returns True for a known write action.
 */
function writesFor(command: Pick<AssistantTool, "writesFor">, request: ToolCallRequest): boolean {
    try {
        return command.writesFor(request.arguments);
    } catch {
        return false;
    }
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
    const judged = judge(batch, ready, writes);
    if (judged !== undefined) {
        return judged;
    }

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

    // What the batch hands the host (an export, a capture) waits for the batch to commit and pass
    // the gate: a rolled-back or held batch hands over nothing, and an approved one hands it once.
    const outbox: AiEvent[] = [];
    const inner: ToolBatch = {
        ...batch,
        host: {
            ...batch.host,
            emit: (event) => {
                outbox.push(event);
            },
        },
    };
    // Set while the batch rolls itself back: that abort is the batch's own, not an undo of the message.
    let ownRollback = false;
    try {
        const outcome = await batch.session.transaction(
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
                    return await runInTransaction(inner, ready, tx, writes);
                } catch (error) {
                    ownRollback = error instanceof RollBack;
                    throw error;
                }
            },
            { provenance: { via: "assistant", message: batch.message.id }, after: batch.after },
        );
        const settled = await settleLast(inner, ready, outcome);
        for (const event of outbox) {
            batch.host.emit(event);
        }

        return settled;
    } catch (error) {
        if (error instanceof RollBack) {
            return error.outcome;
        }

        throw error;
    }
}

/**
 * The host's approval policy on a batch whose structure passed, before any call runs: any `deny`
 * refuses the whole batch, any `ask` holds it (gate `"policy"`). A policy that throws, or answers
 * anything but the three verdicts, refuses or asks: it fails closed.
 * @param batch - The batch.
 * @param ready - Its calls.
 * @param writes - Whether any call writes.
 * @returns The refused or held batch, or undefined when every call is allowed.
 */
function judge(batch: ToolBatch, ready: readonly PreparedCall[], writes: boolean): BatchOutcome | undefined {
    const { policy, approved } = batch.message;
    if (policy === undefined) {
        return undefined;
    }

    const verdicts = ready.map((call) => {
        try {
            return policy({
                command: call.command.name,
                ...(call.checked === undefined ? {} : { action: call.checked.action.name }),
                arguments: call.args,
                effect: call.checked?.action.effect ?? call.command.effect ?? "write",
            });
        } catch {
            return "deny";
        }
    });
    const deniedAt = verdicts.indexOf("deny");
    if (deniedAt !== -1) {
        const tool = ready[deniedAt].command.name;
        const result = refused("AI_TOOL_DENIED_BY_POLICY", { tool }, false);
        finished(batch, ready[deniedAt].request, result);
        // Not a failed write: the message's earlier writes stand.
        return {
            results: ready.map((_, index) => (index === deniedAt ? result : undefined)),
            failure: { code: "AI_TOOL_DENIED_BY_POLICY", params: { tool } },
            writes: false,
        };
    }

    // A batch the reader approved is not asked about again; a deny of its (edited) calls still stands.
    return approved !== undefined || verdicts.every((verdict) => verdict === "allow")
        ? undefined
        : held("policy", {}, batch, ready, writes);
}

/**
 * Finish the batch's last call once the batch has committed, when it left a wait for then: a run
 * still going, a recording. Its failure fails the batch with the calls before it standing.
 * @param batch - The batch.
 * @param ready - Its calls.
 * @param outcome - What the transaction committed.
 * @returns The batch's outcome, its last result settled.
 * @throws {BatchThrew} When the wait threw: the message is taken back.
 */
async function settleLast(
    batch: ToolBatch,
    ready: readonly PreparedCall[],
    outcome: BatchOutcome,
): Promise<BatchOutcome> {
    const pending = outcome.results.at(-1);
    if (pending?.settle === undefined) {
        return outcome;
    }

    const call = ready.at(-1) as PreparedCall;
    const results = outcome.results.slice(0, -1);
    let result: CallResult;
    try {
        result = resultOf(await pending.settle(contextOf(batch)), call);
    } catch (error) {
        const refusal = asRefusal(error);
        if (!(refusal instanceof ToolRefusal)) {
            const threw = refused("AI_TOOL_THREW", { tool: call.command.name }, call.writes);
            finished(batch, call.request, threw);
            throw new BatchThrew({
                results: [...results, threw],
                failure: { code: "AI_TOOL_THREW", params: { tool: call.command.name } },
                writes: outcome.writes,
            });
        }

        result = refused(
            refusal.code,
            call.writes ? { ...refusal.params, rollback: "pending" } : refusal.params,
            call.writes,
        );
    }

    finished(batch, call.request, result);
    return result.success
        ? { ...outcome, results: [...results, result] }
        : {
              ...outcome,
              results: [...results, result],
              failure: failureOf(result, call.command.name),
              committed: true,
          };
}

/**
 * What a settling call reads.
 * @param batch - The batch.
 * @returns The context.
 */
function contextOf(batch: ToolBatch): SettleContext {
    return { session: batch.session, signal: batch.abort.signal, host: batch.host };
}

/**
 * An action's result as its call's result.
 * @param outcome - What the action returned.
 * @param call - The call.
 * @returns The result.
 */
function resultOf(outcome: ActionResult, call: PreparedCall): CallResult {
    return {
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
            result = await runOne(batch, call, tx, index === ready.length - 1);
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
    if (gate !== false && gated(batch.message, "large")) {
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
    return {
        results: out,
        held: { gate, preview, calls: ready.map((call) => call.request), totals: { ...batch.message.totals } },
        writes,
    };
}

/**
 * The outcome a failed call gives the batch.
 * @param result - The call's result.
 * @param tool - Its tool.
 * @returns The outcome.
 */
function failureOf(result: CallResult, tool: string): Outcome {
    const params = { tool, cause: result.code };
    // The model's unknown tool (a cause) is the message's unknown tool (a result).
    if (result.code === "AI_UNKNOWN_TOOL") {
        return { code: "AI_TOOL_UNKNOWN", params };
    }

    if (result.code === "AI_TOOL_INVALID_ARGUMENTS" || result.code === "AI_TOOL_THREW") {
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
 * @param last - Whether it is the batch's last call, whose wait (`settle`) is left for after the commit.
 * @returns Its result.
 * @throws {GateHold} When the action held itself for approval.
 */
async function runOne(batch: ToolBatch, call: PreparedCall, tx: TransactionScope, last = false): Promise<CallResult> {
    logger.debug("Executing command", { name: call.command.name });
    started(batch, call.request);
    const result =
        call.checked === undefined
            ? await runCommand(batch, call, tx)
            : await runChecked(batch, call, call.checked, tx, last);
    if (result.settle === undefined) {
        finished(batch, call.request, result);
    }

    return result;
}

/**
 * Run a generated tool's action.
 * @param batch - The batch.
 * @param call - The call.
 * @param checked - Its checked arguments.
 * @param tx - Where it writes.
 * @param last - Whether it is the batch's last call.
 * @returns Its result; one left to settle after the commit carries `settle`.
 * @throws {GateHold} When the action held itself for approval.
 */
async function runChecked(
    batch: ToolBatch,
    call: PreparedCall,
    checked: NonNullable<PreparedCall["checked"]>,
    tx: TransactionScope,
    last: boolean,
): Promise<CallResult> {
    const { graph, abort, session } = batch;
    try {
        let outcome = await checked.tool.run(checked, {
            tx,
            session,
            graph,
            signal: abort.signal,
            message: batch.message,
            host: batch.host,
        });
        if (outcome.settle !== undefined && last && tx !== session) {
            // Left for after the commit: reported once it has settled.
            return { ...resultOf(outcome, call), settle: outcome.settle };
        }

        if (outcome.settle !== undefined) {
            const { settle } = outcome;
            outcome = await coded(() => settle(contextOf(batch)));
        }

        return resultOf(outcome, call);
    } catch (error) {
        if (!(error instanceof ToolRefusal)) {
            throw error;
        }

        // A failed write leaves the message's earlier writes pending: fix and retry, or they go.
        return refused(error.code, call.writes ? { ...error.params, rollback: "pending" } : error.params, call.writes);
    }
}

/**
 * Run a consumer's own command.
 * @param batch - The batch.
 * @param call - The call.
 * @param tx - Where it writes.
 * @returns Its result.
 */
async function runCommand(batch: ToolBatch, call: PreparedCall, tx: TransactionScope): Promise<CallResult> {
    const { graph, sink, abort } = batch;
    const { command } = call;
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
    return {
        ...own,
        code: own.code ?? (own.success ? "AI_OK" : "AI_TOOL_FAILED"),
        params: own.params ?? (own.message === "" ? {} : { message: own.message }),
        writes: call.writes,
    };
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
