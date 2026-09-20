/**
 * Conversion from the legacy `Graph` class to a frozen graph-format snapshot
 * (graph-format design 14.1 rule 4, 14.6 row A1). This is the ONLY bridge between the legacy
 * Map-of-Maps surface and `indexed.*`; nothing under `src/indexed/` other than this file imports
 * `../core/graph.js`.
 * @module
 */

import { GraphBuilder, type GraphSnapshot } from "@graphty/graph-format";

import type { Graph } from "../core/graph.js";

/** Options of {@link toSnapshot}. @public */
export interface ToSnapshotOptions {
    /**
     * Record FNV-1a checksums at freeze so a caller can assert `snapshot.validate({ checksum: true })`
     * (graph-format design 14.2's first port rule: views are shared, so a port that writes into one
     * has to fail a test rather than corrupt the next call). Default false; the test suites set it.
     */
    readonly checksum?: boolean | undefined;
}

interface CacheEntry {
    readonly mutationCount: number;
    readonly checksum: boolean;
    readonly snapshot: GraphSnapshot;
}

/**
 * One entry per graph, REPLACED rather than appended to on a mutation. The entry holds the
 * mutationCount it was built at, which is what makes a stale hit impossible -- the bug the old
 * `WeakMap<Graph, CSRGraph>` cache had (graph-format design 14.1 rule 4).
 */
const SNAPSHOT_CACHE = new WeakMap<Graph, CacheEntry>();

/**
 * Freeze a legacy `Graph` into a `GraphSnapshot`, memoised on the graph's `mutationCount`.
 *
 * The builder is created with `weightDtype: "f64"` so a legacy graph's double weights survive
 * exactly: at freeze, graph-format keeps the original values in an f64 edge column with role
 * `weight` (the "shadow") whenever at least one of them is not f32-exact, and costs nothing when
 * they all are (graph-format design section 3.7, `graph-format/src/builder/freeze.ts:332-360`).
 * A weighted `indexed.*` port reproduces legacy f64 results by passing
 * `expandEdges(s, shadow.data)` as its per-arc `weights` override.
 *
 * Every legacy edge carries a weight (`Graph.addEdge` defaults it to 1), so the builder's
 * `weighted: "auto"` always allocates the arc weight array -- 4 bytes per arc. That is truthful
 * rather than wasteful: the legacy graph really does store the value.
 * @param graph - The legacy graph to convert
 * @param options - Conversion options
 * @returns A frozen snapshot of the graph's current topology and weights
 * @public
 */
export function toSnapshot(graph: Graph, options: ToSnapshotOptions = {}): GraphSnapshot {
    const checksum = options.checksum === true;
    const cached = SNAPSHOT_CACHE.get(graph);
    // A checksummed snapshot answers a plain request; a plain one cannot answer a checksummed
    // request -- validate({ checksum: true }) throws E_INVALID_SNAPSHOT ("no-checksum") when none
    // were recorded (graph-format/src/types/snapshot.ts:401-405).
    if (cached !== undefined && cached.mutationCount === graph.mutationCount && (cached.checksum || !checksum)) {
        return cached.snapshot;
    }
    const builder = new GraphBuilder({
        directed: graph.isDirected,
        weightDtype: "f64",
        expectedNodes: graph.nodeCount,
        expectedEdges: graph.totalEdgeCount,
    });
    for (const node of graph.nodes()) {
        builder.addNode(node.id);
    }
    for (const edge of graph.edges()) {
        builder.addEdge(edge.source, edge.target, edge.weight);
    }
    const snapshot = builder.freeze({ label: "algorithms.toSnapshot", checksum });
    SNAPSHOT_CACHE.set(graph, { mutationCount: graph.mutationCount, checksum, snapshot });
    return snapshot;
}
