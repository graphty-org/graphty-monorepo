/**
 * @file The catalog entry of the `glass-marble` preset (design/rendering/shader-styles.md section
 * 7.1): a node surface of refracting glass with twisted ribbons inside, half in the node's color.
 *
 * Catalog data only, no GLSL; nothing here reaches Babylon.js, Lit or the DOM.
 */

import type { ShaderDescriptor, ShaderInput, ShaderParamDescriptor } from "../../../catalog/shaders";

/** The glass marble. */
export const GLASS_MARBLE: ShaderDescriptor = Object.freeze({
    id: "glass-marble",
    plainName: "Glass marble",
    target: "node",
    place: "paint",
    categories: Object.freeze(["Glass"]),
    params: Object.freeze<ShaderParamDescriptor[]>([
        { name: "twist", plainName: "Twist", type: "number", default: 2.2, min: 0, max: 8, primary: true },
        { name: "vanes", plainName: "Ribbons", type: "integer", default: 4, min: 2, max: 10 },
        { name: "ior", plainName: "Refraction", type: "number", default: 1.5, min: 1, max: 2.4 },
        { name: "thickness", plainName: "Ribbon width", type: "number", default: 0.12, min: 0.02, max: 0.4 },
        { name: "spin", plainName: "Spin", type: "number", default: 0.25, min: 0, max: 2, varies: true },
        { name: "reflection", plainName: "Reflection", type: "number", default: 1, min: 0, max: 2 },
        { name: "glassTint", plainName: "Glass tint", type: "color", default: "#cfe6ff" },
        { name: "secondColor", plainName: "Second color", type: "color", default: "#f2efe6" },
    ]),
    reads: Object.freeze<ShaderInput[]>(["color", "light"]),
    motion: Object.freeze({ loop: Object.freeze({ speedParam: "spin" }) }),
    cost: "heavy",
    origin: "element",
    webgpu: "translate",
    thumbnail: new URL("./thumb.webp?no-inline", import.meta.url).href,
});
