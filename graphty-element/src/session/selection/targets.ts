/**
 * @file Turning a selection target into the two sets of elements it names.
 *
 * A target is the WHAT of a selection; the set operation beside it is the HOW. Keeping them apart
 * is what makes "shift-click adds the neighbours" and "alt-click removes the top twenty" the same
 * two lines of code as "click replaces this node": every target resolves to a pair of masks, and
 * every operation is set algebra between that pair and the pair the session already holds.
 *
 * EVERY TARGET RESOLVES TO A MASK, never to a list of ids. A target such as "invert" or "every
 * node the predicate matched" can name most of the graph, and materialising that as an array
 * would cost the size of the answer at a moment when the answer is about to be folded into a
 * structure that costs the size of the graph whatever happens. Ids are produced once, at the end,
 * by the caller that asked for them.
 *
 * A TARGET NAMES BOTH HALVES, and a target that names no edges names an EMPTY edge set rather
 * than "leave the edges alone". That is what keeps the operations honest: replacing the selection
 * with the neighbours of a node leaves no edges selected, and intersecting a selection with a set
 * of nodes leaves no edges selected, because in both cases that is what the set algebra says. A
 * target that meant "only touch the half I mentioned" would make `replace` and `intersect` do
 * something no set operation does, and a consumer could not predict either of them.
 *
 * WHAT DOES NOT RESOLVE IS REPORTED, NEVER SWALLOWED. A pasted id that names nothing comes back
 * on `unmatched`, and a result path that this session cannot answer comes back on
 * `unresolvedPaths`. Selecting nothing is a legitimate answer here -- a predicate that matches no
 * node is not an error -- so the reason an answer was empty has to travel with it, or "0 selected"
 * and "you misspelled the run id" look identical.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import { type GraphSnapshot, INVALID_INDEX } from "@graphty/graph-format";

import type { EdgeId, NodeId, Path, Query, Scope } from "../../catalog/types";
import { GraphtyError } from "../../errors";
import type { RankingEntry, ResultsApi, RunRef, RunResult } from "../results/types";
import { ElementMask, type MaskIdSpace } from "../scope/ElementMask";
import type { ScopeResolver } from "../scope/ScopeApi";

/** How far a neighbourhood target reaches when it does not say. */
const DEFAULT_NEIGHBOR_DEPTH = 1;

/** The deepest a neighbourhood target may reach. */
const MAX_NEIGHBOR_DEPTH = 3;

/** Which way a neighbourhood target walks when it does not say. */
const DEFAULT_DIRECTION = "all";

/** The frozen empty list every arm that cannot produce unmatched ids answers with. */
const EMPTY_STRINGS: readonly string[] = Object.freeze([]);

/** The frozen empty list every arm that cannot produce an unresolved path answers with. */
const EMPTY_PATHS: readonly Path[] = Object.freeze([]);

/**
 * How a text target decides whether an element matched.
 *
 * - `substring`: the id or an attribute value contains the text, ignoring case.
 * - `exact`: the id or an attribute value is the text, exactly.
 * - `regex`: the id or an attribute value matches the text as a regular expression.
 * - `attribute`: the text is `key:value`, and the node's `key` (or its id, for `id`) is the value,
 *   ignoring case. A key no node carries is searched as plain substring text.
 */
export type SelectionTextMode = "substring" | "exact" | "regex" | "attribute";

/** Which way a neighbourhood target follows an edge. */
export type SelectionDirection = "in" | "out" | "all";

// ---------------------------------------------------------------------------------------------
// The target grammar
// ---------------------------------------------------------------------------------------------

/** Elements named outright, by the ids a consumer already holds. */
export interface ElementIdTarget {
    /** The nodes. Ids the graph no longer holds are ignored, the way a scope ignores them. */
    readonly nodes?: readonly NodeId[];
    /** The edges, each addressed by its two endpoints joined by a colon. */
    readonly edges?: readonly EdgeId[];
}

