import { Mesh, NullEngine, Scene, ShaderMaterial, Vector3, VertexData } from "@babylonjs/core";
import { assert, beforeEach, describe, test } from "vitest";

import { PATTERN_CONSTANTS } from "../src/constants/meshConstants";
import { FilledArrowRenderer } from "../src/meshes/FilledArrowRenderer";
import { discreteMeshCount, discreteMeshOffsets, patternElementPeriod } from "../src/meshes/PatternedLineMesh";
import { PATTERN_DEFINITIONS, PatternedLineRenderer, type PatternType } from "../src/meshes/PatternedLineRenderer";

/**
 * Regression suite for the patterned-line mesh explosion.
 *
 * THE DEFECT, in the product owner's words: "I changed line style to dot and width to 1
 * and everything crawled to a halt."
 *
 * The cause was a mesh count of the form O(lineLength / lineWidth) with no ceiling. Each
 * pattern element is a real Babylon Mesh with its own ShaderMaterial, its own draw call and
 * two per-frame uniform writes, so the count IS the cost. Evaluating the shipped formula
 * exactly at edge length 5, and totalling across Karate Club's 78 edges:
 *   line width 8 -> 16 meshes/edge -> 1,248 meshes
 *   line width 4 -> 33 meshes/edge -> 2,574 meshes
 *   line width 2 -> 66 meshes/edge -> 5,148 meshes
 *   line width 1 -> 133 meshes/edge -> 10,374 meshes
 * At edge length 20 and width 1 it was 533 per edge, 41,574 in total. Making the line
 * THINNER made it eight times more expensive, because the element spacing was derived from
 * the element width alone.
 *
 * These tests pin the three properties the repair must keep true forever: a hard ceiling,
 * a width-free upper bound (so thinning a line can never again multiply the cost), and
 * positions that stay evenly spaced when the ceiling bites.
 */

/**
 * EdgeMesh.createLine converts a style's line width into a pattern width by dividing by 40
 * ("Convert back from scaled width - need /40 to match solid line thickness"). Every count
 * in the measurements above was taken through that conversion, so the tests reproduce it
 * rather than feeding raw style widths to a function that expects world units.
 * @param styleLineWidth - Line width as the style layer expresses it (the element default is 8)
 * @returns The pattern element width in world units
 */
function patternWidthForStyleWidth(styleLineWidth: number): number {
    return styleLineWidth / 40;
}

/**
 * Rendered length of one pattern element ALONG the line, which is what the spacing maths
 * works in. Mirrors PatternedLineMesh.getRenderedMeshSize: circular and 1:1 shapes render at
 * the pattern width, elongated boxes render at width x aspectRatio.
 * @param pattern - The pattern type
 * @param patternWidth - Pattern width in world units
 * @returns Rendered element length along the line, in world units
 */
function renderedElementLength(pattern: PatternType, patternWidth: number): number {
    const shape = PATTERN_DEFINITIONS[pattern].shapes[0];
    return patternWidth * (shape.type === "box" ? (shape.aspectRatio ?? 1) : 1);
}

const DISCRETE_PATTERNS: PatternType[] = ["dot", "star", "box", "dash", "diamond", "dash-dot"];
const LENGTH_LADDER = [2, 5, 10, 20];
const STYLE_WIDTH_LADDER = [8, 4, 2, 1];

