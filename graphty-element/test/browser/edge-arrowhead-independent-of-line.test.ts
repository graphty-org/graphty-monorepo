/**
 * @file An arrowhead does NOT follow the line it caps: its size comes from `arrowHead.size` over
 * the fixed default arrow width and length, and its opacity from `arrowHead.opacity` (default 1).
 * Changing `edge.width` or `edge.opacity` must leave the arrowhead exactly as it was.
 *
 * Checked on the meshes the element builds (in 2D the arrow's scaling is its length, in 3D the
 * billboard shader's bounding sphere is), by comparing two edges that differ only in the line.
 */

import type { AbstractMesh } from "@babylonjs/core";
import { afterEach, assert, beforeEach, describe, test } from "vitest";

import type { Edge } from "../../src/Edge";
import { Graph } from "../../src/Graph";
import { addStyleLayer, asData, edgeBetween } from "../helpers/testSetup";

type ViewMode = "2d" | "3d";

describe("an arrowhead is independent of the line it caps", () => {
    let container: HTMLElement;
    let graph: Graph;

    beforeEach(() => {
        container = document.createElement("div");
        container.style.width = "400px";
        container.style.height = "400px";
        document.body.append(container);
    });

    afterEach(() => {
        graph.dispose();
        container.remove();
    });

    /**
     * Build a graph with one edge per line setting, each styled by a layer scoped to that edge.
     * @param mode - The view mode.
     * @param lines - Channels to set per edge.
     * @returns The edges, in the same order.
     */
    async function build(mode: ViewMode, lines: Record<string, number>[]): Promise<Edge[]> {
        graph = new Graph(container);
        await graph.setViewMode(mode);
        await graph.operationQueue.waitForCompletion();

        const edges: Edge[] = [];
        for (const [index, set] of lines.entries()) {
            const src = `s${String(index)}`;
            const dst = `d${String(index)}`;
            await graph.addNode(asData({ id: src, x: 0, y: index * 3, z: 0 }));
            await graph.addNode(asData({ id: dst, x: 6, y: index * 3, z: 0 }));
            await graph.addEdge(asData({ source: src, target: dst }), { source: "source", target: "target" });
            const edge = edgeBetween(graph, src, dst);
            assert(edge, `edge ${src} -> ${dst} exists`);
            await addStyleLayer(graph, {
                name: `edge ${String(index)}`,
                target: "edge",
                selector: { match: "ids", edges: [edge.id] },
                set: { "edge.arrowHead": "normal", ...set },
            });
            edges.push(edge);
        }

        await graph.operationQueue.waitForCompletion();
        graph.getUpdateManager().stepFrames(2);

        // Re-read: a repaint may have rebuilt the edge objects' meshes.
        return lines.map((_, index) => {
            const edge = edgeBetween(graph, `s${String(index)}`, `d${String(index)}`);
            assert(edge, "edge still exists");
            return edge;
        });
    }

    /**
     * How long the arrow is drawn, in world units.
     * @param mesh - The arrowhead mesh.
     * @param mode - The view mode.
     * @returns The drawn length.
     */
    function arrowLength(mesh: AbstractMesh, mode: ViewMode): number {
        if (mode === "2d") {
            return mesh.scaling.x;
        }

        return mesh.getBoundingInfo().boundingSphere.radius;
    }

    for (const mode of ["2d", "3d"] as const) {
        test(`${mode}: a thicker line draws the same arrowhead`, async () => {
            const [thin, thick] = await build(mode, [{ "edge.width": 2 }, { "edge.width": 16 }]);
            assert(thin.arrowMesh && thick.arrowMesh, "both edges have arrowheads");

            assert.closeTo(arrowLength(thick.arrowMesh, mode), arrowLength(thin.arrowMesh, mode), 1e-6);
        });

        test(`${mode}: a half-opacity line keeps a fully opaque arrowhead`, async () => {
            const [faded, plain] = await build(mode, [{ "edge.opacity": 0.5 }, {}]);
            assert(faded.arrowMesh && plain.arrowMesh, "both edges have arrowheads");
            assert.closeTo(faded.arrowMesh.visibility, 1, 1e-6);
            assert.closeTo(faded.arrowMesh.visibility, plain.arrowMesh.visibility, 1e-6);
        });

        test(`${mode}: an explicit arrowhead opacity is the arrowhead's opacity`, async () => {
            const [edge] = await build(mode, [{ "edge.opacity": 0.5, "edge.arrowHeadOpacity": 0.8 }]);
            assert(edge.arrowMesh, "the edge has an arrowhead");
            assert.closeTo(edge.arrowMesh.visibility, 0.8, 1e-6);
        });
    }
});
