/**
 * @file The timeline: a designated time field, its index, and a window that moves along it.
 *
 * ONE WINDOW, ONE OWNER. `session.time` adds no second visibility model: every move is the
 * existing `visibility.window` command (`session.visibility.setWindow`), so the masks, undo, the
 * project file and `visibility:changed` all behave as they do for a window set by hand. What this
 * adds is the designated field (so the attribute is never passed by hand), a sorted index over it
 * (extent and histogram bins without a pass over the graph), a transport (play, pause, step,
 * seek), and what entered and left on each step.
 *
 * PRESENTATION-NEUTRAL: every answer is numbers, ids and codes. The element never formats a date.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import { type GraphSnapshot, INVALID_INDEX } from "@graphty/graph-format";

import type { EdgeId, MeasurementDeclaration, NodeId, Path, RunId, Scope } from "../../catalog/types";
import { GraphtyError } from "../../errors";
import type { Dispatcher } from "../project/Dispatcher";
import type { Run } from "../runs";
import { edgeSpaceOf } from "../scope/index";
import type { CodedFact } from "../shared";
import type { HistoryStepId, SessionEventMap } from "../types";
import type {
    FilterResult,
    FilterValueSource,
    SessionVisibilityApi,
    TimeStep,
    TimeWindow,
    VisibilityChange,
} from "../visibility";
import type { TimeInstants, TimeResultsPolicy } from "../visibility/filter";
import { addSteps, alignTo, isCalendarStep, readInstant, TIME_UNITS, type TimeUnit } from "./parse";

export type { TimeUnit } from "./parse";

// ---------------------------------------------------------------------------------------------
// What a consumer reads and passes
// ---------------------------------------------------------------------------------------------

/** One table's time column. */
export interface TimeSource {
    /** The column holding the instant, such as `sent` or `data.sent`. */
    readonly start: Path;
    /** How numbers in it are read; default `"ms"` (epoch milliseconds). Strings and dates ignore it. */
    readonly unit?: TimeUnit;
}

/**
 * The designated time field: on nodes, on edges, or on both (then both name the same column).
 * Designating a column makes it a time column: its measurement reads `"time"`.
 */
export interface TimeField {
    readonly nodes?: TimeSource;
    readonly edges?: TimeSource;
}

/** How many elements of one kind have a usable time. */
export interface TimeCounts {
    /** Elements whose value parsed. */
    readonly timed: number;
    /** Elements with no value. */
    readonly untimed: number;
    /** Elements whose value did not parse. They are treated as having no time. */
    readonly unparsed: number;
}

/** A notice about the values of a designated column. */
export type TimeNoticeCode = "time.unparsed" | "time.parsed-loosely" | "time.unit-suspect";

/** What designating a field found. */
export interface TimeFieldResult {
    readonly field: TimeField | null;
    readonly nodes?: TimeCounts;
    readonly edges?: TimeCounts;
    /**
     * `time.unparsed` (`{ path, count, examples }`), `time.parsed-loosely` (`{ path, count }`:
     * values only `Date.parse` understood), `time.unit-suspect` (`{ path, suggested: "s" }`: every
     * number reads as 1973 to 2286 in seconds but 1970 in milliseconds). Suggested, never applied.
     */
    readonly notices: readonly CodedFact<TimeNoticeCode>[];
}

/** The span of the data's time, half-open: `to` is just past the last instant. */
export interface TimeExtent {
    readonly from: number;
    readonly to: number;
    readonly nodes: TimeCounts;
    readonly edges: TimeCounts;
}

/** One histogram bar: elements whose instant is in `[start, end)`. */
export interface TimeBin {
    readonly start: number;
    readonly end: number;
    readonly nodes: number;
    readonly edges: number;
}

/** What {@link TimeApi.bins} counts. */
export interface TimeBinsOptions {
    /** How many equal bins; default 100. Ignored when `step` is given. */
    readonly count?: number;
    /** A bin width: milliseconds (or ordinal units), or a calendar step aligned in UTC. */
    readonly step?: TimeStep;
    /** Where the bins start; default the extent's start. */
    readonly from?: number;
    /** Where the bins end; default the extent's end. */
    readonly to?: number;
    /** `"visible"` counts only elements visible now (every filter and the window). Default `"all"`. */
    readonly scope?: "all" | "visible";
    /**
     * Count only these elements: the selection's activity over the histogram. With `incident`, the
     * edges at the given nodes count too, so a node selection over edge time shows its edges' activity.
     */
    readonly of?: {
        readonly nodes?: readonly NodeId[];
        readonly edges?: readonly EdgeId[];
        readonly incident?: boolean;
    };
}

/** Node and edge ids. */
export interface TimeIds {
    readonly nodes: readonly NodeId[];
    readonly edges: readonly EdgeId[];
}

/** What entered and left the visible graph on the last move. */
export interface TimeChanges {
    readonly entered: TimeIds;
    readonly left: TimeIds;
}

/** Node and edge counts. */
export interface TimeCountPair {
    readonly nodes: number;
    readonly edges: number;
}

