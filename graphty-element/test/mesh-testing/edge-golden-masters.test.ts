/**
 * Edge Golden Master Tests
 *
 * Every line type the edge schema offers, built through the real `EdgeMesh.create` in 3D and in
 * 2D, plus the bezier and transform maths that positions it.
 *
 * WHAT THE RETIRED VERSION OF THIS FILE ASSERTED, AND WHY. It drove an `EdgeMeshFactory` that
 * imported nothing from `src/` and described one renderer handling everything. Four of its claims
 * are false, and each one was worth a block of cases:
 *
 *   - "EdgeMesh.create builds the arrows named in the style". It does not. Arrows come from a
 *     separate `EdgeMesh.createArrowHead` call, so roughly sixty cases passing
 *     `arrow: {source, target}` into `create` were exercising an API that has never existed. Arrow
 *     coverage lives in arrowhead-golden-masters.test.ts, against the call that really makes them,
 *     and the duplicate `ArrowMeshFactory Golden Masters` half of this file is deleted rather than
 *     translated.
 *   - "every line type uses CustomLineRenderer". Four different things happen: a solid 3D line is
 *     cached and instanced, a solid 2D line goes to `Simple2DLineRenderer`, the eight patterned
 *     types return a `PatternedLineMesh` (which is not a Babylon mesh at all), and a bezier goes to
 *     `CustomLineRenderer` with its geometry baked in world space.
 *   - "mesh.metadata carries width and color". `metadata` is null on a cached solid line. The two
 *     values the product really does put there are `isBezierCurve` and `is2DLine`, and both mean
 *     something to `Edge.update`.
 *   - "bezier works with patterned lines". It does not -- see the test that records it below.
 */

import { InstancedMesh, Mesh, ShaderMaterial, StandardMaterial, Vector3 } from "@babylonjs/core";
import { afterEach, assert, beforeEach, describe, test } from "vitest";

import type { EdgeStyleConfig } from "../../src/config";
import { EdgeStyle } from "../../src/config/EdgeStyle";
import { EdgeMesh } from "../../src/meshes/EdgeMesh";
import { PatternedLineMesh } from "../../src/meshes/PatternedLineMesh";
import { create2DMeshScene, createMeshScene, type MeshTestScene } from "./real-mesh-harness";

/** The eight line types that are drawn as a run of small meshes rather than as one line. */
const PATTERNED_TYPES = ["dot", "star", "box", "dash", "diamond", "dash-dot", "sinewave", "zigzag"] as const;
const ALL_LINE_TYPES = ["solid", ...PATTERNED_TYPES] as const;

let ctx: MeshTestScene;
let counter = 0;

interface EdgeArgs {
    style: EdgeStyleConfig;
    width?: number;
    color?: string;
    styleId?: string;
    src?: Vector3;
    dst?: Vector3;
}

function makeEdge(args: EdgeArgs): Mesh | InstancedMesh | PatternedLineMesh {
    counter += 1;
    return EdgeMesh.create(
        ctx.cache,
        { styleId: args.styleId ?? `edge-${counter}`, width: args.width ?? 20, color: args.color ?? "#FF0000" },
        args.style,
        ctx.scene,
        args.src,
        args.dst,
    ) as Mesh | InstancedMesh | PatternedLineMesh;
}

