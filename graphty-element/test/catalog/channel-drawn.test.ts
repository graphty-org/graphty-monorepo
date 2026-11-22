/**
 * @file `channelDrawn` and `labelFieldDrawn`: the one reader of a channel's or a label field's
 * `drawnWhen`, and the `views` a shader header declares.
 */

import { assert, describe, it } from "vitest";

import { channelDrawn, combineDrawn, drawnDefault, labelFieldDrawn } from "../../src/catalog/drawnWhen";
import { formatShaderText, parseShaderText } from "../../src/catalog/shaderText";
import { NODE_SHAPE_DESCRIPTORS } from "../../src/catalog/shapes";
import type { Channel, LabelStyle } from "../../src/catalog/types";

/**
 * A reader over a few set values.
 * @param values - What is set.
 * @returns The reader.
 */
function reading(values: Partial<Record<string, unknown>>): (other: Channel | keyof LabelStyle) => unknown {
    return (other) => values[other];
}

describe("channelDrawn", () => {
    it("draws a curve's circle and fan only without force curves: a support point wins over both", () => {
        const curved = { "edge.curvature": true };
        for (const channel of ["edge.arcRadius", "edge.fanned", "edge.fanSpacing"] as const) {
            assert.deepStrictEqual(channelDrawn(channel, reading(curved), "2d"), { drawn: true }, channel);
            assert.deepStrictEqual(
                channelDrawn(channel, reading({ ...curved, "edge.supportModel": "barnesHut" }), "2d"),
                { drawn: false, unmet: { channel: "edge.supportModel", unset: true } },
                channel,
            );
        }
    });

    it("draws force curves, a circle and a fan only without a stored route: its ports and bends win over all three", () => {
        const bowed = { "edge.curvature": true, "edge.supportModel": "barnesHut" };
        for (const port of ["edge.sourcePort", "edge.targetPort", "edge.bends"] as const) {
            for (const channel of ["edge.supportModel", "edge.supportSpringLength", "edge.supportScale"] as const) {
                assert.deepStrictEqual(
                    channelDrawn(channel, reading({ ...bowed, [port]: "1,0" }), "3d"),
                    { drawn: false, unmet: { channel: port, unset: true } },
                    `${channel} with ${port}`,
                );
            }
            assert.isFalse(
                channelDrawn("edge.arcRadius", reading({ "edge.curvature": true, [port]: "1,0" }), "2d").drawn,
            );
        }
    });

    it("reads an unset support scale as Unit once a unit is set, and draws the unit only at that scale", () => {
        assert.strictEqual(drawnDefault("edge.supportScale", reading({})), "drawing");
        assert.strictEqual(drawnDefault("edge.supportScale", reading({ "edge.supportUnit": 2 })), "unit");
        const bowed = { "edge.curvature": true, "edge.supportModel": "barnesHut", "edge.supportUnit": 2 };
        assert.isTrue(channelDrawn("edge.supportUnit", reading(bowed), "3d").drawn);
        assert.deepStrictEqual(
            channelDrawn("edge.supportUnit", reading({ ...bowed, "edge.supportScale": "drawing" }), "2d"),
            { drawn: false, unmet: { channel: "edge.supportScale", values: ["unit"] } },
        );
    });

    it("fits a node to its label only when it has a label, and holds its picture only when it has one", () => {
        const fit = { "node.labelFit": "inside" };
        assert.deepStrictEqual(channelDrawn("node.labelFit", reading({}), "2d"), {
            drawn: false,
            unmet: { channel: "node.label", set: true },
        });
        assert.isTrue(channelDrawn("node.labelFit", reading({ "node.label": "A" }), "3d").drawn);
        assert.isFalse(channelDrawn("node.labelFitQuantum", reading(fit), "2d").drawn);
        assert.isTrue(channelDrawn("node.labelFitQuantum", reading({ ...fit, "node.label": "A" }), "2d").drawn);
        assert.deepStrictEqual(channelDrawn("node.labelFitImage", reading({ ...fit, "node.label": "A" }), "2d"), {
            drawn: false,
            unmet: { channel: "node.image", set: true },
        });
    });

    it("reads a value that varies by element as set, and as meeting any values condition", () => {
        const bound = { attribute: "name" };
        assert.isTrue(channelDrawn("node.labelFit", reading({ "node.label": bound }), "2d").drawn);
        // edge.animationSpeed needs a solid, straight line: a style bound to data may draw some solid lines
        assert.isTrue(channelDrawn("edge.animationSpeed", reading({ "edge.style": bound }), "2d").drawn);
    });

    it("draws an open cap's outline width only on an open cap", () => {
        assert.isFalse(channelDrawn("edge.arrowHeadOutlineWidth", reading({ "edge.arrowHead": "normal" }), "2d").drawn);
        assert.isTrue(
            channelDrawn("edge.arrowHeadOutlineWidth", reading({ "edge.arrowHead": "open-normal" }), "2d").drawn,
        );
    });

    it("reads an unset channel as its default", () => {
        // edge.style defaults to solid and edge.curvature to false: a plain edge animates.
        assert.deepStrictEqual(channelDrawn("edge.animationSpeed", reading({}), "3d"), { drawn: true });
        // edge.gradientKind defaults to linear: a direction is drawn with nothing set.
        assert.deepStrictEqual(channelDrawn("node.gradientDirection", reading({}), "2d"), { drawn: true });
    });

    it("compares a boolean as text", () => {
        assert.deepStrictEqual(channelDrawn("edge.animationSpeed", reading({ "edge.curvature": true }), "3d"), {
            drawn: false,
            unmet: { channel: "edge.curvature", values: ["false"] },
        });
        assert.deepStrictEqual(channelDrawn("edge.arcRadius", reading({ "edge.curvature": true }), "3d"), {
            drawn: true,
        });
    });

    it("draws an arc height with the route unset, which the layout may raise", () => {
        assert.deepStrictEqual(channelDrawn("edge.arcHeight", reading({}), "3d"), { drawn: true });
    });

    it("draws a placed picture's settings only while node.image is set, never for a wrapped texture", () => {
        for (const channel of ["node.imageFit", "node.imageOpacity", "node.imageRepeat", "node.imageWidth"] as const) {
            assert.deepStrictEqual(
                channelDrawn(channel, reading({ "node.texture": "asset:a" }), "3d"),
                { drawn: false, unmet: { channel: "node.image", set: true } },
                channel,
            );
        }
        assert.isTrue(channelDrawn("node.imageOpacity", reading({ "node.image": "asset:a" }), "2d").drawn);
    });

    it("holds a channel to its view", () => {
        assert.deepStrictEqual(channelDrawn("node.zIndex", reading({}), "2d"), { drawn: true });
        assert.deepStrictEqual(channelDrawn("node.zIndex", reading({}), "3d"), {
            drawn: false,
            unmet: { dimension: "2d" },
        });
    });

    it("needs a set channel, and every condition at once", () => {
        assert.isFalse(channelDrawn("node.modelTurn", reading({}), "3d").drawn);
        assert.isTrue(channelDrawn("node.modelTurn", reading({ "node.model": "a.glb" }), "3d").drawn);
        assert.deepStrictEqual(channelDrawn("edge.supportRepulsion", reading({ "edge.curvature": true }), "2d"), {
            drawn: false,
            unmet: { channel: "edge.supportModel", set: true },
        });
        assert.isTrue(
            channelDrawn(
                "edge.supportRepulsion",
                reading({ "edge.curvature": true, "edge.supportModel": "barnesHut" }),
                "2d",
            ).drawn,
        );
    });

    it("draws a channel with no conditions anywhere", () => {
        assert.deepStrictEqual(channelDrawn("node.color", reading({}), "2d"), { drawn: true });
    });

    it("turns, cuts and lines only flat shapes, read from the renderer's own test", () => {
        const flat = new Set(NODE_SHAPE_DESCRIPTORS.filter((shape) => shape.flat).map((shape) => shape.id));
        assert.isTrue(flat.has("star"));
        assert.isFalse(flat.has("sphere"));
        assert.isTrue(channelDrawn("node.shapeRotation", reading({ "node.shape": "star" }), "3d").drawn);
        assert.isFalse(channelDrawn("node.shapeRotation", reading({ "node.shape": "box" }), "3d").drawn);
    });
});

