/**
 * @file In a 3D view, a solid node's border keeps the node's shape on screen at every zoom and camera angle: a
 * sphere's border is drawn round each sphere, never stretched into an oval by another node's perspective (issue
 * #10373). Measured on the meshes: the sphere's outline and its border's outer edge, both projected through the
 * camera, sampled at 16 angles round the node's middle.
 */

import "../../src/graphty-element";

import { type AbstractMesh, type InstancedMesh, Matrix, type Mesh, Vector3, VertexBuffer } from "@babylonjs/core";
import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";
import { convexHull, type Point2 } from "../../src/meshes/shapeOutlines";
import { drag, wheel } from "../helpers/real-input";

const WIDTH = 480;
const HEIGHT = 360;
const ANGLES = 16;

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

/** Spheres spread through the depth of the view, so zooming in brings one close while the others stay far. */
const NODES = [
    { id: "c", position: { x: 0, y: 0, z: 0 } },
    { id: "a", position: { x: 0, y: 9, z: -6 } },
    { id: "b", position: { x: 9, y: -4, z: 5 } },
    { id: "d", position: { x: -8, y: -6, z: -3 } },
    { id: "e", position: { x: -5, y: 7, z: 8 } },
];

/**
 * Solids with a border in a 3D view, settled.
 * @param shape - The nodes' shape.
 * @param extra - More style properties for every node, such as a width that stretches the solids.
 * @returns The element.
 */
async function mounted(shape = "sphere", extra: Record<string, unknown> = {}): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.style.display = "block";
    element.style.width = `${String(WIDTH)}px`;
    element.style.height = `${String(HEIGHT)}px`;
    document.body.appendChild(element);
    cleanups.push(() => {
        element.remove();
    });
    await element.updateComplete;
    await element.setViewMode("3d");
    await operationQueueOf(element.graph).waitForCompletion();
    await element.session.styles.add({
        name: "probe",
        target: "node",
        selector: { match: "everything" },
        set: {
            "node.shape": shape,
            "node.size": 3,
            "node.borderColor": "#0000ff",
            "node.borderWidth": 0.4,
            ...extra,
        },
    });
    await element.session.data.addNodes(NODES);
    await element.graph.setLayout("fixed", { dim: 3 });
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();
    return element;
}

/**
 * A mesh's vertices through the camera, in CSS pixels, with how far in front of the camera each is.
 * @param element - The element.
 * @param mesh - The mesh (an instance's world matrix places its source's vertices).
 * @returns The points, or null when any is behind the camera or off the canvas.
 */
function onScreen(element: Graphty, mesh: AbstractMesh): Point2[] | null {
    const scene = element.graph.getScene();
    const camera = scene.activeCamera;
    assert.isNotNull(camera);
    const engine = scene.getEngine();
    const viewport = camera.viewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight());
    const source: Mesh = (mesh as InstancedMesh).sourceMesh ?? (mesh as Mesh);
    const positions = source.getVerticesData(VertexBuffer.PositionKind) ?? [];
    const world = mesh.computeWorldMatrix(true);
    const view = camera.getViewMatrix();
    const ahead = scene.useRightHandedSystem ? -1 : 1;
    const scale = engine.getHardwareScalingLevel();
    const points: Point2[] = [];
    const at = new Vector3();
    for (let i = 0; i < positions.length; i += 3) {
        Vector3.TransformCoordinatesFromFloatsToRef(positions[i], positions[i + 1], positions[i + 2], world, at);
        if (Vector3.TransformCoordinates(at, view).z * ahead <= camera.minZ) {
            return null;
        }
        const p = Vector3.Project(at, Matrix.Identity(), scene.getTransformMatrix(), viewport);
        if (p.x < 0 || p.y < 0 || p.x > viewport.width || p.y > viewport.height) {
            return null;
        }
        points.push([p.x * scale, p.y * scale]);
    }
    return points;
}

/**
 * How far from a point a convex outline reaches along a direction.
 * @param hull - The outline, a convex polygon round the point.
 * @param center - The point.
 * @param angle - The direction, in radians.
 * @returns The distance.
 */
function reach(hull: Point2[], center: Point2, angle: number): number {
    const [dx, dy] = [Math.cos(angle), Math.sin(angle)];
    let best = 0;
    for (let i = 0; i < hull.length; i++) {
        const [ax, ay] = [hull[i][0] - center[0], hull[i][1] - center[1]];
        const next = hull[(i + 1) % hull.length];
        const [bx, by] = [next[0] - center[0], next[1] - center[1]];
        const [ex, ey] = [bx - ax, by - ay];
        const denominator = dx * ey - dy * ex;
        if (Math.abs(denominator) < 1e-12) {
            continue;
        }
        const t = (ax * ey - ay * ex) / denominator;
        const s = (ax * dy - ay * dx) / denominator;
        if (t > 0 && s >= -1e-9 && s <= 1 + 1e-9) {
            best = Math.max(best, t);
        }
    }
    return best;
}

