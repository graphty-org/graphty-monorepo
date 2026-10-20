/**
 * @file What an edge's `line.width` measures on screen, whatever draws the line (issue #125).
 *
 * A study reader set a width of 8 and saw hairlines, then 30 and saw a thick line, and read the
 * number as broken. This measures the drawn thickness of a solid 3D edge against its width and
 * its distance from the camera, the way `EdgeMesh` draws it: the style's width times 20 is the
 * line shader's width uniform, and the shader widens the line in clip space before the
 * perspective divide, so the line tapers with distance like the nodes do.
 *
 * Measured: a line `width` W, `depth` units in front of the camera, draws 10 x W / depth pixels
 * thick. So W is pixels only at a depth of 10; a graph framed from 50 units away draws the
 * default width of 8 under 2 pixels. Every width keeps that ratio, at every depth: the units are
 * consistent, not a rendering fault.
 *
 * The second half holds the three ways an edge line is drawn -- solid, patterned and curved --
 * to one thickness for one width. It reads the thickness off the scene, not off pixels: a line
 * drawn as geometry is measured across that geometry under its slot's matrix and projected
 * through the camera, and a line the shader widens is measured by the shader's own arithmetic,
 * its width uniform over twice the clip-space w. A curve in 2D used to be drawn by the 3D line
 * shader, ten pixels per unit of width at every zoom, beside straight edges drawn `width / 40`
 * world units thick: on a dense file graph the curves were wide hatched bands.
 *
 * Not held here: a 3D patterned edge against a 3D solid one. The solid line's width is screen
 * pixels that taper with depth and the pattern's is world units, so their ratio moves with the
 * canvas size. Moving the solid line to world units changes every 3D graph's edges, and waits
 * for graphty-element's next major release.
 */

import {
    type AbstractMesh,
    Color4,
    Engine,
    FreeCamera,
    Matrix,
    Scene,
    ShaderMaterial,
    Vector3,
    Vector4,
} from "@babylonjs/core";
import { afterEach, assert, beforeEach, describe, test } from "vitest";

import type { StaticStyle } from "../../src/catalog/types";
import type { Edge } from "../../src/Edge";
import { Graph, operationQueueOf } from "../../src/Graph";
import { CustomLineRenderer } from "../../src/meshes/CustomLineRenderer";
import type { EdgeLineBatch } from "../../src/meshes/EdgeLineBatch";
import { styleEveryEdge } from "../helpers/testSetup";

const WIDTH = 800;
const HEIGHT = 400;

/** `EdgeMesh` hands the shader the style's width times this. */
const EDGE_MESH_SCALE = 20;

describe("edge width units", () => {
    let canvas: HTMLCanvasElement;
    let engine: Engine;
    let scene: Scene;
    let camera: FreeCamera;

    beforeEach(() => {
        canvas = document.createElement("canvas");
        canvas.width = WIDTH;
        canvas.height = HEIGHT;
        canvas.style.width = `${String(WIDTH)}px`;
        canvas.style.height = `${String(HEIGHT)}px`;
        document.body.appendChild(canvas);
        engine = new Engine(canvas, false, { preserveDrawingBuffer: true });
        scene = new Scene(engine);
        scene.clearColor = new Color4(0, 0, 0, 1);
        camera = new FreeCamera("perspective", new Vector3(0, 0, -10), scene);
        camera.setTarget(Vector3.Zero());
    });

    afterEach(() => {
        scene.dispose();
        engine.dispose();
        canvas.remove();
    });

    /**
     * The lit height of a horizontal line through the canvas centre, in pixels.
     * @param width - The style's line width.
     * @param depth - The line's distance in front of the camera.
     * @returns The pixels lit in the centre column.
     */
    async function drawnThickness(width: number, depth: number): Promise<number> {
        camera.position = new Vector3(0, 0, -depth);
        camera.setTarget(Vector3.Zero());
        const mesh = CustomLineRenderer.create(
            {
                points: [new Vector3(-depth, 0, 0), new Vector3(depth, 0, 0)],
                width: width * EDGE_MESH_SCALE,
                color: "#FF0000",
            },
            scene,
        );
        // The line's shader compiles asynchronously: wait for it, then draw.
        await scene.whenReadyAsync();
        scene.render();

        const column = (await engine.readPixels(WIDTH / 2, 0, 1, HEIGHT)) as unknown as Uint8Array;
        mesh.dispose();
        let lit = 0;
        for (let at = 0; at < column.length; at += 4) {
            if (column[at] > 127) {
                lit++;
            }
        }

        return lit;
    }

    test("a line of width W at depth d draws 10 x W / d pixels, for every width and depth", async () => {
        const seen: string[] = [];
        for (const depth of [10, 20, 50]) {
            for (const width of [1, 8, 30]) {
                const want = (10 * width) / depth;
                const drawn = await drawnThickness(width, depth);
                seen.push(`width ${String(width)} at depth ${String(depth)}: ${String(drawn)} px`);
                // Rasterization rounds a thin line to whole pixels.
                assert.closeTo(drawn, want, Math.max(1, want * 0.1), seen.join("; "));
            }
        }
    });
});

