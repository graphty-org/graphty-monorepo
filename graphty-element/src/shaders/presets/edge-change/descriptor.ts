/**
 * @file The catalog entry of the `edge-change` preset (design/rendering/shader-styles.md section
 * 7.4), the edge half of change flash: a white-hot front draws in from the source when an edge
 * arrives or its data changes, and a removed edge shrinks to its middle over its exit.
 *
 * The element plays an arriving edge's animation as an entrance, so the motion declares `enter`
 * beside `change` (both 0.5 s); the exit is 0.5 s, and the element keeps a removed edge drawn for
 * exactly that long.
 *
 * Catalog data only, no GLSL; nothing here reaches Babylon.js, Lit or the DOM.
 */

import type { ShaderDescriptor, ShaderInput, ShaderParamDescriptor } from "../../../catalog/shaders";

/** The edge change. */
export const EDGE_CHANGE: ShaderDescriptor = Object.freeze({
    id: "edge-change",
    plainName: "Edge change",
    target: "edge",
    role: "effect",
    categories: Object.freeze(["Change"]),
    params: Object.freeze<ShaderParamDescriptor[]>([
        { name: "flashColor", plainName: "Color", type: "color", default: "#e8f4ff", primary: true },
    ]),
    reads: Object.freeze<ShaderInput[]>(["color", "opacity", "times"]),
    motion: Object.freeze({ enter: 0.5, change: 0.5, exit: 0.5 }),
    cost: "light",
    origin: "element",
    webgpu: "translate",
    reach: 2,
    blend: "over",
    thumbnail: new URL("./thumb.webp?no-inline", import.meta.url).href,
});
