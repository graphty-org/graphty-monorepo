/**
 * @file Style fields the schema declared and no renderer ever read.
 *
 * A published schema is a promise. `NodeStyle` declared a node texture from a URL and an
 * outline width; `GraphStyle` declared motion blur, depth of field and screen-space
 * reflections. Every one of the five parsed, validated, round-tripped through a saved document
 * and reached no renderer in this version of the package or any earlier one -- a `z.url()` on
 * `texture.image` even told a consumer their URL was accepted.
 *
 * They are gone rather than annotated, and the difference matters: `GraphStyle.addDefaultStyle`
 * and the two `enabled` flags are ACCEPTED AND IGNORED because documents in the wild carry them
 * and they once did something. These never did anything in any version, so no document can
 * be carrying them meaningfully, and a strict schema that refuses them tells a consumer the
 * truth at the earliest possible moment instead of at no moment at all.
 */

import { assert, describe, it } from "vitest";

import { NodeStyle } from "../../src/config";
import { GraphStyle } from "../../src/config/GraphStyle";

describe("a style field nothing draws", () => {
    it("leaves the node texture alone now that it is drawn (node.texture)", () => {
        // `texture.image` came back with its renderer and its channel together, as promised.
        const parsed = NodeStyle.parse({ texture: { image: "https://example.com/marble.png" } });

        assert.strictEqual(parsed.texture?.image, "https://example.com/marble.png");
    });

    it("is not an outline width", () => {
        // An outline is a ring whose width is a fixed share of the node's size, so a width
        // would be accepted and ignored.
        assert.throws(() => {
            NodeStyle.parse({ effect: { outline: { color: "#FF0000", width: 3 } } });
        }, /width/);
    });

    it("is not motion blur, depth of field or screen-space reflections", () => {
        for (const effects of [{ motionBlur: 0.5 }, { depthOfField: 1 }, { screenSpaceReflections: true }]) {
            assert.throws(() => {
                GraphStyle.parse({ effects });
            }, /effects/);
        }
    });

    it("leaves the outline colour, which IS drawn, alone", () => {
        const parsed = NodeStyle.parse({ effect: { outline: { color: "#FF0000" } } });

        assert.strictEqual(parsed.effect?.outline?.color, "#FF0000");
    });

    it("leaves the node icon, which IS drawn, alone", () => {
        const parsed = NodeStyle.parse({ texture: { icon: "star" } });

        assert.strictEqual(parsed.texture?.icon, "star");
    });
});
