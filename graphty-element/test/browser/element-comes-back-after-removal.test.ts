/**
 * @file A `<graphty-element>` removed from the page and inserted again in a later task draws and
 * responds again (#7130).
 *
 * Removal past the current task shuts the graph down and frees its engine (#3599). Inserting the
 * element again used to re-run its wiring against that dead graph: a blank canvas, events that
 * never came and nothing reported. It now builds a new graph from what the page declared.
 */

import { afterEach, assert, describe, it, vi } from "vitest";

import { Graphty } from "../../src/graphty-element";

const containers: HTMLDivElement[] = [];

/**
 * A sized box on the page.
 * @returns The box.
 */
function box(): HTMLDivElement {
    const container = document.createElement("div");
    container.style.width = "480px";
    container.style.height = "360px";
    document.body.appendChild(container);
    containers.push(container);
    return container;
}

/**
 * Waits until the element's current graph has finished initialising.
 * @param element - The element.
 */
async function initialised(element: Graphty): Promise<void> {
    await vi.waitFor(() => {
        assert.isTrue(element.graph.initialized, "the element finished initialising");
    });
}

afterEach(() => {
    for (const container of containers.splice(0)) {
        container.remove();
    }
});

describe("a graphty-element inserted again after it was removed", () => {
    it("draws what the page declared and answers the page again", async () => {
        const element = document.createElement("graphty-element");
        assert.instanceOf(element, Graphty);
        element.style.display = "block";
        element.style.width = "100%";
        element.style.height = "100%";
        element.layout = "circular";
        element.nodeData = [{ id: "a" }, { id: "b" }, { id: "c" }];
        element.edgeData = [
            { src: "a", dst: "b" },
            { src: "b", dst: "c" },
        ];
        box().appendChild(element);
        await initialised(element);
        await vi.waitFor(() => {
            assert.strictEqual(element.session.data.snapshot().nodeCount, 3);
        });
        const firstEngine = element.graph.engine;

        // Removed and left out past the next task: the graph shuts down for good.
        element.remove();
        await vi.waitFor(() => {
            assert.isTrue(firstEngine.isDisposed, "the first engine was released");
        });

        box().appendChild(element);
        await initialised(element);

        assert.notStrictEqual(element.graph.engine, firstEngine, "a new engine draws it");
        await vi.waitFor(() => {
            assert.strictEqual(element.session.data.snapshot().nodeCount, 3, "the declared nodes are back");
            assert.strictEqual(element.session.data.snapshot().edgeCount, 2, "the declared edges are back");
        });
        assert.strictEqual(element.layout, "circular", "the declared layout is back");
        assert.isFalse(element.session.canUndo, "the declaration is setup, not an undoable step");
        await element.waitForStableFrame();

        // It responds: a selection reaches the page as a DOM event, and a data verb works.
        const selections: unknown[] = [];
        element.addEventListener("graphty-selection-change", (event) => selections.push(event.detail));
        await element.session.selection.apply({ nodes: ["a"] });
        await vi.waitFor(() => {
            assert.isAtLeast(selections.length, 1, "the selection event reached the page");
        });
        await element.session.data.addNodes([{ id: "d" }]);
        assert.strictEqual(element.session.data.snapshot().nodeCount, 4);

        // Removed again, it shuts its new graph down without a throw.
        const secondEngine = element.graph.engine;
        element.remove();
        await vi.waitFor(() => {
            assert.isTrue(secondEngine.isDisposed, "the second engine was released");
        });
    });
});
