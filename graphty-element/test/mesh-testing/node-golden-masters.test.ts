/**
 * Node Golden Master Tests
 *
 * Builds every shape the node schema offers through the real `NodeMesh.create`, with a real
 * `MeshCache` and a Babylon `NullEngine` scene, and asserts against the mesh and the
 * `StandardMaterial` the product produced.
 *
 * WHAT THE RETIRED VERSION OF THIS FILE ASSERTED, AND WHY NONE OF IT SURVIVED. It called a
 * `NodeMeshFactory` that lived in this directory and imported nothing from `src/`, then asserted
 * three things the real `NodeMesh` has never done:
 *
 *   - `mesh.metadata.shapeType` / `originalShape`. `NodeMesh` writes no mesh metadata at all, so
 *     `metadata` is null and 47 of these cases died on `Cannot read properties of null`.
 *   - `mesh.scaling` tracking `size`. `NodeMesh` bakes size into the GEOMETRY -- a sphere of size
 *     2 is built with `diameter: 2` -- and never touches scaling, which stays 1. The assertions
 *     below therefore measure the bounding box instead, which is where the size really went.
 *   - a top-level numeric `opacity` reaching `mesh.visibility`. Only an object colour carrying
 *     `opacity` does that (`NodeMesh.create` guards on `"opacity" in texture.color`).
 *
 * Two things the mock had no concept of, and which are asserted here for the first time: the 3D
 * emissive shadow floor (`emissiveColor === diffuseColor * 0.2`), and gradient colours, whose
 * absence was a shipped defect -- see the comment on `NodeMesh.createMaterial`.
 */

import { Color3, InstancedMesh, Mesh, StandardMaterial } from "@babylonjs/core";
import { afterEach, assert, beforeEach, describe, test } from "vitest";
import type { z } from "zod/v4";

import { NodeShapes } from "../../src/config/NodeStyle";
import { NodeMesh } from "../../src/meshes/NodeMesh";
import { createMeshScene, type MeshTestScene } from "./real-mesh-harness";

type ShapeName = z.infer<typeof NodeShapes>;

/**
 * The Babylon builder each shape is expected to reach, identified by the name the builder gives
 * the mesh. Several shapes share a builder, which is the point: `cone` is a cylinder with a zero
 * top diameter, and every polyhedron is one `CreatePolyhedron` call with a different type index.
 */
const EXPECTED_SOURCE_NAME: Record<string, string> = {
    box: "box",
    sphere: "sphere",
    cylinder: "cylinder",
    cone: "cylinder",
    capsule: "capsule",
    torus: "torus",
    "torus-knot": "tk",
    tetrahedron: "polyhedron",
    octahedron: "polyhedron",
    dodecahedron: "polyhedron",
    icosahedron: "polyhedron",
    rhombicuboctahedron: "polyhedron",
    "triangular_prism": "polyhedron",
    "pentagonal_prism": "polyhedron",
    "hexagonal_prism": "polyhedron",
    "square_pyramid": "polyhedron",
    "pentagonal_pyramid": "polyhedron",
    "triangular_dipyramid": "polyhedron",
    "pentagonal_dipyramid": "polyhedron",
    "elongated_square_dipyramid": "polyhedron",
    "elongated_pentagonal_dipyramid": "polyhedron",
    "elongated_pentagonal_cupola": "polyhedron",
    goldberg: "goldberg",
    icosphere: "icosphere",
    geodesic: "geodesic",
};

/**
 * The two shapes whose creators ignore the requested size.
 *
 * `NodeMesh.createCapsule` and `createTorus` take `_size` and call the Babylon builder with an
 * empty options object, so both always come out at the builder's default dimensions. That is a
 * real difference in behaviour from every other shape, it is invisible in the type signature, and
 * a test that silently skipped these two would let a later fix go unnoticed.
 */
const SIZE_IGNORING_SHAPES = new Set(["capsule", "torus"]);

/**
 * Hyphenated spellings `NodeMesh` registers for backward compatibility that the `NodeShapes`
 * schema does NOT accept. The retired mock's shape list was written entirely in these, which is
 * how it managed to claim coverage of shapes a parsed style can never carry.
 */
