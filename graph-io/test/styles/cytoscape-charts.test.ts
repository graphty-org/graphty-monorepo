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

    describe("a bar or line chart's axes, as Cytoscape 3.10.5 draws them with JFreeChart", () => {
        const BAR =
            'org.cytoscape.BarChart:{"cy_range":[0.0,10.0],"cy_colors":["#D62728","#2CA02C","#1F77B4"],"cy_dataColumns":["a","b","c"],"cy_type":"GROUPED"';
        const axes = (options: string, chart = BAR): Record<string, unknown> =>
            read({ NODE_CUSTOMGRAPHICS_1: `${chart}${options}}` });
        /** Each further text as [x, y, text, size, rotation] in the node's lengths, y down, from its 60 x 60 frame. */
        const texts = (v: Record<string, unknown>): [number, number, string, number, number][] =>
            (JSON.parse(String(v.shapeTexts)) as [number, number, string, { size: number; rotation?: number }][]).map(
                ([x, y, t, look]) => [x * 30, -y * 30, t, look.size * 60, look.rotation ?? 0],
            );

        it("shrinks the plot by its axes' labels and draws their words where Cytoscape does", () => {
            // xgmml-specimen-images-charts-p7 bar-axis-label-font-size-10: the plot from 9.33 left of the node's
            // middle to 26.05 right and from 26.05 up to 10.41 down (the oracle's clip, at half its chart scale)
            const v = axes(',"cy_showRangeAxis":true,"cy_showDomainAxis":true,"cy_axisLabelFontSize":10');
            expect(v.chartWidth as number).toBeCloseTo(35.38 / 60, 3);
            expect(v.chartHeight as number).toBeCloseTo(36.46 / 60, 3);
            expect(v.chartOffsetX as number).toBeCloseTo(8.36, 2);
            expect(v.chartOffsetY as number).toBeCloseTo(-7.82, 2);
            const t = texts(v);
            // the range axis ticked every 5, each number's right end 3.5 left of the plot, its middle on its tick
            const range = t.filter(([, , w]) => /^\d+$/.test(w));
            expect(range.map(([, , w]) => w)).toEqual(["0", "5", "10"]);
            const [zero, , ten] = range;
            expect(zero[0] + (10 * 0.636) / 2).toBeCloseTo(-9.33 - 3.5, 1);
            expect(ten[0] + (10 * 1.272) / 2).toBeCloseTo(-9.33 - 3.5, 1);
            // the oracle's baselines: 0 at 13.87 below the middle, 10 at 22.59 above, 3.46 under each line's middle
            expect(zero[1] + 3.46).toBeCloseTo(13.87, 1);
            expect(ten[1] + 3.46).toBeCloseTo(-22.59, 1);
            // the categories' names under the plot, each centered on its bar, 10 tall
            const names = t.filter(([, , w]) => /^[a-c]$/.test(w));
            expect(names.map(([x]) => x)).toEqual([
                expect.closeTo(-2.84, 1),
                expect.closeTo(8.36, 1),
                expect.closeTo(19.57, 1),
            ]);
            // the oracle's baseline 23.2 below the middle
            expect(names[0][1] + 3.46).toBeCloseTo(23.2, 0);
            expect(names[0][3]).toBeCloseTo(10, 3);
        });

        it("turns the categories' names as cy_domainLabelPosition says, about the corner JFreeChart anchors", () => {
            const turned = (position: string): [number, number, string, number, number][] =>
                texts(
                    axes(`,"cy_showDomainAxis":true,"cy_axisLabelFontSize":10,"cy_domainLabelPosition":"${position}"`),
                ).filter(([, , w]) => w === "a");
            // the oracle's text origins (baseline, left end) for "a", 12.26 wide at 20 chart units, put back to the
            // middle of its box: UP_45 at (-14.27, 23.72), DOWN_45 at (-23.06, 19.39), UP_90 (-13.04, 25.33),
            // DOWN_90 (-19.96, 19.21)
            const middle = (ox: number, oy: number, deg: number): number[] => {
                const r = (deg * Math.PI) / 180;
                const [dx, dy] = [6.13 / 2, -6.92 / 2];
                return [ox + Math.cos(r) * dx - Math.sin(r) * dy, oy + Math.sin(r) * dx + Math.cos(r) * dy];
            };
            const expectAt = (t: [number, number, string, number, number], at: number[], deg: number): void => {
                expect(t[4]).toBe(deg);
                expect(t[0]).toBeCloseTo(at[0], 0);
                expect(t[1]).toBeCloseTo(at[1], 0);
            };
            expectAt(turned("UP_45")[0], middle(-14.27, 23.72, -45), -45);
            expectAt(turned("DOWN_45")[0], middle(-23.06, 19.4, 45), 45);
            expectAt(turned("UP_90")[0], middle(-13.04, 25.33, -90), -90);
            expectAt(turned("DOWN_90")[0], middle(-19.96, 19.21, 90), 90);
            // a turned name takes its turned box's height: UP_45's plot ends 16.72 above the node's bottom
            const up45 = axes(',"cy_showDomainAxis":true,"cy_axisLabelFontSize":10,"cy_domainLabelPosition":"UP_45"');
            expect((up45.chartOffsetY as number) + (up45.chartHeight as number) * 30).toBeCloseTo(9.33, 1);
        });

        it("names the categories from cy_domainLabelsColumn, and widens the ticks when the labels are tall", () => {
            const named = texts(
                axes(',"cy_showDomainAxis":true,"cy_axisLabelFontSize":10,"cy_domainLabelsColumn":"chartLabels"'),
            );
            expect(named.map(([, , w]) => w)).toEqual(["X", "Y", "Z"]);
            // at size 20 the range axis is ticked every 25: only 0 is drawn (bar-axis-label-font-size-20)
            const big = texts(axes(',"cy_showRangeAxis":true,"cy_showDomainAxis":true,"cy_axisLabelFontSize":20'));
            expect(big.filter(([, , w]) => /^\d+$/.test(w)).map(([, , w]) => w)).toEqual(["0"]);
            // a line chart's categories past its names are left unnamed
            const line = texts(
                axes(
                    ',"cy_showDomainAxis":true,"cy_axisLabelFontSize":10,"cy_domainLabelsColumn":"chartLabels"',
                    'org.cytoscape.LineChart:{"cy_range":[0.0,10.0],"cy_colors":["#1F77B4"],"cy_dataColumns":["series"]',
                ),
            );
            expect(line.map(([, , w]) => w)).toEqual(["X", "Y", "Z"]);
            // the oracle's X at 21.36 chart units apart, from 42.72 left of the middle
            expect(line[0][0]).toBeCloseTo(-21.36, 1);
        });

        it("leaves a chart without axes as it was, and the default label size at 1", () => {
            const plain = axes("");
            expect(plain.chartWidth).toBeUndefined();
            expect(plain.shapeTexts).toBeUndefined();
            // images-charts bar-domain-axis: the plot's bottom 5.16 up from where it would be
            const small = axes(',"cy_showDomainAxis":true');
            expect((small.chartOffsetY as number) + (small.chartHeight as number) * 30).toBeCloseTo(20.89, 1);
        });
    });

    it("colors a chart by its cy_colorScheme when it names no colors, as Cytoscape's ColorScheme does", () => {
        const bars = (scheme: string): unknown =>
            read({
                NODE_CUSTOMGRAPHICS_1: `org.cytoscape.BarChart:{"cy_range":[0.0,10.0],"cy_type":"GROUPED","cy_colorScheme":"${scheme}","cy_dataColumns":["a","b","c"]}`,
            }).chartColors;
        // the colors Cytoscape 3.10.5 drew on xgmml-specimen-images-charts-p5 and -p6
        expect(bars("RAINBOW")).toBe("#ff0000 #00ff00 #0000ff");
        expect(bars("CONTRASTING")).toBe("#ff0000 #ff00ff #0000ff");
        expect(bars("MODULATED")).toBe("#ff0000 #7dfd7d #1e1ef6");
        expect(bars("YL_OR_RD")).toBe("#ffeda0 #feb24c #f03b20");
        // a gradient with no zero color has two: the bar past them is JFreeChart's light gray
        expect(bars("BLUE_RED")).toBe("#ff0000 #0000ff #c0c0c0");
        expect(bars("Blue-Red")).toBe("#ff0000 #0000ff #c0c0c0");
        // an unknown or random scheme gives no colors, so nothing is drawn
        expect(bars("NO_SUCH_SCHEME")).toBeUndefined();
        const pie = read({
            NODE_CUSTOMGRAPHICS_1: 'org.cytoscape.PieChart:{"cy_colorScheme":"RAINBOW","cy_dataColumns":["a","b","c"]}',
        });
        expect(pie.pieColors).toBe("#0000ff #00ff00 #ff0000");
    });

    it("picks heat strips' and up-down bars' up, zero and down colors from a color scheme as BarLayer does", () => {
        const bars = (type: string, scheme: string, values: string): unknown =>
            read({
                NODE_CUSTOMGRAPHICS_1: `org.cytoscape.BarChart:{"cy_range":[-3.0,3.0],"cy_type":"${type}","cy_colorScheme":"${scheme}","cy_values":${values}}`,
            }).chartColors;
        // two colors: up red, down blue, and zero black (BarLayer takes colors[1] as zero only from three colors)
        expect(bars("HEAT_STRIPS", "Blue-Red", "[1.0,-2.0,3.0]")).toBe("#550000 #0000aa #ff0000");
        // down is colors[2], never the last of RAINBOW's one color per value
        expect(bars("UP_DOWN", "RAINBOW", "[1.0,-1.0,2.0,-2.0,3.0]")).toBe("#ff0000 #00ff66 #ff0000 #00ff66 #ff0000");
        // down is colors[1] from two colors, Java's gray from one
        expect(bars("UP_DOWN", "Blue-Red", "[1.0,-1.0]")).toBe("#ff0000 #0000ff");
        expect(
            read({
                NODE_CUSTOMGRAPHICS_1:
                    'org.cytoscape.BarChart:{"cy_range":[-3.0,3.0],"cy_type":"UP_DOWN","cy_colors":["#D62728"],"cy_values":[1.0,-1.0]}',
            }).chartColors,
        ).toBe("#d62728 #808080");
    });

    it("reads a chart's own cy_values before its data columns", () => {
        const v = read({
            NODE_CUSTOMGRAPHICS_1:
                'org.cytoscape.PieChart:{"cy_values":[1.0,1.0,2.0],"cy_colors":["#D62728","#2CA02C","#1F77B4"],"cy_dataColumns":["a","b","c"]}',
        });
        expect(v.pieSizes).toBe("0.5 0.25 0.25");
        const noColumns = read({
            NODE_CUSTOMGRAPHICS_1:
                'org.cytoscape.PieChart:{"cy_values":[1.0,1.0,2.0],"cy_colors":["#D62728","#2CA02C","#1F77B4"]}',
        });
        expect(noColumns.pieColors).toBe("#1f77b4 #2ca02c #d62728");
    });
});
