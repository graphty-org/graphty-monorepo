/**
 * GraphML styles: each writer's graphics read the way that writer draws them (yEd's realizers, yFiles 3's style
 * objects and shared data, Gephi's r, g, b and size keys, Cytoscape's export), the valid files that failed before,
 * and styles written back as yEd graphics with the `graphty.styles` block as graph data.
 */

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { gunzipSync } from "node:zlib";

import { GraphBuilder } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { GRAPHML_ISSUE } from "../../../src/formats/graphml/index.js";
import { configurationOutline, putOutline } from "../../../src/formats/graphml/styles-yed.js";
import { extractPositions } from "../../../src/positions/index.js";
import { createRegistry } from "../../../src/registry.js";
import {
    type ExtractedStyles,
    featuresOf,
    planStyles,
    resolveStyles,
    styleFingerprint,
    type StyleRule,
} from "../../../src/styles/internal.js";
import type { StyleProperty } from "../../../src/styles/types.js";
import { editGraphmlNodeFill, replaceGraphmlBlock } from "../../styles/formats/graphml.js";
import { checkOutsideEdit, importForStyles } from "../../styles/harness.js";

const registry = createRegistry();
const CORPUS = resolve(import.meta.dirname, "../../corpus/styles/graphml");
const GENERATED = join(CORPUS, "generated");

/**
 * A corpus file's bytes, decompressed when it is stored gzip-compressed.
 * @param path - the file
 * @returns the bytes
 */
function corpusBytes(path: string): Uint8Array {
    const bytes = new Uint8Array(readFileSync(path));
    return path.endsWith(".gz") ? new Uint8Array(gunzipSync(bytes)) : bytes;
}

/**
 * Imports a GraphML document with its styles.
 * @param doc - the document
 * @param toolDefaults - whether the writing program's defaults are added
 * @returns the import result, with styles
 */
async function load(doc: string | Uint8Array, toolDefaults = true) {
    const result = await registry.importGraph(doc, {
        format: "graphml",
        styles: { toolDefaults },
        errorLimit: Infinity,
    });
    if (result.styles === null || result.styles === undefined) {
        throw new Error("no styles");
    }
    return { ...result, styles: result.styles };
}

const plain = (ex: ExtractedStyles): StyleRule[] => JSON.parse(JSON.stringify(ex.styles.rules)) as StyleRule[];

const YED_HEAD = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<graphml xmlns="http://graphml.graphdrawing.org/xmlns" xmlns:y="http://www.yworks.com/xml/graphml">',
    '<key for="node" id="d6" yfiles.type="nodegraphics"/><key for="edge" id="d10" yfiles.type="edgegraphics"/>',
    '<graph edgedefault="directed" id="G">',
].join("\n");