describe("patterned line mesh count", () => {
    describe("ceiling", () => {
        test("never exceeds MAX_MESHES_PER_EDGE anywhere on the length x width ladder", () => {
            for (const pattern of DISCRETE_PATTERNS) {
                const def = PATTERN_DEFINITIONS[pattern];
                for (const length of LENGTH_LADDER) {
                    for (const styleWidth of STYLE_WIDTH_LADDER) {
                        const meshWidth = renderedElementLength(pattern, patternWidthForStyleWidth(styleWidth));
                        const count = discreteMeshCount(length, meshWidth, def);

                        assert.isAtMost(
                            count,
                            PATTERN_CONSTANTS.MAX_MESHES_PER_EDGE,
                            `${pattern} at length ${length}, style width ${styleWidth} built ${count} meshes`,
                        );
                    }
                }
            }
        });

        test("clamps exactly at the ceiling on a long thin line rather than returning something larger", () => {
            // Before the repair this exact case (dot, length 20, style width 1) returned 533.
            const meshWidth = patternWidthForStyleWidth(1);
            assert.equal(
                discreteMeshCount(20, meshWidth, PATTERN_DEFINITIONS.dot),
                PATTERN_CONSTANTS.MAX_MESHES_PER_EDGE,
            );
        });
    });

    describe("width independence", () => {
        test("the count obeys a bound that does not mention the width at all", () => {
            // The period is at least patternDef.spacing.min regardless of how thin the element
            // gets, so the count can never exceed length / spacing.min + 2 (first and last).
            // THIS is the property that was missing: with the old period of meshWidth * 1.5
            // the bound contained the width, so halving the width doubled the ceiling.
            for (const pattern of DISCRETE_PATTERNS) {
                const def = PATTERN_DEFINITIONS[pattern];
                for (const length of LENGTH_LADDER) {
                    const widthFreeBound = Math.min(
                        Math.floor(length / def.spacing.min) + 2,
                        PATTERN_CONSTANTS.MAX_MESHES_PER_EDGE,
                    );

                    for (const styleWidth of STYLE_WIDTH_LADDER) {
                        const meshWidth = renderedElementLength(pattern, patternWidthForStyleWidth(styleWidth));
                        const count = discreteMeshCount(length, meshWidth, def);

                        assert.isAtMost(
                            count,
                            widthFreeBound,
                            `${pattern} at length ${length}, style width ${styleWidth}: ${count} exceeds the width-free bound ${widthFreeBound}`,
                        );
                    }
                }
            }
        });

        test("the count converges as the width shrinks towards zero instead of diverging", () => {
            // The reported halt was this divergence. Driving the element width down by four
            // orders of magnitude must not move the answer, because below the pattern's own
            // world-space spacing floor the width stops participating in the period.
            const def = PATTERN_DEFINITIONS.dot;
            const atTiny = discreteMeshCount(5, 1e-4, def);
            const atTinier = discreteMeshCount(5, 1e-5, def);

            assert.equal(atTiny, atTinier, "the count still depends on the width in the thin limit");
            assert.isAtMost(atTiny, PATTERN_CONSTANTS.MAX_MESHES_PER_EDGE);
        });

        test("thinning a dotted line from style width 8 to 1 no longer multiplies the count eightfold", () => {
            // Measured before the repair at edge length 5: 16 meshes at width 8, 133 at width 1.
            const def = PATTERN_DEFINITIONS.dot;
            const atWidth8 = discreteMeshCount(5, patternWidthForStyleWidth(8), def);
            const atWidth1 = discreteMeshCount(5, patternWidthForStyleWidth(1), def);

            assert.isAtMost(atWidth1, 30, `width 1 built ${atWidth1} meshes; the shipped formula built 133`);
            assert.isAtMost(
                atWidth1 / atWidth8,
                2,
                `thinning multiplied the count by ${atWidth1 / atWidth8}x; the shipped formula multiplied it by 8.3x`,
            );
        });
    });

    describe("period", () => {
        test("is at least the element length, so elements can never overlap", () => {
            for (const pattern of DISCRETE_PATTERNS) {
                const def = PATTERN_DEFINITIONS[pattern];
                for (const styleWidth of STYLE_WIDTH_LADDER) {
                    const meshWidth = renderedElementLength(pattern, patternWidthForStyleWidth(styleWidth));
                    assert.isAtLeast(patternElementPeriod(meshWidth, def), meshWidth);
                }
            }
        });

        test("honours the pattern definition's world-space spacing floor once the element is thin", () => {
            // PATTERN_DEFINITIONS[*].spacing was dead code before this repair: the count read
            // only .connected off it and the position routine took it as an unused parameter.
            const def = PATTERN_DEFINITIONS.dot;
            assert.isAtLeast(patternElementPeriod(1e-6, def), def.spacing.min);
        });
    });

    describe("positions", () => {
        test("returns exactly the requested count, first and last touching the boundaries, evenly spaced", () => {
            for (const length of LENGTH_LADDER) {
                for (const styleWidth of STYLE_WIDTH_LADDER) {
                    const meshWidth = patternWidthForStyleWidth(styleWidth);
                    const count = discreteMeshCount(length, meshWidth, PATTERN_DEFINITIONS.dot);
                    const offsets = discreteMeshOffsets(length, meshWidth, count);

                    assert.lengthOf(offsets, count, `length ${length}, style width ${styleWidth}`);

                    // First element's left edge sits on the start boundary.
                    assert.closeTo(offsets[0] - meshWidth / 2, 0, 1e-9);
                    // Last element's right edge sits on the end boundary.
                    assert.closeTo(offsets[offsets.length - 1] + meshWidth / 2, length, 1e-9);

                    // Even spacing. The first/last-touches-the-boundary rule pushes any error
                    // in the spacing entirely into the gap nearest the end of the line, so an
                    // uneven last gap is the visible symptom of the count and the positions
                    // disagreeing -- which is exactly what the ceiling could have caused.
                    const gaps: number[] = [];
                    for (let i = 1; i < offsets.length; i++) {
                        gaps.push(offsets[i] - offsets[i - 1]);
                    }

                    for (const gap of gaps) {
                        assert.closeTo(gap, gaps[0], 1e-9, `uneven gap at length ${length}, style width ${styleWidth}`);
                    }
                }
            }
        });

        test("stays evenly spaced when the ceiling has clamped the count", () => {
            // Long thin line: the count is clamped, so the spacing must stretch rather than
            // leave the meshes bunched at one end with one enormous final gap.
            const meshWidth = patternWidthForStyleWidth(1);
            const count = discreteMeshCount(20, meshWidth, PATTERN_DEFINITIONS.dot);
            assert.equal(count, PATTERN_CONSTANTS.MAX_MESHES_PER_EDGE);

            const offsets = discreteMeshOffsets(20, meshWidth, count);
            const firstGap = offsets[1] - offsets[0];
            const lastGap = offsets[offsets.length - 1] - offsets[offsets.length - 2];

            assert.closeTo(lastGap, firstGap, 1e-9, "the last gap does not match the rest");
        });

        test("degenerate counts collapse to the two boundary elements", () => {
            const offsets = discreteMeshOffsets(4, 0.2, 2);
            assert.deepEqual(offsets, [0.1, 3.9]);
        });
    });
});

