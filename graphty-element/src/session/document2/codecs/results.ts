/**
 * @file The `results` section codec, version 2: the record of each run and of the layout, and their
 * outputs as columns (spec/README.md 4.5, 6.4, 8.2 rule 3). Experimental (`save-files-v2`).
 *
 * Runs are keyed by run id, in graphty-element's own form: a recipe-made run's id is
 * `<namespace>__<as>` and it writes `namespace` and `as`; a hand-started run writes neither. Each
 * run, and the layout, carries its own `bindsTo: { build, sources }`, so one section can restore
 * one run as saved and report another stale.
 */

import type { AlgorithmDescriptor, EdgeId, FieldDescriptor, NodeId, RunId } from "../../../catalog/types";
import { graphIdsOf } from "../../projectFile";
import { createRunResult, type ResultElementValues } from "../../results/RunResult";
import type { RunResult } from "../../results/types";
import { type Caveats, ENGINE_VERSIONS, type Run, type RunOutcome } from "../../runs";
import type { GraphSession } from "../../types";
import { isJsonObject } from "../framing";
import { projectMemory } from "../memory";
import type {
    BuildStamp,
    ElementRefs,
    JsonObject,
    ReadContext,
    ReadSection,
    SectionCodec,
    WriteContext,
} from "../types";
import { jsonSafe, numericCell } from "./dataRefs";
import { canonical, mintUlid, rerunsOnOpen, viewRunRecord } from "./viewParts";

/**
 * A value as a document holds it (spec 11), undefined as null so a column keeps its length.
 * @param value - The value.
 * @returns The JSON value.
 */
const encode = (value: unknown): unknown => jsonSafe(value) ?? null;

const NAMESPACE = /^[a-z](?:[a-z0-9]|_(?!_))*$/;
const RUN_NAME = /^[a-z][a-z0-9_]*$/;
/** A run id as the schema spells it. */
const RUN_ID = /^[A-Za-z0-9_.:-]{1,128}$/;

/** A recipe-made run's place in a document: its namespace and its name there. */
export interface RunName {
    readonly namespace: string;
    readonly as: string;
}

/**
 * A recipe-made run's namespace and `as`, split from its id (recipe.md, "Run ids and namespaces").
 * @param id - The run id.
 * @returns The namespace and `as`, or undefined for a hand-started run, whose id is its only name.
 */
export function runNameOf(id: RunId): RunName | undefined {
    const at = id.indexOf("__");
    if (at < 0) {
        return undefined;
    }

    const [namespace, as] = [id.slice(0, at), id.slice(at + 2)];
    const fits =
        namespace.length <= 32 &&
        NAMESPACE.test(namespace) &&
        !namespace.endsWith("_") &&
        as.length <= 64 &&
        RUN_NAME.test(as) &&
        !as.includes("__");
    return fits ? { namespace, as } : undefined;
}

/** The runs a recipe made: started by an applied recipe, or read with a `namespace`. */
const RECIPE_RUNS = projectMemory<Set<string>>();

/**
 * Remember that a recipe made a run, so it is written with its `namespace` and `as`.
 * @param session - The session.
 * @param id - The run id.
 */
export function markRecipeRun(session: object, id: string): void {
    let runs = RECIPE_RUNS.get(session);
    if (runs === undefined) {
        runs = new Set();
        RECIPE_RUNS.set(session, runs);
    }

    runs.add(id);
}

/**
 * A run's namespace and `as` as a save writes them: only for a recipe-made run (spec 4.5 rule 1);
 * a hand-started run whose id happens to hold `__` writes neither.
 * @param session - The session.
 * @param id - The run id.
 * @returns The namespace and `as`, or undefined.
 */
export function recipeRunName(session: object, id: RunId): RunName | undefined {
    return RECIPE_RUNS.get(session)?.has(id) === true ? runNameOf(id) : undefined;
}

/**
 * The run id of a recipe-made run: the inverse of {@link runNameOf}.
 * @param name - The namespace and `as`.
 * @returns The id.
 */
