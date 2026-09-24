/**
 * @file The graph's shape, computed from one snapshot.
 *
 * Every number here is something a consumer would otherwise compute for itself over a second
 * copy of the graph -- which is exactly what the application did before the session existed,
 * hand-written union-find included. Computing it once, next to the data, is both cheaper and the
 * only place the answer can be right.
 */

import { type GraphSnapshot, INVALID_INDEX, type NodeId, type U32 } from "@graphty/graph-format";

import { COMPONENT_SIZE_CAP, type ComponentStatistics, type DirectionProvenance, type GraphStatistics } from "./types";

/**
 * Label every node with the connected component it belongs to, ignoring arc direction.
 *
 * Direction is ignored because "how many pieces is this network in?" is a question about the
 * picture, and a reader looking at a drawn graph sees one piece whether the arrows agree or not.
 * The walk is iterative rather than recursive: a path graph of a million nodes would otherwise
 * overflow the stack, and a graph that large is exactly the one somebody asks this about.
 * @param snapshot - the snapshot to label
 * @returns one component number per node index, and how many components there are
 */
function labelComponents(snapshot: GraphSnapshot): { labels: Int32Array; count: number } {
    const { nodeCount, rowPtr, colIdx } = snapshot;
    const labels = new Int32Array(nodeCount).fill(-1);
    if (nodeCount === 0) {
        return { labels, count: 0 };
    }

    // The reverse view gives the in-arcs, which is what makes this walk undirected without
    // building a whole undirected snapshot: an undirected snapshot's reverse view IS its forward
    // view, so the second pass is a harmless repeat there rather than a special case here.
    const reverse = snapshot.reverse();
    const stack: number[] = [];
    let count = 0;

    for (let seed = 0; seed < nodeCount; seed++) {
        if (labels[seed] !== -1) {
            continue;
        }

        const component = count++;
        labels[seed] = component;
        stack.push(seed);

        while (stack.length > 0) {
            const u = stack.pop();
            if (u === undefined) {
                break;
            }

            for (let a = rowPtr[u]; a < rowPtr[u + 1]; a++) {
                const v = colIdx[a];
                if (labels[v] === -1) {
                    labels[v] = component;
                    stack.push(v);
                }
            }

            for (let a = reverse.rowPtr[u]; a < reverse.rowPtr[u + 1]; a++) {
                const v = reverse.colIdx[a];
                if (labels[v] === -1) {
                    labels[v] = component;
                    stack.push(v);
                }
            }
        }
    }

    return { labels, count };
}

/**
 * Turn the component labels into the shape a consumer reads.
 * @param snapshot - the snapshot the labels belong to
 * @param labels - one component number per node index
 * @param count - how many components there are
 * @returns the component statistics
 */
function summariseComponents(snapshot: GraphSnapshot, labels: Int32Array, count: number): ComponentStatistics {
    const sizes = new Uint32Array(count);
    for (const label of labels) {
        sizes[label]++;
    }

    let largestSize = 0;
    let isolatedCount = 0;
    for (const size of sizes) {
        if (size > largestSize) {
            largestSize = size;
        }

        if (size === 1) {
            isolatedCount++;
        }
    }

    // Sorting a million-entry distribution to hand back a thousand of it is the whole cost of
    // this function, so the cap is applied to the LIST and not to the sort: the caller asked for
    // the largest components, and which ones those are is not knowable without ordering them.
    const descending = Array.from(sizes).sort((a, b) => b - a);
    const truncatedSizes = descending.length > COMPONENT_SIZE_CAP;

    return {
        count,
        sizes: Object.freeze(truncatedSizes ? descending.slice(0, COMPONENT_SIZE_CAP) : descending),
        largestSize,
        isolatedCount,
        truncatedSizes,
        componentOf(id: NodeId): number | undefined {
            const index = snapshot.ids.indexOf(id);
            return index === INVALID_INDEX ? undefined : labels[index];
        },
    };
}

