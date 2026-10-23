/**
 * @file An effect written off on a top layer covers the effect a layer beneath writes.
 *
 * The glow takes `"none"` (`ChannelDescriptor.off`), which draws no glow whatever the layers
 * beneath wrote, as `LabelStyle.enabled: false` does for a label. Counted in pixels of the glow's
 * color, because the glow is drawn by an effect layer whose per-mesh colors no mesh reports.
 */

import { afterAll, assert, beforeAll, describe, it } from "vitest";

import { Graph, operationQueueOf } from "../../src/Graph";
import type { GraphSession } from "../../src/session";
import { nextFrame } from "../helpers/real-input";

const NODES = [{ id: "alpha" }, { id: "omega" }];

describe("an effect written off", () => {
    let container: HTMLElement;
    let graph: Graph;
    let session: GraphSession;

    beforeAll(async () => {
        container = document.createElement("div");
        container.style.width = "480px";
        container.style.height = "360px";
        document.body.appendChild(container);
        graph = new Graph(container);
        await graph.init();
        session = graph.getSession();

        await graph.addNodes(NODES);
        await graph.setLayout("circular", { scale: 0.3 });
        // Black nodes, so only a glow is magenta.
        await session.styles.add({
            name: "black nodes",
            target: "node",
            selector: { match: "everything" },
            set: { "node.color": "#000000" },
        });
        await operationQueueOf(graph).waitForCompletion();
    });

    afterAll(() => {
        graph.dispose();
        container.remove();
    });

    /**
     * How many pixels of the frame are tinted toward the glow's magenta: red and blue well above
     * green. The glow fades into the light canvas, so it is pink rather than full magenta.
     * @returns The count.
     */
    async function magentaPixels(): Promise<number> {
        await session.styles.settled();
        await graph.waitForStableFrame();
        // A few more frames let the glow's blur passes run on what is drawn.
        for (let i = 0; i < 4; i++) {
            graph.scene.render();
            await nextFrame();
        }
        const { engine } = graph;
        const pixels = (await engine.readPixels(
            0,
            0,
            engine.getRenderWidth(),
            engine.getRenderHeight(),
        )) as unknown as Uint8Array;
        let count = 0;
        for (let o = 0; o < pixels.length; o += 4) {
            if (pixels[o] - pixels[o + 1] > 30 && pixels[o + 2] - pixels[o + 1] > 30) {
                count++;
            }
        }

        return count;
    }

    it("hides a glow a layer beneath writes, and the glow comes back when the off layer goes", async () => {
        const before = await magentaPixels();

        await session.styles.add({
            name: "glow",
            target: "node",
            selector: { match: "everything" },
            set: { "node.glow": "#ff00ff" },
        });
        const glowing = await magentaPixels();
        assert.isAbove(glowing, before + 100, "the glow beneath is drawn");

        const off = await session.styles.add({
            name: "no glow",
            target: "node",
            selector: { match: "everything" },
            set: { "node.glow": "none" },
        });
        const covered = await magentaPixels();
        assert.isAtMost(covered, before, "the glow written off draws no magenta");

        await session.styles.remove(off.id);
        assert.isAbove(await magentaPixels(), before + 100, "removing the off layer shows the glow again");
    });
});
