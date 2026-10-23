/**
 * @file A label with a letter size draws its letters that tall in the scene whatever its canvas
 * size or its font's own line height, and wraps at a width measured against those letters.
 */

import { NullEngine, Scene } from "@babylonjs/core";
import { afterEach, assert, beforeEach, describe, test } from "vitest";

import { RichTextLabel } from "../../src/meshes/RichTextLabel";

describe("a label's letter size", () => {
    let engine: NullEngine;
    let scene: Scene;

    beforeEach(() => {
        engine = new NullEngine();
        scene = new Scene(engine);
    });

    afterEach(() => {
        scene.dispose();
        engine.dispose();
    });

    /**
     * How wide and tall a label's words are drawn in the scene.
     * @param options - What the label draws.
     * @returns The words' width and height in scene units.
     */
    function wordsOf(options: {
        text: string;
        fontSize: number;
        font?: string;
        letterSize: number;
        wrapWidth?: number;
    }): {
        width: number;
        height: number;
    } {
        const label = new RichTextLabel(scene, options);
        const mesh = label.labelMesh;
        assert.exists(mesh);
        mesh.computeWorldMatrix(true);
        const { minimumWorld: min, maximumWorld: max } = mesh.getBoundingInfo().boundingBox;
        const t = label.textBounds;
        const size = { width: (max.x - min.x) * (t.right - t.left), height: (max.y - min.y) * (t.bottom - t.top) };
        label.dispose();
        return size;
    }

    test("draws the same words the same size in the scene at any canvas size", () => {
        // the canvas is whole pixels, so a small canvas rounds its words by up to a pixel
        const small = wordsOf({ text: "Hamburg", fontSize: 48, letterSize: 2 });
        const large = wordsOf({ text: "Hamburg", fontSize: 96, letterSize: 2 });
        assert.closeTo(large.width, small.width, small.width * 0.02);
        assert.closeTo(large.height, small.height, small.height * 0.02);
    });

    test("draws the letters an em of letterSize, so the words are as wide as the font says at that em", () => {
        const at = (font: string): number => wordsOf({ text: "Hamburg", fontSize: 48, font, letterSize: 1 }).width;
        const ctx = document.createElement("canvas").getContext("2d");
        assert.isNotNull(ctx);
        for (const font of ["serif", "monospace"]) {
            ctx.font = `normal normal 100px ${font}`;
            assert.closeTo(at(font), ctx.measureText("Hamburg").width / 100, 0.02, font);
        }
    });

    test("wraps at a width measured against its letters", () => {
        const one = wordsOf({ text: "aa", fontSize: 48, letterSize: 1 });
        const two = wordsOf({ text: "aa aa", fontSize: 48, letterSize: 1, wrapWidth: one.width * 1.5 });
        assert.closeTo(two.height, 2 * one.height, one.height * 0.05);
    });
});
