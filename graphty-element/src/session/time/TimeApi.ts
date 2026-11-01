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
import { GraphtyError, isGraphtyError } from "../../errors";
import type { Dispatcher } from "../project/Dispatcher";
import type { Run } from "../runs";
import { windowKey } from "../runs/RunsApi";
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
import type { TimeInstants, TimePlayback, TimeResultsPolicy } from "../visibility/filter";
import {
    addSteps,
    alignTo,
    calendarStepAtLeast,
    calendarStepNear,
    inferUnit,
    isCalendarStep,
    isNumericText,
    niceAtLeast,
    niceNear,
    numericBound,
    readInstant,
    stepLength,
    TIME_UNITS,
    type TimeUnit,
} from "./parse";

export type { TimeUnit } from "./parse";

// ---------------------------------------------------------------------------------------------
// What a consumer reads and passes
// ---------------------------------------------------------------------------------------------

/** One table's time column. */
export interface TimeSource {
    /** The column holding the instant, such as `sent` or `data.sent`. */
    readonly start: Path;
    /**
     * How numbers in it are read. Strings and dates ignore it. Left out, the values decide: whole
     * numbers from 1000 to 2999 read as years, epochs in seconds as `"s"`, epochs in milliseconds
     * as `"ms"`, and any other numbers as `"ordinal"` (steps, ticks).
     */
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
     * `time.unparsed` (`{ path, count, examples }`; in a column mostly of date text, a bare number
     * counts here), `time.parsed-loosely` (`{ path, count }`: values only `Date.parse` understood),
     * `time.unit-suspect` (`{ path, suggested }`, for numbers designated as milliseconds: `"s"` when
     * every number reads as 1973 to 2286 in seconds but 1970 in milliseconds, `"year"` when every
     * one is a whole number from 1000 to 2999, `"ordinal"` when every one is a whole number from
     * -5000 to 3000). Suggested, never applied.
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
    /** The bins' width, when they were made by a step or a `maxCount` budget. */
    readonly step?: TimeStep;
}

/** What {@link TimeApi.bins} counts. */
export interface TimeBinsOptions {
    /** How many equal bins; default 100. Ignored when `step` is given. */
    readonly count?: number;
    /** A bin width: milliseconds (or ordinal units), or a calendar step aligned in UTC. */
    readonly step?: TimeStep;
    /**
     * At most this many bins: the shortest calendar step (a 1-2-5 number for ordinal time) that
     * covers the range in no more, aligned to its boundaries, so the bins span exactly whole steps
     * from the first instant's step to the last one's. Ignored when `step` is given.
     */
    readonly maxCount?: number;
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
    /** Elements of a timed kind with no usable time: kept in every window unless `missing` is `"outside"`. */
    readonly untimed: TimeCountPair;
    /** Whether this is the first window. */
    readonly atStart: boolean;
    /** Whether this window reaches the end of the data. */
    readonly atEnd: boolean;
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
    /**
     * How the window moves: `"smooth"` (the default) slides it a little every animation frame, by
     * its step times the time elapsed over `interval`, so elements come and go as its edges pass
     * them; `"steps"` jumps one whole step every `interval`. Smooth falls back to steps under
     * `prefers-reduced-motion`, where there are no animation frames (Node), and with the
     * `"rerun"` results setting, which re-runs algorithms on each step.
     */
    readonly motion?: "smooth" | "steps";
}

/** How `session.time` moves windows: {@link TimePlayback} with every default filled in. */
export interface TimeSettings {
    /** What a window move does to finished runs over the visible graph. */
    readonly results: TimeResultsPolicy;
    /** Sliding (both ends move) or cumulative (from the start of the data). */
    readonly mode: TimePlayMode;
    /** How far a step moves; `"auto"` picks one from the data's span. */
    readonly step: TimeStep | "auto";
    /** Whether an element with no usable time is kept in every window. */
    readonly missing: "inside" | "outside";
    /** Whether elements outside the window are hidden or drawn as ghosts; see {@link TimePlayback.outside}. */
    readonly outside: "hide" | "ghost";
}

/** A column that reads as time, from {@link TimeApi.candidates}. */
export interface TimeCandidate {
    /** Nodes or edges. */
    readonly kind: "node" | "edge";
    /** The column. */
    readonly column: string;
    /** How many of its values read as time. */
    readonly parsed: number;
    /** How many elements hold a value. */
    readonly total: number;
    /** How its numbers would be read, for a number column; absent for text. */
    readonly unit?: TimeUnit;
}

