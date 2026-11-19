/**
 * @file A lone glow grows with its strength across the declared range, in 2D and in 3D.
 *
 * The glow layer used to clamp its spread at strength 1.25 and divide each glow's opacity by the
 * strongest one on screen, so a lone glow drew the same at 1.25, 2 and 4, and a stronger one only
 * got wider and fainter. Later the glow was blurred into 8-bit textures (an intensity above 1 cut
 * back to 1) by a blur that could not reach past its widest spacing, so 2 and 4 drew the same
 * picture at a normal zoom. This file draws one glowing node, a few dozen pixels across as in a
 * real graph, at 0.5, 1, 2 and 4 and sums what the glow adds outside the node: it must rise by a
 * fifth at every step, and each strength from 1 up must reach farther out than the one before.
 */

import { afterAll, assert, beforeAll, describe, it } from "vitest";

import { Graph, operationQueueOf } from "../../src/Graph";
import type { GraphSession } from "../../src/session";

const WIDTH = 480;
const HEIGHT = 360;
const STRENGTHS = [0.5, 1, 2, 4];
/** How much each step must add over the one before: a fifth more, a change a reader notices. */
const STEP_GROWTH = 1.2;
/** The summed channel change that counts a pixel as reached by the glow. */
const REACH_CHANGE = 6;
/**
 * How wide the glowing node is drawn, in pixels: the size of a node in a real graph. Framed far
 * out, a node a few pixels wide hid that the glow stopped growing past 2.
 */
const NODE_WIDTH = [20, 80] as const;

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
            // Two nodes apart frame the camera so each is drawn a few dozen pixels wide, as in a
            // real graph, with room on the canvas for one node's glow at every strength.
            await graph.addNodes([{ id: "a" }, { id: "b" }]);
            await graph.setLayout("circular", { scale: 0.05 });
            await operationQueueOf(graph).waitForCompletion();
            graph.zoomToFit();
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

        /**
         * How far out the glow reaches: the farthest pixel the glow changed outside every node,
         * measured from the middle of the changed pixels (the glowing node).
         * @param pixels - The glowing frame.
         * @param baseline - The frame with no glow.
         * @returns The distance, in pixels.
         */
        function glowReach(pixels: Uint8Array, baseline: Uint8Array): number {
            const width = graph.engine.getRenderWidth();
            const background = [baseline[0], baseline[1], baseline[2]];
            const changed: [number, number][] = [];
            for (let offset = 0; offset < baseline.length; offset += 4) {
                const isCanvas = [0, 1, 2].every((c) => Math.abs(baseline[offset + c] - background[c]) <= 2);
                const change = [0, 1, 2].reduce(
                    (sum, c) => sum + Math.abs(pixels[offset + c] - baseline[offset + c]),
                    0,
                );
                if (isCanvas && change > REACH_CHANGE) {
                    changed.push([(offset / 4) % width, Math.floor(offset / 4 / width)]);
                }
            }

            const cx = changed.reduce((sum, [x]) => sum + x, 0) / Math.max(1, changed.length);
            const cy = changed.reduce((sum, [, y]) => sum + y, 0) / Math.max(1, changed.length);
            return Math.max(0, ...changed.map(([x, y]) => Math.hypot(x - cx, y - cy)));
        }

        it("adds more glow outside the node at every step from 0.5 to 4", async () => {
            const baseline = await frame();
            const at = graph.nodeScreenPosition("a");
            assert.isDefined(at, "node a is drawn");
            const nodeWidth = at.bounds.right - at.bounds.left;
            assert.isTrue(
                nodeWidth >= NODE_WIDTH[0] && nodeWidth <= NODE_WIDTH[1],
                `each node is drawn ${String(NODE_WIDTH[0])} to ${String(NODE_WIDTH[1])} pixels wide: ${String(nodeWidth)}`,
            );
            const layer = await session.styles.add({
                name: "glow",
                target: "node",
                selector: { match: "ids", nodes: ["a"] },
                set: { "node.glow": "#ff00ff", "node.glowStrength": STRENGTHS[0] },
            });
            const sums: number[] = [];
            const reaches: number[] = [];
            for (const strength of STRENGTHS) {
                await session.styles.update(layer.id, {
                    set: { "node.glow": "#ff00ff", "node.glowStrength": strength },
                });
                const pixels = await frame();
                sums.push(glowOutside(pixels, baseline));
                reaches.push(glowReach(pixels, baseline));
            }

            await session.styles.remove(layer.id);

            assert.isAbove(sums[0], 0, "a glow of 0.5 draws something");
            for (let i = 1; i < sums.length; i++) {
                assert.isAbove(
                    sums[i],
                    sums[i - 1] * STEP_GROWTH,
                    `strength ${String(STRENGTHS[i])} adds a share a reader sees over ${String(STRENGTHS[i - 1])}: ${JSON.stringify(sums)}`,
                );
            }

            for (let i = STRENGTHS.indexOf(1) + 1; i < reaches.length; i++) {
                assert.isAbove(
                    reaches[i],
                    reaches[i - 1] * STEP_GROWTH,
                    `a glow of ${String(STRENGTHS[i])} reaches farther than ${String(STRENGTHS[i - 1])}: ${JSON.stringify(reaches)}`,
                );
            }
        });
    });
}
