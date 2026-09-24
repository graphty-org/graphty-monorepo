/**
 * @file The vocabulary of a graph session: what it holds, what it hands back, and what it needs
 * from the element in order to answer.
 *
 * A session is the graph with no screen attached. Everything declared here is plain data, a
 * typed array, or a function over those, and nothing in this file -- or anything it imports --
 * reaches Babylon.js, Lit or the DOM. That is the whole point of the split: the same object that
 * backs a rendered view backs a Node test with no GPU, and two views of one dataset are one of
 * these and two renderers.
 *
 * The rule that decides whether a thing belongs here or on the view: if two synchronised views
 * of one dataset would DISAGREE about it, it belongs to the view. A camera disagrees. Node
 * count, coordinates and statistics do not.
 */

import type { DerivedGraph, GraphSnapshot, NodeId } from "@graphty/graph-format";
import type { z } from "zod/v4";

import type {
    AccelerationCapabilities,
    AccelerationPolicy,
    AccelerationStatus,
    GraphAccelerator,
} from "../acceleration";
// EdgeId comes from the ELEMENT's catalogue rather than from graph-format, which is the one line
// that makes `const id: EdgeId = record.id` type-check. This entry point used to publish two
// different EdgeId types -- graph-format's `string | number` on EdgeRecord and the catalogue's
// `string` everywhere else -- so assigning one to the other was an error on the element's own
// published surface.
import type { AlgorithmKey, AttributeDescriptor, CatalogApi, EdgeId, RunId, Scope } from "../catalog/types";
import type { DataConfig } from "../config/DataConfig";
import type { ElementPositions } from "../data/positions";
import type { ImportReport } from "../data/report";
import type { GraphtyError } from "../errors/GraphtyError";
import type { CostEstimate, CostGateLimits, CostMeasurement, MachineCalibration } from "./cost";
import type { Plan, SessionCommand } from "./planning";
import type { ResultsApi } from "./results";
import type { Caveats, EngineVersions, Run, RunChange, RunExecutor, RunOptions, RunQueue, RunsApi } from "./runs";
import type { ScopeApi } from "./scope/index";
import type { SelectionApi, SelectionDelta, SelectionOwner } from "./selection";
import type { ElementPaint, SessionStylesApi, StyleChange, StylesApi } from "./styles";
import type { SessionVisibilityApi, VisibilityApi, VisibilityChange } from "./visibility";

/**
 * The element's data configuration, parsed: the id and weight paths, the position scale, the
 * direction policy and the id coercion rule.
 *
 * It is the configuration the session's own behaviour reads, which is why it is the part of the
 * configuration a session carries. The style layers, the camera defaults and the XR settings are
 * the view's, and they are not here.
 */
export type SessionDataConfig = Readonly<z.output<typeof DataConfig>>;

/** A node as a consumer reads it: its id, and whatever attributes its record arrived with. */
export interface NodeRecord {
    /** The id the record was imported under. */
    readonly id: NodeId;
    /** Every other key the record carried. */
    readonly [attribute: string]: unknown;
}

/** An edge as a consumer reads it: its endpoints, and whatever attributes its record carried. */
export interface EdgeRecord {
    /** The element-assigned edge id. */
    readonly id: EdgeId;
    /** The id of the node the edge leaves. */
    readonly source: NodeId;
    /** The id of the node the edge enters. */
    readonly target: NodeId;
    /** Every other key the record carried. */
    readonly [attribute: string]: unknown;
}

/** The attribute bag one record arrived with, as the session reads it. */
export type SessionAttributes = Readonly<Record<string, unknown>>;

/**
 * The connected-component shape of the graph.
 *
 * `sizes` is the size distribution rather than only the largest, because without it a consumer
 * has to walk `componentOf` over every node to answer "are the small parts mostly single
 * nodes?", and that walk is the sort of graph logic that belongs in the element.
 */
