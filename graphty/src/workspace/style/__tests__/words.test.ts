import { channelsFor, PALETTE_DESCRIPTORS } from "@graphty/graphty-element/catalog";
import { GraphtyError } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";

import {
    bindLabel,
    cellOfLocation,
    channelWord,
    colorName,
    enumWords,
    failureWords,
    labelStatement,
    locationOfCell,
    madeWords,
    matchesWordStart,
    paletteWord,
    positionWord,
    refusalWords,
    SECTIONS,
    takesBinding,
} from "../words";

describe("the Style tab's words and arrangement", () => {
    it("draws Nodes and Edges in their fixed sections", () => {
        assert.deepEqual(
            SECTIONS.node.map((section) => section.title),
            ["Shape", "Visibility", "Text", "Fill", "Effects", "Rendering"],
        );
        assert.deepEqual(
            SECTIONS.edge.map((section) => section.title),
            ["Visibility", "Text", "Line", "Arrowheads", "Effects"],
        );
    });

    it("gives every channel it names a home the element publishes, and no channel two homes", () => {
        for (const target of ["node", "edge"] as const) {
            const published = new Set(channelsFor(target).map((d) => d.channel));
            const homes = SECTIONS[target].flatMap((section) => section.channels);
            for (const channel of homes) {
                assert.isTrue(published.has(channel), channel);
            }
            assert.equal(new Set(homes).size, homes.length, `${target}: a channel with two homes`);
        }
    });

    it("says a color by name", () => {
        const names = ["#E8590C", "#2F9E44", "#1971C2", "#000000", "#FFFFFF", "#868E96", "#5C3A00", "#F783AC"].map(
            colorName,
        );
        assert.deepEqual(names, ["orange", "green", "blue", "black", "white", "gray", "brown", "pink"]);
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
            "node.haloScale",
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
        assert.equal(color === undefined ? "" : bindLabel(color), "Node color by attribute");
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
        // A column of free text says so, whatever the refusal: never "Holds groups" for names.
        assert.equal(
            refusalWords({ code: "E_UNSUPPORTED", params: { measurement: "categorical", valueKind: "text" } }),
            "Holds text, not groups or amounts",
        );
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
    });
});

describe("failure notices", () => {
    it("word the element's reason from its code, never its English message", () => {
        const locked = new GraphtyError({ code: "E_LOCKED", message: "Layer x is locked by row y", source: "style" });
        assert.equal(failureWords("Pattern", "changed", locked), "Pattern could not be changed: its layer is locked.");
        assert.notInclude(failureWords("Pattern", "changed", locked), "row y");
    });

    it("say only what failed when the reason is not one the app words", () => {
        assert.equal(failureWords("The layer", "added", new Error("boom")), "The layer could not be added.");
    });
});

describe("the notice after styling a selection", () => {
    it("does not say a layer named by its count twice", () => {
        assert.equal(madeWords("8 nodes", 8, 0), "Made a layer for the 8 selected nodes");
        assert.equal(madeWords("1 edge", 0, 1), "Made a layer for the selected edge");
        assert.equal(madeWords("3 nodes, 2 edges", 3, 2), "Made a layer for the 3 selected nodes and 2 edges");
    });

    it("names a layer that has a name of its own", () => {
        assert.equal(madeWords("v09", 1, 0), "Made layer v09 for 1 node");
    });
});
