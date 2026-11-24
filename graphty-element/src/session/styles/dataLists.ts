/**
 * @file A pie, a chart or a record from data: checking a `node.pieData`, `node.chartData` or
 * `node.recordData` spec, and resolving it per node into the fixed lists those channels fill.
 *
 * One spec, prepared once against the whole graph (the category colors, a chart's shared scale, the
 * columns a pattern matches), then asked once per node. Nothing here reaches Babylon.js or the DOM.
 * Guide: docs/guide/data-lists.md.
 */

import {
    type ChartData,
    type DataCategoryFact,
    type DataChannel,
    type DataEntry,
    type DataEntryFact,
    type DataPartFact,
    type DataSpecReason,
    type DataUndrawnCode,
    formatValue,
    type GraphMeasure,
    instantOf,
    naturalCompare,
    type PieData,
    type RecordData,
} from "../../catalog/data-lists";
import type { Channel, PaletteDescriptor, Path } from "../../catalog/types";

export type { DataSpecReason } from "../../catalog/data-lists";
export type { DataGraph } from "./graphMeasures";
import { escapeLabelMarkup } from "../../utils/labelMarkup";
import { interpolatePalette } from "../../utils/styleHelpers/color/interpolation";
import type { CodedFact } from "../shared";
import { toColorValue } from "./channels";
import { DEFAULT_CATEGORICAL_PALETTE } from "./defaultPalettes";
import type { EncodedValue, PreparedBinding } from "./encoding";
import { createMeasurer, type DataGraph } from "./graphMeasures";
import { sequentialSamples } from "./palettes";

/** The three data channels. */
export const DATA_CHANNELS: readonly DataChannel[] = ["node.pieData", "node.chartData", "node.recordData"];

/**
 * Whether a channel takes a data spec.
 * @param channel - The channel.
 * @returns True for the three data channels.
 */
export function isDataChannel(channel: string): channel is DataChannel {
    return (DATA_CHANNELS as readonly string[]).includes(channel);
}

/** The fixed channels a data channel fills, which may not sit on its layer (decision 4). */
export const FIXED_OF: Readonly<Record<DataChannel, readonly Channel[]>> = {
    "node.pieData": ["node.pieColors", "node.pieSizes", "node.pieOpacities"],
    "node.chartData": ["node.chartValues", "node.chartColors"],
    "node.recordData": ["node.shapeTexts", "node.labelTable"],
};

/** The channels a data channel writes. */
export const FILLS_OF: Readonly<Record<DataChannel, readonly Channel[]>> = {
    "node.pieData": ["node.pieColors", "node.pieSizes", "node.pieOpacities", "node.shapeTexts"],
    "node.chartData": ["node.chartValues", "node.chartColors", "node.chartMin", "node.chartMax"],
    "node.recordData": ["node.labelTable", "node.shapeTexts"],
};

/** What a missing value does when an entry does not say. */
const DEFAULT_MISSING: Readonly<Record<DataChannel, "skip" | "gap" | "drop">> = {
    "node.pieData": "skip",
    "node.chartData": "gap",
    "node.recordData": "drop",
};

/** The most entries a spec holds. */
export const ENTRY_CAP = 256;

/** The element's Other gray. */
export const OTHER_GRAY = "#686868";
/** The element's missing gray. */
export const MISSING_GRAY = "#BDBDBD";
/** A zebra row's fill. */
const ZEBRA_FILL = "#F2F2F2";
/** A gray slice's share of the turn. */
const GRAY_SHARE = 0.01;
/** How far out a slice's text sits, as a share of the disc's radius. */
const SLICE_TEXT_AT = 0.65;

// ---------------------------------------------------------------------------------------------
// Checking a spec
// ---------------------------------------------------------------------------------------------

/** A refused spec. */
export interface DataSpecProblem {
    readonly reason: DataSpecReason;
    readonly message: string;
    readonly path: string;
    readonly channels?: readonly string[];
}

/** The keys that name an entry's source. */
const SOURCE_KEYS = ["field", "pattern", "graph", "value", "text"] as const;

/**
 * Whether a value is a whole number from 1.
 * @param value - The value.
 * @returns True when it is.
 */
function isCount(value: unknown): boolean {
    return typeof value === "number" && Number.isInteger(value) && value >= 1;
}

/**
 * Whether a value is a color the element parses.
 * @param value - The value.
 * @returns True when it is.
 */
function isColor(value: unknown): boolean {
    return typeof value === "string" && toColorValue(value) !== null;
}

/**
 * Check one entry.
 * @param channel - The data channel.
 * @param entry - The entry.
 * @param at - Where it sits.
 * @returns The problem, or null.
 */
function checkEntry(channel: DataChannel, entry: unknown, at: string): DataSpecProblem | null {
    if (typeof entry !== "object" || entry === null) {
        return { reason: "entry-source", message: "An entry is an object.", path: at };
    }

    const record = entry as Record<string, unknown>;
    const sources = SOURCE_KEYS.filter((key) => record[key] !== undefined);
    if (sources.length !== 1) {
        return {
            reason: "entry-source",
            message: "An entry names exactly one of field, pattern, graph, value or text.",
            path: at,
        };
    }

    const [source] = sources;
    const record_ = channel === "node.recordData";
    if ((source === "text" && !record_) || (source === "value" && record_)) {
        return {
            reason: "entry-kind",
            message: record_ ? "A record row is text, not a value." : "A pie or chart entry is a value, not text.",
            path: `${at}.${source}`,
        };
    }

    const kinds: Readonly<Record<string, string>> = {
        field: "string",
        pattern: "string",
        graph: "object",
        value: "number",
        text: "string",
    };
    if (typeof record[source] !== kinds[source] || record[source] === null) {
        return {
            reason: "entry-source",
            message: `An entry's ${source} is a ${kinds[source]}.`,
            path: `${at}.${source}`,
        };
    }

    if (record.color !== undefined && !isColor(record.color)) {
        return { reason: "colors", message: "An entry's color is a color.", path: `${at}.color` };
    }

    return source === "graph" ? checkMeasure(record.graph as Record<string, unknown>, `${at}.graph`) : null;
}

/**
 * Check a Graph value.
 * @param graph - The measure.
 * @param at - Where it sits.
 * @returns The problem, or null.
 */
