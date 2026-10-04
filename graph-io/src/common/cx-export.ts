/**
 * The exporter machinery CX version 1 and CX2 share (design/graph-io/cytoscape-and-obo/design.md
 * sections 1.2 and 1.3): integer node ids (safe integers, or the digits of an integer beyond 2^53
 * written raw), sanitizeIds "mangle" renumbering, edge ids from the id role column, the declared
 * type of a column, the direction notes (every CX edge is directed) and the JSON writer that keeps
 * -0 and raw big integers.
 */

import { type Column, GraphFormatError, type GraphSnapshot, type NodeId } from "@graphty/graph-format";

import { type LossNote } from "../types.js";
import { type PairFolding } from "./direction.js";
import { LOSS } from "./export.js";
import { type ResolvedExportOptions } from "./options.js";
import { agree, plural } from "./plural.js";

/**
 * Records a loss note.
 * @category Plugin helpers
 */
export type CxNoteFn = (code: string, message: string, column?: string | null, count?: number | null) => void;

/**
 * The prefix of a string that stands for a raw number literal in the output: -0 (which
 * JSON.stringify writes as 0) and an integer id beyond 2^53 (kept as its digits).
 */
const RAW = `${String.fromCodePoint(0)}cx:`;

/** A raw literal as JSON.stringify writes it, to be unquoted. */
const RAW_JSON = /"\\u0000cx:(-?\d+)"/g;

/** An integer literal beyond 2^53 as text: a CX id graph-io keeps as its digits. */
const BIG_INTEGER_TEXT = /^-?[1-9]\d{15,}$/;

/**
 * The node ids as written: the original, a renumbered one, or a raw big integer.
 * @category Plugin helpers
 */
export interface WrittenIds {
    /** How many ids were renumbered (sanitizeIds "mangle"). */
    readonly changed: number;
    /**
     * The written id of a node.
     * @param i - the node index
     * @returns a number, or a raw string for a big integer
     */
    idAt(i: number): NodeId;
    /**
     * Whether a node was renumbered.
     * @param i - the node index
     * @returns true when its original goes into graphty:originalId
     */
    isChanged(i: number): boolean;
    /**
     * The original id of a node.
     * @param i - the node index
     * @returns the snapshot's id
     */
    originalAt(i: number): NodeId;
}

/**
 * Whether an id can be written as a CX id unchanged: a safe integer, or the digits of an integer
 * beyond 2^53 (the CX importers read those back as the same digits).
 * @param id - the id
 * @returns true when writable
 */
function writableId(id: NodeId): boolean {
    return typeof id === "number"
        ? Number.isSafeInteger(id)
        : BIG_INTEGER_TEXT.test(id) && !Number.isSafeInteger(Number(id));
}

/**
 * The written node ids; under "error" an id that is not writable throws E_INVALID_ID, under
 * "mangle" it gets the next unused integer.
 * @param snapshot - the snapshot
 * @param mode - the sanitizeIds option
 * @param format - the format's display name, for the message
 * @returns the ids
 */
function writtenIds(snapshot: GraphSnapshot, mode: "error" | "mangle", format: string): WrittenIds {
    const { ids } = snapshot;
    const bad: number[] = [];
    const used = new Set<number>();
    for (let i = 0; i < ids.size; i++) {
        const id = ids.idOf(i);
        if (!writableId(id)) {
            bad.push(i);
        } else if (typeof id === "number") {
            used.add(id);
        }
    }
    if (bad.length > 0 && mode === "error") {
        const first = ids.idOf(bad[0]);
        throw new GraphFormatError(
            "E_INVALID_ID",
            `${bad.length} node id${plural(bad.length)} cannot be written as ${format} integers (first: ${JSON.stringify(first)} at index ${bad[0]}); pass sanitizeIds: "mangle" to rewrite them`,
            { reason: "charset", charset: "integer", count: bad.length, index: bad[0] },
        );
    }
    const renumbered = new Map<number, number>();
    let next = 0;
    for (const i of bad) {
        while (used.has(next)) {
            next++;
        }
        used.add(next);
        renumbered.set(i, next);
    }
    return {
        changed: bad.length,
        idAt: (i: number): NodeId => {
            const id = renumbered.get(i) ?? ids.idOf(i);
            return typeof id === "string" ? `${RAW}${id}` : id;
        },
        isChanged: (i: number): boolean => renumbered.has(i),
        originalAt: (i: number): NodeId => ids.idOf(i),
    };
}

/**
 * The `idCounter` of the node ids as written (the largest id plus one, NDEx's next free id).
 * @param ids - the written ids
 * @param count - the node count
 * @returns the counter: a number, or a raw big integer for stringify()
 * @category Plugin helpers
 */
export function nextNodeId(ids: WrittenIds, count: number): NodeId {
    let max = -1n;
    for (let i = 0; i < count; i++) {
        const id = ids.idAt(i);
        const value = typeof id === "number" ? BigInt(id) : BigInt(id.slice(RAW.length));
        if (value > max) {
            max = value;
        }
    }
    const next = max + 1n;
    return next <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(next) : `${RAW}${next.toString()}`;
}