/** The style's `line.width` every edge below is drawn with. */
const LINE_WIDTH = 8;

/** What draws an edge's line, read off the edge: its batch and its run of slots. */
interface LineInternals {
    lineBatch: EdgeLineBatch | null;
    lineSlots: number[];
}

/**
 * One world-space line through a point, as pixels across the screen.
 * @param scene - The scene whose camera projects it.
 * @param centre - The middle of the span, in world units.
 * @param across - The span, a world-space vector.
 * @returns Its projected length in pixels.
 */
function projectedPixels(scene: Scene, centre: Vector3, across: Vector3): number {
    const engine = scene.getEngine();
    const camera = scene.activeCamera;
    assert(camera, "the scene has a camera");
    const viewport = camera.viewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight());
    const transform = scene.getTransformMatrix();
    const half = across.scale(0.5);
    const a = Vector3.Project(centre.add(half), Matrix.IdentityReadOnly, transform, viewport);
    const b = Vector3.Project(centre.subtract(half), Matrix.IdentityReadOnly, transform, viewport);

    return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * How thick a piece of geometry is drawn across a direction, in pixels: its vertices under a
 * world matrix, spread across the perpendicular in the XY plane, projected through the camera.
 * @param scene - The scene.
 * @param mesh - The mesh whose geometry is drawn.
 * @param world - The slot's matrix times the mesh's own world matrix.
 * @param along - The direction the line runs, in world space.
 * @returns The thickness in pixels.
 */
function geometryPixels(scene: Scene, mesh: AbstractMesh, world: Matrix, along: Vector3): number {
    const positions = mesh.getVerticesData("position");
    assert(positions, "the line has geometry");
    const across = new Vector3(-along.y, along.x, 0).normalize();
    let low = Infinity;
    let high = -Infinity;
    const centre = Vector3.TransformCoordinates(Vector3.Zero(), world);

    for (let at = 0; at < positions.length; at += 3) {
        const vertex = Vector3.TransformCoordinates(Vector3.FromArray(positions, at), world);
        const offset = Vector3.Dot(vertex.subtract(centre), across);
        low = Math.min(low, offset);
        high = Math.max(high, offset);
    }

    return projectedPixels(scene, centre, across.scale(high - low));
}

/**
 * How thick an edge's line is drawn, in pixels: the thickest of its slots or pattern elements.
 *
 * A line the shader widens (the 3D line) has no width in its geometry: the shader adds its
 * `width` uniform, in pixels, before the perspective divide, so it draws `width / (2 w)` pixels.
 * @param graph - The graph the edge is in.
 * @param edge - The edge.
 * @returns The thickness in pixels.
 */
function drawnThicknessPx(graph: Graph, edge: Edge): number {
    const scene = graph.getScene();
    const along = edge.dstNode.mesh.position.subtract(edge.srcNode.mesh.position).normalize();
    const pattern = edge.drawnPattern;

    if (pattern.length > 0) {
        return Math.max(
            ...pattern.map((element) => {
                const mesh = element.batchMesh;
                assert(mesh, "a pattern element is drawn from a batch");
                return geometryPixels(scene, mesh, element.transform.multiply(mesh.getWorldMatrix()), along);
            }),
        );
    }

    const { lineBatch: batch, lineSlots } = edge as unknown as LineInternals;
    assert(batch, "the line is a run of slots in a batch");
    const { material } = batch.mesh;
    assert(material instanceof ShaderMaterial, "a batched line is drawn by the joined line shader");
    const { floats } = material.serialize() as { floats: Record<string, number> };
    const worldWidth = material.options.defines.includes("#define WORLD_WIDTH");

    return Math.max(
        ...lineSlots.map((slot) => {
            const [from, to] = batch.endsOf(slot);
            const centre = Vector3.TransformCoordinates(from.add(to).scale(0.5), batch.mesh.getWorldMatrix());
            const clip = Vector4.TransformCoordinates(centre, scene.getTransformMatrix());
            // The shader's own arithmetic (edgeJoinShader): a world width projected at the
            // centre's depth, or the 3D line's screen width, which tapers with clip w.
            const projectionY = scene.getProjectionMatrix().m[5];
            return worldWidth
                ? (floats.width * projectionY * scene.getEngine().getRenderHeight()) / (2 * clip.w)
                : floats.width / (2 * clip.w);
        }),
    );
}

