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
import { featureOff } from "../../features/resolve";
import type { StylePatchCommand } from "../commands/style";
import type { Dispatcher } from "../project/Dispatcher";
import { RevisionCache } from "../revision";
import type { Run } from "../runs";
import { windowKey } from "../runs/RunsApi";
import { edgeSpaceOf } from "../scope/index";
import type { CodedFact } from "../shared";
import type { CompiledLayer } from "../styles/Layer";
import type { Selector } from "../styles/selector";
import { drawsOutsideWindow, drawsOutsideWindowOf, paintedStack } from "../styles/tree";
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
import { diffCounts, type FilterBytes, type SlideCounts } from "../visibility/slide";
import { ageFadeInactive, type AgeFadeInactiveReason, type EdgeAgeFade, normalizedStarts } from "./ageFade";
import {
    addSteps,
    alignTo,
    calendarStepAtLeast,
    calendarStepNear,
    candidateReading,
    isCalendarStep,
    newCandidateTally,
    niceAtLeast,
    niceNear,
    numericBound,
    readTimeValue,
    stepLength,
    tallyCandidate,
    TIME_UNITS,
    type TimeUnit,
} from "./parse";
import {
    assertMeasures,
    assertSeriesBounds,
    type TimeSeries,
    type TimeSeriesOptions,
    walkSeries,
    windowsUntil,
} from "./series";
import {
    buildField,
    countBins,
    drain,
    type FieldIndex,
    type FieldPlan,
    type IndexWork,
    inSlices,
    kindBounds,
    type KindIndex,
    type KindPlan,
    mergeField,
    noticesOf,
    rowBounds,
    SLICED_ROWS,
    type SpanColumn,
} from "./timeIndex";
import { isTimeZone, UTC_ZONE, wallClock } from "./zone";

export type { TimeUnit } from "./parse";
export type { TimeMeasure, TimeSeries, TimeSeriesOptions, TimeSeriesRow } from "./series";

// ---------------------------------------------------------------------------------------------
// What a consumer reads and passes
// ---------------------------------------------------------------------------------------------

/**
 * One table's time column.
 * @experimental timeline
 * @beta
 */
export interface TimeSource {
    /** The column holding the instant, such as `sent` or `data.sent`. */
    readonly start: Path;
    /**
     * The column holding where each element ends, such as `left`: the element then exists for a
     * span, and a window holds it when it starts before the window's `to` and ends after its
     * `from`. A missing end is open; a missing start is open when an end is present. An end at or
     * before its start reads as an instant at the start.
     */
    readonly end?: Path;
    /**
     * The column holding each element's list of `{ start, end }`, `[start, end]` or bare instants.
     * An element with a non-empty list is timed by it alone, whatever `start` and `end` hold, and
     * is inside while any of them overlaps the window; `start` may then name a column that is absent.
     */
    readonly spells?: Path;
    /**
     * How numbers in it are read. Strings and dates ignore it. Left out, the values decide: whole
     * numbers from 1000 to 2999 read as years, epochs in seconds as `"s"`, epochs in milliseconds
     * as `"ms"`, and any other numbers as `"ordinal"` (steps, ticks).
     */
    readonly unit?: TimeUnit;
    /**
     * The IANA zone text with no offset reads in, such as `America/New_York`: date-times, and
     * dates, year-months and years written as text; default `"UTC"`. A year column (`unit: "year"`)
     * always reads in UTC. Changing it clears the window.
     */
    readonly parseZone?: string;
}

/**
 * The designated time field: on nodes, on edges, or on both (then both name the same column).
 * Designating a column makes it a time column: its measurement reads `"time"`.
 * @experimental timeline
 * @beta
 */
export interface TimeField {
    readonly nodes?: TimeSource;
    readonly edges?: TimeSource;
}

/**
 * How {@link TimeApi.setField} designates a field.
 * @experimental timeline
 * @beta
 */
export interface TimeFieldOptions {
    /**
     * Convert a text column every one of whose values reads as a date to a date column, in the
     * same undoable step, so the column's type and the timeline agree. Off by default: the column
     * keeps its type.
     */
    readonly asDates?: boolean;
}

/**
 * How many elements of one kind have a usable time.
 * @experimental timeline
 * @beta
 */
export interface TimeCounts {
    /** Elements whose value parsed. */
    readonly timed: number;
    /** Elements with no value. */
    readonly untimed: number;
    /** Elements whose value did not parse. They are treated as having no time. */
    readonly unparsed: number;
}

/**
 * A notice about the values of a designated column.
 * @experimental timeline
 * @beta
 */
export type TimeNoticeCode = "time.unparsed" | "time.parsed-loosely" | "time.unit-suspect" | "time.age-fade-inactive";

/**
 * What designating a field found.
 * @experimental timeline
 * @beta
 */
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

/**
 * The span of the data's time, half-open: `to` is just past the last instant. Open ends do not
 * stretch it: it runs over the finite bounds.
 * @experimental timeline
 * @beta
 */
export interface TimeExtent {
    readonly from: number;
    readonly to: number;
    readonly nodes: TimeCounts;
    readonly edges: TimeCounts;
}

/**
 * One histogram bar: elements whose instant is in `[start, end)`, or, for spans, the spans that
 * overlap it, so an element can count in many bars and twice in one.
 * @experimental timeline
 * @beta
 */
export interface TimeBin {
    readonly start: number;
    readonly end: number;
    readonly nodes: number;
    readonly edges: number;
    /** The bins' width, when they were made by a step or a `maxCount` budget. */
    readonly step?: TimeStep;
}

/**
 * What {@link TimeApi.bins} counts.
 * @experimental timeline
 * @beta
 */
export interface TimeBinsOptions {
    /** How many equal bins; default 100. Ignored when `step` is given. */
    readonly count?: number;
    /** A bin width: milliseconds (or ordinal units), or a calendar step aligned in `timeZone`. */
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
    /**
     * `"visible"` counts only elements that pass every filter, the window aside, so a bar outside
     * the window still holds its filtered count. Default `"all"`.
     */
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
    /** The IANA zone calendar bins align in; default the current window's, else the setting's. */
    readonly timeZone?: string;
}

/**
 * Node and edge ids.
 * @experimental timeline
 * @beta
 */
export interface TimeIds {
    readonly nodes: readonly NodeId[];
    readonly edges: readonly EdgeId[];
}

/**
 * What entered and left the visible graph on the last move.
 * @experimental timeline
 * @beta
 */
export interface TimeChanges {
    readonly entered: TimeIds;
    readonly left: TimeIds;
}

/**
 * Node and edge counts.
 * @experimental timeline
 * @beta
 */
export interface TimeCountPair {
    readonly nodes: number;
    readonly edges: number;
}

/**
 * What one move of the window did. Numbers only; the application writes the words.
 * @experimental timeline
 * @beta
 */
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
 * @experimental timeline
 * @beta
 */
export type TimeWindowInput = Omit<TimeWindow, "attribute" | "from" | "to"> & {
    readonly attribute?: Path;
    readonly from?: number | string;
    readonly to?: number | string;
};

/**
 * How playback moves the window: both ends (`sliding`), or only the end (`cumulative`).
 * @experimental timeline
 * @beta
 */
export type TimePlayMode = "sliding" | "cumulative";

/**
 * What `time.play` takes. Each one given is also written onto the window, so it is saved.
 * @experimental timeline
 * @beta
 */
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
    /** The IANA zone calendar steps read in; default the window's, else the setting's. */
    readonly timeZone?: string;
    /**
     * With stepped motion, wait for a drawn frame before timing the next step, so steps never
     * outrun the renderer. Default false: steps keep to the timer. No frame coming (a hidden page,
     * a stopped render loop, no renderer) does not hold a play up. Smooth motion never needs it.
     */
    readonly waitForRender?: boolean;
}

/**
 * How `session.time` moves windows: {@link TimePlayback} with every default filled in.
 * @experimental timeline
 * @beta
 */
export interface TimeSettings {
    /** What a window move does to finished runs over the visible graph. */
    readonly results: TimeResultsPolicy;
    /** Sliding (both ends move) or cumulative (from the start of the data). */
    readonly mode: TimePlayMode;
    /** How far a step moves; `"auto"` picks one from the data's span. */
    readonly step: TimeStep | "auto";
    /** Whether an element with no usable time is kept in every window. */
    readonly missing: "inside" | "outside";
    /**
     * Whether elements outside the window are hidden or drawn as ghosts. Read from the style
     * layers selecting `{ match: "state", state: "outsideWindow" }`, and written to them: the
     * element's own hide what lies outside, and `"ghost"` sets `visible: true` on every layer of
     * the stack that selects the state (adding one when none does). Never a layout input: what
     * lies outside the window keeps its place.
     */
    readonly outside: "hide" | "ghost";
    /** The IANA zone calendar steps and bins read in, unless a call or the window names its own. */
    readonly timeZone: string;
    /**
     * Fade by age: the opacity of edges at the window's first instant, rising to 1 at its end;
     * 1 (the default) draws no fade. See {@link TimePlayback.ageFade}.
     * @experimental timeline
     */
    readonly ageFade: number;
}

/**
 * A column that reads as time, from {@link TimeApi.candidates}.
 * @experimental timeline
 * @beta
 */
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

/**
 * The timeline: designate a time field, read its distribution, and move a window along it. It
 * needs `features="timeline"`: otherwise an action refuses with `E_FEATURE_OFF` and a read answers
 * as it does with no field designated.
 * @experimental timeline
 * @beta
 */