describe("patterned line material lifetime", () => {
    let scene: Scene;

    beforeEach(() => {
        const engine = new NullEngine();
        scene = new Scene(engine);
    });

    test("disposing a patterned line disposes its materials and unregisters them from the per-frame walk", () => {
        // THE DEFECT: PatternedLineMesh.dispose called mesh.dispose() with Babylon's default
        // arguments, which does NOT dispose the material. Each orphaned ShaderMaterial stayed
        // in PatternedLineRenderer's and FilledArrowRenderer's activeMaterials sets, both of
        // which are walked once per frame to push the camera uniform. The catch inside those
        // walks looks like an eviction path but cannot fire, because ShaderMaterial.setVector3
        // does not throw on a disposed material. So the per-frame cost grew monotonically with
        // every single style edit, on top of the mesh explosion above.
        const patternBefore = PatternedLineRenderer.getActiveMaterialCount();
        const arrowBefore = FilledArrowRenderer.getActiveMaterialCount();

        const line = PatternedLineRenderer.create(
            "dot",
            new Vector3(0, 0, 0),
            new Vector3(5, 0, 0),
            0.2,
            "#FF0000",
            1,
            scene,
        );

        assert.isAbove(line.meshes.length, 2, "expected a multi-element dotted line");

        const materials = line.meshes.map((mesh) => mesh.material as ShaderMaterial);
        for (const material of materials) {
            assert.instanceOf(material, ShaderMaterial);
            // Babylon registers every live material on the scene and removes it on dispose,
            // so scene.materials membership is the observable proof of disposal.
            assert.include(scene.materials, material);
        }

        assert.equal(PatternedLineRenderer.getActiveMaterialCount(), patternBefore + materials.length);
        assert.equal(FilledArrowRenderer.getActiveMaterialCount(), arrowBefore + materials.length);

        line.dispose();

        for (const material of materials) {
            assert.notInclude(scene.materials, material, "a pattern ShaderMaterial outlived its mesh");
        }

        assert.equal(
            PatternedLineRenderer.getActiveMaterialCount(),
            patternBefore,
            "pattern materials are still registered for per-frame camera updates",
        );
        assert.equal(
            FilledArrowRenderer.getActiveMaterialCount(),
            arrowBefore,
            "arrow-shader materials are still registered for per-frame camera updates",
        );
    });
});

