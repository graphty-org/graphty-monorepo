/**
 * @file Columns by group with 17 groups fills the canvas width at Fit: the columns used to draw
 * as a band about a sixth as wide as it was tall, about 80 px wide (issue #9301). Read through the
 * public API: `nodeScreenPosition`.
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import { operationQueueOf } from "../../src/Graph";

const WIDTH = 640;
const HEIGHT = 400;
const GROUPS = 17;

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

describe("Columns by group at Fit", () => {
    it("spreads 17 columns across most of the canvas width", async () => {
        const element = document.createElement("graphty-element");
        element.style.display = "block";
        element.style.width = `${String(WIDTH)}px`;
        element.style.height = `${String(HEIGHT)}px`;
        document.body.appendChild(element);
        cleanups.push(() => {
            element.remove();
        });
        await element.updateComplete;
        await element.setViewMode("2d");
        await operationQueueOf(element.graph).waitForCompletion();

        // one tall group and many short ones, as Louvain finds on a real network
        const nodes = Array.from({ length: GROUPS }, (_, k) =>
            Array.from({ length: k === 0 ? 30 : 3 }, (_, j) => ({ id: `${String(k)}-${String(j)}`, group: k })),
        ).flat();
        await element.session.data.addNodes(nodes);
        await element.session.layout.set("multipartite", { options: { groupBy: "data.group" } });
        await element.graph.waitForSettled();
        await element.applyCameraView("fitToGraph", { animate: false });
        await element.waitForStableFrame();

        const xs = new Map<number, number>();
        for (const { id, group } of nodes) {
            const at = element.graph.nodeScreenPosition(id);
            assert.exists(at, `node ${id} is drawn`);
            xs.set(group, at.x);
        }
        const columns = [...xs.values()];
        const span = Math.max(...columns) - Math.min(...columns);
        assert.strictEqual(new Set(columns.map((x) => Math.round(x))).size, GROUPS, "every group has its own column");
        assert.isAtLeast(span / WIDTH, 0.6, `the columns span ${span.toFixed(1)} px of ${String(WIDTH)}`);
    });
});