const LEGACY_HYPHEN_ALIASES = [
    "triangular-prism",
    "pentagonal-prism",
    "hexagonal-prism",
    "square-pyramid",
    "pentagonal-pyramid",
    "triangular-dipyramid",
    "pentagonal-dipyramid",
    "elongated-square-dipyramid",
    "elongated-pentagonal-dipyramid",
    "elongated-pentagonal-cupola",
];

let ctx: MeshTestScene;
let styleCounter = 0;

function uniqueStyleId(prefix: string): string {
    styleCounter += 1;
    return `${prefix}-${styleCounter}`;
}

interface CreateArgs {
    shape: ShapeName;
    size?: number;
    color?: unknown;
    is2D?: boolean;
    wireframe?: boolean;
    styleId?: string;
}

interface CreatedNode {
    mesh: InstancedMesh;
    source: Mesh;
    material: StandardMaterial;
}

function createNode(args: CreateArgs): CreatedNode {
    const size = args.size ?? 1;
    const mesh = NodeMesh.create(
        ctx.cache,
        { styleId: args.styleId ?? uniqueStyleId(args.shape), is2D: args.is2D ?? false, size },
        {
            shape: { type: args.shape, size },
            texture: args.color === undefined ? {} : { color: args.color as ShapeName extends never ? never : string },
            effect: { wireframe: args.wireframe ?? false },
        },
        ctx.scene,
    );

    const instance = mesh as InstancedMesh;
    return {
        mesh: instance,
        source: instance.sourceMesh,
        material: instance.material as StandardMaterial,
    };
}

/** Longest edge of a mesh's local bounding box -- the honest stand-in for "how big is it". */
function boundingExtent(shape: ShapeName, size: number): number {
    const mesh = NodeMesh.createMeshWithoutCache(
        { styleId: "extent", is2D: false, size },
        { shape: { type: shape, size } },
        ctx.scene,
    );
    const { extendSize } = mesh.getBoundingInfo().boundingBox;
    const longest = Math.max(extendSize.x, extendSize.y, extendSize.z) * 2;
    mesh.dispose();
    return longest;
}