export function runIdOf(name: RunName): RunId {
    return `${name.namespace}__${name.as}`;
}

// ---------------------------------------------------------------------------------------------
// Values
// ---------------------------------------------------------------------------------------------

/**
 * A value read back for a field of a numeric type: the strings spec 11 writes become numbers.
 * @param value - The value as the file holds it.
 * @param numeric - Whether the field is a number.
 * @returns The value.
 */
function decode(value: unknown, numeric: boolean): unknown {
    return numeric && typeof value === "string" ? numericCell(value) : value;
}

/**
 * A JSON pointer token (RFC 6901).
 * @param name - The member name.
 * @returns The escaped token.
 */
const token = (name: string): string => name.replaceAll("~", "~0").replaceAll("/", "~1");

// ---------------------------------------------------------------------------------------------
// What an open restored, kept for the next save
// ---------------------------------------------------------------------------------------------

/** A run entry as read, and the result restored from it (undefined when nothing was). */
interface KeptRun {
    readonly entry: JsonObject;
    readonly result: RunResult | undefined;
}

/** What the last open read, so an unchanged run is written back as it was read (spec 6.3). */
interface Kept {
    readonly runs: Map<string, KeptRun>;
    layout?: { readonly entry: JsonObject } & Positions;
}

const KEPT = projectMemory<Kept>();

/** The positions the last open restored, so a layout the view or the recipe sets after them keeps them. */
const RESTORED = projectMemory<readonly { id: NodeId; x: number; y: number; z: number }[]>();

/**
 * The positions an open's results section restored, for the view or the recipe to put back after
 * it sets the layout.
 * @param session - The session.
 * @returns The positions, or undefined when none were restored.
 */
export function restoredPositions(
    session: object,
): readonly { id: NodeId; x: number; y: number; z: number }[] | undefined {
    // Taken once: a later open never puts them back.
    const placed = RESTORED.get(session);
    RESTORED.delete(session);
    return placed;
}

/** The graph's node and edge ids, in order. */
type GraphIds = ReturnType<typeof graphIdsOf>;

/** Every node's coordinates, as `positions.snapshot()` gives them. */
type Positions = ReturnType<GraphSession["positions"]["snapshot"]>;

/** What starting a saved run takes: its algorithm, params, seed and caveats. */
interface SavedStart {
    readonly algorithm: string;
    readonly params: Record<string, unknown>;
    readonly seed: unknown;
    readonly caveats: JsonObject;
}

/**
 * The session's kept entries.
 * @param session - The session.
 * @returns Them.
 */
function keptOf(session: GraphSession): Kept {
    let kept = KEPT.get(session);
    if (kept === undefined) {
        kept = { runs: new Map() };
        KEPT.set(session, kept);
    }

    return kept;
}

// ---------------------------------------------------------------------------------------------
// Writing
// ---------------------------------------------------------------------------------------------

/**
 * The algorithm's catalog entry.
 * @param session - The session.
 * @param key - The algorithm.
 * @returns The entry, or undefined for one this session does not know.
 */
function descriptorOf(session: GraphSession, key: string): AlgorithmDescriptor | undefined {
    return session.catalog.algorithms().find((descriptor) => descriptor.key === key);
}

/**
 * A run's params with the options that name nodes written as element references (spec 4.5 rule 1).
 * @param run - The run.
 * @param refs - The element references.
 * @param descriptor - The algorithm's catalog entry.
 * @param left - Collects the options that named a node the graph does not hold.
 * @returns The params.
 */
function paramsOut(
    run: Run,
    refs: ElementRefs,
    descriptor: AlgorithmDescriptor | undefined,
    left: string[],
): JsonObject {
    const params: JsonObject = {};
    for (const [option, value] of Object.entries(run.params)) {
        const type = descriptor?.options.find((each) => each.name === option)?.type;
        if (type === "node-id") {
            const ref = refs.nodeRef(value as NodeId);
            if (ref === undefined) {
                left.push(option);
            } else {
                params[option] = ref;
            }
        } else if (type === "node-set" && Array.isArray(value)) {
            const list = (value as NodeId[]).map((id) => refs.nodeRef(id));
            if (list.includes(undefined)) {
                left.push(option);
            }

            params[option] = list.filter((ref) => ref !== undefined);
        } else {
            params[option] = encode(value);
        }
    }

    return params;
}

