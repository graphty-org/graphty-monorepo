/**
 * @file The catalog entry of the `fiber-packets` preset (design/rendering/shader-styles.md section
 * 7.4): an edge effect of light packets that run from source to target and flare on arrival, in
 * the line's color. It pairs with the `fiber-optic` surface, and draws on any line.
 *
 * Catalog data only, no GLSL; nothing here reaches Babylon.js, Lit or the DOM.
 */

import type { ShaderDescriptor, ShaderInput, ShaderParamDescriptor } from "../../../catalog/shaders";

/** The light packets. */
export const FIBER_PACKETS: ShaderDescriptor = Object.freeze({
    id: "fiber-packets",
    plainName: "Light packets",
    target: "edge",
    place: "along",
    categories: Object.freeze(["Flow"]),
    params: Object.freeze<ShaderParamDescriptor[]>([
        { name: "packets", plainName: "Packets", type: "integer", default: 3, min: 1, max: 6, primary: true },
        { name: "speed", plainName: "Speed", type: "number", default: 1.2, min: 0, max: 4, varies: true },
        { name: "tail", plainName: "Tail", type: "number", default: 14, min: 2, max: 150 },
        { name: "glint", plainName: "Glint", type: "number", default: 0.8, min: 0, max: 4 },
        { name: "bloom", plainName: "Bloom", type: "number", default: 0.8, min: 0, max: 3 },
    ]),
    reads: Object.freeze<ShaderInput[]>(["color", "selected", "hovered"]),
    motion: Object.freeze({ loop: Object.freeze({ speedParam: "speed" }) }),
    cost: "medium",
    origin: "element",
    webgpu: "translate",
    reach: 1.5,
    blend: "over",
    bloom: true,
    thumbnail: new URL("./thumb.webp?no-inline", import.meta.url).href,
});