function checkMeasure(graph: Record<string, unknown>, at: string): DataSpecProblem | null {
    if (!OVERS.includes(graph.over as never) || !MEASURES.includes(graph.measure as never)) {
        return {
            reason: "entry-source",
            message: `A Graph value is over ${OVERS.join(", ")} and measures ${MEASURES.join(", ")}.`,
            path: at,
        };
    }

    if (graph.measure !== "count" && typeof (graph.of as { path?: unknown } | undefined)?.path !== "string") {
        return { reason: "measure-of", message: "A measure other than count reads `of`.", path: `${at}.of` };
    }

    if (graph.hops !== undefined && ![1, 2, 3].includes(graph.hops as number)) {
        return { reason: "hops", message: "Hops are 1, 2 or 3.", path: `${at}.hops` };
    }

    const groupBy = graph.groupBy as
        { by?: unknown; period?: unknown; path?: unknown; window?: { last?: unknown } } | undefined;
    if (
        groupBy !== undefined &&
        !(
            groupBy.by === "direction" ||
            (groupBy.by === "value" && typeof groupBy.path === "string") ||
            (groupBy.by === "time" && typeof groupBy.path === "string" && PERIODS.includes(groupBy.period as never))
        )
    ) {
        return {
            reason: "entry-source",
            message: "A Graph value groups by a value's path, by direction, or by a time path and a period.",
            path: `${at}.groupBy`,
        };
    }

    const window = groupBy?.window;
    if (window !== undefined && !isCount(window.last)) {
        return { reason: "window", message: "A window's last is a whole number from 1.", path: `${at}.groupBy.window` };
    }

    const where = graph.where as { kind?: unknown; attribute?: unknown } | undefined;
    if (
        where !== undefined &&
        !((where.kind === "range" || where.kind === "categories") && typeof where.attribute === "string")
    ) {
        return {
            reason: "where",
            message: "A Graph value's where is one range or categories leaf.",
            path: `${at}.where`,
        };
    }

    return null;
}

/** What a Graph value walks. */
const OVERS = ["edges", "neighbors", "members"] as const;
/** What a Graph value computes. */
const MEASURES = ["count", "sum", "mean", "min", "max", "mode"] as const;
/** The periods a time group is cut into. */
const PERIODS = ["hour", "day", "week", "month", "quarter", "year"] as const;

/**
 * Check a data spec against its channel and the rest of its layer's `set`.
 * @param channel - The data channel.
 * @param value - The spec.
 * @param at - Where it sits, such as `set.node.pieData`.
 * @param set - The layer's whole `set`, for the fixed lists it may not also hold.
 * @param knownPalette - Whether a palette id is one the session holds.
 * @returns The problem, or null when the spec is sound.
 */
export function checkDataSpec(
    channel: DataChannel,
    value: unknown,
    at: string,
    set: Readonly<Record<string, unknown>>,
    knownPalette: (id: string) => boolean,
): DataSpecProblem | null {
    if (typeof value !== "object" || value === null || !Array.isArray((value as { entries?: unknown }).entries)) {
        return { reason: "shape", message: "A data spec is { entries: [...] }.", path: at };
    }

    const fixed = FIXED_OF[channel].filter(
        (each) =>
            set[each] !== undefined &&
            !(each === "node.labelTable" && (value as RecordData).layout === "points") &&
            !(each === "node.shapeTexts" && channel === "node.recordData" && (value as RecordData).layout !== "points"),
    );
    if (fixed.length > 0) {
        return {
            reason: "data-and-fixed",
            message: `${channel} fills ${fixed.join(", ")}, so one layer does not hold both.`,
            path: at,
            channels: [channel, ...fixed],
        };
    }

    const spec = value as Record<string, unknown>;
    const entries = spec.entries as readonly unknown[];
    if (entries.length > ENTRY_CAP) {
        return {
            reason: "shape",
            message: `A data spec holds at most ${String(ENTRY_CAP)} entries.`,
            path: `${at}.entries`,
        };
    }

    for (const [index, entry] of entries.entries()) {
        const problem = checkEntry(channel, entry, `${at}.entries.${String(index)}`);
        if (problem !== null) {
            return problem;
        }
    }

    return checkListOptions(spec, at, knownPalette);
}

/**
 * A spec's own colors as a list: a non-list counts as one bad color.
 * @param colors - The colors as given.
 * @returns The list.
 */
function listOf(colors: unknown): unknown[] {
    if (colors === undefined) {
        return [];
    }

    return Array.isArray(colors) ? (colors as unknown[]) : [null];
}

/**
 * Check a spec's list options: keep, most, clip, palette and colors.
 * @param spec - The spec.
 * @param at - Where it sits.
 * @param knownPalette - Whether a palette id is one the session holds.
 * @returns The problem, or null.
 */
function checkListOptions(
    spec: Record<string, unknown>,
    at: string,
    knownPalette: (id: string) => boolean,
): DataSpecProblem | null {
    for (const key of ["keep", "most"] as const) {
        if (spec[key] !== undefined && !isCount(spec[key])) {
            return { reason: key, message: `${key} is a whole number from 1.`, path: `${at}.${key}` };
        }
    }

    const clip = (spec.scale as { clip?: unknown } | undefined)?.clip;
    if (clip !== undefined) {
        const [lo, hi] = Array.isArray(clip) ? (clip as unknown[]) : [];
        if (!(typeof lo === "number" && typeof hi === "number" && lo >= 0 && lo < hi && hi <= 100)) {
            return { reason: "clip", message: "clip is [lo, hi] with 0 <= lo < hi <= 100.", path: `${at}.scale.clip` };
        }
    }

    if (spec.palette !== undefined && (typeof spec.palette !== "string" || !knownPalette(spec.palette))) {
        return { reason: "palette", message: "There is no palette by that id.", path: `${at}.palette` };
    }

    const colors = [
        ...listOf(spec.colors),
        ...Object.values((spec.categories ?? {}) as Record<string, { color?: unknown }>)
            .map((each) => each.color)
            .filter((each) => each !== undefined),
        ...[(spec.other as { color?: unknown } | undefined)?.color, spec.emptyColor].filter(
            (each) => each !== undefined,
        ),
    ];
    return colors.every((each) => isColor(each))
        ? null
        : { reason: "colors", message: "Every color in a data spec is one the element parses.", path: at };
}

/**
 * Every path a spec reads: its fields, its header and its Graph values' paths.
 * @param value - The spec.
 * @returns The paths.
 */
export function dataSpecPaths(value: unknown): Path[] {
    const spec = value as Partial<RecordData> | null;
    const paths: Path[] = [];
    for (const entry of spec?.entries ?? []) {
        if ("field" in entry) {
            paths.push(entry.field);
        } else if ("graph" in entry) {
            paths.push(...measurePaths(entry.graph));
        }
    }

    if (typeof spec?.header === "string") {
        paths.push(spec.header);
    }

    return [...new Set(paths)];
}

/**
 * Every path a Graph value reads: its `of`, its group's and its `where` leaf's.
 * @param graph - The Graph value.
 * @returns The paths.
 */
function measurePaths(graph: GraphMeasure): Path[] {
    const { of, groupBy, where } = graph;
    return [
        ...(of === undefined ? [] : [of.path]),
        ...(groupBy !== undefined && "path" in groupBy ? [groupBy.path] : []),
        ...(where !== undefined && "attribute" in where ? [where.attribute] : []),
    ];
}

/**
 * A Graph value with an edge column renamed where it reads edges.
 * @param graph - The Graph value.
 * @param from - The old column path.
 * @param to - The new one.
 * @returns The Graph value, the same object when nothing changed.
 */
