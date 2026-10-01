/**
 * The seeded 150-node, 250-edge graph, generated once and identically everywhere.
 *
 * Two callers share it and neither can afford a different one. The performance story lays it out
 * for a reader to watch, and the real-GPU browser test lays the SAME graph out twice -- once on
 * the CPU and once on the accelerator -- and compares the two arrangements. That comparison only
 * means something if both runs started from the same edges, so the generator is seeded and lives
 * in one file rather than being pasted into each.
 *
 * Every node has at least one edge, so nothing floats off alone and a force layout has something
 * to settle. No pair is repeated, so the graph is not a multigraph and nothing merges.
 */

/** One edge, in the shape the element's `edgeData` property takes. */
export interface StoryEdge {
    /** The source node's id. */
    src: string;
    /** The destination node's id. */
    dst: string;
    /** Whatever else a caller attaches; `edgeData` takes arbitrary records. */
    [attribute: string]: unknown;
}

/** One node, in the shape the element's `nodeData` property takes. */
export interface StoryNode {
    /** The node's id. */
    id: string;
    /** Whatever else a caller attaches; `nodeData` takes arbitrary records. */
    [attribute: string]: unknown;
}

/** A generated graph, ready to hand to `nodeData` and `edgeData`. */
export interface StoryGraph {
    /** The nodes, `node-0` through `node-<count - 1>`. */
    nodes: StoryNode[];
    /** The edges between them. */
    edges: StoryEdge[];
}

/**
 * Builds the graph.
 * @param nodeCount - How many nodes.
 * @param edgeCount - How many edges, which must be at least `nodeCount` for the guarantee that
 *   every node has one.
 * @returns The nodes and the edges.
 */
export function storyGraph(nodeCount = 150, edgeCount = 250): StoryGraph {
    // A linear congruential generator rather than Math.random: the same graph on every machine,
    // on every run, is the whole reason this file exists.
    let seed = 42;
    const random = (): number => {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        return seed / 0x7fffffff;
    };

    const edges: StoryEdge[] = [];
    const seen = new Set<string>();

    for (let i = 0; i < nodeCount; i++) {
        let dst = Math.floor(random() * nodeCount);
        while (dst === i) {
            dst = Math.floor(random() * nodeCount);
        }

        const key = `${i}-${dst}`;
        if (!seen.has(key)) {
            seen.add(key);
            edges.push({ src: `node-${i}`, dst: `node-${dst}` });
        }
    }

    while (edges.length < edgeCount) {
        const src = Math.floor(random() * nodeCount);
        const dst = Math.floor(random() * nodeCount);
        const key = `${src}-${dst}`;

        if (src !== dst && !seen.has(key)) {
            seen.add(key);
            edges.push({ src: `node-${src}`, dst: `node-${dst}` });
        }
    }

    return {
        nodes: Array.from({ length: nodeCount }, (_value, index) => ({ id: `node-${index}` })),
        edges,
    };
}
