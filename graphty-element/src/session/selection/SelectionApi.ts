/**
 * @file Selection: two sets, five verbs, one owner.
 *
 * A selection is a set of nodes and a set of edges, and it belongs to the SESSION rather than to
 * a view. Every view of one dataset, the data table, the inspector and a headset all read and
 * write the same two sets, and none of that is expressible if the selection lives on the thing
 * that draws it.
 *
 * THE SETS ARE MASKS, one byte per element, addressed by the dense index every node and edge
 * already carries. That is what makes selecting forty thousand nodes cost forty thousand bytes
 * rather than forty thousand ids, and it is what makes `has()` an array read a render loop can
 * afford to do once per element per frame. The id arrays are a lazy materialisation of the masks
 * and are identity-stable: the same frozen array comes back until the contents change, so a
 * consumer can hold the previous answer and test `previous === next`.
 *
 * WHAT THIS REPLACES. Selection used to be one node, nodes only, expressed by writing a flag onto
 * result bags and letting a style layer whose selector read that flag paint it. Three things were
 * wrong with that and all three are structural: a second node could not be selected, an edge
 * could not be selected at all, and the highlight competed for precedence with the layers a
 * reader had actually asked for. Selection is state, styling is a view of state, and the two are
 * separated here.
 *
 * EVERY MUTATION ANSWERS WITH A DELTA. A consumer reacting to a selection change needs to know
 * what changed, and the alternative -- holding the previous id array and diffing it -- is work
 * the element has already done while walking the masks, done again with less information.
 *
 * THE CAP IS A REFUSAL TO DO SOMETHING WORSE. Selecting every node of a two-million-node graph is
 * a memory problem and a rendering problem, and doing it silently is worse than doing less and
 * saying so. Past the cap the selection is truncated in index order and `truncated` says it
 * happened, on the API and on the delta.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import type { GraphSnapshot, U8, U32 } from "@graphty/graph-format";

import type { EdgeId, NodeId, Path, Query, ScopeId } from "../../catalog/types";
import { GraphtyError } from "../../errors";
import { arrayColumn, computeColumnStatistics } from "../results/statistics";
import type { ResultsApi } from "../results/types";
import { ElementMask, type MaskIdSpace } from "../scope/ElementMask";
import { edgeSpaceOf, nodeSpaceOf, type ScopeResolver } from "../scope/ScopeApi";
import { ATTRIBUTE_UNIQUE_CAP, type SessionRecordSource } from "../types";
import {
    resolveTarget,
    type SelectionMatch,
    type SelectionSearchHit,
    type SelectionTarget,
    type SelectionTextMode,
    type TargetContext,
} from "./targets";

/** The most elements one selection holds before it is truncated, when nothing says otherwise. */
export const DEFAULT_SELECTION_CAP = 5000;

/** The byte a mask carries for a member, which is what a captured copy is compared against. */
const MEMBER = 1;

/** The frozen empty list handed back wherever there is nothing to report. */
const EMPTY_STRINGS: readonly string[] = Object.freeze([]);

/** The frozen empty path list handed back wherever every path resolved. */
const EMPTY_PATHS: readonly Path[] = Object.freeze([]);

// ---------------------------------------------------------------------------------------------
// The surface
// ---------------------------------------------------------------------------------------------

/** What a mutation does with the elements a target named. */
export type SetOp = "replace" | "add" | "remove" | "toggle" | "intersect";

/** Every set operation, for a caller that wants to check one before passing it on. */
export const SET_OPS: readonly SetOp[] = Object.freeze(["replace", "add", "remove", "toggle", "intersect"]);

/**
 * Who asked for a selection change.
 *
 * A consumer reacts differently to the three: a change a person made with the mouse should move
 * the camera and open the inspector, and the identical change made by a script replaying a
 * saved document should do neither.
 */
export type SelectionCause = "user" | "api" | "command";

/** What one mutation changed. */
export interface SelectionDelta {
    /**
     * The elements that joined the selection, nodes first and then edges.
     *
     * Node ids and edge ids share one list because one type covers both: an edge id is a string
     * and a node id is a string or a number.
     */
    readonly added: readonly NodeId[];
    /** The elements that left the selection, nodes first and then edges. */
    readonly removed: readonly NodeId[];
    /** How many nodes the selection holds now. */
    readonly nodes: number;
    /** How many edges the selection holds now. */
    readonly edges: number;
    /** Whether this mutation dropped elements it would otherwise have selected, to stay in cap. */
    readonly truncated: boolean;
    /** The pasted ids that named nothing in this graph. Absent when every id named something. */
    readonly unmatched?: readonly string[];
    /**
     * The paths the target named that nothing in this session answers.
     *
     * Matching nothing is a legitimate answer for a selection, so an unanswerable path is
     * reported rather than thrown -- otherwise "nothing matched" and "you misspelled the run id"
     * are the same empty selection.
     */
    readonly unresolvedPaths: readonly Path[];
    /** Who asked. */
    readonly cause: SelectionCause;
}

