import { NullEngine, Scene, Vector3 } from "@babylonjs/core";
import { afterEach, assert, beforeEach, describe, test } from "vitest";

import { cytoscapeAdvance, fixedAdvanceCount, fixedAdvanceOffsets } from "../../src/meshes/PatternedLineMesh";
import { PatternedLineRenderer, type PatternType } from "../../src/meshes/PatternedLineRenderer";

/**
 * Cytoscape desktop lays a separate-arrow or contiguous-arrow line's glyphs at a fixed advance from the line's start
 * (`ShapeStroke`): the first centered on the start, the last wherever the length puts it, never stretched to touch
 * the far end (issue #7768).
 */
describe("Cytoscape glyph patterns laid at a fixed advance", () => {
    let scene: Scene;

    beforeEach(() => {
        scene = new Scene(new NullEngine());
    });

    afterEach(() => {
        scene.getEngine().dispose();
    });

    const countOn = (pattern: PatternType, length: number, width: number, patternCount?: number): number => {
        const line = PatternedLineRenderer.create(pattern, Vector3.Zero(), new Vector3(length, 0, 0), scene, {
            width,
            color: "#505050",
            opacity: 1,
            patternCount,
        });
        const count = line.elements.length;
        line.dispose();
        return count;
    };

    test("a contiguous-arrow line advances three widths, a separate-arrow line 20 width units whatever its width", () => {
        assert.strictEqual(cytoscapeAdvance("contiguous-arrow", 0.1), 0.30000000000000004);
        assert.strictEqual(cytoscapeAdvance("separate-arrow", 0.1), 0.5);
        assert.strictEqual(cytoscapeAdvance("separate-arrow", 0.01), 0.5);
        // graphty's own patterns keep spreading to both ends
        for (const pattern of ["dot", "dash", "dash-dot", "forward-slash", "double", "sinewave"] as const) {
            assert.isUndefined(cytoscapeAdvance(pattern, 0.1), pattern);
        }
    });

    test("the first glyph is centered on the start and the last falls short of the end", () => {
        // 10.2 holds glyphs at 0, 3, 6 and 9: the last 1.2 short of the end, not stretched onto it
        const count = fixedAdvanceCount(10.2, 3);
        assert.strictEqual(count, 4);
        assert.deepEqual(fixedAdvanceOffsets(10.2, 3, count), [0, 3, 6, 9]);
        // a glyph whose center lands exactly on the end is drawn
        assert.strictEqual(fixedAdvanceCount(9, 3), 4);
        // a line shorter than one advance, of no length or of no finite length holds one, at its start
        assert.strictEqual(fixedAdvanceCount(2, 3), 1);
        assert.strictEqual(fixedAdvanceCount(0, 3), 1);
        assert.strictEqual(fixedAdvanceCount(Number.POSITIVE_INFINITY, 3), 1);
    });

    test("a line of more than the piece cap of advances spreads its glyphs to fit", () => {
        const count = fixedAdvanceCount(1e9, 1);
        assert.strictEqual(count, 65536);
        const offsets = fixedAdvanceOffsets(1e9, 1, count);
        assert.approximately(offsets.at(-1) ?? 0, 1e9, 1);
    });

    test("an edge holds the glyphs its length takes at the advance", () => {
        // 41 chevrons a 0.3 advance apart on a line 12.1 long (0 .. 12.0), as Cytoscape draws 387->402
        assert.strictEqual(countOn("contiguous-arrow", 12.1, 0.1), 41);
        // separate arrows 0.5 apart: a thin line holds no more than a thick one
        assert.strictEqual(countOn("separate-arrow", 4.9, 0.01), 10);
        assert.strictEqual(countOn("separate-arrow", 4.9, 0.1), 10);
        // line.patternCount still spreads exactly that many
        assert.strictEqual(countOn("separate-arrow", 4.9, 0.1, 3), 3);
    });

    test("the line is drawn from its first glyph's near end to its last glyph's far end", () => {
        // chevrons reach two widths either side of their centers: on a line 10.25 long at a 0.3 advance (width 0.1)
        // the last sits at 10.2 and reaches 10.4; at 10.1 it sits at 9.9 and stops at 10.1
        for (const [length, last] of [
            [10.25, 10.4],
            [10.1, 10.1],
        ] as const) {
            const line = PatternedLineRenderer.create(
                "contiguous-arrow",
                Vector3.Zero(),
                new Vector3(length, 0, 0),
                scene,
                {
                    width: 0.1,
                    color: "#505050",
                    opacity: 1,
                },
            );
            const ends = line.drawnEnds()?.map((p) => p.x) ?? [];
            line.dispose();
            assert.lengthOf(ends, 2);
            assert.approximately(ends[0], -0.2, 1e-9);
            assert.approximately(ends[1], last, 1e-9);
        }
    });
});
