/**
 * The oracle association on two drawings it misread: Graphviz's curve and icurve arrows (arrows.c arrow_type_curve), a
 * stroked stem to the tip and a stroked arc across it, both open paths in the edge's own group, read as the line
 * carried on to the tip and a hollow half circle (half of one for an l or r arrow); and OGDF's drawSVG of a loop with
 * bends, a polyline from the node's center through the bends back to it, read as the node's loop.
 */
import { assert, describe, it } from "vitest";

import { associate } from "../fidelity/oracle/associate";
import type { PEdge, PNode, PScene } from "../fidelity/oracle/primitives";
import { readSvgPrimitives } from "../fidelity/oracle/svg-primitives";

const emptyGuide = (nodes: PNode[] = [], edges: PEdge[] = []): PScene => ({
    side: "graphty",
    width: 400,
    height: 200,
    background: null,
    nodes,
    edges,
    groups: [],
    texts: [],
    strays: [],
});

/** One Graphviz edge group with its two end nodes, at y = 100 from x = 100 to x = 176 (the tip at 169.54). */
const gvEdge = (cap: string): string => `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200">
    <g class="node"><title>a</title><ellipse fill="#c8c8c8" stroke="#505050" cx="100" cy="100" rx="6" ry="6"/></g>
    <g class="node"><title>b</title><ellipse fill="#c8c8c8" stroke="#505050" cx="176" cy="100" rx="6" ry="6"/></g>
    <g class="edge"><title>a&#45;&gt;b</title>
        <path fill="none" stroke="#505050" stroke-width="1.5" d="M106.48,100C118.03,100 142.54,100 159.14,100"/>
        <polyline fill="none" stroke="#505050" stroke-width="1.5" points="169.54,100 159.54,100"/>
        <path fill="none" stroke="#505050" stroke-width="1.5" d="${cap}"/>
    </g>
</svg>`;

describe("Graphviz's stroked curve arrows", () => {
    const read = (cap: string): PEdge => {
        const { scene } = associate(readSvgPrimitives(gvEdge(cap)).prims, 400, 200, emptyGuide());
        assert.equal(scene.edges.length, 1);
        return scene.edges[0];
    };

    it("reads curve's arc as a hollow half circle at the tip, the stem carrying the line to it", () => {
        const e = read("M164.54,105C171.2,105 171.2,95 164.54,95");
        assert.deepEqual(
            e.arrows.map((a) => [a.end, a.shape, a.filled]),
            [["target", "half-circle", false]],
        );
        assert.closeTo(e.arrows[0].width, 10, 0.5);
        assert.closeTo(e.points.at(-1)?.[0] ?? 0, 169.54, 0.5);
    });

    it("reads icurve's arc, at the stem's back, as one too", () => {
        const e = read("M164.54,105C157.87,105 157.87,95 164.54,95");
        assert.deepEqual(
            e.arrows.map((a) => [a.end, a.shape, a.filled]),
            [["target", "half-circle", false]],
        );
    });

    it("reads lcurve's and licurve's quarter arcs, on one side of the line, as half arrows", () => {
        for (const cap of [
            "M168.79,100C168.79,97.5 167.12,95 163.79,95",
            "M159.54,100C159.54,97.5 161.2,95 164.54,95",
        ]) {
            assert.deepEqual(
                read(cap).arrows.map((a) => [a.end, a.shape, a.filled]),
                [["target", "half", false]],
            );
        }
    });
});

describe("Graphviz's rounded orthogonal routes", () => {
    it("takes no arrowhead from a rounded corner joining the line, nor a stem from the route's next run", () => {
        // dot-specimen-edges-lines-p5 `radius`: three polylines, the corner arc joining the two straight runs
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300">
            <g class="node"><title>a</title><ellipse fill="#c8c8c8" stroke="#505050" cx="113" cy="163.67" rx="6" ry="6"/></g>
            <g class="node"><title>b</title><ellipse fill="#c8c8c8" stroke="#505050" cx="213" cy="213.67" rx="6" ry="6"/></g>
            <g class="edge"><title>a&#45;&gt;b</title>
                <polyline fill="none" stroke="#505050" stroke-width="1.5" points="115.5,169.44 115.5,182.66 115.5,206"/>
                <polyline fill="none" stroke="#505050" stroke-width="1.5" points="123.5,214 206.6,214"/>
                <polyline fill="none" stroke="#505050" stroke-width="1.5" points="123.5,214 121.42,213.74 119.49,212.94 117.84,211.66 116.56,210.01 115.76,208.07 115.5,206"/>
            </g>
        </svg>`;
        const { scene } = associate(readSvgPrimitives(svg).prims, 400, 300, emptyGuide());
        assert.deepEqual(
            scene.edges.map((e) => e.arrows.length),
            [0],
        );
    });
});

describe("OGDF's loop with bends", () => {
    it("reads a polyline from a node's center through its bends back to it as that node's loop", () => {
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200">
            <g><path fill="none" d=" M200,150 L180,115 M180,115 L220,115 M220,115 L200,150" stroke="#505050" stroke-width="1.5px" /></g>
            <g><ellipse cx="200" cy="150" rx="12" ry="12" fill="#C8C8C8" stroke-width="1px" stroke="#505050" /></g>
            <g><ellipse cx="60" cy="60" rx="12" ry="12" fill="#C8C8C8" stroke-width="1px" stroke="#505050" /></g>
            <g><ellipse cx="340" cy="60" rx="12" ry="12" fill="#C8C8C8" stroke-width="1px" stroke="#505050" /></g>
        </svg>`;
        const n = (id: string, cx: number, cy: number): PNode => ({
            id,
            cx,
            cy,
            w: 24,
            h: 24,
            shape: "ellipse",
            fill: { color: "#c8c8c8", opacity: 1, gradient: null },
            stroke: null,
            label: null,
        });
        const loop: PEdge = {
            id: "loop",
            source: "n",
            target: "n",
            points: [
                [193, 139],
                [180, 115],
                [220, 115],
                [207, 139],
            ],
            stroke: { color: "#505050", opacity: 1, width: 1.5, dash: null, dashClass: "solid" },
            arrows: [],
            label: null,
        };
        const guide = emptyGuide([n("n", 200, 150), n("p", 60, 60), n("q", 340, 60)], [loop]);
        const { scene } = associate(readSvgPrimitives(svg).prims, 400, 200, guide);
        assert.deepEqual(
            scene.edges.map((e) => [e.source, e.target]),
            [["n", "n"]],
        );
        assert.equal(scene.strays.length, 0);
    });
});
