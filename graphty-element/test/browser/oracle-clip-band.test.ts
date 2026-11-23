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

describe("a fill clipped to part of its box", () => {
    const fill = (clip: string): string =>
        `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><defs><clipPath id="c"><path d="${clip}"/></clipPath></defs>` +
        `<g transform="translate(10,0)"><rect x="50" y="50" width="100" height="60" fill="rgb(168,175,198)" clip-path="url(#c)"/></g></svg>`;

    it("reads what the clip keeps, in the shape's own space, and keeps the whole box beside it", () => {
        const p = readSvgPrimitives(fill("M0 0 L200 0 L200 76 L0 76 Z")).prims[0];
        assert.deepEqual(p.box, { x0: 60, y0: 50, x1: 160, y1: 76 });
        assert.deepEqual(p.uncut, { x0: 60, y0: 50, x1: 160, y1: 110 });
    });

    it("leaves out a cut fill a solid fill paints over, and keeps one a thin fill does not hide", () => {
        const over = (opacity: string): string =>
            fill("M0 0 L200 0 L200 76 L0 76 Z").replace(
                "</g></svg>",
                `<rect x="50" y="50" width="100" height="26" fill="rgb(235,235,235)" fill-opacity="${opacity}"/></g></svg>`,
            );
        assert.lengthOf(readSvgPrimitives(over("1")).prims, 1);
        assert.lengthOf(readSvgPrimitives(over("0.5")).prims, 2);
    });

    it("reads a shape whole under a clip it lies inside, or one that is no box", () => {
        const whole = readSvgPrimitives(fill("M0 0 L200 0 L200 200 L0 200 Z")).prims[0];
        assert.isUndefined(whole.uncut);
        const round = readSvgPrimitives(fill("M0 0 L200 0 L100 76 Z")).prims[0];
        assert.isUndefined(round.uncut);
    });
});

describe("a stroke whose middle a mask erases (a Cytoscape.js double border, #8381)", () => {
    /**
     * The ring of `sheet`, stroked 6 wide, under a mask erasing a stroke of the given path data.
     * @param d - the erased stroke's path data
     * @returns the ring's stroke as read
     */
    const masked = (d: string): { width: number; dashClass: string } | null => {
        const svg =
            `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><defs><mask id="m" maskUnits="userSpaceOnUse" x="0" y="0" width="200" height="200">` +
            `<rect x="0" y="0" width="200" height="200" fill="white"/><path fill="none" stroke="black" stroke-width="2" d="${d}"/></mask></defs>` +
            `<path fill="none" stroke="rgb(31,119,180)" stroke-width="6" d="${CIRCLE}" mask="url(#m)"/></svg>`;
        const s = readSvgPrimitives(svg).prims.find((x) => x.stroke !== null)?.stroke;
        return s === undefined || s === null ? null : { width: s.width, dashClass: s.dashClass };
    };

    it("reads a ring with its middle erased along its own path as a double line, as wide as the ring", () => {
        assert.deepEqual(masked(CIRCLE), { width: 6, dashClass: "double" });
    });

    it("reads a ring erased along another path as it is stroked", () => {
        assert.deepEqual(masked(BOX), { width: 6, dashClass: "solid" });
    });
});
