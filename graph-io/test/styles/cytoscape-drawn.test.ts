/**
 * Cytoscape desktop styles read the way Cytoscape desktop draws them, each case checked against the program's own
 * SVG drawing of the corpus file it names (graph-io/test/fidelity/oracles/): label rotation, the style a Java font
 * name carries, edge bends, mappings over the column an import reads as the edge weight, a session view's own
 * background, the members of a collapsed group, and pictures placed as annotations.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";

import { describe, expect, it } from "vitest";

import { importGraph } from "../../src/registry.js";
import { readAnnotations, readImageAnnotations } from "../../src/styles/annotations.js";
import {
    type CytoscapeBypass,
    type CytoscapeElements,
    emptyCytoscapeStyle,
    resolveCytoscape,
    resolveStyles,
} from "../../src/styles/internal.js";

const CORPUS = resolve(import.meta.dirname, "../corpus/styles");

/**
 * A corpus file's bytes, gunzipped when stored compressed.
 * @param path - the path under the style corpus
 * @returns the bytes
 */
function corpus(path: string): Uint8Array {
    const raw = readFileSync(resolve(CORPUS, path));
    return new Uint8Array(path.endsWith(".gz") ? gunzipSync(raw) : raw);
}

/**
 * Elements with no attributes, only bypasses.
 * @param bypasses - each element's bypasses
 * @returns the elements
 */
function withBypasses(bypasses: CytoscapeBypass[]): CytoscapeElements {
    return { count: bypasses.length, value: () => null, bypasses };
}

describe("reading a Cytoscape style as Cytoscape draws it", () => {
    it("turns a label by NODE_LABEL_ROTATION, clockwise, folded into 0..360", () => {
        const style = emptyCytoscapeStyle();
        style.node.defaults.set("NODE_LABEL_ROTATION", "0.0");
        const got = resolveCytoscape(
            "node",
            style,
            withBypasses([new Map([["NODE_LABEL_ROTATION", "45.0"]]), new Map([["NODE_LABEL_ROTATION", -30]]), null]),
        );
        expect(got.labelRotation).toEqual([45, 330, 0]);
    });

    it("draws a Java font name's own style: Dialog.bolditalic bold and italic, SansSerif.bold-0-12 bold", () => {
        const style = emptyCytoscapeStyle();
        const faces = ["Dialog.bolditalic,plain,12", "Serif.italic,plain,12", "SansSerif.bold-0-12", "Dialog,plain,12"];
        const got = resolveCytoscape(
            "node",
            style,
            withBypasses(faces.map((f) => new Map([["NODE_LABEL_FONT_FACE", f]]))),
        );
        expect(got.labelWeight).toEqual(["bold", "normal", "bold", "normal"]);
        expect(got.labelItalic).toEqual([true, true, false, false]);
        expect(got.labelFont).toEqual([
            "DejaVu Sans, sans-serif",
            "DejaVu Serif, serif",
            "DejaVu Sans, sans-serif",
            "DejaVu Sans, sans-serif",
        ]);
    });

    it("draws a font it may not have with Dialog's face after it, as Java draws a missing font in Dialog", () => {
        const style = emptyCytoscapeStyle();
        const faces = ["Calibri-Bold,plain,12", "Arial.bold,plain,12", "SansSerif,plain,12"];
        const got = resolveCytoscape(
            "node",
            style,
            withBypasses(faces.map((f) => new Map([["NODE_LABEL_FONT_FACE", f]]))),
        );
        expect(got.labelFont).toEqual([
            "Calibri-Bold, DejaVu Sans, sans-serif",
            "Arial, DejaVu Sans, sans-serif",
            "DejaVu Sans, sans-serif",
        ]);
    });

    it("draws a line in its own color bypass when arrowColorMatchesEdge sets it from EDGE_UNSELECTED_PAINT", () => {
        const style = emptyCytoscapeStyle();
        style.edge.defaults.set("EDGE_UNSELECTED_PAINT", "#404040");
        style.edge.defaults.set("EDGE_STROKE_UNSELECTED_PAINT", "#636363");
        style.edge.dependencies.set("arrowColorMatchesEdge", true);
        const got = resolveCytoscape(
            "edge",
            style,
            withBypasses([new Map([["EDGE_STROKE_UNSELECTED_PAINT", "#E41A1C"]]), null]),
        );
        expect(got.color).toEqual(["#e41a1c", "#404040"]);
        expect(got.targetArrowColor).toEqual(["#404040", "#404040"]);
    });

    it("draws every line in EDGE_UNSELECTED_PAINT's default, not the stroke's default or mapping, under arrowColorMatchesEdge", () => {
        // specimen-mappings-bypass: no EDGE_UNSELECTED_PAINT, a #505050 stroke default and a passthrough of the
        // stroke; Cytoscape 3.10.5 draws every edge #404040, the mapped ones too (its SVG of the session, CX and
        // XGMML copies, whose saved graphics say fill="#404040" for passthrough-edge-color-d62728)
        const style = emptyCytoscapeStyle();
        style.edge.defaults.set("EDGE_STROKE_UNSELECTED_PAINT", "#505050");
        style.edge.mappings.set("EDGE_STROKE_UNSELECTED_PAINT", { kind: "passthrough", column: "c", type: "string" });
        style.edge.dependencies.set("arrowColorMatchesEdge", true);
        const got = resolveCytoscape("edge", style, {
            count: 2,
            value: (column, i) => (column === "c" && i === 0 ? "#D62728" : undefined),
        });
        expect(got.color).toEqual(["#404040", "#404040"]);
        expect(got.targetArrowColor).toEqual(["#404040", "#404040"]);
    });

    it("reads EDGE_BEND handles as bends along and across the line, y up", () => {
        const style = emptyCytoscapeStyle();
        const got = resolveCytoscape(
            "edge",
            style,
            withBypasses([
                // the handles Cytoscape draws above, then below, the line from B05 to B09 in cx-syn-bypass
                new Map([["EDGE_BEND", "0.7071,-0.7071,0.3|0.7071,0.7071,0.7"]]),
                new Map([["EDGE_BEND", ""]]),
                null,
            ]),
        );
        expect(got.bends).toEqual(["0.2121,0.2121 0.495,-0.495", null, null]);
    });
});