/**
 * One half of a run's outputs as columns (spec 4.5 rule 4).
 * @param ids - The half's ids, in the graph's order.
 * @param valuesOf - The run's values of one element.
 * @param refOf - An element's reference.
 * @param fields - The half's fields.
 * @returns The outputs, or undefined when the run published nothing for the half.
 */
function outputsOut<Id>(
    ids: readonly Id[],
    valuesOf: (id: Id) => Readonly<Record<string, unknown>> | undefined,
    refOf: (id: Id) => unknown,
    fields: readonly FieldDescriptor[],
): JsonObject | undefined {
    const refs: unknown[] = [];
    const rows: Readonly<Record<string, unknown>>[] = [];
    for (const id of ids) {
        const values = valuesOf(id);
        const ref = values === undefined ? undefined : refOf(id);
        if (values !== undefined && ref !== undefined) {
            refs.push(ref);
            rows.push(values);
        }
    }

    if (refs.length === 0 || fields.length === 0) {
        return undefined;
    }

    const columns = Object.fromEntries(fields.map((field) => [field.name, rows.map((row) => encode(row[field.name]))]));
    return { refs, columns };
}

/**
 * A run's `bindsTo` (spec 6.4): the open data's build and copy ids when the run is current. A run
 * whose data changed since it ran, or a save with no build stamp to read, gets a newly minted build,
 * so it reads as changed (Partial) on reopen.
 * @param run - The run, or undefined for the layout.
 * @param stamp - The open data's stamp.
 * @returns The binding.
 */
function runBinding(run: Run | undefined, stamp: BuildStamp | undefined): BuildStamp {
    // ponytail: the element does not record the build a run ran on; the run's staleness stands in.
    return stamp !== undefined && (run?.record.stale ?? null) === null
        ? { build: stamp.build, sources: { ...stamp.sources } }
        : { build: mintUlid(), sources: { ...stamp?.sources } };
}

/**
 * One algorithm run as a results section holds it (spec 4.5 rules 1 to 4).
 * @param run - The run.
 * @param result - Its result.
 * @param context - The save.
 * @param ids - The graph's node and edge ids.
 * @param stamp - The open data's build stamp.
 * @returns The entry.
 */
function runOut(
    run: Run,
    result: RunResult,
    context: WriteContext,
    ids: GraphIds,
    stamp: BuildStamp | undefined,
): JsonObject {
    const refs = context.refs();
    const { record } = run;
    const left: string[] = [];
    const params = paramsOut(run, refs, descriptorOf(context.session, run.algorithm), left);
    for (const option of left) {
        context.problems.push({
            code: "W_ELEMENT_NAMING_LEFT_OUT",
            params: { section: "results", pointer: `/runs/${token(run.id)}/params/${token(option)}` },
        });
    }

    // The deprecated English members are not saved; the words are rebuilt from `facts`. The seed is
    // the run's own `seed`, its one home (spec 4.5 rule 3).
    const caveats = Object.fromEntries(
        Object.entries(record.caveats).filter(([key]) => !["notes", "partialReason", "seed"].includes(key)),
    );
    const graph = encode(result.graph) as JsonObject;
    const nodes = outputsOut(
        ids.nodes,
        (id) => result.node(id),
        (id) => refs.nodeRef(id),
        result.fields.filter((field) => field.kind === "node"),
    );
    const edges = outputsOut(
        ids.edges,
        (id) => result.edge(id),
        (id) => refs.edgeRef(id),
        result.fields.filter((field) => field.kind === "edge"),
    );
    return {
        ...recipeRunName(context.session, run.id),
        algorithm: run.algorithm,
        params,
        engine: encode(record.engine),
        seed: Number.isInteger(record.seed) ? record.seed : null,
        durationMs: record.durationMs ?? 0,
        bindsTo: runBinding(run, stamp),
        fields: result.fields.map((field) => ({ name: field.name, kind: field.kind, type: field.type })),
        caveats: encode(caveats),
        ...(Object.keys(graph).length === 0 ? {} : { graph }),
        ...(nodes === undefined ? {} : { nodes }),
        ...(edges === undefined ? {} : { edges }),
    };
}

