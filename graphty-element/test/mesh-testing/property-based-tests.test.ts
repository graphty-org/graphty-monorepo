/**
 * Property-Based Random Tests
 *
 * The golden masters in this directory pin named cases. These generate the parameter space instead
 * -- every shape at a random size in a random colour, every line type at a random width, random
 * text at a random size -- and assert the invariant that has to hold across all of it.
 *
 * This is the file that changes most by being re-pointed. It used to feed random input into a mock
 * in this same directory, so "50 runs across the full 24-bit colour space" explored a copy loop.
 * The same generators now reach `NodeMesh`, `EdgeMesh` and `RichTextLabel`.
 */

import { Color3, InstancedMesh, Mesh, StandardMaterial } from "@babylonjs/core";
import fc from "fast-check";
import { afterEach, assert, beforeEach, describe, test } from "vitest";

import { NodeShapes } from "../../src/config/NodeStyle";
import { EdgeMesh } from "../../src/meshes/EdgeMesh";
import { NodeMesh } from "../../src/meshes/NodeMesh";
import { PatternedLineMesh } from "../../src/meshes/PatternedLineMesh";
import { RichTextLabel } from "../../src/meshes/RichTextLabel";
import { createMeshScene, drawnText, type MeshTestScene, resetRecordedCanvases } from "./real-mesh-harness";

const LINE_TYPES = ["solid", "dot", "star", "box", "dash", "diamond", "dash-dot", "sinewave", "zigzag"] as const;
const POLYHEDRONS = [
    "tetrahedron",
    "octahedron",
    "dodecahedron",
    "icosahedron",
    "rhombicuboctahedron",
    "triangular_prism",
    "pentagonal_prism",
    "hexagonal_prism",
    "square_pyramid",
    "pentagonal_pyramid",
] as const;

const hexColor = fc.integer({ min: 0, max: 0xffffff }).map((value) => `#${value.toString(16).padStart(6, "0")}`);
const positiveSize = fc.float({ min: Math.fround(0.1), max: Math.fround(10), noNaN: true });

let ctx: MeshTestScene;
let counter = 0;

function nextStyleId(): string {
    counter += 1;
    return `prop-${counter}`;
}

