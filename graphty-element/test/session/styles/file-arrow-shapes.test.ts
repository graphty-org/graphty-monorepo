/**
 * A file's arrow is drawn as the cap its program draws: Cytoscape desktop's half arrows as one thin barb (#5490) and
 * vis-network's crow as a vee turned round (#5491), while Graphviz keeps its filled half vee and crow's foot.
 */
import { assert, describe, it } from "vitest";

import { EdgeArrowTypes } from "../../../src/config/EdgeStyle";
import {
    ARROW_ROW_SIZES,
    ARROW_ROWS,
    ARROW_SHAPES,
    arrowShapesOf,
} from "../../../src/session/styles/fileStyles/shapes";

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
            "other:dash": "tee",
            "other:crows_foot_optional": "open-dot",
            "other:crows_foot_one": "tee",
        };
        for (const [shape, cap] of Object.entries(caps)) {
            assert.strictEqual(arrowShapesOf("yed").get(shape), cap, shape);
        }
    });

    it("draws yEd's crow's feet with a circle or a bar as a row of caps, nearest the node first", () => {
        const rows = {
            "other:crows_foot_many_optional": ["crow", "circle-open"],
            "other:crows_foot_many_mandatory": ["crow", "tee"],
            "other:crows_foot_one_mandatory": ["tee", "tee"],
            "other:crows_foot_one_optional": ["tee", "circle-open"],
            "other:white_delta_bar": ["open-normal", "tee"],
        };
        for (const [shape, [cap, behind]] of Object.entries(rows)) {
            assert.strictEqual(ARROW_SHAPES.get(shape), cap, shape);
            assert.strictEqual(ARROW_ROWS.get(shape), behind, shape);
        }
    });

    it("sizes a row's part as an arrow drawn with the same cap", () => {
        for (const [shape, sizedAs] of ARROW_ROW_SIZES) {
            assert.strictEqual(ARROW_SHAPES.get(sizedAs), ARROW_SHAPES.get(ARROW_ROWS.get(shape) ?? ""), shape);
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
