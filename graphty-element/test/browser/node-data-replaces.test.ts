/**
 * Assigning `nodeData` replaces the node set, the way assigning `edgeData` replaces the edge set.
 *
 * The setter used to call `addNodes`, so a second assignment left every node of the first in the
 * graph -- while the property's own documentation said it replaced them. Then a node named again
 * kept its OLD record, so a host that edited one field and re-assigned the array saw no change
 * (issue #355).
 */
import "../../src/graphty-element";

import { afterEach, assert, describe, test } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";

let mounted: Graphty | null = null;

afterEach(() => {
    mounted?.remove();
    mounted = null;
});

describe("nodeData", () => {
    test("a second assignment leaves only the new nodes, and drops edges whose endpoints left", async () => {
        const element = document.createElement("graphty-element");
        element.style.width = "400px";
        element.style.height = "300px";
        element.style.display = "block";
        document.body.appendChild(element);
        mounted = element;
        await element.updateComplete;

        element.nodeData = [{ id: "a" }, { id: "b" }];
        element.edgeData = [{ source: "a", target: "b" }];
        await operationQueueOf(element.graph).waitForCompletion();

        element.nodeData = [{ id: "b" }, { id: "c" }];
        await operationQueueOf(element.graph).waitForCompletion();

        const dm = element.graph.getDataManager();
        assert.deepStrictEqual([...dm.nodes.keys()].map(String).sort(), ["b", "c"]);
        assert.strictEqual(dm.edges.size, 0, "the a-b edge went with a");
    });

    test("a node named again takes its new record, repaints, keeps its position and edges, and undoes in one step", async () => {
        const element = document.createElement("graphty-element");
        element.style.width = "400px";
        element.style.height = "300px";
        element.style.display = "block";
        document.body.appendChild(element);
        mounted = element;
        await element.updateComplete;

        const { graph } = element;
        const session = graph.getSession();
        element.nodeData = [{ id: "a", hot: false, stale: 1 }, { id: "b" }];
        element.edgeData = [{ source: "a", target: "b" }];
        await operationQueueOf(graph).waitForCompletion();
        await session.styles.add({
            name: "hot nodes",
            target: "node",
            selector: { match: "expression", where: "data.hot == `true`" },
            set: { "node.color": "crimson" },
        });
        await graph.waitForSettled();

        const dm = graph.getDataManager();
        const painters = (): string[] => session.styles.explain({ node: "a" }).contributions.map((c) => c.name);
        assert.notInclude(painters(), "hot nodes");
        const at = (): string => JSON.stringify(dm.nodes.get("a")?.getPosition());
        // The layout places a node in a drawn frame, which nothing above waits for.
        await graph.waitForStableFrame();
        const before = at();
        const edgeIds = [...dm.edges.keys()];
        const steps = session.history.steps.length;

        element.nodeData = [{ id: "a", hot: true }, { id: "b" }];
        await operationQueueOf(graph).waitForCompletion();
        await graph.waitForStableFrame();

        assert.deepStrictEqual({ ...dm.nodes.get("a")?.data }, { id: "a", hot: true }, "the record it was just given");
        assert.include(painters(), "hot nodes", "the layer reading the field repainted");
        assert.strictEqual(at(), before, "the node kept its position");
        assert.deepStrictEqual([...dm.edges.keys()], edgeIds, "the edge is untouched");
        assert.strictEqual(session.history.steps.length, steps + 1, "the assignment is one step");

        await session.undo();
        await graph.waitForSettled();
        assert.deepStrictEqual({ ...dm.nodes.get("a")?.data }, { id: "a", hot: false, stale: 1 });
        assert.notInclude(painters(), "hot nodes");
    });

    test("a node the layout has not placed yet reads as the origin, not where the hidden template is parked", async () => {
        const element = document.createElement("graphty-element");
        element.style.width = "400px";
        element.style.height = "300px";
        element.style.display = "block";
        document.body.appendChild(element);
        mounted = element;
        await element.updateComplete;

        const { graph } = element;
        const frame = graph.scene.getRenderId();
        element.nodeData = [{ id: "a" }];
        await operationQueueOf(graph).waitForCompletion();

        // Read in the same turn as the load: no frame has placed the node yet.
        assert.strictEqual(graph.scene.getRenderId(), frame, "no frame was drawn in between");
        assert.deepStrictEqual(graph.getDataManager().nodes.get("a")?.getPosition(), { x: 0, y: 0, z: 0 });
    });
});
