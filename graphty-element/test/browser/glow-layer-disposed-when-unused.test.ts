/**
 * @file The glow layer is disposed once no node on screen glows, and comes back when one does.
 *
 * A GlowLayer is a full-screen post-process: a render target, a blur and a merge every frame.
 * It used to outlive the last glowing node for the life of the scene. `node.glow` is a mesh
 * channel, so a node that stops glowing moves to another cached source mesh, and the old glowing
 * source stayed in the layer's inclusion list with no instances. The list never emptied, so the
 * layer kept rendering nothing at full cost every frame.
 */

import type { GlowLayer } from "@babylonjs/core";
import { afterAll, assert, beforeAll, describe, it } from "vitest";

import { Graph } from "../../src/Graph";
import type { GraphSession } from "../../src/session";

const WIDTH = 320;
const HEIGHT = 240;
const FRAMES = 8;
const FRAME_MS = 10;

describe("glow layer when no node glows", () => {
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
        session = graph.getSession();

        await graph.addNodes([{ id: "a" }, { id: "b" }]);
        await graph.setLayout("circular", { scale: 0.2 });
        await graph.operationQueue.waitForCompletion();
    }, 60000);

    afterAll(() => {
        graph.dispose();
        container.remove();
    });

    async function frame(): Promise<Uint8Array> {
        await graph.operationQueue.waitForCompletion();

        for (let at = 0; at < FRAMES; at++) {
            graph.scene.render();
            await new Promise<void>((done) => {
                setTimeout(done, FRAME_MS);
            });
        }

        const { engine } = graph;

        return (await engine.readPixels(
            0,
            0,
            engine.getRenderWidth(),
            engine.getRenderHeight(),
        )) as unknown as Uint8Array;
    }

    function glowLayers(): GlowLayer[] {
        return graph.scene.effectLayers.filter((layer) => layer.getClassName() === "GlowLayer") as GlowLayer[];
    }

    function changedPixels(a: Uint8Array, b: Uint8Array): number {
        let changed = 0;
        for (let i = 0; i < a.length; i += 4) {
            if (a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2]) {
                changed++;
            }
        }

        return changed;
    }

    async function addGlow(): Promise<string> {
        const layer = await session.styles.add({
            name: "glow",
            target: "node",
            selector: { match: "ids", nodes: ["a", "b"] },
            set: { "node.glow": "#ff00ff" },
        });

        return layer.id;
    }

    it("disposes the layer when the last glow is removed and recreates it when glow returns", async () => {
        const baseline = await frame();
        assert.lengthOf(glowLayers(), 0, "no glow layer before anything glows");

        const first = await addGlow();
        await frame();
        assert.lengthOf(glowLayers(), 1, "glowing nodes create one glow layer");

        await session.styles.remove(first);
        await frame();
        assert.lengthOf(
            glowLayers(),
            0,
            "With no node glowing, the glow layer must be disposed rather than rendering nothing every frame",
        );
        assert.isUndefined(graph.scene.metadata?.glowLayer, "the cached layer is forgotten with it");

        await addGlow();
        const glowing = await frame();
        const layers = glowLayers();
        assert.lengthOf(layers, 1, "glow coming back recreates the layer");
        assert.isTrue(layers[0].shouldRender(), "the recreated layer renders");
        assert.isAbove(changedPixels(baseline, glowing), 0, "the recreated layer draws glow");
    });
});
