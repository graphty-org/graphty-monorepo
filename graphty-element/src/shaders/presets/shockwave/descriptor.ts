/**
 * @file The catalog entry of the `shockwave` preset (design/rendering/shader-styles.md section
 * 7.3): catalog data only, no GLSL, so the catalog can list it without loading a body.
 */

import type { ShaderDescriptor, ShaderInput, ShaderParamDescriptor } from "../../../catalog/shaders";

/** A small, fast ring that runs out from a node once as it starts carrying it: a click effect on a Selected layer. */
export const DESCRIPTOR: ShaderDescriptor = Object.freeze({
    id: "shockwave",
    plainName: "Shockwave",
    target: "node",
    place: "around",
    categories: Object.freeze(["Attention"]),
    params: Object.freeze<ShaderParamDescriptor[]>([
        { name: "ringColor", plainName: "Color", type: "color", default: "#9fd8ff", primary: true },
        { name: "ringGlow", plainName: "Glow", type: "number", default: 0.9, min: 0, max: 1.5 },
        { name: "chroma", plainName: "Color split", type: "number", default: 1, min: 0, max: 4 },
        // The ring's age in seconds, bound to the layer's own clock: it runs once as a node starts
        // carrying the shader, and the element stops drawing frames for it after 0.7 s.
        {
            name: "ringAge",
            plainName: "Ring age",
            type: "number",
            default: Object.freeze({ by: "since.matched", domain: [0, 0.7], range: [0, 0.7] }),
        },
    ]),
    reads: Object.freeze<ShaderInput[]>([]),
    motion: Object.freeze({}),
    cost: "medium",
    origin: "element",
    webgpu: "translate",
    reach: 4,
    blend: "over",
    thumbnail: new URL("./thumb.webp?no-inline", import.meta.url).href,
});
