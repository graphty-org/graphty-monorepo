import { describe, expect, it } from "vitest";

import { LABEL_TEXT_COLOR } from "../loadDefaults";
import {
    COMMUNITY_COLOUR_CAP,
    COMMUNITY_LAYER_NAME,
    COMMUNITY_LAYER_SOURCE,
    COMMUNITY_PALETTE,
    communityColourLayers,
    type StyleLayerDescriptor,
    topDegreeLabelLayer,
} from "../styleDescriptors";

const INPUT_PATH = /^(data|algorithmResults)\./;

/**
 * Every layer this module builds, so the shape rules can be asserted over all of them
 * at once rather than one function at a time.
 * @returns one of each layer kind.
 */
function everyLayer(): readonly StyleLayerDescriptor[] {
    return [
        topDegreeLabelLayer({ degreeThreshold: 3 }),
        ...communityColourLayers([
            { communityId: 0, size: 7 },
            { communityId: 1, size: 5 },
        ]),
    ];
}

describe("every layer descriptor", () => {
    it("names itself", () => {
        for (const layer of everyLayer()) {
            expect(layer.metadata.name).not.toBe("");
        }
    });

    it("is node-only", () => {
        for (const layer of everyLayer()) {
            expect(Object.keys(layer)).toEqual(["metadata", "node"]);
        }
    });

    it("never nests a calculatedStyle inside style, which would be silently dropped", () => {
        for (const layer of everyLayer()) {
            expect("calculatedStyle" in layer.node.style).toBe(false);
        }
    });

    it("outputs only into style.* and reads only data.* or algorithmResults.*", () => {
        for (const layer of everyLayer()) {
            const calculated = layer.node.calculatedStyle;

            if (calculated === undefined) {
                continue;
            }

            expect(calculated.output.startsWith("style.")).toBe(true);

            for (const input of calculated.inputs) {
                expect(input).toMatch(INPUT_PATH);
            }
        }
    });

    it("never outputs a calculated value into style.label, which throws in ChangeManager", () => {
        for (const layer of everyLayer()) {
            expect(layer.node.calculatedStyle?.output.startsWith("style.label")).not.toBe(true);
        }
    });
});

describe("topDegreeLabelLayer", () => {
    it("selects on the degree cut with a backticked JMESPath literal", () => {
        expect(topDegreeLabelLayer({ degreeThreshold: 3 }).node.selector).toBe(
            "algorithmResults.graphty.degree.degree >= `3`",
        );
    });

    it("is a static style, because label.enabled is read only off the merged static style", () => {
        const layer = topDegreeLabelLayer({ degreeThreshold: 3 });

        expect(layer.node.calculatedStyle).toBeUndefined();
        expect(layer.node.style).toEqual({ label: { enabled: true, textColor: LABEL_TEXT_COLOR } });
    });

    it("draws the node id when no attribute is named", () => {
        const label = topDegreeLabelLayer({ degreeThreshold: 1 }).node.style.label as Record<string, unknown>;

        expect("textPath" in label).toBe(false);
    });

    it("draws the named attribute when one is given", () => {
        const layer = topDegreeLabelLayer({ degreeThreshold: 1, labelAttribute: "name" });

        expect(layer.node.style).toEqual({
            label: { enabled: true, textColor: LABEL_TEXT_COLOR, textPath: "name" },
        });
    });

    describe("the exact label set", () => {
        it("names the given ids and nothing else, so the budget cannot be overshot by a tie", () => {
            const layer = topDegreeLabelLayer({ degreeThreshold: 3, labelNodeIds: ["mochi", "tuna", "pumpkin"] });

            expect(layer.node.selector).toBe('contains(`["mochi","tuna","pumpkin"]`, to_string(id))');
        });

        it("coerces the record's id, because a numerically-identified file carries a number there", () => {
            expect(topDegreeLabelLayer({ degreeThreshold: 3, labelNodeIds: ["1", "34"] }).node.selector).toBe(
                'contains(`["1","34"]`, to_string(id))',
            );
        });

        it("escapes a backtick in an id so it cannot close the literal", () => {
            expect(topDegreeLabelLayer({ degreeThreshold: 3, labelNodeIds: ["a`b", 'c"d'] }).node.selector).toBe(
                'contains(`["a\\`b","c\\"d"]`, to_string(id))',
            );
        });

        it("matches no node for an empty set rather than falling back to the degree cut", () => {
            expect(topDegreeLabelLayer({ degreeThreshold: 3, labelNodeIds: [] }).node.selector).toBe(
                "contains(`[]`, to_string(id))",
            );
        });

        it("keeps the same static label style as the degree-cut form", () => {
            const layer = topDegreeLabelLayer({ degreeThreshold: 3, labelNodeIds: ["mochi"], labelAttribute: "name" });

            expect(layer.node.calculatedStyle).toBeUndefined();
            expect(layer.node.style).toEqual({
                label: { enabled: true, textColor: LABEL_TEXT_COLOR, textPath: "name" },
            });
        });
    });
});

