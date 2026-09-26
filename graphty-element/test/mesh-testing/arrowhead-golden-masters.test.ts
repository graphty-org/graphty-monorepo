/**
 * Arrowhead Golden Master Tests
 *
 * Every arrow cap the edge schema accepts, built through the real `EdgeMesh.createArrowHead` in
 * both 3D and 2D, with the geometry, the material and the positioning maths read off the product.
 *
 * WHAT THE RETIRED VERSION OF THIS FILE ASSERTED, AND WHY MOST OF IT IS GONE. It drove an
 * `ArrowMeshFactory` that lived in this directory and imported nothing from `src/`, and it
 * described an architecture the element does not have:
 *
 *   - It split the caps into "filled" (5 types, FilledArrowRenderer) and "outline" (8 types,
 *     CustomLineRenderer with `quadStrip` geometry and `pathPoints`). There is no such split.
 *     `EdgeMesh.createArrowHead` routes ALL THIRTEEN non-none types through `FilledArrowRenderer`
 *     and throws for anything else. The four describe blocks built on that split -- "Outline Arrow
 *     Geometry", "Path Points for Outline Arrows", "Outline Arrow Shader Properties" and "Arrow
 *     Categorization", about 30 cases -- asserted a renderer no arrow reaches, and are deleted
 *     rather than translated. Their real subject, "every cap produces geometry and a material", is
 *     covered below for all thirteen at once.
 *   - Its type list held fifteen entries including `"open"`, which the schema has never had. The
 *     "Open (Chevron)" block tested a cap the product cannot build. It is replaced by a check that
 *     the vocabulary the schema accepts and the vocabulary `createArrowHead` can build are the
 *     same set -- the drift that hid `"open"` for as long as it did.
 *   - 28 of its cases wrapped their assertions in `if (result.mesh) { ... }`, so a null mesh
 *     skipped every assertion and the test still passed. That pattern does not survive here.
 *   - Its vertex count for `dot` was 33. `FilledArrowRenderer.createCircle` pushes a centre plus
 *     `segments + 1` rim points, which is 34. The old assertion was `isAtLeast(..., 32)`, so it
 *     could not have seen the difference in either direction.
 */

import { InstancedMesh, ShaderMaterial, StandardMaterial, Vector3 } from "@babylonjs/core";
import { afterEach, assert, beforeEach, describe, test } from "vitest";

import { EdgeStyle } from "../../src/config/EdgeStyle";
import { EDGE_CONSTANTS } from "../../src/constants/meshConstants";
import { EdgeMesh } from "../../src/meshes/EdgeMesh";
import { create2DMeshScene, createMeshScene, type MeshTestScene } from "./real-mesh-harness";

/**
 * Every cap `EdgeMesh.createArrowHead` builds a mesh for, with the vertex count the geometry
 * really has. `none` is excluded because it is the one member that returns null by design.
 */
const ARROW_GEOMETRY: { type: string; vertices: number }[] = [
    { type: "normal", vertices: 3 },
    { type: "inverted", vertices: 3 },
    { type: "half-open", vertices: 3 },
    { type: "diamond", vertices: 4 },
    { type: "box", vertices: 4 },
    { type: "tee", vertices: 4 },
    { type: "vee", vertices: 4 },
    { type: "open-normal", vertices: 6 },
    { type: "crow", vertices: 7 },
    { type: "open-diamond", vertices: 8 },
    { type: "dot", vertices: 34 },
    { type: "open-dot", vertices: 66 },
    { type: "sphere-dot", vertices: 703 },
];

const DRAWN_TYPES = ARROW_GEOMETRY.map((entry) => entry.type);
const SCHEMA_TYPES = [...DRAWN_TYPES, "none"];

let ctx: MeshTestScene;

function arrow(type: string, extra: { size?: number; color?: string; opacity?: number } = {}): InstancedMesh {
    const mesh = EdgeMesh.createArrowHead(
        ctx.cache,
        `arrow-${type}`,
        { type, width: 1, color: extra.color ?? "#FF0000", size: extra.size, opacity: extra.opacity },
        ctx.scene,
    );
    assert.isNotNull(mesh, `createArrowHead returned null for "${type}"`);
    return mesh;
}

/** The mesh's local positions, rounded, as a comparable string. */
function geometryFingerprint(mesh: InstancedMesh): string {
    const positions = mesh.getVerticesData("position");
    assert.isNotNull(positions, "an arrow with no position data draws nothing");
    return Array.from(positions).map((value) => value.toFixed(5)).join(",");
}

