/**
 * The "Performance/Large Graph" story graph of graphty-element (test/helpers/story-graph.ts, storyGraph): 150 nodes and
 * 250 edges from a seeded LCG, transcribed exactly so the G5 gate's spring-electrical vs ngraph comparison runs on the
 * graph the story lays out. The generator rejects a pair whose reverse is already present, so the 250 edges are 250
 * distinct unordered pairs: the undirected snapshot carries no multi-arc and ngraph's non-multigraph addLink receives
 * every pair once.
 *
 * The `& 0x7fffffff` is the story's own operator on a SEED word (never an arc index or a byte offset); the
 * transcription must be exact to reproduce the graph.
 */

import type { GraphSnapshot } from "@graphty/graph-format";

import { snapshotOf } from "./graphs.js";

/** The story's node count. */
export const STORY_NODE_COUNT = 150;
/** The story's edge count. */
const STORY_EDGE_COUNT = 250;
/** The story's LCG seed. */
const STORY_SEED = 42;

/**
 * The 250 edges of the story, exactly as storyGraph() draws them: every node gets one edge first (`dst` redrawn while
 * equal to `i`), then random pairs until 250 distinct unordered pairs, self-loops skipped.
 * @returns the pairs in generation order
 */
export function storyEdges(): readonly (readonly [number, number])[] {
    let seed = STORY_SEED;
    const random = (): number => {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        return seed / 0x7fffffff;
    };
    const pairKey = (a: number, b: number): string => (a < b ? `${a}-${b}` : `${b}-${a}`);
    const edgeSet = new Set<string>();
    const edges: [number, number][] = [];
    for (let i = 0; i < STORY_NODE_COUNT; i++) {
        let dst = Math.floor(random() * STORY_NODE_COUNT);
        while (dst === i) {
            dst = Math.floor(random() * STORY_NODE_COUNT);
        }
        const key = pairKey(i, dst);
        if (!edgeSet.has(key)) {
            edgeSet.add(key);
            edges.push([i, dst]);
        }
    }
    while (edges.length < STORY_EDGE_COUNT) {
        const src = Math.floor(random() * STORY_NODE_COUNT);
        const dst = Math.floor(random() * STORY_NODE_COUNT);
        if (src !== dst) {
            const key = pairKey(src, dst);
            if (!edgeSet.has(key)) {
                edgeSet.add(key);
                edges.push([src, dst]);
            }
        }
    }
    return edges;
}

/**
 * The story graph as an undirected snapshot (both arcs of every edge: 500 arcs).
 * @returns the snapshot
 */
export function storyGraph(): GraphSnapshot {
    return snapshotOf(storyEdges(), { nodeCount: STORY_NODE_COUNT, label: "story150" });
}
