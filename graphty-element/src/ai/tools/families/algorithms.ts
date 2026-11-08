/**
 * @file `run_algorithm` and `results`: one tool runs any catalog algorithm, built-in or
 * registered, with options checked against the entry's own descriptor; the other reads, reruns,
 * cancels and removes the runs that exist.
 */

import { z } from "zod";

import type { AiEffect, AiTarget } from "../../../catalog/ai";
import { algorithmKeyOf } from "../../../catalog/algorithms";
import type { LayerId, Scope } from "../../../catalog/types";
import type { Run } from "../../../session/runs/types";
import type { GraphSession, TransactionScope } from "../../../session/types";
import { foundEffects, selectionEffects } from "../effects";
import { requireTarget, resolveRun, scopeOf, text, WHERE_HELP, whereField } from "../fields";
import { checkOptions } from "../optionSchema";
import { suggest } from "../search";
import { limitOf, offsetOf, pageOf, paintedFact, summarizeRun, toJson } from "../shape";
import {
    type ActionContext,
    type ActionResult,
    type ActionSpec,
    type CatalogView,
    gated,
    GateHold,
    type JsonObject,
    type ToolDefinition,
    ToolRefusal,
} from "../types";
import { coded, codedNow, nameField, ok } from "./common";

/**
 * A registered algorithm class with no descriptor, which runs through the legacy op by its address.
 * @param name - `namespace:type`.
 * @param legacy - The addresses of such classes.
 * @returns The namespace and type, or undefined.
 */
function legacyPlugin(name: string, legacy: readonly string[]): { namespace: string; type: string } | undefined {
    const [namespace, type] = name.split(":");
    if (type === undefined || !legacy.includes(name)) {
        return undefined;
    }

    return { namespace, type };
}

/**
 * Wait for a run the assistant started, cancelling it when the message is cancelled or undone: the
 * batch's transaction stays open while it waits, so a run left going would hold the message up.
 * @param run - The run.
 * @param signal - The message's signal.
 * @returns Once the run has finished.
 * @throws The signal's reason once it fires; the run's own error as a coded refusal.
 */
export async function awaitRun(run: Run, signal: AbortSignal): Promise<void> {
    let stop = (): void => undefined;
    const aborted = new Promise<never>((_, reject) => {
        const onAbort = (): void => {
            run.cancel("assistant");
            reject(signal.reason as Error);
        };
        if (signal.aborted) {
            onAbort();
            return;
        }

        signal.addEventListener("abort", onAbort, { once: true });
        stop = () => {
            signal.removeEventListener("abort", onAbort);
        };
    });
    try {
        await Promise.race([
            coded(async () => {
                await run;
            }),
            aborted,
        ]);
    } finally {
        stop();
    }
}

/**
 * A finished run as an effect. A run with no number to range over (a path) names no elements; a
 * run that ranks its elements also names its leader as found.
 * @param session - The session.
 * @param run - The run.
 * @param painted - What it painted, when the call knows better than the run's first decision.
 * @param painted.painted - How many suggestions; absent for none.
 * @returns The effect.
 */
export async function runEffects(
    session: GraphSession,
    run: Run,
    painted: { painted?: number } = paintedFact(session, run),
): Promise<AiEffect[]> {
    const summary = run.result?.summary();
    // A run that groups its elements says how many groups and how big the largest is.
    const largest = summary?.groups?.reduce((most, group) => Math.max(most, group.size), 0);
    const groups: Record<string, number> =
        summary?.groupCount === undefined || largest === undefined ? {} : { groups: summary.groupCount, largest };
    const params = { run: run.id, algorithm: run.algorithm, ...painted, ...groups };
    const target: AiTarget = { range: { run: run.id } };
    // A run that ranks its elements found its leader: the node an answer about it names.
    const leader =
        summary !== undefined && summary.groups === undefined && summary.top.length > 0
            ? foundEffects("results", { nodes: 1 }, { top: { run: run.id, n: 1 } })
            : [];
    try {
        const { nodes } = await session.selection.count(target);
        return [{ code: "AI_EFFECT_RUN", params: { ...params, nodes }, target }, ...leader];
    } catch {
        return [{ code: "AI_EFFECT_RUN", params }, ...leader];
    }
}

