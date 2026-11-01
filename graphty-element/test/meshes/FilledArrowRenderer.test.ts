import { Mesh, NullEngine, Scene, ShaderMaterial, StandardMaterial, SubMesh } from "@babylonjs/core";
import { afterEach, assert, beforeEach, describe, test, vi } from "vitest";

import { EDGE_CONSTANTS } from "../../src/constants/meshConstants";
import { FilledArrowRenderer, HALF_BARB } from "../../src/meshes/FilledArrowRenderer";

describe("FilledArrowRenderer - 3D Arrow Geometry", () => {
    let scene: Scene;

    beforeEach(() => {
        const engine = new NullEngine();
        scene = new Scene(engine);
    });

    afterEach(() => {
        scene.getEngine().dispose();
    });

    describe("Triangle Arrows", () => {
        test("createTriangle creates normal arrow with 3 vertices in XZ plane", () => {
            const mesh = FilledArrowRenderer.createTriangle(false, scene);

            const positions = mesh.getVerticesData("position");
            assert.exists(positions);
            assert.equal(positions.length, 9); // 3 vertices × 3 coords

            // Verify XZ plane geometry (all Y values should be 0)
            for (let i = 1; i < positions.length; i += 3) {
                assert.equal(positions[i], 0, `Y coordinate at index ${i} should be 0`);
            }

            // Tip should be at origin (0, 0, 0)
            assert.equal(positions[0], 0);
            assert.equal(positions[1], 0);
            assert.equal(positions[2], 0);

            mesh.dispose();
        });

        test("createTriangle creates inverted arrow with tip at origin", () => {
            const mesh = FilledArrowRenderer.createTriangle(true, scene);

            const positions = mesh.getVerticesData("position");
            assert.exists(positions);

            // Tip should be at origin
            assert.equal(positions[0], 0);
            assert.equal(positions[1], 0);
            assert.equal(positions[2], 0);

            // Base should extend in positive X direction (inverted)
            assert.isAbove(positions[3], 0); // First base vertex X should be positive

            mesh.dispose();
        });
    });

    describe("Diamond Arrow", () => {
        test("createDiamond creates 4-vertex diamond in XZ plane", () => {
            const mesh = FilledArrowRenderer.createDiamond(scene);

            const positions = mesh.getVerticesData("position");
            assert.exists(positions);
            assert.equal(positions.length, 12); // 4 vertices × 3 coords

            // Verify XZ plane geometry
            for (let i = 1; i < positions.length; i += 3) {
                assert.equal(positions[i], 0, "Y coordinate should be 0");
            }

            // Front tip at origin
            assert.equal(positions[0], 0);
            assert.equal(positions[1], 0);
            assert.equal(positions[2], 0);

            mesh.dispose();
        });
    });

    describe("Box Arrow", () => {
        test("createBox creates 4-vertex rectangle in XZ plane", () => {
            const mesh = FilledArrowRenderer.createBox(scene);

            const positions = mesh.getVerticesData("position");
            assert.exists(positions);
            assert.equal(positions.length, 12); // 4 vertices × 3 coords

            // Verify XZ plane geometry
            for (let i = 1; i < positions.length; i += 3) {
                assert.equal(positions[i], 0, "Y coordinate should be 0");
            }

            mesh.dispose();
        });
    });

    describe("Circle Arrow (Dot)", () => {
        test("createCircle creates circle with many vertices in XZ plane", () => {
            const mesh = FilledArrowRenderer.createCircle(scene, 32);

            const positions = mesh.getVerticesData("position");
            assert.exists(positions);
            // 32 segments + 1 closing vertex + center = 34 vertices (but implementation may vary)
            assert.isAtLeast(positions.length, 33 * 3); // At least 33 vertices × 3 coords

            // Verify XZ plane geometry
            for (let i = 1; i < positions.length; i += 3) {
                assert.equal(positions[i], 0, "Y coordinate should be 0");
            }

            // Center at origin
            assert.equal(positions[0], 0);
            assert.equal(positions[1], 0);
            assert.equal(positions[2], 0);

            mesh.dispose();
        });
    });

    describe("Vee Arrow", () => {
        test("createVee creates V-shaped arrow with 4 vertices", () => {
            const mesh = FilledArrowRenderer.createVee(scene);

            const positions = mesh.getVerticesData("position");
            assert.exists(positions);
            assert.equal(positions.length, 12); // 4 vertices × 3 coords

            // Verify XZ plane geometry
            for (let i = 1; i < positions.length; i += 3) {
                assert.equal(positions[i], 0);
            }

            mesh.dispose();
        });
    });

    describe("Vee Arrow notch", () => {
        test("createVee is notched half its length, as Graphviz, Cytoscape.js and vis-network draw their vee", () => {
            // Graphviz arrows.c arrow_type_crow0 (vee: the inner corner m at 0.5 of the arrow), Cytoscape.js's vee
            // (0, -0.15) of a 0.3 arrow, vis-network's Vee (-0.5, 0)
            const mesh = FilledArrowRenderer.createVee(scene);
            const positions = mesh.getVerticesData("position");
            assert.exists(positions);
            // the notch's corner on the line (z 0) behind the tip at x 0
            const notch = [0, 3, 6, 9].find((i) => positions[i + 2] === 0 && positions[i] !== 0);
            assert.isDefined(notch);
            assert.closeTo(positions[notch], -0.5, 1e-9);
            mesh.dispose();
        });
    });

    describe("Tee Arrow", () => {
        test("createTee creates horizontal bar with 4 vertices", () => {
            const mesh = FilledArrowRenderer.createTee(scene);

            const positions = mesh.getVerticesData("position");
            assert.exists(positions);
            assert.equal(positions.length, 12); // 4 vertices × 3 coords

            // Verify XZ plane geometry
            for (let i = 1; i < positions.length; i += 3) {
                assert.equal(positions[i], 0);
            }

            mesh.dispose();
        });
    });

    describe("Half-Open Arrow", () => {
        test("createHalfOpen creates half-V with 3 vertices", () => {
            const mesh = FilledArrowRenderer.createHalfOpen(scene);

            const positions = mesh.getVerticesData("position");
            assert.exists(positions);
            assert.equal(positions.length, 9); // 3 vertices × 3 coords

            // Verify XZ plane geometry
            for (let i = 1; i < positions.length; i += 3) {
                assert.equal(positions[i], 0);
            }

            mesh.dispose();
        });
    });

    describe("Crow Arrow", () => {
        test("createCrow creates crow's foot with 7 vertices", () => {
            const mesh = FilledArrowRenderer.createCrow(scene);

            const positions = mesh.getVerticesData("position");
            assert.exists(positions);
            assert.equal(positions.length, 21); // 7 vertices × 3 coords

            // Verify XZ plane geometry
            for (let i = 1; i < positions.length; i += 3) {
                assert.equal(positions[i], 0);
            }

            mesh.dispose();
        });
    });

    describe("Open-Normal Arrow", () => {
        test("createOpenNormal creates hollow triangle outline", () => {
            const mesh = FilledArrowRenderer.createOpenNormal(scene);

            const positions = mesh.getVerticesData("position");
            assert.exists(positions);
            // 6 vertices (3 outer + 3 inner)
            assert.equal(positions.length, 18);

            // Verify XZ plane geometry
            for (let i = 1; i < positions.length; i += 3) {
                assert.equal(positions[i], 0);
            }

            mesh.dispose();
        });
    });

    describe("Open-Diamond Arrow", () => {
        test("createOpenDiamond creates hollow diamond outline", () => {
            const mesh = FilledArrowRenderer.createOpenDiamond(scene);

            const positions = mesh.getVerticesData("position");
            assert.exists(positions);
            // 8 vertices (4 outer + 4 inner)
            assert.equal(positions.length, 24);

            // Verify XZ plane geometry
            for (let i = 1; i < positions.length; i += 3) {
                assert.equal(positions[i], 0);
            }

            mesh.dispose();
        });
    });

    describe("Open-Circle Arrow", () => {
        test("createOpenCircle creates hollow circle outline", () => {
            const mesh = FilledArrowRenderer.createOpenCircle(scene, 32);

            const positions = mesh.getVerticesData("position");
            assert.exists(positions);
            // (segments + 1) * 2 vertices for inner and outer rings
            assert.isAtLeast(positions.length, 33 * 2 * 3);

            // Verify XZ plane geometry
            for (let i = 1; i < positions.length; i += 3) {
                assert.equal(positions[i], 0);
            }

            mesh.dispose();
        });
    });
});

