/**
 * A line laid along the route Graphviz gave it ends under its arrowhead: no part of the line is drawn past the head's
 * back toward its tip (issue #6410, the edge into the bottom node of the `Layout/Graphviz` `Dot` story).
 */
import { Vector3 } from "@babylonjs/core/Maths/math.vector.js";
import { afterEach, assert, beforeEach, describe, it } from "vitest";

import { Graph, operationQueueOf } from "../../src/Graph";
import { EdgeMesh } from "../../src/meshes/EdgeMesh";
import { drawnFrames } from "../helpers/drawn-frames";

/** The `Layout/Graphviz` stories' graph. */
const SAMPLE = [
    "a>b",
    "a>c",
    "b>d",
    "c>d",
    "d>e",
    "e>f",
    "e>g",
    "f>h",
    "g>h",
    "h>a",
    "c>i",
    "i>j",
    "j>h",
    "b>k",
    "k>l",
    "l>f",
].map((pair) => pair.split(">"));

describe("a line Graphviz routed", () => {
    let container: HTMLDivElement;
    let graph: Graph;

    beforeEach(async () => {
        container = document.createElement("div");
        container.style.width = "800px";
        container.style.height = "600px";
        document.body.appendChild(container);
        graph = new Graph(container);
        await graph.init();
    });

    afterEach(() => {
        graph.dispose();
        container.remove();
    });

    it("ends behind its arrowhead's back, on every edge of the dot story", async () => {
        await graph.setViewMode("2d");
        await graph.addNodes([...new Set(SAMPLE.flat())].map((id) => ({ id })));
        await graph.addEdges(SAMPLE.map(([src, dst]) => ({ src, dst })));
        await graph.setLayout("graphviz-dot");
        await operationQueueOf(graph).waitForCompletion();
        const manager = graph.getLayoutManager();
        while (!(manager.layoutEngine?.isSettled ?? false) || manager.running) {
            await drawnFrames(graph.getScene(), 1);
        }
        await graph.waitForStableFrame();

        let routed = 0;
        for (const edge of graph.getDataManager().edges.values()) {
            const name = `${edge.srcId}->${edge.dstId}`;
            const run = edge.drawnCurve;
            if (run === null) {
                continue;
            }

            routed++;
            // a "normal" head is placed by its tip, on the target's outline
            const tip = edge.arrowCap?.position;
            assert(tip, `${name} has a head`);
            const lineEnd = run.at(-1);
            assert(lineEnd, `${name} is drawn`);
            const back = Vector3.Distance(lineEnd, tip);
            assert.isAtLeast(back, EdgeMesh.calculateArrowLength() / 2 - 1e-6, `${name} stops behind the head`);
            for (const point of run.slice(0, -1)) {
                assert.isAtLeast(
                    Vector3.Distance(point, tip),
                    back - 1e-6,
                    `${name}: a point of its line lies under its head, nearer the tip than the line's end`,
                );
            }
        }
        assert.isAbove(routed, 0, "dot routes some edge of this graph");
    });
});
