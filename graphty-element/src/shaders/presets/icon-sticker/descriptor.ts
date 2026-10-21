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

import type { ShaderDescriptor, ShaderParamChoice } from "../../../catalog/shaders";

/**
 * The twelve icons, as `iconSdf` draws them: 0 to 5 filled, 6 to 11 the same as outlines.
 * Each row: the value, its name, and its picture's SVG path data in a 24 x 24 box (filled, or
 * stroked when the fourth entry is true).
 */
const ICONS: readonly ShaderParamChoice[] = Object.freeze(
    (
        [
            [
                0,
                "Person",
                "M8.6 8a3.4 3.4 0 1 0 6.8 0a3.4 3.4 0 1 0 -6.8 0ZM8.8 14h6.4a3.2 3.2 0 0 1 3.2 3.2v1.6a3.2 3.2 0 0 1-3.2 3.2h-6.4a3.2 3.2 0 0 1-3.2-3.2v-1.6a3.2 3.2 0 0 1 3.2-3.2Z",
            ],
            [
                1,
                "Gear",
                "M19.8 12L19.8 11.2L18.5 10.7L17.2 10.4L17 9.9L16.8 9.5L17.5 8.3L18 7.1L17.5 6.5L16.9 6L15.7 6.5L14.5 7.2L14.1 7L13.6 6.8L13.3 5.5L12.8 4.2L12 4.2L11.2 4.2L10.7 5.5L10.4 6.8L9.9 7L9.5 7.2L8.3 6.5L7.1 6L6.5 6.5L6 7.1L6.5 8.3L7.2 9.5L7 9.9L6.8 10.4L5.5 10.7L4.2 11.2L4.2 12L4.2 12.8L5.5 13.3L6.8 13.6L7 14.1L7.2 14.5L6.5 15.7L6 16.9L6.5 17.5L7.1 18L8.3 17.5L9.5 16.8L9.9 17L10.4 17.2L10.7 18.5L11.2 19.8L12 19.8L12.8 19.8L13.3 18.5L13.6 17.2L14.1 17L14.5 16.8L15.7 17.5L16.9 18L17.5 17.5L18 16.9L17.5 15.7L16.8 14.5L17 14.1L17.2 13.6L18.5 13.3L19.8 12.8ZM9.6 12a2.4 2.4 0 1 0 4.8 0a2.4 2.4 0 1 0 -4.8 0Z",
            ],
            [
                2,
                "Heart",
                "M12 19.5C9 17.2 4.2 13.6 4.2 9.8A3.9 3.9 0 0 1 12 8.4A3.9 3.9 0 0 1 19.8 9.8C19.8 13.6 15 17.2 12 19.5Z",
            ],
            [3, "Bolt", "M15.5 2L6.5 13H11.5L8.5 22L17.5 10.5H12.5Z"],
            [
                4,
                "Document",
                "M7.6 4.8h8.8a1 1 0 0 1 1 1v12.4a1 1 0 0 1-1 1h-8.8a1 1 0 0 1-1-1V5.8a1 1 0 0 1 1-1ZM8.8 8.7h6.4v1h-6.4ZM8.8 11.1h6.4v1h-6.4ZM8.8 13.5h4.8v1h-4.8Z",
            ],
            [
                5,
                "Planet",
                "M7 12a5 5 0 1 0 10 0a5 5 0 1 0 -10 0ZM2.6 16.5A10.4 3.4 -25.8 1 0 21.4 7.5A10.4 3.4 -25.8 1 0 2.6 16.5ZM4.3 15.7A8.6 2 -25.8 1 0 19.7 8.3A8.6 2 -25.8 1 0 4.3 15.7Z",
            ],
            [
                6,
                "Person outline",
                "M8.6 8a3.4 3.4 0 1 0 6.8 0a3.4 3.4 0 1 0 -6.8 0ZM8.8 14h6.4a3.2 3.2 0 0 1 3.2 3.2v1.6a3.2 3.2 0 0 1-3.2 3.2h-6.4a3.2 3.2 0 0 1-3.2-3.2v-1.6a3.2 3.2 0 0 1 3.2-3.2Z",
                true,
            ],
            [
                7,
                "Gear outline",
                "M19.8 12L19.8 11.2L18.5 10.7L17.2 10.4L17 9.9L16.8 9.5L17.5 8.3L18 7.1L17.5 6.5L16.9 6L15.7 6.5L14.5 7.2L14.1 7L13.6 6.8L13.3 5.5L12.8 4.2L12 4.2L11.2 4.2L10.7 5.5L10.4 6.8L9.9 7L9.5 7.2L8.3 6.5L7.1 6L6.5 6.5L6 7.1L6.5 8.3L7.2 9.5L7 9.9L6.8 10.4L5.5 10.7L4.2 11.2L4.2 12L4.2 12.8L5.5 13.3L6.8 13.6L7 14.1L7.2 14.5L6.5 15.7L6 16.9L6.5 17.5L7.1 18L8.3 17.5L9.5 16.8L9.9 17L10.4 17.2L10.7 18.5L11.2 19.8L12 19.8L12.8 19.8L13.3 18.5L13.6 17.2L14.1 17L14.5 16.8L15.7 17.5L16.9 18L17.5 17.5L18 16.9L17.5 15.7L16.8 14.5L17 14.1L17.2 13.6L18.5 13.3L19.8 12.8ZM9.6 12a2.4 2.4 0 1 0 4.8 0a2.4 2.4 0 1 0 -4.8 0Z",
                true,
            ],
            [
                8,
                "Heart outline",
                "M12 19.5C9 17.2 4.2 13.6 4.2 9.8A3.9 3.9 0 0 1 12 8.4A3.9 3.9 0 0 1 19.8 9.8C19.8 13.6 15 17.2 12 19.5Z",
                true,
            ],
            [9, "Bolt outline", "M15.5 2L6.5 13H11.5L8.5 22L17.5 10.5H12.5Z", true],
            [
                10,
                "Document outline",
                "M7.6 4.8h8.8a1 1 0 0 1 1 1v12.4a1 1 0 0 1-1 1h-8.8a1 1 0 0 1-1-1V5.8a1 1 0 0 1 1-1ZM9 9.2h6M9 11.6h6M9 14h3.6",
                true,
            ],
            [
                11,
                "Planet outline",
                "M7 12a5 5 0 1 0 10 0a5 5 0 1 0 -10 0ZM3.4 16.1A9.5 2.7 -25.8 1 0 20.6 7.9A9.5 2.7 -25.8 1 0 3.4 16.1Z",
                true,
            ],
        ] as const
    ).map(([value, plainName, path, outline]: readonly [number, string, string, boolean?]) =>
        Object.freeze({ value, plainName, glyph: Object.freeze(outline === true ? { path, outline } : { path }) }),
    ),
);

/** The catalog entry. */
export const DESCRIPTOR: ShaderDescriptor = Object.freeze({
    id: "icon-sticker",
    plainName: "Sticker",
    kind: "node-sprite",
    params: Object.freeze([
        Object.freeze({
            name: "icon",
            plainName: "Icon",
            type: "integer",
            default: 0,
            min: 0,
            max: 11,
            varies: true,
            choices: ICONS,
        }),
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
    thumbnail: new URL("./thumb.webp?no-inline", import.meta.url).href,
});
