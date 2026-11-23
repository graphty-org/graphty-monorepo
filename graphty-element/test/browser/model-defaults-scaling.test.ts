/**
 * @file Counted-work scaling of a change to a model's own settings (`session.assets.setDefaults`)
 * on a graph whose every node draws that model: the change repaints the graph once, so the elements
 * it visits (Map, Set and Array iterator steps and array scans, see `visitsDuring`) may grow with
 * the node count but never with its square. Counted, never timed (issue #1643).
 *
 * The render loop is stopped once the model is drawn, so no frame runs while the call is counted,
 * and strict state is off, as it is for a consumer (see `data-path-scaling.test.ts`).
 */
import "../../src/graphty-element";

import { afterAll, assert, beforeAll, describe, it } from "vitest";

import { operationQueueOf } from "../../src/Graph";
import { dispatcherOf } from "../../src/session/GraphSession";
import { assertScalesLinearly, visitsDuring } from "../helpers/cost";
import { mountElement, unmountElements } from "../helpers/mount-element";
import { drawModel } from "./models/helpers";

/** The two graph sizes: big enough that a per-node cost that grows with the graph is 16x. */
const SIZES = [50, 200] as const;

describe("changing a model's own settings repaints the graph once", () => {
    const scope = globalThis as { __GRAPHTY_STRICT_STATE__?: boolean };
    let strict: boolean | undefined;

    beforeAll(() => {
        strict = scope.__GRAPHTY_STRICT_STATE__;
        scope.__GRAPHTY_STRICT_STATE__ = false;
    });

    afterAll(() => {
        scope.__GRAPHTY_STRICT_STATE__ = strict;
    });

    it("AssetsApi.setDefaults: linear in the nodes drawing the model", async () => {
        await assertScalesLinearly(
            async (size) => {
                const element = await mountElement();
                try {
                    const { graph } = element;
                    const nodes = Array.from({ length: size }, (_, at) => ({ id: `n${String(at)}`, x: at }));
                    const { asset } = await drawModel(element, "gltf-textured", nodes);
                    graph.engine.stopRenderLoop();
                    const visits = await visitsDuring(async () => {
                        await element.session.assets.setDefaults(asset, { hiddenTextures: ["cube.png"] });
                        await operationQueueOf(graph).waitForCompletion();
                        await dispatcherOf(graph.getSession()).lane.settled();
                        // The frame that puts the new paints on the meshes is part of the change.
                        graph.update();
                    });

                    const painter = graph.getStylePainter();
                    for (const node of graph.getDataManager().nodes.values()) {
                        assert.include(
                            String(painter.nodePaint(node.index)?.meshKey),
                            "|md",
                            "every node is painted with the model's settings",
                        );
                    }

                    return visits;
                } finally {
                    unmountElements();
                }
            },
            { sizes: SIZES, counter: "elements visited by AssetsApi.setDefaults" },
        );
    });
});
