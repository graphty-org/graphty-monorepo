/**
 * yEd Live GraphML (yFiles for HTML 2.6 and 3 markup): the 2.6 node styles, the 2.6 shape names and the label model
 * parameters, read from the yEd Live specimen sheets as yFiles draws them.
 */

import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { createRegistry } from "../../../src/registry.js";
import { resolveStyles } from "../../../src/styles/internal.js";
import type { StyleProperty } from "../../../src/styles/types.js";

const registry = createRegistry();
const SHEETS = resolve(import.meta.dirname, "../../fidelity/specimens/yed-live-graphml");

/**
 * Imports a specimen sheet and returns a reader of one resolved property by node or edge id.
 * @param sheet - the sheet's file name
 * @returns the reader
 */
async function sheet(sheet: string) {
    const result = await registry.importGraph(new Uint8Array(readFileSync(join(SHEETS, sheet))), {
        format: "graphml",
        styles: { toolDefaults: true },
        errorLimit: Infinity,
    });
    const { styles } = result;
    if (styles === null || styles === undefined) {
        throw new Error("no styles");
    }
    const { snapshot } = result;
    const node = (property: StyleProperty, id: string): unknown =>
        resolveStyles(styles, "node", property, snapshot)[snapshot.ids.requireIndex(id)];
    const edges = (property: StyleProperty): readonly unknown[] => resolveStyles(styles, "edge", property, snapshot);
    return { node, edges };
}

describe("yEd Live GraphML: yFiles for HTML 2.6 node styles", () => {
    it("draws BevelNodeStyle and ShinyPlateNodeStyle as rounded boxes in their color, PanelNodeStyle as a box", async () => {
        const { node } = await sheet("specimen-node-shapes-p2.graphml");
        expect(node("fill", "bevel")).toBe("#c8c8c8");
        expect(node("fill", "bevel-color")).toBe("#3366ff");
        expect(node("shape", "bevel")).toBe("round-rectangle");
        expect(node("cornerRadius", "bevel")).toBe(10);
        expect(node("shape", "bevel-radius-0")).toBe("rectangle");
        expect(node("borderWidth", "bevel")).toBe(0);
        expect(node("shape", "shiny-plate")).toBe("round-rectangle");
        expect(node("cornerRadius", "shiny-plate")).toBe(5);
        expect(node("fill", "shiny-plate-fill")).toBe("#3366ff");
        expect(node("borderWidth", "shiny-plate")).toBe(0);
        expect(node("fill", "panel-color")).toBe("#3366ff");
        expect(node("shape", "panel-color")).toBe("rectangle");
    });

    it("reads the 2.6 ShapeNodeShape names and ROUND_RECTANGLE's corner of 10", async () => {
        const { node } = await sheet("specimen-node-shapes-p2.graphml");
        expect(node("shape", "v2-shape-sheared-rectangle")).toBe("parallelogram");
        expect(node("shape", "v2-shape-sheared-rectangle2")).toBe("parallelogram");
        expect(node("shape", "v2-shape-trapez")).toBe("trapezoid");
        expect(node("shape", "v2-shape-trapez2")).toBe("trapezoid");
        expect(node("shape", "v2-shape-star5-up")).toBe("star");
        expect(node("shape", "v2-shape-pill")).toBe("round-rectangle");
        expect(node("cornerRadius", "v2-shape-pill")).toBe(
            Math.min(Number(node("width", "v2-shape-pill")), Number(node("height", "v2-shape-pill"))) / 2,
        );
        expect(node("cornerRadius", "v2-shape-round-rectangle")).toBe(10);
    });

    it("draws FlowchartNodeStyle's type as yEd's flowchart palette draws it, with the demo's defaults", async () => {
        const { node } = await sheet("specimen-node-shapes-p3.graphml");
        expect(node("shape", "flowchart-decision")).toBe("diamond");
        expect(node("shape", "flowchart-data")).toBe("parallelogram");
        expect(node("shape", "flowchart-card")).toBe("polygon");
        expect(typeof node("shapePoints", "flowchart-card")).toBe("string");
        expect(node("borderColor", "flowchart-decision")).toBe("#505050");
        expect(node("borderWidth", "flowchart-annotation")).toBe(0);
        expect(node("shape", "default")).toBe("rectangle");
        expect(node("fill", "default")).toBe("#b7c9e3");
        expect(node("borderColor", "default")).toBe("#000000");
    });
});

describe("yEd Live GraphML: label model parameters", () => {
    it("places node labels by the yFiles 3 interior, exterior and stretch models", async () => {
        const { node } = await sheet("specimen-labels-p2.graphml");
        expect(node("labelPosition", "model-exterior-top-left")).toBe("top-left");
        expect(node("labelPosition", "model-exterior-bottom")).toBe("bottom");
        expect(node("labelPosition", "model-interior-bottom-right")).toBe("inside-bottom-right");
        expect(node("labelPosition", "model-stretch-left")).toBe("inside-left");
        expect(node("labelPosition", "model-stretch-center-horizontal")).toBe("center");
    });

    it("places node labels by the 2.6 interior, exterior, interior stretch and sandwich models", async () => {
        const { node } = await sheet("specimen-labels-p4.graphml");
        expect(node("labelPosition", "v2-model-interior-north-west")).toBe("inside-top-left");
        expect(node("labelPosition", "v2-model-exterior-south-east")).toBe("bottom-right");
        expect(node("labelPosition", "v2-model-stretch-north")).toBe("inside-top");
        expect(node("labelPosition", "v2-model-sandwich-south")).toBe("bottom");
    });
});

describe("yEd Live GraphML: edge label model parameters", () => {
    it("places a label above or below the middle of its edge by the path and nine-position models", async () => {
        const { edges } = await sheet("specimen-edge-labels.graphml");
        const positions = edges("labelPosition");
        // CenterAbove twice and AboveEdge three times; CenterBelow and BelowEdge once each
        expect(positions.filter((p) => p === "top")).toHaveLength(5);
        expect(positions.filter((p) => p === "bottom")).toHaveLength(2);
    });
});

describe("yEd Live GraphML: a FlowchartNodeStyle gradient", () => {
    it("is drawn in its first stop and noted", async () => {
        const result = await registry.importGraph(
            new Uint8Array(
                readFileSync(
                    resolve(
                        import.meta.dirname,
                        "../../corpus/styles/graphml/yfiles-html-large/ctmrbio__stag-mwc__stag_flowchart.graphml",
                    ),
                ),
            ),
            { format: "graphml", styles: { toolDefaults: true }, errorLimit: Infinity },
        );
        const { styles } = result;
        expect(styles?.styles.notes.map((n) => n.code)).toContain("W_STYLE_GRADIENT");
    });
});
