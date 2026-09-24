/**
 * Label Golden Master Tests - Core Features
 *
 * Re-pointed at the real RichTextLabel. The values asserted are the ones the retired mock
 * asserted; only the route to them has changed.
 */

import { StandardMaterial } from "@babylonjs/core";
import { afterEach, assert, beforeEach, describe, test } from "vitest";

import { type AttachPosition, RichTextLabel, type RichTextLabelOptions } from "../../src/meshes/RichTextLabel";
import { createMeshScene, drawnText, drawOps, type MeshTestScene, resetRecordedCanvases } from "./real-mesh-harness";

const ATTACH_POSITIONS: AttachPosition[] = [
    "top",
    "bottom",
    "left",
    "right",
    "center",
    "top-left",
    "top-right",
    "bottom-left",
    "bottom-right",
];

let ctx: MeshTestScene;

interface Built {
    label: RichTextLabel;
    material: StandardMaterial;
    textureWidth: number;
    textureHeight: number;
    planeWidth: number;
    planeHeight: number;
}

function build(options: RichTextLabelOptions): Built {
    resetRecordedCanvases();
    const label = RichTextLabel.createLabel(ctx.scene, options);
    const mesh = label.labelMesh;
    assert.isNotNull(mesh, "RichTextLabel produced no mesh");
    const material = mesh.material as StandardMaterial;
    const size = material.diffuseTexture?.getSize() ?? { width: 0, height: 0 };
    const { extendSize } = mesh.getBoundingInfo().boundingBox;

    return {
        label,
        material,
        textureWidth: size.width,
        textureHeight: size.height,
        planeWidth: extendSize.x * 2,
        planeHeight: extendSize.y * 2,
    };
}