/**
 * Whether two position snapshots hold the same nodes at the same places.
 * @param a - One.
 * @param b - The other.
 * @returns True when they agree bit for bit.
 */
function samePositions(a: Positions, b: Positions): boolean {
    return (
        a.order.length === b.order.length &&
        a.order.every((id, at) => id === b.order[at]) &&
        a.xyz.length === b.xyz.length &&
        a.xyz.every((value, at) => Object.is(value, b.xyz[at]))
    );
}

/**
 * The layout record (spec 4.5 rule 5), or undefined when no node is placed.
 * @param context - The save.
 * @param stamp - The open data's build stamp.
 * @returns The record.
 */
function layoutOut(context: WriteContext, stamp: BuildStamp | undefined): JsonObject | undefined {
    const { session } = context;
    const now = session.positions.snapshot();
    const kept = keptOf(session).layout;
    if (kept !== undefined && samePositions(kept, now)) {
        return kept.entry;
    }

    const refs = context.refs();
    const nodeRefs: unknown[] = [];
    const columns: { x: number[]; y: number[]; z: number[] } = { x: [], y: [], z: [] };
    now.order.forEach((id, at) => {
        const [x, y, z] = [now.xyz[at * 3], now.xyz[at * 3 + 1], now.xyz[at * 3 + 2]];
        const ref = refs.nodeRef(id);
        if (ref !== undefined && [x, y, z].every((value) => Number.isFinite(value))) {
            nodeRefs.push(ref);
            columns.x.push(x);
            columns.y.push(y);
            columns.z.push(z);
        }
    });
    if (nodeRefs.length === 0) {
        return undefined;
    }

    const { layout } = session;
    const { seed } = layout.options;
    return {
        id: layout.id,
        algorithm: layout.engine,
        dimension: layout.dimension === "2d" ? 2 : 3,
        options: encode(layout.options),
        seed: Number.isInteger(seed) ? seed : null,
        // ponytail: the session does not time a layout, so a fresh record writes 0, as a run with
        // no recorded duration does; time it in the layout engine when a reader needs it.
        durationMs: 0,
        engine: encode(ENGINE_VERSIONS),
        bindsTo: runBinding(undefined, stamp),
        nodes: { refs: nodeRefs, columns },
    };
}

/**
 * Write the session's finished runs and its layout.
 * @param context - The save.
 * @returns The body.
 */
async function writeRuns(context: WriteContext): Promise<JsonObject> {
    const { session } = context;
    const stamp = await context.buildStamp?.();
    const kept = keptOf(session);
    const ids = graphIdsOf(session);
    const runs: JsonObject = {};
    for (const run of session.runs.list()) {
        const { result } = run;
        if (run.status !== "succeeded" || result === undefined) {
            continue;
        }

        if (!RUN_ID.test(run.id)) {
            context.problems.push({ code: "W_MEMBER_LEFT_OUT", params: { section: "results", pointer: "/runs" } });
            continue;
        }

        const restored = kept.runs.get(run.id);
        runs[run.id] = restored?.result === result ? restored.entry : runOut(run, result, context, ids, stamp);
    }

    // A run an open could not restore (an algorithm this session lacks) is written back as read.
    for (const [id, restored] of kept.runs) {
        if (restored.result === undefined && runs[id] === undefined) {
            runs[id] = restored.entry;
        }
    }

    const layout = layoutOut(context, stamp);
    return { runs, ...(layout === undefined ? {} : { layout }) };
}

// ---------------------------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------------------------

/** One run's outputs, bound to this session's elements. */
interface BoundOutputs {
    readonly nodes: ResultElementValues[];
    readonly edges: ResultElementValues<EdgeId>[];
}

