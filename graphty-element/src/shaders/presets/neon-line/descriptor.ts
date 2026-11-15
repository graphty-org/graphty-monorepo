/**
 * @file The catalog entry of the `neon-line` preset (design/rendering/shader-styles.md section
 * 7.4): an edge effect of a bright core and a neon halo around the line, with a glint that rides
 * toward the target so direction reads without arrowheads. From the lab's bezier glow, generalized
 * to any route: straight, curved, bent or lifted.
 *
 * Catalog data only, no GLSL; nothing here reaches Babylon.js, Lit or the DOM.
 */

import type { ShaderDescriptor, ShaderInput, ShaderParamDescriptor } from "../../../catalog/shaders";

/** The glow. */
export const NEON_LINE: ShaderDescriptor = Object.freeze({
    id: "neon-line",
    plainName: "Neon line",
    target: "edge",
    place: "along",
    categories: Object.freeze(["Light"]),
    params: Object.freeze<ShaderParamDescriptor[]>([
        { name: "glow", plainName: "Glow", type: "number", default: 0.4, min: 0, max: 2, primary: true },
        { name: "glowWidth", plainName: "Glow width", type: "number", default: 3, min: 0.5, max: 10 },
        { name: "glintSpeed", plainName: "Glint speed", type: "number", default: 0.35, min: 0, max: 2 },
        { name: "bloom", plainName: "Bloom", type: "number", default: 0.6, min: 0, max: 2 },
    ]),
    reads: Object.freeze<ShaderInput[]>(["color", "width", "selected", "hovered"]),
    motion: Object.freeze({ loop: Object.freeze({ speedParam: "glintSpeed" }) }),
    cost: "medium",
    origin: "element",
    webgpu: "translate",
    reach: 6,
    blend: "over",
    bloom: true,
    thumbnail: new URL("./thumb.webp?no-inline", import.meta.url).href,
});
