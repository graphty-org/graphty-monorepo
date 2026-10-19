/**
 * Cytoscape desktop's pie and ring charts read per node from the node's data, as Cytoscape 3.10.5 draws them.
 */
import { describe, expect, it } from "vitest";

import { readCytoscapeCharts } from "../../src/styles/cytoscape/charts.js";
import type { StyleColumn } from "../../src/styles/types.js";

const PIE =
    'org.cytoscape.PieChart:{"cy_startAngle":0.0,"cy_colors":["#D62728","#2CA02C","#1F77B4"],"cy_dataColumns":["a","b","c"]}';
const DATA: Record<string, number> = { a: 3, b: 5, c: 2 };

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
        expect([cx2.pieOffsetX, cx2.pieOffsetY]).toEqual([18, 18]);
    });

    it("draws nothing for another custom graphic or a node with no values", () => {
        expect(
            read({ NODE_CUSTOMGRAPHICS_1: "org.cytoscape.cg.model.NullCustomGraphics,0,[ Remove Graphics ]," })
                .pieColors,
        ).toBeUndefined();
        expect(read({ NODE_CUSTOMGRAPHICS_1: PIE.replace('"a","b","c"', '"x"') }).pieColors).toBeUndefined();
    });
});
