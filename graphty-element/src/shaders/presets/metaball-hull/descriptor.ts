/**
 * @file The catalog entry of the `metaball-hull` preset, Hull (design/rendering/shader-styles.md
 * section 7.5): a group outline of form `"field"`, a gooey hull around each group of a layer's
 * nodes, drawn as translucent goo, an iridescent membrane or a clean outline. Catalog data only;
 * the GLSL is in `./body.ts`.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import type { ShaderDescriptor, ShaderInput, ShaderParamDescriptor } from "../../../catalog/shaders";

/** The catalog entry. */
export const DESCRIPTOR: ShaderDescriptor = Object.freeze({
    id: "metaball-hull",
    plainName: "Hull",
    target: "group",
    place: "group",
    categories: Object.freeze(["Blob"]),
    form: "field",
    // Each member's kernel radius, in member radii, is the blob radius.
    reachParam: "blobRadius",
    params: Object.freeze<ShaderParamDescriptor[]>([
        Object.freeze({
            name: "look",
            plainName: "Look",
            type: "enum",
            default: "goo",
            values: Object.freeze([
                Object.freeze({ value: "goo", label: "Goo" }),
                Object.freeze({ value: "membrane", label: "Membrane" }),
                Object.freeze({ value: "outline", label: "Outline" }),
            ]),
            primary: true,
        }),
        Object.freeze({ name: "blobRadius", plainName: "Blob radius", type: "number", default: 7, min: 2, max: 25 }),
        Object.freeze({ name: "threshold", plainName: "Threshold", type: "number", default: 0.5, min: 0.05, max: 1.5 }),
        Object.freeze({ name: "breathe", plainName: "Breathe", type: "number", default: 0, min: 0, max: 1 }),
        Object.freeze({
            name: "fillOpacity",
            plainName: "Fill opacity",
            type: "number",
            default: 0.55,
            min: 0,
            max: 1,
        }),
        Object.freeze({ name: "outline", plainName: "Outline width", type: "number", default: 2.5, min: 0, max: 8 }),
    ]),
    reads: Object.freeze<ShaderInput[]>(["color", "members"]),
    motion: Object.freeze({ loop: Object.freeze({ speedParam: "breathe" }) }),
    cost: "medium",
    origin: "element",
    webgpu: "translate",
    thumbnail: new URL("./thumb.webp?no-inline", import.meta.url).href,
});
