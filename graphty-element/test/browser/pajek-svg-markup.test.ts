/**
 * How the comparison reads Pajek 6.02's SVG markup: which line a line label belongs to, and the names a specimen
 * sheet's lines take from their end vertices' settings.
 */

import { assert, describe, it } from "vitest";

import { namedCaptions } from "../fidelity/oracle/compare-oracle";
import type { PScene } from "../fidelity/oracle/primitives";
import { readSvgPrimitives } from "../fidelity/oracle/svg-primitives";

/** Pajek's markup for two lines and a vertex, as `pajek-specimen-edge-labels.svg` writes it. */
const SVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg viewBox="0 0 400 200" xmlns="http://www.w3.org/2000/svg">
<g id="PajekNet">
<!-- Edge:     1    2 -->
<line x1="10.00" y1="50.00" x2="90.00" y2="50.00" style="stroke-width:2.00;stroke:rgb(0,112,145)"/>
<g transform="translate(150.00 50.00)">
<g transform="rotate(0.00)">
<text x="0" y="0" style="font-family:Helvetica;font-size:10.00px;fill:rgb(0,0,0);text-anchor:middle;">Ab</text>
</g></g>
<!-- Edge:     3    4 -->
<line x1="110.00" y1="50.00" x2="190.00" y2="50.00" style="stroke-width:2.00;stroke:rgb(0,112,145)"/>
<!-- Vertex:     1 -->
<ellipse cx="10.00" cy="50.00" rx="6.00" ry="6.00" style="fill:rgb(200,200,200);stroke:rgb(80,80,80);stroke-width:1.00;"/>
<g transform="translate(10.00 50.00)">
<g transform="rotate(-30.00)">
<text x="0.00" y="3.33" style="font-family:Helvetica;font-size:10px;fill:rgb(0,0,0);text-anchor:middle;">V</text>
</g></g>
</g>
</svg>`;

describe("Pajek's SVG markup", () => {
    it("gives a line's label, written before its line's comment, to that line, and a vertex's turned label to it", () => {
        const texts = readSvgPrimitives(SVG).prims.filter((p) => p.kind === "text");
        const owner = (words: string): string | undefined => texts.find((p) => p.text?.content === words)?.hint?.id;
        // the label after the line `1 2` is drawn at the middle of `3 4`: the next comment's line
        assert.strictEqual(owner("Ab"), "3->4");
        assert.strictEqual(owner("V"), "1");
    });

    it("names a line by the settings of its end vertices on a sheet whose vertices are numbers", () => {
        const scene = {
            nodes: [],
            edges: [{ id: "1->2#0", source: "1", target: "2" }],
            texts: [],
        } as unknown as PScene;
        const named = namedCaptions(
            scene,
            new Map([
                ["1", "lp-0-2-s"],
                ["2", "lp-0-2-t"],
            ]),
        );
        assert.strictEqual(named.edges[0].id, "lp-0-2-s->lp-0-2-t#0");
        assert.strictEqual(named.edges[0].source, "lp-0-2-s");
    });
});