export interface TimeApi {
    /** The designated field, or null when none is. */
    readonly field: TimeField | null;
    /**
     * Designate the time field, or clear it with null: one undoable step, saved in the project.
     * The column's measurement becomes `"time"`. Clearing or changing the field, or its unit,
     * clears the window. A column designated again without a unit takes the unit it had before.
     * @param field - Nodes, edges or both; both must name the same column, and when both name an
     *     `end` or `spells`, the same one. A kind naming neither keeps instants.
     * @param options - With `asDates`, a text column of dates also becomes a date column, in the
     *     same step; a refused call converts nothing.
     * @returns What the values held.
     * @throws `E_BAD_COMMAND` (`reason`: `"declared-not-time"`, `"time-paths-differ"` with `field`
     *     naming `start`, `end` or `spells`, `"unit"`, `"time-zone"`, `"no-times"` for a column whose
     *     values hold no time at all).
     */
    setField(field: TimeField | null, options?: TimeFieldOptions): Promise<TimeFieldResult>;
    /**
     * The columns whose values read as time, most read first.
     * @returns The candidates; a column none of whose values reads as time is left out.
     */
    candidates(): readonly TimeCandidate[];
    /**
     * What the designated field's values held: the same notices `setField` returns, also for a
     * field designated by an import or an element attribute. It starts no build it would wait on:
     * after a load, or over a column of 50,000 rows or more, wait on {@link TimeApi.ready} first.
     * With a field designated and `ageFade` under 1 where it cannot apply, it also holds
     * `time.age-fade-inactive` (`{ reason }`: `"no-edge-time"`, `"spells"` or `"ghost"`), whether
     * or not the index is ready.
     * @returns The notices; empty with no field, and, but for that one, until the index is ready.
     */
    notices(): readonly CodedFact<TimeNoticeCode>[];
    /**
     * Read text as an instant the way the designated field reads its values (a date with no
     * offset reads in the field's `parseZone`; ordinal time reads numbers). A caller showing dates
     * in another zone passes it, so a date a reader types means what the readout shows. To answer
     * now it finishes a background build at once, which over a big column holds the thread; during
     * a load it starts no build, and reads numbers in the unit the field gives or last read in.
     * @param text - Such as `"2025-03-09"`, `"Mar 9, 2025"` or `"1998"`.
     * @param options - The zone to read in instead of `parseZone`.
     * @param options.timeZone - An IANA zone name.
     * @returns Epoch milliseconds (or the ordinal value), or null when the text names no instant.
     * @throws `E_BAD_COMMAND` with `reason: "time-zone"` for a bad zone name.
     */
    parse(text: string, options?: { readonly timeZone?: string }): number | null;
    /**
     * Resolves once the designated field is indexed, so the facts below answer synchronously. It
     * waits for a load running, for a {@link TimeApi.setField} running, and for the last build when
     * the field or the data changes while one runs: it never rejects for that. With nothing to
     * build it resolves at once.
     */
    readonly ready: Promise<void>;
    /**
     * The span of the data's time, or null when nothing is designated, nothing has a time, or the
     * index is not ready: a column of 50,000 rows or more builds in the background, starting at the
     * first read, as does any column during a load. `time:ready` says when it is done.
     */
    extent(): TimeExtent | null;
    /**
     * The histogram of the designated field.
     * @param options - Count, step or a most-bins budget, range, and which elements to count.
     * @returns The bins, or null when there is no extent, as {@link TimeApi.extent} has none.
     * @throws `E_OPTION_RANGE` for a bad count or more than 10,000 bins; `E_BAD_COMMAND` with
     *     `reason: "calendar-step-on-ordinal"` for a calendar step on ordinal time, or
     *     `reason: "time-zone"` for a bad zone name.
     */
    bins(options?: TimeBinsOptions): readonly TimeBin[] | null;
    /**
     * The time span of the given elements, half-open, ready to pass to {@link TimeApi.window}. With
     * `incident`, the edges at the given nodes count too, as in {@link TimeBinsOptions.of}. To
     * answer now it finishes a background build at once, which over a big column holds the thread.
     * During a load it starts no build and gives null unless the index is ready.
     * @param of - The elements, such as `session.selection`'s `nodes` and `edges`.
     * @param of.nodes - The nodes.
     * @param of.edges - The edges.
     * @param of.incident - Whether the edges at the given nodes count too.
     * @returns The span of all their spans, `to` just past the last bound and an open bound held to
     *     {@link TimeApi.extent}'s, so it is always a usable window; null when none has a time.
     * @throws `E_FEATURE_OFF` with the experiment off.
     */
    spanOf(of: {
        readonly nodes?: readonly NodeId[];
        readonly edges?: readonly EdgeId[];
        readonly incident?: boolean;
    }): { readonly from: number; readonly to: number } | null;
    /**
     * The ids that entered and left the visible graph on the last move made through this API.
     * @returns The ids; empty before the first move.
     */
    changes(): TimeChanges;
    /** The window in force (`visibility.window`). Its `step` is the step in use, also under `"auto"`. */
    readonly current: TimeWindow | null;
    /**
     * The window history and the project file hold (`visibility.window`). It stays put while a
     * smooth play or a `seek` with `commit: false` moves {@link TimeApi.current}; a stepped play
     * records each window in the play's one history step, so it follows every step. Reading it with
     * the experiment off throws `E_FEATURE_OFF`.
     */
    readonly committed: TimeWindow | null;
    /** Whether the window is the first one: a step back would leave the data. False with no window. */
    readonly atStart: boolean;
    /** Whether the window reaches the end of the data. False with no window. */
    readonly atEnd: boolean;
    /**
     * The IANA zone the timeline reads in now: the window's, then the setting's, and always UTC over
     * a year column. Write a date in this zone and it reads as the bins and the window do.
     */
    readonly timeZone: string;
    /** How windows move: results, mode, step and missing, with every default filled in. */
    readonly settings: TimeSettings;
    /**
     * Change how windows move, one undoable step saved in the project (`visibility.playback`).
     * A sliding window snaps to a new step; switching to cumulative grows the window from the start
     * of the data, and back to sliding keeps one step ending where it ended. A new `timeZone` is
     * written on the window, and snaps it as a new step does. With no window only the setting is
     * stored. `results: "rerun"` re-runs the runs a window move left out of date. `ageFade` moves
     * no window: it changes only how edges in it are drawn.
     * @param settings - The settings that change.
     * @throws `E_BAD_COMMAND` for a setting out of range (`field: "ageFade"` outside 0 to 1).
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
     * Every window of a step at once, for a chart over time: each one step wide (cumulative: growing
     * a step at a time), whatever the width of the window in force, as stepping from the first window
     * of that step shows them. They are counted under the same filter, without moving what is on
     * screen or touching history. Step, mode and zone left out come from the window in force, else
     * the settings; `from` and `to` default to the start and end of the data.
     * @param options - Step, mode, range, zone and measures.
     * @returns A run resolving to the rows, one per window; it can be cancelled. It rejects with
     *     `E_NO_TIME_FIELD` when nothing is designated, `E_OPTION_RANGE` past 10,000 windows or for a
     *     `from` or `to` that is not finite, and `E_BAD_COMMAND` (`reason: "measure"`) for a measure it does not have.
     * @throws `E_FEATURE_OFF` with the experiment off.
     */
    series(options?: TimeSeriesOptions): Run<TimeSeries>;
    /**
     * Move the window by whole steps (negative goes back), stopping at the first and the last
     * window. With no window, a step forward opens the first window and a step back the last.
     * Undoable; window moves made in quick succession merge into one step, as a drag does.
     * @param count - How many steps.
     * @returns What the move did.
     */
    stepBy(count: number): Promise<TimeStepEvent>;
    /**
     * Move the window to start at an instant (sliding) or end there (cumulative), or to the first
     * or the last window. Undoable; window moves made in quick succession merge into one step, as
     * a drag does. With `commit: false` it moves only the cursor, for a window being dragged,
     * until {@link TimeApi.commit} records it.
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
    /** Whether the timeline experiment is on; absent reads on. */
    readonly timeline?: () => boolean;
    /** Moves on every write to the graph's rows or records. */
    readonly token: () => number;
    /**
     * Moves on every change to the graph other than rows added at the end: a record edit, a
     * removal, an undo, rows renumbered. While it stands still, rows already indexed still hold
     * what they held and new ones follow them, so the index merges them in. Absent, it rebuilds.
     */
    readonly rewrites?: () => string;
    /** Settles when the load running now and those behind it have; null when none runs. */
    readonly loading?: () => Promise<void> | null;
    /**
     * The data's own revision: moves on a freeze or an attribute write, never on a mask. Keeps
     * `candidates()` until a column, type or value changes; absent, it is recomputed per call.
     */
    readonly dataRevision?: () => unknown;
    readonly values: FilterValueSource;
    /** A reader of a whole column, faster than `values` over every row; null when it has none. */
    readonly column?: (kind: "node" | "edge", key: string) => ((row: number) => unknown) | null;
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
    /**
     * Convert a text column whose every value reads as a date to a date column; does nothing to
     * any other column. Its dispatch is made before its first await. Absent, `asDates` does nothing.
     */
    readonly asDates?: (kind: "node" | "edge", column: string) => Promise<void> | undefined;
    /**
     * Settles on the next drawn frame, or at once when no frame is coming. Absent with no renderer.
     * Asked only by a stepped play with `waitForRender`.
     */
    readonly renderedFrame?: () => Promise<void>;
}

/** The `data.knownFields` keys that hold the designation. */
interface KnownTimeFields {
    readonly nodeTimePath: string | null;
    readonly nodeTimeUnit: TimeUnit | null;
    readonly nodeTimeParseZone: string | null;
    readonly nodeTimeEndPath: string | null;
    readonly nodeTimeSpellsPath: string | null;
    readonly edgeTimePath: string | null;
    readonly edgeTimeUnit: TimeUnit | null;
    readonly edgeTimeParseZone: string | null;
    readonly edgeTimeEndPath: string | null;
    readonly edgeTimeSpellsPath: string | null;
}

/** What the rest of the session reads back from the timeline. */
export interface TimeInternals {
    /** Parsed instants per row for a designated path, which the window reads instead of parsing. */
    instants(path: Path): { readonly node: TimeInstants | null; readonly edge: TimeInstants | null } | null;
    /**
     * The zone a window's text bounds read in, when its attribute is the designated column.
     * @param attribute - The window's attribute.
     * @returns The zone, or undefined for any other column.
     */
    boundZone(attribute: Path): string | undefined;
    /** A run's scope digest that a `results: "keep"` window move accepted as current. */
    acceptedDigest(id: RunId, ranOn: string): string | undefined;
    /** The window a `results: "keep"` move accepted a run in, as a window key. */
    acceptedWindow(id: RunId): string | undefined;
    /** How many of a designated column's values parsed, for its completeness; undefined otherwise. */
    parsedCount(kind: "node" | "edge", column: string): number | undefined;
    /** Whether playback is running, so autosave can wait for a pause. */
    readonly playing: boolean;
    /**
     * What the renderer fades edges by age with: null while `ageFade` is 1, the timeline is off,
     * the setting cannot apply or the index is not ready.
     */
    edgeAges(): EdgeAgeFade | null;
    /** Apply the `results` setting after a visibility change. */
    visibilityChanged(change: VisibilityChange): void;
    /** Stop playback for good. */
    dispose(): void;
}

/** The elements a question names: the given ones, and with `incident` the edges at the given nodes. */
type TimeElements = NonNullable<TimeBinsOptions["of"]>;