/**
 * Count the edges that are not the first between their pair of endpoints.
 *
 * The count is over arcs within a row, which is exact because a snapshot's `colIdx` is sorted
 * within each row: a repeat is a neighbour equal to the one before it. On an undirected snapshot
 * every non-loop edge is stored as two arcs, so a repeated pair is seen from both ends and the
 * arc count is halved; a self-loop is stored once per row either way, so it is counted from the
 * one row it is in.
 * @param snapshot - the snapshot to count over
 * @returns how many edges are repeats of an earlier edge between the same endpoints
 */
function countRepeatedEdges(snapshot: GraphSnapshot): number {
    const { nodeCount, rowPtr, colIdx, directed } = snapshot;
    let repeatedArcs = 0;
    let repeatedLoops = 0;

    for (let u = 0; u < nodeCount; u++) {
        const end = rowPtr[u + 1];
        for (let a = rowPtr[u] + 1; a < end; a++) {
            if (colIdx[a] !== colIdx[a - 1]) {
                continue;
            }

            if (colIdx[a] === u) {
                repeatedLoops++;
            } else {
                repeatedArcs++;
            }
        }
    }

    return directed ? repeatedArcs + repeatedLoops : repeatedArcs / 2 + repeatedLoops;
}

/**
 * The smallest, largest and mean total degree in the graph.
 *
 * All three come out of ONE pass over the same vector, which is the point: a mean derived from the
 * edge count instead would be `2m / n`, and that is the undirected reading of a quantity the range
 * beside it measures directly. Two numbers that are supposed to describe the same distribution
 * must not be able to disagree about it.
 * @param degrees - the snapshot's degree vector
 * @returns the range and the mean; `[0, 0]` and 0 when there are no nodes
 */
function degreeSummary(degrees: U32): { range: readonly [number, number]; mean: number } {
    if (degrees.length === 0) {
        return { range: [0, 0], mean: 0 };
    }

    let low = degrees[0];
    let high = degrees[0];
    let total = 0;
    for (const degree of degrees) {
        if (degree < low) {
            low = degree;
        }

        if (degree > high) {
            high = degree;
        }

        total += degree;
    }

    return { range: [low, high], mean: total / degrees.length };
}

/**
 * Whether any edge carries a weight other than 1.
 *
 * The store writes a weight for every edge, so the presence of a weight column says nothing.
 * What a consumer means by "is this graph weighted?" is whether the weights carry information,
 * and a graph of all-ones does not.
 * @param snapshot - the snapshot to inspect
 * @returns true when at least one weight differs from 1
 */
function isWeighted(snapshot: GraphSnapshot): boolean {
    const { weights } = snapshot;
    if (weights === null) {
        return false;
    }

    for (const weight of weights) {
        if (weight !== 1) {
            return true;
        }
    }

    return false;
}

/**
 * Edges as a fraction of the pairs that could carry one.
 *
 * Self-loops are excluded from the numerator because they are excluded from the denominator: a
 * node pairs with `n - 1` others, not with itself. Counting them in the numerator alone is how a
 * density of more than 1 gets printed next to a graph.
 * @param snapshot - the snapshot to measure
 * @returns the density, or 0 for a graph with fewer than two nodes
 */
function density(snapshot: GraphSnapshot): number {
    const { nodeCount, edgeCount, selfLoopCount, directed } = snapshot;
    if (nodeCount < 2) {
        return 0;
    }

    const pairs = nodeCount * (nodeCount - 1);
    const possible = directed ? pairs : pairs / 2;
    return Math.max(0, edgeCount - selfLoopCount) / possible;
}

/**
 * Whether the graph is directed, as a fact about the whole graph.
 * @param snapshot - the snapshot to read the frozen direction flag from
 * @param directedConfig - the element's `data.directed` setting
 * @returns the tri-state a consumer renders
 */
