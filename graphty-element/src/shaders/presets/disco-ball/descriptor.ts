/**
 * @file The catalog entry of the `disco-ball` preset (design/rendering/shader-styles.md section
 * 7.1): a node surface of turning mirror tiles, lightly tinted by the node's color.
 *
 * Catalog data only, no GLSL; nothing here reaches Babylon.js, Lit or the DOM.
 */

import type { ShaderDescriptor, ShaderInput, ShaderParamDescriptor } from "../../../catalog/shaders";

/** The disco ball. */
export const DISCO_BALL: ShaderDescriptor = Object.freeze({
    id: "disco-ball",
    plainName: "Disco ball",
    target: "node",
    place: "paint",
    categories: Object.freeze(["Sparkle"]),
    params: Object.freeze<ShaderParamDescriptor[]>([
        { name: "facets", plainName: "Tiles", type: "integer", default: 22, min: 6, max: 64, primary: true },
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
