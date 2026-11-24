/**
 * @file Pie, chart and record from data: the specification a layer writes to `node.pieData`,
 * `node.chartData` or `node.recordData`, the one value formatter, and the field fit a picker reads.
 *
 * A spec is an ordered list of entries. graphty-element reads, counts, formats, orders and colors
 * them per node and fills the fixed lists (`node.pieColors`, `node.chartValues`,
 * `node.labelTable` ...) at the layer's place in the stack. Guide: docs/guide/data-lists.md.
 */

import type { ShapeTextLook } from "../meshes/shapeOutlines";
import type { CodedFact } from "../session/shared";
import type { BindingNumberFormat, Channel, NodeId, PaletteId, Path, ReadableValue, RuleTree } from "./types";

/**
 * Where a path is read when walking a node's surroundings.
 * @since 3.68.0
 */
export interface WalkPath {
    /** The path: `data.amount`, `results.<run>.<field>`. */
    readonly path: Path;
    /** `"edge"`: on the edge walked (edges only). `"node"`: on the node at the other end. Default `"node"`, `"edge"` for edges. */
    readonly on?: "edge" | "node";
}

/**
 * A value computed over a node's edges, neighbors or members: a count, sum, mean, min, max or most common value,
 * optionally split into one value per group (a value's category, the edge's direction, or a time period), which
 * spreads the entry into one part per group. A walk that keeps nothing is a missing value.
 * @since 3.68.0
 */
export interface GraphMeasure {
    /**
     * What is walked: `"edges"` each edge at the node (a self-loop once); `"neighbors"` the nodes within `hops`,
     * each once, never the node itself; `"members"` the nodes a group node holds (their `parent` is it), or the
     * members a collapsed group keeps.
     */
    readonly over: "edges" | "neighbors" | "members";
    /** Edges and neighbors. Default `"both"`. Read as `"both"` on an undirected graph. */
    readonly direction?: "in" | "out" | "both";
    /** Neighbors: 1, 2 or 3. Default 1. */
    readonly hops?: 1 | 2 | 3;
    /** Only the edges (or nodes) this rule keeps: one `range` or `categories` leaf. */
    readonly where?: RuleTree;
    /** Where `where` is read. Default `"edge"` over edges, `"node"` otherwise. */
    readonly whereOn?: "edge" | "node";
    /** What is computed. `"mode"` is the most common value (ties go to the first in natural name order). */
    readonly measure: "count" | "sum" | "mean" | "min" | "max" | "mode";
    /** What sum, mean, min, max and mode read; absent for count. */
    readonly of?: WalkPath;
    /**
     * Spread into one value per group: by the value at a path (each list item its own group), by direction
     * (`"in"` and `"out"`, edges on a directed graph; `"both"` on an undirected one), or by time period. Time groups
     * are keyed `YYYY`, `YYYY-Qn`, `YYYY-MM`, `YYYY-Www` (ISO week), `YYYY-MM-DD` or `YYYY-MM-DDTHH`, in UTC, so name
     * order is time order; every period from the graph's first to its newest date (or inside the window) is
     * present, holding 0 for a count and missing for every other measure.
     */
    readonly groupBy?:
        | ({ readonly by: "value" } & WalkPath)
        | { readonly by: "direction" }
        | ({
              readonly by: "time";
              readonly period: "hour" | "day" | "week" | "month" | "quarter" | "year";
              readonly window?: { readonly last: number; readonly from: "newest" | "now" };
          } & WalkPath);
}

/**
 * How an entry's value is written: a number format, plus `prefix`, `suffix` and `date`. The same
 * shape a binding's `format` takes.
 * @since 3.68.0
 */
export type DataFormat = BindingNumberFormat;

/**
 * What every entry may carry beside its source.
 * @since 3.68.0
 */
