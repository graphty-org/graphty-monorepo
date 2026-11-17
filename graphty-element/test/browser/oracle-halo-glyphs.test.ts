/**
 * The oracle comparison's SVG reader on glyphs drawn twice, their halo stroked and then the same outlines filled
 * (Cytoscape desktop's FreeHEP export of stringApp's enhanced label). Two letters where a label crosses its hexagon's
 * border (cx-polygenic-sle) are too few to read as a row of letters, and were read as arrowheads on five line ends.
 */
import { assert, describe, it } from "vitest";

import { readSvgPrimitives } from "../fidelity/oracle/svg-primitives";

// two glyphs: an "0" (its outer and inner outlines) beside a bar
const GLYPHS = "M 10 10 L 14 10 L 14 18 L 10 18 Z M 11 11 L 13 11 L 13 17 L 11 17 Z M 16 10 L 18 10 L 18 18 L 16 18 Z";

/**
 * One path drawn twice, in the order given.
 * @param first - the first drawing's paint attributes
 * @param second - the second drawing's paint attributes
 * @returns the SVG
 */
function sheet(first: string, second: string): string {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">
        <g ${first}><path d="${GLYPHS}"/></g><g ${second}><path d="${GLYPHS}"/></g></svg>`;
}

const HALO = 'fill="none" stroke="#ffffff" stroke-width="1"';
const LETTERS = 'fill="#000000" stroke="none"';

describe("the oracle SVG reader on haloed glyphs", () => {
    it("reads a halo stroked and the same outlines filled after it as lettering, both of them", () => {
        const { prims } = readSvgPrimitives(sheet(HALO, LETTERS));
        assert.lengthOf(prims, 2);
        assert.isTrue(prims.every((p) => p.lettering === true));
    });

    it("reads a fill stroked after it (a shape and its outline) as no lettering", () => {
        const { prims } = readSvgPrimitives(sheet(LETTERS, HALO));
        assert.isTrue(prims.every((p) => p.lettering !== true));
    });
});
