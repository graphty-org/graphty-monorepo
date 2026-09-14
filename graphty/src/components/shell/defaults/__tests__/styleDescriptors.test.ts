import { describe, expect, it } from "vitest";

import {
    COMMUNITY_COLOUR_CAP,
    COMMUNITY_LAYER_NAME,
    COMMUNITY_LAYER_SOURCE,
    COMMUNITY_PALETTE,
    communityColourLayers,
    DEGREE_INPUT_PATH,
    LABEL_ENABLED_OUTPUT_PATH,
    LOAD_DEFAULTS_LAYER_SOURCE,
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

    /* The inverse of the board that stood here until 2026-09-13, which asserted that no
       layer may output into `style.label` because ChangeManager threw on the path. The
       element fix (`unwrapSchema`) made the path reachable, and the label layer is now the
       one layer that uses it, so the rule this file has to keep is the OUTPUT SHAPE: a
       calculated output is a path into style, and the label layer's is the enabled flag
       rather than any part of how the text looks. */
    it("writes a calculated label verdict into enabled, and nothing about how the text looks", () => {
        const outputs = everyLayer()
            .map((layer) => layer.node.calculatedStyle?.output)
            .filter((output): output is string => output !== undefined);

        for (const output of outputs) {
            if (output.startsWith("style.label")) {
                expect(output).toBe("style.label.enabled");
            }
        }

        expect(outputs).toContain("style.label.enabled");
    });
});

describe("topDegreeLabelLayer", () => {
    /* A RULE, not a list (2026-09-13, the product owner). Every board here is about that
       distinction: the layer matches every node and asks each node's own degree, so it
       carries no node id, no count and nothing that ties it to the file that was open when
       it was made. */
    it("matches every node, so the layer names no dataset", () => {
        expect(topDegreeLabelLayer({ degreeThreshold: 3 }).node.selector).toBe("");
    });

    it("decides per node from the degree the element publishes", () => {
        const calculated = topDegreeLabelLayer({ degreeThreshold: 3 }).node.calculatedStyle;

        expect(calculated?.inputs).toEqual([DEGREE_INPUT_PATH]);
        expect(calculated?.output).toBe(LABEL_ENABLED_OUTPUT_PATH);
        expect(LABEL_ENABLED_OUTPUT_PATH).toBe("style.label.enabled");
    });

    it("names no node id anywhere, at any cut", () => {
        const layer = topDegreeLabelLayer({ degreeThreshold: 4 });

        expect(JSON.stringify(layer)).not.toContain("contains(");
        expect(JSON.stringify(layer)).not.toContain("to_string(id)");
    });

    /* The ignored `labelNodeIds` parameter is GONE as of this change, so the board that
       used to prove it was ignored cannot be written: passing it is a compile error now,
       which is the stronger guarantee. What survives as a runtime claim is that the cut is
       the layer's only input -- the same cut gives the same layer, every time. */
    it("is decided by the cut alone, so the same cut gives the same layer", () => {
        expect(topDegreeLabelLayer({ degreeThreshold: 3 })).toEqual(topDegreeLabelLayer({ degreeThreshold: 3 }));
        expect(topDegreeLabelLayer({ degreeThreshold: 3 })).not.toEqual(topDegreeLabelLayer({ degreeThreshold: 4 }));
    });

    it("sets no text style at all, so the element's own default text is what is drawn", () => {
        /* `enabled` is the layer's whole say. It must not name an ink: the element's
           #000000 default reads 19.26:1 against its own #F5F5F5 canvas, and the dark-panel
           ink this used to set read about 1.1:1 against it (2026-09-13). */
        expect(topDegreeLabelLayer({ degreeThreshold: 3 }).node.style).toEqual({});
    });

    it("draws the node id when no attribute is named", () => {
        expect("label" in topDegreeLabelLayer({ degreeThreshold: 1 }).node.style).toBe(false);
    });

    it("draws the named attribute when one is given, and still names no colour", () => {
        const layer = topDegreeLabelLayer({ degreeThreshold: 1, labelAttribute: "name" });

        expect(layer.node.style).toEqual({ label: { textPath: "name" } });
    });

    it("tags itself as the shell's own, so a dataset boundary can retire it", () => {
        const layer = topDegreeLabelLayer({ degreeThreshold: 3 });

        expect(layer.metadata.algorithmSource).toBe(LOAD_DEFAULTS_LAYER_SOURCE);
        expect(layer.metadata.name).toBe("Top degree labels");
    });

    describe("the rule it computes", () => {
        /* The expression is pinned as a STRING rather than evaluated: the element builds it
           with `new Function`, which this repo's lint forbids here, and
           graphty-element does not export `CalculatedValue` for a test to borrow. So these
           boards pin the two things that can silently go wrong in it, and the rule's real
           behaviour is proved where it actually runs -- graphty-element's own
           change-manager boards for the `style.label.*` path, and the canvas itself. */
        it("compares the node's degree against the cut", () => {
            expect(topDegreeLabelLayer({ degreeThreshold: 4 }).node.calculatedStyle?.expr).toBe(
                'typeof arguments[0] === "number" && arguments[0] >= 4',
            );
        });

        it("carries the cut as a bare number literal, not a string", () => {
            expect(topDegreeLabelLayer({ degreeThreshold: 12 }).node.calculatedStyle?.expr).toContain(">= 12");
            expect(topDegreeLabelLayer({ degreeThreshold: 12 }).node.calculatedStyle?.expr).not.toContain('"12"');
        });

        it("guards on typeof, because null >= 0 is true and an unreached node has no degree", () => {
            // A bare `arguments[0] >= 0` would label every node on a graph whose degree
            // pass never ran, since `null >= 0` passes and `undefined >= 0` does not.
            expect(topDegreeLabelLayer({ degreeThreshold: 0 }).node.calculatedStyle?.expr).toBe(
                'typeof arguments[0] === "number" && arguments[0] >= 0',
            );
        });

        it("reads the same input the degree pass writes", () => {
            expect(topDegreeLabelLayer({ degreeThreshold: 3 }).node.calculatedStyle?.inputs).toEqual([
                DEGREE_INPUT_PATH,
            ]);
            expect(DEGREE_INPUT_PATH).toBe("algorithmResults.graphty.degree.degree");
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
