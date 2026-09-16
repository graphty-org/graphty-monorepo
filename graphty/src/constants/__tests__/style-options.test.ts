import { describe, expect, it } from "vitest";

/* The element's NARROW config module, not its package entry point. NodeStyle.ts imports
   Zod and two sibling schema files and nothing else, so this costs no Babylon; importing
   "@graphty/graphty-element" here would drag the whole 3D engine into a constants test.
   This import is the reason the app may keep its own ordered, labelled copy of the shape
   vocabulary: the copy cannot drift without failing here. */
import { NodeShapes } from "../../../../graphty-element/src/config/NodeStyle";
import { NODE_SHAPE_OPTIONS } from "../style-options";

describe("NODE_SHAPE_OPTIONS is the element's shape vocabulary", () => {
    it("offers exactly the shapes graphty-element can build, no more and no fewer", () => {
        /* The product owner's report was the "no more" half: the picker offered "plane",
           and the write bridge quietly turned it into a box. The "no fewer" half is the
           twelve solids the element could always build and the picker never listed. */
        const offered = NODE_SHAPE_OPTIONS.map((option) => option.value).sort((a, b) => a.localeCompare(b));
        const buildable = [...NodeShapes.options].sort((a, b) => a.localeCompare(b));

        expect(offered).toEqual(buildable);
    });

    it("does not offer plane, disc or the editor's torusKnot spelling", () => {
        const offered = new Set(NODE_SHAPE_OPTIONS.map((option) => option.value));

        expect(offered.has("plane")).toBe(false);
        expect(offered.has("disc")).toBe(false);
        expect(offered.has("torusKnot")).toBe(false);
        expect(offered.has("torus-knot")).toBe(true);
        expect(offered.has("torus")).toBe(true);
    });

    it("names every shape exactly once and gives each a word", () => {
        const values = NODE_SHAPE_OPTIONS.map((option) => option.value);

        expect(new Set(values).size).toBe(values.length);

        for (const option of NODE_SHAPE_OPTIONS) {
            expect(option.label.length).toBeGreaterThan(0);
        }
    });
});
