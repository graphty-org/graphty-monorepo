/**
 * How the comparison reads Pajek 6.02's SVG markup: which line a line label belongs to, and the names a specimen
 * sheet's lines take from their end vertices' settings.
 */

import { assert, describe, it } from "vitest";

import { associate } from "../fidelity/oracle/associate";
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

    it("gives an arrowhead that covers its whole line to the end its line runs to, and routes the line to its tip", () => {
        // `pajek-synth-lines`: Pajek runs an arc from its source to its arrowhead's back, so under a 30 long head
        // (`s 5`) a short arc is a stub from the source's center back to the head's back, behind the source; and
        // with `h1 -1 h2 -1` (14 -> 15) a stub from the source's outline back to the head's back
        const svg = `<svg viewBox="0 0 500 500" xmlns="http://www.w3.org/2000/svg">
<g id="PajekNet">
<!-- Arc:    25   26 -->
<g transform="translate(77.96 129.07)">
<g transform="rotate(310.29)">
<path d="M 0 0 L -5.00 12.50 L 25.00 0 L -5.00 -12.50 z" style="fill:rgb(255,0,0)"/>
</g></g>
<line x1="80.10" y1="126.55" x2="77.96" y2="129.07" style="stroke-width:1.00;stroke:rgb(255,0,0)"/>
<!-- Arc:    14   15 -->
<g transform="translate(148.87 433.71)">
<g transform="rotate(212.20)">
<path d="M 0 0 L -3.00 7.50 L 15.00 0 L -3.00 -7.50 z" style="fill:rgb(255,0,128)"/>
</g></g>
<line x1="146.08" y1="431.95" x2="148.87" y2="433.71" style="stroke-dasharray:5;stroke-width:1.00;stroke:rgb(255,0,128)"/>
<!-- Vertex:    14 -->
<ellipse cx="154.65" cy="437.10" rx="10.00" ry="10.00" style="fill:rgb(255,255,255);stroke:rgb(0,0,0);stroke-width:0.50;"/>
<!-- Vertex:    15 -->
<ellipse cx="126.55" cy="419.90" rx="10.00" ry="10.00" style="fill:rgb(255,255,255);stroke:rgb(0,0,0);stroke-width:0.50;"/>
<!-- Vertex:    25 -->
<ellipse cx="80.10" cy="126.55" rx="10.00" ry="10.00" style="fill:rgb(255,255,255);stroke:rgb(0,0,0);stroke-width:0.50;"/>
<!-- Vertex:    26 -->
<ellipse cx="101.50" cy="101.50" rx="10.00" ry="10.00" style="fill:rgb(255,255,255);stroke:rgb(0,0,0);stroke-width:0.50;"/>
</g>
</svg>`;
        const guide: PScene = {
            side: "graphty",
            width: 500,
            height: 500,
            background: null,
            nodes: [],
            edges: [],
            groups: [],
            texts: [],
            strays: [],
        };
        const { scene } = associate(readSvgPrimitives(svg).prims, 500, 500, guide);
        const at = (id: string): PScene["edges"][number] => {
            const e = scene.edges.find((x) => x.id === id);
            assert.isDefined(e, id);
            return e;
        };
        for (const [id, tip] of [
            ["25->26#0", [94.13, 110.0]],
            ["14->15#0", [136.18, 425.72]],
        ] as const) {
            const e = at(id);
            assert.deepEqual(
                e.arrows.map((a) => [a.end, a.shape]),
                [["target", "triangle"]],
                id,
            );
            // the route runs on to the tip, toward the target
            const end = e.points.at(-1) ?? [0, 0];
            assert.closeTo(end[0], tip[0], 0.05, id);
            assert.closeTo(end[1], tip[1], 0.05, id);
        }
    });
});
