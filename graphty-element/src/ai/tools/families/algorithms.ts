/**
 * @file `run_algorithm` and `results`: one tool runs any catalog algorithm, built-in or
 * registered, with options checked against the entry's own descriptor; the other reads, reruns,
 * cancels and removes the runs that exist.
 */

import { z } from "zod";

import { Algorithm } from "../../../algorithms/Algorithm";
import { algorithmByLegacyKey } from "../../../catalog/algorithms";
import type { AlgorithmDescriptor } from "../../../catalog/types";
import type { Run } from "../../../session/runs/types";
import type { TransactionScope } from "../../../session/types";
import { MAX_SELECTOR, resolveNode, resolveRun, SELECTOR_HELP, text } from "../fields";
import { optionsSchema } from "../optionSchema";
import { suggest } from "../search";
import { limitOf, offsetOf, pageOf, summarizeRun, toJson } from "../shape";
import {
    type ActionContext,
    type ActionResult,
    type ActionSpec,
    type CatalogView,
    GateHold,
    type JsonObject,
    type ToolDefinition,
    ToolRefusal,
} from "../types";
import { coded, codedNow, nameField, ok } from "./common";

/**
 * The catalog key a name means: its own key, any case, `_` for `-`, a `graphty:` prefix, or a
 * legacy key (`dijkstra` is `shortest-path` with `method: "dijkstra"`).
 * @param name - The name the model wrote.
 * @param algorithms - The catalog's algorithms.
 * @returns The key and the parameters the legacy key implies, or undefined.
 */
export function algorithmKeyOf(
    name: string,
    algorithms: readonly AlgorithmDescriptor[],
): { key: string; params: Readonly<Record<string, unknown>> } | undefined {
    const bare = name.trim().replace(/^graphty:/i, "");
    const lower = bare.toLowerCase().replaceAll("_", "-");
    const direct = algorithms.find((entry) => entry.key === bare || entry.key.toLowerCase() === lower);
    if (direct !== undefined) {
        return { key: direct.key, params: {} };
    }

    const legacy = algorithmByLegacyKey(lower) ?? algorithmByLegacyKey(lower.replaceAll("-", ""));
    return legacy === undefined ? undefined : { key: legacy.descriptor.key, params: legacy.params };
}

/**
 * A registered 1.x algorithm with no descriptor, which runs through the legacy op.
 * @param name - `namespace:type`.
 * @returns The namespace and type, or undefined.
 */
function legacyPlugin(name: string): { namespace: string; type: string } | undefined {
    const [namespace, type] = name.split(":");
    if (type === undefined || !Algorithm.getRegisteredAlgorithms().includes(name)) {
        return undefined;
    }

    return { namespace, type };
}

/**
 * Check a call's options against the entry: unknown keys, types, bounds; node options by id or label.
 * @param tx - The session.
 * @param descriptor - The entry.
 * @param options - The options given.
 * @returns The options, node labels resolved.
 * @throws {ToolRefusal} `AI_ARG_INVALID` or `AI_ARG_OUT_OF_RANGE` naming the option.
 */
function checkOptions(
    tx: TransactionScope,
    descriptor: AlgorithmDescriptor,
    options: Record<string, unknown>,
): Record<string, unknown> {
    const { schema } = optionsSchema(descriptor.options);
    const parsed = schema.safeParse(options);
    if (!parsed.success) {
        const issue = parsed.error.issues[0];
        const allowed = Object.keys(schema.shape);
        if (issue.code === "unrecognized_keys") {
            throw new ToolRefusal("AI_ARG_INVALID", {
                path: `options.${issue.keys[0]}`,
                expected: "a known option",
                allowed,
                didYouMean: suggest(issue.keys[0], allowed),
            });
        }

        const code = issue.code === "too_big" || issue.code === "too_small" ? "AI_ARG_OUT_OF_RANGE" : "AI_ARG_INVALID";
        throw new ToolRefusal(code, { path: `options.${issue.path.join(".")}`, expected: issue.message, allowed });
    }

    const out: Record<string, unknown> = { ...parsed.data };
    for (const option of descriptor.options) {
        const value = out[option.name];
        if (option.type === "node-id" && value !== undefined && value !== null) {
            out[option.name] = resolveNode(tx, text(value));
        }
    }

    return out;
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
    const plugin = legacyPlugin(name);
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
        ...checkOptions(tx, descriptor, (args.options ?? {}) as Record<string, unknown>),
    };
    const scopeArg = args.scope as { set?: string; where?: string } | undefined;
    let scope: { set: string } | { where: string } | undefined;
    if (scopeArg?.set !== undefined) {
        scope = { set: scopeArg.set };
    } else if (scopeArg?.where !== undefined) {
        scope = { where: scopeArg.where };
    }
    const estimate = tx.estimate({
        op: "algo.run",
        algorithm: descriptor.key,
        params,
        ...(scope === undefined ? {} : { scope }),
    });
    if (!estimate.available) {
        throw new ToolRefusal("AI_NOT_AVAILABLE", {
            name: descriptor.key,
            requirement: estimate.reason ?? "unavailable",
        });
    }

    const exact = args.exact === true;
    if (
        message.gate !== false &&
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
            ...(args.style === undefined ? {} : { style: args.style as boolean | { size?: boolean } }),
            ...(exact ? { exact } : {}),
            ...(typeof args.sample === "number" ? { sample: args.sample } : {}),
        }),
    );
    message.runs.add(run.id);
    await coded(async () => {
        await run;
    });
    return ok(summarizeRun(tx, run), { run: run.id, algorithm: descriptor.key });
}

