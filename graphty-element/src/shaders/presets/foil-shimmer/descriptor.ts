/**
 * @file The catalog entry of the `foil-shimmer` preset, Foil shimmer
 * (design/rendering/shader-styles.md section 7.1): silvered holographic foil with a bright band
 * sweeping across it. Catalog data only; the GLSL is in `./body.ts`.
 *
 * It draws foil on the nodes its layer matches and nothing else: a search layer names it for the
 * hits only, and dimming the rest is the reader's own layer.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import type { ShaderDescriptor } from "../../../catalog/shaders";

/** The catalog entry. */
export const DESCRIPTOR: ShaderDescriptor = Object.freeze({
    id: "foil-shimmer",
    plainName: "Foil shimmer",
    target: "node",
    place: "paint",
    categories: Object.freeze(["Iridescent"]),
    params: Object.freeze([
        Object.freeze({ name: "foil", plainName: "Foil", type: "number", default: 0.9, min: 0, max: 1, primary: true }),
        Object.freeze({ name: "sweepSpeed", plainName: "Sweep speed", type: "number", default: 0.35, min: 0, max: 2 }),
        Object.freeze({ name: "bandWidth", plainName: "Band width", type: "number", default: 0.18, min: 0.02, max: 1 }),
        Object.freeze({ name: "sparkle", plainName: "Sparkle", type: "number", default: 1.2, min: 0, max: 3 }),
    ]),
    reads: Object.freeze(["color", "light"] as const),
    motion: Object.freeze({ loop: Object.freeze({ speedParam: "sweepSpeed" }) }),
    cost: "light",
    origin: "element",
    webgpu: "translate",
    thumbnail: new URL("./thumb.webp?no-inline", import.meta.url).href,
});
