/* The element's schema entry point, not its package root. `@graphty/graphty-element/schema`
   is constants and pure functions over numbers and strings, so this costs no Babylon;
   importing "@graphty/graphty-element" here would drag the whole 3D engine into a
   constants test. The picker is DERIVED from this enum rather than restated, so the two
   can no longer disagree; what these tests pin is the derivation -- that every member
   arrives, exactly once, wearing a word. */
import { EdgeArrowTypes, EdgeLineTypes, NodeShapes } from "@graphty/graphty-element/schema";
import { describe, expect, it } from "vitest";

import { ARROW_TYPE_OPTIONS, LINE_TYPE_OPTIONS, NODE_SHAPE_OPTIONS } from "../style-options";

describe("NODE_SHAPE_OPTIONS is the element's shape vocabulary", () => {
    it("offers exactly the shapes graphty-element can build, no more and no fewer", () => {
        /* The product owner's report was the "no more" half: the picker offered "plane",
           and the write bridge quietly turned it into a box. The "no fewer" half is the
           twelve solids the element could always build and the picker never listed.
           Both halves are now structural -- the list IS the enum -- and this asserts the
           derivation did not lose or invent a member on the way. */
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

describe("the edge pickers are the element's line and arrow vocabularies", () => {
    it("offers exactly the line patterns graphty-element can draw", () => {
        expect(LINE_TYPE_OPTIONS.map((option) => option.value)).toEqual([...EdgeLineTypes.options]);
    });

    it("offers exactly the arrows graphty-element can draw", () => {
        expect(ARROW_TYPE_OPTIONS.map((option) => option.value)).toEqual([...EdgeArrowTypes.options]);
    });

    it("labels hyphenated names in sentence case", () => {
        expect(LINE_TYPE_OPTIONS.find((option) => option.value === "dash-dot")?.label).toBe("Dash dot");
        expect(ARROW_TYPE_OPTIONS.find((option) => option.value === "open-diamond")?.label).toBe("Open diamond");
    });
});
