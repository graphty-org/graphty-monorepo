/**
 * @file In 3D an inside border on a solid is drawn over the solid's own edge, as an inside stroke is drawn over a fill:
 * the solid keeps its plain size, the ring's outer edge is the outline the camera sees and its inner edge is that
 * outline drawn in by the border's width, and the ring is in front of the solid from every angle. Shrinking the solid
 * to sit inside the ring matched the ring only from some angles: a cone's, a dipyramid's or a box's shrunk outline is
 * not its plain one drawn in side by side, so the band showed wider or narrower than the border (issue #10438).
 *
 * Everything is measured through the camera: each vertex is projected onto the plane through the node's middle,
 * square to the view, by the line from the camera (its screen position times the middle's distance), so a width there
 * is the width a reader sees at the node.
 */
import {
    type AbstractMesh,
    FreeCamera,
    InstancedMesh,
    type Matrix,
    type Mesh,
    NullEngine,
    Scene,
    TransformNode,
    Vector3,
    VertexBuffer,
} from "@babylonjs/core";
import { afterEach, assert, beforeEach, describe, test } from "vitest";

import type { NodeStyleConfig } from "../../src/config/NodeStyle";
import { MeshCache } from "../../src/meshes/MeshCache";
import { NODE_EXTENT_PER_SIZE, NodeMesh } from "../../src/meshes/NodeMesh";
import { convexHull, type Point2 } from "../../src/meshes/shapeOutlines";

let scene: Scene;
let cache: MeshCache;

beforeEach(() => {
    scene = new Scene(new NullEngine());
    cache = new MeshCache();
});

afterEach(() => {
    scene.getEngine().dispose();
});

/** A vertex seen through the camera: on the node's middle plane, and how far it is along the line to the node. */
interface Seen {
    p: Point2;
    z: number;
}

/**
 * @param mesh - A mesh or an instance of one.
 * @param middle - How far along the view the node's middle is.
 * @param world - Where it is drawn in the world: a node's mesh is drawn where its node is, a ring where its
 *   instance was last drawn (turned to the camera).
 * @param toward - Which way the node's middle is from the camera, in the camera's view; straight ahead by default.
 * @returns Its vertices seen through the active camera.
 */
function seen(mesh: AbstractMesh, middle: number, world: Matrix, toward = new Vector3(0, 0, 1)): Seen[] {
    const source = mesh instanceof InstancedMesh ? mesh.sourceMesh : (mesh as Mesh);
    const positions = source.getVerticesData(VertexBuffer.PositionKind) ?? [];
    const toView = world.multiply(scene.activeCamera?.getViewMatrix() ?? assert.fail("no camera"));
    return Array.from({ length: positions.length / 3 }, (_, i): Seen => {
        const v = Vector3.TransformCoordinates(Vector3.FromArray(positions, 3 * i), toView);
        return { p: [(v.x / v.z) * middle, (v.y / v.z) * middle], z: Vector3.Dot(v, toward) };
    });
}

/**
 * @param points - Some points.
 * @param n - A unit direction.
 * @returns How far they reach along it.
 */
function reach(points: readonly Point2[], n: Point2): number {
    return Math.max(...points.map(([x, y]) => x * n[0] + y * n[1]));
}

/**
 * @param p - A point.
 * @param outline - A convex outline.
 * @returns How far the point is from the outline's edge.
 */
function toEdge(p: Point2, outline: readonly Point2[]): number {
    return Math.min(
        ...outline.map((a, i) => {
            const b = outline[(i + 1) % outline.length];
            const [ex, ey] = [b[0] - a[0], b[1] - a[1]];
            const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * ex + (p[1] - a[1]) * ey) / (ex * ex + ey * ey || 1)));
            return Math.hypot(p[0] - a[0] - t * ex, p[1] - a[1] - t * ey);
        }),
    );
}

/**
 * The sides of a convex outline that are still there once it is drawn in by `width` side by side, found exactly: the
 * drawn-in outline is what is left of the outline inside every side's line moved in by `width`, and a side is kept
 * when its moved line still bounds that. Along a kept side's normal, the outline and its inset are `width` apart.
 * @param outline - A convex outline, counter-clockwise or clockwise, with no point twice.
 * @param width - How far it is drawn in.
 * @returns Each kept side's outward unit normal.
 */
