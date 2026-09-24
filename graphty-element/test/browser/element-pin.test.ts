/**
 * Pinning and releasing nodes from the element itself, without reaching through `element.graph`.
 *
 * WHY A DOOR IS PART OF THIS CHANGE AND NOT A LATER ONE. `pinOnDrag` is on by default, and a pin
 * now survives a layout change, a 2D/3D switch and a style template. So the moment pins stopped
 * being released by accident, every node a reader had ever dragged became permanently fixed -- and
 * the only way back out was `element.graph`, the escape hatch this release exists to close. A
 * behaviour a consumer cannot undo through the public surface is not a feature.
 *
 * The application had already designed the UI against this: its node inspector carries a Pin verb
 * and a Pinned badge whose handler did nothing, because there was nothing to call.
 */
import "../../src/graphty-element";

import { afterEach, assert, describe, test } from "vitest";

import type { Graphty } from "../../index.js";

/** How long the element needs to connect and finish its first update. */
const ELEMENT_READY_MS = 300;

/** How long a data-source assignment needs to reach the data manager. */
const LOAD_SETTLE_MS = 400;

/** Three nodes and two edges, as an inline JSON data source. */
const GRAPH = JSON.stringify({
    nodes: [{ id: "a" }, { id: "b" }, { id: "c" }],
    edges: [
        { source: "a", target: "b" },
        { source: "b", target: "c" },
    ],
});

let mounted: Graphty | null = null;

/**
 * Mount a graphty-element, load the graph into it and wait for both to settle.
 * @returns the element
 */
async function mountWithGraph(): Promise<Graphty> {
    const container = document.createElement("div");
    container.style.width = "400px";
    container.style.height = "300px";
    document.body.appendChild(container);

    const element = document.createElement("graphty-element");
    element.style.width = "100%";
    element.style.height = "100%";
    element.style.display = "block";
    container.appendChild(element);
    mounted = element;

    await new Promise((resolve) => setTimeout(resolve, ELEMENT_READY_MS));
    element.dataSource = "json";
    element.dataSourceConfig = { data: GRAPH };
    await new Promise((resolve) => setTimeout(resolve, LOAD_SETTLE_MS));

    return element;
}

afterEach(() => {
    mounted?.parentElement?.remove();
    mounted = null;
});

describe("pinning nodes through the element", () => {
    test("pins a node, reports it pinned, and releases it again", async () => {
        const element = await mountWithGraph();

        assert.deepStrictEqual([...element.pinnedNodes], [], "nothing is pinned until somebody pins it");

        element.pin("a");
        assert.deepStrictEqual([...element.pinnedNodes], ["a"], "the element reports what it holds");

        element.unpin("a");
        assert.deepStrictEqual([...element.pinnedNodes], [], "and there is a way back out");
    });

    test("takes several ids at once, which is what a multi-selection hands it", async () => {
        const element = await mountWithGraph();

        element.pin(["a", "c"]);
        assert.deepStrictEqual([...element.pinnedNodes].sort(), ["a", "c"]);

        element.unpin(["a", "c"]);
        assert.deepStrictEqual([...element.pinnedNodes], []);
    });

    test("keeps the pin across a layout change, which is the whole reason the door exists", async () => {
        const element = await mountWithGraph();

        element.pin("b");
        await element.setLayout("circular");

        assert.deepStrictEqual([...element.pinnedNodes], ["b"], "changing arrangement did not release it");

        element.unpin("b");
        assert.deepStrictEqual([...element.pinnedNodes], [], "and it can still be released afterwards");
    });

    test("answers whether one node is pinned, without walking the whole graph to do it", async () => {
        const element = await mountWithGraph();

        assert.isFalse(element.isPinned("a"), "nothing is pinned until somebody pins it");
        element.pin("a");
        assert.isTrue(element.isPinned("a"));
        assert.isFalse(element.isPinned("b"), "and only the node that was pinned");
        assert.isFalse(element.isPinned("nobody"), "an id naming no node is not pinned, and is not an error");
    });

    test("ignores an id that names no node instead of throwing", async () => {
        const element = await mountWithGraph();

        assert.doesNotThrow(() => {
            element.pin("nobody");
            element.unpin("nobody");
        });
        assert.deepStrictEqual([...element.pinnedNodes], []);
    });
});

describe("a graph whose ids the file wrote as integers", () => {
    /**
     * Mount an element over a graph whose node ids are numbers, the way GML supplies them.
     * @returns the element
     */
    async function mountNumericGraph(): Promise<Graphty> {
        const container = document.createElement("div");
        container.style.width = "400px";
        container.style.height = "300px";
        document.body.appendChild(container);

        const element = document.createElement("graphty-element");
        element.style.width = "100%";
        element.style.height = "100%";
        element.style.display = "block";
        container.appendChild(element);
        mounted = element;

        await new Promise((resolve) => setTimeout(resolve, ELEMENT_READY_MS));
        element.dataSource = "json";
        element.dataSourceConfig = {
            data: JSON.stringify({
                nodes: [{ id: 1 }, { id: 2 }, { id: 34 }],
                edges: [{ source: 1, target: 34 }],
            }),
        };
        await new Promise((resolve) => setTimeout(resolve, LOAD_SETTLE_MS));

        return element;
    }

    // Every id a consumer has printed -- into a URL, a DOM attribute, a list item, a saved
    // document -- is text by the time it comes back, and the element keyed its node map on the id
    // the file carried, untouched. So `pin("34")` looked up the string, missed the number, and
    // returned nothing to detect the miss by: a control that did nothing, on exactly the samples
    // the element ships. The retry is integers only, and an exact key always wins.
    test("takes a printed id for a node the file numbered", async () => {
        const element = await mountNumericGraph();

        element.pin("34");
        assert.deepStrictEqual([...element.pinnedNodes], [34], "the graph holds the id its file carried");
        assert.isTrue(element.isPinned("34"), "and answers to the printed form as well");
        assert.isTrue(element.isPinned(34));

        element.unpin("34");
        assert.deepStrictEqual([...element.pinnedNodes], []);
    });

    test("takes the same printed id everywhere a node is named", async () => {
        const element = await mountNumericGraph();

        assert.isTrue(element.selectNode("34"), "selection used to miss it too");
        assert.isDefined(element.getNode("34"), "and so did the element's own lookup");
        assert.isUndefined(element.getNode("35"), "an id nothing answers to is still nothing");
        assert.isUndefined(element.getNode("not-a-number"), "and a non-integer id is never retried as one");
    });

    test("removes the node and its edges when the caller spells the id as text", async () => {
        const element = await mountNumericGraph();
        assert.strictEqual(element.getEdgeCount(), 1);

        await element.removeNodes(["34"]);

        assert.strictEqual(element.getNodeCount(), 2, "the node went");
        assert.strictEqual(element.getEdgeCount(), 0, "and the edge attached to it went with it");
    });
});
