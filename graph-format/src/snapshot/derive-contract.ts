/**
 * Contracting a node partition into blocks (design section 7.3), and the `renumberPartition` helper
 * of design section 7.5.
 */

import { AttributeTable as AttributeTableClass } from "../columns/table.js";
import { INVALID_INDEX } from "../constants.js";
import { GraphFormatError } from "../errors.js";
import { identityNodeIdMap } from "../ids/node-id-map.js";
import {
    type AttributeTable,
    type Column,
    type ColumnReducer,
    type ContractOptions,
    type EdgeListView,
    type GraphSnapshot,
    type U32,
} from "../types/index.js";
import { assertOneOf, WEIGHT_REDUCERS } from "../util/options.js";
import { reduceColumn } from "./derive-reduce.js";
import {
    assembleParts,
    buildCore,
    checkReducers,
    type DerivedParts,
    type EdgeGrouping,
    gatherEndpoints,
    groupingFromSurvivors,
    reduceWeights,
    remapExtensions,
} from "./derived.js";

// ============================================================ contract

/**
 * Renumber an arbitrary u32 labelling to dense 0..k-1 in first-seen order (design section 7.5; what
 * `contract()` does with non-dense labels). INVALID_INDEX is not a legal label (E_PARTITION).
 * @param labels - the labels
 * @param out - an optional destination of the same length (may be `labels` itself)
 * @returns the dense labels and the block count
 */
export function renumberPartition(labels: U32, out?: U32): { readonly labels: U32; readonly count: number } {
    const n = labels.length;
    const result = out ?? new Uint32Array(n);
    if (result.length !== n) {
        throw new GraphFormatError("E_COLUMN_LENGTH", `out has ${result.length} entries, expected ${n}`, {
            expected: n,
            found: result.length,
        });
    }
    let maxLabel = 0;
    for (let i = 0; i < n; i++) {
        const label = labels[i];
        if (label === INVALID_INDEX) {
            throw new GraphFormatError("E_PARTITION", `labels[${i}] is INVALID_INDEX`, { index: i });
        }
        if (label > maxLabel) {
            maxLabel = label;
        }
    }
    const count = maxLabel < 4 * n + 1024 ? renumberByTable(labels, result, maxLabel) : renumberByMap(labels, result);
    return { labels: result, count };
}

/**
 * Write the first-seen dense label of each label to `result`, looking labels up in a table of
 * `maxLabel + 1` slots (labels small enough for one).
 * @param labels - the labels
 * @param result - the destination, same length (may be `labels` itself)
 * @param maxLabel - the largest label
 * @returns the block count
 */
function renumberByTable(labels: U32, result: U32, maxLabel: number): number {
    const lookup = new Uint32Array(maxLabel + 1).fill(INVALID_INDEX);
    let count = 0;
    for (let i = 0; i < labels.length; i++) {
        const label = labels[i];
        let dense = lookup[label];
        if (dense === INVALID_INDEX) {
            dense = count++;
            lookup[label] = dense;
        }
        result[i] = dense;
    }
    return count;
}

/**
 * Write the first-seen dense label of each label to `result`, looking labels up in a Map (labels too
 * large for a table).
 * @param labels - the labels
 * @param result - the destination, same length (may be `labels` itself)
 * @returns the block count
 */
function renumberByMap(labels: U32, result: U32): number {
    const lookup = new Map<number, number>();
    let count = 0;
    for (let i = 0; i < labels.length; i++) {
        const label = labels[i];
        let dense = lookup.get(label);
        if (dense === undefined) {
            dense = count++;
            lookup.set(label, dense);
        }
        result[i] = dense;
    }
    return count;
}

/**
 * The dense block labels of a contract partition (design section 7.3): labels already forming the
 * set 0..k-1 are kept, any other labelling is renumbered in first-seen order. E_PARTITION for a wrong
 * length or an INVALID_INDEX label.
 * @param partition - the caller's labels
 * @param nodeCount - the node count
 * @returns the dense labels (a fresh array) and the block count
 */
function denseBlocks(partition: U32, nodeCount: number): { readonly labels: U32; readonly count: number } {
    if (partition.length !== nodeCount) {
        throw new GraphFormatError(
            "E_PARTITION",
            `partition has ${partition.length} entries, expected nodeCount ${nodeCount}`,
            { expected: nodeCount, found: partition.length },
        );
    }
    let maxLabel = -1;
    for (let i = 0; i < nodeCount; i++) {
        const label = partition[i];
        if (label === INVALID_INDEX) {
            throw new GraphFormatError("E_PARTITION", `partition[${i}] is INVALID_INDEX`, { index: i });
        }
        if (label > maxLabel) {
            maxLabel = label;
        }
    }
    if (maxLabel < nodeCount) {
        const seen = new Uint8Array(maxLabel + 1);
        let distinct = 0;
        for (let i = 0; i < nodeCount; i++) {
            if (seen[partition[i]] === 0) {
                seen[partition[i]] = 1;
                distinct++;
            }
        }
        if (distinct === maxLabel + 1) {
            return { labels: partition.slice(), count: maxLabel + 1 };
        }
    }
    return renumberPartition(partition);
}

