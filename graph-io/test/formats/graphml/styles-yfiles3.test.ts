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
    const edgeIds = Array.from({ length: snapshot.edgeCount }, (_, e) => snapshot.edges.byRole("id")?.value(e));
    const edge = (property: StyleProperty, id: string): unknown => edges(property)[edgeIds.indexOf(id)];
    return { node, edges, edge };
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
        expect(node("shape", "v2-shape-trapez2")).toBe("trapezoid");
        // the mirrored and turned ones as yFiles documents them, not as their sibling: SHEARED_RECTANGLE2 sheared to
        // the left, TRAPEZ smaller at the bottom, TRIANGLE2 pointing down, FAT_ARROW right and FAT_ARROW2 left (y up)
        const corners: Record<string, string> = {
            "v2-shape-sheared-rectangle2": "-0.5,-1 1,-1 0.5,1 -1,1",
            "v2-shape-trapez": "-0.5,-1 0.5,-1 1,1 -1,1",
            "v2-shape-triangle2": "-1,1 0,-1 1,1",
            "v2-shape-fat-arrow": "-1,-1 0.6,-1 1,0 0.6,1 -1,1 -0.6,0",
            "v2-shape-fat-arrow2": "-0.6,-1 1,-1 0.6,0 1,1 -0.6,1 -1,0",
        };
        for (const [id, points] of Object.entries(corners)) {
            expect(node("shape", id), id).toBe("polygon");
            expect(node("shapePoints", id), id).toBe(points);
        }
        expect(node("shapePoints", "v2-shape-trapez2")).toBeNull();
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
        expect(node("labelBox", "v2-model-interior-north-west")).toBe("words-at-side");
        expect(node("labelBox", "v2-model-stretch-north")).toBe("target-width");
        expect(node("labelBox", "v2-model-exterior-south-east")).toBeNull();
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

describe("yEd Live GraphML: edge geometry, stroke alpha and hollow arrows", () => {
    it("routes an edge through its EdgeGeometry bends, rounded where a PolylineEdgeStyle smooths them", async () => {
        const { edge } = await sheet("specimen-edges-lines.graphml");
        expect(typeof edge("bends", "bends-one")).toBe("string");
        expect(String(edge("bends", "bends-two")).split(" ")).toHaveLength(2);
        expect(edge("curved", "bends-one")).not.toBe(true);
        expect(edge("curved", "smoothing-length-5")).toBe(true);
        expect(edge("bends", "color-ff0000")).toBeNull();
    });

    it("carries a stroke's #AARRGGBB alpha into the border opacity", async () => {
        const { node } = await sheet("specimen-node-sizes-opacity.graphml");
        expect(node("borderColor", "stroke-alpha-40")).toBe("#000000");
        expect(node("borderOpacity", "stroke-alpha-40")).toBeCloseTo(0x40 / 255, 3);
    });

    it("draws an arrow with a {x:Null} fill as its open outline in the stroke's color", async () => {
        const { edge } = await sheet("specimen-arrows.graphml");
        expect(edge("targetArrow", "arrow-fill-null")).toBe("triangle-open");
        expect(edge("targetArrowColor", "arrow-fill-null")).toBe("#505050");
        expect(edge("targetArrow", "arrow-fill-ff0000")).toBe("triangle");
        expect(edge("targetArrowColor", "arrow-fill-ff0000")).toBe("#ff0000");
    });

    it("reads yFiles 3's STEALTH and ELLIPSE arrows as 2.6's DEFAULT and CIRCLE, which they were renamed from", async () => {
        const { edge } = await sheet("specimen-arrows.graphml");
        // STEALTH is "notched on the side opposite its tip": a vee, not the plain triangle TRIANGLE draws
        expect(edge("targetArrow", "target-stealth")).toBe("vee");
        expect(edge("sourceArrow", "source-stealth")).toBe("vee");
        expect(edge("targetArrow", "target-triangle")).toBe("triangle");
        expect(edge("targetArrow", "target-ellipse")).toBe("circle");
        expect(edge("sourceArrow", "source-ellipse")).toBe("circle");
    });
});

