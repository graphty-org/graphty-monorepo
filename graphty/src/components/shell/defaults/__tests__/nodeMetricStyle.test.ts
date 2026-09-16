import { describe, expect, it } from "vitest";

import { NODE_METRIC_DEFINITIONS, NODE_METRIC_IDS } from "../../analysis/nodeMetrics";
import { UNENCODED_NODE_COLOR } from "../loadDefaults";
import {
    autoApplyDecision,
    type ColourLayerLike,
    ELEMENT_DEFAULT_LAYER_NAME,
    HAND_BOUND_METADATA_KEY,
    handAuthoredColourLayerName,
    markHandBound,
    NODE_METRIC_LAYER_SOURCE_TAGS,
    NODE_METRIC_LAYER_SOURCES,
    nodeMetricColourLayer,
    nodeMetricLayerName,
    nodeMetricLayerSource,
    VIRIDIS_RAMP,
    viridisAt,
} from "../nodeMetricStyle";

/** The three metrics this slice ships, as the frozen Suggested list already names them. */
const METRICS = NODE_METRIC_IDS;

/** A lowercase six-digit hex, which is what every ramp value must be. */
const HEX = /^#[0-9a-f]{6}$/;

/** A calculatedStyle input path, as the element validates it. */
const RESULT_PATH = /^algorithmResults\./;

/**
 * A layer as the shell's layer list holds it, with only the parts the colour question
 * reads filled in.
 * @param layer - the parts under test.
 * @param layer.name - the layer's own name, as the list shows it.
 * @param layer.algorithmSource - the tag a run's layer carries; omitted means hand-authored.
 * @param layer.handBound - what the shell writes once a person edits the layer's node half.
 * @param layer.style - the node half's static style.
 * @param layer.calculatedStyle - the node half's calculated style.
 * @returns the layer.
 */
function layerOf(layer: {
    readonly name?: string;
    readonly algorithmSource?: string;
    readonly handBound?: unknown;
    readonly style?: Record<string, unknown>;
    readonly calculatedStyle?: Record<string, unknown>;
}): ColourLayerLike {
    return {
        ...(layer.name === undefined ? {} : { name: layer.name }),
        metadata: {
            ...(layer.name === undefined ? {} : { name: layer.name }),
            ...(layer.algorithmSource === undefined ? {} : { algorithmSource: layer.algorithmSource }),
            ...(layer.handBound === undefined ? {} : { [HAND_BOUND_METADATA_KEY]: layer.handBound }),
        },
        styleLayer: {
            node: {
                style: layer.style ?? {},
                ...(layer.calculatedStyle === undefined ? {} : { calculatedStyle: layer.calculatedStyle }),
            },
        },
    };
}

/** graphty-element's own base layer, which every stack opens with (Styles.ts:54-67). */
const ELEMENT_DEFAULT_LAYER = layerOf({
    name: ELEMENT_DEFAULT_LAYER_NAME,
    style: { shape: { type: "icosphere", size: 1 }, texture: { color: UNENCODED_NODE_COLOR }, enabled: true },
});

describe("NODE_METRIC_LAYER_SOURCES", () => {
    /* The tag is what `removeLayersFromSource` matches on, and it is written into a layer
       that outlives the run, so these boards are the only thing standing between a renamed
       definition and a stack of layers nothing can retire. */
    it("tags each metric with the element's own namespace and type", () => {
        for (const metric of METRICS) {
            expect(NODE_METRIC_LAYER_SOURCES[metric]).toBe(`graphty:${NODE_METRIC_DEFINITIONS[metric].type}`);
        }
    });

    it("is the same '<namespace>:<type>' shape the element's own suggested layers carry", () => {
        for (const metric of METRICS) {
            const definition = NODE_METRIC_DEFINITIONS[metric];

            expect(NODE_METRIC_LAYER_SOURCES[metric]).toBe(`${definition.namespace}:${definition.type}`);
        }
    });

    it("hands the same tag back through nodeMetricLayerSource", () => {
        for (const metric of METRICS) {
            expect(nodeMetricLayerSource(metric)).toBe(NODE_METRIC_LAYER_SOURCES[metric]);
        }
    });

    it("names all three metrics and nothing else, so a caller can clear the channel blind", () => {
        expect([...NODE_METRIC_LAYER_SOURCE_TAGS].sort()).toEqual(
            ["graphty:betweenness", "graphty:degree", "graphty:pagerank"].sort(),
        );
        expect(NODE_METRIC_LAYER_SOURCE_TAGS).toHaveLength(METRICS.length);
    });

    it("gives no two metrics the same tag, or one retirement would take the other's layer", () => {
        expect(new Set(NODE_METRIC_LAYER_SOURCE_TAGS).size).toBe(NODE_METRIC_LAYER_SOURCE_TAGS.length);
    });
});