/** One attribute of the selected nodes, summarised against the same attribute across the graph. */
export interface SelectionAttributeStatistics {
    /** The attribute's published path, such as "data.department". */
    readonly path: Path;
    /** What to call it in front of a person. */
    readonly plainName: string;
    /** The average across the selected nodes that carry a number. */
    readonly mean?: number;
    /** The middle value across the selected nodes that carry a number. */
    readonly median?: number;
    /** The lowest value across the selected nodes. */
    readonly min?: number;
    /** The highest value across the selected nodes. */
    readonly max?: number;
    /**
     * How the selected nodes divide between the values of a non-numeric attribute, commonest
     * first. Absent for a numeric attribute, and for one with more distinct values than a legend
     * could hold.
     */
    readonly distribution?: readonly { readonly value: string; readonly count: number }[];
    /** The same average across every node in the graph, so the selection can be compared to it. */
    readonly graphMean?: number;
    /** Whether the selection sits above, below or exactly on the graph's average. */
    readonly direction?: "above" | "below" | "equal";
}

/** What the current selection adds up to. */
export interface SelectionStatistics {
    /** How many nodes are selected. */
    readonly nodes: number;
    /** How many edges are selected. */
    readonly edges: number;
    /** Edges of the graph whose endpoints are both selected nodes, selected or not themselves. */
    readonly inducedEdges: number;
    /** Edges of the graph with exactly one endpoint selected, which is what a subgraph cuts. */
    readonly cutEdges: number;
    /**
     * One entry per attribute the selected nodes carry.
     *
     * Node attributes only: the entries carry no kind, so a node's `data.weight` and an edge's
     * `data.weight` would be indistinguishable in one list. What the edge half of the selection
     * adds up to is the three counts above.
     */
    readonly attributes: readonly SelectionAttributeStatistics[];
}

/**
 * The one selection a session holds.
 *
 * A consumer that only needs to know whether an element is selected calls {@link SelectionApi.has}
 * and touches no array at all; {@link SelectionApi.nodes} and {@link SelectionApi.edges} exist for
 * a consumer that wants to iterate, and are not the boundary type, because a list of every
 * selected id is unbounded in a way the masks are not.
 */
export interface SelectionApi {
    /**
     * The selected node ids, in ascending index order.
     *
     * Frozen and IDENTITY-STABLE: the same array object comes back until the contents change, so
     * `previous === next` is a valid staleness test and a read of an unchanged selection costs
     * nothing.
     */
    readonly nodes: readonly NodeId[];
    /** The selected edge ids, frozen and identity-stable in the same way. */
    readonly edges: readonly EdgeId[];
    /** How many elements are selected, counting nodes and edges together. */
    readonly size: number;
    /** The most elements this selection will hold. */
    readonly cap: number;
    /** Whether the last mutation dropped elements to stay within the cap. */
    readonly truncated: boolean;
    /**
     * Whether one element is selected.
     *
     * One array read, and no allocation at all, so a render loop can ask once per element per
     * frame. It reads the masks as they stand and never walks or rebuilds anything, which is why
     * it is the only member that does not first reconcile with the current graph.
     * @param id - The node or edge id.
     * @returns True when the element is selected.
     */
    has(id: NodeId | EdgeId): boolean;
    /**
     * The selected nodes as one byte per node, for a worker.
     * @returns A detached copy, one byte per node of the current graph.
     */
    nodeMask(): Uint8Array;
    /**
     * The selected edges as one byte per edge, for a worker.
     * @returns A detached copy, one byte per edge of the current graph.
     */
    edgeMask(): Uint8Array;
    /**
     * Change the selection.
     * @param target - What to select.
     * @param op - What to do with it. Replaces the selection when absent, which is what a click
     *     does.
     * @returns What changed.
     */
    apply(target: SelectionTarget, op?: SetOp): Promise<SelectionDelta>;
    /**
     * Empty the selection.
     * @returns What changed.
     */
    clear(): SelectionDelta;
    /**
     * Keep this selection under a name, so it can be named as a scope later.
     *
     * The saved scope holds the selected NODES: a scope's edges are induced from its nodes, so a
     * selected edge whose endpoints are not selected is not an edge any work over that scope
     * could follow.
     * @param name - The name to save it under.
     * @returns The minted scope id.
     */
    promote(name: string): ScopeId;
    /**
     * What the current selection adds up to.
     * @returns The statistics.
     */
    statistics(): Promise<SelectionStatistics>;
}

