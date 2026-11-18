/**
 * A file's arrow is drawn as the element cap of its neutral name, the same for every file: graph-io has already written
 * each program's own arrow (Cytoscape desktop's thin half barbs, vis-network's turned-round crow, yEd's rows of several
 * pieces) as one of graph-io's generic names, so graphty-element's table holds no program's spelling.
 */
import { STYLE_ENUMS } from "@graphty/graph-io/styles";
import { assert, describe, it } from "vitest";

import { EdgeArrowTypes } from "../../../src/config/EdgeStyle";
import { ARROW_SHAPES, BORDER_STYLES, LINE_STYLES, NODE_SHAPES } from "../../../src/session/styles/fileStyles/shapes";

describe("the cap a file's arrow is drawn as", () => {
    it("draws every arrow name graph-io settles a file's arrows into", () => {
        for (const shape of STYLE_ENUMS.get("arrow") ?? []) {
            assert.isTrue(ARROW_SHAPES.has(shape), shape);
        }
    });

    it("draws the generic half barbs, the turned-round vee and the pieces of a row as caps of their own", () => {
        assert.strictEqual(ARROW_SHAPES.get("half-barb"), "half-barb");
        assert.strictEqual(ARROW_SHAPES.get("half-barb-flipped"), "half-barb-flipped");
        assert.strictEqual(ARROW_SHAPES.get("inverted-vee"), "inverted-vee");
        assert.strictEqual(ARROW_SHAPES.get("stem"), "stem");
        assert.strictEqual(ARROW_SHAPES.get("slash"), "slash");
        assert.strictEqual(ARROW_SHAPES.get("half"), "half-open");
        assert.strictEqual(ARROW_SHAPES.get("crow"), "crow");
    });

    it("names only caps the renderer draws", () => {
        for (const cap of ARROW_SHAPES.values()) {
            assert.include(EdgeArrowTypes.options as readonly string[], cap);
        }
    });

    it("holds no program's own spelling in any table", () => {
        for (const table of [ARROW_SHAPES, BORDER_STYLES, LINE_STYLES, NODE_SHAPES]) {
            for (const key of table.keys()) {
                assert.notMatch(key, /^other:/, key);
            }
        }
    });

    it("draws every node shape graph-io settles a file's shapes into", () => {
        for (const shape of STYLE_ENUMS.get("shape") ?? []) {
            assert.strictEqual(NODE_SHAPES.get(shape), shape, shape);
        }
    });
});