export interface ComponentStatistics {
    /** How many connected components the graph has, counting isolated nodes as components. */
    readonly count: number;
    /** Component sizes, descending, capped at `COMPONENT_SIZE_CAP` entries. */
    readonly sizes: readonly number[];
    /** The size of the largest component; zero for an empty graph. */
    readonly largestSize: number;
    /** How many components hold exactly one node. */
    readonly isolatedCount: number;
    /** True when `sizes` was cut short by the cap, so it is a prefix rather than the whole list. */
    readonly truncatedSizes: boolean;
    /**
     * Which component a node belongs to.
     * @param id - the node id
     * @returns the component number, or undefined when the graph has no such node
     */
    componentOf(id: NodeId): number | undefined;
}

/**
 * How the graph's direction came to be what it is.
 *
 * WHY THE SOURCE IS PUBLISHED AND NOT ONLY THE ANSWER. "This graph is directed" and "this file
 * said it is directed" are different claims, and a reader deciding whether to trust the first one
 * needs the second. A properties panel that prints "Directed" on a CSV nobody labelled is stating
 * the element's own default as though it were a fact about the data; the same word on a GEXF file
 * whose header says so is reporting what the author wrote. Without this, a consumer cannot tell
 * those apart, and the only alternative is to re-parse the file they already handed over.
 */
export interface DirectionProvenance {
    /**
     * What settled the direction.
     *
     * `"file"` when an importer read it out of the data -- from a header the file wrote, or from
     * the default its format's own specification assigns to a file that omits that header.
     * `"configuration"` when `data.directed` was set to a boolean, which no file can overrule.
     * `"unsettled"` when nothing has said yet, which is an empty graph under `"auto"`, and a graph
     * loaded entirely from formats that state nothing.
     */
    readonly by: "file" | "configuration" | "unsettled";
    /**
     * The text that said so, ready to show a reader: `defaultedgetype="undirected"`, `digraph`,
     * `*Arcs`, `the GML default for an absent directed key (undirected)`.
     *
     * Null whenever no file settled it, so a consumer can render "Directed" and "Directed (from
     * `digraph`)" from the same two fields without a second lookup.
     */
    readonly statedBy: string | null;
}

/**
 * The facts about the graph's shape that a consumer would otherwise compute for itself.
 *
 * Every field is derived from one snapshot and cached against it, so the first read after a
 * change pays for the walk and every later read in the same revision is free.
 */
export interface GraphStatistics {
    /** Nodes in the snapshot. */
    readonly nodeCount: number;
    /** Edges in the snapshot, self-loops and repeats included. */
    readonly edgeCount: number;
    /**
     * Edges as a fraction of the pairs that could carry one, self-loops excluded from both
     * halves. Zero for a graph with fewer than two nodes.
     */
    readonly density: number;
    /**
     * Whether the graph is directed, as a fact about the graph rather than a guess per edge.
     *
     * `"unknown"` is the honest answer for an empty graph the element was never told about:
     * under `data.directed: "auto"` nothing has settled the question yet. `"mixed"` is in the
     * union because a format can report it; the element does not produce it today, because a
     * snapshot carries one flag for the whole graph.
     */
    readonly directedness: "directed" | "undirected" | "mixed" | "unknown";
    /** Where {@link GraphStatistics.directedness} came from, so a reader can qualify the claim. */
    readonly directednessSource: DirectionProvenance;
    /** True when any edge carries a weight other than 1. */
    readonly weighted: boolean;
    /** Edges whose two endpoints are the same node. */
    readonly selfLoopCount: number;
    /** Edges beyond the first between the same pair of endpoints. */
    readonly repeatedEdgeCount: number;
    /** The smallest and the largest total degree in the graph; `[0, 0]` when there are no nodes. */
    readonly degreeRange: readonly [number, number];
    /**
     * The mean total degree, over the same measure {@link GraphStatistics.degreeRange} summarises:
     * both ends of every edge counted, so a self-loop contributes two. Zero for an empty graph.
     *
     * It is published because the alternative is every consumer deriving it from the edge count,
     * and `2m / n` is the undirected reading: on a directed graph it double-counts, and on any
     * graph it disagrees with the range printed beside it the moment self-loops are involved. One
     * number measured from the same vector as the range cannot drift from it.
     */
    readonly meanDegree: number;
    /** The connected-component shape. */
    readonly components: ComponentStatistics;
}