describe("Arrowhead Golden Masters", () => {
    describe("The arrow vocabulary", () => {
        beforeEach(() => {
            ctx = createMeshScene();
        });

        afterEach(() => {
            ctx.dispose();
        });

        SCHEMA_TYPES.forEach((type) => {
            test(`the edge schema accepts arrowHead "${type}"`, () => {
                const parsed = EdgeStyle.safeParse({ arrowHead: { type } });

                assert.isTrue(parsed.success, `the schema rejected "${type}"`);
            });
        });

        test("the schema does not have an 'open' cap, whatever the retired mock claimed", () => {
            assert.isFalse(EdgeStyle.safeParse({ arrowHead: { type: "open" } }).success);
        });

        test("every cap the schema accepts is one createArrowHead can build", () => {
            // The two lists drifting apart is how `"open"` survived in a test file for as long as
            // it did, and it is the same drift that once let the node shape enum offer a shape
            // NodeMesh could not build. A cap the schema accepts but the renderer throws on is an
            // edge that vanishes at paint time.
            for (const type of SCHEMA_TYPES) {
                assert.isTrue(EdgeStyle.safeParse({ arrowHead: { type } }).success);
                assert.doesNotThrow(() => {
                    EdgeMesh.createArrowHead(ctx.cache, "vocab", { type, width: 1, color: "#FFFFFF" }, ctx.scene);
                }, `the schema accepts "${type}" but createArrowHead cannot build it`);
            }
        });

        test("a cap outside the vocabulary is refused rather than quietly drawn as a triangle", () => {
            assert.throws(
                () =>
                    EdgeMesh.createArrowHead(
                        ctx.cache,
                        "bad",
                        { type: "not-an-arrow", width: 1, color: "#FFFFFF" },
                        ctx.scene,
                    ),
                "Unsupported arrow type: not-an-arrow",
            );
        });

        test("'none' produces no mesh at all", () => {
            assert.isNull(
                EdgeMesh.createArrowHead(ctx.cache, "none", { type: "none", width: 1, color: "#FFF" }, ctx.scene),
            );
        });

        test("a missing type produces no mesh -- it does not default to normal", () => {
            // The retired mock defaulted an absent type to "normal". The product returns null, so
            // an edge whose style omits arrowHead.type draws no cap. That is the correct reading of
            // "the caller asked for nothing".
            assert.isNull(EdgeMesh.createArrowHead(ctx.cache, "missing", { width: 1, color: "#FFF" }, ctx.scene));
        });
    });

    describe("3D geometry", () => {
        beforeEach(() => {
            ctx = createMeshScene();
        });

        afterEach(() => {
            ctx.dispose();
        });

        ARROW_GEOMETRY.forEach(({ type, vertices }) => {
            test(`${type} has ${vertices} vertices and real faces`, () => {
                const mesh = arrow(type);

                assert.equal(mesh.getTotalVertices(), vertices);
                assert.isAbove(mesh.getTotalIndices(), 0, "vertices with no indices are never rasterised");
            });
        });

        ARROW_GEOMETRY.filter((entry) => entry.type !== "sphere-dot").forEach(({ type }) => {
            test(`${type} is flat in the XZ plane, which the billboard shader requires`, () => {
                // The tangent-billboarding shader rotates the cap about Y to face the camera. A
                // vertex off the plane would tumble out of the arrow when it does.
                const positions = mesh3DPositions(arrow(type));

                for (let i = 1; i < positions.length; i += 3) {
                    assert.equal(positions[i], 0, `${type} has a vertex off the XZ plane`);
                }
            });
        });

        test("sphere-dot is the one cap with real volume", () => {
            const positions = mesh3DPositions(arrow("sphere-dot"));
            let offPlane = 0;
            for (let i = 1; i < positions.length; i += 3) {
                if (positions[i] !== 0) {
                    offPlane += 1;
                }
            }

            assert.isAbove(offPlane, 0, "sphere-dot is a sphere, not a billboard");
        });

        test("the thirteen caps produce thirteen distinct geometries", () => {
            // Several caps share a vertex count -- normal, inverted and half-open are all three
            // vertices, and diamond, box, tee and vee are all four -- so a count alone cannot tell
            // them apart. Two caps collapsing onto one shape is exactly the kind of regression a
            // reader notices in a screenshot and a test usually does not.
            const seen = new Map<string, string>();

            for (const { type } of ARROW_GEOMETRY) {
                const fingerprint = geometryFingerprint(arrow(type));
                const clash = seen.get(fingerprint);
                assert.isUndefined(clash, `${type} draws the same geometry as ${clash}`);
                seen.set(fingerprint, type);
            }

            assert.equal(seen.size, ARROW_GEOMETRY.length);
        });

        test("normal and inverted point in opposite directions", () => {
            const normal = mesh3DPositions(arrow("normal"));
            const inverted = mesh3DPositions(arrow("inverted"));
            const normalReach = Math.max(...everyThird(normal, 0));
            const invertedReach = Math.max(...everyThird(inverted, 0));

            assert.notEqual(normalReach, invertedReach);
        });
    });

    describe("3D materials", () => {
        beforeEach(() => {
            ctx = createMeshScene();
        });

        afterEach(() => {
            ctx.dispose();
        });

        ARROW_GEOMETRY.filter((entry) => entry.type !== "sphere-dot").forEach(({ type }) => {
            test(`${type} is drawn with the billboard ShaderMaterial`, () => {
                const mesh = arrow(type);

                assert.instanceOf(mesh.material, ShaderMaterial);
            });
        });

        test("sphere-dot is drawn with an unlit StandardMaterial instead", () => {
            const mesh = arrow("sphere-dot");
            const material = mesh.material as StandardMaterial;

            assert.instanceOf(material, StandardMaterial);
            assert.isTrue(material.disableLighting);
            assert.deepEqual([material.diffuseColor.r, material.diffuseColor.g, material.diffuseColor.b], [1, 0, 0]);
            assert.deepEqual([material.emissiveColor.r, material.emissiveColor.g, material.emissiveColor.b], [1, 0, 0]);
        });

        test("the shader carries the attributes and uniforms tangent billboarding needs", () => {
            const material = arrow("normal").material as ShaderMaterial;
            const options = material.options as unknown as { uniforms: string[]; attributes: string[] };

            // Direction, size and colour are PER-INSTANCE attributes: every edge's head is an
            // instance of one shared mesh per shape, drawn in one call (issue #25). They were
            // per-material uniforms while each head was its own mesh and material.
            assert.deepEqual(options.attributes, ["position", "arrowDirection", "arrowSize", "arrowColor"]);
            assert.includeMembers(options.uniforms, ["viewProjection", "cameraPosition", "opacity"]);
        });

        test("the head's size is the world-space arrow length, not a unit scale", () => {
            const half = arrow("normal", { size: 0.5 });
            const double = arrow("normal", { size: 2 });

            assert.strictEqual(half.material, double.material, "heads of one shape share one material");
            assert.equal(half.instancedBuffers.arrowSize, EDGE_CONSTANTS.DEFAULT_ARROW_LENGTH * 0.5);
            assert.equal(double.instancedBuffers.arrowSize, EDGE_CONSTANTS.DEFAULT_ARROW_LENGTH * 2);
        });
    });

    describe("2D arrows", () => {
        beforeEach(() => {
            ctx = create2DMeshScene();
        });

        afterEach(() => {
            ctx.dispose();
        });

        ARROW_GEOMETRY.forEach(({ type }) => {
            test(`2D ${type} uses a StandardMaterial, not the billboard shader`, () => {
                const mesh = arrow(type);

                assert.instanceOf(mesh.material, StandardMaterial);
                assert.equal(mesh.name, `arrow-2d-${type}`);
            });
        });

        test("2D arrows are rotated a quarter turn into the view plane", () => {
            const mesh = arrow("normal");

            assert.closeTo(mesh.rotation.x, Math.PI / 2, 1e-6);
        });

        test("2D arrows are unlit and coloured through the emissive channel", () => {
            const material = arrow("normal", { color: "#00FF00" }).material as StandardMaterial;

            assert.isTrue(material.disableLighting);
            assert.deepEqual(
                [material.emissiveColor.r, material.emissiveColor.g, material.emissiveColor.b],
                [0, 1, 0],
            );
        });

        /**
         * The 2D caps come from `FilledArrowRenderer.getGeometryForType`, a switch no 3D arrow
         * ever reaches -- the 3D path calls each `create*` builder directly. Until these two cases
         * existed, that switch was covered by nothing: swapping the `diamond` arm to
         * `createTriangle(false, scene)` left all 106 cases in this file green, so a 2D diamond
         * silently drawing a triangle was invisible. The counts below are the 3D counts, because
         * both paths share the builders, with the one documented exception of sphere-dot.
         */
        const TWO_D_VERTICES = new Map(ARROW_GEOMETRY.map(({ type, vertices }) => [type, vertices]));

        // In 2D there is no depth to see a sphere with, so sphere-dot falls back to `dot`'s disc.
        TWO_D_VERTICES.set("sphere-dot", 34);

        ARROW_GEOMETRY.forEach(({ type }) => {
            test(`2D ${type} is built from its own geometry, not a default triangle`, () => {
                const mesh = arrow(type);
                const expected = TWO_D_VERTICES.get(type);

                assert.equal(
                    mesh.getTotalVertices(),
                    expected,
                    `2D ${type} should have ${String(expected)} vertices`,
                );
                assert.isAbove(mesh.getTotalIndices(), 0, `2D ${type} has vertices but no faces`);
            });
        });

        test("the 2D caps are as distinct from each other as the 3D caps are", () => {
            // dot and sphere-dot are the one deliberate collision -- see the flat-circle case
            // above -- so twelve distinct shapes across thirteen names is the right answer, and a
            // thirteenth collision is a regression.
            const seen = new Map<string, string[]>();

            for (const { type } of ARROW_GEOMETRY) {
                const fingerprint = geometryFingerprint(arrow(type));
                const names = seen.get(fingerprint) ?? [];

                names.push(type);
                seen.set(fingerprint, names);
            }

            const collisions = [...seen.values()].filter((names) => names.length > 1).map((names) => names.join("+"));

            assert.deepEqual(collisions, ["dot+sphere-dot"], "two 2D caps collapsed onto one shape");
            assert.equal(seen.size, ARROW_GEOMETRY.length - 1);
        });

        test("2D sphere-dot is a flat circle, not a sphere", () => {
            // In 2D there is no depth to see a sphere with, so sphere-dot falls back to the same
            // 34-vertex disc as `dot`. In 3D it is a 703-vertex sphere. Both are deliberate.
            const flat = arrow("sphere-dot");

            assert.equal(flat.getTotalVertices(), 34);
        });

        [0, 0.25, 0.5, 0.75, 1].forEach((opacity) => {
            test(`2D opacity ${opacity} reaches the mesh and the material`, () => {
                const mesh = arrow("normal", { opacity });

                assert.equal(mesh.visibility, opacity);
                assert.equal((mesh.material as StandardMaterial).alpha, opacity);
            });
        });
    });

    describe("Size, colour and opacity", () => {
        beforeEach(() => {
            ctx = createMeshScene();
        });

        afterEach(() => {
            ctx.dispose();
        });

        [0.5, 1, 2, 4].forEach((size) => {
            test(`size ${size} scales the sphere-dot's diameter`, () => {
                // sphere-dot is the one cap whose size shows up in its drawn EXTENT: the others are
                // sized by the shader's per-instance `arrowSize`, so their bounds are identical at
                // every size and only sphere-dot can be measured here. The sphere is a unit mesh
                // shared by every head of its colour, scaled per head, so the extent is measured
                // in world space.
                const mesh = arrow("sphere-dot", { size });
                mesh.computeWorldMatrix(true);
                const { extendSizeWorld } = mesh.getBoundingInfo().boundingBox;
                const expected = EDGE_CONSTANTS.DEFAULT_ARROW_LENGTH * size * 0.25;

                assert.closeTo(extendSizeWorld.x * 2, expected, 1e-3);
            });
        });

        ["#FF0000", "#00FF00", "#0000FF", "#FFFF00"].forEach((color) => {
            test(`colour ${color} reaches the material`, () => {
                const material = arrow("sphere-dot", { color }).material as StandardMaterial;
                const expected = [
                    parseInt(color.slice(1, 3), 16) / 255,
                    parseInt(color.slice(3, 5), 16) / 255,
                    parseInt(color.slice(5, 7), 16) / 255,
                ];

                assert.deepEqual([material.diffuseColor.r, material.diffuseColor.g, material.diffuseColor.b], expected);
            });
        });

        [0, 0.25, 0.5, 0.75, 1].forEach((opacity) => {
            test(`opacity ${opacity} reaches mesh.visibility`, () => {
                assert.equal(arrow("normal", { opacity }).visibility, opacity);
            });
        });

        test("size and opacity default to 1", () => {
            const explicit = arrow("sphere-dot", { size: 1, opacity: 1 });
            const implicit = arrow("sphere-dot");

            assert.equal(implicit.visibility, explicit.visibility);
            assert.closeTo(
                implicit.getBoundingInfo().boundingBox.extendSize.x,
                explicit.getBoundingInfo().boundingBox.extendSize.x,
                1e-9,
            );
        });
    });

    describe("Arrow dimensions and positioning", () => {
        beforeEach(() => {
            ctx = createMeshScene();
        });

        afterEach(() => {
            ctx.dispose();
        });

        test("the default width and length come from EDGE_CONSTANTS", () => {
            // The retired mock's defaults were 0.5 and 0.3. The real ones are 1.25 and 0.5, and the
            // line-gap maths below is computed from them, so the wrong numbers would have put every
            // cap in the wrong place.
            assert.equal(EdgeMesh.calculateArrowWidth(), 1.25);
            assert.equal(EdgeMesh.calculateArrowLength(), 0.5);
            assert.equal(EdgeMesh.calculateArrowWidth(), EDGE_CONSTANTS.DEFAULT_ARROW_WIDTH);
            assert.equal(EdgeMesh.calculateArrowLength(), EDGE_CONSTANTS.DEFAULT_ARROW_LENGTH);
        });

        test("dot and open-dot are positioned by their centre", () => {
            for (const type of ["dot", "open-dot"]) {
                const geometry = EdgeMesh.getArrowGeometry(type);
                assert.equal(geometry.positioningMode, "center");
                assert.isFalse(geometry.needsRotation);
                assert.equal(geometry.positionOffset, 0);
            }
        });

        test("sphere-dot is a quarter-size centre-positioned cap", () => {
            const geometry = EdgeMesh.getArrowGeometry("sphere-dot");

            assert.equal(geometry.positioningMode, "center");
            assert.equal(geometry.scaleFactor, EDGE_CONSTANTS.ARROW_SPHERE_DOT_DIAMETER_RATIO);
        });

        test("the billboard caps are positioned by their tip with no offset", () => {
            const tipCaps = ["normal", "vee", "tee", "half-open", "crow", "open-normal", "open-diamond", "diamond", "box"];

            for (const type of tipCaps) {
                const geometry = EdgeMesh.getArrowGeometry(type);
                assert.equal(geometry.positioningMode, "tip", type);
                assert.isFalse(geometry.needsRotation, type);
                assert.equal(geometry.positionOffset, 0, type);
            }
        });

        test("inverted is pushed a whole arrow length back so its base sits on the surface", () => {
            const geometry = EdgeMesh.getArrowGeometry("inverted");

            assert.equal(geometry.positioningMode, "tip");
            assert.equal(geometry.positionOffset, 1);
        });

        test("a centre-positioned cap is pulled back by its own radius", () => {
            const surface = new Vector3(10, 0, 0);
            const direction = new Vector3(1, 0, 0);
            const position = EdgeMesh.calculateArrowPosition(surface, direction, 0.5, EdgeMesh.getArrowGeometry("dot"));

            assert.closeTo(position.x, 10 - 0.25, 1e-9);
        });

        test("a tip-positioned cap sits exactly on the surface", () => {
            const surface = new Vector3(10, 0, 0);
            const direction = new Vector3(1, 0, 0);
            const position = EdgeMesh.calculateArrowPosition(
                surface,
                direction,
                0.5,
                EdgeMesh.getArrowGeometry("normal"),
            );

            assert.closeTo(position.x, 10, 1e-9);
        });

        test("the line stops short by the cap's real size, sphere-dot included", () => {
            const surface = new Vector3(10, 0, 0);
            const direction = new Vector3(1, 0, 0);

            const normalEnd = EdgeMesh.calculateLineEndpoint(
                surface,
                direction,
                0.5,
                EdgeMesh.getArrowGeometry("normal"),
            );
            const sphereEnd = EdgeMesh.calculateLineEndpoint(
                surface,
                direction,
                0.5,
                EdgeMesh.getArrowGeometry("sphere-dot"),
            );

            assert.closeTo(normalEnd.x, 9.5, 1e-9);
            assert.closeTo(sphereEnd.x, 10 - 0.5 * 0.25, 1e-9);
        });

        test("an unknown cap falls back to a rotated tip-positioned geometry", () => {
            // getArrowGeometry has a permissive default branch while createArrowHead throws. The two
            // are reached by different callers -- positioning maths runs before the mesh exists --
            // so the mismatch is deliberate, but it is worth pinning: a silently changed default
            // here moves every cap that ever reaches it.
            const geometry = EdgeMesh.getArrowGeometry("not-an-arrow");

            assert.equal(geometry.positioningMode, "tip");
            assert.isTrue(geometry.needsRotation);
            assert.equal(geometry.positionOffset, 0);
        });
    });
});

function mesh3DPositions(mesh: InstancedMesh): number[] {
    const positions = mesh.getVerticesData("position");
    assert.isNotNull(positions, "an arrow with no position data draws nothing");
    return Array.from(positions as Float32Array);
}

function everyThird(values: number[], offset: number): number[] {
    const picked: number[] = [];
    for (let i = offset; i < values.length; i += 3) {
        picked.push(values[i]);
    }

    return picked;
}