describe("Node Golden Masters", () => {
    beforeEach(() => {
        ctx = createMeshScene();
    });

    afterEach(() => {
        ctx.dispose();
    });

    describe("Shape Creation", () => {
        NodeShapes.options.forEach((shape) => {
            test(`creates ${shape} through the cache with a frozen material`, () => {
                const result = createNode({ shape, size: 1 });

                assert.instanceOf(result.mesh, InstancedMesh);
                assert.equal(result.source.name, EXPECTED_SOURCE_NAME[shape]);
                assert.instanceOf(result.material, StandardMaterial);
                assert.isTrue(result.material.isFrozen, "NodeMesh.createMaterial freezes the material it builds");
                assert.isAbove(result.source.getTotalVertices(), 0, "a shape with no vertices draws nothing");
            });
        });

        test("every shape in the schema has an entry in this file's builder table", () => {
            // Guards the table above from going stale the next time a shape is added: a new
            // NodeShapes member with no expected builder name would otherwise assert against
            // undefined and pass only by accident.
            for (const shape of NodeShapes.options) {
                assert.property(EXPECTED_SOURCE_NAME, shape);
            }
        });
    });

    describe("Size Variations", () => {
        const testShapes: ShapeName[] = ["sphere", "box", "cylinder", "tetrahedron"];
        const sizes = [0.5, 2, 5];

        testShapes.forEach((shape) => {
            sizes.forEach((size) => {
                test(`${shape} geometry grows with size ${size}`, () => {
                    const unit = boundingExtent(shape, 1);
                    const scaled = boundingExtent(shape, size);

                    assert.closeTo(
                        scaled / unit,
                        size,
                        1e-6,
                        `${shape} at size ${size} should be ${size}x the extent it has at size 1`,
                    );
                });
            });
        });

        test("scaling stays at 1 -- size lives in the geometry, not in the transform", () => {
            const result = createNode({ shape: "sphere", size: 5 });

            assert.equal(result.mesh.scaling.x, 1);
            assert.equal(result.mesh.scaling.y, 1);
            assert.equal(result.mesh.scaling.z, 1);
            assert.closeTo(boundingExtent("sphere", 5), 5, 1e-6);
        });

        SIZE_IGNORING_SHAPES.forEach((shape) => {
            test(`${shape} ignores the requested size`, () => {
                assert.closeTo(boundingExtent(shape as ShapeName, 5), boundingExtent(shape as ShapeName, 1), 1e-6);
            });
        });
    });

    describe("Material Properties", () => {
        test("applies solid color in 3D mode", () => {
            const result = createNode({ shape: "sphere", color: "#FF0000", is2D: false });

            assert.deepEqual(
                [result.material.diffuseColor.r, result.material.diffuseColor.g, result.material.diffuseColor.b],
                [1, 0, 0],
            );
            assert.isFalse(result.material.disableLighting);
        });

        test("3D materials carry an emissive shadow floor of one fifth the diffuse colour", () => {
            const result = createNode({ shape: "sphere", color: "#FF8000", is2D: false });
            const expected = Color3.FromHexString("#FF8000").scale(0.2);

            assert.closeTo(result.material.emissiveColor.r, expected.r, 1e-6);
            assert.closeTo(result.material.emissiveColor.g, expected.g, 1e-6);
            assert.closeTo(result.material.emissiveColor.b, expected.b, 1e-6);
        });

        test("applies emissive color in 2D mode and disables lighting", () => {
            const result = createNode({ shape: "sphere", color: "#00FF00", is2D: true });

            assert.deepEqual(
                [result.material.emissiveColor.r, result.material.emissiveColor.g, result.material.emissiveColor.b],
                [0, 1, 0],
            );
            assert.isTrue(result.material.disableLighting);
            assert.deepEqual(
                [result.material.diffuseColor.r, result.material.diffuseColor.g, result.material.diffuseColor.b],
                [1, 1, 1],
                "2D leaves diffuse at the StandardMaterial default -- only the emissive channel is visible",
            );
        });

        test("handles wireframe mode", () => {
            const result = createNode({ shape: "box", wireframe: true });

            assert.isTrue(result.material.wireframe);
        });

        test("wireframe defaults to off", () => {
            const result = createNode({ shape: "box" });

            assert.isFalse(result.material.wireframe);
        });

        test("opacity on an object colour reaches mesh.visibility", () => {
            const result = createNode({
                shape: "sphere",
                color: { colorType: "solid", value: "#0000FF", opacity: 0.5 },
            });

            assert.equal(result.mesh.visibility, 0.5);
        });

        test("a bare hex colour leaves visibility alone", () => {
            // The guard in NodeMesh.create is `"opacity" in texture.color`, which a string can
            // never satisfy. A caller who wants a translucent node must send the object form.
            const result = createNode({ shape: "sphere", color: "#0000FF" });

            assert.equal(result.mesh.visibility, 1);
        });

        test("handles special ##FFFFFF color case", () => {
            const result = createNode({ shape: "sphere", color: "##FFFFFF" });

            assert.deepEqual(
                [result.material.diffuseColor.r, result.material.diffuseColor.g, result.material.diffuseColor.b],
                [1, 1, 1],
            );
        });

        test("handles color object format", () => {
            const result = createNode({
                shape: "sphere",
                color: { colorType: "solid", value: "#0000FF" },
            });

            assert.equal(result.material.diffuseColor.b, 1);
            assert.equal(result.material.diffuseColor.r, 0);
        });

        test("no colour at all leaves the StandardMaterial default", () => {
            const result = createNode({ shape: "sphere" });

            assert.deepEqual(
                [result.material.diffuseColor.r, result.material.diffuseColor.g, result.material.diffuseColor.b],
                [1, 1, 1],
            );
            assert.deepEqual(
                [result.material.emissiveColor.r, result.material.emissiveColor.g, result.material.emissiveColor.b],
                [0, 0, 0],
            );
        });
    });

    describe("Gradient Colours", () => {
        test("a linear gradient paints a diffuse texture rather than a flat colour", () => {
            const result = createNode({
                shape: "sphere",
                color: { colorType: "gradient", direction: 45, colors: ["#FF0000", "#0000FF"] },
            });

            assert.isNotNull(result.material.diffuseTexture, "a gradient node with no texture renders unstyled");
        });

        test("a radial gradient paints a diffuse texture", () => {
            const result = createNode({
                shape: "sphere",
                color: { colorType: "radial-gradient", colors: ["#FF0000", "#00FF00"] },
            });

            assert.isNotNull(result.material.diffuseTexture);
        });

        test("2D gradients light the emissive channel as well as the diffuse one", () => {
            const result = createNode({
                shape: "sphere",
                is2D: true,
                color: { colorType: "gradient", direction: 0, colors: ["#FF0000", "#0000FF"] },
            });

            assert.isNotNull(result.material.emissiveTexture);
            assert.isTrue(result.material.disableLighting);
        });

        test("equal gradients on different style ids share one texture", () => {
            const gradient = { colorType: "gradient", direction: 90, colors: ["#112233", "#445566"] };
            const first = createNode({ shape: "sphere", color: gradient });
            const second = createNode({ shape: "box", color: gradient });

            assert.strictEqual(
                first.material.diffuseTexture,
                second.material.diffuseTexture,
                "gradients are interned by value; one texture per node would be a memory leak",
            );
        });

        test("a one-stop gradient falls back to that stop as a flat colour", () => {
            const result = createNode({
                shape: "sphere",
                color: { colorType: "gradient", direction: 0, colors: ["#FF0000"] },
            });

            assert.isNull(result.material.diffuseTexture, "one stop cannot make a ramp");
            assert.deepEqual(
                [result.material.diffuseColor.r, result.material.diffuseColor.g, result.material.diffuseColor.b],
                [1, 0, 0],
            );
        });
    });

    describe("Caching and Instancing", () => {
        test("one style id yields one source mesh and one material", () => {
            const first = createNode({ shape: "sphere", color: "#FF0000", styleId: "shared" });
            const second = createNode({ shape: "sphere", color: "#FF0000", styleId: "shared" });

            assert.notStrictEqual(first.mesh, second.mesh, "each call returns its own instance");
            assert.strictEqual(first.source, second.source);
            assert.strictEqual(first.material, second.material);
            assert.equal(ctx.cache.size(), 1);
        });

        test("two style ids with different colours produce two differently coloured materials", () => {
            // The mesh-layer half of "two style layers must not render identically": if this ever
            // fails, identical-looking nodes are a NodeMesh fault. While it passes, they are not.
            const red = createNode({ shape: "sphere", color: "#FF0000", styleId: "red" });
            const blue = createNode({ shape: "sphere", color: "#0000FF", styleId: "blue" });

            assert.notStrictEqual(red.material, blue.material);
            assert.notDeepEqual(
                [red.material.diffuseColor.r, red.material.diffuseColor.g, red.material.diffuseColor.b],
                [blue.material.diffuseColor.r, blue.material.diffuseColor.g, blue.material.diffuseColor.b],
            );
        });

        test("the same style id in 2D and in 3D are cached separately", () => {
            createNode({ shape: "sphere", color: "#FF0000", styleId: "dual", is2D: false });
            createNode({ shape: "sphere", color: "#FF0000", styleId: "dual", is2D: true });

            assert.equal(ctx.cache.size(), 2);
        });
    });

    describe("Error Handling", () => {
        test("throws for an unknown shape", () => {
            assert.throws(
                () =>
                    NodeMesh.createMeshWithoutCache(
                        { styleId: "test", is2D: false, size: 1 },
                        { shape: { type: "unknown-shape" as ShapeName, size: 1 } },
                        ctx.scene,
                    ),
                "unknown shape: unknown-shape",
            );
        });

        test("throws when no shape type is given", () => {
            assert.throws(
                () => NodeMesh.createMeshWithoutCache({ styleId: "test", is2D: false, size: 1 }, {}, ctx.scene),
                "shape with type required to create mesh",
            );
        });
    });

    describe("Legacy Hyphen Aliases", () => {
        LEGACY_HYPHEN_ALIASES.forEach((alias) => {
            test(`${alias} still builds, but the schema does not accept it`, () => {
                const mesh = NodeMesh.createMeshWithoutCache(
                    { styleId: "legacy", is2D: false, size: 1 },
                    { shape: { type: alias as ShapeName, size: 1 } },
                    ctx.scene,
                );

                assert.equal(mesh.name, "polyhedron");
                assert.notInclude(
                    NodeShapes.options as readonly string[],
                    alias,
                    "the schema spells these with underscores; a style carrying the hyphen form is rejected before it reaches NodeMesh",
                );
                mesh.dispose();
            });
        });
    });
});