describe("GraphML styles: yEd", () => {
    it("reads every visible label of icon nodes whose first label is empty, and notes further labels", async () => {
        const { snapshot, styles } = await load(corpusBytes(join(GENERATED, "labels-multi.graphml")));
        expect(styles.styles.source).toEqual({ format: "graphml", dialect: "yed", tool: "yed" });
        expect(resolveStyles(styles, "node", "label", snapshot)).toEqual([
            "shown second",
            "first",
            "only real text",
            "<html><b>bold</b> text</html>",
            "plain",
            "padded",
        ]);
        const extra = styles.styles.notes.find((n) => n.code === "W_STYLE_EXTRA_LABELS");
        expect(extra?.elements).toEqual([1]);
        const n5 = snapshot.ids.indexOf("n5");
        expect(resolveStyles(styles, "node", "labelWeight", snapshot)[n5]).toBe("bold");
        expect(resolveStyles(styles, "node", "labelItalic", snapshot)[n5]).toBe(true);
        // a font Java may not have is drawn in Dialog's face
        expect(resolveStyles(styles, "node", "labelFont", snapshot)[n5]).toBe("Comic Sans MS, DejaVu Sans, sans-serif");
        expect(resolveStyles(styles, "node", "labelPosition", snapshot)[n5]).toBe("bottom");
    });

    it("draws Java's logical fonts in the faces Java draws them in, and writes them back as yEd names them", async () => {
        const node = (id: string, label: string): string =>
            `<node id="${id}"><data key="d6"><y:ShapeNode><y:Geometry height="30" width="50" x="0" y="0"/>` +
            `<y:NodeLabel ${label}>${id}</y:NodeLabel></y:ShapeNode></data></node>`;
        const doc = [
            YED_HEAD,
            node("dialog", 'fontFamily="Dialog"'),
            node("sansserif", 'fontFamily="SansSerif"'),
            node("serif", 'fontFamily="Serif"'),
            node("monospaced", 'fontFamily="Monospaced"'),
            node("dialoginput", 'fontFamily="DialogInput"'),
            node("unset", ""),
            "</graph></graphml>",
        ].join("\n");
        const { snapshot, styles } = await load(doc);
        expect(resolveStyles(styles, "node", "labelFont", snapshot)).toEqual([
            "DejaVu Sans, sans-serif",
            "DejaVu Sans, sans-serif",
            "DejaVu Serif, serif",
            "DejaVu Sans Mono, monospace",
            "DejaVu Sans Mono, monospace",
            // yEd's default, Dialog
            "DejaVu Sans, sans-serif",
        ]);
        const text = await registry.exportGraphToString(snapshot, "graphml", { styles });
        expect(text).toContain('fontFamily="Dialog"');
        expect(text).toContain('fontFamily="Serif"');
        expect(text).toContain('fontFamily="Monospaced"');
        expect(text).not.toMatch(/fontFamily="[^"]*DejaVu/);
    });

    it("draws a label's background color behind its words, and none where hasBackgroundColor is false", async () => {
        const node = (id: string, label: string): string =>
            `<node id="${id}"><data key="d6"><y:ShapeNode><y:Geometry height="30" width="50" x="0" y="0"/>` +
            `<y:NodeLabel ${label}>${id}</y:NodeLabel></y:ShapeNode></data></node>`;
        const doc = [
            YED_HEAD,
            node("box", 'backgroundColor="#FFFF99"'),
            node("off", 'hasBackgroundColor="false" backgroundColor="#FFFF99"'),
            node("none", ""),
            '<edge id="e0" source="box" target="off"><data key="d10"><y:PolyLineEdge>' +
                '<y:EdgeLabel backgroundColor="#EBEBEB">e0</y:EdgeLabel></y:PolyLineEdge></data></edge>',
            "</graph></graphml>",
        ].join("\n");
        const { snapshot, styles } = await load(doc);
        expect(resolveStyles(styles, "node", "labelBackground", snapshot)).toEqual(["#ffff99", null, null]);
        expect(resolveStyles(styles, "edge", "labelBackground", snapshot)).toEqual(["#ebebeb"]);
    });

    it("draws a one-pixel line round a label's box in its lineColor, and none where hasLineColor is false", async () => {
        const node = (id: string, label: string): string =>
            `<node id="${id}"><data key="d6"><y:ShapeNode><y:Geometry height="30" width="50" x="0" y="0"/>` +
            `<y:NodeLabel ${label}>${id}</y:NodeLabel></y:ShapeNode></data></node>`;
        const doc = [
            YED_HEAD,
            node("line", 'backgroundColor="#B7C9E3" lineColor="#25537A"'),
            node("off", 'hasLineColor="false" lineColor="#25537A"'),
            node("none", ""),
            "</graph></graphml>",
        ].join("\n");
        const { snapshot, styles } = await load(doc);
        expect(resolveStyles(styles, "node", "labelBorderColor", snapshot)).toEqual(["#25537a", null, null]);
        expect(resolveStyles(styles, "node", "labelBorderWidth", snapshot)).toEqual([1, null, null]);
    });

    it("places a node label inside or outside by its box, inside by yEd's internal model", async () => {
        const node = (id: string, label: string): string =>
            `<node id="${id}"><data key="d6"><y:ShapeNode><y:Geometry height="30" width="50" x="0" y="0"/>` +
            `<y:NodeLabel ${label}>${id}</y:NodeLabel></y:ShapeNode></data></node>`;
        const doc = [
            YED_HEAD,
            // inside at the node's top edge: yEd's internal "t"
            node("internal-t", 'modelName="internal" modelPosition="t"'),
            node("sides-n", 'modelName="sides" modelPosition="n"'),
            // a custom (SmartNodeLabelModel) label whose box lies entirely below the node
            node("custom-below", 'modelName="custom" x="-5" y="34" width="60" height="18"'),
            node("custom-inside", 'modelName="custom" x="10" y="6" width="30" height="18"'),
            // a group's header: as wide as the node, along its top, its words to the right
            node(
                "header",
                'modelName="internal" modelPosition="t" alignment="right" autoSizePolicy="node_width" x="0" y="0" width="50" height="21"',
            ),
            node("internal-bl", 'modelName="internal" modelPosition="bl" x="2" y="10" width="20" height="18"'),
            node("internal-c", 'modelName="internal" modelPosition="c"'),
            "</graph></graphml>",
        ].join("\n");
        const { snapshot, styles } = await load(doc);
        expect(resolveStyles(styles, "node", "labelPosition", snapshot)).toEqual([
            "inside-top",
            "top",
            "bottom",
            "center",
            "inside-top-right",
            "inside-bottom-left",
            "center",
        ]);
        // inside, the label is as far from the sides it is against as its stored box says; a header band says
        // nothing; below the node, 4 from it
        expect(resolveStyles(styles, "node", "labelOffsetX", snapshot)).toEqual([
            null,
            null,
            null,
            null,
            null,
            2,
            null,
        ]);
        expect(resolveStyles(styles, "node", "labelOffsetY", snapshot)).toEqual([null, null, 4, null, null, -2, null]);
    });

    it("reads yEd's inside places (t, b, l, r, tl, ...) as inside and n, s, e, w, nw, ... as outside, with no model named", async () => {
        // a NodeLabel with no modelName is in yEd's internal model, whose places are inside the node; the exterior
        // places are the compass names (yFiles InteriorLabelModel and ExteriorLabelModel)
        const places = ["t", "b", "l", "r", "tl", "tr", "bl", "br", "n", "s", "e", "w", "nw", "ne", "sw", "se"];
        const doc = [
            YED_HEAD,
            ...places.map(
                (p) =>
                    `<node id="${p}"><data key="d6"><y:ShapeNode><y:Geometry height="30" width="50" x="0" y="0"/>` +
                    `<y:NodeLabel modelPosition="${p}">${p}</y:NodeLabel></y:ShapeNode></data></node>`,
            ),
            "</graph></graphml>",
        ].join("\n");
        const { snapshot, styles } = await load(doc);
        expect(resolveStyles(styles, "node", "labelPosition", snapshot)).toEqual([
            "inside-top",
            "inside-bottom",
            "inside-left",
            "inside-right",
            "inside-top-left",
            "inside-top-right",
            "inside-bottom-left",
            "inside-bottom-right",
            "top",
            "bottom",
            "right",
            "left",
            "top-left",
            "top-right",
            "bottom-left",
            "bottom-right",
        ]);
    });

    it("keeps an outside label's distance from its node and a free label's offset, from the stored box", async () => {
        // a 40 x 26 node and a 22.6 x 17 label, as yEd writes them on the labels-p2 specimen sheet
        const node = (id: string, label: string): string =>
            `<node id="${id}"><data key="d6"><y:ShapeNode><y:Geometry height="26" width="40" x="0" y="0"/>` +
            `<y:NodeLabel width="22.6" height="17" ${label}>${id}</y:NodeLabel></y:ShapeNode></data></node>`;
        const doc = [
            YED_HEAD,
            node("sides-s", 'modelName="sides" modelPosition="s" x="8.7" y="30"'),
            node("sides-w", 'modelName="sides" modelPosition="w" x="-26.6" y="4.5"'),
            node("corners-se", 'modelName="corners" modelPosition="se" x="44" y="30"'),
            node("sandwich-n", 'modelName="sandwich" modelPosition="n" x="8.7" y="-21"'),
            node("free-above", 'modelName="free" modelPosition="anywhere" x="30" y="-18"'),
            node("free-over", 'modelName="free" modelPosition="anywhere" x="12" y="2"'),
            node("internal-c", 'modelName="internal" modelPosition="c" x="8.7" y="4.5"'),
            node("turned-s", 'modelName="sides" modelPosition="s" x="8.7" y="30" rotationAngle="90"'),
            "</graph></graphml>",
        ].join("\n");
        const { snapshot, styles } = await load(doc);
        expect(resolveStyles(styles, "node", "labelPosition", snapshot)).toEqual([
            "bottom",
            "left",
            "bottom-right",
            "top",
            "top",
            "center",
            "center",
            "bottom",
        ]);
        // yEd's 4-point distance across the side, the box's middle along it (a free label's offset on both axes)
        expect(resolveStyles(styles, "node", "labelOffsetX", snapshot)).toEqual([
            null,
            -4,
            4,
            null,
            21.3,
            3.3,
            null,
            null,
        ]);
        expect(resolveStyles(styles, "node", "labelOffsetY", snapshot)).toEqual([4, null, 4, -4, -1, -2.5, null, null]);
    });

    it("turns node and edge labels by yEd's rotationAngle, clockwise on screen", async () => {
        const doc = [
            YED_HEAD,
            '<node id="a"><data key="d6"><y:ShapeNode><y:Geometry height="30" width="50" x="0" y="0"/>' +
                '<y:NodeLabel rotationAngle="90.0">a</y:NodeLabel></y:ShapeNode></data></node>',
            '<node id="b"><data key="d6"><y:ShapeNode><y:Geometry height="30" width="50" x="100" y="0"/>' +
                '<y:NodeLabel rotationAngle="-90">b</y:NodeLabel></y:ShapeNode></data></node>',
            '<node id="c"><data key="d6"><y:ShapeNode><y:Geometry height="30" width="50" x="200" y="0"/>' +
                '<y:NodeLabel rotationAngle="0.0">c</y:NodeLabel></y:ShapeNode></data></node>',
            '<edge id="e" source="a" target="b"><data key="d10"><y:PolyLineEdge>' +
                '<y:EdgeLabel rotationAngle="45.0">e</y:EdgeLabel></y:PolyLineEdge></data></edge>',
            "</graph></graphml>",
        ].join("\n");
        const { snapshot, styles } = await load(doc);
        expect(resolveStyles(styles, "node", "labelRotation", snapshot)).toEqual([90, 270, null]);
        expect(resolveStyles(styles, "edge", "labelRotation", snapshot)).toEqual([45]);
    });

    it("finds the positions of UML class nodes and of yFiles 3 NodeGeometry", async () => {
        const uml = [
            YED_HEAD,
            '<node id="a"><data key="d6"><y:UMLClassNode><y:Geometry height="40" width="80" x="10" y="20"/></y:UMLClassNode></data></node>',
            "</graph></graphml>",
        ].join("\n");
        const y3 = [
            '<?xml version="1.0" encoding="UTF-8"?>',
            '<graphml xmlns="http://graphml.graphdrawing.org/xmlns" xmlns:y="http://www.yworks.com/xml/yfiles-common/3.0">',
            '<key id="g" for="node" attr.name="NodeGeometry" y:attr.uri="http://www.yworks.com/xml/yfiles-common/2.0/NodeGeometry"/>',
            '<graph edgedefault="directed" id="G">',
            '<node id="a"><data key="g"><y:RectD X="10" Y="20" Width="80" Height="40"/></data></node>',
            "</graph></graphml>",
        ].join("\n");
        for (const doc of [uml, y3]) {
            const { snapshot, report } = await load(doc);
            const found = extractPositions(registry.importer("graphml"), snapshot, report);
            // the box's center, y up
            expect(Array.from(found?.coords ?? []).slice(0, 2)).toEqual([50, -40]);
        }
    });

    it("reads SmartNodeLabelModel placements and keeps the internal model's top inside the node", async () => {
        const { snapshot, styles } = await load(
            corpusBytes(join(CORPUS, "yed-shapenode/voc__voctomix__schema.graphml")),
        );
        const position = resolveStyles(styles, "node", "labelPosition", snapshot);
        // nodeRatioY 0.5 with labelRatioY -0.5: the label's top on the node's bottom edge.
        expect(position[snapshot.ids.indexOf("n2::n0")]).toBe("bottom");
        // A group's internal `t` header, as wide as the group with its words to the right: inside its top right.
        expect(position[snapshot.ids.indexOf("n0")]).toBe("inside-top-right");
    });

    it("maps SmartNodeLabelModel ratios to the nearest position", async () => {
        const smart = (id: string, lx: number, ly: number, nx: number, ny: number): string =>
            `<node id="${id}"><data key="d6"><y:ShapeNode><y:NodeLabel modelName="custom">L<y:LabelModel><y:SmartNodeLabelModel distance="4.0"/></y:LabelModel><y:ModelParameter><y:SmartNodeLabelModelParameter labelRatioX="${String(lx)}" labelRatioY="${String(ly)}" nodeRatioX="${String(nx)}" nodeRatioY="${String(ny)}" offsetX="0.0" offsetY="0.0" upX="0.0" upY="-1.0"/></y:ModelParameter></y:NodeLabel></y:ShapeNode></data></node>`;
        const { snapshot, styles } = await load(
            `${YED_HEAD}${smart("c", 0, 0, 0, 0)}${smart("top", 0, 0.5, 0, -0.5)}${smart("in", 0, -0.5, 0, -0.5)}${smart("r", -0.5, 0, 0.5, 0)}${smart("bl", 0.5, -0.5, -0.5, 0.5)}
            <node id="x"><data key="d6"><y:ShapeNode><y:NodeLabel modelName="custom">L<y:LabelModel><y:Other/></y:LabelModel></y:NodeLabel></y:ShapeNode></data></node>
            <node id="s"><data key="d6"><y:ShapeNode><y:NodeLabel modelName="sides" modelPosition="n">L</y:NodeLabel></y:ShapeNode></data></node>
            </graph></graphml>`,
        );
        const position = resolveStyles(styles, "node", "labelPosition", snapshot);
        const at = (id: string): unknown => position[snapshot.ids.indexOf(id)];
        expect([at("c"), at("top"), at("in"), at("r"), at("bl"), at("s")]).toEqual([
            "center",
            "top",
            "inside-top",
            "right",
            "bottom-left",
            "top",
        ]);
        expect(at("x")).toBe("center");
        expect(styles.styles.notes.some((n) => n.code === "W_STYLE_UNKNOWN_VALUE")).toBe(true);
    });

    it("labels a real icon node by the visible label after its empty icon label", async () => {
        const { snapshot, styles } = await load(
            corpusBytes(join(CORPUS, "yed-shapenode/svanoort__pyresttest__contexts.graphml")),
        );
        const i = snapshot.ids.indexOf("n0");
        expect(resolveStyles(styles, "node", "label", snapshot)[i]).toBe("Variable Binding");
    });

    it("reads a TableNode's header and lanes as bands in its table colors", async () => {
        const table = (id: string, props: string, rows: string, cols: string, insets: string): string =>
            `<node id="${id}"><data key="d6"><y:TableNode configuration="YED_TABLE_NODE">` +
            '<y:Geometry height="90.0" width="150.0" x="0" y="0"/><y:Fill color="#ECF5FF" color2="#0042F440"/>' +
            `<y:StyleProperties>${props}</y:StyleProperties><y:Table><y:Insets ${insets}/>` +
            `<y:Columns>${cols}</y:Columns><y:Rows>${rows}</y:Rows></y:Table></y:TableNode></data></node>`;
        const prop = (name: string, value: string): string =>
            `<y:Property class="java.awt.Color" name="yed.table.${name}" value="${value}"/>`;
        const row = '<y:Row height="30.0" id="r"/>';
        const col = (w: number): string => `<y:Column id="c" width="${w}"/>`;
        const doc = [
            YED_HEAD,
            table(
                "rows",
                prop("lane.color.main", "#C0C0C0") +
                    prop("lane.color.alternating", "#FFCC00") +
                    prop("header.color.main", "#FF9999"),
                row + row,
                col(150),
                'top="30.0" left="0.0"',
            ),
            table("plain", prop("lane.color.main", "#C0C0C0"), row + row, col(150), 'top="30.0"'),
            table(
                "cols",
                prop("lane.color.main", "#C0C0C0"),
                '<y:Row height="70.0" id="r"/>',
                col(50) + col(80),
                'left="20.0" top="0.0"',
            ),
            "</graph></graphml>",
        ].join("\n");
        const { snapshot, styles } = await load(doc);
        const at = (id: string): number => snapshot.ids.indexOf(id);
        const colors = resolveStyles(styles, "node", "stripeColors", snapshot);
        const sizes = resolveStyles(styles, "node", "stripeSizes", snapshot);
        const direction = resolveStyles(styles, "node", "stripeDirection", snapshot);
        expect([colors[at("rows")], sizes[at("rows")]]).toEqual([
            "#ff9999 #c0c0c0 #ffcc00",
            "0.333333 0.333333 0.333333",
        ]);
        // a color the table leaves unset is the node's fill; one lane color unset is the other
        expect(colors[at("plain")]).toBe("#ecf5ff #c0c0c0");
        expect([colors[at("cols")], sizes[at("cols")], direction[at("cols")]]).toEqual([
            "#ecf5ff #c0c0c0",
            "0.133333 0.866667",
            "right",
        ]);
        expect(direction[at("rows")]).toBeNull();
        expect(resolveStyles(styles, "node", "shape", snapshot)[at("rows")]).toBe("rectangle");
    });

    it("reads no fill for transparent and hasColor=false fills, gradients into color2, alpha last", async () => {
        const { snapshot, styles } = await load(corpusBytes(join(GENERATED, "fill-oddities.graphml")));
        const fill = resolveStyles(styles, "node", "fill", snapshot);
        const opacity = resolveStyles(styles, "node", "fillOpacity", snapshot);
        const at = (id: string): number => snapshot.ids.indexOf(id);
        expect([fill[at("n0")], opacity[at("n0")]]).toEqual(["#ff0000", 0.501961]);
        expect(fill[at("n1")]).toBe("#ff0000");
        // a shape node's gradient runs left to right
        expect(resolveStyles(styles, "node", "fillGradient", snapshot)[at("n1")]).toBe("#0000ff");
        expect(resolveStyles(styles, "node", "fillGradientAngle", snapshot)[at("n1")]).toBe(0);
        // from a third of the way across, mirrored back over the left third: the left side halfway between
        expect(resolveStyles(styles, "node", "fillGradientColors", snapshot)[at("n1")]).toBe("#800080 #ff0000 #0000ff");
        expect(resolveStyles(styles, "node", "fillGradientStops", snapshot)[at("n1")]).toBe("0 0.333333 1");
        expect(resolveStyles(styles, "node", "fillGradient", snapshot)[at("n0")]).toBeNull();
        expect(opacity[at("n2")]).toBe(0);
        expect(opacity[at("n3")]).toBe(0);
        expect(resolveStyles(styles, "node", "borderWidth", snapshot)[at("n9")]).toBe(0);
        const codes = styles.styles.notes.map((n) => n.code);
        expect(codes).not.toContain("W_STYLE_GRADIENT");
        expect(codes).toContain("W_STYLE_NO_FILL");
        expect(resolveStyles(styles, "node", "shape", snapshot)[at("n12")]).toBe("diamond");
        // a BPMN gateway is a diamond in yEd
        expect(resolveStyles(styles, "node", "shape", snapshot)[at("n13")]).toBe("diamond");
        expect(resolveStyles(styles, "edge", "sourceArrow", snapshot)[0]).toBe("triangle-open");
        expect(resolveStyles(styles, "edge", "targetArrow", snapshot)[0]).toBe("crow");
    });

    it("reads the curve, line type and arrows of every edge realizer", async () => {
        const { snapshot, styles } = await load(
            `${YED_HEAD}<node id="a"/><node id="b"/>
            <edge source="a" target="b"><data key="d10"><y:BezierEdge><y:Path sx="0" sy="0" tx="0" ty="0"><y:Point x="40" y="60"/></y:Path><y:LineStyle color="#FF0000" type="dashed" width="2.0"/><y:Arrows source="none" target="standard"/></y:BezierEdge></data></edge>
            <edge source="b" target="a"><data key="d10"><y:PolyLineEdge><y:LineStyle color="#00FF0080" type="dotted" width="1.0"/><y:Arrows source="none" target="none"/><y:BendStyle smoothed="false"/></y:PolyLineEdge></data></edge>
            <edge source="a" target="b"><data key="d10"><y:PolyLineEdge><y:Arrows source="none" target="delta"/></y:PolyLineEdge></data></edge>
            </graph></graphml>`,
        );
        expect(resolveStyles(styles, "edge", "curved", snapshot).slice(0, 2)).toEqual([true, false]);
        expect(resolveStyles(styles, "edge", "lineStyle", snapshot).slice(0, 2)).toEqual(["dashed", "dotted"]);
        expect(resolveStyles(styles, "edge", "color", snapshot).slice(0, 2)).toEqual(["#ff0000", "#00ff00"]);
        expect(resolveStyles(styles, "edge", "opacity", snapshot).slice(0, 2)).toEqual([null, 0.501961]);
        // yEd's standard arrow is a triangle with its back pressed in (a vee); its delta is the plain triangle
        expect(resolveStyles(styles, "edge", "targetArrow", snapshot)).toEqual(["vee", "none", "triangle"]);
    });

    it("reads a framed edge as yEd draws it: a band of the line's width outlined 1 wide, filled or hollow", async () => {
        const framed = (line: string, fill: string): string =>
            `<edge source="a" target="b"><data key="d10"><y:GenericEdge configuration="com.yworks.edge.framed"><y:LineStyle ${line}/><y:Arrows source="none" target="none"/>${fill}</y:GenericEdge></data></edge>`;
        const fillOf = (c: string): string =>
            `<y:StyleProperties><y:Property class="java.awt.Color" name="FramedEdgePainter.fillColor" value="${c}"/></y:StyleProperties>`;
        const { snapshot, styles } = await load(
            `${YED_HEAD}<node id="a"/><node id="b"/>
            ${framed('color="#5F809D" type="line" width="3.0"', fillOf("#ffffff"))}
            ${framed('color="#00CC99" type="line" width="2.0"', "")}
            ${framed('color="#000000" type="line" width="1.0"', fillOf("#ffffff"))}
            </graph></graphml>`,
        );
        const get = (p: StyleProperty): readonly unknown[] => resolveStyles(styles, "edge", p, snapshot);
        // graphml-galaxy-lcms-workflow: a band 3 wide stroked 1 wide in #5F809D over a fill of #ffffff, so the white
        // inside is 2 wide and the outline reaches 2 past it; graphml-synthetic-edges: no fill color, the outline alone
        expect(get("color")).toEqual(["#ffffff", "#00cc99", "#000000"]);
        expect(get("width")).toEqual([2, 3, 2]);
        expect(get("outlineColor")).toEqual(["#5f809d", null, null]);
        expect(get("outlineWidth")).toEqual([2, null, null]);
        // its arrowheads are outlined in the line's color, not the fill's
        expect(get("targetArrowColor")).toEqual(["#5f809d", null, null]);
    });

    it("reads a generic node's gradient corner to corner and draws none on a table", async () => {
        const fill = '<y:Fill color="#FF0000" color2="#0000FF" transparent="false"/>';
        const { snapshot, styles } = await load(
            [
                '<?xml version="1.0" encoding="UTF-8"?>',
                '<graphml xmlns="http://graphml.graphdrawing.org/xmlns" xmlns:y="http://www.yworks.com/xml/graphml">',
                '<key for="node" id="d6" yfiles.type="nodegraphics"/>',
                '<graph edgedefault="directed" id="G">',
                `<node id="g"><data key="d6"><y:GenericNode configuration="com.yworks.flowchart.process"><y:Geometry height="40" width="80" x="0" y="0"/>${fill}</y:GenericNode></data></node>`,
                `<node id="t"><data key="d6"><y:TableNode configuration="YED_TABLE_NODE"><y:Geometry height="90" width="150" x="0" y="0"/>${fill}</y:TableNode></data></node>`,
                "</graph></graphml>",
            ].join("\n"),
        );
        const at = (id: string): number => snapshot.ids.indexOf(id);
        const angle = resolveStyles(styles, "node", "fillGradientAngle", snapshot);
        const gradient = resolveStyles(styles, "node", "fillGradient", snapshot);
        // stretched over the 80 x 40 box, a ramp at atan2(40^2, 80^2) changes color along the box's diagonal
        expect([gradient[at("g")], angle[at("g")]]).toEqual(["#0000ff", 14.036]);
        expect(gradient[at("t")]).toBeNull();
    });

    it("adds yEd's defaults beneath the file's own values, and none with toolDefaults: false", async () => {
        const doc = `${YED_HEAD}<node id="a"><data key="d6"><y:ShapeNode><y:Geometry height="30" width="30" x="0" y="0"/></y:ShapeNode></data></node></graph></graphml>`;
        const { snapshot, styles } = await load(doc);
        expect(resolveStyles(styles, "node", "fill", snapshot)).toEqual(["#ccccff"]);
        const bare = await load(doc, false);
        expect(bare.styles.styles.rules.filter((r) => r.origin === "tool")).toEqual([]);
        expect(bare.styles.styles.graph.background).toBeUndefined();
    });

    it("paints a yEd file white, as yEd's canvas does: the file holds no background", async () => {
        const { styles } = await load(
            `${YED_HEAD}<node id="a"><data key="d6"><y:ShapeNode><y:Fill color="#FF0000"/></y:ShapeNode></data></node></graph></graphml>`,
        );
        expect(styles.styles.source.tool).toBe("yed");
        expect(styles.styles.graph.background).toBe("#ffffff");
    });

    it("draws yEd's flowchart GenericNodes as the shapes yEd draws, matching the name whole", async () => {
        const generic = (id: string, conf: string): string =>
            `<node id="${id}"><data key="d6"><y:GenericNode configuration="com.yworks.flowchart.${conf}"><y:Geometry height="30" width="50" x="0" y="0"/></y:GenericNode></data></node>`;
        const doc = `${YED_HEAD}${generic("a", "data")}${generic("b", "terminator")}${generic("c", "storedData")}${generic("d", "process")}</graph></graphml>`;
        const { snapshot, styles } = await load(doc, false);
        expect(resolveStyles(styles, "node", "shape", snapshot)).toEqual([
            "parallelogram",
            "round-rectangle",
            "polygon",
            "rectangle",
        ]);
    });

    it("draws the GenericNodes no neutral shape names as the outlines yEd draws, as polygons", async () => {
        const generic = (id: string, conf: string): string =>
            `<node id="${id}"><data key="d6"><y:GenericNode configuration="com.yworks.${conf}"><y:Geometry height="30" width="50" x="0" y="0"/></y:GenericNode></data></node>`;
        const doc = `${YED_HEAD}${generic("a", "flowchart.card")}${generic("b", "flowchart.document")}${generic("c", "flowchart.dataBase")}${generic("d", "entityRelationship.relationship")}${generic("e", "bpmn.Conversation.withShadow")}${generic("f", "sbgn.Tag")}${generic("g", "flowchart.unknownThing")}</graph></graphml>`;
        const { snapshot, styles } = await load(doc, false);
        expect(resolveStyles(styles, "node", "shape", snapshot)).toEqual([
            "polygon",
            "polygon",
            "other:database",
            "diamond",
            "hexagon",
            "polygon",
            "other:com.yworks.flowchart.unknownthing",
        ]);
        const points = resolveStyles(styles, "node", "shapePoints", snapshot);
        // a card: a box with its top left corner cut, y up
        expect(points[0]).toBe("-1,-1 1,-1 1,1 -0.6,1 -1,0.6");
        // a document: a box whose bottom is a wave, low on the left and high on the right
        const doc1 = String(points[1])
            .split(" ")
            .map((p) => p.split(",").map(Number));
        const bottomAt = (x: number): number => doc1.find(([px]) => Math.abs(px - x) < 1e-9)?.[1] ?? Number.NaN;
        expect(bottomAt(-0.5)).toBeLessThan(bottomAt(0.5));
        expect(points.slice(2)).toEqual([null, null, null, "-1,1 -1,-1 0.6,-1 1,0 0.6,1", null]);
    });

    it("draws yEd's BPMN and entity-relationship GenericNodes as the shapes yEd draws", async () => {
        const generic = (id: string, conf: string): string =>
            `<node id="${id}"><data key="d6"><y:GenericNode configuration="com.yworks.${conf}"><y:Geometry height="30" width="50" x="0" y="0"/></y:GenericNode></data></node>`;
        const doc = `${YED_HEAD}${generic("a", "bpmn.Activity.withShadow")}${generic("b", "bpmn.Event.withShadow")}${generic("c", "bpmn.Gateway.withShadow")}${generic("d", "entityRelationship.attribute")}</graph></graphml>`;
        const { snapshot, styles } = await load(doc, false);
        expect(resolveStyles(styles, "node", "shape", snapshot)).toEqual([
            "round-rectangle",
            "ellipse",
            "diamond",
            "ellipse",
        ]);
    });

    it("draws yEd's BPMN data object as a page with a folded corner and its data store as a cylinder, by their type", async () => {
        const artifact = (id: string, type: string): string =>
            `<node id="${id}"><data key="d6"><y:GenericNode configuration="com.yworks.bpmn.Artifact.withShadow"><y:Geometry height="50" width="35" x="0" y="0"/><y:StyleProperties><y:Property class="com.yworks.yfiles.bpmn.view.BPMNTypeEnum" name="com.yworks.bpmn.type" value="${type}"/></y:StyleProperties></y:GenericNode></data></node>`;
        const doc = `${YED_HEAD}${artifact("a", "ARTIFACT_TYPE_DATA_OBJECT")}${artifact("b", "ARTIFACT_TYPE_DATA_STORE")}${artifact("c", "ARTIFACT_TYPE_REQUEST_MESSAGE")}</graph></graphml>`;
        const { snapshot, styles } = await load(doc, false);
        expect(resolveStyles(styles, "node", "shape", snapshot)).toEqual(["polygon", "other:database", "rectangle"]);
        // the top right corner (y up) is cut
        expect(resolveStyles(styles, "node", "shapePoints", snapshot)).toEqual([
            "-1,-1 1,-1 1,0.4 0.2,1 -1,1",
            null,
            null,
        ]);
    });

    it("draws yEd's image and SVG nodes as their pictures from the graph's resources, stretched over the node", async () => {
        const head = YED_HEAD.replace(
            '<graph edgedefault="directed" id="G">',
            '<key for="graphml" id="d7" yfiles.type="resources"/><graph edgedefault="directed" id="G">',
        );
        const geometry = '<y:Geometry height="30" width="50" x="0" y="0"/>';
        const doc = [
            head,
            `<node id="a"><data key="d6"><y:ImageNode>${geometry}<y:Image refid="2"/></y:ImageNode></data></node>`,
            `<node id="b"><data key="d6"><y:SVGNode>${geometry}<y:SVGModel svgBoundsPolicy="0"><y:SVGContent refid="1"/></y:SVGModel></y:SVGNode></data></node>`,
            `<node id="c"><data key="d6"><y:ImageNode>${geometry}<y:Image refid="9"/></y:ImageNode></data></node>`,
            "</graph>",
            '<data key="d7"><y:Resources>',
            '<y:Resource id="1" type="java.lang.String">&lt;svg xmlns="http://www.w3.org/2000/svg" width="4" height="4"/&gt;</y:Resource>',
            '<y:Resource id="2" type="java.awt.image.BufferedImage">iVBORw0K\nGgo=</y:Resource>',
            "</y:Resources></data></graphml>",
        ].join("\n");
        const { snapshot, styles } = await load(doc, false);
        expect(resolveStyles(styles, "node", "image", snapshot)).toEqual([
            "data:image/png;base64,iVBORw0KGgo=",
            `data:image/svg+xml;utf8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="4" height="4"/>')}`,
            null,
        ]);
        expect(resolveStyles(styles, "node", "imageFit", snapshot)).toEqual(["fill", "fill", null]);
    });

    it("paints neither the fill nor the border of yEd's image and SVG nodes, only their pictures", async () => {
        // yEd's own SVG of graphml-stm32-func draws its 15 ImageNodes, each with <y:Fill color="#CCCCFF"> and a black
        // <y:BorderStyle>, as an <image> alone: #CCCCFF appears nowhere in it (graphml-synthetic-nodes likewise).
        const paint = '<y:Fill color="#CCCCFF" transparent="false"/><y:BorderStyle color="#000000" width="1.0"/>';
        const geometry = '<y:Geometry height="30" width="50" x="0" y="0"/>';
        const doc = [
            YED_HEAD,
            `<node id="a"><data key="d6"><y:ImageNode>${geometry}${paint}<y:Image refid="2"/></y:ImageNode></data></node>`,
            `<node id="b"><data key="d6"><y:SVGNode>${geometry}${paint}<y:SVGModel svgBoundsPolicy="0"><y:SVGContent refid="1"/></y:SVGModel></y:SVGNode></data></node>`,
            `<node id="c"><data key="d6"><y:ImageNode>${geometry}</y:ImageNode></data></node>`,
            `<node id="d"><data key="d6"><y:ShapeNode>${geometry}${paint}</y:ShapeNode></data></node>`,
            "</graph></graphml>",
        ].join("\n");
        const { snapshot, styles } = await load(doc, false);
        expect(resolveStyles(styles, "node", "shape", snapshot)).toEqual(["none", "none", "none", null]);
        expect(resolveStyles(styles, "node", "fill", snapshot)).toEqual([null, null, null, "#ccccff"]);
        expect(resolveStyles(styles, "node", "borderWidth", snapshot)).toEqual([null, null, null, 1]);
    });

    it("draws a yEd image or SVG node as its picture alone, without the realizer's fill or border", async () => {
        // yEd's own drawing of yed-graphml-specimen-images-charts and graphml-synthetic-nodes paints neither
        const head = YED_HEAD.replace(
            '<graph edgedefault="directed" id="G">',
            '<key for="graphml" id="d7" yfiles.type="resources"/><graph edgedefault="directed" id="G">',
        );
        const geometry = '<y:Geometry height="36" width="36" x="0" y="0"/>';
        const paint =
            '<y:Fill color="#C8C8C8" transparent="false"/><y:BorderStyle color="#505050" type="line" width="1.0"/>';
        const doc = [
            head,
            `<node id="a"><data key="d6"><y:SVGNode>${geometry}${paint}<y:SVGModel svgBoundsPolicy="0"><y:SVGContent refid="1"/></y:SVGModel></y:SVGNode></data></node>`,
            "</graph>",
            '<data key="d7"><y:Resources>',
            '<y:Resource id="1" type="java.lang.String">&lt;svg xmlns="http://www.w3.org/2000/svg" width="4" height="4"/&gt;</y:Resource>',
            "</y:Resources></data></graphml>",
        ].join("\n");
        const { snapshot, styles } = await load(doc, false);
        expect(resolveStyles(styles, "node", "shape", snapshot)).toEqual(["none"]);
    });

    describe("as yEd's own drawings show them", () => {
        const values = async (nodes: string, property: StyleProperty): Promise<readonly unknown[]> => {
            const { snapshot, styles } = await load(`${YED_HEAD}${nodes}</graph></graphml>`, false);
            return resolveStyles(styles, "node", property, snapshot);
        };
        const box = '<y:Geometry height="36" width="56" x="0" y="0"/>';
        const border = '<y:Fill color="#C8C8C8"/><y:BorderStyle color="#505050" type="line" width="1.0"/>';
        const realizer = (id: string, type: string, attrs: string, body: string, geometry = box): string =>
            `<node id="${id}"><data key="d6"><y:${type}${attrs}>${geometry}${border}${body}</y:${type}></data></node>`;
        const generic = (id: string, conf: string, props = "", geometry = box): string =>
            realizer(
                id,
                "GenericNode",
                ` configuration="com.yworks.${conf}"`,
                `<y:StyleProperties>${props}</y:StyleProperties>`,
                geometry,
            );
        const prop = (name: string, value: string): string =>
            `<y:Property class="java.lang.String" name="com.yworks.bpmn.${name}" value="${value}"/>`;
        const shapeNode = (id: string, type: string): string =>
            realizer(id, "ShapeNode", "", `<y:Shape type="${type}"/>`);

        it("draws an entity relationship big entity as a box with corners of 4", async () => {
            const nodes =
                generic("a", "entityRelationship.big_entity") + generic("b", "entityRelationship.small_entity");
            expect((await values(nodes, "shape"))[0]).toBe("round-rectangle");
            expect((await values(nodes, "cornerRadius"))[0]).toBe(4);
        });

        it("draws a raised UML class and a 3D rectangle with no outline, and a flat UML class with one", async () => {
            const uml = (id: string, raised: string): string =>
                realizer(id, "UMLClassNode", "", `<y:UML use3DEffect="${raised}"/>`);
            const nodes = uml("a", "true") + uml("b", "false") + shapeNode("c", "rectangle3d");
            expect(await values(nodes, "borderWidth")).toEqual([0, 1, 0]);
        });

        it("draws the soft shadow yEd paints under a node whose configuration or SHADOW_PAINTING asks for one", async () => {
            const painting = (value: string): string =>
                `<y:Property class="java.lang.Boolean" name="y.view.ShadowNodePainter.SHADOW_PAINTING" value="${value}"/>`;
            const legacy = (id: string, conf: string): string =>
                realizer(id, "GenericNode", ` configuration="${conf}"`, "");
            const nodes =
                generic("a", "bpmn.Activity.withShadow") +
                generic("b", "entityRelationship.big_entity") +
                generic("c", "entityRelationship.big_entity", painting("false")) +
                generic("d", "flowchart.process") +
                generic("e", "flowchart.process", painting("true")) +
                legacy("f", "BevelNode3") +
                legacy("g", "BevelNodeWithShadow") +
                legacy("h", "BevelNode2");
            const soft = 2.5;
            expect(await values(nodes, "shadowOpacity")).toEqual([
                ...[0.294, 0.294, null, null, 0.294, 0.294, 0.294],
                null,
            ]);
            expect(await values(nodes, "shadowColor")).toEqual([
                ...["#000000", "#000000", null, null, "#000000", "#000000", "#000000"],
                null,
            ]);
            expect(await values(nodes, "shadowOffsetX")).toEqual([soft, soft, null, null, soft, 3, 3, null]);
            expect(await values(nodes, "shadowOffsetY")).toEqual([soft, soft, null, null, soft, 3, 3, null]);
            expect(await values(nodes, "shadowBlur")).toEqual([4, 4, null, null, 4, 3.5, 3.5, null]);
        });

        it("draws a y:DropShadow as a hard shadow in its color, moved by its offsets", async () => {
            const nodes = realizer(
                "a",
                "ShapeNode",
                "",
                '<y:DropShadow color="#B3A691" offsetX="4" offsetY="8"/><y:Shape type="rectangle"/>',
            );
            expect(await values(nodes, "shadowColor")).toEqual(["#b3a691"]);
            expect(await values(nodes, "shadowOpacity")).toEqual([1]);
            expect(await values(nodes, "shadowBlur")).toEqual([0]);
            expect(await values(nodes, "shadowOffsetX")).toEqual([4]);
            expect(await values(nodes, "shadowOffsetY")).toEqual([8]);
        });

        it("reads the strips of a raised node from its fill, as Java's brighter() and darker() paint them", async () => {
            const uml = (id: string, fill: string): string =>
                `<node id="${id}"><data key="d6"><y:UMLClassNode>${box}${fill}<y:UML use3DEffect="true"/></y:UMLClassNode></data></node>`;
            const nodes =
                uml("a", '<y:Fill color="#FFCC00" transparent="false"/>') +
                uml("b", '<y:Fill color="#000000" transparent="false"/>') +
                uml("c", '<y:Fill hasColor="false" transparent="false"/>') +
                uml("d", '<y:Fill color="#FFCC00" transparent="true"/>');
            expect(await values(nodes, "raisedBorderWidth")).toEqual([1, 1, null, null]);
            expect(await values(nodes, "raisedBorderLightColor")).toEqual(["#ffff00", "#030303", null, null]);
            expect(await values(nodes, "raisedBorderDarkColor")).toEqual(["#b28e00", "#000000", null, null]);
        });

        it("draws a UML note as a box with a notch of 15 out of its top right corner", async () => {
            const nodes = realizer("a", "UMLNoteNode", "", "", '<y:Geometry height="50" width="100" x="0" y="0"/>');
            expect(await values(nodes, "shape")).toEqual(["polygon"]);
            expect(await values(nodes, "shapePoints")).toEqual(["-1,1 0.7,1 0.7,0.4 1,0.4 1,-1 -1,-1"]);
            const [picture] = await values(nodes, "image");
            // the fold: a white triangle in the cut corner, outlined, so its two creases show
            expect(decodeURIComponent(String(picture))).toContain(
                'stroke="#505050" stroke-width="1" d="M85,0 L85,15 L100,15 Z"',
            );
            expect(await values(nodes, "imageFit")).toEqual(["fill"]);
        });

        it("draws a UML class's stereotype, constraint, attributes and methods as yEd 3.25 does", async () => {
            // the numbers are yed-graphml-specimen-node-shapes-p3's: a 76 x 56 class named in 10px DejaVu Sans
            const label =
                '<y:NodeLabel fontFamily="DejaVu Sans" fontSize="10" height="17.0" modelName="internal" modelPosition="t" width="22.6" x="26.7" y="4.0">Cls</y:NodeLabel>';
            const uml = (id: string, attrs: string, attributes = "-a: int", methods = "+m()"): string =>
                realizer(
                    id,
                    "UMLClassNode",
                    "",
                    `${label}<y:UML use3DEffect="true"${attrs}><y:AttributeLabel>${attributes}</y:AttributeLabel><y:MethodLabel>${methods}</y:MethodLabel></y:UML>`,
                    '<y:Geometry height="56" width="76" x="0" y="0"/>',
                );
            const nodes =
                uml("plain", "") +
                uml("stereotype", ' stereotype="entity"') +
                uml("constraint", ' constraint="abstract"') +
                uml("omit", ' omitDetails="true"') +
                uml("empty", "", "", "");
            const pictures = (await values(nodes, "image")).map((p) =>
                typeof p === "string" ? decodeURIComponent(p) : null,
            );
            const [plain, stereotype, constraint, omit, empty] = pictures;
            // a rule in the border's color under the name and under the attributes, 1 in from each side
            expect(plain).toContain('<path fill="none" stroke="#505050" d="M1,20.641H75M1,44.609H75"/>');
            // each row 5 in from the left in 12px type of the label's family, its baseline as yEd's
            expect(plain).toMatch(
                /<text x="5" y="37.779" font-size="12" font-family="DejaVu Sans[^"]*" fill="#000000">-a: int<\/text>/,
            );
            expect(plain).toContain('y="61.748"');
            expect(plain).toContain(">+m()</text>");
            // the stereotype above the name in the middle; the name, the rules and the rows drop under it
            expect(stereotype).toMatch(
                /<text x="38" y="16.139" text-anchor="middle"[^>]*>&lt;&lt;entity&gt;&gt;<\/text>/,
            );
            expect(stereotype).toContain('y="60.748"');
            // the constraint under the name in the middle
            expect(constraint).toMatch(/<text x="38" y="34.779" text-anchor="middle"[^>]*>\{abstract\}<\/text>/);
            expect(constraint).toContain('y="60.748"');
            expect([omit, empty]).toEqual([null, null]);
            expect(await values(nodes, "labelOffsetY")).toEqual([4, 26.969, 4, 4, 4]);
        });

        it("draws the part of an SBGN multimer's copy 6 down and right of it that shows", async () => {
            const mcount = '<y:Property class="java.lang.Integer" name="com.yworks.sbgn.style.mcount" value="2"/>';
            const nodes = generic("a", "sbgn.Macromolecule", mcount) + generic("b", "sbgn.Macromolecule");
            const [picture, none] = await values(nodes, "image");
            expect(none).toBeNull();
            const svg = decodeURIComponent(String(picture));
            expect(svg).toContain('<path fill="none" stroke="#505050" stroke-width="1" d="M');
            // from the copy's top right corner, round its bottom right one, to its bottom left one
            expect(svg).toContain("L62,18");
            expect(svg).toContain("L50,42");
            expect(await values(nodes, "imageWidth")).toEqual([61, null]);
            expect(await values(nodes, "imageOffsetX")).toEqual([3, null]);
        });

        it("draws the symbols inside BPMN nodes, in the icon colors where the node sets them", async () => {
            const square = '<y:Geometry height="36" width="36" x="0" y="0"/>';
            const nodes =
                generic("a", "bpmn.Event", prop("type", "EVENT_TYPE_MESSAGE"), square) +
                generic(
                    "b",
                    "bpmn.Event",
                    prop("type", "EVENT_TYPE_MESSAGE") +
                        prop("icon.fill", "#ff0000") +
                        prop("icon.line.color", '"/><script/>'),
                    square,
                ) +
                generic("c", "bpmn.Event", prop("type", "EVENT_TYPE_PLAIN"), square) +
                generic("d", "bpmn.Activity", prop("taskType", "TASK_TYPE_BUSINESS_RULE"));
            const [message, red, plain, rule] = (await values(nodes, "image")).map((url) =>
                typeof url === "string" ? decodeURIComponent(url) : null,
            );
            // the envelope in the node's fill and line, where yEd draws it on an event 36 across
            expect(message).toContain('fill="#c8c8c8" stroke="#505050"');
            expect(message).toContain("translate(8.22 11.48)");
            // an icon color that is no color is not read
            expect(red).toContain('fill="#ff0000" stroke="#505050"');
            expect(red).not.toContain("script");
            expect(plain).toBeNull();
            // the header of the rule's table in the darker fill
            expect(rule).toContain('fill="#8c8c8c"');
            expect(await values(nodes, "imageFit")).toEqual(["fill", "fill", null, "fill"]);
        });

        it("draws an activity's markers side by side along its bottom, past its sides where they do not fit", async () => {
            const marker = (i: number, name: string): string => prop(`marker${String(i)}`, `BPMN_MARKER_${name}`);
            const nodes =
                generic("a", "bpmn.Activity", prop("type", "ACTIVITY_TYPE_SUBPROCESS_LOOP")) +
                generic(
                    "b",
                    "bpmn.Activity",
                    [marker(1, "LOOP"), marker(2, "PARALLEL"), marker(3, "AD_HOC")].join(""),
                ) +
                generic(
                    "c",
                    "bpmn.Activity",
                    [marker(1, "LOOP"), marker(2, "PARALLEL"), marker(3, "COMPENSATION"), marker(4, "AD_HOC")].join(""),
                );
            const [loop, three, four] = (await values(nodes, "image")).map((url) =>
                typeof url === "string" ? decodeURIComponent(url) : "",
            );
            // a loop, then a subprocess's plus, each 15 across, 5 apart, about the middle, 4 above the bottom
            expect(loop).toContain("translate(10.5 17) scale(0.15 0.15)");
            expect(loop).toContain("translate(30.5 17) scale(0.15 0.15)");
            expect(three).toContain("translate(0.5 17)");
            // four are 75 across: 9.5 past each side of a node 56 across
            expect(four).toContain("translate(-9.5 17)");
            expect(await values(nodes, "imageFit")).toEqual(["fill", "fill", "none"]);
            expect(await values(nodes, "imageWidth")).toEqual([null, null, 74]);
            expect(await values(nodes, "imageOffsetX")).toEqual([null, null, 0]);
        });

        it("draws an event, a gateway and the round flowchart and SBGN nodes in the largest square of their box", async () => {
            const confs = [
                "bpmn.Event",
                "bpmn.Event.withShadow",
                "bpmn.Gateway",
                "flowchart.start2",
                "flowchart.onPageReference",
                "flowchart.sequentialData",
                "flowchart.offPageReference",
                "sbgn.emptySet",
                "sbgn.operator",
            ];
            const nodes = confs.map((conf, i) => generic(`n${String(i)}`, conf)).join("");
            expect(await values(nodes, "width")).toEqual(confs.map(() => 36));
            expect(await values(nodes, "height")).toEqual(confs.map(() => 36));
        });

        it("draws a conversation as a regular hexagon and keeps the other nodes' boxes", async () => {
            const nodes =
                generic("a", "bpmn.Conversation") + generic("b", "flowchart.start1") + generic("c", "bpmn.Activity");
            expect(await values(nodes, "width")).toEqual([41.569, 56, 56]);
            expect(await values(nodes, "height")).toEqual([36, 36, 36]);
        });

        it("draws an end event and a call activity with a line of 3 and rounds an activity's corners by 4", async () => {
            const nodes =
                generic("a", "bpmn.Event", prop("characteristic", "EVENT_CHARACTERISTIC_END")) +
                generic("b", "bpmn.Activity", prop("activityType", "ACTIVITY_TYPE_CALL_ACTIVITY")) +
                generic("c", "bpmn.Event", prop("characteristic", "EVENT_CHARACTERISTIC_START")) +
                generic("d", "bpmn.Activity", prop("activityType", "ACTIVITY_TYPE_TRANSACTION"));
            expect(await values(nodes, "borderWidth")).toEqual([3, 3, 1, 1]);
            expect((await values(nodes, "cornerRadius"))[1]).toBe(4);
        });

        it("draws the second line of an intermediate event and a transaction, and a message's flap", async () => {
            const nodes =
                generic("a", "bpmn.Event", prop("characteristic", "EVENT_CHARACTERISTIC_INTERMEDIATE_CATCHING")) +
                generic("b", "bpmn.Activity", prop("activityType", "ACTIVITY_TYPE_TRANSACTION")) +
                generic("c", "bpmn.Event", prop("characteristic", "EVENT_CHARACTERISTIC_START")) +
                generic("d", "bpmn.Artifact", prop("type", "ARTIFACT_TYPE_REPLY_MESSAGE"));
            const [event, transaction, start, message] = await values(nodes, "shapeLines");
            // 2.5 inside the outline, at the circle's right and round the box's corner of 4
            expect(String(event).split(" ")[0]).toBe("1-2.5,0+0");
            expect(String(transaction).split(" ")[0]).toBe("1-2.5,1-6.5");
            expect(String(transaction).split(" ").at(-1)).toBe("1-2.5,1-6.5");
            expect(start).toBeNull();
            expect(message).toBe("-1,1 0,0 1,1");
        });

        it("draws the lines inside a flowchart predefined process", async () => {
            const picture = (src: unknown): string =>
                typeof src === "string" ? decodeURIComponent(src.slice(src.indexOf(",") + 1)) : "";
            const [process] = (await values(generic("b", "flowchart.predefinedProcess"), "image")).map(picture);
            expect(process).toContain("M10,0L10,36M46,0L46,36");
        });

        it("draws BPMN group, annotation and message artifacts as yEd does", async () => {
            const tall = '<y:Geometry height="44" width="36" x="0" y="0"/>';
            const nodes = ["GROUP", "ANNOTATION", "REQUEST_MESSAGE", "REPLY_MESSAGE"]
                .map((t) => generic(t, "bpmn.Artifact", prop("type", `ARTIFACT_TYPE_${t}`), tall))
                .join("");
            expect(await values(nodes, "shape")).toEqual(["round-rectangle", "rectangle", "rectangle", "rectangle"]);
            expect((await values(nodes, "cornerRadius"))[0]).toBe(4);
            expect((await values(nodes, "fillOpacity"))[0]).toBe(0);
            expect((await values(nodes, "borderWidth")).slice(0, 2)).toEqual([1, 0]);
            // a message is an envelope 3 wide by 2 high, a reply's a darker one
            expect(await values(nodes, "height")).toEqual([44, 44, 24, 24]);
            expect((await values(nodes, "fill")).slice(2)).toEqual(["#c8c8c8", "#8c8c8c"]);
        });

        it("keeps a node's center when it is written at its drawn size", async () => {
            const box = '<y:Geometry height="44" width="36" x="10" y="20"/>';
            const message = generic("a", "bpmn.Artifact", prop("type", "ARTIFACT_TYPE_REQUEST_MESSAGE"), box);
            const { snapshot, styles } = await load(`${YED_HEAD}${message}</graph></graphml>`);
            const text = await registry.exportGraphToString(snapshot, "graphml", { styles });
            expect(text).toContain('height="24" width="36" x="10" y="30"');
        });

        it("draws a flowchart annotation with no outline round its box", async () => {
            expect(await values(generic("a", "flowchart.annotation"), "borderWidth")).toEqual([0]);
            expect(await values(generic("a", "flowchart.annotation"), "shape")).toEqual(["rectangle"]);
        });

        it("draws the SBGN nodes as yEd draws them", async () => {
            const nodes =
                generic("a", "sbgn.simpleChemical") +
                generic("b", "sbgn.stateVariable") +
                generic("c", "sbgn.perturbingAgent") +
                generic("d", "sbgn.nucleicAcidFeature");
            expect(await values(nodes, "shape")).toEqual(["round-rectangle", "round-rectangle", "polygon", "polygon"]);
            expect((await values(nodes, "cornerRadius")).slice(0, 2)).toEqual([18, 18]);
            const points = await values(nodes, "shapePoints");
            expect(points[2]).toBe("-1,1 1,1 0.679,0 1,-1 -1,-1 -0.679,0");
            // a flat top and rounded bottom corners, y up
            expect(String(points[3]).startsWith("-1,1 1,1 1,-0.333")).toBe(true);
            expect(String(points[3]).endsWith("-1,-0.333")).toBe(true);
        });

        it("draws the old bevel nodes as boxes with corners of 3, the second and third of 10", async () => {
            const nodes =
                generic("a", "bevelNode") +
                generic("b", "bevelNode2") +
                generic("c", "bevelNode3") +
                generic("d", "bevelNodeWithShadow");
            expect(await values(nodes, "shape")).toEqual(Array.from({ length: 4 }, () => "round-rectangle"));
            expect(await values(nodes, "cornerRadius")).toEqual([3, 10, 10, 3]);
        });

        it("draws the ShapeNode types yEd draws differently from their names", async () => {
            const types = ["fatarrow", "fatarrow2", "triangle2", "hexagon2", "octagon2"];
            const nodes = types.map((t) => shapeNode(t, t)).join("");
            expect(await values(nodes, "shape")).toEqual(["polygon", "polygon", "polygon", "rectangle", "rectangle"]);
            expect(await values(nodes, "shapePoints")).toEqual([
                "-1,1 0.8,1 1,0 0.8,-1 -1,-1 -0.8,0",
                "-0.8,1 1,1 0.8,0 1,-1 -0.8,-1 -1,0",
                "-1,1 1,1 0,-1",
                null,
                null,
            ]);
        });
    });

    it("leaves the yfiles columns as they were", async () => {
        const { snapshot } = await load(corpusBytes(join(GENERATED, "scale-50.graphml")));
        expect(snapshot.nodes.value("yfiles.color", 0)).toBe("#D8C918");
        expect(snapshot.nodes.value("yfiles.label", 0)).toBe("node 0");
        expect(snapshot.nodes.value("yfiles.shape", 0)).toBe("rectangle");
    });
});

