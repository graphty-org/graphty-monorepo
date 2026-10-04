/**
 * Compare two snapshots node by node, edge by edge and value by value, for testing a format plugin:
 * read a file, save it, read the saved file back, and compare. Every difference should be one that
 * the save's checkExport() notes announced.
 */

import { type Column, type GraphSnapshot } from "@graphty/graph-format";

/**
 * One difference between two snapshots.
 * @category Plugin helpers
 */
export interface SnapshotDiff {
    /** Where: "directed", "ids[3]", "nodes.label[4]", "edges.weight[0]", "extensions.temporal:node:price.rowCount"... */
    readonly path: string;
    /** The value in the expected snapshot. */
    readonly expected: unknown;
    /** The value in the actual snapshot. */
    readonly actual: unknown;
    /** A one-line description. */
    readonly message: string;
}

/**
 * What compareSnapshots() compares.
 * @category Plugin helpers
 */
export interface CompareOptions {
    /** Column names to skip in every table (format-owned helpers an exporter adds, for instance). */
    readonly ignoreColumns?: readonly string[] | undefined;
    /** Column roles to skip in every table. */
    readonly ignoreRoles?: readonly string[] | undefined;
    /** Whether the actual snapshot may hold columns the expected one lacks (default true). */
    readonly allowExtraColumns?: boolean | undefined;
    /** Whether dtypes must match (default true); false compares values only. */
    readonly dtypes?: boolean | undefined;
    /** Whether roles must match (default true). */
    readonly roles?: boolean | undefined;
    /** Whether origin.type must match (default false). */
    readonly originType?: boolean | undefined;
    /** Absolute tolerance for numeric cell and weight comparisons (default 0: Object.is). */
    readonly tolerance?: number | undefined;
    /** Whether the explicit / defaulted status of weights must match (default true). */
    readonly weightExplicitness?: boolean | undefined;
    /** Whether extension tables are compared (default true). */
    readonly extensions?: boolean | undefined;
    /** Stop after this many differences (default 50). */
    readonly limit?: number | undefined;
}

/**
 * Compare two snapshots: the direction, the node ids, the edges, the weights and every attribute
 * value. Use it to test a format plugin: read a file, save it in your format, read the saved file
 * back, and compare the two graphs. Each difference has a `path` ("ids[3]", "nodes.label[4]",
 * "edges.weight[0]") and a one-line `message`; every one should match a note that `checkExport()`
 * returned for the save.
 * @example
 * ```ts
 * const notes = checkExport(original, "pairs");
 * const readBack = (await importGraph(await exportGraphToString(original, "pairs"), { format: "pairs" })).snapshot;
 * console.log(describeDiffs(compareSnapshots(original, readBack)));
 * ```
 * @param expected - the graph you saved
 * @param actual - the graph read back from the saved file
 * @param options - what to compare
 * @returns the differences, empty when the graphs are the same
 * @category Plugin helpers
 */
export function compareSnapshots(
    expected: GraphSnapshot,
    actual: GraphSnapshot,
    options: CompareOptions = {},
): SnapshotDiff[] {
    const diffs: SnapshotDiff[] = [];
    const limit = options.limit ?? 50;
    const tolerance = options.tolerance ?? 0;
    const ctx: CompareContext = {
        options,
        diff: (path, e, a, message) => {
            diffs.push({
                path,
                expected: e,
                actual: a,
                message: message ?? `${path}: expected ${show(e)}, got ${show(a)}`,
            });
            if (diffs.length >= limit) {
                throw new LimitReached();
            }
        },
        same: (e, a) => valuesEqual(e, a, tolerance),
    };
    try {
        compareGraphs(expected, actual, ctx);
    } catch (err) {
        if (!(err instanceof LimitReached)) {
            throw err;
        }
    }
    return diffs;
}

/** Thrown by the recorder once the limit of differences is reached, to end the walk. */
class LimitReached extends Error {}

/** What every comparison step shares: the options, the recorder and the value comparator. */
interface CompareContext {
    readonly options: CompareOptions;
    /** Records a difference (with a default message); throws LimitReached at the limit. */
    readonly diff: (path: string, e: unknown, a: unknown, message?: string) => void;
    /** Value equality under the tolerance. */
    readonly same: (e: unknown, a: unknown) => boolean;
}