/**
 * The selection a session owns: {@link SelectionApi} plus the doors only the session uses.
 *
 * The synchronous door exists for the same reason the scope resolver's does -- `apply` is a
 * promise so that the published surface keeps its shape when a session is hosted in a worker,
 * while everything under it is synchronous and a gesture handler cannot await. The two remap
 * doors exist because a freeze that renumbers elements moves every dense index, and a mask that
 * did not follow would go on selecting whatever now sits at the old index.
 */
export interface SelectionOwner extends SelectionApi {
    /**
     * Change the selection without a promise, recording who asked.
     * @param target - What to select.
     * @param op - What to do with it; replace when absent.
     * @param cause - Who asked; the API itself when absent.
     * @returns What changed.
     */
    applyNow(target: SelectionTarget, op?: SetOp, cause?: SelectionCause): SelectionDelta;
    /**
     * The node mask itself, for the scope resolver's `selection` source.
     * @returns The live mask, which the caller must not mutate.
     */
    nodeMembers(): ElementMask<NodeId>;
    /**
     * The edge mask itself.
     * @returns The live mask, which the caller must not mutate.
     */
    edgeMembers(): ElementMask<EdgeId>;
    /**
     * Follow a freeze that renumbered the nodes.
     * @param remap - The freeze report's node remap.
     * @param count - The new node count.
     */
    remapNodes(remap: U32, count: number): void;
    /**
     * Follow a freeze that renumbered the edges.
     * @param remap - The freeze report's edge remap.
     * @param count - The new edge count.
     */
    remapEdges(remap: U32, count: number): void;
}

/**
 * Where the selection reads everything it does not hold itself.
 *
 * Each optional member is a capability, and its absence is a REFUSAL rather than an empty answer:
 * a selection that covered nothing because the session has no query engine looks exactly like a
 * predicate that matched nothing, and no consumer can tell those apart after the fact.
 */
export interface SelectionSources {
    /**
     * The snapshot the selection is addressed against.
     * @returns The current snapshot.
     */
    snapshot(): GraphSnapshot;
    /**
     * The most elements one selection may hold. {@link DEFAULT_SELECTION_CAP} when absent.
     * @returns The cap.
     */
    readonly cap?: () => number;
    /** Resolves a scope, and keeps a promoted selection. Absent refuses both. */
    readonly scope?: ScopeResolver;
    /** Reads finished runs. Absent refuses selecting by a run's ranking. */
    readonly results?: ResultsApi;
    /**
     * Evaluates a predicate. Absent refuses a `where` target.
     * @param where - The predicate.
     * @returns What it matched.
     */
    readonly match?: (where: Query) => SelectionMatch;
    /**
     * Searches text. Absent refuses a `text` target.
     * @param text - What was typed.
     * @param mode - How to match it.
     * @returns The elements found.
     */
    readonly find?: (text: string, mode: SelectionTextMode) => Iterable<SelectionSearchHit>;
    /** Where the attribute bags are read. Absent leaves the attribute statistics empty. */
    readonly records?: SessionRecordSource;
    /**
     * Called whenever the membership actually moves, so a host can mirror it onto an event.
     *
     * One hook for every verb -- `apply`, `applyNow` and `clear` all arrive here -- because a
     * consumer watching the selection has to see a click, a pasted list and a programmatic clear
     * in the same way, and must not learn about them in three.
     *
     * It fires only when something joined or left. Replacing a selection with the same elements
     * changes nothing a listener could act on, and a selection surface that re-rendered on every
     * click of an already-selected node would be doing work for no reason.
     * @param delta - What joined, what left, what the selection holds now, and who asked.
     */
    readonly onChange?: (delta: SelectionDelta) => void;
}

// ---------------------------------------------------------------------------------------------
// Inside
// ---------------------------------------------------------------------------------------------

/**
 * The snapshot and its two identity spaces, replaced as one object.
 *
 * One object rather than three variables so that replacing it is atomic: a selection holding the
 * new snapshot and the previous snapshot's edge index would address edges by endpoints that have
 * moved, and would do it in silence.
 */
