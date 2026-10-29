/**
 * @file The catalog entry of the `liquid-metal` preset, Liquid metal (design/rendering/shader-styles.md
 * section 7.1): chrome with a slowly flowing reflection. Catalog data only; the GLSL is in `./body.ts`.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import type { ShaderDescriptor, ShaderInput } from "../../../catalog/shaders";

/** The catalog entry. */
export const DESCRIPTOR: ShaderDescriptor = Object.freeze({
    id: "liquid-metal",
    plainName: "Liquid metal",
    target: "node",
    place: "paint",
    categories: Object.freeze(["Metal"]),
    params: Object.freeze([
        Object.freeze({ name: "speed", plainName: "Speed", type: "number", default: 0.3, min: 0, max: 2 }),
        Object.freeze({
            name: "ripple",
            plainName: "Ripple",
            type: "number",
            default: 0.5,
            min: 0,
            max: 1,
            primary: true,
        }),
        Object.freeze({ name: "tint", plainName: "Tint", type: "number", default: 0.5, min: 0, max: 1 }),
    ]),
    reads: Object.freeze<ShaderInput[]>(["color"]),
    motion: Object.freeze({ loop: { speedParam: "speed" } }),
    cost: "medium",
    origin: "element",
    webgpu: "translate",
    thumbnail: new URL("./thumb.webp?no-inline", import.meta.url).href,
});