/** One node's border against its sphere on screen. */
interface Fit {
    id: string;
    /** The sphere's outline: its longest reach over its shortest, of the 16. */
    sphereAspect: number;
    /** The border's outer edge, the same. */
    borderAspect: number;
    /** How far the border reaches past the sphere at each angle, in CSS pixels. */
    widths: number[];
}

/**
 * Every node wholly on screen: its sphere's outline and its border's outer edge, at 16 angles round its middle.
 * @param element - The element.
 * @returns One fit per node on screen.
 */
function fits(element: Graphty): Fit[] {
    const out: Fit[] = [];
    for (const { id } of NODES) {
        const node = element.graph.getDataManager().nodes.get(id);
        assert.isDefined(node);
        const ring = (node as unknown as { border: AbstractMesh | null }).border;
        assert.isNotNull(ring, `node ${id} has a border`);
        const sphere = onScreen(element, node.mesh);
        const border = onScreen(element, ring);
        if (sphere === null || border === null) {
            continue;
        }
        const sphereHull = convexHull(sphere);
        const borderHull = convexHull(border);
        const center: Point2 = [
            sphere.reduce((sum, [x]) => sum + x, 0) / sphere.length,
            sphere.reduce((sum, [, y]) => sum + y, 0) / sphere.length,
        ];
        const angles = Array.from({ length: ANGLES }, (_, i) => (2 * Math.PI * i) / ANGLES);
        const inner = angles.map((angle) => reach(sphereHull, center, angle));
        const outer = angles.map((angle) => reach(borderHull, center, angle));
        out.push({
            id,
            sphereAspect: Math.max(...inner) / Math.min(...inner),
            borderAspect: Math.max(...outer) / Math.min(...outer),
            widths: outer.map((r, i) => r - inner[i]),
        });
    }
    return out;
}

/**
 * Every node on screen has a border that keeps its sphere's shape: it reaches past the sphere at every angle, by
 * about as much at every angle.
 * @param element - The element.
 * @param when - Which view this is, for the messages.
 * @returns How many nodes were measured.
 */
function assertBordersFit(element: Graphty, when: string): number {
    const measured = fits(element);
    for (const fit of measured) {
        const least = Math.min(...fit.widths);
        const most = Math.max(...fit.widths);
        const label = `${when}, node ${fit.id} (sphere aspect ${fit.sphereAspect.toFixed(3)}, border aspect ${fit.borderAspect.toFixed(3)}, widths ${least.toFixed(2)}..${most.toFixed(2)} px)`;
        // the border is never inside the sphere at any angle
        assert.isAbove(least, 0, `${label}: the border shows all round`);
        // a uniform ring: its widest point no more than half again its narrowest, plus a pixel for the facets
        assert.isAtMost(most, least * 1.5 + 1, `${label}: the border is as wide all round`);
        // its outer edge is as round as the sphere, within 5%
        assert.approximately(
            fit.borderAspect,
            fit.sphereAspect,
            0.05 * fit.sphereAspect,
            `${label}: the border keeps the sphere's shape`,
        );
    }
    return measured.length;
}

/**
 * How far a convex outline reaches along a direction: its support.
 * @param hull - The outline.
 * @param nx - The direction's x.
 * @param ny - The direction's y.
 * @returns The largest dot product of a point with the direction.
 */
function support(hull: Point2[], nx: number, ny: number): number {
    return Math.max(...hull.map(([x, y]) => x * nx + y * ny));
}

/**
 * Every node on screen has a border that hugs its own solid: across each side of the solid's outline on screen, the
 * border's outer edge stands off it by about the same width, never less than nothing (issue #10373: one ring shared
 * by the style was built round the nearest node's outline, which off the middle of the view is another polygon).
 * @param element - The element.
 * @param when - Which view this is, for the messages.
 * @returns How many nodes were measured.
 */
