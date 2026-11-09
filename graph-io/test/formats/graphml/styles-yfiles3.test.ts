/**
 * yEd Live GraphML (yFiles for HTML 2.6 and 3 markup): the 2.6 node styles, the 2.6 shape names and the label model
 * parameters, read from the yEd Live specimen sheets as yFiles draws them.
 */

import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { assert, describe, expect, it } from "vitest";

import { GRAPHML_LOSS } from "../../../src/formats/graphml/constants.js";
import { graphmlExporter } from "../../../src/formats/graphml/exporter.js";
import { createRegistry } from "../../../src/registry.js";
import { spreadRamp } from "../../../src/styles/canon/yed-gradient.js";
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

/**
 * The ids of the nodes of a sheet that hold a group label model's label.
 * @param name - the sheet's file name
 * @returns the ids
 */
function groupIds(name: string): string[] {
    const text = readFileSync(join(SHEETS, name), "utf8");
    return [...text.matchAll(/<node id="([^"]+)"(?:(?!<\/data>)[\s\S])*?GroupNodeLabelModelParameter/g)].map(
        (m) => m[1],
    );
}

describe("yEd Live GraphML: where a node label's model puts it", () => {
    it("places a composite model's label by the parameter it holds", async () => {
        const { node } = await sheet("specimen-labels-p2.graphml");
        expect(node("labelPosition", "model-composite")).toBe("top");
    });

    it("hangs a free label's top left corner from the node's by its LayoutOffset", async () => {
        const { node } = await sheet("specimen-labels-p2.graphml");
        // a 40 x 26 node: 30,-18 from its corner is 10.8,-31 from its middle, with the 0.8 yEd Live's words stand in
        expect(node("labelPosition", "model-free-offset")).toBe("center");
        expect(node("labelOffsetX", "model-free-offset")).toBeCloseTo(10.8);
        expect(node("labelOffsetY", "model-free-offset")).toBeCloseTo(-31);
        expect(node("labelShiftX", "model-free-offset")).toBe(0.5);
        expect(node("labelShiftY", "model-free-offset")).toBe(0.5);
    });

    it("keeps the distance a shared model states", async () => {
        const { node } = await sheet("specimen-labels-p2.graphml");
        expect(node("labelOffsetY", "model-exterior-margins")).toBe(-15);
        expect(node("labelOffsetY", "model-stretch-padding")).toBe(6);
        // the words themselves stand 8 in from the node's top left corner
        expect(node("labelPosition", "model-interior-padding")).toBe("center");
        expect(node("labelOffsetX", "model-interior-padding")).toBe(-12);
        expect(node("labelOffsetY", "model-interior-padding")).toBe(-5);
        expect(node("labelShiftX", "model-interior-padding")).toBe(0.5);
    });

    it("draws a group's label on the middle of its tab", async () => {
        const { node } = await sheet("specimen-groups-p4.graphml");
        const group = groupIds("specimen-groups-p4.graphml")[0];
        expect(node("labelPosition", group)).toBe("inside-top");
        expect(node("labelOffsetY", group)).toBe(11);
        expect(node("labelShiftY", group)).toBe(-0.5);
    });

    it("holds the words against the sides of a box larger than them", async () => {
        const { node } = await sheet("specimen-labels.graphml");
        expect(node("labelOffsetY", "v-align-top")).toBe(-13);
        expect(node("labelShiftY", "v-align-top")).toBe(0.5);
        expect(node("labelOffsetY", "v-align-bottom")).toBe(13);
        expect(node("labelShiftY", "v-align-bottom")).toBe(-0.5);
    });

    it("draws a BPMN label's box in the style's own colors", async () => {
        const { node } = await sheet("specimen-labels-p5.graphml");
        expect(node("labelBackground", "bpmn-annotation-label-background")).toBe("#ff0000");
        expect(node("labelBorderWidth", "bpmn-annotation-label-background")).toBeNull();
        expect(node("labelBorderColor", "bpmn-message-label-outline")).toBe("#ff0000");
        expect(node("labelPadding", "bpmn-annotation-label-background")).toBe(5);
        expect(node("labelPadding", "bpmn-annotation-label-insets")).toBe(8);
        expect(node("labelBackground", "bpmn-message-label-outline")).toBe("#ffffff");
        expect(node("labelBackground", "bpmn-message-label-is-initiating")).toBe("#808080");
        expect(node("labelBackground", "bpmn-message-label-initiating-color")).toBe("#ff0000");
    });
});

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
        expect(node("shape", "panel-color")).toBe("rectangle");
    });

    it("paints a BevelNodeStyle as yEd Live does: a ramp over its upper half, a line inside its edge", async () => {
        const { node } = await sheet("specimen-node-shapes-p2.graphml");
        expect(node("fillGradientColors", "bevel-color")).toBe("#ccd9ff #5c85ff #3366ff #3366ff");
        expect(node("fillGradientStops", "bevel-color")).toBe("0 0.5 0.5 1");
        expect(node("fillGradientAngle", "bevel-color")).toBe(90);
        expect(node("borderColor", "bevel-color")).toBe("#3366ff");
        expect(node("shapeLineWidth", "bevel")).toBe(1);
        // over a line of 2 most of the way to white, as yEd Live draws it
        expect(node("shapeLineHaloWidth", "bevel")).toBe(2);
        expect(node("shapeLineHaloColor", "bevel")).toBe("#f7f7f7");
        expect(node("shapeLineHaloColor", "bevel-color")).toBe("#e0e8ff");
        expect(String(node("shapeLines", "bevel")).split(" ")[0]).toBe("-1+3.000,1-10.000");
        expect(String(node("shapeLines", "bevel-inset-8")).split(" ")[0]).toBe("-1+8.000,1-10.000");
        // no corner left to round: one point a corner
        expect(String(node("shapeLines", "bevel-radius-0")).split(" ")).toHaveLength(5);
    });

    it("draws ShinyPlateNodeStyle's gloss over its upper left as yEd Live does", async () => {
        const { node } = await sheet("specimen-node-shapes-p2.graphml");
        const svg = (id: string): string => decodeURIComponent(String(node("image", id)).split(",")[1]);
        // yEd Live 8.5.16 on this sheet: M 1.25,5 Q 1.25,1.25 5,1.25 L 31.4,1.25 ... for a node of 56 by 36, radius 5
        expect(svg("shiny-plate")).toContain(
            'd="M1.25,5Q1.25,1.25 5,1.25L31.4,1.25Q35.15,1.25 35.15,5Q35.15,8.75 21.95,18.15Q8.75,27.55 5,27.55Q1.25,27.55 1.25,23.8Z"',
        );
        expect(svg("shiny-plate-radius-0")).toContain(
            'd="M0,0Q0,0 0,0L36.4,0Q36.4,0 36.4,0Q36.4,0 18.2,14.4Q0,28.8 0,28.8Q0,28.8 0,28.8Z"',
        );
        expect(node("imageFit", "shiny-plate")).toBe("fill");
        // a line of 2 cuts the picture to the middle of it
        expect(svg("shiny-plate-stroke")).toContain('viewBox="1 1 54 34"');
        expect(node("image", "bevel")).toBeNull();
    });

    it("paints a PanelNodeStyle as a ramp into its color, lined in its color at 0.8", async () => {
        const { node } = await sheet("specimen-node-shapes-p2.graphml");
        expect(node("fill", "panel-color")).toBe("#ccd9ff");
        expect(node("fillGradient", "panel-color")).toBe("#3366ff");
        expect(node("fillGradientAngle", "panel-color")).toBe(90);
        expect(node("borderColor", "panel-color")).toBe("#2952cc");
        expect(node("borderWidth", "panel-color")).toBe(1);
    });

    it("draws yFiles 3's standing and pointing ShapeNodeStyle shapes as their corners", async () => {
        const { node } = await sheet("specimen-node-shapes.graphml");
        expect(node("shapePoints", "shape-hexagon-standing")).toBe("0,1 1,0.5 1,-0.5 0,-1 -1,-0.5 -1,0.5");
        expect(node("shapePoints", "shape-triangle-pointing-left")).toBe("-1,0 1,1 1,-1");
        expect(node("shape", "shape-squircle")).toBe("polygon");
        expect(String(node("shapePoints", "shape-squircle")).split(" ")).toHaveLength(32);
    });

    it("rounds a RectangleNodeStyle by 10 unset, by a share under scaleCornerSize, and cuts a CUT one", async () => {
        const { node } = await sheet("specimen-node-shapes.graphml");
        expect(node("shape", "rectangle-style")).toBe("round-rectangle");
        expect(node("cornerRadius", "rectangle-style")).toBe(10);
        expect(node("cornerRadius", "scale-corner-size")).toBeCloseTo(10.8);
        // 48 x 36, corners of 10: 0.5833 of the half width and 0.4444 of the half height stay
        expect(node("shape", "corner-style-cut")).toBe("polygon");
        expect(node("shapePoints", "corner-style-cut")).toBe(
            "-1,0.4444 -0.5833,1 0.5833,1 1,0.4444 1,-0.4444 0.5833,-1 -0.5833,-1 -1,-0.4444",
        );
    });

    it("draws an ArrowNodeStyle's outline from its shape, direction, angle and shaftRatio", async () => {
        const { node } = await sheet("specimen-node-shapes.graphml");
        // 56 x 32: the head reaches back 16, the shaft is 5.33 to each side
        expect(node("shapePoints", "arrow-node-arrow")).toBe(
            "0.4286,0.3333 0.4286,1 1,0 0.4286,-1 0.4286,-0.3333 -1,-0.3333 -1,0.3333",
        );
        expect(node("shapePoints", "arrow-node-shaft-ratio")).toContain("0.4286,0.8");
        expect(node("shapePoints", "arrow-node-angle")).toContain("0.6091,1");
        expect(node("shapePoints", "arrow-node-notched-arrow")).toContain("-0.8095,0");
        // turned, it runs along the height: the head reaches back 28 of 32, half the width across
        expect(node("shapePoints", "arrow-node-direction-down")).toContain("0,-1");
        expect(node("shapePoints", "arrow-node-direction-down")).toContain("1,0.75");
        // a trapezoid narrowed to a point has three corners
        expect(node("shapePoints", "arrow-node-trapezoid")).toBe("0,1 1,-1 -1,-1");
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

describe("yEd Live GraphML: BPMN node styles", () => {
    it("fills a bpmn: node style with its background and outlines it in its outline color, 1 pixel wide", async () => {
        const p4 = await sheet("specimen-node-shapes-p4.graphml");
        // <bpmn:ActivityNodeStyle background="#FFC8C8C8" outline="#FF505050" activityType="TASK"/>
        expect(p4.node("fill", "bpmn-activity-activity-type-task")).toBe("#c8c8c8");
        expect(p4.node("borderColor", "bpmn-activity-activity-type-task")).toBe("#505050");
        expect(p4.node("borderWidth", "bpmn-activity-activity-type-task")).toBe(1);
        expect(p4.node("borderStyle", "bpmn-activity-activity-type-task")).toBe("solid");
        // <bpmn:ActivityNodeStyle/>: yFiles' own off-white with a dark blue outline
        expect(p4.node("fill", "default")).toBe("#fafafa");
        expect(p4.node("borderColor", "default")).toBe("#00008b");
        const p5 = await sheet("specimen-node-shapes-p5.graphml");
        // <bpmn:EventNodeStyle outline="#FF505050" background="#FFFF0000"/>
        expect(p5.node("fill", "bpmn-event-background")).toBe("#ff0000");
        expect(p5.node("borderColor", "bpmn-event-background")).toBe("#505050");
        // <bpmn:GatewayNodeStyle background="#FFC8C8C8" outline="#FFFF0000"/>
        expect(p5.node("fill", "bpmn-gateway-outline")).toBe("#c8c8c8");
        expect(p5.node("borderColor", "bpmn-gateway-outline")).toBe("#ff0000");
        expect(p5.node("fill", "bpmn-conversation-background")).toBe("#ff0000");
        expect(p5.node("borderColor", "bpmn-data-object-collection")).toBe("#505050");
        const p6 = await sheet("specimen-node-shapes-p6.graphml");
        expect(p6.node("fill", "bpmn-choreography-type-task")).toBe("#c8c8c8");
        expect(p6.node("borderColor", "bpmn-choreography-type-task")).toBe("#505050");
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

/**
 * Imports two nodes joined by an edge labeled by a nine-position model's CenterAbove, and a self-loop with the same label.
 * @param from - the source's x, with the target at 100
 * @returns the resolved edge values
 */
async function aboveLabels(from: number) {
    const label =
        '<data key="l"><x:List><y:Label Text="Lbl"><y:Label.LayoutParameter>' +
        '<yx:NinePositionsEdgeLabelModelParameter Position="CenterAbove"/>' +
        "</y:Label.LayoutParameter></y:Label></x:List></data>";
    const node = (id: string, x: number): string =>
        `<node id="${id}"><data key="g"><y:RectD X="${String(x)}" Y="0" Width="10" Height="10"/></data></node>`;
    const file = `<?xml version="1.0"?>
<graphml xmlns="http://graphml.graphdrawing.org/xmlns" xmlns:y="http://www.yworks.com/xml/yfiles-common/3.0"
    xmlns:yx="http://www.yworks.com/xml/yfiles-common/4.0" xmlns:x="http://www.yworks.com/xml/yfiles-common/markup/3.0">
<key id="g" for="node" attr.name="NodeGeometry" y:attr.uri="http://www.yworks.com/xml/yfiles-common/2.0/NodeGeometry"/>
<key id="l" for="edge" attr.name="EdgeLabels" y:attr.uri="http://www.yworks.com/xml/yfiles-common/2.0/EdgeLabels"/>
<graph id="G" edgedefault="directed">${node("a", from)}${node("b", 100)}
<edge id="line" source="a" target="b">${label}</edge><edge id="loop" source="a" target="a">${label}</edge>
</graph></graphml>`;
    const result = await registry.importGraph(new TextEncoder().encode(file), {
        format: "graphml",
        styles: { toolDefaults: true },
    });
    if (result.styles === null || result.styles === undefined) {
        throw new Error("no styles");
    }
    const { styles, snapshot } = result;
    return (property: StyleProperty) => resolveStyles(styles, "edge", property, snapshot);
}

describe("yEd Live GraphML: edge label model parameters", () => {
    /** Half a line of 10 px words. */
    const HALF_LINE = 5.82;
    /** Half a line of a 2.6 label's words: yEd Live draws them at 12px, whatever their Font's fontSize="10". */
    const HALF_LINE_26 = 6.984;

    it("places a nine-position label its model's distance from the line's end and clear of the line", async () => {
        const { edge } = await sheet("specimen-edge-labels.graphml");
        expect(edge("labelPosition", "model-nine-center-above")).toBe("center");
        expect(edge("labelOffsetX", "model-nine-center-above")).toBeNull();
        expect(edge("labelOffsetY", "model-nine-center-above")).toBeCloseTo(-5 - HALF_LINE);
        expect(edge("labelOffsetX", "model-nine-source-below")).toBeCloseTo(-19.75);
        expect(edge("labelOffsetY", "model-nine-source-below")).toBeCloseTo(5 + HALF_LINE);
        expect(edge("labelOffsetX", "model-nine-target-centered")).toBeCloseTo(19.75);
        expect(edge("labelOffsetY", "model-nine-target-centered")).toBeNull();
    });

    it("turns a label by its model's or its parameter's angle", async () => {
        const { edge } = await sheet("specimen-edge-labels.graphml");
        expect(edge("labelRotation", "model-nine-angle")).toBeCloseTo(40.107);
        expect(edge("labelRotation", "model-free-edge-angle")).toBeCloseTo(40.107);
    });

    it("puts a free label's middle its distance off the line", async () => {
        const { edge } = await sheet("specimen-edge-labels.graphml");
        expect(edge("labelOffsetY", "model-free-edge")).toBeCloseTo(-20);
    });

    it("draws a label with no parameter, or one yEd Live does not read, below the first segment's middle", async () => {
        const { edge } = await sheet("specimen-edge-labels.graphml");
        expect(edge("labelOffsetY", "default")).toBeCloseTo(5 + 1.164 * 6);
        for (const id of ["model-path-on-edge", "model-path-above-edge", "model-smart-distance-minus-12"]) {
            expect(edge("labelOffsetY", id)).toBeCloseTo(5 + HALF_LINE);
        }
        expect(edge("labelRotation", "model-smart-auto-rotation-false")).toBeCloseTo(360 - 38.29, 1);
        expect(edge("labelRotation", "model-smart-angle")).toBeNull();
    });

    it("reads a SmartEdgeLabelModel's distance, segment ratio and end", async () => {
        const { edge } = await sheet("specimen-edge-labels-p2.graphml");
        expect(edge("labelOffsetY", "v2-smart-distance-0")).toBeNull();
        expect(edge("labelOffsetY", "v2-smart-distance-12")).toBeCloseTo(12 + HALF_LINE_26);
        expect(edge("labelOffsetY", "v2-smart-distance-minus-12")).toBeCloseTo(-12 - HALF_LINE_26);
        expect(edge("labelOffsetX", "v2-smart-segment-ratio")).toBeCloseTo(-13.86);
        expect(edge("labelOffsetX", "v2-smart-from-target")).toBeCloseTo(13.86);
    });

    it("keeps above on the page on a line running right to left", async () => {
        for (const from of [0, 200]) {
            expect((await aboveLabels(from))("labelOffsetY")[0]).toBeLessThan(0);
        }
    });

    it("leaves a self-loop's label at its position", async () => {
        const values = await aboveLabels(0);
        expect(values("labelPosition")[1]).toBe("top");
        expect(values("labelOffsetY")[1]).toBeNull();
    });
});

describe("yEd Live GraphML: a LinearGradient fill", () => {
    it("reads a FlowchartNodeStyle's shared gradient from corner to corner", async () => {
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
        const { styles, snapshot } = result;
        if (styles === null || styles === undefined) {
            throw new Error("no styles");
        }
        const n0 = snapshot.ids.requireIndex("n0");
        expect(resolveStyles(styles, "node", "fill", snapshot)[n0]).toBe("#e8eef7");
        expect(resolveStyles(styles, "node", "fillGradient", snapshot)[n0]).toBe("#b7c9e3");
        expect(resolveStyles(styles, "node", "fillGradientAngle", snapshot)[n0]).toBe(45);
        expect(styles.styles.notes.map((n) => n.code)).not.toContain("W_STYLE_GRADIENT");
    });

    it("runs at the angle from its start to its end across the node's box, with every stop", async () => {
        const { node } = await sheet("specimen-node-fills-borders.graphml");
        expect(node("fillGradientAngle", "linear-gradient-diagonal")).toBe(45);
        expect(node("fillGradientAngle", "linear-gradient-horizontal")).toBe(0);
        expect(node("fillGradientAngle", "linear-gradient-vertical")).toBe(90);
        expect(node("fillGradient", "linear-gradient-vertical")).toBe("#0000ff");
        expect(node("fillGradientColors", "linear-gradient-three-stops")).toBe("#ff0000 #ffcc00 #0000ff");
        expect(node("fillGradientStops", "linear-gradient-three-stops")).toBe("0 0.5 1");
        expect(node("fillGradientColors", "linear-gradient-diagonal")).toBeNull();
    });

    it("unrolls a REFLECT ramp inside the box into the bands it paints across it", async () => {
        const { node } = await sheet("specimen-node-fills-borders.graphml");
        // 0.4 to 0.6 across, reflected: white and blue five times over
        expect(node("fillGradientColors", "linear-gradient-reflect")).toBe(
            "#ffffff #0000ff #ffffff #0000ff #ffffff #0000ff",
        );
        expect(node("fillGradientStops", "linear-gradient-reflect")).toBe("0 0.2 0.4 0.6 0.8 1");
        expect(node("fillGradientAngle", "linear-gradient-reflect")).toBe(0);
        // a REPEAT ramp starts its stops again at each seam: two stops at one place
        expect(spreadRamp({ colors: ["#ffffff", "#0000ff"], stops: [0, 1] }, "repeat", 0, 2)).toEqual({
            colors: ["#ffffff", "#0000ff", "#ffffff", "#0000ff"],
            stops: [0, 0.5, 0.5, 1],
        });
        // ... a sharp seam too where its stops stop short of its ends
        expect(spreadRamp({ colors: ["#ffffff", "#0000ff"], stops: [0.2, 0.8] }, "repeat", 0, 2)).toEqual({
            colors: ["#ffffff", "#ffffff", "#0000ff", "#0000ff", "#ffffff", "#ffffff", "#0000ff", "#0000ff"],
            stops: [0, 0.1, 0.4, 0.5, 0.5, 0.6, 0.9, 1],
        });
        // a hard stop (two at one place) stays hard, run either way
        expect(
            spreadRamp(
                { colors: ["#ff0000", "#ff0000", "#0000ff", "#0000ff"], stops: [0, 0.5, 0.5, 1] },
                "reflect",
                0,
                2,
            ),
        ).toEqual({
            colors: ["#ff0000", "#ff0000", "#0000ff", "#0000ff", "#0000ff", "#ff0000", "#ff0000"],
            stops: [0, 0.25, 0.25, 0.5, 0.75, 0.75, 1],
        });
    });

    it("notes a REFLECT ramp run again too many times across its box, as a hostile file's tiny ramp is", async () => {
        const text = readFileSync(join(SHEETS, "specimen-node-fills-borders.graphml"), "utf8").replace(
            'startPoint="0.4,0.5" endPoint="0.6,0.5"',
            'startPoint="0.4,0.5" endPoint="0.400000001,0.5"',
        );
        assert(text.includes("0.400000001"));
        const result = await registry.importGraph(new TextEncoder().encode(text), {
            format: "graphml",
            styles: { toolDefaults: true },
            errorLimit: Infinity,
        });
        const { styles, snapshot } = result;
        if (styles === null || styles === undefined) {
            throw new Error("no styles");
        }
        const at = snapshot.ids.requireIndex("linear-gradient-reflect");
        expect(resolveStyles(styles, "node", "fillGradientColors", snapshot)[at]).toBeNull();
        expect(resolveStyles(styles, "node", "fill", snapshot)[at]).toBe("#ffffff");
        expect(styles.styles.notes.map((n) => n.code)).toContain("W_STYLE_GRADIENT");
    });

    it("notes a REFLECT ramp of too many stops to unroll across its box", async () => {
        const stop = '<yjs:GradientStop color="#FFFFFFFF" offset="0"/>';
        const many = Array.from({ length: 300 }, (_, i) => stop.replace('offset="0"', `offset="${String(i / 299)}"`));
        const text = readFileSync(join(SHEETS, "specimen-node-fills-borders.graphml"), "utf8").replace(
            `endPoint="0.6,0.5">${stop}<yjs:GradientStop color="#FF0000FF" offset="1"/>`,
            `endPoint="0.6,0.5">${many.join("")}`,
        );
        assert(text.includes('offset="0.5016722408026756"'));
        const { styles, snapshot } = await registry.importGraph(new TextEncoder().encode(text), {
            format: "graphml",
            styles: { toolDefaults: true },
            errorLimit: Infinity,
        });
        if (styles === null || styles === undefined) {
            throw new Error("no styles");
        }
        const at = snapshot.ids.requireIndex("linear-gradient-reflect");
        expect(resolveStyles(styles, "node", "fillGradientColors", snapshot)[at]).toBeNull();
        expect(styles.styles.notes.map((n) => n.code)).toContain("W_STYLE_GRADIENT");
    });

    it("keeps a radial gradient in its first stop", async () => {
        const { node } = await sheet("specimen-node-fills-borders.graphml");
        expect(node("fill", "linear-gradient-reflect")).toBe("#ffffff");
        expect(node("fillGradient", "radial-gradient")).toBeNull();
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

    it("draws an ArcEdgeStyle as a quadratic curve through its apex, and a BezierEdgeStyle through its curve", async () => {
        // yed-live-graphml-specimen-edges-lines.svg: centers 76 apart, `height="20"` drawn as a parabola 20 off the
        // line in the middle (19.69 at 4.75 from it), so its control point 40 off; `fixedHeight="false"
        // height="0.5"` 38 off, half the line; a positive height bends left of the way from source to target, y up
        const { edge } = await sheet("specimen-edges-lines.graphml");
        expect(edge("bendCurve", "arc-height-20")).toBe("bezier");
        expect(edge("curved", "arc-height-20")).toBe(true);
        const off = (id: string): number => Number(String(edge("bends", id)).split(",")[1]);
        expect(off("arc-height-20")).toBeCloseTo(40 / 76, 4);
        expect(off("arc-height-minus-20")).toBeCloseTo(-40 / 76, 4);
        expect(off("arc-fixed-height-false")).toBeCloseTo(1, 4);
        // the five bends of bezier-five are two cubic pieces joined at the third, which the drawn curve passes
        // through (460,618.222, on the line between the centers): flattened into points on the curve, drawn straight
        const bezier = String(edge("bends", "bezier-five"))
            .split(" ")
            .map((p) => p.split(",").map(Number));
        expect(bezier.length).toBeGreaterThan(5);
        expect(bezier).toContainEqual([0.5, 0]);
        expect(edge("curved", "bezier-five")).toBe(false);
    });

    it("starts and ends an edge at its sourceport and targetport, placed by their FreeNodePortLocationModelParameter", async () => {
        // yed-live-graphml-specimen-edges-lines.svg draws port-top-bottom from the top middle of its source to the
        // bottom middle of its target, and port-corners from the bottom-right corner to the top-left one
        const { edge } = await sheet("specimen-edges-lines.graphml");
        expect(edge("sourcePort", "port-top-bottom")).toBe("0,1");
        expect(edge("targetPort", "port-top-bottom")).toBe("0,-1");
        expect(edge("sourcePort", "port-corners")).toBe("1,-1");
        expect(edge("targetPort", "port-corners")).toBe("-1,1");
        expect(edge("sourcePort", "bends-one")).toBeNull();
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

    it("draws the group's icon and its background at the tab, as yEd Live does", async () => {
        const svg = (n: (p: StyleProperty, id: string) => unknown, id: string): string =>
            decodeURIComponent(String(n("image", id)).split(",")[1]);
        const p2 = await sheet("specimen-groups-p2.graphml");
        // yEd Live 8.5.16: <g transform="translate(139 11)"> on a group of 150 by 80, white background, #aaaaaa sign
        const plus = svg(p2.node, "group-icon-plus");
        expect(plus).toContain('transform="translate(139 11) scale(1)"');
        expect(plus).toContain('fill="#ffffff" d="M4.9,-7a2.1,2.1,0,0,1,2.1,2.1v9.8');
        expect(plus).toContain('fill="#aaaaaa" d="M0.7,-3.5h-1.4v2.8h-2.8');
        expect(p2.node("imageFit", "group-icon-plus")).toBe("fill");
        expect(svg(p2.node, "group-icon-triangle-up")).toContain('transform="rotate(-90)"');
        expect(svg(p2.node, "icon-background-circle")).toContain('d="M0,-7a7,7,0,0,1,0,14a7,7,0,0,1,0,-14Zm0,1.4');
        expect(svg(p2.node, "icon-background-none")).not.toContain("#ffffff");
        expect(svg(p2.node, "icon-position-leading")).toContain("translate(11 11)");
        // no groupIcon: no icon on an open group
        expect(p2.node("image", "tab-fill")).toBeNull();
        const p3 = await sheet("specimen-groups-p3.graphml");
        expect(svg(p3.node, "icon-size-20")).toContain("translate(136 14) scale(1.428571)");
        expect(svg(p3.node, "icon-offset-8")).toContain("translate(131 19)");
        expect(svg(p3.node, "icon-foreground-fill")).toContain('fill="#ff0000"');
        expect(svg(p3.node, "icon-background-fill")).toContain('fill="#00aa00"');
        // a collapsed group shows its folderIcon, a plus unset
        const p4 = await sheet("specimen-groups-p4.graphml");
        expect(svg(p4.node, "v2-group-folder-state")).toContain('fill="#aaaaaa" d="M0.7,-3.5h-1.4v2.8h-2.8');
    });

    it("draws a collapsed group at its FolderNodeState layout, as yEd Live does", async () => {
        // FolderNodeState Layout="990,416,60,40"; yEd Live 8.5.16 draws the plus at translate(49 11) on that box
        const p4 = await sheet("specimen-groups-p4.graphml");
        expect(p4.node("width", "v2-group-folder-state")).toBe(60);
        expect(p4.node("height", "v2-group-folder-state")).toBe(40);
        const icon = decodeURIComponent(String(p4.node("image", "v2-group-folder-state")).split(",")[1]);
        expect(icon).toContain('transform="translate(49 11) scale(1)"');
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

describe("yEd Live GraphML: ports on a save", () => {
    it("writes every port of the BPMN sheet back as <port> elements that read back the same", async () => {
        const read = async (bytes: Uint8Array) =>
            (await registry.importGraph(bytes, { format: "graphml", errorLimit: Infinity })).snapshot;
        const first = await read(new Uint8Array(readFileSync(join(SHEETS, "specimen-node-shapes-p6.graphml"))));
        const ports = first.nodes.require("ports");
        expect(ports.length - ports.nullCount).toBeGreaterThan(0);
        expect(graphmlExporter.check(first).map((n) => n.code)).not.toContain(GRAPHML_LOSS.PORTS_DROPPED);
        const again = await read(new TextEncoder().encode(await graphmlExporter.exportToString(first)));
        const rows = (snapshot: typeof first): unknown[] =>
            Array.from({ length: snapshot.nodeCount }, (_, r) => snapshot.nodes.require("ports").value(r));
        expect(rows(again)).toEqual(rows(first));
    });
});

describe("yEd Live GraphML: spellings yEd Live 8.5.16 reads, and the ones it ignores", () => {
    it("sizes a 2.6 label by its style's textSize and ignores its Font's fontSize", async () => {
        // yed-live-graphml-specimen-labels-p3.svg: only the label with textSize="16" is drawn at 16px; its twin with
        // Font fontSize="16" alone, and every other 2.6 label, at 12px
        const p3 = (await sheet("specimen-labels-p3.graphml")).node;
        expect(p3("labelSize", "v2-text-size-16")).toBe(16);
        expect(p3("labelSize", "v2-font-size-16")).toBe(12);
        expect((await sheet("specimen-labels-p5.graphml")).node("labelSize", "v2-markup-plain")).toBe(12);
        // a 3.0 LabelStyle's Font fontSize is drawn (yed-live-graphml-specimen-labels.svg has 6, 8, 16 and 20px)
        expect((await sheet("specimen-labels.graphml")).node("labelSize", "font-size-20")).toBe(20);
    });

    it("draws no dashes for a Stroke's dashStyle written DASH, DOT, DASH_DOT or DASH_DOT_DOT", async () => {
        // yed-live-graphml-specimen-edges-lines.svg, -p2 and -node-fills-borders.svg draw no dashes for
        // these; the only dash is the <yjs:DashStyle dashes="3 1"> element's
        const { edge } = await sheet("specimen-edges-lines.graphml");
        for (const id of ["dash-dash", "dash-dot", "dash-dash-dot", "dash-dash-dot-dot"]) {
            expect(edge("lineStyle", id), id).toBe("solid");
        }
        const fills = (await sheet("specimen-node-fills-borders.graphml")).node;
        expect(fills("borderStyle", "dash-dash")).toBe("solid");
        expect(fills("borderStyle", "dash-custom")).toBe("dashed");
    });

    it("reads a MarkupLabelStyle's text as its words, and its bold, italic, heading and color as the font", async () => {
        // yed-live-graphml-specimen-labels-p5.svg draws "<b>Bold</b>" as the word Bold in bold, and so on
        const { node } = await sheet("specimen-labels-p5.graphml");
        expect(node("label", "v2-markup-bold")).toBe("Bold");
        expect(node("labelWeight", "v2-markup-bold")).toBe("bold");
        expect(node("label", "v2-markup-italic")).toBe("Ital");
        expect(node("labelItalic", "v2-markup-italic")).toBe(true);
        expect(node("label", "v2-markup-underline")).toBe("Und");
        expect(node("label", "v2-markup-heading")).toBe("H2");
        expect(node("labelWeight", "v2-markup-heading")).toBe("bold");
        expect(node("labelSize", "v2-markup-heading")).toBe(18);
        expect(node("label", "v2-markup-span-color")).toBe("Red");
        expect(node("labelColor", "v2-markup-span-color")).toBe("#ff0000");
        expect(node("label", "v2-markup-line-break")).toBe("One\nTwo");
        expect(node("label", "v2-markup-wrapping")).toBe("A long label text");
        expect(JSON.parse(String(node("labelRuns", "v2-markup-wrapping")))).toEqual([
            { text: "A long", weight: "bold" },
            { text: " label text" },
        ]);
        expect((await sheet("specimen-labels-p2.graphml")).node("label", "markup-bold")).toBe("Bold");
    });

    it("reads a label style's font style, text alignment, round corners, wrapping and a stretch label's turn", async () => {
        // yed-live-graphml-specimen-labels.svg draws fontStyle ITALIC as font-style="italic" and OBLIQUE as
        // "oblique", horizontalTextAlignment LEFT as text-anchor="start" and RIGHT as "end", and a ROUND_RECTANGLE
        // box with rx="5" (rx="5" at 12px in -p3 too)
        const { node } = await sheet("specimen-labels.graphml");
        expect(node("labelItalic", "font-style-italic")).toBe(true);
        expect(node("labelItalic", "font-style-oblique")).toBe(true);
        expect(node("labelItalic", "font-style-normal")).toBe(null);
        expect(node("labelTextAlign", "h-align-left")).toBe("left");
        expect(node("labelTextAlign", "h-align-right")).toBe("right");
        expect(node("labelCornerRadius", "label-shape-round-rectangle")).toBe(5);
        expect(node("labelCornerRadius", "label-shape-rectangle")).toBe(null);
        const p3 = (await sheet("specimen-labels-p3.graphml")).node;
        expect(p3("labelItalic", "v2-font-style-italic")).toBe(true);
        expect(p3("labelTextAlign", "v2-horizontal-right")).toBe("right");
        // -p3 draws a 2.6 CHARACTER label broken between letters at its maximumSize's width ("Wrap th" / "is text")
        expect(p3("labelWrapWidth", "v2-wrapping-character")).toBe(50);
        expect(p3("labelWrapAnywhere", "v2-wrapping-character")).toBe(true);
        expect(p3("labelWrapWidth", "v2-wrapping-word")).toBe(50);
        expect(p3("labelWrapAnywhere", "v2-wrapping-word")).toBe(null);
        // -p2 draws a 3.0 *_ELLIPSIS label on one line cut between letters with an ellipsis ("A long la...")
        const p2 = (await sheet("specimen-labels-p2.graphml")).node;
        expect(p2("labelWrapWidth", "wrapping-trim-character-ellipsis")).toBe(56);
        expect(p2("labelWrapEllipsis", "wrapping-trim-character-ellipsis")).toBe(true);
        expect(p2("labelWrapEllipsis", "wrapping-wrap-word-ellipsis")).toBe(true);
        // -p2 and -p4 turn a stretch label on the left or the vertical middle up (-90) and on the right down (90)
        expect(p2("labelRotation", "model-stretch-left")).toBe(270);
        expect(p2("labelRotation", "model-stretch-center-vertical")).toBe(270);
        expect(p2("labelRotation", "model-stretch-right")).toBe(90);
        expect(p2("labelRotation", "model-stretch-top")).toBe(null);
        const p4 = (await sheet("specimen-labels-p4.graphml")).node;
        expect(p4("labelRotation", "v2-model-stretch-west")).toBe(270);
        expect(p4("labelRotation", "v2-model-stretch-east")).toBe(90);
    });

    it("draws a BpmnEdgeStyle's color, line and arrows by its type", async () => {
        // yed-live-graphml-specimen-edges-lines-p3.svg
        const { edge } = await sheet("specimen-edges-lines-p3.graphml");
        expect(edge("color", "default")).toBe("#000000");
        expect(edge("targetArrow", "default")).toBe("triangle");
        expect(edge("color", "bpmn-bpmn-edge-type-sequence-flow")).toBe("#505050");
        expect(edge("targetArrow", "bpmn-bpmn-edge-type-sequence-flow")).toBe("triangle");
        expect(edge("sourceArrow", "bpmn-bpmn-edge-type-conditional-flow")).toBe("diamond-open");
        expect(edge("lineStyle", "bpmn-bpmn-edge-type-message-flow")).toBe("dashed");
        expect(edge("sourceArrow", "bpmn-bpmn-edge-type-message-flow")).toBe("circle-open");
        expect(edge("targetArrow", "bpmn-bpmn-edge-type-message-flow")).toBe("triangle-open");
        expect(edge("lineStyle", "bpmn-bpmn-edge-type-association")).toBe("dotted");
        expect(edge("targetArrow", "bpmn-bpmn-edge-type-association")).toBe("none");
        expect(edge("targetArrow", "bpmn-bpmn-edge-type-directed-association")).toBe("other:open-vee");
        expect(edge("sourceArrow", "bpmn-bpmn-edge-type-bidirected-association")).toBe("other:open-vee");
        // a conversation is a band 3 wide in its color with a line 1 wide in its innerColor (white unset) along it
        expect(edge("color", "bpmn-bpmn-edge-type-conversation")).toBe("#ffffff");
        expect(edge("outlineColor", "bpmn-bpmn-edge-type-conversation")).toBe("#505050");
        expect(edge("outlineWidth", "bpmn-bpmn-edge-type-conversation")).toBe(2);
        expect(edge("color", "bpmn-bpmn-edge-inner-color")).toBe("#ff0000");
        expect(edge("color", "bpmn-bpmn-edge-color")).toBe("#ff0000");
    });
});