/**
 * A started run as an action's result: its summary once it has finished, which the executor waits
 * for after the batch commits when the run is the batch's last call.
 * @param run - The run.
 * @param params - The facts the result carries.
 * @returns The result, to settle.
 */
export function settleRun(run: Run, params: JsonObject): ActionResult {
    return {
        settle: async ({ session, signal }) => {
            await awaitRun(run, signal);
            return {
                ...ok(summarizeRun(session, run), { ...params, ...matchedFact(session, run) }),
                effects: () => runEffects(session, run),
            };
        },
    };
}

/**
 * How many elements the layers a run colored match, as a style's result counts them, so a reply
 * cannot say it colored fewer than it did.
 * @param session - The session.
 * @param run - The run.
 * @returns `matched`, the most any of its layers matches; none when it colored nothing.
 */
function matchedFact(session: GraphSession, run: Run): { matched?: number } {
    const layers = session.runs.layers(run.id)?.present ?? [];
    const matched = Math.max(0, ...layers.map((id) => session.styles.counts(id).matched));
    return matched > 0 ? { matched } : {};
}

/**
 * The scope a call names, its selector settled as a target's is: repaired, and limited to the
 * selection a message is bound to. No scope stays no scope, which a bound message may ask too.
 * @param tx - The session.
 * @param args - The call.
 * @returns The scope and what was repaired.
 */
function runScope(tx: TransactionScope, args: Record<string, unknown>): { scope?: Scope; notes: JsonObject } {
    const { set, where } = (args.scope ?? {}) as { set?: string; where?: string };
    if (set !== undefined) {
        return { scope: { set }, notes: {} };
    }

    if (where === undefined) {
        return { notes: {} };
    }

    const { target, notes } = requireTarget(tx, { ...args, where }, "node");
    return { scope: scopeOf(target), notes };
}

/**
 * Start a run and wait for it.
 * @param context - The action's context.
 * @param args - The call.
 * @param catalog - The catalog.
 * @returns The run's summary.
 */
async function runAlgorithm(
    context: ActionContext,
    args: Record<string, unknown>,
    catalog: CatalogView,
): Promise<ActionResult> {
    const { tx, message } = context;
    const name = text(args.name);
    const plugin = legacyPlugin(name, catalog.legacyAlgorithms);
    if (plugin !== undefined) {
        await coded(() =>
            tx.execute({
                op: "algo.legacy",
                ...plugin,
                ...(args.options === undefined ? {} : { options: args.options as Record<string, unknown> }),
            }),
        );
        return ok({ algorithm: name }, { algorithm: name });
    }

    const resolved = algorithmKeyOf(name, catalog.algorithms);
    const descriptor = catalog.algorithms.find((entry) => entry.key === resolved?.key);
    if (resolved === undefined || descriptor === undefined) {
        throw new ToolRefusal("AI_UNKNOWN_ENTRY", {
            kind: "algorithm",
            name,
            didYouMean: suggest(
                name,
                catalog.algorithms.map((entry) => entry.key),
            ),
        });
    }

    const params = {
        ...resolved.params,
        ...checkOptions(tx, descriptor.options, (args.options ?? {}) as Record<string, unknown>),
    };
    const { scope, notes } = runScope(tx, args);
    const estimate = tx.estimate({
        op: "algo.run",
        algorithm: descriptor.key,
        params,
        ...(scope === undefined ? {} : { scope }),
    });
    if (!estimate.available) {
        throw new ToolRefusal("AI_NOT_AVAILABLE", {
            name: descriptor.key,
            requirement: estimate.refusal?.code ?? "unavailable",
        });
    }

    const exact = args.exact === true;
    if (
        message.gate !== false &&
        gated(message, "slow") &&
        (!Number.isFinite(estimate.seconds) || estimate.seconds > message.gate.slowSeconds) &&
        (exact || descriptor.approximable === undefined)
    ) {
        throw new GateHold("slow", {
            algorithm: descriptor.key,
            seconds: Number.isFinite(estimate.seconds) ? Math.round(estimate.seconds) : "unbounded",
            costClass: estimate.costClass,
        });
    }

    const run = codedNow(() =>
        tx.runs.start(descriptor.key, params, {
            ...(scope === undefined ? {} : { scope }),
            // A run answers a question as often as it changes the look: it colors only when asked.
            style: args.style === true,
            ...(exact ? { exact } : {}),
            ...(typeof args.sample === "number" ? { sample: args.sample } : {}),
        }),
    );
    message.runs.add(run.id);
    return settleRun(run, { run: run.id, algorithm: descriptor.key, ...notes });
}

