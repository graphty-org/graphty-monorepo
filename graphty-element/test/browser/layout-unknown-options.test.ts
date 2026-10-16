/**
 * @file A layout that does not refuse an unknown option says which ones it ignored.
 *
 * `ngraph` used to drop a misspelled option with no sign: the layout guide's `dimensions: 2` drew
 * in 3D (issue #3001). It and the simulation layouts now report `W_UNKNOWN_OPTION` as a
 * `layout-warning` event, and still run, because refusing would break a call that runs today.
 */

import { afterEach, assert, beforeEach, describe, it } from "vitest";

import type { LayoutWarningEvent } from "../../src/events";
import { type Graph, operationQueueOf } from "../../src/Graph";
import { cleanupTestGraph, createTestGraph } from "../helpers/testSetup";

describe("unknown layout options", () => {
    let graph: Graph;
    let warnings: Omit<LayoutWarningEvent, "type">[];

    beforeEach(async () => {
        graph = await createTestGraph();
        warnings = [];
        graph.addListener("layout-warning", (event) => {
            warnings.push({ layoutType: event.layoutType, code: event.code, params: event.params });
        });
        await graph.addNodes([{ id: "a" }, { id: "b" }]);
    });

    afterEach(() => {
        cleanupTestGraph(graph);
    });

    /**
     * Set a layout and wait for it to be built.
     * @param type - the layout
     * @param opts - its options
     */
    async function layout(type: string, opts: Record<string, unknown>): Promise<void> {
        await graph.setLayout(type, opts);
        await operationQueueOf(graph).waitForCompletion();
    }

    it("ngraph reports the options it ignored, and runs", async () => {
        await layout("ngraph", { dimensions: 2, springLength: 50, strength: -30 });

        assert.strictEqual(graph.getLayoutManager().layoutType, "ngraph");
        assert.lengthOf(warnings, 1);
        const [warning] = warnings;
        assert.strictEqual(warning.layoutType, "ngraph");
        assert.strictEqual(warning.code, "W_UNKNOWN_OPTION");
        assert.deepEqual(warning.params.options, ["dimensions", "strength"]);
        assert.include(warning.params.available as string[], "dim");
    });

    it("a simulation layout reports them too, but not the frame-loop options it reads", async () => {
        await layout("spring", { seed: 1, iterationsPerStep: 2, radius: 5 });

        assert.deepEqual(
            warnings.map((w) => [w.layoutType, w.code, w.params.options]),
            [["spring", "W_UNKNOWN_OPTION", ["radius"]]],
        );
    });

    it("says nothing when every option is one the layout takes", async () => {
        await layout("ngraph", { dim: 2, springLength: 50, seed: 7 });

        assert.deepEqual(warnings, []);
    });
});