/**
 * The O(1) half of a session: the facts a status chip or a disabled button needs before it can
 * decide how to behave.
 *
 * Nothing here walks the graph. Reading `counts` does freeze the builder when records have
 * arrived since the last freeze, but the freeze is cached, so a burst of a thousand records
 * costs exactly one however many readers ask afterwards.
 */
export interface SessionStatus {
    /** False once {@link GraphSession.dispose} has run; the session answers nothing after that. */
    readonly ready: boolean;
    /** How much graph there is. */
    readonly counts: {
        /** Nodes in the store, which mid-load can exceed the nodes that have been drawn. */
        readonly nodes: number;
        /** Edges in the store, which mid-load can exceed the edges that have been drawn. */
        readonly edges: number;
        /**
         * Nodes the filters and the time window have left showing.
         *
         * This is the DATA scope, and it is the number a status bar means by "showing 1,204 of
         * 50,000". It is NOT the render set: above the renderer's ceiling fewer nodes are drawn
         * than are counted here, and a run over the `"visible"` scope covers these rather than
         * whatever happened to reach a mesh.
         */
        readonly visibleNodes: number;
        /** Edges the filters and the time window have left showing, on the same terms. */
        readonly visibleEdges: number;
    };
    /** The direction the current snapshot is frozen with; false for a disposed session. */
    readonly directed: boolean;
}

/**
 * What the session needs from the one graph-format builder behind it.
 *
 * It is an interface rather than the concrete `GraphStore` because the element's `DataManager`
 * owns the store for a rendered graph and answers exactly these three members, while a headless
 * session builds a `GraphStore` of its own. Both are "the store" as far as the session is
 * concerned, and the session disposes only the one it made.
 */
export interface SessionGraphStore {
    /**
     * The current snapshot, freezing first when records have arrived since the last one.
     * @returns the immutable snapshot
     */
    getSnapshot(): GraphSnapshot;
    /**
     * The undirected view of a snapshot, built once per snapshot and cached.
     * @param snapshot - a snapshot this store produced
     * @returns the derived graph
     */
    undirected(snapshot: GraphSnapshot): DerivedGraph;
    /** The element-owned node coordinates, indexed by dense node index. */
    readonly positions: ElementPositions;
    /**
     * How many nodes the DATA arrived carrying a coordinate for.
     *
     * THE HONEST ANSWER to "did the file that loaded this graph place its nodes", which
     * {@link ElementPositions.placedCount} cannot give: the position array is written by the
     * importer AND by every running layout, so a moment after a file with no coordinates loads,
     * every node carries a position because the layout put it there. This counts the importer's
     * own seed column, which nothing but the importer writes.
     * @returns the count, zero for a graph with no data
     */
    readonly seededNodeCount: number;
    /**
     * How the direction of the graph in this store was settled, and by what text.
     *
     * The store is where the answer lives because the snapshot cannot carry it: a snapshot holds
     * one direction FLAG and no record of who set it, and by the time statistics are computed the
     * importer that read the file has been thrown away.
     */
    readonly directionSettledBy: DirectionProvenance;
    /**
     * What the last load into this store did: which endpoint spelling answered, how many repeated
     * edges were seen and what the policy did with them, and how many edges the graph holds.
     *
     * Optional because a store built by a session that nothing ever imported into has never had a
     * load to report on.
     */
    readonly lastImport?: ImportReport | null;
}