/** What one move of the window did. Numbers only; the application writes the words. */
export interface TimeStepEvent {
    /** Step number from the start of the data, by the window's step. */
    readonly index: number;
    readonly from: number;
    readonly to: number;
    readonly visible: TimeCountPair;
    readonly entered: TimeCountPair;
    readonly left: TimeCountPair;
    /** What moved it. */
    readonly cause: "play" | "step" | "seek" | "window";
}

/**
 * A window as `time.window` takes it: the attribute defaults to the designated field, and a bound
 * left out keeps the current window's. With no window yet, `from` defaults to the start of the
 * data and `to` to one step after `from`, so `time.window({ step: "week" })` opens the first week.
 */
export type TimeWindowInput = Omit<TimeWindow, "attribute" | "from" | "to"> & {
    readonly attribute?: Path;
    readonly from?: number | string;
    readonly to?: number | string;
};

/** How playback moves the window: both ends (`sliding`), or only the end (`cumulative`). */
export type TimePlayMode = "sliding" | "cumulative";

/** What `time.play` takes. Each one given is also written onto the window, so it is saved. */
export interface TimePlayOptions {
    /** How far each step moves; default the window's step, else its width. */
    readonly step?: TimeStep;
    /** Sliding or cumulative; default the window's mode, else sliding. */
    readonly mode?: TimePlayMode;
    /** Milliseconds between steps; default 1000. */
    readonly interval?: number;
    /** Start again from the beginning at the end, instead of stopping; default false. */
    readonly loop?: boolean;
}

/** The timeline: designate a time field, read its distribution, and move a window along it. */
export interface TimeApi {
    /** The designated field, or null when none is. */
    readonly field: TimeField | null;
    /**
     * Designate the time field, or clear it with null: one undoable step, saved in the project.
     * The column's measurement becomes `"time"`. The numbers it reports come from the index.
     * @param field - Nodes, edges or both; both must name the same column.
     * @returns What the values held.
     * @throws `E_BAD_COMMAND` (`reason`: `"declared-not-time"`, `"time-paths-differ"`, `"unit"`).
     */
    setField(field: TimeField | null): Promise<TimeFieldResult>;
    /** Resolves once the designated field is indexed, so the facts below answer synchronously. */
    readonly ready: Promise<void>;
    /** The span of the data's time, or null when nothing is designated or nothing has a time. */
    extent(): TimeExtent | null;
    /**
     * The histogram of the designated field.
     * @param options - Count or step, range, and which elements to count.
     * @returns The bins, or null when there is no extent.
     * @throws `E_OPTION_RANGE` for a bad count or more than 10,000 bins; `E_BAD_COMMAND` with
     *     `reason: "calendar-step-on-ordinal"` for a calendar step on ordinal time.
     */
    bins(options?: TimeBinsOptions): readonly TimeBin[] | null;
    /**
     * The ids that entered and left the visible graph on the last move made through this API.
     * @returns The ids; empty before the first move.
     */
    changes(): TimeChanges;
    /** The window in force (`visibility.window`). */
    readonly current: TimeWindow | null;
    /**
     * Set or clear the window: `visibility.setWindow` with the attribute filled in from the
     * designated field, and `nodes: "ends"` when only edges carry time (nodes follow their edges).
     * Bounds given as text are read as the field reads text.
     * @param window - The window, or null.
     * @returns The run of the `visibility.window` command.
     * @throws `E_NO_TIME_FIELD` when no attribute is given and nothing is designated.
     */
    window(window: TimeWindowInput | null): Run<FilterResult>;
    /**
     * Start advancing the window by its step every `interval` milliseconds, until the end of the
     * data (`time:end`, then paused). With no window, one step wide at the start of the data is
     * opened. Every step of one play is ONE undoable step: undo returns to the window before it.
     * @param options - Step, mode, interval and loop.
     * @throws `E_NO_TIME_FIELD` when nothing is designated and the window names no attribute.
     */
    play(options?: TimePlayOptions): void;
    /** Stop advancing. */
    pause(): void;
    /**
     * Move the window by whole steps (negative goes back). One undoable step.
     * @param count - How many steps.
     * @returns What the move did.
     */
    stepBy(count: number): Promise<TimeStepEvent>;
    /**
     * Move the window to start at an instant (sliding) or end there (cumulative). One undoable step.
     * @param instant - Epoch milliseconds, or an ordinal value.
     * @returns What the move did.
     */
    seek(instant: number): Promise<TimeStepEvent>;
    /** Whether playback is running. */
    readonly playing: boolean;
    /** The window's mode. */
    readonly mode: TimePlayMode;
    /** Milliseconds between playback steps. */
    readonly interval: number;
}

/** What `session.time` reads from the rest of the session. */
export interface TimeSources {
    readonly snapshot: () => GraphSnapshot;
    /** Moves on every write to the graph's rows or records. */
    readonly token: () => number;
    readonly values: FilterValueSource;
    /** The designation, as `data.knownFields` holds it. */
    readonly knownFields: () => KnownTimeFields;
    readonly declarations: () => ReadonlyMap<string, MeasurementDeclaration>;
    readonly setKnownFields: (fields: KnownTimeFields) => Promise<unknown>;
    readonly dispatcher: Dispatcher;
    readonly visibility: SessionVisibilityApi;
    readonly runs: () => readonly Run[];
    readonly digestOf: (spec: Scope) => string;
    readonly emit: <K extends keyof SessionEventMap>(event: K, detail: SessionEventMap[K]) => void;
}

