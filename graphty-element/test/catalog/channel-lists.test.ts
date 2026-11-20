/**
 * @file The space-separated list channels: which ones they are (`listOf`) and the one reader and
 * writer for their items.
 */

import { assert, describe, it } from "vitest";

import { channelDescriptor, CHANNELS, readChannelList, writeChannelList } from "../../catalog";

const LISTS = [
    "node.gradientColors",
    "node.gradientStops",
    "node.pieColors",
    "node.pieSizes",
    "node.pieOpacities",
    "node.stripeColors",
    "node.stripeSizes",
    "node.stripeOpacities",
    "node.chartColors",
    "node.chartValues",
    "edge.gradientColors",
    "edge.gradientStops",
];

describe("list channels", () => {
    it("every listOf channel round-trips", () => {
        const listed = CHANNELS.filter((channel) => channelDescriptor(channel)?.listOf !== undefined);
        assert.sameMembers([...listed], LISTS);
        for (const channel of listed) {
            const colors = channelDescriptor(channel)?.listOf === "color";
            const items = colors ? ["#ff0000", "rgb(0, 128, 0)", "blue"] : [0, 0.25, 1];
            const text = writeChannelList(channel, items);
            assert.deepEqual([...readChannelList(channel, text)], items, channel);
            assert.deepEqual([...readChannelList(channel, `  ${text}  `)], items, `${channel} padded`);
        }
        assert.deepEqual([...readChannelList("node.gradientStops", undefined)], []);
        assert.deepEqual([...readChannelList("node.color", "red blue")], [], "not a list channel");
    });
});
