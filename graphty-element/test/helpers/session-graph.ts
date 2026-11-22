/**
 * A real headless session holding a given graph, for algorithm tests.
 *
 * An algorithm runs on a session's data surface (`algorithmHostOf`), so a test builds the graph
 * with `createGraphSession` and `session.data.addNodes` / `addEdges`, exactly as a consumer does,
 * and hands the algorithm the host. Nothing here imitates the element: the snapshot, the
 * undirected view, the node records and the loaded weight are the session's own.
 *
 * Beside the host the helper keeps the records the test passed in, keyed the way the session keys
 * them (node id; the element-assigned edge id), each edge carrying the row (`index`) the session
 * gave it, so a test can walk them and read a result back by id.
 */
import { AccelerationController, AcceleratorRegistry } from "../../src/acceleration";
import { type AlgorithmData, type AlgorithmHost, algorithmHostOf } from "../../src/algorithms/host";
import type { Graph } from "../../src/Graph";
import { createGraphSession } from "../../src/session/GraphSession";
import type { GraphSession } from "../../src/session/types";

/** A node record: an id and any other attributes. */
interface NodeData {
    id: string | number;
    [key: string]: unknown;
}

/** An edge record: its endpoints as `srcId` and `dstId`, and any other attributes. */
interface EdgeData {
    srcId: string | number;
    dstId: string | number;
    [key: string]: unknown;
}

/** The graph a session-backed test graph holds. */
export interface SessionGraphOpts {
    /** The nodes, in order. */
    nodes?: NodeData[];
    /** The edges, in order. */
    edges?: EdgeData[];
    /** A JSON file of `{ nodes, edges }` to load after them, relative to this module. */
    dataPath?: string;
    /** The session's `data.directed`; `"auto"` (the default) leaves the graph directed. */
    directed?: boolean;
    /**
     * The edge column runs read as their weight when given no `weight` option, set as the
     * session's `data.knownFields.edgeWeightPath`. Absent: no column has the weight role, so runs
     * read no loaded weight, and the store still reads each edge's weight from its "weight" key or
     * the legacy "value" key, the way a graph loaded with no weight column but legacy weights does.
     */
    loadedWeight?: string;
}

/** A node record as the test passed it. */
export interface SessionNode {
    id: string | number;
    [key: string]: unknown;
}

/** An edge record as the test passed it, with the id and the row the session gave it. */
export interface SessionEdge {
    /** The element-assigned edge id. */
    id: string;
    /** The edge's row in the session's snapshot. */
    index: number;
    srcId: string | number;
    dstId: string | number;
    [key: string]: unknown;
}

/** The records a test reads back, beside the session's data surface. */
export type SessionGraphData = AlgorithmData & {
    readonly nodes: ReadonlyMap<string | number, SessionNode>;
    readonly edges: ReadonlyMap<string, SessionEdge>;
};

/** What `createSessionGraph` returns: the host an algorithm runs on, and the session behind it. */
export type SessionGraph = Omit<AlgorithmHost, "getDataManager" | "acceleration"> & {
    /** The session the graph lives in. */
    readonly session: GraphSession;
    /** The session's own controller, with its own registry, so a fake attached here stays here. */
    readonly acceleration: AccelerationController;
    readonly nodes: ReadonlyMap<string | number, SessionNode>;
    readonly edges: ReadonlyMap<string, SessionEdge>;
    getDataManager(): SessionGraphData;
};

/**
 * Build a headless session holding a graph, and the host an algorithm runs on over it.
 * @param opts - The graph.
 * @returns The host, with the session and the records.
 * @example
 * ```typescript
 * const graph = await createSessionGraph({ nodes: [{ id: "A" }, { id: "B" }], edges: [{ srcId: "A", dstId: "B" }] });
 * const result = await new DegreeAlgorithm(graph).publishResult(detachedRunContext(), "r");
 * ```
 */
