/**
 * `layout.settle()` after an undo back to the default force layout took 71 seconds at 10,000 nodes
 * in a session with no renderer (#10413). Settle itself took no extra steps: it ran the engine's
 * own 100, as the engine does alone. Each step was the cost: the default engine (ngraph) is
 * stepped by ForceAtlas2 there, and ForceAtlas2 repelled every pair of nodes, n * (n - 1) pair
 * forces per step, where the engine it stands in for repels by Barnes-Hut. What is asserted is
 * counted work: the steps settle runs, how often it publishes the positions, and the pair forces
 * each node takes per step, which must not grow with the graph.
 */

import { barabasiAlbertGraph } from "@graphty/graph-samples/generators";
import { ForceAtlas2Simulation } from "@graphty/layout";
import { afterAll, assert, beforeAll, describe, it } from "vitest";

import { createGraphSession } from "../../session";
import { ElementPositions } from "../../src/data/positions";
import type { ElementSession } from "../../src/session/types";

const counted = { pairs: 0, moved: 0 };
const restore: (() => void)[] = [];

/**
 * Counts the calls of a prototype method into `counted[key]`.
 * @param prototype - The prototype.
 * @param method - The method's name.
 * @param key - The counter.
 */
function count(prototype: object, method: string, key: keyof typeof counted): void {
    const methods = prototype as Record<string, (...args: unknown[]) => unknown>;
    const original = methods[method];
    methods[method] = function (this: unknown, ...args: unknown[]): unknown {
        counted[key] += 1;
        return original.apply(this, args);
    };
    restore.push(() => {
        methods[method] = original;
    });
}

/**
 * The work of a settle after an undo from the circular layout back to the default force layout.
 * @param nodes - How many nodes in a seeded Barabasi-Albert graph.
 * @returns The steps, the publishes and the pair forces per node per step.
 */
async function settleAfterUndo(nodes: number): Promise<{ steps: number; moved: number; pairsPerNode: number }> {
    const graph = barabasiAlbertGraph({ n: nodes, m: 2, seed: 1 });
    const session = createGraphSession({ workingGraph: false }) as ElementSession;
    const data = {
        nodes: Array.from({ length: nodes }, (_, i) => ({ id: `n${String(i)}` })),
        edges: Array.from(graph.src, (src, e) => ({ source: `n${String(src)}`, target: `n${String(graph.dst[e])}` })),
    };
    await session.data.import({ type: "json", config: { data: JSON.stringify(data) } });
    await session.layout.set("circular");
    await session.layout.settle();
    counted.pairs = 0;
    counted.moved = 0;
    assert.strictEqual((await session.undo()).kind, "undone");
    assert.isTrue(await session.layout.settle());
    const steps = session.layout.step;
    session.dispose();
    return { steps, moved: counted.moved, pairsPerNode: counted.pairs / steps / nodes };
}

describe("layout.settle() on the default force layout", () => {
    beforeAll(() => {
        // pairScale is the one pair force ForceAtlas2 computes, exact or through its Barnes-Hut tree.
        count(ForceAtlas2Simulation.prototype, "pairScale", "pairs");
        count(ElementPositions.prototype, "moved", "moved");
    });

    afterAll(() => {
        for (const undo of restore) {
            undo();
        }
    });

    it("takes the engine's own steps and pair forces per node that do not grow with the graph", async () => {
        const small = await settleAfterUndo(200);
        const large = await settleAfterUndo(2000);
        const seen = `200 nodes ${JSON.stringify(small)}, 2,000 nodes ${JSON.stringify(large)}`;
        for (const run of [small, large]) {
            // ForceAtlas2's own cap: the stand-in rests where the engine alone does, no step past it.
            assert.strictEqual(run.steps, 100, seen);
            assert.isAtMost(run.moved, run.steps + 2, `positions published on load and at most once a step: ${seen}`);
        }

        // Exact repulsion is n - 1 pair forces per node per step: 199 and 1,999 here.
        assert.isBelow(large.pairsPerNode, 50, seen);
        assert.isAtMost(large.pairsPerNode, 2 * small.pairsPerNode, seen);
    });
});
