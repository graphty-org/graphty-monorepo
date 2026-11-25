/**
 * The stats counters for arrowheads, edge-end searches and data loads are measured where that work
 * happens, so `getStats()` and the counters read more than zero once it has run (issue #8977).
 */
import "../../src/graphty-element";

import { afterEach, assert, it } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";
import { drawnFrames } from "../helpers/drawn-frames";

let element: Graphty | null = null;

afterEach(() => {
    element?.remove();
    element = null;
});

it("counts arrowhead placements, edge-end searches and loads once a graph with arrowheads loads", async () => {
    element = document.createElement("graphty-element");
    element.style.display = "block";
    element.style.width = "400px";
    element.style.height = "300px";
    document.body.appendChild(element);
    await element.updateComplete;

    const before = element.getStatsManager();
    assert.strictEqual(before.getStats().arrowCapUpdateCount, 0);
    assert.strictEqual(before.intersectCalc.count, 0);
    assert.strictEqual(before.loadTime.count, 0);

    const data = JSON.stringify({
        nodes: [{ id: "a" }, { id: "b" }, { id: "c" }],
        edges: [
            { source: "a", target: "b" },
            { source: "b", target: "c" },
        ],
    });
    await element.addDataFromSource("json", { data });
    await operationQueueOf(element.graph).waitForCompletion();

    // the first frame after the load places its edges
    await drawnFrames(element.graph.getScene(), 1);
    if (element.renderPath === "batched") {
        // a head pulled from the row table is stood by the shader while the layout moves, and placed on the CPU once
        // it rests (`ArrowCapBatch.placePulled`), which is what the stats count
        await element.waitForStableFrame();
    }

    const stats = element.getStatsManager();
    assert.isAbove(stats.getStats().arrowCapUpdateCount, 0, "arrowheads were placed");
    assert.isAbove(stats.intersectCalc.count, 0, "edge ends were searched for");
    assert.strictEqual(stats.loadTime.count, 1, "one load finished");
});