interface SelectionFrame {
    /** The snapshot the spaces were built from. */
    readonly graph: GraphSnapshot;
    /** The node identity space, one object for the life of the frame. */
    readonly nodeSpace: MaskIdSpace<NodeId>;
    /** The edge identity space, one object for the life of the frame. */
    readonly edgeSpace: MaskIdSpace<EdgeId>;
}

/** The membership as it stood before a mutation, for working out what changed. */
interface CapturedMembership {
    /** One byte per node. */
    readonly nodes: U8;
    /** One byte per edge. */
    readonly edges: U8;
}

/** What one attribute looked like as a walk accumulated it. */
interface AttributeAccumulator {
    /** The finite numbers seen, in index order. */
    readonly numbers: number[];
    /** How many elements carried each distinct value, written as text. */
    readonly counts: Map<string, number>;
    /** Whether any present value was something other than a finite number. */
    nonNumeric: boolean;
    /** Whether there were more distinct values than a legend could hold. */
    tooMany: boolean;
}

/**
 * Build a frame around one snapshot.
 * @param graph - The snapshot.
 * @returns The frame.
 */
function frameOf(graph: GraphSnapshot): SelectionFrame {
    return { graph, nodeSpace: nodeSpaceOf(graph), edgeSpace: edgeSpaceOf(graph) };
}

/**
 * Fold one value into its attribute's accumulator.
 * @param accumulator - The accumulator for this attribute.
 * @param value - The value one record carried.
 */
function accumulate(accumulator: AttributeAccumulator, value: unknown): void {
    if (typeof value === "number" && Number.isFinite(value)) {
        accumulator.numbers.push(value);
    } else {
        accumulator.nonNumeric = true;
    }

    if (accumulator.tooMany) {
        return;
    }

    const text = String(value);
    const seen = accumulator.counts.get(text);

    if (seen === undefined && accumulator.counts.size >= ATTRIBUTE_UNIQUE_CAP) {
        // Past the cap the counts are dropped rather than kept: holding every distinct value of a
        // free-text column is a second copy of the column, and nothing renders it.
        accumulator.tooMany = true;
        accumulator.counts.clear();

        return;
    }

    accumulator.counts.set(text, (seen ?? 0) + 1);
}

/**
 * A fresh accumulator.
 * @returns The accumulator.
 */
function newAccumulator(): AttributeAccumulator {
    return { numbers: [], counts: new Map<string, number>(), nonNumeric: false, tooMany: false };
}

/**
 * The distribution of one non-numeric attribute, commonest first.
 * @param counts - How many elements carried each value.
 * @returns The rows, commonest first and then in value order, so two reads agree.
 */
function distributionOf(counts: ReadonlyMap<string, number>): readonly { value: string; count: number }[] {
    const rows = [...counts].map(([value, count]) => ({ value, count }));
    rows.sort((left, right) => right.count - left.count || left.value.localeCompare(right.value));

    return Object.freeze(rows.map((row) => Object.freeze(row)));
}

/**
 * Whether the selection's average sits above, below or exactly on the graph's.
 * @param mean - The selection's average.
 * @param graphMean - The graph's average.
 * @returns Which side it is on.
 */
function directionOf(mean: number, graphMean: number): "above" | "below" | "equal" {
    if (mean > graphMean) {
        return "above";
    }

    return mean < graphMean ? "below" : "equal";
}

// ---------------------------------------------------------------------------------------------
// The selection
// ---------------------------------------------------------------------------------------------

/** Two masks, five set operations, and the bookkeeping that makes a change reportable. */
class Selection implements SelectionOwner {
    readonly #sources: SelectionSources;

    readonly #nodes: ElementMask<NodeId>;

    readonly #edges: ElementMask<EdgeId>;

    #frame: SelectionFrame;

    /**
     * Whether a freeze has renumbered the elements since the frame was built.
     *
     * A remap arrives from inside the freeze, where asking the store for the new snapshot would
     * re-enter it, so the frame cannot be rebuilt at that moment. It is marked instead, and the
     * next read rebuilds it. Without this, {@link Selection.has} -- which deliberately skips the
     * sync to stay free of allocation -- would keep looking ids up in the PREVIOUS snapshot's id
     * map and test the wrong row, so a selected node could report itself unselected.
     */
    #frameStale = false;

    #truncated = false;

