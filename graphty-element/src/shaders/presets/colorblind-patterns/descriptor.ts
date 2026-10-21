/**
 * @file The catalog entry of the `colorblind-patterns` preset, Patterns
 * (design/rendering/shader-styles.md section 7.1): eight patterns over the fill color, so nodes
 * read apart without telling colors apart. Catalog data only; the GLSL is in `./body.ts`.
 *
 * Bind `pattern` per node with the `"index"` scale
 * (`encode: { "node.shaderParams.colorblind-patterns.pattern": { by: "data.group", scale: "index" } }`):
 * each group takes the next pattern in the order it is first seen and keeps it when new groups
 * arrive.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import type { ShaderDescriptor } from "../../../catalog/shaders";

/** The catalog entry. */
export const DESCRIPTOR: ShaderDescriptor = Object.freeze({
    id: "colorblind-patterns",
    plainName: "Patterns",
    kind: "node-surface",
    params: Object.freeze([
        Object.freeze({
            name: "pattern",
            plainName: "Pattern",
            type: "integer",
            default: 0,
            min: 0,
            max: 7,
            varies: true,
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
    reads: Object.freeze(["color"] as const),
    motion: Object.freeze({}),
    cost: "light",
    origin: "element",
    webgpu: "translate",
    thumbnail: new URL("./thumb.webp", import.meta.url).href,
});
