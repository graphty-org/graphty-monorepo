/**
 * Layout extension point. NORMATIVE for shapes; behaviour in design/extensions/layout.md.
 * Entry point: @graphty/graphty-element/extend. Serialised form of the descriptor:
 * design/extensions/descriptors.schema.json#/$defs/LayoutDescriptor (published) and
 * #/$defs/AuthoredLayoutDescriptor (what a class writes).
 */
import type { OptionDescriptor } from "./common";

// Graph-format types a layout names. Structural: see layout.md section 9.
import type { GraphSnapshot, NodeMask } from "@graphty/graph-format";

// =============================================================================================
// Published (graphty-element 2.6.1)
// =============================================================================================

/** The built-in arrangement ids. Reserved, as are the names of the element's own engines. */
export declare const KNOWN_LAYOUT_IDS: readonly [
    "force", "force-2d", "circular", "radial", "hierarchical", "grid", "shell",
    "spectral", "bipartite", "layers", "fixed", "random",
];

/** A layout id: a built-in name or a registered one. OPEN UNION. */
export type LayoutId = (typeof KNOWN_LAYOUT_IDS)[number] | (string & {});

/** A node id. */
export type NodeIdType = string | number;

/**
 * A node as a layout sees it. TYPE-ONLY: a layout MUST NOT construct one and SHOULD read only
 * `id`. The element's Node class has many more members; they are not part of this contract.
 */
export interface Node {
    readonly id: NodeIdType;
    /** The node's row in the element's snapshot; what isHeld and the position array are indexed by. */
    readonly index: number;
    /** The node's attributes as loaded. Read-only for a layout. */
    readonly data: Readonly<Record<string, unknown>>;
}

/** An edge as a layout sees it. TYPE-ONLY; read only the members below. */
export interface Edge {
    readonly id: string;
    readonly srcId: NodeIdType;
    readonly dstId: NodeIdType;
    /** The edge's attributes as loaded. Read-only for a layout. */
    readonly data: Readonly<Record<string, unknown>>;
}

/** A coordinate. z is absent or 0 in two dimensions. */
export interface Position {
    x: number;
    y: number;
    z?: number;
}

/** Where an edge's two ends are drawn. */
export interface EdgePosition {
    src: Position;
    dst: Position;
}

/** One layout, as the catalogue publishes it. */
export interface LayoutDescriptor {
    /** MUST equal the class's static type. */
    id: LayoutId;
    plainName: string;
    technicalName: string;
    description: string;
    /** A grouping for pickers, e.g. "force-directed", "geometric", "hierarchical". */
    family: string;
    /** live: stepped until settled. batch: placed in one pass. */
    kind: "live" | "batch";
    maxDimensions: 2 | 3;
    /** The largest graph the layout is comfortable with; "any" for no stated limit. */
    sizeRating: "any" | 10000 | 2000 | 500;
    /** Structural inputs the layout reads through its options (a root node, a partition, an ordering). */
    structuralInputs: readonly ("node" | "partition" | "ordering")[];
    options: readonly OptionDescriptor[];
    /** The implementation behind the id; for a plugin, its own type. */
    engine: string;
    /** DERIVED from static honoursWeights. */
    honoursWeights: boolean;
    /** DERIVED from static scoped. */
    scoped: boolean;
}

/** What a layout class writes. IMPLEMENTED BY EXTENSIONS. */
export type AuthoredLayoutDescriptor = Omit<LayoutDescriptor, "honoursWeights" | "scoped">;

/**
 * The engine base class. A live layout EXTENDS it.
 * Statics and abstract members: IMPLEMENTED BY EXTENSIONS. Protected helpers: CALLED BY EXTENSIONS.
 * Methods the element calls: see layout.md section 3 for the order.
 */
export declare abstract class LayoutEngine {
    /** The id. */
    static type: string;
    /** 2 or 3. */
    static maxDimensions: number;
    /** Whether the engine arranges a weighted graph differently. Default false. */
    static honoursWeights: boolean;
    /** Whether the engine can lay out a scope while holding every other node still. Default false. */
    static scoped: boolean;
    /** REQUIRED of a third-party engine. */
    static descriptor?: AuthoredLayoutDescriptor;

    /** Called once, awaited, before the first step or read. */
    abstract init(): Promise<void>;
    abstract addNode(n: Node): void;
    abstract addEdge(e: Edge): void;
    abstract getNodePosition(n: Node): Position;
    /** The reader dropped a dragged node here; the engine MUST keep it there. */
    abstract setNodePosition(n: Node, p: Position): void;
    abstract getEdgePosition(e: Edge): EdgePosition;
    /** Advance one iteration. A batch engine does nothing. */
    abstract step(): void;
    /** Fix a node where it is until unpin. */
    abstract pin(n: Node): void;
    abstract unpin(n: Node): void;
    abstract get nodes(): Iterable<Node>;
    abstract get edges(): Iterable<Edge>;
    /** True once stepping would change nothing visible. */
    abstract get isSettled(): boolean;

