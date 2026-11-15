/**
 * @file Graphviz sizes each label in the face the element draws it in (issue #5116): a `fontname` is handed over as
 * the Graphviz family whose widths match the drawn face, so a Verdana file drawn in a Times-like fallback is laid out
 * at the width it is drawn, not at Verdana's.
 */

import { graphvizFont } from "@graphty/graph-io/dot";
import { assert, describe, it } from "vitest";

import { FONT_PROBE, GRAPHVIZ_FAMILIES, type MeasureText, withDrawnFonts } from "../../src/layout/graphviz/fonts";
import { layout } from "../../src/layout/graphviz/loader";
import type { DotStructure } from "../../src/layout/graphviz/toDot";

/** A browser with only a Times-like face (Liberation Serif): every family list draws at Times' widths. */
const timesOnly: MeasureText = (css, text) => (35.3563 * 100 * text.length) / FONT_PROBE.length;

/**
 * A browser that has the named family and draws it at that Graphviz table's widths, and any other in Times.
 * @param family - the installed family, as Graphviz names its table
 * @returns the measurer
 */
function installed(family: string): MeasureText {
    const width = GRAPHVIZ_FAMILIES.find(([name]) => name === family)?.[1] ?? 0;
    return (css, text) => (css.includes(family) ? width * 100 : timesOnly(css, text));
}

describe("the font Graphviz sizes a label in", () => {
    const structure: DotStructure = {
        edges: [
            { src: 0, dst: 1, attributes: { label: "Acceptance", fontname: "Verdana" } },
            { src: 1, dst: 0, attributes: { weight: "2" } },
            { src: 1, dst: 2, attributes: { label: "default face" } },
        ],
        groupAttributes: new Map([[3, { label: "cluster", fontname: "Helvetica-Outline" }]]),
        nodeAttributes: new Map([[0, { label: "node", fontname: "Verdana", shape: "box" }]]),
    };

    it("is the drawn face's: Verdana and Helvetica-Outline drawn in a Times-like fallback are sized as Times", () => {
        const handed = withDrawnFonts(structure, graphvizFont, timesOnly);
        assert.strictEqual(handed.edges?.[0].attributes?.fontname, "Times");
        assert.strictEqual(handed.groupAttributes?.get(3)?.fontname, "Times");
        assert.strictEqual(handed.nodeAttributes?.get(0)?.fontname, "Times");
        // an edge with no label and a label in Graphviz's own default are left as they were
        assert.deepStrictEqual(handed.edges?.[1].attributes, { weight: "2" });
        assert.deepStrictEqual(handed.edges?.[2].attributes, { label: "default face" });
    });

    it("stays the file's where the browser draws that face", () => {
        const handed = withDrawnFonts(structure, graphvizFont, installed("Verdana"));
        assert.strictEqual(handed.edges?.[0].attributes?.fontname, "Verdana");
        assert.strictEqual(handed.nodeAttributes?.get(0)?.fontname, "Verdana");
    });

    it("hands an unlabelled default its drawn face when that is not Times", () => {
        const handed = withDrawnFonts(structure, graphvizFont, () => 41.611 * 100);
        assert.strictEqual(handed.edges?.[2].attributes?.fontname, "DejaVu Sans");
    });

    it("matches the widths Graphviz itself measures for each family", async () => {
        for (const [family, width] of GRAPHVIZ_FAMILIES) {
            const reply = await layout(
                `digraph { node [shape=plaintext, margin=0, width=0, height=0, fontsize=1000]; ` +
                    `a [label="${FONT_PROBE}", fontname="${family}"] }`,
                "dot",
            );
            assert.isTrue(reply.ok);
            const json = JSON.parse(reply.ok ? reply.json : "{}") as { objects: { width: string }[] };
            const measured = (Number(json.objects[0].width) * 72) / 1000;
            assert.approximately(measured, width, 1e-3, family);
        }
    });
});