/**
 * Where the session reads the attributes a record arrived with.
 *
 * The store carries ids, coordinates and weights; it does not yet carry the arbitrary keys a
 * record was imported with, and those still live on the element's render objects. Until an
 * attribute column lands in the store, a session over a rendered graph reads them through this
 * seam and a session with no view reports a graph with no attributes -- which is true rather
 * than merely convenient.
 *
 * A node is looked up by BOTH its index and its id because the two holders are keyed
 * differently: the element's node render objects are in a map keyed by id, and its edge render
 * objects are in an array keyed by dense store index. Each implementation uses the key it has.
 */
export interface SessionRecordSource {
    /**
     * The attributes the node at this row arrived with.
     * @param index - the dense node index in the current snapshot
     * @param id - the same node's id
     * @returns the attribute bag, or undefined when nothing is held for that node
     */
    nodeAttributes(index: number, id: NodeId): SessionAttributes | undefined;
    /**
     * The attributes the edge at this row arrived with.
     * @param index - the dense edge index in the current snapshot
     * @returns the attribute bag, or undefined when nothing is held for that edge
     */
    edgeAttributes(index: number): SessionAttributes | undefined;
}

/**
 * Reading the graph.
 *
 * Every verb here is synchronous, because every verb here is either an O(1) lookup or a walk
 * whose answer is cached against the snapshot it was computed from. The verbs that must walk the
 * graph on every call -- id listings over a scope, neighbour pages, search -- are asynchronous by
 * construction and are not part of this surface yet.
 */
export interface SessionDataApi {
    /** The store this session reads, whether it built it or was handed one. */
    readonly store: SessionGraphStore;
    /**
     * The current snapshot.
     * @returns the immutable graph-format snapshot
     */
    snapshot(): GraphSnapshot;
    /**
     * The undirected view of the current snapshot, or of one handed in.
     * @param snapshot - the snapshot to derive from; the current one by default
     * @returns the derived graph, including the edge remap an edge result needs
     */
    undirected(snapshot?: GraphSnapshot): DerivedGraph;
    /**
     * One node, by id.
     * @param id - the node id, compared without coercion: 1 and "1" are two different nodes
     * @returns the record, or undefined when the graph has no such node
     */
    node(id: NodeId): NodeRecord | undefined;
    /**
     * One edge, by the element-assigned edge id.
     * @param id - the edge id
     * @returns the record, or undefined when the graph has no such edge
     */
    edge(id: EdgeId): EdgeRecord | undefined;
    /**
     * What the last load did: which endpoint spelling the element resolved, how many repeated
     * edges it saw and what the policy did with them, and how many edges the graph actually holds.
     *
     * A door as well as the two load events, because those are fire-and-forget: a consumer that
     * subscribed after the load has no other way to ask.
     * @returns the report, or null when nothing has been loaded into this graph
     */
    lastImport(): ImportReport | null;
    /**
     * Every attribute the graph's records carry, with its type, how complete it is and a few
     * sample values. Walked once per snapshot and cached.
     * @returns the descriptors, node attributes first, each kind in first-seen order
     */
    attributes(): readonly AttributeDescriptor[];
    /**
     * The graph's shape. Walked once per snapshot and cached.
     * @returns the statistics
     */
    statistics(): GraphStatistics;
    /**
     * A stable identity for the graph's topology: equal fingerprints mean the same node ids in
     * the same order with the same arcs between them. Attributes and coordinates are not in it.
     * @returns the fingerprint
     */
    fingerprint(): string;
}

/**
 * The part of the catalogue a session can answer today: the seven capability tables, which are
 * plain data and need no graph, plus `metrics()`, which needs one.
 *
 * Six of the seven -- algorithms, cameras, formats, layouts, log destinations and palettes --
 * carry the element's own entries followed by whatever a third party registered, because those
 * are the six supported extension points and an extension a picker cannot find is half an
 * extension. `scales` is the element's own table alone.
 *
 * `metrics()` is the graph-dependent half's first member, and it is here because everything it
 * reads now exists: the catalogue declares what each algorithm requires of a graph, the cost model
 * answers what one would take over the scope a run would cover and reports a requirement the graph
 * does not meet as an unavailability rather than a throw, and the runs API holds what has already
 * been run. A consumer wanting only the metrics that CAN run filters on `available`; both lists
 * come off one call rather than two that could disagree.
 *
 * The rest of the graph-dependent half of {@link CatalogApi} -- what an option's bounds resolve to
 * over a scope, whether an expression references anything real -- is still absent rather than
 * stubbed, because the query engine it reads does not exist yet. A consumer discovers that gap by
 * autocomplete finding nothing, not by a call that throws.
 */