    /** Default: addNode for each. MAY be overridden for a bulk path. */
    addNodes(nodes: Node[]): void;
    addEdges(edges: Edge[]): void;
    /** Default: nothing. An engine that keeps per-node state MUST override both. */
    removeNode(n: Node): void;
    removeEdge(e: Edge): void;
    /** Called on the engine being replaced. Release timers, workers, listeners. */
    dispose(): void;
    /** Copy coordinates into the element's position array. Default walks getNodePosition. */
    publishPositions(): void;
    /** The hold mask of a scoped layout, or null. A scoped engine overrides and calls super first. */
    setHoldMask(mask: NodeMask | null, rows: number): void;
    get holdMask(): NodeMask | null;

    /** Whether the element is holding this row still. CALLED BY EXTENSIONS. */
    protected isHeld(index: number): boolean;
    /**
     * Write one coordinate into the element's position array. Returns false (and writes nothing)
     * for a held row that already has a coordinate, or a node with no row. CALLED BY EXTENSIONS.
     */
    protected writeNodePosition(n: Node, x: number, y: number, z: number, intent?: "layout" | "placement"): boolean;

    /**
     * Register an engine class. Returns the class. Throws GraphtyError E_BAD_COMMAND
     * (details.field: type, descriptor, descriptor.id) or E_DUPLICATE_PLUGIN.
     * NOTE: takes no RegisterOptions in 2.6.1 (README open decision 6).
     */
    static register<T extends new (opts: object) => LayoutEngine>(cls: T): T;
}

/** The options every SimpleLayoutEngine accepts beside its own. */
export interface SimpleLayoutOpts {
    /** Multiplies every computed coordinate. Default 100. */
    scalingFactor?: number;
}

/**
 * The base class for a layout computed in one pass. A batch layout EXTENDS it and implements only
 * doLayout. IMPLEMENTED BY EXTENSIONS: doLayout, the statics.
 */
export declare abstract class SimpleLayoutEngine extends LayoutEngine {
    constructor(opts?: SimpleLayoutOpts);
    protected _nodes: Node[];
    protected _edges: Edge[];
    /** true until doLayout has run for the current nodes and edges. */
    stale: boolean;
    /** doLayout writes here: node id -> [x, y] or [x, y, z], in layout units before scaling. */
    positions: Record<string | number, number[]>;
    scalingFactor: number;
    /** Compute every position from _nodes and _edges into positions, then set stale = false. */
    abstract doLayout(): void;

    init(): Promise<void>;
    addNode(n: Node): void;
    addEdge(e: Edge): void;
    getNodePosition(n: Node): Position;
    setNodePosition(n: Node, p: Position): void;
    getEdgePosition(e: Edge): EdgePosition;
    step(): void;
    pin(n: Node): void;
    unpin(n: Node): void;
    get nodes(): Iterable<Node>;
    get edges(): Iterable<Edge>;
    readonly isSettled: true;
}

export declare function registeredLayoutDescriptors(): readonly LayoutDescriptor[];
export declare function clearRegisteredLayoutsForTesting(): void;

// =============================================================================================
// Proposed (NOT built) -- open decision "A snapshot-based layout contract" (README.md 12, item 14)
// =============================================================================================


/** PROPOSED. What a batch layout over the snapshot is given. CALLED BY EXTENSIONS. */
export interface SnapshotLayoutInput {
    /** The graph, or the scope's compact subgraph for a scoped layout. */
    readonly graph: GraphSnapshot;
    readonly dimensions: 2 | 3;
    /** Validated and defaulted against descriptor.options. */
    readonly options: Readonly<Record<string, unknown>>;
    /** Rows the layout MUST NOT move (pinned or outside the scope), with their current coordinates. */
    readonly fixed: { readonly rows: NodeMask; readonly positions: Float32Array };
    readonly signal: AbortSignal;
    report(progress: { readonly fraction: number | null; readonly message?: string }): void;
}

/**
 * PROPOSED. A batch layout as a function over the snapshot: returns interleaved coordinates, one
 * row per snapshot node, `dimensions` numbers per row. IMPLEMENTED BY EXTENSIONS.
 */
export interface SnapshotLayoutRegistration {
    readonly descriptor: LayoutDescriptor;
    readonly compute: (input: SnapshotLayoutInput) => Promise<Float32Array>;
}