/** A table shape both AttributeTable and extension tables satisfy. */
interface TableLike extends Iterable<Column> {
    readonly rowCount: number;
    names(): readonly string[];
    get(name: string): Column | null;
}

/**
 * Compare two snapshots step by step: the counts, the ids, the topology, the weights, the tables.
 * @param expected - the reference
 * @param actual - the snapshot under test
 * @param ctx - the comparison context
 */
function compareGraphs(expected: GraphSnapshot, actual: GraphSnapshot, ctx: CompareContext): void {
    const { diff } = ctx;
    if (expected.directed !== actual.directed) {
        diff("directed", expected.directed, actual.directed);
    }
    if (expected.nodeCount !== actual.nodeCount) {
        diff("nodeCount", expected.nodeCount, actual.nodeCount);
    }
    if (expected.edgeCount !== actual.edgeCount) {
        diff("edgeCount", expected.edgeCount, actual.edgeCount);
    }
    compareIds(expected, actual, diff);
    if (expected.nodeCount !== actual.nodeCount || expected.edgeCount !== actual.edgeCount) {
        return;
    }
    compareTopology(expected, actual, diff);
    compareWeights(expected, actual, ctx);
    compareTables("nodes", expected.nodes, actual.nodes, ctx);
    compareTables("edges", expected.edges, actual.edges, ctx);
    compareTables("graph", expected.graph, actual.graph, ctx);
    if (ctx.options.extensions !== false) {
        compareExtensions(expected, actual, ctx);
    }
}

/**
 * Compare the node ids in index order.
 * @param expected - the reference
 * @param actual - the snapshot under test
 * @param diff - the recorder
 */
function compareIds(expected: GraphSnapshot, actual: GraphSnapshot, diff: CompareContext["diff"]): void {
    const expectedIds = expected.ids.toArray();
    const actualIds = actual.ids.toArray();
    const n = Math.min(expectedIds.length, actualIds.length);
    for (let i = 0; i < n; i++) {
        if (!Object.is(expectedIds[i], actualIds[i])) {
            diff(`ids[${i}]`, expectedIds[i], actualIds[i]);
        }
    }
}

/**
 * Compare the topology: the CSR arrays (identical when node order and edge order survived), then the
 * orientation of every logical edge.
 * @param expected - the reference
 * @param actual - the snapshot under test, with as many nodes and edges
 * @param diff - the recorder
 */
function compareTopology(expected: GraphSnapshot, actual: GraphSnapshot, diff: CompareContext["diff"]): void {
    if (!typedEqual(expected.rowPtr, actual.rowPtr)) {
        diff("rowPtr", expected.rowPtr, actual.rowPtr, "rowPtr differs");
    }
    if (!typedEqual(expected.colIdx, actual.colIdx)) {
        diff("colIdx", expected.colIdx, actual.colIdx, "colIdx differs");
    }
    const el = expected.edgeList();
    const al = actual.edgeList();
    for (let e = 0; e < expected.edgeCount; e++) {
        if (el.src[e] !== al.src[e] || el.dst[e] !== al.dst[e]) {
            diff(`edge[${e}]`, `${el.src[e]}->${el.dst[e]}`, `${al.src[e]}->${al.dst[e]}`);
        }
    }
}

/**
 * Compare the weights of two snapshots: the exact weight column when both have one, the 32-bit
 * weights otherwise.
 * @param expected - the reference
 * @param actual - the snapshot under test
 * @param ctx - the comparison context
 */
function compareWeights(expected: GraphSnapshot, actual: GraphSnapshot, ctx: CompareContext): void {
    if (expected.flags.weighted !== actual.flags.weighted) {
        ctx.diff("flags.weighted", expected.flags.weighted, actual.flags.weighted);
        return;
    }
    if (!expected.flags.weighted) {
        return;
    }
    const eShadow = expected.edges.byRole("weight");
    const aShadow = actual.edges.byRole("weight");
    if (eShadow !== null && aShadow !== null) {
        compareExactWeights(expected.edgeCount, eShadow, aShadow, ctx);
        return;
    }
    if (ctx.options.weightExplicitness !== false && (eShadow === null) !== (aShadow === null)) {
        ctx.diff(
            "weightColumn",
            eShadow !== null,
            aShadow !== null,
            "one snapshot has a role-weight column, the other does not",
        );
    }
    const ew = expected.edgeList().weights;
    const aw = actual.edgeList().weights;
    for (let e = 0; e < expected.edgeCount; e++) {
        const ev = ew === null ? 1 : ew[e];
        const av = aw === null ? 1 : aw[e];
        if (!ctx.same(ev, av)) {
            ctx.diff(`weight[${e}]`, ev, av);
        }
    }
}

