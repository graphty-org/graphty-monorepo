/**
 * Shared mock graph factory for algorithm tests
 *
 * This module provides a centralized, typed mock graph implementation for testing
 * algorithms. Algorithms expect a Graph type but only use getDataManager(), so we
 * provide a minimal mock that satisfies this interface.
 *
 * The return type is Graph to satisfy algorithm constructors, but internally it's
 * a simplified mock object.
 *
 * The mock keeps a REAL GraphStore, built from the same records, because an algorithm reads its
 * input from the snapshot the store freezes -- not from the node and edge maps, which hold render
 * objects in the running element. The maps are still here: results are written back onto them.
 */
import type { DerivedGraph, GraphSnapshot } from "@graphty/graph-format";

import { AccelerationController, AcceleratorRegistry } from "../../src/acceleration";
import { GraphStore } from "../../src/data/GraphStore";
import { ingestEdge, ingestNode, resolveEdgeWeight } from "../../src/data/ingest";
import type { Graph } from "../../src/Graph";

/**
 * Options for creating a mock graph
 */
/**
 * A node data object with id and optional extra properties
 */
interface NodeData {
    id: string | number;
    [key: string]: unknown;
}

/**
 * An edge data object with source and destination ids and optional extra properties
 */
interface EdgeData {
    srcId: string | number;
    dstId: string | number;
    [key: string]: unknown;
}

/**
 * Options for creating a mock graph
 */
export interface MockGraphOpts {
    /** Array of node objects with id and optional properties */
    nodes?: NodeData[];
    /** Array of edge objects with srcId, dstId, and optional properties */
    edges?: EdgeData[];
    /** Path to a JSON data file to import nodes/edges from */
    dataPath?: string;
    /**
     * What the store is told about direction; `"auto"` (the default) leaves the builder directed.
     *
     * A mock that declares `false` freezes an UNDIRECTED snapshot, which is what an algorithm that
     * refuses one has to be tested against.
     */
    directed?: boolean;
}

/**
 * Internal mock node type for algorithm results storage
 */
interface MockNode {
    id: string | number;
    algorithmResults?: Record<string, Record<string, Record<string, unknown>>>;
    [key: string]: unknown;
}

/**
 * Internal mock edge type for algorithm results storage
 */
interface MockEdge {
    /** The element-assigned edge id: the counter this mock hands out, printed. */
    id: string;
    srcId: string | number;
    dstId: string | number;
    algorithmResults?: Record<string, Record<string, Record<string, unknown>>>;
    [key: string]: unknown;
}

/**
 * Type for graph-level algorithm results
 */
type GraphResults = Record<string, Record<string, Record<string, unknown>>>;

/**
 * The two data-manager members an algorithm reads its input through.
 */
export interface MockSnapshotSource {
    /** The current snapshot of the mock's records. */
    getSnapshot: () => GraphSnapshot;
    /** The undirected view of that snapshot. */
    undirected: (snapshot: GraphSnapshot) => DerivedGraph;
}

/**
 * Build the store the algorithms actually read, out of a mock's records.
 *
 * Any mock graph that an algorithm will be run against needs this: since the algorithms moved off
 * the render object graph, the node and edge maps alone are no longer an input they can see.
 *
 * The weight path is "weight", which is the element's configured default; `resolveEdgeWeight`
 * falls back to the legacy "value" key, which is what every fixture in this repository carries.
 * @param nodes - the mock's node records, keyed by id
 * @param edges - the mock's edge records, keyed by "srcId:dstId"
 * @param directed - what to tell the store about direction; "auto" leaves the builder directed
 * @returns the two members to put on the mock's data manager
 */
export function createMockSnapshotSource(
    nodes: ReadonlyMap<string | number, Record<string | number, unknown>>,
    edges: ReadonlyMap<string | number, Record<string | number, unknown>>,
    directed: boolean | "auto" = "auto",
): MockSnapshotSource {
    const store = new GraphStore({
        directed,
        positionScale: () => 1,
        onNodeRemap: () => undefined,
        onEdgeRemap: () => undefined,
        onReplaced: () => undefined,
    });

    for (const [id, record] of nodes) {
        ingestNode(store, id, record);
    }

    for (const record of edges.values()) {
        const { index } = ingestEdge(store, record.srcId, record.dstId, resolveEdgeWeight(record, "weight").weight);
        // `Edge.index` is the dense row an edge result is keyed by, and `DataManager` writes it
        // onto every edge it builds. A mock whose edges lack it is a mock an edge-result adapter
        // cannot read.
        record.index = index;
    }

    return {
        getSnapshot: () => store.getSnapshot(),
        undirected: (snapshot) => store.undirected(snapshot),
    };
}

