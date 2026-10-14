/**
 * `extractPositions()`: any format's stored node coordinates in the neutral convention (center,
 * y up, the file's unit, 3 components). The snapshot's role-`position` column keeps the values the
 * file wrote; this reads them through the spelling the column's `meta.extra` (or the importer's
 * `positions()` hook) declares.
 */

import type { Column, GraphSnapshot } from "@graphty/graph-format";

import { NoteCollector } from "../common/notes.js";
import { type GraphTool, toolOf } from "../common/units.js";
import type { GraphImporter, ImportReport } from "../types.js";
import { POSITION_ISSUE, type PositionNoteCode } from "./codes.js";
import { median, toNeutral } from "./convert.js";
import type {
    ExtractPositionsOptions,
    FilePositionGroup,
    FilePositions,
    ImporterGroupBox,
    ImporterPositions,
    PositionColumnExtra,
    PositionNote,
} from "./types.js";

type Point = [number, number, number];

/** Reads one row's raw coordinates into `out`; false when the row has none. */
type RowReader = (row: number, out: Point) => boolean;

/** Reads one row's width and height; null when the row has no size. */
type SizeReader = (row: number) => readonly [number, number] | null;

/** Where a file's coordinates are and how they are spelled. */
interface Spelling {
    readonly read: RowReader;
    /** Reads a row's width and height from the size columns the spelling names; null without both. */
    readonly size: SizeReader;
    readonly extra: PositionColumnExtra;
    readonly groups: readonly ImporterGroupBox[];
    readonly medianNodeSize: number | null | undefined;
    readonly tool: GraphTool | null | undefined;
}

/** Report codes of format readers that mean the file mixes 2- and 3-coordinate positions. */
const DIMS_MIXED_CODES: ReadonlySet<string> = new Set(["W_PAJEK_COORD_DIMS", "W_DOT_POS_DIMS"]);

/** graph-io's English for each note, for its own logs only. */
const PHRASES: Readonly<Record<PositionNoteCode, string>> = {
    W_POSITION_STACKED: "every placed node is on one point; the positions were dropped",
    W_POSITION_PARTIAL: "nodes have no position",
    W_POSITION_NON_FINITE: "positions are not finite numbers",
    W_POSITION_DIMS_MIXED: "positions mix 2 and 3 coordinates",
    W_POSITION_ANCHOR_NO_SIZE: "top-left positions have no size and were not moved to the center",
    W_POSITION_OTHER_VIEWS: "other views were not used",
    W_POSITIONS_NOT_READ: "position-like columns this format does not read",
};

/**
 * A file's stored node coordinates in the neutral convention: each node's center, y up, in the
 * file's own unit. Call it with the importer that read the snapshot and the report it returned.
 * @example
 * ```ts
 * const { snapshot, report } = await importGraph(text, { format: "gml" });
 * const positions = extractPositions(gmlImporter, snapshot, report);
 * if (positions?.usable) console.log(positions.coords.subarray(0, 3)); // node 0's x, y, z
 * ```
 * @param importer - the importer that read the snapshot (its `positions()` hook, when it has one, says how the coordinates are spelled)
 * @param snapshot - the imported graph
 * @param report - the import's report
 * @param options - `signal` to abort
 * @returns the positions, or null when the file stores none and has no position-like columns
 * @category Positions
 */
export function extractPositions(
    importer: GraphImporter,
    snapshot: GraphSnapshot,
    report: ImportReport,
    options: ExtractPositionsOptions = {},
): FilePositions | null {
    const signal = options.signal ?? null;
    signal?.throwIfAborted();
    const notes = new NoteCollector<PositionNoteCode>();
    const spelling = spellingOf(importer, snapshot, signal);
    if (spelling === null) {
        noteUnread(snapshot, notes);
        return notes.list().length === 0 ? null : emptyPositions(importer, snapshot, notes);
    }
    const n = snapshot.nodeCount;
    const coords = readRows(n, spelling, notes);
    signal?.throwIfAborted();
    const containers = containersOf(snapshot);
    const groups = applyGroups(spelling, coords);
    collectGroups(spelling, coords, containers, groups);
    const { placed, total } = countPlaced(coords, containers, notes);
    const stacked = dropStacked(coords, placed, notes);
    noteReport(report, notes);
    noteOtherViews(snapshot, notes);
    return {
        version: 1,
        source: {
            format: importer.format,
            tool: spelling.tool ?? toolOf(snapshot.meta.creator),
            yAxis: spelling.extra.yAxis ?? "up",
        },
        units: spelling.extra.units ?? "file",
        medianNodeSize: spelling.medianNodeSize ?? medianSize(spelling.size, n, containers),
        dims: coords.realZ ? 3 : 2,
        coords: coords.values,
        placed: stacked ? 0 : placed,
        total,
        usable: !stacked && placed > 0,
        bounds: stacked ? null : boundsOf(coords.values),
        groups,
        notes: noteList(notes),
    };
}