/** The four `data.knownFields` keys that hold the designation. */
export interface KnownTimeFields {
    readonly nodeTimePath: string | null;
    readonly nodeTimeUnit: TimeUnit | null;
    readonly edgeTimePath: string | null;
    readonly edgeTimeUnit: TimeUnit | null;
}

/** What the rest of the session reads back from the timeline. */
export interface TimeInternals {
    /** Parsed instants per row for a designated path, which the window reads instead of parsing. */
    instants(path: Path): { readonly node: TimeInstants | null; readonly edge: TimeInstants | null } | null;
    /** A run's scope digest that a `results: "keep"` window move accepted as current. */
    acceptedDigest(id: RunId, ranOn: string): string | undefined;
    /** Apply the window's `results` policy after a visibility change. */
    visibilityChanged(change: VisibilityChange): void;
    /** Stop playback for good. */
    dispose(): void;
}

// ---------------------------------------------------------------------------------------------
// The index
// ---------------------------------------------------------------------------------------------

/** One kind's instants: per row, and sorted with the row of each. */
interface KindIndex extends TimeInstants {
    readonly sorted: Float64Array;
    readonly perm: Uint32Array;
    readonly counts: TimeCounts;
    readonly loose: number;
    readonly examples: readonly string[];
    readonly suspect: boolean;
}

/** The index of the designated field over one snapshot. */
interface FieldIndex {
    readonly key: string;
    readonly path: string;
    readonly unit: TimeUnit;
    readonly node: KindIndex | null;
    readonly edge: KindIndex | null;
}

const NO_COUNTS: TimeCounts = Object.freeze({ timed: 0, untimed: 0, unparsed: 0 });
const NO_IDS: TimeIds = Object.freeze({ nodes: Object.freeze([]), edges: Object.freeze([]) });
const NO_CHANGES: TimeChanges = Object.freeze({ entered: NO_IDS, left: NO_IDS });
const MAX_BINS = 10_000;
const DEFAULT_INTERVAL = 1000;
const ATTRIBUTE_PREFIX = "data.";

/**
 * A column name without the `data.` prefix a path carries.
 * @param path - The path or column.
 * @returns The column.
 */
function columnOf(path: string): string {
    return path.startsWith(ATTRIBUTE_PREFIX) ? path.slice(ATTRIBUTE_PREFIX.length) : path;
}

/**
 * The first position in a sorted array holding a value at or above `at`.
 * @param sorted - Ascending values.
 * @param at - The value.
 * @returns The position, `sorted.length` when every value is below.
 */
function lowerBound(sorted: ArrayLike<number>, at: number): number {
    let lo = 0;
    let hi = sorted.length;
    while (lo < hi) {
        const mid = (lo + hi) >>> 1;
        if (sorted[mid] < at) {
            lo = mid + 1;
        } else {
            hi = mid;
        }
    }

    return lo;
}

/**
 * Parse one kind's column once and sort it.
 * @param count - How many rows.
 * @param read - Reads one row's value.
 * @param unit - How numbers are read.
 * @returns The index.
 */
function buildKind(count: number, read: (row: number) => unknown, unit: TimeUnit): KindIndex {
    const rows = new Float64Array(count);
    let untimed = 0;
    let unparsed = 0;
    let loose = 0;
    let numbers = 0;
    let secondsLike = 0;
    const examples: string[] = [];
    for (let row = 0; row < count; row++) {
        const value = read(row);
        const { at, how } = readInstant(value, unit);
        rows[row] = at;
        if (how === "missing") {
            untimed++;
        } else if (how === "unparsed") {
            unparsed++;
            if (examples.length < 3) {
                examples.push(String(value));
            }
        } else if (how === "loose") {
            loose++;
        }

        if (typeof value === "number" && Number.isFinite(value)) {
            numbers++;
            if (value >= 1e8 && value < 1e10) {
                secondsLike++;
            }
        }
    }

    const timed = count - untimed - unparsed;
    const perm = new Uint32Array(timed);
    let next = 0;
    for (let row = 0; row < count; row++) {
        if (!Number.isNaN(rows[row])) {
            perm[next++] = row;
        }
    }

    // ponytail: a comparator sort, about 5x slower than the radix argsort the design measured;
    // switch when a 1M-element build matters.
    perm.sort((a, b) => rows[a] - rows[b]);
    const sorted = Float64Array.from(perm, (row) => rows[row]);

    return {
        rows,
        timed,
        sorted,
        perm,
        counts: Object.freeze({ timed, untimed, unparsed }),
        loose,
        examples: Object.freeze(examples),
        suspect: unit === "ms" && numbers > 0 && secondsLike === numbers,
    };
}

/**
 * The refusal for a malformed timeline call.
 * @param message - What is wrong.
 * @param details - The offending values, with a `reason` code.
 * @returns The error.
 */
function badCommand(message: string, details: Readonly<Record<string, unknown>>): GraphtyError {
    return new GraphtyError({ code: "E_BAD_COMMAND", message, source: "data", details });
}

/**
 * A window bound as a number: text is read as the field reads text.
 * @param bound - The bound.
 * @returns The number.
 */
