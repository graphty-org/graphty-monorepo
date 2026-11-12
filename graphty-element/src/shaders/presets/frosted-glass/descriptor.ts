/**
 * @file The catalog entry of the `frosted-glass` preset, Frosted glass (design/rendering/shader-styles.md
 * section 7.1): diffuse translucent glass, soft rim. Catalog data only; the GLSL is in `./body.ts`.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import type { ShaderDescriptor, ShaderInput } from "../../../catalog/shaders";

/** The catalog entry. */
export const DESCRIPTOR: ShaderDescriptor = Object.freeze({
    id: "frosted-glass",
    plainName: "Frosted glass",
    target: "node",
    place: "paint",
    categories: Object.freeze(["Glass"]),
    params: Object.freeze([
        Object.freeze({
            name: "frost",
            plainName: "Frost",
            type: "number",
            default: 0.6,
            min: 0,
            max: 1,
            primary: true,
        }),
        Object.freeze({ name: "rim", plainName: "Rim", type: "number", default: 0.5, min: 0, max: 1 }),
        Object.freeze({ name: "tint", plainName: "Tint", type: "number", default: 0.5, min: 0, max: 1 }),
    ]),
    reads: Object.freeze<ShaderInput[]>(["color", "light"]),
    motion: Object.freeze({}),
    cost: "medium",
    origin: "element",
    webgpu: "translate",
    thumbnail: new URL("./thumb.webp?no-inline", import.meta.url).href,
});