describe("GraphML styles: yFiles 3", () => {
    const files = readdirSync(join(CORPUS, "yfiles-html")).map((f) => join(CORPUS, "yfiles-html", f));

    it.each(files.map((f) => [f.split("/").pop() ?? f, f] as const))(
        "imports %s with its styles and without errors",
        async (_name, file) => {
            const { snapshot, styles, report } = await load(corpusBytes(file));
            expect(report.errorCount).toBe(0);
            expect(styles.styles.source).toEqual({ format: "graphml", dialect: "yfiles3", tool: "yfiles3" });
            expect(resolveStyles(styles, "node", "fill", snapshot).some((v) => v !== null)).toBe(true);
        },
    );

    it("resolves shared data by value: fills, shapes, sizes and label styles", async () => {
        const { snapshot, styles } = await load(
            corpusBytes(join(CORPUS, "yfiles-html/luizomf__design-patterns-python__State_1.graphml")),
        );
        const i = snapshot.ids.indexOf("n0");
        expect(resolveStyles(styles, "node", "fill", snapshot)[i]).toBe("#ff8c00");
        expect(resolveStyles(styles, "node", "shape", snapshot)[i]).toBe("ellipse");
        expect(resolveStyles(styles, "node", "width", snapshot)[i]).toBe(145);
        expect(resolveStyles(styles, "node", "label", snapshot)[i]).toBe("Order");
        expect(resolveStyles(styles, "node", "labelFont", snapshot)[i]).toBe("Arial");
    });

    it("reads a RectangleNodeStyle's corners=TOP as a box rounded along its top", async () => {
        const { snapshot, styles } = await load(
            corpusBytes(
                join(import.meta.dirname, "../../fidelity/specimens/yed-live-graphml/specimen-node-shapes.graphml"),
            ),
        );
        const shape = resolveStyles(styles, "node", "shape", snapshot);
        expect(shape[snapshot.ids.indexOf("corners-top")]).toBe("other:top-round-rectangle");
        expect(shape[snapshot.ids.indexOf("scale-corner-size")]).toBe("round-rectangle");
    });

    it("paints yEd's BevelNode family as a ramp over the upper half with a line 2 in, in the border's color", async () => {
        const { snapshot, styles } = await load(
            corpusBytes(
                join(import.meta.dirname, "../../fidelity/specimens/yed-graphml/specimen-node-shapes-p2.graphml"),
            ),
        );
        const at = snapshot.ids.indexOf("generic-legacy-bevelnode");
        const read = (property: StyleProperty): unknown => resolveStyles(styles, "node", property, snapshot)[at];
        expect(read("fillGradientColors")).toBe("#f1f1f1 #d3d3d3 #c8c8c8 #c8c8c8");
        expect(read("borderWidth")).toBe(0);
        expect(read("borderColor")).toBe("#505050");
        expect(String(read("shapeLines")).split(" ")[0]).toBe("-1+2.000,1-3.000");
    });

    it("draws com.yjava bevels and shiny plates as yEd's default: a box in the fill, a solid line of 1", async () => {
        const { snapshot, styles } = await load(corpusBytes(join(CORPUS, "fidelity/synthetic-nodes.graphml")));
        const read = (id: string, property: StyleProperty): unknown =>
            resolveStyles(styles, "node", property, snapshot)[snapshot.ids.indexOf(id)];
        // BevelNode: color2 #3366FF and a dashed border of 0.5; ShinyPlateNode3: color2 #FFFFFF and a border of 2
        for (const [id, fill] of [
            ["generic-12", "#99ccff"],
            ["generic-15", "#c0c0c0"],
        ]) {
            expect(read(id, "shape")).toBe("rectangle");
            expect(read(id, "fill")).toBe(fill);
            expect(read(id, "fillGradient") ?? null).toBeNull();
            expect(read(id, "fillGradientColors") ?? null).toBeNull();
            expect(read(id, "borderColor")).toBe(fill);
            expect(read(id, "borderWidth")).toBe(1);
            expect(read(id, "borderStyle")).toBe("solid");
        }
        // BevelNode2's dotted border of 5 and ShinyPlateNode's dash-dot one
        expect(read("generic-13", "borderWidth")).toBe(1);
        expect(read("generic-14", "borderStyle")).toBe("solid");
    });

    it("draws no line in a bevel whose border has no color", async () => {
        const { snapshot, styles } = await load(
            corpusBytes(join(CORPUS, "yed-genericnode/awslabs__aws-c-io__slots.graphml")),
        );
        const lines = resolveStyles(styles, "node", "shapeLines", snapshot);
        const paint = resolveStyles(styles, "node", "fillGradientColors", snapshot);
        expect(paint.filter((p) => p !== null).length).toBeGreaterThan(0);
        expect(lines.filter((l) => l !== null)).toEqual([]);
    });

    it("keeps a display's curves their length at any width", () => {
        const points = (width: number): string => {
            const put: Record<string, unknown> = {};
            const outline = configurationOutline("com.yworks.flowchart.display");
            if (outline === null) {
                throw new Error("no outline");
            }
            putOutline(outline, width, 36, (property, value) => {
                put[property] = value;
            });
            return String(put.shapePoints);
        };
        // 18 in from the left side at the curve's end: a fraction of the half width
        expect(points(48).split(" ")[8]).toBe("-0.25,-1");
        expect(points(56).split(" ")[8]).toBe("-0.357,-1");
    });

    it("draws a line in a color with no alpha as no line", async () => {
        const border = '<y:BorderStyle color="#FFFFFF00" type="line" width="1.0"/>';
        const graph = `<graphml xmlns="http://graphml.graphdrawing.org/xmlns" xmlns:y="http://www.yworks.com/xml/graphml">
            <key for="node" id="d0" yfiles.type="nodegraphics"/><graph edgedefault="directed"><node id="n"><data key="d0">
            <y:ShapeNode><y:Geometry height="10" width="1" x="0" y="0"/>${border}</y:ShapeNode></data></node></graph></graphml>`;
        const { snapshot, styles } = await load(new TextEncoder().encode(graph));
        expect(resolveStyles(styles, "node", "borderWidth", snapshot)[0]).toBe(0);
    });

    it("notes shared references that refer to each other and finishes", async () => {
        const { snapshot, styles } = await load(corpusBytes(join(GENERATED, "yfiles3-shared-cycle.graphml")));
        expect(snapshot.nodeCount).toBe(3);
        expect(styles.styles.notes.map((n) => n.code)).toContain("W_STYLE_REFERENCE_CYCLE");
        expect(resolveStyles(styles, "node", "fill", snapshot)[snapshot.ids.indexOf("n2")]).toBe("#00ff00");
    });
});

