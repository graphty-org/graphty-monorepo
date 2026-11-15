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

    it("hangs it from the middle of the line Graphviz draws, which stops short of each arrowhead", async () => {
        const nodes = `node [shape=circle, width=0.1667, fixedsize=true]; a [pos="0,0!"]; b [pos="76,0!"]`;
        const offset = async (kind: string, attrs: string): Promise<readonly unknown[]> =>
            edges(
                `${kind} { layout=neato; ${nodes}; a ${kind === "digraph" ? "->" : "--"} b [label="l"${attrs}] }`,
                "labelOffsetX",
            );
        // from the outline at 6 to the head's arrow at 70 - 10: its middle 5 short of the centers' 38
        expect(await offset("digraph", "")).toEqual([-5]);
        expect(await offset("digraph", ", arrowsize=2")).toEqual([-10]);
        expect(await offset("digraph", ", dir=back, arrowtail=tee")).toEqual([2.5]);
        expect(await offset("digraph", ", dir=both")).toEqual([null]);
        expect(await offset("graph", "")).toEqual([null]);
    });

    it("hangs a loop's label outside the loop, its box's left side on the loop's far point (selfRight)", async () => {
        const doc = `digraph { a -> a [label="lbl"]; b -> b; c -> c [label="lbl", tailport=n]; d [pos="0,0"];
            d -> d [label="lbl", pos="e,0,0 1,1 2,2 3,3 4,4"] }`;
        expect(await edges(doc, "labelShiftX")).toEqual([0.5, null, null, null]);
        expect(await edges(doc, "labelShiftY")).toEqual([null, null, null, null]);
        expect(await edges(doc, "labelPosition")).toEqual(["center", null, null, null]);
        expect(await edges(`digraph { splines=ortho; a -> a [label="lbl"] }`, "labelShiftX")).toEqual([null]);
    });

    it("leaves dot's own label place and a stored lp alone", async () => {
        expect(await edges(`digraph { a -> b [label="lbl"] }`, "labelShiftX")).toEqual([null]);
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

describe("DOT styles: an edge label that is an HTML-like table", () => {
    const doc = `digraph {
        a -> b [color="#505050", label=<<TABLE BGCOLOR="#ffd700"><TR><TD>t</TD></TR></TABLE>>]
        c -> d [label=<<TABLE BORDER="2" COLOR="red" CELLSPACING="0" CELLBORDER="0"><TR><TD BGCOLOR="blue" CELLPADDING="5">t</TD></TR></TABLE>>]
        e -> f [label=<<TABLE BORDER="0" CELLBORDER="0"><TR><TD>t</TD></TR></TABLE>>]
        g -> h [label=<<TABLE STYLE="invis"><TR><TD>t</TD></TR></TABLE>>]
        i -> j [label=<<B>t</B>>]
        k -> l [label="t"]
    }`;

    it("draws the table's fill, the table's or else a lone cell's", async () => {
        expect(await edges(doc, "labelBackground")).toEqual(["#ffd700", "#0000ff", null, null, null, null]);
    });

    it("outlines it and its cells in the table's color, else the edge's, as wide as its BORDER", async () => {
        expect(await edges(doc, "labelBorderColor")).toEqual(["#505050", "#ff0000", "#000000", null, null, null]);
        expect(await edges(doc, "labelBorderWidth")).toEqual([1, 2, null, null, null, null]);
    });

    it("keeps the words as far in as its border, spacing, cell border and padding put them", async () => {
        expect(await edges(doc, "labelPadding")).toEqual([6, 7, 2 + 2, null, null, null]);
    });

    it("hands the table itself over as labelTable, its lines set as Graphviz sets them", async () => {
        const tables = (await edges(doc, "labelTable")).map((t) =>
            typeof t === "string" ? (JSON.parse(t) as unknown) : t,
        );
        expect(tables.slice(2)).toEqual([expect.objectContaining({ border: 0, cellBorder: 0 }), null, null, null]);
        expect(tables[0]).toMatchObject({
            border: 1,
            cellBorder: 1,
            cellSpacing: 2,
            cellPadding: 2,
            fill: "#ffd700",
            lineHeight: "font",
            baseline: 0.95,
            rows: [{ cells: [{ lines: [{ runs: [expect.objectContaining({ text: "t" })] }] }] }],
        });
    });
});
