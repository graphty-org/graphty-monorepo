/**
 * @file The space-separated list channels: which ones they are (`listOf`) and the one reader and
 * writer for their items.
 */

import { assert, describe, it } from "vitest";

import {
    channelDescriptor,
    CHANNELS,
    listShares,
    readChannelList,
    setListShare,
    writeChannelList,
} from "../../catalog";

const LISTS = [
    "node.gradientColors",
    "node.gradientStops",
    "node.pieColors",
    "node.pieSizes",
    "node.pieOpacities",
    "node.stripeColors",
    "node.stripeSizes",
    "node.stripeOpacities",
    "node.stripeFrame",
    "node.chartColors",
    "node.chartValues",
    "edge.gradientColors",
    "edge.gradientStops",
    "edge.strandColors",
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

describe("positional list items", () => {
    it("keepPlace reads a word that is no number as undefined, and the writer writes it back as auto", () => {
        assert.deepEqual([...readChannelList("node.stripeSizes", "0.2 auto 0.3")], [0.2, 0.3]);
        assert.deepEqual(
            [...readChannelList("node.stripeSizes", "0.2 auto 0.3", { keepPlace: true })],
            [0.2, undefined, 0.3],
        );
        assert.equal(writeChannelList("node.stripeSizes", [0.2, undefined, 0.3]), "0.2 auto 0.3");
    });

    it("listShares gives what the renderer draws: set shares capped in order, unset ones splitting the rest", () => {
        assert.deepEqual([...listShares("node.stripeSizes", undefined, 2)], [0.5, 0.5]);
        const around = listShares("node.stripeSizes", "auto 0.6", 3);
        [0.2, 0.6, 0.2].forEach((share, at) => {
            assert.closeTo(around[at], share, 1e-9);
        });
        const capped = listShares("node.stripeSizes", "0.7 0.7", 3);
        assert.closeTo(capped[0], 0.7, 1e-9);
        assert.closeTo(capped[1], 0.3, 1e-9);
        assert.equal(capped[2], 0);
    });

    it("setListShare writes the edited share as given and lowers the later set shares first, then the earlier", () => {
        assert.equal(setListShare("node.stripeSizes", "0.3 0.3 0.3", 3, 0, 0.6), "0.6 0.3 0.1");
        assert.equal(setListShare("node.stripeSizes", "0.3 0.3 0.3", 3, 2, 0.9), "0.1 0 0.9");
        // Unset shares are never written: they take what is left.
        assert.equal(setListShare("node.stripeSizes", undefined, 3, 1, 0.5), "auto 0.5");
        // Unsetting a middle share keeps the later ones in place.
        assert.equal(setListShare("node.stripeSizes", "0.2 0.3 0.4", 3, 1, undefined), "0.2 auto 0.4");
        // One edit from one base: a drag back restores the others.
        const base = "0.5 0.3 0.2";
        setListShare("node.stripeSizes", base, 3, 0, 1);
        assert.equal(setListShare("node.stripeSizes", base, 3, 0, 0.5), "0.5 0.3 0.2");
    });
});