/** What reading one section needs. */
interface Reading {
    readonly section: ReadSection;
    readonly context: ReadContext;
    readonly refs: ElementRefs;
    /** The open data's build stamp, or undefined when the open cannot read one. */
    readonly stamp: BuildStamp | undefined;
}

/**
 * Report a reference that binds nowhere (spec 6.3).
 * @param reading - The open.
 * @param pointer - Where it is, under the section.
 * @param ref - The reference.
 */
function unbound(reading: Reading, pointer: string, ref: unknown): void {
    reading.context.problems.push({
        code: "W_REFERENCE_UNBOUND",
        params: { section: "results", pointer: `${reading.section.pointer}${pointer}`, ref: canonical(ref) },
    });
}

/**
 * One half of a saved run's outputs, bound.
 * @param reading - The open.
 * @param at - The half's pointer under the section.
 * @param half - The half as the file holds it.
 * @param bind - Binds one reference.
 * @param numeric - Whether a field is a number.
 * @returns The bound rows.
 */
function rowsIn<Id extends NodeId>(
    reading: Reading,
    at: string,
    half: unknown,
    bind: (ref: unknown) => Id | undefined,
    numeric: (field: string) => boolean,
): ResultElementValues<Id>[] {
    if (!isJsonObject(half) || !Array.isArray(half.refs)) {
        return [];
    }

    const columns = isJsonObject(half.columns) ? Object.entries(half.columns) : [];
    const rows: ResultElementValues<Id>[] = [];
    (half.refs as unknown[]).forEach((ref, row) => {
        const id = bind(ref);
        if (id === undefined) {
            unbound(reading, `${at}/refs/${row}`, ref);
            return;
        }

        const values: Record<string, unknown> = {};
        for (const [field, column] of columns) {
            const value = Array.isArray(column) ? decode(column[row], numeric(field)) : null;
            if (value !== null && value !== undefined) {
                values[field] = value;
            }
        }

        rows.push({ id, values });
    });
    return rows;
}

/**
 * The full field descriptors of a run's saved fields: the catalog's where it has them.
 * @param saved - The fields as the file holds them.
 * @param descriptor - The algorithm's catalog entry.
 * @returns The descriptors.
 */
function fieldsIn(saved: unknown, descriptor: AlgorithmDescriptor): FieldDescriptor[] {
    return (Array.isArray(saved) ? saved : []).filter(isJsonObject).map((field): FieldDescriptor => {
        const name = String(field.name);
        const kind = field.kind as FieldDescriptor["kind"];
        return (
            descriptor.fields.find((known) => known.name === name && known.kind === kind) ?? {
                name,
                plainName: name,
                technicalName: name,
                kind,
                type: field.type as FieldDescriptor["type"],
                path: `results.$.${name}`,
            }
        );
    });
}

/**
 * A run's saved params with element references bound to node ids.
 * @param reading - The open.
 * @param key - The run's id.
 * @param saved - The params as the file holds them.
 * @param descriptor - The algorithm's catalog entry.
 * @returns The params, and whether every reference bound.
 */
function paramsIn(
    reading: Reading,
    key: string,
    saved: unknown,
    descriptor: AlgorithmDescriptor,
): { params: Record<string, unknown>; bound: boolean } {
    const params: Record<string, unknown> = {};
    let bound = true;
    for (const [option, value] of Object.entries(isJsonObject(saved) ? saved : {})) {
        const type = descriptor.options.find((each) => each.name === option)?.type;
        const at = `/runs/${token(key)}/params/${token(option)}`;
        if (type === "node-id") {
            const id = reading.refs.node(value);
            bound &&= id !== undefined;
            if (id === undefined) {
                unbound(reading, at, value);
            }

            params[option] = id ?? value;
        } else if (type === "node-set" && Array.isArray(value)) {
            params[option] = value.flatMap((ref: unknown, row) => {
                const id = reading.refs.node(ref);
                bound &&= id !== undefined;
                return id === undefined ? (unbound(reading, `${at}/${row}`, ref), []) : [id];
            });
        } else {
            params[option] = decode(value, type === "number" || type === "integer" || type === "seed");
        }
    }

    return { params, bound };
}