describe("shader mesh frustum culling", () => {
    let scene: Scene;

    beforeEach(() => {
        const engine = new NullEngine();
        scene = new Scene(engine);
    });

    /**
     * Longest distance from the mesh origin to any of its vertices. This is what the
     * billboarding vertex shader magnifies by its `size` uniform, and therefore what the
     * bounding volume has to cover.
     * @param mesh - A mesh with position vertex data already applied
     * @returns The furthest vertex distance from the local origin, in geometry units
     */
    function maxVertexReach(mesh: Mesh): number {
        const positions = mesh.getVerticesData("position");
        assert.exists(positions, "expected geometry on the mesh");

        let reach = 0;
        for (let i = 0; i + 2 < (positions as Float32Array | number[]).length; i += 3) {
            const data = positions as Float32Array | number[];
            const distance = Math.hypot(data[i], data[i + 1], data[i + 2]);
            reach = Math.max(reach, distance);
        }

        return reach;
    }

    test("a shadered mesh is culled normally, against a volume that covers what the shader draws", () => {
        // THE DEFECT: applyShader set mesh.alwaysSelectAsActiveMesh = true on every mesh it
        // touched, so nothing on this path was ever frustum culled -- all ~10,000 meshes of a
        // thin dotted graph were submitted every frame regardless of where the camera pointed.
        // Its comment blamed thin instances and a template parked at y = -10000; both are
        // obsolete. applyShader has three call sites, none of which parks a template, and the
        // y = -10000 template that does exist holds NODE meshes and never reaches this code.
        //
        // The reason the flag could not simply be deleted: the vertex shader ignores the mesh's
        // rotation and scaling and lays each vertex out as worldCenter + localPosition * size,
        // so the GPU draws the geometry magnified by `size` while Babylon's CPU-side bounds
        // still describe the un-magnified geometry. Culling against the small volume would have
        // made arrowheads and dots vanish at the edges of the screen -- the exact symptom the
        // flag was added to suppress. So the repair resizes the volume instead of switching
        // culling off, and this test pins the covering property.
        const mesh = new Mesh("shader-bounds-probe", scene);
        const geometry = new VertexData();
        geometry.positions = [0, 0, 0, -1, 0, -0.4, -1, 0, 0.4];
        geometry.indices = [0, 1, 2];
        geometry.applyToMesh(mesh);

        const size = 4;
        const reach = maxVertexReach(mesh);
        FilledArrowRenderer.applyShader(mesh, { size, color: "#FFFFFF", opacity: 1 }, scene);

        assert.isFalse(mesh.alwaysSelectAsActiveMesh, "culling is still disabled on shadered meshes");

        const { minimum, maximum } = mesh.getBoundingInfo().boundingBox;
        const halfExtent = Math.min(maximum.x, maximum.y, maximum.z);

        assert.isAtLeast(
            halfExtent,
            size * reach,
            "the bounding volume is smaller than the geometry the shader actually draws",
        );
        assert.isAtLeast(Math.min(-minimum.x, -minimum.y, -minimum.z), size * reach);
    });

    test("pattern dots carry a bounding volume at least as large as the dot the shader draws", () => {
        // A dot's geometry is 2.0 across and its shader size is patternWidth / 2, so the drawn
        // dot is patternWidth across while the raw geometry bounds say 2.0. Getting this
        // backwards is what would make dots blink out near the screen edge.
        const patternWidth = 0.8;
        const line = PatternedLineRenderer.create(
            "dot",
            new Vector3(0, 0, 0),
            new Vector3(6, 0, 0),
            patternWidth,
            "#00FF00",
            1,
            scene,
        );

        for (const mesh of line.meshes) {
            assert.isFalse(mesh.alwaysSelectAsActiveMesh, "culling is still disabled on pattern meshes");

            const { maximum } = mesh.getBoundingInfo().boundingBox;
            assert.isAtLeast(
                Math.min(maximum.x, maximum.y, maximum.z),
                patternWidth / 2,
                "a pattern dot's bounds are smaller than the dot the shader draws",
            );
        }

        line.dispose();
    });

    test("a mesh with no geometry keeps the never-cull fallback rather than being culled to nothing", () => {
        const mesh = new Mesh("empty-shader-probe", scene);
        FilledArrowRenderer.applyShader(mesh, { size: 1, color: "#FFFFFF", opacity: 1 }, scene);

        assert.isTrue(mesh.alwaysSelectAsActiveMesh, "an unmeasurable mesh must not be culled");

        mesh.dispose(false, true);
    });
});
