/**
 * The sample graphs the layout stories draw, each made by a @graphty/graph-samples generator, so the
 * call shown in a story's caption and Code panel is the one a reader can run to get the same graph.
 */

import { fromEdgeArrays, type GraphSnapshot } from "@graphty/graph-format";
import type { SampleGraph } from "@graphty/graph-samples";
import {
    completeGraph,
    cycleGraph,
    erdosRenyiGraph,
    gridGraph,
    pathGraph,
    randomTreeGraph,
    starGraph,
    wattsStrogatzGraph,
} from "@graphty/graph-samples/generators";

/** The kinds of graph a story's "graph" control offers. */
export const GRAPH_KINDS = ["small world", "random", "tree", "grid", "cycle", "path", "star", "complete"] as const;
export type GraphKind = (typeof GRAPH_KINDS)[number];

/** A sample graph, its frozen snapshot, and the generator call that made it. */
export interface Sample {
    readonly sample: SampleGraph;
    readonly graph: GraphSnapshot;
    /** The generator call, as a reader would write it: `cycleGraph({ n: 10 })`. */
    readonly call: string;
}

/**
 * Freezes a sample graph into the snapshot every layout reads.
 * @param sample - the generator's output
 * @param call - the generator call that made it
 * @returns the sample, its snapshot and the call
 */
export function toSample(sample: SampleGraph, call: string): Sample {
    return { sample, graph: fromEdgeArrays(sample), call };
}

/**
 * Makes a graph of the given kind.
 * @param kind - which generator
 * @param n - the node count (a grid rounds it to whole rows)
 * @param seed - the seed of the random generators
 * @returns the sample graph
 */
export function makeGraph(kind: GraphKind, n: number, seed: number): Sample {
    switch (kind) {
        case "small world": {
            // every node keeps k / 2 of its ring edges, so no node is left without a neighbor
            const k = n > 4 ? 4 : 2;
            return toSample(
                wattsStrogatzGraph({ n, k, beta: 0.3, seed }),
                `wattsStrogatzGraph({ n: ${n}, k: ${k}, beta: 0.3, seed: ${seed} })`,
            );
        }
        case "random":
            return toSample(
                erdosRenyiGraph({ n, p: 0.3, seed }),
                `erdosRenyiGraph({ n: ${n}, p: 0.3, seed: ${seed} })`,
            );
        case "tree":
            return toSample(randomTreeGraph({ n, seed }), `randomTreeGraph({ n: ${n}, seed: ${seed} })`);
        case "grid": {
            const rows = Math.max(1, Math.floor(Math.sqrt(n)));
            const cols = Math.max(1, Math.round(n / rows));
            return toSample(gridGraph({ rows, cols }), `gridGraph({ rows: ${rows}, cols: ${cols} })`);
        }
        case "cycle":
            return toSample(cycleGraph({ n }), `cycleGraph({ n: ${n} })`);
        case "path":
            return toSample(pathGraph({ n }), `pathGraph({ n: ${n} })`);
        case "star":
            return toSample(starGraph({ n }), `starGraph({ n: ${n} })`);
        default: // "complete"
            return toSample(completeGraph({ n }), `completeGraph({ n: ${n} })`);
    }
}

/** The controls every story over a generated graph shares. */
export const graphArgTypes = {
    graph: {
        control: { type: "select" },
        options: GRAPH_KINDS,
        description: "The sample graph (a @graphty/graph-samples generator)",
    },
    nodeCount: {
        control: { type: "range", min: 4, max: 30, step: 1 },
        description: "Number of nodes",
    },
    seed: {
        control: { type: "number" },
        description: "Seed of the random graph generators and of the layout",
    },
} as const;

/** The arguments of a story over a generated graph. */
export interface GraphArgs {
    graph: GraphKind;
    nodeCount: number;
    seed: number;
}

/**
 * The Code panel text: the imports, the graph, the layout call and reading the positions by id.
 * @param layoutImports - the names imported from @graphty/layout (toPositionMap is added)
 * @param generator - the graph-samples generator's name
 * @param graphCall - the generator call
 * @param body - the lines after the graph, which leave the layout's result in `result`
 * @returns the story parameters that put the code in the Code panel
 */
export function consumerCode(
    layoutImports: string,
    generator: string,
    graphCall: string,
    body: string,
): { docs: { source: { code: string; language: string } } } {
    const code = `import { fromEdgeArrays } from "@graphty/graph-format";
import { ${generator} } from "@graphty/graph-samples/generators";
import { ${layoutImports}, toPositionMap } from "@graphty/layout";

const graph = fromEdgeArrays(${graphCall});
${body}

// result.positions holds x, y (and z in 3D) per node, in node order; by node id:
const positions = toPositionMap(result, graph.ids);
`;
    return { docs: { source: { code, language: "ts" } } };
}