/**
 * Reduce the node columns of a contracted graph per `nodeReducers` over the blocks; columns not named
 * are dropped (design section 7.3).
 * @param source - the source snapshot
 * @param blocks - the block labels (source node -> block)
 * @param blockCount - the number of blocks
 * @param blockOrigin - block -> lowest source node
 * @param reducers - the named reducers
 * @returns the new node table
 */
function contractNodeTable(
    source: GraphSnapshot,
    blocks: U32,
    blockCount: number,
    blockOrigin: U32,
    reducers: Readonly<Partial<Record<string, ColumnReducer>>> | undefined,
): AttributeTable {
    const columns: Column[] = [];
    if (reducers !== undefined) {
        const grouping: EdgeGrouping = { count: blockCount, remap: blocks, origin: blockOrigin, dropped: 0, merged: 0 };
        for (const column of source.nodes) {
            const reducer = reducers[column.meta.name];
            if (reducer === undefined) {
                continue;
            }
            const reduced = reduceColumn(column, grouping, reducer);
            if (reduced !== null) {
                columns.push(reduced);
            }
        }
    }
    return new AttributeTableClass({ domain: "node", rowCount: blockCount, columns });
}

/**
 * Group the kept contracted edges by block pair with two stable counting-sort passes (by second key,
 * then by first key), so each run of equal pairs is one group and the first member of a run is the
 * lowest source edge index.
 * @param first - the first key of every source edge (INVALID_INDEX = dropped)
 * @param second - the second key of every source edge
 * @param blockCount - the key range
 * @returns source edge -> survivor (INVALID_INDEX when dropped)
 */
function groupByBlockPair(first: U32, second: U32, blockCount: number): U32 {
    const edgeCount = first.length;
    const kept: number[] = [];
    for (let e = 0; e < edgeCount; e++) {
        if (first[e] !== INVALID_INDEX) {
            kept.push(e);
        }
    }
    const start = new Uint32Array(blockCount + 1);
    for (const e of kept) {
        start[second[e] + 1]++;
    }
    for (let b = 0; b < blockCount; b++) {
        start[b + 1] += start[b];
    }
    const bySecond = new Uint32Array(kept.length);
    for (const e of kept) {
        bySecond[start[second[e]]++] = e;
    }
    start.fill(0);
    for (const e of kept) {
        start[first[e] + 1]++;
    }
    for (let b = 0; b < blockCount; b++) {
        start[b + 1] += start[b];
    }
    const sorted = new Uint32Array(kept.length);
    for (let k = 0; k < bySecond.length; k++) {
        const e = bySecond[k];
        sorted[start[first[e]]++] = e;
    }
    const survivorOf = new Uint32Array(edgeCount).fill(INVALID_INDEX);
    let runStart = 0;
    while (runStart < sorted.length) {
        const leader = sorted[runStart];
        let runEnd = runStart + 1;
        while (
            runEnd < sorted.length &&
            first[sorted[runEnd]] === first[leader] &&
            second[sorted[runEnd]] === second[leader]
        ) {
            runEnd++;
        }
        for (let k = runStart; k < runEnd; k++) {
            survivorOf[sorted[k]] = leader;
        }
        runStart = runEnd;
    }
    return survivorOf;
}

/**
 * Write each edge's block pair, ordered low-high when undirected, or INVALID_INDEX for a dropped
 * intra-block edge.
 * @param list - the source edge list
 * @param blocks - node -> block
 * @param directed - whether the source is directed
 * @param dropLoops - whether intra-block edges are dropped
 * @param first - out: the first block per edge
 * @param second - out: the second block per edge
 */
function blockPairs(
    list: EdgeListView,
    blocks: U32,
    directed: boolean,
    dropLoops: boolean,
    first: U32,
    second: U32,
): void {
    for (let e = 0; e < first.length; e++) {
        const bu = blocks[list.src[e]];
        const bv = blocks[list.dst[e]];
        if (bu === bv && dropLoops) {
            first[e] = INVALID_INDEX;
            second[e] = INVALID_INDEX;
        } else if (directed || bu <= bv) {
            first[e] = bu;
            second[e] = bv;
        } else {
            first[e] = bv;
            second[e] = bu;
        }
    }
}

