import { assert, describe, it } from "vitest";

import { EdgeStyle } from "../../src/config/EdgeStyle";
import { NodeStyle } from "../../src/config/NodeStyle";
import { CHANNEL_DESCRIPTORS, type ChannelDescriptor, CHANNELS } from "../../src/session/styles/channels";

/**
 * A style object holding `value` at the channel's style path. A colour's opacity sits beside the
 * colour it qualifies, so that one path is given a colour to sit beside.
 * @param descriptor - The channel.
 * @param value - The number to put there.
 * @returns The style object.
 */
function styleWith(descriptor: ChannelDescriptor, value: number): Record<string, unknown> {
    const segments = descriptor.stylePath.split(".");
    const leaf = segments.pop() ?? "";
    const parent: Record<string, unknown> =
        descriptor.stylePath === "texture.color.opacity" ? { colorType: "solid", value: "#000000" } : {};
    parent[leaf] = value;

    return segments.reduceRight<Record<string, unknown>>((inner, key) => ({ [key]: inner }), parent);
}

const NUMERIC = CHANNELS.map((channel) => CHANNEL_DESCRIPTORS[channel]).filter((d) => d.accepts === "number");

describe("a numeric channel and its style schema accept the same numbers (#2067)", () => {
    it("has numeric channels to compare", () => {
        assert.isAtLeast(NUMERIC.length, 8);
    });

    for (const descriptor of NUMERIC) {
        it(`${descriptor.channel} (${descriptor.stylePath})`, () => {
            const schema = descriptor.target === "node" ? NodeStyle : EdgeStyle;
            const { min, max } = descriptor;
            const probes = [-1, 0, 0.5, 1, 1.5, 2, 2.5, 3, 1000];
            for (const bound of [min, max]) {
                if (bound !== undefined) {
                    probes.push(bound - 0.001, bound, bound + 0.001);
                }
            }

            for (const value of probes) {
                const channelAccepts = (min === undefined || value >= min) && (max === undefined || value <= max);
                const schemaAccepts = schema.safeParse(styleWith(descriptor, value)).success;
                assert.strictEqual(
                    schemaAccepts,
                    channelAccepts,
                    `${String(value)}: the channel ${channelAccepts ? "accepts" : "refuses"} it and the schema ${schemaAccepts ? "accepts" : "refuses"} it`,
                );
            }
        });
    }

    it("parses 0 for glow strength, edge width and both arrow sizes", () => {
        assert.isTrue(NodeStyle.safeParse({ effect: { glow: { color: "#ff0000", strength: 0 } } }).success);
        assert.isTrue(EdgeStyle.safeParse({ line: { width: 0 } }).success);
        assert.isTrue(EdgeStyle.safeParse({ arrowHead: { size: 0 }, arrowTail: { size: 0 } }).success);
    });
});