/**
 * How many node ids are not writable unchanged.
 * @param snapshot - the snapshot
 * @returns the count
 */
function unwritableIds(snapshot: GraphSnapshot): number {
    let count = 0;
    for (let i = 0; i < snapshot.ids.size; i++) {
        if (!writableId(snapshot.ids.idOf(i))) {
            count++;
        }
    }
    return count;
}

/**
 * The id notes and the written ids of a CX export: E_ID_CHARSET (export() throws) or
 * W_ID_MANGLED for the ids that are not integers.
 * @param snapshot - the snapshot
 * @param common - the resolved common options
 * @param format - the format's display name
 * @param attribute - the attribute the originals are kept in
 * @param note - records a note
 * @returns the ids, or the error export() throws
 * @category Plugin helpers
 */
export function planNodeIds(
    snapshot: GraphSnapshot,
    common: ResolvedExportOptions,
    format: string,
    attribute: string,
    note: CxNoteFn,
): WrittenIds | GraphFormatError {
    const unwritable = unwritableIds(snapshot);
    if (unwritable > 0) {
        note(
            common.sanitizeIds === "mangle" ? LOSS.ID_MANGLED : LOSS.ID_CHARSET,
            common.sanitizeIds === "mangle"
                ? `${unwritable} node id${plural(unwritable)} ${agree(unwritable, "is", "are")} not integers, so they are renumbered; the original ids are written to the ${attribute} attribute, and an import with restoreMangledIds: true reads them back`
                : `${unwritable} node id${plural(unwritable)} ${agree(unwritable, "is", "are")} not integers, so the save fails unless sanitizeIds is "mangle"`,
            null,
            unwritable,
        );
    }
    try {
        return writtenIds(snapshot, common.sanitizeIds, format);
    } catch (err) {
        if (err instanceof GraphFormatError) {
            return err;
        }
        throw err;
    }
}

/**
 * The CX type of a scalar dtype.
 * @param dtype - the dtype
 * @param longOrigin - whether the source declared the column long
 * @returns the type text
 */
function scalarType(dtype: string, longOrigin: boolean): string {
    switch (dtype) {
        case "f64":
            return longOrigin ? "long" : "double";
        case "f32":
            return "double";
        case "i32":
        case "u8":
            return "integer";
        case "u32":
            return "long";
        case "bool":
            return "boolean";
        default:
            return "string";
    }
}

/**
 * Whether every set value of an f64 column is integral (so a declared long stays long).
 * @param column - the column
 * @returns true when every set value is a safe integer
 */
function allIntegral(column: Column): boolean {
    for (let i = 0; i < column.length; i++) {
        if (column.isSet(i) && !Number.isSafeInteger(column.value(i))) {
            return false;
        }
    }
    return true;
}

/**
 * The declared CX type of a column: string / double / long / integer / boolean or a list of one;
 * a json column (and a list of json items) is a string holding JSON text.
 * @param column - the column
 * @returns the type text
 * @category Plugin helpers
 */
export function declaredType(column: Column): string {
    const { meta } = column;
    const origin = meta.origin?.type ?? null;
    const longOrigin = origin !== null && origin.endsWith("long") && (meta.dtype !== "f64" || allIntegral(column));
    if (meta.dtype === "list") {
        return meta.itemDtype === null || meta.itemDtype === "json"
            ? "string"
            : `list_of_${scalarType(meta.itemDtype, longOrigin)}`;
    }
    // a multi-component column (a color, a 3D vector) is written as a list of its components
    return meta.components > 1 ? `list_of_${scalarType(meta.dtype, false)}` : scalarType(meta.dtype, longOrigin);
}

/**
 * Count the positions with a non-finite x or y.
 * @param position - the position column
 * @returns the count
 * @category Plugin helpers
 */
export function nonFinitePositions(position: Column): number {
    let count = 0;
    for (let i = 0; i < position.length; i++) {
        if (position.isSet(i)) {
            const p = position.value(i) as ArrayLike<number>;
            if (!Number.isFinite(p[0]) || !Number.isFinite(p[1])) {
                count++;
            }
        }
    }
    return count;
}

/**
 * The edge ids to write: the id role column's values when they are distinct safe integers, next
 * unused integers for edges without one (W_EDGE_IDS_GENERATED).
 * @param snapshot - the snapshot
 * @param note - records a note
 * @returns one id per edge
 * @category Plugin helpers
 */