function boundOf(bound: number | string): number {
    return typeof bound === "number" ? bound : readInstant(bound, "ms").at;
}

/**
 * The first position in a sorted array holding a value above `at`.
 * @param sorted - Ascending values.
 * @param at - The value.
 * @returns The position.
 */
function upperBound(sorted: ArrayLike<number>, at: number): number {
    let lo = 0;
    let hi = sorted.length;
    while (lo < hi) {
        const mid = (lo + hi) >>> 1;
        if (sorted[mid] <= at) {
            lo = mid + 1;
        } else {
            hi = mid;
        }
    }

    return lo;
}

/**
 * The edges of a histogram's bins, first start to last end.
 * @param from - Where the bins start (a calendar step aligns it down).
 * @param to - Where they end.
 * @param options - The count or the step.
 * @returns The edges, one more than the bins.
 */
function binBounds(from: number, to: number, options: TimeBinsOptions): number[] {
    const tooMany = (value: unknown): GraphtyError =>
        new GraphtyError({
            code: "E_OPTION_RANGE",
            message: `A histogram has 1 to ${MAX_BINS} bins, and a step is a positive number or a calendar step.`,
            source: "data",
            details: { option: options.step === undefined ? "count" : "step", value, min: 1, max: MAX_BINS },
        });
    const bounds: number[] = [];
    const { step } = options;
    if (step === undefined) {
        const count = options.count ?? 100;
        if (!Number.isInteger(count) || count < 1 || count > MAX_BINS) {
            throw tooMany(count);
        }

        for (let bin = 0; bin < count; bin++) {
            bounds.push(from + ((to - from) * bin) / count);
        }
    } else {
        if (!isCalendarStep(step) && !(step > 0)) {
            throw tooMany(step);
        }

        for (let at = alignTo(from, step); at < to; at = addSteps(at, step, 1)) {
            if (bounds.length === MAX_BINS) {
                throw tooMany(step);
            }

            bounds.push(at);
        }
    }

    bounds.push(to);

    return bounds;
}

/**
 * Build the timeline over a session's parts.
 * @param sources - What it reads.
 * @returns The consumer surface and what the session reads back.
 */