/**
 * The survivors when parallels are kept: every edge with a block pair survives on its own.
 * @param first - the first block per edge (INVALID_INDEX when dropped)
 * @returns edge -> survivor
 */
function keptPairs(first: U32): U32 {
    const survivorOf = new Uint32Array(first.length);
    for (let e = 0; e < first.length; e++) {
        survivorOf[e] = first[e] === INVALID_INDEX ? INVALID_INDEX : e;
    }
    return survivorOf;
}

/**
 * The edge columns a contraction keeps: those named in `edgeReducers`, reduced over the grouping.
 * @param source - the source snapshot
 * @param grouping - the edge grouping
 * @param reducers - the per-column reducers, or undefined to keep none
 * @returns the reduced columns, in source order
 */
function contractEdgeColumns(
    source: GraphSnapshot,
    grouping: EdgeGrouping,
    reducers: Readonly<Partial<Record<string, ColumnReducer>>> | undefined,
): Column[] {
    const edgeColumns: Column[] = [];
    if (reducers === undefined) {
        return edgeColumns;
    }
    for (const column of source.edges) {
        const columnReducer = reducers[column.meta.name];
        if (columnReducer === undefined) {
            continue;
        }
        const reduced = reduceColumn(column, grouping, columnReducer);
        if (reduced !== null) {
            edgeColumns.push(reduced);
        }
    }
    return edgeColumns;
}

/**
 * `contract(partition, options)` (design section 7.3): the nodes of each block become one node (block
 * indices as labels, ids 0..k-1), every source edge contributes once: an inter-block edge becomes an
 * edge block(u) -> block(v), an intra-block edge one self-loop with weight w, kept or dropped per
 * `selfLoops`; parallels merge per `parallel` with the `weights` reducer (default "sum"; on an
 * unweighted source "sum" materialises multiplicities). Node and edge columns are kept only through
 * `nodeReducers` / `edgeReducers`.
 * @param source - the source snapshot
 * @param list - the source edge list
 * @param partition - one label per node; E_PARTITION for a wrong length or an INVALID_INDEX label
 * @param options - the contraction options
 * @returns the derived parts with blockSizes
 */
export function deriveContract(
    source: GraphSnapshot,
    list: EdgeListView,
    partition: U32,
    options: ContractOptions = {},
): DerivedParts {
    const reducer = assertOneOf("weights", options.weights, WEIGHT_REDUCERS) ?? "sum";
    const dropLoops = assertOneOf("selfLoops", options.selfLoops, ["keep", "drop"] as const) === "drop";
    const merge = (assertOneOf("parallel", options.parallel, ["merge", "keep"] as const) ?? "merge") === "merge";
    checkReducers("nodeReducers", options.nodeReducers);
    checkReducers("edgeReducers", options.edgeReducers);
    const { nodeCount, edgeCount } = source;
    const { labels: blocks, count: blockCount } = denseBlocks(partition, nodeCount);
    const blockSizes = new Uint32Array(blockCount);
    const blockOrigin = new Uint32Array(blockCount).fill(INVALID_INDEX);
    for (let u = 0; u < nodeCount; u++) {
        const b = blocks[u];
        blockSizes[b]++;
        if (blockOrigin[b] === INVALID_INDEX) {
            blockOrigin[b] = u;
        }
    }
    const first = new Uint32Array(edgeCount);
    const second = new Uint32Array(edgeCount);
    blockPairs(list, blocks, source.directed, dropLoops, first, second);
    const survivorOf = merge ? groupByBlockPair(first, second, blockCount) : keptPairs(first);
    const grouping = groupingFromSurvivors(survivorOf);
    const { src, dst } = gatherEndpoints(list, grouping, blocks);
    const weights = reduceWeights(list.weights, grouping, reducer);
    const core = buildCore({
        directed: source.directed,
        nodeCount: blockCount,
        edgeCount: grouping.count,
        src,
        dst,
        weights,
    });
    const nodes = contractNodeTable(source, blocks, blockCount, blockOrigin, options.nodeReducers);
    const edgeColumns = contractEdgeColumns(source, grouping, options.edgeReducers);
    const edges = new AttributeTableClass({ domain: "edge", rowCount: grouping.count, columns: edgeColumns });
    const parts = assembleParts(source, core, {
        directed: source.directed,
        nodeCount: blockCount,
        edgeCount: grouping.count,
        ids: identityNodeIdMap(blockCount),
        nodes,
        edges,
        extensions: remapExtensions(source, blocks, grouping.remap),
    });
    return {
        parts,
        nodeOrigin: blockOrigin,
        edgeOrigin: grouping.origin,
        nodeRemap: blocks,
        edgeRemap: grouping.remap,
        blockSizes,
        report: { droppedEdges: grouping.dropped, mergedEdges: grouping.merged },
    };
}
