/**
 * @file How the oracle comparison reads a node border Cytoscape.js draws inside or outside the node: a stroke twice the
 * border's width, clipped to the node (`border-position: inside`) or to a box with the node cut out of it by the
 * evenodd rule (`outside`), as cytoscape.js 3.34.3 `drawNode` does and the web oracle's SVG records it
 * (`cytoscapejs-specimen-node-fills-borders`). Only the half the clip keeps is drawn.
 */
import { assert, describe, it } from "vitest";

import { readSvgPrimitives } from "../fidelity/oracle/svg-primitives";

const CIRCLE = "M 117.4 100 A 17.4 17.4 0 1 1 117.39999 99.98 Z";
const BOX = "M 76.8 76.8 L 123.2 76.8 L 123.2 123.2 L 76.8 123.2 L 76.8 76.8 Z";
// how the web oracle records the box with the outline added to it: the outline's move written as a line
const BOX_MINUS_CIRCLE = `${BOX} L ${CIRCLE.slice(2)}`;

/**
 * One 34.8 px circle stroked 11.6 wide under a clip.
 * @param clip - the clip's path data, or null for none
 * @param rule - the clip's rule
 * @returns the SVG
 */
function sheet(clip: string | null, rule = "nonzero"): string {
    const ring = `<path fill="none" stroke="rgb(31,119,180)" stroke-width="11.6" d="${CIRCLE}"/>`;
    const body =
        clip === null
            ? ring
            : `<defs><clipPath id="c"><path d="${clip}" clip-rule="${rule}"/></clipPath></defs>` +
              `<g clip-path="url(#c)"><g>${ring}</g></g>`;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">${body}</svg>`;
}

/**
 * The stroked ring's width and how far its stroke reaches across.
 * @param svg - the SVG
 * @returns the stroke width and the outer width
 */
function ring(svg: string): [number, number] {
    const p = readSvgPrimitives(svg).prims.find((x) => x.stroke !== null);
    assert.isDefined(p);
    const width = p.stroke?.width ?? Number.NaN;
    return [width, p.box.x1 - p.box.x0 + width];
}

describe("a stroke clipped to one side of its outline", () => {
    it("reads a stroke clipped to its own outline as its inner half", () => {
        const [width, outer] = ring(sheet(CIRCLE));
        assert.closeTo(width, 5.8, 0.01);
        assert.closeTo(outer, 34.8, 0.2);
    });

    it("reads a stroke clipped to a box minus its outline (evenodd) as its outer half", () => {
        const [width, outer] = ring(sheet(BOX_MINUS_CIRCLE, "evenodd"));
        assert.closeTo(width, 5.8, 0.01);
        assert.closeTo(outer, 46.4, 0.2);
    });

    it("reads an unclipped stroke, and one under any other clip, whole", () => {
        assert.closeTo(ring(sheet(null))[0], 11.6, 0.01);
        assert.closeTo(ring(sheet(BOX))[0], 11.6, 0.01);
    });
});
