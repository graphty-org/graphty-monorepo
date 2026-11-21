/**
 * @file Curved edges on `renderPath: "batched"` stay inside the card's largest texture, and a route table the card
 * cannot hold reaches the consumer as one `error` event, not an exception in the frame (issue #9160).
 *
 * A curve batch kept an entry of four texels for every PIECE of every curve, 64 pieces for a long one, in tables
 * 1024 texels wide that only grew taller: about 32,000 long curved edges, inside the default limits, made a table
 * taller than an 8192 card allows. A curve now keeps an entry for every 16 pieces and a draw slot of four bytes a
 * piece, and a table grows wider before it grows past the card. The card's largest texture is pinned at 256 here, so a table past
 * it is a few hundred curves rather than tens of thousands.
 *
 * What a curve draws is its own: a short curve draws no more slots because a long curve, or a line through hundreds of
 * bends, shares its batch. And curves that cross draw in the object path's order, so the right one lies on top.
 */

import "../../src/graphty-element";

import type { AbstractMesh, BaseTexture } from "@babylonjs/core";
import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";
import { JOIN_TEMPLATE_INDICES } from "../../src/meshes/edgeJoinShader";
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

/** Nodes placed where they are drawn, and the edges between them. */
interface Placed {
    nodes: { id: number; position: { x: number; y: number; z: number } }[];
    edges: { src: number; dst: number }[];
}

/**
 * Two columns of nodes 20 apart, every node of one joined to every node of the other: each edge is long enough
 * for a curve's most pieces (64).
 * @param side - Nodes in each column.
 * @returns The nodes and edges.
 */