/**
 * Everything within a few steps of some nodes.
 *
 * The seeds are IN the neighbourhood: a neighbourhood that excluded its own centre would hide the
 * very nodes the reader is looking at, and "select around this node" would deselect it. With no
 * seeds named the current node selection is the seed set, which is what "grow the selection"
 * means.
 *
 * It names nodes and no edges. Adding the edges among them is a separate target
 * ({@link SelectionTarget} `edgesBetween`), so each target does one thing and the two compose.
 */
export interface NeighborhoodTarget {
    /** The nodes to walk out from; the current node selection when absent. */
    readonly neighborsOf?: readonly NodeId[];
    /** How many steps to walk, counting the seeds as step zero. One when absent. */
    readonly depth?: 1 | 2 | 3;
    /** Which way to follow an edge. Both ways when absent. */
    readonly direction?: SelectionDirection;
}

/**
 * What a selection is being asked to cover.
 *
 * Several of these read a finished run rather than recomputing anything: "the top twenty by
 * betweenness" is a ranking the run already produced, and rebuilding it here would produce a
 * second ranking that could disagree with the one on screen.
 */
export type SelectionTarget =
    | ElementIdTarget
    | NeighborhoodTarget
    /** Every element a predicate matches, narrowed to a scope when one is named. */
    | { readonly where: Query; readonly scope?: Scope }
    /**
     * Every node a text search finds, narrowed to a scope when one is named.
     *
     * With no `mode`, the text may carry one as a prefix: `exact:`, `regex:`, or `<attribute>:`
     * (`id:a17`, `type:person`), and anything else is a case-insensitive substring search over
     * the node's id and its attribute values. See {@link SelectionTextMode}. A leading `=` makes
     * the rest an expression, exactly as `{ where }` reads it, which selects edges as well.
     */
    | { readonly text: string; readonly mode?: SelectionTextMode; readonly scope?: Scope }
    /** A pasted list of ids, which may name nodes, edges, or nothing at all. */
    | { readonly ids: readonly string[] }
    /** Everything a scope covers. */
    | { readonly scope: Scope }
    /** The highest-ranked elements of a finished run. */
    | { readonly top: { readonly run: RunRef; readonly field: string; readonly n: number } }
    /** Every element of a finished run above a threshold. */
    | { readonly above: { readonly run: RunRef; readonly field: string; readonly threshold: number } }
    /** The edges whose endpoints are both selected. Names no nodes. */
    | { readonly edgesBetween: true }
    /** Everything that is not selected, in both halves. */
    | { readonly invert: true };

// ---------------------------------------------------------------------------------------------
// What the resolver reads
// ---------------------------------------------------------------------------------------------

/** One element a text search found. */
export interface SelectionSearchHit {
    /** The element's id. */
    readonly id: NodeId | EdgeId;
    /** Which half of the graph it belongs to, because a node and an edge can share a name. */
    readonly kind: "node" | "edge";
}

/**
 * What a predicate matched, and what it could not answer.
 *
 * It carries both halves, unlike the matcher a scope reads: a scope's edges are induced from its
 * nodes, so a scope has no use for an edge answer, while a selection can hold an edge whose
 * endpoints are not selected and an edge predicate is an ordinary thing to write.
 */
export interface SelectionMatch {
    /** The node ids that matched. */
    readonly nodes?: Iterable<NodeId>;
    /** The edge ids that matched. */
    readonly edges?: Iterable<EdgeId>;
    /**
     * The paths the predicate named that nothing in this session answers.
     *
     * A predicate over `results.betwenness.value` parses perfectly and matches nothing, which
     * reads exactly like a correct answer of zero. Reporting the path is what turns that into a
     * sentence a person can act on.
     */
    readonly unresolvedPaths?: readonly Path[];
}

/**
 * Everything one target resolution reads.
 *
 * Each optional capability that is absent is a REFUSAL rather than an empty answer: a selection
 * that quietly covered nothing because the session has no query engine is indistinguishable from
 * a predicate that genuinely matched nothing, and a consumer cannot tell those apart afterwards.
 */
