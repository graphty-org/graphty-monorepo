/**
 * Style panel v2's sections for long value lists (design/ui/style-panel-v2/design.md, section 8):
 * how the app groups a list of more than 12 values so its picker shows one section at a time.
 * The values themselves, their names and pictures are graphty-element's (`channelValues`); this
 * table only says which section each value id sits in, and
 * `__tests__/v2-sections.test.ts` fails when the element adds a value no section holds.
 */

import type { Channel } from "@graphty/graphty-element/catalog";

/** One section of a value list: its name and the value ids it holds, in the list's order. */
export interface ValueSection {
    readonly name: string;
    readonly values: readonly string[];
}

/** A node's shapes, flat ones first, then the solids. */
const SHAPES: readonly ValueSection[] = [
    {
        name: "Basic",
        values: [
            "none",
            "rectangle",
            "ellipse",
            "triangle",
            "diamond",
            "box",
            "sphere",
            "icosphere",
            "cylinder",
            "cone",
            "capsule",
        ],
    },
    {
        name: "Polygons",
        values: ["pentagon", "hexagon", "octagon", "polygon", "parallelogram", "trapezoid", "vee"],
    },
    {
        name: "Rounded",
        values: [
            "round-rectangle",
            "top-round-rectangle",
            "bottom-round-rectangle",
            "round-triangle",
            "round-diamond",
            "round-pentagon",
            "round-hexagon",
            "round-octagon",
            "round-polygon",
            "barrel",
        ],
    },
    { name: "Symbols", values: ["star", "cross", "house", "man", "woman", "database"] },
    { name: "Round solids", values: ["torus", "torus-knot", "geodesic", "goldberg"] },
    {
        name: "Polyhedra",
        values: ["tetrahedron", "octahedron", "dodecahedron", "icosahedron", "rhombicuboctahedron"],
    },
    {
        name: "Prisms and pyramids",
        values: [
            "triangular_prism",
            "pentagonal_prism",
            "hexagonal_prism",
            "square_pyramid",
            "pentagonal_pyramid",
            "triangular_dipyramid",
            "pentagonal_dipyramid",
            "elongated_square_dipyramid",
            "elongated_pentagonal_dipyramid",
            "elongated_pentagonal_cupola",
        ],
    },
];

/**
 * Every sectioned list, by the channel whose values it lists. An underlay's and an overlay's shape
 * list is the node shape list, so it takes the same sections.
 */
export const VALUE_SECTIONS: Partial<Readonly<Record<Channel, readonly ValueSection[]>>> = {
    "node.shape": SHAPES,
    "node.underlayShape": SHAPES,
    "node.overlayShape": SHAPES,
};

/**
 * A channel's value list sections, when its list is sectioned.
 * @param channel - the channel.
 * @returns the sections, or undefined.
 */
export function sectionsOf(channel: Channel): readonly ValueSection[] | undefined {
    return VALUE_SECTIONS[channel];
}
