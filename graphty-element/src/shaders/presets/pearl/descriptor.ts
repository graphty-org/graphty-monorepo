/**
 * @file The catalog entry of the `pearl` preset, Pearl (design/rendering/shader-styles.md
 * section 7.1): iridescent nacre. Catalog data only; the GLSL is in `./body.ts`.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import type { ShaderDescriptor, ShaderInput } from "../../../catalog/shaders";

/** The catalog entry. */
export const DESCRIPTOR: ShaderDescriptor = Object.freeze({
    id: "pearl",
    plainName: "Pearl",
    target: "node",
    place: "paint",
    categories: Object.freeze(["Iridescent"]),
    params: Object.freeze([
        Object.freeze({ name: "tint", plainName: "Tint", type: "number", default: 0.8, min: 0, max: 1, primary: true }),
    ]),
    reads: Object.freeze<ShaderInput[]>(["color", "light"]),
    motion: Object.freeze({}),
    cost: "light",
    origin: "element",
    webgpu: "translate",
    thumbnail: new URL("./thumb.webp?no-inline", import.meta.url).href,
});
