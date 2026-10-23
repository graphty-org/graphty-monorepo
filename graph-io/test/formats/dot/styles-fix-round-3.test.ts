/**
 * DOT settings fix round 3 of the specimen sheets found graph-io missing: each test fails without its fix.
 */

import type { GraphSnapshot } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { createRegistry } from "../../../src/registry.js";
import { type ExtractedStyles, resolveStyles, type StyleProperty } from "../../../src/styles/index.js";

const registry = createRegistry();

/**
 * Imports a DOT document with its styles.
 * @param doc - the document
 * @returns the snapshot and its styles
 */
async function load(doc: string): Promise<{ snapshot: GraphSnapshot; styles: ExtractedStyles }> {
    const result = await registry.importGraph(doc, { format: "dot", styles: { toolDefaults: true } });
    if (result.styles === null || result.styles === undefined) {
        throw new Error("no styles");
    }
    return { snapshot: result.snapshot, styles: result.styles };
}

/**
 * Each node's drawn value of a property, by id.
 * @param doc - the document
 * @param property - the property
 * @returns the values
 */
async function nodes(doc: string, property: string): Promise<Record<string, unknown>> {
    const { snapshot, styles } = await load(doc);
    const values = resolveStyles(styles, "node", property as StyleProperty, snapshot);
    return Object.fromEntries(values.map((v, i) => [String(snapshot.ids.idOf(i)), v]));
}

/**
 * Each edge's drawn value of a property, in order.
 * @param doc - the document
 * @param property - the property
 * @returns the values
 */
async function edges(doc: string, property: string): Promise<readonly unknown[]> {
    const { snapshot, styles } = await load(doc);
    return resolveStyles(styles, "edge", property as StyleProperty, snapshot);
}

describe("DOT styles: HTML font runs", () => {
    it("reads <B>, <I> and FONT runs as labelRuns", async () => {
        const runs = await nodes(
            `digraph { a [label=<a<B>b</B><I><FONT COLOR="red" POINT-SIZE="16" FACE="DejaVu Serif">c</FONT></I>d>] }`,
            "labelRuns",
        );
        expect(JSON.parse(String(runs.a))).toEqual([
            { text: "a" },
            { text: "b", weight: "bold" },
            { text: "c", italic: true, font: "DejaVu Serif, sans-serif", size: 16, color: "#ff0000" },
            { text: "d" },
        ]);
    });

    it("sets the label's own font when the whole label is one run", async () => {
        const doc = `digraph { a [label=<<FONT COLOR="#e41a1c" POINT-SIZE="16"><B><I>x</I></B></FONT>>] }`;
        expect((await nodes(doc, "labelColor")).a).toBe("#e41a1c");
        expect((await nodes(doc, "labelSize")).a).toBe(16);
        expect((await nodes(doc, "labelWeight")).a).toBe("bold");
        expect((await nodes(doc, "labelItalic")).a).toBe(true);
        expect((await nodes(doc, "labelRuns")).a ?? null).toBeNull();
    });

    it("lines up an HTML label by the ALIGN of its line breaks", async () => {
        const doc = `digraph { a [label=<wide<BR ALIGN="LEFT"/>x<BR ALIGN="LEFT"/>>]; b [label=<w<BR ALIGN="RIGHT"/>x<BR ALIGN="RIGHT"/>>];
            c [label=<w<BR ALIGN="LEFT"/>x<BR/>>] }`;
        const align = await nodes(doc, "labelTextAlign");
        expect([align.a, align.b, align.c ?? null]).toEqual(["left", "right", null]);
    });

    it("reads an edge label's runs", async () => {
        const runs = await edges(`digraph { a -> b [label=<x<B>y</B>>] }`, "labelRuns");
        expect(JSON.parse(String(runs[0]))).toEqual([{ text: "x" }, { text: "y", weight: "bold" }]);
    });
});

