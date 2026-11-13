/**
 * @file Turning a filter and a time window into the masks that say what is visible.
 *
 * THIS IS THE DATA SCOPE, NOT THE RENDER SET. What this file computes is which nodes and edges
 * the session considers part of the graph a reader is looking at. It is not the set the renderer
 * drew: above its ceiling the renderer draws FEWER elements than this, and it is allowed to. An
 * algorithm asked to run "on the visible graph" means the masks computed here, never whatever
 * happened to reach the screen.
 *
 * A FILTER IS TWO PREDICATES, one over nodes and one over edges, and they compose
 * independently. Every filter kind speaks about one of the two and stays SILENT about the other,
 * and a silent half is not "true" or "false" -- it is absent, so a group with nothing to say
 * about edges leaves the edge predicate alone instead of collapsing it. That is what lets
 * `{ any: [{ degree: ... }, { edges: ... }] }` mean the obvious thing: keep the nodes with that
 * degree, keep the edges matching that query.
 *
 * AN EDGE'S VISIBILITY FOLLOWS ITS ENDPOINTS. An edge whose source or target is hidden is
 * hidden, whatever any edge predicate says, because an edge to nowhere is not an edge a reader
 * or an algorithm can follow. The edge predicate can only narrow the set further, never widen
 * it. This is the same rule the scope resolver states for a scope's edges, and there is one of
 * it rather than two.
 *
 * A FILTER IS EVALUATED OVER THE WHOLE GRAPH, never over what is visible now. Evaluating it
 * against the current masks would make visibility a ratchet -- every filter could only ever
 * remove, and widening one would be impossible without a reload -- so `degree`, `component` and
 * `neighborhood` all read the whole graph's topology and a filter that matches more than the
 * last one shows more.
 *
 * ABSENCE MEANS TWO DIFFERENT THINGS, and the difference is deliberate:
 *
 * - A filter is a PREDICATE ON AN ATTRIBUTE. A node with no value for `data.type` is not a
 *   "host", so `{ kind: "categories", attribute: "data.type", values: ["host"] }` hides it.
 * - A time window is an INTERVAL ON A TIMELINE. An element with no value for the window's
 *   attribute has no place on that timeline, so the window says nothing about it and leaves it
 *   alone. Without that rule, opening a window on a graph whose edges carry timestamps and whose
 *   nodes do not would blank the whole graph.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import { type GraphSnapshot, INVALID_INDEX, maskTest, type U32 } from "@graphty/graph-format";

import { runIdOfRef } from "../../catalog/sets/canonical";
import { assertRuleTree, parseScope } from "../../catalog/sets/parse";
import type {
    AttributeLeafNodes,
    EdgeId,
    ElementState,
    NodeId,
    Path,
    Query,
    ResultItem,
    RuleSide,
    RuleTree,
    RunId,
    Scope,
    SelectionDirection,
    SourceKey,
    StepReference,
    UnionLeaf,
} from "../../catalog/types";
import { rowOfEitherSpelling } from "../../data/nodeIdSpelling";
import { GraphtyError } from "../../errors";
import { quoteEach } from "../../utils/quote-each";
import { rankEntries, topOfRanking } from "../results/statistics";
import { type ComponentLabels, edgeSpaceOf, type ElementMask } from "../scope/index";
import {
    type ChainStep,
    type DependencySources,
    followedGroup,
    followsGroup,
    visibilityCycle,
} from "../sets/dependencies";
import { normalizeText, textMatcher } from "../text";
import { numericBound, readTimeValue, spanEnd, spellPairs } from "../time/parse";
import { isTimeZone } from "../time/zone";
import { isSourceScoped, type SourceScopedRule } from "./conditions";
import { slideCounters } from "./slide";
import {
    type Bytes,
    bytesOf,
    countOf,
    hopsFrom,
    readUnion,
    type StepFrame,
    touchingTest,
    type UnionEnv,
    type UnionRead,
} from "./union";

// ---------------------------------------------------------------------------------------------
// What a consumer asks for
// ---------------------------------------------------------------------------------------------

// The rule tree and its direction live with the other definition types; this module compiles them.
export type { RuleTree } from "../../catalog/types";

/** How wide a step a time window advances by, when something advances it. */
export type TimeStep = number | "hour" | "day" | "week" | "month" | "quarter" | "year";

/**
 * A stretch of a timeline, as the second producer of the visibility masks.
 *
 * HALF-OPEN: an element is inside when its instant is at or after `from` and strictly before
 * `to`. A range filter is inclusive at both ends because a slider's maximum is a value a person
 * can pick; a window is half-open because consecutive windows have to tile a timeline without
 * counting an event in two of them, and a temporal series built on overlapping windows reports
 * changes that never happened.
 */
export interface TimeWindow {
    /** The attribute carrying the instant, such as `data.timestamp`. */
    readonly attribute: Path;
    /**
     * The attribute carrying where each element ends, such as `data.left`: an element is inside
     * when it starts before `to` and ends after `from`. A missing end is open; a missing start is
     * open when an end is present. Left out, `attribute` holds instants. `session.time` fills it in
     * from the designated field.
     * @experimental timeline
     * @beta
     */
    readonly end?: Path;
    /**
     * The attribute carrying a list of `{ start, end }`, `[start, end]` or bare instants, such as
     * `data.spells`: an element holding one is inside when any of them is, whatever `attribute` and
     * `end` hold. `session.time` fills it in from the designated field.
     * @experimental timeline
     * @beta
     */
    readonly spells?: Path;
    /** The first instant inside the window: a number, or a string `Date.parse` understands. */
    readonly from: number | string;
    /** The first instant past the window, in the same form as `from`. */
    readonly to: number | string;
    /** How far a caller advancing the window moves it: what `session.time` steps and plays by. */
    readonly step?: TimeStep;
    /**
     * Which nodes the window keeps when its attribute lives on edges. `"all"` (the default): the
     * window says nothing about nodes. `"ends"`: a node is kept only when an edge inside the
     * window, and passing the filter, ends at it, so nodes follow their edges.
     * @experimental timeline
     * @beta
     */
    readonly nodes?: "all" | "ends";
    /**
     * Whether an element of a kind that carries the attribute, but has no usable value for it, is
     * kept: `"inside"` (the default) or `"outside"`.
     * @experimental timeline
     * @beta
     */
    readonly missing?: "inside" | "outside";
    /**
     * How `session.time` plays the window: moving both ends (`"sliding"`, the default) or only the end.
     * @experimental timeline
     * @beta
     */
    readonly mode?: "sliding" | "cumulative";
    /**
     * The IANA zone `session.time`'s calendar steps and bins read in, such as `America/New_York`;
     * left out, {@link TimePlayback.timeZone}. Hours are absolute; a day and longer follow the
     * zone's clock, so a day across a clock change is 23 or 25 hours.
     * @experimental timeline
     * @beta
     */
    readonly timeZone?: string;
}

/**
 * What a window move does to finished runs over the visible graph: `"stale"` (the default) marks
 * them out of date, `"keep"` keeps them current as they are, and `"rerun"` runs them again over the
 * new window. See {@link TimePlayback.results}.
 * @experimental timeline
 * @beta
 */
export type TimeResultsPolicy = "keep" | "stale" | "rerun";

/**
 * How `session.time` moves windows, held with the designated field rather than on one window, so
 * clearing the window keeps them. Saved in the project as `visibility.playback`. Every member is
 * optional; one left out reads its default.
 * @experimental timeline
 * @beta
 */
export interface TimePlayback {
    /** What a window move does to finished runs over the visible graph; default `"stale"`. */
    readonly results?: TimeResultsPolicy;
    /** Sliding (both ends move) or cumulative (from the start of the data); default `"sliding"`. */
    readonly mode?: "sliding" | "cumulative";
    /**
     * How far a step moves, and how wide a sliding window is. `"auto"` (the default) picks the
     * calendar step closest to a twentieth of the data's span (a 1-2-5 number for ordinal time).
     */
    readonly step?: TimeStep | "auto";
    /** Whether an element with no usable time is kept in every window; default `"inside"`. */
    readonly missing?: "inside" | "outside";
    /**
     * Read on load and never stored: how elements outside the window draw lives in the style
     * layers selecting `{ match: "state", state: "outsideWindow" }` (see
     * `session.time.settings.outside`). Either way they are not visible: no count, run or export
     * includes them, and they keep their place in every layout.
     */
    readonly outside?: "hide" | "ghost";
    /** The IANA zone calendar steps and bins read in; default `"UTC"`. */
    readonly timeZone?: string;
    /**
     * Fade by age: the opacity, 0 to 1, that edges starting at the window's first instant draw at,
     * rising to full at its end. Default 1, no fade. It applies to edges timed by an instant or a
     * span, with `outside: "hide"`; elsewhere it does nothing and `session.time.notices()` says why
     * (`time.age-fade-inactive`). A line drawn with `line.blending` false stays opaque, and so do
     * straight animated lines (`line.animationSpeed`) and patterned lines other than a dash or dot line that
     * bends or curves.
     * @experimental timeline
     */
    readonly ageFade?: number;
}

/** One kind's instants for a time column, parsed once: per row, NaN where there is none. */
export interface TimeInstants {
    /** One instant per row; NaN for a row with no usable value. */
    readonly rows: Float64Array;
    /** How many rows have one. */
    readonly timed: number;
    /** A kind of spans' spans; null or absent for a kind of instants. */
    readonly spans?: TimeSpans | null;
}

/** One kind's spans, row by row: a span holds a window `[from, to)` when `start < to && end > from`. */
export interface TimeSpans {
    /** Where each span starts, a row's spans side by side; an open start is `-Infinity`. */
    readonly starts: Float64Array;
    /** Where each ends; an open end is `Infinity`, and an instant the next float above it. */
    readonly ends: Float64Array;
    /** Where each row's spans start, with one more entry than rows. */
    readonly first: Uint32Array;
    /** The end attribute they were read from, when they were. */
    readonly end?: Path;
    /** The spells attribute they were read from, when they were. */
    readonly spells?: Path;
}

// ---------------------------------------------------------------------------------------------
// What the compiler reads that it cannot compute
// ---------------------------------------------------------------------------------------------

/**
 * One element's value for a path, such as `data.type`.
 *
 * Attribute values live with whoever ingested the records, not in the snapshot's core, so the
 * filter asks rather than reads. Absent from the sources, the three kinds that need it are
 * REFUSED rather than quietly treated as matching nothing: "0 of 500 visible" and "this session
 * cannot read attributes" look identical on screen and are not the same problem.
 */
export interface FilterValueSource {
    /**
     * The value one node carries for a path.
     * @param index - The dense node index.
     * @param path - The attribute path.
     * @returns The value, or undefined when the node carries none.
     */
    nodeValue(index: number, path: Path): unknown;
    /**
     * The value one edge carries for a path.
     * @param index - The dense (logical) edge index.
     * @param path - The attribute path.
     * @returns The value, or undefined when the edge carries none.
     */
    edgeValue(index: number, path: Path): unknown;
    /**
     * Which halves carry a value for a path, when the source knows without reading every element.
     * Absent, a `range` or `categories` leaf scans until it finds an element that carries one.
     * @param path - The attribute path.
     * @returns Whether any node, and any edge, carries one.
     */
    halvesOf?(path: Path): { readonly node: boolean; readonly edge: boolean };
}

/**
 * Everything a filter needs from the rest of the session.
 *
 * Each member is optional, and each absence is a REFUSAL rather than a quiet widening, for the
 * reason the scope resolver gives: a filter that silently ignored the half of itself this session
 * cannot evaluate would leave a confident "showing 340 of 500" over the wrong 340.
 */
