/**
 * GEXF styles: the viz module read into the neutral vocabulary with Gephi's defaults, the GEXF 1.0 files Gephi 0.6
 * wrote, and styles written back into the viz module with the `graphty.styles` block in `<meta>`.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { GraphBuilder } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { GEXF_ISSUE } from "../../../src/formats/gexf/index.js";
import { edgeThickness, GephiPreview } from "../../../src/formats/gexf/preview.js";
import { createRegistry } from "../../../src/registry.js";
import {
    type ExtractedStyles,
    featuresOf,
    planStyles,
    resolveStyles,
    styleFingerprint,
    type StyleRule,
} from "../../../src/styles/internal.js";
import { editGexfNodeColor, replaceGexfBlock } from "../../styles/formats/gexf.js";

const registry = createRegistry();
const CORPUS = resolve(import.meta.dirname, "../../corpus/styles/gexf/generated");
const DISEASOME = resolve(import.meta.dirname, "../../conformance/fixtures/gexf/gephi-datasets/diseasome.gexf");
/**
 * Imports a GEXF document with its styles.
 * @param doc - the document
 * @param toolDefaults - whether Gephi's defaults are added
 * @returns the import result, with styles
 */
async function load(doc: string | Uint8Array, toolDefaults = true) {
    const result = await registry.importGraph(doc, { format: "gexf", styles: { toolDefaults }, errorLimit: Infinity });
    if (result.styles === null || result.styles === undefined) {
        throw new Error("no styles");
    }
    return { ...result, styles: result.styles };
}

/**
 * The rules of a target that write a property.
 * @param ex - the styles
 * @param target - nodes or edges
 * @param property - the property
 * @returns the rules
 */
function writers(ex: ExtractedStyles, target: "node" | "edge", property: string): StyleRule[] {
    return ex.styles.rules.filter(
        (r) => r.target === target && (Object.hasOwn(r.set ?? {}, property) || Object.hasOwn(r.map ?? {}, property)),
    );
}

const plain = (ex: ExtractedStyles): StyleRule[] => JSON.parse(JSON.stringify(ex.styles.rules)) as StyleRule[];

