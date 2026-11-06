/**
 * A file's arrow is drawn as the cap its program draws: Cytoscape desktop's half arrows as one thin barb (#5490) and
 * vis-network's crow as a vee turned round (#5491), while Graphviz keeps its filled half vee and crow's foot.
 */
import { assert, describe, it } from "vitest";

import { EdgeArrowTypes } from "../../../src/config/EdgeStyle";
import { ARROW_RUNS, ARROW_SHAPES, arrowShapesOf } from "../../../src/session/styles/fileStyles/shapes";

describe("the cap a file's arrow is drawn as, by the program that wrote it", () => {
    it("draws Cytoscape's half arrows as the half barb, on either side", () => {
        for (const tool of ["cytoscape", "cytoscape-fallbacks"]) {
            assert.strictEqual(arrowShapesOf(tool).get("half"), "half-barb");
            assert.strictEqual(arrowShapesOf(tool).get("other:half-bottom"), "half-barb-flipped");
            assert.strictEqual(arrowShapesOf(tool).get("crow"), "crow");
        }
    });

    it("draws vis-network's crow as the inverted vee", () => {
        assert.strictEqual(arrowShapesOf("vis-network").get("crow"), "inverted-vee");
        assert.strictEqual(arrowShapesOf("vis-network").get("half"), "half-open");
    });

    it("keeps every other program's arrows, and an unknown one's, as the shape's own cap", () => {
        for (const tool of ["graphviz", "yed", null]) {
            assert.strictEqual(arrowShapesOf(tool), ARROW_SHAPES);
        }
    });

    it("draws yEd's and yEd Live's own arrows, which no shared shape names", () => {
        const caps = {
            "other:cross": "cross",
            "other:kite": "kite",
            "other:deltoid": "deltoid",
            "other:open-vee": "open-vee",
            "other:skewed-dash": "stem",
            "other:dash": "stem",
            "other:crows_foot_optional": "stem",
            "other:crows_foot_one": "stem",
        };
        for (const [shape, cap] of Object.entries(caps)) {
            assert.strictEqual(arrowShapesOf("yed").get(shape), cap, shape);
        }
    });

    it("draws yEd's rows as their caps, nearest the line's end first, each as far back as yEd stands it", () => {
        const rows: Record<string, [string, number | undefined, string[]]> = {
            "other:dash": ["stem", 8, ["tee"]],
            "other:skewed-dash": ["stem", 4, ["slash"]],
            "other:crows_foot_one": ["stem", 10, ["tee"]],
            "other:crows_foot_optional": ["stem", 10, ["open-dot"]],
            "other:crows_foot_one_mandatory": ["stem", 6, ["tee", "stem", "tee"]],
            "other:crows_foot_one_optional": ["stem", 6, ["tee", "stem", "open-dot"]],
            "other:crows_foot_many_mandatory": ["crow", undefined, ["stem", "tee"]],
            "other:crows_foot_many_optional": ["crow", undefined, ["open-dot"]],
            "other:white_delta_bar": ["open-normal", undefined, ["stem", "tee"]],
        };
        for (const [shape, [cap, lead, behind]] of Object.entries(rows)) {
            const run = ARROW_RUNS.get(shape);
            assert.strictEqual(ARROW_SHAPES.get(shape), cap, shape);
            assert.strictEqual(run?.lead, lead, shape);
            assert.deepEqual(
                run?.parts.map((p) => p.type),
                behind,
                shape,
            );
        }
    });

    it("names only caps the renderer draws", () => {
        for (const tool of ["cytoscape", "vis-network", "yed"]) {
            for (const cap of arrowShapesOf(tool).values()) {
                assert.include(EdgeArrowTypes.options as readonly string[], cap);
            }
        }
    });
});