/**
 * The `run_algorithm` tool for a catalog.
 * @param catalog - The catalog.
 * @returns The tool.
 */
export function runAlgorithmTool(catalog: CatalogView): ToolDefinition {
    const keys = catalog.algorithms.map((entry) => entry.key);
    return {
        name: "run_algorithm",
        plainName: "Run an algorithm",
        core: true,
        description:
            "Runs an algorithm and summarizes its result; it colors the graph unless style is false. Options: catalog describe.",
        example: { name: "shortest-path", options: { source: "a", target: "b" } },
        actions: [
            {
                name: "run",
                summary: "one algorithm",
                fields: {
                    name: nameField(keys, "Algorithm."),
                    options: z.record(z.string(), z.unknown()).optional().describe("The algorithm's options by name."),
                    scope: z
                        .strictObject({
                            set: z.string().max(200).optional(),
                            where: z.string().max(MAX_SELECTOR).optional().describe(SELECTOR_HELP),
                        })
                        .optional()
                        .describe("Run on a set or a selector's nodes only."),
                    style: z.boolean().optional().describe("false: compute without coloring the graph."),
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
                    return resolved === undefined || legacyPlugin(name) !== undefined
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

const runField = z
    .string()
    .max(200)
    .optional()
    .describe('Run id, algorithm name (its newest run) or "latest" (default).');
const fieldField = z.string().max(200).optional().describe("Result field; default the run's first.");

/** The `results` tool. */
export const resultsTool: ToolDefinition = {
    name: "results",
    plainName: "Algorithm results",
    core: true,
    description: "Reads, reruns, cancels and removes existing runs.",
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
                    ),
                ),
        },
        {
            name: "summary",
            summary: "a run's result",
            fields: { run: runField },
            effect: "read",
            reaches: [
                { door: "RunsApi.get" },
                { door: "ResultsApi.get" },
                ...RUN_FACTS.map((fact) => ({ door: `Run.${fact}` })),
            ],
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
                if (args.select === true) {
                    await coded(() => tx.selection.apply({ ids: rows.map((row) => row.id) }, "replace"));
                }

                return { ...ok(rows, { run: run.id, field }), affectedNodes: rows.map((row) => row.id) };
            },
        },
        {
            name: "histogram",
            summary: "a field's distribution",
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
            summary: "nodes with values, paged",
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
            run: async ({ tx, message }, args) => {
                const again = runOf(tx, args).rerun();
                message.runs.add(again.id);
                await coded(async () => {
                    await again;
                });
                return ok(summarizeRun(tx, again), { run: again.id });
            },
        },
        {
            name: "cancel",
            summary: "stop a running run",
            fields: { run: runField },
            effect: "exempt",
            reaches: [{ door: "Run.cancel" }],
            run: ({ tx, message }, args) => {
                const run = runOf(tx, args);
                if (message.gate !== false && !message.runs.has(run.id)) {
                    throw new GateHold("irreversible", { run: run.id, algorithm: run.algorithm });
                }

                run.cancel("assistant");
                return Promise.resolve(ok(undefined, { run: run.id, status: run.status }));
            },
        },
        {
            name: "remove",
            summary: "remove a run and its layers",
            fields: { run: runField },
            effect: "write",
            reaches: [{ door: "RunsApi.remove" }, { op: "algo.remove" }],
            run: async ({ tx }, args) => {
                const run = runOf(tx, args);
                const removal = await coded(() => tx.runs.remove(run.id));
                const params: JsonObject = { run: run.id, removedLayers: removal.removedLayers };
                return ok(undefined, params);
            },
        },
    ] satisfies ActionSpec[],
};