describe("yEd Live GraphML: BPMN and UML node styles, as yEd Live 8.5.16 draws them", () => {
    it("draws an activity as a box with corners of 6, its line by its activity type", async () => {
        const { node } = await sheet("specimen-node-shapes-p4.graphml");
        expect(node("shape", "default")).toBe("round-rectangle");
        expect(node("cornerRadius", "default")).toBe(6);
        expect(node("fill", "default")).toBe("#fafafa");
        expect(node("borderColor", "default")).toBe("#00008b");
        expect(node("borderWidth", "default")).toBe(1);
        expect(node("fill", "bpmn-activity-background")).toBe("#ff0000");
        expect(node("borderColor", "bpmn-activity-outline")).toBe("#ff0000");
        expect(node("borderWidth", "bpmn-activity-activity-type-call-activity")).toBe(3);
        expect(node("borderStyle", "bpmn-activity-activity-type-event-sub-process")).toBe("dotted");
    });

    it("draws an event as a circle, a gateway as a diamond, a conversation as a hexagon", async () => {
        const { node } = await sheet("specimen-node-shapes-p5.graphml");
        expect(node("shape", "default")).toBe("ellipse");
        expect(node("fill", "default")).toBe("#fafafa");
        expect(node("borderColor", "default")).toBe("#008000");
        expect(node("borderWidth", "bpmn-event-characteristic-end")).toBe(3);
        expect(node("borderStyle", "bpmn-event-characteristic-sub-process-non-interrupting")).toBe("dashed");
        expect(node("borderStyle", "bpmn-event-characteristic-boundary-non-interrupting")).toBe("dashed");
        expect(node("shape", "bpmn-gateway-background")).toBe("diamond");
        expect(node("fill", "bpmn-gateway-background")).toBe("#ff0000");
        expect(node("shape", "bpmn-conversation-outline")).toBe("hexagon");
        expect(node("borderColor", "bpmn-conversation-outline")).toBe("#ff0000");
        expect(node("borderWidth", "bpmn-conversation-type-calling-collaboration")).toBe(3);
    });

    it("draws a data object as a folded page, a data store as a cylinder, an annotation with no outline", async () => {
        const { node } = await sheet("specimen-node-shapes-p5.graphml");
        expect(node("shape", "bpmn-data-object-background")).toBe("polygon");
        expect(typeof node("shapePoints", "bpmn-data-object-background")).toBe("string");
        expect(node("shape", "bpmn-data-store-background")).toBe("other:database");
        expect(node("shape", "bpmn-annotation-background")).toBe("rectangle");
        expect(node("fill", "bpmn-annotation-background")).toBe("#ff0000");
        expect(node("borderWidth", "bpmn-annotation-background")).toBe(0);
    });

    it("draws a choreography as a box with corners of 6, a BPMN group with corners of 3 and a dash-dot line", async () => {
        const { node } = await sheet("specimen-node-shapes-p6.graphml");
        expect(node("shape", "default")).toBe("round-rectangle");
        expect(node("cornerRadius", "default")).toBe(6);
        expect(node("borderColor", "default")).toBe("#006400");
        expect(node("borderWidth", "bpmn-choreography-type-call")).toBe(3);
        expect(node("cornerRadius", "bpmn-group-background")).toBe(3);
        expect(node("fill", "bpmn-group-background")).toBe("#ff0000");
        expect(node("borderStyle", "bpmn-group-background")).toBe("dash-dot");
    });

    it("draws a UML class as a rounded box outlined in its fill, its name in white at the top", async () => {
        const { node } = await sheet("specimen-node-shapes-p7.graphml");
        expect(node("shape", "uml-fill")).toBe("round-rectangle");
        expect(node("cornerRadius", "uml-fill")).toBe(10);
        expect(node("fill", "uml-fill")).toBe("#607d8b");
        expect(node("borderColor", "uml-fill")).toBe("#607d8b");
        expect(node("borderWidth", "uml-fill")).toBe(2);
        expect(node("label", "uml-fill")).toBe("Cls");
        expect(node("labelColor", "uml-fill")).toBe("#ffffff");
        expect(node("labelPosition", "uml-fill")).toBe("inside-top");
    });
});

describe("yEd Live GraphML: a group's panel and tab band", () => {
    it("fills the panel and frames it in the tab's color, deeper on the tab's side", async () => {
        const { node } = await sheet("specimen-groups.graphml");
        expect(node("fill", "default")).toBe("#ffffff");
        expect(node("stripeColors", "default")).toBe("#aaaaaa");
        expect(node("stripeFrame", "default")).toBe("0.275 0.026667 0.05 0.026667");
        expect(node("stripeColors", "tab-position-bottom")).toBe("#c8c8c8");
        expect(node("stripeFrame", "tab-position-bottom")).toBe("0.05 0.026667 0.275 0.026667");
        expect(node("stripeFrame", "tab-position-left-leading")).toBe("0.05 0.026667 0.05 0.146667");
        expect(node("stripeFrame", "tab-position-right")).toBe("0.05 0.146667 0.05 0.026667");
        expect(node("stripeColors", "tab-position-none")).toBeNull();
        expect(node("stripeFrame", "tab-position-none")).toBeNull();
    });

    it("reads tabHeight, and contentAreaFill with its alpha", async () => {
        const p2 = await sheet("specimen-groups-p2.graphml");
        expect(p2.node("fill", "content-area-fill")).toBe("#ffffcc");
        const p3 = await sheet("specimen-groups-p3.graphml");
        expect(p3.node("stripeFrame", "tab-height-30")).toBe("0.425 0.026667 0.05 0.026667");
        expect(p3.node("fillOpacity", "render-transparent-content")).toBeCloseTo(0.502, 3);
        // a collapsed group has no panel: its face is the tab
        expect(p3.node("fill", "group-collapsed")).toBe("#c8c8c8");
        expect(p3.node("stripeFrame", "group-collapsed")).toBeNull();
    });
});

describe("yEd Live GraphML: a node label with no layout parameter", () => {
    it("sits below the node, as yEd Live draws it", async () => {
        const { node } = await sheet("specimen-labels.graphml");
        expect(node("labelPosition", "default")).toBe("bottom");
    });

    it("reads a label style's box: its fill, its stroke and how far it stands off the words", async () => {
        const labels = (await sheet("specimen-labels.graphml")).node;
        expect(labels("labelBackground", "background-fill")).toBe("#ffff99");
        expect(labels("labelPadding", "background-fill")).toBe(0);
        expect(labels("labelPadding", "padding-6")).toBe(6);
        expect(labels("labelBorderColor", "background-stroke")).toBe("#ff0000");
        expect(labels("labelBorderWidth", "background-stroke")).toBe(1);
        expect((await sheet("specimen-labels-p3.graphml")).node("labelPadding", "v2-insets-8")).toBe(8);
        // a label with no box keeps the default padding
        expect(labels("labelPadding", "cap-background-fill")).toBeNull();
    });
});