// ------------------------------------------------------------ spelling

/**
 * Where the coordinates are: the importer's hook wins over the column's `meta.extra`.
 * @param importer - the importer
 * @param snapshot - the graph
 * @param signal - the abort signal
 * @returns the spelling, or null when the file stores no coordinates
 */
function spellingOf(importer: GraphImporter, snapshot: GraphSnapshot, signal: AbortSignal | null): Spelling | null {
    const hook = importer.positions?.(snapshot, { signal }) ?? null;
    if (hook?.x !== undefined && hook.y !== undefined) {
        return plainSpelling(snapshot, hook);
    }
    const column = hook?.column === undefined ? snapshot.nodes.byRole("position") : snapshot.nodes.get(hook.column);
    if (column === null || column.meta.components < 2) {
        return null;
    }
    const extra = { ...extraOf(column.meta.extra), ...extraOf(hook ?? {}) };
    return { read: vectorReader(column), size: sizeReader(snapshot, extra), extra, ...hookFields(hook) };
}

/**
 * The spelling of the simple hook form: plain x / y (/ z) columns.
 * @param snapshot - the graph
 * @param hook - the hook's answer
 * @returns the spelling, or null when a named column is missing
 */
function plainSpelling(snapshot: GraphSnapshot, hook: ImporterPositions): Spelling | null {
    const x = snapshot.nodes.get(hook.x ?? "");
    const y = snapshot.nodes.get(hook.y ?? "");
    const z = hook.z === undefined ? null : snapshot.nodes.get(hook.z);
    if (x === null || y === null) {
        return null;
    }
    const read: RowReader = (row, out) => {
        if (!x.isSet(row) || !y.isSet(row)) {
            return false;
        }
        out[0] = Number(x.value(row));
        out[1] = Number(y.value(row));
        out[2] = z?.isSet(row) === true ? Number(z.value(row)) : 0;
        return true;
    };
    const extra = { ...extraOf(hook), sourceDims: z === null ? 2 : 3 } as const;
    return { read, size: sizeReader(snapshot, extra), extra, ...hookFields(hook) };
}

/**
 * The hook's fields beside the spelling.
 * @param hook - the hook's answer, or null
 * @returns groups, median node size and tool
 */
function hookFields(hook: ImporterPositions | null): Pick<Spelling, "groups" | "medianNodeSize" | "tool"> {
    return { groups: hook?.groups ?? [], medianNodeSize: hook?.medianNodeSize, tool: hook?.tool };
}

/**
 * A reader over a 2- or 3-component column.
 * @param column - the column
 * @returns the reader
 */
function vectorReader(column: Column): RowReader {
    return (row, out) => {
        if (!column.isSet(row)) {
            return false;
        }
        const v = column.value(row) as ArrayLike<number>;
        out[0] = v[0];
        out[1] = v[1];
        out[2] = v.length > 2 ? v[2] : 0;
        return true;
    };
}

/**
 * The spelling fields of an extra (or a hook's answer), each kept only when well formed.
 * @param source - a column's meta.extra or a hook's answer
 * @returns the fields
 */
function extraOf(source: object): PositionColumnExtra {
    const extra = source as Readonly<Record<string, unknown>>;
    const out: Record<string, unknown> = {};
    const pick = (key: keyof PositionColumnExtra, ok: (v: unknown) => boolean): void => {
        if (ok(extra[key])) {
            out[key] = extra[key];
        }
    };
    pick("units", (v) => v === "px" || v === "file");
    pick("sourceDims", (v) => v === 2 || v === 3);
    pick("yAxis", (v) => v === "up" || v === "down");
    pick("anchor", (v) => v === "center" || v === "top-left");
    pick("width", (v) => typeof v === "string");
    pick("height", (v) => typeof v === "string");
    pick("zOrigin", (v) => typeof v === "number" && Number.isFinite(v));
    pick("zeroUnplaced", (v) => typeof v === "boolean");
    return out;
}

