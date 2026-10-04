import { channelsFor } from "@graphty/graphty-element/catalog";
import { assert, describe, it } from "vitest";

import {
    bindLabel,
    bindsAtRest,
    cellOfLocation,
    enumWords,
    isLineChannel,
    labelStatement,
    locationOfCell,
    matchesWordStart,
    positionWord,
    refusalWords,
    SECTIONS,
} from "../words";

describe("the Style tab's words and arrangement", () => {
    it("draws the design's sections in order, with Size under Shape", () => {
        assert.deepEqual(
            SECTIONS.node.map((s) => s.title),
            ["Fill", "Shape", "Effects", "Label", "Tooltip"],
        );
        assert.deepEqual(
            SECTIONS.edge.map((s) => s.title),
            ["Line", "Arrows", "Label"],
        );
        const size = channelsFor("node").find((d) => d.channel === "node.size");
        assert.isDefined(size);
        assert.equal(SECTIONS.node.find((s) => size !== undefined && s.holds(size))?.title, "Shape");
    });

    it("puts every channel the element publishes in exactly one section, or on the label line", () => {
        for (const target of ["node", "edge"] as const) {
            for (const descriptor of channelsFor(target).filter(isLineChannel)) {
                const homes = SECTIONS[target].filter((s) => s.holds(descriptor));
                assert.lengthOf(homes, 1, descriptor.channel);
            }
        }
    });

    it("shows the bind icon at rest on Color and Size only", () => {
        const at = (channel: string): boolean => {
            const d = channelsFor(channel.startsWith("node") ? "node" : "edge").find((c) => c.channel === channel);
            return d !== undefined && bindsAtRest(d);
        };
        assert.isTrue(at("node.color"));
        assert.isTrue(at("node.size"));
        assert.isFalse(at("node.shape"));
        assert.isFalse(at("node.opacity"));
        const color = channelsFor("node").find((c) => c.channel === "node.color");
        assert.equal(color === undefined ? "" : bindLabel(color), "Color by attribute");
    });

    it("words a refusal from its code and params", () => {
        assert.equal(refusalWords({ code: "E_UNSUPPORTED", params: { measurement: "categorical" } }), "Holds groups, not amounts");
        assert.equal(refusalWords({ code: "E_UNSUPPORTED", params: { measurement: null } }), "Has no values");
        assert.equal(refusalWords({ code: "E_CAP_EXCEEDED", params: { limit: 256 } }), "More than 256 different values");
        assert.equal(refusalWords({ code: "E_SOMETHING_NEW", params: {} }), "Cannot be drawn here");
    });

    it("states the label line's result from the counts, the hidden part only while the overlap rule is on", () => {
        assert.equal(labelStatement({ labeled: 77, hiddenByOverlap: 64 }, true), "77 labels, 64 hidden to avoid overlap");
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
});
