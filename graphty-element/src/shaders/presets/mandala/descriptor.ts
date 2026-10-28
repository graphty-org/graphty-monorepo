/**
 * @file The catalog entry of the `mandala` preset, Mandala (design/rendering/shader-styles.md
 * section 7.2): a turning kaleidoscope mandala in place of the node's shape, with petals, fbm
 * filigree and a gold rim. A sprite; it takes its colors from its own palette, so a fill color
 * beneath it is covered. Catalog data only; the GLSL is in `./body.ts`.
 *
 * Bind `folds` (extra mirror folds) and `hueShift` per node to tell nodes apart:
 * `encode: { "node.shaders.mandala.folds": { by: "data.degree" } }`.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import type { ShaderDescriptor } from "../../../catalog/shaders";

/** The catalog entry. */
export const DESCRIPTOR: ShaderDescriptor = Object.freeze({
    id: "mandala",
    plainName: "Mandala",
    target: "node",
    place: "replace",
    categories: Object.freeze(["Card"]),
    params: Object.freeze([
        Object.freeze({
            name: "folds",
            plainName: "Folds",
            type: "integer",
            default: 0,
            min: 0,
            max: 12,
            varies: true,
        }),
        Object.freeze({
            name: "hueShift",
            plainName: "Hue shift",
            type: "number",
            default: 0,
            min: 0,
            max: 1,
            varies: true,
        }),
        Object.freeze({
            name: "detail",
            plainName: "Detail",
            type: "number",
            default: 5,
            min: 1,
            max: 12,
            primary: true,
        }),
        Object.freeze({ name: "spin", plainName: "Spin", type: "number", default: 0.25, min: -2, max: 2 }),
        Object.freeze({ name: "flow", plainName: "Flow", type: "number", default: 0.3, min: 0, max: 2 }),
        Object.freeze({ name: "rim", plainName: "Rim", type: "number", default: 1, min: 0, max: 1 }),
    ]),
    reads: Object.freeze(["size"] as const),
    motion: Object.freeze({ loop: Object.freeze({ speedParam: "spin" }) }),
    cost: "medium",
    origin: "element",
    webgpu: "translate",
    thumbnail: new URL("./thumb.webp?no-inline", import.meta.url).href,
});
