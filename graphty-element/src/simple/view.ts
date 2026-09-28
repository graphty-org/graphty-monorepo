/**
 * @file The graph view of the simple extension tier: the whole graph as nodes and edges with
 * their real ids, built once per run over the element's snapshot.
 *
 * An author reads `node.neighbors()`, `edge.other(node)`, `node.strength("confidence")` and never
 * sees a row, a typed array or an adjacency index. Everything below exists to keep the numbers
 * those calls give honest:
 *
 * - ORDER IS THE IDS', NOT THE LOAD'S. Nodes iterate numbers ascending, then strings by code unit
 *   (`compareNodeIds`); edges by their numeric edge id; every node's lists follow the same order.
 *   So a result never depends on which record happened to arrive first.
 * - A SELF-LOOP COUNTS ONCE and is never its own neighbour; PARALLEL EDGES STAY SEPARATE, each with
 *   its own id, and add together in `weightTo`.
 * - DIRECTION IS NEVER GUESSED. A definition that did not ask for `direction: "directed"` gets a
 *   view whose directed accessors throw, so a plugin cannot read a direction the view was not
 *   built with and publish plausible wrong numbers.
 * - A MISSING WEIGHT IS NEVER A ZERO. An edge with no number at the path is left out of a sum and
 *   counted; `viewWarnings` turns the counts into the run record's warning.
 * - A PATH NOTHING CARRIES FAILS LOUDLY, at its first read, naming what the elements do carry,
 *   instead of reading as undefined everywhere.
 *
 * Every array handed back is frozen, built on first use and cached, so a call inside a loop costs
 * nothing after the first.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import { compareIds } from "../catalog/sets/canonical";
import { GraphtyError, type GraphtyErrorSource } from "../errors";
import { edgeSpaceOf } from "../session/scope/ScopeApi";
import type { ViewSource, ViewTarget } from "./source";
import type { EdgeView, GraphView, NodeId, NodeView } from "./types";

/**
 * The order every graph view iterates in: numbers ascending, then strings in code-unit order.
 * Published so an order-dependent method that graduates to the advanced tier can sort the same way.
 * @param a - One id.
 * @param b - The other.
 * @returns Negative, zero or positive.
 */
export function compareNodeIds(a: NodeId, b: NodeId): number {
    return compareIds(a, b);
}

/** How a view is built. */
interface GraphViewOptions {
    /** The extension's id: every message the view writes starts with it. */
    readonly id: string;
    /** Whether the definition declared `direction: "directed"`. */
    readonly directed: boolean;
    /** Which area of the element a refusal names. Default "run". */
    readonly source?: GraphtyErrorSource;
}

/** The facts a refusal of a path is worded from. */
interface PathRefusalFacts {
    readonly target: ViewTarget;
    readonly path: string;
    /** The attribute names that kind of element does carry. */
    readonly carriers: readonly string[];
    /** The run a `results.<run>.<field>` path names, when it is one. */
    readonly run?: string;
}

/** Reads the view does not count as numbers: how many elements, and how many held text. */
interface Tally {
    readonly target: ViewTarget;
    readonly path: string;
    /** Rows whose read found no number. */
    readonly missing: Set<number>;
    /** Rows whose read found text, a subset of `missing`. */
    readonly text: Set<number>;
    /** Rows whose read found a number. */
    readonly found: Set<number>;
    /** The first text value seen, quoted in the warning. */
    sample: string | undefined;
}

/** What a view keeps about itself: its options, its source, and what its reads found. */
interface ViewState {
    readonly options: GraphViewOptions;
    readonly source: ViewSource;
    /** Paths already checked, keyed by target and path. */
    readonly checked: Map<string, { readonly target: ViewTarget; readonly path: string }>;
    readonly tallies: Map<string, Tally>;
    /** The edge paths read as weights (weight, strength, weightTo), in first-read order. */
    readonly weightPaths: Set<string>;
    readonly edges: EdgeImpl[];
    /** Where each node row sits in the view's order. */
    readonly nodePosition: Int32Array;
    /** Where each edge row sits in the view's order. */
    readonly edgePosition: Int32Array;
    /** Each node row's incident edge rows, a self-loop once. */
    readonly incident: number[][];
    readonly directedData: boolean;
}

const states = new WeakMap<GraphView, ViewState>();

/**
 * A key for one target and path.
 * @param target - Nodes or edges.
 * @param path - The path.
 * @returns The key.
 */
