/**
 * @file Style fields the schema declared and no renderer ever read.
 *
 * A published schema is a promise. `GraphStyle` declared motion blur, depth of field and
 * screen-space reflections; each parsed, validated and round-tripped through a saved document
 * and reached no renderer in any version of the package.
 *
 * Those three are gone rather than annotated, and the difference matters:
 * `GraphStyle.addDefaultStyle` and the two `enabled` flags are ACCEPTED AND IGNORED because
 * documents in the wild carry them and they once did something. These never did anything, so
 * no document can be carrying them meaningfully, and a strict schema that refuses them tells a
 * consumer the truth at the earliest possible moment instead of at no moment at all.
 *
 * The node fields this file once listed beside them -- a node texture from a URL
 * (`texture.image`) and the outline width -- are drawn now, so the schema keeps them.
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

    it("is not motion blur, depth of field or screen-space reflections", () => {
        for (const effects of [{ motionBlur: 0.5 }, { depthOfField: 1 }, { screenSpaceReflections: true }]) {
            assert.throws(() => {
                GraphStyle.parse({ effects });
            }, /effects/);
        }
    });

    it("leaves the outline colour and width, which ARE drawn, alone", () => {
        const parsed = NodeStyle.parse({ effect: { outline: { color: "#FF0000", width: 3 } } });

        assert.strictEqual(parsed.effect?.outline?.color, "#FF0000");
        assert.strictEqual(parsed.effect?.outline?.width, 3);
    });

    it("leaves the node icon, which IS drawn, alone", () => {
        const parsed = NodeStyle.parse({ texture: { icon: "star" } });

        assert.strictEqual(parsed.texture?.icon, "star");
    });
});