/**
 * Creates a mock graph for algorithm testing
 *
 * This function creates a mock graph object that satisfies the Graph interface
 * as used by algorithms. Algorithms only use getDataManager() to access nodes
 * and edges, so this mock provides a minimal implementation.
 *
 * @param opts - Configuration options for the mock graph
 * @returns A mock graph that can be passed to algorithm constructors
 *
 * @example
 * ```typescript
 * // Create empty mock graph
 * const graph = await createMockGraph();
 *
 * // Create mock graph with inline data
 * const graph = await createMockGraph({
 *   nodes: [{id: "A"}, {id: "B"}],
 *   edges: [{srcId: "A", dstId: "B"}]
 * });
 *
 * // Create mock graph from JSON file (path relative to mockGraph.ts)
 * const graph = await createMockGraph({
 *   dataPath: "./data4.json"
 * });
 *
 * // Use with an algorithm
 * const algo = new DegreeAlgorithm(graph);
 * await algo.run();
 *
 * // Access results through the mock
 * const dm = graph.getDataManager();
 * const nodeA = dm.nodes.get("A");
 * console.log(nodeA.algorithmResults.graphty.degree.inDegree);
 * ```
 */
export async function createMockGraph(opts: MockGraphOpts = {}): Promise<Graph> {
    const nodes = new Map<string | number, MockNode>();
    const edges = new Map<string | number, MockEdge>();
    let graphResults: GraphResults | undefined;

    // Add inline nodes (deep copy to avoid shared state between tests)
    if (opts.nodes) {
        for (const n of opts.nodes) {
            nodes.set(n.id, { ...n } as MockNode);
        }
    }

    // Add inline edges (deep copy to avoid shared state between tests). Keyed by the element's
    // own edge id, which is a counter handed out in arrival order -- the same thing `DataManager`
    // does, and what makes two edges between one pair two entries rather than one.
    let nextEdgeId = 0;
    if (opts.edges) {
        for (const e of opts.edges) {
            const id = String(nextEdgeId++);
            edges.set(id, { ...e, id } as MockEdge);
        }
    }

    // Import nodes and edges from data file (deep copy to avoid shared state between tests)
    if (typeof opts.dataPath === "string") {
        const imp = (await import(opts.dataPath)) as {
            nodes: NodeData[];
            edges: EdgeData[];
        };
        for (const n of imp.nodes) {
            nodes.set(n.id, { ...n } as MockNode);
        }
        for (const e of imp.edges) {
            const id = String(nextEdgeId++);
            edges.set(id, { ...e, id } as MockEdge);
        }
    }

    // Push the same records into a real store, nodes first and then edges, which is the order
    // DataManager pushes them in. Order matters: it is the order the snapshot assigns dense
    // indices in, and an algorithm that breaks a tie by node order would otherwise see a different
    // graph here than in the running element.
    const snapshots = createMockSnapshotSource(nodes, edges, opts.directed ?? "auto");

    // Create mock graph with data manager
    // Using a type assertion because we're creating a minimal mock that only
    // implements the parts of Graph that algorithms actually use (getDataManager)
    const mockGraph = {
        nodes,
        edges,
        /* The one controller a real `Graph` builds in its constructor, which is where an algorithm
           with an accelerated implementation asks whether to use one. Its own registry, so a fake
           registered by one test is invisible to the next; a test attaches one with
           `graph.acceleration.setAccelerator(fake)`. */
        acceleration: new AccelerationController({ policy: "auto", minNodes: 0, registry: new AcceleratorRegistry() }),
        getDataManager() {
            return {
                nodes,
                edges,
                ...snapshots,
                get graphResults() {
                    return graphResults;
                },
                set graphResults(val: GraphResults | undefined) {
                    graphResults = val;
                },
            };
        },
    };

    // Cast to Graph - algorithms only use getDataManager() which we implement
    return mockGraph as unknown as Graph;
}

/**
 * Helper to get a node from the mock graph
 * @param graph - The graph (as returned by createMockGraph)
 * @param nodeId - The node ID to look up
 * @returns The node object (any type)
 */
 
export function getMockNode(graph: Graph, nodeId: string | number): any {
     
    const dm = graph.getDataManager() as any;
    return dm.nodes.get(nodeId);
}

// An algorithm's result is no longer scattered onto the render objects; these read it out of what
// the run published. See ./algorithmResults for the 1.x key vocabulary and what it became.
export type { ResultCarrier } from "./algorithmResults";
export { getEdgeResult, getGraphResult, getNodeResult } from "./algorithmResults";