function keyOf(target: ViewTarget, path: string): string {
    return `${target}\u0000${path}`;
}

/**
 * An id as a message quotes it: a number bare, a string in double quotes.
 * @param id - The id.
 * @returns The quoted id.
 */
export function quoteId(id: NodeId): string {
    return typeof id === "number" ? String(id) : JSON.stringify(id);
}

/**
 * The refusal a directed accessor gets in a view built without direction.
 * @param state - The view.
 * @param method - The accessor.
 * @returns The error.
 */
function needsDirection(state: ViewState, method: string): GraphtyError {
    return new GraphtyError({
        code: "E_BAD_COMMAND",
        message:
            `${state.options.id}: ${method}() needs direction: "directed" in the definition. ` +
            "Without it the graph is read as undirected, and which way an edge points is not known.",
        source: state.options.source ?? "run",
        details: { extension: state.options.id, member: method, field: "direction" },
    });
}

/**
 * Throw unless the definition asked for direction.
 * @param state - The view.
 * @param method - The accessor being called.
 */
function requireDirected(state: ViewState, method: string): void {
    if (!state.options.directed) {
        throw needsDirection(state, method);
    }
}

/**
 * The default wording of a path nothing carries, read literally in the code.
 * @param id - The extension id.
 * @param call - How the read was spelled, such as `node.attr("tier")`.
 * @param facts - What was looked for and what exists.
 * @returns The message.
 */
function literalRefusal(id: string, call: string, facts: PathRefusalFacts): string {
    if (facts.run !== undefined) {
        return (
            `${id}: ${call} reads ${facts.path}, but no completed run is named "${facts.run}"; ` +
            `run the algorithm that produces it first, with { as: "${facts.run}" }.`
        );
    }

    return `${id}: ${call} names a ${facts.target} attribute no ${facts.target} carries; ${carriedList(facts)}.`;
}

/**
 * What a kind of element does carry, for a refusal: "nodes carry: tier, name".
 * @param facts - What was found.
 * @returns The clause, with no closing full stop.
 */
export function carriedList(facts: PathRefusalFacts): string {
    return facts.carriers.length === 0
        ? `no ${facts.target} carries any attribute`
        : `${facts.target}s carry: ${facts.carriers.join(", ")}`;
}

/**
 * The run a result path names, or undefined for an attribute path.
 * @param path - The path.
 * @returns The run.
 */
function runOf(path: string): string | undefined {
    const match = /^results\.([^.]+)\./.exec(path);
    return match === null ? undefined : match[1];
}

/**
 * Check, once per view, that some element carries a value at a path; refuse it when none does.
 * @param state - The view.
 * @param target - Nodes or edges.
 * @param path - The path.
 * @param refusal - Words the refusal.
 */
function ensureCarried(
    state: ViewState,
    target: ViewTarget,
    path: string,
    refusal: (facts: PathRefusalFacts) => string,
): void {
    const key = keyOf(target, path);
    if (state.checked.has(key)) {
        return;
    }

    const { source } = state;
    const count = target === "node" ? source.snapshot.nodeCount : source.snapshot.edgeCount;
    // A graph with no elements of this kind has nothing to read and nothing to be wrong about.
    let carried = count === 0;
    for (let row = 0; row < count && !carried; row++) {
        const value = target === "node" ? source.nodeValue(row, path) : source.edgeValue(row, path);
        carried = value !== undefined && value !== null;
    }

    if (!carried) {
        const run = runOf(path);
        const facts: PathRefusalFacts = {
            target,
            path,
            carriers: source.attributeNames?.(target) ?? [],
            ...(run === undefined ? {} : { run }),
        };
        throw new GraphtyError({
            code: "E_OPTION_RANGE",
            message: refusal(facts),
            source: state.options.source ?? "run",
            details: { extension: state.options.id, target, path, carriers: facts.carriers, ...(run === undefined ? {} : { run }) },
        });
    }

    state.checked.set(key, { target, path });
}

/**
 * Record one numeric read.
 * @param state - The view.
 * @param target - Nodes or edges.
 * @param path - The path.
 * @param row - The element's row.
 * @param value - What the read found.
 * @returns The number, or undefined when the value is not a finite number.
 */
function counted(state: ViewState, target: ViewTarget, path: string, row: number, value: unknown): number | undefined {
    const key = keyOf(target, path);
    let tally = state.tallies.get(key);
    if (tally === undefined) {
        tally = { target, path, missing: new Set(), text: new Set(), found: new Set(), sample: undefined };
        state.tallies.set(key, tally);
    }

    if (typeof value === "number" && Number.isFinite(value)) {
        tally.found.add(row);
        return value;
    }

    tally.missing.add(row);
    if (typeof value === "string") {
        tally.text.add(row);
        tally.sample ??= value;
    }

    return undefined;
}

