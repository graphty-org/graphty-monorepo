/**
 * Derived graphs over a subset or a renumbering of the source (design section 7.3): `filterEdges`,
 * `withoutSelfLoops`, `inducedSubgraph` and `relabel`.
 */

import { gatherTable } from "../columns/remap.js";
import { INVALID_INDEX } from "../constants.js";
import { GraphFormatError } from "../errors.js";
import { gatherNodeIdMap } from "../ids/node-id-map.js";
import { type EdgeListView, type EdgeMask, type GraphSnapshot, type NodeMask, type U32 } from "../types/index.js";
import { checkMaskLength, maskTest, maskToIndices } from "../util/mask.js";
import { deriveGroupedEdges, reduceEdgeTable } from "./derive-reduce.js";
import {
    assembleParts,
    buildCore,
    type DerivedParts,
    type EdgeGrouping,
    gatherEndpoints,
    groupingFromPredicate,
    isIdentitySelection,
    reduceWeights,
    remapExtensions,
} from "./derived.js";
import { isIdentity } from "./validate.js";

// ============================================================ filterEdges, withoutSelfLoops

/**
 * The derived graph keeping the edges a predicate accepts, in the same node space (design section
 * 7.3: `filterEdges`, `withoutSelfLoops`). Always a new snapshot; the maps are null when every edge
 * is kept.
 * @param source - the source snapshot
 * @param list - the source edge list
 * @param keep - whether edge e is kept
 * @returns the derived parts
 */
function deriveKeptEdges(source: GraphSnapshot, list: EdgeListView, keep: (e: number) => boolean): DerivedParts {
    const grouping = groupingFromPredicate(source.edgeCount, keep);
    return deriveGroupedEdges(source, list, grouping, source.directed, "first", undefined);
}

/**
 * `filterEdges(keep)`: the logical edges whose mask bit is set (design section 7.3).
 * @param source - the source snapshot
 * @param list - the source edge list
 * @param keep - packed bitmap over logical edges; E_MASK_LENGTH when short
 * @returns the derived parts
 */
export function deriveFilterEdges(source: GraphSnapshot, list: EdgeListView, keep: EdgeMask): DerivedParts {
    checkMaskLength(keep, source.edgeCount, "edges");
    return deriveKeptEdges(source, list, (e) => maskTest(keep, e));
}

/**
 * `withoutSelfLoops()`: every edge with source !== target (design section 7.3).
 * @param source - the source snapshot
 * @param list - the source edge list
 * @returns the derived parts
 */
export function deriveWithoutSelfLoops(source: GraphSnapshot, list: EdgeListView): DerivedParts {
    return deriveKeptEdges(source, list, (e) => list.src[e] !== list.dst[e]);
}

// ============================================================ inducedSubgraph, relabel

/**
 * The E_INDEX_RANGE error of a bad inducedSubgraph index list entry.
 * @param position - the position in the list
 * @param value - the offending value
 * @param nodeCount - the node count
 * @param reason - "out of range" or "repeated"
 * @returns the error
 */
function selectionError(position: number, value: number, nodeCount: number, reason: string): GraphFormatError {
    return new GraphFormatError(
        "E_INDEX_RANGE",
        `inducedSubgraph selection[${position}] = ${value} is ${reason} (nodeCount ${nodeCount})`,
        { index: position, found: value, nodeCount, reason },
    );
}

/**
 * Resolve an inducedSubgraph selection to the new -> source node list (design section 7.3): an
 * index list in the given order (E_INDEX_RANGE for an out-of-range or repeated index) or a packed
 * mask in ascending order (E_MASK_LENGTH when short).
 * @param source - the source snapshot
 * @param selection - the index list or mask
 * @returns the node origin list (a fresh array)
 */
function resolveSelection(source: GraphSnapshot, selection: U32 | { readonly mask: NodeMask }): U32 {
    const { nodeCount } = source;
    if (selection instanceof Uint32Array) {
        const seen = new Uint8Array(nodeCount);
        const origin = new Uint32Array(selection.length);
        for (let i = 0; i < selection.length; i++) {
            const u = selection[i];
            if (u >= nodeCount) {
                throw selectionError(i, u, nodeCount, "out of range");
            }
            if (seen[u] === 1) {
                throw selectionError(i, u, nodeCount, "repeated");
            }
            seen[u] = 1;
            origin[i] = u;
        }
        return origin;
    }
    checkMaskLength(selection.mask, nodeCount, "nodes");
    return maskToIndices(selection.mask, nodeCount);
}

/**
 * The inverse of a new -> source node list: source -> new or INVALID_INDEX.
 * @param origin - new -> source
 * @param nodeCount - the source node count
 * @returns the remap
 */