/**
 * The `run_algorithm` tool for a catalog.
 * @param catalog - The catalog.
 * @returns The tool.
 */
export function runAlgorithmTool(catalog: CatalogView): ToolDefinition {
    const keys = catalog.algorithms.map((entry) => entry.key);
    // A class registered with no descriptor runs by its address, so the name field takes those too.
    const names = [...keys, ...catalog.legacyAlgorithms];
    return {
        name: "run_algorithm",
        plainName: "Run an algorithm",
        core: true,
        description:
            "Runs an algorithm and summarizes it; style true colors all nodes by it. Options: catalog describe.",
        example: { name: "shortest-path", options: { source: "a", target: "b" } },
        actions: [
            {
                name: "run",
                summary: "one algorithm",
                fields: {
                    name: nameField(names, "Algorithm."),
                    options: z.record(z.string(), z.unknown()).optional().describe("The algorithm's options by name."),
                    scope: z
                        .strictObject({
                            set: z.string().max(200).optional(),
                            where: whereField.optional().describe(WHERE_HELP),
                        })
                        .optional()
                        .describe("Run on a set or a selector's nodes only."),
                    style: z.boolean().optional().describe("Only when asked to see or color it."),
                    exact: z.boolean().optional().describe("Compute exactly even when slow."),
                    sample: z.number().int().min(1).optional().describe("Sample size for an approximate run."),
                },
                effect: "write",
                reaches: [
                    { op: "algo.run" },
                    { op: "algo.legacy" },
                    { door: "RunsApi.start" },
                    { door: "GraphSession.estimate" },
                    { options: "algorithms" },
                    ...keys.map((key) => ({ catalog: `algorithms/${key}` })),
                ],
                prepare: (args) => {
                    const name = typeof args.name === "string" ? args.name : "";
                    const resolved = algorithmKeyOf(name, catalog.algorithms);
                    return resolved === undefined || legacyPlugin(name, catalog.legacyAlgorithms) !== undefined
                        ? args
                        : { ...args, name: resolved.key };
                },
                run: (context, args) => runAlgorithm(context, args, catalog),
            },
        ],
    };
}

/**
 * The run a call names.
 * @param tx - The session.
 * @param args - The call.
 * @returns The run.
 */
function runOf(tx: TransactionScope, args: Record<string, unknown>): Run {
    const id = resolveRun(tx, text(args.run, "latest"));
    const run = tx.runs.get(id);
    if (run === undefined) {
        throw new ToolRefusal("AI_UNKNOWN_RUN", { run: id, runs: tx.runs.list().map((each) => each.id) });
    }

    return run;
}

/**
 * The result field a call names, or the run's first.
 * @param run - The run.
 * @param field - The field given.
 * @returns The field.
 */