export interface TargetContext {
    /** The snapshot every target resolves against. */
    readonly graph: GraphSnapshot;
    /** The node identity space, one object for the life of the snapshot. */
    readonly nodeSpace: MaskIdSpace<NodeId>;
    /** The edge identity space, one object for the life of the snapshot. */
    readonly edgeSpace: MaskIdSpace<EdgeId>;
    /** The nodes selected right now, which several targets are relative to. */
    readonly selectedNodes: ElementMask<NodeId>;
    /** The edges selected right now. */
    readonly selectedEdges: ElementMask<EdgeId>;
    /** Resolves a scope. Absent refuses a `scope` target. */
    readonly scope?: ScopeResolver;
    /** Reads finished runs. Absent refuses a `top` or `above` target. */
    readonly results?: ResultsApi;
    /**
     * Evaluates a predicate. Absent refuses a `where` target.
     * @param where - The predicate.
     * @returns What it matched, and what it could not answer.
     */
    readonly match?: (where: Query) => SelectionMatch;
    /**
     * Searches text. Absent refuses a `text` target.
     * @param text - What was typed.
     * @param mode - How to match it.
     * @returns The elements found.
     */
    readonly find?: (text: string, mode: SelectionTextMode) => Iterable<SelectionSearchHit>;
}

/** The elements one target named. */
export interface TargetMembers {
    /** The nodes, as a mask over the context's node space. */
    readonly nodes: ElementMask<NodeId>;
    /** The edges, as a mask over the context's edge space. */
    readonly edges: ElementMask<EdgeId>;
    /** The pasted ids that named nothing in this graph. */
    readonly unmatched: readonly string[];
    /** The paths this session cannot answer. */
    readonly unresolvedPaths: readonly Path[];
}

// ---------------------------------------------------------------------------------------------
// Refusals
// ---------------------------------------------------------------------------------------------

/**
 * The refusal a target this session cannot honour gets, naming what would honour it.
 * @param what - The target, in the words a caller would recognise.
 * @param needs - The capability whose absence is the reason.
 * @returns The error to throw.
 */
function unsupported(what: string, needs: string): GraphtyError {
    return new GraphtyError({
        code: "E_UNSUPPORTED",
        message:
            `This session cannot select by ${what}, because ${needs} is not attached to it. ` +
            "Selecting nothing instead would be indistinguishable from a search that found nothing.",
        source: "run",
        details: { target: what, needs },
    });
}

/**
 * The refusal a value that is not a target at all gets.
 * @param target - What was passed.
 * @returns The error to throw.
 */
function notATarget(target: unknown): GraphtyError {
    return new GraphtyError({
        code: "E_BAD_COMMAND",
        message:
            "A selection target is { nodes, edges }, { where }, { text }, { ids }, { scope }, " +
            "{ neighborsOf }, { top }, { above }, { edgesBetween: true } or { invert: true }.",
        source: "run",
        details: { target },
    });
}

/**
 * The refusal a well-named option with an impossible value gets.
 * @param option - The option's name.
 * @param value - What was passed.
 * @param expected - What would have been accepted, in plain words.
 * @returns The error to throw.
 */
function badOption(option: string, value: unknown, expected: string): GraphtyError {
    return new GraphtyError({
        code: "E_OPTION_RANGE",
        message: `A selection's ${option} is ${expected}, not ${String(value)}.`,
        source: "run",
        details: { option, value },
    });
}

// ---------------------------------------------------------------------------------------------
// Filling masks
// ---------------------------------------------------------------------------------------------

/**
 * Put every id a producer named into a mask, ignoring the ones the graph no longer holds.
 *
 * Silently, and for the same reason a scope ignores them: a saved list, a pasted column and a
 * run that finished before a node was deleted all outlive some of their members, and refusing
 * the whole call because one element left would make every one of those unusable.
 * @param mask - The mask to fill.
 * @param ids - The ids to put in it.
 */
function addIds<TId>(mask: ElementMask<TId>, ids: Iterable<TId>): void {
    for (const id of ids) {
        const index = mask.indexOf(id);

        if (index !== INVALID_INDEX) {
            mask.add(index);
        }
    }
}

