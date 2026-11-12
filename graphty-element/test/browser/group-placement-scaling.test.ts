/**
 * @file Counted-work scaling of placing the groups that follow their members (Cytoscape.js
 * compound nodes, Graphviz clusters, yEd groups): `LayoutManager.placeGroups`, which the frame
 * loop calls before it draws the nodes, tells the layout engine which rows are groups
 * (`LayoutEngine.setFollowers`) and puts each group on its members' padded box. A graph of n and
 * of 4n nodes, a fifth of them groups of four members each, and the elements the call visits (see
 * `visitsDuring`) may grow no faster than the graph: 4x, never 16x (issue #1643). Counted, never
 * timed.
 *
 * The render loop is stopped before the data arrives, so no frame places the groups first and the
 * counted call is the one that tells the engine about them. Strict state is off, as it is for a
 * consumer.
 */

import { afterAll, assert, beforeAll, describe, it, vi } from "vitest";

import { Graph, operationQueueOf } from "../../src/Graph";
import { assertScalesLinearly, visitsDuring } from "../helpers/cost";

/** The two graph sizes, each a multiple of five: one group to every four members. */
const SIZES = [100, 400] as const;

/**
 * A Cytoscape.js document of `size` nodes: `size / 5` groups, each holding four members joined in
 * a path, and an edge from each group's last member to the next group's first.
 * @param size - The node count.
 * @returns The document.
 */
function grouped(size: number): string {
    const elements: { data: Record<string, string> }[] = [];
    for (let group = 0; group < size / 5; group++) {
        const id = `g${String(group)}`;
        elements.push({ data: { id } });
        for (let member = 0; member < 4; member++) {
            elements.push({ data: { id: `${id}m${String(member)}`, parent: id } });
            if (member > 0) {
                elements.push({
                    data: {
                        id: `${id}e${String(member)}`,
                        source: `${id}m${String(member - 1)}`,
                        target: `${id}m${String(member)}`,
                    },
                });
            }
        }

        if (group > 0) {
            elements.push({ data: { id: `${id}link`, source: `g${String(group - 1)}m3`, target: `${id}m0` } });
        }
    }

    return JSON.stringify({ elements });
}

describe("placing the groups that follow their members", () => {
    const scope = globalThis as { __GRAPHTY_STRICT_STATE__?: boolean };
    let strict: boolean | undefined;

    beforeAll(() => {
        strict = scope.__GRAPHTY_STRICT_STATE__;
        scope.__GRAPHTY_STRICT_STATE__ = false;
    });

    afterAll(() => {
        scope.__GRAPHTY_STRICT_STATE__ = strict;
    });

    it("LayoutManager.placeGroups, LayoutEngine.setFollowers: no more than linear in the graph", async () => {
        await assertScalesLinearly(
            async (size) => {
                const container = document.createElement("div");
                container.style.width = "400px";
                container.style.height = "300px";
                document.body.appendChild(container);
                const graph = new Graph(container);
                try {
                    await graph.init();
                    graph.engine.stopRenderLoop();
                    await graph.addDataFromSource("json", { data: grouped(size) });
                    await operationQueueOf(graph).waitForCompletion();
                    const layout = graph.getLayoutManager();
                    assert.strictEqual(graph.getDataManager().groups.length, size / 5, "every group was read");
                    const engine = layout.layoutEngine as unknown as { setFollowers: () => void };
                    const told = vi.spyOn(engine, "setFollowers");

                    const visits = await visitsDuring(() => {
                        layout.placeGroups();
                    });
                    assert.strictEqual(told.mock.calls.length, 1, "the engine was told which rows are groups");
                    assert.isDefined(layout.groupBox("g0"), "the first group was placed on its members");
                    return visits;
                } finally {
                    graph.dispose();
                    container.remove();
                }
            },
            { sizes: SIZES, counter: "elements visited by LayoutManager.placeGroups" },
        );
    });
});
