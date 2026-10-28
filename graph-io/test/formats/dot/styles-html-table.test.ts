/**
 * A DOT node whose label is an HTML-like table: Graphviz draws the table's border round it (`BORDER`, default 1, in
 * the table's `COLOR`, else the node's pen color, dashed or dotted by its `STYLE`) even when the node's shape draws
 * no outline (`plain`, `plaintext`, `none`), and the table's border, spacing and padding sit round the cells' text
 * (lib/common/htmltable.c). The dot-specimen-labels sheets drew none of it.
 */

import { describe, expect, it } from "vitest";

import { createRegistry } from "../../../src/registry.js";
import { resolveStyles, type StyleProperty } from "../../../src/styles/index.js";

const registry = createRegistry();

/**
 * Each node's drawn value of a property, by node id.
 * @param doc - the document
 * @param property - the property
 * @returns the values by id
 */
async function byId(doc: string, property: string): Promise<Map<string, unknown>> {
    const result = await registry.importGraph(doc, { format: "dot", styles: { toolDefaults: true } });
    if (result.styles === null || result.styles === undefined) {
        throw new Error("no styles");
    }
    const values = resolveStyles(result.styles, "node", property as StyleProperty, result.snapshot);
    return new Map(values.map((v, i) => [String(result.snapshot.ids.idOf(i)), v]));
}

const doc = `digraph {
    node [shape=plain, color="#505050", fontsize=10];
    t [label=<<TABLE><TR><TD>a</TD><TD>b</TD></TR></TABLE>>];
    b3 [label=<<TABLE BORDER="3"><TR><TD>a</TD></TR></TABLE>>];
    b0 [label=<<TABLE BORDER="0"><TR><TD>a</TD></TR></TABLE>>];
    c [label=<<TABLE COLOR="#e41a1c"><TR><TD>a</TD></TR></TABLE>>];
    d [label=<<TABLE STYLE="dashed"><TR><TD>a</TD></TR></TABLE>>];
    inv [label=<<TABLE STYLE="invis"><TR><TD>a</TD></TR></TABLE>>];
    f [label=<<FONT POINT-SIZE="10"><TABLE><TR><TD>a</TD></TR></TABLE></FONT>>];
    n [shape=none, label=<<TABLE><TR><TD>a</TD></TR></TABLE>>];
    pt [shape=plaintext, color=darkgreen, label=<<TABLE><TR><TD>a</TD></TR></TABLE>>];
    w [label=<<TABLE WIDTH="80" HEIGHT="40"><TR><TD>a</TD></TR></TABLE>>];
    txt [label=<a<B>b</B>>];
    m [margin="0.5", label=<<TABLE><TR><TD>a</TD></TR></TABLE>>];
    box [shape=box, penwidth=2, label=<<TABLE BORDER="3"><TR><TD>a</TD></TR></TABLE>>];
}`;

describe("DOT styles: an HTML-like table label", () => {
    it("draws the table's border round a node whose shape has no outline", async () => {
        const width = await byId(doc, "borderWidth");
        expect(["t", "b3", "b0", "c", "d", "inv", "f", "w"].map((id) => width.get(id))).toEqual([
            1, 3, 0, 1, 1, 0, 1, 1,
        ]);
        // a label that is not a table draws no outline; a shape with its own outline keeps it
        expect(width.get("txt")).toBe(0);
        expect(width.get("box")).toBe(2);
        const color = await byId(doc, "borderColor");
        expect(["t", "c"].map((id) => color.get(id))).toEqual(["#505050", "#e41a1c"]);
        expect((await byId(doc, "borderStyle")).get("d")).toBe("dashed");
    });

    it("holds the cells' text inside the table's border, spacing, cell border and padding", async () => {
        const padX = await byId(doc, "labelPaddingX");
        // 1 border + 2 spacing + 1 cell border + 2 padding; BORDER=3 is the cells' border too; plaintext adds its
        // margin (8)
        expect(["t", "b3", "pt", "txt"].map((id) => padX.get(id))).toEqual([6, 10, 14, 0]);
        // plain forces the margin to 0, whatever it is given
        expect(padX.get("m")).toBe(6);
        // TABLE WIDTH and HEIGHT are the least size
        expect((await byId(doc, "width")).get("w")).toBe(80);
        expect((await byId(doc, "height")).get("w")).toBe(40);
    });

    // measured with dot 2.43: a table's WIDTH and HEIGHT and the node's own size (given, else 0.75 x 0.5 inch for any
    // shape but plain) are each a least size; Graphviz rejects an out-of-range BORDER ("> 255 - too large") and uses 1
    const sized = `digraph {
        wbox [shape=box, width=3, height=2, label=<<TABLE WIDTH="80" HEIGHT="20"><TR><TD>a</TD></TR></TABLE>>];
        wpt [shape=plaintext, label=<<TABLE WIDTH="20" HEIGHT="10"><TR><TD>a</TD></TR></TABLE>>];
        wplain [shape=plain, label=<<TABLE WIDTH="20" HEIGHT="10"><TR><TD>a</TD></TR></TABLE>>];
        none0 [shape=none, margin=0, width=0, height=0, label=<<TABLE><TR><TD>a</TD></TR></TABLE>>];
        nonem [shape=none, width=0, height=0, label=<<TABLE><TR><TD>a</TD></TR></TABLE>>];
        huge [shape=plain, label=<<TABLE BORDER="1e300" CELLPADDING="1000" WIDTH="1e9"><TR><TD>a</TD></TR></TABLE>>];
        neg [shape=plain, label=<<TABLE CELLSPACING="-5"><TR><TD>a</TD></TR></TABLE>>];
    }`;

    it("keeps the node's own size when the table's WIDTH and HEIGHT are smaller", async () => {
        const width = await byId(sized, "width");
        const height = await byId(sized, "height");
        expect([width.get("wbox"), height.get("wbox")]).toEqual([216, 144]);
        expect([width.get("wpt"), height.get("wpt")]).toEqual([54, 36]);
        expect([width.get("wplain"), height.get("wplain")]).toEqual([20, 10]);
    });

    it("draws a plaintext or none table's border only where the node's box is the table's", async () => {
        const width = await byId(doc, "borderWidth");
        // default margin and least size: Graphviz draws the border inside the node's box, graphty cannot yet
        expect([width.get("n"), width.get("pt")]).toEqual([0, 0]);
        expect((await byId(doc, "shape")).get("n")).toBe("none");
        expect((await byId(sized, "borderWidth")).get("none0")).toBe(1);
        // its default margin (8 by 4 points) puts the border inside the box too
        expect((await byId(sized, "borderWidth")).get("nonem")).toBe(0);
        expect((await byId(sized, "shape")).get("none0")).toBe("rectangle");
    });

    it("uses the default for a table attribute out of Graphviz's range", async () => {
        expect((await byId(sized, "borderWidth")).get("huge")).toBe(1);
        // 1 border + 2 spacing + 1 cell border + 2 padding (1000 is over 255); a negative CELLSPACING is allowed, but
        // the text never sits outside the table
        expect((await byId(sized, "labelPaddingX")).get("huge")).toBe(6);
        expect((await byId(sized, "labelPaddingX")).get("neg")).toBe(0);
        // WIDTH over 65535 is ignored: the plain node keeps its size 0 and grows to its text
        expect((await byId(sized, "width")).get("huge")).toBe(0);
    });
});