/**
 * Keep only the members a scope covers, when a target names one.
 * @param context - What the resolution reads.
 * @param scope - The scope, or undefined for the whole graph.
 * @param nodes - The node mask to narrow.
 * @param edges - The edge mask to narrow.
 * @throws A `GraphtyError` coded `E_UNSUPPORTED` when no scope resolver is attached.
 */
function narrowToScope(
    context: TargetContext,
    scope: Scope | undefined,
    nodes: ElementMask<NodeId>,
    edges: ElementMask<EdgeId>,
): void {
    if (scope === undefined) {
        return;
    }

    if (context.scope === undefined) {
        throw unsupported("a scope", "a scope resolver");
    }

    const resolved = context.scope.resolveNow(scope);
    const inScope = emptyMasks(context);
    addIds(inScope.nodes, resolved.nodes);
    addIds(inScope.edges, resolved.edges);
    nodes.intersect(inScope.nodes);
    edges.intersect(inScope.edges);
}

/**
 * Read the mode a search box's text carries as a prefix.
 *
 * `exact:` and `regex:` name a mode; any other `word:` prefix is an attribute search, which the
 * search index answers as plain text when no node carries that attribute.
 * @param text - What was typed.
 * @returns The text to search for and how.
 */
function searchOf(text: string): { text: string; mode: SelectionTextMode } {
    const prefix = /^([A-Za-z_][\w.]*):/.exec(text);

    if (prefix === null) {
        return { text, mode: "substring" };
    }

    const [whole, word] = prefix;

    if (word === "exact" || word === "regex") {
        return { text: text.slice(whole.length), mode: word };
    }

    return { text, mode: "attribute" };
}

/**
 * An empty node mask and an empty edge mask over one snapshot.
 * @param context - What the resolution reads.
 * @returns The two masks, sized to the graph and with nothing in them.
 */
function emptyMasks(context: TargetContext): { nodes: ElementMask<NodeId>; edges: ElementMask<EdgeId> } {
    const { graph, nodeSpace, edgeSpace } = context;
    const nodes = new ElementMask<NodeId>(() => nodeSpace, Math.max(1, graph.nodeCount));
    const edges = new ElementMask<EdgeId>(() => edgeSpace, Math.max(1, graph.edgeCount));
    nodes.grow(graph.nodeCount);
    edges.grow(graph.edgeCount);

    return { nodes, edges };
}

// ---------------------------------------------------------------------------------------------
// The arms of the grammar
// ---------------------------------------------------------------------------------------------

/**
 * Tell whether a target is the neighbourhood arm.
 * @param target - The target to test.
 * @returns True when it names a neighbourhood.
 */
function isNeighborhood(target: SelectionTarget): target is NeighborhoodTarget {
    return "neighborsOf" in target || "depth" in target || "direction" in target;
}

/**
 * Tell whether a target names elements outright.
 * @param target - The target to test.
 * @returns True when it names ids.
 */
function isElementIds(target: SelectionTarget): target is ElementIdTarget {
    return "nodes" in target || "edges" in target;
}

/**
 * The reading of one pasted id: a node, an edge, or nothing.
 *
 * A pasted list comes out of a spreadsheet, a log or a chat message, so three readings are tried
 * in a fixed order and the first that names something in this graph wins. The exact text is tried
 * first every time, so an id that genuinely carries a space or that genuinely reads as a number
 * is never lost to a correction. The numeric reading exists because a node loaded under the id
 * 42 is not the node "42", and a person pasting a column of numbers means the former.
 * @param raw - The pasted id.
 * @param nodes - The node mask to fill.
 * @param edges - The edge mask to fill.
 * @returns True when the id named something.
 */
function addPastedId(raw: string, nodes: ElementMask<NodeId>, edges: ElementMask<EdgeId>): boolean {
    const trimmed = raw.trim();
    const readings: NodeId[] = [raw];

    if (trimmed !== raw) {
        readings.push(trimmed);
    }

    if (trimmed !== "" && Number.isFinite(Number(trimmed))) {
        readings.push(Number(trimmed));
    }

    for (const reading of readings) {
        const index = nodes.indexOf(reading);

        if (index !== INVALID_INDEX) {
            nodes.add(index);

            return true;
        }
    }

    for (const reading of [raw, trimmed]) {
        const index = edges.indexOf(reading);

        if (index !== INVALID_INDEX) {
            edges.add(index);

            return true;
        }
    }

    return false;
}