describe("DOT styles: label places", () => {
    const ends = `graph [bb="0,0,200,100"]; a [pos="20,50!", shape=circle, width=0.1667, fixedsize=true];
        b [pos="100,50!", shape=circle, width=0.1667, fixedsize=true]`;

    it("places a head label where place_portlabel does for a labelangle or labeldistance off its default", async () => {
        const doc = `digraph { ${ends}; a -> b [headlabel=H, labelangle=90] }`;
        expect((await edges(doc, "targetLabelOffset"))[0]).toBe(0);
        // 10 points from the end, turned 90 degrees from the line back toward the source: below it on screen
        expect((await edges(doc, "targetLabelOffsetX"))[0]).toBeCloseTo(0, 5);
        expect((await edges(doc, "targetLabelOffsetY"))[0]).toBeCloseTo(10, 5);
        const far = `digraph { ${ends}; a -> b [taillabel=T, labeldistance=2] }`;
        expect((await edges(far, "sourceLabelOffsetX"))[0]).toBeCloseTo(20 * Math.cos((-25 * Math.PI) / 180), 4);
    });

    it("leaves an end label at its defaults, and a stored place on an edge Graphviz routes again, to graphty", async () => {
        const doc = `digraph { ${ends}; a -> b [headlabel=H, head_lp="60,70", label=x, lp="60,80"] }`;
        expect((await edges(doc, "targetLabelOffsetX"))[0] ?? null).toBeNull();
        expect((await edges(doc, "labelOffsetY"))[0] ?? null).toBeNull();
    });

    it("reads a stored lp and head_lp on an edge with a stored route", async () => {
        const doc = `digraph { ${ends}; a -> b [label=x, lp="60,80", headlabel=H, head_lp="90,60",
            pos="e,94,50 26,50 50,50 70,50 84,50"] }`;
        expect((await edges(doc, "labelOffsetX"))[0]).toBeCloseTo(0, 5);
        expect((await edges(doc, "labelOffsetY"))[0]).toBeCloseTo(-30, 5);
        expect((await edges(doc, "targetLabelOffsetX"))[0]).toBeCloseTo(-4, 5);
        expect((await edges(doc, "targetLabelOffsetY"))[0]).toBeCloseTo(-10, 5);
    });

    it("turns an end label from the line where a stored route with no arrow tip ends", async () => {
        // no e, point: the line ends at the spline's own end, so the angle is taken from the point before it
        const doc = `graph { ${ends}; a -- b [headlabel=H, labelangle=90, pos="26,50 50,50 70,50 94,50"] }`;
        expect((await edges(doc, "targetLabelOffsetX"))[0]).toBeCloseTo(0, 5);
        expect((await edges(doc, "targetLabelOffsetY"))[0]).toBeCloseTo(10, 5);
    });

    it("runs a stored route on to its arrow tip", async () => {
        const doc = `digraph { ${ends}; a -> b [pos="e,94,50 26,50 40,80 70,80 84,52"] }`;
        expect(
            String((await edges(doc, "bends"))[0])
                .split(" ")
                .at(-1),
        ).toBe("0.925,0");
    });

    it("places a cluster's label at its stored lp, and a justified one Graphviz's 8 points in", async () => {
        const doc = `digraph {
            subgraph cluster_a { graph [label=a, lp="30,90", bb="0,0,100,100"]; x }
            subgraph cluster_b { graph [label=b, labeljust=r, bb="0,0,100,100"]; y } }`;
        const x = await nodes(doc, "labelOffsetX");
        const y = await nodes(doc, "labelOffsetY");
        expect([x.cluster_a, y.cluster_a, (await nodes(doc, "labelPosition")).cluster_a]).toEqual([-20, -40, "center"]);
        expect(x.cluster_b).toBe(-8);
    });

    it("draws a node that grows to its label at least one quantum across", async () => {
        const doc = `digraph { graph [quantum=0.5]; a [shape=box, width=0, height=0, label=m];
            b [shape=ellipse, width=0, height=0, label=m]; c [shape=box, width=0.2, height=0.2, fixedsize=true] }`;
        const w = await nodes(doc, "width");
        expect([w.a, w.c]).toEqual([36, 14.4]);
        expect(w.b).toBeCloseTo(36 * Math.SQRT2, 3);
    });
});
