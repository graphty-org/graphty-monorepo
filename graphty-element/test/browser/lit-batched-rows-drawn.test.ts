/**
 * @file On the "batched" render path, nodes drawn from their rows (plain spheres, which never build
 * a `Node`) stay drawn when the lighting changes at runtime, under every lighting (issue #9246:
 * "matte" and "headlight" left them off the frame the element called stable).
 *
 * Read off the canvas at each node's public screen position.
 */

import { afterAll, assert, beforeAll, describe, it } from "vitest";

import { LIGHTING_VALUES } from "../../src/config/Lighting";
import { Graph, operationQueueOf } from "../../src/Graph";
import { type Frame, readFrame } from "../helpers/paint-assertions";

const WIDTH = 400;
const HEIGHT = 300;
const NODE_COLOR = "#3B82F6";
const IDS = ["a", "b", "c"];

/**
 * Whether the pixel under a node's center is the node's blue, not the light page behind it.
 * @param graph - The graph.
 * @param frame - The frame read.
 * @param id - The node.
 * @returns True when the node is drawn there.
 */
function drawnAt(graph: Graph, frame: Frame, id: string): boolean {
    const at = graph.nodeScreenPosition(id);
    assert.isDefined(at, `the graph holds ${id}`);
    const scale = frame.width / WIDTH;
    const x = Math.round(at.x * scale);
    // WebGL rows count from the bottom.
    const y = frame.height - 1 - Math.round(at.y * scale);
    const offset = (y * frame.width + x) * 4;
    const [r, g, b] = [frame.pixels[offset], frame.pixels[offset + 1], frame.pixels[offset + 2]];

    // Blue dominates under every lighting; the page and the edges are gray.
    return b - r > 40 && b - g > 20;
}

describe("batched row nodes under a runtime lighting change", () => {
    let container: HTMLElement;
    let graph: Graph;
    const drawn = new Map<string, string[]>();

    beforeAll(async () => {
        container = document.createElement("div");
        container.style.width = `${String(WIDTH)}px`;
        container.style.height = `${String(HEIGHT)}px`;
        document.body.appendChild(container);

        graph = new Graph(container);
        void graph.setViewMode("3d");
        await graph.init();
        graph.setRenderPath("batched");
        await graph.addNodes(IDS.map((id) => ({ id })));
        await graph.addEdges([
            { src: "a", dst: "b" },
            { src: "b", dst: "c" },
        ]);
        await graph.getSession().styles.add({
            name: "blue",
            target: "node",
            selector: { match: "everything" },
            set: { "node.color": NODE_COLOR },
        });
        await operationQueueOf(graph).waitForCompletion();

        const first = await readFrame(graph);
        drawn.set(
            "before",
            IDS.filter((id) => drawnAt(graph, first, id)),
        );
        for (const lighting of ["matte", "headlight", "flat", "studio"] as const) {
            graph.setLighting(lighting);
            const frame = await readFrame(graph);
            drawn.set(
                lighting,
                IDS.filter((id) => drawnAt(graph, frame, id)),
            );
        }
    });

    afterAll(() => {
        graph.dispose();
        container.remove();
    });

    it("draws every node before the switch", () => {
        assert.deepStrictEqual(drawn.get("before"), IDS);
    });

    for (const lighting of LIGHTING_VALUES) {
        it(`draws every node in the stable frame after switching to ${lighting}`, () => {
            assert.deepStrictEqual(drawn.get(lighting), IDS, `nodes drawn under ${lighting}`);
        });
    }
});
