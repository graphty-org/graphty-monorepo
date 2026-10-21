import { NullEngine, Scene, Vector3 } from "@babylonjs/core";
import { afterEach, assert, beforeEach, describe, test } from "vitest";

import { FilledArrowRenderer } from "../src/meshes/FilledArrowRenderer";
import { discreteMeshCount, discreteMeshOffsets, patternElementPeriod } from "../src/meshes/PatternedLineMesh";
import { PatternedLineRenderer } from "../src/meshes/PatternedLineRenderer";

/**
 * The patterned-line element count, and who decides it.
 *
 * THE COST. Every pattern element is a real Babylon Mesh with its own ShaderMaterial, its own
 * draw call and two per-frame uniform writes, so the count IS the cost. Under the spacing rule
 * the count is O(lineLength / lineWidth): at edge length 5, across Karate Club's 78 edges,
 *   line width 8 -> 16 meshes/edge -> 1,248 meshes
 *   line width 1 -> 133 meshes/edge -> 10,374 meshes
 * Thinning the line makes it more expensive, because the spacing is derived from the element
 * width. That is a real cost and the product owner hit it: "I changed line style to dot and
 * width to 1 and everything crawled to a halt."
 *
 * WHO FIXES IT. A renderer-imposed ceiling was tried and removed: it bought frame rate by
 * silently drawing something other than what the caller asked for, which is the renderer making
 * a visual decision that belongs to the caller. The count is now the caller's, through
 * `line.patternCount`. Unset, the spacing rule applies exactly as it always has, so existing
 * graphs and stories render unchanged.
 *
 * These tests pin both halves: the spacing rule is the historical one and stays unbounded, and
 * an explicit count overrides it for every discrete pattern type and spaces evenly. Connected
 * patterns (zigzag, sinewave) ignore it and always tile the whole line.
 */

/** EdgeMesh.createLine converts a style line width to a pattern element width this way. */
function patternWidthForStyleWidth(styleWidth: number): number {
    return styleWidth / 40;
}