export interface FilterSources {
    /**
     * The nodes a predicate matches. Absent refuses an `expression` filter.
     * @param where - The predicate.
     * @returns The matching node ids; ones the graph no longer holds are ignored.
     */
    readonly match?: (where: Query) => Iterable<NodeId>;
    /**
     * The edges a predicate matches. Absent refuses an `edges` filter.
     * @param where - The predicate.
     * @returns The matching edge ids; ones the graph no longer holds are ignored.
     */
    readonly matchEdges?: (where: Query) => Iterable<EdgeId>;
    /**
     * Which connected component each node belongs to. Absent refuses a `component` filter.
     * @returns One component number per node index, and how many there are.
     */
    readonly components?: () => ComponentLabels;
    /** Where to read attribute values. Absent refuses `range`, `categories` and a time window. */
    readonly values?: FilterValueSource;
    /** Whether the timeline experiment is on; absent reads on. */
    readonly timeline?: () => boolean;
    /**
     * Whether a window's bounds are instants of a time column's parsed values rather than values
     * to compare as they stand: with the timeline on, or read from a project that saved them so.
     * @param window - The window.
     * @returns True for instants. Absent, the answer is whether the timeline is on.
     */
    readonly holdsInstants?: (window: TimeWindow) => boolean;
    /**
     * The zone a window's text bounds read in. Absent, or undefined for an attribute, they read as
     * `Date.parse` does.
     * @param attribute - The window's attribute.
     * @returns The zone, or undefined.
     */
    readonly boundZone?: (attribute: Path) => string | undefined;
    /**
     * The instants of a designated time column, parsed once. Absent, or null for a path or a
     * kind, a window parses each element's value itself.
     * @param path - The window's attribute.
     * @returns Each kind's instants, or null.
     */
    readonly instants?: (
        path: Path,
    ) => { readonly node: TimeInstants | null; readonly edge: TimeInstants | null } | null;
    /**
     * The paths inside a query that nothing in this session answers.
     *
     * A query that parses perfectly and names an attribute or a run that does not exist matches
     * NOTHING, silently, and that reads exactly like a correct answer of zero. Absent, a query's
     * paths are simply not checked; present, the ones that answer nothing come back on the
     * filter's result beside the counts.
     * @param where - The query.
     * @returns The unresolved paths.
     */
    readonly unresolvedPathsOf?: (where: Query) => readonly Path[];
    /**
     * What a `member` leaf's set covers. Absent refuses a `member` leaf.
     * @param scope - The referenced set.
     * @returns Its node half, and its edge half when its reading speaks edges.
     */
    readonly scope?: (scope: Scope) => ScopeLeaf;
    /**
     * A run's current result, as `item` and `threshold` leaves read it. Absent refuses both over
     * `results.*`; a run it does not know leaves the leaf holding nothing.
     * @param run - The run.
     * @returns The result, or undefined when the run has none.
     */
    readonly result?: (run: RunId) => FilterRunResult | undefined;
    /**
     * What a held item's execution held, captured when its run re-executed, as bitmaps over the
     * snapshot (design/sets 5.2). Absent, or undefined for an item: nothing was captured, and a
     * held execution that is no longer current holds nothing.
     * @param item - The item, with its execution.
     * @returns Its node bitmap when its field lives on nodes, its edge bitmap when on edges.
     */
    readonly captured?: (item: ResultItem) => CapturedHalves | undefined;
    /**
     * The nodes and edges any of these loads supplied. Absent refuses a `source` leaf.
     * @param keys - The loads' keys.
     * @returns Their node ids and edge ids; ones the graph no longer holds are ignored.
     */
    readonly supplied?: (keys: readonly SourceKey[]) => {
        readonly nodes: ReadonlySet<NodeId>;
        readonly edges: ReadonlySet<EdgeId>;
    };
    /**
     * The hovered node, else a lone selected node: what a step's `"hovered-or-selected"` names.
     * Absent refuses that reference.
     * @returns The node, or null when there is none.
     */
    readonly focus?: () => NodeId | null;
    /**
     * Whether an element is in a state now: what a `state` leaf reads. Absent refuses that leaf,
     * as the visibility filter does, since it cannot follow the reader.
     * @param state - Which state.
     * @param target - Nodes or edges.
     * @param index - The dense index.
     * @returns True when it is.
     */
    readonly inState?: (state: ElementState, target: "node" | "edge", index: number) => boolean;
    /**
     * Whether a union step can be evaluated now, or why it waits (its run is computing, needed,
     * paused, failed or stale), and the result a `measure` leaf reads. Absent refuses `measure`.
     */
    readonly steps?: UnionStepSource;
}

/** What a union step that reads an algorithm (a `measure` leaf) asks the session. */
export interface UnionStepSource {
    /** Whether a step can be folded now: see {@link UnionEnv.gate}. */
    gate: NonNullable<UnionEnv["gate"]>;
    /**
     * The result a `measure` leaf reads now, or undefined when it has none.
     * @param leaf - The leaf.
     * @param frame - The frame of the step it sits in.
     * @returns The result.
     */
    result(leaf: Extract<RuleTree, { kind: "measure" }>, frame: StepFrame): FilterRunResult | undefined;
}

/** A captured item's members over the snapshot: null for a half the item's field does not live on. */
export interface CapturedHalves {
    readonly nodes: U32 | null;
    readonly edges: U32 | null;
}

/** A run's current result, as the compiler reads it. */
export interface FilterRunResult {
    /** The token of the execution these values belong to; compared for equality only. */
    readonly execution: string | undefined;
    /** Which fields the result publishes per node, per edge or for the graph. */
    readonly fields: readonly { readonly name: string; readonly kind: "node" | "edge" | "graph" }[];
    /**
     * One node's value for a field.
     * @param index - The dense node index.
     * @param field - The field.
     * @returns The value, or undefined when the node carries none.
     */
    nodeValue(index: number, field: string): unknown;
    /**
     * One edge's value for a field.
     * @param index - The dense (logical) edge index.
     * @param field - The field.
     * @returns The value, or undefined when the edge carries none.
     */
    edgeValue(index: number, field: string): unknown;
}

/**
 * What a `member` leaf speaks: the referenced set's nodes, and its edges only when the set is read
 * `listed` or `clipped`. `edges: null` is silent, exactly as a node leaf is.
 */
export interface ScopeLeaf {
    /** Node bitmap over the snapshot. */
    readonly nodes: U32;
    /** Edge bitmap over the snapshot, or null when the set is read `induced`. */
    readonly edges: U32 | null;
}

// ---------------------------------------------------------------------------------------------
// What a filter compiles to
// ---------------------------------------------------------------------------------------------

/** Whether one element, named by its dense index, passes a test. */
export type ElementTest = (index: number) => boolean;

/**
 * A filter and a window, reduced to the two tests the walk runs.
 *
 * `null` on either half means "nothing constrains this kind of element", which is not the same as
 * a test that always answers true: it lets the walk skip the call entirely.
 */
export interface CompiledVisibility {
    /** The node test, or null when nothing narrows the nodes. */
    readonly node: ElementTest | null;
    /** The edge test, or null when nothing narrows the edges beyond its endpoints. */
    readonly edge: ElementTest | null;
    /**
     * The paths nothing in the graph answered.
     *
     * Answerable only AFTER a pass has run, because an attribute path is unresolved exactly when
     * no element turned out to carry a value for it. A consumer reads this to say "0 matched --
     * data.rank is not an attribute on this graph" instead of showing a confident empty screen.
     * @returns The unresolved paths, without duplicates.
     */
    unresolvedPaths(): readonly Path[];
    /**
     * The filter on its own, the window aside: tests a reader can walk without compiling the filter
     * again, and {@link CompiledVisibility.unresolvedPaths} for the paths the filter names. Null
     * with no filter.
     */
    readonly filter: Omit<CompiledVisibility, "filter"> | null;
}

// ---------------------------------------------------------------------------------------------
// Refusals
// ---------------------------------------------------------------------------------------------

/** Every filter kind, for a message that lists what was allowed. */
const FILTER_KINDS = [
    "expression",
    "range",
    "categories",
    "degree",
    "component",
    "neighborhood",
    "isolated",
    "self-loop",
    "repeated-edge",
    "source",
    "edges",
    "state",
    "member",
    "item",
    "threshold",
    "text",
    "all",
    "any",
    "not",
] as const;

/** The step names a time window may carry beside a plain number of milliseconds. */
const TIME_STEPS: ReadonlySet<string> = new Set(["hour", "day", "week", "month", "quarter", "year"]);

/**
 * The refusal a filter this session cannot evaluate gets, naming what would evaluate it.
 * @param kind - The filter kind that cannot be honoured.
 * @param needs - The capability whose absence is the reason.
 * @returns The error to throw.
 */
function unsupported(kind: string, needs: string): GraphtyError {
    return new GraphtyError({
        code: "E_UNSUPPORTED",
        message:
            `This session cannot evaluate a "${kind}" filter, because ${needs} is not attached to ` +
            "it. Applying it anyway would hide elements on a rule that was never run.",
        source: "data",
        details: { kind, needs },
    });
}

/**
 * The refusal a malformed filter gets.
 * @param message - What is wrong, in a sentence.
 * @param details - The offending values.
 * @returns The error to throw.
 */
function malformed(message: string, details: Readonly<Record<string, unknown>>): GraphtyError {
    return new GraphtyError({ code: "E_BAD_COMMAND", message, source: "data", details });
}

/**
 * The refusal a number outside its allowed range gets.
 * @param message - What is wrong, in a sentence.
 * @param details - The offending values.
 * @returns The error to throw.
 */
function outOfRange(message: string, details: Readonly<Record<string, unknown>>): GraphtyError {
    return new GraphtyError({ code: "E_OPTION_RANGE", message, source: "data", details });
}

/**
 * The refusal of a visibility filter that reads what it computes.
 * @param through - The references followed, ending with `"visible"` or `"search"`.
 * @returns The error to throw.
 */
function readsItself(through: readonly ChainStep[]): GraphtyError {
    return malformed(
        `This filter reads ${quoteEach(through, " through ")}, which is what the visibility ` +
            "filter computes, so it would depend on itself. Create a set from the current members instead.",
        { reason: "cycle", through },
    );
}

/**
 * Check an attribute leaf's choice of which nodes it keeps.
 * @param nodes - The choice the leaf carried.
 * @param kind - The filter kind, for the message.
 */
function assertNodesChoice(nodes: unknown, kind: string): void {
    if (nodes !== undefined && nodes !== "all" && nodes !== "ends" && nodes !== "none") {
        throw malformed(`A "${kind}" filter's nodes are "all", "ends" or "none".`, { kind, nodes });
    }
}

/**
 * Check one attribute path is usable.
 * @param attribute - The path the filter carried.
 * @param kind - The filter kind, for the message.
 * @throws A `GraphtyError` with code `E_BAD_COMMAND` when the path is blank or not a string.
 */
function assertPath(attribute: unknown, kind: string): void {
    if (typeof attribute !== "string" || attribute.trim() === "") {
        throw malformed(`A "${kind}" filter needs an attribute path, such as "data.type".`, { kind, attribute });
    }
}

/**
 * Check a low and a high bound are usable together.
 * @param min - The lower bound, when the filter carried one.
 * @param max - The upper bound, when the filter carried one.
 * @param kind - The filter kind, for the message.
 * @throws A `GraphtyError` when a bound is not a finite number or the pair is inverted.
 */
function assertBounds(min: number | undefined, max: number | undefined, kind: string): void {
    for (const [name, bound] of [
        ["min", min],
        ["max", max],
    ] as const) {
        if (bound !== undefined && !Number.isFinite(bound)) {
            throw outOfRange(`A "${kind}" filter's ${name} must be a finite number.`, { kind, [name]: bound });
        }
    }

    if (min !== undefined && max !== undefined && min > max) {
        throw outOfRange(`A "${kind}" filter's min (${String(min)}) is above its max (${String(max)}).`, {
            kind,
            min,
            max,
        });
    }
}

/**
 * Check a leaf's side is a side.
 * @param side - The side the leaf carried.
 * @param kind - The filter kind, for the message.
 * @throws A `GraphtyError` with code `E_BAD_COMMAND` when it is neither "nodes" nor "edges".
 */
function assertSide(side: unknown, kind: string): void {
    if (side !== undefined && side !== "nodes" && side !== "edges") {
        throw malformed(`A "${kind}" filter's side is "nodes" or "edges".`, { kind, side });
    }
}

/**
 * Check a query is not empty.
 *
 * An empty query matches EVERY element, which is the same defect an empty style selector has: the
 * filter looks scoped, matches the whole graph, and never says so.
 * @param where - The query the filter carried.
 * @param kind - The filter kind, for the message.
 * @throws A `GraphtyError` with code `E_BAD_QUERY` when the query is blank or not a string.
 */
function assertQuery(where: unknown, kind: string): void {
    if (typeof where !== "string" || where.trim() === "") {
        throw new GraphtyError({
            code: "E_BAD_QUERY",
            message: `A "${kind}" filter needs a query. An empty one matches every element rather than none.`,
            source: "data",
            details: { kind, where },
        });
    }
}

/**
 * Check a "degree" filter's bounds and direction.
 * @param filter - The filter.
 * @throws A `GraphtyError` when either is not one.
 */
function assertDegreeFilter(filter: Extract<RuleTree, { kind: "degree" }>): void {
    assertBounds(filter.min, filter.max, filter.kind);

    if (filter.direction !== undefined && !["in", "out", "all"].includes(filter.direction)) {
        throw malformed('A "degree" filter\'s direction is "in", "out" or "all".', {
            direction: filter.direction,
        });
    }
}

/**
 * Check a "component" filter names a component number.
 * @param filter - The filter.
 * @throws A `GraphtyError` when it does not.
 */
function assertComponentFilter(filter: Extract<RuleTree, { kind: "component" }>): void {
    if (!Number.isInteger(filter.id) || filter.id < 0) {
        throw outOfRange('A "component" filter\'s id is a component number, counting from 0.', {
            id: filter.id,
        });
    }
}

/**
 * Check a "neighborhood" filter's seeds and depth.
 * @param filter - The filter.
 * @throws A `GraphtyError` when either is not one.
 */
