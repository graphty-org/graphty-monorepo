/**
 * @file `style-changed`, a declared event with nothing left to emit it.
 *
 * The event is still in the exported event union and `EventManager.addListener` still has a case
 * for it, so a consumer can subscribe and will wait for ever: its only emitter was the 1.x
 * `StyleManager`, which is gone. A settings panel that repaints its layer list when the stack
 * moves had a documented event to hang off and nothing ever arrived.
 *
 * The session already announces every stack edit -- `session.on("style:changed", ...)` -- and the
 * element already listens to it, to take the dirty set. This puts the DOM-side event back on the
 * same fact.
 */

import { afterEach, assert, beforeEach, describe, it } from "vitest";

import { Graph } from "../../src/Graph";

/** Two nodes and the edge between them. */
const NODES = [{ id: "alpha" }, { id: "omega" }];

/** The one edge. */
const EDGES = [{ src: "alpha", dst: "omega" }];

describe("the style-changed event", () => {
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

    it("fires when a layer is added", async () => {
        const seen: { type: string }[] = [];
        graph.eventManager.addListener("style-changed", (event) => {
            seen.push(event as { type: string });
        });

        await graph.getSession().styles.add({ name: "red nodes", selector: { match: "everything" }, set: { "node.color": "#FF0000" } });

        assert.strictEqual(seen.length, 1, "adding a layer announced itself");
        assert.strictEqual(seen[0].type, "style-changed");
    });

    it("fires when a layer is removed", async () => {
        const added = await graph.getSession().styles.add({ name: "red nodes", selector: { match: "everything" }, set: { "node.color": "#FF0000" } });

        const seen: unknown[] = [];
        graph.eventManager.addListener("style-changed", (event) => {
            seen.push(event);
        });

        await graph.getSession().styles.remove(added.id);

        assert.strictEqual(seen.length, 1, "removing a layer announced itself too");
    });

    it("says how much of the picture the edit repainted", async () => {
        const seen: { painted?: unknown }[] = [];
        graph.eventManager.addListener("style-changed", (event) => {
            seen.push(event as { painted?: unknown });
        });

        await graph.getSession().styles.add({ name: "red nodes", selector: { match: "everything" }, set: { "node.color": "#FF0000" } });

        assert.isDefined(seen[0].painted, "a consumer mirroring the stack is told what moved");
    });
});