    /**
     * Build a selection over one session's sources, with nothing selected.
     * @param sources - Where to read the graph and the capabilities a target needs.
     */
    constructor(sources: SelectionSources) {
        this.#sources = sources;
        const graph = sources.snapshot();
        this.#frame = frameOf(graph);
        this.#nodes = new ElementMask<NodeId>(() => this.#frame.nodeSpace, Math.max(1, graph.nodeCount));
        this.#edges = new ElementMask<EdgeId>(() => this.#frame.edgeSpace, Math.max(1, graph.edgeCount));
        this.#nodes.grow(graph.nodeCount);
        this.#edges.grow(graph.edgeCount);
    }

    /**
     * The selected node ids, frozen and identity-stable.
     * @returns The ids, in ascending index order.
     */
    get nodes(): readonly NodeId[] {
        this.#sync();

        return this.#nodes.ids();
    }

    /**
     * The selected edge ids, frozen and identity-stable.
     * @returns The ids, in ascending index order.
     */
    get edges(): readonly EdgeId[] {
        this.#sync();

        return this.#edges.ids();
    }

    /**
     * How many elements are selected.
     * @returns The nodes and the edges added together.
     */
    get size(): number {
        this.#sync();

        return this.#nodes.size + this.#edges.size;
    }

    /**
     * The most elements this selection will hold.
     * @returns The cap.
     */
    get cap(): number {
        return this.#cap();
    }

    /**
     * Whether the last mutation dropped elements to stay within the cap.
     * @returns True when it did.
     */
    get truncated(): boolean {
        return this.#truncated;
    }

    /**
     * Whether one element is selected, without allocating anything.
     *
     * The node half is asked first, and the edge half only when the id could be an edge id at all
     * -- an edge is addressed by its two endpoints joined by a colon, which is always a string, so
     * a numeric id is never one. An empty half is skipped outright, which is what keeps the first
     * call on a node-only selection from building the edge index it would never read.
     * @param id - The node or edge id.
     * @returns True when the element is selected.
     */
    has(id: NodeId | EdgeId): boolean {
        // One boolean in the common case. The frame is marked stale only by a freeze that
        // renumbered the elements, so this rebuilds once per freeze rather than once per call,
        // and the render loop's per-element test stays free of allocation.
        if (this.#frameStale) {
            this.#sync();
        }

        if (this.#nodes.size > 0 && this.#nodes.hasId(id)) {
            return true;
        }

        return typeof id === "string" && this.#edges.size > 0 && this.#edges.hasId(id);
    }

    /**
     * The selected nodes as one byte per node.
     * @returns A detached copy.
     */
    nodeMask(): Uint8Array {
        this.#sync();

        return this.#nodes.bytes();
    }

    /**
     * The selected edges as one byte per edge.
     * @returns A detached copy.
     */
    edgeMask(): Uint8Array {
        this.#sync();

        return this.#edges.bytes();
    }

    /**
     * The node mask itself, for the scope resolver's `selection` source.
     * @returns The live mask.
     */
    nodeMembers(): ElementMask<NodeId> {
        this.#sync();

        return this.#nodes;
    }

    /**
     * The edge mask itself.
     * @returns The live mask.
     */
    edgeMembers(): ElementMask<EdgeId> {
        this.#sync();

        return this.#edges;
    }

    /**
     * Follow a freeze that renumbered the nodes.
     * @param remap - The freeze report's node remap.
     * @param count - The new node count.
     */
    remapNodes(remap: U32, count: number): void {
        this.#nodes.remap(remap, count);
        this.#frameStale = true;
    }

    /**
     * Follow a freeze that renumbered the edges.
     * @param remap - The freeze report's edge remap.
     * @param count - The new edge count.
     */
    remapEdges(remap: U32, count: number): void {
        this.#edges.remap(remap, count);
        this.#frameStale = true;
    }

    /**
     * Change the selection.
     * @param target - What to select.
     * @param op - What to do with it; replace when absent.
     * @returns What changed.
     */
    apply(target: SelectionTarget, op?: SetOp): Promise<SelectionDelta> {
        return Promise.resolve(this.applyNow(target, op));
    }