function assertNeighborhoodFilter(filter: Extract<RuleTree, { kind: "neighborhood" }>): void {
    if (!Array.isArray(filter.seeds)) {
        throw malformed('A "neighborhood" filter needs a list of seed node ids.', { seeds: filter.seeds });
    }

    if (!Number.isInteger(filter.depth) || filter.depth < 0) {
        throw outOfRange('A "neighborhood" filter\'s depth is a whole number of hops, from 0.', {
            depth: filter.depth,
        });
    }
}

/**
 * Check a "source" filter's load keys.
 * @param sources - The keys.
 * @throws A `GraphtyError` when they are not a list of strings.
 */
function assertLoadKeys(sources: unknown): void {
    if (!Array.isArray(sources) || !sources.every((key) => typeof key === "string")) {
        throw malformed('A "source" filter needs a list of load keys.', { sources });
    }
}

/**
 * Check one filter is a filter, all the way down, without touching the graph.
 *
 * Separate from compiling it so that a malformed filter is refused at the call that offered it
 * rather than inside the run it started: a form can show the mistake where it was typed, and a
 * caller never gets a `Run` that was doomed before it was queued.
 * @param filter - The filter to check.
 * @throws A `GraphtyError` when any part of it is not a filter.
 */
function assertFilter(filter: RuleTree): void {
    if (typeof filter !== "object" || filter === null || typeof filter.kind !== "string") {
        throw malformed(`A filter is an object with a "kind" of ${FILTER_KINDS.join(", ")}.`, { filter });
    }

    // Kept beside the switch, and typed as a plain string, so the refusal below can name a kind
    // the union does not contain -- which is exactly the case a runtime check exists for.
    const { kind } = filter;

    switch (filter.kind) {
        case "expression":
        case "edges":
            assertQuery(filter.where, filter.kind);

            return;
        case "range":
            assertPath(filter.attribute, filter.kind);
            assertBounds(filter.min, filter.max, filter.kind);
            assertNodesChoice(filter.nodes, filter.kind);

            if (filter.as !== undefined && (filter.as as string) !== "time") {
                throw malformed('A "range" filter\'s as is "time", or absent to compare numbers.', { as: filter.as });
            }

            return;
        case "categories":
            assertPath(filter.attribute, filter.kind);
            assertNodesChoice(filter.nodes, filter.kind);

            if (!Array.isArray(filter.values)) {
                throw malformed('A "categories" filter needs a list of values.', { values: filter.values });
            }

            return;
        case "degree":
            assertDegreeFilter(filter);

            return;
        case "component":
            assertComponentFilter(filter);

            return;
        case "neighborhood":
            assertNeighborhoodFilter(filter);

            return;
        case "isolated":
        case "self-loop":
        case "repeated-edge":
            return;
        case "source":
            assertLoadKeys(filter.sources);

            assertSide(filter.side, filter.kind);

            return;
        case "member":
            // The filter computes "visible", and "search" will read the filter: either one here is
            // a filter reading itself.
            if (filter.of === "visible" || (filter.of as unknown) === "search") {
                throw readsItself([filter.of as ChainStep]);
            }

            parseScope(filter.of);

            return;
        case "union":
            if ((filter as { within?: unknown }).within === "visible") {
                throw malformed(
                    'A filter\'s "union" reads the full graph (within: "graph"): what is visible is what the filter computes.',
                    { reason: "circular-scope", within: "visible" },
                );
            }

            assertRuleTree(filter);

            return;
        case "item":
        case "threshold":
        case "text":
        case "state":
        case "hops":
        case "touching":
        case "nonempty":
        case "same-value":
        case "by-size":
        case "measure":
            assertRuleTree(filter);

            return;
        case "all":
        case "any":
            if (!Array.isArray(filter.of)) {
                throw malformed(`An "${filter.kind}" filter needs a list of filters.`, { of: filter.of });
            }

            for (const member of filter.of) {
                assertFilter(member);
            }

            return;
        case "not":
            assertFilter(filter.of);

            return;
        default:
            throw malformed(`"${kind}" is not a filter kind.`, { kind, kinds: FILTER_KINDS });
    }
}

/**
 * The instant a value sits at, or null when it sits nowhere on a timeline.
 *
 * A value that is present but unparseable is "nowhere" rather than an error: one malformed
 * timestamp in an imported file must not make the whole window unusable, and the element reports
 * the attribute through the filter's unresolved paths when NOTHING answered it.
 * @param value - The value an element carried, or a window bound.
 * @returns Milliseconds, or null.
 */
function instantOf(value: unknown): number | null {
    if (typeof value === "number") {
        return Number.isFinite(value) ? value : null;
    }

    if (typeof value === "string") {
        const parsed = Date.parse(value);

        return Number.isNaN(parsed) ? null : parsed;
    }

    if (value instanceof Date) {
        const time = value.getTime();

        return Number.isNaN(time) ? null : time;
    }

    return null;
}

/**
 * Check a time window is a time window, without touching the graph.
 * @param window - The window to check.
 * @throws A `GraphtyError` when it is malformed, its bounds do not read as instants, or they are
 *     the wrong way round.
 */
function assertTimeWindow(window: TimeWindow): void {
    if (typeof window !== "object" || window === null) {
        throw malformed("A time window is an object with an attribute, a from and a to.", { window });
    }

    assertPath(window.attribute, "window");

    const from = instantOf(window.from);
    const to = instantOf(window.to);

    for (const [name, bound, instant] of [
        ["from", window.from, from],
        ["to", window.to, to],
    ] as const) {
        if (instant === null) {
            throw outOfRange(
                `A time window's ${name} must be a number or a date string, not ${JSON.stringify(bound)}.`,
                { [name]: bound },
            );
        }
    }

    if (from !== null && to !== null && from > to) {
        throw outOfRange("A time window's from is after its to, so it covers no time at all.", {
            from: window.from,
            to: window.to,
        });
    }

    if (
        window.step !== undefined &&
        !(typeof window.step === "number" && Number.isFinite(window.step) && window.step > 0) &&
        !(typeof window.step === "string" && TIME_STEPS.has(window.step))
    ) {
        throw outOfRange(
            `A time window's step is a positive number of milliseconds or one of ${[...TIME_STEPS].join(", ")}.`,
            { step: window.step },
        );
    }

    assertWindowOptions(window);
}

/** The values each enumerated window option takes. */
const WINDOW_OPTIONS = {
    nodes: ["all", "ends"],
    missing: ["inside", "outside"],
    mode: ["sliding", "cumulative"],
} as const;

/**
 * Check a time window's enumerated options.
 * @param window - The window.
 * @throws A `GraphtyError` naming the option and the values it takes.
 */
function assertWindowOptions(window: TimeWindow): void {
    for (const [option, allowed] of Object.entries(WINDOW_OPTIONS)) {
        const value = (window as unknown as Record<string, unknown>)[option];
        if (value !== undefined && !(allowed as readonly unknown[]).includes(value)) {
            throw malformed(`A time window's ${option} is one of ${allowed.join(", ")}.`, {
                field: option,
                value,
                allowed: [...allowed],
            });
        }
    }
}

/**
 * Check a filter and a window before anything starts working on them.
 * @param filter - The filter, or null for none.
 * @param window - The time window, or null for none.
 * @param dependencies - Where the references a `member` leaf makes are looked up, so a filter that
 *     reaches `"visible"` or `"search"` through kept sets is refused (`details.reason: "cycle"`), and
 *     one whose item follows a partition group (`"follow-group"`).
 * @throws A `GraphtyError` when either is malformed.
 */
export function assertVisibility(
    filter: RuleTree | null,
    window: TimeWindow | null,
    dependencies?: DependencySources,
): void {
    if (filter !== null) {
        assertFilter(filter);

        const through = dependencies === undefined ? null : visibilityCycle(filter, dependencies);
        if (through !== null) {
            throw readsItself(through);
        }

        const group = dependencies === undefined ? null : followedGroup(filter, dependencies);
        if (group !== null) {
            throw followsGroup(group);
        }
    }

    if (window !== null) {
        assertTimeWindow(window);
    }
}

/**
 * Whether a window asks for what only the timeline experiment applies.
 * @param window - The window, or null for none.
 * @returns True when it names `nodes: "ends"`, `missing: "outside"`, an `end` or `spells`.
 */
export function windowNeedsTimeline(window: TimeWindow | null): boolean {
    return (
        window?.nodes === "ends" ||
        window?.missing === "outside" ||
        window?.end !== undefined ||
        window?.spells !== undefined
    );
}

/**
 * Refuse a state leaf, alone or in a union's steps, where nothing follows the reader. A union's
 * other leaves are checked as it is read; a state never can be there.
 * @param rule - The leaf.
 * @param sources - What this session can evaluate with.
 * @throws A `GraphtyError` with code `E_UNSUPPORTED`.
 */
function assertStatesEvaluable(rule: RuleTree, sources: FilterSources): void {
    if (sources.inState !== undefined) {
        return;
    }

    switch (rule.kind) {
        case "state":
            throw unsupported("state", "a view that follows the reader");
        case "union":
            for (const branch of rule.branches) {
                for (const step of branch.steps) {
                    assertStatesEvaluable(step.rule, sources);
                }
            }

            return;
        case "all":
        case "any":
            rule.of.forEach((member) => {
                assertStatesEvaluable(member, sources);
            });
            return;
        case "not":
            assertStatesEvaluable(rule.of, sources);
            return;
        default:
    }
}

/**
 * Refuse a filter or a window this session could not evaluate, without evaluating it: the checks
 * {@link compileVisibility} makes before it walks anything, so a filter is refused before it is
 * recorded rather than on every later evaluation.
 * @param filter - The filter, or null for none.
 * @param window - The time window, or null for none.
 * @param sources - What this session can evaluate with.
 * @throws A `GraphtyError` when either is malformed or needs a capability this session lacks.
 */
export function assertEvaluable(filter: RuleTree | null, window: TimeWindow | null, sources: FilterSources): void {
    assertVisibility(filter, window);
    // With the timeline off a window's zone does nothing, so any value stays saved as it came.
    if (window?.timeZone !== undefined && sources.timeline?.() !== false && !isTimeZone(window.timeZone)) {
        throw malformed("A time window's timeZone is an IANA zone name, such as America/New_York.", {
            field: "timeZone",
            reason: "time-zone",
            value: window.timeZone,
        });
    }

    // With the timeline off they are not read, so any value stays saved as it came.
    if (window !== null && sources.timeline?.() !== false) {
        for (const path of [window.end, window.spells]) {
            if (path !== undefined) {
                assertPath(path, "window");
            }
        }
    }

    const check = (each: RuleTree): void => {
        switch (each.kind) {
            case "expression":
                if (sources.match === undefined) {
                    throw unsupported("expression", "a query engine");
                }

                return;
            case "edges":
                if (sources.matchEdges === undefined) {
                    throw unsupported("edges", "a query engine for edges");
                }

                return;
            case "range":
            case "categories":
            case "text":
                if (sources.values === undefined && !(each.kind === "text" && each.reads === "id")) {
                    throw unsupported(each.kind, "a source of attribute values");
                }

                return;
            case "component": {
                if (sources.components === undefined) {
                    throw unsupported("component", "the connected components");
                }

                const { count } = sources.components();
                if (each.id >= count) {
                    throw outOfRange(
                        `This graph has ${String(count)} components, so there is no component ${String(each.id)}.`,
                        {
                            id: each.id,
                            count,
                        },
                    );
                }

                return;
            }
            case "source":
                if (sources.supplied === undefined) {
                    throw unsupported("source", "a record of what each load supplied");
                }

                return;
            case "state":
            case "union":
                assertStatesEvaluable(each, sources);
                return;
            case "all":
            case "any":
                each.of.forEach(check);
                return;
            case "not":
                check(each.of);
                return;
            default:
                // "degree" and "neighborhood" read only the graph.
                return;
        }
    };

    if (filter !== null) {
        check(filter);
    }

    if (window !== null && sources.values === undefined) {
        throw unsupported("window", "a source of attribute values");
    }
}

// ---------------------------------------------------------------------------------------------
// Compiling
// ---------------------------------------------------------------------------------------------

/** What one attribute path looked like as a pass read it. */
interface PathMark {
    /** Whether any element turned out to carry a value for it. */
    seen: boolean;
}

/** Everything the compiler carries down the filter tree. */
interface CompileContext {
    /** The snapshot every test is written against. */
    readonly graph: GraphSnapshot;
    /** Where to read what the compiler cannot compute. */
    readonly sources: FilterSources;
    /** One mark per attribute path read, so an unread path can be named afterwards. */
    readonly marks: Map<Path, PathMark>;
    /** The paths a query engine already said nothing answers. */
    readonly unresolvedQueries: Set<Path>;
    /** The step being compiled, inside a `union` leaf: what `"so-far"` names and the populations. */
    readonly step?: StepFrame;
    /** The edges a structure value (degree) is counted over, outside a step; every edge when absent. */
    readonly baseEdges?: Bytes;
}

