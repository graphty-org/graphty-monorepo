/**
 * @file A lone glow grows with its strength across the declared range, in 2D and in 3D.
 *
 * The glow layer used to clamp its spread at strength 1.25 and divide each glow's opacity by the
 * strongest one on screen, so a lone glow drew the same at 1.25, 2 and 4, and a stronger one only
 * got wider and fainter. This file draws one glowing node at 0.5, 1, 2 and 4 and sums what the
 * glow adds outside the node: it must rise at every step.
 */

import { afterAll, assert, beforeAll, describe, it } from "vitest";

import { Graph, operationQueueOf } from "../../src/Graph";
import type { GraphSession } from "../../src/session";

const WIDTH = 480;
const HEIGHT = 360;
const STRENGTHS = [0.5, 1, 2, 4];

for (const view of ["2d", "3d"] as const) {
    describe(`glow strength range (${view})`, () => {
        let container: HTMLElement;
        let graph: Graph;
        let session: GraphSession;

        beforeAll(async () => {
            container = document.createElement("div");
            container.style.width = `${String(WIDTH)}px`;
            container.style.height = `${String(HEIGHT)}px`;
            document.body.appendChild(container);
            graph = new Graph(container);
            await graph.init();
            await graph.setViewMode(view);
            session = graph.getSession();
            // Three nodes in a circle frame the camera far enough out that one node's glow fits
            // on the canvas at every strength.
            await graph.addNodes([{ id: "a" }, { id: "b" }, { id: "c" }]);
            await graph.setLayout("circular", { scale: 1 });
            await operationQueueOf(graph).waitForCompletion();
        });

        afterAll(() => {
            graph.dispose();
            container.remove();
        });

        async function frame(): Promise<Uint8Array> {
            // The glow is composed only once its layer's shaders are ready; the stable-frame wait
            // covers that and any pending style work.
            await graph.waitForStableFrame();
            const { engine } = graph;

            return (await engine.readPixels(
                0,
                0,
                engine.getRenderWidth(),
                engine.getRenderHeight(),
            )) as unknown as Uint8Array;
        }

        /**
         * What the glow adds outside every node: the per-channel change from the frame with no
         * glow, summed over pixels where that frame shows only the canvas.
         * @param pixels - The glowing frame.
         * @param baseline - The frame with no glow.
         * @returns The summed change.
         */
        function glowOutside(pixels: Uint8Array, baseline: Uint8Array): number {
            const background = [baseline[0], baseline[1], baseline[2]];
            let total = 0;
            for (let offset = 0; offset < baseline.length; offset += 4) {
                const isCanvas = [0, 1, 2].every((c) => Math.abs(baseline[offset + c] - background[c]) <= 2);
                if (!isCanvas) {
                    continue;
                }

                for (let c = 0; c < 3; c++) {
                    total += Math.abs(pixels[offset + c] - baseline[offset + c]);
                }
            }

            return total;
        }

        it("adds more glow outside the node at every step from 0.5 to 4", async () => {
            const baseline = await frame();
            const layer = await session.styles.add({
                name: "glow",
                target: "node",
                selector: { match: "ids", nodes: ["a"] },
                set: { "node.glow": "#ff00ff", "node.glowStrength": STRENGTHS[0] },
            });
            const sums: number[] = [];
            for (const strength of STRENGTHS) {
                await session.styles.update(layer.id, {
                    set: { "node.glow": "#ff00ff", "node.glowStrength": strength },
                });
                sums.push(glowOutside(await frame(), baseline));
            }

            await session.styles.remove(layer.id);

            assert.isAbove(sums[0], 0, "a glow of 0.5 draws something");
            for (let i = 1; i < sums.length; i++) {
                assert.isAbove(
                    sums[i],
                    sums[i - 1],
                    `strength ${String(STRENGTHS[i])} adds more than ${String(STRENGTHS[i - 1])}: ${JSON.stringify(sums)}`,
                );
            }
        });
    });
}
