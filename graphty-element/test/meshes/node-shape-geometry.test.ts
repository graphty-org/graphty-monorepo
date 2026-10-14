/**
 * @file The geometry behind flat node shapes, node borders and node extents: the outlines, the
 * ring a border is drawn as, and the size every shape is fitted to (issues #2318, #2316, #2317,
 * #2495).
 */
import { type Mesh, NullEngine, Scene, VertexBuffer } from "@babylonjs/core";
import { assert, beforeEach, describe, test } from "vitest";

import { FLAT_NODE_SHAPES, NodeShapes, type NodeStyleConfig } from "../../src/config/NodeStyle";
import { MeshCache } from "../../src/meshes/MeshCache";
import { NODE_EXTENT_PER_SIZE, NodeMesh } from "../../src/meshes/NodeMesh";
import { outlineSlab } from "../../src/meshes/NodeShapeGeometry";
import { borderRing, convexHull, flatShapeOutline, offsetOutline, type Point2 } from "../../src/meshes/shapeOutlines";

/**
 * Twice the signed area of the triangle o, a, b: positive when it turns counter-clockwise.
 * @param o - First corner.
 * @param a - Second corner.
 * @param b - Third corner.
 * @returns The signed doubled area.
 */
function turn(o: Point2, a: Point2, b: Point2): number {
    return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
}

/**
 * The box a set of points fills.
 * @param points - The points.
 * @returns Its width and height.
 */
function boxOf(points: readonly Point2[]): { width: number; height: number } {
    const xs = points.map(([x]) => x);
    const ys = points.map(([, y]) => y);

    return { width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) };
}

describe("flat shape outlines", () => {
    for (const shape of FLAT_NODE_SHAPES) {
        test(`${shape} fills its box and can be fanned from its centre`, () => {
            const outline = flatShapeOutline(shape, 4, 1);
            const box = boxOf(outline);

            assert.isAbove(outline.length, 2);
            assert.approximately(box.width, 4, 1e-9);
            assert.approximately(box.height, 1, 1e-9);

            // Every triangle of the fan from the origin turns the same way, so the face built
            // from it covers the shape once with nothing folded over.
            outline.forEach((point, i) => {
                assert.isAbove(turn([0, 0], point, outline[(i + 1) % outline.length]), 0, `${shape} corner ${i}`);
            });
        });
    }

    test("a rounded rectangle's corners stay round however long it is", () => {
        const outline = flatShapeOutline("round-rectangle", 4, 1);
        // The top edge is straight from x = -(2 - r) to 2 - r with r a quarter of the short side.
        const top = outline.filter(([, y]) => Math.abs(y - 0.5) < 1e-9).map(([x]) => x);

        assert.approximately(Math.max(...top), 2 - 0.25, 1e-9);
    });

    test("a solid's outline is the hull of its points", () => {
        const hull = convexHull([
            [-1, -1],
            [1, -1],
            [0, 0],
            [1, 1],
            [-1, 1],
        ]);

        assert.lengthOf(hull, 4);
    });
});

describe("border rings", () => {
    const square: Point2[] = [
        [-1, -1],
        [1, -1],
        [1, 1],
        [-1, 1],
    ];

    test("an outline offset by a width grows by that width on every side", () => {
        assert.deepEqual(boxOf(offsetOutline(square, 0.25)), { width: 2.5, height: 2.5 });
    });

    test("a solid border is one closed ring outside the outline", () => {
        const [ring, ...rest] = borderRing(square, 0.5, "solid");

        assert.lengthOf(rest, 0);
        assert.isTrue(ring.closed);
        assert.deepEqual(ring.inner, square);
        assert.deepEqual(boxOf(ring.outer), { width: 3, height: 3 });
    });

    test("a double border is two thin rings with a gap between", () => {
        const rings = borderRing(square, 0.3, "double");

        assert.lengthOf(rings, 2);
        assert.approximately(boxOf(rings[0].outer).width, 2.2, 1e-9);
        assert.approximately(boxOf(rings[1].inner).width, 2.4, 1e-9);
    });

    test("dashes and dots are open pieces that leave gaps", () => {
        const dashed = borderRing(square, 0.1, "dashed");
        const dotted = borderRing(square, 0.1, "dotted");

        assert.isAbove(dashed.length, 4);
        assert.isAbove(dotted.length, dashed.length);
        assert.isTrue(dashed.every((piece) => !piece.closed));
    });
});