/** One filter's two halves, before they are folded together. */
export interface CompiledHalves {
    /** The node test, or null when this filter says nothing about nodes. */
    readonly node: ElementTest | null;
    /** The edge test, or null when this filter says nothing about edges. */
    readonly edge: ElementTest | null;
}

/** A filter that constrains nothing at all. */
const SILENT: CompiledHalves = { node: null, edge: null };

/**
 * The mark for one path, created on first use.
 * @param context - The compile context.
 * @param path - The attribute path.
 * @returns Its mark.
 */
function markFor(context: CompileContext, path: Path): PathMark {
    const existing = context.marks.get(path);

    if (existing !== undefined) {
        return existing;
    }

    const created: PathMark = { seen: false };
    context.marks.set(path, created);

    return created;
}

/**
 * The value an element carries, with the path marked as answered when it carries one.
 * @param read - Reads the value.
 * @param index - The element's dense index.
 * @param path - The attribute path.
 * @param mark - The mark to set when a value is there.
 * @returns The value, or undefined when there is none.
 */
function readValue(read: (index: number, path: Path) => unknown, index: number, path: Path, mark: PathMark): unknown {
    const value = read(index, path);

    if (value === undefined || value === null) {
        return undefined;
    }

    mark.seen = true;

    return value;
}

/**
 * The value source, or a refusal naming what would supply one.
 * @param context - The compile context.
 * @param kind - The filter kind asking, for the message.
 * @returns The value source.
 * @throws A `GraphtyError` with code `E_UNSUPPORTED` when this session has none.
 */
function valuesOf(context: CompileContext, kind: string): FilterValueSource {
    const { values } = context.sources;

    if (values === undefined) {
        throw unsupported(kind, "a source of attribute values");
    }

    return values;
}

/**
 * A membership test over the node ids a query matched.
 * @param context - The compile context.
 * @param where - The query.
 * @returns The test.
 * @throws A `GraphtyError` with code `E_UNSUPPORTED` when this session has no query engine.
 */
function expressionTest(context: CompileContext, where: Query): ElementTest {
    const { match, unresolvedPathsOf } = context.sources;

    if (match === undefined) {
        throw unsupported("expression", "a query engine");
    }

    for (const path of unresolvedPathsOf?.(where) ?? []) {
        context.unresolvedQueries.add(path);
    }

    const hit = new Uint8Array(context.graph.nodeCount);

    for (const id of match(where)) {
        const index = context.graph.ids.indexOf(id);

        if (index !== INVALID_INDEX) {
            hit[index] = 1;
        }
    }

    return (index) => hit[index] === 1;
}

/**
 * A membership test over the edge ids a query matched.
 * @param context - The compile context.
 * @param where - The query.
 * @returns The test.
 * @throws A `GraphtyError` with code `E_UNSUPPORTED` when this session has no edge query engine.
 */
function edgeQueryTest(context: CompileContext, where: Query): ElementTest {
    const { matchEdges, unresolvedPathsOf } = context.sources;

    if (matchEdges === undefined) {
        throw unsupported("edges", "a query engine for edges");
    }

    for (const path of unresolvedPathsOf?.(where) ?? []) {
        context.unresolvedQueries.add(path);
    }

    const space = edgeSpaceOf(context.graph);
    const hit = new Uint8Array(context.graph.edgeCount);

    for (const id of matchEdges(where)) {
        const index = space.indexOf(id);

        if (index !== INVALID_INDEX) {
            hit[index] = 1;
        }
    }

    return (index) => hit[index] === 1;
}

/**
 * The tests over what some loads supplied: a node or an edge passes when one of them supplied it.
 * @param context - The compile context.
 * @param keys - The loads' keys.
 * @param side - The one half to speak, or both when absent.
 * @returns Both halves, or the one `side` names.
 * @throws A `GraphtyError` with code `E_UNSUPPORTED` when this session records no provenance.
 */
function sourceTests(context: CompileContext, keys: readonly SourceKey[], side: RuleSide | undefined): CompiledHalves {
    const { supplied } = context.sources;
    if (supplied === undefined) {
        throw unsupported("source", "a record of what each load supplied");
    }

    const { nodes, edges } = supplied(keys);
    const { graph } = context;
    const space = edgeSpaceOf(graph);
    return {
        node: side === "edges" ? null : (index) => nodes.has(graph.ids.idOf(index)),
        edge: side === "nodes" ? null : (index) => edges.has(space.idOf(index)),
    };
}

/**
 * Whether a value passes a numeric bound, both ends inclusive; anything but a finite number fails.
 * @param min - The lower bound; unbounded when absent.
 * @param max - The upper bound; unbounded when absent.
 * @returns The check.
 */
function inRange(min: number | undefined, max: number | undefined): (value: unknown) => boolean {
    const low = min ?? Number.NEGATIVE_INFINITY;
    const high = max ?? Number.POSITIVE_INFINITY;

    return (value) => typeof value === "number" && Number.isFinite(value) && value >= low && value <= high;
}

/**
 * Whether a value is one of the wanted categories.
 *
 * The comparison is on the value's TEXT, so a chip list that hands back "3" still matches a record
 * whose type code arrived as the number 3. That is the opposite of the rule for node ids, where 1
 * and "1" are two different nodes on purpose: an id is an identity, and a category is a label.
 * @param wanted - The categories to keep.
 * @returns The check.
 */
function inCategories(wanted: readonly string[]): (value: unknown) => boolean {
    const allowed = new Set(wanted);

    return (value) =>
        typeof value === "string"
            ? allowed.has(value)
            : (typeof value === "number" || typeof value === "boolean") && allowed.has(String(value));
}

/**
 * Whether any element of a half carries a value for a path; stops at the first one.
 * @param count - The elements in the half.
 * @param read - Reads one element's value.
 * @returns True when one does.
 */
function carries(count: number, read: (index: number) => unknown): boolean {
    for (let index = 0; index < count; index++) {
        const value = read(index);
        if (value !== undefined && value !== null) {
            return true;
        }
    }

    return false;
}

/**
 * A `range` or `categories` leaf. Each half whose elements carry the attribute speaks, so a leaf
 * on an edge attribute such as `data.weight` narrows the edges and is silent about the nodes,
 * unless it asks for `nodes: "ends"`: then a node is kept only when it is an end of an edge the
 * leaf keeps. A path neither half carries speaks nodes and holds none of them, and the pass reports
 * it unresolved.
 *
 * The tests read one element each, so a set question about one element reads that element alone;
 * only `"ends"` reads every edge, once, at compile time.
 * @param context - The compile context.
 * @param filter - The leaf.
 * @returns The halves.
 */
function compileAttribute(
    context: CompileContext,
    filter: Extract<RuleTree, { kind: "range" | "categories" }>,
): CompiledHalves {
    if (filter.kind === "range" && filter.as === "time") {
        return compileTimeRange(context, filter);
    }

    let accept: (value: unknown) => boolean;
    if (filter.kind === "range") {
        accept = inRange(filter.min, filter.max);
    } else {
        accept = filter.match === undefined ? inCategories(filter.values) : inList(filter.values, filter.match);
    }

    if (filter.missing === "include") {
        const measured = accept;
        accept = (value) => !isMeasured(value) || measured(value);
    }

    return compileValueLeaf(
        context,
        filter.kind,
        filter.attribute,
        filter.nodes,
        accept,
        structureReaders(context, filter.attribute),
    );
}

/**
 * Whether a value counts as measured: present, and finite when it is a number.
 * @param value - The value.
 * @returns True when measured.
 */
function isMeasured(value: unknown): boolean {
    return value !== undefined && value !== null && (typeof value !== "number" || Number.isFinite(value));
}

/**
 * Whether a list value holds any, or every one, of the wanted categories; a single value reads
 * as a list of one.
 * @param wanted - The categories.
 * @param match - Any or all.
 * @returns The check.
 */
function inList(wanted: readonly string[], match: "any" | "all"): (value: unknown) => boolean {
    const one = inCategories(wanted);

    return (value) => {
        const items = Array.isArray(value) ? (value as readonly unknown[]) : [value];
        if (match === "any") {
            return items.some(one);
        }

        const held = new Set(items.map(String));
        return wanted.length > 0 && wanted.every((category) => held.has(category));
    };
}

/**
 * The node reader of a structure value (`graphty.degree`, `graphty.inDegree`,
 * `graphty.outDegree`), which needs no run and no column; empty for any other path.
 * @param context - The compile context.
 * @param path - The path.
 * @returns The readers.
 */
function structureReaders(context: CompileContext, path: Path): { readonly node?: (index: number) => unknown } {
    const { graph } = context;
    let which: "in" | "out" | undefined;
    if (path === "graphty.inDegree") {
        which = graph.directed ? "in" : undefined;
    } else if (path === "graphty.outDegree") {
        which = graph.directed ? "out" : undefined;
    } else if (path !== "graphty.degree") {
        return {};
    }

    const read = degreesOf(context, which);
    return { node: (index) => read[index] };
}

/**
 * The base a step reads its walks and structure values in: null outside a step, and for a step
 * over the whole graph.
 * @param context - The compile context.
 * @returns The base's halves, or undefined.
 */
function baseOf(context: CompileContext): { readonly node: Bytes; readonly edge: Bytes } | undefined {
    if (context.baseEdges !== undefined) {
        return { node: new Uint8Array(context.graph.nodeCount).fill(1), edge: context.baseEdges };
    }

    const { step } = context;
    if (step?.links !== undefined) {
        return { node: step.base.node, edge: step.links };
    }

    return step === undefined || step.within === "graph" ? undefined : step.base;
}

/**
 * Every node's degree (in, out, or both ways when `which` is absent), counted over the base's
 * edges inside a step, so a filtered-out neighbour is never counted; the snapshot's otherwise.
 * @param context - The compile context.
 * @param which - In, out, or both.
 * @returns The degrees.
 */
function degreesOf(context: CompileContext, which: "in" | "out" | undefined): ArrayLike<number> {
    const { graph } = context;
    const base = baseOf(context);
    if (base === undefined) {
        if (which === "in") {
            return graph.inDegree();
        }

        return which === "out" ? graph.outDegree() : graph.degree();
    }

    // ponytail: recounted per compile; cache by base bytes if a large graph's steps feel it.
    const way = graph.directed ? which : undefined;
    const out = new Uint32Array(graph.nodeCount);
    const { src, dst } = graph.edgeList();
    for (let edge = 0; edge < graph.edgeCount; edge++) {
        if (base.edge[edge] === 1) {
            if (way !== "in") {
                out[src[edge]]++;
            }
            if (way !== "out") {
                out[dst[edge]]++;
            }
        }
    }

    return out;
}

/**
 * The readers of one value path on each half that carries it: a run's field, a structure value,
 * or a data column. Null for a half that carries nothing.
 * @param context - The compile context.
 * @param path - The path.
 * @param kind - The leaf kind, for a refusal.
 * @returns The readers.
 */
function pathReaders(
    context: CompileContext,
    path: Path,
    kind: string,
): { readonly node: ((index: number) => unknown) | null; readonly edge: ((index: number) => unknown) | null } {
    const structure = structureReaders(context, path).node;
    if (structure !== undefined) {
        return { node: structure, edge: null };
    }

    if (path.startsWith("results.")) {
        const rest = path.slice("results.".length);
        const dot = rest.indexOf(".");
        const field = rest.slice(dot + 1);
        const result = resultOf(context, kind, rest.slice(0, dot));
        const halves = result === undefined ? { node: false, edge: false } : fieldHalves(result, field);

        return {
            node: halves.node && result !== undefined ? (index) => result.nodeValue(index, field) : null,
            edge: halves.edge && result !== undefined ? (index) => result.edgeValue(index, field) : null,
        };
    }

    const values = valuesOf(context, kind);
    const { graph } = context;
    const readNode = (index: number): unknown => values.nodeValue(index, path);
    const readEdge = (index: number): unknown => values.edgeValue(index, path);
    const known = values.halvesOf?.(path);

    return {
        node: (known?.node ?? carries(graph.nodeCount, readNode)) ? readNode : null,
        edge: (known?.edge ?? carries(graph.edgeCount, readEdge)) ? readEdge : null,
    };
}

/**
 * A `range` leaf with `as: "time"`: each value read as an instant. The designated time field's
 * instants, parsed once by the timeline, are read where they exist, so the leaf and the timeline
 * agree on every value; any other column is read by the session's time parser.
 * @param context - The compile context.
 * @param filter - The leaf.
 * @returns The halves.
 */
function compileTimeRange(context: CompileContext, filter: Extract<RuleTree, { kind: "range" }>): CompiledHalves {
    const within = inRange(filter.min, filter.max);
    const indexed = context.sources.instants?.(filter.attribute) ?? null;
    const rowsOf = (parsed: TimeInstants | null | undefined): ((index: number) => unknown) | undefined =>
        parsed === null || parsed === undefined
            ? undefined
            : (index) => (Number.isNaN(parsed.rows[index]) ? undefined : parsed.rows[index]);
    const accept = (value: unknown): boolean => within(typeof value === "number" ? value : readTimeValue(value, "ms"));

    return compileValueLeaf(context, filter.kind, filter.attribute, filter.nodes, accept, {
        node: rowsOf(indexed?.node),
        edge: rowsOf(indexed?.edge),
    });
}

