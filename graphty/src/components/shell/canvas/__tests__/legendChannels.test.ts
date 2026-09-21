import type { LegendBlock } from "@graphty/graphty-element/session";
import { describe, expect, it } from "vitest";

import { CANVAS_METRICS } from "../canvasLayout";
import { legendChannelOf, legendChannels } from "../legendChannels";

/**
 * One legend block, as the element derives one from a prepared binding.
 * @param overrides - what this board wants to say about it.
 * @returns the block.
 */
function block(overrides: Partial<LegendBlock> = {}): LegendBlock {
    return {
        channel: "node.color",
        layerId: "layer-1",
        kind: "sequential",
        swatches: [],
        departures: [],
        ...overrides,
    };
}

describe("legendChannelOf", () => {
    it("draws no block for a channel the canvas legend has no row for", () => {
        expect(legendChannelOf(block({ channel: "node.wireframe" }))).toBeNull();
    });

    it("names the channel, the field and the scale from the element's own words", () => {
        const channel = legendChannelOf(
            block({
                field: { plainName: "Connections", technicalName: "degree", path: "results.r1.value" },
                scale: { kind: "linear", label: "linear" },
                swatches: [{ label: "1", value: 1, color: "#440154" }],
            }),
        );

        expect(channel?.channelLabel).toBe("Color");
        expect(channel?.attribute).toBe("Connections");
        expect(channel?.technicalName).toBe("degree");
        expect(channel?.scaleLine).toBe("linear");
        expect(channel?.scaleShort).toBe("linear");
    });

    it("draws a ramp as three stops, the middle one naming itself as the median", () => {
        const channel = legendChannelOf(
            block({
                swatches: [
                    { label: "1", value: 1, color: "#440154" },
                    { label: "3", value: 3, color: "#21918C" },
                    { label: "9", value: 9, color: "#FDE725" },
                ],
            }),
        );

        expect(channel?.stops).toEqual([
            { label: "1", color: "#440154" },
            { label: "median 3", color: "#21918C" },
            { label: "9", color: "#FDE725" },
        ]);
    });

    it("takes the middle stop's colour from the swatch rather than from the palette's midpoint", () => {
        const channel = legendChannelOf(
            block({
                swatches: [
                    { label: "0", value: 0, color: "#440154" },
                    { label: "0.2", value: 0.2, color: "#46327E" },
                    { label: "1", value: 1, color: "#FDE725" },
                ],
            }),
        );

        expect(channel?.stops?.[1].color).toBe("#46327E");
    });

    it("draws a categorical encoding as rows, capped at the canvas's own maximum", () => {
        const swatches = Array.from({ length: CANVAS_METRICS.LEGEND_MAX_CATEGORY_ROWS + 3 }, (_unused, index) => ({
            label: `Group ${String(index + 1)}`,
            value: index,
            color: "#000000",
        }));

        const channel = legendChannelOf(block({ kind: "categorical", swatches }));

        expect(channel?.categories).toHaveLength(CANVAS_METRICS.LEGEND_MAX_CATEGORY_ROWS);
        expect(channel?.stops).toBeUndefined();
    });

    it("counts every category it does not name in the Other row, hidden ones included", () => {
        const swatches = Array.from({ length: CANVAS_METRICS.LEGEND_MAX_CATEGORY_ROWS + 2 }, (_unused, index) => ({
            label: `Group ${String(index + 1)}`,
            value: index,
            color: "#000000",
        }));

        const channel = legendChannelOf(block({ kind: "categorical", swatches, overflow: { hidden: 4 } }));

        expect(channel?.other?.coverage).toBe("6 categories");
    });

    it("draws no Other row when every category is named", () => {
        const channel = legendChannelOf(
            block({ kind: "categorical", swatches: [{ label: "Group 1", value: 0, color: "#000000" }] }),
        );

        expect(channel?.other).toBeUndefined();
    });

    it("prints the element's departures unedited", () => {
        const channel = legendChannelOf(block({ departures: ["Not measured (12 nodes)"] }));

        expect(channel?.departures).toEqual(["Not measured (12 nodes)"]);
    });

    it("omits departures entirely when the encoding has nothing to confess", () => {
        expect(legendChannelOf(block())?.departures).toBeUndefined();
    });
});

describe("legendChannels", () => {
    it("reads the stack top first, so the layer a reader sees wins its block", () => {
        const channels = legendChannels([
            block({ layerId: "under", field: { plainName: "Groups", technicalName: "group", path: "results.a.group" } }),
            block({ layerId: "over", field: { plainName: "Bridges", technicalName: "betweenness", path: "results.b.value" } }),
        ]);

        expect(channels).toHaveLength(1);
        expect(channels[0].attribute).toBe("Bridges");
    });

    it("keeps one block per canvas channel and drops the rest", () => {
        const channels = legendChannels([
            block({ channel: "node.color" }),
            block({ channel: "edge.width" }),
            block({ channel: "node.flat" }),
        ]);

        expect(channels.map((channel) => channel.channel)).toEqual(["edgeWidth", "color"]);
    });

    it("answers an empty list when nothing is encoded", () => {
        expect(legendChannels([])).toEqual([]);
    });
});