export type SessionCatalogApi = Pick<
    CatalogApi,
    "algorithms" | "cameras" | "formats" | "layouts" | "logSinks" | "metrics" | "palettes" | "scales"
>;

/** The configuration a session carries. */
export interface SessionConfig {
    /** The data configuration: id paths, weight paths, position scale, direction, id coercion. */
    readonly data: SessionDataConfig;
    /** What the consumer asked of the hardware. */
    readonly acceleration: {
        /** Use an accelerator when one is available, never look, or refuse to run without one. */
        readonly policy: AccelerationPolicy;
        /** The node count at or above which accelerated work actually uses the accelerator. */
        readonly minNodes: number;
    };
}

/**
 * What a session publishes to whoever is watching it.
 *
 * A map rather than a bare handler, so that the events arriving with the layout, the camera and
 * the journal are added without changing a signature. An event that does not fire is not declared
 * here: a consumer discovers the gap by autocomplete finding nothing rather than by subscribing
 * to something silent.
 */
export interface SessionEventMap {
    /** A run reached one of the four watched moments. */
    "run:changed": RunChange;
    /**
     * Elements joined or left the selection.
     *
     * Only a real movement arrives: selecting what is already selected changes nothing a listener
     * could act on, and is not published.
     */
    "selection:changed": SelectionDelta;
    /** A filter, the time window or the context flag changed what is showing. */
    "visibility:changed": VisibilityChange;
    /**
     * A layer was added, changed, removed or moved, and how much of the picture it repainted.
     *
     * Published for every verb that changes the stack, including the ones that write several
     * layers at once: one event per EDIT rather than one per layer, because an edit is what a
     * consumer undoes, records and mirrors.
     */
    "style:changed": StyleChange;
    /**
     * The element tried to paint something of its own and was refused.
     *
     * THE ONLY STYLE FAILURE A CONSUMER CANNOT OTHERWISE SEE. A style edit a consumer asks for
     * rejects the promise it handed back, so the refusal arrives at the call that caused it. The
     * element also paints on its own account -- a run's suggested encoding lands on the run's
     * first completion, without anybody awaiting it -- and a refusal there had nowhere to go:
     * the work is fire-and-forget by design, because the element must not make a consumer await
     * the picture in order to have started the run. So it arrives here instead.
     *
     * A graph that quietly kept the picture it had while the element believed it had painted a
     * new one is the exact defect this whole style system replaces. Subscribe to this and a
     * consumer can say "the degree colouring could not be applied" instead of leaving a reader
     * looking at an old picture that reads as an answer.
     */
    "style:problem": StyleProblem;
    /** Every acceleration transition; the document is the one `capabilities` returns. */
    "capabilities:changed": { readonly capabilities: AccelerationCapabilities };
}

/**
 * A painting the element started for itself, and why it did not land.
 *
 * Structured-cloneable: the run's id and a `GraphtyError`, so it survives being posted to a
 * worker or written to a log.
 */
export interface StyleProblem {
    /** The run whose suggested styling was refused. */
    readonly runId: RunId;
    /** Why it was refused. */
    readonly error: GraphtyError;
}

/**
 * A graph with no view attached.
 *
 * The session holds the graph data, the coordinates, the runs and their results, the scope,
 * selection and visibility models, the style layers, the status, the catalogue, the configuration
 * and the measured capabilities of the machine. A renderer binds to one; a Node test uses one on
 * its own; two synchronised views of one dataset share one.
 *
 * What is deliberately NOT here yet: the layout transport, notes and the journal. Each waits on
 * work that has not landed, and each is absent rather than stubbed.
 */