/**
 * A `text` leaf: the shared text matcher (`textMatcher`, what a selection's text search runs)
 * over one value, folded the way find folds text unless case counts. On `"id"` it reads the
 * node's id and speaks nodes; on a value path it speaks as a `range` leaf does.
 * @param context - The compile context.
 * @param filter - The leaf.
 * @returns The halves.
 */
function compileText(context: CompileContext, filter: Extract<RuleTree, { kind: "text" }>): CompiledHalves {
    const matches = textMatcher(filter.text, filter.mode, filter.caseSensitive === true ? null : normalizeText);
    const accept = (value: unknown): boolean =>
        (typeof value === "string" || typeof value === "number" || typeof value === "boolean") &&
        matches(String(value));

    if (filter.reads === "id") {
        const { ids } = context.graph;
        return { node: (index) => accept(ids.idOf(index)), edge: null };
    }

    return compileValueLeaf(context, "text", filter.reads, filter.nodes, accept);
}

/**
 * A leaf that tests one value per element, on each half that carries it.
 * @param context - The compile context.
 * @param kind - The leaf kind, for a refusal.
 * @param attribute - The value path.
 * @param nodes - Which nodes the leaf keeps when the value lives on edges.
 * @param accept - The test of one value.
 * @param readers - Reads one element's value instead of the value source, per half.
 * @param readers.node - Reads one node's value.
 * @param readers.edge - Reads one edge's value.
 * @returns The halves.
 */
function compileValueLeaf(
    context: CompileContext,
    kind: string,
    attribute: Path,
    nodes: AttributeLeafNodes | undefined,
    accept: (value: unknown) => boolean,
    readers: { readonly node?: (index: number) => unknown; readonly edge?: (index: number) => unknown } = {},
): CompiledHalves {
    const { graph } = context;
    const values = valuesOf(context, kind);
    const mark = markFor(context, attribute);
    const readNode = readers.node ?? ((index: number): unknown => values.nodeValue(index, attribute));
    const readEdge = readers.edge ?? ((index: number): unknown => values.edgeValue(index, attribute));
    const known = values.halvesOf?.(attribute);
    const onNodes = known?.node ?? carries(graph.nodeCount, readNode);
    const onEdges = known?.edge ?? carries(graph.edgeCount, readEdge);
    const test =
        (read: (index: number) => unknown): ElementTest =>
        (index) =>
            accept(readValue(read, index, attribute, mark));

    let node = onNodes || !onEdges ? test(readNode) : null;
    const edge = onEdges ? test(readEdge) : null;

    if (nodes === "ends" && edge !== null) {
        const list = graph.edgeList();
        const ends = new Uint8Array(graph.nodeCount);

        for (let index = 0; index < graph.edgeCount; index++) {
            if (edge(index)) {
                ends[list.src[index]] = 1;
                ends[list.dst[index]] = 1;
            }
        }

        const own = node;
        node = (index) => ends[index] === 1 && (own === null || own(index));
    } else if (nodes === "none") {
        node = () => false;
    }

    return { node, edge };
}

/**
 * A test over a node's degree in the WHOLE graph.
 * @param context - The compile context.
 * @param min - The lower bound, inclusive; unbounded when absent.
 * @param max - The upper bound, inclusive; unbounded when absent.
 * @param direction - Which arcs to count; both when absent.
 * @returns The test.
 */
function degreeTest(
    context: CompileContext,
    min: number | undefined,
    max: number | undefined,
    direction: SelectionDirection | undefined,
): ElementTest {
    const degrees = degreesOf(context, direction === "in" || direction === "out" ? direction : undefined);

    const low = min ?? Number.NEGATIVE_INFINITY;
    const high = max ?? Number.POSITIVE_INFINITY;

    return (index) => degrees[index] >= low && degrees[index] <= high;
}

/**
 * A test for the nodes with no edge to another node, in either direction: the one-node components
 * `statistics().components.isolatedCount` counts, so a node with only self-loops passes.
 * @param context - The compile context.
 * @returns The test.
 */
function isolatedTest(context: CompileContext): ElementTest {
    const { graph } = context;
    const reverse = graph.reverse();
    const alone = (rowPtr: U32, colIdx: U32, index: number): boolean => {
        for (let arc = rowPtr[index]; arc < rowPtr[index + 1]; arc++) {
            if (colIdx[arc] !== index) {
                return false;
            }
        }

        return true;
    };

    return (index) => alone(graph.rowPtr, graph.colIdx, index) && alone(reverse.rowPtr, reverse.colIdx, index);
}

/**
 * A test for the edges beyond the first between one pair of nodes, in edge order: the edges
 * `statistics().repeatedEdgeCount` counts. A pair is ordered on a directed graph and unordered on
 * an undirected one.
 * @param context - The compile context.
 * @returns The test.
 */
function repeatedEdgeTest(context: CompileContext): ElementTest {
    const { graph } = context;
    const n = graph.nodeCount;
    const repeated = new Uint8Array(graph.edgeCount);
    const seen = new Set<number>();
    for (let edge = 0; edge < graph.edgeCount; edge++) {
        const s = graph.edgeSource(edge);
        const t = graph.edgeTarget(edge);
        const pair = graph.directed || s <= t ? s * n + t : t * n + s;
        if (seen.has(pair)) {
            repeated[edge] = 1;
        } else {
            seen.add(pair);
        }
    }

    return (index) => repeated[index] === 1;
}

/**
 * A test over which connected component a node belongs to.
 * @param context - The compile context.
 * @param id - The component number.
 * @returns The test.
 * @throws A `GraphtyError` with code `E_UNSUPPORTED` when this session has no component labels.
 */
function componentTest(context: CompileContext, id: number): ElementTest {
    const { components } = context.sources;

    if (components === undefined) {
        throw unsupported("component", "the connected components");
    }

    const labels = components();

    if (id >= labels.count) {
        throw outOfRange(`This graph has ${String(labels.count)} components, so there is no component ${String(id)}.`, {
            id,
            count: labels.count,
        });
    }

    return (index) => labels.labels[index] === id;
}

/**
 * One breadth-first hop: the nodes first reached from the frontier along any of the views' arcs,
 * marked in `reached`.
 * @param frontier - The nodes reached on the last hop.
 * @param views - The adjacency to follow, in order (the graph, then its reverse).
 * @param reached - One byte per node, 1 once reached; updated in place.
 * @returns The newly reached nodes, in the order they were found.
 */
function nextHop(
    frontier: readonly number[],
    views: readonly { readonly rowPtr: ArrayLike<number>; readonly colIdx: ArrayLike<number> }[],
    reached: Uint8Array,
): number[] {
    const next: number[] = [];

    for (const node of frontier) {
        for (const view of views) {
            for (let arc = view.rowPtr[node]; arc < view.rowPtr[node + 1]; arc++) {
                const other = view.colIdx[arc];

                if (reached[other] === 0) {
                    reached[other] = 1;
                    next.push(other);
                }
            }
        }
    }

    return next;
}

/**
 * A test over the nodes within so many hops of a set of seeds.
 *
 * Hops are counted in BOTH directions even on a directed graph: a neighbourhood is what surrounds
 * a node, and a predecessor is as much a neighbour as a successor. A caller that wants only one
 * direction wants a traversal, which is an algorithm and not a filter.
 * @param context - The compile context.
 * @param seeds - The nodes to start from; ones the graph does not hold are skipped.
 * @param depth - How many hops to take. Zero keeps the seeds alone.
 * @returns The test.
 */
function neighborhoodTest(context: CompileContext, seeds: readonly NodeId[], depth: number): ElementTest {
    const { graph } = context;
    const reached = new Uint8Array(graph.nodeCount);
    let frontier: number[] = [];

    for (const id of seeds) {
        const index = rowOfEitherSpelling(graph.ids, id);

        if (index !== INVALID_INDEX && reached[index] === 0) {
            reached[index] = 1;
            frontier.push(index);
        }
    }

    const reverse = graph.reverse();

    for (let hop = 0; hop < depth && frontier.length > 0; hop++) {
        frontier = nextHop(frontier, [graph, reverse], reached);
    }

    return (index) => reached[index] === 1;
}

/** A leaf that holds nothing: its node half matches no node, and it is silent on edges. */
const NOTHING: CompiledHalves = { node: () => false, edge: null };

/**
 * A run's result, or a refusal when this session reads none.
 * @param context - The compile context.
 * @param kind - The leaf kind asking, for the message.
 * @param run - The run.
 * @returns The result, or undefined when the run has none.
 * @throws A `GraphtyError` with code `E_UNSUPPORTED` when this session has no results.
 */
function resultOf(context: CompileContext, kind: string, run: RunId): FilterRunResult | undefined {
    const { result } = context.sources;

    if (result === undefined) {
        throw unsupported(kind, "a results registry");
    }

    return result(run);
}

/**
 * The halves on which a result publishes a field per element.
 * @param result - The result.
 * @param field - The field.
 * @returns Whether nodes and edges carry it.
 */
function fieldHalves(result: FilterRunResult, field: string): { node: boolean; edge: boolean } {
    const kinds = new Set(
        result.fields.filter((descriptor) => descriptor.name === field).map((descriptor) => descriptor.kind),
    );

    return { node: kinds.has("node"), edge: kinds.has("edge") };
}

/**
 * The test over one half of an item: the element's value equals the key's, or is an array
 * holding it.
 * @param read - Reads one element's value.
 * @param wanted - The key's value.
 * @param mark - The path's mark.
 * @returns The test.
 */
function itemTest(read: (index: number) => unknown, wanted: unknown, mark: PathMark): ElementTest {
    return (index) => {
        const value = read(index);
        if (value === undefined || value === null) {
            return false;
        }

        mark.seen = true;

        return value === wanted || (Array.isArray(value) && value.includes(wanted));
    };
}

/**
 * The elements one item of a held execution holds: what its run's re-run captured, and nothing
 * when no capture was kept.
 * @param context - The compile context.
 * @param item - The item.
 * @param mark - The path's mark.
 * @returns The halves the capture holds.
 */
function heldItem(context: CompileContext, item: ResultItem, mark: PathMark): CompiledHalves {
    const held = context.sources.captured?.(item);
    if (held === undefined || (held.nodes === null && held.edges === null)) {
        return NOTHING;
    }

    mark.seen = true;
    const { nodes, edges } = held;

    return {
        node: nodes === null ? null : (index) => maskTest(nodes, index),
        edge: edges === null ? null : (index) => maskTest(edges, index),
    };
}

/**
 * The elements one item of a result holds. A run with no result, a field the result does not
 * publish per element, and a held execution that is no longer current all hold nothing.
 * @param context - The compile context.
 * @param item - The item.
 * @returns The halves the field lives on.
 */
function compileItem(context: CompileContext, item: ResultItem): CompiledHalves {
    const run = runIdOfRef(item.result) as RunId;
    const { field, value } = item.key;
    const result = resultOf(context, "item", run);
    const mark = markFor(context, `results.${run}.${field}`);

    // A held execution that is no longer current reads what its run's re-run captured, and
    // nothing when no capture was kept.
    if (item.run !== undefined && item.run !== result?.execution) {
        return heldItem(context, item, mark);
    }

    if (result === undefined) {
        return NOTHING;
    }

    const halves = fieldHalves(result, field);
    if (!halves.node && !halves.edge) {
        return NOTHING;
    }

    return {
        node: halves.node ? itemTest((index) => result.nodeValue(index, field), value, mark) : null,
        edge: halves.edge ? itemTest((index) => result.edgeValue(index, field), value, mark) : null,
    };
}

/**
 * The members of one half that pass a threshold's cut, or null when no element of the half
 * carries a finite number for the path (the half is silent). The population is the elements the
 * step's frame names, or every element outside a union.
 * @param count - The elements in the half.
 * @param read - Reads one element's value.
 * @param filter - The threshold.
 * @param mark - The path's mark.
 * @param population - The elements ranked, or null for every one.
 * @returns The members, one byte per element.
 */
function thresholdHalf(
    count: number,
    read: (index: number) => unknown,
    filter: Extract<RuleTree, { kind: "threshold" }>,
    mark: PathMark,
    population: Bytes | null,
): Uint8Array | null {
    const low = filter.from === "low";
    const ranked: { id: number; value: number }[] = [];
    const hit = new Uint8Array(count);
    for (let index = 0; index < count; index++) {
        if (population !== null && population[index] === 0) {
            continue;
        }

        const value = read(index);
        if (typeof value === "number" && Number.isFinite(value)) {
            ranked.push({ id: index, value: low ? -value : value });
        } else if (filter.missing === "include") {
            hit[index] = 1;
        }
    }

    if (ranked.length === 0) {
        return null;
    }

    mark.seen = true;
    const top = filter.percentile === undefined ? filter.top : Math.ceil((filter.percentile / 100) * ranked.length);
    if (top !== undefined) {
        for (const entry of topOfRanking(rankEntries(ranked), top, filter.ties).entries) {
            hit[entry.id as number] = 1;
        }
    } else {
        const cut = filter.above ?? Number.POSITIVE_INFINITY;
        for (const entry of ranked) {
            if (low ? -entry.value < cut : entry.value > cut) {
                hit[entry.id] = 1;
            }
        }
    }

    return hit;
}

