/**
 * The oracle comparison's SVG reader (`test/fidelity/oracle/svg-primitives.ts`) on markup the
 * programs write: a label outline Cytoscape.js strokes as its own unfilled text before the filled
 * label is not a label of its own, so the label's color is the filled text's; a gradient's direction
 * on screen through its own transform and its element's; a stroke painted with a gradient; a dash
 * array under a round cap; a band drawn as a fill read subpath by subpath; yEd's and yEd Live's markup: what a `<use>`
 * draws, base64 broken by `&#10;`, a fill with nothing inside, a group's inner panel.
 */
import { assert, describe, it } from "vitest";

import { associate, mergeTexts, shapeOf } from "../fidelity/oracle/associate";
import { compareOracle } from "../fidelity/oracle/compare-oracle";
import type { Pixels } from "../fidelity/oracle/picture-gradient";
import type { PScene, PText } from "../fidelity/oracle/primitives";
import { embeddedPngs, readSvgPrimitives } from "../fidelity/oracle/svg-primitives";

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

    it("says how far under its font's line the browser's rounded box of a text stands", () => {
        // yed-graphml-specimen-labels two-labels: DejaVu Sans is 0.928 em up and 0.236 down, and at 10 px the browser
        // reads 8 up and 3 down
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100">
            <text x="50" y="50" font-family="DejaVu Sans" font-size="10px">Top</text>
        </svg>`;
        const t = readSvgPrimitives(svg).prims.flatMap((p) => (p.text ? [p.text] : []))[0];
        assert.closeTo((t.box.y0 + t.box.y1) / 2 - (t.lineDrop ?? 0), 50 - (9.28 - 2.36) / 2, 0.02);
    });

    it("reads the lines of a label drawn under a few pixels high where they stand, not where rounding left them", () => {
        // json-cyjs-winecheese 107: two lines centered at one x, 1.9 px on screen, read 0.4 px apart and so right-aligned
        const label = (anchor: string): string => `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400">
            <g transform="matrix(0.2146 0 0 0.2146 0 0)">
                <text x="900" y="900" text-anchor="${anchor}" font-family="Helvetica,sans-Serif" font-size="9px" font-weight="bold">L'Edel de</text>
                <text x="900" y="909" text-anchor="${anchor}" font-family="Helvetica,sans-Serif" font-size="9px" font-weight="bold">Cleron</text>
            </g></svg>`;
        const boxes = (anchor: string): { x0: number; x1: number }[] =>
            readSvgPrimitives(label(anchor)).prims.flatMap((p) => (p.text ? [p.text.box] : []));
        const [a, b] = boxes("middle");
        assert.closeTo((a.x0 + a.x1) / 2, (b.x0 + b.x1) / 2, 0.02);
        assert.isAbove(a.x1 - a.x0 - (b.x1 - b.x0), 1);
        // lines started at one x still read so
        const [c, d] = boxes("start");
        assert.closeTo(c.x0, d.x0, 0.02);
        assert.isAbove(Math.abs((c.x0 + c.x1) / 2 - (d.x0 + d.x1) / 2), 0.5);
    });

    describe("still fails a small label drawn wrong, with its lines read off the unrounded layout", () => {
        const K = 0.2146;
        /** The program's two lines, 1.9 px on screen, anchored at the middle of an 8 px node at (100, 100). */
        const program = (anchor: string): PText => {
            const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400">
                <g transform="matrix(${String(K)} 0 0 ${String(K)} 0 0)">
                    <text x="${String(100 / K)}" y="${String(99 / K)}" text-anchor="${anchor}" font-family="Helvetica,sans-Serif" font-size="9px" font-weight="bold">L'Edel de</text>
                    <text x="${String(100 / K)}" y="${String(101 / K)}" text-anchor="${anchor}" font-family="Helvetica,sans-Serif" font-size="9px" font-weight="bold">Cleron</text>
                </g></svg>`;
            const label = mergeTexts(readSvgPrimitives(svg).prims.flatMap((p) => (p.text ? [p.text] : [])));
            assert.isNotNull(label);
            return label;
        };
        const drawing = (side: PScene["side"], label: PText): PScene => ({
            side,
            width: 600,
            height: 400,
            background: "#ffffff",
            nodes: [
                [100, 100],
                [300, 100],
                [500, 100],
                [100, 300],
                [300, 300],
                [500, 300],
            ].map(([cx, cy], i) => ({
                id: "abcdef"[i],
                cx,
                cy,
                w: 8,
                h: 8,
                shape: "ellipse",
                fill: { color: "#cccccc", opacity: 1, gradient: null },
                stroke: null,
                label: i === 0 ? label : null,
            })),
            edges: [],
            groups: [],
            texts: [],
            strays: [],
        });
        const failing = (o: PText, g: PText): string[] =>
            Object.keys(compareOracle("t", drawing("oracle", o), drawing("graphty", g)).failures)
                .filter((p) => p.startsWith("label."))
                .sort();

        it("and passes one drawn right", () => {
            assert.deepEqual(failing(program("middle"), { ...program("middle"), align: "middle" }), []);
            assert.deepEqual(failing(program("start"), { ...program("start"), align: "start" }), []);
            assert.deepEqual(failing(program("end"), { ...program("end"), align: "end" }), []);
        });

        it("in the wrong alignment", () => {
            for (const [wanted, drawn] of [
                ["middle", "start"],
                ["middle", "end"],
                ["start", "middle"],
                ["end", "middle"],
                ["start", "end"],
            ] as const) {
                assert.include(failing(program(wanted), { ...program(wanted), align: drawn }), "label.align");
            }
        });

        it("on the wrong side of its node", () => {
            const o = program("middle");
            const moved = (b: PText["box"]): PText["box"] => ({ ...b, x0: b.x0 + 14, x1: b.x1 + 14 });
            const g = { ...o, align: "middle" as const, box: moved(o.box), lines: o.lines?.map(moved) };
            assert.includeMembers(failing(o, g), ["label.anchor", "label.offset"]);
        });

        it("at the wrong width", () => {
            const o = program("middle");
            const wider = (b: PText["box"]): PText["box"] => ({ ...b, x1: b.x1 + (b.x1 - b.x0) });
            const g = { ...o, align: "start" as const, box: wider(o.box), lines: o.lines?.map(wider) };
            assert.includeMembers(failing(o, g), ["label.align", "label.anchor", "label.offset"]);
        });
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

    it("reads a fill's linear gradient along the direction its color changes, not its stretched vector", () => {
        // yEd Live's corner-to-corner ramp (graphml-yfiles-html-stag-flowchart) on a 220 x 94 box: its vector runs
        // along 23.1 degrees on screen, its lines of one color are stretched with it, and its color changes along 66.9
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300">
            <defs>
                <linearGradient id="corner" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stop-color="#ff0000"/><stop offset="1" stop-color="#0000ff"/>
                </linearGradient>
                <linearGradient id="user" gradientUnits="userSpaceOnUse" x1="10" y1="150" x2="230" y2="244">
                    <stop offset="0" stop-color="#ff0000"/><stop offset="1" stop-color="#0000ff"/>
                </linearGradient>
            </defs>
            <rect x="10" y="10" width="220" height="94" fill="url(#corner)"/>
            <rect x="10" y="150" width="220" height="94" fill="url(#user)"/>
            <path d="M 10 280 L 230 290" stroke="url(#corner)" stroke-width="4" fill="none"/>
        </svg>`;
        const { prims } = readSvgPrimitives(svg);
        assert.closeTo(prims[0].fill?.gradient?.angle ?? Number.NaN, 66.87, 0.01);
        // in user space a vector is drawn as it is: its color changes along it
        assert.closeTo(prims[1].fill?.gradient?.angle ?? Number.NaN, 23.13, 0.01);
        // a stroke's is its vector on screen, which an edge's chord judges
        assert.closeTo(prims[2].stroke?.gradient?.angle ?? Number.NaN, 2.6, 0.01);
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

    it("reads what a <use> draws through its transform, once, and not its definition", () => {
        // yEd Live's arrowhead: one path in <defs>, pointing at 0, 0, turned and placed by each <use>
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="200" height="100">
            <g transform="translate(10 10)">
                <use transform="matrix(-1 0 0 -1 100 50)" xlink:href="#head"/>
            </g>
            <defs><path id="head" fill="rgb(80,80,80)" stroke="rgb(80,80,80)" d="M 8,-3 L 0,0 L 8,3 Z"/></defs>
        </svg>`;
        const { prims } = readSvgPrimitives(svg);
        assert.deepEqual(
            prims.map((p) => [p.kind, p.box, p.fill?.color]),
            [["shape", { x0: 102, y0: 57, x1: 110, y1: 63 }, "#505050"]],
        );
    });

    it("reads an open stroke a <use> stamps as a shape that encloses nothing, not a line", () => {
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100">
            <defs><path id="open" fill="none" stroke="rgb(80,80,80)" d="M 8,-3 L 0,0 L 8,3"/></defs>
            <use transform="translate(50 50)" href="#open"/>
        </svg>`;
        const [p] = readSvgPrimitives(svg).prims;
        assert.strictEqual(p.kind, "shape");
        assert.deepEqual(p.points, [
            [58, 47],
            [50, 50],
            [58, 53],
            [50, 50],
            [58, 47],
        ]);
    });

    it("reads a <use> of a <symbol> at its own size, a <use> of a <use>, and leaves one naming nothing out", () => {
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100">
            <defs>
                <symbol id="s" viewBox="0 0 10 10"><rect width="10" height="10" fill="rgb(1,2,3)"/></symbol>
                <rect id="r" width="4" height="4" fill="rgb(4,5,6)"/>
                <use id="u" href="#r" x="1" y="1"/>
            </defs>
            <use href="#s" x="20" y="30" width="40" height="40"/>
            <use href="#u" x="100" y="50"/>
            <use href="#none"/>
        </svg>`;
        assert.deepEqual(
            readSvgPrimitives(svg).prims.map((p) => [p.fill?.color, p.box]),
            [
                ["#010203", { x0: 20, y0: 30, x1: 60, y1: 70 }],
                ["#040506", { x0: 101, y0: 51, x1: 105, y1: 55 }],
            ],
        );
    });

    it("finds a picture written across lines with &#10; under the address the page reads back", () => {
        // yEd breaks its base64 every 76 characters with the entity
        const href = "data:image/png;base64,iVBOR&#10;w0KGgo=";
        const unbroken = "data:image/png;base64,iVBORw0KGgo=";
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><image width="20" height="20" href="${href}"/></svg>`;
        assert.deepEqual([...embeddedPngs(svg)], [unbroken]);
        const white: Pixels = { width: 1, height: 1, data: new Uint8ClampedArray([255, 255, 255, 255]) };
        const seen: string[] = [];
        const pictures = new Map([[unbroken, white]]);
        const get = pictures.get.bind(pictures);
        pictures.get = (key) => {
            seen.push(key);
            return get(key);
        };
        readSvgPrimitives(svg, pictures);
        assert.deepEqual(seen, [unbroken]);
    });

    it("drops a fill with nothing inside, and keeps the stroke after it next to its line", () => {
        // yEd's dash arrowhead: a line there and back, filled and then stroked; Z closes each subpath
        const bar = "M60 40 L60 49 Z";
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100">
            <path fill="none" stroke="black" d="M10 45 L60 45"/>
            <path fill="black" stroke="none" d="${bar}"/>
            <path fill="none" stroke="red" d="${bar}"/>
            <path fill="black" stroke="none" d="M80 40 L90 40 L90 50 Z"/>
        </svg>`;
        const { prims } = readSvgPrimitives(svg);
        assert.deepEqual(
            prims.map((p) => [p.index, p.stroke?.color ?? null, p.fill?.color ?? null]),
            [
                [0, "#000000", null],
                [1, "#ff0000", null],
                [2, null, "#000000"],
            ],
        );
    });

    it("reads a yFiles group's inner panel as part of its frame, and as the group where it has no frame", () => {
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100">
            <g class="y-group-node">
                <path class="yfiles-group-node-tab" fill="rgb(200,200,200)" d="M 0 0H 80V 60H 0z"/>
                <path class="yfiles-group-node-content" fill="rgb(255,255,255)" d="M 4 20H 76V 56H 4z"/>
                <path class="yfiles-group-node-stroke" fill="none" stroke="rgb(80,80,80)" d="M 0 0H 80V 60H 0z"/>
            </g>
            <g class="y-group-node">
                <path class="yfiles-group-node-content" fill="rgb(255,255,255)" d="M 104 20H 176V 56H 104z"/>
            </g>
        </svg>`;
        assert.deepEqual(
            readSvgPrimitives(svg).prims.map((p) => [p.fill?.color, p.panel?.color, p.box.x0, p.box.x1]),
            [
                ["#c8c8c8", "#ffffff", 0, 80],
                [undefined, "#ffffff", 0, 80],
                ["#ffffff", undefined, 104, 176],
            ],
        );
    });

    it("reads an SVG embedded in the drawing as one picture, not as the shapes inside it", () => {
        // yEd's SVGNode (yed-graphml-specimen-images-charts): the node's own SVG, scaled into the node's 36 px box
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100">
            <g transform="matrix(0.9,0,0,0.9,62,14)">
                <svg viewBox="0 0 40 40" width="40" height="40">
                    <rect fill="#dc2828" x="0" width="20" y="0" height="20"/>
                    <rect fill="#f0c800" x="20" width="20" y="20" height="20"/>
                </svg>
            </g>
        </svg>`;
        assert.deepEqual(
            readSvgPrimitives(svg).prims.map((p) => [p.kind, p.box.x0, p.box.y0, p.box.x1, p.box.y1]),
            [["image", 62, 14, 98, 50]],
        );
    });
});