describe("nodeMetricLayerName", () => {
    it("draws the 6.3 pair on one line, as COMMUNITY_LAYER_NAME does", () => {
        expect(nodeMetricLayerName("betweenness")).toBe("Bridges (Betweenness centrality)");
    });

    it("takes both halves from the definitions, for every metric", () => {
        for (const metric of METRICS) {
            const definition = NODE_METRIC_DEFINITIONS[metric];

            expect(nodeMetricLayerName(metric)).toBe(`${definition.plainName} (${definition.technicalName})`);
        }
    });

    it("keeps the technical half, so a layer opened days later still says what measured it", () => {
        for (const metric of METRICS) {
            expect(nodeMetricLayerName(metric)).toContain(NODE_METRIC_DEFINITIONS[metric].technicalName);
        }
    });
});

describe("VIRIDIS_RAMP", () => {
    it("is the ten anchors of the element's own VIRIDIS_COLORS, in order", () => {
        expect(VIRIDIS_RAMP).toEqual([
            "#440154",
            "#482878",
            "#3e4989",
            "#31688e",
            "#26828e",
            "#1f9e89",
            "#35b779",
            "#6ece58",
            "#b5de2b",
            "#fde724",
        ]);
    });
});

describe("viridisAt", () => {
    it("returns the ramp's ends at 0 and 1", () => {
        expect(viridisAt(0)).toBe("#440154");
        expect(viridisAt(1)).toBe("#fde724");
    });

    /* The element's own doc block (utils/styleHelpers/color/sequential.ts:22-24) labels the
       three anchors 0.0, 0.5 and 1.0. Two of those are exact; the middle one is loose. Ten
       anchors spread over [0,1] sit at NINTHS, so the teal #1f9e89 is the value at 5/9 and
       0.5 lands between #26828e and #1f9e89. What matters is that this function agrees with
       interpolatePalette rather than with its doc block, because the swatch and the mesh
       are two drawings of the same number -- so both values are pinned. */
    it("puts the teal the element's doc block calls 'viridis(0.5)' at its real place, 5/9", () => {
        expect(viridisAt(5 / 9)).toBe("#1f9e89");
    });

    it("interpolates at 0.5 exactly as the element does, between the fifth and sixth anchors", () => {
        expect(viridisAt(0.5)).toBe("#23908c");
    });

    it("returns every anchor exactly, at every ninth", () => {
        VIRIDIS_RAMP.forEach((anchor, index) => {
            expect(viridisAt(index / (VIRIDIS_RAMP.length - 1))).toBe(anchor);
        });
    });

    it("clamps outside [0,1] rather than running off the ramp", () => {
        expect(viridisAt(-1)).toBe("#440154");
        expect(viridisAt(2)).toBe("#fde724");
    });

    /* The element's version throws here: NaN survives its clamp, indexes the palette as
       `colors[NaN]` and its hexToRgb throws "Invalid hex color: undefined". A legend swatch
       is drawn during render, so a throw would take the panel down over a missing number. */
    it("returns the first anchor for a non-finite input rather than throwing", () => {
        expect(viridisAt(Number.NaN)).toBe("#440154");
        expect(viridisAt(Number.POSITIVE_INFINITY)).toBe("#440154");
        expect(viridisAt(Number.NEGATIVE_INFINITY)).toBe("#440154");
    });

    it("moves with the fraction, so two nearby values are two colours", () => {
        expect(viridisAt(0.2)).not.toBe(viridisAt(0.3));
    });

    it("always emits a lowercase six-digit hex", () => {
        for (let step = 0; step <= 100; step++) {
            expect(viridisAt(step / 100)).toMatch(HEX);
        }

        expect(viridisAt(-5)).toMatch(HEX);
        expect(viridisAt(5)).toMatch(HEX);
        expect(viridisAt(Number.NaN)).toMatch(HEX);
    });
});

