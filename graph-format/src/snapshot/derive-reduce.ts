/**
 * Reducing the edge attribute columns of merged edges (design section 7.3): the per-column
 * `edgeReducers` of `simplified` and `contract`, and the `count` multiplicity column.
 */

import { bitmapClear, makeBitmap } from "../columns/bitmap.js";
import { createColumn, emptyParts, resolveColumnMeta } from "../columns/column.js";
import { gatherColumn, gatherTable, remapTable } from "../columns/remap.js";
import { AttributeTable as AttributeTableClass } from "../columns/table.js";
import { INVALID_INDEX } from "../constants.js";
import { GraphFormatError } from "../errors.js";
import {
    type AttributeTable,
    type Column,
    type ColumnReducer,
    type EdgeListView,
    type F64,
    type GraphSnapshot,
    type TypedArrayData,
    type U32,
    type WeightReducer,
} from "../types/index.js";
import {
    assembleParts,
    buildCore,
    type DerivedParts,
    type EdgeGrouping,
    gatherEndpoints,
    reduceWeights,
    remapExtensions,
} from "./derived.js";

// ============================================================ column reduction

/** The five flat numeric column shapes the group reducers accumulate. */
type NumericColumn = Extract<Column, { dtype: "f32" | "f64" | "i32" | "u32" | "u8" }>;

/**
 * Fold one source row of `width` components into its group's accumulator row.
 * @param acc - the accumulators
 * @param at - the group row's first accumulator
 * @param source - the source column data
 * @param from - the source row's first value
 * @param width - the components per row
 * @param reducer - the reducer, or null for the group's first member (its values are copied)
 */
function foldNumericRow(
    acc: F64,
    at: number,
    source: ArrayLike<number>,
    from: number,
    width: number,
    reducer: "sum" | "min" | "max" | "mean" | null,
): void {
    for (let k = 0; k < width; k++) {
        const value = source[from + k];
        if (reducer === null) {
            acc[at + k] = value;
            continue;
        }
        switch (reducer) {
            case "sum":
            case "mean":
                acc[at + k] += value;
                break;
            case "min":
                if (value < acc[at + k]) {
                    acc[at + k] = value;
                }
                break;
            case "max":
                if (value > acc[at + k]) {
                    acc[at + k] = value;
                }
                break;
            default: {
                const unknown: never = reducer;
                throw new GraphFormatError("E_UNSUPPORTED", `unknown reducer ${String(unknown)}`, {
                    reducer: unknown,
                });
            }
        }
    }
}

/**
 * Turn the per-group sums into means (a group of one keeps its value as is).
 * @param acc - the accumulators, `width` per group
 * @param members - the set members per group
 * @param width - the components per row
 */
function divideByMembers(acc: F64, members: U32, width: number): void {
    for (let d = 0; d < members.length; d++) {
        if (members[d] > 1) {
            for (let k = 0; k < width; k++) {
                acc[d * width + k] /= members[d];
            }
        }
    }
}

/**
 * The accumulators as column data of the result dtype.
 * @param acc - the f64 accumulators
 * @param dtype - the result dtype
 * @returns the data (acc itself for f64; a 4-byte padded buffer for u8)
 */
function narrowAccumulator(acc: F64, dtype: NumericColumn["dtype"]): TypedArrayData {
    switch (dtype) {
        case "f64":
            return acc;
        case "f32":
            return new Float32Array(acc);
        case "i32":
            return new Int32Array(acc);
        case "u32":
            return new Uint32Array(acc);
        case "u8": {
            const data = new Uint8Array(new ArrayBuffer(Math.ceil(acc.length / 4) * 4), 0, acc.length);
            data.set(acc);
            return data;
        }
        default: {
            const unknown: never = dtype;
            throw new GraphFormatError("E_COLUMN_TYPE", `cannot reduce a ${String(unknown)} column`, {
                dtype: unknown,
            });
        }
    }
}

/**
 * A group reducer's numeric accumulation for one column into a new row space.
 * @param column - a numeric column
 * @param grouping - the grouping (remap non-null)
 * @param reducer - sum / min / max / mean
 * @returns the reduced column
 */
