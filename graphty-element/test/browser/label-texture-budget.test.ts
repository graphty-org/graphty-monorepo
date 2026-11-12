/**
 * @file A label drawn very large in the scene asks for no more texture than one drawn at the
 * texture budget's font size: the plane's size comes from the font size, so its texture need not.
 * A Pajek file whose 111 labels were about 1000 px fonts asked a 4096 x 1024 texture of every
 * label, gigabytes of GPU memory, and crashed the browser.
 */
import { type DynamicTexture, Engine, Scene, type StandardMaterial } from "@babylonjs/core";
import { afterEach, assert, beforeEach, describe, test } from "vitest";

import { RichTextLabel } from "../../src/meshes/RichTextLabel";

const TEXT = "207-555-8248";

/**
 * The canvas a label draws its texture from, which is what the GPU is handed.
 * @param label - The label.
 * @returns The canvas's size in pixels.
 */
function textureOf(label: RichTextLabel): { width: number; height: number } {
    const texture = (label.labelMesh?.material as StandardMaterial).diffuseTexture as DynamicTexture;
    const { canvas } = texture.getContext() as unknown as CanvasRenderingContext2D;
    return { width: canvas.width, height: canvas.height };
}

describe("a label's texture budget", () => {
    let engine: Engine;
    let scene: Scene;

    beforeEach(() => {
        // A real engine: a NullEngine's canvases are at most 512 pixels a side whatever is asked.
        engine = new Engine(document.createElement("canvas"), false);
        scene = new Scene(engine);
    });

    afterEach(() => {
        scene.dispose();
        engine.dispose();
    });

    test("a 1000 px font gets the texture of a 64 px font, and the same plane it always had", () => {
        const big = new RichTextLabel(scene, { text: TEXT, fontSize: 1000 });
        const capped = new RichTextLabel(scene, { text: TEXT, fontSize: 64 });
        const t = textureOf(big);
        const c = textureOf(capped);
        assert.isAtMost(t.width * t.height, 2 * c.width * c.height, `texture ${t.width}x${t.height}`);
        assert.isBelow(t.width, 4096);
        // The plane is one line's height (fontSize / 48) tall per line, whatever the texture.
        const plane = big.labelMesh?.getBoundingInfo().boundingBox.extendSize;
        assert.exists(plane);
        assert.closeTo((plane?.y ?? 0) * 2, 1000 / 48, 0.5);
        big.dispose();
        capped.dispose();
    });

    test("a label at an ordinary size keeps its full texture", () => {
        const label = new RichTextLabel(scene, { text: TEXT, fontSize: 24 });
        const larger = new RichTextLabel(scene, { text: TEXT, fontSize: 120 });
        assert.isAbove(textureOf(larger).width, textureOf(label).width);
        label.dispose();
        larger.dispose();
    });
});