export interface GraphSession {
    /** Reading the graph. */
    readonly data: SessionDataApi;
    /** Starting computations, watching them, stopping them, and finding them again. */
    readonly runs: RunsApi;
    /** Addressing what a run produced: the path, the lookup and the completion list. */
    readonly results: ResultsApi;
    /**
     * Which elements a piece of work is allowed to look at: resolving a specification, counting
     * it without resolving it, and keeping one under a name.
     */
    readonly scope: ScopeApi;
    /**
     * What is selected: two sets, five set operations, one selection for the whole session.
     *
     * Every surface reads and writes this one -- the canvas, a data table, an inspector, a
     * headset -- which is why it belongs to the session rather than to the thing that draws it.
     */
    readonly selection: SelectionApi;
    /**
     * What is visible: the DATA scope, produced by the filters and the time window.
     *
     * Never the render set. Above the renderer's ceiling fewer elements are drawn than are
     * visible here, and "analyse the visible graph" means this model rather than whatever
     * happened to be drawn.
     */
    readonly visibility: VisibilityApi;
    /**
     * The style layers: what paints what, in what order, and why one element looks as it does.
     *
     * The stack is read BOTTOM FIRST, so a layer later in `list()` paints over one earlier in
     * it, and every layer is addressed by its id rather than by its place -- a position is what
     * goes wrong the moment anything else moves.
     *
     * The bottom of every stack is the element's own: the layers that give a node and an edge
     * their appearance before anything else is asked for. They carry `source.by === "element"`
     * and `locked: true`, and removing, editing or moving one is refused. That is what a
     * consumer tests rather than the layer's NAME, which two layers may share and a reader may
     * change.
     */
    readonly styles: StylesApi;
    /**
     * The element-owned node coordinates: a stride-3 Float32Array indexed by dense node index,
     * where a row no layout has placed reads NaN rather than the origin.
     *
     * The typed placement verbs of the design's positions API -- pinning, snapshot and restore,
     * per-id reads -- arrive with the layout work. This is the array itself, which is what a
     * layout, a drag and a GPU readback all write into.
     */
    readonly positions: ElementPositions;
    /**
     * How many nodes the DATA arrived carrying a coordinate for.
     *
     * Ask this, not `positions.placedCount`, whenever the question is "did the file place these
     * nodes". The array above is written by the importer AND by every running layout, so one
     * frame after a file with no coordinates loads, every node carries a position because the
     * layout put it there. This counts the importer's own column, which nothing else writes.
     */
    readonly seededNodeCount: number;
    /** The O(1) facts, always current. */
    readonly status: SessionStatus;
    /** Everything the element can offer, as data. */
    readonly catalog: SessionCatalogApi;
    /** The configuration this session was built with. */
    readonly config: SessionConfig;
    /** What this machine can do, measured rather than guessed at by the consumer. */
    readonly capabilities: AccelerationCapabilities;
    /**
     * What the consumer asks of the hardware: use an accelerator when there is one, never look,
     * or refuse to run without one.
     *
     * Settable, and the set applies at once: the next piece of accelerated work is planned under
     * the new policy, and `capabilities:changed` reports where that left the hardware.
     */
    acceleration: AccelerationPolicy;
    /**
     * Attach an accelerator the caller built, or detach the current one with `null`.
     *
     * For tests and third parties. An injected accelerator is never replaced by a probed one and
     * is not disposed by the session -- whoever built it owns its lifetime.
     * @param accelerator - The accelerator to attach, or null to detach.
     */
    setAccelerator(accelerator: GraphAccelerator | null): void;
    /**
     * The current snapshot, by reference: nothing is copied.
     * @returns the immutable graph-format snapshot
     */
    snapshot(): GraphSnapshot;
    /**
     * The topology fingerprint. Same answer as `data.fingerprint()`.
     * @returns the fingerprint
     */
    fingerprint(): string;
    /**
     * Do one thing, as a command.
     *
     * The same verb `runs.start` offers, reached through the serialisable form -- so a recipe, a
     * journal entry and an agent's tool call all replay through one door rather than three.
     * @param command - What to do.
     * @param options - The signal, the progress handler and how the call joins the queue.
     * @returns The run, awaitable and watchable straight away.
     */
    run(command: SessionCommand, options?: RunOptions): Run;
    /**
     * What one command would cost, answered synchronously.
     *
     * Synchronous because a user interface has to decide how a button behaves before the click
     * happens, and a promise cannot gate a click. It is O(1) in the size of the graph: the
     * session maintains the statistics it reads.
     * @param command - What would be done.
     * @returns The estimate, which reports `available: false` with a reason rather than throwing.
     */
    estimate(command: SessionCommand): CostEstimate;
    /**
     * What one command would do, what it would cost, and whether it would be allowed.
     * @param command - What would be done.
     * @returns The plan.
     */
    plan(command: SessionCommand): Promise<Plan>;
    /**
     * Watch the session.
     * @param event - Which event.
     * @param handler - Called with the event's detail.
     * @returns A function that stops the subscription. There is no `off` to learn.
     */
    on<K extends keyof SessionEventMap>(event: K, handler: (detail: SessionEventMap[K]) => void): () => void;
    /**
     * Release what this session owns: the accelerator it attached, the store it built, and every
     * run still in flight.
     *
     * A store handed in by a caller is NOT disposed -- the caller that built it owns its
     * lifetime. Calling this twice is harmless.
     */
    dispose(): void;
}