describe("nodeMetricColourLayer", () => {
    it("keeps calculatedStyle a SIBLING of style, which is the rule a nesting silently breaks", () => {
        for (const metric of METRICS) {
            const layer = nodeMetricColourLayer(metric);

            expect(layer.node.style).toBeDefined();
            expect((layer.node.style as Record<string, unknown>).calculatedStyle).toBeUndefined();
            expect(layer.node.calculatedStyle).toBeDefined();
        }
    });

    it("reads only algorithmResults.*, and writes only style.texture.color", () => {
        for (const metric of METRICS) {
            const calculated = nodeMetricColourLayer(metric).node.calculatedStyle;

            expect(calculated?.output).toBe("style.texture.color");

            for (const input of calculated?.inputs ?? []) {
                expect(input).toMatch(RESULT_PATH);
            }
        }
    });

    it("reads the metric's own normalised field, at the element's own coordinates", () => {
        for (const metric of METRICS) {
            const definition = NODE_METRIC_DEFINITIONS[metric];
            const inputs = nodeMetricColourLayer(metric).node.calculatedStyle?.inputs ?? [];

            expect(inputs).toEqual([
                `algorithmResults.${definition.namespace}.${definition.type}.${definition.fractionField}`,
            ]);
            expect(inputs[0].split(".").at(-1)).toBe(definition.fractionField);
        }
    });

    /* viridis(0) is the ramp's MINIMUM. Without the guard an unmeasured node -- one the run
       never reached, carrying no result at all -- would be painted deep purple, which says
       it was measured and found least important. */
    it("keeps the neutral colour for a node the run never reached", () => {
        for (const metric of METRICS) {
            const { expr } = nodeMetricColourLayer(metric).node.calculatedStyle ?? { expr: "" };

            expect(expr).toContain('typeof arguments[0] === "number"');
            expect(expr).toContain(`"${UNENCODED_NODE_COLOR}"`);
            expect(expr).toContain("StyleHelpers.color.sequential.viridis(arguments[0])");
        }
    });

    it("asks the element for the ramp rather than shipping a palette into the layer", () => {
        const { expr } = nodeMetricColourLayer("degree").node.calculatedStyle ?? { expr: "" };

        for (const anchor of VIRIDIS_RAMP) {
            expect(expr).not.toContain(anchor);
        }
    });

    it("tags itself so the same route that retires a community layer retires this one", () => {
        for (const metric of METRICS) {
            expect(nodeMetricColourLayer(metric).metadata.algorithmSource).toBe(nodeMetricLayerSource(metric));
        }
    });

    it("names itself with the 6.3 pair and says what it does", () => {
        const layer = nodeMetricColourLayer("pagerank");

        expect(layer.metadata.name).toBe(nodeMetricLayerName("pagerank"));
        expect(layer.metadata.description).toBe(
            `Colors nodes by ${NODE_METRIC_DEFINITIONS.pagerank.technicalName} (spec 2307).`,
        );
    });

    it("matches every node, so the layer names no dataset", () => {
        for (const metric of METRICS) {
            expect(nodeMetricColourLayer(metric).node.selector).toBe("");
        }
    });

    /* The canvas ground is the element's clear colour #F5F5F5, so the element's own
       #000000 label default reads 19.26:1 against it. A layer that named a label colour
       here would be the 1.1:1 mistake of 2026-09-13 all over again. */
    it("says nothing whatever about labels", () => {
        for (const metric of METRICS) {
            const layer = nodeMetricColourLayer(metric);

            expect(layer.node.style).toEqual({});
            expect(JSON.stringify(layer)).not.toContain("label");
        }
    });

    it("is node-only and decided by the metric alone", () => {
        expect(Object.keys(nodeMetricColourLayer("degree"))).toEqual(["metadata", "node"]);
        expect(nodeMetricColourLayer("degree")).toEqual(nodeMetricColourLayer("degree"));
        expect(nodeMetricColourLayer("degree")).not.toEqual(nodeMetricColourLayer("betweenness"));
    });
});