/** The members of `session.time` that return a promise, so refuse by rejecting it. */
const REJECTING_MEMBERS: ReadonlySet<keyof TimeApi> = new Set<keyof TimeApi>([
    "setField",
    "setSettings",
    "stepBy",
    "seek",
    "commit",
]);

/**
 * `session.time` behind its experiment. While it is off an action refuses with `E_FEATURE_OFF`
 * (the ones returning a promise read as a function that rejects, the rest throw when read) and a
 * read gives the answer it gives with nothing designated, so a consumer's display needs no check.
 * `parse` stays open: it reads text and touches no timeline, and date conditions rely on it.
 * Asked per member, because an element's session settles its features only when it first renders.
 * @param api - The timeline.
 * @param on - Whether the experiment is on now.
 * @returns The gated timeline.
 */
export function gatedTimeApi(api: TimeApi, on: () => boolean): TimeApi {
    const nothing: Partial<TimeApi> = {
        field: null,
        current: null,
        atStart: false,
        atEnd: false,
        playing: false,
        timeZone: UTC_ZONE,
        settings: DEFAULT_TIME_SETTINGS,
        mode: DEFAULT_TIME_SETTINGS.mode,
        interval: DEFAULT_INTERVAL,
        ready: Promise.resolve(),
        extent: () => null,
        bins: () => null,
        candidates: () => [],
        notices: () => [],
        changes: () => NO_CHANGES,
    };
    const gated = {} as TimeApi;
    for (const key of Object.keys(api) as (keyof TimeApi)[]) {
        Object.defineProperty(gated, key, {
            get: () => {
                if (key !== "parse" && !on()) {
                    if (key in nothing) {
                        return nothing[key];
                    }

                    const refusal = featureOff("timeline", `time.${key}`);
                    if (REJECTING_MEMBERS.has(key)) {
                        return () => Promise.reject(refusal);
                    }

                    throw refusal;
                }

                return Reflect.get(api, key) as unknown;
            },
        });
    }

    return Object.freeze(gated);
}

/** Every timeline setting at its default. */
const DEFAULT_TIME_SETTINGS: TimeSettings = Object.freeze({
    results: "stale",
    mode: "sliding",
    step: "auto",
    missing: "inside",
    outside: "hide",
    timeZone: UTC_ZONE,
    ageFade: 1,
});

/**
 * Whether a layer selects what lies outside the time window.
 * @param layer - The layer.
 * @param layer.selector - What it selects.
 * @returns True for `{ match: "state", state: "outsideWindow" }`.
 */
function selectsOutside(layer: { readonly selector: Selector }): boolean {
    return layer.selector.match === "state" && layer.selector.state === "outsideWindow";
}

// ---------------------------------------------------------------------------------------------
// Reading the index
// ---------------------------------------------------------------------------------------------

const NO_COUNTS: TimeCounts = Object.freeze({ timed: 0, untimed: 0, unparsed: 0 });
const NO_IDS: TimeIds = Object.freeze({ nodes: Object.freeze([]), edges: Object.freeze([]) });
const NO_CHANGES: TimeChanges = Object.freeze({ entered: NO_IDS, left: NO_IDS });
const MAX_BINS = 10_000;
const MS_PER_HOUR = 3_600_000;
const DEFAULT_INTERVAL = 1000;
const ATTRIBUTE_PREFIX = "data.";
/** How many windows an automatic step aims to cut the data's span into. */
const AUTO_STEPS = 20;

/**
 * A column name without the `data.` prefix a path carries.
 * @param path - The path or column.
 * @returns The column.
 */
function columnOf(path: string): string {
    return path.startsWith(ATTRIBUTE_PREFIX) ? path.slice(ATTRIBUTE_PREFIX.length) : path;
}

/**
 * The end and spells columns of the designated field, when a window reads that field's start.
 * @param field - The designated field, if any.
 * @param attribute - The column the window reads.
 * @returns The field's end and spells columns, or neither for another column.
 */
