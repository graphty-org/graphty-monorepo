/**
 * Cytoscape desktop's pie and ring charts read per node from the node's data, as Cytoscape 3.10.5 draws them.
 */
import { describe, expect, it } from "vitest";

import { readCytoscapeCharts } from "../../src/styles/cytoscape/charts.js";
import type { StyleColumn } from "../../src/styles/types.js";

const PIE =
    'org.cytoscape.PieChart:{"cy_startAngle":0.0,"cy_colors":["#D62728","#2CA02C","#1F77B4"],"cy_dataColumns":["a","b","c"]}';
const DATA: Record<string, unknown> = { a: 3, b: 5, c: 2, series: [2, 5, 3, 8, 4], chartLabels: ["X", "Y", "Z"] };

/**
 * One node's chart values.
 * @param graphics - the node's custom graphics by visual property
 * @param sizeSync - whether charts are fitted to their node
 * @returns the values
 */
function read(graphics: Record<string, unknown>, sizeSync = true): Record<string, unknown> {
    const out: Partial<Record<string, StyleColumn>> = { width: [60], height: [60] };
    readCytoscapeCharts(
        out,
        1,
        (vp) => graphics[vp] ?? null,
        (column) => DATA[column] ?? null,
        sizeSync,
    );
    return Object.fromEntries(Object.entries(out).map(([k, v]) => [k, v?.[0]]));
}