function columns(side: number): Placed {
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
 * Mount an element with the card's largest texture pinned, and load a graph of curved edges.
 * @param renderer - The renderer.
 * @param path - The render path.
 * @param graph - The nodes and edges.
 * @param look - What every edge's style sets besides a curve with no head.
 * @returns The element and the error events it raised.
 */
async function loaded(
    renderer: "webgl" | "webgpu",
    path: RenderPath,
    { nodes, edges }: Placed,
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
 * The one batch the curves are drawn from.
 * @param element - The element.
 * @returns Its mesh.
 */
function curveBatch(element: Graphty): AbstractMesh {
    const batches = element.graph.scene.meshes.filter((mesh) => mesh.name.endsWith("|curve"));
    assert.lengthOf(batches, 1, "the curves are drawn from one curve batch");
    return batches[0];
}

/**
 * The tables the curve batch binds, but not the row table's, which it reads and does not own.
 * @param element - The element.
 * @returns Each table's size.
 */
function curveTables(element: Graphty): { width: number; height: number }[] {
    const rowPosition = element.graph.getRowTable()?.positionTexture;
    return (curveBatch(element).material?.getActiveTextures() ?? [])
        .filter((texture: BaseTexture) => texture !== rowPosition)
        .map((texture) => texture.getSize());
}

describe.each(RENDERERS)("curved edges past the card's largest texture on %s", (renderer) => {
    it("keep every curve table inside it and draw the objects path's picture", async () => {
        // 400 long curves: 25,600 pieces, 102,400 texels when a piece kept four, past a 256 x 256 table
        const side = 20;
        const objects = await loaded(renderer, "objects", columns(side));
        const objectsRest = await readCanvas(objects.element.graph);
        objects.element.remove();

        const { element, errors } = await loaded(renderer, "batched", columns(side));
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
        const { element, errors } = await loaded(renderer, "batched", columns(side), {
            "edge.arcRadius": 0.5,
        });
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

/**
 * Pairs of nodes one apart, each joined by a short curve (10 pieces, a curve's fewest), and two nodes 20 apart, not
 * joined yet.
 * @param pairs - The short pairs.
 * @returns The nodes and edges.
 */
function shortPairs(pairs: number): Placed {
    const nodes = Array.from({ length: pairs * 2 + 2 }, (_, id) => {
        const far = id >= pairs * 2;
        const x = far ? 10 : 0.5;
        return {
            id,
            position: { x: id % 2 === 0 ? -x : x, y: far ? -7 : Math.floor(id / 2) * (12 / pairs) - 6, z: 0 },
        };
    });
    const edges = Array.from({ length: pairs }, (_, i) => ({ src: 2 * i, dst: 2 * i + 1 }));
    return { nodes, edges };
}

/** A line through 200 bends: 201 pieces, more than three curves of a curve's most. */
const BENDS = Array.from(
    { length: 200 },
    (_, k) => `${String((k + 1) / 201)},${String(k % 2 === 0 ? 0.3 : -0.3)}`,
).join(" ");

/**
 * Restyle one edge and wait for the frame that draws it.
 * @param element - The element.
 * @param name - The style's name.
 * @param id - The edge's id.
 * @param set - What it sets.
 */
async function restyled(element: Graphty, name: string, id: unknown, set: Record<string, unknown>): Promise<void> {
    await element.session.styles.add({ name, target: "edge", selector: { match: "ids", edges: [id] }, set } as never);
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();
}

/**
 * Join the two far nodes by a long curve, then bend it through 200 bends, counting at each step the curve batch's
 * vertices and the pieces the edges' curves are drawn in.
 * @param element - The element, loaded with {@link shortPairs} on the batched path.
 * @param pairs - Its short pairs.
 * @returns For short curves only, with the long curve and with the bent line: the vertices, and the pieces.
 */
async function lengthened(element: Graphty, pairs: number): Promise<{ vertices: number; pieces: number }[]> {
    const count = (): { vertices: number; pieces: number } => {
        const batch = element.graph.scene.meshes.find((mesh) => mesh.name.endsWith("|curve"));
        let pieces = 0;
        for (const edge of element.graph.getDataManager().edges.values()) {
            pieces += (edge.drawnCurve?.length ?? 1) - 1;
        }
        return { vertices: batch?.subMeshes[0]?.verticesCount ?? 0, pieces };
    };
    const counts = [count()];
    await element.session.data.addEdges([{ src: pairs * 2, dst: pairs * 2 + 1 }]);
    const edge = edgeBetween(element.graph, pairs * 2, pairs * 2 + 1);
    assert.isDefined(edge);
    await restyled(element, "long curve", edge.id, {
        "edge.arrowHead": "none",
        "edge.curvature": true,
        "edge.fanned": false,
    });
    counts.push(count());
    await restyled(element, "200 bends", edge.id, { "edge.curvature": false, "edge.bends": BENDS });
    counts.push(count());
    return counts;
}

describe.each(RENDERERS)("a curve's draw on %s", (renderer) => {
    it("is its own: a long curve, then a line through 200 bends, add their own slots and none to a short curve", async () => {
        const pairs = 100;
        const objects = await loaded(renderer, "objects", shortPairs(pairs));
        await lengthened(objects.element, pairs);
        const objectsRest = await readCanvas(objects.element.graph);
        objects.element.remove();

        const { element, errors } = await loaded(renderer, "batched", shortPairs(pairs));
        const [short, long, bent] = (await lengthened(element, pairs)) as [
            { vertices: number; pieces: number },
            { vertices: number; pieces: number },
            { vertices: number; pieces: number },
        ];
        assert.deepInclude(element.graph.rowCounts, { pulledEdges: pairs + 1, objectEdges: 0 });
        const corners = JOIN_TEMPLATE_INDICES.length;
        const counts = [short, long, bent].map(({ vertices, pieces }) => `${String(vertices)} for ${String(pieces)}`);
        // the draw covers each curve's own pieces, a template's corners each, whatever the other curves ask for: the
        // bent line's 201 pieces take the long curve's freed slots, then new ones
        assert.isAbove(short.pieces, 0, "the short curves are drawn from the batch");
        assert.strictEqual(short.vertices, short.pieces * corners, `short curves: ${counts.join(", then ")}`);
        assert.strictEqual(long.vertices, long.pieces * corners, `with the long curve: ${counts.join(", then ")}`);
        assert.strictEqual(bent.pieces, short.pieces + 201, "the bent line is drawn in 201 pieces");
        assert.strictEqual(bent.vertices, bent.pieces * corners, `with the bent line: ${counts.join(", then ")}`);
        assert.deepEqual(errors, [], "no error");
        assert.equal(overBar(objectsRest, await readCanvas(element.graph)), 0, "the objects path's picture");
    });
});

/**
 * Six horizontal and six vertical long curves (64 pieces each, so four entries apiece) crossing in one plane, the
 * horizontals first, or added in turn (horizontal, vertical, horizontal, ...).
 * @param interleaved - Whether the edges are added in turn.
 * @returns The nodes, the edges, and which edges are horizontal.
 */
function crossing(interleaved: boolean): Placed & { across: { src: number; dst: number }[] } {
    const nodes: Placed["nodes"] = [];
    const across: Placed["edges"] = [];
    const down: Placed["edges"] = [];
    for (let i = 0; i < 6; i++) {
        const at = -6 + (12 * i) / 5;
        nodes.push(
            { id: i, position: { x: -10, y: at, z: 0 } },
            { id: 100 + i, position: { x: 10, y: at, z: 0 } },
            { id: 200 + i, position: { x: at, y: 10, z: 0 } },
            { id: 300 + i, position: { x: at, y: -10, z: 0 } },
        );
        across.push({ src: i, dst: 100 + i });
        down.push({ src: 200 + i, dst: 300 + i });
    }
    const edges = interleaved ? across.flatMap((edge, i) => [edge, down[i]]) : [...across, ...down];
    return { nodes, edges, across };
}

/**
 * Load {@link crossing}'s curves, the horizontals red and the verticals blue, and read the picture.
 * @param renderer - The renderer.
 * @param path - The render path.
 * @param interleaved - Whether the edges are added in turn ({@link crossing}).
 * @returns The picture, and the element still mounted.
 */
async function crossed(
    renderer: "webgl" | "webgpu",
    path: RenderPath,
    interleaved: boolean,
): Promise<{ element: Graphty; picture: Awaited<ReturnType<typeof readCanvas>> }> {
    const graph = crossing(interleaved);
    const { element } = await loaded(renderer, path, graph, { "edge.color": "#0000ff", "edge.width": 3 });
    const across = graph.across.map(({ src, dst }) => edgeBetween(element.graph, src, dst)?.id);
    await element.session.styles.add({
        name: "red across",
        target: "edge",
        selector: { match: "ids", edges: across },
        set: { "edge.color": "#ff0000" },
    } as never);
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();
    return { element, picture: await readCanvas(element.graph) };
}

describe.each(RENDERERS)("crossing curves on %s", (renderer) => {
    // added in turn, the restyled (red) curves sit between the others in draw order: a restyle that hands their draw
    // slots back and takes them again moves them in it, where the object path recolors them in place (#9370)
    it.each([
        ["horizontals first", false],
        ["added in turn", true],
    ])(
        "draw in the objects path's order, so the later curve lies on top where two cross (%s)",
        async (_, interleaved) => {
            const objects = await crossed(renderer, "objects", interleaved);
            objects.element.remove();
            const batched = await crossed(renderer, "batched", interleaved);
            assert.deepInclude(batched.element.graph.rowCounts, { pulledEdges: 12, objectEdges: 0 });
            // a curve's pieces past its first take their draw slots when it is first placed, as the object path's do: a
            // curve drawn whole in its first piece's place lies under or over the other the wrong way where two cross
            assert.equal(overBar(objects.picture, batched.picture), 0, "the objects path's picture");
        },
    );
});