function reduceNumericColumn(
    column: NumericColumn,
    grouping: EdgeGrouping,
    reducer: "sum" | "min" | "max" | "mean",
): Column {
    const { count, remap } = grouping;
    const { components } = column.meta;
    const width = components;
    const acc = new Float64Array(count * width);
    const members = new Uint32Array(count);
    const seen = new Uint8Array(count);
    const source = column.data;
    const rows = remap === null ? column.length : remap.length;
    for (let r = 0; r < rows; r++) {
        const d = remap === null ? r : remap[r];
        if (d === INVALID_INDEX || !column.isSet(r)) {
            continue;
        }
        members[d]++;
        foldNumericRow(acc, d * width, source, r * width, width, seen[d] === 0 ? null : reducer);
        seen[d] = 1;
    }
    if (reducer === "mean") {
        divideByMembers(acc, members, width);
    }
    // "mean" is f64; a "sum" over an integer dtype widens to f64 too, so a total can never wrap
    // silently in a typed array that every write path would have refused (design section 5.1)
    const widen = reducer === "mean" || (reducer === "sum" && column.dtype !== "f32" && column.dtype !== "f64");
    const dtype = widen ? "f64" : column.dtype;
    const data = narrowAccumulator(acc, dtype);
    let validity: U32 | null = null;
    let nullCount = 0;
    for (let d = 0; d < count; d++) {
        if (seen[d] === 0) {
            validity ??= makeBitmap(count, true);
            bitmapClear(validity, d);
            nullCount++;
        }
    }
    const meta = resolveColumnMeta(column.meta.name, column.meta.domain, {
        dtype,
        components,
        nullable: column.meta.nullable || nullCount > 0,
        role: column.meta.role ?? undefined,
        extra: column.meta.extra,
    });
    return createColumn({ ...emptyParts(meta, count, validity), data, nullCount });
}

/**
 * The u32 column of group sizes ("count").
 * @param column - the source column (name, domain, role and extra are kept)
 * @param grouping - the grouping
 * @returns the count column
 */
function countColumn(column: Column, grouping: EdgeGrouping): Column {
    const { count, remap } = grouping;
    const sizes = new Uint32Array(count);
    if (remap === null) {
        sizes.fill(1);
    } else {
        for (let r = 0; r < remap.length; r++) {
            if (remap[r] !== INVALID_INDEX) {
                sizes[remap[r]]++;
            }
        }
    }
    const meta = resolveColumnMeta(column.meta.name, column.meta.domain, {
        dtype: "u32",
        nullable: false,
        role: column.meta.role ?? undefined,
        extra: column.meta.extra,
    });
    return createColumn({ ...emptyParts(meta, count, null), data: sizes });
}

/**
 * Reduce one column over a grouping with a ColumnReducer (design section 7.3): `"first"` / `"last"`
 * gather the lowest / highest member's row (any dtype), `"count"` yields the group sizes, `"sum"` /
 * `"min"` / `"max"` / `"mean"` combine the set members of a numeric column (`"mean"` as f64, and so
 * is a `"sum"` over an i32 / u32 / u8 column, which would otherwise wrap; `"min"` / `"max"` keep
 * the dtype since the result is a member), `"drop"` omits the column. Index-valued (refersTo)
 * columns are always dropped: their values would refer to the source space.
 * @param column - the source column
 * @param grouping - the grouping
 * @param reducer - the reducer
 * @returns the reduced column, or null to drop it; E_COLUMN_TYPE for a numeric reducer on a non-numeric column
 */
export function reduceColumn(column: Column, grouping: EdgeGrouping, reducer: ColumnReducer): Column | null {
    if (reducer === "drop" || column.meta.refersTo !== null) {
        return null;
    }
    const { count, remap, origin } = grouping;
    switch (reducer) {
        case "first":
            return origin === null ? column : gatherColumn(column, origin);
        case "last": {
            if (remap === null) {
                return column;
            }
            const last = new Uint32Array(count);
            for (let r = 0; r < remap.length; r++) {
                if (remap[r] !== INVALID_INDEX) {
                    last[remap[r]] = r;
                }
            }
            return gatherColumn(column, last);
        }
        case "count":
            return countColumn(column, grouping);
        case "sum":
        case "min":
        case "max":
        case "mean": {
            const { dtype } = column;
            switch (dtype) {
                case "f32":
                case "f64":
                case "i32":
                case "u32":
                case "u8":
                    return reduceNumericColumn(column, grouping, reducer);
                case "bool":
                case "dict":
                case "string":
                case "list":
                case "json":
                    throw new GraphFormatError(
                        "E_COLUMN_TYPE",
                        `reducer "${reducer}" needs a numeric column; "${column.meta.name}" is ${dtype}`,
                        { column: column.meta.name, dtype, reducer },
                    );
                default: {
                    const unknown: never = dtype;
                    throw new GraphFormatError("E_COLUMN_TYPE", `unknown dtype ${String(unknown)}`, { dtype: unknown });
                }
            }
        }
        default: {
            const unknown: never = reducer;
            throw new GraphFormatError("E_UNSUPPORTED", `unknown column reducer ${String(unknown)}`, {
                reducer: unknown,
            });
        }
    }
}

