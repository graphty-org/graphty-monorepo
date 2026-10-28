/**
 * @file The catalog entry of the `uncertainty-aura` preset (design/rendering/shader-styles.md
 * section 7.3): catalog data only, no GLSL, so the catalog can list it without loading a body.
 */

import type { ShaderDescriptor, ShaderInput, ShaderParamDescriptor } from "../../../catalog/shaders";

/** A haze round a node that spreads, churns and flickers with `intensity`, bound per node to uncertainty. */
export const DESCRIPTOR: ShaderDescriptor = Object.freeze({
    id: "uncertainty-aura",
    plainName: "Aura",
    target: "node",
    place: "around",
    categories: Object.freeze(["Data"]),
    params: Object.freeze<ShaderParamDescriptor[]>([
        {
            name: "intensity",
            plainName: "Intensity",
            type: "number",
            default: 1.3,
            min: 0,
            max: 2,
            varies: true,
            primary: true,
        },
        { name: "spread", plainName: "Spread", type: "number", default: 1.4, min: 0.2, max: 2.5 },
        { name: "turbulence", plainName: "Turbulence", type: "number", default: 1.2, min: 0, max: 3 },
        { name: "churn", plainName: "Churn", type: "number", default: 0.8, min: 0, max: 3 },
        { name: "auraColor", plainName: "Aura color", type: "color", default: "#9fb8ff" },
        { name: "tint", plainName: "Node tint", type: "number", default: 0.55, min: 0, max: 1 },
    ]),
    reads: Object.freeze<ShaderInput[]>(["color"]),
    motion: Object.freeze({ loop: Object.freeze({ speedParam: "churn" }) }),
    cost: "medium",
    origin: "element",
    webgpu: "translate",
    reach: 3,
    blend: "over",
    thumbnail: new URL("./thumb.webp?no-inline", import.meta.url).href,
});
