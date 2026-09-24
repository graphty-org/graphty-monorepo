/**
 * @file The four node events reach a consumer, on both channels, without handing out a mesh.
 *
 * WHAT WAS BROKEN. `node-click`, `node-hover`, `node-drag-start` and `node-drag-end` are all
 * emitted by `NodeBehavior`, all four are in the shipped events guide, and none of them reached
 * anybody. `EventManager.addListener` had no case for any of the four, so subscribing threw
 * `Unknown event type`; the node observable was private; and the element forwarded only the graph
 * observable to the DOM. So a drag changed a node's pin state and told no one, and the `pinned`
 * field the drag details now carry was unreachable by construction.
 *
 * WHY THE DOM DETAIL IS NOT THE INTERNAL EVENT. The internal event carries a live `Node` -- a
 * Babylon mesh, a material and a scene. A `CustomEvent` detail crosses to listeners that may
 * structure-clone it or post it to a worker, where a live handle either throws on the way out or
 * hands a listener something the renderer is about to dispose. The DOM detail therefore carries
 * the node's id, and a consumer looks the record up. This is the same rule the selection, run and
 * visibility mirrors already follow, and the reason the old `edge-click` type was deleted rather
 * than forwarded.
 */
import "../../src/graphty-element";

import { afterEach, assert, describe, test } from "vitest";

import type { Graphty } from "../../index.js";
import type { NodeEventDetail } from "../../src/events";

/** How long the element needs to connect and finish its first update. */
const ELEMENT_READY_MS = 300;

/** How long a data-source assignment needs to reach the data manager. */
const LOAD_SETTLE_MS = 400;

/** Two nodes and the edge between them, as an inline JSON data source. */
const GRAPH = JSON.stringify({
    nodes: [{ id: "a" }, { id: "b" }],
    edges: [{ source: "a", target: "b" }],
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

describe("subscribing to a node event through the graph", () => {
    for (const type of ["node-click", "node-hover", "node-drag-start", "node-drag-end"] as const) {
        test(`${type} can be subscribed to instead of throwing`, async () => {
            const element = await mountWithGraph();

            assert.doesNotThrow(() => {
                element.graph.eventManager.addListener(type, () => undefined);
            }, `subscribing to ${type} threw, so a documented event reached nobody`);
        });
    }

    test("delivers the drag details, with the pin state the drag left behind", async () => {
        const element = await mountWithGraph();
        const seen: { type: string; pinned: boolean }[] = [];

        element.graph.eventManager.addListener("node-drag-end", (event) => {
            const drag = event as { type: string; pinned: boolean };
            seen.push({ type: drag.type, pinned: drag.pinned });
        });

        const node = element.graph.getNode("a");
        assert.isDefined(node, "the fixture has a node to drag");
        element.graph.eventManager.emitNodeEvent("node-drag-end", {
            node: node,
            position: { x: 1, y: 2, z: 3 },
            pinned: true,
        });

        assert.deepStrictEqual(seen, [{ type: "node-drag-end", pinned: true }]);
    });
});

describe("the DOM mirror of a node event", () => {
    test("reaches a listener on the element under a prefixed name", async () => {
        const element = await mountWithGraph();
        const details: NodeEventDetail[] = [];

        element.addEventListener("graphty-node-drag-end", (event) => {
            details.push((event as CustomEvent<NodeEventDetail>).detail);
        });

        const node = element.graph.getNode("a");
        assert.isDefined(node, "the fixture has a node to drag");
        element.graph.eventManager.emitNodeEvent("node-drag-end", {
            node: node,
            position: { x: 1, y: 2, z: 3 },
            pinned: true,
        });

        assert.strictEqual(details.length, 1, "the node observable is forwarded to the DOM");
        assert.strictEqual(details[0].nodeId, "a");
        assert.deepStrictEqual(details[0].position, { x: 1, y: 2, z: 3 });
        assert.isTrue(details[0].pinned, "which is the field an inspector's Pinned badge reads");
    });

    test("carries no render object, so the detail survives being cloned", async () => {
        const element = await mountWithGraph();
        const details: NodeEventDetail[] = [];

        element.addEventListener("graphty-node-hover", (event) => {
            details.push((event as CustomEvent<NodeEventDetail>).detail);
        });

        const node = element.graph.getNode("a");
        assert.isDefined(node, "the fixture has a node to hover");
        element.graph.eventManager.emitNodeEvent("node-hover", { node: node, data: { id: "a" } });

        assert.strictEqual(details.length, 1);
        assert.notProperty(details[0], "node", "a listener is handed an id, never the mesh");
        assert.doesNotThrow(() => structuredClone(details[0]), "a detail a worker cannot take is a detail that leaks");
    });

    test("keeps the element's own update events off the DOM", async () => {
        const element = await mountWithGraph();
        let heard = 0;

        for (const name of ["node-update-before", "node-update-after", "node-add-before", "graphty-node-update-after"]) {
            element.addEventListener(name, () => {
                heard++;
            });
        }

        const node = element.graph.getNode("a");
        assert.isDefined(node, "the fixture has a node to update");
        element.graph.eventManager.emitNodeEvent("node-update-after", { node: node });

        assert.strictEqual(heard, 0, "the per-repaint update events stay inside the element");
    });
});
