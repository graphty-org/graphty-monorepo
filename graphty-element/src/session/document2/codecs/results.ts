/**
 * @file The `results` section codec, version 2: the record of each run and its outputs (spec 4.5).
 * Experimental (`save-files-v2`).
 *
 * Today's run ids carry no namespace. An id the element minted is written under the namespace
 * `session` and one the author named under `reader`, each with the id as its `as`; both read back
 * as the bare id, and `session` marks it minted again. An id that already reads `<namespace>__<as>`
 * is split there.
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
    DocumentProblem,
    ElementRefs,
    JsonObject,
    ReadContext,
    ReadSection,
    SectionCodec,
    WriteContext,
} from "../types";
import { bindingOfBody, canonicalJson, dataBindingOf, jsonSafe } from "./dataRefs";

/**
 * A value as a document holds it (spec 11), undefined as null so a column keeps its length.
 * @param value - The value.
 * @returns The JSON value.
 */
const encode = (value: unknown): unknown => jsonSafe(value) ?? null;

/** The namespace of a run id the element minted. */
export const SESSION_NAMESPACE = "session";
/** The namespace of a run id the author named without one. */
export const READER_NAMESPACE = "reader";

const NAMESPACE = /^[a-z](?:[a-z0-9]|_(?!_))*$/;
const RUN_NAME = /^[a-z][a-z0-9_]*$/;

/** A run's place in a document: its namespace and its name there. */
export interface RunName {
    readonly namespace: string;
    readonly as: string;
}

/**
 * Where a run id goes in a document (spec 4.3 rule 1, 4.5).
 * @param id - The run id.
 * @param derived - Whether the element minted it.
 * @returns The namespace and `as`, or undefined for an id a document cannot spell.
 */
export function runNameOf(id: RunId, derived: boolean): RunName | undefined {
    const at = id.indexOf("__");
    const [namespace, as] =
        at < 0 ? [derived ? SESSION_NAMESPACE : READER_NAMESPACE, id] : [id.slice(0, at), id.slice(at + 2)];
    const fits =
        namespace.length <= 32 &&
        NAMESPACE.test(namespace) &&
        !namespace.endsWith("_") &&
        as.length <= 64 &&
        RUN_NAME.test(as) &&
        !as.includes("__");
    return fits ? { namespace, as } : undefined;
}

/**
 * The run id a document's namespace and `as` stand for: the inverse of {@link runNameOf}.
 * @param name - The namespace and `as`.
 * @returns The id.
 */
