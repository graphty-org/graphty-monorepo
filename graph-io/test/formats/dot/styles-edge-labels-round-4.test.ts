/**
 * DOT edge label settings round 4 of the specimen sheets found graph-io missing (dot-specimen-edge-labels): the head
 * and tail labels' own face, and where Graphviz puts an edge label it was not given a place for. Each test fails
 * without its fix.
 */

import { describe, expect, it } from "vitest";

import { createRegistry } from "../../../src/registry.js";
import { resolveStyles, type StyleProperty } from "../../../src/styles/index.js";

const registry = createRegistry();

/**
 * Each edge's drawn value of a property, in order.
 * @param doc - the document
 * @param property - the property
 * @returns the values
 */
async function edges(doc: string, property: string): Promise<readonly unknown[]> {
    const result = await registry.importGraph(doc, { format: "dot", styles: { toolDefaults: true } });
    if (result.styles === null || result.styles === undefined) {
        throw new Error("no styles");
    }
    return resolveStyles(result.styles, "edge", property as StyleProperty, result.snapshot);
}

describe("DOT styles: the head and tail labels' face", () => {
    const doc = `digraph {
        a -> b [headlabel="H", labelfontsize=16, labelfontcolor="#e41a1c", labelfontname="DejaVu Serif"]
        c -> d [taillabel="T", labelfontsize=16]
        e -> f [label="mid", labelfontsize=16]
    }`;

    it("reads labelfontsize, labelfontcolor and labelfontname onto the ends that have a label", async () => {
        expect(await edges(doc, "targetLabelSize")).toEqual([16, null, null]);
        expect(await edges(doc, "sourceLabelSize")).toEqual([null, 16, null]);
        expect(await edges(doc, "targetLabelColor")).toEqual(["#e41a1c", null, null]);
        expect(await edges(doc, "targetLabelFont")).toEqual(["DejaVu Serif, sans-serif", null, null]);
    });

    it("leaves the edge's own label in its fontsize", async () => {
        expect(await edges(doc, "labelSize")).toEqual([14, 14, 14]);
    });
});

describe("DOT styles: an edge label Graphviz places itself", () => {
    it("puts it up and left of the edge's middle in every engine but dot (an external label)", async () => {
        const doc = `digraph { layout=neato; a -> b [label="lbl"]; c -> d }`;
        expect(await edges(doc, "labelShiftX")).toEqual([-0.5, null]);
        expect(await edges(doc, "labelShiftY")).toEqual([-0.5, null]);
        expect(await edges(doc, "labelPosition")).toEqual(["center", null]);
    });

    it("leaves dot's own label place, a label of a loop, and a stored lp alone", async () => {
        expect(await edges(`digraph { a -> b [label="lbl"] }`, "labelShiftX")).toEqual([null]);
        expect(await edges(`digraph { layout=neato; a -> a [label="lbl"] }`, "labelShiftX")).toEqual([null]);
        const stored = `digraph { layout=neato; a [pos="0,0"]; b [pos="100,0"];
            a -> b [label="lbl", pos="e,90,0 10,0 40,0 60,0 80,0", lp="50,10"] }`;
        expect(await edges(stored, "labelShiftX")).toEqual([null]);
    });
});

describe("DOT styles: an edge with both a label and an xlabel (issue #5288)", () => {
    const doc = `digraph { a -> b [xlabel="x"]; a -> c [label="l", xlabel="x \\E"] }`;

    it("carries the xlabel beside the label, and an xlabel alone as the label", async () => {
        expect(await edges(doc, "label")).toEqual(["x", "l"]);
        expect(await edges(doc, "xlabel")).toEqual([null, "x a->c"]);
        const result = await registry.importGraph(doc, { format: "dot", styles: true });
        expect(result.styles?.styles.notes.map((n) => n.code)).not.toContain("W_STYLE_NOT_CARRIED");
    });

    it("writes both back, and they read back as the same values", async () => {
        const r = await registry.importGraph(doc, { format: "dot", styles: true });
        const written = await registry.exportGraphToString(r.snapshot, "dot", { styles: r.styles ?? undefined });
        expect(written).toMatch(/xlabel="x a->c"/);
        expect(await edges(written, "label")).toEqual(["x", "l"]);
        expect(await edges(written, "xlabel")).toEqual([null, "x a->c"]);
    });
});