/**
 * Compare the exact weight columns of two snapshots: which edges have an explicit weight, and its value.
 * @param edgeCount - the number of edges
 * @param expected - the reference's weight column
 * @param actual - the weight column under test
 * @param ctx - the comparison context
 */
function compareExactWeights(edgeCount: number, expected: Column, actual: Column, ctx: CompareContext): void {
    for (let e = 0; e < edgeCount; e++) {
        const eSet = expected.isSet(e);
        const aSet = actual.isSet(e);
        if (ctx.options.weightExplicitness !== false && eSet !== aSet) {
            ctx.diff(`weightExplicit[${e}]`, eSet, aSet);
        } else if (eSet && aSet && !ctx.same(expected.value(e), actual.value(e))) {
            ctx.diff(`weight[${e}]`, expected.value(e), actual.value(e));
        }
    }
}

/**
 * Compare the extension tables: which exist, their row counts and their columns.
 * @param expected - the reference
 * @param actual - the snapshot under test
 * @param ctx - the comparison context
 */
function compareExtensions(expected: GraphSnapshot, actual: GraphSnapshot, ctx: CompareContext): void {
    for (const [name, table] of expected.extensions) {
        const other = actual.extensions.get(name);
        if (other === undefined) {
            ctx.diff(`extensions.${name}`, "present", "absent");
        } else if (table.rowCount === other.rowCount) {
            compareTables(`extensions.${name}`, table, other, ctx);
        } else {
            ctx.diff(`extensions.${name}.rowCount`, table.rowCount, other.rowCount);
        }
    }
    if (ctx.options.allowExtraColumns === false) {
        for (const name of actual.extensions.keys()) {
            if (!expected.extensions.has(name)) {
                ctx.diff(`extensions.${name}`, "absent", "present");
            }
        }
    }
}

/**
 * Compare the columns of one table.
 * @param label - the table name for paths
 * @param expected - the reference table
 * @param actual - the table under test
 * @param ctx - the comparison context
 */
function compareTables(label: string, expected: TableLike, actual: TableLike, ctx: CompareContext): void {
    const ignoreNames = new Set(ctx.options.ignoreColumns ?? []);
    const ignoreRoles = new Set(ctx.options.ignoreRoles ?? []);
    // the role-weight shadow column is compared by the weights step, not as a declared column
    const skip = (column: Column): boolean => {
        const { name, role } = column.meta;
        return (
            ignoreNames.has(name) ||
            (role !== null && (ignoreRoles.has(role) || (label === "edges" && role === "weight")))
        );
    };
    for (const column of expected) {
        if (skip(column)) {
            continue;
        }
        const path = `${label}.${column.meta.name}`;
        const other = actual.get(column.meta.name);
        if (other === null) {
            ctx.diff(path, "present", "absent", `${path}: column missing after round trip`);
        } else {
            compareColumn(path, column, other, ctx);
        }
    }
    if (ctx.options.allowExtraColumns === false) {
        for (const column of actual) {
            if (!skip(column) && expected.get(column.meta.name) === null) {
                const path = `${label}.${column.meta.name}`;
                ctx.diff(path, "absent", "present", `${path}: extra column after round trip`);
            }
        }
    }
}

/**
 * Compare one column: its declaration, then every cell.
 * @param path - the column's path for messages
 * @param column - the reference column
 * @param other - the column under test
 * @param ctx - the comparison context
 */
function compareColumn(path: string, column: Column, other: Column, ctx: CompareContext): void {
    compareDeclaration(path, column, other, ctx);
    if (column.length !== other.length) {
        ctx.diff(`${path}.length`, column.length, other.length);
        return;
    }
    for (let r = 0; r < column.length; r++) {
        const eSet = column.isSet(r);
        const aSet = other.isSet(r);
        if (eSet !== aSet) {
            ctx.diff(`${path}[${r}]`, eSet ? column.value(r) : undefined, aSet ? other.value(r) : undefined);
        } else if (eSet) {
            const ev = cellValue(column, r);
            const av = cellValue(other, r);
            if (!ctx.same(ev, av)) {
                ctx.diff(`${path}[${r}]`, ev, av);
            }
        }
    }
}

