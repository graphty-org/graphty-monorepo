/**
 * GEXF labels and settings drawn as Gephi Toolkit 0.11.3 draws them (specimen sheet fix round 2).
 */

import { describe, expect, it } from "vitest";

import { drawnLabels, GephiPreview } from "../../../src/formats/gexf/preview.js";
import { createRegistry } from "../../../src/registry.js";
import { resolveStyles } from "../../../src/styles/internal.js";

const registry = createRegistry();
const DOC = `<gexf version="1.3" xmlns:viz="http://gexf.net/1.3/viz"><graph defaultedgetype="directed"><nodes>
    <node id="a" label="a"><viz:color r="255" g="0" b="0"/><viz:size value="10"/></node>
    <node id="b" label="b"><viz:color r="0" g="0" b="255"/><viz:size value="10"/></node></nodes><edges>
    <edge source="a" target="b" label="ab"/></edges></graph></gexf>`;

/**
 * The GEXF above imported under some Preview settings.
 * @param gephiPreview - the settings
 * @returns a reader of one resolved property
 */
async function loadWith(gephiPreview: Record<string, string>) {
    const result = await registry.importGraph(DOC, { format: "gexf", styles: true, gephiPreview });
    const { snapshot, styles } = result;
    if (styles === null || styles === undefined) {
        throw new Error("no styles");
    }
    return (target: "node" | "edge", property: string) => resolveStyles(styles, target, property as never, snapshot);
}

describe("Gephi's label drawing", () => {
    it("draws a label's line break as nothing, as Java's drawString does (gexf-specimen-labels, label-newline)", () => {
        const labels = drawnLabels(["line one\nline two", "a & b <c>", null], new GephiPreview(), "node");
        expect(labels).toEqual(["line oneline two", "a & b <c>", null]);
    });

    it("cuts a label before taking its line breaks out", () => {
        const preview = new GephiPreview({
            "edge.label.show": "true",
            "edge.label.shorten": "true",
            "edge.label.max-char": "4",
        });
        expect(drawnLabels(["ab\ncdefgh"], preview, "edge")).toEqual(["abc..."]);
    });
});

describe("Gephi's label outline and box", () => {
    it("draws the label outline at its opacity, in Gephi's 256 steps (labels-p10, edge-labels-p5)", async () => {
        const outlined = await loadWith({
            "node.label.outline.size": "4.0",
            "node.label.outline.opacity": "30.0",
            "edge.label.show": "true",
            "edge.label.outline.size": "3.0",
        });
        expect(outlined("node", "labelOutlineOpacity")).toEqual([76 / 255, 76 / 255]);
        // Gephi's default outline opacity is 80
        expect(outlined("edge", "labelOutlineOpacity")).toEqual([204 / 255]);
        const plain = await loadWith({});
        expect(plain("node", "labelOutlineOpacity")).toEqual([null, null]);
    });

    it("draws the label box at its opacity, round the text's own bounds (labels-p11, -p13)", async () => {
        const boxed = await loadWith({ "node.label.box": "true", "node.label.box.opacity": "40.0" });
        expect(boxed("node", "labelBorderOpacity")).toEqual([0.4, 0.4]);
        expect(boxed("node", "labelPadding")).toEqual([0, 0]);
        expect(boxed("node", "labelLineHeight")).toEqual([1, 1]);
        const plain = await loadWith({});
        expect(plain("node", "labelPadding")).toEqual([null, null]);
    });
});

describe("a GEXF graphty wrote", () => {
    it("keeps a label's line break: the file keeps its own values", () => {
        expect(drawnLabels(["line one\nline two"], new GephiPreview(), "node", true)).toEqual(["line one\nline two"]);
    });
});

describe("curved edges Gephi's nodes swallow", () => {
    // size-4 nodes (radius 4): an arc of radius d / 1.2 cut back by a chord of 4 at each end draws nothing once
    // d <= 7.588 (gexf-cns-wos: 7.585 not drawn, 7.745 drawn)
    const doc = (
        type: string,
        d: number,
    ) => `<gexf version="1.3" xmlns:viz="http://gexf.net/1.3/viz"><graph defaultedgetype="${type}"><nodes>
        <node id="a"><viz:size value="4"/><viz:position x="0" y="0"/></node>
        <node id="b"><viz:size value="4"/><viz:position x="${String(d)}" y="0"/></node>
        <node id="c"><viz:size value="4"/><viz:position x="0" y="40"/></node></nodes><edges>
        <edge source="a" target="b"/><edge source="a" target="c"/></edges></graph></gexf>`;
    const read = async (text: string, gephiPreview: Record<string, string> = {}) => {
        const { snapshot, styles } = await registry.importGraph(text, { format: "gexf", styles: true, gephiPreview });
        if (styles === null || styles === undefined) {
            throw new Error("no styles");
        }
        return (property: string) => resolveStyles(styles, "edge", property as never, snapshot);
    };

    it("leaves out an undirected edge between overlapping nodes, and keeps one just far enough apart", async () => {
        expect((await read(doc("undirected", 7.585)))("visible")).toEqual([false, null]);
        expect((await read(doc("undirected", 7.745)))("visible")).toEqual([null, null]);
    });

    it("keeps a directed edge's arrowhead and draws no line", async () => {
        const get = await read(doc("directed", 7.585));
        expect(get("visible")).toEqual([null, null]);
        expect(get("opacity")[0]).toBe(0);
        expect(get("opacity")[1]).toBeNull();
    });

    it("draws every straight edge", async () => {
        expect((await read(doc("undirected", 7.585), { "edge.curved": "false" }))("visible")).toEqual([null, null]);
    });
});

describe("Gephi's label overlap avoidance", () => {
    // two size-10 nodes 20 apart: their 6 px labels (12 x 0.05 x 10) cover cells of the 10-unit grid in common, so the
    // later one is hidden; a third far away keeps its label
    const doc = `<gexf version="1.3" xmlns:viz="http://gexf.net/1.3/viz"><graph><nodes>
        <node id="a" label="a long label"><viz:size value="10"/><viz:position x="0" y="0"/></node>
        <node id="b" label="another one"><viz:size value="10"/><viz:position x="20" y="0"/></node>
        <node id="c" label="far"><viz:size value="10"/><viz:position x="500" y="500"/></node>
        <node id="d" label="bigger wins"><viz:size value="20"/><viz:position x="10" y="300"/></node>
        <node id="e" label="small"><viz:size value="5"/><viz:position x="10" y="300"/></node>
        </nodes><edges/></graph></gexf>`;

    it("hides the labels Gephi's grid hides, largest font first, and leaves no overlap rule for graphty", async () => {
        const { snapshot, styles } = await registry.importGraph(doc, { format: "gexf", styles: true });
        if (styles === null || styles === undefined) {
            throw new Error("no styles");
        }
        const get = (property: string) => resolveStyles(styles, "node", property as never, snapshot);
        expect(get("label")).toEqual(["a long label", null, "far", "bigger wins", null]);
        expect(get("labelAvoidOverlap")).toEqual([null, null, null, null, null]);
    });
});
