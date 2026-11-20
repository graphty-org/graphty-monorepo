/**
 * @file Curved edges on `renderPath: "batched"` stay inside the card's largest texture, and a route table the card
 * cannot hold reaches the consumer as one `error` event, not an exception in the frame (issue #9160).
 *
 * A curve batch kept an entry of four texels for every PIECE of every curve, 64 pieces for a long one, in tables
 * 1024 texels wide that only grew taller: about 32,000 long curved edges, inside the default limits, made a table
 * taller than an 8192 card allows. Each curve now keeps one entry, the draw gives every entry as many pieces as the
 * longest asks for, and a table grows wider before it grows past the card. The card's largest texture is pinned at
 * 256 here, so a table past it is a few hundred curves rather than tens of thousands.
 */

import "../../src/graphty-element";

import type { BaseTexture } from "@babylonjs/core";
import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";
import type { RenderPath } from "../../src/meshes/NodeBatch";
import { edgeBetween } from "../helpers/testSetup";
import { pixelsOverBar as overBar, readCanvas } from "../helpers/whole-canvas";

const ADAPTER = (import.meta.env as Record<string, string | undefined>).GRAPHTY_BROWSER_GPU ?? "";
const RENDERERS = ADAPTER === "" ? (["webgl"] as const) : (["webgl", "webgpu"] as const);

/** The card's largest texture side, pinned far below the real one. */
const MOST = 256;

afterEach(() => {
    document.body.replaceChildren();
});

/**
 * Two columns of nodes 20 apart, every node of one joined to every node of the other: each edge is long enough
 * for a curve's most pieces (64).
 * @param side - Nodes in each column.
 * @returns The nodes and edges.
 */
function columns(side: number): {
    nodes: { id: number; position: { x: number; y: number; z: number } }[];
    edges: { src: number; dst: number }[];
} {
    const nodes = Array.from({ length: side * 2 }, (_, id) => ({
        id,
        position: { x: id < side ? -10 : 10, y: (id % side) * (12 / side) - 6, z: 0 },
    }));
    const edges = Array.from({ length: side * side }, (_, i) => ({
        src: Math.floor(i / side),
        dst: side + (i % side),
    }));
    return { nodes, edges };
}

/**
 * Mount an element with the card's largest texture pinned, and load two columns of curved edges.
 * @param renderer - The renderer.
 * @param path - The render path.
 * @param side - Nodes in each column.
 * @param look - What every edge's style sets besides a curve with no head.
 * @returns The element and the error events it raised.
 */
async function loaded(
    renderer: "webgl" | "webgpu",
    path: RenderPath,
    side: number,
    look: Record<string, unknown> = {},
): Promise<{ element: Graphty; errors: { error: unknown; context: string }[] }> {
    const element = document.createElement("graphty-element");
    element.renderer = renderer;
    element.renderPath = path;
    element.style.display = "block";
    element.style.width = "400px";
    element.style.height = "300px";
    const errors: { error: unknown; context: string }[] = [];
    element.addEventListener("error", (event) => {
        errors.push((event as CustomEvent<{ error: unknown; context: string }>).detail);
    });
    document.body.appendChild(element);
    await element.updateComplete;
    await operationQueueOf(element.graph).waitForCompletion();
    // the engine the graph draws with, once WebGPU has replaced the first one, is the one to pin
    await element.waitForStableFrame();
    assert.strictEqual(element.rendererStatus?.active, renderer, element.rendererStatus?.reason ?? "");
    element.graph.engine.getCaps().maxTextureSize = MOST;
    const { nodes, edges } = columns(side);
    await element.session.data.addNodes(nodes);
    await element.session.data.addEdges(edges);
    await element.graph.setLayout("fixed", { dim: 3 });
    await element.setViewMode("3d");
    await element.session.styles.add({
        name: "long curves",
        target: "edge",
        selector: {
            match: "ids",
            edges: edges.map(({ src, dst }) => {
                const edge = edgeBetween(element.graph, src, dst);
                assert.isDefined(edge);
                return edge.id;
            }),
        },
        set: { "edge.arrowHead": "none", "edge.curvature": true, "edge.fanned": false, ...look },
    } as never);
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();
    return { element, errors };
}

/**
 * The tables the curve batch binds, but not the row table's, which it reads and does not own.
 * @param element - The element.
 * @returns Each table's size.
 */
function curveTables(element: Graphty): { width: number; height: number }[] {
    const batches = element.graph.scene.meshes.filter((mesh) => mesh.name.endsWith("|curve"));
    assert.lengthOf(batches, 1, "the curves are drawn from one curve batch");
    const rowPosition = element.graph.getRowTable()?.positionTexture;
    return (batches[0]?.material?.getActiveTextures() ?? [])
        .filter((texture: BaseTexture) => texture !== rowPosition)
        .map((texture) => texture.getSize());
}

describe.each(RENDERERS)("curved edges past the card's largest texture on %s", (renderer) => {
    it("keep every curve table inside it and draw the objects path's picture", async () => {
        // 400 long curves: 25,600 pieces, 102,400 texels when a piece kept four, past a 256 x 256 table
        const side = 20;
        const objects = await loaded(renderer, "objects", side);
        const objectsRest = await readCanvas(objects.element.graph);
        objects.element.remove();

        const { element, errors } = await loaded(renderer, "batched", side);
        assert.deepInclude(element.graph.rowCounts, { pulledEdges: side * side, objectEdges: 0 });
        const tables = curveTables(element);
        assert.isAbove(tables.length, 2, "the batch binds its tables");
        for (const { width, height } of tables) {
            assert.isAtMost(
                width,
                MOST,
                `a table ${String(width)} x ${String(height)} is no wider than the card allows`,
            );
            assert.isAtMost(
                height,
                MOST,
                `a table ${String(width)} x ${String(height)} is no taller than the card allows`,
            );
        }
        assert.deepEqual(errors, [], "no error");
        assert.equal(overBar(objectsRest, await readCanvas(element.graph)), 0, "the objects path's picture");
    });

    it("report a route table the card cannot hold once, as an error event, and keep drawing", async () => {
        // 2,304 half circles (a radius of half the chord) of up to 25 points each, a 32-texel block apiece: 73,728
        // route texels, past the 65,536 of a 256 x 256 table
        const side = 48;
        const { element, errors } = await loaded(renderer, "batched", side, { "edge.arcRadius": 0.5 });
        assert.lengthOf(errors, 1, "one error event for the batch");
        const [{ error, context }] = errors as [{ error: unknown; context: string }];
        assert.strictEqual((error as { code?: string }).code, "E_TOO_LARGE");
        assert.strictEqual(context, "other");
        for (const { width, height } of curveTables(element)) {
            assert.isAtMost(Math.max(width, height), MOST, "every table stays inside the card");
        }

        // the frames go on: a new node and edge are drawn, and nothing more is reported
        const before = await readCanvas(element.graph);
        await element.session.data.addNodes([{ id: "late", position: { x: 0, y: 0, z: 0 } }]);
        await element.session.data.addEdges([{ src: 0, dst: "late" }]);
        await operationQueueOf(element.graph).waitForCompletion();
        await element.waitForStableFrame();
        assert.isAbove(overBar(before, await readCanvas(element.graph)), 0, "a later frame draws the new node");
        assert.lengthOf(errors, 1, "reported once");
    });
});
