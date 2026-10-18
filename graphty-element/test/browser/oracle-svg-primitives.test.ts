/**
 * The oracle comparison's SVG reader (`test/fidelity/oracle/svg-primitives.ts`) on markup the
 * programs write: a label outline Cytoscape.js strokes as its own unfilled text before the filled
 * label is not a label of its own, so the label's color is the filled text's.
 */
import { assert, describe, it } from "vitest";

import { readSvgPrimitives } from "../fidelity/oracle/svg-primitives";

describe("the oracle SVG reader", () => {
    it("reads an outlined label as its filled text, not its unfilled outline", () => {
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100">
            <text fill="none" stroke="rgb(136,136,136)" stroke-width="4" font-size="10px" x="50" y="50">MED6</text>
            <text fill="rgb(255,255,255)" stroke="none" font-size="10px" x="50" y="50">MED6</text>
        </svg>`;
        const texts = readSvgPrimitives(svg).prims.flatMap((p) => (p.text ? [p.text] : []));
        assert.deepEqual(
            texts.map((t) => [t.content, t.color]),
            [["MED6", "#ffffff"]],
        );
    });
});