function fieldBoundsOf(
    field: TimeField | null,
    attribute: string,
): { readonly end: TimeSource["end"]; readonly spells: TimeSource["spells"] } {
    const designated = field?.edges ?? field?.nodes;
    if (designated === undefined || columnOf(attribute) !== columnOf(designated.start)) {
        return { end: undefined, spells: undefined };
    }

    return { end: field?.edges?.end ?? field?.nodes?.end, spells: field?.edges?.spells ?? field?.nodes?.spells };
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
 * The refusal for a name that is no time zone.
 * @param field - The option that gave it.
 * @param value - The name.
 * @returns The error.
 */
function badZone(field: string, value: unknown): GraphtyError {
    return badCommand("A time zone is an IANA zone name, such as America/New_York.", {
        field,
        reason: "time-zone",
        value,
    });
}

/**
 * Refuse a malformed time source.
 * @param source - The source.
 * @throws `E_BAD_COMMAND` naming what is wrong.
 */
function assertTimeSource(source: TimeSource): void {
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

    if (source.parseZone !== undefined && !isTimeZone(source.parseZone)) {
        throw badZone("parseZone", source.parseZone);
    }

    for (const field of ["end", "spells"] as const) {
        const path = source[field];
        if (path !== undefined && (typeof path !== "string" || path.length === 0)) {
            throw badCommand(`A time source's \`${field}\` names a column.`, { field, reason: field, source });
        }
    }
}

/**
 * A column a source may name, read the same whichever way it was written.
 * @param path - The path, or undefined.
 * @returns The column, or undefined.
 */
function optionalColumn(path: Path | undefined): string | undefined {
    return path === undefined ? undefined : columnOf(path);
}

/**
 * Whether two sources read the same timeline: the same columns, unit and zone.
 * @param a - One, or undefined for none.
 * @param b - The other.
 * @returns True when each reads as the other does.
 */
function sameReading(a: TimeSource | undefined, b: TimeSource | undefined): boolean {
    return (
        a?.start === b?.start &&
        optionalColumn(a?.end) === optionalColumn(b?.end) &&
        optionalColumn(a?.spells) === optionalColumn(b?.spells) &&
        (a?.unit ?? "ms") === (b?.unit ?? "ms") &&
        (a?.parseZone ?? UTC_ZONE) === (b?.parseZone ?? UTC_ZONE)
    );
}

/**
 * What a field's designation says, as a key: what makes one index another's reading of the data.
 * @param field - The field.
 * @returns The key.
 */
function readingOf(field: TimeField): string {
    return [field.nodes, field.edges]
        .map((source) =>
            [source?.start, source?.unit, source?.parseZone, source?.end, source?.spells]
                .map((part) => part ?? "")
                .join("|"),
        )
        .join("|");
}

/**
 * A source with the unit its values called for, when it gave none.
 * @param source - The source, or undefined.
 * @param unit - The unit its values call for.
 * @returns The source.
 */
function withUnit(source: TimeSource | undefined, unit: TimeUnit | undefined): TimeSource | undefined {
    return source === undefined || source.unit !== undefined || unit === undefined ? source : { ...source, unit };
}

/**
 * Refuse a field whose two kinds name different columns.
 * @param asked - The sources.
 * @param asked.nodes - The node source.
 * @param asked.edges - The edge source.
 * @throws `E_BAD_COMMAND` with `reason: "time-paths-differ"`.
 */
function assertOneColumn(asked: { readonly nodes?: TimeSource; readonly edges?: TimeSource }): void {
    if (
        asked.nodes !== undefined &&
        asked.edges !== undefined &&
        columnOf(asked.nodes.start) !== columnOf(asked.edges.start)
    ) {
        // ponytail: one path for both kinds, because a window reads one attribute; two
        // paths need a window per kind.
        throw badCommand("Nodes and edges name the same time column.", {
            field: "start",
            reason: "time-paths-differ",
            nodes: asked.nodes.start,
            edges: asked.edges.start,
        });
    }

    for (const field of ["end", "spells"] as const) {
        const nodes = optionalColumn(asked.nodes?.[field]);
        const edges = optionalColumn(asked.edges?.[field]);
        if (nodes !== undefined && edges !== undefined && nodes !== edges) {
            throw badCommand(`Nodes and edges name the same \`${field}\` column.`, {
                field,
                reason: "time-paths-differ",
                nodes,
                edges,
            });
        }
    }
}

/**
 * Refuse a column declared as something other than time.
 * @param asked - The sources.
 * @param asked.nodes - The node source.
 * @param asked.edges - The edge source.
 * @param declarations - The declarations, by kind and column.
 * @throws `E_BAD_COMMAND` with `reason: "declared-not-time"`.
 */
function assertDeclaredTime(
    asked: { readonly nodes?: TimeSource; readonly edges?: TimeSource },
    declarations: ReturnType<TimeSources["declarations"]>,
): void {
    for (const [kind, source] of [
        ["node", asked.nodes],
        ["edge", asked.edges],
    ] as const) {
        const declared = source === undefined ? undefined : declarations.get(`${kind}:${columnOf(source.start)}`);
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
}

/**
 * Refuse a column with values none of which reads as time: it is no timeline.
 * @param proposed - The index built for it, or null.
 * @param field - The sources.
 * @param field.nodes - The node source.
 * @param field.edges - The edge source.
 * @throws `E_BAD_COMMAND` with `reason: "no-times"`.
 */
function assertHoldsTimes(
    proposed: FieldIndex | null,
    field: { readonly nodes?: TimeSource; readonly edges?: TimeSource },
): void {
    for (const [kind, source] of [
        ["node", field.nodes],
        ["edge", field.edges],
    ] as const) {
        const tried = proposed?.[kind] ?? null;
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
}

/**
 * A field with only the kinds it names.
 * @param field - The sources, either possibly undefined.
 * @param field.nodes - The node source.
 * @param field.edges - The edge source.
 * @returns The field.
 */
function present(field: { readonly nodes?: TimeSource; readonly edges?: TimeSource }): TimeField {
    return {
        ...(field.nodes === undefined ? {} : { nodes: field.nodes }),
        ...(field.edges === undefined ? {} : { edges: field.edges }),
    };
}

/**
 * A window's zone as an option to spread: nothing when it names none.
 * @param timeZone - The zone, or undefined.
 * @returns The option.
 */
function zoned(timeZone: string | undefined): { readonly timeZone?: string } {
    return timeZone === undefined ? {} : { timeZone };
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
 * The edges of a histogram's bins of equal width, by count.
 * @param from - Where the bins start.
 * @param to - Where they end.
 * @param options - The count (100 when absent).
 * @returns The edges, one more than the bins.
 */
function countBounds(from: number, to: number, options: TimeBinsOptions): number[] {
    const bounds: number[] = [];
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

/**
 * The edges of a histogram's bins, first start to last end.
 * @param from - Where the bins start (a step aligns it down).
 * @param to - Where they end.
 * @param options - The count or the step.
 * @param ordinal - Whether a numeric step aligns to its multiples (ordinal time).
 * @param zone - The zone calendar steps read in.
 * @returns The edges, one more than the bins.
 */
function binBounds(from: number, to: number, options: TimeBinsOptions, ordinal: boolean, zone: string): number[] {
    const { step } = options;
    if (step === undefined) {
        return countBounds(from, to, options);
    }

    const bounds: number[] = [];
    if (!isCalendarStep(step) && (Number.isNaN(step) || step <= 0)) {
        throw tooManyBins(options, step);
    }

    const first = ordinal && !isCalendarStep(step) ? Math.floor(from / step) * step : alignTo(from, step, zone);
    let at = first;
    let bins = 0;
    while (at < to) {
        if (bins === MAX_BINS) {
            throw tooManyBins(options, step);
        }

        bounds.push(at);
        bins++;
        at = ordinal && !isCalendarStep(step) ? first + bins * step : addSteps(at, step, 1, zone);
    }

    bounds.push(options.maxCount === undefined ? to : at);

    return bounds;
}

/**
 * One column as a time candidate: walks every value of it.
 * @param sources - What `session.time` reads.
 * @param graph - The graph now.
 * @param kind - Which records carry the column.
 * @param name - The column.
 * @returns The candidate, or undefined when no value reads as time.
 */
function timeCandidate(
    sources: TimeSources,
    graph: GraphSnapshot,
    kind: "node" | "edge",
    name: string,
): TimeCandidate | undefined {
    const attribute = `${ATTRIBUTE_PREFIX}${name}`;
    const count = kind === "node" ? graph.nodeCount : graph.edgeCount;
    const { values } = sources;
    const tally = newCandidateTally();
    for (let row = 0; row < count; row++) {
        tallyCandidate(tally, kind === "node" ? values.nodeValue(row, attribute) : values.edgeValue(row, attribute));
    }

    const { parsed, unit } = candidateReading(tally, name);

    return parsed > 0
        ? Object.freeze({ kind, column: name, parsed, total: tally.total, ...(unit === undefined ? {} : { unit }) })
        : undefined;
}

/**
 * The columns whose values read as time, best first: walks every value of each column.
 * @param sources - What `session.time` reads.
 * @param columns - The columns to look through.
 * @returns The candidates.
 */
function timeCandidates(
    sources: TimeSources,
    columns: readonly { readonly kind: "node" | "edge"; readonly name: string }[],
): readonly TimeCandidate[] {
    const graph = sources.snapshot();
    const found: TimeCandidate[] = [];
    for (const { kind, name } of columns) {
        const candidate = timeCandidate(sources, graph, kind, name);
        if (candidate !== undefined) {
            found.push(candidate);
        }
    }

    found.sort((a, b) => b.parsed / b.total - a.parsed / a.total || b.parsed - a.parsed);
    return Object.freeze(found);
}

/**
 * Build the timeline over a session's parts.
 * @param sources - What it reads.
 * @returns The consumer surface and what the session reads back.
 */
export function createTimeApi(sources: TimeSources): { readonly api: TimeApi; readonly internals: TimeInternals } {
    const { visibility, dispatcher } = sources;
    let index: FieldIndex | null = null;
    /** The build running a slice at a time, with the key it is for. */
    let job: { readonly key: string; readonly work: IndexWork<FieldIndex>; done: Promise<void> } | null = null;
    /** What `ready` holds: settles when no build is left to run. */
    let following: Promise<void> | null = null;
    /** The `setField` calls under way, one after another, so the last caller's choice stands. */
    let fieldCalls: Promise<void> | null = null;
    let lastChanges: (() => TimeChanges) | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    /** The window on screen while it is played smoothly or dragged, before it is recorded. */
    let cursor: TimeWindow | null = null;
    /** The edges' starts normalized over the extent, for the index and extent they were read from. */
    let ageCache: { kind: KindIndex; from: number; to: number; ages: Float32Array } | null = null;
    let frame: number | null = null;
    let lastFrameAt = 0;
    let smooth = true;
    let playing = false;
    let interval = DEFAULT_INTERVAL;
    let loop = false;
    let waitForRender = false;
    /** How many plays have started, so a frame an earlier play waited on starts no timer. */
    let plays = 0;
    /** The history step this play's moves merge into. */
    let playStep: HistoryStepId | null = null;
    /** How many times the window has slid, so a move can tell a newer slide took the cursor. */
    let slides = 0;
    let disposed = false;
    /** Runs that were out of date at the last visibility change, so "keep" never revives one. */
    let staleBefore = new Set<RunId>();
    const accepted = new Map<RunId, { readonly from: string; readonly to: string; readonly window: string }>();
    let reruns: Promise<unknown> = Promise.resolve();
    /** The unit the reader last gave each column, so designating it again keeps it. */
    const units = new Map<string, TimeUnit>();
    /** The last `bins({ scope: "visible" })` counts, and what they were counted from. */
    let filteredBins: {
        readonly filter: FilterBytes;
        readonly built: FieldIndex;
        readonly bounds: string;
        readonly nodes: readonly number[];
        readonly edges: readonly number[];
    } | null = null;
    /** `candidates()` for the data revision, by the columns it looked through. */
    const candidateCache = new RevisionCache<readonly TimeCandidate[]>(() => sources.dataRevision?.(), 1);

    /**
     * The designation, from `data.knownFields`.
     * @returns The field, or null.
     */
    const fieldNow = (): TimeField | null => {
        const known = sources.knownFields();
        const sourceOf = (
            path: string | null,
            unit: TimeUnit | null,
            parseZone: string | null,
            end: string | null,
            spells: string | null,
        ): TimeSource | undefined =>
            path === null
                ? undefined
                : Object.freeze({
                      start: path,
                      ...(unit === null ? {} : { unit }),
                      ...(parseZone === null ? {} : { parseZone }),
                      // With the timeline off they stay saved and are not read.
                      ...(end === null || sources.timeline?.() === false ? {} : { end }),
                      ...(spells === null || sources.timeline?.() === false ? {} : { spells }),
                  });
        const nodes = sourceOf(
            known.nodeTimePath,
            known.nodeTimeUnit,
            known.nodeTimeParseZone,
            known.nodeTimeEndPath,
            known.nodeTimeSpellsPath,
        );
        const edges = sourceOf(
            known.edgeTimePath,
            known.edgeTimeUnit,
            known.edgeTimeParseZone,
            known.edgeTimeEndPath,
            known.edgeTimeSpellsPath,
        );

        return nodes === undefined && edges === undefined
            ? null
            : Object.freeze({ ...(nodes === undefined ? {} : { nodes }), ...(edges === undefined ? {} : { edges }) });
    };

    /**
     * The write mark to compare an index by, read after the snapshot's freeze has run.
     * @returns The mark; empty with the timeline off, where nothing is counted.
     */
    const rewritesNow = (): string => (sources.timeline?.() === false ? "" : (sources.rewrites?.() ?? ""));

    /**
     * The data as a key: what moved when an index built over it no longer fits.
     * @returns The key.
     */
    const dataKey = (): string => {
        const graph = sources.snapshot();

        return `${sources.token()}|${graph.nodeCount}|${graph.edgeCount}|${rewritesNow()}`;
    };

    /**
     * The key of a field's index over the graph as it stands.
     * @param field - The field.
     * @returns The key.
     */
    const keyOf = (field: TimeField): string => `${dataKey()}|${readingOf(field)}`;

    /**
     * What a build of a field reads.
     * @param field - The field.
     * @returns The plan.
     */
    const planOf = (field: TimeField): FieldPlan => {
        const graph = sources.snapshot();
        const path = columnOf(((field.edges ?? field.nodes) as TimeSource).start);
        const attribute = `${ATTRIBUTE_PREFIX}${path}`;
        // With the timeline off no zone is named, and text reads as it did before zones.
        const zoneFor = (source: TimeSource): string | undefined =>
            sources.timeline?.() === false ? undefined : (source.parseZone ?? UTC_ZONE);
        // With the timeline off the values are read as they always were.
        const columnReader = (kind: "node" | "edge", column: string): KindPlan["read"] | null =>
            sources.timeline?.() === false ? null : (sources.column?.(kind, column) ?? null);
        const beside = (kind: "node" | "edge", path: Path | undefined): SpanColumn | undefined => {
            if (path === undefined) {
                return undefined;
            }

            const column = columnOf(path);
            const named = `${ATTRIBUTE_PREFIX}${column}`;
            const read =
                columnReader(kind, column) ??
                ((row: number) =>
                    kind === "node" ? sources.values.nodeValue(row, named) : sources.values.edgeValue(row, named));

            return { column, read };
        };
        const kindOf = (kind: "node" | "edge", source: TimeSource, count: number, read: KindPlan["read"]): KindPlan => {
            const end = beside(kind, source.end);
            const spells = beside(kind, source.spells);

            return {
                count,
                read,
                unit: source.unit,
                zone: zoneFor(source),
                ...(end === undefined ? {} : { end }),
                ...(spells === undefined ? {} : { spells }),
            };
        };

        return {
            key: keyOf(field),
            data: dataKey(),
            reading: readingOf(field),
            rewrites: rewritesNow(),
            path,
            node:
                field.nodes === undefined
                    ? null
                    : kindOf(
                          "node",
                          field.nodes,
                          graph.nodeCount,
                          columnReader("node", path) ?? ((row) => sources.values.nodeValue(row, attribute)),
                      ),
            edge:
                field.edges === undefined
                    ? null
                    : kindOf(
                          "edge",
                          field.edges,
                          graph.edgeCount,
                          columnReader("edge", path) ?? ((row) => sources.values.edgeValue(row, attribute)),
                      ),
        };
    };

    /**
     * Whether a field's build runs a slice at a time.
     * @param field - The field.
     * @returns True above the threshold, with the timeline on.
     */
    const sliced = (field: TimeField): boolean => {
        const graph = sources.snapshot();
        const rows =
            (field.nodes === undefined ? 0 : graph.nodeCount) + (field.edges === undefined ? 0 : graph.edgeCount);

        return rows >= SLICED_ROWS && sources.timeline?.() !== false;
    };

    /**
     * The work that brings the index up to a field's key: only the rows added, when that is all
     * that happened, else the whole column.
     * @param field - The field.
     * @yields After each chunk.
     * @returns The work.
     */
    function* workFor(field: TimeField): IndexWork<FieldIndex> {
        const plan = planOf(field);
        const held = index;
        if (
            held !== null &&
            held.rewrites !== "" &&
            held.rewrites === plan.rewrites &&
            held.reading === plan.reading &&
            (held.node?.rows.length ?? 0) <= (plan.node?.count ?? 0) &&
            (held.edge?.rows.length ?? 0) <= (plan.edge?.count ?? 0)
        ) {
            const merged = yield* mergeField(held, plan);
            if (merged !== null) {
                return merged;
            }
        }

        return yield* buildField(plan);
    }

    /**
     * Take a finished index. It is often built inside a read (`time.field`, `extent()`): listeners
     * hear on a microtask so none runs inside the caller's read (#4450). It still lands before an
     * `await` of the call that built it resumes.
     * @param built - The index.
     * @param field - The field it indexes.
     * @returns The index.
     */
    const land = (built: FieldIndex, field: TimeField): FieldIndex => {
        index = built;
        job = null;
        queueMicrotask(() => {
            sources.emit("time:ready", { field });
        });

        return built;
    };

    /**
     * The work of {@link workFor}, landing its index in the step it ends: no one can come between
     * the two and run work that has finished.
     * @param field - The field.
     * @yields After each chunk.
     * @returns The work.
     */
    function* landing(field: TimeField): IndexWork<FieldIndex> {
        return land(yield* workFor(field), field);
    }

    /**
     * The index of the designated field over the graph as it stands, however it must be had: a
     * build under way is run to its end here, because a window needed now cannot wait for it.
     * @returns The index, or null when nothing is designated.
     */
    const indexNow = (): FieldIndex | null => {
        const field = fieldNow();
        if (field === null) {
            index = null;
            return null;
        }

        const key = keyOf(field);
        if (index?.key === key) {
            return index;
        }

        return drain(job?.key === key ? job.work : landing(field));
    };

    /**
     * Run the build a field's key asks for, a slice at a time.
     * @param field - The field.
     * @param key - Its key.
     * @returns Settles when the build landed or was dropped, never rejecting for a drop.
     */
    const buildInSlices = (field: TimeField, key: string): Promise<void> => {
        if (job?.key === key) {
            return job.done;
        }

        const running = { key, work: landing(field), done: Promise.resolve() };
        job = running;
        const dropped = (): boolean => {
            const now = fieldNow();
            return (
                job !== running ||
                disposed ||
                (sources.loading?.() ?? null) !== null ||
                now === null ||
                keyOf(now) !== running.key
            );
        };
        running.done = inSlices(running.work, dropped).then(() => {
            if (job === running) {
                job = null;
            }
        });

        return running.done;
    };

    /**
     * Wait until the index fits the graph: past any `setField` and any load running, through a
     * build, and through whatever build replaces one that was dropped, so a caller holding this
     * never sees a drop.
     */
    const settle = async (): Promise<void> => {
        await Promise.resolve();
        while (!disposed) {
            const before = fieldCalls ?? sources.loading?.() ?? null;
            const field = fieldNow();
            if (before !== null) {
                await before;
            } else if (field === null || index?.key === keyOf(field)) {
                return;
            } else if (sliced(field)) {
                await buildInSlices(field, keyOf(field));
            } else {
                indexNow();
                return;
            }
        }
    };

    /**
     * The one wait for the index, shared by every holder of `time.ready`.
     * @returns Settles as {@link settle} does.
     */
    const follow = (): Promise<void> => {
        following ??= settle().finally(() => {
            following = null;
        });

        return following;
    };

    /**
     * The index of the designated field if a read can have it now. A big column or a load running
     * leaves it to {@link follow}, which this starts, and a small one builds here.
     * @returns The index, or null when nothing is designated or it is not ready.
     */
    const indexIfReady = (): FieldIndex | null => {
        const field = fieldNow();
        if (field === null) {
            index = null;
            return null;
        }

        if (index?.key === keyOf(field)) {
            return index;
        }

        if ((sources.loading?.() ?? null) === null && !sliced(field)) {
            return indexNow();
        }

        void follow();

        return null;
    };

    /**
     * Whether a read that wants an answer now should still start no build: rows are arriving, so it
     * would read the column only to read it again. With the timeline off, reads go on as they were.
     * @returns True during a load.
     */
    const loadHoldsBuilds = (): boolean => sources.timeline?.() !== false && (sources.loading?.() ?? null) !== null;

    /**
     * The unit the designated field reads in, as far as is known without a build: the designation's,
     * or the last index's of this reading.
     * @returns The unit, or undefined when nothing says yet.
     */
    const unitKnown = (): TimeUnit | undefined => {
        const field = fieldNow();
        if (field === null) {
            return undefined;
        }

        return (field.edges ?? field.nodes)?.unit ?? (index?.reading === readingOf(field) ? index.unit : undefined);
    };

    /**
     * The unit the designated field reads in, for a read that needs only that. During a load no
     * build may start, so it is what is known already.
     * @returns The unit, or undefined when nothing says yet.
     */
    const unitNow = (): TimeUnit | undefined => (loadHoldsBuilds() ? unitKnown() : indexNow()?.unit);

    /**
     * The index once a field is designated: the one built for it beforehand, when the data has not
     * moved since, under the key the designation gives it.
     * @param field - The field designated, or null.
     * @param proposed - The index built for it, or null.
     * @returns The index, or null when nothing is designated.
     */
    const adopted = (field: TimeField | null, proposed: FieldIndex | null): FieldIndex | null => {
        if (field === null || proposed === null || index?.key === keyOf(field) || proposed.data !== dataKey()) {
            return indexNow();
        }

        return land({ ...proposed, key: keyOf(field), reading: readingOf(field), inferred: {} }, field);
    };

    /**
     * An index for a field not yet designated, a slice at a time over a big column, once any load
     * has settled. Data that lands meanwhile starts it over.
     * @param field - The field.
     * @returns The index.
     */
    const indexFor = async (field: TimeField): Promise<FieldIndex> => {
        for (;;) {
            for (let load = sources.loading?.() ?? null; load !== null; load = sources.loading?.() ?? null) {
                await load;
            }

            const plan = planOf(field);
            const work = buildField(plan);
            const built = sliced(field) ? await inSlices(work, () => keyOf(field) !== plan.key) : drain(work);
            if (built !== null) {
                return built;
            }
        }
    };

    /**
     * The extent of an index.
     * @param built - The index, or null.
     * @returns The extent, or null.
     */
    const extentOf = (built: FieldIndex | null): TimeExtent | null => {
        if (built === null) {
            return null;
        }

        let from = Number.POSITIVE_INFINITY;
        let last = Number.NEGATIVE_INFINITY;
        for (const kind of [built.node, built.edge]) {
            const bounds = kind === null ? null : kindBounds(kind);
            if (bounds !== null) {
                from = Math.min(from, bounds[0]);
                last = Math.max(last, bounds[1]);
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
     * The extent of the index as it must be had now.
     * @returns The extent, or null.
     */
    const extentNow = (): TimeExtent | null => extentOf(indexNow());

    /**
     * Why a fade by age set under 1 does nothing, with a field designated.
     * @returns The reason, or null when it applies or is not set.
     */
    const ageFadeReason = (): AgeFadeInactiveReason | null => {
        const field = fieldNow();
        const { ageFade, outside } = settingsNow();

        return field === null || ageFade >= 1 ? null : ageFadeInactive(field.edges, outside);
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
        const outside = outsideNow();
        if (saved === null || saved === undefined) {
            return outside === DEFAULT_TIME_SETTINGS.outside
                ? DEFAULT_TIME_SETTINGS
                : Object.freeze({ ...DEFAULT_TIME_SETTINGS, outside });
        }

        return Object.freeze({ ...DEFAULT_TIME_SETTINGS, ...saved, outside });
    };

    /**
     * The layers of one kind selecting what lies outside the window that paint now: enabled, and
     * not in a hidden row.
     * @param target - Nodes or edges.
     * @returns Them, bottom first, the element's own included.
     */
    const outsideLayers = (target: "node" | "edge"): CompiledLayer[] =>
        paintedStack(dispatcher.state.styles).filter(
            ({ layer }) => layer.enabled && layer.target === target && selectsOutside(layer),
        );

    /**
     * How an element outside the window draws, read from the layers selecting that state.
     * @returns `"ghost"` when nodes and edges alike are drawn.
     */
    const outsideNow = (): "hide" | "ghost" => (drawsOutsideWindow(dispatcher.state.styles) ? "ghost" : "hide");

    /**
     * The style writes that make what lies outside the window draw one way: for nodes and for
     * edges, `visible` on every painting layer a reader or a template put in the stack selecting
     * that state, or a new layer when none does and it is to draw.
     * @param outside - How it draws.
     * @returns The commands.
     */
    const outsideWrites = (outside: "hide" | "ghost"): StylePatchCommand[] => {
        const drawn = outside === "ghost";
        const painted = paintedStack(dispatcher.state.styles);
        return (["node", "edge"] as const).flatMap((target): StylePatchCommand[] => {
            const own = outsideLayers(target).filter(({ layer }) => layer.source.by !== "element");
            if (own.length === 0) {
                // A kind already drawn the way asked needs no layer of its own.
                return drawn && !drawsOutsideWindowOf(painted, target)
                    ? [
                          {
                              op: "style.patch",
                              action: "add",
                              spec: {
                                  name: "Outside the time window",
                                  target,
                                  selector: { match: "state", state: "outsideWindow" },
                                  set: { [`${target}.visible`]: true },
                              },
                          },
                      ]
                    : [];
            }

            // A layer already set the way asked is left alone, so asking again writes nothing.
            return own
                .filter(({ layer }) => layer.set?.[`${target}.visible`] !== drawn)
                .map(({ layer }) => ({
                    op: "style.patch",
                    action: "update",
                    id: layer.id,
                    patch: { set: { ...layer.set, [`${target}.visible`]: drawn } },
                }));
        });
    };

    /**
     * The zone calendar steps read in: the call's, then the window's, then the setting's.
     * @param given - A zone a call passed.
     * @param window - The window the call is about.
     * @returns The zone.
     */
    const zoneOf = (given?: string, window?: TimeWindow | null): string => {
        const zone = given ?? window?.timeZone ?? settingsNow().timeZone;
        if (!isTimeZone(zone)) {
            throw badZone("timeZone", zone);
        }

        return indexNow()?.unit === "year" ? UTC_ZONE : zone;
    };

    /**
     * The zone the designated field reads text in.
     * @returns The zone.
     */
    const parseZoneNow = (): string => {
        const field = fieldNow();

        return unitNow() === "year" ? UTC_ZONE : ((field?.edges ?? field?.nodes)?.parseZone ?? UTC_ZONE);
    };

    /**
     * The zone a window's text bounds read in: the field's, over the designated column.
     * @param attribute - The window's attribute.
     * @returns The zone, or undefined for any other column.
     */
    const boundZone = (attribute: Path): string | undefined =>
        indexNow()?.path === columnOf(attribute) ? parseZoneNow() : undefined;

    /**
     * One bound of a window as a number.
     * @param window - The window.
     * @param side - Which bound.
     * @returns The number.
     */
    const boundOf = (window: TimeWindow, side: "from" | "to"): number =>
        numericBound(window[side], boundZone(window.attribute));

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
     * @param zone - The zone calendar steps read in.
     * @returns The aligned instant.
     */
    const alignAt = (at: number, step: TimeStep, zone: string): number => {
        if (isCalendarStep(step)) {
            return alignTo(at, step, zone);
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
        const own = fieldBoundsOf(field, attribute);
        const end = input.end ?? own.end;
        const spells = input.spells ?? own.spells;
        const missing = input.missing ?? (settings.missing === "inside" ? undefined : settings.missing);
        const mode = input.mode ?? (settings.mode === "sliding" ? undefined : settings.mode);
        const timeZone = zoneOf(input.timeZone);
        const parseZone = boundZone(attribute);

        return Object.freeze({
            ...input,
            attribute,
            from: numericBound(input.from, parseZone),
            to: numericBound(input.to, parseZone),
            step: input.step ?? stepFor(),
            ...(end === undefined ? {} : { end: `${ATTRIBUTE_PREFIX}${columnOf(end)}` }),
            ...(spells === undefined ? {} : { spells: `${ATTRIBUTE_PREFIX}${columnOf(spells)}` }),
            ...(nodes === undefined ? {} : { nodes }),
            ...(missing === undefined ? {} : { missing }),
            ...(mode === undefined ? {} : { mode }),
            ...zoned(timeZone === UTC_ZONE ? input.timeZone : timeZone),
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
        const zone = zoneOf(options.timeZone);
        const start = alignAt(first, step, zone);
        const mode = options.mode ?? settingsNow().mode;

        return complete({
            from: mode === "cumulative" ? first : start,
            to: addSteps(start, step, 1, zone),
            step,
            ...(mode === settingsNow().mode ? {} : { mode }),
            ...zoned(options.timeZone),
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
        const zone = zoneOf(options.timeZone);
        const start = alignAt((extent?.to ?? 1) - 1, step, zone);
        const mode = options.mode ?? settingsNow().mode;

        return complete({
            from: mode === "cumulative" ? (extent?.from ?? start) : start,
            to: addSteps(start, step, 1, zone),
            step,
            ...(mode === settingsNow().mode ? {} : { mode }),
            ...zoned(options.timeZone),
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
            ? addSteps(boundOf(window, "to"), stepOf(window), -1, zoneOf(undefined, window)) <= extent.from
            : boundOf(window, "from") <= extent.from;
    };

    /**
     * Whether a window reaches the end of the data.
     * @param window - The window.
     * @returns True at the end.
     */
    const isLast = (window: TimeWindow): boolean => {
        const extent = extentNow();

        return extent === null || boundOf(window, "to") >= extent.to;
    };

    /**
     * A window moved by one step, forward or back. A cumulative window keeps the data's start.
     * @param window - The window.
     * @param direction - 1 or -1.
     * @returns The moved window.
     */
    const advanced = (window: TimeWindow, direction: 1 | -1): TimeWindow => {
        const step = stepOf(window);
        const zone = zoneOf(undefined, window);
        const from = boundOf(window, "from");
        const to = boundOf(window, "to");
        if (window.mode === "cumulative") {
            const start = extentNow()?.from ?? from;
            const end = addSteps(to, step, direction, zone);
            return Object.freeze({ ...window, from: start, to: end > start ? end : to });
        }

        return Object.freeze({
            ...window,
            from: addSteps(from, step, direction, zone),
            to: addSteps(to, step, direction, zone),
        });
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
        const zone = zoneOf(undefined, window);
        const anchor =
            window.mode === "cumulative" ? addSteps(boundOf(window, "to"), step, -1, zone) : boundOf(window, "from");
        const first = alignAt(extent.from, step, zone);
        if (!isCalendarStep(step)) {
            return Math.round((anchor - first) / step);
        }

        // Counted on the wall clock, where a step is plain arithmetic; an hour is absolute.
        const wall = step === "hour" ? UTC_ZONE : zone;
        const start = alignTo(wallClock(first, wall), step);
        const end = wallClock(anchor, wall);
        let count = 0;
        // ponytail: walks calendar steps one at a time; fine to tens of thousands of steps.
        while (count < 1_000_000 && addSteps(start, step, count + 1) <= end) {
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
                ...zoned(input.timeZone),
            });

        return { ...base, ...defined };
    };

    /**
     * Keep what a move changed for `time.changes()`, and publish `time:step`.
     * @param counts - What the move changed, null when it wrote nothing.
     * @param window - The window now.
     * @param cause - What moved it.
     * @returns The event.
     */
    const published = (
        counts: SlideCounts | null,
        window: TimeWindow | null,
        cause: TimeStepEvent["cause"],
    ): TimeStepEvent => {
        // The rows belong to the snapshot the slide wrote them on, which a removal may have replaced.
        const graph = counts?.graph ?? sources.snapshot();
        const rows = counts?.rows;
        let cached: TimeChanges | null = null;
        lastChanges = () => {
            if (cached !== null || rows === undefined) {
                return cached ?? NO_CHANGES;
            }

            const space = edgeSpaceOf(graph);
            const idsOf = (nodeRows: ArrayLike<number>, edgeRows: ArrayLike<number>): TimeIds =>
                Object.freeze({
                    nodes: Object.freeze(Array.from(nodeRows, (row) => graph.ids.idOf(row))),
                    edges: Object.freeze(Array.from(edgeRows, (row) => space.idOf(row))),
                });
            cached = Object.freeze({
                entered: idsOf(rows.enteredNodes, rows.enteredEdges),
                left: idsOf(rows.leftNodes, rows.leftEdges),
            });

            return cached;
        };
        const extent = extentNow();
        const untimedOf = (kind: TimeCounts | undefined): number =>
            kind === undefined ? 0 : kind.untimed + kind.unparsed;
        const { summary } = visibility;
        const event: TimeStepEvent = Object.freeze({
            index: window === null ? 0 : stepIndexOf(window),
            from: window === null ? Number.NEGATIVE_INFINITY : boundOf(window, "from"),
            to: window === null ? Number.POSITIVE_INFINITY : boundOf(window, "to"),
            visible: Object.freeze({ nodes: summary.visibleNodes, edges: summary.visibleEdges }),
            entered: Object.freeze({ nodes: counts?.entered.nodes ?? 0, edges: counts?.entered.edges ?? 0 }),
            left: Object.freeze({ nodes: counts?.left.nodes ?? 0, edges: counts?.left.edges ?? 0 }),
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
     * The masks as they stand, for a move that does not go through a slide.
     * @returns Both masks.
     */
    const masksNow = (): { readonly nodes: Uint8Array; readonly edges: Uint8Array } => ({
        nodes: visibility.nodeMask(),
        edges: visibility.edgeMask(),
    });

    /**
     * Publish a move that did not go through a slide, from the masks before it.
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
        const now = masksNow();
        return published(diffCounts(before.nodes, now.nodes, before.edges, now.edges), window, cause);
    };

    /**
     * Record a window: as its own step, or merged into this play's step.
     * @param next - The window.
     * @param cause - What moved it.
     * @param ownStep - Record it as its own step, never merged into the window step before it.
     */
    const record = async (next: TimeWindow, cause: TimeStepEvent["cause"], ownStep: boolean): Promise<void> => {
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
    };

    /**
     * Move the window: as its own step, or merged into this play's step.
     * @param next - The window.
     * @param cause - What moved it.
     * @param ownStep - Record it as its own step, never merged into the window step before it.
     * @returns The event, once the masks and any re-runs the results setting started have settled.
     */
    const move = async (next: TimeWindow, cause: TimeStepEvent["cause"], ownStep = false): Promise<TimeStepEvent> => {
        const slide = slides;
        // The masks move first, by the rows that change; recording the window adopts them.
        const counts = visibility.slideWindow(next);
        try {
            await record(next, cause, ownStep);
        } catch (error) {
            visibility.slideWindow(null);
            throw error;
        }

        // A play that began while this was recording owns the cursor now.
        if (slide === slides) {
            cursor = null;
        }

        const event = published(counts, next, cause);
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
        slides++;

        return published(counts, next, cause);
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
        const head = boundOf(at, "to");
        const by = ((addSteps(head, step, 1, zoneOf(undefined, at)) - head) * elapsed) / interval;
        const bounds = { step, mode, ...zoned(at.timeZone) };
        const end = numericBound(lastWindow(bounds).to);
        let next: TimeWindow =
            mode === "cumulative"
                ? Object.freeze({ ...at, to: head + by })
                : Object.freeze({ ...at, from: boundOf(at, "from") + by, to: head + by });
        if (boundOf(next, "to") >= end) {
            if (!loop) {
                const last = lastWindow(bounds);
                slideTo(last, "play");
                sources.emit("time:end", { window: last });
                api.pause();
                return;
            }

            next = firstWindow(bounds);
        }

        slideTo(next, "play");
        frame = requestAnimationFrame(glide);
    };

    /** Time the next playback step, past a drawn frame when the play waits for one. */
    const nextStep = (): void => {
        if (!waitForRender || sources.renderedFrame === undefined) {
            timer = setTimeout(() => void tick(), interval);
            return;
        }

        const play = plays;
        void sources.renderedFrame().then(() => {
            if (play === plays && playing && !disposed) {
                timer = setTimeout(() => void tick(), interval);
            }
        });
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

            next = firstWindow({
                step: stepOf(current),
                mode: current.mode ?? "sliding",
                ...zoned(current.timeZone),
            });
        } else {
            next = advanced(current, 1);
        }

        // A pause and a new play while the move runs make this tick stale: only the play it
        // belongs to may go on, or pause.
        const play = plays;
        try {
            await move(next, "play");
        } catch {
            if (play === plays) {
                api.pause();
            }
            return;
        }

        if (play === plays && playing && !disposed) {
            nextStep();
        }
    };

    /**
     * The rows of the elements a question names.
     * @param kind - Nodes or edges.
     * @param of - The elements.
     * @returns The rows; an id the graph does not hold is left out.
     */
    const rowsOf = (kind: "node" | "edge", of: TimeElements): Set<number> => {
        const graph = sources.snapshot();
        const space = edgeSpaceOf(graph);
        const ids: readonly (NodeId | EdgeId)[] = (kind === "node" ? of.nodes : of.edges) ?? [];
        const rows = new Set<number>();
        for (const id of ids) {
            const row = kind === "node" ? graph.ids.indexOf(id) : space.indexOf(String(id));
            if (row !== INVALID_INDEX) {
                rows.add(row);
            }
        }

        if (kind === "edge" && of.incident === true) {
            const ends = new Set<number>();
            for (const id of of.nodes ?? []) {
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

        return rows;
    };

    /**
     * Which rows a histogram counts: the given elements, the ones passing the filter, or all.
     * @param kind - Nodes or edges.
     * @param options - The histogram's options.
     * @returns One byte per row, or null to count every row.
     */
    const rowBytes = (kind: "node" | "edge", options: TimeBinsOptions): Uint8Array | null => {
        const key = kind === "node" ? "nodes" : "edges";
        const passing = options.scope === "visible" ? visibility.passingBytes()[key] : null;
        if (options.of === undefined) {
            return passing;
        }

        const graph = sources.snapshot();
        const out = new Uint8Array(kind === "node" ? graph.nodeCount : graph.edgeCount);
        for (const row of rowsOf(kind, options.of)) {
            out[row] = passing === null ? 1 : passing[row];
        }

        return out;
    };

    /**
     * The step a most-bins budget asks for: the shortest calendar step (or 1-2-5 number) that
     * covers a range in no more bins.
     * @param from - The range's start.
     * @param to - Its end.
     * @param maxCount - The budget.
     * @param zone - The zone calendar steps read in.
     * @returns The step.
     */
    const budgetStep = (from: number, to: number, maxCount: number, zone: string): TimeStep => {
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
            for (let at = alignTo(from, step, zone); at < to && count <= maxCount; at = addSteps(at, step, 1, zone)) {
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

    /**
     * The window as new settings leave it: its step, mode, missing rule and zone.
     * @param current - The window now.
     * @param next - The settings.
     * @param newZone - The zone the call set, which replaces the window's own.
     * @returns The window.
     */
    const windowUnder = (current: TimeWindow, next: TimeSettings, newZone: string | undefined): TimeWindow => {
        const step = next.step === "auto" || (isCalendarStep(next.step) && ordinal()) ? autoStep() : next.step;
        const extent = extentNow() as TimeExtent;
        const from = boundOf(current, "from");
        const to = boundOf(current, "to");
        const was = zoneOf(undefined, current);
        const zone = zoneOf(newZone, current);
        const resized = step !== current.step || (zone !== was && isCalendarStep(step));
        const { timeZone: _timeZone, ...unzoned } = current;
        let window: TimeWindow = Object.freeze({
            ...(newZone === undefined ? current : unzoned),
            step,
            ...zoned(newZone === UTC_ZONE ? undefined : newZone),
        });
        if (next.mode !== (current.mode ?? "sliding") && next.mode === "cumulative") {
            // Cumulative grows from the start of the data to where the window ends.
            window = Object.freeze({ ...window, mode: "cumulative", from: extent.from });
        } else if (next.mode !== (current.mode ?? "sliding")) {
            // Back to sliding: one step ending where the cumulative window ended.
            const { mode: _mode, ...rest } = window;
            window = Object.freeze({ ...rest, from: Math.max(extent.from, addSteps(to, step, -1, zone)) });
        } else if (resized && next.mode === "sliding") {
            // A new step or zone snaps a sliding window to one step on its boundary.
            const start = alignAt(from, step, zone);
            window = Object.freeze({ ...window, from: start, to: addSteps(start, step, 1, zone) });
        } else if (resized) {
            window = Object.freeze({ ...window, to: addSteps(alignAt(to - 1, step, zone), step, 1, zone) });
        }

        if (next.missing !== (current.missing ?? "inside")) {
            const { missing: _missing, ...rest } = window;
            window = Object.freeze(next.missing === "outside" ? { ...rest, missing: "outside" } : rest);
        }

        return window;
    };

    /**
     * The window a play starts from.
     * @param current - The window now, or null.
     * @param options - What the play asked for.
     * @returns The window.
     */
    const playStart = (current: TimeWindow | null, options: TimePlayOptions): TimeWindow => {
        if (current === null) {
            return firstWindow(options);
        }

        if (isLast(current)) {
            // Pressing play at the end starts again from the first window.
            return firstWindow({
                step: options.step ?? stepOf(current),
                mode: options.mode ?? current.mode ?? "sliding",
                ...zoned(options.timeZone ?? current.timeZone),
            });
        }

        if (options.step === undefined && options.mode === undefined && options.timeZone === undefined) {
            return current;
        }

        return Object.freeze({
            ...current,
            ...(options.step === undefined ? {} : { step: options.step }),
            ...(options.mode === undefined ? {} : { mode: options.mode }),
            ...zoned(options.timeZone),
        });
    };

    /**
     * The windows of a series: each one step wide (cumulative: growing a step at a time), as a play
     * from the first window of that step shows them, up to the series' end.
     * @param options - What the series asked for.
     * @returns The windows; none when nothing has a time.
     */
    const seriesWindows = (options: TimeSeriesOptions): readonly TimeWindow[] => {
        assertSeriesBounds(options);
        const current = visibility.window;
        const step = stepFor(options.step ?? current?.step);
        const mode = options.mode ?? current?.mode ?? settingsNow().mode;
        const timeZone = options.timeZone ?? current?.timeZone;
        const opening = firstWindow({ step, mode, ...zoned(timeZone) });
        const extent = extentNow();
        if (extent === null) {
            return [];
        }

        const zone = zoneOf(timeZone);
        const begin = options.from ?? extent.from;
        const start = alignAt(begin, step, zone);
        const cumulative = mode === "cumulative";
        const first: TimeWindow = Object.freeze({
            ...opening,
            from: cumulative ? begin : start,
            to: addSteps(start, step, 1, zone),
            ...(current?.nodes === undefined ? {} : { nodes: current.nodes }),
            ...(current?.missing === undefined ? {} : { missing: current.missing }),
        });
        // A cumulative window grows from where it was told, which can lie before the data.
        const next = (window: TimeWindow): TimeWindow =>
            cumulative
                ? Object.freeze({ ...window, to: addSteps(boundOf(window, "to"), step, 1, zone) })
                : advanced(window, 1);

        return windowsUntil(first, options.to ?? extent.to, next, (window) => boundOf(window, "to"));
    };

    /**
     * Designate a field, or clear it: the work of one `setField` call.
     * @param field - The field, or null.
     * @param options - As `setField` takes them.
     * @returns What it found.
     */
    const designate = async (field: TimeField | null, options: TimeFieldOptions): Promise<TimeFieldResult> => {
        for (const source of field === null ? [] : [field.nodes, field.edges]) {
            if (source !== undefined) {
                assertTimeSource(source);
            }
        }

        // A column designated again without a unit takes the one the reader gave it before.
        const remembered = (source: TimeSource | undefined): TimeSource | undefined => {
            const unit = source === undefined ? undefined : (source.unit ?? units.get(columnOf(source.start)));
            return source === undefined || unit === undefined ? source : { ...source, unit };
        };
        const asked = { nodes: remembered(field?.nodes), edges: remembered(field?.edges) };
        assertOneColumn(asked);
        assertDeclaredTime(asked, sources.declarations());

        // Read once: the unit its values call for, the refusal below, and the index itself.
        const proposed = asked.nodes === undefined && asked.edges === undefined ? null : await indexFor(present(asked));
        const nodes = withUnit(asked.nodes, proposed?.inferred.node);
        const edges = withUnit(asked.edges, proposed?.inferred.edge);
        assertHoldsTimes(proposed, { nodes, edges });
        for (const source of [nodes, edges]) {
            if (source?.unit !== undefined) {
                units.set(columnOf(source.start), source.unit);
            }
        }

        const before = fieldNow();
        const column = (edges ?? nodes)?.start;
        const changed = !sameReading(before?.nodes, nodes) || !sameReading(before?.edges, edges);
        api.pause();
        await dispatcher.transaction(
            "time.field",
            async (tx) => {
                // A text column of dates becomes a date column in this same step.
                const sides =
                    options.asDates === true
                        ? ([
                              ["node", nodes],
                              ["edge", edges],
                          ] as const)
                        : [];
                for (const [kind, source] of sides) {
                    if (source !== undefined && source.unit === undefined) {
                        await dispatcher.routed(
                            (command, dispatched) => tx.dispatch(command, dispatched),
                            () => sources.asDates?.(kind, columnOf(source.start)),
                        );
                    }
                }

                await tx.dispatch({
                    op: "config.set",
                    values: {
                        data: {
                            knownFields: {
                                nodeTimePath: nodes === undefined ? null : columnOf(nodes.start),
                                nodeTimeUnit: nodes?.unit ?? null,
                                nodeTimeParseZone: nodes?.parseZone ?? null,
                                nodeTimeEndPath: optionalColumn(nodes?.end) ?? null,
                                nodeTimeSpellsPath: optionalColumn(nodes?.spells) ?? null,
                                edgeTimePath: edges === undefined ? null : columnOf(edges.start),
                                edgeTimeUnit: edges?.unit ?? null,
                                edgeTimeParseZone: edges?.parseZone ?? null,
                                edgeTimeEndPath: optionalColumn(edges?.end) ?? null,
                                edgeTimeSpellsPath: optionalColumn(edges?.spells) ?? null,
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
        const built = adopted(designated, proposed);

        return Object.freeze({
            field: designated,
            ...(built?.node ? { nodes: built.node.counts } : {}),
            ...(built?.edge ? { edges: built.edge.counts } : {}),
            notices: noticesOf(built),
        });
    };

    const api: TimeApi = {
        get field() {
            const field = fieldNow();
            const inferred = field === null ? undefined : indexIfReady()?.inferred;
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

        async setField(field: TimeField | null, options: TimeFieldOptions = {}): Promise<TimeFieldResult> {
            const run = (): Promise<TimeFieldResult> => designate(field, options);
            const call = fieldCalls === null ? run() : fieldCalls.then(run);
            const settled = call.then(
                () => undefined,
                () => undefined,
            );
            fieldCalls = settled;
            void settled.then(() => {
                if (fieldCalls === settled) {
                    fieldCalls = null;
                }
            });

            return call;
        },

        candidates(): readonly TimeCandidate[] {
            const columns = sources.columns();
            if (sources.dataRevision === undefined) {
                return timeCandidates(sources, columns);
            }

            return candidateCache.get(JSON.stringify(columns), () => timeCandidates(sources, columns));
        },

        notices(): readonly CodedFact<TimeNoticeCode>[] {
            const notices = noticesOf(indexIfReady());
            const reason = ageFadeReason();

            return reason === null ? notices : [...notices, { code: "time.age-fade-inactive", params: { reason } }];
        },

        parse(text: string, options: { readonly timeZone?: string } = {}): number | null {
            // With the timeline off parse stays open, and reads as it did before zones.
            const zone = sources.timeline?.() === false ? undefined : (options.timeZone ?? parseZoneNow());
            if (zone !== undefined && !isTimeZone(zone)) {
                throw badZone("timeZone", zone);
            }

            const trimmed = text.trim();
            if (trimmed === "") {
                return null;
            }

            return readTimeValue(trimmed, unitNow() ?? "ms", zone);
        },

        get ready() {
            return follow();
        },

        extent(): TimeExtent | null {
            return extentOf(indexIfReady());
        },

        bins(options: TimeBinsOptions = {}): readonly TimeBin[] | null {
            const built = indexIfReady();
            const extent = extentOf(built);
            if (extent === null || built === null) {
                return null;
            }

            if (options.step !== undefined) {
                checkStep(options.step);
            }

            const zone = zoneOf(options.timeZone, cursor ?? visibility.window);
            const from = options.from ?? extent.from;
            const to = options.to ?? extent.to;
            const step =
                options.step ??
                (options.maxCount === undefined ? undefined : budgetStep(from, to, options.maxCount, zone));
            const asked = step === undefined ? options : { ...options, step };
            const bounds = binBounds(from, to, asked, built.unit === "ordinal", zone);
            const countOf = (kind: "node" | "edge"): number[] => {
                const parsed = built[kind];
                return parsed === null
                    ? new Array<number>(bounds.length - 1).fill(0)
                    : countBins(parsed, bounds, rowBytes(kind, options));
            };
            // What passes the filter moves with the filter and the data, never with the window.
            const filter = options.scope === "visible" && options.of === undefined ? visibility.filterBytes() : null;
            const edgesOfBins = bounds.join();
            const held =
                filter !== null &&
                filteredBins?.filter === filter &&
                filteredBins.built === built &&
                filteredBins.bounds === edgesOfBins
                    ? filteredBins
                    : null;
            const nodes = held?.nodes ?? countOf("node");
            const edges = held?.edges ?? countOf("edge");
            if (filter !== null && held === null) {
                filteredBins = { filter, built, bounds: edgesOfBins, nodes, edges };
            }

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

        spanOf(of: TimeElements): { readonly from: number; readonly to: number } | null {
            const built = loadHoldsBuilds() ? indexIfReady() : indexNow();
            let from = Number.POSITIVE_INFINITY;
            let last = Number.NEGATIVE_INFINITY;
            for (const kind of ["node", "edge"] as const) {
                const parsed = built?.[kind];
                if (parsed !== null && parsed !== undefined) {
                    for (const row of rowsOf(kind, of)) {
                        const bounds = rowBounds(parsed, row);
                        if (bounds !== null) {
                            from = Math.min(from, bounds[0]);
                            last = Math.max(last, bounds[1]);
                        }
                    }
                }
            }

            if (from > last) {
                return null;
            }

            // An open bound is infinite: hold it to the data, so the span is a window.
            const extent = extentOf(built);

            return Object.freeze({
                from: Math.max(from, extent?.from ?? from),
                to: Math.min(last + 1, extent?.to ?? last + 1),
            });
        },

        changes(): TimeChanges {
            return lastChanges?.() ?? NO_CHANGES;
        },

        get current() {
            return cursor ?? visibility.window;
        },

        get committed() {
            return visibility.window;
        },

        get atStart() {
            const current = cursor ?? visibility.window;
            return current !== null && isFirst(current);
        },

        get atEnd() {
            const current = cursor ?? visibility.window;
            return current !== null && isLast(current);
        },

        get timeZone() {
            const window = cursor ?? visibility.window;

            return unitKnown() === "year" ? UTC_ZONE : (window?.timeZone ?? settingsNow().timeZone);
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

            if (patch.timeZone !== undefined) {
                zoneOf(patch.timeZone);
            }

            if (patch.outside !== undefined && patch.outside !== "hide" && patch.outside !== "ghost") {
                throw badCommand('outside is "hide" or "ghost".', { field: "outside", value: patch.outside });
            }

            const current = visibility.window;
            // Fading by age and how what lies outside draws change only the drawing, so they leave the window where it is.
            const drawingOnly = Object.keys(patch).every((key) => key === "ageFade" || key === "outside");
            const moved =
                current !== null && extentNow() !== null && !drawingOnly
                    ? windowUnder(current, next, patch.timeZone)
                    : null;
            const before = masksNow();
            // How what lies outside draws lives in the style layers, never in the playback.
            const playback: TimePlayback = Object.freeze(
                Object.fromEntries(
                    Object.entries(next).filter(
                        ([key, value]) =>
                            key !== "outside" && DEFAULT_TIME_SETTINGS[key as keyof TimeSettings] !== value,
                    ),
                ),
            );
            // Written whatever `outside` reads now: it reads "ghost" only while both kinds are drawn,
            // so a layer drawing one kind alone still reads "hide" and is set back by asking for it.
            const styleWrites = patch.outside === undefined ? [] : outsideWrites(patch.outside);
            await dispatcher.transaction(
                "time.settings",
                async (tx) => {
                    await tx.dispatch({
                        op: "visibility.playback",
                        playback: Object.keys(playback).length === 0 ? null : playback,
                    });
                    for (const write of styleWrites) {
                        await tx.dispatch(write);
                    }

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
            if (next !== null && internals.instants(next.attribute) !== null) {
                const counts = visibility.slideWindow(next);
                const run = visibility.setWindow(next);
                run.then(
                    () => published(counts, next, "window"),
                    () => visibility.slideWindow(null),
                );

                return run;
            }

            const before = masksNow();
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

            zoneOf(options.timeZone);
            interval = options.interval ?? interval;
            loop = options.loop ?? loop;
            waitForRender = options.waitForRender ?? false;
            plays++;
            smooth = (options.motion ?? (smooth ? "smooth" : "steps")) === "smooth";
            const current = cursor ?? visibility.window;
            playing = true;
            playStep = null;
            sources.emit("time:play", { window: current });
            const start = playStart(current, options);

            if (canSlide()) {
                slideTo(start, "play");
                lastFrameAt = performance.now();
                frame = requestAnimationFrame(glide);
                return;
            }

            if (start !== current) {
                const play = plays;
                void move(start, "play")
                    .then(() => {
                        if (play === plays && playing && !disposed) {
                            nextStep();
                        }
                    })
                    .catch(() => {
                        if (play === plays) {
                            api.pause();
                        }
                    });
                return;
            }

            timer = setTimeout(() => void tick(), interval);
        },

        series(options: TimeSeriesOptions = {}): Run<TimeSeries> {
            const { signal, onProgress, ...asked } = options;
            const measures = asked.measures ?? [];

            return visibility.windowRun(
                "time.series",
                asked,
                { ...(signal === undefined ? {} : { signal }), ...(onProgress === undefined ? {} : { onProgress }) },
                async (open, context) => {
                    assertMeasures(measures);
                    await follow();
                    const windows = seriesWindows(asked);
                    const bounds = (window: TimeWindow): readonly [number, number] => [
                        boundOf(window, "from"),
                        boundOf(window, "to"),
                    ];

                    return walkSeries(windows, open(), measures, bounds, context);
                },
            );
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
                        ...zoned(visibility.window?.timeZone),
                    }),
                    "seek",
                );
            }

            if (instant === "end") {
                return move(
                    lastWindow({
                        mode: settingsNow().mode,
                        ...(visibility.window?.step === undefined ? {} : { step: visibility.window.step }),
                        ...zoned(visibility.window?.timeZone),
                    }),
                    "seek",
                );
            }

            const current = cursor ?? visibility.window ?? firstWindow();
            const from = boundOf(current, "from");
            const to = boundOf(current, "to");
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
        boundZone,

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

            return indexIfReady()?.[kind]?.counts.timed;
        },

        get playing() {
            return playing;
        },

        edgeAges(): EdgeAgeFade | null {
            const { ageFade, outside } = settingsNow();
            if (ageFade >= 1 || sources.timeline?.() === false) {
                return null;
            }

            if (ageFadeInactive(fieldNow()?.edges, outside) !== null) {
                return null;
            }

            // While a load or a merge rebuilds the index, the last ages stand: the fade stays on,
            // and an edge added since reads past their end as untimed until the index lands.
            const built = indexIfReady();
            if (built !== null) {
                const extent = extentOf(built);
                const kind = built.edge ?? null;
                if (kind === null || extent === null) {
                    return null;
                }

                if (ageCache?.kind !== kind || ageCache.from !== extent.from || ageCache.to !== extent.to) {
                    ageCache = {
                        kind,
                        from: extent.from,
                        to: extent.to,
                        ages: normalizedStarts(kind, extent.from, extent.to),
                    };
                }
            }

            if (ageCache === null) {
                return null;
            }

            const window = cursor ?? visibility.window;
            if (window === null) {
                return { ages: ageCache.ages, from: 0, to: 1, fade: 1 };
            }

            const span = ageCache.to > ageCache.from ? ageCache.to - ageCache.from : 1;
            return {
                ages: ageCache.ages,
                from: (boundOf(window, "from") - ageCache.from) / span,
                to: (boundOf(window, "to") - ageCache.from) / span,
                fade: ageFade,
            };
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
                                  from: boundOf(window, "from"),
                                  to: boundOf(window, "to"),
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
            job = null;
            stopTimer();
            playing = false;
        },
    };

    return { api, internals };
}