export interface DataEntryCommon {
    /** The entry's name: a slice's or a series' name in the facts, a record row's name cell. Absent: the column's plain name. */
    readonly label?: string;
    /** How its value is written. */
    readonly format?: DataFormat;
    /** A slice's or a bar's color (a non-spreading entry), a record value's text color. Absent: the palette's color for its key. */
    readonly color?: string;
    /** A pie slice's opacity, 0 to 1 (a non-spreading entry). Absent: 1. */
    readonly opacity?: number;
    /**
     * A missing value: `"skip"` leaves it out (a pie's default), `"gray"` draws a thin gray slice or a gray bar, `"zero"`
     * reads it as 0, `"gap"` leaves a chart's place empty (a chart's default), `"drop"` leaves a record's row out (a
     * record's default), `{ text }` writes the text in the record's value cell.
     */
    readonly missing?: "skip" | "gray" | "zero" | "gap" | "drop" | { readonly text: string };
    /**
     * What a list value gives: `"count"` one part per distinct value holding how often it occurs (text lists' default),
     * `"equal"` one part per distinct value holding 1, `"items"` one part per item (number lists' default), or one part
     * holding the list's `"sum"`, `"mean"`, `"min"` or `"max"`.
     */
    readonly each?: "count" | "equal" | "items" | "sum" | "mean" | "min" | "max";
    /** Record, points layout: where the value is drawn, in the frame `node.shapeTexts` uses. */
    readonly at?: readonly [number, number];
    /** Record: what differs from the label (size, font, rotation), as a `node.shapeTexts` entry's look. */
    readonly style?: ShapeTextLook;
}

/**
 * One entry of a data spec: a column or result (`field`), every column whose name starts with some text
 * (`pattern`, or every other number column with `except`), a value over the node's surroundings (`graph`),
 * a fixed number (`value`, pie and chart) or fixed words (`text`, record).
 * @since 3.68.0
 */
export type DataEntry =
    | (DataEntryCommon & { readonly field: Path })
    | (DataEntryCommon & { readonly pattern: string; readonly except?: true })
    | (DataEntryCommon & { readonly graph: GraphMeasure })
    | (DataEntryCommon & { readonly value: number })
    | (DataEntryCommon & { readonly text: string });

/**
 * A category's own color or name, by its key as the data spells it.
 * @since 3.68.0
 */
export type CategoryOverrides = Readonly<
    Record<string, { readonly color?: string; readonly label?: string; readonly opacity?: number }>
>;

/**
 * What a pie's and a chart's spec share.
 * @since 3.68.0
 */
export interface DataListCommon {
    /** The entries, in order. At most 256. */
    readonly entries: readonly DataEntry[];
    /** `"listed"`: entry order, a spread's parts in natural name order (default). `"largest"`: biggest first. `"name"`: natural name order. */
    readonly order?: "listed" | "largest" | "name";
    /** Keep the `keep` largest parts per node and merge the rest into one Other part, drawn last. Absent: keep all. */
    readonly keep?: number;
    /** Other's name and color (default `#686868`). */
    readonly other?: { readonly label?: string; readonly color?: string };
    /** A categorical palette; absent, the element's default categorical palette. A chart of kind "cells" reads it as a ramp. */
    readonly palette?: PaletteId;
    /** The spec's own colors, in place of `palette`. */
    readonly colors?: readonly string[];
    /** Per-category colors and names, by key. */
    readonly categories?: CategoryOverrides;
}

/**
 * The value `node.pieData` takes.
 * @since 3.68.0
 */
export interface PieData extends DataListCommon {
    /** `"total"`: each part over the node's own total (default). `{ max }`: a gauge, each part over `max`, the rest in `track`. */
    readonly whole?: "total" | { readonly max: number; readonly track?: string };
    /** Text on each slice: its value in its entry's format, or its share as a whole percent. Default `"none"`. */
    readonly labels?: "none" | "value" | "percent";
    /** A node with no value at all: draw nothing (default), a full ring, or one full slice, in `emptyColor`. */
    readonly empty?: "none" | "ring" | "slice";
    /** Default `#BDBDBD`. */
    readonly emptyColor?: string;
}

/**
 * The value `node.chartData` takes.
 * @since 3.68.0
 */
