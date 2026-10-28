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
        expect(["t", "b3", "b0", "c", "d", "inv", "f", "n", "pt", "w"].map((id) => width.get(id))).toEqual([
            1, 3, 0, 1, 1, 0, 1, 1, 1, 1,
        ]);
        // a label that is not a table draws no outline; a shape with its own outline keeps it
        expect(width.get("txt")).toBe(0);
        expect(width.get("box")).toBe(2);
        const color = await byId(doc, "borderColor");
        expect(["t", "c", "pt"].map((id) => color.get(id))).toEqual(["#505050", "#e41a1c", "#006400"]);
        expect((await byId(doc, "borderStyle")).get("d")).toBe("dashed");
        // shape=none with a table is the table's box, drawn
        expect((await byId(doc, "shape")).get("n")).toBe("rectangle");
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
});
