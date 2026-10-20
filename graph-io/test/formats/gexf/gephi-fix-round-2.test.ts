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