describe("labelFieldDrawn", () => {
    it("reads sibling fields of the same label style", () => {
        assert.deepStrictEqual(labelFieldDrawn("marginTop", reading({}), "2d"), { drawn: true });
        assert.deepStrictEqual(labelFieldDrawn("marginTop", reading({ boxPadding: 4 }), "2d"), {
            drawn: false,
            unmet: { field: "boxPadding", unset: true },
        });
        assert.isFalse(labelFieldDrawn("cornerRadius", reading({}), "2d").drawn);
        assert.isTrue(labelFieldDrawn("cornerRadius", reading({ background: "#fff" }), "2d").drawn);
        assert.isTrue(labelFieldDrawn("gradientDirection", reading({ gradient: true }), "2d").drawn);
        assert.isFalse(
            labelFieldDrawn("gradientDirection", reading({ gradient: true, gradientType: "radial" }), "2d").drawn,
        );
    });
});

describe("a shader's views", () => {
    it("round-trip through a custom shader's header", () => {
        const text = [
            "/* graphty-shader 1",
            JSON.stringify({ id: "mine/flat-only", name: "Flat only", place: "paint", views: ["2d"], params: [] }),
            "*/",
            "vec4 shade(NodeInput n) { return vec4(n.color, 1.0); }",
        ].join("\n");
        const read = parseShaderText(text);
        assert.isTrue(read.ok, JSON.stringify(read));
        if (!read.ok) {
            return;
        }

        assert.deepStrictEqual(read.registration.descriptor.views, ["2d"]);
        const again = parseShaderText(formatShaderText(read.registration));
        assert.isTrue(again.ok);
        assert.deepStrictEqual(again.ok ? again.registration.descriptor.views : undefined, ["2d"]);
    });

    it("refuses a view that is not 2d or 3d", () => {
        const text = [
            "/* graphty-shader 1",
            JSON.stringify({ id: "mine/bad", place: "paint", views: ["4d"], params: [] }),
            "*/",
            "vec4 shade(NodeInput n) { return vec4(n.color, 1.0); }",
        ].join("\n");
        assert.isFalse(parseShaderText(text).ok);
    });
});