/**
 * Freeze a list and hand it back.
 * @param list - The list.
 * @returns It, frozen.
 */
function frozen<T>(list: T[]): readonly T[] {
    return Object.freeze(list);
}

/** One node of a view. */
class NodeImpl implements NodeView {
    readonly #state: ViewState;
    readonly #row: number;
    readonly id: NodeId;
    #edges: readonly EdgeView[] | null = null;
    #neighbors: readonly NodeView[] | null = null;
    #out: readonly EdgeView[] | null = null;
    #in: readonly EdgeView[] | null = null;
    #outNeighbors: readonly NodeView[] | null = null;
    #inNeighbors: readonly NodeView[] | null = null;
    readonly #strength = new Map<string, number>();

    /**
     * Build one node.
     * @param state - The view.
     * @param row - Its row in the snapshot.
     * @param id - Its id.
     */
    constructor(state: ViewState, row: number, id: NodeId) {
        this.#state = state;
        this.#row = row;
        this.id = id;
    }

    /**
     * The node's row in the snapshot, for the view's own bookkeeping.
     * @returns The row.
     */
    get row(): number {
        return this.#row;
    }

    /**
     * The number of edges touching the node.
     * @returns edges().length: a self-loop counts once.
     */
    get degree(): number {
        return this.edges().length;
    }

    /**
     * Every edge touching this node.
     * @returns The edges, in the view's order.
     */
    edges(): readonly EdgeView[] {
        this.#edges ??= frozen(this.#state.incident[this.#row].map((edge) => this.#state.edges[edge]));
        return this.#edges;
    }

    /**
     * The adjacent nodes.
     * @returns Every adjacent node once, never this node.
     */
    neighbors(): readonly NodeView[] {
        this.#neighbors ??= this.#ends(this.edges(), (edge) => edge.other(this));
        return this.#neighbors;
    }

