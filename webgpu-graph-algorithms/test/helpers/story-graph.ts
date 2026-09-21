/**
 * The "Performance/Large Graph" story graph of graphty-element (stories/PerformanceTest.stories.ts, generateEdges):
 * 150 nodes and 250 ORDERED edges from a seeded LCG, transcribed exactly so the G5 gate's spring-electrical vs
 * ngraph comparison runs on the graph the story lays out with `layout: "ngraph"`. The story keys its duplicate
 * check on the ORDERED pair `${src}-${dst}`, and seed 42 produces exactly one reversed pair, so the 250 ordered
 * edges are 249 unordered ones; the LAST step below dedupes on the unordered pair (first occurrence kept) so the
 * undirected snapshot carries no multi-arc and ngraph's non-multigraph addLink receives every pair once (P5-T5
 * Step 2: masses, spring counts and edgeLengthQuantiles then mean the same thing on both sides).
 *
 * The `& 0x7fffffff` is the story's own operator on a SEED word (never an arc index or a byte offset); the
 * transcription must be exact to reproduce the graph.
 */

import type { GraphSnapshot } from "@graphty/graph-format";

import { snapshotOf } from "./graphs.js";

/** The story's node count. */
export const STORY_NODE_COUNT = 150;
/** The story's ORDERED edge count (before the unordered dedupe). */
const STORY_ORDERED_EDGES = 250;
/** The story's LCG seed. */
const STORY_SEED = 42;

/**
 * The 250 ordered edges of the story, exactly as generateEdges() draws them: every node gets one edge first (`dst`
 * redrawn while equal to `i`), then random pairs until 250 distinct ordered keys, self-loops skipped.
 * @returns the ordered pairs in generation order
 */
function orderedStoryEdges(): [number, number][] {
    let seed = STORY_SEED;
    const random = (): number => {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        return seed / 0x7fffffff;
    };
    const edgeSet = new Set<string>();
    const edges: [number, number][] = [];
    for (let i = 0; i < STORY_NODE_COUNT; i++) {
        let dst = Math.floor(random() * STORY_NODE_COUNT);
        while (dst === i) {
            dst = Math.floor(random() * STORY_NODE_COUNT);
        }
        const key = `${i}-${dst}`;
        if (!edgeSet.has(key)) {
            edgeSet.add(key);
            edges.push([i, dst]);
        }
    }
    while (edges.length < STORY_ORDERED_EDGES) {
        const src = Math.floor(random() * STORY_NODE_COUNT);
        const dst = Math.floor(random() * STORY_NODE_COUNT);
        if (src !== dst) {
            const key = `${src}-${dst}`;
            if (!edgeSet.has(key)) {
                edgeSet.add(key);
                edges.push([src, dst]);
            }
        }
    }
    return edges;
}

/**
 * The story's edges deduplicated on the UNORDERED pair (first occurrence kept): 249 pairs for seed 42.
 * @returns the undirected edge list
 */
export function storyEdges(): readonly (readonly [number, number])[] {
    const seen = new Set<string>();
    const out: [number, number][] = [];
    for (const [a, b] of orderedStoryEdges()) {
        const key = a < b ? `${a}-${b}` : `${b}-${a}`;
        if (!seen.has(key)) {
            seen.add(key);
            out.push([a, b]);
        }
    }
    return out;
}

/**
 * The story graph as an undirected snapshot (both arcs of every edge: 498 arcs).
 * @returns the snapshot
 */
export function storyGraph(): GraphSnapshot {
    return snapshotOf(storyEdges(), { nodeCount: STORY_NODE_COUNT, label: "story150" });
}
