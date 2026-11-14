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

import type { AiEffect, AiResultCode, AiResultParams, AiTarget } from "../catalog/ai";
import type { AiEvent } from "../events";
import { GraphtyLogger, type Logger } from "../logging";
import type { GraphSession, HistoryStepId, TransactionScope } from "../session/types";
import type { AiStatusManager } from "./AiStatus";
import type { CommandRegistry } from "./commands";
import type { CommandContext, CommandResult, GraphCommand } from "./commands/types";
import type { ProviderState } from "./engine/types";
import { asRefusal, coded } from "./tools/families/common";
import { UNDO_TOOL } from "./tools/families/undo";
import { BOUND_SELECTION } from "./tools/fields";
import { suggest } from "./tools/search";
import { toJson } from "./tools/shape";
import { type AssistantTool, type CheckedCall, isAssistantTool } from "./tools/toolset";
import {
    type ActionResult,
    type AiToolCallFacts,
    type BoundSelection,
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

/** How much of one hand-written command's result is handed back to the model. */
const COMMAND_RESULT_CAP = 8000;

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
    /** What it did, while the message records effects. */
    readonly effects?: readonly AiEffect[];
    /** How long it ran in milliseconds, while the message records effects. */
    readonly durationMs?: number;
    /** The elements a write names (`ActionResult.target`). */
    readonly target?: AiTarget;
}

/** A batch held for the reader's approval. */
export interface HeldBatch {
    readonly gate: GateKind;
    readonly preview: JsonObject;
    readonly calls: readonly ToolCallRequest[];
    /** The message's running totals before the batch, restored for the run after the reader's decision. */
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
    /** A batch of hand-written commands: `runCommandBatch` runs it. */
    readonly commands?: boolean;
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
    batch.sink.status.addToolCall(request.name, request.arguments);
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
    const selected = settleBinding(batch);
    if (batch.commands === true) {
        return runCommandBatch(batch);
    }

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
            await reselect(batch, selected);
            return error.outcome;
        }

        throw error;
    }
}

/**
 * End a message's binding when its selection is empty as a batch starts: the reader or a committed
 * removal emptied it (`select` ends it as it runs). An approved batch stays bound: the reader
 * approved what its request named.
 * @param batch - The batch.
 * @returns What is selected while the message is bound.
 */
function settleBinding(batch: ToolBatch): BoundSelection | undefined {
    const { binding, approved } = batch.message;
    const { selection } = batch.session;
    if (binding !== undefined && approved === undefined && selection.size === 0) {
        binding.selection = undefined;
    }

    return binding?.selection === undefined ? undefined : { nodes: selection.nodes, edges: selection.edges };
}

/**
 * Select again what a rolled back batch's removal dropped: the nodes come back but the selection
 * does not follow them, and an empty one would end the binding of a message that changed nothing.
 * @param batch - The batch.
 * @param selected - What was selected as it started.
 */
async function reselect(batch: ToolBatch, selected: BoundSelection | undefined): Promise<void> {
    const { binding } = batch.message;
    const { selection } = batch.session;
    if (selected !== undefined && binding?.selection !== undefined && selection.size === 0) {
        await selection.apply(selected);
    }
}

/**
 * The facts a policy judges one call by.
 * @param call - The call.
 * @param webContent - The model acted from text read on the web.
 * @returns Its facts.
 */
function callFacts(call: PreparedCall, webContent?: boolean): AiToolCallFacts {
    return {
        command: call.command.name,
        ...(call.checked === undefined ? {} : { action: call.checked.action.name }),
        arguments: call.args,
        effect: call.checked?.action.effect ?? call.command.effect ?? "write",
        ...(webContent === true ? { webContent } : {}),
    };
}

/**
 * Refuse a whole batch for one call: none of it runs.
 * @param batch - The batch.
 * @param ready - Its calls.
 * @param at - The call refused.
 * @param extra - Facts beside the tool, such as why.
 * @returns The refused batch.
 */
function deniedBatch(
    batch: ToolBatch,
    ready: readonly PreparedCall[],
    at: number,
    extra: Readonly<Record<string, string>> = {},
): BatchOutcome {
    const params = { tool: ready[at].command.name, ...extra };
    const result = refused("AI_TOOL_DENIED_BY_POLICY", params, false);
    finished(batch, ready[at].request, result);
    // Not a failed write: the message's earlier writes stand.
    return {
        results: ready.map((_, index) => (index === at ? result : undefined)),
        failure: { code: "AI_TOOL_DENIED_BY_POLICY", params },
        writes: false,
    };
}