/**
 * The session as the element's own renderer holds it: everything a consumer sees, plus the two
 * live mask readers the render loop needs.
 *
 * Both extras exist for the same reason and it is a shape disagreement rather than a privilege.
 * A consumer reads the selection as a list of ids and the visible set as a set of ids; the render
 * loop needs the mask OBJECTS, so that it can test one element at a time and key its "have I
 * already drawn this?" bookkeeping on a mask's version without materialising a list of fifty
 * thousand ids every frame. Nothing here decides anything a consumer could not decide -- the
 * verbs are the same verbs -- which is why the renderer is not a privileged consumer, merely a
 * per-element one.
 */
export interface ElementSession extends GraphSession {
    /** The selection, with the synchronous door a gesture handler needs and the live masks. */
    readonly selection: SelectionOwner;
    /** Visibility, with the live masks. */
    readonly visibility: SessionVisibilityApi;
    /** The style stack, with the compiled form a repaint reads and a consumer has no use for. */
    readonly styles: SessionStylesApi;
    /**
     * What the last style pass painted, per element.
     *
     * The third member of the same shape disagreement. A consumer asks what one element looks
     * like through `styles.explain(...)`, which answers in whole sentences about layers; a render
     * loop asks fifty thousand times a second which source mesh an element belongs to and what
     * colour to write into its instance, and it asks by dense index. Neither the questions nor
     * the verbs differ -- the stack is still the one that decides -- only the shape of the answer.
     */
    readonly paint: ElementPaint;
}

/** What {@link createGraphSession} accepts. */
export interface CreateGraphSessionOptions {
    /**
     * The store to read. When absent the session builds one of its own and disposes it with
     * itself.
     */
    readonly store?: SessionGraphStore;
    /** Where to read the attributes a record arrived with. Absent means the graph has none. */
    readonly records?: SessionRecordSource;
    /** The configuration. Every part not given takes the element's own default. */
    readonly config?: {
        /**
         * The data configuration, or a function that reads it.
         *
         * Hand in a FUNCTION when the host REPLACES its configuration object rather than mutating
         * it -- applying a new style template to the element does exactly that -- or the session
         * would go on answering from the configuration that was in force when it was built, and
         * would report a graph as undirected after it had been told otherwise.
         */
        readonly data?: SessionDataConfig | (() => SessionDataConfig);
        /** The acceleration policy and threshold. */
        readonly acceleration?: {
            /** Use an accelerator when available, never look, or refuse to run without one. */
            readonly policy?: AccelerationPolicy;
            /** The node count at or above which accelerated work uses the accelerator. */
            readonly minNodes?: number;
        };
    };
    /**
     * An acceleration controller to publish capabilities from, so a host that already owns one
     * does not end up with two. When absent the session builds one and disposes it with itself.
     */
    readonly acceleration?: AccelerationControllerLike;
    /** How this session runs algorithms. */
    readonly runs?: SessionRunsOptions;
}

