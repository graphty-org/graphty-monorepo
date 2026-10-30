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
});
