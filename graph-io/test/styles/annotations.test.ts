/**
 * readAnnotations(): the shapes, text notes and arrows Cytoscape desktop keeps in a network's `__Annotations` column,
 * as neutral facts in the position convention (y up, file units).
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { GraphBuilder } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { createRegistry } from "../../src/registry.js";
import { readAnnotations } from "../../src/styles/index.js";

const SESSION = resolve(import.meta.dirname, "../corpus/styles/cys/cytoscape-tutorials-AnnotationExample.cys");

describe("readAnnotations", () => {
    it("reads the six annotations of a Cytoscape session, sizes undone from the zoom they were saved at", async () => {
        const { snapshot } = await createRegistry().importGraph(new Uint8Array(readFileSync(SESSION)), {
            format: "cys",
        });
        const { annotations, skipped } = readAnnotations(snapshot);
        expect(skipped).toEqual([]);
        expect(annotations.map((a) => a.kind).sort()).toEqual(["arrow", "arrow", "shape", "text", "text", "text"]);

        const shape = annotations.find((a) => a.kind === "shape");
        expect(shape).toMatchObject({
            layer: "background",
            shape: "round-rectangle",
            fill: "#ccffcc",
            fillOpacity: 0.24,
            borderColor: "#000000",
        });
        // Cytoscape stores x, y as the top-left corner (y down) and the size at the saved zoom (1.9938)
        expect(shape?.kind === "shape" && shape.width).toBeCloseTo(470.364, 2);
        expect(shape?.kind === "shape" && shape.height).toBeCloseTo(272.421, 2);
        expect(shape?.kind === "shape" && shape.center.x).toBeCloseTo(803.89 + 470.364 / 2, 1);
        expect(shape?.kind === "shape" && shape.center.y).toBeCloseTo(-(509.689 + 272.421 / 2), 1);

        const title = annotations.find((a) => a.kind === "text" && a.text.startsWith("Gal4"));
        expect(title).toMatchObject({ anchor: "top-left", fontFamily: "Cambria", bold: true, italic: false });
        expect(title?.kind === "text" && title.at).toEqual({ x: 794.8624067464336, y: -456.52413815355715 });
        expect(title?.kind === "text" && title.fontSize).toBeCloseTo(56 / 1.9938053730539693, 6);

        const arrow = annotations.find((a) => a.kind === "arrow" && a.id.startsWith("5f9e"));
        expect(arrow).toMatchObject({ sourceArrow: "none", targetArrow: "vee", color: "#000000", layer: "foreground" });
        expect(arrow?.kind === "arrow" && arrow.to).toEqual({ x: 1157.5672862036165, y: -625.1477631457255 });
        expect(arrow?.kind === "arrow" && arrow.from).toEqual({ x: 1054.6671033335256, y: -612.5072667994752 });
        // the second arrow ends on a node's center at save time
        const toNode = annotations.find((a) => a.kind === "arrow" && a.id.startsWith("3a4e"));
        expect(toNode?.kind === "arrow" && toNode.to).toEqual({ x: 1102.2164306640625, y: -548.4974975585938 });
        // both leave a text, which the drawing measures; only the second ends at a node, whose size the drawing knows
        expect(toNode).toMatchObject({ sourceText: "4d88715d-7b0b-4594-a7e3-3577d45ce1a9", toNode: true });
        expect(arrow).toMatchObject({ sourceText: "f4ab55db-6d36-4286-8bcc-d101dccef1b6" });
        expect(arrow).not.toHaveProperty("toNode");
    });

    it("reads nothing from a graph without the column, and names the kinds it does not read", () => {
        const plain = new GraphBuilder({ directed: false });
        plain.addNode("a");
        expect(readAnnotations(plain.freeze())).toEqual({ annotations: [], skipped: [] });

        const b = new GraphBuilder({ directed: false });
        b.addNode("a");
        b.setGraphValue("__Annotations", [
            "type=org.cytoscape.view.presentation.annotations.ImageAnnotation|uuid=i|x=1|y=2",
            "type=org.cytoscape.view.presentation.annotations.BoundedTextAnnotation|uuid=b|x=0|y=0|width=20|height=10|text=hi|zoom=2",
        ]);
        const { annotations, skipped } = readAnnotations(b.freeze());
        expect(skipped).toEqual(["ImageAnnotation"]);
        expect(annotations).toMatchObject([
            { kind: "shape", id: "b", center: { x: 5, y: -2.5 }, width: 10, height: 5 },
            { kind: "text", id: "b:text", text: "hi", anchor: "center", at: { x: 5, y: -2.5 } },
        ]);
    });

    it("gives each arrowhead the length and width Cytoscape draws it at, whatever the line's width", () => {
        const b = new GraphBuilder({ directed: false });
        b.addNode("a");
        b.setGraphValue("__Annotations", [
            "type=org.cytoscape.view.presentation.annotations.ArrowAnnotation|uuid=a|x=0|y=0|targetPoint=100,0" +
                "|sourceType=4|sourceSize=1.0|targetType=7|targetSize=2.0|lineThickness=8.0",
            "type=org.cytoscape.view.presentation.annotations.ArrowAnnotation|uuid=b|x=0|y=0|targetPoint=100,0" +
                "|sourceType=5|targetType=1",
        ]);
        const { annotations } = readAnnotations(b.freeze());
        // an Open Arrow is 17 long and 10 wide; a Triangular Head 5 long, at size 2 twice both
        expect(annotations[0]).toMatchObject({
            sourceArrow: "triangle-open",
            sourceHeadLength: 17,
            sourceHeadWidth: 10,
            targetHeadLength: 10,
            targetHeadWidth: 20,
        });
        // an end with no head has no head size
        expect(annotations[1]).toMatchObject({ targetHeadLength: 17, targetHeadWidth: 10 });
        expect(annotations[1]).not.toHaveProperty("sourceHeadLength");
    });

    it("starts a line with an X at its source half the X's length out from its source, the X centered there", () => {
        const b = new GraphBuilder({ directed: false });
        b.addNode("a");
        const arrow = (uuid: string, source: string, sourceType: number, sourceSize: number): string =>
            `type=org.cytoscape.view.presentation.annotations.ArrowAnnotation|uuid=${uuid}|x=0|y=0` +
            `|sourceAnnotation=${source}|targetPoint=100,5|sourceType=${String(sourceType)}` +
            `|sourceSize=${String(sourceSize)}|targetType=1|zoom=1`;
        b.setGraphValue("__Annotations", [
            "type=org.cytoscape.view.presentation.annotations.ShapeAnnotation|uuid=box|x=0|y=0|width=14|height=10|zoom=1",
            arrow("x", "box", 6, 1),
            arrow("x2", "box", 6, 2),
            arrow("closed", "box", 1, 1),
        ]);
        const arrows = readAnnotations(b.freeze()).annotations.filter((a) => a.kind === "arrow");
        // Cytoscape 3.10.5's SVG of specimen-images-charts-p6 ("arrow sourceType=X Arrow"): the source box ends at 249,
        // the X spans 249..259 and the line starts at 254; every other head's tip is the box's side
        expect(arrows.map((a) => a.kind === "arrow" && a.from)).toEqual([
            { x: 19, y: -5 },
            { x: 24, y: -5 },
            { x: 14, y: -5 },
        ]);
    });
});