export function runIdOf(name: RunName): RunId {
    return name.namespace === SESSION_NAMESPACE || name.namespace === READER_NAMESPACE
        ? name.as
        : `${name.namespace}__${name.as}`;
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
    // Number() reads "Infinity", "-Infinity", "NaN" and a decimal string.
    return numeric && typeof value === "string" && value.trim() !== "" ? Number(value) : value;
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

/** The positions the last open restored with rerun off, so a layout the recipe sets after them keeps them. */
const RESTORED = projectMemory<readonly { id: NodeId; x: number; y: number; z: number }[]>();

/**
 * The positions an open's results section restored with rerun off (spec 8.4: restored as they
 * are), for the recipe to put back after it sets the layout, as version 1 does.
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

/** What starting a saved run takes: its algorithm, params, seed, scope and caveats. */
interface SavedStart {
    readonly algorithm: string;
    readonly params: Record<string, unknown>;
    readonly seed: unknown;
    readonly scope: unknown;
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
 * The scope a run ran over, as caveats record it, or undefined for one that names elements no
 * reference can hold.
 * @param run - The run.
 * @param refs - The element references.
 * @returns The scope.
 */
function scopeOut(run: Run, refs: ElementRefs): unknown {
    const { spec } = run.record.scope;
    if (typeof spec === "string" || "set" in spec || "where" in spec) {
        return spec;
    }

    if ("nodes" in spec) {
        const nodes = spec.nodes.map((id) => refs.nodeRef(id));
        return nodes.includes(undefined) ? undefined : { nodes };
    }

    // ponytail: a `{ define }` scope is left to the view's run record; carry it here once a set
    // definition's element members are written as references.
    return undefined;
}

/**
 * One half of a run's outputs as columns (spec 4.5 rule 2).
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
 * One algorithm run as a results section holds it (spec 4.5 rule 1).
 * @param run - The run.
 * @param result - Its result.
 * @param name - Its namespace and `as`.
 * @param context - The save.
 * @param ids - The graph's node and edge ids.
 * @returns The entry.
 */
function runOut(run: Run, result: RunResult, name: RunName, context: WriteContext, ids: GraphIds): JsonObject {
    const refs = context.refs();
    const { record } = run;
    const left: string[] = [];
    const params = paramsOut(run, refs, descriptorOf(context.session, run.algorithm), left);
    const key = `${name.namespace}__${name.as}`;
    for (const option of left) {
        context.problems.push({
            code: "W_ELEMENT_NAMING_LEFT_OUT",
            params: { section: "results", pointer: `/runs/${token(key)}/params/${token(option)}` },
        });
    }

    const plugin = record.engine.plugins?.[run.algorithm];
    const scope = scopeOut(run, refs);
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
        namespace: name.namespace,
        as: name.as,
        algorithm: run.algorithm,
        params,
        engine:
            plugin === undefined
                ? { name: "@graphty/algorithms", version: record.engine.algorithms }
                : { name: run.algorithm, version: plugin },
        seed: record.seed,
        durationMs: record.durationMs ?? 0,
        fields: result.fields.map((field) => ({ name: field.name, domain: field.kind, type: field.type })),
        caveats: encode({ ...record.caveats, ...(scope === undefined ? {} : { scope }) }),
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
 * The layout run (spec 4.5 rule 3), or undefined when no node is placed.
 * @param context - The save.
 * @returns The entry.
 */
function layoutOut(context: WriteContext): JsonObject | undefined {
    const { session } = context;
    const now = session.positions.snapshot();
    const kept = keptOf(session).layout;
    if (kept !== undefined && samePositions(kept, now)) {
        return kept.entry;
    }

    const refs = context.refs();
    const nodeRefs: unknown[] = [];
    const position: number[][] = [];
    now.order.forEach((id, at) => {
        const xyz = [now.xyz[at * 3], now.xyz[at * 3 + 1], now.xyz[at * 3 + 2]];
        const ref = refs.nodeRef(id);
        if (ref !== undefined && xyz.every((value) => Number.isFinite(value))) {
            nodeRefs.push(ref);
            position.push(xyz);
        }
    });
    if (nodeRefs.length === 0) {
        return undefined;
    }

    const { layout } = session;
    const { seed } = layout.options;
    return {
        id: layout.id,
        // The engines ship inside graphty-element, so its version fixes theirs.
        engine: { name: layout.engine, version: ENGINE_VERSIONS.element },
        dimension: layout.dimension === "2d" ? 2 : 3,
        options: encode(layout.options),
        seed: Number.isInteger(seed) ? seed : null,
        nodes: { refs: nodeRefs, columns: { position } },
    };
}

/**
 * Write the session's finished runs and its layout.
 * @param context - The save.
 * @returns The body.
 */
function writeRuns(context: WriteContext): JsonObject {
    const { session } = context;
    const kept = keptOf(session);
    const ids = graphIdsOf(session);
    const runs: JsonObject = {};
    const live = new Set<string>();
    for (const run of session.runs.list()) {
        const { result } = run;
        if (run.status !== "succeeded" || result === undefined) {
            continue;
        }

        const name = runNameOf(run.id, context.isDerived(run.id));
        if (name === undefined) {
            context.problems.push({ code: "W_RUN_NOT_RUN", params: { run: run.id } });
            continue;
        }

        const key = `${name.namespace}__${name.as}`;
        const restored = kept.runs.get(key);
        live.add(key);
        runs[key] = restored?.result === result ? restored.entry : runOut(run, result, name, context, ids);
    }

    // A run an open could not restore (an algorithm this session lacks) is written back as read.
    for (const [key, restored] of kept.runs) {
        if (restored.result === undefined && !live.has(key)) {
            runs[key] = restored.entry;
        }
    }

    const layout = layoutOut(context);
    if (layout !== undefined) {
        runs.layout = layout;
    }

    return { runs };
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
        params: { section: "results", pointer: `${reading.section.pointer}${pointer}`, ref: canonicalJson(ref) },
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
        const kind = field.domain as FieldDescriptor["kind"];
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
 * @param key - The run's key.
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
 * The scope a saved run ran over, bound, or undefined when its caveats record none this reader
 * can bind.
 * @param reading - The open.
 * @param scope - `caveats.scope` as the file holds it.
 * @returns The scope.
 */
function scopeIn(reading: Reading, scope: unknown): unknown {
    if (typeof scope === "string" || (isJsonObject(scope) && ("set" in scope || "where" in scope))) {
        return scope;
    }

    if (isJsonObject(scope) && Array.isArray(scope.nodes)) {
        const nodes = scope.nodes.map((ref: unknown) => reading.refs.node(ref));
        return nodes.includes(undefined) ? undefined : { nodes };
    }

    return undefined;
}

/**
 * Whether two values agree: numbers within a relative 1e-9, NaN equal to NaN, anything else as
 * canonical JSON.
 * @param a - One.
 * @param b - The other.
 * @returns True when they agree.
 */
function agree(a: unknown, b: unknown): boolean {
    if (typeof a === "number" && typeof b === "number") {
        return Object.is(a, b) || Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));
    }

    return canonicalJson(a) === canonicalJson(b);
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

        const [a, b] = [canonicalJson(was), canonicalJson(now ?? null)];
        const ok = (forward.get(a) ?? b) === b && (backward.get(b) ?? a) === a;
        forward.set(a, b);
        backward.set(b, a);
        return ok;
    });
}

