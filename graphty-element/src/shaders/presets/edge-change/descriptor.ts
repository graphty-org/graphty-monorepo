/**
 * @file The catalog entry of the `edge-change` preset (design/rendering/shader-styles.md section
 * 7.4), the edge half of change flash: a white-hot front draws in from the source when an edge
 * arrives or its data changes, and a removed edge shrinks to its middle over its exit.
 *
 * Each 0.5 s play is one parameter bound to its clock, and the body reads only those parameters.
 * The change and leave times start at -0.5, since their clocks read -1 when nothing happened: a
 * time below 0 is not playing, so at rest each sits there.
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
        // Seconds on the layer's clock, so the element plays it for exactly that long.
        {
            name: "arriveTime",
            plainName: "Arrive time",
            type: "number",
            default: Object.freeze({ by: "since.matched", domain: [0, 0.5], range: [0, 0.5] }),
        },
        // Seconds on the layer's clock, so the element plays it for exactly that long.
        {
            name: "changeTime",
            plainName: "Change time",
            type: "number",
            default: Object.freeze({ by: "since.changed", domain: [-0.5, 0.5], range: [-0.5, 0.5] }),
        },
        // Seconds on the layer's clock, so the element plays it for exactly that long.
        {
            name: "leaveTime",
            plainName: "Leave time",
            type: "number",
            default: Object.freeze({ by: "since.unmatched", domain: [-0.5, 0.5], range: [-0.5, 0.5] }),
        },
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
