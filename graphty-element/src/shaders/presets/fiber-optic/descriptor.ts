/**
 * @file The catalog entry of the `fiber-optic` preset (design/rendering/shader-styles.md section
 * 7.4): an edge surface of dark glass fiber with a bright rim, tinted by the line's color. It pairs
 * with the `fiber-packets` effect, which sends light along it.
 *
 * Catalog data only, no GLSL; nothing here reaches Babylon.js, Lit or the DOM.
 */

import type { ShaderDescriptor, ShaderInput, ShaderParamDescriptor } from "../../../catalog/shaders";

/** The fiber. */
export const FIBER_OPTIC: ShaderDescriptor = Object.freeze({
    id: "fiber-optic",
    plainName: "Fiber",
    target: "edge",
    place: "paint",
    categories: Object.freeze(["Light"]),
    params: Object.freeze<ShaderParamDescriptor[]>([
        { name: "glass", plainName: "Glass", type: "number", default: 1, min: 0, max: 3, primary: true },
        { name: "hueSpread", plainName: "Hue spread", type: "number", default: 0.6, min: 0, max: 1 },
    ]),
    reads: Object.freeze<ShaderInput[]>(["color", "opacity", "width", "selected", "hovered"]),
    motion: Object.freeze({}),
    cost: "medium",
    origin: "element",
    webgpu: "translate",
    thumbnail: new URL("./thumb.webp?no-inline", import.meta.url).href,
});