// ------------------------------------------------------------ rows

/** Coordinates by node index, with whether the file has a z that differs between nodes. */
interface Rows {
    readonly values: Float64Array;
    readonly realZ: boolean;
}

/**
 * Read every row and convert it to the neutral convention.
 * @param n - the node count
 * @param spelling - how the coordinates are spelled
 * @param notes - receives non-finite and anchor notes
 * @returns the coordinates (NaN rows have none)
 */
function readRows(n: number, spelling: Spelling, notes: NoteCollector<PositionNoteCode>): Rows {
    const values = new Float64Array(3 * n).fill(Number.NaN);
    const p: Point = [0, 0, 0];
    for (let row = 0; row < n; row++) {
        if (!spelling.read(row, p)) {
            continue;
        }
        if (Number.isFinite(p[0]) && Number.isFinite(p[1]) && Number.isFinite(p[2])) {
            values.set(p, 3 * row);
        } else {
            notes.add(POSITION_ISSUE.NON_FINITE, { element: row, sample: p.join(",") });
        }
    }
    if (spelling.extra.zeroUnplaced === true) {
        dropZeroPile(values);
    }
    const realZ = spelling.extra.sourceDims === 3 && !constantZ(values);
    convertRows(values, spelling.extra, spelling.size, realZ, notes);
    return { values, realZ };
}

/**
 * Convert every placed row in place.
 * @param values - the raw coordinates
 * @param extra - the spelling
 * @param size - reads a row's width and height
 * @param realZ - whether z differs between nodes
 * @param notes - receives the anchor note
 */
function convertRows(
    values: Float64Array,
    extra: PositionColumnExtra,
    size: SizeReader,
    realZ: boolean,
    notes: NoteCollector<PositionNoteCode>,
): void {
    const p: Point = [0, 0, 0];
    for (let i = 0; i < values.length; i += 3) {
        if (Number.isNaN(values[i])) {
            continue;
        }
        const s = extra.anchor === "top-left" ? size(i / 3) : null;
        if (extra.anchor === "top-left" && s === null) {
            notes.add(POSITION_ISSUE.ANCHOR_NO_SIZE, { element: i / 3 });
        }
        p[0] = values[i];
        p[1] = values[i + 1];
        p[2] = values[i + 2];
        toNeutral(p, extra, s, realZ);
        values.set(p, i);
    }
}

/**
 * Reads a row's width and height from the size columns a spelling names.
 * @param snapshot - the graph
 * @param extra - the spelling
 * @returns the reader; it answers null for a row without both, or when the columns are missing
 */
function sizeReader(snapshot: GraphSnapshot, extra: PositionColumnExtra): SizeReader {
    const w = extra.width === undefined ? null : snapshot.nodes.get(extra.width);
    const h = extra.height === undefined ? null : snapshot.nodes.get(extra.height);
    if (w === null || h === null) {
        return () => null;
    }
    return (row) => {
        if (!w.isSet(row) || !h.isSet(row)) {
            return null;
        }
        const size: [number, number] = [Number(w.value(row)), Number(h.value(row))];
        return Number.isFinite(size[0]) && Number.isFinite(size[1]) ? size : null;
    };
}

/**
 * NetworkX writes (0, 0) for a node with no position: when other rows are placed, an exact (0, 0)
 * shared by two or more rows counts as unplaced.
 * @param values - the raw coordinates, changed in place
 */
function dropZeroPile(values: Float64Array): void {
    const zeros: number[] = [];
    let others = 0;
    for (let i = 0; i < values.length; i += 3) {
        if (values[i] === 0 && values[i + 1] === 0) {
            zeros.push(i);
        } else if (!Number.isNaN(values[i])) {
            others++;
        }
    }
    if (zeros.length >= 2 && others > 0) {
        for (const i of zeros) {
            values.fill(Number.NaN, i, i + 3);
        }
    }
}

/**
 * Whether every placed row has the same z (Pajek writes z = 0.5 on 2D drawings).
 * @param values - the raw coordinates
 * @returns true when z never differs
 */
function constantZ(values: Float64Array): boolean {
    let z = Number.NaN;
    for (let i = 0; i < values.length; i += 3) {
        if (Number.isNaN(values[i])) {
            continue;
        }
        if (Number.isNaN(z)) {
            z = values[i + 2];
        } else if (values[i + 2] !== z) {
            return false;
        }
    }
    return true;
}

