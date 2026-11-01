/**
 * The oracle comparison's SVG reader (`test/fidelity/oracle/svg-primitives.ts`) on markup the
 * programs write: a label outline Cytoscape.js strokes as its own unfilled text before the filled
 * label is not a label of its own, so the label's color is the filled text's; a gradient's direction
 * on screen through its own transform and its element's; a stroke painted with a gradient; a dash
 * array under a round cap; a band drawn as a fill read subpath by subpath.
 */
import { assert, describe, it } from "vitest";

import { associate, shapeOf } from "../fidelity/oracle/associate";
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

    it("reads a label drawn under a pixel high with its font's line box, not one rounded to whole pixels", () => {
        // dot-real-depcruise: Graphviz's 9 pt labels in a drawing scaled to 0.0885, about 0.8 px on screen, whose box
        // the browser rounded to 1.88 em tall and wholly above the baseline
        const label = (k: number): string => `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100">
            <g transform="scale(${String(k)})">
                <text x="${String(100 / k)}" y="${String(50 / k)}" text-anchor="middle" font-family="Helvetica,sans-Serif" font-size="9.00">graph-format.js</text>
            </g>
        </svg>`;
        const read = (k: number): { height: number; middle: number } => {
            const t = readSvgPrimitives(label(k)).prims.flatMap((p) => (p.text ? [p.text] : []))[0];
            // in em, the middle measured from the baseline (y down)
            return { height: (t.box.y1 - t.box.y0) / t.sizePx, middle: ((t.box.y0 + t.box.y1) / 2 - 50) / t.sizePx };
        };
        const large = read(4);
        const small = read(0.0885);
        assert.closeTo(small.height, large.height, 0.1);
        assert.closeTo(small.middle, large.middle, 0.1);
    });

    it("reads the open outline vis-network writes over a filled shape as that shape's outline", () => {
        // vis-network's database cylinder: its fill, then its outline as an open stroke-only path of the same geometry
        const d =
            "M 60 30 C 60 33 50 35 40 35 C 30 35 20 33 20 30 C 20 27 30 25 40 25 C 50 25 60 27 60 30 " +
            "L 60 60 C 60 63 50 65 40 65 C 30 65 20 63 20 60 L 20 30";
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100">
            <path fill="rgb(200,200,200)" stroke="none" d="${d}" />
            <path fill="none" stroke="rgb(80,80,80)" d="${d}" />
        </svg>`;
        const [fill, outline] = readSvgPrimitives(svg).prims;
        assert.strictEqual(outline.stroke?.color, "#505050");
        assert.isTrue(outline.closed);
        assert.strictEqual(outline.kind, "shape");
        assert.isTrue(fill.closed);
        // and the node it draws has that outline
        const node = (id: string, cx: number, cy: number): PScene["nodes"][number] => ({
            id,
            cx,
            cy,
            w: 40,
            h: 40,
            shape: "ellipse",
            fill: { color: "#c8c8c8", opacity: 1, gradient: null },
            stroke: null,
            label: null,
        });
        const guide: PScene = {
            side: "graphty",
            width: 200,
            height: 100,
            background: null,
            nodes: [node("db", 40, 45), node("far", 150, 50)],
            edges: [],
            groups: [],
            texts: [],
            strays: [],
        };
        const withFar = svg.replace("</svg>", '<circle cx="150" cy="50" r="20" fill="rgb(200,200,200)" /></svg>');
        const { scene } = associate(readSvgPrimitives(withFar).prims, 200, 100, guide);
        assert.strictEqual(scene.nodes.find((n) => n.id === "db")?.stroke?.color, "#505050");
        // an open stroke of another geometry stays a line
        const line = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100">
            <path fill="rgb(200,200,200)" stroke="none" d="${d}" />
            <path fill="none" stroke="rgb(80,80,80)" d="M 100 30 L 180 60" />
        </svg>`;
        assert.isFalse(readSvgPrimitives(line).prims[1].closed);
    });

    it("reads no shape for a rect of no width or no height, which SVG does not draw", () => {
        // OGDF's GraphIO::drawSVG writes its root cluster as a stroked rect at 0, 0 of no size
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100">
            <rect x="0" y="0" width="0" height="0" fill="none" stroke="#808080" stroke-width="1px" />
            <rect x="10" y="10" width="40" height="0" fill="#ff0000" stroke="#808080" />
            <rect x="60" y="10" width="40" height="30" fill="#f5f5f5" stroke="#000000" />
        </svg>`;
        assert.deepEqual(
            readSvgPrimitives(svg).prims.map((p) => p.fill?.color),
            ["#f5f5f5"],
        );
    });

    it("reads no shape for a polygon of unparsable points, or a stroked one of no extent with butt caps", () => {
        // Graphviz writes a filled shape=plain with no label as points="-nan,nan ...", and an arrowsize=0 head as a
        // stroked polygon of four equal points: neither paints anything
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100">
            <polygon fill="#c8c8c8" stroke="none" points="-nan,nan -nan,nan -nan,nan -nan,nan -nan,nan" />
            <polygon fill="#505050" stroke="#505050" stroke-width="1.5" points="50,50 50,50 50,50 50,50" />
            <polygon fill="#00ff00" stroke="#00ff00" stroke-width="4" stroke-linecap="round" points="80,50 80,50 80,50" />
            <rect x="60" y="10" width="40" height="30" fill="#f5f5f5" stroke="#000000" />
        </svg>`;
        assert.deepEqual(
            readSvgPrimitives(svg).prims.map((p) => p.stroke?.color ?? p.fill?.color),
            ["#00ff00", "#000000"],
        );
    });

    it("classes a polygon with rounded corners as its polygon, a rounded rectangle as one", () => {
        // Graphviz's hexagon and box with style=rounded: straight cubic sides between corner curves
        const hexagon =
            "M1064.98,-144.87C1064.98,-144.87 1061.35,-152.13 1061.35,-152.13 1060.01,-154.82 1055.67,-157.5 1052.67,-157.5 " +
            "1052.67,-157.5 1046.67,-157.5 1046.67,-157.5 1043.67,-157.5 1039.32,-154.82 1037.98,-152.13 1037.98,-152.13 " +
            "1034.35,-144.87 1034.35,-144.87 1033.01,-142.18 1033.01,-136.82 1034.35,-134.13 1034.35,-134.13 1037.98,-126.87 " +
            "1037.98,-126.87 1039.32,-124.18 1043.67,-121.5 1046.67,-121.5 1046.67,-121.5 1052.67,-121.5 1052.67,-121.5 " +
            "1055.67,-121.5 1060.01,-124.18 1061.35,-126.87 1061.35,-126.87 1064.98,-134.13 1064.98,-134.13 1066.32,-136.82 " +
            "1066.32,-142.18 1064.98,-144.87";
        const box =
            "M30,-10C30,-10 70,-10 70,-10 75,-10 80,-15 80,-20 80,-20 80,-40 80,-40 80,-45 75,-50 70,-50 70,-50 30,-50 30,-50 " +
            "25,-50 20,-45 20,-40 20,-40 20,-20 20,-20 20,-15 25,-10 30,-10";
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="200">
            <g transform="translate(0 200)"><path fill="#c8c8c8" stroke="#505050" d="${hexagon}" />
            <path fill="#c8c8c8" stroke="#505050" d="${box}" /></g>
        </svg>`;
        assert.deepEqual(
            readSvgPrimitives(svg).prims.map((p) => shapeOf(p)),
            ["hexagon", "roundrect"],
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

    it("gives each filled label its outline when every outline is written before every label, as Gephi does", () => {
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100">
            <text fill="none" stroke="#ff8000" stroke-width="2" font-size="10px" x="50" y="50">A</text>
            <text fill="none" stroke="#00ff00" stroke-width="2" font-size="10px" x="150" y="50">B</text>
            <text fill="#000000" font-size="10px" x="50" y="50">A</text>
            <text fill="#000000" font-size="10px" x="150" y="50">B</text>
        </svg>`;
        const texts = readSvgPrimitives(svg).prims.flatMap((p) => (p.text ? [p.text] : []));
        assert.deepEqual(
            texts.map((t) => [t.content, t.outline?.color]),
            [
                ["A", "#ff8000"],
                ["B", "#00ff00"],
            ],
        );
    });

    it("reads a filled shape of no area as nothing, as Gephi's arrowhead of arrow.size 0 paints nothing", () => {
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100">
            <polyline fill="#c8c8c8" points="130.7,-61.3 130.7,-61.3 130.7,-61.3" transform="translate(0,100)"/>
            <polyline fill="#c8c8c8" points="10,10 20,15 10,20"/>
        </svg>`;
        assert.lengthOf(readSvgPrimitives(svg).prims, 1);
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

    it("reads Gephi's self-loop, its parallel edges of two kinds and its edge labels as Gephi drew them", () => {
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
            <g id="node-labels">
                <text font-size="10" x="100" y="100" fill="#000000" class="id_a">A</text>
                <text font-size="10" x="150" y="60" fill="none" stroke="#ff8000" class="id_e1">ab</text>
            </g>
            <g id="edge-labels">
                <text font-size="10" x="150" y="60" fill="#000000" class="id_e1">ab</text>
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
        // an edge label names its edge's id (e1): it is no node, and is left to be matched to its edge by place
        assert.deepEqual(scene.nodes.map((n) => n.id).sort(), ["a", "b", "s"]);
        assert.strictEqual(scene.nodes.find((n) => n.id === "a")?.label?.content, "A");
        assert.deepEqual(
            scene.edges.map((e) => [e.id, e.arrows.length]),
            [
                ["a->b#0", 1],
                ["a->b#1", 1],
                ["s->s#0", 0],
            ],
        );
    });

    it("reads a family CSS rejects (Java's Default, a dotted Java name) as the name the program wrote", () => {
        // Cytoscape desktop's SVG export writes the Java font a label asked for; `Default` is a CSS-wide keyword
        // and `Dialog.bold` no CSS name, so the browser's computed style falls back to its own default face
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100">
            <text font-family="Default" font-size="10" x="10" y="20">a</text>
            <text font-family="Dialog.bold" font-size="10" x="10" y="40">b</text>
            <text font-family="DejaVu Sans" font-size="10" x="10" y="60">c</text>
        </svg>`;
        const texts = readSvgPrimitives(svg).prims.flatMap((p) => (p.text ? [p.text] : []));
        assert.deepEqual(
            texts.map((t) => [t.content, t.family]),
            [
                ["a", "Default"],
                ["b", "Dialog.bold"],
                ["c", "DejaVu Sans"],
            ],
        );
    });

    it("reads only the branch of a switch the browser draws, keeping a fallback beside an HTML label", () => {
        // draw.io ends every export with a switch whose drawn branch is an empty group and whose fallback, the warning
        // "Text is not SVG - cannot display", is never on the canvas; a label is a switch of a foreignObject (drawn,
        // HTML this reader cannot read) and a text standing for it
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100">
            <switch>
                <foreignObject x="10" y="10" width="80" height="20"><div xmlns="http://www.w3.org/1999/xhtml">Label</div></foreignObject>
                <text x="50" y="25" font-size="12">Label</text>
            </switch>
            <switch>
                <g requiredFeatures="http://www.w3.org/TR/SVG11/feature#Extensibility"/>
                <a transform="translate(0,-5)" href="https://www.drawio.com/doc/faq/svg-export-text-problems"><text x="50%" y="100%" font-size="10" text-anchor="middle">Text is not SVG - cannot display</text></a>
            </switch>
        </svg>`;
        const texts = readSvgPrimitives(svg).prims.flatMap((p) => (p.text ? [p.text.content] : []));
        assert.deepEqual(texts, ["Label"]);
    });
});
