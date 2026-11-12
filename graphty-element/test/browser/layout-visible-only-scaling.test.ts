/**
 * @file Counted-work scaling of a layout over only what the filter shows
 * (`behavior.layout.visibleOnly`): a filter change hands the engine the working graph's view
 * (`VisibilityApi.set`, then the relayout it sets off) and lays the shown nodes out again. A path of n and of 4n nodes, half
 * of them shown, and the elements the filter change and the layout it sets off visit may grow no
 * faster than the graph: 4x, never 16x. Counted, never timed.
 *
 * The render loop is stopped, so no frame steps the layout inside the count. Strict state is off,
 * as it is for a consumer.
 */

import { afterAll, assert, beforeAll, describe, it } from "vitest";

import { Graph, operationQueueOf } from "../../src/Graph";
import type { ElementSession } from "../../src/session/types";
import { assertScalesLinearly, visitsDuring } from "../helpers/cost";

/** The two graph sizes. */
const SIZES = [100, 400] as const;

describe("a layout over only what the filter shows", () => {
    const scope = globalThis as { __GRAPHTY_STRICT_STATE__?: boolean };
    let strict: boolean | undefined;

    beforeAll(() => {
        strict = scope.__GRAPHTY_STRICT_STATE__;
        scope.__GRAPHTY_STRICT_STATE__ = false;
    });

    afterAll(() => {
        scope.__GRAPHTY_STRICT_STATE__ = strict;
    });

    it("VisibilityApi.set, and the layout a filter change sets off: no more than linear in the graph", async () => {
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
                    const ids = Array.from({ length: size }, (_, index) => `n${String(index)}`);
                    graph.setLayoutBehavior({ layout: { visibleOnly: true } });
                    await graph.setLayout("circular", { dim: 2 });
                    await graph.addNodes(ids.map((id) => ({ id })));
                    await graph.addEdges(ids.slice(1).map((id, index) => ({ src: ids[index], dst: id })));
                    await operationQueueOf(graph).waitForCompletion();
                    const session = graph.getSession() as ElementSession;
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
                    const engine = graph.getLayoutManager().layoutEngine as unknown as {
                        hidesRow: (row: number) => boolean;
                    };
                    const rows = [...graph.getDataManager().nodes.values()].filter((node) =>
                        engine.hidesRow(node.index),
                    );
                    assert.strictEqual(rows.length, size / 2, "every hidden node is left out");
                    return visits;
                } finally {
                    graph.dispose();
                    container.remove();
                }
            },
            { sizes: SIZES, counter: "elements visited by a filter change under visibleOnly" },
        );
    });
});
