/**
 * @file The catalog entry of the `anodized-steel` preset, Anodized steel (design/rendering/shader-styles.md
 * section 7.1): brushed steel with thin-film rainbow color. Catalog data only; the GLSL is in `./body.ts`.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import type { ShaderDescriptor, ShaderInput } from "../../../catalog/shaders";

/** The catalog entry. */
export const DESCRIPTOR: ShaderDescriptor = Object.freeze({
    id: "anodized-steel",
    plainName: "Anodized steel",
    target: "node",
    place: "paint",
    categories: Object.freeze(["Metal"]),
    params: Object.freeze([
        Object.freeze({
            name: "film",
            plainName: "Film",
            type: "number",
            default: 500,
            min: 100,
            max: 1200,
            primary: true,
        }),
        Object.freeze({ name: "brush", plainName: "Brush", type: "number", default: 0.5, min: 0, max: 1 }),
        Object.freeze({ name: "tint", plainName: "Tint", type: "number", default: 0.2, min: 0, max: 1 }),
    ]),
    reads: Object.freeze<ShaderInput[]>(["color", "light"]),
    motion: Object.freeze({}),
    cost: "medium",
    origin: "element",
    webgpu: "translate",
    thumbnail: new URL("./thumb.webp?no-inline", import.meta.url).href,
});
