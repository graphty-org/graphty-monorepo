/**
 * @file The geometry behind flat node shapes, node borders and node extents: the outlines, the
 * ring a border is drawn as, and the size every shape is fitted to (issues #2318, #2316, #2317,
 * #2495).
 */
import { type Mesh, NullEngine, Scene, VertexBuffer } from "@babylonjs/core";
import { afterEach, assert, beforeEach, describe, test } from "vitest";

import { FLAT_NODE_SHAPES, NodeShapes, type NodeStyleConfig } from "../../src/config/NodeStyle";
import { MeshCache } from "../../src/meshes/MeshCache";
import { NODE_EXTENT_PER_SIZE, NodeMesh } from "../../src/meshes/NodeMesh";
import { outlineSlab } from "../../src/meshes/NodeShapeGeometry";
import {
    borderRing,
    convexHull,
    earClip,
    fansFromOrigin,
    flatShapeOutline,
    offsetOutline,
    type Point2,
} from "../../src/meshes/shapeOutlines";

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

/** The figures, whose heads cannot be seen from their middles past their shoulders. */
const FIGURES = new Set(["man", "woman"]);

/** The polygons drawn with rounded corners, which stay inside their box rather than fill it. */
const ROUNDED = new Set([
    "round-triangle",
    "round-diamond",
    "round-pentagon",
    "round-hexagon",
    "round-octagon",
    "round-polygon",
]);

/**
 * The area inside an outline (shoelace), positive when it runs counter-clockwise.
 * @param outline - The outline.
 * @returns The area.
 */
function areaOf(outline: readonly Point2[]): number {
    return outline.reduce((sum, point, i) => sum + turn([0, 0], point, outline[(i + 1) % outline.length]), 0) / 2;
}