/**
 * Compare what two columns declare: dtype, item dtype, components, role and origin type, as the
 * options ask.
 * @param path - the column's path for messages
 * @param column - the reference column
 * @param other - the column under test
 * @param ctx - the comparison context
 */
function compareDeclaration(path: string, column: Column, other: Column, ctx: CompareContext): void {
    const { options, diff } = ctx;
    const e = column.meta;
    const a = other.meta;
    if (options.dtypes !== false) {
        for (const key of ["dtype", "itemDtype", "components"] as const) {
            if (e[key] !== a[key]) {
                diff(`${path}.${key}`, e[key], a[key]);
            }
        }
    }
    if (options.roles !== false && e.role !== a.role) {
        diff(`${path}.role`, e.role, a.role);
    }
    const eType = e.origin?.type ?? null;
    const aType = a.origin?.type ?? null;
    if (options.originType === true && eType !== aType) {
        diff(`${path}.origin.type`, eType, aType);
    }
}

/**
 * The comparable value of a set cell: list rows through sliceOf, json rows through values, the
 * typed accessor otherwise (a components > 1 subarray becomes a plain array).
 * @param column - the column
 * @param row - the row
 * @returns the value
 */
function cellValue(column: Column, row: number): unknown {
    switch (column.dtype) {
        case "list":
            return [...column.sliceOf(row)];
        case "json":
            return column.values[row];
        default: {
            const value = column.value(row);
            return ArrayBuffer.isView(value) ? Array.from(value as ArrayLike<number>) : value;
        }
    }
}

/**
 * Deep equality with a numeric tolerance (for the tests).
 * @param e - expected
 * @param a - actual
 * @param tolerance - absolute tolerance for numbers
 * @returns true when equal
 */
export function valuesEqual(e: unknown, a: unknown, tolerance: number): boolean {
    if (typeof e === "number" && typeof a === "number") {
        if (Object.is(e, a)) {
            return true;
        }
        return Number.isFinite(e) && Number.isFinite(a) && Math.abs(e - a) <= tolerance;
    }
    if (Array.isArray(e) || ArrayBuffer.isView(e)) {
        const ea = Array.from(e as ArrayLike<unknown>);
        if (!(Array.isArray(a) || ArrayBuffer.isView(a))) {
            return false;
        }
        const aa = Array.from(a as ArrayLike<unknown>);
        return ea.length === aa.length && ea.every((v, i) => valuesEqual(v, aa[i], tolerance));
    }
    if (typeof e === "object" && e !== null && typeof a === "object" && a !== null) {
        const eo = e as Record<string, unknown>;
        const ao = a as Record<string, unknown>;
        const keys = Object.keys(eo);
        if (keys.length !== Object.keys(ao).length) {
            return false;
        }
        return keys.every((k) => Object.hasOwn(ao, k) && valuesEqual(eo[k], ao[k], tolerance));
    }
    return Object.is(e, a);
}

/**
 * Element-wise equality of two typed arrays.
 * @param a - one array
 * @param b - the other
 * @returns true when same length and contents
 */
function typedEqual(a: ArrayLike<number>, b: ArrayLike<number>): boolean {
    if (a.length !== b.length) {
        return false;
    }
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) {
            return false;
        }
    }
    return true;
}

/**
 * A short text of a value for messages.
 * @param v - the value
 * @returns JSON when possible, else String()
 */
function show(v: unknown): string {
    if (ArrayBuffer.isView(v)) {
        const items = Array.from(v as unknown as ArrayLike<number>);
        return `[${items.slice(0, 8).join(", ")}${items.length > 8 ? ", ..." : ""}]`;
    }
    try {
        const text = JSON.stringify(v);
        return text ?? String(v);
    } catch {
        return String(v);
    }
}

/**
 * The differences compareSnapshots() found, one per line, for printing.
 * @param diffs - the differences
 * @returns one line per difference, "no differences" when empty
 * @category Plugin helpers
 */
export function describeDiffs(diffs: readonly SnapshotDiff[]): string {
    return diffs.length === 0 ? "no differences" : diffs.map((d) => `  - ${d.message}`).join("\n");
}