function assertBordersHugSolids(element: Graphty, when: string): number {
    let measured = 0;
    for (const { id } of NODES) {
        const node = element.graph.getDataManager().nodes.get(id);
        assert.isDefined(node);
        const ring = (node as unknown as { border: AbstractMesh | null }).border;
        assert.isNotNull(ring, `node ${id} has a border`);
        const solid = onScreen(element, node.mesh);
        const border = onScreen(element, ring);
        if (solid === null || border === null) {
            continue;
        }
        const solidHull = convexHull(solid);
        const borderHull = convexHull(border);
        const widths: number[] = [];
        for (let i = 0; i < solidHull.length; i++) {
            const [a, b] = [solidHull[i], solidHull[(i + 1) % solidHull.length]];
            const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
            if (length < 2) {
                continue;
            }
            // either winding: the side's normal pointing away from the rest of the outline
            let [nx, ny] = [(b[1] - a[1]) / length, (a[0] - b[0]) / length];
            if (support(solidHull, nx, ny) > a[0] * nx + a[1] * ny + 1e-6) {
                [nx, ny] = [-nx, -ny];
            }
            widths.push(support(borderHull, nx, ny) - support(solidHull, nx, ny));
        }
        const least = Math.min(...widths);
        const most = Math.max(...widths);
        const label = `${when}, node ${id} (widths ${least.toFixed(2)}..${most.toFixed(2)} px over ${String(widths.length)} sides)`;
        assert.isAbove(least, 0, `${label}: the border shows past every side`);
        assert.isAtMost(most, least * 1.5 + 1.5, `${label}: the border is as wide past every side`);
        measured++;
    }
    return measured;
}

describe("a solid's border in 3D keeps the node's shape (#10373)", () => {
    it("stays round each sphere zoomed in and from another angle", async () => {
        const element = await mounted();
        const canvas = element.graph.getScene().getEngine().getRenderingCanvas();
        assert.isNotNull(canvas);
        const middle = { x: WIDTH / 2, y: HEIGHT / 2 };

        assert.isAbove(assertBordersFit(element, "framed"), 3, "most nodes are measured framed");

        let measured = 0;
        for (const step of [1, 2, 3]) {
            for (let i = 0; i < 4; i++) {
                await wheel(canvas, middle, -120);
            }
            await element.waitForStableFrame();
            measured += assertBordersFit(element, `zoomed in ${String(step)}`);
        }

        // turn the camera with a drag across empty canvas, then zoom in further
        await drag(canvas, { x: 20, y: HEIGHT - 20 }, { x: 140, y: HEIGHT - 60 });
        await element.waitForStableFrame();
        measured += assertBordersFit(element, "turned");
        for (let i = 0; i < 4; i++) {
            await wheel(canvas, middle, -120);
        }
        await element.waitForStableFrame();
        measured += assertBordersFit(element, "turned and zoomed in");
        assert.isAbove(measured, 4, "nodes were measured zoomed in");
    });

    it("hugs each box zoomed in, not the nearest box's outline", async () => {
        const element = await mounted("box");
        const canvas = element.graph.getScene().getEngine().getRenderingCanvas();
        assert.isNotNull(canvas);
        const middle = { x: WIDTH / 2, y: HEIGHT / 2 };

        let measured = assertBordersHugSolids(element, "framed");
        for (const step of [1, 2, 3]) {
            for (let i = 0; i < 4; i++) {
                await wheel(canvas, middle, -120);
            }
            await element.waitForStableFrame();
            measured += assertBordersHugSolids(element, `zoomed in ${String(step)}`);
        }
        await drag(canvas, { x: 20, y: HEIGHT - 20 }, { x: 140, y: HEIGHT - 60 });
        await element.waitForStableFrame();
        measured += assertBordersHugSolids(element, "turned");
        assert.isAbove(measured, 8, "boxes were measured");
    });

    it("stays round each stretched sphere, not only the nearest", async () => {
        // a sphere wider than it is tall is an ellipsoid: it shows each node's line of sight its own outline, so one
        // ring shared by the style fitted only the node nearest the camera (issue #10495)
        const element = await mounted("sphere", { "node.width": 1.6 * 3 });
        const canvas = element.graph.getScene().getEngine().getRenderingCanvas();
        assert.isNotNull(canvas);
        const middle = { x: WIDTH / 2, y: HEIGHT / 2 };

        let measured = assertBordersHugSolids(element, "framed");
        for (let i = 0; i < 4; i++) {
            await wheel(canvas, middle, -120);
        }
        await element.waitForStableFrame();
        measured += assertBordersHugSolids(element, "zoomed in");
        await drag(canvas, { x: 20, y: HEIGHT - 20 }, { x: 140, y: HEIGHT - 60 });
        await element.waitForStableFrame();
        measured += assertBordersHugSolids(element, "turned");
        assert.isAbove(measured, 4, "nodes were measured");
    });
});