/**
 * Whether two values agree: numbers within a relative 1e-9, NaN equal to NaN, anything else as
 * sorted JSON.
 * @param a - One.
 * @param b - The other.
 * @returns True when they agree.
 */
function agree(a: unknown, b: unknown): boolean {
    if (typeof a === "number" && typeof b === "number") {
        return Object.is(a, b) || Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));
    }

    return canonical(encode(a)) === canonical(encode(b));
}

/**
 * Whether a field's values agree between two sets of rows. A field whose values are names a re-run
 * may spell differently (a community's number) agrees when it groups the elements the same way.
 * @param saved - The saved rows.
 * @param valuesOf - The rerun's values of an element.
 * @param field - The field.
 * @returns True when they agree.
 */
function fieldAgrees(
    saved: readonly ResultElementValues[],
    valuesOf: (id: NodeId) => Readonly<Record<string, unknown>> | undefined,
    field: FieldDescriptor,
): boolean {
    const forward = new Map<string, string>();
    const backward = new Map<string, string>();
    return saved.every(({ id, values }) => {
        const was = values[field.name];
        const now = valuesOf(id)?.[field.name];
        if (field.unstable !== true) {
            return agree(was, now);
        }

        const [a, b] = [canonical(encode(was)), canonical(encode(now ?? null))];
        const ok = (forward.get(a) ?? b) === b && (backward.get(b) ?? a) === a;
        forward.set(a, b);
        backward.set(b, a);
        return ok;
    });
}

/**
 * Whether a rerun disagrees with the saved outputs (spec 8.2 rule 3).
 * @param saved - The saved outputs, bound, with the graph values and the fields.
 * @param saved.outputs - The bound rows.
 * @param saved.graph - The graph-level values.
 * @param saved.fields - The fields.
 * @param result - The rerun's result.
 * @returns True when any value disagrees.
 */
function differs(
    saved: { readonly outputs: BoundOutputs; readonly graph: JsonObject; readonly fields: readonly FieldDescriptor[] },
    result: RunResult,
): boolean {
    return saved.fields.some((field) => {
        if (field.kind === "graph") {
            return field.name in saved.graph && !agree(saved.graph[field.name], result.graph[field.name]);
        }

        return field.kind === "node"
            ? !fieldAgrees(saved.outputs.nodes, (id) => result.node(id), field)
            : !fieldAgrees(saved.outputs.edges, (id) => result.edge(id as EdgeId), field);
    });
}

/**
 * Whether a recipe in the same open, applied because the caller asked, starts the run.
 * @param context - The open.
 * @param name - The run's namespace and `as`, when it has them.
 * @returns True when it does.
 */
function recipeStarts(context: ReadContext, name: RunName | undefined): boolean {
    const recipe = context.other("recipe")?.body;
    return (
        name !== undefined &&
        recipe?.namespace === name.namespace &&
        Array.isArray(recipe.commands) &&
        recipe.commands.some((command) => isJsonObject(command) && command.op === "algo.run" && command.as === name.as)
    );
}

/**
 * Report `W_RESULTS_DIFFER` once a run another section starts has ended.
 * @param context - The open.
 * @param id - The run.
 * @param check - Whether its result disagrees.
 */
function compareWhenEnded(context: ReadContext, id: RunId, check: (result: RunResult) => boolean): void {
    const stop = context.session.on("run:changed", ({ run, phase }) => {
        const result = context.session.runs.get(id)?.result;
        if (run.id !== id || phase !== "end" || result === undefined) {
            return;
        }

        stop();
        if (check(result)) {
            context.problems.push({ code: "W_RESULTS_DIFFER", params: { run: id } });
        }
    });
}

/**
 * Start a run from its saved record, under the seed it recorded.
 * @param context - The open.
 * @param id - The run.
 * @param start - The algorithm, params, seed and caveats.
 * @returns The run.
 */
