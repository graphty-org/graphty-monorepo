/**
 * A style layer that changes only a node's opacity or color must not move nodes of a settled layout
 * that keeps nodes apart by their drawn size (`nodeGap`): neither changes a node's size (issue #9875).
 */
import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import { Graph, operationQueueOf } from "../../src/Graph";
import { dataManagerInternals } from "../../src/managers/DataManager";
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
        // Read by id, so the check builds no Node objects on renderPath "batched".
        const positions = (): { x: number; y: number }[] =>
            nodes.map(({ id }) => {
                const at = g.getSession().positions.get(id);
                assert.isDefined(at, `${id} is placed`);
                return { x: at.x, y: at.y };
            });
        const before = positions();

        await g.getSession().styles.add({ name: "late", target: "node", selector: { match: "everything" }, set });
        await operationQueueOf(g).waitForCompletion();
        for (let i = 0; i < 5; i++) {
            g.scene.render();
            await nextFrame();
        }
        assert.isTrue(g.getLayoutManager().isSettled, "the layer woke the settled layout");
        await settle(g);
        const after = positions();
        for (let i = 0; i < before.length; i++) {
            assert.strictEqual(
                Math.hypot(after[i].x - before[i].x, after[i].y - before[i].y),
                0,
                `node ${String(i)} moved`,
            );
        }
    });
});

// Under renderPath "batched" each row is drawn from a source mesh with no `Node`, and a translucent paint draws it from
// another source of the same size, which must not count as a resize (issue #10084). Positions are read by id, so the
// check builds no `Node`.
describe.each(["ngraph", "d3"] as const)("%s nodeGap on batched rows", (layout) => {
    it("an opacity-only layer after rest moves no node", async () => {
        container = document.createElement("div");
        container.style.width = "640px";
        container.style.height = "480px";
        document.body.appendChild(container);
        const g = new Graph(container);
        graph = g;
        await g.init();
        g.setRenderPath("batched");
        const ids = ["hub", ...Array.from({ length: 12 }, (_, i) => `n${String(i)}`)];
        await g.addNodes(ids.map((id) => ({ id })));
        await g.addEdges(ids.slice(1).map((id) => ({ src: "hub", dst: id })));
        await g.setLayout(layout, { seed: 7, dim: 2, nodeGap: 1 });
        await settle(g);
        assert.isTrue(g.getLayoutManager().isSettled);
        assert.strictEqual(dataManagerInternals.nodesBuilt(g.getDataManager()), 0, "every row is drawn with no Node");
        const positions = (): { x: number; y: number }[] =>
            ids.map((id) => {
                const at = g.getSession().positions.get(id);
                assert.isDefined(at, `${id} is placed`);
                return { x: at.x, y: at.y };
            });
        const before = positions();

        await g.getSession().styles.add({
            name: "late",
            target: "node",
            selector: { match: "everything" },
            set: { "node.opacity": 0.5 },
        });
        await operationQueueOf(g).waitForCompletion();
        for (let i = 0; i < 5; i++) {
            g.scene.render();
            await nextFrame();
        }
        assert.isTrue(g.getLayoutManager().isSettled, "the layer woke the settled layout");
        assert.strictEqual(dataManagerInternals.nodesBuilt(g.getDataManager()), 0, "the layer built no Node");
        await settle(g);
        assert.deepStrictEqual(positions(), before);
    });
});
