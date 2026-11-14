/**
 * @file A dotted, dashed, boxed, diamond or star line draws one piece per edge whatever its width (issue #7404).
 *
 * Such a line used to place one billboarded piece per element, one and a half element widths apart, so a width-0.5
 * diamond line put about 1,000 sub-pixel diamonds on a 20-unit edge: 500 edges were half a million pieces, every one
 * drawn every frame, and a camera turn took seconds per frame on the software renderer. Now its elements are drawn by
 * the line's shader, at the same spacing, from one slot per straight edge.
 */
import { Mesh } from "@babylonjs/core";
import { afterEach, assert, beforeEach, describe, it } from "vitest";

import { type Graph, operationQueueOf } from "../../src/Graph";
import { cleanupTestGraph, createTestGraph, styleEveryEdge } from "../helpers/testSetup";

const EDGE_COUNT = 500;
/** Each edge joins its own two nodes this far apart. */
const EDGE_LENGTH = 10;

describe("patterned lines draw a bounded count of pieces", () => {
    let graph: Graph;

    beforeEach(async () => {
        graph = await createTestGraph();
    });

    afterEach(() => {
        cleanupTestGraph(graph);
    });

    /**
     * The pieces the scene draws for edge lines: every pattern element's thin instance, and every patterned joined line's slot.
     * @returns The pattern elements and the joined line slots.
     */
    function piecesDrawn(): { elements: number; joined: number } {
        let elements = 0;
        let joined = 0;
        for (const mesh of graph.scene.meshes) {
            if (!(mesh instanceof Mesh)) {
                continue;
            }
            if (mesh.name.startsWith("cap-batch|") && mesh.name.includes("pattern-")) {
                elements += mesh.thinInstanceCount;
            } else if ((mesh.metadata as { pattern?: unknown } | null)?.pattern !== undefined) {
                joined += mesh.forcedInstanceCount;
            }
        }
        return { elements, joined };
    }

    /**
     * Load 500 edges of one pattern and width on a fixed layout, each joining its own two nodes.
     * @param style - The line type.
     * @param width - The line width.
     */
    async function loadEdges(style: string, width: number): Promise<void> {
        const nodes = Array.from({ length: 2 * EDGE_COUNT }, (_, i) => ({
            id: `n${String(i)}`,
            position: { x: (i % 2) * EDGE_LENGTH, y: Math.floor(i / 2) * 2, z: 0 },
        }));
        const edges = Array.from({ length: EDGE_COUNT }, (_, i) => ({
            src: `n${String(2 * i)}`,
            dst: `n${String(2 * i + 1)}`,
        }));
        await graph.addNodes(nodes);
        await graph.addEdges(edges);
        await graph.setLayout("fixed");
        await styleEveryEdge(graph, { "edge.style": style, "edge.width": width, "edge.arrowHead": "none" });
        await operationQueueOf(graph).waitForCompletion();
        await graph.waitForStableFrame();
    }

    for (const style of ["diamond", "star", "dot", "dash", "box"]) {
        for (const width of [0.5, 8]) {
            it(`draws one piece per straight ${style} edge at line width ${String(width)}`, async () => {
                await loadEdges(style, width);

                const { elements, joined } = piecesDrawn();
                assert.strictEqual(elements, 0, "no pattern element of its own");
                assert.strictEqual(joined, EDGE_COUNT, "one joined line slot per edge");
            });
        }
    }
});
