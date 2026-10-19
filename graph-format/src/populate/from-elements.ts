/**
 * `fromElements()`: build a snapshot straight from a caller's own node and edge objects (a
 * Cytoscape collection, a d3 array, ORM rows) through accessor functions, and hand the objects back
 * in index order so a result indexed by node or by edge maps back to them with no lookup code.
 * Node i is the i-th node given; edge e is the e-th edge given (the builder's insertion order,
 * invariant I14), which holds because fromElements always keeps parallel edges and self-loops.
 */

import { GraphFormatError } from "../errors.js";
import { type GraphSnapshot } from "../snapshot/graph-snapshot.js";
import {
    type EdgeId,
    type ElementAccessors,
    type ElementsSnapshot,
    type FreezeOptions,
    type NodeId,
} from "../types/index.js";
import { fromEdgeArrays } from "./from-edge-arrays.js";

/**
 * Build a snapshot from a caller's node and edge objects.
 * @template N - the caller's node type
 * @template E - the caller's edge type
 * @param nodes - every node, in the order that becomes the node index
 * @param edges - every edge, in the order that becomes the edge index; both endpoints must be nodes
 * @param accessors - how to read a node id, the two endpoint ids, and optionally an edge id and a weight
 * @param options - freeze options (label, prepare, ...)
 * @returns the snapshot, with `nodes[i]` the node at index i and `edges[e]` the edge at index e
 * @throws GraphFormatError E_DUPLICATE_ID for a repeated node id, E_UNKNOWN_NODE for an endpoint that
 *   is not a node, E_DUPLICATE_EDGE_ID for a repeated edge id, E_INVALID_WEIGHT for a NaN weight
 */
export function fromElements<N, E>(
    nodes: Iterable<N>,
    edges: Iterable<E>,
    accessors: ElementAccessors<N, E>,
    options: FreezeOptions = {},
): ElementsSnapshot<N, E> {
    const nodeList = Array.from(nodes);
    const edgeList = Array.from(edges);
    const ids: NodeId[] = nodeList.map(accessors.id);
    const indexOf = new Map<NodeId, number>();
    ids.forEach((id, i) => {
        if (!indexOf.has(id)) {
            indexOf.set(id, i);
        }
    });
    const endpoint = (e: number, id: NodeId): number => {
        const i = indexOf.get(id);
        if (i === undefined) {
            throw new GraphFormatError(
                "E_UNKNOWN_NODE",
                `edge ${e} names node ${JSON.stringify(id)}, which is not a node`,
                {
                    id,
                    edge: e,
                },
            );
        }
        return i;
    };
    const m = edgeList.length;
    const src = new Uint32Array(m);
    const dst = new Uint32Array(m);
    const { weight, edgeId } = accessors;
    const weights = weight === undefined ? undefined : new Float64Array(m);
    const edgeIds: EdgeId[] | undefined = edgeId === undefined ? undefined : new Array<EdgeId>(m);
    edgeList.forEach((edge, e) => {
        src[e] = endpoint(e, accessors.source(edge));
        dst[e] = endpoint(e, accessors.target(edge));
        if (weights !== undefined && weight !== undefined) {
            weights[e] = weight(edge);
        }
        if (edgeIds !== undefined && edgeId !== undefined) {
            edgeIds[e] = edgeId(edge);
        }
    });
    const snapshot: GraphSnapshot = fromEdgeArrays(
        { directed: accessors.directed, ids, src, dst, weights, edgeIds },
        { ...options, duplicateEdges: "keep", selfLoops: "keep" },
    );
    return { snapshot, nodes: nodeList, edges: edgeList };
}
