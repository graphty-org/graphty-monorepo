/**
 * @file Loading data into `<graphty-element>` as undoable steps.
 *
 * What the page declares -- a data source in the markup, node and edge data assigned before the
 * element's first update -- is where history starts: Undo is off once it has loaded. A load after
 * that is one step, and so is replacing the nodes, the edges, or both with `setData`. The two data
 * source properties assigned in one tick are one load. A declared load that fails leaves nothing
 * to undo, and the reader's edits after it are steps. The session half is
 * `test/session/history/graph-import.test.ts`.
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it, vi } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";

/** Per-test budget: each builds a real Babylon scene. */
const TEST_TIMEOUT_MS = 30_000;

/** Three nodes and two edges, as a JSON document. */
const GRAPH = JSON.stringify({
    nodes: [{ id: "1" }, { id: "2" }, { id: "3" }],
    edges: [
        { source: "1", target: "2" },
        { source: "2", target: "3" },
    ],
});

/** Another graph, reusing the id "1". */
const OTHER = JSON.stringify({ nodes: [{ id: "1" }, { id: "9" }], edges: [{ source: "1", target: "9" }] });

/** A document that fails: its edge names no endpoint the element reads. */
const FAILING = JSON.stringify({ nodes: [{ id: "q" }], edges: [{ x: "q", y: "q" }] });

const mounted: HTMLElement[] = [];

afterEach(() => {
    for (const element of mounted.splice(0)) {
        element.remove();
    }
});

/**
 * An element built with attributes and properties set before it is connected, the way a page or
 * a framework declares one, then connected.
 * @param declare - What the page declares.
 * @returns The element, once its first update has run.
 */
async function declared(declare: (element: Graphty) => void): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.style.display = "block";
    element.style.width = "400px";
    element.style.height = "300px";
    declare(element);
    document.body.appendChild(element);
    mounted.push(element);
    await element.updateComplete;
    return element;
}

/**
 * Wait until the element's session has nothing pending and its queue is idle.
 * @param element - The element.
 */
async function settled(element: Graphty): Promise<void> {
    await vi.waitFor(
        async () => {
            await operationQueueOf(element.graph).waitForCompletion();
            assert.lengthOf(element.session.history.pending, 0);
        },
        { timeout: 10_000 },
    );
}

/**
 * The node ids the element's graph holds, in row order.
 * @param element - The element.
 * @returns The ids.
 */
function ids(element: Graphty): unknown[] {
    return element.session.snapshot().ids.toArray();
}

describe("loading data into the element, under undo", () => {
    it(
        "a data source in the markup is the baseline: Undo is off once it has loaded",
        async () => {
            const element = await declared((each) => {
                each.setAttribute("data-source", "json");
                each.dataSourceConfig = { data: GRAPH };
            });
            await vi.waitFor(() => {
                assert.deepEqual(ids(element), ["1", "2", "3"]);
            });
            await settled(element);

            assert.isFalse(element.session.canUndo);
            assert.lengthOf(element.session.history.steps, 0);
        },
        TEST_TIMEOUT_MS,
    );

    it(
        "node and edge data declared before the first update are the baseline too",
        async () => {
            const element = await declared((each) => {
                each.nodeData = [{ id: "a" }, { id: "b" }];
                each.edgeData = [{ source: "a", target: "b" }];
            });
            await settled(element);

            assert.deepEqual(ids(element), ["a", "b"]);
            assert.isFalse(element.session.canUndo);
        },
        TEST_TIMEOUT_MS,
    );

    it(
        "a load after the element is up is one step, and the two source properties in one tick are one load",
        async () => {
            const element = await declared((each) => {
                each.dataSource = "json";
                each.dataSourceConfig = { data: GRAPH };
            });
            await settled(element);
            let loads = 0;
            element.addEventListener("data-loaded", () => {
                loads++;
            });

            element.dataSource = "json";
            element.dataSourceConfig = { data: OTHER };
            await settled(element);

            assert.strictEqual(loads, 1, "one load");
            assert.lengthOf(element.session.history.steps, 1, "one step");
            assert.deepEqual(ids(element), ["1", "9"], "the new source replaced the graph");

            await element.session.undo();
            assert.deepEqual(ids(element), ["1", "2", "3"]);
        },
        TEST_TIMEOUT_MS,
    );

    it(
        "a declared load that fails leaves nothing to undo, and a later edit is a step",
        async () => {
            const element = await declared((each) => {
                each.dataSource = "json";
                each.dataSourceConfig = { data: FAILING };
            });
            await settled(element);

            assert.isFalse(element.session.canUndo);
            assert.deepEqual(ids(element), [], "the rows it wrote were taken back");

            await element.session.styles.add({
                name: "after the failure",
                target: "node",
                selector: { match: "everything" },
                set: { "node.color": "#ff0000" },
            });
            assert.isTrue(element.session.canUndo);
        },
        TEST_TIMEOUT_MS,
    );

    it(
        "setData is one step, and so is assigning the edges",
        async () => {
            const element = await declared(() => undefined);
            await settled(element);

            element.setData({ nodes: [{ id: "a" }, { id: "b" }, { id: "c" }], edges: [{ source: "a", target: "b" }] });
            await settled(element);
            assert.lengthOf(element.session.history.steps, 1, "setData");

            element.edgeData = [
                { source: "b", target: "c" },
                { source: "c", target: "a" },
            ];
            await settled(element);
            assert.lengthOf(element.session.history.steps, 2, "the edges");
            assert.strictEqual(element.graph.getEdgeCount(), 2, "the old edge was replaced");

            await element.session.undo();
            assert.deepEqual(
                element.edgeData?.map((edge) => [edge.source, edge.target]),
                [["a", "b"]],
            );
            await element.session.undo();
            assert.isUndefined(element.nodeData);
        },
        TEST_TIMEOUT_MS,
    );

    it(
        "a pin does not outlive its node: pin 1, clear, load a graph reusing 1, and nothing is pinned",
        async () => {
            const element = await declared((each) => {
                each.dataSource = "json";
                each.dataSourceConfig = { data: GRAPH };
            });
            await settled(element);

            element.pin("1");
            assert.isTrue(element.isPinned("1"));
            element.clearData();
            await settled(element);
            element.dataSource = "json";
            element.dataSourceConfig = { data: OTHER };
            await settled(element);

            assert.deepEqual(ids(element), ["1", "9"]);
            assert.isFalse(element.isPinned("1"));
            assert.deepEqual([...element.pinnedNodes], []);
        },
        TEST_TIMEOUT_MS,
    );
});
