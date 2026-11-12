/**
 * @file A `<graphty-element>` moved to another place in the page keeps its graph (#3599).
 *
 * A portal or a layout change moves an element by removing it and inserting it again in the same
 * task, which runs its disconnect path and then its connect path. The disconnect path used to shut
 * the graph down at once, so a moved element answered every data verb with `E_DISPOSED` and drew
 * an empty canvas for good. A web component must survive being moved; one that is really removed
 * must still release its engine.
 */

import { afterEach, assert, describe, it, vi } from "vitest";

import { isGraphtyError } from "../../src/errors";
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
 * Mount a `<graphty-element>` holding a small graph and wait until its graph is live.
 * @returns The mounted element.
 */
async function mount(): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    assert.instanceOf(element, Graphty);
    element.style.width = "100%";
    element.style.height = "100%";
    element.style.display = "block";
    box().appendChild(element);

    await vi.waitFor(() => {
        assert.isTrue(element.graph.initialized, "the element finished initialising");
    });
    await element.session.data.addNodes([{ id: "a" }, { id: "b" }, { id: "c" }]);
    await element.session.data.addEdges([
        { src: "a", dst: "b" },
        { src: "b", dst: "c" },
    ]);

    return element;
}

/**
 * The code a settled promise rejected with.
 * @param work - The promise.
 * @returns The rejection's code, or "resolved".
 */
async function codeOf(work: Promise<unknown>): Promise<string> {
    try {
        await work;
        return "resolved";
    } catch (error) {
        return isGraphtyError(error) ? error.code : `not a GraphtyError: ${String(error)}`;
    }
}

afterEach(() => {
    for (const container of containers.splice(0)) {
        container.remove();
    }
});

describe("a moved graphty-element", () => {
    it("keeps its graph, its history and its engine when it is moved in one task", async () => {
        const element = await mount();
        const { engine } = element.graph;
        assert.isTrue(element.session.canUndo, "the load is undoable before the move");

        // Remove and insert again elsewhere in the same task, as a portal does.
        const target = box();
        element.remove();
        target.appendChild(element);

        // Past the microtasks and a frame, where a shutdown would have happened.
        await new Promise((resolve) => requestAnimationFrame(resolve));

        assert.strictEqual(element.session.data.snapshot().nodeCount, 3, "the nodes are still there");
        assert.strictEqual(element.session.data.snapshot().edgeCount, 2, "the edges are still there");
        assert.isTrue(element.session.canUndo, "the history survived the move");
        assert.strictEqual(element.graph.engine, engine, "the same engine draws it");
        assert.isFalse(engine.isDisposed, "the engine was not disposed");
        assert.strictEqual(await codeOf(element.session.data.addNodes([{ id: "d" }])), "resolved");
        assert.strictEqual(element.session.data.snapshot().nodeCount, 4, "a data verb still works");
        await element.waitForStableFrame();
    });

    it("keeps its graph when it is moved with appendChild alone", async () => {
        const element = await mount();
        box().appendChild(element);
        await new Promise((resolve) => requestAnimationFrame(resolve));

        assert.strictEqual(await codeOf(element.session.data.addNodes([{ id: "d" }])), "resolved");
        assert.strictEqual(element.session.data.snapshot().nodeCount, 4);
    });

    it("still releases its engine and disposes its session when it is really removed", async () => {
        const element = await mount();
        const { engine } = element.graph;
        element.remove();
        // The shutdown waits for the microtask after the removal, in case the element comes back.
        await Promise.resolve();

        assert.strictEqual(await codeOf(element.session.data.addNodes([{ id: "d" }])), "E_DISPOSED");
        assert.isTrue(engine.isDisposed, "the engine was released");
    });
});