describe("Cytoscape charts", () => {
    it("reads a pie's slices from the node's data, counter-clockwise from 3 o'clock as a clockwise pie reversed", () => {
        const v = read({ NODE_CUSTOMGRAPHICS_3: PIE });
        expect(v.pieColors).toBe("#1f77b4 #2ca02c #d62728");
        expect(v.pieSizes).toBe("0.2 0.5 0.3");
        expect(v.pieRotation).toBe(90);
        expect(v.pieRadius).toBe(0.9);
        expect(v.pieHole).toBeUndefined();
    });

    it("reads a ring's hole, CX2's chart objects, and a chart's own size and position", () => {
        const ring = read({
            NODE_CUSTOMGRAPHICS_1: PIE.replace("PieChart", "RingChart").replace("{", '{"cy_holeSize":0.7,'),
        });
        expect(ring.pieHole).toBe(0.7);
        const cx2 = read(
            {
                NODE_CUSTOMGRAPHICS_2: {
                    type: "chart",
                    name: "org.cytoscape.PieChart",
                    properties: { cy_startAngle: 90, cy_colors: ["#ff0000"], cy_dataColumns: ["a"] },
                },
                NODE_CUSTOMGRAPHICS_SIZE_2: 24,
                NODE_CUSTOMGRAPHICS_POSITION_2: {
                    ENTITY_ANCHOR: "NW",
                    GRAPHICS_ANCHOR: "NW",
                    MARGIN_X: 0,
                    MARGIN_Y: 0,
                },
            },
            false,
        );
        expect(cx2.pieColors).toBe("#ff0000");
        expect(cx2.pieRotation).toBe(0);
        expect(cx2.pieRadius).toBe(0.36);
        // NW,NW on a 60 node with a 21.6 disc: 19.2 px down and right, as the specimen sheets' oracles measure
        expect([cx2.pieOffsetX, cx2.pieOffsetY]).toEqual([19.2, 19.2]);
    });

    it("draws a pie's item labels on its slices, from the options or a column, at their size", () => {
        const labelled = (options: string): unknown => {
            const v = read({ NODE_CUSTOMGRAPHICS_1: PIE.replace("{", `{${options},`) });
            return typeof v.shapeTexts === "string" ? JSON.parse(v.shapeTexts) : v.shapeTexts;
        };
        // a = 3 of 10 from 3 o'clock counter-clockwise: its middle at 54 degrees, 0.62 of the 27 px disc's radius out
        // (xgmml-specimen-images-charts-p5 pie-item-label-font-size-20: "A" 17 px up and right of the center)
        const r = 0.62 * 27;
        const at = (deg: number): number[] => [
            Number(((r * Math.cos((deg * Math.PI) / 180)) / 30).toFixed(6)),
            Number(((r * Math.sin((deg * Math.PI) / 180)) / 30).toFixed(6)),
        ];
        const look = { size: Number((20 / 60).toFixed(6)), color: "#404040" };
        expect(labelled('"cy_showItemLabels":true,"cy_itemLabels":["A","B","C"],"cy_itemLabelFontSize":20')).toEqual([
            [...at(54), "A", look],
            [...at(198), "B", look],
            [...at(324), "C", look],
        ]);
        // from the node's list column, at Cytoscape's default size (1 px)
        expect(labelled('"cy_showItemLabels":true,"cy_itemLabelsColumn":"chartLabels"')).toEqual([
            [...at(54), "X", { size: 0.0166667, color: "#404040" }],
            [...at(198), "Y", { size: 0.0166667, color: "#404040" }],
            [...at(324), "Z", { size: 0.0166667, color: "#404040" }],
        ]);
        // none unless shown
        expect(labelled('"cy_itemLabels":["A","B","C"]')).toBeUndefined();
    });

    it("places a chart whose anchors differ as Cytoscape draws it", () => {
        const at = (p: string): unknown[] => {
            const v = read({ NODE_CUSTOMGRAPHICS_1: PIE, NODE_CUSTOMGRAPHICS_POSITION_1: p });
            return [v.pieOffsetX, v.pieOffsetY];
        };
        expect(at("NW,NW,c,0.00,0.00")).toEqual([3, 3]);
        expect(at("C,NW,c,0.00,0.00")).toEqual([30, 30]);
        expect(at("E,W,c,0.00,0.00")).toEqual([57, 0]);
        expect(at("C,C,c,12.00,-8.00")).toEqual([12, -8]);
        expect(at("C,C,c,0.00,0.00")).toEqual([undefined, undefined]);
    });

    it("draws nothing for another custom graphic or a node with no values", () => {
        expect(
            read({ NODE_CUSTOMGRAPHICS_1: "org.cytoscape.cg.model.NullCustomGraphics,0,[ Remove Graphics ]," })
                .pieColors,
        ).toBeUndefined();
        expect(read({ NODE_CUSTOMGRAPHICS_1: PIE.replace('"a","b","c"', '"x"') }).pieColors).toBeUndefined();
    });

    it("reads bar charts as Cytoscape 3.10.5 draws them: grouped, stacked, heat strips and up-down", () => {
        const bar = (options: string): Record<string, unknown> =>
            read({
                NODE_CUSTOMGRAPHICS_1: `org.cytoscape.BarChart:{"cy_range":[0.0,10.0],"cy_colors":["#D62728","#2CA02C","#1F77B4"],"cy_dataColumns":["a","b","c"]${options}}`,
            });
        const grouped = bar(',"cy_type":"GROUPED"');
        expect(grouped).toMatchObject({
            chartKind: "bar",
            chartValues: "3 5 2",
            chartColors: "#d62728 #2ca02c #1f77b4",
            chartMin: 0,
            chartMax: 10,
            chartHorizontal: false,
            chartMargin: 0.025,
            chartGap: 0,
            chartBorderColor: "#404040",
            chartBorderWidth: 0.125,
        });
        // a plot 52.1 across on a 60 node, as the specimen sheets' oracles measure it
        expect(grouped.chartSize).toBeCloseTo(52.1 / 60, 6);
        expect(grouped.pieColors).toBeUndefined();
        // a stacked bar lies across the node when the chart stands up
        expect(bar(',"cy_type":"STACKED"')).toMatchObject({ chartKind: "stacked-bar", chartHorizontal: true });
        // heat strips: each bar's color from the zero color toward the up color by its value
        expect(bar(',"cy_type":"HEAT_STRIPS"').chartColors).toBe("#5f7c2b #81642a #4e882b");
        expect(bar(',"cy_type":"UP_DOWN"').chartColors).toBe("#d62728 #d62728 #d62728");
        expect(bar(',"cy_separation":0.5,"cy_borderWidth":2.0,"cy_borderColor":"#000000"')).toMatchObject({
            chartGap: 0.5,
            chartBorderColor: "#000000",
            chartBorderWidth: 1,
        });
        // without a global range, from 0 to a tenth above the greatest value
        expect(bar(',"cy_globalRange":false')).toMatchObject({ chartMin: 0, chartMax: 5.5 });
    });

    it("reads line, box and heat map charts as Cytoscape 3.10.5 draws them", () => {
        const chart = (cls: string, columns: string, options = ""): Record<string, unknown> =>
            read({
                NODE_CUSTOMGRAPHICS_1: `org.cytoscape.${cls}:{"cy_range":[0.0,10.0],"cy_colors":["#2166AC","#F7F7F7","#B2182B"],"cy_dataColumns":${columns}${options}}`,
            });
        // a line's range has a tenth more headroom, its width is half Cytoscape's
        expect(chart("LineChart", '["series"]', ',"cy_lineWidth":3.0')).toMatchObject({
            chartKind: "line",
            chartValues: "2 5 3 8 4",
            chartColors: "#2166ac",
            chartMax: 11,
            chartMargin: -0.0125,
            chartLineWidth: 1.5,
        });
        // JFreeChart's quartiles of 2 3 4 5 8: 3 and 5 about the median 4, the whiskers at 2 and 8
        expect(chart("BoxChart", '["series"]')).toMatchObject({
            chartKind: "box",
            chartValues: "2 3 4 5 8",
            chartColors: "#2166ac #000000",
        });
        const heat = chart("HeatMapChart", '["a","b","c"]');
        expect(heat).toMatchObject({
            chartKind: "cells",
            chartValues: "3 5 2",
            chartColors: "#b7cce1 #8cafd2 #ccdae8",
            chartHorizontal: true,
        });
        expect(heat.chartSize).toBeCloseTo(51.1 / 60, 6);
        // laid left to right, the last value first
        expect(chart("HeatMapChart", '["a","b","c"]', ',"cy_orientation":"HORIZONTAL"')).toMatchObject({
            chartValues: "2 5 3",
            chartHorizontal: false,
        });
    });
});
