/**
 * Assigning `nodeData` replaces the node set, the way assigning `edgeData` replaces the edge set.
 *
 * The setter used to call `addNodes`, so a second assignment left every node of the first in the
 * graph -- while the property's own documentation said it replaced them.
 */
import "../../src/graphty-element";

import { afterEach, assert, describe, test } from "vitest";

import type { Graphty } from "../../index.js";

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
        await element.graph.operationQueue.waitForCompletion();

        element.nodeData = [{ id: "b" }, { id: "c" }];
        await element.graph.operationQueue.waitForCompletion();

        const dm = element.graph.getDataManager();
        assert.deepStrictEqual([...dm.nodes.keys()].map(String).sort(), ["b", "c"]);
        assert.strictEqual(dm.edges.size, 0, "the a-b edge went with a");
    });
});
