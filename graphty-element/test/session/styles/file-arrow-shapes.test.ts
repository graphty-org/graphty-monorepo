/**
 * A file's arrow is drawn as the cap its program draws: Cytoscape desktop's half arrows as one thin barb (#5490) and
 * vis-network's crow as a vee turned round (#5491), while Graphviz keeps its filled half vee and crow's foot.
 */
import { assert, describe, it } from "vitest";

import { EdgeArrowTypes } from "../../../src/config/EdgeStyle";
import { ARROW_SHAPES, arrowShapesOf } from "../../../src/session/styles/fileStyles/shapes";

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

    it("names only caps the renderer draws", () => {
        for (const tool of ["cytoscape", "vis-network"]) {
            for (const cap of arrowShapesOf(tool).values()) {
                assert.include(EdgeArrowTypes.options as readonly string[], cap);
            }
        }
    });
});