describe("GraphML styles: Gephi, Cytoscape and other writers", () => {
    it("reads Gephi's r, g, b and size keys with Gephi's defaults and its end nodes' mixed color on edges", async () => {
        const { snapshot, styles } = await load(
            corpusBytes(join(CORPUS, "gephi-rgb/nielmclaren__constellation.js__data.graphml")),
        );
        expect(styles.styles.source).toEqual({ format: "graphml", dialect: "gephi", tool: "gephi" });
        expect(styles.styles.units.length).toBe("relative");
        const r = snapshot.nodes.value("r", 0) as number;
        const g = snapshot.nodes.value("g", 0) as number;
        const b = snapshot.nodes.value("b", 0) as number;
        const hex = `#${[r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
        expect(resolveStyles(styles, "node", "fill", snapshot)[0]).toBe(hex);
        const fills = resolveStyles(styles, "node", "fill", snapshot);
        const [s0, t0] = [fills[snapshot.edgeSource(0)], fills[snapshot.edgeTarget(0)]].map((c) =>
            Number.parseInt(String(c).slice(1), 16),
        );
        const mixed = [16, 8, 0].map((sh) => Math.floor((((s0 >> sh) & 255) + ((t0 >> sh) & 255)) / 2));
        expect(resolveStyles(styles, "edge", "color", snapshot)[0]).toBe(
            `#${mixed.map((c) => c.toString(16).padStart(2, "0")).join("")}`,
        );
        expect(styles.styles.rules.some((r2) => r2.facts?.reason === "END_NODE_COLORS")).toBe(true);
    });

    it("gives Cytoscape's export Cytoscape's default style, nodes labeled by name", async () => {
        const { snapshot, styles } = await load(
            corpusBytes(join(CORPUS, "cytoscape/chatox__networks-science-course__karate.graphml")),
        );
        expect(styles.styles.source).toEqual({ format: "graphml", dialect: "cytoscape", tool: "cytoscape" });
        expect(resolveStyles(styles, "node", "fill", snapshot)[0]).toBe("#89d0f5");
        expect(resolveStyles(styles, "node", "label", snapshot)[0]).toBe(snapshot.nodes.value("name", 0));
    });

    it("gives a file from an unrecognized writer no styles and no defaults, even with a key named color", async () => {
        const result = await registry.importGraph(
            `<graphml xmlns="http://graphml.graphdrawing.org/xmlns"><key id="c" for="node" attr.name="color" attr.type="string"/>
            <graph edgedefault="undirected"><node id="a"><data key="c">red</data></node></graph></graphml>`,
            { format: "graphml", styles: true },
        );
        expect(result.styles).toBeNull();
        expect(result.snapshot.nodes.value("color", 0)).toBe("red");
    });
});

