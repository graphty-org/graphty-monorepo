/**
 * @file A plain name and a small picture for every node shape, arrow kind and line pattern.
 *
 * A picker for 25 node shapes, 14 arrow kinds and 9 line patterns is a grid of pictures, not a
 * list of words: "rhombicuboctahedron" and "half-open" say little until you see them. The pictures
 * live here, beside the vocabulary the renderer draws, so an application never keeps its own
 * drawing of a shape the element owns. `test/catalog/glyphs.test.ts` fails when a value the
 * renderer draws has no row here, or a row names a value it does not draw.
 *
 * Each glyph is a complete, static SVG string: 24 x 24, drawn in `currentColor` so it follows the
 * text color around it, `aria-hidden` because the plain name is what a reader hears. Nothing here
 * reaches Babylon.js or the DOM.
 */

import type { EdgeStyleConfig } from "../config/EdgeStyle";
import type { NodeStyleConfig } from "../config/NodeStyle";
import type { EdgeLinePattern } from "./types";

/** A node shape the renderer draws, as `NodeShapes.options` lists them. */
export type NodeShape = NonNullable<NonNullable<NodeStyleConfig["shape"]>["type"]>;

/** An arrow kind the renderer draws at either end of an edge, as `EdgeArrowTypes.options` lists them. */
export type EdgeArrowKind = NonNullable<NonNullable<EdgeStyleConfig["arrowHead"]>["type"]>;

/** One value of a closed visual vocabulary, with a name to show and a picture to show beside it. */
export interface GlyphDescriptor<Id extends string = string> {
    /** The value a layer writes, such as `"torus-knot"`. */
    readonly id: Id;
    /** The default name to show for it, such as "Torus knot". An application may replace it by id. */
    readonly plainName: string;
    /** A static 24 x 24 SVG, drawn in `currentColor`. */
    readonly glyph: string;
}

/**
 * Wrap glyph strokes in the shared SVG frame.
 * @param body - The SVG elements inside the frame.
 * @returns The complete SVG string.
 */
function svg(body: string): string {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
}

/**
 * Turn rows of value, plain name and glyph body into descriptors, in order.
 * @param rows - One row per value.
 * @returns The descriptors.
 */
function describe<Id extends string>(rows: readonly (readonly [Id, string, string])[]): readonly GlyphDescriptor<Id>[] {
    return Object.freeze(rows.map(([id, plainName, body]) => Object.freeze({ id, plainName, glyph: svg(body) })));
}

const FILL = 'fill="currentColor"';

