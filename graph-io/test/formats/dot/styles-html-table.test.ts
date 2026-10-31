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

/**
 * Each node's table frame (`labelTable`): its border, cell border, cell spacing and cell padding, by node id.
 * @param doc - the document
 * @returns the frames by id; a node whose label is no table has none
 */
async function frames(doc: string): Promise<Map<string, number[]>> {
    const tables = await byId(doc, "labelTable");
    return new Map(
        [...tables]
            .filter(([, v]) => typeof v === "string")
            .map(([id, v]) => {
                const t = JSON.parse(v as string) as Record<string, number>;
                return [id, [t.border, t.cellBorder, t.cellSpacing, t.cellPadding]];
            }),
    );
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

    it("carries the table's border, spacing, cell border and padding, the label's box being the table's", async () => {
        const frame = await frames(doc);
        // Graphviz's defaults: 1 border, 2 spacing, the border as the cells' border, 2 padding; BORDER=3 is the
        // cells' border too
        expect(frame.get("t")).toEqual([1, 1, 2, 2]);
        expect(frame.get("b3")).toEqual([3, 3, 2, 2]);
        expect(frame.get("txt")).toBeUndefined();
        const padX = await byId(doc, "labelPaddingX");
        // round the table only the node's margin: plaintext's 8, plain's 0 whatever it is given
        expect(["t", "b3", "pt", "txt", "m"].map((id) => padX.get(id))).toEqual([0, 0, 8, 0, 0]);
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
        huge [shape=plain, label=<<TABLE BORDER="300" CELLPADDING="1000" WIDTH="100000"><TR><TD>a</TD></TR></TABLE>>];
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
        // BORDER 300 and CELLPADDING 1000 are over 255: the defaults hold; a negative CELLSPACING overlaps the cells,
        // which graphty lays out touching
        expect((await frames(sized)).get("huge")).toEqual([1, 1, 2, 2]);
        expect((await frames(sized)).get("neg")).toEqual([1, 1, 0, 2]);
        // WIDTH over 65535 is ignored: the plain node keeps its size 0 and grows to its text
        expect((await byId(sized, "width")).get("huge")).toBe(0);
    });

    it("reads a table attribute as Graphviz does: a whole number, an empty one ignored, CELLBORDER up to 127", async () => {
        const read = `digraph {
            node [shape=plain];
            empty [label=<<TABLE BORDER=""><TR><TD>a</TD></TR></TABLE>>];
            frac [label=<<TABLE BORDER="2.5" CELLSPACING="0" CELLPADDING="0"><TR><TD>a</TD></TR></TABLE>>];
            cb [label=<<TABLE BORDER="0" CELLSPACING="0" CELLPADDING="0" CELLBORDER="200"><TR><TD>a</TD></TR></TABLE>>];
            gap [shape=none, margin="", label=<<TABLE WIDTH="80" HEIGHT="40"><TR><TD>a</TD></TR></TABLE>>];
        }`;
        const width = await byId(read, "borderWidth");
        expect([width.get("empty"), width.get("frac")]).toEqual([1, 2]);
        // 2 border, the cells take the table's border
        expect((await frames(read)).get("frac")).toEqual([2, 2, 0, 0]);
        // CELLBORDER 200 is out of range: the table's border (0) holds
        expect((await frames(read)).get("cb")).toEqual([0, 0, 0, 0]);
        // an empty margin is Graphviz's default 8 by 4, so the border is inside the node's box
        expect(width.get("gap")).toBe(0);
    });
});

