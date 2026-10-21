/**
 * @file The catalog entry of the `lock-on-reticle` preset (design/rendering/shader-styles.md
 * section 7.3): catalog data only, no GLSL, so the catalog can list it without loading a body.
 */

import type { ShaderDescriptor, ShaderInput, ShaderParamDescriptor } from "../../../catalog/shaders";

/** A HUD reticle that snaps in round a node as it starts carrying it; meant for a Selected layer. */
export const DESCRIPTOR: ShaderDescriptor = Object.freeze({
    id: "lock-on-reticle",
    plainName: "Reticle",
    target: "node",
    place: "around",
    categories: Object.freeze(["Attention"]),
    params: Object.freeze<ShaderParamDescriptor[]>([
        { name: "hudColor", plainName: "Color", type: "color", default: "#5cffb0", primary: true },
        { name: "spin", plainName: "Spin", type: "number", default: 0.6, min: -3, max: 3 },
        { name: "ticks", plainName: "Ticks", type: "integer", default: 48, min: 8, max: 120 },
        { name: "lineWidth", plainName: "Line width", type: "number", default: 1.8, min: 0.5, max: 5 },
    ]),
    reads: Object.freeze<ShaderInput[]>(["size", "times"]),
    motion: Object.freeze({ loop: Object.freeze({ speedParam: "spin" }) }),
    cost: "light",
    origin: "element",
    webgpu: "translate",
    reach: 3,
    blend: "over",
    thumbnail: new URL("./thumb.webp?no-inline", import.meta.url).href,
});