/**
 * The elements whose value for a path passes a threshold's cut. Each half whose elements carry
 * the value is ranked on its own and speaks; when none does, the leaf holds nothing.
 * @param context - The compile context.
 * @param filter - The threshold.
 * @returns The halves.
 */
function compileThreshold(context: CompileContext, filter: Extract<RuleTree, { kind: "threshold" }>): CompiledHalves {
    const { graph } = context;
    const mark = markFor(context, filter.path);
    const { node: readNode, edge: readEdge } = pathReaders(context, filter.path, "threshold");
    const population = context.step?.population ?? { node: null, edge: null };
    const nodes = readNode === null ? null : thresholdHalf(graph.nodeCount, readNode, filter, mark, population.node);
    const edges = readEdge === null ? null : thresholdHalf(graph.edgeCount, readEdge, filter, mark, population.edge);
    if (nodes === null && edges === null) {
        return NOTHING;
    }

    return {
        node: nodes === null ? null : (index) => nodes[index] === 1,
        edge: edges === null ? null : (index) => edges[index] === 1,
    };
}

/**
 * Fold a list of tests into one, WITHOUT short-circuiting.
 *
 * Every member runs on every element even once the answer is settled, because a test that is
 * skipped never reads its attribute, and a path nothing read looks exactly like a path nothing
 * answered. Paying one extra comparison per element is the price of never telling a consumer that
 * `data.rank` is missing when it is merely redundant.
 * @param tests - The tests to fold; the null ones are dropped.
 * @param mode - Whether every test must pass or only one.
 * @returns The folded test, or null when no test had anything to say.
 */
function fold(tests: readonly (ElementTest | null)[], mode: "all" | "any"): ElementTest | null {
    const active = tests.filter((test): test is ElementTest => test !== null);

    if (active.length === 0) {
        return null;
    }

    if (active.length === 1) {
        return active[0];
    }

    if (mode === "all") {
        return (index) => {
            let passed = true;

            for (const test of active) {
                if (!test(index)) {
                    passed = false;
                }
            }

            return passed;
        };
    }

    return (index) => {
        let passed = false;

        for (const test of active) {
            if (test(index)) {
                passed = true;
            }
        }

        return passed;
    };
}

/**
 * A state leaf's two halves.
 * @param context - The compile context.
 * @param state - The state.
 * @returns The halves.
 * @throws A `GraphtyError` with code `E_UNSUPPORTED` when nothing here follows the reader.
 */
function stateTests(context: CompileContext, state: ElementState): CompiledHalves {
    const { inState } = context.sources;
    if (inState === undefined) {
        throw unsupported("state", "a view that follows the reader");
    }

    return {
        node: (index) => inState(state, "node", index),
        edge: (index) => inState(state, "edge", index),
    };
}

/**
 * Compile one filter into its node half and its edge half.
 * @param filter - The filter.
 * @param context - The compile context.
 * @returns The two halves, either of which may be null.
 * @throws A `GraphtyError` when the filter needs a capability this session does not have.
 */
function compileOne(filter: RuleTree, context: CompileContext): CompiledHalves {
    switch (filter.kind) {
        case "expression":
            return { node: expressionTest(context, filter.where), edge: null };
        case "range":
        case "categories":
            return compileAttribute(context, filter);
        case "degree":
            return { node: degreeTest(context, filter.min, filter.max, filter.direction), edge: null };
        case "component":
            return { node: componentTest(context, filter.id), edge: null };
        case "neighborhood":
            return { node: neighborhoodTest(context, filter.seeds, filter.depth), edge: null };
        case "isolated":
            return { node: isolatedTest(context), edge: null };
        case "self-loop":
            return { node: null, edge: (index) => context.graph.edgeSource(index) === context.graph.edgeTarget(index) };
        case "repeated-edge":
            return { node: null, edge: repeatedEdgeTest(context) };
        case "edges":
            return { node: null, edge: edgeQueryTest(context, filter.where) };
        case "source":
            return sourceTests(context, filter.sources, filter.side);
        case "state":
            return stateTests(context, filter.state);
        case "member":
            return compileMember(context, filter.of);
        case "item":
            return compileItem(context, filter.item);
        case "threshold":
            return compileThreshold(context, filter);
        case "text":
            return compileText(context, filter);
        case "union": {
            const { painted } = readUnionIn(context, filter);
            const test = (index: number): boolean => painted[index] === 1;

            return filter.side === "nodes" ? { node: test, edge: null } : { node: null, edge: test };
        }
        case "hops": {
            const base = baseOf(context);
            const reached = hopsFrom(
                context.graph,
                referenceBytes(context, filter.of),
                filter.max,
                filter.direction,
                base,
            );
            return { node: (index) => reached[index] === 1, edge: null };
        }
        case "touching":
            return {
                node: null,
                edge: touchingTest(
                    context.graph,
                    referenceBytes(context, filter.of),
                    filter.ends,
                    baseOf(context)?.edge,
                ),
            };
        case "nonempty": {
            const held = countOf(referenceBytes(context, filter.of)) > 0;
            return { node: () => held, edge: () => held };
        }
        case "same-value":
            return compileSameValue(context, filter.path, filter.as);
        case "by-size":
            return compileBySize(context, filter);
        case "measure":
            return compileMeasure(context, filter);
        case "all":
        case "any":
            return compileGroup(context, filter);
        default: {
            const { node, edge } = compileOne(filter.of, context);

            return {
                node: node === null ? null : (index) => !node(index),
                edge: edge === null ? null : (index) => !edge(index),
            };
        }
    }
}

/**
 * Compile a "member" leaf: the elements a scope holds.
 * @param context - The compile context.
 * @param of - The scope the leaf names.
 * @returns Its halves.
 * @throws A `GraphtyError` when this session has no scope resolver.
 */
function compileMember(context: CompileContext, of: Extract<RuleTree, { kind: "member" }>["of"]): CompiledHalves {
    if (context.sources.scope === undefined) {
        throw unsupported("member", "a scope resolver");
    }

    const leaf = context.sources.scope(of);
    const { edges } = leaf;

    return {
        node: (index) => maskTest(leaf.nodes, index),
        edge: edges === null ? null : (index) => maskTest(edges, index),
    };
}

/**
 * Compile an "all" or "any" group, or a source-scoped rule.
 * @param context - The compile context.
 * @param filter - The group.
 * @returns Its halves.
 */
function compileGroup(context: CompileContext, filter: Extract<RuleTree, { kind: "all" | "any" }>): CompiledHalves {
    if (isSourceScoped(filter)) {
        return compileSourceScoped(context, filter);
    }

    const members = filter.of.map((member) => compileOne(member, context));

    return {
        node: fold(
            members.map((member) => member.node),
            filter.kind,
        ),
        edge: fold(
            members.map((member) => member.edge),
            filter.kind,
        ),
    };
}

/**
 * A rule that judges only some loads' elements (a filter condition's `source`): theirs answer as
 * its rule does, every other element answers `outside`. A half the rule is silent about stays
 * silent, so a node rule never touches an edge.
 * @param context - The compile context.
 * @param scoped - The scoped rule.
 * @returns Its halves.
 */
function compileSourceScoped(context: CompileContext, scoped: SourceScopedRule): CompiledHalves {
    const inner = compileOne(scoped.of[0], context);
    const within = sourceTests(context, scoped.withinSources, undefined);
    const { outside } = scoped;
    const half = (test: ElementTest | null, mine: ElementTest | null): ElementTest | null =>
        test === null || mine === null ? test : (index) => (mine(index) ? test(index) : outside);

    return { node: half(inner.node, within.node), edge: half(inner.edge, within.edge) };
}

/**
 * The nodes a step's reference holds now, one byte per node. An absent reference holds none (the
 * step is inert before it is compiled).
 * @param context - The compile context.
 * @param reference - The reference.
 * @returns The nodes.
 * @throws A `GraphtyError` with code `E_UNSUPPORTED` when this session cannot resolve it.
 */
function referenceBytes(context: CompileContext, reference: StepReference | undefined): Bytes {
    const { graph, sources } = context;
    if (reference === undefined) {
        return new Uint8Array(graph.nodeCount);
    }

    if (reference === "so-far") {
        if (context.step === undefined) {
            throw malformed('"so-far" names a step\'s input, so it is valid only inside a "union" step.', {
                reason: "reference-outside-union",
            });
        }

        return context.step.soFar;
    }

    if (reference === "hovered-or-selected") {
        if (sources.focus === undefined) {
            throw unsupported("hovered-or-selected", "a view that reports the pointer and the selection");
        }

        const nodes = new Uint8Array(graph.nodeCount);
        const id = sources.focus();
        const index = id === null ? INVALID_INDEX : rowOfEitherSpelling(graph.ids, id);
        if (index !== INVALID_INDEX) {
            nodes[index] = 1;
        }

        return nodes;
    }

    if (sources.scope === undefined) {
        throw unsupported("reference", "a scope resolver");
    }

    const { nodes } = sources.scope(reference);
    return bytesOf((index) => maskTest(nodes, index), graph.nodeCount);
}

/**
 * What {@link readUnion} reads, over a compile context: the base from the scope resolver, each
 * step compiled in its frame by this compiler.
 * @param context - The compile context.
 * @param leaf - The leaf read.
 * @returns The environment.
 */
function unionEnvOf(context: CompileContext, leaf: UnionLeaf): UnionEnv {
    const { graph, sources } = context;
    const wholeOrVisible = (within: UnionLeaf["within"]): { node: Bytes; edge: Bytes } => {
        if (within === "graph") {
            return { node: new Uint8Array(graph.nodeCount).fill(1), edge: new Uint8Array(graph.edgeCount).fill(1) };
        }

        if (sources.scope === undefined) {
            throw unsupported("union", "a scope resolver");
        }

        const leaf = sources.scope("visible");
        const node = bytesOf((index) => maskTest(leaf.nodes, index), graph.nodeCount);
        const { src, dst } = graph.edgeList();
        const { edges } = leaf;
        const edge = bytesOf(
            edges === null
                ? (index) => node[src[index]] === 1 && node[dst[index]] === 1
                : (index) => maskTest(edges, index),
            graph.edgeCount,
        );

        return { node, edge };
    };
    // A leaf narrowed to some loads starts from theirs.
    const mine = leaf.sources === undefined ? null : sourceTests(context, leaf.sources, undefined);
    const narrow = (halves: { node: Bytes; edge: Bytes }): { node: Bytes; edge: Bytes } => {
        const node = mine?.node ?? null;
        const edge = mine?.edge ?? null;
        if (node === null || edge === null) {
            return halves;
        }

        return {
            node: bytesOf((index) => halves.node[index] === 1 && node(index), graph.nodeCount),
            edge: bytesOf((index) => halves.edge[index] === 1 && edge(index), graph.edgeCount),
        };
    };

    return {
        graph,
        base: (within) => narrow(wholeOrVisible(within)),
        compile: (tree, frame) => compileOne(tree, { ...context, step: frame }),
        reference: (reference) => referenceBytes(context, reference),
        ...(sources.steps === undefined ? {} : { gate: sources.steps.gate }),
        held: (branch) => heldBranches.get(leaf)?.get(branch),
    };
}

/**
 * Read a union leaf in a compile context.
 * @param context - The compile context.
 * @param leaf - The leaf.
 * @returns The reading.
 */
function readUnionIn(context: CompileContext, leaf: UnionLeaf): UnionRead {
    const read = readUnion(leaf, unionEnvOf(context, leaf));
    const held = heldBranches.get(leaf) ?? new Map<string, Bytes>();
    for (const branch of read.branches) {
        if (branch.state === "ready" && branch.id !== undefined) {
            held.set(branch.id, branch.members);
        }
    }

    heldBranches.set(leaf, held);
    return read;
}

/**
 * Each stored union leaf's branches' last ready members, so a branch that waits on a run is drawn
 * as it last was rather than flickering off. Keyed by the leaf object a layer or a filter holds.
 */
const heldBranches = new WeakMap<UnionLeaf, Map<string, Bytes>>();

/**
 * Read a union leaf over a snapshot: every branch and step, as `session.scope.watchSteps` reports
 * them. The leaf is already validated.
 * @param graph - The snapshot.
 * @param leaf - The leaf.
 * @param sources - Where to read what the compiler cannot compute.
 * @returns The reading.
 */
export function readUnionLeaf(graph: GraphSnapshot, leaf: UnionLeaf, sources: FilterSources): UnionRead {
    return readUnionIn({ graph, sources, marks: new Map<Path, PathMark>(), unresolvedQueries: new Set<Path>() }, leaf);
}