describe("GEXF styles: reading", () => {
    it("draws a self-loop as Gephi's circle up and to the right of its node", async () => {
        const { snapshot, styles } = await load(
            `<gexf version="1.3" xmlns:viz="http://gexf.net/1.3/viz"><graph defaultedgetype="directed"><nodes>
            <node id="a"><viz:size value="4"/></node><node id="b"/></nodes>
            <edges><edge id="l" source="a" target="a"/><edge id="e" source="a" target="b"/></edges></graph></gexf>`,
        );
        const [loop, other] = resolveStyles(styles, "edge", "bends", snapshot);
        expect(other).toBeNull();
        // a circle of radius r = (0.5 x 4 + 0.33 x 1.3 x 1) / 4 of the node's size, centered r right of and r above it
        const r = (0.5 * 4 + 0.33 * 1.3) / 4;
        const points = String(loop)
            .split(" ")
            .map((p) => p.split(",").map(Number));
        for (const [x, y] of points) {
            expect(Math.hypot(x - r, y - r)).toBeCloseTo(r, 3);
        }
        expect(Math.max(...points.map(([x]) => x))).toBeCloseTo(2 * r, 3);
    });

    it("recovers Gephi's diseasome disease-class colors as one discrete mapping", async () => {
        const { snapshot, styles } = await load(new Uint8Array(readFileSync(DISEASOME)));
        const fills = writers(styles, "node", "fill").filter((r) => r.origin !== "tool");
        expect(fills).toHaveLength(1);
        expect(fills[0].map?.fill).toMatchObject({ kind: "discrete", by: { data: "disclass" } });
        const colors = resolveStyles(styles, "node", "fill", snapshot);
        const i = snapshot.ids.indexOf(30);
        expect(colors[i]).toBe("#ee4444");
        expect(snapshot.nodes.value("disclass", i)).toBe("Neurological");
    });

    it("gives a GEXF without colors Gephi's defaults: black discs of size 10 (20 across), the file's labels, arrows on directed edges", async () => {
        const { snapshot, styles } = await load(
            `<gexf version="1.3"><graph defaultedgetype="directed"><nodes><node id="a" label="A"/><node id="b"/></nodes>
            <edges><edge source="a" target="b"/></edges></graph></gexf>`,
        );
        expect(styles.styles.source).toEqual({ format: "gexf", dialect: "gexf", tool: "gephi" });
        expect(resolveStyles(styles, "node", "fill", snapshot)).toEqual(["#000000", "#000000"]);
        expect(resolveStyles(styles, "node", "width", snapshot)).toEqual([20, 20]);
        expect(resolveStyles(styles, "node", "shape", snapshot)).toEqual(["ellipse", "ellipse"]);
        expect(resolveStyles(styles, "node", "label", snapshot)).toEqual(["A", null]);
        expect(resolveStyles(styles, "edge", "targetArrow", snapshot)).toEqual(["triangle"]);
        expect(resolveStyles(styles, "edge", "color", snapshot)).toEqual(["#000000"]);
        // Gephi's preview: curved edges, nodes outlined 0.08 of their width, labels 0.3 of it (round(0.6 x size))
        expect(resolveStyles(styles, "edge", "curved", snapshot)).toEqual([true]);
        expect(resolveStyles(styles, "node", "borderColor", snapshot)).toEqual(["#000000", "#000000"]);
        expect(resolveStyles(styles, "node", "borderWidth", snapshot)).toEqual([1.6, 1.6]);
        expect(resolveStyles(styles, "node", "labelSize", snapshot)).toEqual([6, 6]);
    });

    it("outlines each node in half its fill's channels, as wide and with a label as large as its size makes them", async () => {
        const { snapshot, styles } = await load(
            `<gexf version="1.3" xmlns:viz="http://gexf.net/1.3/viz"><graph><nodes>
            <node id="a"><viz:color r="228" g="26" b="28"/><viz:size value="3"/></node>
            <node id="b"><viz:color r="152" g="78" b="163"/><viz:size value="24"/></node>
            <node id="c"><viz:size value="1"/></node></nodes></graph></gexf>`,
        );
        // measured on Gephi Toolkit 0.11.3's SVG of synth-nx-viz: #720d0e on #e41a1c, #4c2751 on #984ea3
        expect(resolveStyles(styles, "node", "borderColor", snapshot)).toEqual(["#720d0e", "#4c2751", "#000000"]);
        expect(resolveStyles(styles, "node", "borderWidth", snapshot)).toEqual([0.48, 3.84, 0.16]);
        expect(resolveStyles(styles, "node", "labelSize", snapshot)).toEqual([2, 14, 1]);
        expect(styles.styles.rules.filter((r) => r.facts?.reason === "NODE_SIZE")).toHaveLength(2);
        expect(styles.styles.rules.find((r) => r.facts?.reason === "NODE_FILL_SHADE")).toMatchObject({
            origin: "tool",
        });
    });

    it("draws each node's label attribute centered on it, never an edge's, and writes the labels graphty draws", async () => {
        const { snapshot, styles } = await load(
            `<gexf version="1.3"><graph><nodes><node id="a" label="Valjean"/><node id="b"/></nodes>
            <edges><edge source="a" target="b" label="knows"/></edges></graph></gexf>`,
        );
        expect(resolveStyles(styles, "node", "label", snapshot)).toEqual(["Valjean", null]);
        expect(resolveStyles(styles, "node", "labelPosition", snapshot)).toEqual(["center", "center"]);
        // Gephi's Preview hides a label that would overlap one drawn before it (node.label.avoidOverlap)
        expect(resolveStyles(styles, "node", "labelAvoidOverlap", snapshot)).toEqual([true, true]);
        expect(resolveStyles(styles, "edge", "label", snapshot)).toEqual([null]);
        const out = await registry.exportGraphToString(snapshot, "gexf", { styles });
        const back = await load(out);
        expect(resolveStyles(back.styles, "node", "label", back.snapshot)).toEqual(["Valjean", null]);
        expect(back.snapshot.edges.value("label", 0)).toBe("knows");
    });

    it("draws every edge in the mix of its end nodes' colors and alphas, as Gephi's preview does, its own color or not", async () => {
        const { snapshot, styles } = await load(
            `<gexf version="1.3" xmlns:viz="http://gexf.net/1.3/viz"><graph><nodes>
            <node id="a"><viz:color r="228" g="26" b="28"/></node><node id="b"/>
            <node id="c"><viz:color r="55" g="126" b="184" a="0.25"/></node></nodes><edges>
            <edge source="a" target="b"/><edge source="b" target="a"><viz:color r="0" g="0" b="255"/></edge>
            <edge source="a" target="c"><viz:color r="30" g="30" b="30" a="0.8"/></edge>
            </edges></graph></gexf>`,
        );
        // a-c measured on Gephi Toolkit 0.11.3's SVG: stroke #8d4c6a, stroke-opacity 0.62352943 (159 / 255)
        expect(resolveStyles(styles, "edge", "color", snapshot)).toEqual(["#720d0e", "#720d0e", "#8d4c6a"]);
        expect(resolveStyles(styles, "edge", "opacity", snapshot)).toEqual([null, null, 159 / 255]);
        // the node's alpha only tints its edges: Gephi draws every node opaque
        expect(resolveStyles(styles, "node", "fillOpacity", snapshot)).toEqual([null, null, null]);
        const source = styles.styles.rules.find((r) => r.facts?.reason === "END_NODE_COLORS");
        expect(source).toMatchObject({ origin: "tool", map: { color: { kind: "passthrough" } } });
        // no defaultedgetype: Gephi Toolkit 0.11.3 reads every edge directed and draws an arrow at each target
        expect(resolveStyles(styles, "edge", "targetArrow", snapshot)).toEqual(["triangle", "triangle", "triangle"]);
    });

    it("draws every curved edge as its own curve, as Gephi does: it fans no bundle", async () => {
        const { snapshot, styles } = await load(
            `<gexf version="1.3" xmlns:viz="http://gexf.net/1.3/viz"><graph defaultedgetype="directed"><nodes>
            <node id="a"><viz:position x="0" y="0"/></node><node id="b"><viz:position x="30" y="40"/></node>
            </nodes><edges><edge source="a" target="b"/><edge source="b" target="a"/></edges></graph></gexf>`,
        );
        // each bows to the left of its own direction, so the two make a lens
        expect(resolveStyles(styles, "edge", "fanned", snapshot)).toEqual([false, false]);
        expect(resolveStyles(styles, "edge", "fanSpacing", snapshot)).toEqual([null, null]);
        expect(resolveStyles(styles, "edge", "curved", snapshot)).toEqual([true, true]);
    });

    it("draws every edge as thick as its weight, as Gephi does: it keeps no viz:thickness", async () => {
        const { snapshot, styles } = await load(
            `<gexf version="1.3" xmlns:viz="http://gexf.net/1.3/viz"><graph><nodes><node id="a"/><node id="b"/></nodes>
            <edges><edge source="a" target="b" weight="3"/><edge source="b" target="a"/>
            <edge source="a" target="a" weight="5"><viz:thickness value="2"/></edge></edges></graph></gexf>`,
        );
        // the self-loop is drawn 1.3 times its weight
        expect(resolveStyles(styles, "edge", "width", snapshot)).toEqual([3, 1, 6.5]);
        expect(styles.styles.rules.find((r) => r.facts?.reason === "EDGE_WEIGHT")).toMatchObject({ origin: "tool" });
    });

    it("raises every weight by |smallest| + 1 when the smallest is 0 or below, as Gephi does", async () => {
        const { snapshot, styles } = await load(
            `<gexf version="1.3"><graph><nodes><node id="a"/><node id="b"/></nodes>
            <edges><edge source="a" target="b" weight="2.5"/><edge source="b" target="a" weight="0.1"/>
            <edge source="a" target="a" weight="0"/><edge source="b" target="b" weight="-2.25"/></edges></graph></gexf>`,
        );
        // measured on Gephi Toolkit 0.11.3: weights 5.75, 3.35, 3.25 and 1 (gexf-specimen-edges-lines-p13 too), the
        // two self-loops stroked 1.3 times theirs (4.225 and 1.3)
        const widths = resolveStyles(styles, "edge", "width", snapshot) as number[];
        expect(widths.map((w) => Math.round(w * 1e4) / 1e4)).toEqual([5.75, 3.35, 4.225, 1.3]);
    });

    it("merges parallel edges into the first with their summed weight, and drops an edge against the graph's type, as Gephi does", async () => {
        const nodes = `<nodes><node id="a"/><node id="b"/><node id="c"/></nodes>`;
        // each measured on Gephi Toolkit 0.11.3 (its preview items: the edges drawn and their weights)
        const directed = await load(
            `<gexf version="1.3"><graph defaultedgetype="directed">${nodes}<edges>
            <edge id="e1" source="a" target="b" weight="2"/><edge id="e2" source="a" target="b" weight="3"/>
            <edge id="e3" source="b" target="a" weight="1"/><edge id="e4" source="b" target="c" type="undirected"/>
            <edge id="e5" source="a" target="c" kind="x"/><edge id="e6" source="a" target="c" kind="y"/>
            </edges></graph></gexf>`,
        );
        const shown = (ex: Awaited<ReturnType<typeof load>>): (string | null)[] => {
            const visible = resolveStyles(ex.styles, "edge", "visible", ex.snapshot);
            const width = resolveStyles(ex.styles, "edge", "width", ex.snapshot);
            const id = ex.snapshot.edges.get("id");
            const out: (string | null)[] = [];
            for (let e = 0; e < ex.snapshot.edgeCount; e++) {
                // an undirected edge of a directed graph is two halves; the second has no id
                if (id?.isSet(e) === true) {
                    out.push(visible[e] === false ? null : `${String(id.value(e))}:${String(width[e])}`);
                } else if (visible[e] !== false) {
                    out.push(`half:${String(width[e])}`);
                }
            }
            return out;
        };
        // a->b twice merges (5); b->a stays; the undirected edge's two halves are dropped; kinds x and y stay apart
        expect(shown(directed)).toEqual(["e1:5", null, "e3:1", null, "e5:1", "e6:1"]);
        const undirected = await load(
            `<gexf version="1.3"><graph defaultedgetype="undirected">${nodes}<edges>
            <edge id="e1" source="a" target="b" weight="2"/><edge id="e2" source="b" target="a" type="mutual" weight="3"/>
            <edge id="e3" source="b" target="c" type="directed"/></edges></graph></gexf>`,
        );
        // a-b and b-a (mutual is undirected here) merge into 5 on both halves of e1 (the second has no id); the directed edge is dropped
        expect(shown(undirected).filter((s) => s !== null)).toEqual(["e1:5", "half:5"]);
        const mutual = await load(
            `<gexf version="1.3"><graph defaultedgetype="mutual">${nodes}<edges>
            <edge id="e1" source="a" target="b" weight="2"/><edge id="e2" source="b" target="a" weight="3"/>
            <edge id="e3" source="a" target="c" type="undirected" weight="1"/>
            <edge id="e4" source="c" target="a" type="undirected" weight="4"/></edges></graph></gexf>`,
        );
        // a mutual graph keeps every edge: an untyped one directed (a->b and b->a stay apart), undirected ones merge
        expect([...new Set(shown(mutual).filter((s) => s !== null))]).toEqual([
            "e1:2",
            "half:2",
            "e2:3",
            "half:3",
            "e3:5",
            "half:5",
        ]);
        expect(
            resolveStyles(mutual.styles, "edge", "targetArrow", mutual.snapshot).filter((a) => a === "triangle"),
        ).toHaveLength(4);
    });

    it("draws a node of viz:size 0 at Gephi's default size 10", async () => {
        const { snapshot, styles } = await load(
            `<gexf version="1.3" xmlns:viz="http://gexf.net/1.3/viz"><graph><nodes>
            <node id="a"><viz:size value="0"/></node><node id="b"><viz:size value="2"/></node></nodes></graph></gexf>`,
        );
        // measured on Gephi Toolkit 0.11.3: size 0 is drawn radius 9.2, as size 10 is
        expect(resolveStyles(styles, "node", "width", snapshot)).toEqual([20, 4]);
    });

    it("draws a self-loop 1.3 times as thick as its weight and without an arrowhead, as Gephi does", async () => {
        const { snapshot, styles } = await load(
            `<gexf version="1.3"><graph defaultedgetype="directed"><nodes><node id="a"/><node id="b"/></nodes>
            <edges><edge source="a" target="a" weight="2"/><edge source="a" target="b" weight="2"/></edges></graph></gexf>`,
        );
        // measured on Gephi Toolkit 0.11.3: a self-loop of weight 1 is stroked 1.3 wide, one of 3.25 4.225
        expect(resolveStyles(styles, "edge", "width", snapshot)).toEqual([2.6, 2]);
        expect(resolveStyles(styles, "edge", "targetArrow", snapshot)).toEqual(["none", "triangle"]);
    });

    it("reads a dynamic weight attribute at its earliest interval, and 0 for an edge without one, as Gephi does", async () => {
        const { snapshot, styles } = await load(
            `<gexf version="1.3"><graph mode="dynamic" timeformat="double" defaultedgetype="undirected">
            <attributes class="edge" mode="dynamic"><attribute id="weight" title="Weight" type="float"/></attributes>
            <nodes><node id="a"/><node id="b"/><node id="c"/><node id="d"/></nodes><edges>
            <edge source="a" target="b" weight="4"/>
            <edge source="b" target="c"><attvalues><attvalue for="weight" value="1" start="2" end="3"/>
            <attvalue for="weight" value="8" start="1" end="2"/></attvalues></edge>
            <edge source="c" target="d"><attvalues><attvalue for="weight" value="4" start="1" end="3"/></attvalues></edge>
            </edges></graph></gexf>`,
        );
        // gexf-specimen-edges-lines-p15: 0, 8 and 4, raised by 1
        expect(resolveStyles(styles, "edge", "width", snapshot)).toEqual([1, 9, 5]);
    });

    it("leaves out every Gephi default, the derived ones too, with toolDefaults: false", async () => {
        const { styles } = await load(
            `<gexf version="1.3"><graph defaultedgetype="directed"><nodes><node id="a"/><node id="b"/></nodes>
            <edges><edge source="a" target="b"/></edges></graph></gexf>`,
            false,
        );
        expect(styles.styles.rules.filter((r) => r.origin === "tool")).toEqual([]);
    });

    it("reads alpha, hex as Gephi's Color.decode (#rgb is 0x000rgb, #rrggbbaa keeps its last six digits) and sizes, leaves out the shapes Gephi does not draw, and clamps an alpha above 1 with a note", async () => {
        const { snapshot, styles, report } = await load(
            `<gexf version="1.3" xmlns:viz="http://gexf.net/1.3/viz"><graph><nodes>
            <node id="a"><viz:color r="255" g="0" b="0" a="0.5"/><viz:size value="4"/><viz:shape value="square"/></node>
            <node id="b"><viz:color hex="#0f0"/></node>
            <node id="c"><viz:color hex="#0000ff80"/></node>
            <node id="d"><viz:color r="1" g="2" b="3" a="1.5"/></node>
            </nodes><edges><edge source="a" target="b"><viz:thickness value="3"/><viz:shape value="dashed"/></edge>
            </edges></graph></gexf>`,
        );
        expect(resolveStyles(styles, "node", "fill", snapshot)).toEqual(["#ff0000", "#0000f0", "#00ff80", "#010203"]);
        // Gephi draws nodes opaque; their alpha goes into their edges' mix (a 128 and b 255 make 191)
        expect(resolveStyles(styles, "node", "fillOpacity", snapshot)).toEqual([null, null, null, null]);
        expect(resolveStyles(styles, "edge", "opacity", snapshot)).toEqual([191 / 255]);
        expect(resolveStyles(styles, "node", "width", snapshot)[0]).toBe(8); // viz:size is a radius
        // Gephi draws every node a disc and every edge solid, as thick as its weight
        expect(resolveStyles(styles, "node", "shape", snapshot)[0]).toBe("ellipse");
        expect(resolveStyles(styles, "edge", "width", snapshot)).toEqual([1]);
        expect(resolveStyles(styles, "edge", "lineStyle", snapshot)).toEqual([null]);
        expect(report.issues.filter((i) => i.code === GEXF_ISSUE.VIZ_VALUE).map((i) => i.element)).toEqual(["d"]);
    });
});

