/**
 * @file The catalog entry of the `colorblind-patterns` preset, Patterns
 * (design/rendering/shader-styles.md section 7.1): eight patterns over the fill color, so nodes
 * read apart without telling colors apart. Catalog data only; the GLSL is in `./body.ts`.
 *
 * Bind `pattern` per node with the `"index"` scale
 * (`encode: { "node.shaders.colorblind-patterns.pattern": { by: "data.group", scale: "index" } }`):
 * each group takes the next pattern in the order it is first seen and keeps it when new groups
 * arrive.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import type { ShaderDescriptor, ShaderParamChoice } from "../../../catalog/shaders";

/**
 * The eight patterns, as `patternInk` draws them.
 * Each row: the value, its name, and its picture's SVG path data in a 24 x 24 box (filled, or
 * stroked when the fourth entry is true).
 */
const PATTERNS: readonly ShaderParamChoice[] = Object.freeze(
    (
        [
            [0, "Diagonal stripes", "M3 9L9 3M3 15L15 3M3 21L21 3M9 21L21 9M15 21L21 15", true],
            [1, "Horizontal stripes", "M3 6H21M3 12H21M3 18H21", true],
            [
                2,
                "Dots",
                "M4 6a2 2 0 1 0 4 0a2 2 0 1 0 -4 0ZM4 12a2 2 0 1 0 4 0a2 2 0 1 0 -4 0ZM4 18a2 2 0 1 0 4 0a2 2 0 1 0 -4 0ZM10 6a2 2 0 1 0 4 0a2 2 0 1 0 -4 0ZM10 12a2 2 0 1 0 4 0a2 2 0 1 0 -4 0ZM10 18a2 2 0 1 0 4 0a2 2 0 1 0 -4 0ZM16 6a2 2 0 1 0 4 0a2 2 0 1 0 -4 0ZM16 12a2 2 0 1 0 4 0a2 2 0 1 0 -4 0ZM16 18a2 2 0 1 0 4 0a2 2 0 1 0 -4 0Z",
            ],
            [3, "Checker", "M3 3h6v6h-6ZM15 3h6v6h-6ZM9 9h6v6h-6ZM3 15h6v6h-6ZM15 15h6v6h-6Z"],
            [
                4,
                "Cross-hatch",
                "M3 9L9 3M3 15L15 3M3 21L21 3M9 21L21 9M15 21L21 15M3 15L9 21M3 9L15 21M3 3L21 21M9 3L21 15M15 3L21 9",
                true,
            ],
            [
                5,
                "Rings",
                "M9 12a3 3 0 1 0 6 0a3 3 0 1 0 -6 0ZM6 12a6 6 0 1 0 12 0a6 6 0 1 0 -12 0ZM3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0Z",
                true,
            ],
            [
                6,
                "Diamonds",
                "M6 2.5L9.5 6L6 9.5L2.5 6ZM18 2.5L21.5 6L18 9.5L14.5 6ZM12 8.5L15.5 12L12 15.5L8.5 12ZM6 14.5L9.5 18L6 21.5L2.5 18ZM18 14.5L21.5 18L18 21.5L14.5 18Z",
            ],
            [7, "Solid", "M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"],
        ] as const
    ).map(([value, plainName, path, outline]: readonly [number, string, string, boolean?]) =>
        Object.freeze({ value, plainName, glyph: Object.freeze(outline === true ? { path, outline } : { path }) }),
    ),
);

/** The catalog entry. */
export const DESCRIPTOR: ShaderDescriptor = Object.freeze({
    id: "colorblind-patterns",
    plainName: "Patterns",
    target: "node",
    place: "paint",
    categories: Object.freeze(["Pattern"]),
    params: Object.freeze([
        Object.freeze({
            name: "pattern",
            plainName: "Pattern",
            type: "integer",
            default: 0,
            min: 0,
            max: 7,
            varies: true,
            choices: PATTERNS,
        }),
        Object.freeze({
            name: "density",
            plainName: "Density",
            type: "number",
            default: 5,
            min: 2,
            max: 8,
            primary: true,
        }),
        Object.freeze({ name: "contrast", plainName: "Contrast", type: "number", default: 0.7, min: 0, max: 1 }),
        Object.freeze({ name: "rotate", plainName: "Rotate", type: "number", default: 0, min: 0, max: 3.14 }),
    ]),
    reads: Object.freeze(["color", "light"] as const),
    motion: Object.freeze({}),
    cost: "light",
    origin: "element",
    webgpu: "translate",
    thumbnail: new URL("./thumb.webp?no-inline", import.meta.url).href,
});