/**
 * The readers of one value path over a snapshot, on each half that carries it: a run's field, a
 * structure value (`graphty.degree`), or a data column. Null for a half that carries nothing.
 * @param graph - The snapshot.
 * @param path - The path.
 * @param sources - Where values are read.
 * @param baseEdges - The edges a structure value is counted over; every edge when absent.
 * @returns The readers.
 */
export function readersOf(
    graph: GraphSnapshot,
    path: Path,
    sources: FilterSources,
    baseEdges?: Bytes,
): ReturnType<typeof pathReaders> {
    return pathReaders(
        {
            graph,
            sources,
            marks: new Map<Path, PathMark>(),
            unresolvedQueries: new Set<Path>(),
            ...(baseEdges === undefined ? {} : { baseEdges }),
        },
        path,
        "histogram",
    );
}

/**
 * The text a value is compared by in a category or a same-value test; a list gives each item's.
 * @param value - The value.
 * @returns The texts, none for a value that is not measured.
 */
function textsOf(value: unknown): string[] {
    if (Array.isArray(value)) {
        return (value as readonly unknown[]).flatMap(textsOf);
    }

    return isMeasured(value) && isScalar(value) ? [String(value)] : [];
}

/**
 * Whether a value is a string, a number or a boolean: what a category reads as text.
 * @param value - The value.
 * @returns True for a scalar.
 */
function isScalar(value: unknown): value is string | number | boolean {
    return typeof value === "string" || typeof value === "number" || typeof value === "boolean";
}

/**
 * The elements whose value for a path equals, or (a list) shares, a value a reference node holds.
 * @param context - The compile context.
 * @param path - The value path.
 * @param reference - The reference.
 * @returns The halves that carry the path.
 */
function compileSameValue(context: CompileContext, path: Path, reference: StepReference | undefined): CompiledHalves {
    const readers = pathReaders(context, path, "same-value");
    const nodes = referenceBytes(context, reference);
    const wanted = new Set<string>();
    if (readers.node !== null) {
        for (let index = 0; index < nodes.length; index++) {
            if (nodes[index] === 1) {
                for (const text of textsOf(readers.node(index))) {
                    wanted.add(text);
                }
            }
        }
    }

    const test =
        (read: (index: number) => unknown): ElementTest =>
        (index) =>
            textsOf(read(index)).some((text) => wanted.has(text));

    return {
        node: readers.node === null ? null : test(readers.node),
        edge: readers.edge === null ? null : test(readers.edge),
    };
}

/**
 * The members of one half whose category passes a `by-size` cut, counted over the population.
 * @param count - The elements in the half.
 * @param read - Reads one element's value.
 * @param leaf - The cut.
 * @param population - The elements counted, or null for every one.
 * @returns The members.
 */
function bySizeHalf(
    count: number,
    read: (index: number) => unknown,
    leaf: Extract<RuleTree, { kind: "by-size" }>,
    population: Bytes | null,
): Bytes {
    const sizes = new Map<string, number>();
    const categoryOf: (string | undefined)[] = [];
    for (let index = 0; index < count; index++) {
        const value = read(index);
        const category = isMeasured(value) && isScalar(value) ? String(value) : undefined;
        categoryOf.push(category);
        if (category !== undefined && (population === null || population[index] === 1)) {
            sizes.set(category, (sizes.get(category) ?? 0) + 1);
        }
    }

    const passing = new Set<string>();
    if (leaf.top === undefined) {
        const low = leaf.min ?? Number.NEGATIVE_INFINITY;
        const high = leaf.max ?? Number.POSITIVE_INFINITY;
        for (const [category, size] of sizes) {
            if (size >= low && size <= high) {
                passing.add(category);
            }
        }
    } else {
        const names = [...sizes.keys()];
        const sign = leaf.from === "low" ? -1 : 1;
        const ranking = rankEntries(names.map((name, at) => ({ id: at, value: sign * (sizes.get(name) ?? 0) })));
        for (const entry of topOfRanking(ranking, leaf.top, leaf.ties).entries) {
            passing.add(names[entry.id as number]);
        }
    }

    return bytesOf((index) => {
        const category = categoryOf[index];
        return category !== undefined && (population === null || population[index] === 1) && passing.has(category);
    }, count);
}

/**
 * A `by-size` leaf on each half that carries its path.
 * @param context - The compile context.
 * @param leaf - The leaf.
 * @returns The halves.
 */
function compileBySize(context: CompileContext, leaf: Extract<RuleTree, { kind: "by-size" }>): CompiledHalves {
    const { graph } = context;
    const readers = pathReaders(context, leaf.path, "by-size");
    const population = context.step?.population ?? { node: null, edge: null };
    const half = (
        read: ((index: number) => unknown) | null,
        count: number,
        members: Bytes | null,
    ): ElementTest | null => {
        if (read === null) {
            return null;
        }

        const hit = bySizeHalf(count, read, leaf, members);
        return (index) => hit[index] === 1;
    };

    return {
        node: half(readers.node, graph.nodeCount, population.node),
        edge: half(readers.edge, graph.edgeCount, population.edge),
    };
}

/** The run id a `measure` leaf's test reads its result under, inside the compiler only. */
const MEASURE_RUN = "graphty:measure";

/**
 * A `measure` leaf: its test put to the field of the result the session holds for its algorithm,
 * params and base. The test is compiled as the leaf it is the body of, over that result; with no
 * test, every element the field measures passes.
 * @param context - The compile context.
 * @param leaf - The leaf.
 * @returns The halves the field lives on; nothing while the result is missing.
 * @throws A `GraphtyError` with code `E_UNSUPPORTED` when this session runs no algorithms for steps.
 */
function compileMeasure(context: CompileContext, leaf: Extract<RuleTree, { kind: "measure" }>): CompiledHalves {
    const { steps } = context.sources;
    if (steps === undefined || context.step === undefined) {
        throw unsupported("measure", "a runs registry for union steps");
    }

    const result = steps.result(leaf, context.step);
    if (result === undefined) {
        return NOTHING;
    }

    const path = `results.${MEASURE_RUN}.${leaf.field}`;
    const inner: CompileContext = {
        ...context,
        sources: {
            ...context.sources,
            result: (run) => (run === MEASURE_RUN ? result : context.sources.result?.(run)),
        },
    };
    if (leaf.test === undefined) {
        // No test: every element the field holds a measured value for.
        const readers = pathReaders(inner, path, "measure");
        const half = (read: ((index: number) => unknown) | null): ElementTest | null =>
            read === null ? null : (index) => isMeasured(read(index));
        return { node: half(readers.node), edge: half(readers.edge) };
    }

    const test = leaf.test as unknown as Readonly<Record<string, unknown>> & { readonly kind: string };
    switch (test.kind) {
        case "range":
        case "categories":
        case "text":
            return measureValueLeaf(inner, path, { ...test, attribute: path, reads: path } as RuleTree);
        default:
            return compileOne({ ...test, path } as RuleTree, inner);
    }
}

/**
 * A measure's range, categories or text test, read from the result on each half that carries it.
 * @param context - The compile context, whose result source holds the measure's result.
 * @param path - The measure's result path.
 * @param leaf - The test as a leaf on that path.
 * @returns The halves.
 */
function measureValueLeaf(context: CompileContext, path: Path, leaf: RuleTree): CompiledHalves {
    let accept: (value: unknown) => boolean;
    if (leaf.kind === "range") {
        accept = inRange(leaf.min, leaf.max);
    } else if (leaf.kind === "categories") {
        accept = leaf.match === undefined ? inCategories(leaf.values) : inList(leaf.values, leaf.match);
    } else if (leaf.kind === "text") {
        const matches = textMatcher(leaf.text, leaf.mode, leaf.caseSensitive === true ? null : normalizeText);
        accept = (value) => textsOf(value).some((text) => matches(text));
    } else {
        return NOTHING;
    }

    if ((leaf as { missing?: string }).missing === "include") {
        const measured = accept;
        accept = (value) => !isMeasured(value) || measured(value);
    }

    const readers = pathReaders(context, path, leaf.kind);
    const half = (read: ((index: number) => unknown) | null): ElementTest | null =>
        read === null ? null : (index) => accept(read(index));

    return { node: half(readers.node), edge: half(readers.edge) };
}

/**
 * Compile a rule tree into its two halves, for a rule set: the same compiler the visibility
 * filter runs, so a rule and a filter can never disagree. The tree is already validated.
 * @param graph - The snapshot every test is written against.
 * @param filter - The tree.
 * @param sources - Where to read what the compiler cannot compute.
 * @returns The node test and the edge test, either null when the tree is silent about it.
 * @throws A `GraphtyError` when the tree needs a capability the sources lack.
 */
export function compileFilter(graph: GraphSnapshot, filter: RuleTree, sources: FilterSources): CompiledHalves {
    return compileOne(filter, { graph, sources, marks: new Map<Path, PathMark>(), unresolvedQueries: new Set<Path>() });
}

/**
 * A window's bounds as instants: an unreadable bound leaves that side open.
 * @param window - The window.
 * @param sources - Where a designated column's zone is read.
 * @returns `[from, to)`.
 */
export function windowBounds(window: TimeWindow, sources: FilterSources): readonly [number, number] {
    const zone = sources.boundZone?.(window.attribute);
    const boundOf = (bound: number | string): number | null =>
        zone === undefined || typeof bound === "number" ? instantOf(bound) : numericBound(bound, zone);

    return [boundOf(window.from) ?? Number.NEGATIVE_INFINITY, boundOf(window.to) ?? Number.POSITIVE_INFINITY];
}

/**
 * Whether a window reads a kind's own records: a kind no index holds that carries the column under
 * the window's name, which `compileWindow` tests like any other value.
 * @param graph - The snapshot.
 * @param window - The window.
 * @param sources - Where the values and the index are read.
 * @returns True when an index alone cannot say what the window keeps.
 */
export function windowReadsRecords(graph: GraphSnapshot, window: TimeWindow, sources: FilterSources): boolean {
    const { values } = sources;
    const indexed = windowInstants(window, sources);
    if (values === undefined) {
        return false;
    }

    const paths = windowPaths(window, sources.timeline?.() !== false);

    return (
        ((indexed?.node ?? null) === null &&
            paths.some((path) => carries(graph.nodeCount, (index) => values.nodeValue(index, path)))) ||
        ((indexed?.edge ?? null) === null &&
            paths.some((path) => carries(graph.edgeCount, (index) => values.edgeValue(index, path))))
    );
}

/**
 * The attributes a window reads of a record.
 * @param window - The window.
 * @param timeline - Whether the timeline is on: off, its `end` and `spells` stay saved, unread.
 * @returns The paths, `attribute` first.
 */
function windowPaths(window: TimeWindow, timeline: boolean): readonly Path[] {
    const { attribute, end, spells } = window;

    return timeline ? [attribute, ...[end, spells].filter((path) => path !== undefined)] : [attribute];
}

/**
 * The index a window can read: the designated column's, unless the window's end and spells differ
 * from the field's, which only its records can answer.
 * @param window - The window.
 * @param sources - Where the index is read.
 * @returns Each kind's instants, or null.
 */
export function windowInstants(window: TimeWindow, sources: FilterSources): ReturnType<WindowIndexReader> {
    const indexed = sources.instants?.(window.attribute) ?? null;
    if (indexed === null || sources.timeline?.() === false) {
        return indexed;
    }

    // A kind of spans reads the window's end and spells for each key it names, so a window naming
    // none reads instants; nodes may name only an end and edges only spells. A kind of instants
    // takes any window some kind's spans read.
    const kinds = [indexed.node?.spans, indexed.edge?.spans];
    const names = (key: "end" | "spells"): boolean =>
        window[key] === undefined || kinds.some((spans) => spans?.[key] === window[key]);
    const reads = (spans: TimeSpans | null | undefined): boolean =>
        spans === null ||
        spans === undefined ||
        ((spans.end ?? window.end) === window.end && (spans.spells ?? window.spells) === window.spells);

    return names("end") && names("spells") && kinds.every(reads) ? indexed : null;
}

/** What reads a designated column's index. */
type WindowIndexReader = NonNullable<FilterSources["instants"]>;

/**
 * One record's spans, as the index reads them: its spells, else no time with no bound, else an
 * instant with no end attribute, else one span.
 * @param window - The window.
 * @param index - The row.
 * @param read - Reads the row's value.
 * @returns The spans; none for a row with no time.
 */
function recordSpans(
    window: TimeWindow,
    index: number,
    read: (index: number, path: Path) => unknown,
): readonly (readonly [number, number])[] {
    const span = (start: number | null, end: number | null): readonly [number, number] => {
        const from = start ?? Number.NEGATIVE_INFINITY;
        return [from, spanEnd(from, end ?? Number.POSITIVE_INFINITY)];
    };
    const pairs = window.spells === undefined ? [] : spellPairs(read(index, window.spells));
    if (pairs.length > 0) {
        return pairs.flatMap(([start, end]) => {
            const [from, to] = [instantOf(start), instantOf(end)];
            return from === null && to === null ? [] : [span(from, to)];
        });
    }

    const start = instantOf(read(index, window.attribute));
    if (window.end === undefined) {
        return start === null ? [] : [span(start, start)];
    }

    const end = instantOf(read(index, window.end));

    return start === null && end === null ? [] : [span(start, end)];
}