/**
 * Check a neighbourhood target's depth, which the type says is one, two or three.
 * @param depth - What was passed.
 * @returns The depth to walk.
 * @throws A `GraphtyError` coded `E_OPTION_RANGE` when it is not 1, 2 or 3.
 */
function neighborDepth(depth: number | undefined): number {
    if (depth === undefined) {
        return DEFAULT_NEIGHBOR_DEPTH;
    }

    if (!Number.isInteger(depth) || depth < 1 || depth > MAX_NEIGHBOR_DEPTH) {
        throw badOption("depth", depth, `a whole number of steps from 1 to ${String(MAX_NEIGHBOR_DEPTH)}`);
    }

    return depth;
}

/**
 * Walk out from the seeds, adding everything reached within the depth.
 *
 * The mask is the visited set as well as the answer, so a node is expanded once however many
 * paths reach it. An undirected snapshot holds both orientations of every edge in its forward
 * adjacency, so it is walked forwards whichever direction was asked for -- walking its reverse
 * as well would visit every arc twice for the same answer.
 * @param nodes - The mask to fill, which already holds the seeds.
 * @param graph - The snapshot to walk.
 * @param seeds - The seed indices, already in the mask.
 * @param depth - How many steps to take.
 * @param direction - Which way to follow an edge.
 */
function walkNeighborhood(
    nodes: ElementMask<NodeId>,
    graph: GraphSnapshot,
    seeds: readonly number[],
    depth: number,
    direction: SelectionDirection,
): void {
    const forward = direction !== "in" || !graph.directed;
    const backward = graph.directed && direction !== "out";
    const reverse = backward ? graph.reverse() : null;
    let frontier = seeds;

    for (let step = 0; step < depth && frontier.length > 0; step++) {
        const next: number[] = [];

        for (const node of frontier) {
            if (forward) {
                for (let arc = graph.rowPtr[node]; arc < graph.rowPtr[node + 1]; arc++) {
                    if (nodes.add(graph.colIdx[arc])) {
                        next.push(graph.colIdx[arc]);
                    }
                }
            }

            if (reverse !== null) {
                for (let arc = reverse.rowPtr[node]; arc < reverse.rowPtr[node + 1]; arc++) {
                    if (nodes.add(reverse.colIdx[arc])) {
                        next.push(reverse.colIdx[arc]);
                    }
                }
            }
        }

        frontier = next;
    }
}

/**
 * The elements a neighbourhood target names.
 * @param target - The target.
 * @param context - What the resolution reads.
 * @returns The two masks.
 * @throws A `GraphtyError` coded `E_OPTION_RANGE` when the depth is outside 1 to 3.
 */
function resolveNeighborhood(target: NeighborhoodTarget, context: TargetContext): TargetMembers {
    const { nodes, edges } = emptyMasks(context);
    const depth = neighborDepth(target.depth);
    const seeds: number[] = [];

    if (target.neighborsOf === undefined) {
        for (let index = 0; index < context.selectedNodes.count; index++) {
            if (context.selectedNodes.has(index) && nodes.add(index)) {
                seeds.push(index);
            }
        }
    } else {
        for (const id of target.neighborsOf) {
            const index = nodes.indexOf(id);

            if (index !== INVALID_INDEX && nodes.add(index)) {
                seeds.push(index);
            }
        }
    }

    walkNeighborhood(nodes, context.graph, seeds, depth, target.direction ?? DEFAULT_DIRECTION);

    return { nodes, edges, unmatched: EMPTY_STRINGS, unresolvedPaths: EMPTY_PATHS };
}

/**
 * Which half of the graph a run published a field on.
 * @param result - The finished result.
 * @param field - The field name, already known to be one the result publishes.
 * @param path - The published path, for the message.
 * @returns Whether the field is published per node or per edge.
 * @throws A `GraphtyError` coded `E_BAD_COMMAND` when the name is a graph-level field, which is
 *   one number for the whole graph and so names no elements to select.
 */
