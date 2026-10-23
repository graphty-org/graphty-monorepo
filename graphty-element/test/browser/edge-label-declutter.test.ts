/**
 * @file Edge texts that would overlap on screen are not drawn on top of each other once the
 * graph's `labels.declutter` behavior is on: node labels are kept first, then each edge text that
 * overlaps nothing kept. Before, the pass handled node labels only, and every edge label was drawn
 * however many sat on top of each other.
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import { Graph, operationQueueOf } from "../../src/Graph";
import { nextFrame } from "../helpers/real-input";

/** Two edges that cross at the origin, so their labels, drawn at the middle of each, coincide. */
const NODES = [
    { id: "w", position: { x: -2, y: 0, z: 0 } },
    { id: "e", position: { x: 2, y: 0, z: 0 } },
    { id: "s", position: { x: 0, y: -2, z: 0 } },
    { id: "n", position: { x: 0, y: 2, z: 0 } },
    { id: "far", position: { x: 6, y: 6, z: 0 } },
    { id: "farther", position: { x: 8, y: 8, z: 0 } },
];
const EDGES = [
    { src: "w", dst: "e" },
    { src: "s", dst: "n" },
    { src: "far", dst: "farther" },
];

describe("edge labels do not overlap", () => {
    let container: HTMLElement | undefined;
    let graph: Graph | undefined;

    afterEach(() => {
        graph?.dispose();
        container?.remove();
    });

    async function draw(declutter: boolean, words = "Bob"): Promise<Graph> {
        container = document.createElement("div");
        container.style.width = "640px";
        container.style.height = "480px";
        document.body.appendChild(container);
        const g = new Graph(container);
        graph = g;
        await g.init();
        g.setLayoutBehavior({ labels: { declutter } });
        await g.addNodes(NODES);
        await g.addEdges(EDGES);
        await g.setLayout("fixed", { dim: 3 });
        await operationQueueOf(g).waitForCompletion();
        await g.getSession().styles.add({
            name: "Every one",
            target: "edge",
            selector: { match: "everything" },
            set: { "edge.label": words },
        });
        await operationQueueOf(g).waitForCompletion();
        await g.setCameraState({ position: { x: 3, y: 3, z: -20 }, target: { x: 3, y: 3, z: 0 } });
        for (let at = 0; at < 8; at++) {
            g.scene.render();
            await nextFrame();
        }

        return g;
    }

    /**
     * Which edges' labels are on screen.
     * @param g - The graph.
     * @returns The drawn labels' edge endpoints, as "src-dst".
     */
    function drawn(g: Graph): string[] {
        return [...g.getDataManager().edges.values()]
            .filter((edge) => edge.label?.labelMesh?.isEnabled() === true && edge.label.labelMesh.isVisible)
            .map((edge) => `${String(edge.srcId)}-${String(edge.dstId)}`);
    }

    it("draws every edge label while declutter is off", async () => {
        const g = await draw(false);
        assert.deepStrictEqual(g.edgeLabelCounts, { labeled: 3, edgeHidden: 0, hiddenByOverlap: 0 });
        assert.strictEqual(drawn(g).length, 3);
    });

    it("hides an edge label that would cover another, and keeps the one that covers nothing", async () => {
        const g = await draw(true);
        assert.deepStrictEqual(g.edgeLabelCounts, { labeled: 3, edgeHidden: 0, hiddenByOverlap: 1 });
        const shown = drawn(g);
        assert.strictEqual(shown.length, 2);
        assert.include(shown, "far-farther");

        g.setLayoutBehavior({ labels: { declutter: false } });
        for (let at = 0; at < 3; at++) {
            g.scene.render();
            await nextFrame();
        }
        assert.strictEqual(drawn(g).length, 3);
        assert.strictEqual(g.edgeLabelCounts.hiddenByOverlap, 0);
    });

    it("counts no edge text with no words, and the picture still settles", async () => {
        // An empty label column (a Cytoscape session's edges) gives each edge a label with no
        // words, whose plane has no size and no place a number can say; watched, it kept the
        // declutter re-deciding every frame and waitForStableFrame never resolved.
        const g = await draw(true, "");
        await g.waitForStableFrame();
        assert.deepStrictEqual(g.edgeLabelCounts, { labeled: 0, edgeHidden: 0, hiddenByOverlap: 0 });
    });
});