/** The timeline: designate a time field, read its distribution, and move a window along it. */
export interface TimeApi {
    /** The designated field, or null when none is. */
    readonly field: TimeField | null;
    /**
     * Designate the time field, or clear it with null: one undoable step, saved in the project.
     * The column's measurement becomes `"time"`. Clearing or changing the field, or its unit,
     * clears the window. A column designated again without a unit takes the unit it had before.
     * @param field - Nodes, edges or both; both must name the same column.
     * @returns What the values held.
     * @throws `E_BAD_COMMAND` (`reason`: `"declared-not-time"`, `"time-paths-differ"`, `"unit"`,
     *     `"no-times"` for a column whose values hold no time at all).
     */
    setField(field: TimeField | null): Promise<TimeFieldResult>;
    /**
     * The columns whose values read as time, most read first.
     * @returns The candidates; a column none of whose values reads as time is left out.
     */
    candidates(): readonly TimeCandidate[];
    /**
     * What the designated field's values held: the same notices `setField` returns, also for a
     * field designated by an import or an element attribute.
     * @returns The notices; empty with no field.
     */
    notices(): readonly CodedFact<TimeNoticeCode>[];
    /**
     * Read text as an instant the way the designated field reads its values (a date with no
     * offset is UTC; ordinal time reads numbers).
     * @param text - Such as `"2025-03-09"`, `"Mar 9, 2025"` or `"1998"`.
     * @returns Epoch milliseconds (or the ordinal value), or null when the text names no instant.
     */
    parse(text: string): number | null;
    /** Resolves once the designated field is indexed, so the facts below answer synchronously. */
    readonly ready: Promise<void>;
    /** The span of the data's time, or null when nothing is designated or nothing has a time. */
    extent(): TimeExtent | null;
    /**
     * The histogram of the designated field.
     * @param options - Count, step or a most-bins budget, range, and which elements to count.
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
    /** The window in force (`visibility.window`). Its `step` is the step in use, also under `"auto"`. */
    readonly current: TimeWindow | null;
    /** Whether the window is the first one: a step back would leave the data. False with no window. */
    readonly atStart: boolean;
    /** Whether the window reaches the end of the data. False with no window. */
    readonly atEnd: boolean;
    /** How windows move: results, mode, step and missing, with every default filled in. */
    readonly settings: TimeSettings;
    /**
     * Change how windows move, one undoable step saved in the project (`visibility.playback`).
     * A sliding window snaps to a new step; switching to cumulative grows the window from the start
     * of the data, and back to sliding keeps one step ending where it ended. With no window only the
     * setting is stored. `results: "rerun"` re-runs the runs a window move left out of date.
     * @param settings - The settings that change.
     */
    setSettings(settings: Partial<TimeSettings>): Promise<void>;
    /**
     * Set or clear the window: `visibility.setWindow` with the attribute filled in from the
     * designated field, `nodes: "ends"` when only edges carry time (nodes follow their edges), and
     * the step, mode and missing rule from {@link TimeApi.settings} unless the window gives its own.
     * Bounds given as text are read as the field reads text.
     * @param window - The window, or null.
     * @returns The run of the `visibility.window` command.
     * @throws `E_NO_TIME_FIELD` when no attribute is given and nothing is designated.
     */
    window(window: TimeWindowInput | null): Run<FilterResult>;
    /**
     * Start advancing the window by one step per `interval` milliseconds -- smoothly, a little
     * every frame, unless `motion` says `"steps"` -- until the window reaches the end of the data
     * (`time:end`, then paused). With no window, the first one is opened. One play is ONE undoable
     * step: undo returns to the window before it.
     * @param options - Step, mode, interval, loop and motion.
     * @throws `E_NO_TIME_FIELD` when nothing is designated and the window names no attribute.
     */
    play(options?: TimePlayOptions): void;
    /** Stop advancing, and record where the window stopped. */
    pause(): void;
    /**
     * Move the window by whole steps (negative goes back), stopping at the first and the last
     * window. With no window, a step forward opens the first window and a step back the last.
     * One undoable step.
     * @param count - How many steps.
     * @returns What the move did.
     */
    stepBy(count: number): Promise<TimeStepEvent>;
    /**
     * Move the window to start at an instant (sliding) or end there (cumulative), or to the first
     * or the last window. One undoable step; with `commit: false` it moves only the cursor, for a
     * window being dragged, until {@link TimeApi.commit} records it.
     * @param instant - Epoch milliseconds or an ordinal value, `"start"` or `"end"`.
     * @param options - `commit: false` to move the cursor only.
     * @param options.commit - Whether the move is recorded; default true.
     * @returns What the move did.
     */
    seek(instant: number | "start" | "end", options?: { readonly commit?: boolean }): Promise<TimeStepEvent>;
    /**
     * Record the cursor a `seek` with `commit: false` moved, as one undoable step of its own: it
     * never merges into a window step recorded just before it, however soon after that it comes.
     * @returns What the move did, or null when the cursor is where the window already is.
     */
    commit(): Promise<TimeStepEvent | null>;
    /** Whether playback is running. */
    readonly playing: boolean;
    /** The mode windows move in. */
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
    /** The data columns, for {@link TimeApi.candidates}. */
    readonly columns: () => readonly { readonly kind: "node" | "edge"; readonly name: string }[];
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
    /** The window a `results: "keep"` move accepted a run in, as a window key. */
    acceptedWindow(id: RunId): string | undefined;
    /** How many of a designated column's values parsed, for its completeness; undefined otherwise. */
    parsedCount(kind: "node" | "edge", column: string): number | undefined;
    /** Whether playback is running, so autosave can wait for a pause. */
    readonly playing: boolean;
    /** Apply the `results` setting after a visibility change. */
    visibilityChanged(change: VisibilityChange): void;
    /** Stop playback for good. */
    dispose(): void;
}

/** Every timeline setting at its default. */
export const DEFAULT_TIME_SETTINGS: TimeSettings = Object.freeze({
    results: "stale",
    mode: "sliding",
    step: "auto",
    missing: "inside",
    outside: "hide",
});

/**
 * Whether two settings say the same.
 * @param a - One.
 * @param b - The other.
 * @returns True when every member matches.
 */
export function sameSettings(a: TimeSettings, b: TimeSettings): boolean {
    return (
        a.results === b.results &&
        a.mode === b.mode &&
        a.step === b.step &&
        a.missing === b.missing &&
        a.outside === b.outside
    );
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
    /** What every number in the column looks like, when the unit reads them as milliseconds. */
    readonly suspect: "s" | "year" | "ordinal" | null;
}

/** The index of the designated field over one snapshot. */
interface FieldIndex {
    readonly key: string;
    readonly path: string;
    readonly unit: TimeUnit;
    /** The unit each kind's values called for, when the designation gave none and they are numbers. */
    readonly inferred: { readonly node?: TimeUnit; readonly edge?: TimeUnit };
    readonly node: KindIndex | null;
    readonly edge: KindIndex | null;
    /** Whether every instant is a whole number, so an ordinal bin is never narrower than one. */
    readonly whole: boolean;
}

/**
 * Whether every finite instant of a kind is a whole number.
 * @param kind - The kind's index, or null.
 * @returns True when it holds none that is not.
 */
function wholeInstants(kind: KindIndex | null): boolean {
    return kind === null || kind.sorted.every((value) => !Number.isFinite(value) || Number.isInteger(value));
}

const NO_COUNTS: TimeCounts = Object.freeze({ timed: 0, untimed: 0, unparsed: 0 });
const NO_IDS: TimeIds = Object.freeze({ nodes: Object.freeze([]), edges: Object.freeze([]) });
const NO_CHANGES: TimeChanges = Object.freeze({ entered: NO_IDS, left: NO_IDS });
const MAX_BINS = 10_000;
const MS_PER_HOUR = 3_600_000;
const DEFAULT_INTERVAL = 1000;
const ATTRIBUTE_PREFIX = "data.";
/** How many windows an automatic step aims to cut the data's span into. */
const AUTO_STEPS = 20;
/** The range a whole number reads as a year in, for the `"ordinal"` suggestion. */
const YEAR_LIKE = { min: -5000, max: 3000 } as const;
/** A loose reading counts toward a candidate only with a four-digit year in it. */
const HAS_YEAR = /\d{4}/;

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
 * Whether a value is a number, or text that is only a number.
 * @param value - The value.
 * @returns True for a bare number.
 */
function isBareNumber(value: unknown): boolean {
    return (typeof value === "number" && Number.isFinite(value)) || (typeof value === "string" && isNumericText(value));
}

/**
 * Whether a column holds mostly date text, so a bare number in it is a stray value rather than an
 * epoch: more of its values are text that is not a number than are numbers.
 * @param count - How many rows.
 * @param read - Reads one row's value.
 * @returns True for a date-text column.
 */
