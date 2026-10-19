/**
 * The oracle comparison's SVG reader (`test/fidelity/oracle/svg-primitives.ts`) on markup the
 * programs write: a label outline Cytoscape.js strokes as its own unfilled text before the filled
 * label is not a label of its own, so the label's color is the filled text's; a gradient's direction
 * on screen through its own transform and its element's; a stroke painted with a gradient; a dash
 * array under a round cap; a band drawn as a fill read subpath by subpath.
 */
import { assert, describe, it } from "vitest";

import { associate } from "../fidelity/oracle/associate";
import type { PScene } from "../fidelity/oracle/primitives";
import { readSvgPrimitives } from "../fidelity/oracle/svg-primitives";

describe("the oracle SVG reader", () => {
    it("reads an outlined label as its filled text, not its unfilled outline", () => {
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100">
            <text fill="none" stroke="rgb(136,136,136)" stroke-width="4" font-size="10px" x="50" y="50">MED6</text>
            <text fill="rgb(255,255,255)" stroke="none" font-size="10px" x="50" y="50">MED6</text>
        </svg>`;
        const texts = readSvgPrimitives(svg).prims.flatMap((p) => (p.text ? [p.text] : []));
        assert.deepEqual(
            texts.map((t) => [t.content, t.color]),
            [["MED6", "#ffffff"]],
        );
    });

    it("gives the filled label the outline its unfilled twin strokes, half the stroke outside the letters", () => {
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100">
            <text fill="none" stroke="rgb(255,0,0)" stroke-opacity="0.5" stroke-width="4" font-size="10px" x="50" y="50">MED6</text>
            <text fill="rgb(255,255,255)" stroke="none" font-size="10px" x="50" y="50">MED6</text>
            <text fill="rgb(0,0,0)" stroke="rgb(0,0,255)" stroke-width="2" font-size="10px" x="50" y="80">ACT1</text>
            <text fill="rgb(0,0,0)" font-size="10px" x="150" y="50">bare</text>
        </svg>`;
        const texts = readSvgPrimitives(svg).prims.flatMap((p) => (p.text ? [p.text] : []));
        assert.deepEqual(
            texts.map((t) => [t.content, t.outline]),
            [
                ["MED6", { color: "#ff0000", opacity: 0.5, width: 2 }],
                ["ACT1", { color: "#0000ff", opacity: 1, width: 1 }],
                ["bare", null],
            ],
        );
    });

    it("reads each positioned tspan line's own box, which a label's alignment is read off", () => {
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100">
            <text font-size="10px"><tspan x="20" y="20">a long line</tspan><tspan x="20" y="32">short</tspan></text>
        </svg>`;
        const [t] = readSvgPrimitives(svg).prims.flatMap((p) => (p.text ? [p.text] : []));
        const lines = t.lines ?? [];
        assert.lengthOf(lines, 2);
        assert.closeTo(lines[0].x0, lines[1].x0, 0.5);
        assert.isAbove(lines[0].x1 - lines[1].x1, 10);
    });

    it("reads a linear gradient's screen direction through its units, its transform and its element's", () => {
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100">
            <defs>
                <linearGradient id="down" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stop-color="#ff0000"/><stop offset="1" stop-color="#0000ff"/>
                </linearGradient>
                <linearGradient id="user" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="10" y2="0"
                    gradientTransform="rotate(45)">
                    <stop offset="0" stop-color="#00ffff"/><stop offset="1" stop-color="#ff00ff"/>
                </linearGradient>
            </defs>
            <rect x="10" y="10" width="40" height="40" fill="url(#down)"/>
            <g transform="rotate(90 100 50)"><rect x="80" y="30" width="40" height="40" fill="url(#down)"/></g>
            <path d="M 120 50 L 190 50" stroke="url(#user)" stroke-width="4" fill="none"/>
        </svg>`;
        const { prims } = readSvgPrimitives(svg);
        assert.closeTo(prims[0].fill?.gradient?.angle ?? Number.NaN, 90, 0.01);
        assert.deepEqual(
            prims[0].fill?.gradient?.stops.map((s) => s.color),
            ["#ff0000", "#0000ff"],
        );
        // turned a quarter round on screen: down becomes left
        assert.closeTo(Math.abs(prims[1].fill?.gradient?.angle ?? Number.NaN), 180, 0.01);
        assert.strictEqual(prims[2].stroke?.color, "#00ffff");
        assert.closeTo(prims[2].stroke?.gradient?.angle ?? Number.NaN, 45, 0.01);
    });

    it("reads a dash array under a round cap, and samples an open path densely enough for its route", () => {
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100">
            <path d="M 10 10 L 190 10" stroke="#000" stroke-width="2" stroke-dasharray="0 6" stroke-linecap="round" fill="none"/>
            <path d="M 10 50 Q 100 90 190 50" stroke="#000" stroke-width="2" fill="none"/>
        </svg>`;
        const { prims } = readSvgPrimitives(svg);
        assert.strictEqual(prims[0].stroke?.dashClass, "dotted");
        assert.strictEqual(prims[1].points.length, 128);
    });

    it("keeps a filled path's subpaths, a moveto alone dropped, for a pattern drawn as a fill", () => {
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100">
            <path d="M 10 10 L 16 10 L 16 12 L 10 12 Z M 20 10 L 26 10 L 26 12 L 20 12 Z M 40 40" fill="#000"/>
        </svg>`;
        const [band] = readSvgPrimitives(svg).prims;
        assert.strictEqual(band.subpaths?.length, 2);
        assert.isAbove(band.subpaths?.[0].length ?? 0, 15);
    });

    it("reads Gephi's self-loop and its parallel edges of two kinds as edges of their own", () => {
        // as Gephi Toolkit 0.11.3 writes them (gexf-specimen-edges-lines): an edge names its two end nodes in its
        // class, a self-loop its one node, and two edges of different kinds between one pair share one name
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200">
            <g id="edges">
                <path fill="none" class="id_s" d="M 54,47 A 2.6,2.6 0 1,1 57,50" stroke="#c8c8c8" stroke-width="2"/>
                <path fill="none" class="id_a id_b" d="M 100,100 A 60,60 0,0 1,200,100" stroke="#c8c8c8" stroke-width="1.5"/>
                <path fill="none" class="id_a id_b" d="M 100,100 A 60,60 0,0 1,200,100" stroke="#c8c8c8" stroke-width="1.5"/>
            </g>
            <g id="arrows">
                <polyline fill="#000000" class="id_a id_b" points="200,100 190,96 190,104" stroke="none"/>
                <polyline fill="#000000" class="id_a id_b" points="200,100 190,96 190,104" stroke="none"/>
            </g>
            <g id="nodes">
                <circle class="id_s" cx="50" cy="50" r="5" fill="#646464"/>
                <circle class="id_a" cx="100" cy="100" r="5" fill="#646464"/>
                <circle class="id_b" cx="200" cy="100" r="5" fill="#646464"/>
            </g>
        </svg>`;
        const guide: PScene = {
            side: "graphty",
            width: 400,
            height: 200,
            background: null,
            nodes: [],
            edges: [],
            groups: [],
            texts: [],
            strays: [],
        };
        const { scene } = associate(readSvgPrimitives(svg).prims, 400, 200, guide);
        assert.deepEqual(scene.nodes.map((n) => n.id).sort(), ["a", "b", "s"]);
        assert.deepEqual(
            scene.edges.map((e) => [e.id, e.arrows.length]),
            [
                ["a->b#0", 1],
                ["a->b#1", 1],
                ["s->s#0", 0],
            ],
        );
    });
});