describe("GraphML files that failed before", () => {
    it("keeps yFiles 3 keys declared with y:attr.uri as trees, and data on the graphml root", async () => {
        const result = await registry.importGraph(
            corpusBytes(join(CORPUS, "yfiles-html/luizomf__design-patterns-python__State_1.graphml")),
            { format: "graphml" },
        );
        expect(result.report.errorCount).toBe(0);
        const codes = result.report.issues.map((i) => i.code);
        expect(codes).not.toContain("W_UNKNOWN_XML_ATTRIBUTE");
        expect(codes).not.toContain(GRAPHML_ISSUE.DATA_NESTED);
        const style = result.snapshot.nodes.get("NodeStyle");
        expect(style?.dtype).toBe("json");
        expect(style?.meta.origin?.type).toBe("http://www.yworks.com/xml/yfiles-common/2.0/NodeStyle");
    });

    it("reads a for=graphml key as graph data", async () => {
        const result = await registry.importGraph(
            `<graphml xmlns="http://graphml.graphdrawing.org/xmlns"><key id="k" for="graphml" attr.name="creator" attr.type="string"/>
            <data key="k">me</data><graph edgedefault="undirected"><node id="a"/></graph></graphml>`,
            { format: "graphml" },
        );
        expect(result.report.issues.map((i) => i.code)).toEqual([]);
        expect(result.snapshot.graph.value("creator", 0)).toBe("me");
    });

    it("keeps nested elements under an untyped key as their XML text, with a warning", async () => {
        const result = await registry.importGraph(
            `<graphml xmlns="http://graphml.graphdrawing.org/xmlns"><key id="k" for="node"/>
            <graph edgedefault="undirected"><node id="a"><data key="k"><svg><rect width="1"/></svg></data></node></graph></graphml>`,
            { format: "graphml" },
        );
        expect(result.report.errorCount).toBe(0);
        expect(result.report.issues.map((i) => i.code)).toEqual([GRAPHML_ISSUE.DATA_STRUCTURED]);
        expect(result.snapshot.nodes.value("k", 0)).toBe('<svg>\n  <rect width="1"/>\n</svg>');
    });

    it("never takes an element named __proto__ for the tree's prototype", async () => {
        const result = await registry.importGraph(
            `${YED_HEAD}<node id="a"><data key="d6"><__proto__ polluted="1"/><__proto__/></data></node></graph></graphml>`,
            { format: "graphml" },
        );
        const tree = result.snapshot.nodes.value("d6", 0) as Record<string, unknown>;
        expect(Object.getPrototypeOf(tree)).toBe(Object.prototype);
        expect(Array.isArray(Object.getOwnPropertyDescriptor(tree, "__proto__")?.value)).toBe(true);
        expect((Object.prototype as Record<string, unknown>).polluted).toBeUndefined();
    });
});

