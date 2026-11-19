/**
 * A node the program draws as its words alone (vis-network's `text`, json-vis-synth node 4) has the shape "none": it
 * passes when graphty draws no body either and fails when graphty draws one. An icon node whose glyph the oracle could
 * not draw (json-vis-synth node 14) is not judged.
 */
import { assert, describe, it } from "vitest";

import { wordsOnlyShapeMiss } from "./compare-oracle";
import type { PNode, PText } from "./primitives";

const words = { content: "text" } as PText;

const node = (over: Partial<PNode> = {}): PNode => ({
    id: "4",
    cx: 100,
    cy: 100,
    w: 24,
    h: 18,
    shape: null,
    fill: null,
    stroke: null,
    label: words,
    ...over,
});

describe("a node drawn as its words alone", () => {
    it("passes graphty's node with no body", () => {
        assert.strictEqual(wordsOnlyShapeMiss(node(), node({ shape: "rect" })), 0);
    });

    it("fails graphty's node with a fill", () => {
        assert.strictEqual(
            wordsOnlyShapeMiss(node(), node({ shape: "rect", fill: { color: "#cccccc" } as PNode["fill"] })),
            1,
        );
    });

    it("is not judged for an icon node, a node with a body or a node with no words", () => {
        assert.isNull(wordsOnlyShapeMiss(node({ endBox: { w: 40, h: 40 } }), node()));
        assert.isNull(wordsOnlyShapeMiss(node({ stroke: { color: "#000000" } as PNode["stroke"] }), node()));
        assert.isNull(wordsOnlyShapeMiss(node({ label: null }), node()));
    });
});
