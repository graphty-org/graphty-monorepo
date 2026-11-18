/**
 * @file `layoutBehavior.node.sizeSpace` replaced `depthIndependentSize`: an old value still parses
 * and keeps its look.
 */

import { assert, describe, it } from "vitest";

import { GraphBehaviorOpts } from "../../src/config";

describe("the node size space behavior", () => {
    it("reads depthIndependentSize true as sizeSpace pivot, and drops false", () => {
        const old = { node: { depthIndependentSize: true } } as never;
        assert.strictEqual(GraphBehaviorOpts.parse(old).node.sizeSpace, "pivot");
        const off = GraphBehaviorOpts.parse({ node: { depthIndependentSize: false } }).node;
        assert.isUndefined(off.sizeSpace);
        assert.notProperty(off, "depthIndependentSize");
    });

    it("keeps a sizeSpace set beside the old key", () => {
        const both = { node: { depthIndependentSize: true, sizeSpace: "screen" } } as never;
        assert.strictEqual(GraphBehaviorOpts.parse(both).node.sizeSpace, "screen");
    });

    it("still refuses an unknown key", () => {
        assert.isFalse(GraphBehaviorOpts.safeParse({ node: { shininess: 1 } }).success);
    });
});