describe("handAuthoredColourLayerName", () => {
    it("finds nothing over an empty list", () => {
        expect(handAuthoredColourLayerName([])).toBeUndefined();
    });

    it("finds a hand-authored layer that sets texture.color", () => {
        expect(
            handAuthoredColourLayerName([layerOf({ name: "My colours", style: { texture: { color: "#ff0000" } } })]),
        ).toBe("My colours");
    });

    it("finds a hand-authored layer that calculates into style.texture.color", () => {
        expect(
            handAuthoredColourLayerName([
                layerOf({
                    name: "By weight",
                    calculatedStyle: { inputs: ["data.weight"], output: "style.texture.color", expr: "{}" },
                }),
            ]),
        ).toBe("By weight");
    });

    /* Without this exclusion every graph would look like it had a hand-authored colour
       layer, because the element unshifts one into every stack, and auto-apply would be
       suppressed forever -- no metric would ever paint, on any file. */
    it("ignores the element's own 'default' layer, which sets texture.color and carries no source", () => {
        expect(handAuthoredColourLayerName([ELEMENT_DEFAULT_LAYER])).toBeUndefined();
    });

    it("ignores a layer a run produced", () => {
        expect(
            handAuthoredColourLayerName([
                layerOf({
                    name: nodeMetricLayerName("degree"),
                    algorithmSource: nodeMetricLayerSource("degree"),
                    calculatedStyle: { inputs: ["algorithmResults.graphty.degree.degreePct"], output: "style.texture.color", expr: "{}" },
                }),
            ]),
        ).toBeUndefined();
    });

    it("ignores a hand-authored layer that drives some other channel", () => {
        expect(
            handAuthoredColourLayerName([
                layerOf({ name: "Bigger nodes", style: { shape: { size: 4 } } }),
                layerOf({
                    name: "Label rule",
                    calculatedStyle: { inputs: ["data.degree"], output: "style.label.enabled", expr: "{}" },
                }),
            ]),
        ).toBeUndefined();
    });

    it("returns the FIRST holder, over the element's base layer and a run's layer", () => {
        expect(
            handAuthoredColourLayerName([
                ELEMENT_DEFAULT_LAYER,
                layerOf({ name: "Run layer", algorithmSource: "graphty:louvain", style: { texture: { color: "#00ff00" } } }),
                layerOf({ name: "First hand", style: { texture: { color: "#ff0000" } } }),
                layerOf({ name: "Second hand", style: { texture: { color: "#0000ff" } } }),
            ]),
        ).toBe("First hand");
    });

    it("prefers the name the layer list shows over the element metadata's copy", () => {
        expect(
            handAuthoredColourLayerName([
                {
                    name: "Renamed by hand",
                    metadata: { name: "Old name" },
                    styleLayer: { node: { style: { texture: { color: "#ff0000" } } } },
                },
            ]),
        ).toBe("Renamed by hand");
    });

    it("still suppresses for an unnamed holder, and says so readably", () => {
        expect(handAuthoredColourLayerName([layerOf({ style: { texture: { color: "#ff0000" } } })])).toBe(
            "an unnamed layer",
        );
    });

    it("ignores a layer with no node half at all", () => {
        expect(handAuthoredColourLayerName([{ name: "Edges only", styleLayer: {} }])).toBeUndefined();
    });

    /* Limit 2's SECOND clause (spec 2222-2226), which had no implementation at all until
       the hand-bound flag: the in-place edit branch preserves `algorithmSource` on
       purpose, so before this the edited layer read exactly like a pristine one and the
       next run's removeLayersFromSource deleted the reader's own edit without a word. */
    it("treats a run's layer the user has re-bound by hand as a hand", () => {
        expect(
            handAuthoredColourLayerName([
                ELEMENT_DEFAULT_LAYER,
                layerOf({
                    name: nodeMetricLayerName("degree"),
                    algorithmSource: nodeMetricLayerSource("degree"),
                    handBound: true,
                    style: { texture: { color: "#ff0000" } },
                    calculatedStyle: {
                        inputs: ["algorithmResults.graphty.degree.degreePct"],
                        output: "style.texture.color",
                        expr: "{}",
                    },
                }),
            ]),
        ).toBe(nodeMetricLayerName("degree"));
    });

    it("names a re-bound run layer by the name the list shows, after a rename", () => {
        expect(
            handAuthoredColourLayerName([
                {
                    name: "My ramp",
                    metadata: {
                        name: "My ramp",
                        algorithmSource: nodeMetricLayerSource("pagerank"),
                        [HAND_BOUND_METADATA_KEY]: true,
                    },
                    styleLayer: { node: { style: { texture: { color: "#ff0000" } } } },
                },
            ]),
        ).toBe("My ramp");
    });

    /* The flag only ever says "a hand is on this layer"; it does not say the layer drives
       colour. A run layer whose colour half the user removed holds no channel, exactly as
       a hand-made size layer holds none. */
    it("does not let the flag alone suppress a layer that drives some other channel", () => {
        expect(
            handAuthoredColourLayerName([
                layerOf({
                    name: "Sized by rank",
                    algorithmSource: nodeMetricLayerSource("pagerank"),
                    handBound: true,
                    style: { shape: { size: 4 } },
                }),
            ]),
        ).toBeUndefined();
    });

    /* Strictly `true`. Metadata is a loose bag that survives a template save and reload,
       and a truthiness read would let a hand-written `"false"` suppress auto-apply on
       every graph forever. */
    it("reads only a boolean true as a hand, not any truthy value", () => {
        for (const value of ["false", "true", 1, {}]) {
            expect(
                handAuthoredColourLayerName([
                    layerOf({
                        name: nodeMetricLayerName("degree"),
                        algorithmSource: nodeMetricLayerSource("degree"),
                        handBound: value,
                        style: { texture: { color: "#ff0000" } },
                    }),
                ]),
            ).toBeUndefined();
        }
    });

    /* The element's own base layer carries a full parsed NodeStyle and no algorithmSource,
       and the name exclusion must keep winning over the flag: were a template ever to
       arrive with the flag on it, auto-apply would be suppressed on every graph forever
       and no metric would ever paint. */
    it("still ignores the element's own layers even if something flags them", () => {
        expect(
            handAuthoredColourLayerName([
                layerOf({
                    name: ELEMENT_DEFAULT_LAYER_NAME,
                    handBound: true,
                    style: { texture: { color: UNENCODED_NODE_COLOR } },
                }),
            ]),
        ).toBeUndefined();
    });
});