describe("GEXF styles: Gephi's Preview settings (the gephiPreview option)", () => {
    // each rule was measured on the Gephi Toolkit 0.11.3's SVG export of the GEXF specimen pages (pages.json)
    const doc = `<gexf version="1.3" xmlns:viz="http://gexf.net/1.3/viz"><graph defaultedgetype="directed"><nodes>
        <node id="a" label="a label of thirty-three chars ok!"><viz:color r="255" g="0" b="0" a="0.5"/><viz:size value="25"/></node>
        <node id="b" label="b"><viz:color r="0" g="0" b="255"/><viz:size value="10"/></node>
        <node id="c" label="c"><viz:color r="128" g="128" b="128"/><viz:size value="10"/></node></nodes><edges>
        <edge source="a" target="b" weight="0.5" label="ab"><viz:color r="80" g="80" b="80" a="0.5"/></edge>
        <edge source="b" target="c" weight="8"/><edge source="c" target="a" weight="1"/></edges></graph></gexf>`;
    const loadWith = async (gephiPreview: Record<string, string>) => {
        const result = await registry.importGraph(doc, { format: "gexf", styles: true, gephiPreview });
        if (result.styles === null || result.styles === undefined) {
            throw new Error("no styles");
        }
        const { snapshot, styles } = result;
        return (target: "node" | "edge", property: string) =>
            resolveStyles(styles, target, property as never, snapshot);
    };

    it("draws Gephi's defaults when no setting is given", async () => {
        const get = await loadWith({});
        expect(get("node", "borderColor")).toEqual(["#7f0000", "#00007f", "#404040"]);
        expect(get("node", "labelSize")).toEqual([15, 6, 6]);
        expect(get("edge", "width")).toEqual([0.5, 8, 1]);
        expect(get("edge", "curved")).toEqual([true, true, true]);
        expect(get("edge", "label")).toEqual([null, null, null]);
        expect(get("node", "labelAvoidOverlap")).toEqual([true, true, true]);
    });

    it("draws the node border, opacity and labels as the settings say", async () => {
        const border = await loadWith({
            "node.border.fixed": "true",
            "node.border.width": "4.0",
            "node.border.color": "lighter",
        });
        expect(border("node", "borderWidth")).toEqual([4, 4, 4]);
        expect(border("node", "borderColor")).toEqual(["#ff0000", "#0000ff", "#c0c0c0"]);
        // Gephi strokes the border inside the node's size (a circle of radius size - border / 2)
        expect(border("node", "borderPosition")).toEqual(["inside", "inside", "inside"]);
        // a node drawn less than opaque keeps its border, at the node's alpha (gexf-specimen-node-sizes-opacity-p2,
        // -p3: a fill of radius 0.84 s and a separate ring out to s, both at that alpha)
        const perNode = await loadWith({ "node.per.node.opacity": "true" });
        expect(perNode("node", "fillOpacity")[0]).toBeCloseTo(0.5, 2);
        expect(perNode("node", "borderWidth")).toEqual([4, 1.6, 1.6]);
        expect(perNode("node", "borderOpacity")[0]).toBeCloseTo(0.5, 2);
        expect(perNode("node", "borderOpacity").slice(1)).toEqual([null, null]);
        const faded = await loadWith({ "node.opacity": "40.0" });
        expect(faded("node", "fillOpacity")).toEqual([0.4, 0.4, 0.4]);
        expect(faded("node", "borderWidth")).toEqual([4, 1.6, 1.6]);
        expect(faded("node", "borderOpacity")).toEqual([0.4, 0.4, 0.4]);
        const labels = await loadWith({
            "node.label.proportinalSize": "false",
            "node.label.color": "parent",
            "node.label.shorten": "true",
            "node.label.outline.size": "4.0",
            "node.label.outline.color": "darker",
            "node.label.customFont": "true",
            "node.label.font": "DejaVu Serif,bolditalic,24",
            "node.label.avoidOverlap": "false",
        });
        expect(labels("node", "label")[0]).toBe("a label of thirty-three chars ...");
        expect(labels("node", "labelSize")).toEqual([24, 24, 24]);
        expect(labels("node", "labelColor")).toEqual(["#ff0000", "#0000ff", "#808080"]);
        expect(labels("node", "labelOutlineWidth")).toEqual([3, 3, 3]);
        expect(labels("node", "labelOutlineColor")).toEqual(["#7f0000", "#00007f", "#404040"]);
        expect(labels("node", "labelFont")[0]).toBe("DejaVu Serif");
        expect(labels("node", "labelWeight")[0]).toBe("bold");
        expect(labels("node", "labelItalic")[0]).toBe(true);
        // overlap avoidance off: nothing turns it on (Gephi's default turns it on for every node)
        expect(labels("node", "labelAvoidOverlap")).toEqual([null, null, null]);
        const boxed = await loadWith({ "node.label.box": "true", "node.label.box.color": "darker" });
        expect(boxed("node", "labelBorderColor")).toEqual(["#7f0000", "#00007f", "#404040"]);
        expect(boxed("node", "labelBorderWidth")).toEqual([2, 0.8, 0.8]);
        const hidden = await loadWith({ "node.label.show": "false" });
        expect(hidden("node", "label")).toEqual([null, null, null]);
    });

    it("draws the edges' color, opacity, thickness, curve, arrows and labels as the settings say", async () => {
        const source = await loadWith({ "edge.color": "source", "edge.opacity": "40.0" });
        expect(source("edge", "color")).toEqual(["#ff0000", "#0000ff", "#808080"]);
        // a's alpha 0.5 (128 of 255) is the source's alpha, times 0.4
        const opacity = source("edge", "opacity") as number[];
        expect(opacity.map((v) => Math.round(v * 1000) / 1000)).toEqual([0.201, 0.4, 0.4]);
        const original = await loadWith({ "edge.color": "original" });
        expect(original("edge", "color")).toEqual(["#505050", "#000000", "#000000"]);
        const custom = await loadWith({ "edge.color": "#ff0000", "edge.curved": "false" });
        expect(custom("edge", "color")).toEqual(["#ff0000", "#ff0000", "#ff0000"]);
        expect(custom("edge", "curved")).toEqual([false, false, false]);
        expect((await loadWith({ "edge.use-weight": "false" }))("edge", "width")).toEqual([1, 1, 1]);
        expect((await loadWith({ "edge.thickness": "3.0" }))("edge", "width")).toEqual([1.5, 24, 3]);
        const rescaled = (await loadWith({ "edge.rescale-weight": "true" }))("edge", "width") as number[];
        expect(rescaled.map((w) => Math.round(w * 1e4) / 1e4)).toEqual([0.4, 8, 0.9067]);
        expect((await loadWith({ "edge.show": "false" }))("edge", "visible")).toEqual([false, false, false]);
        expect((await loadWith({ "arrow.size": "0.0" }))("edge", "targetArrow")).toEqual(["none", "none", "none"]);
        expect((await loadWith({ "arrow.size": "6.0" }))("edge", "arrowSize")).toEqual([2, 2, 2]);
        const labels = await loadWith({ "edge.label.show": "true", "edge.label.color": "parent" });
        expect(labels("edge", "label")).toEqual(["ab", null, null]);
        expect(labels("edge", "labelSize")).toEqual([10, 10, 10]);
        expect(labels("edge", "labelPosition")).toEqual(["center", "center", "center"]);
        expect(labels("edge", "labelColor")[0]).toBe("#7f007f");
    });

    it("draws a fixed border no wider than the node's size", async () => {
        const result = await registry.importGraph(
            `<gexf version="1.3" xmlns:viz="http://gexf.net/1.3/viz"><graph><nodes>
            <node id="a"><viz:size value="3"/></node><node id="b"><viz:size value="18"/></node></nodes></graph></gexf>`,
            { format: "gexf", styles: true, gephiPreview: { "node.border.fixed": "true", "node.border.width": "4.0" } },
        );
        // gexf-specimen-node-fills-borders-p3: a size-3 node is stroked 3 wide on a circle of radius 1.5
        expect(resolveStyles(result.styles!, "node", "borderWidth", result.snapshot)).toEqual([3, 4]);
    });

    it("refuses a gephiPreview that is not an object of values", async () => {
        await expect(
            registry.importGraph(doc, {
                format: "gexf",
                gephiPreview: ["edge.curved"] as unknown as Record<string, string>,
            }),
        ).rejects.toThrow(/gephiPreview/);
    });
});