describe("combineDrawn", () => {
    it("multiplies a size over nothing beneath into the size itself, the same as replacing it", () => {
        // node.size defaults to 1: x1 is the layer's own number.
        assert.deepStrictEqual(combineDrawn("node.size", "multiply", undefined), {
            drawn: false,
            unmet: { mode: "multiply", base: 1 },
        });
        assert.deepStrictEqual(combineDrawn("node.size", "multiply", 1), {
            drawn: false,
            unmet: { mode: "multiply", base: 1 },
        });
        assert.deepStrictEqual(combineDrawn("node.size", "multiply", 2), { drawn: true });
        assert.deepStrictEqual(combineDrawn("node.size", "multiply", "mixed"), { drawn: true });
        assert.deepStrictEqual(combineDrawn("node.size", "replace", undefined), { drawn: true });
    });

    it("adds to a default that is not 0, so add draws over nothing beneath", () => {
        assert.deepStrictEqual(combineDrawn("node.size", "add", undefined), { drawn: true });
        assert.deepStrictEqual(combineDrawn("node.size", "add", 0), { drawn: false, unmet: { mode: "add", base: 0 } });
    });

    it("adds to a channel with no default as to 0: the layer's own number", () => {
        // node.borderWaveAmplitude states no default.
        assert.deepStrictEqual(combineDrawn("node.borderWaveAmplitude", "add", undefined), {
            drawn: false,
            unmet: { mode: "add", base: 0 },
        });
    });
});