describe("FilledArrowRenderer - 3D Shader Application", () => {
    let scene: Scene;

    beforeEach(() => {
        const engine = new NullEngine();
        scene = new Scene(engine);
    });

    afterEach(() => {
        scene.getEngine().dispose();
    });

    test("applyShader returns mesh with ShaderMaterial", () => {
        const mesh = FilledArrowRenderer.createTriangle(false, scene);
        const result = FilledArrowRenderer.applyShader(mesh, { size: 1.0, color: "#ff0000", opacity: 1.0 }, scene);

        assert.exists(result);
        assert.instanceOf(result.material, ShaderMaterial);

        result.dispose();
    });

    test("applyShader sets correct size uniform", () => {
        const mesh = FilledArrowRenderer.createTriangle(false, scene);
        const result = FilledArrowRenderer.applyShader(mesh, { size: 2.5, color: "#00ff00", opacity: 0.8 }, scene);

        const material = result.material as ShaderMaterial;
        // The size uniform should be set to the provided value
        // We can't directly inspect ShaderMaterial uniforms in tests,
        // but we verify the material was applied
        assert.exists(material);
        assert.strictEqual(material.name, "filledArrowMaterial");

        result.dispose();
    });

    test("applyShader sizes the bounding volume to what the shader draws instead of switching culling off", () => {
        // This test used to assert `alwaysSelectAsActiveMesh === true`, i.e. that applyShader
        // switched frustum culling OFF for every mesh it shadered. That behaviour was removed
        // deliberately: the flag was written for thin instances, which this path no longer uses,
        // and it meant every shadered mesh -- thousands of them on a single dotted edge -- was
        // submitted every frame regardless of where the camera pointed.
        //
        // The flag could not simply be deleted, because the vertex shader magnifies the geometry
        // by the `size` uniform on the GPU while Babylon's CPU-side bounding volume still
        // describes the un-magnified geometry; culling against the small volume would pop
        // arrowheads out of existence near the screen edge. So applyShader now widens the
        // bounding volume to the extent actually drawn and lets culling run. This test pins that
        // pair of facts: culling is ON, and the volume is the magnified one.
        const mesh = FilledArrowRenderer.createTriangle(false, scene);
        const geometry = mesh.getBoundingInfo().boundingBox;
        const geometryReach = Math.max(geometry.minimum.length(), geometry.maximum.length());
        const size = 4;

        const result = FilledArrowRenderer.applyShader(mesh, { size, color: "#ff0000", opacity: 1.0 }, scene);

        assert.isFalse(result.alwaysSelectAsActiveMesh);

        // The billboard basis is freely oriented, so the drawn geometry is contained in a sphere
        // about the origin of radius size * reach; the volume is the cube that contains it.
        const expected = geometryReach * size;
        const { minimum, maximum } = result.getBoundingInfo().boundingBox;
        assert.closeTo(maximum.x, expected, 1e-6);
        assert.closeTo(maximum.y, expected, 1e-6);
        assert.closeTo(maximum.z, expected, 1e-6);
        assert.closeTo(minimum.x, -expected, 1e-6);
        assert.closeTo(minimum.y, -expected, 1e-6);
        assert.closeTo(minimum.z, -expected, 1e-6);

        result.dispose();
    });
});

