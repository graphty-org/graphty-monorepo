/**
 * @file Starting a layout under renderPath "batched" on data that did not change: the snapshot the
 * load froze is the one the layout reads (no freeze), the undirected view a simulation loads is
 * derived once per snapshot and reused by the next layout, and the rows drawn with no `Node` are
 * gathered once, not once per question asked about them (row-renderer.md 4.6).
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it, vi } from "vitest";

import type { Graphty } from "../../index.js";
import { storeCounters } from "../../src/data/GraphStore";
import { operationQueueOf } from "../../src/Graph";
import { dataManagerInternals } from "../../src/managers/DataManager";

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

const NODES = Array.from({ length: 200 }, (_, id) => ({ id }));
const EDGES = NODES.slice(1).map(({ id }) => ({ source: id - 1, target: id }));

/**
 * A directed chain of 200 nodes under "batched", at rest.
 * @returns The element.
 */
async function mounted(): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.style.display = "block";
    element.style.width = "400px";
    element.style.height = "300px";
    document.body.appendChild(element);
    cleanups.push(() => {
        element.remove();
    });
    await element.updateComplete;
    await operationQueueOf(element.graph).waitForCompletion();
    element.graph.setRenderPath("batched");
    await element.session.data.addNodes(NODES);
    await element.session.data.addEdges(EDGES);
    await element.graph.setLayout("fixed", { dim: 2 });
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();
    return element;
}

describe('a layout started under renderPath "batched" on unchanged data', () => {
    it("reads the frozen snapshot, derives its undirected view once, and gathers the rows once", async () => {
        const element = await mounted();
        const { graph } = element;
        const { dataManager } = graph as unknown as {
            dataManager: Parameters<typeof dataManagerInternals.builtNodes>[0];
        };
        // The premise: a batched load builds no `Node`, so every row is one drawn without one.
        assert.strictEqual([...dataManagerInternals.builtNodes(dataManager)].length, 0);
        // The snapshot the layout reads: the data manager's, which the load froze.
        const frozen = dataManager.getSnapshot();
        const gathers = vi.spyOn(dataManagerInternals, "unbuiltRows");
        cleanups.push(() => {
            gathers.mockRestore();
        });
        const derived = storeCounters.undirectedDerivations;

        await graph.setLayout("ngraph", { dim: 2, seed: 1 });
        await operationQueueOf(graph).waitForCompletion();
        assert.strictEqual(dataManager.getSnapshot(), frozen, "no freeze at layout start");
        assert.strictEqual(gathers.mock.calls.length, 1, "rows drawn with no Node gathered once");
        assert.isAtMost(storeCounters.undirectedDerivations - derived, 1);

        const once = storeCounters.undirectedDerivations;
        await graph.setLayout("d3", { dim: 2 });
        await graph.setLayout("ngraph", { dim: 2, seed: 1 });
        await operationQueueOf(graph).waitForCompletion();
        assert.strictEqual(dataManager.getSnapshot(), frozen, "no freeze at the next layout start");
        assert.strictEqual(storeCounters.undirectedDerivations, once, "the undirected view is reused");
    });
});
