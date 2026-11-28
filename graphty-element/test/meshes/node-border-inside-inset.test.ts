/**
 * @file A border inside (or centered on) a flat shape's size is a band inset from the shape's own outline: its
 * outer edge is on the outline and the fill is drawn in by the border's width on every side. Scaling the shape down
 * about its box's center instead put a triangle's, a star's or a vee's ring well past the node's outline and left a
 * pentagon's fill low inside it (issue #10408).
 */
import { type AbstractMesh, InstancedMesh, type Mesh, NullEngine, Scene, VertexBuffer } from "@babylonjs/core";
import { afterEach, assert, beforeEach, test } from "vitest";

import { MeshCache } from "../../src/meshes/MeshCache";
import { NodeMesh } from "../../src/meshes/NodeMesh";

type P = [number, number];

let scene: Scene;
let cache: MeshCache;

beforeEach(() => {
    scene = new Scene(new NullEngine());
    cache = new MeshCache();
});

afterEach(() => {
    scene.getEngine().dispose();
});

function segmentDistance(p: P, a: P, b: P): number {
    const [dx, dy] = [b[0] - a[0], b[1] - a[1]];
    const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy || 1)));

    return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
}

/**
 * @param p - A point.
 * @param poly - A closed outline.
 * @returns How far the point is past the outline: negative inside it.
 */
function signedDistance(p: P, poly: readonly P[]): number {
    let distance = Infinity;
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        distance = Math.min(distance, segmentDistance(p, poly[j], poly[i]));
        const [[xi, yi], [xj, yj]] = [poly[i], poly[j]];
        if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) {
            inside = !inside;
        }
    }

    return inside ? -distance : distance;
}

/**
 * @param mesh - A fill mesh.
 * @returns The area its triangles cover seen along z: its walls cover none, so 0 when it has no face.
 */
function faceArea(mesh: AbstractMesh): number {
    const source = mesh instanceof InstancedMesh ? mesh.sourceMesh : (mesh as Mesh);
    const p = source.getVerticesData(VertexBuffer.PositionKind) ?? [];
    const index = source.getIndices() ?? [];
    let area = 0;
    for (let t = 0; t < index.length; t += 3) {
        const [a, b, c] = [index[t] * 3, index[t + 1] * 3, index[t + 2] * 3];
        area += Math.abs((p[b] - p[a]) * (p[c + 1] - p[a + 1]) - (p[c] - p[a]) * (p[b + 1] - p[a + 1])) / 2;
    }

    return area;
}

function vertices(mesh: AbstractMesh): P[] {
    const source = mesh instanceof InstancedMesh ? mesh.sourceMesh : (mesh as Mesh);
    const positions = source.getVerticesData(VertexBuffer.PositionKind) ?? [];
    const out: P[] = [];
    for (let i = 0; i < positions.length; i += 3) {
        out.push([positions[i], positions[i + 1]]);
    }

    return out;
}

const size = 36;
const width = 0.2 * size;
const tolerance = 0.01 * size;
// the border's width in world units: a shape's size, and its border's width, are drawn 1.5 world units each
const world = width * NodeMesh.extentPerSize({});

// star and vee are narrower than twice the border, so their fill closes up: only the ring's reach is checked
for (const type of [
    "triangle",
    "pentagon",
    "diamond",
    "house",
    "round-triangle",
    "round-pentagon",
    "parallelogram",
    "ellipse",
    "rectangle",
    "star",
    "vee",
] as const) {
    test(`an inside border on a ${type} stays inside its outline and insets its fill by its width`, () => {
        const options = { styleId: `inside-${type}`, is2D: true, size };
        const shape = { type, size };
        const border = { width, position: "inside" as const };
        const bare = NodeMesh.create(cache, { ...options, styleId: `bare-${type}` }, { shape }, scene);
        const silhouette = NodeMesh.faceOf({ shape }, size, bare).outline as P[];
        const fill = NodeMesh.create(cache, options, { shape, border }, scene);
        const ring = NodeMesh.createBorder(cache, options, { shape, border }, fill, scene);
        assert.exists(ring);

        const past = Math.max(...vertices(ring).map((p) => signedDistance(p, silhouette)));
        assert.isAtMost(past, tolerance, `${type} ring reaches ${past.toFixed(3)} past its outline`);

        if (type === "star" || type === "vee") {
            return;
        }

        // the fill keeps its face: an outline with a closed-up corner's points repeated could not be cut into triangles
        assert.isAbove(faceArea(fill), 0.1 * faceArea(bare), `${type} fill has lost its face`);

        const inset = Math.min(...vertices(fill).map((p) => -signedDistance(p, silhouette)));
        assert.isAtLeast(inset, world - tolerance, `${type} fill is only ${inset.toFixed(3)} in from its outline`);
    });
}

