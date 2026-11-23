/**
 * @file `channelDrawn` and `labelFieldDrawn`: the one reader of a channel's or a label field's
 * `drawnWhen`, and the `views` a shader header declares.
 */

import { assert, describe, it } from "vitest";

import { channelDrawn, combineDrawn, drawnDefault, labelFieldDrawn, valueDrawn } from "../../src/catalog/drawnWhen";
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

describe("valueDrawn", () => {
    it("draws a uniform size only where scale does not draw the same: an unfitted solid other than an icosphere", () => {
        // the default icosphere is drawn at the uniform extent already
        assert.isFalse(valueDrawn("node.sizeMode", "uniform", reading({}), "2d").drawn);
        assert.isFalse(valueDrawn("node.sizeMode", "uniform", reading({ "node.shape": "icosphere" }), "3d").drawn);
        assert.isTrue(valueDrawn("node.sizeMode", "uniform", reading({ "node.shape": "box" }), "3d").drawn);
        // scale fits a flat shape, and a node with its own width or planar, to the same extent
        assert.isFalse(valueDrawn("node.sizeMode", "uniform", reading({ "node.shape": "ellipse" }), "2d").drawn);
        assert.isFalse(
            valueDrawn("node.sizeMode", "uniform", reading({ "node.shape": "box", "node.width": 2 }), "2d").drawn,
        );
        assert.isFalse(
            valueDrawn("node.sizeMode", "uniform", reading({ "node.shape": "box", "node.planar": true }), "2d").drawn,
        );
        // a value with no condition draws; a view-only value is read from valueViews
        assert.isTrue(valueDrawn("node.sizeMode", "diameter", reading({}), "2d").drawn);
        assert.deepEqual(valueDrawn("node.sizeSpace", "pivot", reading({}), "2d"), {
            drawn: false,
            unmet: { dimension: "3d" },
        });
    });
});

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

    it("fits a node round its label, its label table or the picture it holds, and holds a picture with no label", () => {
        const fit = { "node.labelFit": "inside" };
        const unmet = channelDrawn("node.labelFit", reading({}), "2d");
        assert.isFalse(unmet.drawn);
        assert.property(unmet.drawn ? {} : unmet.unmet, "anyOf");
        assert.isTrue(channelDrawn("node.labelFit", reading({ "node.label": "A" }), "3d").drawn);
        // A label table with no label is laid out and fitted on its own (Node.fitToLabel).
        assert.isTrue(channelDrawn("node.labelFit", reading({ "node.labelTable": "{}" }), "2d").drawn);
        assert.isTrue(channelDrawn("node.labelFitQuantum", reading({ ...fit, "node.labelTable": "{}" }), "2d").drawn);
        // A picture held with no label: the node is fitted round the picture (labelFit.ts heldBox).
        const held = { ...fit, "node.image": "a.png", "node.labelFitImage": true };
        assert.isTrue(channelDrawn("node.labelFit", reading(held), "2d").drawn);
        assert.isTrue(channelDrawn("node.labelFitImage", reading(held), "2d").drawn);
        assert.isTrue(channelDrawn("node.labelFitImagePadding", reading(held), "3d").drawn);
        assert.isTrue(channelDrawn("node.labelPaddingX", reading(held), "3d").drawn);
        // A picture alone, not asked to be held, is nothing to fit round.
        assert.isFalse(channelDrawn("node.labelFit", reading({ "node.image": "a.png" }), "2d").drawn);
        assert.isFalse(channelDrawn("node.labelFitQuantum", reading(fit), "2d").drawn);
        assert.isTrue(channelDrawn("node.labelFitQuantum", reading({ ...fit, "node.label": "A" }), "2d").drawn);
        assert.deepStrictEqual(channelDrawn("node.labelFitImage", reading({ ...fit, "node.label": "A" }), "2d"), {
            drawn: false,
            unmet: { channel: "node.image", set: true },
        });
    });

    it("draws force curves for a mixed port beneath: the edges with no stored route draw them", () => {
        const mixed = { mixed: true };
        const bowed = { "edge.curvature": true, "edge.supportModel": "barnesHut" };
        for (const port of ["edge.sourcePort", "edge.targetPort", "edge.bends"] as const) {
            assert.isTrue(
                channelDrawn("edge.supportSpringLength", reading({ ...bowed, [port]: mixed }), "3d").drawn,
                port,
            );
            assert.isTrue(channelDrawn("edge.fanned", reading({ "edge.curvature": true, [port]: mixed }), "2d").drawn);
        }
    });

    it("lifts an edge only out of a flat layout in 3D, read from the layout", () => {
        assert.isTrue(channelDrawn("edge.lift", reading({}), "3d").drawn, "a dimension alone leaves the layout open");
        assert.isTrue(channelDrawn("edge.lift", reading({}), { dimension: "3d", arrangedDimension: "2d" }).drawn);
        assert.deepStrictEqual(channelDrawn("edge.lift", reading({}), { dimension: "3d", arrangedDimension: "3d" }), {
            drawn: false,
            unmet: { arranged: "2d" },
        });
        assert.isFalse(channelDrawn("edge.lift", reading({}), { dimension: "2d", arrangedDimension: "2d" }).drawn);
    });

    it("raises an arc only on a raised route: the style's, or a location map's in 3D", () => {
        const force = { dimension: "2d", arrangedDimension: "2d", id: "force" } as const;
        assert.deepStrictEqual(channelDrawn("edge.arcHeight", reading({}), force), {
            drawn: false,
            unmet: { channel: "edge.route", values: ["arc", "great-circle"] },
        });
        assert.isTrue(channelDrawn("edge.arcHeight", reading({ "edge.route": "arc" }), "2d").drawn);
        assert.isTrue(channelDrawn("edge.arcHeight", reading({ "edge.route": "great-circle" }), "3d").drawn);
        assert.isFalse(channelDrawn("edge.arcHeight", reading({ "edge.route": "bundled" }), "3d").drawn);
        assert.isTrue(
            channelDrawn("edge.arcHeight", reading({}), "3d").drawn,
            "a dimension alone: the layout may raise it",
        );
        const map = { dimension: "3d", arrangedDimension: "2d", id: "location-map" } as const;
        assert.isTrue(channelDrawn("edge.arcHeight", reading({}), map).drawn, "the map raises an unset route in 3D");
        assert.isFalse(channelDrawn("edge.arcHeight", reading({}), { ...map, dimension: "2d" }).drawn);
        assert.isFalse(channelDrawn("edge.arcHeight", reading({ "edge.route": "straight" }), map).drawn);
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

    it("draws a node's depth only in 3D: the 2D view looks straight down on the layout", () => {
        assert.deepStrictEqual(channelDrawn("node.depth", reading({}), "2d"), {
            drawn: false,
            unmet: { dimension: "3d" },
        });
        assert.deepStrictEqual(channelDrawn("node.depth", reading({}), "3d"), { drawn: true });
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
        // A stretched picture fills the node and leaves no room to place it in.
        const stretched = { "node.image": "asset:a", "node.imageFit": "fill" };
        assert.isFalse(channelDrawn("node.imagePositionX", reading(stretched), "2d").drawn);
        assert.isTrue(channelDrawn("node.imagePositionY", reading({ "node.image": "asset:a" }), "2d").drawn);
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

    it("subtracts and divides always draw: neither paints the layer's own number", () => {
        assert.deepStrictEqual(combineDrawn("node.size", "subtract", 0), { drawn: true });
        assert.deepStrictEqual(combineDrawn("node.size", "divide", 1), { drawn: true });
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
