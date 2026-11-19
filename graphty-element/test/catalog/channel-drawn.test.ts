/**
 * @file `channelDrawn` and `labelFieldDrawn`: the one reader of a channel's or a label field's
 * `drawnWhen`, and the `views` a shader header declares.
 */

import { assert, describe, it } from "vitest";

import { channelDrawn, labelFieldDrawn } from "../../src/catalog/drawnWhen";
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