export interface ChartData extends DataListCommon {
    /** `"entry"`: each entry (each pattern column) its own series (default). `{ separator }`: a column's series is its name up to its last separator. */
    readonly series?: "entry" | { readonly separator: string };
    /** Where the values run from and to. */
    readonly scale?: {
        /** One scale over the layer's nodes (default), the graph's, or each node its own. Ignored when min and max are both given. */
        readonly share?: "layer" | "graph" | "node";
        readonly min?: number;
        readonly max?: number;
        /** A "cells" ramp's middle. Default 0 when the values span 0, else the low end. */
        readonly center?: number;
        /** Percentiles 0..100 the shared extent is cut at. */
        readonly clip?: readonly [number, number];
        /** Per series: raw values (default), each value's share of the series total, or its rank in the series. */
        readonly normalize?: "raw" | "share" | "rank";
    };
}

/**
 * The value `node.recordData` takes.
 * @since 3.68.0
 */
export interface RecordData {
    /** The rows, in order. At most 256. */
    readonly entries: readonly DataEntry[];
    /** `"table"`: `node.labelTable`, a name cell and a value cell per row (default). `"points"`: `node.shapeTexts`, the value alone. */
    readonly layout?: "table" | "points";
    /** A first row spanning both cells, holding this value. */
    readonly header?: Path;
    /** Cell rules or alternate fills. Default `"plain"`. */
    readonly rows?: "plain" | "lines" | "zebra";
    /** The most rows drawn; past it one row holding `more` with `{n}` replaced by how many were left out. */
    readonly most?: number;
    /** Default `"+{n}"`. */
    readonly more?: string;
}

/**
 * The three channels that take a data spec.
 * @since 3.68.0
 */
export type DataChannel = "node.pieData" | "node.chartData" | "node.recordData";

/**
 * The fixed lists each data channel fills, which a layer holding the data spec may not also hold (styles.add refuses
 * them as `data-and-fixed`): an editor that turns a layer's pie, chart or record into data unsets these in the same
 * write, and one that turns it back into fixed values unsets the spec.
 * @since 3.68.0
 */
export const DATA_FIXED_CHANNELS: Readonly<Record<DataChannel, readonly Channel[]>> = {
    "node.pieData": ["node.pieColors", "node.pieSizes", "node.pieOpacities"],
    "node.chartData": ["node.chartValues", "node.chartColors", "node.chartMin", "node.chartMax"],
    "node.recordData": ["node.shapeTexts", "node.labelTable"],
};

/**
 * Why a node draws nothing from a data spec, as `DataFacts.undrawn`'s code. Each carries `channel`.
 *
 * | Code | Params |
 * | --- | --- |
 * | `data.noEntries` | - |
 * | `data.noValues` | `paths`: every path the entries read; the node holds none |
 * | `data.notNumbers` | `path`, `valueKind`: a pie or chart entry's value here is not a number |
 * | `data.zeroTotal` | - (a pie whose parts sum to 0) |
 * | `data.nothingOver` | `over` |
 * | `data.patternEmpty` | `pattern`, `except` |
 * | `data.paintedOver` | `layerId`, `filled`: a layer above writes a channel this one fills |
 * | `data.notPainted` | `layerId`: the layer paints no spec on this channel now (hidden, disabled, or none) |
 *
 * OPEN UNION: codes may be added in a minor release.
 * @since 3.68.0
 */
export type DataUndrawnCode =
    | "data.noEntries"
    | "data.noValues"
    | "data.notNumbers"
    | "data.zeroTotal"
    | "data.nothingOver"
    | "data.patternEmpty"
    | "data.paintedOver"
    | "data.notPainted";

/**
 * Why `styles.add` or `styles.update` refuses a data spec: the refusal's `details.reason` (and `LayerProblem.reason`).
 * `shape` is a spec that is not `{ entries: [...] }` or holds more than 256 entries; `where` is a Graph value's `where`
 * that is not one `range` or `categories` leaf (since 3.68.0); `option` is a spec option or entry field of the wrong
 * type or outside its listed values (`whole.max` not a number above 0, an unknown `order`, a `label` that is not
 * text, ...); the rest are listed in the guide.
 * @since 3.68.0
 */
export type DataSpecReason =
    | "data-and-fixed"
    | "entry-source"
    | "entry-kind"
    | "measure-of"
    | "hops"
    | "keep"
    | "most"
    | "clip"
    | "window"
    | "palette"
    | "colors"
    | "shape"
    | "where"
    | "option";