function renamedMeasure(graph: GraphMeasure, from: Path, to: Path): GraphMeasure {
    const fallback = graph.over === "edges" ? "edge" : "node";
    const moved = <W extends { readonly path: Path; readonly on?: "edge" | "node" }>(read: W): W =>
        read.path === from && (read.on ?? fallback) === "edge" ? { ...read, path: to } : read;
    const { of, groupBy, where } = graph;
    const next = {
        ...graph,
        ...(of === undefined ? {} : { of: moved(of) }),
        ...(groupBy !== undefined && "path" in groupBy ? { groupBy: moved(groupBy) } : {}),
        ...(where !== undefined &&
        "attribute" in where &&
        where.attribute === from &&
        (graph.whereOn ?? fallback) === "edge"
            ? { where: { ...where, attribute: to } }
            : {}),
    };
    return next.of === of && next.groupBy === groupBy && next.where === where ? graph : next;
}

/**
 * A spec's category keys that name column `from`, renamed to `to`; the rest of a rename is the
 * generic path rewrite's (`renameColumnIn`).
 * @param set - A layer's `set`.
 * @param from - The old column path.
 * @param to - The new one.
 * @returns The set, or the same object when nothing changed.
 */
export function renameDataSpecKeys<T extends object>(set: T, from: Path, to: Path): T {
    let out: Record<string, unknown> | null = null;
    for (const channel of DATA_CHANNELS) {
        const spec = (set as Record<string, unknown>)[channel] as { categories?: Record<string, unknown> } | undefined;
        if (spec?.categories?.[from] === undefined) {
            continue;
        }

        const categories = Object.fromEntries(
            Object.entries(spec.categories).map(([key, each]) => [key === from ? to : key, each]),
        );
        out ??= { ...(set as Record<string, unknown>) };
        out[channel] = { ...spec, categories };
    }

    return (out ?? set) as T;
}

/**
 * A spec's Graph values with an edge column renamed where they read edges (`of`, `groupBy`, `where` on the edge):
 * an edge rename reaches a node layer only here.
 * @param set - A node layer's `set`.
 * @param from - The old column path.
 * @param to - The new one.
 * @returns The set, or the same object when nothing changed.
 */
export function renameDataSpecEdgePaths<T extends object>(set: T, from: Path, to: Path): T {
    let out: Record<string, unknown> | null = null;
    for (const channel of DATA_CHANNELS) {
        const spec = (set as Record<string, unknown>)[channel] as { entries?: readonly DataEntry[] } | undefined;
        let changed = false;
        const entries = (spec?.entries ?? []).map((entry) => {
            if (!("graph" in entry)) {
                return entry;
            }

            const graph = renamedMeasure(entry.graph, from, to);
            changed ||= graph !== entry.graph;
            return graph === entry.graph ? entry : { ...entry, graph };
        });
        if (changed) {
            out ??= { ...(set as Record<string, unknown>) };
            out[channel] = { ...spec, entries };
        }
    }

    return (out ?? set) as T;
}

// ---------------------------------------------------------------------------------------------
// Resolving a spec
// ---------------------------------------------------------------------------------------------

/** What a spec is resolved against. */
export interface DataSource {
    /** How many nodes there are. */
    count(): number;
    /**
     * The value one node carries for a path.
     * @param index - The dense node index.
     * @param path - The path.
     */
    value(index: number, path: Path): unknown;
    /**
     * Whether the layer covers a node.
     * @param index - The dense node index.
     */
    covers(index: number): boolean;
    /** Every node column a pattern may match: data columns and finished runs' fields. */
    columns(): readonly Path[];
    /**
     * A column's plain name, or undefined.
     * @param path - The path.
     */
    plainName(path: Path): string | undefined;
    /**
     * A palette by id.
     * @param id - The id.
     */
    palette(id: string): PaletteDescriptor | undefined;
    /** The structure a Graph value walks, read once per preparation. Absent or null, every Graph value is missing. */
    graph?(): DataGraph | null;
}

/** One part of a node's list before it is drawn. */
interface Part {
    /** Its key: a category, a column path, a list item's place, "" for Other. */
    key: string;
    /** Its name. */
    name: string;
    /** Its value: a number, NaN for a chart's gap, null for a gray missing slice or bar. */
    value: number | null;
    /** The entry it came from, -1 for Other. */
    entry: number;
    /** Whether its entry spreads. */
    spread: boolean;
    /** "other" or "missing". */
    role?: "other" | "missing";
    /** Whether it is one column of a pattern. */
    column?: boolean;
}

/** One record row before it is drawn. */
interface Row {
    readonly name: string;
    readonly text: string;
    readonly number: boolean;
    readonly entry: DataEntry;
}

/** What one entry gives on one node. */
interface EntryRead {
    readonly parts: Part[];
    readonly rows: Row[];
    readonly fact: DataEntryFact;
    /** True when the entry had no value here. */
    readonly missing: boolean;
    /** A pie or chart entry whose value here is not a number. */
    readonly notNumber?: { readonly path: Path; readonly valueKind: string };
    /** A pattern that matched no column. */
    readonly emptyPattern?: boolean;
    /** A Graph value whose walk kept nothing. */
    readonly emptyWalk?: boolean;
}

/** What one node draws from a spec. */
export interface DataResult {
    /** The entry facts, in spec order. */
    readonly entries: readonly DataEntryFact[];
    /** Why it draws nothing, or null. */
    readonly undrawn: CodedFact<DataUndrawnCode> | null;
    /** What each filled channel is written, absent where the spec writes nothing. */
    readonly fills: Readonly<Partial<Record<Channel, string | number>>>;
}

/** A spec ready to resolve per node. */
export interface PreparedData {
    /** The data channel. */
    readonly channel: DataChannel;
    /** The keys, in color order. */
    readonly keys: readonly string[];
    /** A chart's shared extent, or null. */
    readonly extent: readonly [number, number] | null;
    /**
     * Resolve one node.
     * @param index - The dense node index.
     * @param beneath - What the layers beneath painted a channel, for a chart's kind and a pie's texts.
     */
    resolve(index: number, beneath: (channel: Channel) => unknown): DataResult;
    /** The categories over the nodes the layer covers, in color order. */
    categories(): readonly DataCategoryFact[];
}

/**
 * A number a value reads as: a number, or text that is one.
 * @param value - The value.
 * @returns The number, or NaN.
 */
function numberOf(value: unknown): number {
    if (typeof value === "number") {
        return value;
    }

    return typeof value === "string" && value.trim() !== "" ? Number(value) : Number.NaN;
}

/**
 * Whether a value is missing.
 * @param value - The value.
 * @returns True for absent, null, "" and an empty list.
 */
function isMissing(value: unknown): boolean {
    return value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0);
}

/**
 * The kind a value is, for `data.notNumbers`.
 * @param value - The value.
 * @returns "text", "yes-no" or "object".
 */
function kindOf(value: unknown): string {
    if (typeof value === "boolean") {
        return "yes-no";
    }

    return typeof value === "string" ? "text" : "object";
}

/**
 * A column's name a pattern reads: its last name, after `data.` or the run's.
 * @param path - The path.
 * @returns The name.
 */
function columnName(path: Path): string {
    if (path.startsWith("data.")) {
        return path.slice("data.".length);
    }

    return path.split(".").at(-1) ?? path;
}

/**
 * A list's statistic.
 * @param numbers - The numbers.
 * @param each - Which.
 * @returns The value.
 */