describe("GEXF styles: a large graph", () => {
    it("rescales the weights of more edges than a call's arguments can hold", () => {
        // 250,000 weights: Math.min(...weights) overflows the call stack at about 120,000
        const n = 250_000;
        const weights = Array.from({ length: n }, (_, e) => e % 10);
        const thick = edgeThickness(
            weights,
            weights.map(() => true),
            new GephiPreview({ "edge.rescale-weight": "true" }),
        );
        expect([thick[0], thick[9]]).toEqual([0.4, 8]);
    });
});

describe("GEXF node pictures", () => {
    it("draws every node a disc and no picture, an image shape with a uri too, as Gephi does", async () => {
        const { snapshot, styles } = await load(
            `<gexf version="1.3" xmlns:viz="http://gexf.net/1.3/viz"><graph><nodes>
            <node id="a"><viz:shape value="diamond" uri="pic.png"/></node>
            <node id="b"><viz:shape value="image" uri="pic.png"/></node>
            </nodes></graph></gexf>`,
        );
        // Gephi Toolkit 0.11.3 draws every shape a disc and no picture (gexf-specimen-images-charts)
        expect(resolveStyles(styles, "node", "shape", snapshot)).toEqual(["ellipse", "ellipse"]);
        expect(resolveStyles(styles, "node", "image", snapshot)).toEqual([null, null]);
    });

    it("reports a shape it replaces with the image shape a picture needs", () => {
        const b = new GraphBuilder({ directed: false });
        b.addNode("a");
        const snapshot = b.freeze();
        const styles = planStyles(
            {
                format: "test",
                node: { values: { shape: ["diamond"], image: ["pic.png"] } },
                fingerprint: styleFingerprint(snapshot),
            },
            { node: featuresOf(snapshot, "node"), edge: [] },
        );
        const losses = registry.checkExport(snapshot, "gexf", { styles });
        expect(
            losses.filter((l) => l.code === "W_STYLE_APPROXIMATED").map((l) => [l.style?.property, l.count]),
        ).toEqual([["shape", 1]]);
    });
});

