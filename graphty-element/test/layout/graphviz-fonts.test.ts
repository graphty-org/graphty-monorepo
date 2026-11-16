/**
 * @file Graphviz sizes each label in the face the element draws it in (issue #5116): a `fontname` is handed over as
 * the Graphviz family whose widths match the drawn face, so a Verdana file drawn in a Times-like fallback is laid out
 * at the width it is drawn, not at Verdana's.
 */

import { graphvizFont } from "@graphty/graph-io/dot";
import { assert, describe, it } from "vitest";

import {
    FONT_PROBE,
    GRAPHVIZ_FAMILIES,
    graphvizFamilyFor,
    type MeasureText,
    withDrawnFonts,
} from "../../src/layout/graphviz/fonts";
import { layout } from "../../src/layout/graphviz/loader";
import type { DotStructure } from "../../src/layout/graphviz/toDot";

/**
 * The pixel size a CSS font names.
 * @param css - the CSS font (`normal normal 14px Verdana`)
 * @returns its size in pixels
 */
const pxOf = (css: string): number => Number(/([\d.]+)px/.exec(css)?.[1]);

/**
 * A face's width of a text: the probe at the face's table width per pixel, a run of narrow or wide letters as a
 * proportional face (or, monospaced, every letter alike) draws them.
 * @param perPx - the face's width of the probe per pixel of font size
 * @param css - the CSS font
 * @param text - the text measured
 * @param monospaced - whether the face draws every letter the same width
 * @returns the width in pixels
 */
function faceWidth(perPx: number, css: string, text: string, monospaced = false): number {
    if (text === FONT_PROBE) {
        return perPx * pxOf(css);
    }
    const proportional = text.startsWith("i") ? 0.28 : 0.83;
    const letter = monospaced ? 0.6 : proportional;
    return letter * text.length * pxOf(css);
}

/** A browser with only a Times-like face (Liberation Serif): every family list draws at Times' widths. */
const timesOnly: MeasureText = (css, text) => faceWidth(35.3563, css, text);

/**
 * A browser that has the named family and draws it at that Graphviz table's widths, and any other in Times.
 * @param family - the installed family, as Graphviz names its table
 * @returns the measurer
 */
function installed(family: string): MeasureText {
    const width = GRAPHVIZ_FAMILIES.find(([name]) => name === family)?.[1] ?? 0;
    return (css, text) => (css.includes(family) ? faceWidth(width, css, text) : timesOnly(css, text));
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
        const handed = withDrawnFonts(structure, graphvizFont, (css, text) => faceWidth(41.611, css, text));
        assert.strictEqual(handed.edges?.[2].attributes?.fontname, "DejaVu Sans");
    });

    it("measures the drawn face at the size labels are drawn, where optical sizing does not narrow it", () => {
        // an optically sized face: 40 per point at 14 px, 36.7 at 100 px (Trebuchet MS's table)
        const opticallySized: MeasureText = (css, text) => faceWidth(pxOf(css) >= 32 ? 36.71 : 40, css, text);
        const handed = withDrawnFonts(structure, graphvizFont, opticallySized);
        assert.strictEqual(handed.nodeAttributes?.get(0)?.fontname, "DejaVu Sans");
    });

    it("sizes a proportional face by a proportional table, a monospaced by a monospaced", () => {
        // 40.6 per point is nearest Consolas' table, but a proportional face is never sized monospaced
        const proportional: MeasureText = (css, text) => faceWidth(40.6, css, text);
        assert.strictEqual(
            graphvizFamilyFor({ family: "Inter", bold: false, italic: false }, proportional),
            "DejaVu Sans",
        );
        const monospaced: MeasureText = (css, text) => faceWidth(40.6, css, text, true);
        assert.strictEqual(graphvizFamilyFor({ family: "Mono", bold: false, italic: false }, monospaced), "Consolas");
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
