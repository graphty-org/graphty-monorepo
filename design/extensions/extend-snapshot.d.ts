/**
 * The graph-format types a plugin names, as @graphty/graphty-element/extend re-exports them.
 *
 * The other declaration files import snapshot types from HERE, never from @graphty/graph-format
 * directly, so that type-checking this directory proves the ./extend surface a plugin actually has
 * (algorithm.md section 3.3). The Published section is exactly what 2.6.1's ./extend re-exports;
 * the Proposed section is what open decision 9 adds.
 */

// =============================================================================================
// Published (graphty-element 2.6.1): extend.ts re-exports exactly these three.
// =============================================================================================

export type { EdgeMask, GraphSnapshot, NodeMask } from "@graphty/graph-format";

// =============================================================================================
// Proposed (NOT re-exported) -- open decision 9 (headless hosts, transfer, columns).
// =============================================================================================

/** PROPOSED. The column type ScopedInputColumns.column returns (open decision 17 needs it re-exported). */
export type { Column } from "@graphty/graph-format";

import type { GraphSnapshot } from "@graphty/graph-format";

/**
 * PROPOSED. The structural snapshot contract. graph-format declares one (GraphSnapshotContract in
 * graph-format/src/types/snapshot.ts) but does not export it; a signature that accepts a snapshot
 * FROM a plugin takes this, so a snapshot built by the plugin's own graph-format copy is accepted.
 * Restated here as the public members of GraphSnapshot, which is what the export would carry.
 */
export type GraphSnapshotContract = Pick<GraphSnapshot, keyof GraphSnapshot>;

/**
 * PROPOSED. Build a snapshot with the element's own graph-format copy, for a plugin's Node tests
 * and for a derived graph (a degree-preserving rewire for a null model). Node ids and edges as plain
 * arrays; edge ids are the caller's.
 */
export declare function snapshotFromEdgeList(input: {
    readonly directed: boolean;
    readonly nodes: readonly (string | number)[];
    readonly edges: readonly {
        readonly source: string | number;
        readonly target: string | number;
        readonly id?: string;
        readonly weight?: number;
    }[];
}): GraphSnapshot;

/**
 * PROPOSED. Move a snapshot into a worker a plugin created: typed arrays plus a transfer list, and
 * the inverse in the worker, both bound to the element's graph-format copy. structuredClone of a
 * GraphSnapshot yields a plain object with no methods.
 */
export declare function toTransferable(snapshot: GraphSnapshot): {
    readonly message: unknown;
    readonly transfer: readonly Transferable[];
};
export declare function fromTransferable(message: unknown): GraphSnapshot;
