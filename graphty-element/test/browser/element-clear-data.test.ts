/**
 * Regression tests for `graphty-element.clearData()` and the per-load data-source guard.
 *
 * `#tryInitializeDataSource` is called from BOTH the `dataSource` and the
 * `dataSourceConfig` setters, so it needs a guard: one assignment of the pair must start
 * one load, not two. That guard used to latch for the element's whole lifetime, which
 * meant it also refused every dataset after the first -- a host that set the pair a second
 * time got no load at all, while the element reported the new source. The symptom in the
 * graphty app was a second sample that renamed the dataset in the top bar and left the
 * first graph on the canvas.
 *
 * `clearData()` is where the guard resets, because clearing the data is the statement that
 * the previous load is over. It resets the two properties with it: leaving the old pair in
 * place would let the next half-assignment load the NEW source against the OLD config.
 */
import "../../src/graphty-element";

import { afterEach, assert, describe, test } from "vitest";

import type { Graphty } from "../../index.js";

/** How long the element needs to connect and finish its first update. */
const ELEMENT_READY_MS = 300;

/** How long a data-source assignment needs to reach the data manager. */
const LOAD_SETTLE_MS = 200;

/** Two nodes and one edge, as an inline JSON data source. */
const FIRST_GRAPH = JSON.stringify({
    nodes: [{ id: "a" }, { id: "b" }],
    edges: [{ src: "a", dst: "b" }],
});

/** Three nodes, so a second load is told apart from the first by node count alone. */
const SECOND_GRAPH = JSON.stringify({
    nodes: [{ id: "x" }, { id: "y" }, { id: "z" }],
    edges: [{ src: "x", dst: "y" }],
});

let mounted: Graphty | null = null;

/**
 * Mounts a graphty-element and waits for it to initialise.
 * @returns the element.
 */
async function createGraphtyElement(): Promise<Graphty> {
    const container = document.createElement("div");

    container.style.width = "400px";
    container.style.height = "300px";
    document.body.appendChild(container);

    const element = document.createElement("graphty-element");

    element.style.width = "100%";
    element.style.height = "100%";
    element.style.display = "block";
    container.appendChild(element);

    await new Promise((resolve) => setTimeout(resolve, ELEMENT_READY_MS));

    mounted = element;

    return element;
}

/**
 * Sets the data-source pair the way a host does, and waits for the load to land.
 * @param element - the mounted element.
 * @param data - the inline JSON to load.
 */
async function loadInline(element: Graphty, data: string): Promise<void> {
    element.dataSource = "json";
    element.dataSourceConfig = { data };

    await new Promise((resolve) => setTimeout(resolve, LOAD_SETTLE_MS));
}

afterEach(() => {
    mounted?.parentElement?.remove();
    mounted = null;
});

describe("graphty-element.clearData", () => {
    test("loads a second dataset after clearData, where it used to load nothing", async () => {
        const element = await createGraphtyElement();

        await loadInline(element, FIRST_GRAPH);

        assert.strictEqual(element.graph?.getDataManager().nodes.size, 2);

        element.clearData();

        await loadInline(element, SECOND_GRAPH);

        // The three nodes of the SECOND graph, not the two of the first and not nothing.
        assert.strictEqual(element.graph?.getDataManager().nodes.size, 3);
    });

    test("empties the graph", async () => {
        const element = await createGraphtyElement();

        await loadInline(element, FIRST_GRAPH);
        element.clearData();

        assert.strictEqual(element.graph?.getDataManager().nodes.size, 0);
    });

    test("forgets the pair, so a half-assignment cannot load a new source against the old config", async () => {
        const element = await createGraphtyElement();

        await loadInline(element, FIRST_GRAPH);
        element.clearData();

        assert.isUndefined(element.dataSource);
        assert.isUndefined(element.dataSourceConfig);

        // Naming a source with no config must not start anything on its own.
        element.dataSource = "json";

        await new Promise((resolve) => setTimeout(resolve, LOAD_SETTLE_MS));

        assert.strictEqual(element.graph?.getDataManager().nodes.size, 0);
    });

    test("still starts one load per assignment of the pair, not two", async () => {
        const element = await createGraphtyElement();

        await loadInline(element, FIRST_GRAPH);

        // Both setters call the initialiser; the guard is what stops the second call
        // loading the same data again on top of the first.
        assert.strictEqual(element.graph?.getDataManager().nodes.size, 2);
        assert.strictEqual(element.graph?.getDataManager().edges.size, 1);
    });
});