function statOf(numbers: readonly number[], each: "sum" | "mean" | "min" | "max"): number {
    const sum = numbers.reduce((a, b) => a + b, 0);
    switch (each) {
        case "sum":
            return sum;
        case "mean":
            return sum / numbers.length;
        case "min":
            return Math.min(...numbers);
        default:
            return Math.max(...numbers);
    }
}

/**
 * The value at a percentile of sorted numbers.
 * @param sorted - The numbers, ascending.
 * @param p - The percentile, 0 to 100.
 * @returns The value.
 */
function percentile(sorted: readonly number[], p: number): number {
    if (sorted.length === 0) {
        return Number.NaN;
    }

    const at = (p / 100) * (sorted.length - 1);
    const lo = Math.floor(at);
    const hi = Math.ceil(at);
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (at - lo);
}

/**
 * Round a number for a list channel's text.
 * @param value - The number.
 * @returns It, to six decimals.
 */
function round6(value: number): string {
    return String(Math.round(value * 1e6) / 1e6);
}

/**
 * Prepare a spec against the whole graph: the columns its patterns match, the newest date each entry reads, every
 * category key in color order, and a chart's shared extent.
 * @param channel - The data channel.
 * @param spec - The spec, already checked.
 * @param source - What it is resolved against.
 * @param ownKind - The chart kind the spec's own layer sets, if any.
 * @returns The prepared spec.
 */