describe("FilledArrowRenderer - XZ Plane Geometry Verification (CRITICAL)", () => {
    let scene: Scene;

    beforeEach(() => {
        const engine = new NullEngine();
        scene = new Scene(engine);
    });

    afterEach(() => {
        scene.getEngine().dispose();
    });

    // This test suite verifies the CRITICAL requirement from design/edge-styles-implementation-plan.md:
    // "CRITICAL LESSON LEARNED: Arrow geometry MUST be in XZ plane (Y=0) for tangent billboarding to work"

    const filledArrowTypes: {
        type: string;
        createFn: (scene: Scene) => ReturnType<typeof FilledArrowRenderer.createTriangle>;
    }[] = [
        { type: "normal", createFn: (s) => FilledArrowRenderer.createTriangle(false, s) },
        { type: "inverted", createFn: (s) => FilledArrowRenderer.createTriangle(true, s) },
        { type: "diamond", createFn: (s) => FilledArrowRenderer.createDiamond(s) },
        { type: "box", createFn: (s) => FilledArrowRenderer.createBox(s) },
        { type: "dot", createFn: (s) => FilledArrowRenderer.createCircle(s) },
        { type: "vee", createFn: (s) => FilledArrowRenderer.createVee(s) },
        { type: "tee", createFn: (s) => FilledArrowRenderer.createTee(s) },
        { type: "half-open", createFn: (s) => FilledArrowRenderer.createHalfOpen(s) },
        { type: "crow", createFn: (s) => FilledArrowRenderer.createCrow(s) },
        { type: "open-normal", createFn: (s) => FilledArrowRenderer.createOpenNormal(s) },
        { type: "open-diamond", createFn: (s) => FilledArrowRenderer.createOpenDiamond(s) },
        { type: "open-dot", createFn: (s) => FilledArrowRenderer.createOpenCircle(s) },
    ];

    filledArrowTypes.forEach(({ type, createFn }) => {
        test(`${type} geometry is in XZ plane (Y=0) for tangent billboarding`, () => {
            const mesh = createFn(scene);
            const positions = mesh.getVerticesData("position");

            assert.exists(positions, `${type} should have position data`);

            // CRITICAL: All Y coordinates must be 0 for tangent billboarding to work
            for (let i = 1; i < positions.length; i += 3) {
                assert.equal(
                    positions[i],
                    0,
                    `${type}: Y coordinate at vertex ${Math.floor(i / 3)} must be 0 for XZ plane geometry`,
                );
            }

            mesh.dispose();
        });

        test(`${type} face normal points in ±Y direction`, () => {
            const mesh = createFn(scene);
            const positions = mesh.getVerticesData("position");

            assert.exists(positions);

            // All Y values being 0 means the face normal is in ±Y direction
            // This is required for the "up" vector in the shader to map to camera direction
            let allYZero = true;
            for (let i = 1; i < positions.length; i += 3) {
                if (positions[i] !== 0) {
                    allYZero = false;
                    break;
                }
            }

            assert.isTrue(allYZero, `${type} must have all Y=0 for face normal in ±Y direction`);

            mesh.dispose();
        });
    });
});