describe("GEXF 1.0 files", () => {
    it("imports edges of type dir listed before their nodes, attvalue id values, and pid naming no node", async () => {
        const { snapshot, report, styles } = await load(
            new Uint8Array(readFileSync(join(CORPUS, "gexf10-edges-first.gexf"))),
        );
        expect(snapshot.nodeCount).toBe(24);
        expect(snapshot.edgeCount).toBe(30);
        expect(snapshot.directed).toBe(true);
        expect(report.errorCount).toBe(0);
        expect(report.issues.map((i) => i.code)).toEqual([GEXF_ISSUE.UNKNOWN_PID]);
        expect(snapshot.nodes.value("disclass", snapshot.ids.indexOf(100))).toBe("Neurological");
        expect(writers(styles, "node", "fill").find((r) => r.origin !== "tool")?.map?.fill).toMatchObject({
            kind: "discrete",
            by: { data: "disclass" },
        });
    });

    it("reports, and leaves out, a node an edge listed first names that no <node> declares", async () => {
        const doc = `<gexf version="1.0"><graph defaultedgetype="directed"><edges>
            <edge id="0" source="a" target="b"/><edge id="1" source="a" target="z"/></edges>
            <nodes><node id="a"/><node id="b"/></nodes></graph></gexf>`;
        const strict = await registry.importGraph(doc, { format: "gexf" });
        expect(strict.report.issues.map((i) => i.code)).toEqual(["E_UNKNOWN_NODE"]);
        expect(strict.snapshot.nodeCount).toBe(2);
        expect(strict.snapshot.edgeCount).toBe(1);
        const lenient = await registry.importGraph(doc, { format: "gexf", addMissingNodes: true });
        expect(lenient.report.errorCount).toBe(0);
        expect(lenient.snapshot.nodeCount).toBe(3);
        expect(lenient.snapshot.edgeCount).toBe(2);
    });

    it("still reports a GEXF 1.3 pid naming no node as an error", async () => {
        const pid = await registry
            .importGraph(`<gexf version="1.3"><graph><nodes><node id="a" pid="z"/></nodes></graph></gexf>`, {
                format: "gexf",
            })
            .then((r) => r.report.issues.map((i) => i.code));
        expect(pid).toEqual([GEXF_ISSUE.UNKNOWN_PARENT]);
    });
});

