/**
 * A style layer that changes only a node's opacity or color must not move nodes of a settled layout
 * that keeps nodes apart by their drawn size (`nodeGap`): neither changes a node's size (issue #9875).
 */
import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import { Graph, operationQueueOf } from "../../src/Graph";
import { nextFrame } from "../helpers/real-input";

let container: HTMLElement | undefined;
let graph: Graph | undefined;
afterEach(() => {
    graph?.dispose();
    container?.remove();
});

async function settle(g: Graph): Promise<void> {
    await operationQueueOf(g).waitForCompletion();
    await g.waitForStableFrame();
    for (let frame = 0; frame < 4000 && !g.getLayoutManager().isSettled; frame++) {
        g.getLayoutManager().step();
    }
    g.scene.render();
}

describe.each(["ngraph", "d3"] as const)("%s nodeGap", (layout) => {
    it.for([
        ["opacity", { "node.opacity": 0.5 }],
        ["color", { "node.color": "#ff0000" }],
    ] as const)("a %s-only layer after rest moves no node", async ([, set]) => {
        container = document.createElement("div");
        container.style.width = "640px";
        container.style.height = "480px";
        document.body.appendChild(container);
        const g = new Graph(container);
        graph = g;
        await g.init();
        const nodes = [{ id: "hub" }, ...Array.from({ length: 12 }, (_, i) => ({ id: `n${String(i)}` }))];
        await g.addNodes(nodes);
        await g.addEdges(nodes.slice(1).map((n) => ({ src: "hub", dst: n.id })));
        await g.setLayout(layout, { seed: 7, dim: 2, nodeGap: 1 });
        await settle(g);
        assert.isTrue(g.getLayoutManager().isSettled);
        const engine = g.getLayoutManager().layoutEngine;
        assert.isDefined(engine);
        const before = [...g.getDataManager().nodes.values()].map((n) => ({ ...engine.getNodePosition(n) }));

        await g.getSession().styles.add({ name: "late", target: "node", selector: { match: "everything" }, set });
        await operationQueueOf(g).waitForCompletion();
        for (let i = 0; i < 5; i++) {
            g.scene.render();
            await nextFrame();
        }
        assert.isTrue(g.getLayoutManager().isSettled, "the layer woke the settled layout");
        await settle(g);
        const after = [...g.getDataManager().nodes.values()].map((n) => ({ ...engine.getNodePosition(n) }));
        for (let i = 0; i < before.length; i++) {
            assert.strictEqual(
                Math.hypot(after[i].x - before[i].x, after[i].y - before[i].y),
                0,
                `node ${String(i)} moved`,
            );
        }
    });
});
