/**
 * Candidate explaining columns: the snapshot's attributes and the graph's degrees, which the planner tests as
 * explanations of a file's per-element style values, and the fingerprint that ties styles to their graph.
 */

import type { GraphSnapshot } from "@graphty/graph-format";

import type { ColumnRef, Scalar, StyleFeature, StyleFingerprint, StyleTarget } from "../types.js";
import { dataCell, degreeValues } from "./resolve.js";

/** Column types whose values can be features: one scalar per element. */
const SCALAR_DTYPES: ReadonlySet<string> = new Set(["string", "dict", "bool", "i32", "u32", "u8", "f32", "f64"]);
/** Coordinates say where the writer put a node, not what it is. */
const COORDINATE = /^(?:x|y|z|_pos)$/i;
/** The column holding the group a node sits in. */
const PARENT_COLUMN = "graphty.parent";
/** An integer column of at least this many values that fills a whole range is an index, not a quantity. */
const MIN_INDEX = 8;

/**
 * The candidate explaining columns of one target: every scalar attribute (the reserved `graphty.*` columns,
 * coordinates and Cytoscape's selection state excepted), the group a node sits in as the style column `group`, and
 * for nodes the degree (and the in- and out-degree of a directed graph) as `{ computed }` references, which follow
 * later edits of the graph.
 * @param snapshot - the graph
 * @param target - nodes or edges
 * @returns the features, in column order with the degrees last
 * @category Styles
 */
export function featuresOf(snapshot: GraphSnapshot, target: StyleTarget): StyleFeature[] {
    const table = target === "node" ? snapshot.nodes : snapshot.edges;
    const n = target === "node" ? snapshot.nodeCount : snapshot.edgeCount;
    const out: StyleFeature[] = [];
    for (const name of table.names()) {
        if ((name.startsWith("graphty.") && name !== PARENT_COLUMN) || name === "selected" || COORDINATE.test(name)) {
            continue;
        }
        const col = table.get(name);
        if (col === null || col.meta.role === "position" || !SCALAR_DTYPES.has(col.meta.dtype)) {
            continue;
        }
        if (col.meta.components !== 1) {
            continue;
        }
        const values = new Array<Scalar | null>(n);
        for (let i = 0; i < n; i++) {
            const v = dataCell(table, name, i);
            values[i] = typeof v === "string" || typeof v === "number" || typeof v === "boolean" ? v : null;
        }
        if (name === PARENT_COLUMN) {
            // the group a node sits in, by the group's id: graphty-element keeps no graphty.* column in its records
            if (target !== "node") {
                continue;
            }
            for (let i = 0; i < n; i++) {
                const v = values[i];
                values[i] =
                    typeof v === "number" && v >= 0 && v < snapshot.nodeCount ? String(snapshot.ids.idOf(v)) : null;
            }
            out.push({ ref: { style: "group" }, values });
            continue;
        }
        out.push({ ref: { data: name }, values });
    }
    if (target === "node" && n > 0) {
        const kinds: ("degree" | "indegree" | "outdegree")[] = snapshot.directed
            ? ["degree", "indegree", "outdegree"]
            : ["degree"];
        for (const k of kinds) {
            out.push({ ref: { computed: k }, values: degreeValues(snapshot, k) });
        }
    }
    return out;
}

/**
 * The fingerprint of a graph: its node and edge counts and a hash of its node ids' text, whatever their order (a
 * format may read nodes back in another order). The id 7 and the id "7" hash alike, so a graph written to a format
 * that reads its ids back as text (or as numbers) keeps its fingerprint.
 * @param snapshot - the graph
 * @returns the fingerprint
 * @category Styles
 */
export function styleFingerprint(snapshot: GraphSnapshot): StyleFingerprint {
    // two FNV-1a hashes with different seeds over each id's text, summed: the sum does not depend on the order
    let h1 = 0;
    let h2 = 0;
    for (let i = 0; i < snapshot.nodeCount; i++) {
        const text = String(snapshot.ids.idOf(i));
        let a = 0x811c9dc5;
        let b = 0x01000193 ^ 0x5bd1e995;
        for (let c = 0; c < text.length; c++) {
            const code = text.charCodeAt(c);
            a = Math.imul(a ^ code, 0x01000193);
            b = Math.imul(b ^ code, 0x01000193) ^ (b >>> 13);
        }
        h1 = (h1 + (a >>> 0)) >>> 0;
        h2 = (h2 + (b >>> 0)) >>> 0;
    }
    const hex = (h: number): string => (h >>> 0).toString(16).padStart(8, "0");
    return {
        nodes: snapshot.nodeCount,
        edges: snapshot.edgeCount,
        heldEdges: heldEdgeRows(snapshot).length,
        ids: hex(h1) + hex(h2),
    };
}

/**
 * The edge rows a file holds, in order: every row but the second half of an undirected edge in a directed graph,
 * which every format writes once.
 * @param snapshot - the graph
 * @returns the rows
 */
export function heldEdgeRows(snapshot: GraphSnapshot): number[] {
    const pair = snapshot.edges.byRole("pair");
    const rows: number[] = [];
    for (let e = 0; e < snapshot.edgeCount; e++) {
        if (!(pair?.isSet(e) === true && (pair.value(e) as number) < e)) {
            rows.push(e);
        }
    }
    return rows;
}

/**
 * A feature's name in rule ids: the column's name, the generated key or the degree's name.
 * @param ref - the column
 * @returns its name
 */
function featureName(ref: ColumnRef): string {
    if ("style" in ref) {
        return ref.style;
    }
    if ("computed" in ref) {
        return ref.computed;
    }
    return (ref as { data: string }).data;
}

/**
 * What the planner knows about a feature.
 */
export interface FeatureInfo {
    /** The feature. */
    readonly feature: StyleFeature;
    /** Its name in rule ids. */
    readonly name: string;
    /** Distinct non-null values. */
    readonly distinct: number;
    /** Whether a table on it may explain styles (strings, booleans, integers). */
    readonly categorical: boolean;
    /** Whether a ramp on it may explain styles (finite numbers that are not an index). */
    readonly numeric: boolean;
    /** Whether it is the file's own raw style column, which explains nothing. */
    readonly raw: boolean;
}

/**
 * Describes a feature for the planner.
 * @param feature - the feature
 * @param raw - whether it is the raw style column a reader read
 * @returns what the planner knows about it
 */
export function describeFeature(feature: StyleFeature, raw: boolean): FeatureInfo {
    const seen = new Set<string>();
    let categorical = true;
    let numeric = true;
    let integers = true;
    let lo = Infinity;
    let hi = -Infinity;
    let count = 0;
    for (const v of feature.values) {
        if (v === null) {
            continue;
        }
        count++;
        seen.add(`${typeof v}:${String(v)}`);
        if (typeof v === "number") {
            if (!Number.isFinite(v)) {
                numeric = false;
                categorical = false;
                continue;
            }
            if (!Number.isInteger(v)) {
                integers = false;
                categorical = false;
            }
            if (v < lo) {
                lo = v;
            }
            if (v > hi) {
                hi = v;
            }
        } else {
            numeric = false;
            integers = false;
        }
    }
    const computed = "computed" in feature.ref;
    // an integer column whose values are all different and fill a whole range (0..n-1, a z order) is an index:
    // a ramp on it would only replay the order the writer stored the elements in
    const index =
        !computed && numeric && integers && count >= MIN_INDEX && seen.size === count && hi - lo + 1 === count;
    return {
        feature,
        name: featureName(feature.ref),
        distinct: seen.size,
        categorical: count > 0 && categorical,
        numeric: count > 0 && numeric && !index,
        raw,
    };
}