function startSaved(context: ReadContext, id: RunId, start: SavedStart): Run {
    const { caveats } = start;
    return context.tx.runs.start(start.algorithm, start.params, {
        as: id,
        style: false,
        ...(Number.isInteger(start.seed) ? { seed: start.seed as number } : {}),
        ...(caveats.exact === false && typeof caveats.sampleSize === "number" ? { sample: caveats.sampleSize } : {}),
    });
}

/**
 * Report `W_DATA_CHANGED` when a run's data changed since it ran (spec 6.4, Partial): the sources
 * whose copy id differs, or none when the build alone changed (settings, types or joins).
 * @param reading - The open.
 * @param id - The run, or `layout`.
 * @param saved - The run's `bindsTo` as the file holds it.
 */
function checkBinding(reading: Reading, id: string, saved: unknown): void {
    const { stamp } = reading;
    const was = isJsonObject(saved) && isJsonObject(saved.sources) ? saved.sources : {};
    if (
        stamp === undefined ||
        (isJsonObject(saved) && saved.build === stamp.build && canonical(was) === canonical(stamp.sources))
    ) {
        return;
    }

    const sources = [...new Set([...Object.keys(was), ...Object.keys(stamp.sources)])]
        .filter((source) => was[source] !== stamp.sources[source])
        .sort((a, b) => a.localeCompare(b));
    // ponytail: the element has no way to mark a restored run stale; the report is all a reader sees.
    reading.context.problems.push({
        code: "W_DATA_CHANGED",
        params: { section: "results", run: id, sources: canonical(sources) },
    });
}

/**
 * Read one algorithm run (spec 8.2 rule 3). A run the view records is the view's to rerun or
 * restore: with rerun off its outcome waits for the view to start it; with rerun on it is compared
 * once the rerun ends. A run no view or recipe in the open starts is restored as saved, never rerun.
 * @param reading - The open.
 * @param id - The run's id.
 * @param entry - The run as the file holds it.
 */
async function readRun(reading: Reading, id: RunId, entry: JsonObject): Promise<void> {
    const { context } = reading;
    const kept = keptOf(context.session).runs;
    const descriptor = typeof entry.algorithm === "string" ? descriptorOf(context.session, entry.algorithm) : undefined;
    if (descriptor === undefined) {
        kept.set(id, { entry, result: undefined });
        context.problems.push({ code: "W_RUN_NOT_RUN", params: { run: id } });
        return;
    }

    if (typeof entry.namespace === "string") {
        markRecipeRun(context.session, id);
    }

    checkBinding(reading, id, entry.bindsTo);
    const fields = fieldsIn(entry.fields, descriptor);
    const numeric = (kind: string) => (field: string) =>
        fields.some((each) => each.name === field && each.kind === kind && ["number", "integer"].includes(each.type));
    const at = `/runs/${token(id)}`;
    const outputs: BoundOutputs = {
        nodes: rowsIn(reading, `${at}/nodes`, entry.nodes, (ref) => reading.refs.node(ref), numeric("node")),
        edges: rowsIn(reading, `${at}/edges`, entry.edges, (ref) => reading.refs.edge(ref), numeric("edge")),
    };
    const graph = Object.fromEntries(
        Object.entries(isJsonObject(entry.graph) ? entry.graph : {}).map(([field, value]) => [
            field,
            decode(value, numeric("graph")(field)),
        ]),
    );
    const caveatsRead = isJsonObject(entry.caveats) ? entry.caveats : {};
    // The deprecated `notes` are not saved; the words are rebuilt from `facts`. The run's own `seed`
    // is the authority over any the caveats hold (spec 4.5 rule 3).
    const seed = Number.isInteger(entry.seed) ? { seed: entry.seed } : {};
    const caveats = { facts: [], ...caveatsRead, ...seed, notes: [] } as unknown as Caveats;
    const { params, bound } = paramsIn(reading, id, entry.params, descriptor);
    const check = (result: RunResult): boolean => differs({ outputs, graph, fields }, result);
    const record = viewRunRecord(context, id);
    const recipe = record === undefined && context.applyRecipe === true && recipeStarts(context, runNameOf(id));
    if ((record !== undefined && rerunsOnOpen(context, id, record)) || (recipe && context.rerun)) {
        compareWhenEnded(context, id, check);
        return;
    }

    const result = createRunResult({
        runId: id,
        shape: descriptor.shape,
        fields,
        // ponytail: a file does not record how many elements the run measured; the bound outputs stand in.
        measured: { nodes: outputs.nodes.length, edges: outputs.edges.length },
        graph,
        nodes: outputs.nodes,
        edges: outputs.edges,
        caveats,
        durationMs: typeof entry.durationMs === "number" ? entry.durationMs : 0,
    });
    const outcome: RunOutcome = { result, summary: result.summary(), caveats, fields };
    kept.set(id, { entry, result });
    context.restored.add("runs");
    if (record !== undefined || recipe) {
        // The view or the recipe starts it, after this section; the outcome waits for it.
        context.canned.set(id, outcome);
        return;
    }

    if (!bound) {
        context.problems.push({ code: "W_RUN_NOT_RUN", params: { run: id } });
        return;
    }

    context.canned.set(id, outcome);
    try {
        await startSaved(context, id, { algorithm: descriptor.key, params, seed: entry.seed, caveats: caveatsRead });
    } finally {
        context.canned.delete(id);
    }
}