    /**
     * Change the selection without a promise.
     *
     * The target is resolved to a pair of masks and the operation is set algebra between that
     * pair and the pair already held, in both halves. A target that names no edges names an EMPTY
     * edge set, which is why replacing the selection with a list of nodes leaves no edges
     * selected: anything else would be an operation no set algebra performs.
     * @param target - What to select.
     * @param op - What to do with it; replace when absent, which is what a click does.
     * @param cause - Who asked; the API itself when absent.
     * @returns What changed.
     * @throws A `GraphtyError` coded `E_BAD_COMMAND` when the target or the operation is not one,
     *   `E_UNSUPPORTED` when the target names a capability this session lacks, or
     *   `E_OPTION_RANGE` when one of the target's options is outside the permitted range.
     */
    applyNow(target: SelectionTarget, op: SetOp = "replace", cause: SelectionCause = "api"): SelectionDelta {
        this.#sync();
        assertOp(op);
        // The cap is read BEFORE anything is mutated: a session configured with a cap that is not
        // a whole number of elements refuses the call rather than leaving the selection half
        // changed with an exception on its way out.
        const cap = this.#cap();
        const members = resolveTarget(target, this.#context());
        const before = this.#capture();

        if (op === "replace") {
            this.#nodes.clear();
            this.#edges.clear();
        }

        if (op === "replace" || op === "add") {
            this.#nodes.union(members.nodes);
            this.#edges.union(members.edges);
        } else if (op === "remove") {
            this.#nodes.subtract(members.nodes);
            this.#edges.subtract(members.edges);
        } else if (op === "toggle") {
            this.#nodes.symmetricDifference(members.nodes);
            this.#edges.symmetricDifference(members.edges);
        } else {
            this.#nodes.intersect(members.nodes);
            this.#edges.intersect(members.edges);
        }

        this.#truncated = this.#enforceCap(cap);

        return this.#delta(before, members.unmatched, members.unresolvedPaths, cause);
    }

    /**
     * Empty the selection.
     * @returns What changed.
     */
    clear(): SelectionDelta {
        this.#sync();
        const before = this.#capture();
        this.#nodes.clear();
        this.#edges.clear();
        this.#truncated = false;

        return this.#delta(before, EMPTY_STRINGS, EMPTY_PATHS, "api");
    }

    /**
     * Keep this selection under a name, as a saved scope over its nodes.
     * @param name - The name to save it under.
     * @returns The minted scope id.
     * @throws A `GraphtyError` coded `E_UNSUPPORTED` when no scope resolver is attached, or
     *   `E_SCOPE_EMPTY` when no node is selected.
     */
    promote(name: string): ScopeId {
        this.#sync();
        const { scope } = this.#sources;

        if (scope === undefined) {
            throw new GraphtyError({
                code: "E_UNSUPPORTED",
                message: "This session cannot keep a selection under a name, because it holds no saved scopes.",
                source: "run",
                details: { name },
            });
        }

        if (this.#nodes.size === 0) {
            throw new GraphtyError({
                code: "E_SCOPE_EMPTY",
                message: `No node is selected, so there is nothing to save as "${name}".`,
                source: "run",
                details: { name, edges: this.#edges.size },
            });
        }

        return scope.save(name, { nodes: this.#nodes.ids() });
    }

    /**
     * What the current selection adds up to.
     * @returns The statistics.
     */
    statistics(): Promise<SelectionStatistics> {
        this.#sync();
        const { graph } = this.#frame;
        const list = graph.edgeList();
        let induced = 0;
        let cut = 0;

        for (let edge = 0; edge < graph.edgeCount; edge++) {
            const source = this.#nodes.has(list.src[edge]);
            const target = this.#nodes.has(list.dst[edge]);

            if (source && target) {
                induced += 1;
            } else if (source || target) {
                cut += 1;
            }
        }

        return Promise.resolve(
            Object.freeze({
                nodes: this.#nodes.size,
                edges: this.#edges.size,
                inducedEdges: induced,
                cutEdges: cut,
                attributes: this.#attributeStatistics(),
            }),
        );
    }

    /**
     * Reconcile the masks with the graph as it stands.
     *
     * Growth is prefix-stable, so a node that arrived since the last call is simply not selected,
     * and a shrink drops the rows that no longer exist. A freeze that RENUMBERED elements is not
     * visible here -- only the remap carries that -- which is why the session delivers it through
     * {@link Selection.remapNodes} and {@link Selection.remapEdges}.
     */
    #sync(): void {
        const graph = this.#sources.snapshot();

        if (graph !== this.#frame.graph) {
            this.#frame = frameOf(graph);
        }

        this.#frameStale = false;

        if (this.#nodes.count !== graph.nodeCount) {
            this.#nodes.grow(graph.nodeCount);
        }

        if (this.#edges.count !== graph.edgeCount) {
            this.#edges.grow(graph.edgeCount);
        }
    }

    /**
     * What a target resolution reads.
     * @returns The context, built around the frame the selection is synchronised to.
     */
    #context(): TargetContext {
        const { scope, results, match, find } = this.#sources;

        return {
            graph: this.#frame.graph,
            nodeSpace: this.#frame.nodeSpace,
            edgeSpace: this.#frame.edgeSpace,
            selectedNodes: this.#nodes,
            selectedEdges: this.#edges,
            ...(scope === undefined ? {} : { scope }),
            ...(results === undefined ? {} : { results }),
            ...(match === undefined ? {} : { match }),
            ...(find === undefined ? {} : { find }),
        };
    }

    /**
     * The cap this session applies.
     * @returns The cap, as a non-negative whole number of elements.
     * @throws A `GraphtyError` coded `E_OPTION_RANGE` when the session's cap is not one.
     */
    #cap(): number {
        const cap = this.#sources.cap?.() ?? DEFAULT_SELECTION_CAP;

        if (!Number.isInteger(cap) || cap < 0) {
            throw new GraphtyError({
                code: "E_OPTION_RANGE",
                message: `A selection cap is a whole number of elements, not ${String(cap)}.`,
                source: "config",
                details: { option: "selectionCap", value: cap, min: 0 },
            });
        }

        return cap;
    }

    /**
     * Drop members past the cap, nodes kept before edges and each in index order.
     *
     * The order is fixed rather than arbitrary so that selecting the same thing twice truncates
     * to the same elements: a cap that kept a different half each time would make a truncated
     * selection unreproducible, and everything computed from it unrepeatable.
     * @param cap - The most elements to keep.
     * @returns True when anything was dropped.
     */
    #enforceCap(cap: number): boolean {
        if (this.#nodes.size + this.#edges.size <= cap) {
            return false;
        }

        let kept = 0;

        for (let index = 0; index < this.#nodes.count; index++) {
            if (this.#nodes.has(index)) {
                if (kept < cap) {
                    kept += 1;
                } else {
                    this.#nodes.delete(index);
                }
            }
        }

        for (let index = 0; index < this.#edges.count; index++) {
            if (this.#edges.has(index)) {
                if (kept < cap) {
                    kept += 1;
                } else {
                    this.#edges.delete(index);
                }
            }
        }

        return true;
    }