/**
 * How a session runs algorithms.
 *
 * `execute` is the one member without a default, and the reason is worth stating: every algorithm
 * this package ships is constructed from the renderer's `Graph` and reads the graph through its
 * data manager, so the session -- which must resolve in Node with no renderer anywhere in its
 * import graph -- cannot reach one. The element builds the executor and hands it in. A session
 * built without one answers `runs.start` with `E_UNSUPPORTED` rather than pretending.
 */
export interface SessionRunsOptions {
    /**
     * The thing that actually runs an algorithm. Absent means this session cannot run one.
     */
    readonly execute?: RunExecutor;
    /**
     * The queue runs take their turn in. Absent builds a sequential one of the session's own,
     * which is right for a headless session and wrong for a rendered graph: a rendered graph has
     * loads, layouts and style passes that must not interleave with a run, and it hands in the
     * element's own operation queue so that they do not.
     */
    readonly queue?: RunQueue;
    /** Which versions are producing the numbers. Defaults to the element's own. */
    readonly engine?: EngineVersions;
    /** What a call that names no scope gets. Defaults to the visible graph. */
    readonly defaultScope?: Scope;
    /** The caveats a run starts from, before the work refines them. */
    readonly defaultCaveats?: Caveats;
    /** The cap and the memory budget the cost gate compares a run against. */
    readonly limits?: Readonly<CostGateLimits>;
    /** Reads this machine's measured throughput, when the host has measured it. */
    readonly calibration?: () => MachineCalibration | undefined;
    /** Reads the most recent timing of each algorithm on this machine. */
    readonly measurements?: () => ReadonlyMap<AlgorithmKey, CostMeasurement> | undefined;
}

/**
 * The part of the acceleration controller a session uses.
 *
 * Declared structurally so that a caller can hand in the controller it already holds without the
 * session naming the class, and so that a test can publish a fixed capability document.
 */
export interface AccelerationControllerLike {
    /** The published capabilities subset. */
    readonly capabilities: AccelerationCapabilities;
    /** What the consumer asked for. */
    readonly policy: AccelerationPolicy;
    /** The node count at or above which accelerated work uses the accelerator. */
    readonly minNodes: number;
    /**
     * Changes what the consumer asks of the hardware.
     * @param policy - The new policy.
     */
    setPolicy(policy: AccelerationPolicy): void;
    /**
     * Attaches an accelerator the caller built, or detaches the current one with `null`.
     * @param accelerator - The accelerator, or null to detach.
     */
    setAccelerator(accelerator: GraphAccelerator | null): void;
    /**
     * Watches every transition.
     * @param listener - Called with the new status.
     * @returns A function that stops the subscription.
     */
    onChange(listener: (status: AccelerationStatus) => void): () => void;
    /** Releases the hardware. */
    dispose(): void;
}

/** The largest number of component sizes {@link ComponentStatistics.sizes} will list. */
export const COMPONENT_SIZE_CAP = 1000;

/** How many sample values an {@link AttributeDescriptor} carries. */
export const ATTRIBUTE_SAMPLE_CAP = 5;

/**
 * Above this many distinct values an attribute stops being counted as a category, and
 * `uniqueCount` stops being tracked exactly.
 */
export const ATTRIBUTE_UNIQUE_CAP = 256;
