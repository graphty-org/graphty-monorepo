/**
 * @file Glyph labels: `layoutBehavior.labels.labelText: "glyphs"` draws every plain node label from
 * one glyph atlas in one instanced draw, and any other label as before (design/rendering/
 * row-renderer.md section 4.7, issue #3252).
 *
 * What is counted is the work: how many label textures the scene holds, how many glyph draws there
 * are, and how many glyph quads the one draw holds.
 */

import "../../src/graphty-element";

import type { Mesh } from "@babylonjs/core";
import { afterEach, assert, describe, it } from "vitest";

import { Graph, operationQueueOf } from "../../src/Graph";
import { GLYPH_DRAW_NAME } from "../../src/meshes/GlyphLabels";
import { nextFrame } from "../helpers/real-input";

const SIDE = 10;
const COUNT = SIDE * SIDE;
const WORDS = "LABEL";

function grid(): { id: string; position: { x: number; y: number; z: number } }[] {
    const nodes = [];
    for (let i = 0; i < SIDE; i++) {
        for (let j = 0; j < SIDE; j++) {
            nodes.push({ id: `n${String(i)}_${String(j)}`, position: { x: (i - 5) * 0.6, y: (j - 5) * 0.6, z: 0 } });
        }
    }
    return nodes;
}

describe("glyph labels", () => {
    let container: HTMLElement | undefined;
    let graph: Graph | undefined;

    afterEach(() => {
        graph?.dispose();
        container?.remove();
    });

    async function draw(labelText?: "canvas" | "glyphs", odd?: string): Promise<Graph> {
        container = document.createElement("div");
        container.style.width = "640px";
        container.style.height = "480px";
        document.body.appendChild(container);
        const g = new Graph(container);
        graph = g;
        await g.init();
        g.setLayoutBehavior({ labels: labelText === undefined ? {} : { labelText } });
        await g.addNodes(grid());
        await g.setLayout("fixed", { dim: 3 });
        await operationQueueOf(g).waitForCompletion();
        await g.setCameraState({ position: { x: 0, y: 0, z: -12 }, target: { x: 0, y: 0, z: 0 } });
        await g.getSession().styles.add({
            name: "labels",
            target: "node",
            selector: { match: "everything" },
            set: { "node.label": WORDS },
        });
        if (odd !== undefined) {
            await g.getSession().styles.add({
                name: "odd",
                target: "node",
                selector: { match: "ids", nodes: ["n0_0"] },
                set: { "node.label": odd },
            });
        }
        await operationQueueOf(g).waitForCompletion();
        for (let at = 0; at < 4; at++) {
            g.scene.render();
            await nextFrame();
        }
        await g.waitForStableFrame();
        return g;
    }

    function labelTextures(g: Graph): number {
        return g.scene.textures.filter((t) => t.name.startsWith("richTextTexture_")).length;
    }

    function glyphDraws(g: Graph): number {
        return g.scene.meshes.filter((m) => m.name === GLYPH_DRAW_NAME).length;
    }

    it("off, the default, draws every label on its own canvas and makes no glyph draw", async () => {
        const g = await draw();

        assert.strictEqual(labelTextures(g), COUNT);
        assert.strictEqual(glyphDraws(g), 0);
    });

    it("on, draws every plain label in one draw, one quad per glyph, with no label texture", async () => {
        const g = await draw("glyphs");

        assert.strictEqual(labelTextures(g), 0);
        assert.strictEqual(glyphDraws(g), 1);
        const mesh = g.scene.getMeshByName(GLYPH_DRAW_NAME) as Mesh | null;
        assert.strictEqual(mesh?.thinInstanceCount, COUNT * WORDS.length);
        assert.strictEqual(g.getNode("n3_3")?.label?.drawnBy, "glyphs");
    });

    it("on, a label the atlas cannot draw falls back to its own canvas, alone", async () => {
        const g = await draw("glyphs", "مرحبا");

        assert.strictEqual(labelTextures(g), 1);
        assert.strictEqual(g.getNode("n0_0")?.label?.drawnBy, "canvas");
        const mesh = g.scene.getMeshByName(GLYPH_DRAW_NAME) as Mesh | null;
        assert.strictEqual(mesh?.thinInstanceCount, (COUNT - 1) * WORDS.length);
    });
});