/**
 * Why a value does not fit a data channel: `data.needsNumbers` (`path`, `valueKind`) for text, yes-no or a time offered
 * to a pie or chart; `data.wrongHalf` (`path`, `on`) for an edge value offered to a node channel.
 * @since 3.68.0
 */
export type DataFitCode = "data.needsNumbers" | "data.wrongHalf";

/**
 * One part of a spreading entry on one node.
 * @since 3.68.0
 */
export interface DataPartFact {
    readonly key: string;
    readonly name: string;
    readonly text: string;
    readonly color: string;
    readonly role?: "other";
}

/**
 * One entry's value on one node.
 * @since 3.68.0
 */
export interface DataEntryFact {
    /** The value before formatting, or null when missing. */
    readonly value: unknown;
    /** The value in the entry's format; null when missing and the entry draws no text for it. */
    readonly text: string | null;
    /** A spreading entry's parts on this node, in drawn order. */
    readonly parts?: readonly DataPartFact[];
}

/**
 * One category a spec yields, in color order.
 * @since 3.68.0
 */
export interface DataCategoryFact {
    readonly key: string;
    readonly name: string;
    readonly color: string;
    /** True when `categories` pins its color. */
    readonly pinned: boolean;
    /** True for an override whose key no node holds. */
    readonly unseen?: true;
    readonly role?: "other" | "missing";
}

/**
 * What one node draws from a layer's data spec.
 * @since 3.68.0
 */
export interface DataFacts {
    readonly node: NodeId;
    /** The words `node.label` resolves to on it, else its id. */
    readonly name: string;
    /** One per spec entry, in spec order. */
    readonly entries: readonly DataEntryFact[];
    /** Why this node draws nothing; null when it draws. */
    readonly undrawn: CodedFact<DataUndrawnCode> | null;
    /** Every key the spec yields over the nodes the layer covers, in color order. */
    readonly categories: readonly DataCategoryFact[];
}

/** The keys of {@link BindingNumberFormat} that are not `Intl.NumberFormat` options. */
const NOT_INTL = new Set(["locale", "prefix", "suffix", "date"]);

/** Formatters by their options, so a column of a million values builds one. */
const numberFormatters = new Map<string, Intl.NumberFormat>();

/**
 * The `Intl.NumberFormat` a format names, or null when it names no number option.
 * @param format - The format.
 * @returns The formatter.
 */
function numberFormatter(format: DataFormat): Intl.NumberFormat | null {
    const options: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(format)) {
        if (!NOT_INTL.has(key) && value !== undefined) {
            options[key] = value;
        }
    }

    if (Object.keys(options).length === 0 && format.locale === undefined) {
        return null;
    }

    const key = JSON.stringify([format.locale ?? null, options]);
    let made = numberFormatters.get(key);
    if (made === undefined) {
        made = new Intl.NumberFormat(format.locale, options);
        numberFormatters.set(key, made);
    }

    return made;
}

/**
 * Write a number in a format, prefix and suffix included. Throws as `Intl.NumberFormat` does for options it refuses.
 * @param value - The number.
 * @param format - The format.
 * @returns The text.
 */
export function formatNumber(value: number, format: DataFormat | undefined): string {
    if (format === undefined) {
        return String(value);
    }

    const formatter = numberFormatter(format);
    return `${format.prefix ?? ""}${formatter === null ? String(value) : formatter.format(value)}${format.suffix ?? ""}`;
}

/** Seconds in each unit a relative date is written in, largest first. */
const RELATIVE_UNITS: readonly (readonly [Intl.RelativeTimeFormatUnit, number])[] = [
    ["year", 31_536_000],
    ["month", 2_592_000],
    ["week", 604_800],
    ["day", 86_400],
    ["hour", 3600],
    ["minute", 60],
    ["second", 1],
];

/**
 * An instant a value names: a Date, a number of milliseconds, or text `Date.parse` reads.
 * @param value - The value.
 * @returns Milliseconds, or NaN.
 */
export function instantOf(value: unknown): number {
    if (value instanceof Date) {
        return value.getTime();
    }

    if (typeof value === "number") {
        return value;
    }

    return typeof value === "string" && value.trim() !== "" ? Date.parse(value) : Number.NaN;
}