function directedness(snapshot: GraphSnapshot, directedConfig: boolean | "auto"): GraphStatistics["directedness"] {
    // An empty graph under "auto" is the one case where nothing has settled the question: the
    // builder starts directed and UNLOCKED so that a file header can still change it, so reading
    // its flag would report a decision nobody has made.
    if (directedConfig === "auto" && snapshot.nodeCount === 0 && snapshot.edgeCount === 0) {
        return "unknown";
    }

    return snapshot.directed ? "directed" : "undirected";
}

/**
 * Everything the session knows about the graph's shape, from one snapshot.
 *
 * The walk is O(n + m) and the caller is expected to cache the answer against the snapshot it
 * was computed from, which is what makes `data.statistics()` behave like the maintained struct
 * a UI reads on every frame.
 * @param snapshot - the snapshot to measure
 * @param directedConfig - the element's `data.directed` setting, which is what distinguishes a
 *     graph that is undirected from a graph nothing has told us about yet
 * @param directednessSource - how the direction was settled, which the store remembers because the
 *     snapshot carries the flag and not the reason
 * @returns the statistics
 */
export function computeStatistics(
    snapshot: GraphSnapshot,
    directedConfig: boolean | "auto",
    directednessSource: DirectionProvenance,
): GraphStatistics {
    const { labels, count } = labelComponents(snapshot);
    const degrees = degreeSummary(snapshot.degree());

    return Object.freeze({
        nodeCount: snapshot.nodeCount,
        edgeCount: snapshot.edgeCount,
        density: density(snapshot),
        directedness: directedness(snapshot, directedConfig),
        directednessSource: Object.freeze(directednessSource),
        weighted: isWeighted(snapshot),
        selfLoopCount: snapshot.selfLoopCount,
        repeatedEdgeCount: countRepeatedEdges(snapshot),
        degreeRange: Object.freeze(degrees.range),
        meanDegree: degrees.mean,
        components: Object.freeze(summariseComponents(snapshot, labels, count)),
    } satisfies GraphStatistics);
}

/**
 * A stable identity for the graph's topology.
 *
 * It answers "is this the same graph?" across a re-freeze, a reload of the same file and a round
 * trip through a worker, which is what a saved document and a result cache need. It is a hash of
 * the node ids in order and the arcs between them: attributes and coordinates are not in it,
 * because moving a node does not make it a different graph.
 * @param snapshot - the snapshot to fingerprint
 * @returns a 16-character hexadecimal digest
 */
export function computeFingerprint(snapshot: GraphSnapshot): string {
    // FNV-1a over two 32-bit lanes, which gives 64 bits of digest out of 32-bit arithmetic that
    // stays exact in a double. A cryptographic hash would be pointless here: the question is
    // "did this change?", and the adversary is a stale cache rather than a person.
    let hashA = 0x811c9dc5;
    let hashB = 0x01000193;

    /**
     * Fold one 32-bit value into the digest.
     * @param value - the value to fold
     */
    const mix = (value: number): void => {
        hashA = Math.imul(hashA ^ (value >>> 0), 0x01000193) >>> 0;
        hashB = Math.imul(hashB ^ (hashA + value), 0x85ebca6b) >>> 0;
    };

    mix(snapshot.nodeCount);
    mix(snapshot.edgeCount);
    mix(snapshot.directed ? 1 : 0);

    for (let i = 0; i < snapshot.nodeCount; i++) {
        const id = snapshot.ids.idOf(i);
        if (typeof id === "number") {
            mix(0x4e554d);
            mix(id | 0);
            // The fractional half of a non-integer id would otherwise hash the same as its floor.
            mix(Math.round((id - Math.trunc(id)) * 0xffffff));
        } else {
            mix(0x535452);
            for (let c = 0; c < id.length; c++) {
                mix(id.charCodeAt(c));
            }
        }
    }

    for (let i = 0; i <= snapshot.nodeCount; i++) {
        mix(snapshot.rowPtr[i]);
    }

    for (let i = 0; i < snapshot.colIdx.length; i++) {
        mix(snapshot.colIdx[i]);
    }

    return hashA.toString(16).padStart(8, "0") + hashB.toString(16).padStart(8, "0");
}
