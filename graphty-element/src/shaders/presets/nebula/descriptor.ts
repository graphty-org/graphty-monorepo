/**
 * @file The catalog entry of the `nebula` preset, Nebula (design/rendering/shader-styles.md
 * section 7.5): a background of domain-warped gas, dust lanes and twinkling stars. Catalog data
 * only; the GLSL is in `./body.ts`.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import type { ShaderDescriptor, ShaderInput, ShaderParamDescriptor } from "../../../catalog/shaders";

/** The catalog entry. */
export const DESCRIPTOR: ShaderDescriptor = Object.freeze({
    id: "nebula",
    plainName: "Nebula",
    target: "background",
    categories: Object.freeze(["Space"]),
    params: Object.freeze<ShaderParamDescriptor[]>([
        Object.freeze({ name: "gasA", plainName: "Deep gas", type: "color", default: "#2a0f4a" }),
        Object.freeze({ name: "gasB", plainName: "Bright gas", type: "color", default: "#d0407a", primary: true }),
        Object.freeze({ name: "gasC", plainName: "Cool gas", type: "color", default: "#1f6fa8" }),
        Object.freeze({ name: "density", plainName: "Density", type: "number", default: 0.8, min: 0, max: 2 }),
        Object.freeze({ name: "warp", plainName: "Warp", type: "number", default: 1, min: 0, max: 2 }),
        Object.freeze({ name: "drift", plainName: "Drift", type: "number", default: 1, min: 0, max: 5 }),
        Object.freeze({ name: "stars", plainName: "Stars", type: "number", default: 0.6, min: 0, max: 1 }),
        Object.freeze({ name: "twinkle", plainName: "Twinkle", type: "number", default: 0.6, min: 0, max: 1 }),
        // How opaque the dark sky between the gas is: at 0 the background color or image shows there.
        Object.freeze({ name: "sky", plainName: "Sky", type: "number", default: 1, min: 0, max: 1 }),
        Object.freeze({
            name: "tintBy",
            plainName: "Tint by",
            type: "enum",
            default: "none",
            values: Object.freeze([
                Object.freeze({ value: "none", label: "None" }),
                Object.freeze({ value: "groups", label: "Groups" }),
            ]),
        }),
    ]),
    reads: Object.freeze<ShaderInput[]>(["members"]),
    motion: Object.freeze({ loop: Object.freeze({ speedParam: "drift" }) }),
    cost: "heavy",
    origin: "element",
    webgpu: "translate",
    thumbnail: new URL("./thumb.webp?no-inline", import.meta.url).href,
});
