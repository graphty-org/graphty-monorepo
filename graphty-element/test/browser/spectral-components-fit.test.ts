/**
 * @file Spectral layout over a graph of several connected components (issue #9302): after Fit every node is on the
 * canvas and no component is drawn on one point. Read through the public `nodeScreenPosition`.
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";

const WIDTH = 400;
const HEIGHT = 300;

/** Three components: a 10-node cycle, a 6-node path and a triangle, plus an isolated node. */
const PARTS = [
    Array.from({ length: 10 }, (_, i) => `c${String(i)}`),
    Array.from({ length: 6 }, (_, i) => `p${String(i)}`),
    ["t0", "t1", "t2"],
    ["lone"],
];
const EDGES = [
    ...PARTS[0].map((id, i) => ({ src: id, dst: PARTS[0][(i + 1) % PARTS[0].length] })),
    ...PARTS[1].slice(1).map((id, i) => ({ src: PARTS[1][i], dst: id })),
    { src: "t0", dst: "t1" },
    { src: "t1", dst: "t2" },
    { src: "t2", dst: "t0" },
];

let element: Graphty | undefined;

afterEach(() => {
    element?.remove();
    element = undefined;
});

describe("spectral layout of a graph with several components (#9302)", () => {
    it("puts every node on the canvas at Fit, each component spread out", async () => {
        element = document.createElement("graphty-element");
        element.style.display = "block";
        element.style.width = `${String(WIDTH)}px`;
        element.style.height = `${String(HEIGHT)}px`;
        document.body.appendChild(element);
        await element.updateComplete;
        await element.setViewMode("2d");

        await element.graph.addNodes(PARTS.flat().map((id) => ({ id })));
        await element.graph.addEdges(EDGES);
        await element.graph.setLayout("spectral", { dim: 2 });
        await element.graph.waitForSettled();
        element.zoomToFit();
        await element.waitForStableFrame();

        const screen = (id: string): { x: number; y: number } => {
            const at = element?.nodeScreenPosition(id);
            assert.isDefined(at, `${id} is drawn`);
            assert.isTrue(at.visible, `${id} is visible`);
            assert.isAtLeast(at.x, 0, `${id} x ${String(at.x)}`);
            assert.isAtMost(at.x, WIDTH, `${id} x ${String(at.x)}`);
            assert.isAtLeast(at.y, 0, `${id} y ${String(at.y)}`);
            assert.isAtMost(at.y, HEIGHT, `${id} y ${String(at.y)}`);
            return at;
        };
        for (const nodes of PARTS) {
            const points = nodes.map(screen);
            if (nodes.length > 1) {
                const spread = Math.max(...points.map((p) => Math.hypot(p.x - points[0].x, p.y - points[0].y)));
                assert.isAbove(spread, 5, `${nodes[0]}'s component is spread out, not on one point`);
            }
        }
    });
});