function mostlyText(count: number, read: (row: number) => unknown): boolean {
    let text = 0;
    let numbers = 0;
    for (let row = 0; row < count; row++) {
        const value = read(row);
        if (isBareNumber(value)) {
            numbers++;
        } else if (typeof value === "string" && value.trim() !== "") {
            text++;
        }
    }

    return text > numbers;
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
    let yearLike = 0;
    let fourDigit = 0;
    const examples: string[] = [];
    // In a column of date text, a stray number (a "1.10") is not an epoch in 1970.
    const datesOnly = unit === "ms" && mostlyText(count, read);
    for (let row = 0; row < count; row++) {
        const value = read(row);
        const reading =
            datesOnly && isBareNumber(value) ? { at: Number.NaN, how: "unparsed" as const } : readInstant(value, unit);
        rows[row] = reading.at;
        if (reading.how === "missing") {
            untimed++;
        } else if (reading.how === "unparsed") {
            unparsed++;
            if (examples.length < 3) {
                examples.push(String(value));
            }
        } else if (reading.how === "loose") {
            loose++;
        }

        if (typeof value === "number" && Number.isFinite(value)) {
            numbers++;
            secondsLike += value >= 1e8 && value < 1e10 ? 1 : 0;
            yearLike += Number.isInteger(value) && value >= YEAR_LIKE.min && value <= YEAR_LIKE.max ? 1 : 0;
            fourDigit += Number.isInteger(value) && value >= 1000 && value <= 2999 ? 1 : 0;
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
    let suspect: KindIndex["suspect"] = null;
    if (unit === "ms" && numbers > 0 && secondsLike === numbers) {
        suspect = "s";
    } else if (unit === "ms" && numbers > 0 && yearLike === numbers) {
        suspect = fourDigit === numbers ? "year" : "ordinal";
    }

    return {
        rows,
        timed,
        sorted,
        perm,
        counts: Object.freeze({ timed, untimed, unparsed }),
        loose,
        examples: Object.freeze(examples),
        suspect,
    };
}

/**
 * The notices one designated field's values call for.
 * @param built - The index.
 * @returns The notices.
 */
function noticesOf(built: FieldIndex | null): readonly CodedFact<TimeNoticeCode>[] {
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

        if (kind.suspect !== null) {
            notices.push({ code: "time.unit-suspect", params: { path: built.path, suggested: kind.suspect } });
        }
    }

    return Object.freeze(notices);
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
 * The refusal for a bad bin count or step.
 * @param options - What was asked.
 * @param value - The offending value.
 * @returns The error.
 */
function tooManyBins(options: TimeBinsOptions, value: unknown): GraphtyError {
    return new GraphtyError({
        code: "E_OPTION_RANGE",
        message: `A histogram has 1 to ${MAX_BINS} bins, and a step is a positive number or a calendar step.`,
        source: "data",
        details: { option: options.step === undefined ? "count" : "step", value, min: 1, max: MAX_BINS },
    });
}

/**
 * The edges of a histogram's bins, first start to last end.
 * @param from - Where the bins start (a step aligns it down).
 * @param to - Where they end.
 * @param options - The count or the step.
 * @param ordinal - Whether a numeric step aligns to its multiples (ordinal time).
 * @returns The edges, one more than the bins.
 */
function binBounds(from: number, to: number, options: TimeBinsOptions, ordinal: boolean): number[] {
    const bounds: number[] = [];
    const { step } = options;
    if (step === undefined) {
        const count = options.count ?? 100;
        if (!Number.isInteger(count) || count < 1 || count > MAX_BINS) {
            throw tooManyBins(options, count);
        }

        for (let bin = 0; bin < count; bin++) {
            bounds.push(from + ((to - from) * bin) / count);
        }

        bounds.push(to);

        return bounds;
    }

    if (!isCalendarStep(step) && (Number.isNaN(step) || step <= 0)) {
        throw tooManyBins(options, step);
    }

    const first = ordinal && !isCalendarStep(step) ? Math.floor(from / step) * step : alignTo(from, step);
    let at = first;
    let bins = 0;
    while (at < to) {
        if (bins === MAX_BINS) {
            throw tooManyBins(options, step);
        }

        bounds.push(at);
        bins++;
        at = ordinal && !isCalendarStep(step) ? first + bins * step : addSteps(at, step, 1);
    }

    bounds.push(options.maxCount === undefined ? to : at);

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
    /** The window on screen while it is played smoothly or dragged, before it is recorded. */
    let cursor: TimeWindow | null = null;
    let frame: number | null = null;
    let lastFrameAt = 0;
    let smooth = true;
    let playing = false;
    let interval = DEFAULT_INTERVAL;
    let loop = false;
    /** The history step this play's moves merge into. */
    let playStep: HistoryStepId | null = null;
    let disposed = false;
    /** Runs that were out of date at the last visibility change, so "keep" never revives one. */
    let staleBefore = new Set<RunId>();
    const accepted = new Map<RunId, { readonly from: string; readonly to: string; readonly window: string }>();
    let reruns: Promise<unknown> = Promise.resolve();
    /** The unit the reader last gave each column, so designating it again keeps it. */
    const units = new Map<string, TimeUnit>();

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
     * Index one kind of a column.
     * @param kind - Nodes or edges.
     * @param column - The column.
     * @param unit - How numbers are read.
     * @returns The kind's index.
     */
    const indexKind = (kind: "node" | "edge", column: string, unit: TimeUnit): KindIndex => {
        const graph = sources.snapshot();
        const attribute = `${ATTRIBUTE_PREFIX}${column}`;

        return kind === "node"
            ? buildKind(graph.nodeCount, (row) => sources.values.nodeValue(row, attribute), unit)
            : buildKind(graph.edgeCount, (row) => sources.values.edgeValue(row, attribute), unit);
    };

    /**
     * The unit a column's numbers are read in when none was given, from its values.
     * @param kind - Nodes or edges.
     * @param column - The column.
     * @returns The unit, or undefined for a column that is not all numbers.
     */
    const inferredUnit = (kind: "node" | "edge", column: string): TimeUnit | undefined => {
        const graph = sources.snapshot();
        const attribute = `${ATTRIBUTE_PREFIX}${column}`;
        const count = kind === "node" ? graph.nodeCount : graph.edgeCount;
        const present: unknown[] = [];
        for (let row = 0; row < count; row++) {
            const value =
                kind === "node" ? sources.values.nodeValue(row, attribute) : sources.values.edgeValue(row, attribute);
            if (value !== undefined && value !== null && value !== "") {
                present.push(value);
            }
        }

        return inferUnit(present);
    };

    /**
     * The unit a designated source reads numbers in: its own, else the one its values call for.
     * @param kind - Nodes or edges.
     * @param source - The source.
     * @returns The unit.
     */
    const unitOfSource = (kind: "node" | "edge", source: TimeSource): TimeUnit | undefined =>
        source.unit === undefined ? inferredUnit(kind, columnOf(source.start)) : undefined;

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
        const graph = sources.snapshot();
        const key = `${sources.token()}|${graph.nodeCount}|${graph.edgeCount}|${field.nodes?.start ?? ""}|${field.nodes?.unit ?? ""}|${field.edges?.start ?? ""}|${field.edges?.unit ?? ""}`;
        if (index?.key === key) {
            return index;
        }

        const inferred = {
            ...(field.nodes === undefined ? {} : { node: unitOfSource("node", field.nodes) }),
            ...(field.edges === undefined ? {} : { edge: unitOfSource("edge", field.edges) }),
        };
        const nodeUnit = field.nodes === undefined ? undefined : (field.nodes.unit ?? inferred.node ?? "ms");
        const edgeUnit = field.edges === undefined ? undefined : (field.edges.unit ?? inferred.edge ?? "ms");
        const unit = edgeUnit ?? nodeUnit ?? "ms";
        const node = nodeUnit === undefined ? null : indexKind("node", path, nodeUnit);
        const edge = edgeUnit === undefined ? null : indexKind("edge", path, edgeUnit);
        index = { key, path, unit, inferred, node, edge, whole: wholeInstants(node) && wholeInstants(edge) };
        // The index is built lazily, often inside a read (`time.field`, `extent()`): tell listeners
        // on a microtask so none runs inside the caller's read (#4450). It still lands before an
        // `await` of the call that built it resumes.
        queueMicrotask(() => {
            sources.emit("time:ready", { field });
        });

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
                last = Math.max(last, kind.sorted[kind.sorted.length - 1]); // NOSONAR(S7755): noUncheckedIndexedAccess is off, so [length - 1] keeps the element type that .at() widens to undefined
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
     * Whether the designated field reads plain numbers.
     * @returns True for ordinal time.
     */
    const ordinal = (): boolean => indexNow()?.unit === "ordinal";

    /**
     * Refuse a calendar step on ordinal time.
     * @param step - The step.
     */
    const checkStep = (step: TimeStep): void => {
        if (isCalendarStep(step) && ordinal()) {
            throw badCommand("A calendar step needs dates; ordinal time takes a number of units.", {
                field: "step",
                reason: "calendar-step-on-ordinal",
                step,
            });
        }
    };

    /**
     * The settings in force, with the defaults filled in.
     * @returns The settings.
     */
    const settingsNow = (): TimeSettings => {
        const saved: TimePlayback | null | undefined = dispatcher.state.visibility.playback;

        return saved === null || saved === undefined
            ? DEFAULT_TIME_SETTINGS
            : Object.freeze({ ...DEFAULT_TIME_SETTINGS, ...saved });
    };

    /**
     * The step `"auto"` stands for: the calendar step closest to a twentieth of the data's span,
     * or the closest 1-2-5 number for ordinal time.
     * @returns The step.
     */
    const autoStep = (): TimeStep => {
        const extent = extentNow();
        const span = extent === null ? 0 : extent.to - extent.from;
        if (ordinal()) {
            return span > 0 ? niceNear(span / AUTO_STEPS) : 1;
        }

        // Data spanning less than a few hours steps by a 1-2-5 number of milliseconds: an hour
        // would hold all of it in one window that cannot move.
        if (span > 0 && span / AUTO_STEPS < MS_PER_HOUR / 4) {
            return Math.max(1, niceNear(span / AUTO_STEPS));
        }

        return span > 0 ? calendarStepNear(span / AUTO_STEPS) : "day";
    };

    /**
     * The step a new window takes: the setting, or the automatic one.
     * @param given - A step a call passed, which wins.
     * @returns The step.
     */
    const stepFor = (given?: TimeStep | "auto"): TimeStep => {
        const step = given ?? settingsNow().step;
        if (step === "auto" || (isCalendarStep(step) && ordinal())) {
            return autoStep();
        }

        return step;
    };

    /**
     * How far one step moves a window.
     * @param window - The window.
     * @returns The step.
     */
    const stepOf = (window: TimeWindow): TimeStep => window.step ?? stepFor();

    /**
     * An instant moved down to the start of its step: a calendar boundary, a multiple of an ordinal
     * step, or whole steps from the start of the data for a step in milliseconds.
     * @param at - The instant.
     * @param step - The step.
     * @returns The aligned instant.
     */
    const alignAt = (at: number, step: TimeStep): number => {
        if (isCalendarStep(step)) {
            return alignTo(at, step);
        }

        const origin = ordinal() ? 0 : (extentNow()?.from ?? 0);

        return origin + Math.floor((at - origin) / step) * step;
    };

    /**
     * The window as the designated field and the settings complete it.
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

        const settings = settingsNow();
        const followsEdges =
            field?.edges !== undefined &&
            field.nodes === undefined &&
            columnOf(attribute) === columnOf(field.edges.start);
        const nodes = input.nodes ?? (followsEdges ? "ends" : undefined);
        const missing = input.missing ?? (settings.missing === "inside" ? undefined : settings.missing);
        const mode = input.mode ?? (settings.mode === "sliding" ? undefined : settings.mode);

        return Object.freeze({
            ...input,
            attribute,
            from: numericBound(input.from),
            to: numericBound(input.to),
            step: input.step ?? stepFor(),
            ...(nodes === undefined ? {} : { nodes }),
            ...(missing === undefined ? {} : { missing }),
            ...(mode === undefined ? {} : { mode }),
        });
    };

    /**
     * The first window: one step at the start of the data (cumulative: the data's start to the
     * end of the first step).
     * @param options - A step or mode a call asked for.
     * @returns The window.
     */
    const firstWindow = (options: TimePlayOptions = {}): TimeWindow => {
        const extent = extentNow();
        const step = stepFor(options.step);
        const first = extent?.from ?? 0;
        const start = alignAt(first, step);
        const mode = options.mode ?? settingsNow().mode;

        return complete({
            from: mode === "cumulative" ? first : start,
            to: addSteps(start, step, 1),
            step,
            ...(mode === "cumulative" ? { mode } : {}),
        });
    };

    /**
     * The last window: the step holding the last instant (cumulative: all of the data).
     * @param options - A step or mode a call asked for.
     * @returns The window.
     */
    const lastWindow = (options: TimePlayOptions = {}): TimeWindow => {
        const extent = extentNow();
        const step = stepFor(options.step);
        const start = alignAt((extent?.to ?? 1) - 1, step);
        const mode = options.mode ?? settingsNow().mode;

        return complete({
            from: mode === "cumulative" ? (extent?.from ?? start) : start,
            to: addSteps(start, step, 1),
            step,
            ...(mode === "cumulative" ? { mode } : {}),
        });
    };

    /**
     * Whether a window is the first one.
     * @param window - The window.
     * @returns True when a step back would leave the data.
     */
    const isFirst = (window: TimeWindow): boolean => {
        const extent = extentNow();
        if (extent === null) {
            return true;
        }

        return window.mode === "cumulative"
            ? addSteps(numericBound(window.to), stepOf(window), -1) <= extent.from
            : numericBound(window.from) <= extent.from;
    };

    /**
     * Whether a window reaches the end of the data.
     * @param window - The window.
     * @returns True at the end.
     */
    const isLast = (window: TimeWindow): boolean => {
        const extent = extentNow();

        return extent === null || numericBound(window.to) >= extent.to;
    };

    /**
     * A window moved by one step, forward or back. A cumulative window keeps the data's start.
     * @param window - The window.
     * @param direction - 1 or -1.
     * @returns The moved window.
     */
    const advanced = (window: TimeWindow, direction: 1 | -1): TimeWindow => {
        const step = stepOf(window);
        const from = numericBound(window.from);
        const to = numericBound(window.to);
        if (window.mode === "cumulative") {
            const start = extentNow()?.from ?? from;
            const end = addSteps(to, step, direction);
            return Object.freeze({ ...window, from: start, to: end > start ? end : to });
        }

        return Object.freeze({ ...window, from: addSteps(from, step, direction), to: addSteps(to, step, direction) });
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
        const anchor =
            window.mode === "cumulative" ? addSteps(numericBound(window.to), step, -1) : numericBound(window.from);
        const first = alignAt(extent.from, step);
        if (!isCalendarStep(step)) {
            return Math.round((anchor - first) / step);
        }

        let count = 0;
        // ponytail: walks calendar steps one at a time; fine to tens of thousands of steps.
        while (count < 1_000_000 && addSteps(first, step, count + 1) <= anchor) {
            count++;
        }

        return count;
    };

    /**
     * A window input with its bounds filled: from the current window, else the first window.
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
            firstWindow({
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
        const extent = extentNow();
        const untimedOf = (counts: TimeCounts | undefined): number =>
            counts === undefined ? 0 : counts.untimed + counts.unparsed;
        const event: TimeStepEvent = Object.freeze({
            index: window === null ? 0 : stepIndexOf(window),
            from: window === null ? Number.NEGATIVE_INFINITY : numericBound(window.from),
            to: window === null ? Number.POSITIVE_INFINITY : numericBound(window.to),
            visible: Object.freeze({ nodes: n.visible, edges: e.visible }),
            entered: Object.freeze({ nodes: n.entered, edges: e.entered }),
            left: Object.freeze({ nodes: n.left, edges: e.left }),
            untimed: Object.freeze({ nodes: untimedOf(extent?.nodes), edges: untimedOf(extent?.edges) }),
            atStart: window !== null && isFirst(window),
            atEnd: window !== null && isLast(window),
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
     * @param ownStep - Record it as its own step, never merged into the window step before it.
     * @returns The event, once the masks and any re-runs the results setting started have settled.
     */
    const move = async (next: TimeWindow, cause: TimeStepEvent["cause"], ownStep = false): Promise<TimeStepEvent> => {
        const before = { nodes: visibility.nodeMask(), edges: visibility.edgeMask() };
        if (cause === "play") {
            await dispatcher.transaction("time.play", (tx) => tx.dispatch({ op: "visibility.window", window: next }), {
                fact: { code: "visibility.window", params: {} },
                ...(playStep === null ? {} : { after: playStep }),
            });
            const { steps, position } = dispatcher.history;
            playStep ??= position > 0 ? (steps[position - 1].id as HistoryStepId) : null;
        } else if (ownStep) {
            await visibility.commitWindow(next);
        } else {
            await visibility.setWindow(next);
        }

        cursor = null;
        const event = afterMove(before, next, cause);
        await reruns;

        return event;
    };

    /** Stop the timer, and the frame loop. */
    const stopTimer = (): void => {
        if (timer !== null) {
            clearTimeout(timer);
            timer = null;
        }

        if (frame !== null) {
            cancelAnimationFrame(frame);
            frame = null;
        }
    };

    /**
     * Whether a play can slide the window smoothly: frames to slide on, motion the reader has not
     * asked to reduce, and no re-run on every step.
     * @returns True when it can.
     */
    const canSlide = (): boolean =>
        smooth &&
        typeof requestAnimationFrame === "function" &&
        !(typeof globalThis.matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches) &&
        settingsNow().results !== "rerun";

    /**
     * Show a window without recording it: only the rows it changes are written.
     * @param next - The window.
     * @param cause - What moved it.
     * @returns The event.
     */
    const slideTo = (next: TimeWindow, cause: TimeStepEvent["cause"]): TimeStepEvent => {
        const counts = visibility.slideWindow(next);
        cursor = next;
        const graph = sources.snapshot();
        const rows = counts?.rows;
        let cached: TimeChanges | null = null;
        lastChanges = () => {
            if (cached !== null || rows === undefined) {
                return cached ?? NO_CHANGES;
            }

            const space = edgeSpaceOf(graph);
            const idsOf = (nodeRows: readonly number[], edgeRows: readonly number[]): TimeIds =>
                Object.freeze({
                    nodes: Object.freeze(nodeRows.map((row) => graph.ids.idOf(row))),
                    edges: Object.freeze(edgeRows.map((row) => space.idOf(row))),
                });
            cached = Object.freeze({
                entered: idsOf(rows.enteredNodes, rows.enteredEdges),
                left: idsOf(rows.leftNodes, rows.leftEdges),
            });

            return cached;
        };
        const extent = extentNow();
        const untimedOf = (counts: TimeCounts | undefined): number =>
            counts === undefined ? 0 : counts.untimed + counts.unparsed;
        const { summary } = visibility;
        const event: TimeStepEvent = Object.freeze({
            index: stepIndexOf(next),
            from: numericBound(next.from),
            to: numericBound(next.to),
            visible: Object.freeze({ nodes: summary.visibleNodes, edges: summary.visibleEdges }),
            entered: Object.freeze({ nodes: counts?.entered.nodes ?? 0, edges: counts?.entered.edges ?? 0 }),
            left: Object.freeze({ nodes: counts?.left.nodes ?? 0, edges: counts?.left.edges ?? 0 }),
            untimed: Object.freeze({ nodes: untimedOf(extent?.nodes), edges: untimedOf(extent?.edges) }),
            atStart: isFirst(next),
            atEnd: isLast(next),
            cause,
        });
        sources.emit("time:step", event);

        return event;
    };

    /**
     * One animation frame of a smooth play: the window moves by its step times the time since the
     * last frame over the interval, and stops (or starts again) at the last window.
     * @param now - The frame's time.
     */
    const glide = (now: number): void => {
        frame = null;
        const at = cursor;
        if (!playing || disposed || at === null || extentNow() === null) {
            return;
        }

        // A frame after a long stall (a hidden tab) moves no more than a tenth of a second's worth;
        // the first frame's time can be earlier than the press that started the play.
        const elapsed = Math.max(0, Math.min(now - lastFrameAt, 100));
        lastFrameAt = now;
        if (elapsed === 0) {
            frame = requestAnimationFrame(glide);
            return;
        }

        const step = stepOf(at);
        const mode = at.mode ?? "sliding";
        const head = numericBound(at.to);
        const by = ((addSteps(head, step, 1) - head) * elapsed) / interval;
        const end = numericBound(lastWindow({ step, mode }).to);
        let next: TimeWindow =
            mode === "cumulative"
                ? Object.freeze({ ...at, to: head + by })
                : Object.freeze({ ...at, from: numericBound(at.from) + by, to: head + by });
        if (numericBound(next.to) >= end) {
            if (!loop) {
                const last = lastWindow({ step, mode });
                slideTo(last, "play");
                sources.emit("time:end", { window: last });
                api.pause();
                return;
            }

            next = firstWindow({ step, mode });
        }

        slideTo(next, "play");
        frame = requestAnimationFrame(glide);
    };

    /** One playback step, then the next one on the timer. */
    const tick = async (): Promise<void> => {
        timer = null;
        if (!playing || disposed) {
            return;
        }

        const current = visibility.window;
        if (extentNow() === null || current === null) {
            api.pause();
            return;
        }

        let next: TimeWindow;
        if (isLast(current)) {
            if (!loop) {
                sources.emit("time:end", { window: current });
                api.pause();
                return;
            }

            next = firstWindow({ step: stepOf(current), mode: current.mode ?? "sliding" });
        } else {
            next = advanced(current, 1);
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

    /**
     * The step a most-bins budget asks for: the shortest calendar step (or 1-2-5 number) that
     * covers a range in no more bins.
     * @param from - The range's start.
     * @param to - Its end.
     * @param maxCount - The budget.
     * @returns The step.
     */
    const budgetStep = (from: number, to: number, maxCount: number): TimeStep => {
        if (!Number.isInteger(maxCount) || maxCount < 1 || maxCount > MAX_BINS) {
            throw tooManyBins({ count: maxCount }, maxCount);
        }

        const span = Math.max(to - from, 1);
        if (ordinal()) {
            // Whole numbers (years, ranks) never split one value across bins.
            let step = niceAtLeast(span / maxCount);
            if (index?.whole === true) {
                step = Math.max(step, 1);
            }
            while (Math.floor((to - 1) / step) - Math.floor(from / step) + 1 > maxCount) {
                step = niceAtLeast(step * 1.5);
            }

            return step;
        }

        let step: TimeStep = calendarStepAtLeast(span / maxCount) ?? niceAtLeast(span / maxCount);
        // Aligned bins can need one more than the span alone: widen until they fit.
        for (let guard = 0; guard < 12; guard++) {
            let count = 0;
            for (let at = alignTo(from, step); at < to && count <= maxCount; at = addSteps(at, step, 1)) {
                count++;
            }

            if (count <= maxCount) {
                break;
            }

            step = isCalendarStep(step)
                ? (calendarStepAtLeast(stepLength(step) * 1.01) ?? niceAtLeast(stepLength(step) * 1.5))
                : niceAtLeast(step * 1.5);
        }

        return step;
    };

    /**
     * Re-run the runs a window move left out of date, and say which could not.
     * @param runs - The runs.
     */
    const rerunAll = (runs: readonly Run[]): void => {
        // Started after the pass that announced the move, not inside it.
        reruns = Promise.resolve().then(async () =>
            Promise.all(
                runs.map(async (run) => {
                    try {
                        await run.rerun();
                    } catch (error) {
                        sources.emit("time:rerun-failed", {
                            run: run.id,
                            error: isGraphtyError(error)
                                ? { code: error.code, params: (error.details ?? {}) as CodedFact["params"] }
                                : { code: "E_INTERNAL", params: {} },
                        });
                    }
                }),
            ),
        );
    };

    /**
     * The runs over the visible graph that a filter or window move left out of date.
     * @returns The runs.
     */
    const movedRuns = (): readonly Run[] =>
        sources.runs().filter((run) => run.stale?.reason === "scope-changed" || run.stale?.reason === "window-moved");

    const api: TimeApi = {
        get field() {
            const field = fieldNow();
            const inferred = field === null ? undefined : indexNow()?.inferred;
            if (field === null || (inferred?.node === undefined && inferred?.edge === undefined)) {
                return field;
            }

            // A number field designated with no unit (an element attribute, an import) reports the
            // unit its values are read in.
            const filled = (source: TimeSource | undefined, unit: TimeUnit | undefined): TimeSource | undefined =>
                source === undefined || source.unit !== undefined || unit === undefined
                    ? source
                    : Object.freeze({ ...source, unit });
            const nodes = filled(field.nodes, inferred?.node);
            const edges = filled(field.edges, inferred?.edge);

            return Object.freeze({
                ...(nodes === undefined ? {} : { nodes }),
                ...(edges === undefined ? {} : { edges }),
            });
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

            // A column designated again without a unit takes the one the reader gave it before.
            // Else its values decide: years, epochs, or plain numbers.
            const withUnit = (source: TimeSource | undefined, kind: "node" | "edge"): TimeSource | undefined => {
                if (source === undefined) {
                    return undefined;
                }

                const unit =
                    source.unit ?? units.get(columnOf(source.start)) ?? inferredUnit(kind, columnOf(source.start));
                return unit === undefined ? source : { ...source, unit };
            };
            const nodes = withUnit(field?.nodes, "node");
            const edges = withUnit(field?.edges, "edge");
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

                // A column with values none of which reads as time is no timeline.
                const tried =
                    source === undefined ? null : indexKind(kind, columnOf(source.start), source.unit ?? "ms");
                if (tried !== null && tried.counts.timed === 0 && tried.counts.unparsed > 0) {
                    throw badCommand("None of the column's values reads as a time.", {
                        field: "start",
                        reason: "no-times",
                        kind,
                        column: source?.start ?? null,
                        examples: tried.examples,
                    });
                }
            }

            for (const source of [nodes, edges]) {
                if (source?.unit !== undefined) {
                    units.set(columnOf(source.start), source.unit);
                }
            }

            const before = fieldNow();
            const column = (edges ?? nodes)?.start;
            const changed =
                before?.nodes?.start !== nodes?.start ||
                before?.edges?.start !== edges?.start ||
                (before?.nodes?.unit ?? "ms") !== (nodes?.unit ?? "ms") ||
                (before?.edges?.unit ?? "ms") !== (edges?.unit ?? "ms");
            api.pause();
            await dispatcher.transaction(
                "time.field",
                async (tx) => {
                    await tx.dispatch({
                        op: "config.set",
                        values: {
                            data: {
                                knownFields: {
                                    nodeTimePath: nodes === undefined ? null : columnOf(nodes.start),
                                    nodeTimeUnit: nodes?.unit ?? null,
                                    edgeTimePath: edges === undefined ? null : columnOf(edges.start),
                                    edgeTimeUnit: edges?.unit ?? null,
                                },
                            },
                        },
                    });
                    // Another field, or another reading of it, is another timeline: the window goes.
                    if (changed && visibility.window !== null) {
                        await tx.dispatch({ op: "visibility.window", window: null });
                    }
                },
                {
                    fact:
                        column === undefined
                            ? { code: "time.clear-field", params: {} }
                            : { code: "time.field", params: { column: columnOf(column) } },
                },
            );
            const designated = fieldNow();
            sources.emit("time:field", { field: designated });
            const built = indexNow();

            return Object.freeze({
                field: designated,
                ...(built?.node ? { nodes: built.node.counts } : {}),
                ...(built?.edge ? { edges: built.edge.counts } : {}),
                notices: noticesOf(built),
            });
        },

        candidates(): readonly TimeCandidate[] {
            const graph = sources.snapshot();
            const found: TimeCandidate[] = [];
            for (const { kind, name } of sources.columns()) {
                const attribute = `${ATTRIBUTE_PREFIX}${name}`;
                const count = kind === "node" ? graph.nodeCount : graph.edgeCount;
                let total = 0;
                let parsed = 0;
                let numbers = 0;
                let epochMs = 0;
                let epochS = 0;
                let years = 0;
                for (let row = 0; row < count; row++) {
                    const value =
                        kind === "node"
                            ? sources.values.nodeValue(row, attribute)
                            : sources.values.edgeValue(row, attribute);
                    if (value === undefined || value === null || value === "") {
                        continue;
                    }

                    total++;
                    if (typeof value === "number") {
                        numbers++;
                        epochMs += value >= 1e11 && value < 1e13 ? 1 : 0;
                        epochS += value >= 1e8 && value < 1e10 ? 1 : 0;
                        years += Number.isInteger(value) && value >= YEAR_LIKE.min && value <= YEAR_LIKE.max ? 1 : 0;
                    } else if (typeof value === "string" && !isNumericText(value)) {
                        const reading = readInstant(value, "ms");
                        parsed += reading.how === "strict" || (reading.how === "loose" && HAS_YEAR.test(value)) ? 1 : 0;
                    }
                }

                // Numbers read as time only when every one of them looks like an epoch or a year
                // and the column is named for time: a weight of 1 to 10 is no timeline.
                let unit: TimeUnit | undefined;
                if (numbers > 0 && numbers === total) {
                    if (epochMs === numbers) {
                        unit = "ms";
                    } else if (epochS === numbers) {
                        unit = "s";
                    } else if (years === numbers && /year|date|time|when|period/i.test(name)) {
                        unit = "year";
                    }

                    parsed = unit === undefined ? 0 : numbers;
                }

                if (parsed > 0) {
                    found.push(
                        Object.freeze({ kind, column: name, parsed, total, ...(unit === undefined ? {} : { unit }) }),
                    );
                }
            }

            found.sort((a, b) => b.parsed / b.total - a.parsed / a.total || b.parsed - a.parsed);
            return Object.freeze(found);
        },

        notices(): readonly CodedFact<TimeNoticeCode>[] {
            return noticesOf(indexNow());
        },

        parse(text: string): number | null {
            const trimmed = text.trim();
            if (trimmed === "") {
                return null;
            }

            const unit = indexNow()?.unit ?? "ms";
            const reading = readInstant(trimmed, unit);
            if (reading.how === "strict") {
                return reading.at;
            }

            // Typed dates with no zone are read in UTC, as the field reads date-times.
            const utc = Date.parse(`${trimmed} UTC`);
            if (!Number.isNaN(utc)) {
                return utc;
            }

            return reading.how === "loose" ? reading.at : null;
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

            const from = options.from ?? extent.from;
            const to = options.to ?? extent.to;
            const step =
                options.step ?? (options.maxCount === undefined ? undefined : budgetStep(from, to, options.maxCount));
            const asked = step === undefined ? options : { ...options, step };
            const bounds = binBounds(from, to, asked, built.unit === "ordinal");
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

                const last = bounds[bounds.length - 1]; // NOSONAR(S7755): noUncheckedIndexedAccess is off, so [length - 1] keeps the element type that .at() widens to undefined
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
                    Object.freeze({
                        start: bounds[bin],
                        end: bounds[bin + 1],
                        nodes: count,
                        edges: edges[bin],
                        ...(step === undefined ? {} : { step }),
                    }),
                ),
            );
        },

        changes(): TimeChanges {
            return lastChanges?.() ?? NO_CHANGES;
        },

        get current() {
            return cursor ?? visibility.window;
        },

        get atStart() {
            const current = cursor ?? visibility.window;
            return current !== null && isFirst(current);
        },

        get atEnd() {
            const current = cursor ?? visibility.window;
            return current !== null && isLast(current);
        },

        get settings() {
            return settingsNow();
        },

        async setSettings(patch: Partial<TimeSettings>): Promise<void> {
            const was = settingsNow();
            const next: TimeSettings = Object.freeze({ ...was, ...patch });
            if (patch.step !== undefined && patch.step !== "auto") {
                checkStep(patch.step);
            }

            const current = visibility.window;
            let moved: TimeWindow | null = null;
            if (current !== null && extentNow() !== null) {
                const step = next.step === "auto" || (isCalendarStep(next.step) && ordinal()) ? autoStep() : next.step;
                const extent = extentNow() as TimeExtent;
                const from = numericBound(current.from);
                const to = numericBound(current.to);
                let window: TimeWindow = Object.freeze({ ...current, step });
                if (next.mode !== (current.mode ?? "sliding") && next.mode === "cumulative") {
                    // Cumulative grows from the start of the data to where the window ends.
                    window = Object.freeze({ ...window, mode: "cumulative", from: extent.from });
                } else if (next.mode !== (current.mode ?? "sliding")) {
                    // Back to sliding: one step ending where the cumulative window ended.
                    const { mode: _mode, ...rest } = window;
                    window = Object.freeze({ ...rest, from: Math.max(extent.from, addSteps(to, step, -1)) });
                } else if (step !== current.step && next.mode === "sliding") {
                    // A new step snaps a sliding window to one step on its boundary.
                    const start = alignAt(from, step);
                    window = Object.freeze({ ...window, from: start, to: addSteps(start, step, 1) });
                } else if (step !== current.step) {
                    window = Object.freeze({ ...window, to: addSteps(alignAt(to - 1, step), step, 1) });
                }

                if (next.missing !== (current.missing ?? "inside")) {
                    const { missing: _missing, ...rest } = window;
                    window = Object.freeze(next.missing === "outside" ? { ...rest, missing: "outside" } : rest);
                }

                moved = window;
            }

            const before = { nodes: visibility.nodeMask(), edges: visibility.edgeMask() };
            const playback: TimePlayback = Object.freeze(
                Object.fromEntries(
                    Object.entries(next).filter(
                        ([key, value]) => DEFAULT_TIME_SETTINGS[key as keyof TimeSettings] !== value,
                    ),
                ),
            );
            await dispatcher.transaction(
                "time.settings",
                async (tx) => {
                    await tx.dispatch({
                        op: "visibility.playback",
                        playback: Object.keys(playback).length === 0 ? null : playback,
                    });
                    if (moved !== null) {
                        await tx.dispatch({ op: "visibility.window", window: moved });
                    }
                },
                { fact: { code: "visibility.playback", params: {} } },
            );
            if (moved !== null) {
                afterMove(before, moved, "window");
            }

            // "Re-run" catches up every run a window move already left out of date.
            if (next.results === "rerun" && was.results !== "rerun") {
                rerunAll(movedRuns());
                await reruns;
            }
        },

        window(input: TimeWindowInput | null): Run<FilterResult> {
            cursor = null;
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
            smooth = (options.motion ?? (smooth ? "smooth" : "steps")) === "smooth";
            const current = cursor ?? visibility.window;
            playing = true;
            playStep = null;
            sources.emit("time:play", { window: current });
            if (canSlide()) {
                let start = current ?? firstWindow(options);
                if (current !== null && (options.step !== undefined || options.mode !== undefined)) {
                    start = Object.freeze({
                        ...current,
                        ...(options.step === undefined ? {} : { step: options.step }),
                        ...(options.mode === undefined ? {} : { mode: options.mode }),
                    });
                } else if (current !== null && isLast(current)) {
                    // Pressing play at the end starts again from the first window.
                    start = firstWindow({ step: stepOf(current), mode: current.mode ?? "sliding" });
                }

                slideTo(start, "play");
                lastFrameAt = performance.now();
                frame = requestAnimationFrame(glide);
                return;
            }

            const begin = (window: TimeWindow): void => {
                void move(window, "play")
                    .then(() => {
                        if (playing) {
                            timer = setTimeout(() => void tick(), interval);
                        }
                    })
                    .catch(() => {
                        api.pause();
                    });
            };
            if (current === null) {
                begin(firstWindow(options));
                return;
            }

            if (options.step !== undefined || options.mode !== undefined) {
                begin(
                    Object.freeze({
                        ...current,
                        ...(options.step === undefined ? {} : { step: options.step }),
                        ...(options.mode === undefined ? {} : { mode: options.mode }),
                    }),
                );
                return;
            }

            // Pressing play at the end starts again from the first window.
            if (isLast(current)) {
                begin(firstWindow({ step: stepOf(current), mode: current.mode ?? "sliding" }));
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
            const slidTo = cursor;
            if (slidTo !== null) {
                // Where a smooth play stopped is recorded as the play's one step.
                void move(slidTo, "play").then(
                    () => {
                        playStep = null;
                    },
                    () => {
                        playStep = null;
                        visibility.slideWindow(null);
                        cursor = null;
                    },
                );
            } else {
                playStep = null;
            }

            sources.emit("time:pause", { window: slidTo ?? visibility.window });
        },

        async stepBy(count: number): Promise<TimeStepEvent> {
            let { window } = visibility;
            let left = count;
            if (window === null) {
                // No window yet: forward opens the first one, back the last.
                window = count >= 0 ? firstWindow() : lastWindow();
                left = count > 0 ? count - 1 : Math.min(0, count + 1);
            }

            const direction: 1 | -1 = left < 0 ? -1 : 1;
            for (let moved = 0; moved < Math.abs(left); moved++) {
                if (direction === 1 ? isLast(window) : isFirst(window)) {
                    break;
                }

                window = advanced(window, direction);
            }

            const event = await move(window, "step");
            if (count > 0 && event.atEnd) {
                sources.emit("time:end", { window });
            }

            return event;
        },

        async seek(
            instant: number | "start" | "end",
            options: { readonly commit?: boolean } = {},
        ): Promise<TimeStepEvent> {
            if (instant === "start") {
                return move(
                    firstWindow({
                        mode: settingsNow().mode,
                        ...(visibility.window?.step === undefined ? {} : { step: visibility.window.step }),
                    }),
                    "seek",
                );
            }

            if (instant === "end") {
                return move(
                    lastWindow({
                        mode: settingsNow().mode,
                        ...(visibility.window?.step === undefined ? {} : { step: visibility.window.step }),
                    }),
                    "seek",
                );
            }

            const current = cursor ?? visibility.window ?? firstWindow();
            const from = numericBound(current.from);
            const to = numericBound(current.to);
            const next =
                current.mode === "cumulative"
                    ? Object.freeze({ ...current, from, to: Math.max(instant, from) })
                    : Object.freeze({ ...current, from: instant, to: instant + (to - from) });

            return options.commit === false ? slideTo(next, "seek") : move(next, "seek");
        },

        async commit(): Promise<TimeStepEvent | null> {
            const at = cursor;
            if (at === null) {
                return null;
            }

            return move(at, "seek", true);
        },

        get playing() {
            return playing;
        },

        get mode(): TimePlayMode {
            return visibility.window?.mode ?? settingsNow().mode;
        },

        get interval() {
            return interval;
        },
    };

    const internals: TimeInternals = {
        instants(path: Path) {
            const built = indexNow();
            if (built?.path !== columnOf(path)) {
                return null;
            }

            return { node: built.node, edge: built.edge };
        },

        acceptedDigest(id: RunId, ranOn: string): string | undefined {
            const entry = accepted.get(id);
            return entry?.from === ranOn ? entry.to : undefined;
        },

        acceptedWindow(id: RunId): string | undefined {
            return accepted.get(id)?.window;
        },

        parsedCount(kind: "node" | "edge", column: string): number | undefined {
            const field = fieldNow();
            const source = kind === "node" ? field?.nodes : field?.edges;
            if (source === undefined || columnOf(source.start) !== column) {
                return undefined;
            }

            return indexNow()?.[kind]?.counts.timed;
        },

        get playing() {
            return playing;
        },

        visibilityChanged(change: VisibilityChange): void {
            // A recorded change (a window set, an undo, a filter) supersedes a dragged cursor; a
            // play keeps its own and records it when it stops.
            if (!playing) {
                cursor = null;
            }

            const policy: TimeResultsPolicy = settingsNow().results;
            const runs = sources.runs();
            if (change.filterKind === "window" || change.filterKind === "none") {
                if (policy === "keep") {
                    const { window } = visibility;
                    const key =
                        window === null
                            ? ""
                            : windowKey({
                                  attribute: window.attribute,
                                  from: numericBound(window.from),
                                  to: numericBound(window.to),
                              });
                    for (const run of movedRuns().filter((each) => !staleBefore.has(each.id))) {
                        accepted.set(run.id, {
                            from: run.scope.digest,
                            to: sources.digestOf(run.scope.spec),
                            window: key,
                        });
                    }
                } else if (policy === "rerun") {
                    // Every run the window left out of date, also those that were before.
                    rerunAll(movedRuns());
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
