/**
 * The resolvers behind NodeRef and NodeSet: every algorithm and layout that takes a node or a set of
 * nodes accepts node indices, a NodeMask, or node ids, and turns them into indices through these
 * functions. A bare node index passes through unchanged, so each caller keeps its own range check
 * and its own error for an index that is out of range.
 */

import { GraphFormatError } from "../errors.js";
import { type NodeIdMap } from "../ids/node-id-map.js";
import { type NodeMask, type NodeRef, type NodeSet, type U32 } from "../types/index.js";
import { checkMaskLength, makeMask, maskSet, maskToIndices } from "./mask.js";

/**
 * The part of a graph the resolvers read: its node count and, for a snapshot, its id map. An
 * AdjacencyView without an id map resolves indices and masks but not ids.
 */
export interface NodeResolvable {
    /** Number of nodes. */
    readonly nodeCount: number;
    /** The id map; present on a GraphSnapshot. */
    readonly ids?: NodeIdMap | undefined;
}

/**
 * The id map of a graph, or E_UNKNOWN_NODE when the graph has none.
 * @param graph - the graph
 * @returns the id map
 */
function idMapOf(graph: NodeResolvable): NodeIdMap {
    if (graph.ids === undefined) {
        throw new GraphFormatError(
            "E_UNKNOWN_NODE",
            "node ids cannot be resolved: this graph has no id map (pass a GraphSnapshot)",
            { reason: "no id map" },
        );
    }
    return graph.ids;
}

/**
 * The node index of a NodeRef: a number is returned as it is; `{ id }` is looked up in the id map.
 * @param graph - the graph the node belongs to
 * @param node - a node index or `{ id }`
 * @returns the node index
 * @throws GraphFormatError E_UNKNOWN_NODE when the id is not in the graph or the graph has no id map
 */
export function resolveNode(graph: NodeResolvable, node: NodeRef): number {
    if (typeof node === "number") {
        return node;
    }
    return idMapOf(graph).requireIndex(node.id);
}

/**
 * The node indices of a NodeSet: an index array is returned as it is; `{ mask }` gives its set bits
 * in ascending order; `{ ids }` gives the indices of the ids in their order.
 * @param graph - the graph the nodes belong to
 * @param set - an index array, `{ mask }` or `{ ids }`
 * @returns the node indices
 * @throws GraphFormatError E_UNKNOWN_NODE for an id not in the graph; E_MASK_LENGTH for a short mask
 */
export function resolveNodeSet(graph: NodeResolvable, set: NodeSet): ArrayLike<number> {
    if ("mask" in set) {
        checkMaskLength(set.mask, graph.nodeCount, "nodes");
        return maskToIndices(set.mask, graph.nodeCount);
    }
    if ("ids" in set) {
        return idMapOf(graph).indicesOf(set.ids, "throw");
    }
    return set;
}

/**
 * A NodeSet as a NodeMask over the graph's nodes: `{ mask }` is returned as it is (after a length
 * check); indices and ids are written into a fresh mask.
 * @param graph - the graph the nodes belong to
 * @param set - an index array, `{ mask }` or `{ ids }`
 * @returns the mask
 * @throws GraphFormatError E_INDEX_RANGE for an index outside the graph; E_UNKNOWN_NODE for an id
 *   not in the graph; E_MASK_LENGTH for a short mask
 */
export function resolveNodeMask(graph: NodeResolvable, set: NodeSet): NodeMask {
    if ("mask" in set) {
        checkMaskLength(set.mask, graph.nodeCount, "nodes");
        return set.mask;
    }
    const indices = resolveNodeSet(graph, set);
    const mask: U32 = makeMask(graph.nodeCount);
    for (let k = 0; k < indices.length; k++) {
        const i = indices[k];
        if (!Number.isInteger(i) || i < 0 || i >= graph.nodeCount) {
            throw new GraphFormatError(
                "E_INDEX_RANGE",
                `node index ${String(i)} is out of range for ${graph.nodeCount} nodes`,
                { index: i, nodeCount: graph.nodeCount },
            );
        }
        maskSet(mask, i, true);
    }
    return mask;
}
