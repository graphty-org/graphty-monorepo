/**
 * Cytoscape desktop's gradient and image custom graphics, read as the neutral fill gradient and image properties.
 */
import { describe, expect, it } from "vitest";

import { STYLE_ISSUE } from "../../src/styles/codes.js";
import { readCytoscapeGradientsAndImages } from "../../src/styles/cytoscape/custom-graphics.js";
import { StyleNotes } from "../../src/styles/notes.js";
import type { StyleColumn } from "../../src/styles/types.js";

/**
 * One node's values.
 * @param graphics - the node's custom graphics by visual property
 * @param notes - where notes go
 * @returns the values
 */
function read(graphics: Record<string, unknown>, notes = new StyleNotes()): Record<string, unknown> {
    const out: Partial<Record<string, StyleColumn>> = { fill: ["#888888"] };
    readCytoscapeGradientsAndImages(out, 1, (vp) => graphics[vp] ?? null, notes);
    return Object.fromEntries(Object.entries(out).map(([k, v]) => [k, v?.[0]]));
}

describe("Cytoscape gradient and image custom graphics", () => {
    it("reads a linear gradient, its counter-clockwise angle turned clockwise", () => {
        const v = read({
            NODE_CUSTOMGRAPHICS_2:
                'org.cytoscape.LinearGradient:{"cy_angle":90.0,"cy_gradientFractions":[0.0,0.5,1.0],"cy_gradientColors":["#D62728","#FFFFFF","#1F77B4"]}',
        });
        expect(v.fill).toBe("#d62728");
        expect(v.fillGradient).toBe("#1f77b4");
        expect(v.fillGradientColors).toBe("#d62728 #ffffff #1f77b4");
        expect(v.fillGradientStops).toBe("0 0.5 1");
        // Cytoscape's 90 runs bottom to top (specimen-images-charts' picture): the neutral 270
        expect(v.fillGradientAngle).toBe(270);
        expect(v.fillGradientKind).toBeUndefined();
    });

    it("reads CX2's gradient object and a radial gradient, its radius from half the diagonal", () => {
        const v = read({
            NODE_CUSTOMGRAPHICS_1: {
                type: "gradient",
                name: "org.cytoscape.RadialGradient",
                properties: {
                    cy_gradientFractions: [0, 1],
                    cy_radius: 0.5,
                    cy_gradientColors: ["#FFFFFF", "#D62728"],
                    cy_center: { x: 0.5, y: 0.5 },
                },
            },
        });
        expect(v.fillGradientKind).toBe("radial");
        expect(v.fill).toBe("#ffffff");
        expect(v.fillGradient).toBe("#d62728");
        // 0.5 of half the diagonal of a 60 px node is 21.2 px, 0.707 of graphty's 30 px radius
        expect(v.fillGradientStops).toBe("0 0.707107");
    });

    it("cuts a radial ramp reaching past the node's side, and notes a focus off the middle", () => {
        const notes = new StyleNotes();
        const v = read(
            {
                NODE_CUSTOMGRAPHICS_1:
                    'org.cytoscape.RadialGradient:{"cy_gradientFractions":[0.0,1.0],"cy_radius":1.0,"cy_gradientColors":["#000000","#FFFFFF"],"cy_center":{"x":0.25,"y":0.25}}',
            },
            notes,
        );
        expect(v.fillGradientStops).toBe("0 1");
        // white reached at 1.414 of the side's half: at the side, 0.707 of the way
        expect(v.fillGradient).toBe("#b4b4b4");
        expect(notes.covers(STYLE_ISSUE.APPROXIMATED, "node", "fillGradientKind", 0)).toBe(true);
    });

    it("reads a picture by URL, and leaves charts, empty slots and nonsense alone", () => {
        expect(read({ NODE_CUSTOMGRAPHICS_1: "https://example.org/logo.png" }).image).toBe(
            "https://example.org/logo.png",
        );
        expect(
            read({
                NODE_CUSTOMGRAPHICS_1:
                    "org.cytoscape.ding.customgraphics.bitmap.URLImageCustomGraphics,7,https://example.org/a.png,a",
            }).image,
        ).toBe("https://example.org/a.png");
        const none = read({
            NODE_CUSTOMGRAPHICS_1: "org.cytoscape.cg.model.NullCustomGraphics,0,[ Remove Graphics ],",
            NODE_CUSTOMGRAPHICS_2: 'org.cytoscape.PieChart:{"cy_colors":["#ff0000"]}',
            NODE_CUSTOMGRAPHICS_3: "org.cytoscape.LinearGradient:{not json}",
            NODE_CUSTOMGRAPHICS_4: 'org.cytoscape.LinearGradient:{"cy_gradientColors":["#FFFFFF"]}',
        });
        expect(none).toEqual({ fill: "#888888" });
    });
});