export function prepareData(
    channel: DataChannel,
    spec: PieData | ChartData | RecordData,
    source: DataSource,
    ownKind?: unknown,
): PreparedData {
    const isPie = channel === "node.pieData";
    const isChart = channel === "node.chartData";
    const isRecord = channel === "node.recordData";
    const list = spec as PieData & ChartData;
    const { entries } = spec;
    const count = source.count();

    // The columns each pattern matches, in natural order; re-read when the data moves (a new preparation).
    const allColumns = source.columns().filter((path) => !path.startsWith("graphty."));
    const matched = entries.map((entry) => {
        if (!("pattern" in entry)) {
            return [];
        }

        const prefix = entry.pattern.toLowerCase();
        return (
            allColumns
                .filter((path) => columnName(path).toLowerCase().startsWith(prefix) !== (entry.except === true))
                // A pie and a chart draw numbers: a pattern there matches number columns only.
                .filter((path) => isRecord || isNumberColumn(path))
                .sort((a, b) => naturalCompare(columnName(a), columnName(b)))
        );
    });

    /**
     * Whether a column holds numbers on some node.
     * @param path - The path.
     * @returns True when the first value found is a number.
     */
    function isNumberColumn(path: Path): boolean {
        for (let index = 0; index < count; index++) {
            const value = source.value(index, path);
            if (!isMissing(value)) {
                return Number.isFinite(numberOf(value));
            }
        }

        return false;
    }

    // What a relative date is measured against: the newest instant the entry reads anywhere.
    const newest = entries.map((entry) => newestOf(entry, source));

    // Each Graph value once per node per preparation: the colors, a chart's extent and the repaint all read it.
    const structure = entries.some((entry) => "graph" in entry) ? (source.graph?.() ?? null) : null;
    const measurer = structure === null ? null : createMeasurer(structure, source);
    const measured = entries.map(() => new Map<number, unknown>());
    /** An ungrouped Graph value's key and its name, which the categories read. */
    const graphNames = new Map<string, string>();
    const graphValue = (measure: GraphMeasure, at: number, index: number): unknown => {
        const held = measured[at];
        if (!held.has(index)) {
            held.set(index, measurer === null ? null : measurer.measure(measure, index));
        }

        return held.get(index);
    };

    const nameOf = (path: Path): string => source.plainName(path) ?? columnName(path);
    const missingOf = (entry: DataEntry): NonNullable<DataEntry["missing"]> =>
        entry.missing ?? DEFAULT_MISSING[channel];

    /**
     * What one entry gives on one node.
     * @param entry - The entry.
     * @param at - Its place in the spec.
     * @param index - The node.
     * @returns The read.
     */
    const readEntry = (entry: DataEntry, at: number, index: number): EntryRead => {
        const { format } = entry;
        const write = (value: unknown): string => formatValue(value, format, newest[at]);
        if ("text" in entry) {
            return {
                parts: [],
                rows: [{ name: entry.label ?? "", text: entry.text, number: false, entry }],
                fact: { value: entry.text, text: entry.text },
                missing: false,
            };
        }

        if ("value" in entry) {
            const key = entry.label ?? `value.${String(at)}`;
            return {
                parts: [{ key, name: entry.label ?? write(entry.value), value: entry.value, entry: at, spread: false }],
                rows: [],
                fact: { value: entry.value, text: write(entry.value) },
                missing: false,
            };
        }

        if ("graph" in entry) {
            const { graph } = entry;
            const value = graphValue(graph, at, index);
            const name = entry.label ?? (graph.of === undefined ? graph.over : nameOf(graph.of.path));
            graphNames.set(`graph.${String(at)}`, name);
            const read = readField(entry, at, value, write, `graph.${String(at)}`, name, graph.of?.path);
            return value === null ? { ...read, emptyWalk: true } : read;
        }

        if ("pattern" in entry) {
            return readPattern(entry, at, index, matched[at], write);
        }

        return readField(
            entry,
            at,
            source.value(index, entry.field),
            write,
            entry.field,
            entry.label ?? nameOf(entry.field),
        );
    };

    /**
     * What a missing value gives, by the entry's missing choice.
     * @param entry - The entry.
     * @param at - Its place.
     * @param key - The part's key.
     * @param name - The part's name.
     * @returns The read.
     */
    const missingRead = (entry: DataEntry, at: number, key: string, name: string): EntryRead => {
        const missing = missingOf(entry);
        const parts: Part[] = [];
        const rows: Row[] = [];
        let text: string | null = null;
        if (missing === "gray" && !isRecord) {
            parts.push({ key, name, value: null, entry: at, spread: false, role: "missing" });
        } else if (missing === "zero" && !isRecord) {
            parts.push({ key, name, value: 0, entry: at, spread: false });
        } else if (missing === "gap" && isChart) {
            parts.push({ key, name, value: Number.NaN, entry: at, spread: false });
        } else if (typeof missing === "object" && isRecord) {
            ({ text } = missing);
            rows.push({ name: entry.label ?? name, text, number: false, entry });
        }

        return { parts, rows, fact: { value: null, text }, missing: true };
    };

    /**
     * One value on one node: a field's, a pattern column's or a Graph value's.
     * @param entry - The entry.
     * @param at - Its place.
     * @param value - The node's value.
     * @param write - The entry's formatter.
     * @param field - The part's key.
     * @param name - The part's name.
     * @param path - The path a `data.notNumbers` names; absent, the key.
     * @returns The read.
     */
    const readField = (
        entry: DataEntry,
        at: number,
        value: unknown,
        write: (value: unknown) => string,
        field: string,
        name: string,
        path: Path = field,
    ): EntryRead => {
        if (isMissing(value)) {
            return missingRead(entry, at, field, name);
        }

        if (isRecord) {
            const number = typeof value === "number";
            return {
                parts: [],
                rows: [{ name, text: write(value), number, entry }],
                fact: { value, text: write(value) },
                missing: false,
            };
        }

        const single = numberOf(value);
        if (Number.isFinite(single)) {
            return {
                parts: [{ key: field, name, value: single, entry: at, spread: false }],
                rows: [],
                fact: { value, text: write(value) },
                missing: false,
            };
        }

        const parts = spreadParts(entry, at, value, field, name);
        if (parts === null) {
            const read = missingRead(entry, at, field, name);
            return { ...read, notNumber: { path, valueKind: kindOf(value) } };
        }

        return { parts, rows: [], fact: { value, text: write(value) }, missing: false };
    };

    /**
     * A list or group object spread into parts, or null when it holds no numbers or words.
     * @param entry - The entry.
     * @param at - Its place.
     * @param value - The value.
     * @param field - The key of a part the whole list gives (a statistic).
     * @param name - That part's name.
     * @returns The parts, in natural key order (list items in their place order).
     */
    const spreadParts = (entry: DataEntry, at: number, value: unknown, field: string, name: string): Part[] | null => {
        const make = (key: string, n: number, spread = true): Part => ({
            key,
            name: spread ? (list.categories?.[key]?.label ?? key) : name,
            value: n,
            entry: at,
            spread,
        });
        if (Array.isArray(value)) {
            const items = value as unknown[];
            if (items.every((item) => typeof item === "number")) {
                const each = entry.each ?? "items";
                if (each === "sum" || each === "mean" || each === "min" || each === "max") {
                    return [make(field, statOf(items, each), false)];
                }

                return items.map((n, place) => make(String(place + 1), n));
            }

            const counts = new Map<string, number>();
            for (const item of items) {
                if (!isMissing(item)) {
                    const key = String(item);
                    counts.set(key, (counts.get(key) ?? 0) + 1);
                }
            }

            const equal = entry.each === "equal";
            return [...counts].sort(([a], [b]) => naturalCompare(a, b)).map(([key, n]) => make(key, equal ? 1 : n));
        }

        if (typeof value === "object" && value !== null && !(value instanceof Date)) {
            const pairs = Object.entries(value as Record<string, unknown>);
            if (!pairs.some(([, n]) => typeof n === "number")) {
                return null;
            }

            // A group with no value (an empty period of a sum) follows the entry's missing choice.
            const missing = missingOf(entry);
            return [...pairs]
                .sort(([a], [b]) => naturalCompare(a, b))
                .flatMap(([key, n]): Part[] => {
                    if (typeof n === "number") {
                        return [make(key, n)];
                    }

                    if (missing === "zero") {
                        return [make(key, 0)];
                    }

                    if (missing === "gap" && isChart) {
                        return [make(key, Number.NaN)];
                    }

                    return missing === "gray" ? [{ ...make(key, 0), value: null, role: "missing" }] : [];
                });
        }

        return null;
    };

    /**
     * A pattern's columns on one node.
     * @param entry - The entry.
     * @param at - Its place.
     * @param index - The node.
     * @param columns - The columns it matches.
     * @param write - The entry's formatter.
     * @returns The read.
     */
    const readPattern = (
        entry: DataEntry & { readonly pattern: string },
        at: number,
        index: number,
        columns: readonly Path[],
        write: (value: unknown) => string,
    ): EntryRead => {
        if (columns.length === 0) {
            return { parts: [], rows: [], fact: { value: null, text: null }, missing: true, emptyPattern: true };
        }

        const parts: Part[] = [];
        const rows: Row[] = [];
        const facts: DataPartFact[] = [];
        const values: unknown[] = [];
        let present = 0;
        for (const path of columns) {
            const value = source.value(index, path);
            const one = readField({ ...entry, label: undefined }, at, value, write, path, nameOf(path));
            parts.push(...one.parts.map((part) => ({ ...part, spread: true, column: true })));
            rows.push(...one.rows);
            values.push(isMissing(value) ? null : value);
            present += isMissing(value) ? 0 : 1;
            facts.push({ key: path, name: nameOf(path), text: one.fact.text ?? "", color: "" });
        }

        return {
            parts,
            rows,
            fact: {
                value: values,
                text: present === 0 ? null : write(values.filter((each) => each !== null)),
                parts: facts,
            },
            missing: present === 0,
        };
    };

    const sep = isChart && typeof list.series === "object" ? list.series.separator : null;
    /**
     * The key a part's color is looked up by: a chart part's series, else its own key.
     * @param part - The part.
     * @returns The key.
     */
    const colorKey = (part: Part): string => {
        if (sep === null || sep === "" || part.column !== true) {
            return part.key;
        }

        const name = columnName(part.key);
        const cut = name.lastIndexOf(sep);
        return cut > 0 ? name.slice(0, cut) : name;
    };
    /**
     * The series a chart part belongs to: a pattern column's own (or its name part), else its entry's.
     * @param part - The part.
     * @returns The series key.
     */
    const seriesKey = (part: Part): string =>
        part.column === true || !part.spread ? colorKey(part) : `entry.${String(part.entry)}`;

    // Every key over the whole graph, in natural order: one category is one color on every node.
    const rawOf = (index: number): EntryRead[] => entries.map((entry, at) => readEntry(entry, at, index));
    const { seen, covered, anyMissing } = isRecord
        ? { seen: new Set<string>(), covered: new Set<string>(), anyMissing: false }
        : keysOver(count, source, (index) => rawOf(index).flatMap((read) => read.parts), colorKey);

    const keys = [...seen].sort(naturalCompare);
    const palette = list.colors ?? source.palette(list.palette ?? DEFAULT_CATEGORICAL_PALETTE)?.colors ?? [OTHER_GRAY];
    const extra = keys.length > palette.length ? sequentialSamples(keys.length - palette.length) : [];
    const slot = new Map(keys.map((key, at) => [key, at < palette.length ? palette[at] : extra[at - palette.length]]));
    const otherColor = list.other?.color ?? list.categories?.[""]?.color ?? OTHER_GRAY;
    const emptyColor = (spec as PieData).emptyColor ?? MISSING_GRAY;

    /**
     * A part's color.
     * @param part - The part.
     * @returns The color.
     */
    const colorOf = (part: Part): string => {
        if (part.role === "other") {
            return otherColor;
        }

        if (part.role === "missing") {
            return emptyColor;
        }

        const key = colorKey(part);
        const own = part.spread ? undefined : entries[part.entry]?.color;
        return list.categories?.[key]?.color ?? own ?? slot.get(key) ?? OTHER_GRAY;
    };

    /**
     * Order a node's parts, then keep the largest.
     * @param parts - The parts, in entry order.
     * @returns The parts drawn.
     */
    const arrange = (parts: Part[]): Part[] => {
        const order = list.order ?? "listed";
        const size = (part: Part): number =>
            part.value === null || Number.isNaN(part.value) ? Number.NEGATIVE_INFINITY : part.value;
        const compare: Record<string, ((a: Part, b: Part) => number) | undefined> = {
            largest: (a, b) => size(b) - size(a),
            name: (a, b) => naturalCompare(a.name, b.name),
        };
        const by = compare[order];
        const ordered = by === undefined ? parts : [...parts].sort(by);
        const { keep } = list;
        const normal = ordered.filter(
            (part) => part.role === undefined && part.value !== null && !Number.isNaN(part.value),
        );
        if (keep === undefined || normal.length <= keep) {
            return ordered;
        }

        const kept = new Set([...normal].sort((a, b) => size(b) - size(a)).slice(0, keep));
        const rest = normal.filter((part) => !kept.has(part));
        const other: Part = {
            key: "",
            name: list.other?.label ?? list.categories?.[""]?.label ?? "",
            value: rest.reduce((sum, part) => sum + (part.value ?? 0), 0),
            entry: -1,
            spread: true,
            role: "other",
        };
        return [...ordered.filter((part) => !rest.includes(part)), other];
    };

    /**
     * Why a node draws nothing.
     * @param reads - Its entry reads.
     * @returns The fact.
     */
    const undrawnOf = (reads: readonly EntryRead[]): CodedFact<DataUndrawnCode> => {
        if (entries.length === 0) {
            return { code: "data.noEntries", params: { channel } };
        }

        const wrong = reads.find((read) => read.notNumber !== undefined)?.notNumber;
        if (wrong !== undefined) {
            return { code: "data.notNumbers", params: { channel, path: wrong.path, valueKind: wrong.valueKind } };
        }

        const empty = entries.findIndex((entry, at) => "pattern" in entry && reads[at].emptyPattern === true);
        if (empty >= 0) {
            const entry = entries[empty] as { pattern: string; except?: true };
            return {
                code: "data.patternEmpty",
                params: { channel, pattern: entry.pattern, except: entry.except === true },
            };
        }

        const graph = entries.find((entry) => "graph" in entry);
        // Every entry a Graph value whose walk kept nothing.
        if (graph !== undefined && "graph" in graph && reads.every((read) => read.emptyWalk === true)) {
            return { code: "data.nothingOver", params: { channel, over: graph.graph.over } };
        }

        return { code: "data.noValues", params: { channel, paths: dataSpecPaths(spec) } };
    };

    /**
     * The entry facts, with each spreading entry's drawn parts.
     * @param reads - The reads.
     * @param drawn - The parts drawn.
     * @returns The facts.
     */
    const factsOf = (reads: readonly EntryRead[], drawn: readonly Part[]): DataEntryFact[] =>
        reads.map((read, at) => {
            const mine = drawn.filter((part) => part.entry === at && part.spread);
            if (mine.length === 0 && read.fact.parts === undefined) {
                return read.fact;
            }

            const entry = entries[at];
            const write = (value: number | null): string =>
                value === null || Number.isNaN(value) ? "" : formatValue(value, entry.format, newest[at]);
            const parts = (mine.length > 0 ? mine : []).map((part): DataPartFact => ({
                key: part.key,
                name: list.categories?.[part.key]?.label ?? part.name,
                text: write(part.value),
                color: colorOf(part),
            }));
            const other = drawn.find((part) => part.role === "other");
            const others: DataPartFact[] =
                other !== undefined && at === reads.findIndex((each, i) => drawn.some((p) => p.entry === i && p.spread))
                    ? [{ key: "", name: other.name, text: write(other.value), color: otherColor, role: "other" }]
                    : [];
            return { ...read.fact, parts: [...parts, ...others] };
        });

    // A chart's values per node, normalized, for the shared extent.
    const chartValues = (drawn: readonly Part[]): number[] => {
        const values = drawn.map((part) => part.value ?? Number.NaN);
        const normalize = (list as ChartData).scale?.normalize ?? "raw";
        if (normalize === "raw") {
            return values;
        }

        const bySeries = new Map<string, number[]>();
        drawn.forEach((part, at) => {
            const key = seriesKey(part);
            bySeries.set(key, [...(bySeries.get(key) ?? []), at]);
        });
        const out = [...values];
        for (const places of bySeries.values()) {
            const finite = places.filter((at) => Number.isFinite(values[at]));
            if (normalize === "share") {
                const total = finite.reduce((sum, at) => sum + values[at], 0);
                for (const at of finite) {
                    out[at] = total === 0 ? 0 : values[at] / total;
                }
            } else {
                const sorted = [...finite].sort((a, b) => values[a] - values[b]);
                sorted.forEach((at, rank) => {
                    out[at] = rank + 1;
                });
            }
        }

        return out;
    };

    const { scale } = list as ChartData;
    const shared =
        isChart && (scale?.min === undefined || scale.max === undefined) && (scale?.share ?? "layer") !== "node";
    const extent = shared
        ? sharedExtent(
              count,
              (index) =>
                  scale?.share === "graph" || source.covers(index)
                      ? chartValues(arrange(rawOf(index).flatMap((read) => read.parts)))
                      : [],
              scale?.clip,
          )
        : null;

    /**
     * A chart's scale on one node.
     * @param values - Its values.
     * @returns Its min and max.
     */
    const scaleOn = (values: readonly number[]): [number, number] => {
        const finite = values.filter((value) => Number.isFinite(value));
        let [lo, hi] = extent ?? [Math.min(0, ...finite), Math.max(...finite)];
        lo = Math.min(lo, 0);
        if (scale?.min !== undefined) {
            lo = scale.min;
        }

        if (scale?.max !== undefined) {
            hi = scale.max;
        }

        return [lo, hi > lo ? hi : lo + 1];
    };

    /**
     * Resolve one node.
     * @param index - The node.
     * @param beneath - What the layers beneath painted.
     * @returns What it draws.
     */
    const resolve = (index: number, beneath: (channel: Channel) => unknown): DataResult => {
        const reads = rawOf(index);
        if (isRecord) {
            return resolveRecord(spec, reads, index, source, undrawnOf);
        }

        const drawn = arrange(reads.flatMap((read) => read.parts));
        const entriesOut = factsOf(reads, drawn);
        const normal = drawn.filter(
            (part) => part.role !== "missing" && part.value !== null && !Number.isNaN(part.value),
        );
        if (isPie) {
            return resolvePie(spec, drawn, normal, entriesOut, {
                colorOf,
                emptyColor,
                undrawn: () => undrawnOf(reads),
                beneath,
                write: (part) =>
                    part.value === null
                        ? ""
                        : formatValue(part.value, entries[part.entry]?.format, newest[part.entry] ?? 0),
            });
        }

        if (normal.length === 0) {
            return { entries: entriesOut, undrawn: undrawnOf(reads), fills: {} };
        }

        const kind = ownKind ?? beneath("node.chartKind");
        let values = chartValues(drawn);
        let colors = drawn.map((part) => colorOf(part));
        const [lo, hi] = scaleOn(values);
        // A gray bar stands the whole height of the scale: a mark that there is no value, never a value.
        values = values.map((value, at) => (drawn[at].role === "missing" ? hi : value));
        if (kind === "box") {
            const sorted = values.filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
            values = [0, 25, 50, 75, 100].map((p) => percentile(sorted, p));
            colors = [colors[0], colorOf({ ...drawn[0], key: "" })];
        } else if (kind === "cells") {
            const ramp = list.colors ?? source.palette(list.palette ?? "viridis")?.colors ?? palette;
            const center = scale?.center ?? (lo < 0 && hi > 0 ? 0 : lo);
            colors = values.map((value, at) => {
                if (drawn[at].role === "missing" || !Number.isFinite(value)) {
                    return emptyColor;
                }

                const t =
                    value < center
                        ? 0.5 * ((value - lo) / Math.max(center - lo, Number.EPSILON))
                        : 0.5 + 0.5 * ((value - center) / Math.max(hi - center, Number.EPSILON));
                return interpolatePalette(Math.min(1, Math.max(0, center === lo ? (value - lo) / (hi - lo) : t)), ramp);
            });
        }

        return {
            entries: entriesOut,
            undrawn: null,
            fills: {
                "node.chartValues": values.map((value) => (Number.isFinite(value) ? round6(value) : "NaN")).join(" "),
                "node.chartColors": colors.join(" "),
                "node.chartMin": lo,
                "node.chartMax": hi,
            },
        };
    };

    /**
     * The categories over the nodes the layer covers, in color order.
     * @returns The facts.
     */
    const categories = (): DataCategoryFact[] => {
        const overrides = list.categories ?? {};
        const out: DataCategoryFact[] = keys
            .filter((key) => covered.has(key))
            .map((key) => ({
                key,
                name: overrides[key]?.label ?? graphNames.get(key) ?? (sep === null ? nameOf(key) : key),
                color: overrides[key]?.color ?? slot.get(key) ?? OTHER_GRAY,
                pinned: overrides[key]?.color !== undefined,
            }));
        for (const [key, override] of Object.entries(overrides)) {
            if (key !== "" && !seen.has(key)) {
                out.push({
                    key,
                    name: override.label ?? key,
                    color: override.color ?? OTHER_GRAY,
                    pinned: override.color !== undefined,
                    unseen: true,
                });
            }
        }

        if (list.keep !== undefined) {
            out.push({
                key: "",
                name: list.other?.label ?? "",
                color: otherColor,
                pinned: list.other?.color !== undefined,
                role: "other",
            });
        }

        if (anyMissing || (isPie && ((spec as PieData).empty ?? "none") !== "none")) {
            out.push({
                key: "",
                name: "",
                color: emptyColor,
                pinned: (spec as PieData).emptyColor !== undefined,
                role: "missing",
            });
        }

        return out;
    };

    return { channel, keys, extent, resolve, categories };
}

