/**
 * @file Two verbs the guides have always taught, which have never existed.
 *
 * `docs/guide/data-sources.md` taught `graph.clear()` to empty a graph and the events guide
 * taught `graph.off(type, handler)` to undo a `graph.on(...)`. Neither has ever been a method of
 * `Graph`, in this version of the package or in 1.10.
 *
 * The unsubscribe is the worse of the two, because there was no alternative either: `on` handed
 * back nothing, the element's own `removeListener` takes an id, and `addListener` dropped the id
 * it was given. A component that mounted, subscribed and unmounted leaked a listener per mount
 * and had no way not to.
 */

import { afterEach, assert, beforeEach, describe, it } from "vitest";

import { Graph } from "../../src/Graph";

/** Three nodes and two edges, so "empty" is a change rather than a starting condition. */
const NODES = [{ id: "alpha" }, { id: "beta" }, { id: "gamma" }];

/** The edges between them. */
const EDGES = [
    { src: "alpha", dst: "beta" },
    { src: "beta", dst: "gamma" },
];

describe("the verbs the guides teach", () => {
    let container: HTMLElement;
    let graph: Graph;

    beforeEach(async () => {
        container = document.createElement("div");
        container.style.width = "400px";
        container.style.height = "300px";
        document.body.appendChild(container);
        graph = new Graph(container);
        await graph.init();

        await graph.addNodes(NODES);
        await graph.addEdges(EDGES);
        await graph.operationQueue.waitForCompletion();
    });

    afterEach(() => {
        graph.dispose();
        container.remove();
    });

    it("clearData empties the graph", () => {
        assert.strictEqual(graph.getNodeCount(), 3, "the fixture loaded, so emptying it means something");

        graph.clearData();

        assert.strictEqual(graph.getNodeCount(), 0);
        assert.strictEqual(graph.getEdgeCount(), 0);
    });

    it("on hands back the way to stop listening", async () => {
        let heard = 0;
        const stop = graph.on("data-added", () => {
            heard += 1;
        });

        await graph.addNodes([{ id: "delta" }]);
        await graph.operationQueue.waitForCompletion();
        const whileSubscribed = heard;
        assert.isAbove(whileSubscribed, 0, "the listener heard something while it was subscribed");

        stop();

        await graph.addNodes([{ id: "epsilon" }]);
        await graph.operationQueue.waitForCompletion();

        assert.strictEqual(heard, whileSubscribed, "nothing reached the listener after it was stopped");
    });

    it("stopping twice is harmless", () => {
        const stop = graph.on("data-added", () => undefined);

        stop();
        assert.doesNotThrow(() => {
            stop();
        });
    });

    it("addListener hands back the id removeListener takes", async () => {
        let heard = 0;
        const id = graph.addListener("data-added", () => {
            heard += 1;
        });

        assert.strictEqual(typeof id, "symbol", "the id is what the element's own remove verb takes");

        await graph.addNodes([{ id: "delta" }]);
        await graph.operationQueue.waitForCompletion();
        const whileSubscribed = heard;
        assert.isAbove(whileSubscribed, 0);

        assert.isTrue(graph.removeListener(id), "the id named a listener that was there");

        await graph.addNodes([{ id: "epsilon" }]);
        await graph.operationQueue.waitForCompletion();

        assert.strictEqual(heard, whileSubscribed);
    });
});
