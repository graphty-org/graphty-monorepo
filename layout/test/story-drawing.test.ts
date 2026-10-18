/**
 * The layout stories draw each layout through stories/utils: makeGraph builds the graph the caption
 * and Code panel name, and drawGraph fits the drawing to the frame. These pin what a reader sees.
 */
import { circular } from "@graphty/layout";
import { assert, describe, it } from "vitest";

import { GRAPH_KINDS, makeGraph } from "../stories/utils/graphs.js";
import { createSvg, drawGraph } from "../stories/utils/visualization.js";

describe("layout story drawing", () => {
    it("makes every graph kind deterministically, with the generator call it names", () => {
        for (const kind of GRAPH_KINDS) {
            const a = makeGraph(kind, 12, 7);
            const b = makeGraph(kind, 12, 7);
            assert.ok(a.graph.nodeCount >= 9, kind);
            assert.deepStrictEqual(Array.from(a.sample.src), Array.from(b.sample.src), kind);
            assert.match(a.call, /^[a-zA-Z]+Graph\(\{ .* \}\)$/, kind);
        }
    });

    it("draws every node inside the frame and skips a node the layout left out", () => {
        const g = makeGraph("cycle", 8, 1);
        const result = circular(g.graph, { scale: 1000, center: [5000, -5000] });
        result.positions[3 * result.dim] = Number.NaN; // node 3 left out
        const svg = createSvg(600);
        drawGraph(svg, g.sample, result, "test");

        const circles = [...svg.querySelectorAll("circle")];
        assert.strictEqual(circles.length, 7);
        for (const c of circles) {
            for (const attr of ["cx", "cy"]) {
                const v = Number(c.getAttribute(attr));
                assert.ok(v > 0 && v < 600, `${attr} ${v}`);
            }
        }
        // the two edges of node 3 are not drawn
        assert.strictEqual(svg.querySelectorAll("line").length, 6);
    });
});