function elementFieldKind(result: RunResult, field: string, path: Path): "node" | "edge" {
    const descriptor = result.fields.find((candidate) => candidate.name === field);

    if (descriptor === undefined || descriptor.kind === "graph") {
        throw new GraphtyError({
            code: "E_BAD_COMMAND",
            message:
                `"${path}" is one number for the whole graph, so it names no elements to select. ` +
                "Select on a field the run published per node or per edge.",
            source: "run",
            details: { field, runId: result.runId },
        });
    }

    return descriptor.kind;
}

/**
 * The elements a run-ranking target names.
 *
 * The ranking comes from the result rather than from a walk over the values here, because the
 * result already ranked them and a second ranking computed elsewhere can disagree with the one
 * the reader is looking at -- over ties above all, where two orderings of equal values put
 * different elements in the top twenty.
 * @param context - What the resolution reads.
 * @param run - The run to read.
 * @param field - The field to rank on.
 * @param take - Picks the entries to select out of the run's ranking, best first.
 * @returns The two masks, and the path when this session cannot answer it.
 * @throws A `GraphtyError` coded `E_UNSUPPORTED` when no results are attached.
 */
function resolveRanked(
    context: TargetContext,
    run: RunRef,
    field: string,
    take: (result: RunResult) => readonly RankingEntry[],
): TargetMembers {
    const { results } = context;

    if (results === undefined) {
        throw unsupported("a run's result", "a results registry");
    }

    const { nodes, edges } = emptyMasks(context);
    const result = results.get(run);

    if (result === undefined || !results.has(run, field)) {
        // Not a throw: a run that has not finished, and a run id read back out of a saved document
        // against a session that never started it, are both ordinary things for a consumer to
        // hold. The path travels back instead, so "0 selected" can say why it was zero.
        return { nodes, edges, unmatched: EMPTY_STRINGS, unresolvedPaths: Object.freeze([results.path(run, field)]) };
    }

    const kind = elementFieldKind(result, field, results.path(run, field));

    for (const entry of take(result)) {
        if (kind === "edge") {
            const index = edges.indexOf(String(entry.id));

            if (index !== INVALID_INDEX) {
                edges.add(index);
            }
        } else {
            const index = nodes.indexOf(entry.id);

            if (index !== INVALID_INDEX) {
                nodes.add(index);
            }
        }
    }

    return { nodes, edges, unmatched: EMPTY_STRINGS, unresolvedPaths: EMPTY_PATHS };
}

// ---------------------------------------------------------------------------------------------
// The resolver
// ---------------------------------------------------------------------------------------------

/**
 * The elements one target names.
 *
 * Synchronous, because every arm either reads a structure the session already holds or walks the
 * graph once, and because the gesture that produced the target is waiting for the highlight.
 * @param target - What to select.
 * @param context - What the resolution reads.
 * @returns The two masks, the pasted ids that named nothing, and the paths nothing answers.
 * @throws A `GraphtyError` coded `E_BAD_COMMAND` when the value is not a target, `E_UNSUPPORTED`
 *   when it names a capability this session lacks, or `E_OPTION_RANGE` when one of its options is
 *   outside the permitted range.
 */