describe("GEXF styles: writing", () => {
    it("writes the styles into the viz module and reads back the same rules and values", async () => {
        const { snapshot, styles } = await load(new Uint8Array(readFileSync(DISEASOME)));
        const text = await registry.exportGraphToString(snapshot, "gexf", { styles });
        expect(text).toContain('<graphty:styles xmlns:graphty="https://graphty.app/ns/gexf"');
        const back = await load(text);
        expect(back.report.issues.map((i) => i.code)).not.toContain("W_UNKNOWN_ELEMENT");
        expect(back.styles.styles.source.tool).toBe("graphty");
        expect(plain(back.styles)).toEqual(plain(styles));
        for (const [target, property] of [
            ["node", "fill"],
            ["node", "width"],
            ["edge", "color"],
            ["edge", "targetArrow"],
        ] as const) {
            expect(resolveStyles(back.styles, target, property, back.snapshot)).toEqual(
                resolveStyles(styles, target, property, snapshot),
            );
        }
    });

    it("writes a CSS color from the styles as viz:color, and reports shapes and sizes GEXF can only approximate", async () => {
        const b = new GraphBuilder({ directed: false });
        b.addNode("a");
        b.addNode("b");
        const snapshot = b.freeze();
        const styles = planStyles(
            {
                format: "test",
                node: {
                    values: {
                        fill: ["#123456", "#123456"],
                        shape: ["hexagon", "ellipse"],
                        width: [10, 10],
                        height: [10, 20],
                    },
                },
                fingerprint: styleFingerprint(snapshot),
            },
            { node: featuresOf(snapshot, "node"), edge: [] },
        );
        const losses = registry.checkExport(snapshot, "gexf", { styles });
        expect(
            losses.filter((l) => l.code === "W_STYLE_APPROXIMATED").map((l) => [l.style?.property, l.count]),
        ).toEqual([
            ["shape", 1],
            ["width", 1],
        ]);
        const text = await registry.exportGraphToString(snapshot, "gexf", { styles });
        expect(text).toContain('<viz:color r="18" g="52" b="86"/>');
        expect(text).toContain('<viz:size value="10"/>'); // a radius: 20 across
        const back = await load(text);
        // the block keeps the exact values the viz module approximates
        expect(resolveStyles(back.styles, "node", "shape", back.snapshot)).toEqual(["hexagon", "ellipse"]);
        expect(resolveStyles(back.styles, "node", "height", back.snapshot)).toEqual([10, 20]);
    });
});