/**
 * Whether a rerun disagrees with the saved outputs (spec 8.4).
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
 * Whether a recipe step or a view run record in the same open stands for the run (spec 4.5 rule 4).
 * @param context - The open.
 * @param name - The run's namespace and `as`.
 * @returns True when one does: that section starts the run.
 */
function startedElsewhere(context: ReadContext, name: RunName): boolean {
    const recipe = context.other("recipe")?.body;
    if (
        recipe?.namespace === name.namespace &&
        Array.isArray(recipe.commands) &&
        recipe.commands.some((command) => isJsonObject(command) && command.op === "algo.run" && command.as === name.as)
    ) {
        return true;
    }

    const viewRuns = context.other("view")?.body.runs;
    return (
        isJsonObject(viewRuns) &&
        Object.values(viewRuns).some(
            (record) => isJsonObject(record) && record.namespace === name.namespace && record.as === name.as,
        )
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
 * Start a run from its saved record, under the scope and seed it recorded.
 * @param context - The open.
 * @param id - The run.
 * @param start - The algorithm, params, seed, scope and caveats.
 * @returns The run.
 */
function startSaved(context: ReadContext, id: RunId, start: SavedStart): Run {
    const { caveats } = start;
    return context.tx.runs.start(start.algorithm, start.params, {
        as: id,
        style: false,
        ...(start.scope === undefined ? {} : { scope: start.scope as never }),
        ...(Number.isInteger(start.seed) ? { seed: start.seed as number } : {}),
        ...(caveats.exact === false && typeof caveats.sampleSize === "number" ? { sample: caveats.sampleSize } : {}),
    });
}

/**
 * With rerun on: run a saved run again and report whether it agrees with what was saved.
 * @param context - The open.
 * @param id - The run.
 * @param how - What decides it.
 * @param how.elsewhere - Whether the recipe or the view starts it.
 * @param how.bound - Whether its options bound to the data.
 * @param how.start - How to start it.
 * @param how.check - Whether a result disagrees with the saved one.
 */
async function rerunAndCompare(
    context: ReadContext,
    id: RunId,
    how: { elsewhere: boolean; bound: boolean; start: SavedStart; check: (result: RunResult) => boolean },
): Promise<void> {
    if (how.elsewhere) {
        compareWhenEnded(context, id, how.check);
    } else if (how.bound) {
        if (how.check(await startSaved(context, id, how.start))) {
            context.problems.push({ code: "W_RESULTS_DIFFER", params: { run: id } });
        }
    } else {
        context.problems.push({ code: "W_RUN_NOT_RUN", params: { run: id } });
    }
}

/**
 * Read one algorithm run: restore it (rerun off) or keep it to compare (rerun on).
 * @param reading - The open.
 * @param key - The run's key.
 * @param entry - The run as the file holds it.
 */
async function readRun(reading: Reading, key: string, entry: JsonObject): Promise<void> {
    const { context } = reading;
    const kept = keptOf(context.session).runs;
    const name =
        typeof entry.namespace === "string" && typeof entry.as === "string"
            ? runNameOf(`${entry.namespace}__${entry.as}`, false)
            : undefined;
    const descriptor = typeof entry.algorithm === "string" ? descriptorOf(context.session, entry.algorithm) : undefined;
    if (name === undefined || descriptor === undefined) {
        kept.set(key, { entry, result: undefined });
        context.problems.push({ code: "W_RUN_NOT_RUN", params: { run: key } });
        return;
    }

    const id = runIdOf(name);
    const fields = fieldsIn(entry.fields, descriptor);
    const numeric = (kind: string) => (field: string) =>
        fields.some((each) => each.name === field && each.kind === kind && ["number", "integer"].includes(each.type));
    const at = `/runs/${token(key)}`;
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
    const { scope: savedScope, ...rest } = isJsonObject(entry.caveats) ? entry.caveats : {};
    const caveats = { facts: [], ...rest } as unknown as Caveats;
    const { params, bound } = paramsIn(reading, key, entry.params, descriptor);
    const start = {
        algorithm: descriptor.key,
        params,
        seed: entry.seed,
        scope: scopeIn(reading, savedScope),
        caveats: rest,
    };
    const elsewhere = startedElsewhere(context, name);

    if (context.rerun) {
        const check = (result: RunResult): boolean => differs({ outputs, graph, fields }, result);
        await rerunAndCompare(context, id, { elsewhere, bound, start, check });
        return;
    }

    const result = createRunResult({
        runId: id,
        shape: descriptor.shape,
        fields,
        // ponytail: a version 2 file does not record how many elements the run measured; the bound
        // outputs stand in for it.
        measured: { nodes: outputs.nodes.length, edges: outputs.edges.length },
        graph,
        nodes: outputs.nodes,
        edges: outputs.edges,
        caveats,
        durationMs: typeof entry.durationMs === "number" ? entry.durationMs : 0,
    });
    const outcome: RunOutcome = { result, summary: result.summary(), caveats, fields };
    kept.set(key, { entry, result });
    context.restored.add("runs");
    if (elsewhere) {
        // The recipe or the view starts it, after this section; the outcome waits for it.
        context.canned.set(id, outcome);
        return;
    }

    if (!bound) {
        context.problems.push({ code: "W_RUN_NOT_RUN", params: { run: id } });
        return;
    }

    context.canned.set(id, outcome);
    try {
        await startSaved(context, id, start);
    } finally {
        context.canned.delete(id);
    }

    // Marked once the run exists: the element marks only a run it holds.
    if (name.namespace === SESSION_NAMESPACE) {
        context.restoreDerived(id);
    }
}

/**
 * Read the layout run: with rerun off, put every bound node where it was saved.
 * @param reading - The open.
 * @param entry - The run as the file holds it.
 */
async function readLayout(reading: Reading, entry: JsonObject): Promise<void> {
    const { context } = reading;
    const half = isJsonObject(entry.nodes) ? entry.nodes : {};
    const refs = Array.isArray(half.refs) ? (half.refs as unknown[]) : [];
    const position = isJsonObject(half.columns) && Array.isArray(half.columns.position) ? half.columns.position : [];
    const placed: { id: NodeId; x: number; y: number; z: number }[] = [];
    refs.forEach((ref, row) => {
        const id = reading.refs.node(ref);
        const xyz = (Array.isArray(position[row]) ? (position[row] as unknown[]) : []).map((value) =>
            decode(value, true),
        );
        if (id === undefined) {
            unbound(reading, `/runs/layout/nodes/refs/${row}`, ref);
        } else if (xyz.length === 3 && xyz.every((value) => Number.isFinite(value))) {
            const [x, y, z] = xyz as number[];
            placed.push({ id, x, y, z });
        }
    });
    if (context.rerun || placed.length === 0) {
        RESTORED.delete(context.session);
        return;
    }

    await context.tx.positions.set(placed);
    RESTORED.set(context.session, placed);
    context.restored.add("arrangement");
    keptOf(context.session).layout = { entry, ...context.session.positions.snapshot() };
}

/**
 * Report `W_DATA_CHANGED` when the data the results were written on has changed since (spec 6.4).
 * @param section - The section.
 * @param context - The open.
 */
async function checkFingerprint(section: ReadSection, context: ReadContext): Promise<void> {
    const saved = section.header.bindsTo;
    // Compared with the data section as read when this open loaded one, not the session rebuilt
    // from it: a section written on exactly that data matches, whatever this writer would derive.
    const data = context.other("data");
    const now = data === undefined ? await dataBindingOf(context.session) : bindingOfBody(data.body);
    if (saved?.fingerprint === now.fingerprint) {
        return;
    }

    const was = saved?.sources ?? {};
    const sources = [...new Set([...Object.keys(was), ...Object.keys(now.sources)])]
        .filter((source) => was[source] !== now.sources[source])
        .sort((a, b) => a.localeCompare(b));
    // ponytail: the element has no way to mark a restored run stale; the report is all a reader
    // sees. An empty list means settings, types or joins changed.
    const problem: DocumentProblem = {
        code: "W_DATA_CHANGED",
        params: { section: "results", sources: canonicalJson(sources) },
    };
    context.problems.push(problem);
}

/** The `graphty-results` section, version 2. */
export const resultsCodec: SectionCodec = {
    section: "results",
    version: 2,
    reads: [2],
    bound: true,
    members: ["runs"],
    write(context) {
        return Promise.resolve({ body: writeRuns(context) });
    },
    async read(section, context) {
        await checkFingerprint(section, context);
        const kept = keptOf(context.session);
        kept.runs.clear();
        kept.layout = undefined;
        const reading: Reading = { section, context, refs: context.refs() };
        const runs = isJsonObject(section.body.runs) ? section.body.runs : {};
        for (const [key, entry] of Object.entries(runs)) {
            if (!isJsonObject(entry)) {
                context.problems.push({ code: "W_RUN_NOT_RUN", params: { run: key } });
            } else if (key === "layout") {
                await readLayout(reading, entry);
            } else {
                await readRun(reading, key, entry);
            }
        }
    },
};