/**
 * The newest instant an entry reads anywhere, which a relative date is measured against.
 * @param entry - The entry.
 * @param source - What it is resolved against.
 * @returns Milliseconds; now when the entry writes no relative date or reads no instant.
 */
function newestOf(entry: DataEntry, source: DataSource): number {
    if (entry.format?.date?.style !== "relative" || !("field" in entry)) {
        return Date.now();
    }

    let most = Number.NEGATIVE_INFINITY;
    for (let index = 0; index < source.count(); index++) {
        const ms = instantOf(source.value(index, entry.field));
        if (Number.isFinite(ms) && ms > most) {
            most = ms;
        }
    }

    return Number.isFinite(most) ? most : Date.now();
}

/**
 * Every color key the parts yield over the whole graph, and those on the nodes the layer covers.
 * @param count - How many nodes.
 * @param source - What it is resolved against.
 * @param partsOf - A node's parts.
 * @param keyOf - A part's color key.
 * @returns The keys, and whether a covered node draws a missing part.
 */
function keysOver(
    count: number,
    source: DataSource,
    partsOf: (index: number) => readonly Part[],
    keyOf: (part: Part) => string,
): { seen: Set<string>; covered: Set<string>; anyMissing: boolean } {
    const seen = new Set<string>();
    const covered = new Set<string>();
    let anyMissing = false;
    for (let index = 0; index < count; index++) {
        const covers = source.covers(index);
        for (const part of partsOf(index)) {
            if (part.role === "missing") {
                anyMissing ||= covers;
            } else {
                seen.add(keyOf(part));
                if (covers) {
                    covered.add(keyOf(part));
                }
            }
        }
    }

    return { seen, covered, anyMissing };
}