export async function createSessionGraph(opts: SessionGraphOpts = {}): Promise<SessionGraph> {
    const nodeRecords: NodeData[] = (opts.nodes ?? []).map((node) => ({ ...node }));
    const edgeRecords: EdgeData[] = (opts.edges ?? []).map((edge) => ({ ...edge }));

    if (typeof opts.dataPath === "string") {
        const imported = (await import(opts.dataPath)) as { nodes: NodeData[]; edges: EdgeData[] };
        nodeRecords.push(...imported.nodes.map((node) => ({ ...node })));
        edgeRecords.push(...imported.edges.map((edge) => ({ ...edge })));
    }

    // Its own registry, so an accelerator one test registers is invisible to the next; a test
    // attaches one with `graph.acceleration.setAccelerator(fake)`.
    const acceleration = new AccelerationController({
        policy: "auto",
        minNodes: 0,
        registry: new AcceleratorRegistry(),
    });
    const session = createGraphSession({
        acceleration,
        // Nothing draws a test graph, and a routing test needs more nodes than a renderer's ceiling.
        limits: { renderCeiling: 1_000_000, edgesDrawn: 2_000_000 },
        config: {
            data: {
                directed: opts.directed ?? "auto",
                knownFields: {
                    edgeSrcIdPath: "srcId",
                    edgeDstIdPath: "dstId",
                    edgeWeightPath: opts.loadedWeight ?? null,
                },
            },
        },
    });

    await session.data.addNodes(nodeRecords);
    // With no weight path the store reads only the legacy "value" key, so a "weight" is handed
    // to it under that name too; the records the test reads back are left as given.
    await session.data.addEdges(
        opts.loadedWeight !== undefined
            ? edgeRecords
            : edgeRecords.map((edge) =>
                  edge.weight === undefined || edge.value !== undefined ? edge : { ...edge, value: edge.weight },
              ),
    );

    const nodes = new Map<string | number, SessionNode>(nodeRecords.map((node) => [node.id, node]));
    const held = session.data.edges();
    if (held.length !== edgeRecords.length) {
        throw new Error(`the session holds ${String(held.length)} edges of the ${String(edgeRecords.length)} given`);
    }
    const edges = new Map<string, SessionEdge>(
        held.map((record, index) => [record.id, { ...edgeRecords[index], id: record.id, index }]),
    );

    const host = algorithmHostOf(session);
    const data: SessionGraphData = Object.assign(Object.create(host.getDataManager()) as AlgorithmData, {
        nodes,
        edges,
    });

    return {
        ...host,
        getDataManager: () => data,
        session,
        acceleration,
        nodes,
        edges,
    };
}

/** The graph an AI command test runs on: a chain of nodes and the edges between them. */
export interface CommandGraphOpts {
    /** How many nodes, `node-0` onwards. Default: 10. */
    nodeCount?: number;
    /** How many edges, each from node `i` to node `i + 1`, wrapping round. Default: 15. */
    edgeCount?: number;
    /** A node's own fields, in place of `label` and a nested `data.type`. */
    nodeData?: (index: number) => Record<string, unknown>;
    /** An edge's own fields, in place of a `weight` of `(index % 10) / 10`. */
    edgeData?: (index: number) => Record<string, unknown>;
}

/**
 * A real headless session holding a chain graph, behind the graph handle an AI command takes.
 * The commands read the graph only through `getSession()`, so the handle carries nothing else.
 * @param opts - The graph.
 * @returns The handle.
 */
export async function createCommandGraph(opts: CommandGraphOpts = {}): Promise<Graph> {
    const { nodeCount = 10, edgeCount = 15, nodeData, edgeData } = opts;
    const types = ["server", "client", "router"];
    const nodes = Array.from({ length: nodeCount }, (_, i) => ({
        id: `node-${String(i)}`,
        ...(nodeData ? nodeData(i) : { label: `Node ${String(i)}`, data: { type: types[i % 3] } }),
    }));
    const edges = Array.from({ length: nodeCount === 0 ? 0 : edgeCount }, (_, i) => ({
        srcId: nodes[i % nodeCount].id,
        dstId: nodes[(i + 1) % nodeCount].id,
        ...(edgeData ? edgeData(i) : { weight: (i % 10) / 10 }),
    }));
    const { session } = await createSessionGraph({ nodes, edges, loadedWeight: "weight" });
    return { getSession: () => session } as unknown as Graph;
}

/**
 * A node record, by id.
 * @param graph - The graph.
 * @param nodeId - The node id.
 * @returns The record, or undefined.
 */
export function getSessionNode(graph: SessionGraph, nodeId: string | number): SessionNode | undefined {
    return graph.nodes.get(nodeId);
}

// An algorithm's result is no longer scattered onto the render objects; these read it out of what
// the run published. See ./algorithmResults for the 1.x key vocabulary and what it became.
export type { ResultCarrier } from "./algorithmResults";
export { asNumber, getEdgeResult, getGraphResult, getNodeResult, partitionOf } from "./algorithmResults";