/**
 * The edge table of a merging derived graph: named columns reduced per `reducers`, every other column
 * gathered from the survivor's row (the default of design section 5.11), refersTo values rewritten.
 * @param source - the source snapshot
 * @param grouping - the edge grouping
 * @param reducers - per-column reducers, or undefined for survivor rows throughout
 * @param nodeRemap - the node remap for refersTo node columns, or null
 * @returns the new edge table (the source table when the edge space is unchanged and no reducer applies)
 */
export function reduceEdgeTable(
    source: GraphSnapshot,
    grouping: EdgeGrouping,
    reducers: Readonly<Partial<Record<string, ColumnReducer>>> | undefined,
    nodeRemap: U32 | null,
): AttributeTable {
    const refs = { node: nodeRemap, edge: grouping.remap };
    if (reducers === undefined || Object.keys(reducers).length === 0) {
        if (grouping.origin === null) {
            return nodeRemap === null ? source.edges : remapTable(source.edges, null, source.edgeCount, refs);
        }
        return gatherTable(source.edges, grouping.origin, refs);
    }
    const columns: Column[] = [];
    for (const column of source.edges) {
        const reducer = reducers[column.meta.name];
        if (reducer === undefined) {
            const gathered = grouping.origin === null ? column : gatherColumn(column, grouping.origin);
            columns.push(gathered);
            continue;
        }
        const reduced = reduceColumn(column, grouping, reducer);
        if (reduced !== null) {
            columns.push(reduced);
        }
    }
    const table = new AttributeTableClass({ domain: "edge", rowCount: grouping.count, columns });
    return remapTable(table, null, grouping.count, refs);
}

/**
 * The derived graph over the same node space whose edges are the survivors of an edge grouping
 * (`filterEdges`, `withoutSelfLoops`, `toUndirected`, `simplified`): weights folded by `reducer`,
 * edge columns by `edgeReducers`, node table and id map shared.
 * @param source - the source snapshot
 * @param list - the source edge list
 * @param grouping - which edges survive and which merge into them
 * @param directed - whether the derived graph is directed
 * @param reducer - how merged weights combine
 * @param edgeReducers - per-column reducers of merged edges, or undefined
 * @returns the derived parts
 */
export function deriveGroupedEdges(
    source: GraphSnapshot,
    list: EdgeListView,
    grouping: EdgeGrouping,
    directed: boolean,
    reducer: WeightReducer,
    edgeReducers: Readonly<Partial<Record<string, ColumnReducer>>> | undefined,
): DerivedParts {
    const { nodeCount } = source;
    const { src, dst } = gatherEndpoints(list, grouping, null);
    const weights = reduceWeights(list.weights, grouping, reducer);
    const core = buildCore({ directed, nodeCount, edgeCount: grouping.count, src, dst, weights });
    const edges = reduceEdgeTable(source, grouping, edgeReducers, null);
    const parts = assembleParts(source, core, {
        directed,
        nodeCount,
        edgeCount: grouping.count,
        ids: source.ids,
        nodes: source.nodes,
        edges,
        extensions: remapExtensions(source, null, grouping.remap),
    });
    return {
        parts,
        nodeOrigin: null,
        edgeOrigin: grouping.origin,
        nodeRemap: null,
        edgeRemap: grouping.remap,
        blockSizes: null,
        report: { droppedEdges: grouping.dropped, mergedEdges: grouping.merged },
    };
}
