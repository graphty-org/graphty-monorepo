import { assert, describe, it } from "vitest";

import { channelsFor, LABEL_STYLE_FIELDS, labelFieldOf } from "../../catalog";

describe("labelFieldOf", () => {
    it("names the label style channel and field a label field channel writes", () => {
        assert.deepEqual(labelFieldOf("node.labelColor"), { into: "node.labelStyle", field: "color" });
        assert.deepEqual(labelFieldOf("node.labelSize"), { into: "node.labelStyle", field: "sizePx" });
        assert.deepEqual(labelFieldOf("edge.labelLocation"), { into: "edge.labelStyle", field: "location" });
    });

    it("is undefined for a channel that is not a label field", () => {
        assert.isUndefined(labelFieldOf("node.color"));
        assert.isUndefined(labelFieldOf("node.labelStyle"));
        assert.isUndefined(labelFieldOf("node.label"));
    });

    it("lands every label field channel in a label style channel of its own kind, on a real field", () => {
        for (const target of ["node", "edge"] as const) {
            const fields = channelsFor(target).flatMap(({ channel }) => {
                const found = labelFieldOf(channel);
                return found === undefined ? [] : [{ channel, ...found }];
            });
            assert.isAbove(fields.length, 30);
            for (const { channel, into, field } of fields) {
                // An external label's own look (node.xlabelColor) lands in its own style, a label's in the label's.
                const kind = channel.startsWith(`${target}.xlabel`) ? "xlabelStyle" : "labelStyle";
                assert.equal(into, `${target}.${kind}`, channel);
                assert.include(LABEL_STYLE_FIELDS, field);
            }
        }
    });
});