/**
 * Whether any of a row's spans overlaps a window.
 * @param spans - The kind's spans.
 * @param index - The row.
 * @param from - The window's start.
 * @param to - The window's end.
 * @returns The answer, or null for a row with no spans.
 */
function spansInside(spans: TimeSpans, index: number, from: number, to: number): boolean | null {
    const { starts, ends, first } = spans;
    for (let at = first[index]; at < first[index + 1]; at++) {
        if (starts[at] < to && ends[at] > from) {
            return true;
        }
    }

    return first[index] === first[index + 1] ? null : false;
}

/**
 * Compile a time window into its node half and its edge half.
 *
 * Both halves read the SAME attribute path and share one mark, so a window on `data.timestamp`
 * that only the edges answer does not report the path as unresolved.
 * @param window - The window.
 * @param context - The compile context.
 * @param filterEdge - The filter's edge test, which an edge passes too before it counts for
 *     `nodes: "ends"`; null when the filter says nothing of edges.
 * @returns The two halves.
 * @throws A `GraphtyError` with code `E_UNSUPPORTED` when this session cannot read attributes.
 */
function compileWindow(window: TimeWindow, context: CompileContext, filterEdge: ElementTest | null): CompiledHalves {
    const values = valuesOf(context, "window");
    const { graph } = context;
    const mark = markFor(context, window.attribute);
    const [from, to] = windowBounds(window, context.sources);
    // With the timeline off a saved window's options stay saved and are not applied.
    const timeline = context.sources.timeline?.() !== false;
    const missingInside = !timeline || window.missing !== "outside";
    const holdsInstants = context.sources.holdsInstants?.(window) ?? timeline;
    const indexed = holdsInstants ? windowInstants(window, context.sources) : null;
    const paths = windowPaths(window, timeline);

    /**
     * The test of one kind: whether its instant falls inside the half-open window. An element
     * with no place on the timeline is kept unless the window says `missing: "outside"`.
     * @param parsed - The kind's instants when the column is designated, else null.
     * @param count - How many elements of the kind.
     * @param read - Reads one element's value, for a column that is not designated.
     * @returns The test, or null when the kind carries no value: the window says nothing of it.
     */
    const half = (
        parsed: TimeInstants | null,
        count: number,
        read: (index: number, path: Path) => unknown,
    ): ElementTest | null => {
        const inside = (instant: number | null): boolean =>
            instant === null ? missingInside : instant >= from && instant < to;

        if (parsed !== null) {
            if (parsed.timed === 0) {
                return null;
            }

            mark.seen = true;
            const { rows, spans } = parsed;
            if (spans !== null && spans !== undefined) {
                return (index) => spansInside(spans, index, from, to) ?? missingInside;
            }

            return (index) => inside(Number.isNaN(rows[index]) ? null : rows[index]);
        }

        if (!missingInside && !paths.some((path) => carries(count, (index) => read(index, path)))) {
            return null;
        }

        // Each kind reads only the end and spells it carries, so one kind's columns never time the other.
        const own = (path: Path | undefined): Path | undefined =>
            path !== undefined && paths.includes(path) && carries(count, (index) => read(index, path))
                ? path
                : undefined;
        const kindWindow: TimeWindow = { ...window, end: own(window.end), spells: own(window.spells) };
        if (kindWindow.end !== undefined || kindWindow.spells !== undefined) {
            const noted = (index: number, path: Path): unknown => readValue(read, index, path, mark);

            return (index) => {
                const held = recordSpans(kindWindow, index, noted);
                return held.length === 0 ? missingInside : held.some(([start, end]) => start < to && end > from);
            };
        }

        return (index) => inside(instantOf(readValue(read, index, window.attribute, mark)));
    };

    const edge = half(indexed?.edge ?? null, graph.edgeCount, (index, path) => values.edgeValue(index, path));
    let node = half(indexed?.node ?? null, graph.nodeCount, (index, path) => values.nodeValue(index, path));

    if (timeline && window.nodes === "ends") {
        const list = graph.edgeList();
        const ends = new Uint8Array(graph.nodeCount);
        // Saying nothing of edges leaves each with no time, which passes only under "inside".
        const counted = edge ?? ((): boolean => missingInside);
        for (let index = 0; index < graph.edgeCount; index++) {
            if (counted(index) && (filterEdge === null || filterEdge(index))) {
                ends[list.src[index]] = 1;
                ends[list.dst[index]] = 1;
            }
        }

        const own = node;
        node = (index) => ends[index] === 1 && (own === null || own(index));
    }

    return { node, edge };
}

/**
 * A test that answers each row once: a filter under a window, whose answers a slide reads again.
 * @param test - The test, or null.
 * @param count - How many rows.
 * @returns The same test, remembering.
 */
function remembered(test: ElementTest | null, count: number): ElementTest | null {
    if (test === null) {
        return null;
    }

    slideCounters.filterReads++;
    const answers = new Uint8Array(count);

    return (index) => {
        if (answers[index] === 0) {
            answers[index] = test(index) ? 1 : 2;
        }

        return answers[index] === 1;
    };
}

/**
 * Turn a filter and a time window into the two tests a pass runs.
 *
 * They are compiled TOGETHER and folded into one pair of tests, because they are two producers of
 * one visibility model rather than two systems that happen to run one after the other. An element
 * is visible when it passes both; either one on its own behaves exactly as it does with the other
 * set, and clearing one leaves the other's answer standing.
 *
 * The compilation itself does the work that cannot be done per element -- materialising a query's
 * matches, walking a neighbourhood, reading the degree view -- so it is O(n + m) before the pass
 * even starts, and it happens once per pass rather than once per element.
 * @param graph - The snapshot every test is written against.
 * @param filter - The filter, or null for none.
 * @param window - The time window, or null for none.
 * @param sources - Where to read what the compiler cannot compute.
 * @returns The compiled tests, and the door to the unresolved paths once a pass has run.
 * @throws A `GraphtyError` when either is malformed or needs a capability this session lacks.
 */
export function compileVisibility(
    graph: GraphSnapshot,
    filter: RuleTree | null,
    window: TimeWindow | null,
    sources: FilterSources,
): CompiledVisibility {
    assertVisibility(filter, window);

    const context: CompileContext = {
        graph,
        sources,
        marks: new Map<Path, PathMark>(),
        unresolvedQueries: new Set<Path>(),
    };

    const halves: CompiledHalves[] = [];
    const compiledFilter = filter === null ? null : compileOne(filter, context);
    // Only a slide reads the answers again, so with the timeline off a pass runs the tests as they are.
    const filtering =
        window === null || compiledFilter === null || sources.timeline?.() !== true
            ? compiledFilter
            : {
                  node: remembered(compiledFilter.node, graph.nodeCount),
                  edge: remembered(compiledFilter.edge, graph.edgeCount),
              };

    if (filtering !== null) {
        halves.push(filtering);
    }

    const filterPaths = [...context.marks.keys()];
    const unresolved = (paths: Iterable<Path>): readonly Path[] => {
        const found = new Set(context.unresolvedQueries);

        for (const path of paths) {
            if (context.marks.get(path)?.seen === false) {
                found.add(path);
            }
        }

        return Object.freeze([...found]);
    };

    if (window !== null) {
        halves.push(compileWindow(window, context, filtering?.edge ?? null));
    }

    const folded =
        halves.length === 0
            ? SILENT
            : {
                  node: fold(
                      halves.map((half) => half.node),
                      "all",
                  ),
                  edge: fold(
                      halves.map((half) => half.edge),
                      "all",
                  ),
              };

    return {
        node: folded.node,
        edge: folded.edge,
        unresolvedPaths: () => unresolved(context.marks.keys()),
        filter:
            filtering === null
                ? null
                : { node: filtering.node, edge: filtering.edge, unresolvedPaths: () => unresolved(filterPaths) },
    };
}

// ---------------------------------------------------------------------------------------------
// The pass
// ---------------------------------------------------------------------------------------------

/** How many elements one chunk of a pass covers before the clock is consulted. */
const CHUNK = 4096;

/** How long a pass may hold the thread before it yields, in milliseconds. */
const SLICE_MS = 8;

/** Everything one pass of the compiled tests writes into. */
export interface VisibilityPass {
    /** The snapshot the tests were compiled against. */
    readonly graph: GraphSnapshot;
    /** The compiled tests. */
    readonly compiled: CompiledVisibility;
    /** The node mask to fill, already grown to the snapshot's node count and empty. */
    readonly nodes: ElementMask<NodeId>;
    /** The edge mask to fill, already grown to the snapshot's edge count and empty. */
    readonly edges: ElementMask<EdgeId>;
}

/**
 * Put the nodes that pass the test into the node mask.
 * @param pass - What to fill and what to fill it from.
 * @param from - The first node index to look at.
 * @param to - One past the last node index to look at.
 */
function fillNodes(pass: VisibilityPass, from: number, to: number): void {
    const test = pass.compiled.node;

    for (let index = from; index < to; index++) {
        if (test === null || test(index)) {
            pass.nodes.add(index);
        }
    }
}

/**
 * Put the edges that pass the test, and whose endpoints are both visible, into the edge mask.
 *
 * The endpoint check comes FIRST and is not optional: an edge whose source or target is hidden is
 * hidden whatever the edge test says. The node mask must therefore be complete before this runs.
 * @param pass - What to fill and what to fill it from.
 * @param from - The first edge index to look at.
 * @param to - One past the last edge index to look at.
 */
function fillEdges(pass: VisibilityPass, from: number, to: number): void {
    const test = pass.compiled.edge;
    const list = pass.graph.edgeList();

    for (let index = from; index < to; index++) {
        if (!pass.nodes.has(list.src[index]) || !pass.nodes.has(list.dst[index])) {
            continue;
        }

        if (test === null || test(index)) {
            pass.edges.add(index);
        }
    }
}

/**
 * Run the whole pass at once.
 *
 * Synchronous on purpose, for the case that cannot await: the graph moved under a filter that is
 * already applied, and every reader of the masks -- a status bar, the scope resolver, a run about
 * to start -- needs the answer for the graph as it now stands rather than the answer for the
 * graph as it was. A stale mask is worse than a slow one: it hides nodes that no longer exist and
 * shows none of the ones that just arrived.
 * @param pass - What to fill and what to fill it from.
 */
export function runPass(pass: VisibilityPass): void {
    fillNodes(pass, 0, pass.graph.nodeCount);
    fillEdges(pass, 0, pass.graph.edgeCount);
}

/**
 * Run the pass in slices, reporting progress and stopping when told to.
 *
 * It yields a MACROTASK rather than a microtask whenever a slice has held the thread for longer
 * than {@link SLICE_MS}. A microtask would let the progress callback fire while starving the event
 * loop -- so the bar would move, the frame would never paint, and the Cancel button's click
 * handler would not run until the walk it was meant to stop had finished.
 * @param pass - What to fill and what to fill it from.
 * @param signal - Aborted when the caller cancels; the pass throws the signal's reason.
 * @param report - Called with how many of the elements have been looked at.
 * @returns Nothing, once every element has been looked at.
 * @throws The abort signal's reason when the pass is cancelled part way through.
 */
export async function runPassInSlices(
    pass: VisibilityPass,
    signal: AbortSignal,
    report: (completed: number, total: number) => void,
): Promise<void> {
    const { nodeCount } = pass.graph;
    const { edgeCount } = pass.graph;
    const total = nodeCount + edgeCount;
    let deadline = performance.now() + SLICE_MS;

    /**
     * Give the event loop a turn when this slice has held the thread long enough.
     * @param completed - How many elements have been looked at.
     * @returns Nothing, once the thread has been given back.
     */
    const breathe = async (completed: number): Promise<void> => {
        if (performance.now() < deadline) {
            return;
        }

        report(completed, total);
        await new Promise<void>((resume) => {
            setTimeout(resume, 0);
        });

        if (signal.aborted) {
            throw signal.reason as Error; // NOSONAR(S3696): rethrows the abort signal's reason, as the platform does
        }

        deadline = performance.now() + SLICE_MS;
    };

    if (signal.aborted) {
        throw signal.reason as Error; // NOSONAR(S3696): rethrows the abort signal's reason, as the platform does
    }

    for (let from = 0; from < nodeCount; from += CHUNK) {
        const to = Math.min(from + CHUNK, nodeCount);
        fillNodes(pass, from, to);
        await breathe(to);
    }

    for (let from = 0; from < edgeCount; from += CHUNK) {
        const to = Math.min(from + CHUNK, edgeCount);
        fillEdges(pass, from, to);
        await breathe(nodeCount + to);
    }

    report(total, total);
}
