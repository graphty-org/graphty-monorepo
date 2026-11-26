/**
 * @file The Fiber edge shader draws on an ordinary thin line: a line a few pixels wide fades to the glass's average
 * color, and that average is glass (pale on a light canvas, dark lit glass on a dark one), never the line's own color,
 * so picking Fiber for a default gray edge changes the picture a reader sees, pixel by pixel.
 */
import { afterEach, assert, beforeEach, describe, it, vi } from "vitest";

import type { Graph } from "../../src/Graph";
import type { GraphSession } from "../../src/session";
import { mountProbeGraph } from "../helpers/channel-paints";

/** A pixel a reader sees change: one of its channels moves by more than this. */
const VISIBLE = 30;

/**
 * The final picture's pixels.
 * @param graph - The graph.
 * @returns RGBA bytes.
 */
async function pixels(graph: Graph): Promise<Uint8Array> {
    await graph.waitForStableFrame();
    graph.scene.render();
    const { engine } = graph;
    return (await engine.readPixels(0, 0, engine.getRenderWidth(), engine.getRenderHeight())) as unknown as Uint8Array;
}

for (const view of ["2d", "3d"] as const) {
    describe(`the Fiber shader on a thin grey line, ${view}`, () => {
        let container: HTMLElement;
        let graph: Graph;
        let session: GraphSession;

        beforeEach(async () => {
            ({ container, graph, session } = await mountProbeGraph(view));
        });

        afterEach(() => {
            graph.dispose();
            container.remove();
        });

        it("changes pixels a reader sees", async () => {
            // The graphty app's default edge: darkgray at width 8, a line a few pixels wide on screen.
            const line = { "edge.color": "#A9A9A9", "edge.width": 8 };
            await session.styles.add({ name: "line", target: "edge", selector: { match: "everything" }, set: line });
            const plain = await pixels(graph);
            await session.styles.add({
                name: "fiber",
                target: "edge",
                selector: { match: "everything" },
                set: { "edge.shaders": [{ shader: "fiber-optic" }] },
            });
            // Until the shader has compiled the line is drawn as the layers beneath paint it.
            await vi.waitFor(() => {
                assert.strictEqual(session.shaders.status("fiber-optic").state, "ready");
            });
            await vi.waitFor(() => {
                assert.isTrue(graph.scene.meshes.some((mesh) => mesh.name.startsWith("edge-surface|fiber-optic")));
            });
            const fiber = await pixels(graph);
            let seen = 0;
            for (let at = 0; at < plain.length; at += 4) {
                const moved = [0, 1, 2].some((c) => Math.abs(plain[at + c] - fiber[at + c]) > VISIBLE);
                seen += moved ? 1 : 0;
            }
            assert.isAbove(seen, 20, `${String(seen)} pixels moved by more than ${String(VISIBLE)}`);
        });
    });
}
