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

import { type GraphSnapshot, INVALID_INDEX, type U32 } from "@graphty/graph-format";

import type { EdgeId, NodeId, Path, Query } from "../../catalog/types";
import { GraphtyError } from "../../errors";
import { type ComponentLabels, edgeSpaceOf,type ElementMask } from "../scope/index";

// ---------------------------------------------------------------------------------------------
// What a consumer asks for
// ---------------------------------------------------------------------------------------------

/** Which arcs a degree filter counts. */
export type FilterDirection = "in" | "out" | "all";

/**
 * What to keep.
 *
 * Ten kinds, of which eight speak about nodes, one (`edges`) speaks about edges, and three
 * (`all`, `any`, `not`) combine the others. A group with no members constrains nothing: an empty
 * list in a form means "nothing chosen", not "nothing allowed", and a filter builder that blanked
 * the graph the moment its last chip was removed would be unusable.
 */
export type Filter =
    | { readonly kind: "expression"; readonly where: Query }
    | { readonly kind: "range"; readonly attribute: Path; readonly min?: number; readonly max?: number }
    | { readonly kind: "categories"; readonly attribute: Path; readonly values: readonly string[] }
    | {
          readonly kind: "degree";
          readonly min?: number;
          readonly max?: number;
          readonly direction?: FilterDirection;
      }
    | { readonly kind: "component"; readonly id: number }
    | { readonly kind: "neighborhood"; readonly seeds: readonly NodeId[]; readonly depth: number }
    | { readonly kind: "edges"; readonly where: Query }
    | { readonly kind: "all"; readonly of: readonly Filter[] }
    | { readonly kind: "any"; readonly of: readonly Filter[] }
    | { readonly kind: "not"; readonly of: Filter };

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
    /** The first instant inside the window: a number, or a string `Date.parse` understands. */
    readonly from: number | string;
    /** The first instant past the window, in the same form as `from`. */
    readonly to: number | string;
    /** How far a caller advancing the window moves it. Carried, not applied. */
    readonly step?: TimeStep;
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
    "edges",
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
 * Check one filter is a filter, all the way down, without touching the graph.
 *
 * Separate from compiling it so that a malformed filter is refused at the call that offered it
 * rather than inside the run it started: a form can show the mistake where it was typed, and a
 * caller never gets a `Run` that was doomed before it was queued.
 * @param filter - The filter to check.
 * @throws A `GraphtyError` when any part of it is not a filter.
 */