describe("GraphML styles: writing", () => {
    it("writes yEd graphics and reads back the same rules and values", async () => {
        const { snapshot, styles } = await load(corpusBytes(join(GENERATED, "scale-50.graphml")));
        const text = await registry.exportGraphToString(snapshot, "graphml", { styles });
        expect(text).toContain('attr.name="graphty.styles"');
        expect(text).toContain("<y:ShapeNode>");
        const back = await load(text);
        expect(back.styles.styles.source.tool).toBe("graphty");
        expect(plain(back.styles)).toEqual(plain(styles));
        for (const [target, property] of [
            ["node", "fill"],
            ["node", "label"],
            ["node", "labelColor"],
            ["node", "width"],
            ["edge", "color"],
        ] as const) {
            expect(resolveStyles(back.styles, target, property, back.snapshot)).toEqual(
                resolveStyles(styles, target, property, snapshot),
            );
        }
    });

    it("writes each node's position into its yEd geometry, so a styled file keeps where nodes are", async () => {
        const gexf = `<gexf xmlns="http://gexf.net/1.3" xmlns:viz="http://gexf.net/1.3/viz" version="1.3">
            <meta><creator>Gephi 0.10.1</creator></meta><graph><nodes>
            <node id="a"><viz:size value="10"/><viz:position x="0" y="40" z="0"/></node>
            <node id="b"><viz:size value="20"/><viz:position x="100" y="-20" z="0"/></node></nodes>
            <edges><edge source="a" target="b"/></edges></graph></gexf>`;
        const from = await registry.importGraph(gexf, { format: "gexf", styles: true });
        const options = { styles: from.styles ?? undefined };
        const notes = registry.checkExport(from.snapshot, "graphml", options);
        expect(notes.map((n) => n.code)).not.toContain("W_POSITIONS_DROPPED");
        const text = await registry.exportGraphToString(from.snapshot, "graphml", options);
        const back = await registry.importGraph(text, { format: "graphml" });
        const before = extractPositions(registry.importer("gexf"), from.snapshot, from.report)?.coords;
        const after = extractPositions(registry.importer("graphml"), back.snapshot, back.report)?.coords;
        // the centers, y up, as Gephi placed them: a above b
        expect(Array.from(after ?? [])).toEqual(Array.from(before ?? []));
        expect(Array.from(before ?? [])).toEqual([0, 40, 0, 100, -20, 0]);
    });

    it("writes Gephi's styles as yEd graphics and reads them back", async () => {
        const { snapshot, styles } = await load(
            corpusBytes(join(CORPUS, "gephi-rgb/nielmclaren__constellation.js__data.graphml")),
        );
        const back = await load(await registry.exportGraphToString(snapshot, "graphml", { styles }));
        expect(plain(back.styles)).toEqual(plain(styles));
        expect(resolveStyles(back.styles, "edge", "color", back.snapshot)).toEqual(
            resolveStyles(styles, "edge", "color", snapshot),
        );
    });

    it("reports values yEd can only approximate, and keeps their exact values in the block", async () => {
        const b = new GraphBuilder({ directed: true });
        b.addNode("a");
        b.addNode("b");
        b.addEdge("a", "b");
        const snapshot = b.freeze();
        const styles = planStyles(
            {
                format: "test",
                node: {
                    values: { fill: ["#123456", "#123456"], shape: ["pentagon", "ellipse"], fillOpacity: [0.5, 1] },
                },
                edge: { values: { lineStyle: ["zigzag"], targetArrow: ["half"] } },
                fingerprint: styleFingerprint(snapshot),
            },
            { node: featuresOf(snapshot, "node"), edge: featuresOf(snapshot, "edge") },
        );
        const losses = registry.checkExport(snapshot, "graphml", { styles });
        expect(
            losses
                .filter((l) => l.code === "W_STYLE_APPROXIMATED")
                .map((l) => [l.style?.target, l.style?.property, l.count]),
        ).toEqual([
            ["node", "shape", 1],
            ["edge", "lineStyle", 1],
            ["edge", "targetArrow", 1],
        ]);
        const text = await registry.exportGraphToString(snapshot, "graphml", { styles });
        expect(text).toContain('<y:Fill color="#12345680" transparent="false"/>');
        const back = await load(text);
        expect(resolveStyles(back.styles, "node", "shape", back.snapshot)).toEqual(["pentagon", "ellipse"]);
        expect(resolveStyles(back.styles, "node", "fillOpacity", back.snapshot)[0]).toBe(0.5);
        expect(resolveStyles(back.styles, "edge", "lineStyle", back.snapshot)).toEqual(["zigzag"]);
        expect(back.styles.styles.rules.some((r) => r.role === "exceptions")).toBe(false);
    });

    it("writes a gradient fill as yEd's color2, and an inside label in yEd's internal model", async () => {
        const b = new GraphBuilder({ directed: true });
        b.addNode("a");
        b.addNode("b");
        const snapshot = b.freeze();
        const styles = planStyles(
            {
                format: "test",
                node: {
                    values: {
                        fill: ["#e8eef7", "#e8eef7"],
                        fillGradient: ["#b7c9e3", "#b7c9e3"],
                        fillGradientAngle: [0, 90],
                        label: ["A", "B"],
                        labelPosition: ["inside-top-right", "top"],
                    },
                },
                fingerprint: styleFingerprint(snapshot),
            },
            { node: featuresOf(snapshot, "node"), edge: featuresOf(snapshot, "edge") },
        );
        const losses = registry.checkExport(snapshot, "graphml", { styles });
        expect(
            losses
                .filter((l) => l.code === "W_STYLE_APPROXIMATED")
                .map((l) => [l.style?.target, l.style?.property, l.count]),
        ).toEqual([
            // yEd paints a shape node's ramp mirrored over its left third, not as its two colors
            ["node", "fillGradientColors", 2],
            ["node", "fillGradientStops", 2],
            ["node", "fillGradientAngle", 1],
        ]);
        const text = await registry.exportGraphToString(snapshot, "graphml", { styles });
        expect(text).toContain('<y:Fill color="#E8EEF7" transparent="false" color2="#B7C9E3"/>');
        expect(text).toContain('modelName="internal" modelPosition="tr"');
        expect(text).toContain('modelName="eight_pos" modelPosition="n"');
    });

    it("an outside edit of a yEd color comes back as its fill and ramp only; any other new exception fails", async () => {
        const b = new GraphBuilder({ directed: true });
        b.addNode("a");
        b.addNode("b");
        const snapshot = b.freeze();
        const styles = planStyles(
            {
                format: "test",
                node: {
                    values: {
                        fill: ["#e8eef7", "#e8eef7"],
                        fillGradient: ["#b7c9e3", "#b7c9e3"],
                        fillGradientAngle: [0, 0],
                        borderColor: ["#505050", "#505050"],
                    },
                },
                fingerprint: styleFingerprint(snapshot),
            },
            { node: featuresOf(snapshot, "node"), edge: featuresOf(snapshot, "edge") },
        );
        const written = await registry.exportGraphToBytes(snapshot, "graphml", { styles });
        const back = (await importForStyles(registry, "graphml", written)).imported;
        if (back === null || back === undefined) {
            throw new Error("no styles");
        }
        const derives = { fill: { fillGradientColors: "fillGradient" } };
        const fillEdited = editGraphmlNodeFill(written);
        if (fillEdited === null) {
            throw new Error("no fill to edit");
        }
        // the edited color is node a's fill and the ramp yEd paints through it
        expect(await checkOutsideEdit(registry, "graphml", fillEdited, back, derives)).toEqual([]);
        expect(await checkOutsideEdit(registry, "graphml", fillEdited, back)).toEqual([
            "an outside edit gave new exceptions fill, fillGradientColors on one element, not one edited value",
        ]);
        // the same edit and node a's border color too: an unrelated exception on the edited element fails
        const text = new TextDecoder().decode(fillEdited);
        const border = text.indexOf('<y:BorderStyle color="#505050"');
        expect(border).toBeGreaterThan(0);
        const both = text.slice(0, border) + text.slice(border).replace('color="#505050"', 'color="#FF0000"');
        expect(await checkOutsideEdit(registry, "graphml", new TextEncoder().encode(both), back, derives)).toEqual([
            "an outside edit gave new exceptions borderColor, fill, fillGradientColors on one element, not one edited value",
        ]);
    });

    it("replaces a yFiles 3 file's drawing state by yEd graphics in yEd's namespace", async () => {
        const { snapshot, styles } = await load(
            corpusBytes(join(CORPUS, "yfiles-html/luizomf__design-patterns-python__State_1.graphml")),
        );
        const text = await registry.exportGraphToString(snapshot, "graphml", { styles });
        expect(text).toContain('xmlns:y="http://www.yworks.com/xml/graphml"');
        expect(text).not.toContain("y:attr.uri");
        const back = await load(text);
        expect(plain(back.styles)).toEqual(plain(styles));
    });
});

