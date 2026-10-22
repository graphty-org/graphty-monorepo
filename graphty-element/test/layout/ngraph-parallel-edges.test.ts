/**
 * Parallel edges do not stiffen the ngraph force layout.
 *
 * The ngraph engine gave every element edge its own ngraph link, and every link is a spring. A
 * pair of nodes joined by thirteen emails was pulled together by thirteen springs, while ngraph's
 * damping does not grow with them, so a dense multigraph (the Office email sample: 48 people,
 * 2,102 emails over 651 pairs) oscillated for the engine's whole 1,000-step budget and only
 * stopped when the budget ran out, still jittering. A spring says "these two are connected";
 * how many edges say so is not a stronger pull.
 */
import { assert, describe, it } from "vitest";

import type { Edge } from "../../src/Edge";
import { layoutEngineInternals } from "../../src/layout/LayoutEngine";
import { NGraphEngine } from "../../src/layout/NGraphLayoutEngine";
import type { Node } from "../../src/Node";

/** The engine's own step budget: at this many steps it stops whether or not it came to rest. */
const STEP_BUDGET = 1000;

function node(id: string, index: number): Node {
    return { id, index } as unknown as Node;
}

function edge(src: Node, dst: Node): Edge {
    return { srcId: src.id, dstId: dst.id, srcNode: src, dstNode: dst } as unknown as Edge;
}

/**
 * A dense graph shaped like the Office email sample: 48 nodes, a little over half of all pairs
 * connected, each connected pair by `copies` edges sent both ways.
 * @param copies - edges per connected pair
 * @returns the nodes and edges
 */
function officeLike(copies: number): { nodes: Node[]; edges: Edge[] } {
    const nodes = Array.from({ length: 48 }, (_, i) => node(`p${i}`, i));
    const edges: Edge[] = [];
    let state = 7;
    const next = (): number => (state = (state * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
            if (next() < 0.58) {
                for (let c = 0; c < copies; c++) {
                    edges.push(c % 2 === 0 ? edge(nodes[i], nodes[j]) : edge(nodes[j], nodes[i]));
                }
            }
        }
    }

    return { nodes, edges };
}

/**
 * Step a seeded 3D ngraph simulation until it says it is at rest, or the budget runs out.
 * @param graph - what to lay out
 * @returns the steps taken and every node's final position
 */
function settle(graph: { nodes: Node[]; edges: Edge[] }): { steps: number; places: number[][] } {
    const simulation = new NGraphEngine({ seed: 1, dim: 3 });
    layoutEngineInternals.addNodes(simulation, graph.nodes);
    layoutEngineInternals.addEdges(simulation, graph.edges);
    let steps = 0;
    while (!simulation.isSettled || steps === 0) {
        simulation.step();
        steps++;
    }

    const places = graph.nodes.map((n) => {
        const { x, y, z } = simulation.ngraphLayout.getNodePosition(n.id);
        return [x, y, z ?? 0];
    });
    return { steps, places };
}

describe("the ngraph layout on a graph with parallel edges", () => {
    it("comes to rest on its own, and arranges exactly as the graph with one edge per pair", () => {
        const multi = settle(officeLike(3));
        const simple = settle(officeLike(1));

        assert.isBelow(multi.steps, STEP_BUDGET, "it settled by its own measure, not by running out of steps");
        assert.strictEqual(multi.steps, simple.steps, "parallel edges take as many steps as one edge per pair");
        assert.deepStrictEqual(multi.places, simple.places, "and land every node in the same place");
    });
});
