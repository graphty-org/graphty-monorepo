/**
 * @file The catalog entry of the `matcap-ink` preset, Ink (design/rendering/shader-styles.md
 * section 7.1): dark ink rim, flat tones. Catalog data only; the GLSL is in `./body.ts`.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import type { ShaderDescriptor, ShaderInput } from "../../../catalog/shaders";

/** The catalog entry. */
export const DESCRIPTOR: ShaderDescriptor = Object.freeze({
    id: "matcap-ink",
    plainName: "Ink",
    target: "node",
    place: "paint",
    categories: Object.freeze(["Drawn"]),
    params: Object.freeze([
        Object.freeze({ name: "tint", plainName: "Tint", type: "number", default: 0.8, min: 0, max: 1, primary: true }),
    ]),
    reads: Object.freeze<ShaderInput[]>(["color", "light"]),
    motion: Object.freeze({}),
    cost: "light",
    origin: "element",
    webgpu: "translate",
    thumbnail: new URL("./thumb.webp?no-inline", import.meta.url).href,
});
