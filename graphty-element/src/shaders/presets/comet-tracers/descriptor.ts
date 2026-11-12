/**
 * @file The catalog entry of the `comet-tracers` preset (design/rendering/shader-styles.md section
 * 7.4): an edge effect of white-hot comet heads with long tails racing from source to target, each
 * edge in its own phase. `speed` varies, so binding it to a number per edge (a weight) gives each
 * edge its own pace.
 *
 * Catalog data only, no GLSL; nothing here reaches Babylon.js, Lit or the DOM.
 */

import type { ShaderDescriptor, ShaderInput, ShaderParamDescriptor } from "../../../catalog/shaders";

/** The comets. */
export const COMET_TRACERS: ShaderDescriptor = Object.freeze({
    id: "comet-tracers",
    plainName: "Comets",
    target: "edge",
    place: "along",
    categories: Object.freeze(["Flow"]),
    params: Object.freeze<ShaderParamDescriptor[]>([
        { name: "speed", plainName: "Speed", type: "number", default: 1, min: -3, max: 3, varies: true },
        { name: "spacing", plainName: "Spacing", type: "number", default: 180, min: 30, max: 800 },
        { name: "tail", plainName: "Tail", type: "number", default: 55, min: 4, max: 200 },
        { name: "headColor", plainName: "Head color", type: "color", default: "#fff6e0", primary: true },
        { name: "tailColor", plainName: "Tail color", type: "color", default: "#ff7a2a" },
        { name: "useEdgeColor", plainName: "Use edge color", type: "boolean", default: false },
        { name: "intensity", plainName: "Intensity", type: "number", default: 1.2, min: 0, max: 3 },
        { name: "bloom", plainName: "Bloom", type: "number", default: 1, min: 0, max: 3 },
    ]),
    reads: Object.freeze<ShaderInput[]>(["color", "selected", "hovered"]),
    motion: Object.freeze({ loop: Object.freeze({ speedParam: "speed" }) }),
    cost: "medium",
    origin: "element",
    webgpu: "translate",
    reach: 2,
    blend: "over",
    bloom: true,
    thumbnail: new URL("./thumb.webp?no-inline", import.meta.url).href,
});