export function planEdgeIds(snapshot: GraphSnapshot, note: CxNoteFn): number[] {
    const column = snapshot.edges.byRole("id");
    const used = new Set<number>();
    let generated = 0;
    const ids: (number | null)[] = keptEdgeIds(column, snapshot.edgeCount, used);
    let next = 0;
    const out: number[] = [];
    for (let e = 0; e < snapshot.edgeCount; e++) {
        let id = ids[e];
        if (id === null) {
            while (used.has(next)) {
                next++;
            }
            id = next;
            used.add(next);
            generated++;
        }
        out.push(id);
    }
    if (column !== null && generated > 0) {
        note(
            LOSS.EDGE_IDS_GENERATED,
            `${generated} edge${plural(generated)} ${agree(generated, "has", "have")} no distinct integer id in "${column.meta.name}"; they are written with generated ids`,
            column.meta.name,
            generated,
        );
    }
    if (column !== null && column.dtype !== "f64") {
        note(
            LOSS.DTYPE,
            `edge id column "${column.meta.name}" is ${column.dtype}; CX edge ids are integers and read back as f64`,
            column.meta.name,
            snapshot.edgeCount - column.nullCount,
        );
    }
    return out;
}

/**
 * The edge ids an id column can keep: its distinct safe integers (numbers, or text that reads as one).
 * @param column - the edge id column, or null
 * @param edgeCount - the number of edges
 * @param used - receives the kept ids
 * @returns the kept id per edge, null where it cannot be kept
 */
function keptEdgeIds(column: Column | null, edgeCount: number, used: Set<number>): (number | null)[] {
    const ids: (number | null)[] = new Array<number | null>(edgeCount).fill(null);
    if (column === null) {
        return ids;
    }
    for (let e = 0; e < edgeCount; e++) {
        const value = column.isSet(e) ? column.value(e) : undefined;
        const n = typeof value === "number" || typeof value === "string" ? Number(value) : Number.NaN;
        if (Number.isSafeInteger(n) && !used.has(n)) {
            ids[e] = n === 0 ? 0 : n;
            used.add(n);
        }
    }
    return ids;
}

/**
 * The direction notes: every CX edge is directed, so an undirected snapshot (or the undirected
 * pairs of a mixed one, folded under onMixedDirection) is written directed, and a mutual pair as
 * two edges without its mark.
 * @param snapshot - the snapshot
 * @param folding - the pair folding
 * @param common - the resolved common options
 * @param undirectedCode - the format's "undirected written as directed" code
 * @param note - records a note
 * @category Plugin helpers
 */
export function directionNotes(
    snapshot: GraphSnapshot,
    folding: PairFolding,
    common: ResolvedExportOptions,
    undirectedCode: string,
    note: CxNoteFn,
): void {
    if (!snapshot.directed) {
        note(
            undirectedCode,
            `the snapshot is undirected; every edge is written as a directed edge (${snapshot.edgeCount} edge${plural(snapshot.edgeCount)})`,
            null,
            snapshot.edgeCount,
        );
    } else if (common.onMixedDirection !== "error") {
        let undirected = 0;
        for (let e = 0; e < snapshot.edgeCount; e++) {
            if (!folding.folded(e) && !folding.sourceDirected(e)) {
                undirected++;
            }
        }
        if (undirected > 0) {
            note(
                undirectedCode,
                `${undirected} undirected edge${plural(undirected)} ${agree(undirected, "is", "are")} written as one directed edge each (a pair folded to its primary); CX has no undirected edge`,
                null,
                undirected,
            );
        }
    }
    if (folding.mutualCount > 0) {
        note(
            LOSS.MUTUAL_EXPANDED,
            `${folding.mutualCount} mutual pair${plural(folding.mutualCount)} ${agree(folding.mutualCount, "is", "are")} written as two directed edges; the mutual mark is lost`,
            null,
            folding.mutualCount,
        );
    }
}

/**
 * The note recorder of a plan and its notes.
 * @returns the notes and the recorder
 * @category Plugin helpers
 */
export function noteList(): { notes: LossNote[]; note: CxNoteFn } {
    const notes: LossNote[] = [];
    const note: CxNoteFn = (code, message, column = null, count = null) => {
        notes.push(Object.freeze({ code, message, column, count }));
    };
    return { notes, note };
}

/**
 * The JSON text of a value, keeping -0 and writing the raw big-integer ids of idAt() as numbers.
 * @param value - the value
 * @returns the text
 * @category Plugin helpers
 */
export function stringify(value: unknown): string {
    const text = JSON.stringify(value, (_key, v: unknown) => (Object.is(v, -0) ? `${RAW}-0` : v));
    return text.includes(String.raw`\u0000cx:`) ? text.replaceAll(RAW_JSON, "$1") : text;
}

/**
 * The text of one aspect block, element by element.
 * @param aspect - the aspect name
 * @param elements - the JSON texts of its elements
 * @yields the block's text
 * @returns nothing
 */
export function* aspectBlock(aspect: string, elements: Iterable<string>): Generator<string, void, undefined> {
    yield `{${JSON.stringify(aspect)}:[`;
    let first = true;
    for (const element of elements) {
        yield first ? `\n${element}` : `,\n${element}`;
        first = false;
    }
    yield "]},\n";
}
