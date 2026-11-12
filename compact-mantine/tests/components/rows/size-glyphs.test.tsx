import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FieldGlyph, type FieldGlyphName } from "../../../src/icons";

/**
 * The circles a glyph draws, as numbers.
 * @param name - The field glyph to draw
 * @returns Each circle's centre and radius, in viewBox units
 */
function circlesOf(name: FieldGlyphName): { cx: number; cy: number; r: number }[] {
    const { container } = render(<FieldGlyph name={name} />);

    return [...container.querySelectorAll("circle")].map((c) => ({
        cx: Number(c.getAttribute("cx")),
        cy: Number(c.getAttribute("cy")),
        r: Number(c.getAttribute("r")),
    }));
}

// A small circle touching a large one on a diagonal reads as a magnifying glass (#2101). The
// size glyphs keep their two circles apart and standing on one baseline, so they read as two sizes.
describe.each<FieldGlyphName>(["sizeSmallest", "sizeLargest"])("%s", (name) => {
    it("draws a small and a large circle that do not touch", () => {
        const [small, large] = circlesOf(name);
        const gap = Math.hypot(large.cx - small.cx, large.cy - small.cy) - small.r - large.r;

        expect(small.r).toBeLessThan(large.r);
        expect(gap).toBeGreaterThanOrEqual(1.5);
    });

    it("stands both circles on one baseline", () => {
        const [small, large] = circlesOf(name);

        expect(small.cy + small.r).toBe(large.cy + large.r);
    });
});
