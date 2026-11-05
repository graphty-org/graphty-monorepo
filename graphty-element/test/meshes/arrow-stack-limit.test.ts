/**
 * An end cap's stack draws a bounded number of parts, however long the value.
 */

import { assert, describe, it } from "vitest";

import { MAX_ARROW_STACK_PARTS, parseArrowStack } from "../../src/meshes/arrowStack";

describe("parseArrowStack", () => {
    it("keeps at most MAX_ARROW_STACK_PARTS parts", () => {
        assert.strictEqual(parseArrowStack(Array(20000).fill("dot").join(" ")).length, MAX_ARROW_STACK_PARTS);
        assert.strictEqual(parseArrowStack("dot normal").length, 2);
    });

    it("reads a part's outline width after its width (#5800)", () => {
        assert.deepEqual(parseArrowStack("tee open-diamond:left*1.2x0.7o2 open-boxo0.5 dot"), [
            { type: "tee" },
            { type: "open-diamond", side: "left", size: 1.2, width: 0.7, outline: 2 },
            { type: "open-box", outline: 0.5 },
            { type: "dot" },
        ]);
    });
});
