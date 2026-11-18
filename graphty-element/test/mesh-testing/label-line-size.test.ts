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

import { labelInternals, RichTextLabel } from "../../src/meshes/RichTextLabel";

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

describe("RichTextLabel size with a blank first line", () => {
    let scene: Scene;

    beforeEach(() => {
        scene = new Scene(new NullEngine());
    });

    afterEach(() => {
        scene.dispose();
    });

    test("a padded label that opens with a blank line is sized from its first line of words", () => {
        // A blank line has no height of its own, so sizing from it measured one line as the
        // padding alone and blew the label up to several times its height.
        const height = (text: string): number => {
            const mesh = RichTextLabel.createLabel(scene, { text, backgroundPadding: 8 }).labelMesh;
            assert.isNotNull(mesh);
            const box = mesh.getBoundingInfo().boundingBox;

            return box.maximum.y - box.minimum.y;
        };

        assert.closeTo(height("\nwords"), height("words"), 1e-9);
    });
});

describe("RichTextLabel size with an outline", () => {
    let scene: Scene;

    beforeEach(() => {
        scene = new Scene(new NullEngine());
    });

    afterEach(() => {
        scene.dispose();
    });

    /**
     * Build a label on a white panel with no margins and read its measured boxes.
     * @param outlineWidth - The outline's width in canvas pixels; 0 draws none.
     * @returns The words' box, the panel's box and the canvas, in canvas pixels, and the plane's height in the world.
     */
    const measured = (
        outlineWidth: number,
    ): {
        words: { width: number; height: number };
        panel: { x: number; y: number; width: number; height: number };
        canvas: { width: number; height: number };
        perPixel: number;
    } => {
        const label = RichTextLabel.createLabel(scene, {
            text: "XRCC2",
            fontSize: 48,
            backgroundColor: "white",
            backgroundPadding: 2,
            marginLeft: 0,
            marginRight: 0,
            marginTop: 0,
            marginBottom: 0,
            textOutline: outlineWidth > 0,
            textOutlineWidth: outlineWidth,
        });
        const mesh = label.labelMesh;
        assert.isNotNull(mesh);
        const box = mesh.getBoundingInfo().boundingBox;
        const { textSize, contentArea, actualDimensions } = labelInternals.drawn(label);

        return {
            words: { ...textSize },
            panel: { ...contentArea },
            canvas: { ...actualDimensions },
            perPixel: (box.maximum.y - box.minimum.y) / actualDimensions.height,
        };
    };

    test("an outline leaves the words' box and the background box as they are (#8746)", () => {
        // The outline was measured into the words' box on every side, so an outlined label's background was the
        // outline's width bigger all round than the words plus padding (14.1 px tall where vis-network draws 11.1).
        const none = measured(0);
        const outlined = measured(10);

        assert.deepEqual(outlined.words, none.words);
        assert.closeTo(outlined.panel.width, none.panel.width, 1e-9);
        assert.closeTo(outlined.panel.height, none.panel.height, 1e-9);
    });

    test("the canvas makes room round the panel for the outline past the padding, so it is not cut off", () => {
        const none = measured(0);
        const outlined = measured(10);

        // 10 px of outline past 2 px of padding reaches 8 px past the panel on every side
        assert.closeTo(outlined.canvas.width - none.canvas.width, 16, 1e-9);
        assert.closeTo(outlined.canvas.height - none.canvas.height, 16, 1e-9);
        assert.closeTo(outlined.panel.x, 8, 1e-9);
        assert.closeTo(outlined.panel.y, 8, 1e-9);
        // an outline within the padding needs no room
        assert.deepEqual(measured(2).canvas, none.canvas);
    });

    test("an outline grows the label around the letters instead of shrinking them", () => {
        // every canvas pixel is the same size in the world, outlined or not
        assert.closeTo(measured(10).perPixel, measured(0).perPixel, 1e-9);
        assert.closeTo(measured(20).perPixel, measured(0).perPixel, 1e-9);
    });
});

describe("RichTextLabel panel measured as Cytoscape.js measures it", () => {
    let scene: Scene;

    beforeEach(() => {
        scene = new Scene(new NullEngine());
    });

    afterEach(() => {
        scene.dispose();
    });

    /**
     * The panel's height, without the room round it, and its words' height.
     * @param more - The label's options past its words, size, line height and border.
     * @returns The two heights, in label units.
     */
    const heights = (more: Record<string, unknown>): { panel: number; words: number } => {
        const label = RichTextLabel.createLabel(scene, {
            text: "Label",
            fontSize: 48,
            lineHeight: 1,
            boxPadding: 0,
            borderWidth: 4,
            ...more,
        });
        const { actualDimensions, textSize, shadowMargin } = labelInternals.drawn(label);
        return { panel: actualDimensions.height - shadowMargin * 2, words: textSize.height };
    };

    test("a line one font size tall, with the border centered on the panel's edge, makes the panel a font size tall at the border's middle", () => {
        const { panel, words } = heights({ lineBox: "size", borderAlign: "center" });
        assert.closeTo(words, 48, 1e-9);
        // the border reaches half its width past the words' box on each side
        assert.closeTo(panel, 48 + 4, 1e-9);
    });

    test("unset, a line is its font box tall and the border lies wholly outside it", () => {
        const { panel, words } = heights({});
        assert.isAbove(words, 48);
        assert.closeTo(panel, words + 8, 1e-9);
    });
});