// ------------------------------------------------------------ groups

/**
 * The nodes another node names as its parent: group containers.
 * @param snapshot - the graph
 * @returns the container indexes
 */
function containersOf(snapshot: GraphSnapshot): Set<number> {
    const out = new Set<number>();
    const parent = snapshot.nodes.byRole("parent");
    if (parent === null) {
        return out;
    }
    for (let row = 0; row < parent.length; row++) {
        const v = parent.isSet(row) ? parent.value(row) : undefined;
        if (typeof v === "number") {
            out.add(v);
        }
    }
    return out;
}

/**
 * The hook's group boxes in the neutral convention; a container with no coordinate of its own is
 * placed at its box's center.
 * @param spelling - the spelling and the hook's boxes
 * @param rows - the coordinates, changed in place
 * @returns the boxes
 */
function applyGroups(spelling: Spelling, rows: Rows): FilePositionGroup[] {
    const out: FilePositionGroup[] = [];
    for (const { node, box } of spelling.groups) {
        const p: Point = [box.x, box.y, 0];
        toNeutral(p, spelling.extra, [box.width, box.height], false);
        if (Number.isNaN(rows.values[3 * node])) {
            rows.values.set(p, 3 * node);
        }
        if (!out.some((g) => g.node === node)) {
            out.push({ node, box: { x: p[0], y: p[1], width: box.width, height: box.height } });
        }
    }
    return out;
}

/**
 * Boxes for the containers the file gives a coordinate and a size (yEd groups).
 * @param spelling - the size reader
 * @param rows - the coordinates
 * @param containers - the container indexes
 * @param groups - receives the boxes
 */
function collectGroups(
    spelling: Spelling,
    rows: Rows,
    containers: ReadonlySet<number>,
    groups: FilePositionGroup[],
): void {
    for (const node of containers) {
        const size = spelling.size(node);
        const i = 3 * node;
        if (size !== null && !Number.isNaN(rows.values[i]) && !groups.some((g) => g.node === node)) {
            groups.push({ node, box: { x: rows.values[i], y: rows.values[i + 1], width: size[0], height: size[1] } });
        }
    }
}

// ------------------------------------------------------------ counts and notes

/**
 * Count the placed rows and the rows that need a position; note the unplaced ones.
 * @param rows - the coordinates
 * @param containers - containers without a coordinate do not need one
 * @param notes - receives the partial note
 * @returns placed and total
 */
function countPlaced(
    rows: Rows,
    containers: ReadonlySet<number>,
    notes: NoteCollector<PositionNoteCode>,
): { placed: number; total: number } {
    const { values } = rows;
    const unplaced: number[] = [];
    let placed = 0;
    let total = 0;
    for (let row = 0; 3 * row < values.length; row++) {
        const has = !Number.isNaN(values[3 * row]);
        if (has) {
            placed++;
        } else if (!containers.has(row)) {
            unplaced.push(row);
        }
        total += has || !containers.has(row) ? 1 : 0;
    }
    if (placed > 0 && unplaced.length > 0) {
        for (const element of unplaced) {
            notes.add(POSITION_ISSUE.PARTIAL, { element });
        }
    }
    return { placed, total };
}

/**
 * Drop the coordinates when every placed node sits on one point.
 * @param rows - the coordinates, cleared in place when stacked
 * @param placed - the placed count
 * @param notes - receives the stacked note
 * @returns whether they were stacked
 */
function dropStacked(rows: Rows, placed: number, notes: NoteCollector<PositionNoteCode>): boolean {
    if (placed < 2) {
        return false;
    }
    const { values } = rows;
    let first = -1;
    for (let i = 0; i < values.length; i += 3) {
        if (Number.isNaN(values[i])) {
            continue;
        }
        if (first < 0) {
            first = i;
        } else if (
            values[i] !== values[first] ||
            values[i + 1] !== values[first + 1] ||
            values[i + 2] !== values[first + 2]
        ) {
            return false;
        }
    }
    notes.add(POSITION_ISSUE.STACKED, {
        count: placed,
        sample: Array.from(values.subarray(first, first + 3)).join(","),
    });
    values.fill(Number.NaN);
    return true;
}

/**
 * Lift the format readers' mixed-dimension warnings into the shared code.
 * @param report - the import report
 * @param notes - receives the note
 */