/** The block-tamper fixtures: a file graphty wrote, then edited outside as design 10.7 items 4 and 5 describe. */
async function tamperFixtures(): Promise<Record<string, Uint8Array>> {
    const base = await load(corpusBytes(join(GENERATED, "scale-50.graphml")));
    const written = await registry.exportGraphToBytes(base.snapshot, "graphml", { styles: base.styles });
    const text = new TextDecoder().decode(written);
    const added = text.replace(/(<graph id="G" edgedefault="directed">)/, '$1\n    <node id="added"/>');
    return {
        "graphty-written.graphml": written,
        "tamper-native-edited.graphml": editGraphmlNodeFill(written) ?? new Uint8Array(),
        "tamper-block-truncated.graphml": replaceGraphmlBlock(written, (block) =>
            block.slice(0, Math.floor(block.length / 2)),
        ),
        "tamper-node-added.graphml": new TextEncoder().encode(added),
    };
}

describe("GraphML block tamper fixtures", () => {
    it("are the edits they say they are (UPDATE_GRAPHML_TAMPER=1 writes them again)", async () => {
        for (const [name, bytes] of Object.entries(await tamperFixtures())) {
            const path = join(GENERATED, name);
            if (process.env.UPDATE_GRAPHML_TAMPER === "1") {
                writeFileSync(path, bytes);
            }
            expect(new TextDecoder().decode(readFileSync(path))).toBe(new TextDecoder().decode(bytes));
        }
    });

    it("bring an outside edit back as one exception over the same rules", async () => {
        const unedited = await load(corpusBytes(join(GENERATED, "graphty-written.graphml")));
        const edited = await load(corpusBytes(join(GENERATED, "tamper-native-edited.graphml")));
        const below = (ex: ExtractedStyles): unknown => plain(ex).filter((r) => r.role !== "exceptions");
        expect(below(edited.styles)).toEqual(below(unedited.styles));
        const excepted = edited.styles.columns.node.get("exceptions.fill") ?? [];
        expect(excepted.filter((v) => v !== null)).toEqual(["#123456"]);
    });

    it("ignore a truncated block and a block for another graph with a note, and read the file as yEd's", async () => {
        for (const [file, reason] of [
            ["tamper-block-truncated.graphml", "NOT_JSON"],
            ["tamper-node-added.graphml", "FINGERPRINT"],
        ] as const) {
            const { styles } = await load(corpusBytes(join(GENERATED, file)));
            const note = styles.styles.notes.find((n) => n.code === "W_STYLE_BLOCK_IGNORED");
            expect(note?.params.samples).toEqual([reason]);
            expect(styles.styles.source.tool).toBe("yed");
        }
    });
});