describe("flat shape outlines", () => {
    let slab: Scene | null = null;
    const slabScene = (): Scene => (slab = new Scene(new NullEngine()));
    afterEach(() => {
        slab?.getEngine().dispose();
        slab = null;
    });

    for (const shape of FLAT_NODE_SHAPES.filter((name) => !FIGURES.has(name) && !ROUNDED.has(name))) {
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

    for (const shape of FIGURES) {
        test(`${shape} fills its box and is cut into triangles that cover it once`, () => {
            const outline = flatShapeOutline(shape, 4, 1);
            const box = boxOf(outline);
            const triangles = earClip(outline);

            assert.approximately(box.width, 4, 1e-9);
            assert.approximately(box.height, 1, 1e-9);
            assert.isFalse(fansFromOrigin(outline), `${shape} cannot be fanned`);
            assert.lengthOf(triangles, outline.length - 2, `${shape} is clipped to the last ear`);
            for (const [a, b, c] of triangles) {
                assert.isAbove(turn(outline[a], outline[b], outline[c]), 0, `${shape} triangle ${a} ${b} ${c}`);
            }
            const covered = triangles.reduce((sum, [a, b, c]) => sum + turn(outline[a], outline[b], outline[c]) / 2, 0);
            assert.approximately(covered, areaOf(outline), 1e-9);
        });
    }

    for (const shape of ROUNDED) {
        test(`${shape} keeps inside its box, its corners cut back by arcs of the corner radius`, () => {
            const sharp = flatShapeOutline(shape.slice("round-".length), 40, 30, undefined, "0,1 1,-1 -1,-1");
            const outline = flatShapeOutline(shape, 40, 30, undefined, "0,1 1,-1 -1,-1");
            const box = boxOf(outline);

            assert.isAbove(outline.length, sharp.length, `${shape} has more points than its corners`);
            assert.isAtMost(box.width, 40 + 1e-9);
            assert.isAtMost(box.height, 30 + 1e-9);
            // no corner of the sharp polygon is on the rounded one: each is cut back
            for (const [x, y] of sharp) {
                const nearest = Math.min(...outline.map(([u, v]) => Math.hypot(u - x, v - y)));
                assert.isAbove(nearest, 0.1, `${shape} corner ${String(x)},${String(y)} is rounded`);
            }
            assert.isAbove(areaOf(outline), 0);
            assert.isBelow(areaOf(outline), areaOf(sharp));
        });
    }

    test("a rounded corner is an arc of the radius tangent to both sides", () => {
        // a 20-wide square's corner rounded by 2, halved: the arc's points are 1 from (4, 4)
        const outline = flatShapeOutline("round-polygon", 20, 20, 2, "1,1 -1,1 -1,-1 1,-1").map(([x, y]): Point2 => [
            x / 2,
            y / 2,
        ]);
        const corner = outline.filter(([x, y]) => x > 3 + 1e-9 && y > 3 + 1e-9);
        assert.isAbove(corner.length, 2);
        for (const [x, y] of corner) {
            assert.approximately(Math.hypot(x - 4, y - 4), 1, 1e-9);
        }
        // never more than a tenth of the shorter side, set or unset
        assert.deepEqual(
            flatShapeOutline("round-polygon", 20, 20, 9, "1,1 -1,1 -1,-1 1,-1"),
            flatShapeOutline("round-polygon", 20, 20, undefined, "1,1 -1,1 -1,-1 1,-1"),
        );
        const auto = flatShapeOutline("round-polygon", 10, 20, undefined, "1,1 -1,1 -1,-1 1,-1");
        // a radius of 1: the top right corner (5, 10) becomes an arc round (4, 9)
        assert.approximately(Math.max(...auto.map(([x, y]) => x + y)), 4 + 9 + Math.SQRT2, 1e-6);
    });

    test("a barrel and a database fill their box but not its corners", () => {
        for (const shape of ["barrel", "database"]) {
            const outline = flatShapeOutline(shape, 40, 30);
            assert.deepEqual(boxOf(outline), { width: 40, height: 30 }, shape);
            const corner = Math.min(...outline.map(([x, y]) => Math.hypot(x - 20, y - 15)));
            assert.isAbove(corner, 1, `${shape} cuts its corner`);
            assert.isBelow(areaOf(outline), 40 * 30);
            assert.isAbove(areaOf(outline), 0.85 * 40 * 30, `${shape} fills most of its box`);
        }
    });

    test("a polygon keeps its corners where they are around its centre, the farthest reaching its sides", () => {
        // clockwise and lopsided: read counter-clockwise, stretched about the centre and not re-centred
        const outline = flatShapeOutline("polygon", 8, 2, undefined, "2,0 -1,-1 -1,0.5");
        assert.deepEqual(
            outline.map(([x, y]) => [x + 0, y + 0]),
            [
                [-2, 0.5],
                [-2, -1],
                [4, 0],
            ],
        );
        assert.isAbove(areaOf(outline), 0);
        // corners that are not pairs of numbers draw the polygon as its box
        assert.deepEqual(boxOf(flatShapeOutline("polygon", 4, 2, undefined, "1,1 x,2 0,0")), { width: 4, height: 2 });
    });

    test("a polygon not stretched keeps its corners where they say, inside the ellipse of its box", () => {
        // OGDF's hexagon in a 48 x 36 box: its corners on the box's ellipse, so 48 wide and 36 * sqrt(3) / 2 high
        const hexagon = "1,0 0.5,0.866 -0.5,0.866 -1,0 -0.5,-0.866 0.5,-0.866";
        const box = boxOf(flatShapeOutline("polygon", 48, 36, undefined, hexagon, false));
        assert.closeTo(box.width, 48, 1e-9);
        assert.closeTo(box.height, 36 * 0.866, 1e-9);
        // stretched, the same corners fill the box
        assert.closeTo(boxOf(flatShapeOutline("polygon", 48, 36, undefined, hexagon)).height, 36, 1e-9);
        // a regular triangle stays off-center in its box, its base above the box's bottom
        const triangle = flatShapeOutline("polygon", 48, 36, undefined, "0,1 0.866,-0.5 -0.866,-0.5", false);
        assert.closeTo(Math.min(...triangle.map(([, y]) => y)), -9, 1e-9);
        assert.closeTo(Math.max(...triangle.map(([x]) => x)), 24 * 0.866, 1e-9);
    });

    test("a polygon's corners may add a length to their fraction, kept whatever the box's size", () => {
        // a bar 24 long against the left side, as Graphviz draws a five-prime overhang's
        for (const width of [100, 200]) {
            const bar = flatShapeOutline("polygon", width, 20, undefined, "-1,0 -1+24,0 -1+24,1 -1,1", false);
            const xs = bar.map(([x]) => x);
            assert.closeTo(Math.min(...xs), -width / 2, 1e-9);
            assert.closeTo(Math.max(...xs), -width / 2 + 24, 1e-9);
            assert.isAbove(areaOf(bar), 0);
        }
    });

    test("a node with no body takes up its box and has no face", () => {
        const outline = flatShapeOutline("none", 4, 1);
        assert.deepEqual(boxOf(outline), { width: 4, height: 1 });

        const scene = new Scene(new NullEngine());
        const mesh = NodeMesh.create(
            new MeshCache(),
            { styleId: "bodiless", is2D: true, size: 1 },
            { shape: { type: "none", width: 4, height: 1 } },
            scene,
        );
        const source = "sourceMesh" in mesh ? (mesh.sourceMesh as Mesh) : (mesh as Mesh);
        assert.strictEqual(source.getTotalIndices(), 0);
        assert.isAbove(source.getBoundingInfo().boundingBox.extendSize.x, 0);
        scene.getEngine().dispose();
    });

    test("a figure's slab is ear-clipped: its front face covers the figure's area once", () => {
        const outline = flatShapeOutline("woman", 2, 3);
        const mesh = outlineSlab("woman", outline, 0.1, slabScene());
        const positions = mesh.getVerticesData(VertexBuffer.PositionKind) ?? [];
        const indices = mesh.getIndices() ?? [];
        let front = 0;
        for (let i = 0; i < indices.length; i += 3) {
            const [a, b, c] = [indices[i], indices[i + 1], indices[i + 2]].map((v): Point2 => [
                positions[3 * v],
                positions[3 * v + 1],
            ]);
            const zs = [indices[i], indices[i + 1], indices[i + 2]].map((v) => positions[3 * v + 2]);
            if (zs.every((z) => z < 0)) {
                front += turn(a, b, c) / 2;
            }
        }
        assert.approximately(Math.abs(front), areaOf(outline), 1e-6);
    });

    test("a man and a woman are Pajek's own figures: slender, legs apart, filling their box", () => {
        // Pajek 6.02's SVG export: the man's path fills 0.625 of its box, the woman's, in her skirt, 0.512
        // (the figures drawn before filled 0.559 and 0.526)
        for (const [shape, share] of [
            ["man", 0.625],
            ["woman", 0.512],
        ] as const) {
            const outline = flatShapeOutline(shape, 2, 2);
            const box = boxOf(outline);
            assert.approximately(box.width, 2, 1e-9);
            assert.approximately(box.height, 2, 1e-9);
            assert.approximately(areaOf(outline) / 4, share, 0.005, shape);
            assert.isAbove(areaOf(outline), 0, `${shape} runs counter-clockwise`);
        }
        // the gap between the man's legs, at his feet's height, is outside him
        const man = flatShapeOutline("man", 2, 2);
        const inside = (p: Point2): boolean =>
            man.reduce((n, a, i) => {
                const b = man[(i + 1) % man.length];
                const crosses =
                    a[1] > p[1] !== b[1] > p[1] && p[0] < a[0] + ((p[1] - a[1]) * (b[0] - a[0])) / (b[1] - a[1]);
                return crosses ? n + 1 : n;
            }, 0) %
                2 ===
            1;
        assert.isFalse(inside([0, -0.6]));
        assert.isTrue(inside([0.3, -0.6]));
    });

    test("a rounded rectangle's corners stay round however long it is", () => {
        const outline = flatShapeOutline("round-rectangle", 4, 1);
        // The top edge is straight from x = -(2 - r) to 2 - r with r a quarter of the short side.
        const top = outline.filter(([, y]) => Math.abs(y - 0.5) < 1e-9).map(([x]) => x);

        assert.approximately(Math.max(...top), 2 - 0.25, 1e-9);
    });

    test("a rounded rectangle's corner radius is capped, so a large box keeps small corners", () => {
        const topEnd = (outline: Point2[], halfHeight: number): number =>
            Math.max(...outline.filter(([, y]) => Math.abs(y - halfHeight) < 1e-9).map(([x]) => x));

        // A 513 x 453 yEd group: 8 across each corner, not a quarter of 453.
        assert.approximately(topEnd(flatShapeOutline("round-rectangle", 513, 453, 8), 226.5), 256.5 - 8, 1e-9);
        // A cap above a quarter of the shorter side changes nothing.
        assert.approximately(topEnd(flatShapeOutline("round-rectangle", 4, 1, 5), 0.5), 2 - 0.25, 1e-9);
    });

    test("an exact corner radius is drawn as given, up to half the shorter side", () => {
        const topEnd = (outline: Point2[], halfHeight: number): number =>
            Math.max(...outline.filter(([, y]) => Math.abs(y - halfHeight) < 1e-9).map(([x]) => x));
        const exact = (shape: string, w: number, h: number, r: number): Point2[] =>
            flatShapeOutline(shape, w, h, r, undefined, true, true);

        // Cytoscape.js's corner-radius 14 on a 30 px box: 14 across each corner, not the quarter's 7.5
        assert.approximately(topEnd(exact("round-rectangle", 30, 30, 14), 15), 15 - 14, 1e-9);
        // a radius past half the shorter side draws a pill, its ends half circles
        assert.approximately(topEnd(exact("round-rectangle", 4, 1, 5), 0.5), 2 - 0.5, 1e-9);
        // a pill (and a circle, its square box's pill) repeats no point, so it is filled whole
        for (const [w, h] of [
            [30, 30],
            [4, 1],
            [1, 4],
        ]) {
            const pill = exact("round-rectangle", w, h, Math.min(w, h) / 2);
            assert.isTrue(
                pill.every(([x, y], i) => {
                    const [px, py] = pill[(i + pill.length - 1) % pill.length];
                    return Math.hypot(x - px, y - py) > 1e-9;
                }),
                `${String(w)} x ${String(h)}`,
            );
            assert.isTrue(fansFromOrigin(pill), `${String(w)} x ${String(h)} fans`);
        }
        // a round triangle with a radius of 8 on a 30 px box rounds its corners at 8, not at the tenth's 3, as
        // Cytoscape.js's getRoundCorner does: its tips, cut back further, reach about 20 px across instead of 26
        const capped = boxOf(flatShapeOutline("round-triangle", 30, 30, 8));
        const given = boxOf(exact("round-triangle", 30, 30, 8));
        assert.approximately(capped.height, 26.29, 0.01);
        assert.approximately(given.height, 20.11, 0.01);
        assert.approximately(given.width, 20.1, 0.01);
    });

    test("lays a texture flat across a shape's box, so a gradient fill is drawn as a ramp", () => {
        const mesh = outlineSlab("ellipse", flatShapeOutline("ellipse", 4, 2), 0.1, slabScene());
        const positions = mesh.getVerticesData(VertexBuffer.PositionKind) ?? [];
        const uvs = mesh.getVerticesData(VertexBuffer.UVKind) ?? [];

        assert.lengthOf(uvs, (positions.length / 3) * 2);
        for (let v = 0; v < positions.length / 3; v++) {
            // u runs left to right across the 4 wide box, v bottom to top across the 2 high one
            assert.approximately(uvs[2 * v], (positions[3 * v] + 2) / 4, 1e-9);
            assert.approximately(uvs[2 * v + 1], (positions[3 * v + 1] + 1) / 2, 1e-9);
        }
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

    test("a dash-dot border alternates long dashes with short dots", () => {
        const pieces = borderRing(square, 0.1, "dash-dot");
        const along = (piece: (typeof pieces)[number]): number =>
            piece.inner
                .slice(1)
                .reduce((sum, [x, y], i) => sum + Math.hypot(x - piece.inner[i][0], y - piece.inner[i][1]), 0);

        assert.isAbove(pieces.length, 4);
        assert.strictEqual(pieces.length % 2, 0);
        for (let i = 0; i < pieces.length; i += 2) {
            assert.approximately(along(pieces[i]) / along(pieces[i + 1]), 3, 0.2);
        }
    });
});

describe("node extents", () => {
    let scene: Scene;

    beforeEach(() => {
        scene = new Scene(new NullEngine());
    });

    afterEach(() => {
        scene.getEngine().dispose();
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

    // a rounded polygon keeps inside the box of its sharp twin, as Cytoscape.js draws it
    for (const shape of NodeShapes.options.filter((name) => !ROUNDED.has(name))) {
        test(`${shape} at one size covers the same extent across the view as every other shape, under uniform`, () => {
            const { x, y, centre } = extentOf(build({ type: shape, size: 2, sizeMode: "uniform" }));

            assert.approximately(Math.max(x, y), 2 * NODE_EXTENT_PER_SIZE, 1e-6);
            centre.forEach((value) => {
                assert.approximately(value, 0, 1e-6);
            });
        });
    }

    test("the default sizeMode keeps each solid's own proportions, as before", () => {
        assert.approximately(extentOf(build({ type: "sphere", size: 2 })).x, 2, 1e-6);
        assert.approximately(extentOf(build({ type: "box", size: 2 })).x, 2, 1e-6);
        assert.approximately(extentOf(build({ type: "cylinder", size: 1 })).y, 1.618, 1e-3);
    });

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

    for (const type of FLAT_NODE_SHAPES) {
        test(`a ${type} is a thin plaque in 2D and 3D alike`, () => {
            for (const is2D of [true, false]) {
                const { x, y, z } = extentOf(build({ type, size: 4 }, is2D));

                assert.isBelow(z, Math.min(x, y) * 0.05, `${type} ${is2D ? "2D" : "3D"}`);
            }
        });
    }

    test("depth still makes a flat shape deep", () => {
        assert.approximately(extentOf(build({ type: "diamond", size: 1, depth: 1 })).z, NODE_EXTENT_PER_SIZE, 1e-6);
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

    test("a node with no body draws no border", () => {
        const options = { styleId: "bodiless", is2D: true, size: 1 };
        const shape = { type: "none" as const, size: 1 };
        const fill = NodeMesh.create(cache, options, { shape }, scene);

        assert.isNull(NodeMesh.createBorder(cache, options, { shape, border: { width: 0.2 } }, fill, scene));
    });

    afterEach(() => {
        scene.getEngine().dispose();
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

    test("a border of opacity 0 is not drawn, and a translucent one is drawn at its opacity", () => {
        const options = { styleId: "faded", is2D: true, size: 1 };
        const shape = { type: "ellipse" as const, size: 1 };
        const fill = NodeMesh.create(cache, options, { shape }, scene);

        assert.isNull(
            NodeMesh.createBorder(cache, options, { shape, border: { width: 0.2, opacity: 0 } }, fill, scene),
        );
        const translucent = NodeMesh.createBorder(
            cache,
            { ...options, styleId: "half" },
            { shape, border: { width: 0.2, opacity: 0.5 } },
            fill,
            scene,
        );
        assert.isNotNull(translucent);
        assert.strictEqual(translucent.sourceMesh.material?.alpha, 0.5);
    });

    test("a flat shape's border in 3D is a ring on its faces, no deeper than the shape, never a wall", () => {
        const options = { styleId: "deep", is2D: false, size: 1 };
        const shape = { type: "round-rectangle" as const, size: 1, width: 20, height: 10 };
        const fill = NodeMesh.create(cache, options, { shape }, scene);
        const border = NodeMesh.createBorder(
            cache,
            options,
            { shape, border: { width: 0.2, style: "dashed" } },
            fill,
            scene,
        );

        assert.isNotNull(border);
        const fillBox = fill.getBoundingInfo().boundingBox.extendSize;
        const ringBox = border.sourceMesh.getBoundingInfo().boundingBox.extendSize;

        // A wall would reach as deep as the shape is wide; a ring on the faces is as thin as it.
        assert.isAtMost(ringBox.z, fillBox.z + 1e-6, "the ring is no deeper than the plaque");
        assert.isBelow(ringBox.z * 2, fillBox.y * 2 * 0.05, "the ring is thin against the shape's height");
    });

    for (const type of ["rectangle", "sphere"] as const) {
        test(`a ${type}'s border reaches its width past the outline and is not pickable`, () => {
            const options = { styleId: type, is2D: true, size: 1 };
            const shape = { type, size: 1 };
            const fill = NodeMesh.create(cache, options, { shape }, scene);
            const border = NodeMesh.createBorder(cache, options, { shape, border: { width: 0.2 } }, fill, scene);

            assert.isNotNull(border);
            const { extendSize } = border.sourceMesh.getBoundingInfo().boundingBox;

            const across = fill.getBoundingInfo().boundingBox.extendSize.x * 2;

            assert.approximately(extendSize.x * 2, across + 0.4 * NODE_EXTENT_PER_SIZE, 0.02);
            assert.isFalse(border.isPickable);
        });
    }

    // A rectangle 4 wide and 2 tall with a border of 0.5: outside, the fill is the size and the ring
    // reaches 0.5 past it; centered, the ring's middle runs along the size; inside, its outer edge is
    // the size. A node no larger than twice its border is all ring, its outer edge still the size.
    for (const [position, fillWidth, outerWidth, height] of [
        ["outside", 4, 5, 2],
        ["center", 3.5, 4.5, 2],
        ["inside", 3, 4, 2],
        ["inside", 0.001, 1, 1],
    ] as const) {
        test(`a border ${position} a ${String(height)}-tall node draws its fill ${String(fillWidth)} wide`, () => {
            const options = { styleId: `${position}-${String(height)}`, is2D: true, size: 1 };
            const shape = {
                type: "rectangle" as const,
                size: 1,
                width: height === 1 ? 1 : 4,
                height,
                sizeMode: "diameter" as const,
            };
            const border = { width: 0.5, position };
            const fill = NodeMesh.create(cache, options, { shape, border }, scene);
            const ring = NodeMesh.createBorder(cache, options, { shape, border }, fill, scene);

            assert.isNotNull(ring);
            const fillBox = fill.getBoundingInfo().boundingBox.extendSize;
            const ringBox = ring.sourceMesh.getBoundingInfo().boundingBox.extendSize;
            assert.approximately(fillBox.x * 2, fillWidth, 2e-3);
            assert.approximately(ringBox.x * 2, outerWidth, 2e-3);
        });
    }

    // Issue #3104: a polygon's border is as wide as it asks on every side, measured square to the side, not along
    // the corner's direction (a mitre) or scaled from the center.
    for (const type of ["triangle", "hexagon", "rectangle"] as const) {
        test(`a ${type}'s border is drawn its width wide on every side`, () => {
            const options = { styleId: `width-${type}`, is2D: true, size: 1 };
            const shape = { type, size: 2 };
            const width = 0.25;
            const fill = NodeMesh.create(cache, options, { shape }, scene);
            const ring = NodeMesh.createBorder(cache, options, { shape, border: { width } }, fill, scene);
            assert.isNotNull(ring);
            const pointsOf = (mesh: Mesh): Point2[] => {
                mesh.computeWorldMatrix(true);
                const positions = mesh.getVerticesData(VertexBuffer.PositionKind) ?? [];
                const world = mesh.getWorldMatrix().m;
                const points: Point2[] = [];
                for (let i = 0; i < positions.length; i += 3) {
                    const [x, y, z] = [positions[i], positions[i + 1], positions[i + 2]];
                    points.push([
                        x * world[0] + y * world[4] + z * world[8] + world[12],
                        x * world[1] + y * world[5] + z * world[9] + world[13],
                    ]);
                }

                return points;
            };
            const hull = convexHull(pointsOf(fill));
            const outer = pointsOf(ring.sourceMesh);
            const asked = width * NODE_EXTENT_PER_SIZE;

            hull.forEach(([x0, y0], i) => {
                const [x1, y1] = hull[(i + 1) % hull.length];
                const length = Math.hypot(x1 - x0, y1 - y0);
                // the hull runs counter-clockwise, so its outward normal is the side turned clockwise
                const [nx, ny] = [(y1 - y0) / length, -(x1 - x0) / length];
                const reach = Math.max(...outer.map(([x, y]) => (x - x0) * nx + (y - y0) * ny));
                assert.approximately(reach, asked, asked * 0.02, `side ${String(i)} of the ${type}`);
            });
        });
    }
});
