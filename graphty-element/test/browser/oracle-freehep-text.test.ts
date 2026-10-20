/**
 * The oracle comparison's SVG reader on Cytoscape desktop's SVG (FreeHEP): a text it names Helvetica, Times or by a
 * Java logical font was laid out by Java in DejaVu, so its box is measured in that face, not the stand-in's.
 */
import { assert, describe, it } from "vitest";

import { readSvgPrimitives } from "../fidelity/oracle/svg-primitives";

const FREEHEP = "Creator: Cytoscape via FreeHEP Graphics2D Driver";

/**
 * The width of the one text in an SVG.
 * @param desc - the SVG's `<desc>`
 * @param attrs - the text's font attributes
 * @returns its measured width
 */
function width(desc: string, attrs: string): number {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="100"><desc>${desc}</desc>
        <text font-size="14" ${attrs} x="10" y="50">Multidrug resistance</text></svg>`;
    const t = readSvgPrimitives(svg).prims.flatMap((p) => (p.text ? [p.text] : []))[0];
    return t.box.x1 - t.box.x0;
}

describe("the oracle SVG reader on FreeHEP text", () => {
    it("measures a Helvetica text of Cytoscape desktop in DejaVu Sans, the face Java drew", () => {
        assert.closeTo(width(FREEHEP, 'font-family="Helvetica"'), width("", 'font-family="DejaVu Sans"'), 0.5);
        // the same markup from any other program keeps its own family's metrics
        assert.isBelow(width("", 'font-family="Helvetica"'), width("", 'font-family="DejaVu Sans"') - 5);
    });

    it("measures CX2's generic Sans-serif, which Java has no font of, in Dialog's DejaVu Sans", () => {
        // cx2-u2os-hierarchy: Cytoscape writes CX2's `sans-serif` as `Sans-serif` and laid it out in DejaVu Sans
        assert.closeTo(width(FREEHEP, 'font-family="Sans-serif"'), width("", 'font-family="DejaVu Sans"'), 0.5);
    });

    it("measures a Times text of Cytoscape desktop in DejaVu Serif", () => {
        assert.closeTo(width(FREEHEP, 'font-family="Times"'), width("", 'font-family="DejaVu Serif"'), 0.5);
    });

    it("measures a styled Java logical font in its DejaVu face with that style", () => {
        const boldItalic = width("", 'font-family="DejaVu Sans" font-weight="bold" font-style="italic"');
        assert.closeTo(width(FREEHEP, 'font-family="Dialog.bolditalic" font-weight="normal"'), boldItalic, 0.5);
        assert.isAbove(boldItalic - width("", 'font-family="DejaVu Sans"'), 1);
    });
});