describe("Edge Golden Masters", () => {
    describe("3D dispatch", () => {
        beforeEach(() => {
            ctx = createMeshScene();
        });

        afterEach(() => {
            ctx.dispose();
        });

        test("a solid line is a cached instance drawn by the billboard shader", () => {
            const mesh = makeEdge({ style: { line: { type: "solid" } } }) as InstancedMesh;

            assert.instanceOf(mesh, InstancedMesh);
            assert.instanceOf(mesh.material, ShaderMaterial);
            assert.equal(ctx.cache.size(), 1);
        });

        test("solid is the default when the style names no type", () => {
            const implicit = makeEdge({ style: { line: {} } });
            const explicit = makeEdge({ style: { line: { type: "solid" } } });

            assert.equal(implicit.constructor.name, explicit.constructor.name);
            assert.instanceOf(implicit, InstancedMesh);
        });

        test("a style with no line block at all still produces a line", () => {
            const mesh = makeEdge({ style: {} });

            assert.instanceOf(mesh, InstancedMesh);
        });

        PATTERNED_TYPES.forEach((lineType) => {
            test(`${lineType} is drawn as a run of pattern meshes`, () => {
                const mesh = makeEdge({ style: { line: { type: lineType } } }) as PatternedLineMesh;

                assert.instanceOf(mesh, PatternedLineMesh);
                assert.equal(mesh.pattern, lineType);
                assert.isAbove(mesh.meshes.length, 0, "a pattern with no elements draws nothing");
            });
        });

        test("patterned lines are not cached -- each edge owns its own run of meshes", () => {
            makeEdge({ style: { line: { type: "dot" } }, styleId: "shared-pattern" });
            makeEdge({ style: { line: { type: "dot" } }, styleId: "shared-pattern" });

            assert.equal(ctx.cache.size(), 0);
        });

        test("two edges sharing a style id share one cached solid line", () => {
            const first = makeEdge({ style: { line: { type: "solid" } }, styleId: "shared-solid" }) as InstancedMesh;
            const second = makeEdge({ style: { line: { type: "solid" } }, styleId: "shared-solid" }) as InstancedMesh;

            assert.notStrictEqual(first, second, "each edge gets its own instance");
            assert.strictEqual(first.sourceMesh, second.sourceMesh);
            assert.equal(ctx.cache.size(), 1);
        });

        test("an animation speed swaps the billboard shader for a scrolling texture", () => {
            const still = makeEdge({ style: { line: { type: "solid" } } }) as InstancedMesh;
            const moving = makeEdge({ style: { line: { type: "solid", animationSpeed: 2 } } }) as InstancedMesh;

            assert.instanceOf(still.material, ShaderMaterial);
            assert.instanceOf(moving.material, StandardMaterial);
        });

        [0.5, 1, 2, 4].forEach((animationSpeed) => {
            test(`animation speed ${animationSpeed} still produces a drawable line`, () => {
                const mesh = makeEdge({ style: { line: { type: "solid", animationSpeed } } }) as InstancedMesh;

                assert.isAbove(mesh.getTotalVertices(), 0);
            });
        });

        [0, 0.25, 0.5, 0.75, 1].forEach((opacity) => {
            test(`line opacity ${opacity} reaches mesh.visibility`, () => {
                const mesh = makeEdge({ style: { line: { type: "solid", opacity } } });

                assert.equal(mesh.visibility, opacity);
            });
        });
    });

    describe("Pattern density", () => {
        beforeEach(() => {
            ctx = createMeshScene();
        });

        afterEach(() => {
            ctx.dispose();
        });

        test("without patternCount the element count follows the line's length", () => {
            const mesh = makeEdge({ style: { line: { type: "dot" } } }) as PatternedLineMesh;
            const initial = mesh.meshes.length;

            mesh.update(new Vector3(0, 0, 0), new Vector3(50, 0, 0));

            assert.isAbove(mesh.meshes.length, initial, "a longer edge gets more dots");
        });

        test("patternCount pins the element count whatever the line does", () => {
            // This is the whole point of the option: the spacing rule puts elements one and a half
            // element-widths apart, so a long edge at a small line width can reach tens of thousands
            // of meshes and the frame rate collapses. A pinned count that drifted under update()
            // would give the caller no way to stop that.
            const mesh = makeEdge({ style: { line: { type: "dot", patternCount: 5 } } }) as PatternedLineMesh;

            assert.equal(mesh.meshes.length, 5);
            mesh.update(new Vector3(0, 0, 0), new Vector3(50, 0, 0));
            assert.equal(mesh.meshes.length, 5);
        });

        [2, 3, 8, 20].forEach((patternCount) => {
            test(`patternCount ${patternCount} produces exactly that many elements`, () => {
                const mesh = makeEdge({ style: { line: { type: "dash", patternCount } } }) as PatternedLineMesh;

                assert.equal(mesh.meshes.length, patternCount);
            });
        });

        test("the schema refuses a pattern count below two", () => {
            assert.isFalse(EdgeStyle.safeParse({ line: { type: "dot", patternCount: 1 } }).success);
            assert.isTrue(EdgeStyle.safeParse({ line: { type: "dot", patternCount: 2 } }).success);
        });
    });

    describe("2D dispatch", () => {
        beforeEach(() => {
            ctx = create2DMeshScene();
        });

        afterEach(() => {
            ctx.dispose();
        });

        test("a solid line in 2D is a world-space mesh, not a billboard instance", () => {
            const mesh = makeEdge({ style: { line: { type: "solid" } } }) as Mesh;

            assert.notInstanceOf(mesh, InstancedMesh);
            assert.instanceOf(mesh.material, StandardMaterial);
            assert.isTrue(mesh.metadata.is2DLine, "Edge.update reads this to decide how to move the line");
            assert.equal(ctx.cache.size(), 0, "2D lines are per-edge, so nothing is cached");
        });

        test("2D lines are unlit and coloured through the emissive channel", () => {
            const mesh = makeEdge({ style: { line: { type: "solid" } }, color: "#00FF00" }) as Mesh;
            const material = mesh.material as StandardMaterial;

            assert.isTrue(material.disableLighting);
            assert.deepEqual([material.emissiveColor.r, material.emissiveColor.g, material.emissiveColor.b], [0, 1, 0]);
        });

        test("2D line opacity lands on the material's alpha", () => {
            const mesh = makeEdge({ style: { line: { type: "solid", opacity: 0.4 } } }) as Mesh;

            assert.equal((mesh.material as StandardMaterial).alpha, 0.4);
        });

        test("the requested width reaches the 2D line's geometry", () => {
            const thin = makeEdge({ style: { line: { type: "solid" } }, width: 20 }) as Mesh;
            const thick = makeEdge({ style: { line: { type: "solid" } }, width: 80 }) as Mesh;

            assert.isAbove(Number(thick.metadata.lineWidth), Number(thin.metadata.lineWidth));
        });

        PATTERNED_TYPES.forEach((lineType) => {
            test(`2D ${lineType} still uses the patterned renderer`, () => {
                const mesh = makeEdge({ style: { line: { type: lineType } } });

                assert.instanceOf(mesh, PatternedLineMesh);
            });
        });
    });

    describe("Bezier curves", () => {
        beforeEach(() => {
            ctx = createMeshScene();
        });

        afterEach(() => {
            ctx.dispose();
        });

        test("a bezier is a per-edge mesh flagged so nothing transforms it again", () => {
            const mesh = makeEdge({
                style: { line: { type: "solid", bezier: true } },
                src: new Vector3(0, 0, 0),
                dst: new Vector3(5, 0, 0),
            }) as Mesh;

            assert.isTrue(mesh.metadata.isBezierCurve);
            assert.equal(ctx.cache.size(), 0);
            assert.isAbove(mesh.getTotalVertices(), 4, "a curve needs more than the four corners of a quad");
        });

        test("bezier is ignored without both endpoints", () => {
            const mesh = makeEdge({ style: { line: { type: "solid", bezier: true } } });

            assert.instanceOf(mesh, InstancedMesh);
        });

        test("bezier silently wins over a line pattern", () => {
            // REPORTED, NOT FIXED. `EdgeMesh.create` tests `style.line.bezier` before it looks at
            // the line type, so `{type: "dash", bezier: true}` -- a style the schema accepts in
            // full -- draws a SOLID curve and the dashes are gone. Nothing warns. This is the same
            // shape of defect as the gradient node colours that rendered flat white: the schema
            // says yes, the renderer quietly does something else, and the caller pays the interning
            // cost for a style they do not get.
            //
            // This asserts what happens today so the behaviour is at least recorded. It fails the
            // moment patterned beziers work, which is the right prompt to update it.
            const mesh = makeEdge({
                style: { line: { type: "dash", bezier: true } },
                src: new Vector3(0, 0, 0),
                dst: new Vector3(5, 0, 0),
            });

            assert.notInstanceOf(mesh, PatternedLineMesh);
            assert.isTrue((mesh as Mesh).metadata.isBezierCurve);
        });

        test("bezier opacity reaches the mesh", () => {
            const mesh = makeEdge({
                style: { line: { type: "solid", bezier: true, opacity: 0.3 } },
                src: new Vector3(0, 0, 0),
                dst: new Vector3(5, 0, 0),
            });

            assert.equal(mesh.visibility, 0.3);
        });

        test("the curve starts and ends where it was asked to", () => {
            const points = EdgeMesh.createBezierLine(new Vector3(0, 0, 0), new Vector3(5, 0, 0));

            assert.isAbove(points.length / 3, 2, "a curve needs intermediate points to bow");
            assert.deepEqual(points.slice(0, 3), [0, 0, 0]);
            assert.deepEqual(points.slice(-3), [5, 0, 0]);
        });

        test("the curve bows rather than running straight", () => {
            // The whole visible point of a bezier edge, and the thing a mesh-exists assertion
            // cannot see: a renderer that dropped the control points would still return a mesh.
            const points = EdgeMesh.createBezierLine(new Vector3(0, 0, 0), new Vector3(5, 0, 0));
            let offAxis = 0;

            for (let i = 0; i < points.length; i += 3) {
                offAxis = Math.max(offAxis, Math.abs(points[i + 1]), Math.abs(points[i + 2]));
            }

            assert.isAbove(offAxis, 0);
        });

        test("a self-loop becomes a closed curve rather than a zero-length line", () => {
            const loop = EdgeMesh.createBezierLine(new Vector3(1, 1, 1), new Vector3(1, 1, 1));

            assert.isAbove(loop.length / 3, 2);
        });
    });

    describe("Transforming a straight line", () => {
        beforeEach(() => {
            ctx = createMeshScene();
        });

        afterEach(() => {
            ctx.dispose();
        });

        test("the line is centred between its endpoints and scaled to their distance", () => {
            const mesh = makeEdge({ style: { line: { type: "solid" } } });
            EdgeMesh.transformMesh(mesh as Mesh, new Vector3(0, 0, 0), new Vector3(0, 0, 10));

            assert.closeTo(mesh.position.z, 5, 1e-6);
            assert.closeTo(mesh.scaling.z, 10, 1e-6);
        });

        test("a diagonal line lands on the midpoint too", () => {
            const mesh = makeEdge({ style: { line: { type: "solid" } } });
            EdgeMesh.transformMesh(mesh as Mesh, new Vector3(-3, -4, 0), new Vector3(3, 4, 0));

            assert.closeTo(mesh.position.x, 0, 1e-6);
            assert.closeTo(mesh.position.y, 0, 1e-6);
            assert.closeTo(mesh.scaling.z, 10, 1e-6);
        });
    });

    describe("The line vocabulary", () => {
        beforeEach(() => {
            ctx = createMeshScene();
        });

        afterEach(() => {
            ctx.dispose();
        });

        ALL_LINE_TYPES.forEach((lineType) => {
            test(`the edge schema accepts line type "${lineType}"`, () => {
                assert.isTrue(EdgeStyle.safeParse({ line: { type: lineType } }).success);
            });
        });

        test("every line type the schema accepts produces something drawable", () => {
            for (const lineType of ALL_LINE_TYPES) {
                const mesh = makeEdge({ style: { line: { type: lineType } } });
                const drawn =
                    mesh instanceof PatternedLineMesh ? mesh.meshes.length > 0 : (mesh as Mesh).getTotalVertices() > 0;

                assert.isTrue(drawn, `line type "${lineType}" produced nothing to draw`);
            }
        });

        test("a line type outside the vocabulary is refused by the schema", () => {
            assert.isFalse(EdgeStyle.safeParse({ line: { type: "squiggle" } }).success);
        });
    });
});