/**
 * A chart's shared extent: every finite value over the nodes, cut at the clip's percentiles.
 * @param count - How many nodes.
 * @param valuesOf - A node's values, empty for a node outside the share.
 * @param clip - The percentiles.
 * @returns The extent, or null when no node holds a value.
 */
function sharedExtent(
    count: number,
    valuesOf: (index: number) => readonly number[],
    clip: readonly [number, number] | undefined,
): [number, number] | null {
    const all: number[] = [];
    for (let index = 0; index < count; index++) {
        all.push(...valuesOf(index).filter((value) => Number.isFinite(value)));
    }

    all.sort((a, b) => a - b);
    const [lo, hi] = clip ?? [0, 100];
    return all.length === 0 ? null : [percentile(all, lo), percentile(all, hi)];
}

/** What a pie's resolution reads from its preparation. */
interface PieHelpers {
    readonly colorOf: (part: Part) => string;
    readonly emptyColor: string;
    readonly undrawn: () => CodedFact<DataUndrawnCode>;
    readonly beneath: (channel: Channel) => unknown;
    readonly write: (part: Part) => string;
}

/**
 * A pie on one node.
 * @param spec - The spec.
 * @param drawn - Its parts, ordered and kept.
 * @param normal - Those with a value.
 * @param entries - The entry facts.
 * @param helpers - What the preparation knows.
 * @returns What it draws.
 */
function resolvePie(
    spec: PieData,
    drawn: readonly Part[],
    normal: readonly Part[],
    entries: readonly DataEntryFact[],
    helpers: PieHelpers,
): DataResult {
    const positive = (part: Part): number => Math.max(0, part.value ?? 0);
    const total = normal.reduce((sum, part) => sum + positive(part), 0);
    const grays = drawn.filter((part) => part.role === "missing");
    const max = typeof spec.whole === "object" ? spec.whole.max : null;
    const denominator = max ?? total;
    if (normal.length === 0 || denominator <= 0) {
        const undrawn: CodedFact<DataUndrawnCode> =
            normal.length > 0 ? { code: "data.zeroTotal", params: { channel: "node.pieData" } } : helpers.undrawn();
        const empty = spec.empty ?? "none";
        const fills =
            empty === "none" && grays.length === 0
                ? {}
                : { "node.pieColors": helpers.emptyColor, "node.pieSizes": "1", "node.pieOpacities": "1" };
        return { entries, undrawn, fills };
    }

    const room = 1 - GRAY_SHARE * grays.length;
    const slices = drawn
        .filter((part) => part.role === "missing" || (part.value !== null && !Number.isNaN(part.value)))
        .map((part) => ({
            part,
            share: part.role === "missing" ? GRAY_SHARE : (room * positive(part)) / denominator,
        }));
    const colors = slices.map(({ part }) => helpers.colorOf(part));
    const sizes = slices.map(({ share }) => share);
    const used = sizes.reduce((sum, share) => sum + share, 0);
    if (max !== null && typeof spec.whole === "object" && spec.whole.track !== undefined && used < 1) {
        colors.push(spec.whole.track);
        sizes.push(1 - used);
    } else if (max !== null && used < 1) {
        // An undrawn rest of the turn: a slice no one sees.
        colors.push("transparent");
        sizes.push(1 - used);
    }

    const fills: Record<string, string> = {
        "node.pieColors": colors.join(" "),
        "node.pieSizes": sizes.map((share) => round6(share)).join(" "),
        "node.pieOpacities": sizes.map((_, at) => (colors[at] === "transparent" ? "0" : "1")).join(" "),
    };
    if ((spec.labels ?? "none") !== "none") {
        fills["node.shapeTexts"] = sliceTexts(spec, slices, helpers);
    }

    return { entries, undrawn: null, fills };
}

