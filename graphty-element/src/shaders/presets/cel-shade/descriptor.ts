/**
 * @file The catalog entry of the `cel-shade` preset, Cel shade (design/rendering/shader-styles.md
 * section 7.1): bands and a still ink outline. Catalog data only; the GLSL is in `./body.ts`.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import type { ShaderDescriptor, ShaderInput } from "../../../catalog/shaders";

/** The catalog entry. */
export const DESCRIPTOR: ShaderDescriptor = Object.freeze({
    id: "cel-shade",
    plainName: "Cel shade",
    target: "node",
    place: "paint",
    categories: Object.freeze(["Drawn"]),
    params: Object.freeze([
        Object.freeze({
            name: "bands",
            plainName: "Bands",
            type: "integer",
            default: 3,
            min: 2,
            max: 6,
            step: 1,
            primary: true,
        }),
        Object.freeze({ name: "inkWidth", plainName: "Ink width", type: "number", default: 0.16, min: 0, max: 0.4 }),
        Object.freeze({ name: "inkColor", plainName: "Ink color", type: "color", default: "#1b1720" }),
        Object.freeze({ name: "lightAngle", plainName: "Light angle", type: "number", default: 0.12, min: 0, max: 1 }),
    ]),
    reads: Object.freeze<ShaderInput[]>(["color", "shape"]),
    motion: Object.freeze({}),
    cost: "medium",
    origin: "element",
    webgpu: "translate",
    thumbnail: new URL("./thumb.webp?no-inline", import.meta.url).href,
});
