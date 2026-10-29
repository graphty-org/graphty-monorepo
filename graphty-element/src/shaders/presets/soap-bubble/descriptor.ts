/**
 * @file The catalog entry of the `soap-bubble` preset, Soap bubble (design/rendering/shader-styles.md
 * section 7.5): a group outline of form `"sphere"`, one thin-film bubble around each group of a
 * layer's nodes, nested for subgroups. Catalog data only; the GLSL is in `./body.ts`.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import type { ShaderDescriptor, ShaderInput, ShaderParamDescriptor } from "../../../catalog/shaders";

/** The catalog entry. */
export const DESCRIPTOR: ShaderDescriptor = Object.freeze({
    id: "soap-bubble",
    plainName: "Soap bubble",
    target: "group",
    place: "group",
    categories: Object.freeze(["Bubble"]),
    form: "sphere",
    // The bubble clears its outermost members by 2.5 of their radii.
    reach: 6,
    params: Object.freeze<ShaderParamDescriptor[]>([
        Object.freeze({
            name: "thickness",
            plainName: "Film thickness",
            type: "number",
            default: 520,
            min: 100,
            max: 1200,
            step: 10,
            primary: true,
        }),
        Object.freeze({ name: "turbulence", plainName: "Turbulence", type: "number", default: 0.6, min: 0, max: 1.5 }),
        Object.freeze({ name: "swirl", plainName: "Swirl", type: "number", default: 1, min: 0, max: 4 }),
        Object.freeze({ name: "clarity", plainName: "Clarity", type: "number", default: 0.75, min: 0, max: 1 }),
        Object.freeze({ name: "shine", plainName: "Shine", type: "number", default: 1.2, min: 0.2, max: 3 }),
    ]),
    reads: Object.freeze<ShaderInput[]>(["members", "light"]),
    motion: Object.freeze({ loop: Object.freeze({ speedParam: "swirl" }) }),
    cost: "heavy",
    origin: "element",
    webgpu: "translate",
    thumbnail: new URL("./thumb.webp?no-inline", import.meta.url).href,
});