    /**
     * The membership as it stands, detached from the masks.
     * @returns The copy.
     */
    #capture(): CapturedMembership {
        return { nodes: this.#nodes.bytes(), edges: this.#edges.bytes() };
    }

    /**
     * What changed between a captured membership and the one held now.
     *
     * A row that the graph itself dropped is not reported: it has no id any more, and naming the
     * element that now sits at its index would be a lie.
     * @param before - The membership before the mutation.
     * @param unmatched - The pasted ids that named nothing.
     * @param unresolvedPaths - The paths nothing in this session answers.
     * @param cause - Who asked.
     * @returns The delta.
     */
    #delta(
        before: CapturedMembership,
        unmatched: readonly string[],
        unresolvedPaths: readonly Path[],
        cause: SelectionCause,
    ): SelectionDelta {
        const added: NodeId[] = [];
        const removed: NodeId[] = [];
        const { nodeSpace, edgeSpace } = this.#frame;

        for (let index = 0; index < this.#nodes.count; index++) {
            const was = index < before.nodes.length && before.nodes[index] === MEMBER;
            const is = this.#nodes.has(index);

            if (is && !was) {
                added.push(nodeSpace.idOf(index));
            } else if (was && !is) {
                removed.push(nodeSpace.idOf(index));
            }
        }

        for (let index = 0; index < this.#edges.count; index++) {
            const was = index < before.edges.length && before.edges[index] === MEMBER;
            const is = this.#edges.has(index);

            if (is && !was) {
                added.push(edgeSpace.idOf(index));
            } else if (was && !is) {
                removed.push(edgeSpace.idOf(index));
            }
        }

        const delta: SelectionDelta = Object.freeze({
            added: Object.freeze(added),
            removed: Object.freeze(removed),
            nodes: this.#nodes.size,
            edges: this.#edges.size,
            truncated: this.#truncated,
            ...(unmatched.length === 0 ? {} : { unmatched: Object.freeze([...unmatched]) }),
            unresolvedPaths: Object.freeze([...unresolvedPaths]),
            cause,
        });

        if (added.length > 0 || removed.length > 0) {
            this.#sources.onChange?.(delta);
        }

        return delta;
    }

    /**
     * One entry per attribute the selected nodes carry, each compared with the whole graph.
     *
     * The graph-wide average is computed the same way as the selection's -- the same function over
     * the values in the same order -- so a selection of every node reports `"equal"` rather than a
     * direction invented by the last bits of two different summations.
     * @returns The entries, in the order the attribute names were first seen.
     */
    #attributeStatistics(): readonly SelectionAttributeStatistics[] {
        const { records } = this.#sources;

        if (records === undefined || this.#nodes.size === 0) {
            return Object.freeze([]);
        }

        const { graph } = this.#frame;
        const selected = new Map<string, AttributeAccumulator>();

        for (let index = 0; index < this.#nodes.count; index++) {
            if (!this.#nodes.has(index)) {
                continue;
            }

            const bag = records.nodeAttributes(index, graph.ids.idOf(index));

            if (bag === undefined) {
                continue;
            }

            for (const [key, value] of Object.entries(bag)) {
                if (value === null || value === undefined) {
                    continue;
                }

                let accumulator = selected.get(key);

                if (accumulator === undefined) {
                    accumulator = newAccumulator();
                    selected.set(key, accumulator);
                }

                accumulate(accumulator, value);
            }
        }

        const numeric = new Set<string>();

        for (const [key, accumulator] of selected) {
            if (!accumulator.nonNumeric && accumulator.numbers.length > 0) {
                numeric.add(key);
            }
        }

        const graphValues = this.#graphValues(records, numeric);
        const described: SelectionAttributeStatistics[] = [];

        for (const [key, accumulator] of selected) {
            described.push(Object.freeze(describeAttribute(key, accumulator, graphValues.get(key))));
        }

        return Object.freeze(described);
    }

    /**
     * Every graph-wide value of the attributes the selection summarised numerically.
     * @param records - Where the attribute bags are read.
     * @param wanted - The attribute names to gather.
     * @returns The values by attribute name, in node index order.
     */
    #graphValues(records: SessionRecordSource, wanted: ReadonlySet<string>): ReadonlyMap<string, number[]> {
        const values = new Map<string, number[]>();

        if (wanted.size === 0) {
            return values;
        }

        const { graph } = this.#frame;

        for (const key of wanted) {
            values.set(key, []);
        }

        for (let index = 0; index < graph.nodeCount; index++) {
            const bag = records.nodeAttributes(index, graph.ids.idOf(index));

            if (bag === undefined) {
                continue;
            }

            for (const key of wanted) {
                const value = bag[key];

                if (typeof value === "number" && Number.isFinite(value)) {
                    values.get(key)?.push(value);
                }
            }
        }

        return values;
    }
}

