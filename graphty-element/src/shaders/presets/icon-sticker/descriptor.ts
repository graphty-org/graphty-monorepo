/**
 * @file The catalog entry of the `icon-sticker` preset, Sticker (design/rendering/shader-styles.md
 * section 7.2): a die-cut vinyl sticker in the node's color, with one of twelve icons and an
 * optional shiny or holographic finish. A sprite: it is drawn in place of the node's shape.
 * Catalog data only; the GLSL is in `./body.ts`.
 *
 * Bind `icon` per node with the `"index"` scale
 * (`encode: { "node.shaderParams.icon-sticker.icon": { by: "data.group", scale: "index" } }`):
 * each group takes the next icon in the order it is first seen and keeps it when new groups
 * arrive. Icons 6 to 11 are the first six drawn as outlines.
 *
 * ponytail: motion is a loop on `finishSpeed` whatever the finish, because a motion cannot depend
 * on a parameter's value; with `finish: "none"` the loop draws the same picture every frame. Set
 * `finishSpeed` to 0 to rest it, or teach `ShaderMotion` a per-choice loop if that cost shows.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import type { ShaderDescriptor } from "../../../catalog/shaders";

/** The catalog entry. */
export const DESCRIPTOR: ShaderDescriptor = Object.freeze({
    id: "icon-sticker",
    plainName: "Sticker",
    kind: "node-sprite",
    params: Object.freeze([
        Object.freeze({ name: "icon", plainName: "Icon", type: "integer", default: 0, min: 0, max: 11, varies: true }),
        Object.freeze({
            name: "finish",
            plainName: "Finish",
            type: "enum",
            default: "none",
            values: Object.freeze([
                Object.freeze({ value: "none", label: "None" }),
                Object.freeze({ value: "shiny", label: "Shiny" }),
                Object.freeze({ value: "holographic", label: "Holographic" }),
            ]),
            primary: true,
        }),
        Object.freeze({ name: "finishSpeed", plainName: "Finish speed", type: "number", default: 0.5, min: 0, max: 2 }),
        Object.freeze({ name: "foil", plainName: "Foil", type: "number", default: 0.85, min: 0, max: 1 }),
        Object.freeze({ name: "borderColor", plainName: "Border color", type: "color", default: "#fbfaf6" }),
    ]),
    reads: Object.freeze(["color"] as const),
    motion: Object.freeze({ loop: Object.freeze({ speedParam: "finishSpeed" }) }),
    cost: "light",
    origin: "element",
    webgpu: "translate",
    thumbnail: new URL("./thumb.webp", import.meta.url).href,
});
