/**
 * @file A layout that cannot place the graph an add leaves -- bfs over two nodes with no edge -- is
 * reported on the element's error channel before the awaited add resolves, on both render paths, so
 * a consumer that awaits the add and then reads its errors sees it.
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import { operationQueueOf } from "../../src/Graph";
import type { RenderPath } from "../../src/meshes/NodeBatch";

afterEach(() => {
    document.body.replaceChildren();
});

describe("a layout error during an add", () => {
    for (const path of ["objects", "batched"] as RenderPath[]) {
        it(`is reported before the add resolves (${path})`, async () => {
            const element = document.createElement("graphty-element");
            element.renderPath = path;
            element.style.display = "block";
            element.style.width = "400px";
            element.style.height = "300px";
            document.body.appendChild(element);
            await element.updateComplete;
            await operationQueueOf(element.graph).waitForCompletion();

            await element.graph.setLayout("bfs", { start: "a" });
            const errors: unknown[] = [];
            element.graph.on("error", (event) => errors.push(event));

            // Two nodes and no edge: disconnected, which bfs refuses until an edge arrives.
            await element.session.data.addNodes([{ id: "a" }, { id: "b" }]);

            assert.lengthOf(errors, 1, "reported once, before the add resolved");
        });
    }
});