    /**
     * The edges leaving this node; every edge, in undirected data.
     * @returns The edges.
     */
    outEdges(): readonly EdgeView[] {
        requireDirected(this.#state, "outEdges");
        this.#out ??= this.#state.directedData ? frozen(this.edges().filter((edge) => edge.source === this)) : this.edges();
        return this.#out;
    }

    /**
     * The edges entering this node; every edge, in undirected data.
     * @returns The edges.
     */
    inEdges(): readonly EdgeView[] {
        requireDirected(this.#state, "inEdges");
        this.#in ??= this.#state.directedData ? frozen(this.edges().filter((edge) => edge.target === this)) : this.edges();
        return this.#in;
    }

    /**
     * The nodes this node's edges lead to.
     * @returns The nodes, never this node.
     */
    outNeighbors(): readonly NodeView[] {
        requireDirected(this.#state, "outNeighbors");
        this.#outNeighbors ??= this.#ends(this.outEdges(), (edge) => edge.other(this));
        return this.#outNeighbors;
    }

    /**
     * The nodes whose edges lead here.
     * @returns The nodes, never this node.
     */
    inNeighbors(): readonly NodeView[] {
        requireDirected(this.#state, "inNeighbors");
        this.#inNeighbors ??= this.#ends(this.inEdges(), (edge) => edge.other(this));
        return this.#inNeighbors;
    }

    /**
     * The edges between this node and another.
     * @param other - The other node.
     * @returns The edges, parallel edges included; in a directed view only those from here to there.
     */
    edgesTo(other: NodeView): readonly EdgeView[] {
        const state = this.#state;
        if (state.options.directed && state.directedData) {
            return frozen(this.outEdges().filter((edge) => edge.target === other));
        }

        return frozen(this.edges().filter((edge) => edge.other(this) === other));
    }

    /**
     * The summed weight of the edges to another node.
     * @param other - The other node.
     * @param path - The weight path, or undefined to count each edge as 1.
     * @returns The sum, or undefined when no edge between them has a weight.
     */
    weightTo(other: NodeView, path: string | undefined): number | undefined {
        return sumWeights(this.edgesTo(other), path);
    }

    /**
     * The weighted degree.
     * @param path - The weight path, or undefined for the degree.
     * @param direction - All edges, or only outgoing or incoming ones.
     * @returns The sum.
     */
    strength(path: string | undefined, direction: "all" | "out" | "in" = "all"): number {
        if (direction !== "all") {
            requireDirected(this.#state, "strength");
        }

        const key = `${direction}\u0000${path ?? ""}\u0000${path === undefined ? "unbound" : "bound"}`;
        let value = this.#strength.get(key);
        if (value === undefined) {
            const list = { all: () => this.edges(), out: () => this.outEdges(), in: () => this.inEdges() }[direction]();
            value = path === undefined ? list.length : (sumWeights(list, path) ?? 0);
            this.#strength.set(key, value);
        }

        return value;
    }

    /**
     * An attribute or a published result.
     * @param path - The path, or undefined for an unbound option.
     * @returns The value.
     */
    attr(path: string | undefined): unknown {
        if (path === undefined) {
            return undefined;
        }

        const state = this.#state;
        ensureCarried(state, "node", path, (facts) => literalRefusal(state.options.id, `node.attr(${JSON.stringify(path)})`, facts));
        return state.source.nodeValue(this.#row, path);
    }

    /**
     * attr(path) when it is a finite number.
     * @param path - The path.
     * @returns The number, or undefined.
     */
    number(path: string | undefined): number | undefined {
        if (path === undefined) {
            return undefined;
        }

        const state = this.#state;
        ensureCarried(state, "node", path, (facts) => literalRefusal(state.options.id, `node.number(${JSON.stringify(path)})`, facts));
        return counted(state, "node", path, this.#row, state.source.nodeValue(this.#row, path));
    }

    /**
     * The distinct far ends of a list of edges, in the view's order, leaving this node out.
     * @param list - The edges.
     * @param end - Picks the end.
     * @returns The nodes.
     */
    #ends(list: readonly EdgeView[], end: (edge: EdgeView) => NodeView): readonly NodeView[] {
        const seen = new Set<NodeView>();
        for (const edge of list) {
            const node = end(edge);
            if (node !== this) {
                seen.add(node);
            }
        }

        const { nodePosition } = this.#state;
        return frozen(
            [...seen].sort((a, b) => nodePosition[(a as NodeImpl).row] - nodePosition[(b as NodeImpl).row]),
        );
    }
}

/**
 * The sum of the weights of a list of edges, leaving out an edge with no number.
 * @param list - The edges.
 * @param path - The weight path, or undefined to count each edge as 1.
 * @returns The sum, or undefined when no edge had a weight.
 */
function sumWeights(list: readonly EdgeView[], path: string | undefined): number | undefined {
    let sum = 0;
    let any = false;
    for (const edge of list) {
        const weight = edge.weight(path);
        if (weight !== undefined) {
            sum += weight;
            any = true;
        }
    }

    return any ? sum : undefined;
}

/** One edge of a view. */
class EdgeImpl implements EdgeView {
    readonly #state: ViewState;
    readonly #row: number;
    readonly id: string;
    readonly source: NodeView;
    readonly target: NodeView;

    /**
     * Build one edge.
     * @param state - The view.
     * @param row - Its row in the snapshot.
     * @param id - The element's edge id.
     * @param source - The end the data named first.
     * @param target - The other end.
     */
    constructor(state: ViewState, row: number, id: string, source: NodeView, target: NodeView) {
        this.#state = state;
        this.#row = row;
        this.id = id;
        this.source = source;
        this.target = target;
    }

    /**
     * The end that is not `node`.
     * @param node - One end.
     * @returns The other end; a self-loop returns `node`.
     */
    other(node: NodeView): NodeView {
        if (node === this.source) {
            return this.target;
        }

        if (node === this.target) {
            return this.source;
        }

        const { options } = this.#state;
        throw new GraphtyError({
            code: "E_BAD_COMMAND",
            message:
                `${options.id}: edge.other() was given node ${quoteId(node.id)}, which is not an end of edge ` +
                `"${this.id}" (its ends are ${quoteId(this.source.id)} and ${quoteId(this.target.id)}).`,
            source: options.source ?? "run",
            details: { extension: options.id, member: "other", edge: this.id, node: node.id },
        });
    }

    /**
     * The edge's weight at a path.
     * @param path - The path, or undefined to count the edge as 1.
     * @returns The weight, or undefined when there is no number.
     */
    weight(path: string | undefined): number | undefined {
        if (path === undefined) {
            return 1;
        }

        const state = this.#state;
        ensureCarried(state, "edge", path, (facts) => literalRefusal(state.options.id, `edge.weight(${JSON.stringify(path)})`, facts));
        state.weightPaths.add(path);
        return counted(state, "edge", path, this.#row, state.source.edgeValue(this.#row, path));
    }

    /**
     * An attribute or a published result.
     * @param path - The path, or undefined for an unbound option.
     * @returns The value.
     */
    attr(path: string | undefined): unknown {
        if (path === undefined) {
            return undefined;
        }

        const state = this.#state;
        ensureCarried(state, "edge", path, (facts) => literalRefusal(state.options.id, `edge.attr(${JSON.stringify(path)})`, facts));
        return state.source.edgeValue(this.#row, path);
    }

    /**
     * attr(path) when it is a finite number.
     * @param path - The path.
     * @returns The number, or undefined.
     */
    number(path: string | undefined): number | undefined {
        if (path === undefined) {
            return undefined;
        }

        const state = this.#state;
        ensureCarried(state, "edge", path, (facts) => literalRefusal(state.options.id, `edge.number(${JSON.stringify(path)})`, facts));
        return counted(state, "edge", path, this.#row, state.source.edgeValue(this.#row, path));
    }
}

/** A group key's rank: numbers, then booleans, then text. */
const RANK = { number: 0, boolean: 1, string: 2 } as const;

/** Text in natural order: "2" before "10". */
const NATURAL = new Intl.Collator("en", { numeric: true });

/**
 * The readable order of two group keys.
 * @param a - One key.
 * @param b - The other.
 * @returns Negative, zero or positive.
 */
function compareGroupKeys(a: string | number | boolean, b: string | number | boolean): number {
    const rankA = RANK[typeof a as keyof typeof RANK];
    const rankB = RANK[typeof b as keyof typeof RANK];
    if (rankA !== rankB) {
        return rankA - rankB;
    }

    if (typeof a === "string" && typeof b === "string") {
        return NATURAL.compare(a, b) || compareIds(a, b);
    }

    return Number(a) - Number(b);
}

/**
 * Build the graph view over a source.
 * @param source - The snapshot and the value reader (see `viewSourceOf`).
 * @param options - The extension id and whether its definition declared direction.
 * @returns The view.
 */
export function createGraphView(source: ViewSource, options: GraphViewOptions): GraphView {
    const { snapshot } = source;
    const { nodeCount, edgeCount } = snapshot;
    const edges: EdgeImpl[] = [];
    const incident: number[][] = Array.from({ length: nodeCount }, () => []);
    const state: ViewState = {
        options,
        source,
        checked: new Map(),
        tallies: new Map(),
        weightPaths: new Set(),
        edges,
        nodePosition: new Int32Array(nodeCount),
        edgePosition: new Int32Array(edgeCount),
        incident,
        directedData: snapshot.directed,
    };

    const byRow: NodeImpl[] = [];
    const nodeById = new Map<NodeId, NodeImpl>();
    for (let row = 0; row < nodeCount; row++) {
        const node = new NodeImpl(state, row, snapshot.ids.idOf(row));
        byRow.push(node);
        nodeById.set(node.id, node);
    }
    const ordered = [...byRow].sort((a, b) => compareNodeIds(a.id, b.id));
    ordered.forEach((node, position) => {
        state.nodePosition[node.row] = position;
    });

    // Edge ids are the element's own (the id a selection, a style and an export use).
    const edgeIds = edgeSpaceOf(snapshot);
    const { src, dst } = edgeCount === 0 ? { src: new Uint32Array(0), dst: new Uint32Array(0) } : snapshot.edgeList();
    const edgeById = new Map<string, EdgeImpl>();
    for (let row = 0; row < edgeCount; row++) {
        const edge = new EdgeImpl(state, row, edgeIds.idOf(row), byRow[src[row]], byRow[dst[row]]);
        edges.push(edge);
        edgeById.set(edge.id, edge);
        incident[src[row]].push(row);
        if (dst[row] !== src[row]) {
            incident[dst[row]].push(row);
        }
    }

    // Edge ids are decimal counters: ascending by value, so "10" follows "2".
    const edgeOrder = [...edges.keys()].sort((a, b) => Number(edges[a].id) - Number(edges[b].id) || a - b);
    edgeOrder.forEach((row, position) => {
        state.edgePosition[row] = position;
    });
    for (const list of incident) {
        list.sort((a, b) => state.edgePosition[a] - state.edgePosition[b]);
    }

    const nodeList = frozen(ordered as NodeView[]);
    const edgeList = frozen(edgeOrder.map((row) => edges[row] as EdgeView));
    const groups = new Map<string, ReadonlyMap<string | number | boolean, readonly NodeView[]>>();

    const view: GraphView = {
        directed: options.directed && snapshot.directed,
        nodeCount,
        edgeCount,
        nodes: () => nodeList,
        edges: () => edgeList,
        node: (id) => nodeById.get(id),
        edge: (id) => edgeById.get(id),
        groupBy(path) {
            if (path === undefined) {
                return new Map();
            }

            let held = groups.get(path);
            if (held === undefined) {
                ensureCarried(state, "node", path, (facts) =>
                    literalRefusal(options.id, `graph.groupBy(${JSON.stringify(path)})`, facts),
                );
                const found = new Map<string | number | boolean, NodeView[]>();
                for (const node of nodeList) {
                    const value = source.nodeValue((node as NodeImpl).row, path);
                    const usable =
                        typeof value === "string" ||
                        typeof value === "boolean" ||
                        (typeof value === "number" && Number.isFinite(value));
                    if (usable) {
                        const group = found.get(value) ?? [];
                        group.push(node);
                        found.set(value, group);
                    }
                }

                held = new Map([...found.entries()].sort(([a], [b]) => compareGroupKeys(a, b)).map(([key, list]) => [key, frozen(list)]));
                groups.set(path, held);
            }

            return held;
        },
    };

    states.set(view, state);
    return view;
}

/**
 * The internal state of a view built here.
 * @param view - The view.
 * @returns Its state.
 * @throws A GraphtyError E_INTERNAL for a view this module did not build.
 */
function stateOf(view: GraphView): ViewState {
    const state = states.get(view);
    if (state === undefined) {
        throw new GraphtyError({
            code: "E_INTERNAL",
            message: "a graph view was used that graphty-element did not build",
            source: "run",
        });
    }

    return state;
}

/**
 * Check a path the way a first read checks it, with the caller's own wording: how an option that
 * names an attribute is checked before the author's code runs.
 * @param view - The view.
 * @param target - Nodes or edges.
 * @param path - The path.
 * @param refusal - Words the refusal from what was found.
 */
export function requireCarried(
    view: GraphView,
    target: ViewTarget,
    path: string,
    refusal: (facts: PathRefusalFacts) => string,
): void {
    ensureCarried(stateOf(view), target, path, refusal);
}

/**
 * Every path the view has read, for the run record's list of inputs.
 * @param view - The view.
 * @returns The paths, with the kind of element each was read on, in first-read order.
 */
export function viewInputs(view: GraphView): readonly { readonly target: ViewTarget; readonly path: string }[] {
    return [...stateOf(view).checked.values()];
}

/**
 * The edge paths the run read as weights -- through edge.weight, node.strength or node.weightTo --
 * which is what the run record's weight says the numbers used.
 * @param view - The view.
 * @returns The paths, in first-read order.
 */
export function viewWeightPaths(view: GraphView): readonly string[] {
    return [...stateOf(view).weightPaths];
}

/**
 * The warnings a run over this view completes with: one per path at which some read found no
 * number.
 * @param view - The view.
 * @returns The sentences, in first-read order; empty when every read found a number.
 */
export function viewWarnings(view: GraphView): readonly string[] {
    const state = stateOf(view);
    const { id } = state.options;
    const warnings: string[] = [];
    for (const tally of state.tallies.values()) {
        const missing = tally.missing.size;
        if (missing === 0) {
            continue;
        }

        const plural = `${tally.target}s`;
        const sample = tally.sample === undefined ? "" : JSON.stringify(tally.sample);
        if (tally.found.size === 0) {
            warnings.push(
                tally.text.size > 0
                    ? `${id}: no ${tally.target} has a number at "${tally.path}": its values are text (e.g. ${sample}), so every read of it was left out.`
                    : `${id}: no ${tally.target} has a number at "${tally.path}", so every read of it was left out.`,
            );
            continue;
        }

        const total = tally.target === "node" ? state.source.snapshot.nodeCount : state.source.snapshot.edgeCount;
        const text = tally.text.size;
        const textPart = text === 0 ? "" : ` (${text} ${text === 1 ? "holds" : "hold"} text, e.g. ${sample})`;
        warnings.push(
            `${id}: ${missing} of ${total} ${plural} ${missing === 1 ? "has" : "have"} no number at "${tally.path}"${textPart}; they were left out.`,
        );
    }

    return warnings;
}
