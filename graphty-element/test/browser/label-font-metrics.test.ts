/**
 * @file A label's panel fits its text in any typeface, checked against the texture's pixels.
 *
 * The panel used to be sized from `fontSize * lineHeight` whatever the font, and the text was
 * drawn from the top of the em square. A font whose accents rise above the em square drew them
 * into the top margin (or off the panel when the margin was small), and every font left a
 * different amount of slack under the descenders. The same `labelStyle` therefore looked
 * different on every machine that resolved a different font.
 *
 * Each case draws the same string -- an accented capital for the tallest ink and four
 * descenders for the deepest -- in a font with very different vertical metrics, reads the
 * label's texture canvas, and checks that the ink stays inside the rectangle `textBounds`
 * reports, which is the panel minus the requested margins. Only the vertical edges are checked:
 * the width still comes from the advance width, and a script face such as Z003 draws its last
 * swash past the advance, which is a separate horizontal defect.
 */

import { type DynamicTexture, NullEngine, Scene, type StandardMaterial } from "@babylonjs/core";
import { afterEach, assert, beforeEach, describe, test } from "vitest";

import { RichTextLabel } from "../../src/meshes/RichTextLabel";

/** Tallest ink (an accented capital) and deepest ink (descenders) in one line. */
const TEXT = "\u00c9gjpq";

/**
 * Fonts with very different vertical metrics. A family missing on the machine resolves to the
 * default font, which only makes that case a repeat of another; it cannot make the test pass
 * when the layout is wrong.
 */
const FONTS = ["DejaVu Sans", "Liberation Serif", "monospace", "Z003", "serif"];

/** The margin asked for on every side, in label pixels. */
const MARGIN = 3;

interface InkBox {
    top: number;
    bottom: number;
}

/**
 * The bounding box of the dark pixels on the texture, as fractions of its size.
 * @param label - The label whose texture is read.
 * @returns The ink rectangle as fractions of the texture.
 */
function inkBounds(label: RichTextLabel): InkBox {
    const material = label.labelMesh?.material as StandardMaterial | null | undefined;
    const texture = material?.diffuseTexture as DynamicTexture | null | undefined;
    assert.exists(texture, "the label has a texture");
    const { width, height } = texture.getSize();
    const ctx = texture.getContext() as unknown as CanvasRenderingContext2D;
    const { data } = ctx.getImageData(0, 0, width, height);

    let top = height;
    let bottom = -1;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 4;
            if (data[i] < 128 && data[i + 1] < 128 && data[i + 2] < 128 && data[i + 3] > 128) {
                top = Math.min(top, y);
                bottom = Math.max(bottom, y + 1);
            }
        }
    }

    assert.isAbove(bottom, top, "some ink was drawn");
    return { top: top / height, bottom: bottom / height };
}

describe("a label's panel is sized from the font's own metrics", () => {
    let scene: Scene;

    beforeEach(() => {
        scene = new Scene(new NullEngine());
    });

    afterEach(() => {
        scene.dispose();
    });

    for (const font of FONTS) {
        test(`the ink of "${TEXT}" in ${font} stays inside the requested margins`, () => {
            const label = new RichTextLabel(scene, {
                text: TEXT,
                font,
                fontSize: 48,
                textColor: "black",
                backgroundColor: "white",
                marginTop: MARGIN,
                marginBottom: MARGIN,
                marginLeft: MARGIN,
                marginRight: MARGIN,
            });

            const ink = inkBounds(label);
            const text = label.textBounds;
            // One texture pixel of slack for antialiasing at the edge of a glyph.
            const { height } = (
                (label.labelMesh?.material as StandardMaterial).diffuseTexture as DynamicTexture
            ).getSize();
            const px = 1 / height;

            assert.isAtLeast(ink.top, text.top - px, `ink top ${ink.top} is inside the top margin ${text.top}`);
            assert.isAtMost(
                ink.bottom,
                text.bottom + px,
                `ink bottom ${ink.bottom} is inside the bottom margin ${text.bottom}`,
            );

            // The text is centred in its line box: the slack above the ink and the slack below it
            // differ by less than a tenth of the panel, rather than all of it sitting below.
            const above = ink.top - text.top;
            const below = text.bottom - ink.bottom;
            assert.isBelow(Math.abs(above - below), 0.1, `slack above ${above} and below ${below} are balanced`);

            label.dispose();
        });
    }
});