describe("DOT styles: an HTML-like table's cells (labelTable)", () => {
    const cells = `digraph {
        node [shape=plain];
        spans [label=<<TABLE><TR><TD COLSPAN="2" ROWSPAN="3" WIDTH="60" HEIGHT="30" FIXEDSIZE="TRUE">ab</TD></TR><HR/><TR><TD>a</TD><VR/><TD BORDER="2" CELLPADDING="5">b</TD></TR></TABLE>>];
        lines [label=<<TABLE><TR><TD ALIGN="TEXT" BALIGN="RIGHT" VALIGN="TOP">wide line<BR ALIGN="LEFT"/>x<BR/>y<BR ALIGN="RIGHT"/></TD></TR></TABLE>>];
        fonts [label=<<FONT COLOR="red"><TABLE><TR><TD>a<B>b</B>  </TD><TD></TD></TR></TABLE></FONT>>];
        nested [label=<<TABLE><TR><TD><TABLE ALIGN="RIGHT" VALIGN="BOTTOM" BORDER="0"><TR><TD>a</TD></TR></TABLE></TD></TR></TABLE>>];
        text [label=<a<BR/>b>];
    }`;

    /**
     * Each node's table, parsed.
     * @returns the tables by id
     */
    async function tables(): Promise<Map<string, unknown>> {
        const raw = await byId(cells, "labelTable");
        return new Map([...raw].map(([id, v]) => [id, typeof v === "string" ? JSON.parse(v) : v]));
    }

    it("reads spans, sizes and rules between rows and cells", async () => {
        const t = (await tables()).get("spans") as { rows: unknown[]; lineHeight: number };
        // the line its text layout gives DejaVu Sans at 10 points, 12.75 points (dot-specimen-labels-p2 html-td-balign-left)
        expect(t.lineHeight).toBe(1.275);
        expect(t.rows).toEqual([
            {
                cells: [
                    {
                        colspan: 2,
                        rowspan: 3,
                        width: 60,
                        height: 30,
                        fixedSize: true,
                        lines: [{ runs: [{ text: "ab" }] }],
                    },
                ],
            },
            {
                rule: true,
                cells: [
                    { lines: [{ runs: [{ text: "a" }] }] },
                    { border: 2, padding: 5, rule: true, lines: [{ runs: [{ text: "b" }] }] },
                ],
            },
        ]);
    });

    it("splits a cell's text into lines, each lined up by the break that ends it; a last break adds none", async () => {
        const t = (await tables()).get("lines") as { rows: { cells: unknown[] }[] };
        expect(t.rows[0].cells[0]).toEqual({
            align: "text",
            valign: "top",
            balign: "right",
            lines: [
                { runs: [{ text: "wide line" }], align: "left" },
                { runs: [{ text: "x" }] },
                { runs: [{ text: "y" }], align: "right" },
            ],
        });
    });

    it("draws a cell's runs in the fonts round them, the table's own included; an empty cell has no lines", async () => {
        const t = (await tables()).get("fonts") as { rows: { cells: unknown[] }[] };
        expect(t.rows[0].cells).toEqual([
            {
                lines: [
                    {
                        runs: [
                            { text: "a", color: "#ff0000" },
                            { text: "b", color: "#ff0000", weight: "bold" },
                        ],
                    },
                ],
            },
            {},
        ]);
    });

    it("reads a table inside a cell with its own frame and where it sits", async () => {
        const t = (await tables()).get("nested") as { rows: { cells: { table: unknown }[] }[] };
        expect(t.rows[0].cells[0].table).toEqual({
            border: 0,
            cellBorder: 0,
            cellSpacing: 2,
            cellPadding: 2,
            align: "right",
            valign: "bottom",
            rows: [{ cells: [{ lines: [{ runs: [{ text: "a" }] }] }] }],
        });
        expect((await tables()).get("text")).toBeNull();
    });
});

describe("DOT styles: pictures and backgrounds in a table, and a node's own picture", () => {
    const pictures = `digraph {
        node [shape=plain];
        img [label=<<TABLE><TR><TD WIDTH="40" HEIGHT="30" FIXEDSIZE="TRUE"><IMG SRC="img-wide.png" SCALE="TRUE"/></TD><TD><IMG SRC="a.png"/></TD><TD><IMG SCALE="BOTH"/></TD></TR></TABLE>>];
        bg [label=<<TABLE BGCOLOR="lightyellow"><TR><TD BGCOLOR="#4477aa">a</TD><TD BGCOLOR="#e41a1c:#377eb8">b</TD><TD BGCOLOR="nonsense-color">c</TD></TR></TABLE>>];
        n [shape=box, width=0.6667, height=0.5, fixedsize=true, image="img-quadrants.png"];
        t [shape=box, image="i.png", imagescale=true, imagepos=tl];
        both [shape=box, image="i.png", imagescale=both];
        w [shape=box, width=0.6667, image="i.png", imagescale=width, imagepos=br];
        none [shape=box];
    }`;

    it("carries a cell's <IMG> as its src as written and its SCALE; an IMG without SRC is an empty cell", async () => {
        const t = JSON.parse((await byId(pictures, "labelTable")).get("img") as string) as {
            rows: { cells: unknown[] }[];
        };
        expect(t.rows[0].cells).toEqual([
            { width: 40, height: 30, fixedSize: true, image: { src: "img-wide.png", scale: "true" } },
            { image: { src: "a.png" } },
            {},
        ]);
    });

    it("carries the table's and each cell's BGCOLOR as a fill color, a gradient's first color, an unknown one black as Graphviz draws it", async () => {
        const t = JSON.parse((await byId(pictures, "labelTable")).get("bg") as string) as {
            fill: string;
            rows: { cells: { fill?: string }[] }[];
        };
        expect(t.fill).toBe("#ffffe0");
        expect(t.rows[0].cells.map((c) => c.fill)).toEqual(["#4477aa", "#e41a1c", "#000000"]);
    });

    it("carries a node's image, imagescale and imagepos", async () => {
        const props = ["image", "imageFit", "imageWidth", "imageHeight", "imageAutoSize"];
        const pos = ["imagePositionX", "imagePositionY"];
        const values = await Promise.all([...props, ...pos].map((p) => byId(pictures, p)));
        const row = (id: string): unknown[] => values.map((v) => v.get(id) ?? null);
        expect(row("n")).toEqual(["img-quadrants.png", "none", null, null, null, null, null]);
        expect(row("t")).toEqual(["i.png", "contain", null, null, null, 0, 0]);
        expect(row("both")).toEqual(["i.png", "fill", null, null, null, null, null]);
        expect(row("w")).toEqual(["i.png", "none", 48.0024, null, "natural", 1, 1]);
        expect(row("none")).toEqual([null, null, null, null, null, null, null]);
    });
});