/**
 * Read the layout record: put every bound node where it was saved, unless the view records the
 * layout and the layout reruns.
 * @param reading - The open.
 * @param entry - The record as the file holds it.
 */
async function readLayout(reading: Reading, entry: JsonObject): Promise<void> {
    const { context } = reading;
    checkBinding(reading, "layout", entry.bindsTo);
    const half = isJsonObject(entry.nodes) ? entry.nodes : {};
    const refs = Array.isArray(half.refs) ? (half.refs as unknown[]) : [];
    const columns = isJsonObject(half.columns) ? half.columns : {};
    const axis = (name: string): unknown[] => (Array.isArray(columns[name]) ? (columns[name] as unknown[]) : []);
    const [xs, ys, zs] = [axis("x"), axis("y"), axis("z")];
    const placed: { id: NodeId; x: number; y: number; z: number }[] = [];
    refs.forEach((ref, row) => {
        const id = reading.refs.node(ref);
        const [x, y, z] = [xs[row], ys[row], zs[row]].map((value) => decode(value, true));
        if (id === undefined) {
            unbound(reading, `/layout/nodes/refs/${row}`, ref);
        } else if ([x, y, z].every((value) => typeof value === "number" && Number.isFinite(value))) {
            placed.push({ id, x: x as number, y: y as number, z: z as number });
        }
    });
    const reruns = isJsonObject(context.other("view")?.body.layout) && (context.rerunOf?.("layout") ?? context.rerun);
    if (reruns || placed.length === 0) {
        RESTORED.delete(context.session);
        return;
    }

    await context.tx.positions.set(placed);
    RESTORED.set(context.session, placed);
    context.restored.add("arrangement");
    keptOf(context.session).layout = { entry, ...context.session.positions.snapshot() };
}

/** The `graphty-results` section, version 2. */
export const resultsCodec: SectionCodec = {
    section: "results",
    version: 2,
    reads: [2],
    bound: true,
    members: ["runs", "layout"],
    async write(context) {
        return { body: await writeRuns(context) };
    },
    async read(section, context) {
        const kept = keptOf(context.session);
        kept.runs.clear();
        kept.layout = undefined;
        const reading: Reading = { section, context, refs: context.refs(), stamp: await context.buildStamp?.() };
        const runs = isJsonObject(section.body.runs) ? section.body.runs : {};
        for (const [id, entry] of Object.entries(runs)) {
            if (isJsonObject(entry)) {
                await readRun(reading, id, entry);
            } else {
                context.problems.push({ code: "W_RUN_NOT_RUN", params: { run: id } });
            }
        }

        if (isJsonObject(section.body.layout)) {
            await readLayout(reading, section.body.layout);
        }
    },
};