function invertOrigin(origin: U32, nodeCount: number): U32 {
    const remap = new Uint32Array(nodeCount).fill(INVALID_INDEX);
    for (let i = 0; i < origin.length; i++) {
        remap[origin[i]] = i;
    }
    return remap;
}

/**
 * Assemble a derived graph over a gathered node space (inducedSubgraph, relabel): the node table and
 * id map gathered through `nodeOrigin`, the edge table gathered through the edge grouping (or the
 * source table with refersTo node values rewritten when the edge space is unchanged).
 * @param source - the source snapshot
 * @param list - the source edge list
 * @param nodeOrigin - new -> source node, or null for the identity
 * @param grouping - the edge grouping
 * @returns the derived parts
 */
function deriveOverNodeSpace(
    source: GraphSnapshot,
    list: EdgeListView,
    nodeOrigin: U32 | null,
    grouping: EdgeGrouping,
): DerivedParts {
    const nodeCount = nodeOrigin === null ? source.nodeCount : nodeOrigin.length;
    const nodeRemap = nodeOrigin === null ? null : invertOrigin(nodeOrigin, source.nodeCount);
    const { src, dst } = gatherEndpoints(list, grouping, nodeRemap);
    const weights = reduceWeights(list.weights, grouping, "first");
    const core = buildCore({ directed: source.directed, nodeCount, edgeCount: grouping.count, src, dst, weights });
    const refs = { node: nodeRemap, edge: grouping.remap };
    const nodes = nodeOrigin === null ? source.nodes : gatherTable(source.nodes, nodeOrigin, refs);
    const ids = nodeOrigin === null ? source.ids : gatherNodeIdMap(source.ids, nodeOrigin);
    const edges = reduceEdgeTable(source, grouping, undefined, nodeRemap);
    const parts = assembleParts(source, core, {
        directed: source.directed,
        nodeCount,
        edgeCount: grouping.count,
        ids,
        nodes,
        edges,
        extensions: remapExtensions(source, nodeRemap, grouping.remap),
    });
    return {
        parts,
        nodeOrigin,
        edgeOrigin: grouping.origin,
        nodeRemap,
        edgeRemap: grouping.remap,
        blockSizes: null,
        report: { droppedEdges: grouping.dropped, mergedEdges: grouping.merged },
    };
}

/**
 * `inducedSubgraph(selection)`: the subgraph on a node selection with every edge whose endpoints are
 * both kept (design section 7.3); a compact new node space unless the selection is the identity.
 * @param source - the source snapshot
 * @param list - the source edge list
 * @param selection - an index list (new index order) or a packed mask (ascending)
 * @returns the derived parts
 */
export function deriveInducedSubgraph(
    source: GraphSnapshot,
    list: EdgeListView,
    selection: U32 | { readonly mask: NodeMask },
): DerivedParts {
    const origin = resolveSelection(source, selection);
    const identity = isIdentitySelection(origin, source.nodeCount);
    const nodeOrigin = identity ? null : origin;
    const nodeRemap = identity ? null : invertOrigin(origin, source.nodeCount);
    const grouping =
        nodeRemap === null
            ? groupingFromPredicate(source.edgeCount, () => true)
            : groupingFromPredicate(
                  source.edgeCount,
                  (e) => nodeRemap[list.src[e]] !== INVALID_INDEX && nodeRemap[list.dst[e]] !== INVALID_INDEX,
              );
    return deriveOverNodeSpace(source, list, nodeOrigin, grouping);
}

/**
 * `relabel(perm)`: the node space permuted with `perm[newIndex] = oldIndex`, edge order preserved
 * (design section 7.3); E_INVALID_PERMUTATION unless perm is a permutation of 0..n-1.
 * @param source - the source snapshot
 * @param list - the source edge list
 * @param perm - the permutation
 * @returns the derived parts
 */
export function deriveRelabel(source: GraphSnapshot, list: EdgeListView, perm: U32): DerivedParts {
    const { nodeCount } = source;
    if (perm.length !== nodeCount) {
        throw new GraphFormatError("E_INVALID_PERMUTATION", `perm has ${perm.length} entries, expected ${nodeCount}`, {
            expected: nodeCount,
            found: perm.length,
        });
    }
    const seen = new Uint8Array(nodeCount);
    for (let i = 0; i < nodeCount; i++) {
        const u = perm[i];
        if (u >= nodeCount || seen[u] === 1) {
            throw new GraphFormatError(
                "E_INVALID_PERMUTATION",
                `perm[${i}] = ${u} is out of range or repeated (nodeCount ${nodeCount})`,
                { index: i, found: u, nodeCount },
            );
        }
        seen[u] = 1;
    }
    const nodeOrigin = isIdentity(perm) ? null : perm.slice();
    const grouping = groupingFromPredicate(source.edgeCount, () => true);
    return deriveOverNodeSpace(source, list, nodeOrigin, grouping);
}
