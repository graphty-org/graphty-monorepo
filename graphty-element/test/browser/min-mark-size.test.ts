/**
 * @file The project setting `minMarkSize` (issue #813): with it set, a node of size 0 and an edge
 * of width 0 are drawn at the minimum; with it off (the default) they are drawn as today -- the
 * edge places no line -- and clearing it puts them back.
 */
import { afterAll, assert, beforeAll, describe, it } from "vitest";

import type { Edge } from "../../src/Edge";
import { Graph, operationQueueOf } from "../../src/Graph";
import type { Node } from "../../src/Node";
import type { GraphSession } from "../../src/session";

describe("a minimum mark size", () => {
    let container: HTMLElement;
    let graph: Graph;
    let session: GraphSession;

    beforeAll(async () => {
        container = document.createElement("div");
        container.style.width = "640px";
        container.style.height = "480px";
        document.body.appendChild(container);
        graph = new Graph(container);
        await graph.init();
        session = graph.getSession();

        await graph.addNodes([{ id: "a" }, { id: "b" }]);
        await graph.addEdges([{ src: "a", dst: "b" }]);
        await graph.setLayout("circular", { scale: 1 });
        await operationQueueOf(graph).waitForCompletion();
        await session.styles.add({
            name: "size 0",
            target: "node",
            selector: { match: "everything" },
            set: { "node.size": 0 },
        });
        await session.styles.add({
            name: "width 0",
            target: "edge",
            selector: { match: "everything" },
            set: { "edge.width": 0 },
        });
        await graph.waitForStableFrame();
    });

    afterAll(() => {
        graph.dispose();
        container.remove();
    });

    function theEdge(): Edge {
        const [found] = graph.getDataManager().edges.values();
        if (!found) {
            assert.fail("no edge");
        }

        return found;
    }

    function theNode(): Node {
        const found = graph.getDataManager().nodes.get("a");
        if (!found) {
            assert.fail("no node a");
        }

        return found;
    }

    it("draws a size-0 node at size 0 and places no line for a width-0 edge when it is off", () => {
        assert.isUndefined(session.config.minMarkSize);
        assert.strictEqual(theNode().size, 0);
        assert.strictEqual(theEdge().drawnLine?.length, 0, "the line is never placed");
    });

    it("draws both at the minimum once it is set, and as before once it is cleared", async () => {
        await session.config.set({ minMarkSize: { node: 0.5, edge: 1 } });
        await graph.waitForStableFrame();
        assert.strictEqual(theNode().size, 0.5);
        assert.isAbove(theEdge().drawnLine?.length ?? 0, 0, "the width-0 edge is drawn");

        await session.config.set({ minMarkSize: undefined });
        await graph.waitForStableFrame();
        assert.strictEqual(theNode().size, 0);
        assert.strictEqual(theEdge().drawnLine?.length, 0);
    });
});