for (const type of ["triangle", "pentagon", "diamond"] as const) {
    test(`a centered border on a ${type} reaches half its width past its outline, no more`, () => {
        const options = { styleId: `center-${type}`, is2D: true, size };
        const shape = { type, size };
        const border = { width, position: "center" as const };
        const bare = NodeMesh.create(cache, { ...options, styleId: `bare-c-${type}` }, { shape }, scene);
        const silhouette = NodeMesh.faceOf({ shape }, size, bare).outline as P[];
        const fill = NodeMesh.create(cache, options, { shape, border }, scene);
        const ring = NodeMesh.createBorder(cache, options, { shape, border }, fill, scene);
        assert.exists(ring);

        const past = Math.max(...vertices(ring).map((p) => signedDistance(p, silhouette)));
        // a sharp corner's outer edge is cut at three times the reach, so nothing past it, and the sides at half
        assert.isAtMost(past, (3 * world) / 2 + tolerance);
        const inset = Math.min(...vertices(fill).map((p) => -signedDistance(p, silhouette)));
        assert.isAtLeast(inset, world / 2 - tolerance, `${type} fill is only ${inset.toFixed(3)} in`);
    });
}

for (const style of ["dashed", "dotted", "double"] as const) {
    for (const type of ["star", "round-triangle", "triangle"] as const) {
        test(`a ${style} inside border on a ${type} is drawn out to its outline and no further`, () => {
            const options = { styleId: `inside-${style}-${type}`, is2D: true, size };
            const shape = { type, size };
            const border = { width, position: "inside" as const, style };
            const bare = NodeMesh.create(cache, { ...options, styleId: `bare-${style}-${type}` }, { shape }, scene);
            const silhouette = NodeMesh.faceOf({ shape }, size, bare).outline as P[];
            const fill = NodeMesh.create(cache, options, { shape, border }, scene);
            const ring = NodeMesh.createBorder(cache, options, { shape, border }, fill, scene);
            assert.exists(ring);

            const points = vertices(ring);
            const past = Math.max(...points.map((p) => signedDistance(p, silhouette)));
            assert.isAtMost(past, tolerance, `${type} ring reaches ${past.toFixed(3)} past its outline`);
            // it reaches the shape's far corners (a star's tips), not a blob round a closed-up fill
            const far = (list: readonly P[]): number => Math.max(...list.map(([x, y]) => Math.hypot(x, y)));
            assert.isAtLeast(far(points), 0.9 * far(silhouette), `${type} ring stops short of its corners`);
        });
    }
}

for (const type of ["star", "triangle", "round-pentagon"] as const) {
    test(`an inside border on a ${type} leaves where its edges end unchanged`, () => {
        const options = { styleId: `reach-${type}`, is2D: true, size };
        const shape = { type, size };
        const border = { width, position: "inside" as const };
        const fill = NodeMesh.create(cache, options, { shape, border }, scene);

        assert.deepEqual(
            NodeMesh.reachOutlineOf({ shape, border }, size, fill),
            NodeMesh.reachOutlineOf({ shape }, size, fill),
        );
    });
}

for (const type of ["star", "vee", "triangle"] as const) {
    test(`the outer border round a ${type} with a wide inside border stays outside its outline`, () => {
        const options = { styleId: `outer-inside-${type}`, is2D: true, size };
        const shape = { type, size };
        const border = { width, position: "inside" as const };
        const bare = NodeMesh.create(cache, { ...options, styleId: `bare-o-${type}` }, { shape }, scene);
        const silhouette = NodeMesh.faceOf({ shape }, size, bare).outline as P[];
        const fill = NodeMesh.create(cache, options, { shape, border }, scene);
        const outer = NodeMesh.createOuterBorder(
            cache,
            options,
            { shape, border, outerBorder: { width: 0.2 * size, offset: 0 } },
            fill,
            scene,
        );
        assert.exists(outer);

        // offset from the drawn-in fill, which folds over itself where the border is wider than an arm, the ring
        // crossed back over the node's middle
        const within = Math.max(...vertices(outer).map((p) => -signedDistance(p, silhouette)));
        assert.isAtMost(within, tolerance, `${type} outer border reaches ${within.toFixed(3)} inside its outline`);
    });
}
