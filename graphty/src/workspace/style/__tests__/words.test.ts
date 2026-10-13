import { channelsFor, PALETTE_DESCRIPTORS } from "@graphty/graphty-element/catalog";
import { assert, describe, it } from "vitest";

import {
    bindLabel,
    cellOfLocation,
    channelWord,
    clearWords,
    CORE_ROWS,
    enumWords,
    fieldStateName,
    labelStatement,
    LISTS,
    locationOfCell,
    matchesWordStart,
    paletteWord,
    positionWord,
    refusalWords,
    resultWord,
    takesBinding,
} from "../words";

describe("the Style tab's words and arrangement", () => {
    it("draws the seven core properties on four paired rows", () => {
        assert.deepEqual(
            CORE_ROWS.node.map((r) => r.fields),
            [["node.shape", "node.size"], ["node.color"]],
        );
        assert.deepEqual(
            CORE_ROWS.edge.map((r) => r.fields),
            [
                ["edge.color", "edge.width"],
                ["edge.arrowHead", "edge.arrowTail"],
            ],
        );
    });

    it("gives every channel it names a home the element publishes, and no channel two homes", () => {
        for (const target of ["node", "edge"] as const) {
            const published = new Set(channelsFor(target).map((d) => d.channel));
            const homes = [
                ...CORE_ROWS[target].flatMap((r) => [...r.fields, ...r.settings]),
                ...LISTS[target].flatMap((l) => l.channels),
            ];
            for (const channel of homes) {
                assert.isTrue(published.has(channel), channel);
            }
            assert.equal(new Set(homes).size, homes.length, `${target}: a channel with two homes`);
        }
    });

    it("states a field's state in its name, and what Clear brings back", () => {
        assert.equal(fieldStateName("node.size", "2", undefined), "Node size, set here, 2");
        assert.equal(
            fieldStateName("node.color", undefined, { value: "#3388FF", from: "Degree" }),
            "Node color, not set, Degree gives #3388FF",
        );
        assert.equal(
            fieldStateName("node.color", undefined, { mixed: ["Degree"] }),
            "Node color, not set, mixed beneath",
        );
        assert.equal(
            clearWords({ value: "Icosphere", from: "Everything" }),
            "Clear: back to Icosphere, from Everything",
        );
        assert.equal(clearWords({ mixed: ["Degree", "Louvain"] }), "Clear: back to mixed, from Degree and Louvain");
        assert.equal(clearWords(undefined), "Clear: back to the default");
    });

    it("draws the vary glyph on every channel that takes a binding, never on a yes-or-no one", () => {
        const at = (channel: string): boolean => {
            const d = channelsFor(channel.startsWith("node") ? "node" : "edge").find((c) => c.channel === channel);
            return d !== undefined && takesBinding(d);
        };
        for (const channel of [
            "node.color",
            "node.size",
            "node.shape",
            "node.opacity",
            "node.glow",
            "node.haloSize",
            "node.tooltip",
            "edge.width",
            "edge.style",
            "edge.arrowHead",
            "edge.arrowTailOpacity",
            "edge.animationSpeed",
            "edge.bandColor",
        ]) {
            assert.isTrue(at(channel), channel);
        }
        assert.isFalse(at("node.wireframe"));
        assert.isFalse(at("node.visible"));
        assert.isFalse(at("edge.curvature"));
        assert.isFalse(at("node.labelStyle"));
        const color = channelsFor("node").find((c) => c.channel === "node.color");
        assert.equal(color === undefined ? "" : bindLabel(color), "Color by attribute");
    });

    it("words a refusal from its code and params", () => {
        assert.equal(
            refusalWords({ code: "E_UNSUPPORTED", params: { measurement: "categorical" } }),
            "Holds groups, not amounts",
        );
        assert.equal(refusalWords({ code: "E_UNSUPPORTED", params: { measurement: null } }), "Has no values");
        assert.equal(
            refusalWords({ code: "E_CAP_EXCEEDED", params: { limit: 256 } }),
            "More than 256 different values",
        );
        assert.equal(refusalWords({ code: "E_SOMETHING_NEW", params: {} }), "Cannot be drawn here");
    });

    it("states the label line's result from the counts, the hidden part only while the overlap rule is on", () => {
        assert.equal(labelStatement({ labeled: 77, hiddenByOverlap: 64 }, true), "77 labels, 64 hidden");
        assert.equal(labelStatement({ labeled: 77, hiddenByOverlap: 0 }, false), "77 labels");
        assert.equal(labelStatement({ labeled: 1, hiddenByOverlap: 0 }, false), "1 label");
    });

    it("maps the position grid to the element's label locations and back", () => {
        assert.equal(locationOfCell("top-center"), "top");
        assert.equal(locationOfCell("bottom-center"), "bottom");
        assert.equal(cellOfLocation(undefined), "top-center");
        assert.equal(cellOfLocation("right"), "middle-right");
        assert.equal(positionWord(undefined), "Above");
        assert.equal(positionWord("bottom"), "Below");
    });

    it("matches a search at the start of words", () => {
        assert.isTrue(matchesWordStart("shared chapters", "chap"));
        assert.isTrue(matchesWordStart("PageRank", "page"));
        assert.isFalse(matchesWordStart("shared chapters", "hap"));
        assert.isTrue(matchesWordStart("anything", ""));
        assert.equal(enumWords("tetrahedron-flat"), "Tetrahedron flat");
    });

    it("names every channel, palette and result in the app's words, American spelling", () => {
        for (const target of ["node", "edge"] as const) {
            for (const descriptor of channelsFor(target)) {
                assert.isNotEmpty(channelWord(descriptor.channel), descriptor.channel);
            }
        }
        const shape = channelsFor("node").find((d) => d.channel === "node.shape");
        assert.equal(shape === undefined ? "" : channelWord(shape.channel), "Shape");
        for (const palette of PALETTE_DESCRIPTORS) {
            assert.notMatch(paletteWord(palette.id), /colour/i, palette.id);
        }
        assert.equal(paletteWord("okabe-ito"), "Eight distinct colors");
        assert.equal(paletteWord("someone-elses"), "Someone elses");
        assert.equal(resultWord("PageRank", "value", true), "PageRank");
        assert.equal(resultWord("Degree", "inDegree", false), "Degree in degree");
    });
});
