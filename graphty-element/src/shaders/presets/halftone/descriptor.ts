/**
 * @file The catalog entry of the `halftone` preset, Halftone (design/rendering/shader-styles.md
 * section 7.1): the dot screen. Catalog data only; the GLSL is in `./body.ts`.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import type { ShaderDescriptor, ShaderInput } from "../../../catalog/shaders";

/** The catalog entry. */
export const DESCRIPTOR: ShaderDescriptor = Object.freeze({
    id: "halftone",
    plainName: "Halftone",
    target: "node",
    place: "paint",
    categories: Object.freeze(["Drawn"]),
    params: Object.freeze([
        Object.freeze({
            name: "dotScale",
            plainName: "Dot size",
            type: "number",
            default: 5,
            min: 2,
            max: 12,
            primary: true,
        }),
        Object.freeze({ name: "inkColor", plainName: "Ink color", type: "color", default: "#1b1720" }),
        Object.freeze({ name: "paper", plainName: "Paper", type: "color", default: "#f3ead6" }),
        Object.freeze({ name: "lightAngle", plainName: "Light angle", type: "number", default: 0.12, min: 0, max: 1 }),
    ]),
    reads: Object.freeze<ShaderInput[]>(["color"]),
    motion: Object.freeze({}),
    cost: "medium",
    origin: "element",
    webgpu: "translate",
    // The picture is drawn at a dot size of 12 on a node about 85 px across (the Lit Surfaces story),
    // so a gallery tile shows about as many dots across the node as the default size of 5 shows on a
    // node of a drawn graph. At 5 the tile's dots are too fine to make out.
    thumbnail: new URL("./thumb.webp?no-inline", import.meta.url).href,
});