describe("markHandBound", () => {
    it("writes the flag the hand check reads", () => {
        expect(markHandBound(undefined)).toEqual({ [HAND_BOUND_METADATA_KEY]: true });
    });

    /* The tag MUST survive: "Delete layer", a dataset boundary and a rerun that replaces
       all remove by tag, so an untagged layer is an orphan nothing can retire. */
    it("keeps the name, the description and above all the algorithmSource", () => {
        const before = {
            name: nodeMetricLayerName("degree"),
            description: "Colors nodes by Degree centrality (spec 2307).",
            algorithmSource: nodeMetricLayerSource("degree"),
        };

        expect(markHandBound(before)).toEqual({ ...before, [HAND_BOUND_METADATA_KEY]: true });
    });

    it("returns a new object and does not touch the one it was handed", () => {
        const before: Record<string, unknown> = { name: "Mine" };
        const after = markHandBound(before);

        expect(after).not.toBe(before);
        expect(before).toEqual({ name: "Mine" });
    });

    it("is idempotent, so a second edit to the same layer changes nothing", () => {
        expect(markHandBound(markHandBound({ name: "Mine" }))).toEqual(markHandBound({ name: "Mine" }));
    });

    /* The round trip the shell actually performs: build the run's layer, edit its node
       half, and ask the decision again. Before the flag this answered "apply" and the
       next run deleted the edited layer. */
    it("turns a run's own layer into a hand that suppresses the next run", () => {
        const built = nodeMetricColourLayer("degree");
        const pristine: ColourLayerLike = {
            name: built.metadata.name,
            metadata: built.metadata,
            /* The calculated half is spread into a plain record because the descriptor's
               own interface carries no index signature, which is exactly the widening the
               shell's layerConversion performs on the way out of the element. */
            styleLayer: { node: { style: built.node.style, calculatedStyle: { ...built.node.calculatedStyle } } },
        };

        expect(autoApplyDecision({ layers: [pristine], alreadyAppliedInBatch: false })).toEqual({ kind: "apply" });

        const edited: ColourLayerLike = {
            ...pristine,
            metadata: markHandBound(pristine.metadata),
            styleLayer: { node: { ...pristine.styleLayer.node, style: { texture: { color: "#ff0000" } } } },
        };

        expect(autoApplyDecision({ layers: [edited], alreadyAppliedInBatch: false })).toEqual({
            kind: "suppressed",
            heldBy: nodeMetricLayerName("degree"),
        });
    });
});