export function resolveTarget(target: SelectionTarget, context: TargetContext): TargetMembers {
    if (typeof target !== "object" || target === null) {
        throw notATarget(target);
    }

    if ("where" in target) {
        if (context.match === undefined) {
            throw unsupported("a predicate", "a query engine");
        }

        const { nodes, edges } = emptyMasks(context);
        const matched = context.match(target.where);
        addIds(nodes, matched.nodes ?? []);
        addIds(edges, matched.edges ?? []);
        narrowToScope(context, target.scope, nodes, edges);

        return {
            nodes,
            edges,
            unmatched: EMPTY_STRINGS,
            unresolvedPaths: Object.freeze([...(matched.unresolvedPaths ?? [])]),
        };
    }

    if ("text" in target) {
        // A search box's `=` prefix: the rest is an expression, so a single text field can offer
        // both without its host parsing anything.
        if (target.mode === undefined && target.text.startsWith("=")) {
            const where = target.text.slice(1);

            return resolveTarget(target.scope === undefined ? { where } : { where, scope: target.scope }, context);
        }

        if (context.find === undefined) {
            throw unsupported("a text search", "a search index");
        }

        const { nodes, edges } = emptyMasks(context);
        const search = target.mode === undefined ? searchOf(target.text) : { text: target.text, mode: target.mode };

        for (const hit of context.find(search.text, search.mode)) {
            if (hit.kind === "edge") {
                const index = edges.indexOf(String(hit.id));

                if (index !== INVALID_INDEX) {
                    edges.add(index);
                }
            } else {
                const index = nodes.indexOf(hit.id);

                if (index !== INVALID_INDEX) {
                    nodes.add(index);
                }
            }
        }

        narrowToScope(context, target.scope, nodes, edges);

        return { nodes, edges, unmatched: EMPTY_STRINGS, unresolvedPaths: EMPTY_PATHS };
    }

    if ("ids" in target) {
        const { nodes, edges } = emptyMasks(context);
        const unmatched: string[] = [];

        for (const raw of target.ids) {
            if (!addPastedId(raw, nodes, edges)) {
                unmatched.push(raw);
            }
        }

        return { nodes, edges, unmatched: Object.freeze(unmatched), unresolvedPaths: EMPTY_PATHS };
    }

    if ("scope" in target) {
        if (context.scope === undefined) {
            throw unsupported("a scope", "a scope resolver");
        }

        const { nodes, edges } = emptyMasks(context);
        const resolved = context.scope.resolveNow(target.scope);
        addIds(nodes, resolved.nodes);
        addIds(edges, resolved.edges);

        return { nodes, edges, unmatched: EMPTY_STRINGS, unresolvedPaths: EMPTY_PATHS };
    }

    if ("top" in target) {
        const { run, field, n } = target.top;

        return resolveRanked(context, run, field, (result) => result.ranking(field, n));
    }

    if ("above" in target) {
        const { run, field, threshold } = target.above;

        if (!Number.isFinite(threshold)) {
            throw badOption("threshold", threshold, "a finite number");
        }

        return resolveRanked(context, run, field, (result) =>
            result.ranking(field).filter((entry) => entry.value > threshold),
        );
    }

    if ("edgesBetween" in target) {
        // Read through `unknown` on purpose: the type says the flag is `true`, and a caller
        // writing plain JavaScript can still pass `false`, which means nothing and must not be
        // taken for "yes".
        const flag: unknown = target.edgesBetween;

        if (flag !== true) {
            throw notATarget(target);
        }

        const { nodes, edges } = emptyMasks(context);
        const list = context.graph.edgeList();

        for (let edge = 0; edge < context.graph.edgeCount; edge++) {
            if (context.selectedNodes.has(list.src[edge]) && context.selectedNodes.has(list.dst[edge])) {
                edges.add(edge);
            }
        }

        return { nodes, edges, unmatched: EMPTY_STRINGS, unresolvedPaths: EMPTY_PATHS };
    }

    if ("invert" in target) {
        const flag: unknown = target.invert;

        if (flag !== true) {
            throw notATarget(target);
        }

        const { nodes, edges } = emptyMasks(context);
        nodes.fill();
        nodes.subtract(context.selectedNodes);
        edges.fill();
        edges.subtract(context.selectedEdges);

        return { nodes, edges, unmatched: EMPTY_STRINGS, unresolvedPaths: EMPTY_PATHS };
    }

    if (isNeighborhood(target)) {
        return resolveNeighborhood(target, context);
    }

    if (isElementIds(target)) {
        const { nodes, edges } = emptyMasks(context);
        addIds(nodes, target.nodes ?? []);
        addIds(edges, target.edges ?? []);

        return { nodes, edges, unmatched: EMPTY_STRINGS, unresolvedPaths: EMPTY_PATHS };
    }

    throw notATarget(target);
}
