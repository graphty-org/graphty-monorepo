/**
 * The graphty scene extractor's vocabulary: how graphty-element's shapes, arrows, line patterns,
 * label locations and colors become the fidelity scene's classes. The reader itself runs in the
 * browser (`fidelity.test.ts`); these are the parts that decide what a value means.
 */
import { assert, describe, it } from "vitest";

import { EdgeArrowTypes, EdgeLineTypes, NodeShapes } from "../../schema";
import { FILE_STYLE_SHAPES } from "../../src/session/styles/fileStyles/shapes";
import { arrowClassOf, colorOf, GRAPHTY_GAPS, labelPositionOf, lineStyleOf, shapeClassOf } from "./extract-scene";

describe("the graphty scene extractor's vocabulary", () => {
    it("reads every file shape back as the class it was imported from", () => {
        // The file-style import maps a file's 2D shape onto a mesh; reading the mesh back must give
        // the 2D class, except where the import already lost it (several shapes share "box").
        const expected: Record<string, string> = {
            ellipse: "ellipse",
            rectangle: "rect",
            "round-rectangle": "rect",
            parallelogram: "rect",
            trapezoid: "rect",
            triangle: "triangle",
            diamond: "diamond",
            hexagon: "hexagon",
            octagon: "octagon",
            star: "star",
            pentagon: "other",
            vee: "other",
            none: "ellipse",
        };
        for (const [fileShape, mesh] of Object.entries(FILE_STYLE_SHAPES)) {
            assert.strictEqual(shapeClassOf(mesh), expected[fileShape], `${fileShape} -> ${mesh}`);
        }
    });

    it("gives every node shape the element has a class, and anything else other", () => {
        for (const shape of NodeShapes.options) {
            assert.isString(shapeClassOf(shape));
        }
        assert.strictEqual(shapeClassOf("no-such-shape"), "other");
        assert.strictEqual(shapeClassOf(undefined), "other");
    });

    it("folds arrowheads the way the reference extractors do", () => {
        assert.strictEqual(arrowClassOf("normal"), "filled-triangle");
        assert.strictEqual(arrowClassOf("vee"), "filled-triangle");
        assert.strictEqual(arrowClassOf("open-normal"), "open-triangle");
        assert.strictEqual(arrowClassOf("open-diamond"), "diamond");
        assert.strictEqual(arrowClassOf("sphere-dot"), "circle");
        assert.strictEqual(arrowClassOf("tee"), "tee");
        assert.strictEqual(arrowClassOf("crow"), "other");
        assert.strictEqual(arrowClassOf("none"), "none");
        assert.strictEqual(arrowClassOf(undefined), "none");
        for (const arrow of EdgeArrowTypes.options) {
            assert.isString(arrowClassOf(arrow));
        }
    });

    it("maps line patterns to solid, dashed, dotted or other", () => {
        assert.strictEqual(lineStyleOf(undefined), "solid");
        assert.strictEqual(lineStyleOf("solid"), "solid");
        assert.strictEqual(lineStyleOf("dash"), "dashed");
        assert.strictEqual(lineStyleOf("dot"), "dotted");
        assert.strictEqual(lineStyleOf("dash-dot"), "other");
        assert.deepEqual(
            EdgeLineTypes.options.filter((p) => lineStyleOf(p) !== "other"),
            ["solid", "dot", "dash"],
        );
    });

    it("reads an unset label location as the element's default, above the node", () => {
        assert.strictEqual(labelPositionOf(undefined), "above");
        assert.strictEqual(labelPositionOf("center"), "inside");
        assert.strictEqual(labelPositionOf("bottom"), "below");
        assert.strictEqual(labelPositionOf("left"), "left");
        assert.strictEqual(labelPositionOf("top-right"), "other");
        assert.strictEqual(labelPositionOf("automatic"), "other");
    });

    it("splits a carried color into #rrggbb and its alpha", () => {
        assert.deepEqual(colorOf({ r: 255, g: 0, b: 0, a: 1, hex: "#FF0000" }), { hex: "#ff0000", alpha: 1 });
        assert.deepEqual(colorOf("#f0c"), { hex: "#ff00cc", alpha: 1 });
        assert.deepEqual(colorOf("#00000080"), { hex: "#000000", alpha: 128 / 255 });
        assert.deepEqual(colorOf("#1234"), { hex: "#112233", alpha: 68 / 255 });
        assert.isNull(colorOf("red"));
        assert.isNull(colorOf(undefined));
        assert.isNull(colorOf({ hex: 3 }));
    });

    it("lists each API gap once", () => {
        const properties = GRAPHTY_GAPS.map((gap) => gap.property);
        assert.strictEqual(new Set(properties).size, properties.length);
    });
});
