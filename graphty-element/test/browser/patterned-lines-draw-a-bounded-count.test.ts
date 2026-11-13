/**
 * @file A patterned line draws a few dozen pieces per edge whatever its width (issue #7404).
 *
 * A diamond line places one billboarded piece per element, and the elements sat one and a half
 * element widths apart with no floor, so a width-0.5 line put about 1,000 sub-pixel diamonds on a
 * 20-unit edge. 500 such edges were half a million pieces, every one drawn every frame, and a
 * camera turn took seconds per frame on the software renderer.
 */
import { Mesh } from "@babylonjs/core";
import { afterEach, assert, beforeEach, describe, it } from "vitest";

import { type Graph, operationQueueOf } from "../../src/Graph";
import { cleanupTestGraph, createTestGraph, styleEveryEdge } from "../helpers/testSetup";

const EDGE_COUNT = 500;
/** Each edge joins its own two nodes this far apart. */
const EDGE_LENGTH = 10;
/** The most pieces one edge may draw: about its length over 0.3, with room to spare. */
const PIECES_PER_EDGE = 64;

describe("patterned lines draw a bounded count of pieces", () => {
    let graph: Graph;

    beforeEach(async () => {
        graph = await createTestGraph();
    });

    afterEach(() => {
        cleanupTestGraph(graph);
    });

    /**
     * The pattern pieces the scene draws: the thin instances of every 3D pattern batch.
     * @returns The pieces.
     */
    function piecesDrawn(): number {
        let pieces = 0;
        for (const mesh of graph.scene.meshes) {
            if (mesh instanceof Mesh && mesh.name.startsWith("cap-batch|3d|pattern-")) {
                pieces += mesh.thinInstanceCount;
            }
        }
        return pieces;
    }

    /**
     * Load 500 diamond edges of one width on a fixed layout, each joining its own two nodes.
     * @param width - The line width.
     */
    async function loadDiamonds(width: number): Promise<void> {
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
        await styleEveryEdge(graph, { "edge.style": "diamond", "edge.width": width, "edge.arrowHead": "none" });
        await operationQueueOf(graph).waitForCompletion();
        await graph.waitForStableFrame();
    }

    for (const width of [0.5, 8]) {
        it(`draws at most ${String(PIECES_PER_EDGE)} pieces per edge at line width ${String(width)}`, async () => {
            await loadDiamonds(width);

            const pieces = piecesDrawn();
            assert.isAbove(pieces, EDGE_COUNT, "every edge draws its diamonds");
            assert.isAtMost(pieces, PIECES_PER_EDGE * EDGE_COUNT);
        });
    }
});
