/**
 * More lines, or wider line spacing, make a label taller -- not its letters smaller.
 *
 * The label plane used to be a fixed `sizePx / 48` world units tall whatever was drawn on it, so
 * a three-line label squeezed its canvas into the height of one line and drew its letters at a
 * third of the size, and a line height of 2.5 shrank the letters instead of spreading the lines.
 * The world size of one canvas pixel now depends only on the font, so the letters of every label
 * in one style are the same size.
 */

import { NullEngine, Scene } from "@babylonjs/core";
import { afterEach, assert, beforeEach, describe, test } from "vitest";

import { RichTextLabel } from "../../src/meshes/RichTextLabel";

describe("RichTextLabel size with several lines", () => {
    let scene: Scene;

    beforeEach(() => {
        scene = new Scene(new NullEngine());
    });

    afterEach(() => {
        scene.dispose();
    });

    /**
     * Build a label and read how tall its plane is in the world.
     * @param text - The words.
     * @param lineHeight - The line height.
     * @returns The plane's height in world units.
     */
    const planeHeight = (text: string, lineHeight = 1.2): number => {
        const mesh = RichTextLabel.createLabel(scene, { text, lineHeight }).labelMesh;
        assert.isNotNull(mesh);
        const box = mesh.getBoundingInfo().boundingBox;

        return box.maximum.y - box.minimum.y;
    };

    test("a single line at the default line height keeps its size", () => {
        assert.closeTo(planeHeight("one"), 1, 1e-9);
    });

    test("three lines make the plane taller, so each line is as tall as a single-line label", () => {
        const one = planeHeight("one");
        const three = planeHeight("one\ntwo\nthree");

        assert.isAbove(three, one * 2.5);
    });

    test("a wider line height spreads the lines rather than shrinking them", () => {
        assert.isAbove(planeHeight("one\ntwo\nthree", 2.5), planeHeight("one\ntwo\nthree") * 1.5);
    });
});
