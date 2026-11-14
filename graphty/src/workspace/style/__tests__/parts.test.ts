import { type Channel, CHANNELS, channelsFor } from "@graphty/graphty-element/catalog";
import { assert, describe, it } from "vitest";

import { SEARCH_ALIASES } from "../parts/aliases";
import { findSettings, itemWord, partWord } from "../parts/find";
import { homeOf, itemChannels, NOT_OFFERED, PART_WORDS, partChannels, PARTS, partsFor } from "../parts/parts";
import { experimentChannelsOff } from "../words";

/** Every place a channel is listed in the map, as "side part item". */
function placesOf(channel: Channel): string[] {
    return (["node", "edge"] as const).flatMap((side) =>
        PARTS[side].flatMap((part) =>
            part.items
                .filter((item) =>
                    [
                        ...(item.main ?? []),
                        ...(item.tail ?? []),
                        ...(item.quiet ?? []),
                        ...Object.values(item.pages ?? {}).flat(),
                    ].includes(channel),
                )
                .map((item) => `${side} ${part.id} ${item.id}`),
        ),
    );
}

describe("the Style panel's parts of the drawing", () => {
    it("every channel graphty-element publishes has exactly one home", () => {
        for (const side of ["node", "edge"] as const) {
            for (const { channel } of channelsFor(side)) {
                assert.isDefined(homeOf(channel), `${channel} has no home`);
            }
        }
    });

    it("no channel has two homes", () => {
        for (const channel of CHANNELS) {
            const places = placesOf(channel);
            assert.isAtMost(places.length, 1, `${channel}: ${places.join("; ")}`);
            if (places.length === 1) {
                assert.notProperty(NOT_OFFERED, channel, `${channel} is placed and not offered`);
            }
        }
    });

    it("a home sits in its channel's own kind", () => {
        for (const side of ["node", "edge"] as const) {
            for (const part of PARTS[side]) {
                for (const channel of partChannels(part)) {
                    assert.isTrue(channel.startsWith(`${side}.`), `${channel} sits under ${side}`);
                }
            }
        }
    });

    it("size mode and draw order are quiet", () => {
        for (const channel of ["node.sizeMode", "node.drawOrder"] as const) {
            const home = homeOf(channel);
            assert.isTrue(home !== undefined && "tier" in home && home.tier === "quiet", channel);
        }
    });

    it("every PART_WORDS and SEARCH_ALIASES key is a channel the element publishes", () => {
        const known = new Set<string>(CHANNELS);
        for (const key of [...Object.keys(PART_WORDS), ...Object.keys(SEARCH_ALIASES), ...Object.keys(NOT_OFFERED)]) {
            assert.isTrue(known.has(key), key);
        }
    });

    it("no alias names a program", () => {
        const programs =
            /\b(yed|graphviz|cytoscape|gephi|graphml|gexf|dot|cx2?|visio|inkscape|illustrator|svg|css|sigma|vis)\b/i;
        for (const words of Object.values(SEARCH_ALIASES)) {
            for (const word of words ?? []) {
                assert.notMatch(word, programs, word);
            }
        }
        for (const side of ["node", "edge"] as const) {
            for (const part of PARTS[side]) {
                assert.notMatch(part.title, programs, part.title);
                for (const item of part.items) {
                    assert.notMatch(item.name, programs, item.name);
                }
            }
        }
    });

    it("Find a setting finds every setting by its own name", () => {
        for (const side of ["node", "edge"] as const) {
            for (const part of PARTS[side].filter((each) => each.id !== "shaders")) {
                for (const channel of partChannels(part)) {
                    const found = findSettings(side, partWord(channel)).flatMap((group) => group.channels);
                    assert.include(found, channel, partWord(channel));
                }
            }
        }
    });

    it("Find a setting finds the border by the word stroke, headed by its part", () => {
        const groups = findSettings("node", "stroke");
        const border = groups.find((group) => group.heading === "Border");
        assert.includeMembers([...(border?.channels ?? [])], ["node.borderColor", "node.borderWidth"]);
    });

    it("every channel graphty-element draws has a place in the panel, none only a reason", () => {
        for (const side of ["node", "edge"] as const) {
            for (const { channel, renderable } of channelsFor(side)) {
                const home = homeOf(channel);
                if (renderable) {
                    assert.isFalse(home !== undefined && "notOffered" in home, `${channel} is drawn but not offered`);
                }
            }
        }
    });

    it("with the cosmograph and node-models experiments off, their settings are nowhere in the panel", () => {
        const off = experimentChannelsOff({ cosmograph: false, nodeModels: false });
        const gated = [
            "edge.fadeStart",
            "edge.fadeEnd",
            "edge.fadeOpacity",
            "edge.blending",
            "node.model",
            "node.texture",
        ];
        for (const side of ["node", "edge"] as const) {
            const parts = partsFor(side, off);
            const listed = parts.flatMap(partChannels);
            for (const channel of gated) {
                assert.notInclude(listed, channel);
            }
            for (const query of ["blending", "fade", "picture", "model"]) {
                const found = findSettings(side, query, parts).flatMap((group) => group.channels);
                assert.isTrue(
                    found.every((channel) => !gated.includes(channel)),
                    `${query} finds ${found.join(", ")}`,
                );
            }
        }
        assert.notInclude(
            partsFor("node", off).flatMap((part) => part.items.map((item) => item.id)),
            "picture",
            "an item left with no setting is dropped",
        );
        assert.strictEqual(partsFor("edge", experimentChannelsOff({ cosmograph: true, nodeModels: true })), PARTS.edge);
    });

    it("no two settings of an item read alike under its heading", () => {
        for (const side of ["node", "edge"] as const) {
            for (const part of PARTS[side].filter((each) => each.id !== "shaders")) {
                for (const item of part.items) {
                    const words = itemChannels(item).map((channel) => itemWord(channel, item));
                    const twice = words.filter((word, at) => words.indexOf(word) !== at);
                    assert.deepEqual(twice, [], `${side} ${part.id} ${item.id}`);
                    assert.notInclude(words, item.name, `${item.name} repeats its heading`);
                }
            }
        }
        const halo = PARTS.node.flatMap((part) => part.items).find((item) => item.id === "halo");
        assert.isDefined(halo);
        if (halo !== undefined) {
            assert.deepEqual(
                ["node.halo", "node.haloColor"].map((channel) => itemWord(channel as Channel, halo)),
                ["On", "Color"],
            );
        }
    });

    it("the middle ends and the end captions are named as the panel names their items", () => {
        assert.strictEqual(partWord("edge.arrowMiddleHeadSize"), "Middle target end size");
        assert.strictEqual(partWord("edge.arrowTailTextColor"), "Source caption color");
        for (const channel of CHANNELS) {
            assert.notMatch(partWord(channel), /^(Arrow middle|Label at )/, channel);
        }
    });
});