/**
 * The host's approval policy on a batch whose structure passed, before any call runs: any `deny`
 * refuses the whole batch, any `ask` holds it (gate `"policy"`). A policy that throws, or answers
 * anything but the three verdicts, refuses or asks: it fails closed. A read-only message (a helper
 * running beside others) refuses any call that does not only read first. While the conversation
 * holds text read on the web, a call that does not only read is refused, held (gate
 * `"web-content"`) or let through to the policy, as `webContentWrites` says.
 * @param batch - The batch.
 * @param ready - Its calls.
 * @param writes - Whether any call writes.
 * @returns The refused or held batch, or undefined when every call is allowed.
 */
function judge(batch: ToolBatch, ready: readonly PreparedCall[], writes: boolean): BatchOutcome | undefined {
    const { policy, approved, readOnly, webContent, webContentWrites = "refuse" } = batch.message;
    // Only a read: an exempt call (an undo, a selection, the view) changes what the others read.
    const notReadAt = ready.findIndex((call) => callFacts(call).effect !== "read");
    if (readOnly !== undefined && notReadAt !== -1) {
        return deniedBatch(batch, ready, notReadAt, { reason: readOnly });
    }

    // A web page may have written the call: it does not change the project on its own say-so.
    const fromWeb = webContent === true && notReadAt !== -1 ? webContentWrites : "allow";
    if (fromWeb === "refuse") {
        return deniedBatch(batch, ready, notReadAt, { reason: "web-content" });
    }

    const verdicts = ready.map((call) => {
        try {
            return policy === undefined ? "allow" : policy(callFacts(call, webContent));
        } catch {
            return "deny";
        }
    });
    const deniedAt = verdicts.indexOf("deny");
    if (deniedAt !== -1) {
        return deniedBatch(batch, ready, deniedAt);
    }

    // A batch the reader approved is not asked about again; a deny of its (edited) calls still stands.
    if (approved !== undefined) {
        return undefined;
    }

    if (fromWeb === "ask") {
        return held("web-content", {}, batch, ready, writes);
    }

    return verdicts.every((verdict) => verdict === "allow") ? undefined : held("policy", {}, batch, ready, writes);
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
        const waited = performance.now();
        const settled = await pending.settle(contextOf(batch));
        result = {
            ...resultOf(settled, call),
            ...(await evidenceOf(batch, call, settled)),
            ...(pending.durationMs === undefined
                ? {}
                : { durationMs: pending.durationMs + Math.round(performance.now() - waited) }),
        };
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
 * What a call did, while the message records it. A change that names no effect still says so.
 * @param batch - The batch.
 * @param call - The call.
 * @param outcome - What the action returned.
 * @returns The call result's `effects`, or nothing.
 */
async function evidenceOf(
    batch: ToolBatch,
    call: PreparedCall,
    outcome: ActionResult,
): Promise<Pick<CallResult, "effects">> {
    if (batch.message.evidence !== true) {
        return {};
    }

    const named = await outcome.effects?.();
    const { checked } = call;
    const reads = checked?.action.effect === "read";
    if (named !== undefined && (named.length > 0 || !reads)) {
        return { effects: named };
    }

    if (checked === undefined) {
        return {};
    }

    // A look-up that names nothing still says what it read; anything else still says it changed.
    const code = reads ? "AI_EFFECT_READ" : "AI_EFFECT_OTHER";
    return { effects: [{ code, params: { tool: checked.tool.name, action: checked.action.name } }] };
}

/**
 * The target one held batch names: the one call's, or its calls' together when they can be read as
 * one. Calls naming a rule and a list together name none.
 * @param targets - What each write named.
 * @returns The target, or undefined.
 */
function heldTarget(targets: readonly AiTarget[]): AiTarget | undefined {
    if (targets.length <= 1) {
        return targets[0];
    }

    const rules = targets.flatMap((target) => ("where" in target ? [target.where] : []));
    if (rules.length === targets.length) {
        return { where: rules.map((rule) => `(${rule})`).join(" || ") };
    }

    const ids = targets.flatMap((target) => ("ids" in target ? [...target.ids] : []));
    const listed = targets.every((target) => "ids" in target);
    return listed ? { ids } : undefined;
}

/**
 * Run one command call: its arguments are checked here, as it is reached.
 * @param batch - The batch.
 * @param request - The call.
 * @param tx - The transaction, handed to the command as `ctx.tx`.
 * @returns Its result; `AI_TOOL_UNKNOWN` or `AI_TOOL_INVALID_ARGUMENTS` when it never ran.
 */
async function runCommandCall(batch: ToolBatch, request: ToolCallRequest, tx: TransactionScope): Promise<CallResult> {
    const { name } = request;
    const command = batch.registry.get(name);
    if (command === undefined) {
        const message = `Unknown command: ${name}. Command not found in registry.`;
        return { success: false, message, code: "AI_TOOL_UNKNOWN", params: { tool: name }, writes: false };
    }

    const parsed = command.parameters.safeParse(request.arguments);
    if (!parsed.success || request.invalidArguments === true) {
        const reason = parsed.success ? "the arguments could not be read" : parsed.error.message;
        const message = `Invalid arguments for ${name}: ${reason}`;
        return { success: false, message, code: "AI_TOOL_INVALID_ARGUMENTS", params: { tool: name }, writes: false };
    }

    const args = parsed.data as Record<string, unknown>;
    return runCommand(batch, { request, command, args, writes: false }, tx);
}

/**
 * Report a command call's result: its data, else its message.
 * @param batch - The batch.
 * @param request - The call.
 * @param result - Its result.
 * @param shown - What the host is shown.
 */
function commandFinished(
    batch: ToolBatch,
    request: ToolCallRequest,
    result: CallResult,
    shown: Readonly<Record<string, unknown>>,
): void {
    batch.sink.status.updateToolCallStatus(request.name, result.success ? "complete" : "error", shown);
    batch.sink.emit({ type: "ai-stream-tool-result", name: request.name, result: shown, success: result.success });
}

/**
 * Run a batch of hand-written commands (`toolset: "commands"`) in order, each checked as it is
 * reached, stopping at the first that fails. What ran before a failure commits, and a batch is
 * never gated; only a command that throws rolls the batch and the message back.
 * @param batch - The calls and where they run.
 * @returns What the batch did.
 * @throws {BatchThrew} When a command threw.
 */
async function runCommandBatch(batch: ToolBatch): Promise<BatchOutcome> {
    const { abort, session } = batch;
    return session.transaction(
        batch.label,
        async (tx, signal) => {
            // The batch's abort (an undo while it runs) stops the model and every tool.
            signal.addEventListener(
                "abort",
                () => {
                    abort.abort(signal.reason);
                },
                { once: true },
            );
            const results: CallResult[] = [];
            for (const request of batch.calls) {
                // Cancelled, or undone while the message was going: no further tool runs.
                abort.signal.throwIfAborted();
                started(batch, request);
                const tool = request.name;
                let result: CallResult;
                try {
                    result = await runCommandCall(batch, request, tx);
                } catch (error) {
                    const text = error instanceof Error ? error.message : String(error);
                    const failure = { code: "AI_TOOL_THREW", params: { tool } } as const;
                    const message = `Error executing ${tool}: ${text}`;
                    const threw: CallResult = { success: false, message, ...failure, writes: false };
                    results.push(threw);
                    commandFinished(batch, request, threw, { error: text });
                    throw new BatchThrew({ results, failure, writes: false });
                }

                results.push(result);
                commandFinished(batch, request, result, (result.data ?? { message: result.message }) as JsonObject);
                if (!result.success) {
                    const { code } = result;
                    const never = code === "AI_TOOL_UNKNOWN" || code === "AI_TOOL_INVALID_ARGUMENTS";
                    const failure: Outcome = {
                        code: never ? code : "AI_TOOL_FAILED",
                        params: { tool, cause: code },
                    };
                    return { results, failure, writes: false, committed: true };
                }
            }

            return { results, writes: false };
        },
        { provenance: { via: "assistant", message: batch.message.id }, after: batch.after },
    );
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
    const targets: AiTarget[] = [];
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
        targets.push(...(result.target === undefined ? [] : [result.target]));
    }

    const { totals, approved } = batch.message;
    const large = largePreview(batch, tx, measured, affected, targets);
    if (large !== undefined) {
        throw new RollBack(held("large", large, batch, ready, writes));
    }

    // The count restarts at what the reader approved: a later batch is held only for what it does.
    if (approved !== undefined) {
        Object.assign(totals, { removeNodes: 0, removeEdges: 0, changedValues: 0 });
        return { results, writes };
    }

    totals.removeNodes += measured.removeNodes;
    totals.removeEdges += measured.removeEdges;
    totals.changedValues += measured.changedValues;
    return { results, writes };
}