function noteReport(report: ImportReport, notes: NoteCollector<PositionNoteCode>): void {
    for (const issue of report.issues) {
        if (DIMS_MIXED_CODES.has(issue.code)) {
            notes.add(POSITION_ISSUE.DIMS_MIXED, { sample: issue.code });
        }
    }
}

/**
 * Note the extra view columns of a CX file (`position@2`, ...): only the first view is used.
 * @param snapshot - the graph
 * @param notes - receives the note
 */
function noteOtherViews(snapshot: GraphSnapshot, notes: NoteCollector<PositionNoteCode>): void {
    for (const column of snapshot.nodes) {
        if (/^position@\d+$/.test(column.meta.name) && column.meta.role === null) {
            notes.add(POSITION_ISSUE.OTHER_VIEWS, { sample: column.meta.name });
        }
    }
}

/**
 * Note plain numeric `x` and `y` node columns a format does not read as positions.
 * @param snapshot - the graph
 * @param notes - receives the note
 */
function noteUnread(snapshot: GraphSnapshot, notes: NoteCollector<PositionNoteCode>): void {
    const numeric = (name: string): Column | undefined =>
        [...snapshot.nodes].find(
            (c) => c.meta.name.toLowerCase() === name && c.meta.components === 1 && isNumeric(c.dtype),
        );
    const x = numeric("x");
    const y = numeric("y");
    if (x !== undefined && y !== undefined) {
        notes.add(POSITION_ISSUE.NOT_READ, { sample: x.meta.name });
        notes.add(POSITION_ISSUE.NOT_READ, { sample: y.meta.name });
    }
}

/**
 * Whether a dtype holds numbers.
 * @param dtype - the dtype
 * @returns true for the numeric dtypes
 */
function isNumeric(dtype: string): boolean {
    return dtype === "f64" || dtype === "f32" || dtype === "i32" || dtype === "u32" || dtype === "u8";
}

/**
 * The notes with graph-io's English.
 * @param notes - the collector
 * @returns the notes
 */
function noteList(notes: NoteCollector<PositionNoteCode>): PositionNote[] {
    return notes.list().map((n) => ({
        code: n.code,
        params: { count: n.count, samples: n.samples },
        elements: n.elements,
        message: `${PHRASES[n.code]} (${n.count})`,
    }));
}

/**
 * The answer for a file with no readable positions but position-like columns.
 * @param importer - the importer
 * @param snapshot - the graph
 * @param notes - the notes
 * @returns positions with nothing placed
 */
function emptyPositions(
    importer: GraphImporter,
    snapshot: GraphSnapshot,
    notes: NoteCollector<PositionNoteCode>,
): FilePositions {
    return {
        version: 1,
        source: { format: importer.format, tool: toolOf(snapshot.meta.creator), yAxis: "up" },
        units: "file",
        medianNodeSize: null,
        dims: 2,
        coords: new Float64Array(3 * snapshot.nodeCount).fill(Number.NaN),
        placed: 0,
        total: snapshot.nodeCount,
        usable: false,
        bounds: null,
        groups: [],
        notes: noteList(notes),
    };
}

// ------------------------------------------------------------ sizes and bounds

/**
 * The median node diameter from the size columns the spelling names.
 * @param size - the size reader
 * @param n - the node count
 * @param containers - group containers, left out
 * @returns the median of each node's mean of width and height, or null when no node has a size
 */
function medianSize(size: SizeReader, n: number, containers: ReadonlySet<number>): number | null {
    const sizes: number[] = [];
    for (let row = 0; row < n; row++) {
        const s = containers.has(row) ? null : size(row);
        if (s !== null) {
            sizes.push((s[0] + s[1]) / 2);
        }
    }
    return median(sizes);
}

/**
 * The box around every placed row.
 * @param values - the coordinates
 * @returns min and max, or null when none is placed
 */
function boundsOf(values: Float64Array): FilePositions["bounds"] {
    const min: Point = [Infinity, Infinity, Infinity];
    const max: Point = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < values.length; i += 3) {
        if (Number.isNaN(values[i])) {
            continue;
        }
        for (let k = 0; k < 3; k++) {
            min[k] = Math.min(min[k], values[i + k]);
            max[k] = Math.max(max[k], values[i + k]);
        }
    }
    return min[0] === Infinity ? null : { min, max };
}