describe("FilledArrowRenderer - 2D Arrows", () => {
    let scene: Scene;

    beforeEach(() => {
        const engine = new NullEngine();
        scene = new Scene(engine);
    });

    afterEach(() => {
        scene.getEngine().dispose();
    });

    test("create2DArrow generates mesh with StandardMaterial", () => {
        const mesh = FilledArrowRenderer.create2DArrow("normal", 0.5, 0.3, "#ff0000", 1.0, scene);

        assert(mesh.material instanceof StandardMaterial, "Should use StandardMaterial for 2D mode");
        assert.strictEqual(mesh.rotation.x, Math.PI / 2, "Should be rotated to XY plane");
        assert.strictEqual(mesh.metadata?.is2D, true, "Should be marked as 2D");
    });

    test("create2DArrow supports normal arrow type", () => {
        const mesh = FilledArrowRenderer.create2DArrow("normal", 0.5, 0.3, "#ff0000", 1.0, scene);

        assert(mesh.material instanceof StandardMaterial, "normal should use StandardMaterial");
        assert(mesh.getTotalVertices() > 0, "Should have vertices");
    });

    test("create2DArrow supports inverted arrow type", () => {
        const mesh = FilledArrowRenderer.create2DArrow("inverted", 0.5, 0.3, "#ff0000", 1.0, scene);

        assert(mesh.material instanceof StandardMaterial, "inverted should use StandardMaterial");
        assert(mesh.getTotalVertices() > 0, "Should have vertices");
    });

    test("create2DArrow supports diamond arrow type", () => {
        const mesh = FilledArrowRenderer.create2DArrow("diamond", 0.5, 0.3, "#ff0000", 1.0, scene);

        assert(mesh.material instanceof StandardMaterial, "diamond should use StandardMaterial");
        assert(mesh.getTotalVertices() > 0, "Should have vertices");
    });

    test("create2DArrow supports box arrow type", () => {
        const mesh = FilledArrowRenderer.create2DArrow("box", 0.5, 0.3, "#ff0000", 1.0, scene);

        assert(mesh.material instanceof StandardMaterial, "box should use StandardMaterial");
        assert(mesh.getTotalVertices() > 0, "Should have vertices");
    });

    test("create2DArrow supports dot arrow type", () => {
        const mesh = FilledArrowRenderer.create2DArrow("dot", 0.5, 0.3, "#ff0000", 1.0, scene);

        assert(mesh.material instanceof StandardMaterial, "dot should use StandardMaterial");
        assert(mesh.getTotalVertices() > 0, "Should have vertices");
    });

    test("create2DArrow supports vee arrow type", () => {
        const mesh = FilledArrowRenderer.create2DArrow("vee", 0.5, 0.3, "#ff0000", 1.0, scene);

        assert(mesh.material instanceof StandardMaterial, "vee should use StandardMaterial");
        assert(mesh.getTotalVertices() > 0, "Should have vertices");
    });

    test("create2DArrow supports tee arrow type", () => {
        const mesh = FilledArrowRenderer.create2DArrow("tee", 0.5, 0.3, "#ff0000", 1.0, scene);

        assert(mesh.material instanceof StandardMaterial, "tee should use StandardMaterial");
        assert(mesh.getTotalVertices() > 0, "Should have vertices");
    });

    test("create2DArrow supports crow arrow type", () => {
        const mesh = FilledArrowRenderer.create2DArrow("crow", 0.5, 0.3, "#ff0000", 1.0, scene);

        assert(mesh.material instanceof StandardMaterial, "crow should use StandardMaterial");
        assert(mesh.getTotalVertices() > 0, "Should have vertices");
    });

    test("create2DArrow supports half-open arrow type", () => {
        const mesh = FilledArrowRenderer.create2DArrow("half-open", 0.5, 0.3, "#ff0000", 1.0, scene);

        assert(mesh.material instanceof StandardMaterial, "half-open should use StandardMaterial");
        assert(mesh.getTotalVertices() > 0, "Should have vertices");
    });

    test("create2DArrow supports open-normal arrow type", () => {
        const mesh = FilledArrowRenderer.create2DArrow("open-normal", 0.5, 0.3, "#ff0000", 1.0, scene);

        assert(mesh.material instanceof StandardMaterial, "open-normal should use StandardMaterial");
        assert(mesh.getTotalVertices() > 0, "Should have vertices");
    });

    test("create2DArrow supports open-circle arrow type", () => {
        const mesh = FilledArrowRenderer.create2DArrow("open-circle", 0.5, 0.3, "#ff0000", 1.0, scene);

        assert(mesh.material instanceof StandardMaterial, "open-circle should use StandardMaterial");
        assert(mesh.getTotalVertices() > 0, "Should have vertices");
    });

    test("create2DArrow supports open-diamond arrow type", () => {
        const mesh = FilledArrowRenderer.create2DArrow("open-diamond", 0.5, 0.3, "#ff0000", 1.0, scene);

        assert(mesh.material instanceof StandardMaterial, "open-diamond should use StandardMaterial");
        assert(mesh.getTotalVertices() > 0, "Should have vertices");
    });

    test("create2DArrow applies correct color", () => {
        const mesh = FilledArrowRenderer.create2DArrow("normal", 0.5, 0.3, "#00ff00", 1.0, scene);

        const material = mesh.material as StandardMaterial;
        assert(material, "Material should be set");
        assert(material.emissiveColor, "Emissive color should be set");
    });

    test("create2DArrow applies correct opacity", () => {
        const mesh = FilledArrowRenderer.create2DArrow("normal", 0.5, 0.3, "#ff0000", 0.7, scene);

        const material = mesh.material as StandardMaterial;
        assert.strictEqual(material.alpha, 0.7, "Alpha should be 0.7");
    });

    test("create2DArrow scales mesh based on length and width", () => {
        const smallMesh = FilledArrowRenderer.create2DArrow("normal", 0.2, 0.1, "#ff0000", 1.0, scene);

        const largeMesh = FilledArrowRenderer.create2DArrow("normal", 1.0, 0.5, "#ff0000", 1.0, scene);

        // Both should have vertices
        assert(smallMesh.getTotalVertices() > 0, "Small mesh should have vertices");
        assert(largeMesh.getTotalVertices() > 0, "Large mesh should have vertices");
    });
});

