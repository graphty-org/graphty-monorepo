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
     * @param options.wrapTrailingSpace - Whether the space after a word must fit too.
     * @param options.wrapEllipsis - Whether a line that does not fit is cut with an ellipsis.
     * @param options.wrapAnywhere - Whether a line may break between any two letters.
     * @param options.wrapSpaceCount - How many blanks a blank counts as.
     * @returns The plane's size.
     */
    function planeOf(options: {
        text: string;
        wrapWidth?: number;
        wrapTrailingSpace?: boolean;
        wrapEllipsis?: boolean;
        wrapAnywhere?: boolean;
        wrapSpaceCount?: number;
    }): {
        width: number;
        height: number;
    } {
        const label = new RichTextLabel(scene, { ...options, fontSize: 24, size: 1 });
        const mesh = label.labelMesh;
        assert.exists(mesh);
        mesh.computeWorldMatrix(true);
        const { minimumWorld: min, maximumWorld: max } = mesh.getBoundingInfo().boundingBox;
        const size = { width: max.x - min.x, height: max.y - min.y };
        label.dispose();
        return size;
    }

    /**
     * How much wider a label's plane is than its words.
     * @returns The margin, in the scene.
     */
    function margin(): number {
        return 2 * planeOf({ text: "aa" }).width - planeOf({ text: "aaaa" }).width;
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

    test("with wrapTrailingSpace, keeps a word only while a space after it fits too", () => {
        const one = planeOf({ text: "aa" });
        // just wide enough for two words, not for two words and a space: a plane is its words
        // plus a fixed margin, so the margin and a space's width come from three planes
        const two = planeOf({ text: "aa aa" }).width;
        const joined = planeOf({ text: "aaaa" }).width;
        const margin = 2 * one.width - joined;
        const space = two - joined;
        const wrapWidth = two - margin + space / 2;
        const height = (wrapTrailingSpace: boolean): number =>
            planeOf({ text: "aa aa aa aa", wrapWidth, wrapTrailingSpace }).height;
        assert.closeTo(height(false), planeOf({ text: "aa aa\naa aa" }).height, 1e-9);
        // a space after every word, the last one's too, as Cytoscape desktop measures
        assert.closeTo(height(true), planeOf({ text: "aa\naa\naa\naa" }).height, 1e-9);
    });

    test("with wrapTrailingSpace, keeps whole a line that fits without the space after its last word", () => {
        const one = planeOf({ text: "aa" });
        const two = planeOf({ text: "aa aa" }).width;
        const joined = planeOf({ text: "aaaa" }).width;
        const margin = 2 * one.width - joined;
        const space = two - joined;
        // wide enough for "aa aa", not for "aa aa " (cys-import-and-save "Decanoic Acid": 98.95 at a width of 100)
        const wrapWidth = two - margin + space / 2;
        const wrapped = planeOf({ text: "aa aa", wrapWidth, wrapTrailingSpace: true });
        assert.closeTo(wrapped.height, one.height, 1e-9);
    });

    test("with wrapEllipsis, cuts a long label to one line ending in an ellipsis", () => {
        const one = planeOf({ text: WORDS });
        const wrapWidth = planeOf({ text: "ionizing rad" }).width;
        const cut = planeOf({ text: WORDS, wrapWidth, wrapEllipsis: true });
        assert.closeTo(cut.height, one.height, 1e-9, "one line");
        // the width holds the words; a plane is its words plus a fixed margin
        assert.isAtMost(cut.width, wrapWidth + margin() + 1e-6, "no wider than the width");
        assert.isAbove(cut.width, wrapWidth * 0.75, "as many letters as fit");
        // a label that fits is drawn whole
        const fits = planeOf({ text: "short" });
        assert.closeTo(
            planeOf({ text: "short", wrapWidth: fits.width * 2, wrapEllipsis: true }).width,
            fits.width,
            1e-9,
        );
    });

    test("with wrapAnywhere, breaks a word wider than the width between its letters", () => {
        const word = planeOf({ text: "unbreakablewordlabel" });
        const one = planeOf({ text: "u" });
        const wrapWidth = word.width / 2;
        const broken = planeOf({ text: "unbreakablewordlabel", wrapWidth, wrapAnywhere: true });
        assert.isAtLeast(Math.round(broken.height / one.height), 2, "two lines or more");
        assert.isAtMost(broken.width, wrapWidth + margin() + 1e-6, "each no wider than the width");
        // without it, the word keeps a line of its own
        assert.closeTo(planeOf({ text: "unbreakablewordlabel", wrapWidth }).height, word.height, 1e-9);
    });

    test("with wrapSpaceCount, counts each blank between words that many times", () => {
        // wide enough for "aa aa" with half a blank to spare, not with two more blanks between the words: a plane is
        // its words plus a fixed margin, so the margin and a blank's width come from three planes
        const two = planeOf({ text: "aa aa" }).width;
        const joined = planeOf({ text: "aaaa" }).width;
        const wrapWidth = two - margin() + (two - joined) / 2;
        const height = (wrapSpaceCount?: number): number =>
            planeOf({ text: "aa aa", wrapWidth, wrapSpaceCount }).height;
        assert.closeTo(height(), planeOf({ text: "aa aa" }).height, 1e-9);
        assert.closeTo(height(3), planeOf({ text: "aa\naa" }).height, 1e-9);
    });
});