/**
 * What the reader is shown when a batch, with what the message did since its last approved batch,
 * passes the gate's limits.
 * @param batch - The batch.
 * @param tx - The transaction.
 * @param measured - What its calls did.
 * @param measured.removeNodes - Nodes removed.
 * @param measured.removeEdges - Edges removed.
 * @param measured.changedValues - Values changed.
 * @param affected - The nodes they touched.
 * @param targets - The targets they named.
 * @returns The preview, or undefined within the limits.
 */
function largePreview(
    batch: ToolBatch,
    tx: TransactionScope,
    measured: { removeNodes: number; removeEdges: number; changedValues: number },
    affected: readonly string[],
    targets: readonly AiTarget[],
): JsonObject | undefined {
    const { gate, totals } = batch.message;
    if (gate === false || !gated(batch.message, "large")) {
        return undefined;
    }

    const removeNodes = totals.removeNodes + measured.removeNodes;
    const removeEdges = totals.removeEdges + measured.removeEdges;
    const changedValues = totals.changedValues + measured.changedValues;
    // The share is of the graph before the removals counted here: what is left plus what went.
    const large =
        removeNodes >= gate.removeNodes ||
        (removeNodes > 0 && removeNodes / (tx.status.counts.nodes + removeNodes) >= gate.removeNodesShare) ||
        removeEdges >= gate.removeEdges ||
        changedValues >= gate.changedValues;
    if (!large) {
        return undefined;
    }

    const target = batch.message.evidence === true ? heldTarget(targets) : undefined;
    return {
        removeNodes,
        removeEdges,
        changedValues,
        ids: affected.slice(0, 10).map((id) => ({ id, label: tx.data.name(id) ?? id })),
        ...(target === undefined ? {} : { target: target as JsonObject }),
    };
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
    const started = performance.now();
    const result = await runCall(batch, call, tx, last);
    return batch.message.evidence === true
        ? { ...result, durationMs: Math.round(performance.now() - started) }
        : result;
}