describe("node extents", () => {
    let scene: Scene;

    beforeEach(() => {
        scene = new Scene(new NullEngine());
    });

    /**
     * Build one node's mesh.
     * @param shape - The shape block.
     * @param is2D - Whether the graph is drawn in 2D.
     * @returns The mesh.
     */
    function build(shape: NonNullable<NodeStyleConfig["shape"]>, is2D = false): Mesh {
        return NodeMesh.createMeshWithoutCache({ styleId: "t", is2D, size: 1 }, { shape }, scene);
    }

    /**
     * A mesh's full size along each axis, and its centre.
     * @param mesh - The mesh.
     * @returns The sizes and the centre.
     */
    function extentOf(mesh: Mesh): { x: number; y: number; z: number; centre: number[] } {
        mesh.refreshBoundingInfo();
        const { extendSize, center } = mesh.getBoundingInfo().boundingBox;

        return { x: extendSize.x * 2, y: extendSize.y * 2, z: extendSize.z * 2, centre: center.asArray() };
    }

    for (const shape of NodeShapes.options) {
        test(`${shape} at one size covers the same extent across the view as every other shape`, () => {
            const { x, y, centre } = extentOf(build({ type: shape, size: 2 }));

            assert.approximately(Math.max(x, y), 2 * NODE_EXTENT_PER_SIZE, 1e-6);
            centre.forEach((value) => {
                assert.approximately(value, 0, 1e-6);
            });
        });
    }

    test("the default shape is drawn exactly as before", () => {
        const { x, y, z } = extentOf(build({ type: "icosphere", size: 1 }));

        assert.approximately(x, 1.5, 1e-6);
        assert.approximately(y, 1.5, 1e-6);
        assert.approximately(z, 1.5, 1e-6);
    });

    test("width and height set the extent along each axis, for a solid and a flat shape", () => {
        for (const type of ["sphere", "round-rectangle"] as const) {
            const { x, y } = extentOf(build({ type, size: 1, width: 4, height: 1 }));

            assert.approximately(x, 4 * NODE_EXTENT_PER_SIZE, 1e-6, type);
            assert.approximately(y, NODE_EXTENT_PER_SIZE, 1e-6, type);
        }
    });

    test("a flat shape is thin in 2D and as deep as it is wide in 3D", () => {
        assert.isBelow(extentOf(build({ type: "diamond", size: 1 }, true)).z, 0.1);
        assert.approximately(extentOf(build({ type: "diamond", size: 1 })).z, NODE_EXTENT_PER_SIZE, 1e-6);
    });

    test("planar draws any shape thin, and depth overrides it", () => {
        assert.isBelow(extentOf(build({ type: "box", size: 1, planar: true })).z, 0.1);
        assert.approximately(extentOf(build({ type: "box", size: 1, depth: 2 })).z, 2 * NODE_EXTENT_PER_SIZE, 1e-6);
    });

    test("a flat shape's front face looks at the 2D camera, which sits at -z", () => {
        const mesh = outlineSlab("t", flatShapeOutline("rectangle", 1, 1), 0.1, scene);
        const positions = mesh.getVerticesData(VertexBuffer.PositionKind) ?? [];
        const normals = mesh.getVerticesData(VertexBuffer.NormalKind) ?? [];
        const frontNormals: number[] = [];

        for (let i = 0; i < positions.length; i += 3) {
            if (Math.abs(positions[i + 2] + 0.05) < 1e-9 && Math.abs(normals[i + 2]) > 0.5) {
                frontNormals.push(normals[i + 2]);
            }
        }

        const sideNormals: number[] = [];

        for (let i = 0; i < positions.length; i += 3) {
            if (Math.abs(positions[i] - 0.5) < 1e-9 && Math.abs(normals[i]) > 0.5) {
                sideNormals.push(normals[i]);
            }
        }

        assert.isNotEmpty(frontNormals);
        assert.isTrue(
            frontNormals.every((z) => z < 0),
            "the front face looks along -z",
        );
        assert.isNotEmpty(sideNormals);
        assert.isTrue(
            sideNormals.every((x) => x > 0),
            "the walls look outward",
        );
    });
});

describe("node borders", () => {
    let scene: Scene;
    let cache: MeshCache;

    beforeEach(() => {
        scene = new Scene(new NullEngine());
        cache = new MeshCache();
    });

    test("no width draws no border", () => {
        const fill = NodeMesh.create(
            cache,
            { styleId: "a", is2D: true, size: 1 },
            { shape: { type: "ellipse" } },
            scene,
        );
        const border = NodeMesh.createBorder(
            cache,
            { styleId: "a", is2D: true, size: 1 },
            { shape: { type: "ellipse", size: 1 }, border: { color: "#ff0000" } },
            fill,
            scene,
        );

        assert.isNull(border);
    });

    for (const type of ["rectangle", "sphere"] as const) {
        test(`a ${type}'s border reaches its width past the outline and is not pickable`, () => {
            const options = { styleId: type, is2D: true, size: 1 };
            const shape = { type, size: 1 };
            const fill = NodeMesh.create(cache, options, { shape }, scene);
            const border = NodeMesh.createBorder(cache, options, { shape, border: { width: 0.2 } }, fill, scene);

            assert.isNotNull(border);
            const { extendSize } = border.sourceMesh.getBoundingInfo().boundingBox;

            assert.approximately(extendSize.x * 2, (1 + 0.4) * NODE_EXTENT_PER_SIZE, 0.02);
            assert.isFalse(border.isPickable);
        });
    }
});