describe("Label Golden Masters - Core Features", () => {
    beforeEach(() => {
        ctx = createMeshScene();
    });

    afterEach(() => {
        ctx.dispose();
    });

    describe("Text Rendering", () => {
        test("creates basic text label", () => {
            const built = build({ text: "Hello World", font: "Verdana", fontSize: 48, textColor: "#000000" });

            assert.deepEqual(drawnText(), ["Hello World"]);
            assert.include(drawOps("fillText")[0].state.font, "Verdana");
            assert.include(drawOps("fillText")[0].state.font, "48px");
            assert.equal(built.label.labelMesh?.billboardMode, 7);
        });

        test("empty text draws nothing at all", () => {
            // The parser emits no segment for an empty line, so the renderer has nothing to draw.
            // The retired mock asserted `metadata.text === ""`, which told you only that the value
            // had been copied onto a fake mesh -- it could not tell an empty label from a blank one.
            build({ text: "", fontSize: 24 });

            assert.lengthOf(drawnText(), 0);
            assert.isAtLeast(drawOps("clearRect").length, 1, "the texture is still cleared");
        });

        test("uses Label as the default text", () => {
            build({});

            assert.deepEqual(drawnText(), ["Label"]);
        });

        test("handles various text lengths", () => {
            const texts = [
                "A",
                "Short",
                "Medium length text",
                "This is a very long text that should still render properly in the label system",
            ];

            texts.forEach((text) => {
                build({ text, fontSize: 36 });
                assert.deepEqual(drawnText(), [text]);
            });
        });
    });

    describe("Font Properties", () => {
        const fonts = ["Verdana", "Arial", "Times New Roman", "Helvetica", "Georgia"];

        fonts.forEach((font) => {
            test(`creates label with ${font} font`, () => {
                build({ text: "Font Test", font, fontSize: 32 });

                assert.include(drawOps("fillText")[0].state.font, font);
            });
        });

        test("uses default font when not specified", () => {
            build({ text: "Default Font" });

            assert.include(drawOps("fillText")[0].state.font, "Verdana");
        });
    });

    describe("Font Sizes", () => {
        const sizes = [12, 24, 36, 48, 64, 96];

        sizes.forEach((size) => {
            test(`creates label with fontSize ${size}`, () => {
                build({ text: "Size Test", fontSize: size });

                assert.include(drawOps("fillText")[0].state.font, `${size}px`);
            });
        });

        test("uses default fontSize when not specified", () => {
            build({ text: "Default Size" });

            assert.include(drawOps("fillText")[0].state.font, "48px");
        });
    });

    describe("Text Colors", () => {
        const colors = ["#000000", "#FFFFFF", "#FF0000", "#00FF00", "#0000FF", "#FFFF00", "#FF00FF", "#00FFFF"];

        colors.forEach((color) => {
            test(`creates label with text color ${color}`, () => {
                build({ text: "Color Test", textColor: color });

                assert.equal(drawOps("fillText")[0].state.fillStyle, color);
            });
        });

        test("uses default text color when not specified", () => {
            build({ text: "Default Color" });

            assert.equal(drawOps("fillText")[0].state.fillStyle, "black");
        });
    });

    describe("Background Rendering", () => {
        test("creates transparent background", () => {
            const built = build({ text: "Transparent BG", backgroundColor: "transparent" });
            const fills = drawOps("fill");

            // Transparency is a property of the TEXTURE, not of the material's alpha. The retired
            // mock asserted `material.alpha === 0`, which would black out the text as well as the
            // background; the real material leaves alpha at 1 and lets the texture's own alpha
            // channel through.
            assert.equal(built.material.alpha, 1);
            assert.isTrue(built.material.useAlphaFromDiffuseTexture);
            assert.isTrue(built.material.diffuseTexture?.hasAlpha);
            assert.equal(fills[fills.length - 1].state.fillStyle, "transparent");
        });

        test("creates solid color backgrounds", () => {
            const backgrounds = ["#FFFFFF", "#FF0000", "#00FF00", "#0000FF", "#FFFF00"];

            backgrounds.forEach((bg) => {
                build({ text: "Background Test", backgroundColor: bg });
                const fills = drawOps("fill");
                assert.isAtLeast(fills.length, 1);
                assert.equal(fills[fills.length - 1].state.fillStyle, bg);
            });
        });

        test("handles RGBA backgrounds with alpha", () => {
            build({ text: "RGBA Test", backgroundColor: "rgba(255, 0, 0, 0.5)" });
            const fills = drawOps("fill");

            assert.equal(fills[fills.length - 1].state.fillStyle, "rgba(255, 0, 0, 0.5)");
        });

        test("uses default transparent background", () => {
            build({ text: "Default BG" });
            const fills = drawOps("fill");

            assert.equal(fills[fills.length - 1].state.fillStyle, "transparent");
        });
    });

    describe("Background Padding", () => {
        const paddings = [0, 4, 8, 16, 32];

        paddings.forEach((padding) => {
            test(`creates label with padding ${padding}`, () => {
                const built = build({
                    text: "Padding Test",
                    backgroundColor: "#FFFFFF",
                    backgroundPadding: padding,
                });

                assert.isAbove(built.planeWidth, 0);
            });
        });

        test("uses zero padding by default", () => {
            // The retired mock's default was 8. The real default is 0, and the difference is
            // visible: padding is added to both the width and the height of the drawn area, so it
            // pulls the plane's aspect ratio toward square and NARROWS the mesh.
            const zero = build({ text: "Padding Test", backgroundColor: "#FFFFFF", backgroundPadding: 0 });
            const implicit = build({ text: "Padding Test", backgroundColor: "#FFFFFF" });
            const padded = build({ text: "Padding Test", backgroundColor: "#FFFFFF", backgroundPadding: 8 });

            assert.closeTo(implicit.planeWidth, zero.planeWidth, 1e-9);
            assert.isBelow(padded.planeWidth, zero.planeWidth);
        });
    });

    describe("Corner Radius", () => {
        const radii = [0, 5, 10, 15, 20];

        radii.forEach((radius) => {
            test(`creates label with corner radius ${radius}`, () => {
                build({ text: "Radius Test", backgroundColor: "#CCCCCC", cornerRadius: radius });

                assert.isAtLeast(drawOps("fill").length, 1);
            });
        });
    });

    describe("Borders", () => {
        // Borders are FILLED rings -- an outer rounded rect and an inner one, filled even-odd --
        // not stroked rectangles. The retired mock counted `strokeRect` calls, of which the real
        // renderer makes none, so every one of these cases was counting a number the product never
        // produces. The fill sequence is the honest reading: one fill per border, in the order the
        // borders were given, then one for the background.
        function backgroundAndBorderFills(): unknown[] {
            return drawOps("fill").map((entry) => entry.state.fillStyle);
        }

        test("creates label without borders", () => {
            build({ text: "No Borders", backgroundColor: "#123456" });

            assert.deepEqual(backgroundAndBorderFills(), ["#123456"]);
        });

        test("creates single border", () => {
            build({
                text: "Single Border",
                backgroundColor: "#123456",
                borders: [{ width: 2, color: "#000000", spacing: 0 }],
            });

            assert.deepEqual(backgroundAndBorderFills(), ["#000000", "#123456"]);
        });

        test("creates multiple borders", () => {
            build({
                text: "Multi Border",
                backgroundColor: "#123456",
                borders: [
                    { width: 2, color: "#FF0000", spacing: 0 },
                    { width: 1, color: "#00FF00", spacing: 2 },
                    { width: 3, color: "#0000FF", spacing: 1 },
                ],
            });

            assert.deepEqual(backgroundAndBorderFills(), ["#FF0000", "#00FF00", "#0000FF", "#123456"]);
        });

        test("creates borders with spacing", () => {
            build({
                text: "Spaced Borders",
                backgroundColor: "#123456",
                borders: [
                    { width: 2, color: "#000000", spacing: 5 },
                    { width: 1, color: "#FF0000", spacing: 3 },
                ],
            });

            assert.deepEqual(backgroundAndBorderFills(), ["#000000", "#FF0000", "#123456"]);
        });

        test("borderWidth alone becomes a single border", () => {
            build({ text: "Legacy Border", backgroundColor: "#123456", borderWidth: 3, borderColor: "#ABCDEF" });

            assert.deepEqual(backgroundAndBorderFills(), ["#ABCDEF", "#123456"]);
        });
    });

    describe("Text Effects", () => {
        test("creates text with outline", () => {
            build({ text: "Outlined Text", textOutline: true, textOutlineColor: "#000000", textOutlineWidth: 2 });

            assert.isAtLeast(drawOps("strokeText").length, 1);
        });

        test("creates text with shadow", () => {
            build({
                text: "Shadow Text",
                textShadow: true,
                textShadowColor: "rgba(0,0,0,0.5)",
                textShadowBlur: 4,
                textShadowOffsetX: 2,
                textShadowOffsetY: 2,
            });

            assert.isAtLeast(drawOps("fillText").length, 1);
        });
    });

    describe("Text Alignment", () => {
        const alignments = ["left", "center", "right"] as const;

        alignments.forEach((align) => {
            test(`creates label with ${align} alignment`, () => {
                build({ text: "Aligned Text", textAlign: align });

                assert.isAtLeast(drawOps("fillText").length, 1);
            });
        });
    });

    describe("Attach Positions", () => {
        ATTACH_POSITIONS.forEach((position) => {
            test(`supports attach position: ${position}`, () => {
                const built = build({ text: `Attach ${position}`, attachPosition: position });

                assert.isNotNull(built.label.labelMesh);
            });
        });
    });

    describe("Label Dimensions", () => {
        test("calculates proper dimensions for short text", () => {
            const built = build({ text: "Hi", fontSize: 24 });

            assert.isAbove(built.planeWidth, 0);
            assert.isAbove(built.planeHeight, 0);
        });

        test("calculates proper dimensions for long text", () => {
            const short = build({ text: "Hi", fontSize: 48 });
            const long = build({
                text: "This is a very long piece of text that should result in a wider label",
                fontSize: 48,
            });

            assert.isAbove(long.planeWidth, short.planeWidth);
        });

        test("handles power-of-2 texture sizing", () => {
            const built = build({ text: "Texture Size Test", fontSize: 36 });

            assert.isTrue((built.textureWidth & (built.textureWidth - 1)) === 0, "Width should be power of 2");
            assert.isTrue((built.textureHeight & (built.textureHeight - 1)) === 0, "Height should be power of 2");
        });
    });

    describe("Material Configuration", () => {
        test("sets correct material properties", () => {
            const built = build({ text: "Material Test" });

            assert.isFalse(built.material.backFaceCulling, "a label must be readable from both sides");
            // The mock asserted an emissive TEXTURE. The real material puts the canvas on
            // diffuseTexture and lights it with a flat white emissive COLOUR, which is what makes
            // a label legible with no light in the scene.
            assert.isNotNull(built.material.diffuseTexture);
            assert.isNull(built.material.emissiveTexture);
            assert.deepEqual(
                [built.material.emissiveColor.r, built.material.emissiveColor.g, built.material.emissiveColor.b],
                [1, 1, 1],
            );
            assert.deepEqual(
                [built.material.specularColor.r, built.material.specularColor.g, built.material.specularColor.b],
                [0, 0, 0],
                "a specular highlight on flat text reads as a smear",
            );
        });

        test("handles material transparency", () => {
            const built = build({ text: "Transparent Test", backgroundColor: "transparent" });

            assert.isTrue(built.material.useAlphaFromDiffuseTexture);
            assert.isTrue(built.material.diffuseTexture?.hasAlpha);
        });

        test("glow animation starts from a dimmer emissive than a static label", () => {
            const glowing = build({ text: "Glow", animation: "glow" });
            const still = build({ text: "Glow", animation: "none" });

            assert.isBelow(glowing.material.emissiveColor.r, still.material.emissiveColor.r);
        });
    });

    describe("Texture Drawing", () => {
        test("performs text drawing operations", () => {
            build({ text: "Drawing Test", backgroundColor: "#FFFFFF" });

            assert.isAtLeast(drawOps("clearRect").length, 1, "the texture is cleared before redrawing");
            assert.isAtLeast(drawOps("fill").length, 1, "the background is a filled path, not a fillRect");
            assert.deepEqual(drawnText(), ["Drawing Test"]);
        });

        test("the texture is scaled to the measured content, not left at 1:1", () => {
            build({ text: "Scaled", fontSize: 48 });
            const [scale] = drawOps("scale");

            assert.isDefined(scale);
            assert.isAbove(Number(scale.args[0]), 0);
            assert.isAbove(Number(scale.args[1]), 0);
        });
    });

    describe("Rich Text Markup", () => {
        // The markup vocabulary RichTextParser accepts -- <bold>, <italic>, <color='...'>,
        // <size='...'>, <font='...'>, <bg='...'> -- had no coverage at all before this file was
        // re-pointed, because the retired mock treated `text` as an opaque string to echo back.

        test("a colour tag paints only the tagged run", () => {
            build({ text: "plain <color='#FF0000'>red</color> plain", textColor: "#000000" });

            assert.deepEqual(drawnText(), ["plain ", "red", " plain"]);
            assert.deepEqual(
                drawOps("fillText").map((entry) => entry.state.fillStyle),
                ["#000000", "#FF0000", "#000000"],
            );
        });

        test("a bold tag changes the font of the tagged run only", () => {
            build({ text: "a<bold>b</bold>c" });
            const fonts = drawOps("fillText").map((entry) => entry.state.font);

            assert.lengthOf(fonts, 3);
            assert.include(fonts[1], "bold");
            assert.notInclude(fonts[0], "bold");
            assert.notInclude(fonts[2], "bold");
        });

        test("a size tag changes the font size of the tagged run only", () => {
            build({ text: "a<size='96'>big</size>c", fontSize: 24 });
            const fonts = drawOps("fillText").map((entry) => entry.state.font);

            assert.include(fonts[0], "24px");
            assert.include(fonts[1], "96px");
            assert.include(fonts[2], "24px");
        });

        test("a bg tag draws a fillRect behind the tagged run", () => {
            // This is the only thing in the whole label renderer that calls fillRect. The retired
            // mock asserted at least one fillRect for EVERY label, which the product has never done.
            build({ text: "a<bg='#FFFF00'>lit</bg>c" });
            const rects = drawOps("fillRect");

            assert.lengthOf(rects, 1);
            assert.equal(rects[0].state.fillStyle, "#FFFF00");
        });

        test("a newline makes a second line, and two lines are taller than one", () => {
            const one = build({ text: "one", fontSize: 48 });
            const two = build({ text: "one\ntwo", fontSize: 48 });

            assert.deepEqual(drawnText(), ["one", "two"]);
            assert.isBelow(two.planeWidth, one.planeWidth * 2, "the second line stacks, it does not extend the first");
        });
    });

    describe("Complex Combinations", () => {
        test("creates full-featured label", () => {
            build({
                text: "Full Featured Label",
                font: "Arial",
                fontSize: 36,
                textColor: "#FFFFFF",
                backgroundColor: "#0066CC",
                backgroundPadding: 12,
                cornerRadius: 8,
                borders: [
                    { width: 2, color: "#FFFFFF", spacing: 0 },
                    { width: 1, color: "#003366", spacing: 2 },
                ],
                textOutline: true,
                textOutlineColor: "#000000",
                textOutlineWidth: 1,
                textShadow: true,
                textShadowColor: "rgba(0,0,0,0.3)",
                textShadowBlur: 2,
                textShadowOffsetX: 1,
                textShadowOffsetY: 1,
            });

            // Two fillText calls for one string: the shadowed pass, then the crisp pass over it.
            // That is deliberate in RichTextRenderer.drawLine and is the only way a shadow and a
            // sharp glyph edge can both appear.
            assert.deepEqual(drawnText(), ["Full Featured Label", "Full Featured Label"]);
            assert.include(drawOps("fillText")[0].state.font, "Arial");
            assert.include(drawOps("fillText")[0].state.font, "36px");
            assert.lengthOf(drawOps("strokeText"), 1, "one outline pass");
            assert.deepEqual(
                drawOps("fill").map((entry) => entry.state.fillStyle),
                ["#FFFFFF", "#003366", "#0066CC"],
            );
        });
    });
});