export function createTimeApi(sources: TimeSources): { readonly api: TimeApi; readonly internals: TimeInternals } {
    const { visibility, dispatcher } = sources;
    let index: FieldIndex | null = null;
    let lastChanges: (() => TimeChanges) | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let playing = false;
    let interval = DEFAULT_INTERVAL;
    let loop = false;
    /** The history step this play's moves merge into. */
    let playStep: HistoryStepId | null = null;
    let disposed = false;
    /** Runs that were out of date at the last visibility change, so "keep" never revives one. */
    let staleBefore = new Set<RunId>();
    const accepted = new Map<RunId, { readonly from: string; readonly to: string }>();
    let reruns: Promise<unknown> = Promise.resolve();

    /**
     * The designation, from `data.knownFields`.
     * @returns The field, or null.
     */
    const fieldNow = (): TimeField | null => {
        const known = sources.knownFields();
        const sourceOf = (path: string | null, unit: TimeUnit | null): TimeSource | undefined =>
            path === null ? undefined : Object.freeze({ start: path, ...(unit === null ? {} : { unit }) });
        const nodes = sourceOf(known.nodeTimePath, known.nodeTimeUnit);
        const edges = sourceOf(known.edgeTimePath, known.edgeTimeUnit);

        return nodes === undefined && edges === undefined
            ? null
            : Object.freeze({ ...(nodes === undefined ? {} : { nodes }), ...(edges === undefined ? {} : { edges }) });
    };

    /**
     * The index of the designated field over the graph as it stands, built on first use.
     * @returns The index, or null when nothing is designated.
     */
    const indexNow = (): FieldIndex | null => {
        const field = fieldNow();
        if (field === null) {
            index = null;
            return null;
        }

        const source = (field.edges ?? field.nodes) as TimeSource;
        const path = columnOf(source.start);
        const unit = source.unit ?? "ms";
        const graph = sources.snapshot();
        const key = `${sources.token()}|${graph.nodeCount}|${graph.edgeCount}|${field.nodes?.start ?? ""}|${field.nodes?.unit ?? ""}|${field.edges?.start ?? ""}|${field.edges?.unit ?? ""}`;
        if (index?.key === key) {
            return index;
        }

        const attribute = `${ATTRIBUTE_PREFIX}${path}`;
        index = {
            key,
            path,
            unit,
            node:
                field.nodes === undefined
                    ? null
                    : buildKind(
                          graph.nodeCount,
                          (row) => sources.values.nodeValue(row, attribute),
                          field.nodes.unit ?? "ms",
                      ),
            edge:
                field.edges === undefined
                    ? null
                    : buildKind(
                          graph.edgeCount,
                          (row) => sources.values.edgeValue(row, attribute),
                          field.edges.unit ?? "ms",
                      ),
        };
        sources.emit("time:ready", { field });

        return index;
    };

    /**
     * The extent of the index.
     * @returns The extent, or null.
     */
    const extentNow = (): TimeExtent | null => {
        const built = indexNow();
        if (built === null) {
            return null;
        }

        let from = Number.POSITIVE_INFINITY;
        let last = Number.NEGATIVE_INFINITY;
        for (const kind of [built.node, built.edge]) {
            if (kind !== null && kind.sorted.length > 0) {
                from = Math.min(from, kind.sorted[0]);
                last = Math.max(last, kind.sorted[kind.sorted.length - 1]);
            }
        }

        return from > last
            ? null
            : Object.freeze({
                  from,
                  to: last + 1,
                  nodes: built.node?.counts ?? NO_COUNTS,
                  edges: built.edge?.counts ?? NO_COUNTS,
              });
    };

    /**
     * Refuse a calendar step on ordinal time.
     * @param step - The step.
     */
    const checkStep = (step: TimeStep): void => {
        if (isCalendarStep(step) && indexNow()?.unit === "ordinal") {
            throw badCommand("A calendar step needs dates; ordinal time takes a number of units.", {
                field: "step",
                reason: "calendar-step-on-ordinal",
                step,
            });
        }
    };

    /**
     * The window as the designated field completes it.
     * @param input - The window as given.
     * @returns The window.
     */
    const complete = (input: TimeWindowInput & Pick<TimeWindow, "from" | "to">): TimeWindow => {
        const field = fieldNow();
        const designated = field?.edges ?? field?.nodes;
        const attribute =
            input.attribute ??
            (designated === undefined ? undefined : `${ATTRIBUTE_PREFIX}${columnOf(designated.start)}`);
        if (attribute === undefined) {
            throw new GraphtyError({
                code: "E_NO_TIME_FIELD",
                message: "No time field is designated, and the window names no attribute. Call time.setField first.",
                source: "data",
                details: {},
            });
        }

        if (input.step !== undefined) {
            checkStep(input.step);
        }

        const followsEdges =
            field?.edges !== undefined &&
            field.nodes === undefined &&
            columnOf(attribute) === columnOf(field.edges.start);
        const nodes = input.nodes ?? (followsEdges ? "ends" : undefined);

        return Object.freeze({
            ...input,
            attribute,
            from: boundOf(input.from),
            to: boundOf(input.to),
            ...(nodes === undefined ? {} : { nodes }),
        });
    };

    /**
     * How far one step moves a window.
     * @param window - The window.
     * @returns The step.
     */
    const stepOf = (window: TimeWindow): TimeStep => {
        if (window.step !== undefined) {
            return window.step;
        }

        const width = boundOf(window.to) - boundOf(window.from);
        if (Number.isFinite(width) && width > 0) {
            return width;
        }

        const extent = extentNow();

        return extent === null ? 1 : Math.max(1, (extent.to - extent.from) / 20);
    };

    /**
     * The step number a window sits at, from the start of the data.
     * @param window - The window.
     * @returns The index.
     */
    const stepIndexOf = (window: TimeWindow): number => {
        const extent = extentNow();
        if (extent === null) {
            return 0;
        }

        const step = stepOf(window);
        const anchor = window.mode === "cumulative" ? boundOf(window.to) : boundOf(window.from);
        if (!isCalendarStep(step)) {
            return Math.round((anchor - extent.from) / step);
        }

        let count = 0;
        // ponytail: walks calendar steps one at a time; fine to tens of thousands of steps.
        while (count < 1_000_000 && addSteps(extent.from, step, count + 1) <= anchor) {
            count++;
        }

        return count;
    };

    /**
     * A window moved by whole steps.
     * @param window - The window.
     * @param count - How many steps.
     * @returns The moved window.
     */
    const advanced = (window: TimeWindow, count: number): TimeWindow => {
        const step = stepOf(window);
        const from = boundOf(window.from);
        const to = boundOf(window.to);
        if (window.mode === "cumulative") {
            const end = addSteps(to, step, count);
            return Object.freeze({ ...window, from, to: end > from ? end : addSteps(from, step, 1) });
        }

        return Object.freeze({ ...window, from: addSteps(from, step, count), to: addSteps(to, step, count) });
    };

    /**
     * A first window: one step wide at the start of the data.
     * @param options - What play or a step asked for.
     * @returns The window.
     */
    const opening = (options: TimePlayOptions = {}): TimeWindow => {
        const extent = extentNow();
        const step = options.step ?? (extent === null ? 1 : Math.max(1, (extent.to - extent.from) / 20));
        // A calendar step starts on its boundary (midnight, the first of the month), in UTC.
        const first = extent?.from ?? 0;
        const start = isCalendarStep(step) ? alignTo(first, step) : first;

        return complete({
            from: start,
            to: addSteps(start, step, 1),
            step,
            ...(options.mode === undefined ? {} : { mode: options.mode }),
        });
    };

    /**
     * A window input with its bounds filled: from the current window, else a first window one step
     * wide at the start of the data.
     * @param input - The window as given.
     * @returns The input with both bounds.
     */
    const filled = (input: TimeWindowInput): TimeWindowInput & Pick<TimeWindow, "from" | "to"> => {
        if (input.from !== undefined && input.to !== undefined) {
            return { ...input, from: input.from, to: input.to };
        }

        const defined = Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined));
        const base =
            visibility.window ??
            opening({
                ...(input.step === undefined ? {} : { step: input.step }),
                ...(input.mode === undefined ? {} : { mode: input.mode }),
            });

        return { ...base, ...defined };
    };

    /**
     * Compare the visible masks before and after a move, and publish `time:step`.
     * @param before - The masks before.
     * @param before.nodes - The node mask before.
     * @param before.edges - The edge mask before.
     * @param window - The window now.
     * @param cause - What moved it.
     * @returns The event.
     */
    const afterMove = (
        before: { readonly nodes: Uint8Array; readonly edges: Uint8Array },
        window: TimeWindow | null,
        cause: TimeStepEvent["cause"],
    ): TimeStepEvent => {
        const nodes = visibility.nodeMask();
        const edges = visibility.edgeMask();
        const graph = sources.snapshot();
        // ponytail: a full diff of both masks per move, O(n + m); the design's incremental step
        // touches only the rows that changed.
        const diff = (after: Uint8Array, was: Uint8Array): { entered: number; left: number; visible: number } => {
            let entered = 0;
            let left = 0;
            let visible = 0;
            for (let row = 0; row < after.length; row++) {
                const now = after[row] === 1;
                const then = row < was.length && was[row] === 1;
                visible += now ? 1 : 0;
                entered += now && !then ? 1 : 0;
                left += then && !now ? 1 : 0;
            }

            return { entered, left, visible };
        };
        const n = diff(nodes, before.nodes);
        const e = diff(edges, before.edges);
        let cached: TimeChanges | null = null;
        lastChanges = () => {
            if (cached !== null) {
                return cached;
            }

            const space = edgeSpaceOf(graph);
            const rowsWhere = (after: Uint8Array, was: Uint8Array, entering: boolean): number[] => {
                const out: number[] = [];
                for (let row = 0; row < after.length; row++) {
                    const now = after[row] === 1;
                    const then = row < was.length && was[row] === 1;
                    if (entering ? now && !then : then && !now) {
                        out.push(row);
                    }
                }

                return out;
            };
            const idsOf = (entering: boolean): TimeIds =>
                Object.freeze({
                    nodes: Object.freeze(rowsWhere(nodes, before.nodes, entering).map((row) => graph.ids.idOf(row))),
                    edges: Object.freeze(rowsWhere(edges, before.edges, entering).map((row) => space.idOf(row))),
                });
            cached = Object.freeze({ entered: idsOf(true), left: idsOf(false) });

            return cached;
        };
        const event: TimeStepEvent = Object.freeze({
            index: window === null ? 0 : stepIndexOf(window),
            from: window === null ? Number.NEGATIVE_INFINITY : boundOf(window.from),
            to: window === null ? Number.POSITIVE_INFINITY : boundOf(window.to),
            visible: Object.freeze({ nodes: n.visible, edges: e.visible }),
            entered: Object.freeze({ nodes: n.entered, edges: e.entered }),
            left: Object.freeze({ nodes: n.left, edges: e.left }),
            cause,
        });
        if (window !== null) {
            sources.emit("time:step", event);
        }

        return event;
    };

    /**
     * Move the window: as its own step, or merged into this play's step.
     * @param next - The window.
     * @param cause - What moved it.
     * @returns The event, once the masks and any re-runs the window's policy started have settled.
     */
    const move = async (next: TimeWindow, cause: TimeStepEvent["cause"]): Promise<TimeStepEvent> => {
        const before = { nodes: visibility.nodeMask(), edges: visibility.edgeMask() };
        if (cause === "play") {
            await dispatcher.transaction("time.play", (tx) => tx.dispatch({ op: "visibility.window", window: next }), {
                fact: { code: "visibility.window", params: {} },
                ...(playStep === null ? {} : { after: playStep }),
            });
            const { steps, position } = dispatcher.history;
            playStep ??= position > 0 ? (steps[position - 1].id as HistoryStepId) : null;
        } else {
            await visibility.setWindow(next);
        }

        const event = afterMove(before, next, cause);
        await reruns;

        return event;
    };

    /**
     * The window to move from, opening one when there is none.
     * @returns The window.
     */
    const windowNow = (): TimeWindow => visibility.window ?? opening();

    /** Stop the timer. */
    const stopTimer = (): void => {
        if (timer !== null) {
            clearTimeout(timer);
            timer = null;
        }
    };

    /** One playback step, then the next one on the timer. */
    const tick = async (): Promise<void> => {
        timer = null;
        if (!playing || disposed) {
            return;
        }

        const extent = extentNow();
        const current = visibility.window;
        if (extent === null || current === null) {
            api.pause();
            return;
        }

        let next = advanced(current, 1);
        const ended =
            current.mode === "cumulative" ? boundOf(current.to) >= extent.to : boundOf(next.from) >= extent.to;
        if (ended) {
            if (!loop) {
                sources.emit("time:end", { window: current });
                api.pause();
                return;
            }

            const width = boundOf(current.to) - boundOf(current.from);
            next =
                current.mode === "cumulative"
                    ? Object.freeze({ ...current, to: addSteps(boundOf(current.from), stepOf(current), 1) })
                    : Object.freeze({ ...current, from: extent.from, to: extent.from + width });
        }

        try {
            await move(next, "play");
        } catch {
            api.pause();
            return;
        }

        if (playing && !disposed) {
            timer = setTimeout(() => void tick(), interval);
        }
    };

    /**
     * Which rows a histogram counts: the given elements, the visible ones, or all (null).
     * @param kind - Nodes or edges.
     * @param options - The histogram's options.
     * @returns The test, or null to count every row.
     */
    const rowFilter = (kind: "node" | "edge", options: TimeBinsOptions): ((row: number) => boolean) | null => {
        const visibleMask = (): Uint8Array => (kind === "node" ? visibility.nodeMask() : visibility.edgeMask());
        const mask = options.scope === "visible" ? visibleMask() : null;
        if (options.of === undefined) {
            return mask === null ? null : (row) => mask[row] === 1;
        }

        const graph = sources.snapshot();
        const space = edgeSpaceOf(graph);
        const ids: readonly (NodeId | EdgeId)[] = (kind === "node" ? options.of.nodes : options.of.edges) ?? [];
        const rows = new Set<number>();
        for (const id of ids) {
            const row = kind === "node" ? graph.ids.indexOf(id) : space.indexOf(String(id));
            if (row !== INVALID_INDEX) {
                rows.add(row);
            }
        }

        if (kind === "edge" && options.of.incident === true) {
            const ends = new Set<number>();
            for (const id of options.of.nodes ?? []) {
                const row = graph.ids.indexOf(id);
                if (row !== INVALID_INDEX) {
                    ends.add(row);
                }
            }

            if (ends.size > 0) {
                for (let edge = 0; edge < graph.edgeCount; edge++) {
                    if (ends.has(graph.edgeSource(edge)) || ends.has(graph.edgeTarget(edge))) {
                        rows.add(edge);
                    }
                }
            }
        }

        return (row) => rows.has(row) && (mask === null || mask[row] === 1);
    };

    const api: TimeApi = {
        get field() {
            return fieldNow();
        },

        async setField(field: TimeField | null): Promise<TimeFieldResult> {
            const sourcesOf = field === null ? [] : [field.nodes, field.edges];
            for (const source of sourcesOf) {
                if (source !== undefined) {
                    if (typeof source.start !== "string" || source.start.length === 0) {
                        throw badCommand("A time source names its column in `start`.", {
                            field: "start",
                            reason: "start",
                            source,
                        });
                    }

                    if (source.unit !== undefined && !TIME_UNITS.includes(source.unit)) {
                        throw badCommand(`A time unit is one of ${TIME_UNITS.join(", ")}.`, {
                            field: "unit",
                            reason: "unit",
                            unit: source.unit,
                        });
                    }
                }
            }

            const { nodes, edges } = field ?? {};
            if (nodes !== undefined && edges !== undefined && columnOf(nodes.start) !== columnOf(edges.start)) {
                // ponytail: one path for both kinds, because a window reads one attribute; two
                // paths need a window per kind.
                throw badCommand("Nodes and edges name the same time column.", {
                    field: "start",
                    reason: "time-paths-differ",
                    nodes: nodes.start,
                    edges: edges.start,
                });
            }

            const declarations = sources.declarations();
            for (const [kind, source] of [
                ["node", nodes],
                ["edge", edges],
            ] as const) {
                const declared =
                    source === undefined ? undefined : declarations.get(`${kind}:${columnOf(source.start)}`);
                if (declared !== undefined && declared.measurement !== "time") {
                    throw badCommand(`The column is declared ${declared.measurement}, not time.`, {
                        field: "start",
                        reason: "declared-not-time",
                        kind,
                        column: source?.start ?? null,
                        measurement: declared.measurement,
                    });
                }
            }

            await sources.setKnownFields({
                nodeTimePath: nodes === undefined ? null : columnOf(nodes.start),
                nodeTimeUnit: nodes?.unit ?? null,
                edgeTimePath: edges === undefined ? null : columnOf(edges.start),
                edgeTimeUnit: edges?.unit ?? null,
            });
            const designated = fieldNow();
            sources.emit("time:field", { field: designated });
            const built = indexNow();
            const notices: CodedFact<TimeNoticeCode>[] = [];
            for (const kind of [built?.node, built?.edge]) {
                if (kind === null || kind === undefined || built === null) {
                    continue;
                }

                if (kind.counts.unparsed > 0) {
                    notices.push({
                        code: "time.unparsed",
                        params: { path: built.path, count: kind.counts.unparsed, examples: kind.examples },
                    });
                }

                if (kind.loose > 0) {
                    notices.push({ code: "time.parsed-loosely", params: { path: built.path, count: kind.loose } });
                }

                if (kind.suspect) {
                    notices.push({ code: "time.unit-suspect", params: { path: built.path, suggested: "s" } });
                }
            }

            return Object.freeze({
                field: designated,
                ...(built?.node ? { nodes: built.node.counts } : {}),
                ...(built?.edge ? { edges: built.edge.counts } : {}),
                notices: Object.freeze(notices),
            });
        },

        get ready() {
            // ponytail: built synchronously on a microtask; a time-sliced build is the design's
            // answer at a million elements.
            return Promise.resolve().then(() => {
                indexNow();
            });
        },

        extent: extentNow,

        bins(options: TimeBinsOptions = {}): readonly TimeBin[] | null {
            const extent = extentNow();
            const built = index;
            if (extent === null || built === null) {
                return null;
            }

            if (options.step !== undefined) {
                checkStep(options.step);
            }

            const bounds = binBounds(options.from ?? extent.from, options.to ?? extent.to, options);
            const countOf = (kind: "node" | "edge"): number[] => {
                const parsed = built[kind];
                const into = new Array<number>(bounds.length - 1).fill(0);
                if (parsed === null) {
                    return into;
                }

                const keep = rowFilter(kind, options);
                if (keep === null) {
                    for (let bin = 0; bin < into.length; bin++) {
                        into[bin] = lowerBound(parsed.sorted, bounds[bin + 1]) - lowerBound(parsed.sorted, bounds[bin]);
                    }

                    return into;
                }

                const last = bounds[bounds.length - 1];
                for (
                    let at = lowerBound(parsed.sorted, bounds[0]);
                    at < parsed.sorted.length && parsed.sorted[at] < last;
                    at++
                ) {
                    if (keep(parsed.perm[at])) {
                        into[upperBound(bounds, parsed.sorted[at]) - 1]++;
                    }
                }

                return into;
            };
            const nodes = countOf("node");
            const edges = countOf("edge");

            return Object.freeze(
                nodes.map((count, bin) =>
                    Object.freeze({ start: bounds[bin], end: bounds[bin + 1], nodes: count, edges: edges[bin] }),
                ),
            );
        },

        changes(): TimeChanges {
            return lastChanges?.() ?? NO_CHANGES;
        },

        get current() {
            return visibility.window;
        },

        window(input: TimeWindowInput | null): Run<FilterResult> {
            const next = input === null ? null : complete(filled(input));
            const before = { nodes: visibility.nodeMask(), edges: visibility.edgeMask() };
            const run = visibility.setWindow(next);
            run.then(
                () => afterMove(before, next, "window"),
                () => undefined,
            );

            return run;
        },

        play(options: TimePlayOptions = {}): void {
            if (playing) {
                return;
            }

            if (options.step !== undefined) {
                checkStep(options.step);
            }

            interval = options.interval ?? interval;
            loop = options.loop ?? loop;
            const current = visibility.window;
            playing = true;
            playStep = null;
            sources.emit("time:play", { window: current });
            if (current === null) {
                void move(opening(options), "play")
                    .then(() => {
                        if (playing) {
                            timer = setTimeout(() => void tick(), interval);
                        }
                    })
                    .catch(() => {
                        api.pause();
                    });
                return;
            }

            if (options.step !== undefined || options.mode !== undefined) {
                const retuned = Object.freeze({
                    ...current,
                    ...(options.step === undefined ? {} : { step: options.step }),
                    ...(options.mode === undefined ? {} : { mode: options.mode }),
                });
                void move(retuned, "play")
                    .then(() => {
                        if (playing) {
                            timer = setTimeout(() => void tick(), interval);
                        }
                    })
                    .catch(() => {
                        api.pause();
                    });
                return;
            }

            timer = setTimeout(() => void tick(), interval);
        },

        pause(): void {
            stopTimer();
            if (!playing) {
                return;
            }

            playing = false;
            playStep = null;
            sources.emit("time:pause", { window: visibility.window });
        },

        async stepBy(count: number): Promise<TimeStepEvent> {
            return move(advanced(windowNow(), count), "step");
        },

        async seek(instant: number): Promise<TimeStepEvent> {
            const current = windowNow();
            const from = boundOf(current.from);
            const to = boundOf(current.to);
            const next =
                current.mode === "cumulative"
                    ? Object.freeze({ ...current, from, to: Math.max(instant, from) })
                    : Object.freeze({ ...current, from: instant, to: instant + (to - from) });

            return move(next, "seek");
        },

        get playing() {
            return playing;
        },

        get mode(): TimePlayMode {
            return visibility.window?.mode ?? "sliding";
        },

        get interval() {
            return interval;
        },
    };

    const internals: TimeInternals = {
        instants(path: Path) {
            const built = indexNow();
            if (built === null || columnOf(path) !== built.path) {
                return null;
            }

            return { node: built.node, edge: built.edge };
        },

        acceptedDigest(id: RunId, ranOn: string): string | undefined {
            const entry = accepted.get(id);
            return entry?.from === ranOn ? entry.to : undefined;
        },

        visibilityChanged(change: VisibilityChange): void {
            const policy: TimeResultsPolicy = visibility.window?.results ?? "stale";
            const runs = sources.runs();
            if (change.filterKind === "window" && policy !== "stale") {
                const moved = runs.filter((run) => run.stale?.reason === "scope-changed" && !staleBefore.has(run.id));
                if (policy === "keep") {
                    for (const run of moved) {
                        accepted.set(run.id, { from: run.scope.digest, to: sources.digestOf(run.scope.spec) });
                    }
                } else {
                    // Started after the pass that announced the move, not inside it.
                    reruns = Promise.resolve().then(async () =>
                        Promise.allSettled(moved.map(async (run) => run.rerun())),
                    );
                }
            }

            // ponytail: staleness from a selection or set change between two visibility changes
            // is not seen here, so a "keep" move can accept a run that went stale that way.
            staleBefore = new Set(runs.filter((run) => run.stale !== null).map((run) => run.id));
        },

        dispose(): void {
            disposed = true;
            stopTimer();
            playing = false;
        },
    };

    return { api, internals };
}