/** Every node shape, in the renderer's order. */
export const NODE_SHAPE_DESCRIPTORS: readonly GlyphDescriptor<NodeShape>[] = describe<NodeShape>([
    ["box", "Box", '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z M4 7.5l8 4.5 8-4.5 M12 12v9"/>'],
    ["sphere", "Sphere", '<circle cx="12" cy="12" r="8"/><ellipse cx="12" cy="12" rx="8" ry="3"/>'],
    [
        "cylinder",
        "Cylinder",
        '<ellipse cx="12" cy="6" rx="7" ry="2.5"/><path d="M5 6v12c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V6"/>',
    ],
    ["cone", "Cone", '<path d="M12 3L5 18 M12 3l7 15"/><ellipse cx="12" cy="18" rx="7" ry="2.5"/>'],
    ["capsule", "Capsule", '<rect x="7" y="3" width="10" height="18" rx="5"/>'],
    ["torus", "Torus", '<ellipse cx="12" cy="12" rx="9" ry="6"/><ellipse cx="12" cy="11.5" rx="4" ry="2"/>'],
    ["torus-knot", "Torus knot", '<path d="M12 4c3 0 5 3 3 7l-6 7c-2 2-6 0-4-3s9-3 11 0-2 5-4 3l-6-7c-2-4 0-7 3-7z"/>'],
    ["tetrahedron", "Tetrahedron", '<path d="M12 3L3 19h18z M12 3v11 M3 19l9-5 9 5"/>'],
    ["octahedron", "Octahedron", '<path d="M12 2l7 10-7 10-7-10z M5 12l7 2 7-2 M12 2v20"/>'],
    [
        "dodecahedron",
        "Dodecahedron",
        '<path d="M12 2l9.5 7-3.6 11H6.1L2.5 9z"/><path d="M12 7l4.8 3.5-1.8 5.6H9l-1.8-5.6z"/>',
    ],
    [
        "icosahedron",
        "Icosahedron",
        '<path d="M12 2l8.7 5v10L12 22l-8.7-5V7z"/><path d="M12 7l5 9H7z M12 2v5 M3.3 17L7 16 M20.7 17L17 16"/>',
    ],
    [
        "rhombicuboctahedron",
        "Rhombicuboctahedron",
        '<path d="M8 2h8l6 6v8l-6 6H8l-6-6V8z"/><rect x="8" y="8" width="8" height="8"/>',
    ],
    ["triangular_prism", "Triangular prism", '<path d="M3 19l5-10 5 10z M8 9l8-5 5 10-8 5 M13 19l8-5"/>'],
    ["pentagonal_prism", "Pentagonal prism", '<path d="M12 3l6 3v4l-6 3-6-3V6z M6 10v8l6 3 6-3v-8 M12 13v8"/>'],
    [
        "hexagonal_prism",
        "Hexagonal prism",
        '<path d="M7 4h10l3 3-3 3H7L4 7z M4 7v10l3 3h10l3-3V7 M7 10v10 M17 10v10"/>',
    ],
    ["square_pyramid", "Square pyramid", '<path d="M12 3L3 17l6 4 12-4z M12 3L9 21 M12 3l9 14"/>'],
    ["pentagonal_pyramid", "Pentagonal pyramid", '<path d="M12 2L3 15l4 6h10l4-6z M12 2L7 21 M12 2l5 19"/>'],
    ["triangular_dipyramid", "Triangular bipyramid", '<path d="M12 2L4 12l8 10 8-10z M4 12l10 2 6-2 M12 2l2 12-2 8"/>'],
    [
        "pentagonal_dipyramid",
        "Pentagonal bipyramid",
        '<path d="M12 2L3 12l9 10 9-10z M3 12l5 2h8l5-2 M12 2L8 14l4 8 4-8z"/>',
    ],
    [
        "elongated_square_dipyramid",
        "Elongated square bipyramid",
        '<path d="M12 2L5 8v8l7 6 7-6V8z M5 8h14 M5 16h14 M12 2v20"/>',
    ],
    [
        "elongated_pentagonal_dipyramid",
        "Elongated pentagonal bipyramid",
        '<path d="M12 2L4 8v8l8 6 8-6V8z M4 8l6 2 10-2 M4 16l6 2 10-2 M10 10v8 M12 2l-2 8 M10 18l2 4"/>',
    ],
    [
        "elongated_pentagonal_cupola",
        "Elongated pentagonal cupola",
        '<path d="M8 3h8l4 5v11H4V8z M4 8h16 M8 3L7 8 M16 3l1 5 M12 8v11"/>',
    ],
    [
        "goldberg",
        "Goldberg polyhedron",
        '<circle cx="12" cy="12" r="9"/>' +
            '<path d="M12 8l3.8 2.8-1.5 4.4H9.7l-1.5-4.4z M12 8V3 M15.8 10.8l4.5-1.5 M14.3 15.2l2.8 3.9 M9.7 15.2l-2.8 3.9 M8.2 10.8L3.7 9.3"/>',
    ],
    [
        "icosphere",
        "Icosphere",
        '<circle cx="12" cy="12" r="9"/><path d="M12 3L6 9l6 3 6-3z M6 9l-2.8 6 8.8-3 M18 9l2.8 6-8.8-3 M12 12v9"/>',
    ],
    [
        "geodesic",
        "Geodesic sphere",
        '<circle cx="12" cy="12" r="9"/><path d="M7.5 7.5h9L21 12l-4.5 4.5h-9L3 12z M7.5 7.5l4.5 9 4.5-9 M7.5 16.5l4.5-9 4.5 9"/>',
    ],
]);

