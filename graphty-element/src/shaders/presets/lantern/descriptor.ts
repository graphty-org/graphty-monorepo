/**
 * @file The catalog entry of the `lantern` preset (design/rendering/shader-styles.md section
 * 7.1): a node surface of paper lit from inside in the node's color, spread by the shared bloom.
 *
 * Catalog data only, no GLSL; nothing here reaches Babylon.js, Lit or the DOM.
 */

import type { ShaderDescriptor, ShaderInput, ShaderParamDescriptor } from "../../../catalog/shaders";

/** The lantern. */
export const LANTERN: ShaderDescriptor = Object.freeze({
    id: "lantern",
    plainName: "Lantern",
    target: "node",
    place: "paint",
    categories: Object.freeze(["Light"]),
    params: Object.freeze<ShaderParamDescriptor[]>([
        {
            name: "intensity",
            plainName: "Brightness",
            type: "number",
            default: 1.1,
            min: 0,
            max: 4,
            primary: true,
            varies: true,
        },
        { name: "falloff", plainName: "Falloff", type: "number", default: 2.2, min: 0, max: 8 },
        { name: "ribs", plainName: "Ribs", type: "integer", default: 9, min: 0, max: 20 },
        { name: "flicker", plainName: "Flicker", type: "number", default: 0.3, min: 0, max: 1 },
        { name: "bloom", plainName: "Bloom", type: "number", default: 0.7, min: 0, max: 3 },
    ]),
    reads: Object.freeze<ShaderInput[]>(["color", "light"]),
    motion: Object.freeze({ loop: Object.freeze({ speedParam: "flicker" }) }),
    cost: "heavy",
    origin: "element",
    webgpu: "translate",
    bloom: true,
    thumbnail: new URL("./thumb.webp?no-inline", import.meta.url).href,
});