function assertFilter(filter: Filter): void {
    if (typeof filter !== "object" || filter === null || typeof filter.kind !== "string") {
        throw malformed(`A filter is an object with a "kind" of ${FILTER_KINDS.join(", ")}.`, { filter });
    }

    // Kept beside the switch, and typed as a plain string, so the refusal below can name a kind
    // the union does not contain -- which is exactly the case a runtime check exists for.
    const {kind} = filter;

    switch (filter.kind) {
        case "expression":
        case "edges":
            assertQuery(filter.where, filter.kind);

            return;
        case "range":
            assertPath(filter.attribute, filter.kind);
            assertBounds(filter.min, filter.max, filter.kind);

            return;
        case "categories":
            assertPath(filter.attribute, filter.kind);

            if (!Array.isArray(filter.values)) {
                throw malformed('A "categories" filter needs a list of values.', { values: filter.values });
            }

            return;
        case "degree":
            assertBounds(filter.min, filter.max, filter.kind);

            if (filter.direction !== undefined && !["in", "out", "all"].includes(filter.direction)) {
                throw malformed('A "degree" filter\'s direction is "in", "out" or "all".', {
                    direction: filter.direction,
                });
            }

            return;
        case "component":
            if (!Number.isInteger(filter.id) || filter.id < 0) {
                throw outOfRange('A "component" filter\'s id is a component number, counting from 0.', {
                    id: filter.id,
                });
            }

            return;
        case "neighborhood":
            if (!Array.isArray(filter.seeds)) {
                throw malformed('A "neighborhood" filter needs a list of seed node ids.', { seeds: filter.seeds });
            }

            if (!Number.isInteger(filter.depth) || filter.depth < 0) {
                throw outOfRange('A "neighborhood" filter\'s depth is a whole number of hops, from 0.', {
                    depth: filter.depth,
                });
            }

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
}

/**
 * Check a filter and a window before anything starts working on them.
 * @param filter - The filter, or null for none.
 * @param window - The time window, or null for none.
 * @throws A `GraphtyError` when either is malformed.
 */
export function assertVisibility(filter: Filter | null, window: TimeWindow | null): void {
    if (filter !== null) {
        assertFilter(filter);
    }

    if (window !== null) {
        assertTimeWindow(window);
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
}

/** One filter's two halves, before they are folded together. */
interface CompiledHalves {
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
function readValue(
    read: (index: number, path: Path) => unknown,
    index: number,
    path: Path,
    mark: PathMark,
): unknown {
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
 * A test over a numeric attribute.
 * @param context - The compile context.
 * @param attribute - The attribute path.
 * @param min - The lower bound, inclusive; unbounded when absent.
 * @param max - The upper bound, inclusive; unbounded when absent.
 * @returns The test, which rejects a node carrying no number for the attribute.
 */
function rangeTest(
    context: CompileContext,
    attribute: Path,
    min: number | undefined,
    max: number | undefined,
): ElementTest {
    const values = valuesOf(context, "range");
    const mark = markFor(context, attribute);
    const low = min ?? Number.NEGATIVE_INFINITY;
    const high = max ?? Number.POSITIVE_INFINITY;

    return (index) => {
        const value = readValue((row, path) => values.nodeValue(row, path), index, attribute, mark);

        return typeof value === "number" && Number.isFinite(value) && value >= low && value <= high;
    };
}

/**
 * A test over a categorical attribute.
 *
 * The comparison is on the value's TEXT, so a chip list that hands back "3" still matches a record
 * whose type code arrived as the number 3. That is the opposite of the rule for node ids, where 1
 * and "1" are two different nodes on purpose: an id is an identity, and a category is a label.
 * @param context - The compile context.
 * @param attribute - The attribute path.
 * @param wanted - The categories to keep.
 * @returns The test, which rejects a node carrying no value for the attribute.
 */
function categoriesTest(context: CompileContext, attribute: Path, wanted: readonly string[]): ElementTest {
    const values = valuesOf(context, "categories");
    const mark = markFor(context, attribute);
    const allowed = new Set(wanted);

    return (index) => {
        const value = readValue((row, path) => values.nodeValue(row, path), index, attribute, mark);

        if (typeof value === "string") {
            return allowed.has(value);
        }

        if (typeof value === "number" || typeof value === "boolean") {
            return allowed.has(String(value));
        }

        return false;
    };
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
    direction: FilterDirection | undefined,
): ElementTest {
    const { graph } = context;
    let degrees: U32;

    if (direction === "in") {
        degrees = graph.inDegree();
    } else if (direction === "out") {
        degrees = graph.outDegree();
    } else {
        degrees = graph.degree();
    }

    const low = min ?? Number.NEGATIVE_INFINITY;
    const high = max ?? Number.POSITIVE_INFINITY;

    return (index) => degrees[index] >= low && degrees[index] <= high;
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
        const index = graph.ids.indexOf(id);

        if (index !== INVALID_INDEX && reached[index] === 0) {
            reached[index] = 1;
            frontier.push(index);
        }
    }

    const reverse = graph.reverse();

    for (let hop = 0; hop < depth && frontier.length > 0; hop++) {
        const next: number[] = [];

        for (const node of frontier) {
            for (const view of [graph, reverse]) {
                for (let arc = view.rowPtr[node]; arc < view.rowPtr[node + 1]; arc++) {
                    const other = view.colIdx[arc];

                    if (reached[other] === 0) {
                        reached[other] = 1;
                        next.push(other);
                    }
                }
            }
        }

        frontier = next;
    }

    return (index) => reached[index] === 1;
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
 * Compile one filter into its node half and its edge half.
 * @param filter - The filter.
 * @param context - The compile context.
 * @returns The two halves, either of which may be null.
 * @throws A `GraphtyError` when the filter needs a capability this session does not have.
 */
function compileOne(filter: Filter, context: CompileContext): CompiledHalves {
    switch (filter.kind) {
        case "expression":
            return { node: expressionTest(context, filter.where), edge: null };
        case "range":
            return { node: rangeTest(context, filter.attribute, filter.min, filter.max), edge: null };
        case "categories":
            return { node: categoriesTest(context, filter.attribute, filter.values), edge: null };
        case "degree":
            return { node: degreeTest(context, filter.min, filter.max, filter.direction), edge: null };
        case "component":
            return { node: componentTest(context, filter.id), edge: null };
        case "neighborhood":
            return { node: neighborhoodTest(context, filter.seeds, filter.depth), edge: null };
        case "edges":
            return { node: null, edge: edgeQueryTest(context, filter.where) };
        case "all":
        case "any": {
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
 * Compile a time window into its node half and its edge half.
 *
 * Both halves read the SAME attribute path and share one mark, so a window on `data.timestamp`
 * that only the edges answer does not report the path as unresolved.
 * @param window - The window.
 * @param context - The compile context.
 * @returns The two halves.
 * @throws A `GraphtyError` with code `E_UNSUPPORTED` when this session cannot read attributes.
 */
function compileWindow(window: TimeWindow, context: CompileContext): CompiledHalves {
    const values = valuesOf(context, "window");
    const mark = markFor(context, window.attribute);
    const from = instantOf(window.from) ?? Number.NEGATIVE_INFINITY;
    const to = instantOf(window.to) ?? Number.POSITIVE_INFINITY;

    /**
     * Whether one element's instant falls inside the half-open window.
     * @param read - Reads the element's value.
     * @returns The test.
     */
    const inside = (read: (index: number, path: Path) => unknown): ElementTest => {
        return (index) => {
            const instant = instantOf(readValue(read, index, window.attribute, mark));

            // No place on the timeline means the window has nothing to say about this element.
            return instant === null || (instant >= from && instant < to);
        };
    };

    return {
        node: inside((index, path) => values.nodeValue(index, path)),
        edge: inside((index, path) => values.edgeValue(index, path)),
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
    filter: Filter | null,
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

    if (filter !== null) {
        halves.push(compileOne(filter, context));
    }

    if (window !== null) {
        halves.push(compileWindow(window, context));
    }

    const folded = halves.length === 0 ? SILENT : {
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
        unresolvedPaths(): readonly Path[] {
            const unresolved = new Set(context.unresolvedQueries);

            for (const [path, mark] of context.marks) {
                if (!mark.seen) {
                    unresolved.add(path);
                }
            }

            return Object.freeze([...unresolved]);
        },
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
    const {nodeCount} = pass.graph;
    const {edgeCount} = pass.graph;
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
            throw signal.reason as Error;
        }

        deadline = performance.now() + SLICE_MS;
    };

    if (signal.aborted) {
        throw signal.reason as Error;
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