/** Every arrow kind, in the renderer's order, drawn at the right-hand end of a short line. */
export const EDGE_ARROW_DESCRIPTORS: readonly GlyphDescriptor<EdgeArrowKind>[] = describe<EdgeArrowKind>([
    ["normal", "Triangle", `<path d="M2 12h12"/><path d="M14 7l8 5-8 5z" ${FILL}/>`],
    ["inverted", "Inverted triangle", `<path d="M2 12h12"/><path d="M22 7l-8 5 8 5z" ${FILL}/>`],
    ["dot", "Dot", `<path d="M2 12h12"/><circle cx="18" cy="12" r="4" ${FILL}/>`],
    [
        "sphere-dot",
        "Ball",
        `<path d="M2 12h12"/><circle cx="18" cy="12" r="4" ${FILL}/>` +
            '<circle cx="16.8" cy="10.8" r="1.2" stroke="none" fill="white"/>',
    ],
    ["open-dot", "Open dot", '<path d="M2 12h12"/><circle cx="18" cy="12" r="4"/>'],
    ["none", "None", '<path d="M2 12h20"/>'],
    ["tee", "Tee", '<path d="M2 12h18 M20 6v12"/>'],
    ["open-normal", "Open triangle", '<path d="M2 12h12"/><path d="M14 7l8 5-8 5z"/>'],
    ["diamond", "Diamond", `<path d="M2 12h8"/><path d="M10 12l6-4 6 4-6 4z" ${FILL}/>`],
    ["open-diamond", "Open diamond", '<path d="M2 12h8"/><path d="M10 12l6-4 6 4-6 4z"/>'],
    ["crow", "Crow's foot", '<path d="M2 12h20 M14 12l8-6 M14 12l8 6"/>'],
    ["box", "Square", `<path d="M2 12h12"/><rect x="14" y="8" width="8" height="8" ${FILL}/>`],
    ["half-open", "Half arrow", '<path d="M2 12h20 M22 12l-8-6"/>'],
    ["vee", "Vee", `<path d="M2 12h14"/><path d="M14 7l8 5-8 5 3-5z" ${FILL}/>`],
]);

/**
 * A five-pointed star centered on a point of the 24 x 24 line glyph.
 * @param cx - Its center's x.
 * @returns The SVG polygon.
 */
function star(cx: number): string {
    const points: string[] = [];

    for (let i = 0; i < 10; i++) {
        const radius = i % 2 === 0 ? 3 : 1.3;
        const angle = (Math.PI / 5) * i - Math.PI / 2;
        points.push(`${(cx + radius * Math.cos(angle)).toFixed(2)},${(12 + radius * Math.sin(angle)).toFixed(2)}`);
    }

    return `<polygon points="${points.join(" ")}" ${FILL} stroke="none"/>`;
}

/** Every line pattern, in the renderer's order, drawn as a short horizontal run. */
export const EDGE_LINE_DESCRIPTORS: readonly GlyphDescriptor<EdgeLinePattern>[] = describe<EdgeLinePattern>([
    ["solid", "Solid", '<path d="M2 12h20"/>'],
    ["dot", "Dotted", [3, 9, 15, 21].map((x) => `<circle cx="${x}" cy="12" r="1.6" ${FILL} stroke="none"/>`).join("")],
    ["star", "Stars", [4, 12, 20].map(star).join("")],
    [
        "box",
        "Squares",
        [2, 8, 14, 20].map((x) => `<rect x="${x}" y="10.5" width="3" height="3" ${FILL} stroke="none"/>`).join(""),
    ],
    [
        "dash",
        "Dashed",
        [1.5, 9, 16.5].map((x) => `<rect x="${x}" y="11" width="6" height="2" ${FILL} stroke="none"/>`).join(""),
    ],
    [
        "diamond",
        "Diamonds",
        [4, 12, 20].map((x) => `<path d="M${x - 2.5} 12l2.5-2.5 2.5 2.5-2.5 2.5z" ${FILL} stroke="none"/>`).join(""),
    ],
    [
        "dash-dot",
        "Dash-dot",
        `<rect x="1.5" y="11" width="6" height="2" ${FILL} stroke="none"/>` +
            `<circle cx="12" cy="12" r="1.6" ${FILL} stroke="none"/>` +
            `<rect x="16.5" y="11" width="6" height="2" ${FILL} stroke="none"/>`,
    ],
    ["sinewave", "Wave", '<path d="M2 12q2.5-5 5 0t5 0 5 0 5 0"/>'],
    ["zigzag", "Zigzag", '<path d="M2 12l2.5-4 5 8 5-8 5 8 2.5-4"/>'],
]);
