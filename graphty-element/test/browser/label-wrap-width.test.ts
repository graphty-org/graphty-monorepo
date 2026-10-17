/**
 * @file A label with a wrap width breaks its words onto as many lines as that width needs, and no
 * line is drawn wider than it unless one word alone is. Read off the label's plane in the scene.
 */

import { NullEngine, Scene } from "@babylonjs/core";
import { afterEach, assert, beforeEach, describe, test } from "vitest";

import { RichTextLabel } from "../../src/meshes/RichTextLabel";

const WORDS = "ionizing radiation and dna damage response";

describe("a label's wrap width", () => {
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
     * The width and height a label's plane is drawn at in the scene.
     * @param options - What the label draws.
     * @param options.text - Its words.
     * @param options.wrapWidth - Its wrap width, or none.
     * @returns The plane's size.
     */
    function planeOf(options: { text: string; wrapWidth?: number }): { width: number; height: number } {
        const label = new RichTextLabel(scene, { ...options, fontSize: 24, size: 1 });
        const mesh = label.labelMesh;
        assert.exists(mesh);
        mesh.computeWorldMatrix(true);
        const { minimumWorld: min, maximumWorld: max } = mesh.getBoundingInfo().boundingBox;
        const size = { width: max.x - min.x, height: max.y - min.y };
        label.dispose();
        return size;
    }

    test("breaks a long label onto more lines, each no wider than the width", () => {
        const one = planeOf({ text: WORDS });
        const wrapped = planeOf({ text: WORDS, wrapWidth: one.width / 3 });
        assert.isAtLeast(Math.round(wrapped.height / one.height), 3, "three lines or more");
        assert.isAtMost(wrapped.width, one.width / 3 + 1e-6, "no line is wider than the wrap width");
    });

    test("leaves a label that fits on one line", () => {
        const one = planeOf({ text: "short" });
        const wrapped = planeOf({ text: "short", wrapWidth: one.width * 2 });
        assert.closeTo(wrapped.height, one.height, 1e-9);
        assert.closeTo(wrapped.width, one.width, 1e-9);
    });

    test("keeps a word wider than the width on a line of its own", () => {
        const one = planeOf({ text: "a supercalifragilistic b" });
        const word = planeOf({ text: "supercalifragilistic" });
        const wrapped = planeOf({ text: "a supercalifragilistic b", wrapWidth: word.width / 2 });
        assert.strictEqual(Math.round(wrapped.height / one.height), 3);
        assert.closeTo(wrapped.width, word.width, word.width * 0.02);
    });
});
