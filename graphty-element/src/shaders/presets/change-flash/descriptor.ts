/**
 * @file The catalog entry of the `change-flash` preset (design/rendering/shader-styles.md section
 * 7.3): catalog data only, no GLSL, so the catalog can list it without loading a body.
 */

import type { ShaderDescriptor, ShaderInput, ShaderParamDescriptor } from "../../../catalog/shaders";

/** A tint and a glint on a node whose data just changed or that just arrived. */
export const DESCRIPTOR: ShaderDescriptor = Object.freeze({
    id: "change-flash",
    plainName: "Change flash",
    kind: "node-effect",
    params: Object.freeze<ShaderParamDescriptor[]>([
        { name: "flashColor", plainName: "Color", type: "color", default: "#e8f4ff", primary: true },
        { name: "glint", plainName: "Glint", type: "number", default: 1, min: 0, max: 3 },
    ]),
    reads: Object.freeze<ShaderInput[]>(["color", "times"]),
    motion: Object.freeze({ change: 1.5 }),
    cost: "light",
    origin: "element",
    webgpu: "translate",
    reach: 2.5,
    blend: "over",
    thumbnail: new URL("./thumb.webp?no-inline", import.meta.url).href,
});
