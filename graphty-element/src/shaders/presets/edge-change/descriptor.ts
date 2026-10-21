/**
 * @file The catalog entry of the `edge-change` preset (design/rendering/shader-styles.md section
 * 7.4), the edge half of change flash: a white-hot front draws in from the source when an edge
 * arrives or its data changes, and a removed edge shrinks to its middle over its exit.
 *
 * Its 0.5 s plays still read the clock fields directly in the body; until its parameters are
 * bound to `since.added`, `since.changed` and `since.unmatched`, the element times no play for it.
 *
 * Catalog data only, no GLSL; nothing here reaches Babylon.js, Lit or the DOM.
 */

import type { ShaderDescriptor, ShaderInput, ShaderParamDescriptor } from "../../../catalog/shaders";

/** The edge change. */
export const EDGE_CHANGE: ShaderDescriptor = Object.freeze({
    id: "edge-change",
    plainName: "Edge change",
    target: "edge",
    place: "along",
    categories: Object.freeze(["Change"]),
    params: Object.freeze<ShaderParamDescriptor[]>([
        { name: "flashColor", plainName: "Color", type: "color", default: "#e8f4ff", primary: true },
    ]),
    reads: Object.freeze<ShaderInput[]>(["color", "opacity", "times"]),
    motion: Object.freeze({}),
    cost: "light",
    origin: "element",
    webgpu: "translate",
    reach: 2,
    blend: "over",
    thumbnail: new URL("./thumb.webp?no-inline", import.meta.url).href,
});