describe("patterned line element count", () => {
    describe("the spacing rule (line.patternCount unset)", () => {
        test("is the historical period: one and a half element widths", () => {
            for (const meshWidth of [0.025, 0.1, 0.2, 1]) {
                assert.closeTo(
                    patternElementPeriod(meshWidth),
                    meshWidth * 1.5,
                    1e-12,
                    `period at element width ${meshWidth}`,
                );
            }
        });

        test("grows with the line length, with no ceiling", () => {
            const meshWidth = patternWidthForStyleWidth(1);
            const short = discreteMeshCount(5, meshWidth);
            const long = discreteMeshCount(20, meshWidth);
            const longer = discreteMeshCount(80, meshWidth);

            assert.isAbove(long, short, "a longer line must take more elements");
            assert.isAbove(longer, long, "and longer still, more again");
            // the historical numbers, which are what makes the stories render as they did
            assert.equal(short, 133);
            assert.equal(long, 533);
        });

        test("puts the first and last elements on the line's ends, evenly spaced between", () => {
            const meshWidth = patternWidthForStyleWidth(4);
            const count = discreteMeshCount(10, meshWidth);
            const offsets = discreteMeshOffsets(10, meshWidth, count);

            assert.equal(offsets.length, count);
            const gaps = offsets.slice(1).map((o, i) => o - offsets[i]);
            for (const gap of gaps) {
                assert.closeTo(gap, gaps[0], 1e-9, "gaps are not even");
            }
        });

        test("collapses to the two boundary elements on a line too short to hold more", () => {
            const meshWidth = patternWidthForStyleWidth(8);
            const gap = patternElementPeriod(meshWidth) - meshWidth;
            assert.equal(discreteMeshCount(2 * meshWidth + gap * 1.01, meshWidth), 2);
            assert.equal(discreteMeshCount(2 * meshWidth + gap + patternElementPeriod(meshWidth) * 0.99, meshWidth), 2);
        });

        test("draws one element, at the start, on a line with no room for two and a gap", () => {
            // two squeezed onto it touch or overlap and draw a solid line (pajek-synth-lines arc 2 -> 3)
            const meshWidth = patternWidthForStyleWidth(8);
            const gap = patternElementPeriod(meshWidth) - meshWidth;
            for (const length of [0, meshWidth, 2 * meshWidth, 2 * meshWidth + gap * 0.99]) {
                assert.equal(discreteMeshCount(length, meshWidth), 1, `length ${length}`);
            }
            assert.deepEqual(discreteMeshOffsets(2 * meshWidth, meshWidth, 1), [meshWidth / 2]);
            // shorter than the element: centered on it
            assert.deepEqual(discreteMeshOffsets(meshWidth / 2, meshWidth, 1), [meshWidth / 4]);
        });
    });

    describe("line.patternCount (the caller's decision)", () => {
        test("overrides the spacing rule regardless of length or width", () => {
            for (const styleWidth of [1, 4, 8]) {
                for (const length of [5, 20, 80]) {
                    assert.equal(
                        discreteMeshCount(length, patternWidthForStyleWidth(styleWidth), 12),
                        12,
                        `length ${length}, style width ${styleWidth}`,
                    );
                }
            }
        });

        test("is what makes the cost independent of the line width", () => {
            const atWidth8 = discreteMeshCount(5, patternWidthForStyleWidth(8), 16);
            const atWidth1 = discreteMeshCount(5, patternWidthForStyleWidth(1), 16);

            assert.equal(atWidth1, atWidth8, "thinning the line must not multiply the count");
        });

        test("never drops below the two boundary elements", () => {
            assert.equal(discreteMeshCount(20, patternWidthForStyleWidth(4), 2), 2);
        });

        test("spaces the requested count evenly over the line", () => {
            const meshWidth = patternWidthForStyleWidth(1);
            const count = discreteMeshCount(20, meshWidth, 24);
            assert.equal(count, 24);

            const offsets = discreteMeshOffsets(20, meshWidth, count);
            const firstGap = offsets[1] - offsets[0];
            const lastGap = offsets[offsets.length - 1] - offsets[offsets.length - 2];

            assert.closeTo(lastGap, firstGap, 1e-9, "the last gap does not match the rest");
        });
    });

    describe("connected patterns (zigzag, sinewave) always reach the line end", () => {
        /** The fixed length of one connected segment, `PatternedLineMesh.SEGMENT_LENGTH`. */
        const SEGMENT = 0.75;
        const LENGTH = 20;
        let scene: Scene;

        beforeEach(() => {
            scene = new Scene(new NullEngine());
        });

        afterEach(() => {
            scene.getEngine().dispose();
        });

        for (const pattern of ["zigzag", "sinewave"] as const) {
            for (const patternCount of [undefined, 12, 40]) {
                test(`${pattern} with patternCount ${String(patternCount)}`, () => {
                    const start = new Vector3(0, 0, 0);
                    const line = PatternedLineRenderer.create(pattern, start, new Vector3(LENGTH, 0, 0), scene, {
                        width: 8,
                        color: "#ffffff",
                        opacity: 1,
                        is2DMode: false,
                        patternCount,
                    });

                    const last = line.elements[line.elements.length - 1];
                    const lastStart = last.position.subtract(start).length();

                    assert.isBelow(lastStart, LENGTH, "the last segment starts past the line end");
                    assert.isAtLeast(lastStart + SEGMENT, LENGTH, "the last segment stops short of the line end");

                    line.dispose();
                });
            }
        }
    });

    describe("a line that shortens", () => {
        let scene: Scene;

        beforeEach(() => {
            scene = new Scene(new NullEngine());
        });

        afterEach(() => {
            scene.getEngine().dispose();
        });

        test("drops the element it no longer has room for, so no two overlap", () => {
            // pajek-synth-lines arc 2 -> 3: laid out longer, then shortened, it kept an element too many and its
            // dashes overlapped into a solid line
            const width = 0.2;
            const line = PatternedLineRenderer.create("dash", new Vector3(0, 0, 0), new Vector3(10, 0, 0), scene, {
                width,
                color: "#ffffff",
                opacity: 1,
                is2DMode: false,
            });
            const before = line.elements.length;
            const meshWidth = (line as unknown as { getRenderedMeshSize(): number }).getRenderedMeshSize();
            // room for one element fewer
            const shorter = 10 - patternElementPeriod(meshWidth);
            line.update(new Vector3(0, 0, 0), new Vector3(shorter, 0, 0));
            assert.equal(line.elements.length, discreteMeshCount(shorter, meshWidth), "the count");
            assert.isBelow(line.elements.length, before);
            const xs = line.elements.map((el) => el.position.x);
            for (let i = 1; i < xs.length; i++) {
                assert.isAtLeast(xs[i] - xs[i - 1], meshWidth, `elements ${String(i - 1)} and ${String(i)} overlap`);
            }
            line.dispose();
        });
    });

    describe("the material leak this suite also guards", () => {
        let scene: Scene;

        beforeEach(() => {
            scene = new Scene(new NullEngine());
        });

        afterEach(() => {
            scene.getEngine().dispose();
        });

        test("a disposed pattern mesh stops receiving per-frame camera updates", () => {
            const before = FilledArrowRenderer.getActiveMaterialCount();

            const line = PatternedLineRenderer.create("dot", new Vector3(0, 0, 0), new Vector3(0, 0, 5), scene, {
                width: 8,
                color: "#ffffff",
                opacity: 1,
            });
            assert.isAbove(
                FilledArrowRenderer.getActiveMaterialCount(),
                before,
                "creating the line registered no materials",
            );

            line.dispose();

            assert.equal(
                FilledArrowRenderer.getActiveMaterialCount(),
                before,
                "disposing the line left materials in the per-frame walk",
            );
        });
    });
});
