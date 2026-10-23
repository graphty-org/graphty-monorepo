/**
 * How the comparison reads Gephi's SVG of a node not opaque: a fill that names the node, then an unnamed border ring on
 * the same center (`gexf-specimen-node-sizes-opacity-p3`), both the node's.
 */

import { assert, describe, it } from "vitest";

import { readSvgPrimitives } from "../fidelity/oracle/svg-primitives";

const SVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="400" height="200" xmlns="http://www.w3.org/2000/svg">
<g id="nodes">
<circle fill="#c8c8c8" r="29.4" fill-opacity="0.4" class="id_size-35" cx="100.0" cy="100.0"/>
<circle fill="none" r="32.2" cx="100.0" cy="100.0" stroke="#646464" stroke-opacity="0.4" stroke-width="5.6"/>
<circle fill-opacity="1.0" fill="#c8c8c8" r="16.56" cx="300.0" class="id_opaque" cy="100.0" stroke="#646464"
    stroke-opacity="1.0" stroke-width="2.88"/>
<circle fill="none" r="10" cx="200.0" cy="100.0" stroke="#646464" stroke-width="1"/>
</g>
</svg>`;

describe("Gephi's SVG of a node not opaque", () => {
    it("gives the unnamed ring drawn right after a node's fill, on its center, to that node", () => {
        const shapes = readSvgPrimitives(SVG).prims.filter((p) => p.kind === "shape");
        assert.deepEqual(
            shapes.map((p) => p.hint?.id ?? null),
            ["size-35", "size-35", "opaque", null],
        );
    });
});
