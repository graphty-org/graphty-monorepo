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
    // Drawn at least 40 CSS px wide, so a selected node far away stays findable.
    minSize: 40,
    categories: Object.freeze(["Attention"]),
    params: Object.freeze<ShaderParamDescriptor[]>([
        { name: "hudColor", plainName: "Color", type: "color", default: "#5cffb0", primary: true },
        { name: "spin", plainName: "Spin", type: "number", default: 0.6, min: -3, max: 3 },
        { name: "ticks", plainName: "Ticks", type: "integer", default: 48, min: 8, max: 120 },
        { name: "lineWidth", plainName: "Line width", type: "number", default: 1.8, min: 0.5, max: 5 },
        // Seconds on the layer's clock, so the element plays it for exactly that long.
        {
            name: "lockTime",
            plainName: "Lock time",
            type: "number",
            default: Object.freeze({ by: "since.matched", domain: [0, 0.55], range: [0, 0.55] }),
        },
        // Seconds on the layer's clock, so the element plays it for exactly that long.
        {
            name: "leaveTime",
            plainName: "Leave time",
            type: "number",
            default: Object.freeze({ by: "since.unmatched", domain: [0, 0.3], range: [0, 0.3] }),
        },
    ]),
    reads: Object.freeze<ShaderInput[]>(["size"]),
    motion: Object.freeze({ loop: Object.freeze({ speedParam: "spin" }) }),
    cost: "light",
    origin: "element",
    webgpu: "translate",
    reach: 3,
    blend: "over",
    thumbnail: new URL("./thumb.webp?no-inline", import.meta.url).href,
});