describe("one line.width draws one thickness, solid, patterned or curved", () => {
    const drawnGraphs: { graph: Graph; container: HTMLElement }[] = [];

    afterEach(() => {
        for (const { graph, container } of drawnGraphs.splice(0)) {
            graph.dispose();
            container.remove();
        }
    });

    /**
     * Draw one edge ten units long between two fixed nodes, styled with `set`.
     * @param mode - The view mode.
     * @param set - The edge channels to write.
     * @returns The graph and its edge.
     */
    async function oneEdge(mode: "2d" | "3d", set: StaticStyle): Promise<{ graph: Graph; edge: Edge }> {
        const container = document.createElement("div");
        container.style.width = "800px";
        container.style.height = "400px";
        document.body.appendChild(container);
        const graph = new Graph(container);
        drawnGraphs.push({ graph, container });
        await graph.init();
        await graph.setViewMode(mode);
        await graph.addNodes([
            { id: "a", position: { x: -5, y: 0, z: 0 } },
            { id: "b", position: { x: 5, y: 0, z: 0 } },
        ]);
        await graph.addEdges([{ src: "a", dst: "b" }]);
        await graph.setLayout("fixed", { dim: 3 });
        await styleEveryEdge(graph, { "edge.width": LINE_WIDTH, "edge.arrowHead": "none", ...set });
        await operationQueueOf(graph).waitForCompletion();
        await graph.waitForStableFrame();

        const [edge] = graph.getDataManager().edges.values();
        assert(edge, "the edge is drawn");
        return { graph, edge };
    }

    const KINDS: Record<string, StaticStyle> = {
        solid: { "edge.style": "solid" },
        dotted: { "edge.style": "dot" },
        dashed: { "edge.style": "dash" },
        curved: { "edge.style": "solid", "edge.curvature": true },
    };

    test("in 2D, every kind draws the solid line's thickness, and keeps it as the camera zooms", async () => {
        const drawn = await Promise.all(
            Object.entries(KINDS).map(async ([kind, set]) => ({ kind, ...(await oneEdge("2d", set)) })),
        );
        const seen: string[] = [];

        const fitted = drawn[0].graph.getCameraState().zoom ?? 1;
        for (const zoom of [fitted, fitted * 2]) {
            const thickness = new Map<string, number>();
            for (const { kind, graph, edge } of drawn) {
                await graph.setCameraZoom(zoom);
                await graph.waitForStableFrame();
                thickness.set(kind, drawnThicknessPx(graph, edge));
            }

            seen.push(
                `zoom ${String(zoom)}: ${[...thickness].map(([k, px]) => `${k} ${px.toFixed(2)} px`).join(", ")}`,
            );
            const solid = thickness.get("solid") ?? 0;
            assert.isAbove(solid, 1, seen.join("; "));
            for (const [kind, px] of thickness) {
                assert.closeTo(px, solid, Math.max(0.5, solid * 0.05), `${kind}: ${seen.join("; ")}`);
            }
        }
    });

    test("in 3D, a curved edge draws the straight solid edge's thickness", async () => {
        const straight = await oneEdge("3d", KINDS.solid);
        const curved = await oneEdge("3d", KINDS.curved);
        const solid = drawnThicknessPx(straight.graph, straight.edge);
        const curve = drawnThicknessPx(curved.graph, curved.edge);

        assert.isAbove(solid, 0.5);
        assert.closeTo(
            curve,
            solid,
            Math.max(0.5, solid * 0.1),
            `curved ${String(curve)} px, solid ${String(solid)} px`,
        );
    });
});