/**
 * Write an instant as a date.
 * @param ms - The instant.
 * @param format - The format, whose `date` is set.
 * @param newest - What a relative date is measured against.
 * @returns The text, or null when the value is not an instant.
 */
function formatDate(ms: number, format: DataFormat, newest: number): string | null {
    if (!Number.isFinite(ms) || format.date === undefined) {
        return null;
    }

    if (format.date.style === "relative") {
        const seconds = (ms - newest) / 1000;
        const [unit, size] = RELATIVE_UNITS.find(([, each]) => Math.abs(seconds) >= each) ?? ["second", 1];
        return new Intl.RelativeTimeFormat(format.locale, { numeric: "auto" }).format(Math.round(seconds / size), unit);
    }

    const { dateStyle, timeStyle } = format.date;
    return new Intl.DateTimeFormat(format.locale, {
        dateStyle: dateStyle ?? (timeStyle === undefined ? "medium" : undefined),
        ...(timeStyle === undefined ? {} : { timeStyle }),
        timeZone: "UTC",
    }).format(ms);
}

/**
 * Write any data value as text in a format: a number through `Intl.NumberFormat`, an instant through
 * `Intl.DateTimeFormat` or `Intl.RelativeTimeFormat` when the format names a `date`, text and yes-no with only the
 * prefix and suffix, a list item by item joined with ", ", a group object as "key value" pairs. The one formatter the
 * canvas, the data facts and an editor's preview all use.
 * @param value - The value. Absent and null write "".
 * @param format - The format; absent writes a number in full, as `String` does.
 * @param newest - What a relative date is measured against, in milliseconds; absent, now. The element passes the
 *     newest date in the data, so a saved file draws the same text tomorrow.
 * @returns The text.
 * @since 3.68.0
 */
export function formatValue(value: unknown, format?: DataFormat, newest: number = Date.now()): string {
    if (value === undefined || value === null) {
        return "";
    }

    if (Array.isArray(value)) {
        return value.map((each) => formatValue(each, format, newest)).join(", ");
    }

    if (format?.date !== undefined) {
        const date = formatDate(instantOf(value), format, newest);
        if (date !== null) {
            return `${format.prefix ?? ""}${date}${format.suffix ?? ""}`;
        }
    }

    if (typeof value === "number") {
        return formatNumber(value, format);
    }

    if (typeof value === "object" && !(value instanceof Date)) {
        return Object.entries(value as Record<string, unknown>)
            .map(([key, each]) => `${key} ${formatValue(each, format, newest)}`)
            .join(", ");
    }

    let text = typeof value === "string" ? value : JSON.stringify(value);
    if (value instanceof Date) {
        text = value.toISOString();
    }

    return `${format?.prefix ?? ""}${text}${format?.suffix ?? ""}`;
}

/**
 * Whether a readable value fits a data channel, as a coded reason when it does not. A record takes every node value.
 * @param channel - The data channel.
 * @param value - The value, as `session.data.readableValues()` lists it.
 * @returns Null when it fits.
 * @since 3.68.0
 */
export function dataFit(channel: DataChannel, value: ReadableValue): CodedFact<DataFitCode> | null {
    if (value.on === "edge") {
        return { code: "data.wrongHalf", params: { path: value.path, on: value.on } };
    }

    if (channel === "node.recordData" || value.spread !== undefined) {
        return null;
    }

    const kind = value.valueKind ?? value.kind;
    return kind === "number" ? null : { code: "data.needsNumbers", params: { path: value.path, valueKind: kind } };
}

/** One collator for every natural name order, so `expr_2` sorts before `expr_10` on every machine. */
const NATURAL = new Intl.Collator("en", { numeric: true, sensitivity: "base" });

/**
 * Compare two names in natural order: digits as numbers, case ignored.
 * @param a - One name.
 * @param b - The other.
 * @returns Negative, zero or positive.
 * @since 3.68.0
 */
export function naturalCompare(a: string, b: string): number {
    return NATURAL.compare(a, b) || (a < b ? -1 : Number(a > b));
}
