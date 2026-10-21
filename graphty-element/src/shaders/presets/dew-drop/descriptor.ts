/**
 * @file The catalog entry of the `dew-drop` preset (design/rendering/shader-styles.md section
 * 7.1): a node surface of see-through water with a caustic crescent and a glint.
 *
 * Catalog data only, no GLSL; nothing here reaches Babylon.js, Lit or the DOM.
 */

import type { ShaderDescriptor, ShaderInput, ShaderParamDescriptor } from "../../../catalog/shaders";

/** The dew drop. */
export const DEW_DROP: ShaderDescriptor = Object.freeze({
    id: "dew-drop",
    plainName: "Dew drop",
    kind: "node-surface",
    params: Object.freeze<ShaderParamDescriptor[]>([
        { name: "sparkle", plainName: "Sparkle", type: "number", default: 1.6, min: 0, max: 3, primary: true },
        { name: "tint", plainName: "Tint", type: "number", default: 0.75, min: 0, max: 1 },
        { name: "bloom", plainName: "Bloom", type: "number", default: 0.9, min: 0, max: 2 },
    ]),
    reads: Object.freeze<ShaderInput[]>(["color"]),
    motion: Object.freeze({}),
    cost: "medium",
    origin: "element",
    webgpu: "translate",
    bloom: true,
    thumbnail: new URL("thumb.webp", import.meta.url).href,
});
