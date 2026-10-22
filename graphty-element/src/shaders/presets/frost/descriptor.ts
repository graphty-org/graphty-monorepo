/**
 * @file The catalog entry of the `frost` preset, Frost (design/rendering/shader-styles.md
 * section 7.1): ice that grows in from the rim along crystal facets, and thaws back to a wet
 * sheen. Catalog data only; the GLSL is in `./body.ts`.
 *
 * Put it on a pinned-state layer (`selector: { match: "state", state: "pinned" }`): a node frosts
 * over in 2 s when it is pinned and thaws in 1 s when it is unpinned. A node already pinned when
 * the layer is added is shown frosted at rest.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import type { ShaderDescriptor, ShaderParamDescriptor } from "../../../catalog/shaders";

/** The catalog entry. */
export const DESCRIPTOR: ShaderDescriptor = Object.freeze({
    id: "frost",
    plainName: "Frost",
    target: "node",
    place: "paint",
    categories: Object.freeze(["Glass"]),
    params: Object.freeze([
        Object.freeze({
            name: "frostColor",
            plainName: "Frost color",
            type: "color",
            default: "#d8f2ff",
            primary: true,
        }),
        Object.freeze({
            name: "crystalScale",
            plainName: "Crystal scale",
            type: "number",
            default: 5,
            min: 3,
            max: 24,
        }),
        Object.freeze({ name: "sparkle", plainName: "Sparkle", type: "number", default: 0.8, min: 0, max: 1 }),
        // Seconds on the layer's clock, so the element plays it for exactly that long.
        Object.freeze<ShaderParamDescriptor>({
            name: "growTime",
            plainName: "Grow time",
            type: "number",
            default: Object.freeze({ by: "since.matched", domain: [0, 2], range: [0, 2] }),
        }),
        // Seconds on the layer's clock, so the element plays it for exactly that long.
        Object.freeze<ShaderParamDescriptor>({
            name: "thawTime",
            plainName: "Thaw time",
            type: "number",
            default: Object.freeze({ by: "since.unmatched", domain: [0, 1], range: [0, 1] }),
        }),
    ]),
    reads: Object.freeze(["color", "times", "light"] as const),
    motion: Object.freeze({}),
    cost: "medium",
    origin: "element",
    webgpu: "translate",
    thumbnail: new URL("./thumb.webp?no-inline", import.meta.url).href,
});