function keptNormals(outline: readonly Point2[], width: number): Point2[] {
    const count = outline.length;
    const turn = outline.reduce(
        (sum, [x, y], i) => sum + x * outline[(i + 1) % count][1] - outline[(i + 1) % count][0] * y,
        0,
    );
    const normals = outline.map(([x, y], i): Point2 => {
        const [ex, ey] = [outline[(i + 1) % count][0] - x, outline[(i + 1) % count][1] - y];
        const length = Math.hypot(ex, ey);
        return turn > 0 ? [ey / length, -ex / length] : [-ey / length, ex / length];
    });
    // each side's line moved in: n . p <= n . a - width
    const limits = normals.map((n, i) => n[0] * outline[i][0] + n[1] * outline[i][1] - width);
    let inset: Point2[] = [...outline];
    for (const [k, n] of normals.entries()) {
        const over = (p: Point2): number => n[0] * p[0] + n[1] * p[1] - limits[k];
        inset = inset.flatMap((p, i) => {
            const q = inset[(i + 1) % inset.length];
            const [a, b] = [over(p), over(q)];
            const kept: Point2[] = a <= 0 ? [p] : [];
            if ((a < 0 && b > 0) || (a > 0 && b < 0)) {
                const t = a / (a - b);
                kept.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]);
            }
            return kept;
        });
    }
    const scale = Math.max(...outline.map(([x, y]) => Math.hypot(x, y)));
    return normals.filter((n, k) => Math.abs(reach(inset, n) - limits[k]) < 1e-9 * scale && inset.length > 2);
}

const SHAPES = ["cone", "octahedron", "triangular_dipyramid", "pentagonal_pyramid", "cylinder", "box"] as const;
const CAMERAS = [new Vector3(0.8, 1.1, -4), new Vector3(-3.2, -1.4, -2.2), new Vector3(1.2, 3.6, 1.6)];

describe("an inside border on a 3D solid is drawn over its plain fill's edge from every angle (#10438)", () => {
    for (const type of SHAPES) {
        for (const [k, position] of CAMERAS.entries()) {
            test(`a ${type} seen from camera ${String(k)}`, () => {
                const camera = new FreeCamera("camera", position, scene);
                camera.setTarget(Vector3.Zero());
                scene.activeCamera = camera;
                const width = 0.1 * NODE_EXTENT_PER_SIZE;
                const shape: NodeStyleConfig["shape"] = { type, size: 1 };
                const border = { width: 0.1, position: "inside" as const, color: "#0000ff" };
                const options = { styleId: `${type}-over-${String(k)}`, is2D: false, size: 1 };
                const node = new TransformNode("node", scene);
                const fill = NodeMesh.create(cache, options, { shape, border }, scene);
                const ring = NodeMesh.createBorder(cache, options, { shape, border }, fill, scene);
                assert.exists(ring);
                // on the node, as the graph puts them (the cache keeps its source meshes out of sight)
                for (const mesh of [fill, ring]) {
                    mesh.parent = node;
                    mesh.position.setAll(0);
                }
                scene.render();
                scene.render();

                // the node's middle is straight ahead of the camera
                const middle = position.length();
                const fillSeen = seen(fill, middle, node.computeWorldMatrix(true));
                const plain = NodeMesh.create(cache, { ...options, styleId: `${type}-plain` }, { shape }, scene);
                const plainHull = convexHull(seen(plain, middle, node.computeWorldMatrix(true)).map(({ p }) => p));
                const fillHull = convexHull(fillSeen.map(({ p }) => p));
                const ringSeen = seen(ring, middle, ring.getWorldMatrix());

                // in front of the whole solid, so it covers the fill's edge; and only just, so a node nearer the
                // camera still covers it
                const nearestFill = Math.min(...fillSeen.map(({ z }) => z));
                const zs = ringSeen.map(({ z }) => z);
                const ringDepth = Math.max(...zs) - Math.min(...zs);
                assert.isBelow(Math.max(...zs), nearestFill, "the ring is in front of the solid");
                assert.isAbove(Math.min(...zs), nearestFill - 3 * ringDepth, "the ring is just in front of the solid");
                assert.strictEqual(ring.sourceMesh.renderingGroupId, fill.renderingGroupId, "drawn with the graph");

                // the ring's far face (its near face is a hair larger): outer edge and inner edge
                const far = ringSeen.filter(({ z }) => z > Math.min(...zs) + ringDepth / 2).map(({ p }) => p);
                const outer = convexHull(far);
                const inner = far.filter((p) => toEdge(p, outer) > 1e-6);
                assert.isNotEmpty(inner, "the ring has an inner edge");

                const tolerance = 1e-4;
                const normals = keptNormals(
                    plainHull.filter(
                        (p, i) =>
                            Math.hypot(
                                p[0] - plainHull[(i + 1) % plainHull.length][0],
                                p[1] - plainHull[(i + 1) % plainHull.length][1],
                            ) > 1e-6,
                    ),
                    width,
                );
                assert.isNotEmpty(normals);
                for (const n of normals) {
                    const at = `along (${n[0].toFixed(3)}, ${n[1].toFixed(3)})`;
                    // the fill is the plain solid, and the ring ends on the outline the camera sees
                    assert.approximately(reach(fillHull, n), reach(plainHull, n), tolerance, `fill's edge ${at}`);
                    assert.approximately(reach(outer, n), reach(plainHull, n), tolerance, `ring's outer edge ${at}`);
                    // past the fill that shows (inside the ring's inner edge), the band is the border's width
                    const shown = Math.min(reach(fillHull, n), reach(inner, n));
                    assert.approximately(reach(outer, n) - shown, width, tolerance, `band ${at}`);
                }
            });
        }
    }
});