/** The block-tamper fixtures: a file graphty wrote, then edited outside as design 10.7 items 4 and 5 describe. */
async function tamperFixtures(): Promise<Record<string, Uint8Array>> {
    const base = await load(new Uint8Array(readFileSync(join(CORPUS, "random-all-60.gexf"))));
    const written = await registry.exportGraphToBytes(base.snapshot, "gexf", { styles: base.styles });
    const text = new TextDecoder().decode(written);
    const added = text.replace(
        /<nodes count="(\d+)">\n/,
        (_m, n: string) => `<nodes count="${String(Number(n) + 1)}">\n      <node id="added"/>\n`,
    );
    return {
        "graphty-written.gexf": written,
        "tamper-native-edited.gexf": editGexfNodeColor(written) ?? new Uint8Array(),
        "tamper-block-truncated.gexf": replaceGexfBlock(written, (block) =>
            block.slice(0, Math.floor(block.length / 2)),
        ),
        "tamper-node-added.gexf": new TextEncoder().encode(added),
    };
}

describe("GEXF block tamper fixtures", () => {
    it("are the edits they say they are (UPDATE_GEXF_TAMPER=1 writes them again)", async () => {
        for (const [name, bytes] of Object.entries(await tamperFixtures())) {
            const path = join(CORPUS, name);
            if (process.env.UPDATE_GEXF_TAMPER === "1") {
                writeFileSync(path, bytes);
            }
            expect(new TextDecoder().decode(readFileSync(path))).toBe(new TextDecoder().decode(bytes));
        }
    });

    it("bring an outside edit back as one exception over the same rules", async () => {
        const unedited = await load(new Uint8Array(readFileSync(join(CORPUS, "graphty-written.gexf"))));
        const edited = await load(new Uint8Array(readFileSync(join(CORPUS, "tamper-native-edited.gexf"))));
        const below = (ex: ExtractedStyles): unknown => plain(ex).filter((r) => r.role !== "exceptions");
        expect(below(edited.styles)).toEqual(below(unedited.styles));
        const excepted = edited.styles.columns.node.get("exceptions.fill") ?? [];
        expect(excepted.filter((v) => v !== null)).toEqual(["#123456"]);
    });

    it("ignore a truncated block and a block for another graph with a note, and read the file as Gephi's", async () => {
        for (const [file, reason] of [
            ["tamper-block-truncated.gexf", "NOT_JSON"],
            ["tamper-node-added.gexf", "FINGERPRINT"],
        ] as const) {
            const { styles } = await load(new Uint8Array(readFileSync(join(CORPUS, file))));
            const note = styles.styles.notes.find((n) => n.code === "W_STYLE_BLOCK_IGNORED");
            expect(note?.params.samples).toEqual([reason]);
            expect(styles.styles.source.tool).toBe("gephi");
        }
    });
});