describe("reading Cytoscape files as Cytoscape draws them", () => {
    it.each([
        ["cx/fidelity/syn-mappings.cx", "cx"],
        ["cx2/fidelity/syn-mappings.cx2", "cx2"],
        ["cys/fidelity/syn-mappings.cys", "cys"],
    ])("applies the mappings over the weight column of %s", async (path, format) => {
        const { snapshot, styles } = await importGraph(corpus(path), { format, styles: true });
        if (styles === null || styles === undefined) {
            throw new Error("no styles");
        }
        const weight = snapshot.edges.byRole("weight");
        const width = resolveStyles(styles, "edge", "width", snapshot);
        const color = resolveStyles(styles, "edge", "color", snapshot);
        // EDGE_WIDTH runs 0.5 at weight 0 to 8 at weight 1; EDGE_STROKE_UNSELECTED_PAINT #bdbdbd to #08306b
        for (let i = 0; i < snapshot.edgeCount; i++) {
            expect(width[i]).toBeCloseTo(0.5 + 7.5 * Number(weight?.value(i)), 6);
        }
        expect(new Set(color).has("#404040")).toBe(false);
        expect(styles.styles.notes.map((n) => n.code)).not.toContain("W_STYLE_MAPPING_COLUMN_MISSING");
    });

    it("draws a session behind the background its view sets for itself", async () => {
        const { styles } = await importGraph(corpus("cys/fidelity/syn-bypass.cys"), { format: "cys", styles: true });
        expect(styles?.styles.graph.background).toBe("#fafaf0");
    });

    it("places the members of a collapsed group where Cytoscape expands them", async () => {
        const { snapshot } = await importGraph(corpus("xgmml/fidelity/syn-bypass.xgmml.gz"), { format: "xgmml" });
        const at = (label: string): number[] => {
            const i = Array.from({ length: snapshot.nodeCount }, (_, k) => k).find(
                (k) => snapshot.nodes.value("label", k) === label,
            );
            return Array.from(snapshot.nodes.value("position", i ?? -1) as ArrayLike<number>);
        };
        // the CX export of the same network stores these positions for them (y up here)
        expect(at("B50")).toEqual([6, -620, 0]);
        expect(at("B53")).toEqual([441, -628, 0]);
    });

    it("draws no edge of a node Cytoscape hides: a collapsed group's members, an expanded group's own node", async () => {
        const { snapshot, styles } = await importGraph(corpus("xgmml/fidelity/syn-bypass.xgmml.gz"), {
            format: "xgmml",
            styles: true,
        });
        if (styles === null || styles === undefined) {
            throw new Error("no styles");
        }
        const visible = resolveStyles(styles, "edge", "visible", snapshot);
        const nodeLabel = (i: number): unknown => snapshot.nodes.value("label", i);
        const { src, dst } = snapshot.edgeList();
        const shown = (a: string, b: string): unknown[] =>
            Array.from({ length: snapshot.edgeCount }, (_, e) => e)
                .filter((e) => nodeLabel(src[e]) === a && nodeLabel(dst[e]) === b)
                .map((e) => visible[e]);
        // the 86 edges the file's view holds (it writes no graphics for the other 24, every one of them at a hidden
        // group node or member), less the 3 it hides itself and the 10 of its 3 hidden nodes: the oracle SVG draws
        // no line to a node it does not draw
        expect(visible.filter((v) => v !== false)).toHaveLength(73);
        expect(shown("B51", "B58")).toEqual([false]);
        expect(shown("group-expanded-1", "B04")).toEqual([false]);
        expect(shown("group-collapsed", "B58")).not.toContain(false);
    });

    it("reads a picture annotation's box and address, and readAnnotations still lists it as skipped", async () => {
        const { snapshot } = await importGraph(corpus("cx/fidelity/syn-bypass.cx"), { format: "cx" });
        const [image, ...rest] = readImageAnnotations(snapshot);
        expect(rest).toEqual([]);
        expect(image).toMatchObject({
            kind: "image",
            layer: "foreground",
            center: { x: 960, y: 90 },
            width: 120,
            height: 60,
            url: "https://raw.githubusercontent.com/cytoscape/cytoscape.js/master/documentation/img/cytoscape-logo.png",
            opacity: 1,
            borderColor: "#000000",
            borderWidth: 1,
        });
        expect(readAnnotations(snapshot).skipped).toEqual(["ImageAnnotation"]);
    });

    it("reads each arrow annotation head by the number Cytoscape 3.10 saves, as its SVG draws it", async () => {
        // specimen-images-charts-p6: one arrow per head at the target end; the oracle draws an X at 6 and a T at 8
        const file = resolve(import.meta.dirname, "../fidelity/specimens/cx2/specimen-images-charts-p6.cx2");
        const { snapshot } = await importGraph(new Uint8Array(readFileSync(file)), { format: "cx2" });
        const arrows = readAnnotations(snapshot).annotations.filter((a) => a.kind === "arrow");
        expect(arrows).toHaveLength(28);
        const heads = arrows
            .map((a) => [a.targetArrow, a.sourceArrow].join(" "))
            .filter((h, i, all) => all.indexOf(h) === i)
            .sort();
        expect(heads).toEqual(
            [
                "circle none",
                "diamond none",
                "none none",
                "other:x none",
                "tee none",
                "triangle circle",
                "triangle diamond",
                "triangle none",
                "triangle other:x",
                "triangle tee",
                "triangle triangle",
                "triangle triangle-open",
                "triangle vee",
                "triangle-open none",
                "vee none",
            ].sort(),
        );
        // the line leaves the middle of the source box's facing side, at half the saved thickness and never under 1
        const byId = new Map(arrows.map((a) => [a.id, a]));
        const plain = byId.get("00000000-0000-4000-8000-000000000001");
        const thick = byId.get("00000000-0000-4000-8000-000000000020");
        expect(plain?.from.y).toBeCloseTo(plain?.to.y ?? NaN, 1);
        expect(plain?.width).toBe(1);
        expect(thick?.width).toBe(2);
        const leaves = readAnnotations(snapshot).annotations.some(
            (a) =>
                a.kind === "shape" &&
                a.width === 14 &&
                a.center.y === plain?.from.y &&
                Math.abs(a.center.x + a.width / 2 - plain.from.x) < 1e-9,
        );
        expect(leaves).toBe(true);
        // a turned shape keeps its turn, clockwise on screen
        const turned = readAnnotations(snapshot).annotations.filter((a) => a.kind === "shape" && a.rotation === 30);
        expect(turned).toHaveLength(2); // the shape and the bounded text's box
    });
});
