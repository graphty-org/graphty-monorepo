/**
 * @file The catalog entry of the `orbiting-satellites` preset (design/rendering/shader-styles.md
 * section 7.3): catalog data only, no GLSL, so the catalog can list it without loading a body.
 */

import type { ShaderDescriptor, ShaderInput, ShaderParamDescriptor } from "../../../catalog/shaders";

/** Moons on a tilted orbit round a node; how many is `moons`, bound per node for instance to degree. */
export const DESCRIPTOR: ShaderDescriptor = Object.freeze({
    id: "orbiting-satellites",
    plainName: "Satellites",
    target: "node",
    place: "around",
    categories: Object.freeze(["Attention"]),
    params: Object.freeze<ShaderParamDescriptor[]>([
        { name: "moons", plainName: "Moons", type: "integer", default: 3, min: 1, max: 12, varies: true },
        { name: "speed", plainName: "Speed", type: "number", default: 1.5, min: 0, max: 6 },
        { name: "orbit", plainName: "Orbit", type: "number", default: 2.1, min: 1.3, max: 3.2 },
        { name: "tilt", plainName: "Tilt", type: "number", default: 1.05, min: 0, max: 1.5 },
        { name: "moonSize", plainName: "Moon size", type: "number", default: 0.2, min: 0.05, max: 0.5 },
        { name: "moonColor", plainName: "Moon color", type: "color", default: "#cfe8ff", primary: true },
        { name: "ringOpacity", plainName: "Ring opacity", type: "number", default: 0.35, min: 0, max: 1 },
    ]),
    reads: Object.freeze<ShaderInput[]>(["color", "size"]),
    motion: Object.freeze({ loop: Object.freeze({ speedParam: "speed" }) }),
    cost: "medium",
    origin: "element",
    webgpu: "translate",
    reach: 3.2,
    blend: "over",
    thumbnail: new URL("./thumb.webp?no-inline", import.meta.url).href,
});