describe("each node's ring drawn over its fill is built round the outline that node shows (#10438)", () => {
    // one ring shared by a style is built round the nearest node's outline; a node of the style seen from another
    // direction shows another outline, and its fill showed past the ring
    for (const type of ["pentagonal_prism", "octahedron"] as const) {
        test(`two ${type} nodes of one style, one off to the side and further away`, () => {
            const camera = new FreeCamera("camera", new Vector3(0.8, 1.1, -4), scene);
            camera.setTarget(Vector3.Zero());
            scene.activeCamera = camera;
            const shape: NodeStyleConfig["shape"] = { type, size: 1 };
            const border = { width: 0.1, position: "inside" as const, color: "#0000ff" };
            const options = { styleId: `${type}-two`, is2D: false, size: 1 };
            const drawnAt = [Vector3.Zero(), new Vector3(2.6, -0.8, 2.5)].map((position) => {
                const node = new TransformNode("node", scene);
                node.position.copyFrom(position);
                const fill = NodeMesh.create(cache, options, { shape, border }, scene);
                const ring = NodeMesh.createBorder(cache, options, { shape, border }, fill, scene);
                assert.exists(ring);
                for (const mesh of [fill, ring]) {
                    mesh.parent = node;
                    mesh.position.setAll(0);
                }
                return { node, fill, ring };
            });
            scene.render();
            scene.render();

            const view = camera.getViewMatrix();
            for (const [k, { node, fill, ring }] of drawnAt.entries()) {
                // on the screen, as x / z and y / z; the ring faces the line to its node, so its far face is the one
                // further along that line
                const toward = Vector3.TransformCoordinates(node.getAbsolutePosition(), view).normalize();
                const fillHull = convexHull(seen(fill, 1, node.computeWorldMatrix(true)).map(({ p }) => p));
                const ringSeen = seen(ring, 1, ring.getWorldMatrix(), toward);
                const zs = ringSeen.map(({ z }) => z);
                const far = ringSeen.filter(({ z }) => z > (Math.min(...zs) + Math.max(...zs)) / 2).map(({ p }) => p);
                const outer = convexHull(far);
                const size = Math.max(...fillHull.map(([x, y]) => Math.hypot(x, y)));
                for (const n of keptNormals(fillHull, 0)) {
                    assert.approximately(
                        reach(outer, n),
                        reach(fillHull, n),
                        1e-4 * size,
                        `node ${String(k)}'s ring along (${n[0].toFixed(3)}, ${n[1].toFixed(3)})`,
                    );
                }
            }
        });
    }
});

describe("a 3D solid's ring reaches only the border's outer edge past its plain fill (#10438)", () => {
    // what an edge stops at and a halo starts from: the fill keeps its plain size, so an inside ring reaches no further
    // than its outline, and a centered one half its width past it
    const width = 0.1 * NODE_EXTENT_PER_SIZE;
    const fit = (type: string, position: "inside" | "center", is2D: boolean): { inset: number; ring: number } => {
        const shape = { type, size: 1 };
        return NodeMesh.drawnFit(shape, { width: 0.1, position }, NodeMesh.extentsOf(shape, 1), is2D);
    };

    test("a solid in 3D", () => {
        assert.deepEqual(fit("cone", "inside", false), { inset: 0, ring: 0 });
        const centered = fit("box", "center", false);
        assert.strictEqual(centered.inset, 0);
        assert.approximately(centered.ring, width / 2, 1e-12);
    });

    test("a solid in 2D, and a flat shape in 3D, are drawn in as before", () => {
        for (const [type, is2D] of [
            ["cone", true],
            ["ellipse", false],
        ] as const) {
            const shape = { type, size: 1 };
            const border = { width: 0.1, position: "inside" as const };
            assert.deepEqual(
                fit(type, "inside", is2D),
                NodeMesh.borderFit(shape, border, NodeMesh.extentsOf(shape, 1)),
                `${type} ${is2D ? "2D" : "3D"}`,
            );
        }
    });
});