describe("autoApplyDecision", () => {
    /* Spec 2209-2218: a run applies its shape's primary action automatically and
       identically from every route, and there is no preference for turning it off. */
    it("applies over an empty layer list", () => {
        expect(autoApplyDecision({ layers: [], alreadyAppliedInBatch: false })).toEqual({ kind: "apply" });
    });

    it("applies over the element's own stack, which is what a fresh graph actually holds", () => {
        expect(autoApplyDecision({ layers: [ELEMENT_DEFAULT_LAYER], alreadyAppliedInBatch: false })).toEqual({
            kind: "apply",
        });
    });

    it("suppresses over a hand, naming the layer that holds the channel (limit 2)", () => {
        expect(
            autoApplyDecision({
                layers: [ELEMENT_DEFAULT_LAYER, layerOf({ name: "My colours", style: { texture: { color: "#ff0000" } } })],
                alreadyAppliedInBatch: false,
            }),
        ).toEqual({ kind: "suppressed", heldBy: "My colours" });
    });

    it("suppresses the second run of a batch, so six runs never paint six times (limit 3)", () => {
        expect(autoApplyDecision({ layers: [], alreadyAppliedInBatch: true })).toEqual({
            kind: "suppressed",
            heldBy: "an earlier run in this batch",
        });
    });

    it("lets the hand outrank the batch when both hold", () => {
        expect(
            autoApplyDecision({
                layers: [layerOf({ name: "My colours", style: { texture: { color: "#ff0000" } } })],
                alreadyAppliedInBatch: true,
            }),
        ).toEqual({ kind: "suppressed", heldBy: "My colours" });
    });

    it("suppresses over a run layer the user has re-bound by hand, and names it (limit 2, second clause)", () => {
        expect(
            autoApplyDecision({
                layers: [
                    ELEMENT_DEFAULT_LAYER,
                    layerOf({
                        name: nodeMetricLayerName("degree"),
                        algorithmSource: nodeMetricLayerSource("degree"),
                        handBound: true,
                        calculatedStyle: {
                            inputs: ["algorithmResults.graphty.degree.degreePct"],
                            output: "style.texture.color",
                            expr: "{}",
                        },
                    }),
                ],
                alreadyAppliedInBatch: false,
            }),
        ).toEqual({ kind: "suppressed", heldBy: nodeMetricLayerName("degree") });
    });

    it("does not treat the layer a previous metric run left as a hand", () => {
        expect(
            autoApplyDecision({
                layers: [
                    ELEMENT_DEFAULT_LAYER,
                    layerOf({
                        name: nodeMetricLayerName("degree"),
                        algorithmSource: nodeMetricLayerSource("degree"),
                        calculatedStyle: { inputs: ["algorithmResults.graphty.degree.degreePct"], output: "style.texture.color", expr: "{}" },
                    }),
                ],
                alreadyAppliedInBatch: false,
            }),
        ).toEqual({ kind: "apply" });
    });
});