/**
 * Run one prepared call, untimed.
 * @param batch - The batch.
 * @param call - The call.
 * @param tx - Where it writes.
 * @param last - Whether it is the batch's last call.
 * @returns Its result.
 * @throws {GateHold} When the action held itself for approval.
 */
async function runCall(batch: ToolBatch, call: PreparedCall, tx: TransactionScope, last: boolean): Promise<CallResult> {
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
    const bound = batch.message.binding?.selection;
    const named = bound === undefined ? checked : { ...checked, args: { ...checked.args, [BOUND_SELECTION]: bound } };
    try {
        let outcome = await checked.tool.run(named, {
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

        return {
            ...resultOf(outcome, call),
            ...(await evidenceOf(batch, call, outcome)),
            ...(outcome.target === undefined ? {} : { target: outcome.target }),
        };
    } catch (error) {
        if (!(error instanceof ToolRefusal)) {
            throw error;
        }

        // A failed write leaves the message's earlier writes pending: fix and retry, or they go.
        return {
            ...refused(error.code, call.writes ? { ...error.params, rollback: "pending" } : error.params, call.writes),
            ...emptyEvidence(batch, checked, error),
        };
    }
}

/**
 * A call that matched nothing, as an effect: a write refused for it searched as a read does.
 * @param batch - The batch.
 * @param checked - The call.
 * @param refusal - Why it was refused.
 * @returns The call result's `effects`, or nothing.
 */
function emptyEvidence(
    batch: ToolBatch,
    checked: NonNullable<PreparedCall["checked"]>,
    refusal: ToolRefusal,
): Pick<CallResult, "effects"> {
    if (batch.message.evidence !== true || refusal.code !== "AI_EMPTY_MATCH") {
        return {};
    }

    const { where } = refusal.params;
    const searched = typeof where === "string" ? where : "";
    return { effects: [{ code: "AI_EFFECT_EMPTY", params: { tool: checked.tool.name, searched } }] };
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
 * What the model reads for one hand-written command's call: its success, message and data, as JSON.
 * @param result - The call's result, or undefined for one that did not run because an earlier one failed.
 * @returns The tool message's content.
 */
export function commandResultText(result: CallResult | undefined): string {
    if (result === undefined) {
        return JSON.stringify({ success: false, message: "Not run: an earlier tool call in this step failed." });
    }

    const content = JSON.stringify({ success: result.success, message: result.message, data: result.data });
    return content.length > COMMAND_RESULT_CAP ? `${content.slice(0, COMMAND_RESULT_CAP)}... (truncated)` : content;
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