describe("COMMUNITY_PALETTE", () => {
    it("is the eight Okabe-Ito hexes in order", () => {
        expect(COMMUNITY_PALETTE).toEqual([
            "#E69F00",
            "#56B4E9",
            "#009E73",
            "#F0E442",
            "#0072B2",
            "#D55E00",
            "#CC79A7",
            "#999999",
        ]);
    });

    it("has exactly as many entries as the colour cap, which is why the cap is eight", () => {
        expect(COMMUNITY_PALETTE).toHaveLength(COMMUNITY_COLOUR_CAP);
    });

    it("repeats no colour", () => {
        expect(new Set(COMMUNITY_PALETTE).size).toBe(COMMUNITY_PALETTE.length);
    });
});

describe("communityColourLayers", () => {
    const twelveGroups = Array.from({ length: 12 }, (unused, index) => ({
        communityId: index,
        size: 12 - index,
    }));

    it("paints nothing when there are no groups", () => {
        expect(communityColourLayers([])).toEqual([]);
    });

    it("caps at eight layers on twelve groups", () => {
        expect(communityColourLayers(twelveGroups)).toHaveLength(COMMUNITY_COLOUR_CAP);
    });

    it("paints the eight largest, largest first", () => {
        const selectors = communityColourLayers(twelveGroups).map((layer) => layer.node.selector);

        expect(selectors).toEqual([
            "algorithmResults.graphty.louvain.communityId == `0`",
            "algorithmResults.graphty.louvain.communityId == `1`",
            "algorithmResults.graphty.louvain.communityId == `2`",
            "algorithmResults.graphty.louvain.communityId == `3`",
            "algorithmResults.graphty.louvain.communityId == `4`",
            "algorithmResults.graphty.louvain.communityId == `5`",
            "algorithmResults.graphty.louvain.communityId == `6`",
            "algorithmResults.graphty.louvain.communityId == `7`",
        ]);
    });

    it("gives each painted group a distinct palette colour", () => {
        const colours = communityColourLayers(twelveGroups).map(
            (layer) => (layer.node.style.texture as Record<string, unknown>).color as string,
        );

        expect(colours).toEqual([...COMMUNITY_PALETTE]);
        expect(new Set(colours).size).toBe(COMMUNITY_COLOUR_CAP);
    });

    it("orders by size descending, not by the order it was given", () => {
        const layers = communityColourLayers([
            { communityId: 9, size: 2 },
            { communityId: 4, size: 11 },
            { communityId: 7, size: 6 },
        ]);

        expect(layers.map((layer) => layer.node.selector)).toEqual([
            "algorithmResults.graphty.louvain.communityId == `4`",
            "algorithmResults.graphty.louvain.communityId == `7`",
            "algorithmResults.graphty.louvain.communityId == `9`",
        ]);
    });

    it("breaks a size tie on the community id, so the paint is deterministic", () => {
        const ascending = communityColourLayers([
            { communityId: 2, size: 5 },
            { communityId: 1, size: 5 },
            { communityId: 3, size: 5 },
        ]);
        const descending = communityColourLayers([
            { communityId: 3, size: 5 },
            { communityId: 2, size: 5 },
            { communityId: 1, size: 5 },
        ]);

        expect(ascending.map((layer) => layer.node.selector)).toEqual(descending.map((layer) => layer.node.selector));
        expect(ascending[0].node.selector).toBe("algorithmResults.graphty.louvain.communityId == `1`");
    });

    it("does not mutate the caller's array", () => {
        const groups = [
            { communityId: 9, size: 2 },
            { communityId: 4, size: 11 },
        ];

        communityColourLayers(groups);

        expect(groups.map((group) => group.communityId)).toEqual([9, 4]);
    });

    it("tags every layer with the run that produced it, so they can be removed together", () => {
        for (const layer of communityColourLayers(twelveGroups)) {
            expect(layer.metadata.algorithmSource).toBe(COMMUNITY_LAYER_SOURCE);
            expect(layer.metadata.name.startsWith(COMMUNITY_LAYER_NAME)).toBe(true);
        }
    });

    it("numbers its layers by rank from one", () => {
        const names = communityColourLayers(twelveGroups).map((layer) => layer.metadata.name);

        expect(names[0]).toBe(`${COMMUNITY_LAYER_NAME} 1`);
        expect(names[COMMUNITY_COLOUR_CAP - 1]).toBe(`${COMMUNITY_LAYER_NAME} ${String(COMMUNITY_COLOUR_CAP)}`);
    });

    it("uses a selector rather than a calculated colour, so nothing can be dropped", () => {
        for (const layer of communityColourLayers(twelveGroups)) {
            expect(layer.node.calculatedStyle).toBeUndefined();
        }
    });
});
