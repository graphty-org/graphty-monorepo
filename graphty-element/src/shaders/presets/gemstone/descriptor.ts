/**
 * @file The catalog entry of the `gemstone` preset (design/rendering/shader-styles.md section
 * 7.1): a node surface cut into flat facets that throw rainbow fire, in the node's color.
 *
 * Catalog data only, no GLSL; nothing here reaches Babylon.js, Lit or the DOM.
 */

import type { ShaderDescriptor, ShaderInput, ShaderParamDescriptor } from "../../../catalog/shaders";

/** The gemstone. */
export const GEMSTONE: ShaderDescriptor = Object.freeze({
    id: "gemstone",
    plainName: "Gemstone",
    target: "node",
    place: "paint",
    categories: Object.freeze(["Sparkle"]),
    params: Object.freeze<ShaderParamDescriptor[]>([
        { name: "facets", plainName: "Facets", type: "integer", default: 22, min: 6, max: 64, primary: true },
        { name: "ior", plainName: "Refraction", type: "number", default: 2, min: 1.2, max: 2.6 },
        { name: "dispersion", plainName: "Fire", type: "number", default: 0.06, min: 0, max: 0.25 },
        { name: "sparkle", plainName: "Sparkle", type: "number", default: 1, min: 0, max: 3, varies: true },
        { name: "turn", plainName: "Turn", type: "number", default: 0.15, min: 0, max: 2 },
    ]),
    reads: Object.freeze<ShaderInput[]>(["color", "light"]),
    motion: Object.freeze({ loop: Object.freeze({ speedParam: "turn" }) }),
    cost: "heavy",
    origin: "element",
    webgpu: "translate",
    thumbnail: new URL("./thumb.webp?no-inline", import.meta.url).href,
});
