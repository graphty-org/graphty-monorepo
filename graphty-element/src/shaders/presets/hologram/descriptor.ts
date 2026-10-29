/**
 * @file The catalog entry of the `hologram` preset, Hologram (design/rendering/shader-styles.md
 * section 7.1): a translucent wireframe globe with scanlines, a bright rim, flicker and glitch.
 * Catalog data only; the GLSL is in `./body.ts`.
 *
 * It materializes from the bottom up when a node starts carrying it and fades when the node stops,
 * so on a Hovered layer it prints in on hover and fades on leave. A node already carrying it when
 * the layer is added is shown at rest.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import type { ShaderDescriptor, ShaderParamDescriptor } from "../../../catalog/shaders";

/** The catalog entry. */
export const DESCRIPTOR: ShaderDescriptor = Object.freeze({
    id: "hologram",
    plainName: "Hologram",
    target: "node",
    place: "paint",
    categories: Object.freeze(["Iridescent"]),
    params: Object.freeze([
        Object.freeze({
            name: "holoColor",
            plainName: "Hologram color",
            type: "color",
            default: "#38e8ff",
            primary: true,
        }),
        Object.freeze({ name: "scanDensity", plainName: "Scan density", type: "number", default: 9, min: 1, max: 30 }),
        Object.freeze({ name: "flicker", plainName: "Flicker", type: "number", default: 0.6, min: 0, max: 1 }),
        Object.freeze({ name: "glitch", plainName: "Glitch", type: "number", default: 0.04, min: 0, max: 0.3 }),
        Object.freeze({ name: "gridLines", plainName: "Grid lines", type: "integer", default: 8, min: 2, max: 16 }),
        // Seconds on the layer's clock, so the element plays it for exactly that long.
        Object.freeze<ShaderParamDescriptor>({
            name: "printTime",
            plainName: "Print time",
            type: "number",
            default: Object.freeze({ by: "since.matched", domain: [0, 0.9], range: [0, 0.9] }),
        }),
        // Seconds on the layer's clock, so the element plays it for exactly that long.
        Object.freeze<ShaderParamDescriptor>({
            name: "fadeTime",
            plainName: "Fade time",
            type: "number",
            default: Object.freeze({ by: "since.unmatched", domain: [0, 0.6], range: [0, 0.6] }),
        }),
    ]),
    reads: Object.freeze(["color", "times"] as const),
    motion: Object.freeze({ loop: Object.freeze({ speedParam: "flicker" }) }),
    cost: "light",
    origin: "element",
    webgpu: "translate",
    thumbnail: new URL("./thumb.webp?no-inline", import.meta.url).href,
});