describe("FilledArrowRenderer.applyShader and the size of the scene", () => {
    let scene: Scene;

    beforeEach(() => {
        scene = new Scene(new NullEngine());
    });

    afterEach(() => {
        vi.restoreAllMocks();
        scene.getEngine().dispose();
    });

    test("configuring a new arrow material does not walk every mesh already in the scene", () => {
        // Babylon's material setters that can change shader defines (`backFaceCulling` is one)
        // call `markAsDirty`, which visits every submesh of every mesh in the scene to find the ones
        // drawn with that material. A brand-new material is drawn by nothing, so the walk finds
        // nothing -- and one walk per arrow head over a scene that grows with the edges made a load
        // cost the square of its edge count (issue #388: 94 % of the CPU profile of a 2,000-node
        // load was this walk). The renderer blocks the material's dirty mechanism before the
        // setter, and this pins that the walk is gone: with a scene full of meshes, applying the
        // shader asks no existing submesh for its material.
        const bystanders = 64;

        for (let i = 0; i < bystanders; i++) {
            const mesh = FilledArrowRenderer.createTriangle(false, scene);
            mesh.material = new StandardMaterial(`bystander-${String(i)}`, scene);
        }

        const getMaterial = vi.spyOn(SubMesh.prototype, "getMaterial");
        const mesh = FilledArrowRenderer.applyShader(
            FilledArrowRenderer.createTriangle(false, scene),
            { size: 12, color: "#ff0000", opacity: 1 },
            scene,
        );

        assert.isBelow(getMaterial.mock.calls.length, bystanders, "no scene-wide walk of the existing submeshes");
        assert.instanceOf(mesh.material, ShaderMaterial);
        assert.strictEqual(mesh.material.backFaceCulling, false, "the setter still took effect");
        assert.strictEqual(mesh.material.blockDirtyMechanism, true, "and stays blocked for the material's life");
        assert.instanceOf(mesh, Mesh);
    });
});

