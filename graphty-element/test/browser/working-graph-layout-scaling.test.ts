/**
 * @file Counted-work scaling of a layout over the working graph (design/working-graph/design.md,
 * section 7): a filter change cuts the layout's part of the graph and lays the shown nodes out again.
 * A path of n and of 4n nodes, half of them shown, and the elements the filter change and the layout
 * it sets off visit may grow no faster than the graph: 4x, never 16x. Counted, never timed.
 *
 * The render loop is stopped, so no frame steps the layout inside the count. Strict state is off,
 * as it is for a consumer.
 */

import { afterAll, assert, beforeAll, describe, it } from "vitest";

import { Graph, operationQueueOf } from "../../src/Graph";
import { layoutEngineInternals } from "../../src/layout/LayoutEngine";
import type { ElementSession } from "../../src/session/types";
import { assertScalesLinearly, visitsDuring } from "../helpers/cost";

/** The two graph sizes. */
const SIZES = [100, 400] as const;

describe("a layout over the working graph", () => {
    const scope = globalThis as { __GRAPHTY_STRICT_STATE__?: boolean };
    let strict: boolean | undefined;

    beforeAll(() => {
        strict = scope.__GRAPHTY_STRICT_STATE__;
        scope.__GRAPHTY_STRICT_STATE__ = false;
    });

    afterAll(() => {
        scope.__GRAPHTY_STRICT_STATE__ = strict;
    });

    for (const layout of ["circular", "forceatlas2"]) {
        it(`re-lays out ${layout} once per filter change: no more than linear in the graph`, async () => {
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
                        const session = graph.getSession() as ElementSession;
                        session.config.setWorkingGraph("visible");
                        const ids = Array.from({ length: size }, (_, index) => `n${String(index)}`);
                        await graph.setLayout(layout, { dim: 2, seed: 1 });
                        await graph.addNodes(ids.map((id) => ({ id })));
                        await graph.addEdges(ids.slice(1).map((id, index) => ({ src: ids[index], dst: id })));
                        await operationQueueOf(graph).waitForCompletion();
                        let layouts = 0;
                        graph.addListener("layout-changed", () => {
                            layouts++;
                        });
                        const shown = ids.filter((_id, index) => index % 2 === 0);

                        const visits = await visitsDuring(async () => {
                            await session.visibility.set({ kind: "member", of: { nodes: shown } });
                            await graph.waitForSettled();
                        });

                        assert.strictEqual(layouts, 1, "the filter change laid the shown nodes out once");
                        const engine = graph.getLayoutManager().layoutEngine;
                        assert.isDefined(engine);
                        const held = [...graph.getDataManager().nodes.values()].filter(
                            (node) => engine !== undefined && layoutEngineInternals.holdsNode(engine, node),
                        );
                        assert.strictEqual(held.length, size / 2, "the layout runs on the shown half alone");
                        return visits;
                    } finally {
                        graph.dispose();
                        container.remove();
                    }
                },
                { sizes: SIZES, counter: `elements visited by a filter change under ${layout}` },
            );
        });
    }
});
