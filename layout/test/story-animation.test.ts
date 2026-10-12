/**
 * The 2D layout stories animate a graph from its starting positions to the layout's positions
 * with updatePositions (stories/utils/visualization.ts). Nodes and edges must move together:
 * on every frame each edge ends at its two nodes' current centers (issue #2073, where the nodes
 * moved by a CSS transition and the edges jumped straight to their final positions).
 */
import { assert, describe, it } from "vitest";

import { generateGraph, generateRandomPositions } from "../stories/utils/graph-generators.js";
import { createStoryContainer, renderGraph, updatePositions } from "../stories/utils/visualization.js";

/** The center of a node's circle, as drawn now. */
function center(svg: SVGSVGElement, id: string): { x: number; y: number } {
    const circle = svg.querySelector(`[data-node-id="${id}"]`);
    assert.ok(circle, `node ${id}`);
    return { x: Number(circle.getAttribute("cx")), y: Number(circle.getAttribute("cy")) };
}

describe("layout story animation", () => {
    it("keeps every edge on its nodes' centers on every frame, and ends at the layout", async () => {
        const graph = generateGraph("cycle", 8, 42);
        const { svg } = createStoryContainer();
        renderGraph(svg, graph, generateRandomPositions(graph, 500, 500, 42), 20, 1, 0, 0);
        const start = center(svg, "0");
        const final: Record<number, [number, number]> = {};
        graph.nodes.forEach((node, i) => {
            final[node.id] = [Math.cos((2 * Math.PI * i) / 8), Math.sin((2 * Math.PI * i) / 8)];
        });

        let done = false;
        void Promise.resolve(updatePositions(svg, graph, final)).then(() => {
            done = true;
        });

        // Look at the drawing after each animation frame until the animation says it is done.
        let frames = 0;
        let midFrames = 0;
        let end = start;
        while (!done) {
            await new Promise((resolve) => requestAnimationFrame(resolve));
            frames++;
            assert.isBelow(frames, 1000, "the animation never finished");
            for (const line of svg.querySelectorAll("line")) {
                const source = center(svg, line.getAttribute("data-source") ?? "");
                const target = center(svg, line.getAttribute("data-target") ?? "");
                assert.deepStrictEqual(
                    [
                        line.getAttribute("x1"),
                        line.getAttribute("y1"),
                        line.getAttribute("x2"),
                        line.getAttribute("y2"),
                    ],
                    [String(source.x), String(source.y), String(target.x), String(target.y)],
                    `edge ${line.getAttribute("data-source")}-${line.getAttribute("data-target")} on frame ${frames}`,
                );
            }
            const now = center(svg, "0");
            if (!done && (now.x !== start.x || now.y !== start.y)) {
                midFrames++;
            }
            end = now;
        }

        // The node really moved through intermediate positions, not in one jump ...
        assert.isAtLeast(midFrames, 1, "no frame between the start and the end");
        // ... and stopped where the layout put it.
        assert.notDeepEqual(end, start);
        assert.deepStrictEqual(center(svg, "0"), end);
    });
});