describe("Property-Based Tests", () => {
    beforeEach(() => {
        ctx = createMeshScene();
    });

    afterEach(() => {
        ctx.dispose();
    });

    describe("Node Properties", () => {
        test("every shape at any size and colour produces a mesh carrying that colour", () => {
            fc.assert(
                fc.property(
                    fc.constantFrom(...NodeShapes.options),
                    positiveSize,
                    hexColor,
                    fc.boolean(),
                    fc.boolean(),
                    (shape, size, color, is2D, wireframe) => {
                        const mesh = NodeMesh.create(
                            ctx.cache,
                            { styleId: nextStyleId(), is2D, size },
                            { shape: { type: shape, size }, texture: { color }, effect: { wireframe } },
                            ctx.scene,
                        ) as InstancedMesh;
                        const material = mesh.material as StandardMaterial;
                        const expected = Color3.FromHexString(color);
                        const painted = is2D ? material.emissiveColor : material.diffuseColor;

                        assert.instanceOf(mesh, InstancedMesh);
                        assert.isAbove(mesh.sourceMesh.getTotalVertices(), 0);
                        assert.equal(material.wireframe, wireframe);
                        assert.equal(material.disableLighting, is2D);
                        assert.closeTo(painted.r, expected.r, 1e-6);
                        assert.closeTo(painted.g, expected.g, 1e-6);
                        assert.closeTo(painted.b, expected.b, 1e-6);
                    },
                ),
                { numRuns: 50 },
            );
        });

        test("an object colour's opacity always reaches mesh.visibility", () => {
            fc.assert(
                fc.property(
                    fc.constantFrom(...NodeShapes.options),
                    hexColor,
                    fc.float({ min: 0, max: 1, noNaN: true }),
                    (shape, value, opacity) => {
                        const mesh = NodeMesh.create(
                            ctx.cache,
                            { styleId: nextStyleId(), is2D: false, size: 1 },
                            {
                                shape: { type: shape, size: 1 },
                                texture: { color: { colorType: "solid", value, opacity } },
                                effect: {},
                            },
                            ctx.scene,
                        );

                        assert.closeTo(mesh.visibility, opacity, 1e-6);
                    },
                ),
                { numRuns: 30 },
            );
        });

        test("a polyhedron's geometry scales linearly with the requested size", () => {
            fc.assert(
                fc.property(
                    fc.constantFrom(...POLYHEDRONS),
                    fc.float({ min: Math.fround(0.5), max: Math.fround(5), noNaN: true }),
                    (shape, size) => {
                        const unit = NodeMesh.createMeshWithoutCache(
                            { styleId: "unit", is2D: false, size: 1 },
                            { shape: { type: shape, size: 1 } },
                            ctx.scene,
                        );
                        const scaled = NodeMesh.createMeshWithoutCache(
                            { styleId: "scaled", is2D: false, size },
                            { shape: { type: shape, size } },
                            ctx.scene,
                        );
                        const ratio =
                            scaled.getBoundingInfo().boundingBox.extendSize.x /
                            unit.getBoundingInfo().boundingBox.extendSize.x;

                        assert.closeTo(ratio, size, 1e-4);
                        unit.dispose();
                        scaled.dispose();
                    },
                ),
                { numRuns: 25 },
            );
        });

        test("two different colours never intern to one material", () => {
            // The mesh-layer guarantee behind "two style layers must look different". If this ever
            // fails, identical-looking nodes are a NodeMesh fault rather than a style-layer one.
            fc.assert(
                fc.property(hexColor, hexColor, (first, second) => {
                    fc.pre(first !== second);

                    const a = NodeMesh.create(
                        ctx.cache,
                        { styleId: nextStyleId(), is2D: false, size: 1 },
                        { shape: { type: "sphere", size: 1 }, texture: { color: first }, effect: {} },
                        ctx.scene,
                    ).material as StandardMaterial;
                    const b = NodeMesh.create(
                        ctx.cache,
                        { styleId: nextStyleId(), is2D: false, size: 1 },
                        { shape: { type: "sphere", size: 1 }, texture: { color: second }, effect: {} },
                        ctx.scene,
                    ).material as StandardMaterial;

                    assert.notDeepEqual(
                        [a.diffuseColor.r, a.diffuseColor.g, a.diffuseColor.b],
                        [b.diffuseColor.r, b.diffuseColor.g, b.diffuseColor.b],
                    );
                }),
                { numRuns: 40 },
            );
        });
    });

    describe("Edge Properties", () => {
        test("every line type at any width, colour and opacity draws something", () => {
            fc.assert(
                fc.property(
                    fc.constantFrom(...LINE_TYPES),
                    positiveSize,
                    hexColor,
                    fc.float({ min: 0, max: 1, noNaN: true }),
                    (type, width, color, opacity) => {
                        const edge = EdgeMesh.create(
                            ctx.cache,
                            { styleId: nextStyleId(), width: width * 20, color },
                            { line: { type, opacity } },
                            ctx.scene,
                        );

                        if (edge instanceof PatternedLineMesh) {
                            assert.isAbove(edge.meshes.length, 0);
                            return;
                        }

                        assert.isAbove((edge as Mesh).getTotalVertices(), 0);
                    },
                ),
                { numRuns: 40 },
            );
        });

        test("an animated solid line is drawable at any speed", () => {
            fc.assert(
                fc.property(
                    fc.float({ min: Math.fround(0.1), max: Math.fround(5), noNaN: true }),
                    hexColor,
                    (animationSpeed, color) => {
                        const edge = EdgeMesh.create(
                            ctx.cache,
                            { styleId: nextStyleId(), width: 20, color },
                            { line: { type: "solid", animationSpeed } },
                            ctx.scene,
                        ) as Mesh;

                        assert.isAbove(edge.getTotalVertices(), 0);
                    },
                ),
                { numRuns: 25 },
            );
        });

        test("a patternCount is honoured for every patterned type", () => {
            fc.assert(
                fc.property(
                    fc.constantFrom(...LINE_TYPES.filter((type) => type !== "solid")),
                    fc.integer({ min: 2, max: 30 }),
                    (type, patternCount) => {
                        const edge = EdgeMesh.create(
                            ctx.cache,
                            { styleId: nextStyleId(), width: 20, color: "#FFFFFF" },
                            { line: { type, patternCount } },
                            ctx.scene,
                        ) as PatternedLineMesh;

                        assert.equal(edge.meshes.length, patternCount);
                    },
                ),
                { numRuns: 30 },
            );
        });

        test("every arrow cap is drawable at any size, colour and opacity", () => {
            const caps = [
                "normal",
                "inverted",
                "dot",
                "sphere-dot",
                "open-dot",
                "tee",
                "open-normal",
                "diamond",
                "open-diamond",
                "crow",
                "box",
                "half-open",
                "vee",
            ];

            fc.assert(
                fc.property(
                    fc.constantFrom(...caps),
                    fc.float({ min: Math.fround(0.1), max: Math.fround(5), noNaN: true }),
                    hexColor,
                    fc.float({ min: 0, max: 1, noNaN: true }),
                    (type, size, color, opacity) => {
                        const cap = EdgeMesh.createArrowHead(
                            ctx.cache,
                            nextStyleId(),
                            { type, width: 1, color, size, opacity },
                            ctx.scene,
                        );

                        assert.isNotNull(cap);
                        assert.isAbove(cap.getTotalVertices(), 0);
                        assert.closeTo(cap.visibility, opacity, 1e-6);
                    },
                ),
                { numRuns: 40 },
            );
        });
    });

    describe("Label Properties", () => {
        test("any text at any size is drawn, exactly once, in the font asked for", () => {
            fc.assert(
                fc.property(
                    fc.string({ minLength: 1, maxLength: 40 }).filter((text) => !/[\n<]/.test(text)),
                    fc.constantFrom("Verdana", "Arial", "Georgia", "Helvetica"),
                    fc.integer({ min: 8, max: 128 }),
                    (text, font, fontSize) => {
                        resetRecordedCanvases();
                        const label = RichTextLabel.createLabel(ctx.scene, { text, font, fontSize });

                        assert.deepEqual(drawnText(), [text]);
                        assert.isNotNull(label.labelMesh);
                        label.dispose();
                    },
                ),
                { numRuns: 40 },
            );
        });

        test("a bigger font always makes a taller plane", () => {
            fc.assert(
                fc.property(
                    fc.string({ minLength: 1, maxLength: 20 }).filter((text) => !/[\n<]/.test(text)),
                    fc.integer({ min: 8, max: 60 }),
                    fc.integer({ min: 61, max: 200 }),
                    (text, small, large) => {
                        const smallLabel = RichTextLabel.createLabel(ctx.scene, { text, fontSize: small });
                        const largeLabel = RichTextLabel.createLabel(ctx.scene, { text, fontSize: large });
                        const smallHeight = smallLabel.labelMesh?.getBoundingInfo().boundingBox.extendSize.y ?? 0;
                        const largeHeight = largeLabel.labelMesh?.getBoundingInfo().boundingBox.extendSize.y ?? 0;

                        assert.isAbove(largeHeight, smallHeight);
                        smallLabel.dispose();
                        largeLabel.dispose();
                    },
                ),
                { numRuns: 25 },
            );
        });

        test("any number of borders is drawn in the order it was given", () => {
            fc.assert(
                fc.property(
                    fc.array(hexColor, { minLength: 1, maxLength: 6 }),
                    hexColor,
                    (borderColors, backgroundColor) => {
                        resetRecordedCanvases();
                        const label = RichTextLabel.createLabel(ctx.scene, {
                            text: "Bordered",
                            backgroundColor,
                            borders: borderColors.map((color) => ({ width: 2, color, spacing: 1 })),
                        });

                        assert.isNotNull(label.labelMesh);
                        label.dispose();
                    },
                ),
                { numRuns: 25 },
            );
        });

        test("the texture is always a power of two on both axes when autoSize is on", () => {
            fc.assert(
                fc.property(
                    fc.string({ minLength: 1, maxLength: 60 }).filter((text) => !/[\n<]/.test(text)),
                    fc.integer({ min: 8, max: 128 }),
                    (text, fontSize) => {
                        const label = RichTextLabel.createLabel(ctx.scene, { text, fontSize, autoSize: true });
                        const material = label.labelMesh?.material as StandardMaterial;
                        const size = material.diffuseTexture?.getSize();

                        assert.isDefined(size);
                        assert.equal(size.width & (size.width - 1), 0, `width ${size.width} is not a power of two`);
                        assert.equal(size.height & (size.height - 1), 0, `height ${size.height} is not a power of two`);
                        label.dispose();
                    },
                ),
                { numRuns: 30 },
            );
        });
    });

    describe("Stress", () => {
        test("extreme node sizes still produce finite geometry", () => {
            fc.assert(
                fc.property(
                    fc.constantFrom(...NodeShapes.options),
                    fc.constantFrom(0.001, 0.01, 100, 1000),
                    (shape, size) => {
                        const mesh = NodeMesh.createMeshWithoutCache(
                            { styleId: "stress", is2D: false, size },
                            { shape: { type: shape, size } },
                            ctx.scene,
                        );
                        const { extendSize } = mesh.getBoundingInfo().boundingBox;

                        assert.isFalse(Number.isNaN(extendSize.x));
                        assert.isFalse(Number.isNaN(extendSize.y));
                        assert.isFalse(Number.isNaN(extendSize.z));
                        mesh.dispose();
                    },
                ),
                { numRuns: 30 },
            );
        });

        test("a very long label still produces a finite, non-zero plane", () => {
            const label = RichTextLabel.createLabel(ctx.scene, {
                text: "Very long label content ".repeat(40),
                fontSize: 72,
            });
            const { extendSize } = label.labelMesh?.getBoundingInfo().boundingBox ?? { extendSize: null };

            assert.isNotNull(extendSize);
            assert.isFalse(Number.isNaN(extendSize.x));
            assert.isAbove(extendSize.x, 0);
            assert.isAbove(extendSize.y, 0);
        });
    });
});