/**
 * One attribute's entry, numeric or categorical.
 * @param name - The attribute's key.
 * @param accumulator - What the walk over the selection saw.
 * @param graphValues - Every value of the same attribute across the graph, when it is numeric.
 * @returns The entry.
 */
function describeAttribute(
    name: string,
    accumulator: AttributeAccumulator,
    graphValues: readonly number[] | undefined,
): SelectionAttributeStatistics {
    const base = { path: `data.${name}`, plainName: name };

    if (accumulator.nonNumeric || accumulator.numbers.length === 0) {
        return accumulator.tooMany ? base : { ...base, distribution: distributionOf(accumulator.counts) };
    }

    const selected = computeColumnStatistics(arrayColumn(accumulator.numbers));
    const whole = computeColumnStatistics(arrayColumn(graphValues ?? accumulator.numbers));

    return {
        ...base,
        mean: selected.mean,
        median: selected.median,
        min: selected.min,
        max: selected.max,
        graphMean: whole.mean,
        direction: directionOf(selected.mean, whole.mean),
    };
}

/**
 * Check a value is one of the five set operations.
 * @param op - The value to check.
 * @throws A `GraphtyError` coded `E_BAD_COMMAND` when it is not.
 */
function assertOp(op: SetOp): void {
    if (!SET_OPS.includes(op)) {
        throw new GraphtyError({
            code: "E_BAD_COMMAND",
            message: `A selection is changed by ${SET_OPS.join(", ")}, not by "${op}".`,
            source: "run",
            details: { op, available: SET_OPS },
        });
    }
}

/**
 * Build the selection one session owns.
 * @param sources - Where to read the graph and the capabilities a target needs.
 * @returns The selection, with nothing selected.
 */
export function createSelectionApi(sources: SelectionSources): SelectionOwner {
    return new Selection(sources);
}