function fieldOf(run: Run, field: unknown): string {
    const names = run.fields.map((each) => each.name);
    if (field === undefined) {
        return names[0] ?? "value";
    }

    if (!names.includes(text(field))) {
        throw new ToolRefusal("AI_UNKNOWN_COLUMN", { name: text(field), on: run.id, didYouMean: names });
    }

    return text(field);
}

/**
 * A finished run's result, or a refusal saying it has none.
 * @param run - The run.
 * @returns The result.
 */
function resultOf(run: Run): NonNullable<Run["result"]> {
    if (run.result === undefined) {
        throw new ToolRefusal("AI_NOT_AVAILABLE", { name: run.id, requirement: run.status });
    }

    return run.result;
}

/** What a run's summary reports of the run itself. */
const RUN_FACTS = [
    "id",
    "algorithm",
    "params",
    "scope",
    "status",
    "progress",
    "cancellable",
    "queuePosition",
    "startedAt",
    "durationMs",
    "partial",
    "stale",
    "fields",
    "shape",
    "caveats",
    "result",
    "error",
] as const;

const runField = z.string().max(200).optional().describe('Run id, algorithm name or "latest" (default).');
const fieldField = z.string().max(200).optional().describe("Result field; default the run's first.");

/** The `results` tool. */
export const resultsTool: ToolDefinition = {
    name: "results",
    plainName: "Algorithm results",
    core: true,
    description: "Existing runs.",
    example: { action: "top", run: "pagerank" },
    actions: [
        {
            name: "list",
            summary: "",
            fields: {},
            effect: "read",
            reaches: [{ door: "RunsApi.list" }, { door: "RunsApi.queue" }],
            run: ({ tx }) =>
                Promise.resolve(
                    ok(
                        tx.runs.list().map((run) => ({
                            run: run.id,
                            algorithm: run.algorithm,
                            status: run.status,
                            fields: run.fields.map((field) => field.name),
                            params: toJson(run.params),
                        })),
                        { queued: tx.runs.queue.length },
                    ),
                ),
        },
        {
            name: "summary",
            summary: "a run's result",
            fields: { run: runField },
            effect: "read",
            reaches: [{ door: "RunsApi.get" }, ...RUN_FACTS.map((fact) => ({ door: `Run.${fact}` }))],
            run: ({ tx }, args) => Promise.resolve(ok(summarizeRun(tx, runOf(tx, args)))),
        },
        {
            name: "top",
            summary: "k highest nodes; select: true selects",
            fields: {
                run: runField,
                field: fieldField,
                k: z.number().int().min(1).max(50).optional().describe("How many, default 10."),
                order: z.enum(["highest", "lowest"]).optional().describe("Default highest."),
                select: z.boolean().optional().describe("Also select them."),
            },
            effect: "read",
            reaches: [{ door: "RunsApi.get" }],
            run: async ({ tx }, args) => {
                const run = runOf(tx, args);
                const field = fieldOf(run, args.field);
                const k = (args.k as number | undefined) ?? 10;
                const ranking = resultOf(run).ranking(field);
                const entries = args.order === "lowest" ? [...ranking].reverse().slice(0, k) : ranking.slice(0, k);
                const rows = entries.map((entry) => ({
                    id: String(entry.id),
                    label: tx.data.name(entry.id) ?? String(entry.id),
                    value: toJson(entry.value),
                    rank: entry.rank,
                }));
                const ids = rows.map((row) => row.id);
                if (args.select === true) {
                    await coded(() => tx.selection.apply({ ids }, "replace"));
                }

                return {
                    ...ok(rows, { run: run.id, field }),
                    affectedNodes: ids,
                    effects: () => [
                        ...(args.select === true ? selectionEffects(tx, { ids }) : []),
                        ...foundEffects(
                            "results",
                            { nodes: rows.length },
                            { top: { run: run.id, field, n: rows.length } },
                        ),
                    ],
                };
            },
        },
        {
            name: "histogram",
            summary: "",
            fields: { run: runField, field: fieldField },
            effect: "read",
            reaches: [{ door: "RunsApi.get" }],
            run: ({ tx }, args) => {
                const run = runOf(tx, args);
                const field = fieldOf(run, args.field);
                return Promise.resolve(ok(resultOf(run).histogram(field), { run: run.id, field }));
            },
        },
        {
            name: "page",
            summary: "",
            fields: {
                run: runField,
                field: fieldField,
                limit: z.number().int().min(1).max(50).optional().describe("Default 20."),
                cursor: z.string().max(200).optional().describe("From the previous page."),
            },
            effect: "read",
            reaches: [{ door: "SessionDataApi.nodePage" }, { door: "ResultsApi.has" }],
            run: ({ tx }, args) => {
                const run = runOf(tx, args);
                const field = fieldOf(run, args.field);
                if (!tx.results.has(run.id, field)) {
                    throw new ToolRefusal("AI_NOT_AVAILABLE", { name: run.id, requirement: run.status });
                }

                const { revision } = tx.data.nodePage({ limit: 0 });
                const offset = offsetOf(args.cursor as string | undefined, revision);
                const page = tx.data.nodePage({
                    offset,
                    limit: limitOf(args.limit),
                    columns: [{ run: run.id, field }],
                    sort: { run: run.id, field, descending: true },
                });
                const values = page.columns?.[0]?.values ?? [];
                const rows = page.records.map((record, index) => ({
                    id: String(record.id),
                    label: tx.data.name(record.id) ?? String(record.id),
                    value: toJson(values[index]),
                }));
                return Promise.resolve({
                    ...ok(rows, { run: run.id, field }),
                    page: pageOf(page.total, offset, rows.length, revision),
                });
            },
        },
        {
            name: "rerun",
            summary: "",
            fields: { run: runField },
            effect: "write",
            reaches: [{ door: "Run.rerun" }, { op: "algo.run" }],
            run: ({ tx, message }, args) => {
                const again = runOf(tx, args).rerun();
                message.runs.add(again.id);
                return Promise.resolve(settleRun(again, { run: again.id }));
            },
        },
        {
            name: "cancel",
            summary: "",
            fields: { run: runField },
            effect: "exempt",
            reaches: [{ door: "Run.cancel" }],
            run: ({ tx, message }, args) => {
                const run = runOf(tx, args);
                if (gated(message, "irreversible") && !message.runs.has(run.id)) {
                    throw new GateHold("irreversible", { run: run.id, algorithm: run.algorithm });
                }

                run.cancel("assistant");
                return Promise.resolve(ok(undefined, { run: run.id, status: run.status }));
            },
        },
        {
            name: "remove",
            summary: "a run and its layers",
            fields: { run: runField },
            effect: "write",
            reaches: [{ door: "RunsApi.remove" }, { op: "algo.remove" }],
            run: async ({ tx }, args) => {
                const run = runOf(tx, args);
                const removal = await coded(() => tx.runs.remove(run.id));
                const { removedLayers } = removal;
                const params: JsonObject = { run: run.id, removedLayers };
                return {
                    ...ok(undefined, params),
                    effects: () => [
                        {
                            code: "AI_EFFECT_RUN_REMOVED",
                            params: { run: run.id, algorithm: run.algorithm, removedLayers },
                        },
                    ],
                };
            },
        },
        {
            name: "move",
            summary: "reorder its layers",
            fields: {
                run: runField,
                before: z.string().max(200).optional().describe("Layer to sit below; default the top."),
            },
            effect: "write",
            reaches: [{ door: "RunsApi.move" }, { op: "algo.move" }],
            run: async ({ tx }, args) => {
                const run = runOf(tx, args);
                await coded(() => tx.runs.move(run.id, (args.before ?? null) as LayerId | null));
                return ok(undefined, { run: run.id });
            },
        },
    ] satisfies ActionSpec[],
};