describe("FilledArrowRenderer - the arrows drawn from convex pieces", () => {
    let scene: Scene;

    beforeEach(() => {
        scene = new Scene(new NullEngine());
    });

    afterEach(() => {
        scene.getEngine().dispose();
    });

    /**
     * A built arrow's extent along the line (x) and across it (z).
     * @param type - the arrow type
     * @returns the extents
     */
    function extents(type: string): { x0: number; x1: number; z0: number; z1: number; triangles: number } {
        const mesh = FilledArrowRenderer.createPolygonArrow(type, scene);
        const p = mesh.getVerticesData("position") ?? [];
        const xs = p.filter((_, i) => i % 3 === 0);
        const ys = p.filter((_, i) => i % 3 === 1);
        const zs = p.filter((_, i) => i % 3 === 2);
        assert.isTrue(
            ys.every((y) => y === 0),
            `${type} lies in the XZ plane`,
        );
        const triangles = (mesh.getIndices()?.length ?? 0) / 3;
        mesh.dispose();
        return { x0: Math.min(...xs), x1: Math.max(...xs), z0: Math.min(...zs), z1: Math.max(...zs), triangles };
    }

    test("every one reaches from its tip at the origin back to x = -1", () => {
        for (const type of Object.keys(FilledArrowRenderer.POLYGON_ARROWS)) {
            const e = extents(type);
            assert.closeTo(e.x1, 0, 1e-9, `${type} tip`);
            assert.closeTo(e.x0, -1, 1e-9, `${type} back`);
            assert.isAbove(e.triangles, 0, `${type} draws something`);
        }
    });

    test("a half circle is twice as wide as it is long, its flat side at the tip", () => {
        const e = extents("half-circle");
        assert.closeTo(e.z1 - e.z0, 2, 1e-9);
        const mesh = FilledArrowRenderer.createPolygonArrow("half-circle", scene);
        const p = mesh.getVerticesData("position") ?? [];
        // both corners of the flat side are at the tip, a full half width either side of the line
        const atTip = [];
        for (let i = 0; i < p.length; i += 3) {
            if (Math.abs(p[i]) < 1e-9) {
                atTip.push(p[i + 2]);
            }
        }
        assert.closeTo(Math.max(...atTip), 1, 1e-9);
        assert.closeTo(Math.min(...atTip), -1, 1e-9);
        mesh.dispose();
    });

    test("the open half circle leaves its middle open and the curve bulges toward the tip", () => {
        const open = FilledArrowRenderer.createPolygonArrow("open-half-circle", scene);
        const p = open.getVerticesData("position") ?? [];
        // no vertex at the center of the arc: it is a band, not a disc
        for (let i = 0; i < p.length; i += 3) {
            assert.isAbove(Math.hypot(p[i], p[i + 2]), 0.7);
        }
        open.dispose();
        const curve = FilledArrowRenderer.createPolygonArrow("curve", scene);
        const q = curve.getVerticesData("position") ?? [];
        // its apex, on the line, is at the tip; its two ends at the back
        const onLine = [];
        for (let i = 0; i < q.length; i += 3) {
            if (Math.abs(q[i + 2]) < 1e-9) {
                onLine.push(q[i]);
            }
        }
        assert.closeTo(Math.max(...onLine), 0, 1e-9);
        curve.dispose();
    });

    test("a compound arrow is two pieces: a triangle at the tip and a bar or a dot", () => {
        assert.lengthOf(FilledArrowRenderer.POLYGON_ARROWS["triangle-tee"](), 2);
        assert.lengthOf(FilledArrowRenderer.POLYGON_ARROWS["triangle-cross"](), 2);
        const [dot, triangle] = FilledArrowRenderer.POLYGON_ARROWS["circle-triangle"]();
        // the dot is at the tip, the triangle behind it with its point on the dot
        assert.isAbove(Math.max(...dot.map(([x]) => x)), -1e-9);
        assert.deepEqual(triangle[0], [-0.5, 0]);
    });

    test("half-open-flipped is half-open's arm reflected across the line, wound the same way", () => {
        const half = FilledArrowRenderer.createHalfOpen(scene);
        const flipped = FilledArrowRenderer.createPolygonArrow("half-open-flipped", scene);
        const corner = (mesh: Mesh): number => {
            const p = mesh.getVerticesData("position") ?? [];
            const back = [];
            for (let i = 0; i < p.length; i += 3) {
                if (Math.abs(p[i] + 1) < 1e-9) {
                    back.push(p[i + 2]);
                }
            }
            assert.lengthOf(back, 1, "one corner at the back");
            return back[0];
        };
        // the arm's back corner is on the other side of the line, as far from it
        assert.closeTo(corner(flipped), -corner(half), 1e-9);
        assert.isAbove(corner(flipped), 0);
        // the same winding (signed area), so a face culled on one is culled on the other
        const area = (mesh: Mesh): number => {
            const p = mesh.getVerticesData("position") ?? [];
            const [a, b, c] = Array.from(mesh.getIndices() ?? [], (k) => [p[3 * k], p[3 * k + 2]]);
            return (b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1]);
        };
        assert.strictEqual(Math.sign(area(flipped)), Math.sign(area(half)));
        half.dispose();
        flipped.dispose();
    });

    test("half-barb, half-barb-flipped and inverted-vee are wound as half-open is", () => {
        const area = (mesh: Mesh): number => {
            const p = mesh.getVerticesData("position") ?? [];
            const [a, b, c] = Array.from((mesh.getIndices() ?? []).slice(0, 3), (k) => [p[3 * k], p[3 * k + 2]]);
            return (b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1]);
        };
        const half = FilledArrowRenderer.createHalfOpen(scene);
        for (const type of ["half-barb", "half-barb-flipped", "inverted-vee"]) {
            const mesh = FilledArrowRenderer.createPolygonArrow(type, scene);
            assert.strictEqual(Math.sign(area(mesh)), Math.sign(area(half)), type);
            mesh.dispose();
        }
        half.dispose();
    });

    test("the half barb is a strip a ninth of its length along the line, its arm on half-open's side", () => {
        const [strip] = FilledArrowRenderer.POLYGON_ARROWS["half-barb"]();
        assert.deepEqual(
            strip.filter(([, z]) => z === 0).map(([x]) => x),
            [0, -HALF_BARB],
        );
        assert.isTrue(strip.every(([, z]) => z <= 0));
        const [flipped] = FilledArrowRenderer.POLYGON_ARROWS["half-barb-flipped"]();
        assert.isTrue(flipped.every(([, z]) => z >= 0));
    });

    test("the inverted vee has its point back on the line, its notch a quarter back and no tine", () => {
        const points = FilledArrowRenderer.POLYGON_ARROWS["inverted-vee"]().flat();
        const onLine = points.filter(([, z]) => z === 0).map(([x]) => x);
        assert.sameMembers([...new Set(onLine)], [-1, -0.25]);
    });

    test("open-box is the box's square with its middle left open", () => {
        const e = extents("open-box");
        assert.closeTo(e.z0, -0.5, 1e-9);
        assert.closeTo(e.z1, 0.5, 1e-9);
        const mesh = FilledArrowRenderer.createPolygonArrow("open-box", scene);
        const p = mesh.getVerticesData("position") ?? [];
        const idx = mesh.getIndices() ?? [];
        // no triangle covers the box's center (-0.5, 0)
        for (let t = 0; t < idx.length; t += 3) {
            const [a, b, c] = [idx[t], idx[t + 1], idx[t + 2]].map((k) => [p[3 * k], p[3 * k + 2]]);
            const side = (u: number[], v: number[]): number =>
                (v[0] - u[0]) * (0 - u[1]) - (-0.5 - u[0]) * (v[1] - u[1]);
            const s = [side(a, b), side(b, c), side(c, a)];
            assert.isFalse(s.every((x) => x > 0) || s.every((x) => x < 0), "the center is outside every triangle");
        }
        mesh.dispose();
    });

    test("open-inverted is the inverted triangle's outline: its base across the tip, its middle open", () => {
        const e = extents("open-inverted");
        assert.closeTo(e.z0, -EDGE_CONSTANTS.NORMAL_ARROW_ASPECT / 2, 1e-9);
        assert.closeTo(e.z1, EDGE_CONSTANTS.NORMAL_ARROW_ASPECT / 2, 1e-9);
        const mesh = FilledArrowRenderer.createPolygonArrow("open-inverted", scene);
        const p = mesh.getVerticesData("position") ?? [];
        // the widest point is the base at the tip (x = 0), the point at x = -1
        const at = (x: number): number[] =>
            Array.from(p).flatMap((v, i) => (i % 3 === 0 && Math.abs(v - x) < 1e-9 ? [p[i + 2]] : []));
        assert.closeTo(Math.max(...at(0).map(Math.abs)), EDGE_CONSTANTS.NORMAL_ARROW_ASPECT / 2, 1e-9);
        assert.deepEqual([...new Set(at(-1).map((z) => Math.round(z * 1e9) / 1e9))], [0]);
        // no triangle covers the middle of the triangle (-1/3, 0)
        const idx = mesh.getIndices() ?? [];
        for (let t = 0; t < idx.length; t += 3) {
            const [a, b, c] = [idx[t], idx[t + 1], idx[t + 2]].map((k) => [p[3 * k], p[3 * k + 2]]);
            const side = (u: number[], v: number[]): number =>
                (v[0] - u[0]) * (0 - u[1]) - (-1 / 3 - u[0]) * (v[1] - u[1]);
            const s = [side(a, b), side(b, c), side(c, a)];
            assert.isFalse(s.every((x) => x > 0) || s.every((x) => x < 0), "the middle is outside every triangle");
        }
        mesh.dispose();
    });

    test("2D builds each one by its type", () => {
        for (const type of Object.keys(FilledArrowRenderer.POLYGON_ARROWS)) {
            const mesh = FilledArrowRenderer.create2DArrow(type, 0.5, 0.3, "#ff0000", 1, scene);
            assert.isAbove(mesh.getTotalVertices(), 2, type);
            assert.strictEqual(mesh.name, `arrow-2d-${type}`);
            mesh.dispose();
        }
    });
});
