/**
 * @file A label's words are rasterised on the CPU, so the same label draws the same pixels on
 * every load.
 *
 * THE DEFECT. A label's texture is a 2D canvas. Chromium draws an ordinary 2D canvas on the GPU,
 * and on a software GPU (SwiftShader, which is what headless browsers and visual-review services
 * render with) the antialiased edge of large text comes out one alpha level different at a few
 * dozen scattered pixels from one page load to the next -- with the same words, font, size,
 * transform and draw order. Minified onto the screen that is one to three pixels one colour level
 * apart, and `Styles/Label: Declutter` was reported changed on nearly every Chromatic build
 * because of it. The same canvas rasterised on the CPU is identical on every load.
 *
 * WHAT IS MEASURED. Chromium keeps a 2D canvas on the CPU when its context is created with
 * `willReadFrequently`, and a canvas has one context for life, so the attribute the label's
 * context reports is the switch.
 */

import { NullEngine, Scene } from "@babylonjs/core";
import { assert, test } from "vitest";

import { RichTextLabel } from "../../src/meshes/RichTextLabel";

test("a label's texture is drawn on a CPU-rasterised canvas", () => {
    const scene = new Scene(new NullEngine());
    const label = new RichTextLabel(scene, { text: "Mrs_Henderson", fontSize: 128 });

    const material = label.labelMesh?.material as { diffuseTexture?: { getContext(): CanvasRenderingContext2D } };
    const context = material.diffuseTexture?.getContext();

    assert.exists(context, "the label has no canvas texture");
    assert.isTrue(context?.getContextAttributes().willReadFrequently, "the label's canvas is GPU-rasterised");

    label.dispose();
    scene.dispose();
});