/**
 * A pie's slice texts appended to the texts beneath, at each slice's middle.
 * @param spec - The spec.
 * @param slices - The slices and their shares.
 * @param helpers - What the preparation knows.
 * @returns The `node.shapeTexts` JSON.
 */
function sliceTexts(
    spec: PieData,
    slices: readonly { readonly part: Part; readonly share: number }[],
    helpers: PieHelpers,
): string {
    let held: unknown[] = [];
    const beneath = helpers.beneath("node.shapeTexts");
    if (typeof beneath === "string" && beneath.trim() !== "") {
        try {
            const parsed: unknown = JSON.parse(beneath);
            held = Array.isArray(parsed) ? parsed : [];
        } catch {
            held = [];
        }
    }

    // ponytail: slice middles assume the disc's default rotation and radius; read node.pieRotation and
    // node.pieRadius beneath if texts must follow a turned or shrunk pie.
    let turned = 0;
    const texts = slices.flatMap(({ part, share }) => {
        const middle = (turned + share / 2) * 2 * Math.PI;
        turned += share;
        if (part.role === "missing") {
            return [];
        }

        const words = spec.labels === "percent" ? `${String(Math.round(share * 100))}%` : helpers.write(part);
        return [
            [
                round(SLICE_TEXT_AT * Math.sin(middle)),
                round(SLICE_TEXT_AT * Math.cos(middle)),
                escapeLabelMarkup(words),
            ],
        ];
    });
    return JSON.stringify([...held, ...texts]);
}

/**
 * A coordinate, rounded.
 * @param value - The number.
 * @returns It, to four decimals.
 */
function round(value: number): number {
    return Math.round(value * 1e4) / 1e4;
}

/**
 * A record on one node.
 * @param spec - The spec.
 * @param reads - Its entry reads.
 * @param index - The node.
 * @param source - What it is resolved against.
 * @param undrawnOf - Why a node draws nothing.
 * @returns What it draws.
 */
function resolveRecord(
    spec: RecordData,
    reads: readonly EntryRead[],
    index: number,
    source: DataSource,
    undrawnOf: (reads: readonly EntryRead[]) => CodedFact<DataUndrawnCode>,
): DataResult {
    const entries = reads.map((read) => read.fact);
    let rows = reads.flatMap((read) => read.rows);
    if (rows.length === 0) {
        return { entries, undrawn: undrawnOf(reads), fills: {} };
    }

    if (spec.most !== undefined && rows.length > spec.most) {
        const left = rows.length - spec.most;
        const more = (spec.more ?? "+{n}").replaceAll("{n}", String(left));
        rows = [...rows.slice(0, spec.most), { name: "", text: more, number: false, entry: { text: more } }];
    }

    const header = spec.header === undefined ? undefined : source.value(index, spec.header);
    const headerText = header === undefined || header === null ? null : formatValue(header);
    if ((spec.layout ?? "table") === "points") {
        const texts = [
            ...(headerText === null ? [] : [[escapeLabelMarkup(headerText)]]),
            ...rows.map((row) => {
                const look = {
                    ...row.entry.style,
                    ...(row.entry.color === undefined ? {} : { color: row.entry.color }),
                };
                const words = escapeLabelMarkup(row.text);
                const item = Object.keys(look).length === 0 ? [words] : [words, look];
                return row.entry.at === undefined ? item : [row.entry.at[0], row.entry.at[1], ...item];
            }),
        ];
        return { entries, undrawn: null, fills: { "node.shapeTexts": JSON.stringify(texts) } };
    }

    const line = (text: string, color?: string): { text: string } => ({
        text: color === undefined ? escapeLabelMarkup(text) : `<color='${color}'>${escapeLabelMarkup(text)}</color>`,
    });
    const tableRows = [
        ...(headerText === null ? [] : [{ cells: [{ colspan: 2, lines: [line(headerText)] }] }]),
        ...rows.map((row) => ({
            cells:
                row.name === ""
                    ? [{ colspan: 2, lines: [line(row.text, row.entry.color)] }]
                    : [
                          { align: "left", lines: [line(row.name)] },
                          { align: row.number ? "right" : "left", lines: [line(row.text, row.entry.color)] },
                      ],
        })),
    ].map((row, at) => ({
        ...row,
        ...(spec.rows === "lines" && at > 0 ? { rule: true } : {}),
        ...(spec.rows === "zebra" && at % 2 === 1
            ? { cells: row.cells.map((cell) => ({ ...cell, fill: ZEBRA_FILL })) }
            : {}),
    }));
    return { entries, undrawn: null, fills: { "node.labelTable": JSON.stringify({ rows: tableRows }) } };
}

/** What a data fill's binding answers to the readers that read every binding (a legend, `agreement`). */
const NO_COUNTS = Object.freeze({ seen: 0, unreadable: 0, notPlottable: 0, clamped: 0, other: 0, unmeasured: 0 });

/**
 * The channels a prepared spec writes, each as a binding the repaint and `explain()` read with `paintAt`. The node
 * is resolved once, by the first, and the rest read that answer: they are asked in this order for every node.
 * @param data - The prepared spec.
 * @param spec - The spec.
 * @returns The bindings, in paint order.
 */
export function dataBindings(data: PreparedData, spec: unknown): PreparedBinding[] {
    const { channel } = data;
    const points = (spec as RecordData).layout === "points";
    const fills = FILLS_OF[channel].filter((fill) => {
        if (channel === "node.recordData") {
            return points === (fill === "node.shapeTexts");
        }

        return fill !== "node.shapeTexts" || ((spec as PieData).labels ?? "none") !== "none";
    });
    let last: DataResult | null = null;
    let lastIndex = -1;
    return fills.map((fill, at): PreparedBinding => {
        const paintAt = (index: number, beneath: (channel: Channel) => unknown): EncodedValue | undefined => {
            if (at === 0 || last === null || index !== lastIndex) {
                last = data.resolve(index, beneath);
                lastIndex = index;
            }

            return last.fills[fill];
        };
        return {
            channel: fill,
            path: null,
            scale: null,
            palette: null,
            domain: data.extent,
            categories: data.keys,
            lumped: [],
            categoryValues: new Map(),
            categoryCounts: new Map(),
            hidden: new Set(),
            groups: data.keys.length,
            counts: NO_COUNTS,
            facts: [],
            paint: () => undefined,
            paintIgnoringHidden: () => undefined,
            adjustment: () => undefined,
            paintAt,
            data: { channel, prepared: data },
        };
    });
}
