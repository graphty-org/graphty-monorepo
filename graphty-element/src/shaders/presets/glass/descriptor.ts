/**
 * @file The catalog entry of the `glass` preset (design/rendering/shader-styles.md section
 * 7.1, design/rendering/shader-studio/decisions.md 5.2): clear, see-through glass with a caustic
 * crescent, a bright rim, a sharp highlight and a glint.
 *
 * Catalog data only, no GLSL; nothing here reaches Babylon.js, Lit or the DOM.
 */

import type { ShaderDescriptor, ShaderInput, ShaderParamDescriptor } from "../../../catalog/shaders";

/** The glass. */
export const GLASS: ShaderDescriptor = Object.freeze({
    id: "glass",
    plainName: "Glass",
    target: "node",
    place: "paint",
    categories: Object.freeze(["Glass"]),
    params: Object.freeze<ShaderParamDescriptor[]>([
        { name: "sparkle", plainName: "Sparkle", type: "number", default: 1.6, min: 0, max: 3, primary: true },
        { name: "tint", plainName: "Tint", type: "number", default: 0.75, min: 0, max: 1 },
        { name: "bloom", plainName: "Bloom", type: "number", default: 0.9, min: 0, max: 2 },
    ]),
    reads: Object.freeze<ShaderInput[]>(["color", "light"]),
    motion: Object.freeze({}),
    cost: "medium",
    origin: "element",
    webgpu: "translate",
    bloom: true,
    thumbnail: new URL("./thumb.webp?no-inline", import.meta.url).href,
});
