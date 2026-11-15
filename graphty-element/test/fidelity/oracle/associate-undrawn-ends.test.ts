/**
 * An edge that ends at a node graphty draws nothing for (a WikiPathways anchor: a 2 px node of no opacity on another
 * edge's line, which Cytoscape desktop draws nothing for either) is still found in the oracle: its line ends where
 * graphty's line ends, carried into the oracle's frame. Left with no node at that end, the line was paired with no
 * edge (cx2-wp1449-tlr: 32 of graphty's edges left extra, xgmml-wp4271-cy3-export: 7).
 */
import { assert, describe, it } from "vitest";

import { associate } from "./associate";
import { boxOfPoints, type PEdge, type PNode, type Prim, type PScene, type Pt } from "./primitives";

const disc = (cx: number, cy: number, r: number): Pt[] =>
    Array.from({ length: 32 }, (_, i): Pt => [
        cx + r * Math.cos((i * Math.PI) / 16),
        cy + r * Math.sin((i * Math.PI) / 16),
    ]);
const node = (id: string, cx: number, cy: number): PNode => ({
    id,
    cx,
    cy,
    w: 40,
    h: 40,
    shape: "ellipse",
    fill: { color: "#cccccc", opacity: 1, gradient: null },
    stroke: null,
    label: null,
});

describe("edge ends at nodes graphty draws nothing for", () => {
    it("finds a line ending at an anchor graphty draws nothing for, where graphty's line ends", () => {
        let index = 0;
        const prim = (over: Partial<Prim> & { points: Pt[] }): Prim => ({
            index: index++,
            tag: "path",
            kind: "shape",
            box: boxOfPoints(over.points),
            closed: true,
            corners: 0,
            fill: { color: "#cccccc", opacity: 1, gradient: null },
            stroke: null,
            text: null,
            markers: { start: false, end: false },
            hint: null,
            ...over,
        });
        const grid: [string, number, number][] = [
            ["a", 100, 100],
            ["c", 500, 100],
            ["d", 100, 300],
            ["f", 500, 300],
        ];
        const line = (points: Pt[]): Prim =>
            prim({
                kind: "path",
                closed: false,
                points,
                fill: null,
                stroke: { color: "#000000", opacity: 1, width: 1, dash: null, dashClass: "solid" },
            });
        // the oracle drawn at twice graphty's size and 50 px in: a's line to the anchor k on the line from c to d
        const prims = [
            ...grid.map(([, x, y]) => prim({ tag: "ellipse", points: disc(2 * x + 50, 2 * y + 50, 40) })),
            line([
                [1050, 250],
                [250, 650],
            ]),
            line([
                [285.8, 267.9],
                [650, 450],
            ]),
        ];
        const edge = (id: string, source: string, target: string, points: Pt[]): PEdge => ({
            id,
            source,
            target,
            points,
            stroke: { color: "#000000", opacity: 1, width: 1, dash: null, dashClass: "solid" },
            arrows: [],
            label: null,
        });
        const g: PScene = {
            side: "graphty",
            width: 600,
            height: 400,
            background: "#ffffff",
            nodes: grid.map(([id, x, y]) => node(id, x, y)),
            // k is a 2 px node of no opacity: graphty draws no body for it, and its line ends where k is
            edges: [
                edge("cd", "c", "d", [
                    [500, 100],
                    [100, 300],
                ]),
                edge("ak", "a", "k", [
                    [117.9, 108.9],
                    [300, 200],
                ]),
            ],
            groups: [],
            texts: [],
            strays: [],
        };
        const o = associate(prims, 1200, 900, g).scene;
        assert.sameMembers(
            o.edges.map((e) => `${e.source}-${e.target}`),
            ["c-d", "a-k"],
        );
        // the anchor is no body of the drawing
        assert.notInclude(
            o.nodes.map((n) => n.id),
            "k",
        );
    });
});
