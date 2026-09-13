/**
 * The element-to-editor half of the rich-text style bridge.
 *
 * Two different shapes share the name `RichTextStyle`, and until this module existed only
 * one direction of the translation was written:
 *
 * - **graphty-element's** schema (`graphty-element/src/config/RichTextStyle.ts`) is FLAT
 *   and strict: `font` is a STRING, beside `fontSize`, `fontWeight`, `textColor`,
 *   `attachOffset`, `billboardMode`, `textOutline*`, `textShadow*`, `resolution` and
 *   `depthFadeEnabled`. It carries its own Zod defaults.
 * - **The app's editor model** (`src/types/style-layer.ts`) is NESTED: `font.family`,
 *   `font.size`, `font.weight`, `font.color`, plus `position`, `background`, `effects`,
 *   `animation` and `advanced` sub-objects.
 *
 * `convertRichTextStyle` in `components/Graphty.tsx` flattens editor -> element on the way
 * down. Nothing did the reverse, so `StyleLayerPropertiesPanel` read a layer straight off
 * `getStyleManager().getLayers()` -- element-shaped -- and cast it to the editor's nested
 * type. The cast compiled and then lied: reading `value.font.family` off a style whose
 * `font` is the string "Verdana" yields `undefined`, and off one with no `font` at all it
 * threw, which is how the missing direction was finally noticed.
 *
 * So the panel showed the editor's own defaults instead of the layer's real values, and
 * said nothing about it. This module is the missing direction, written as the exact
 * inverse of `convertRichTextStyle` so the pair can be checked against each other -- there
 * is a round-trip test beside it that does precisely that.
 *
 * Two mappings are not symmetric, and both are deliberate:
 *
 * 1. The element's `location` carries what the editor calls `position.attachPosition`,
 *    because that is what `convertRichTextStyle` writes into it through
 *    `ATTACH_POSITION_MAP`. The editor's own `location` field ("static" / "textPath") is
 *    never written down, so it is recovered here from whether the element's style carries
 *    a `textPath`.
 * 2. The element's `location` enum is wider than the editor's five attach positions
 *    ("top-left", "bottom-right", ...). A value with no editor equivalent falls back to
 *    "above" rather than being invented, and the corner positions are folded onto their
 *    vertical half, which is the closest thing the editor can draw.
 */

import type { RichTextStyle, TextAttachPosition } from "../types/style-layer";
import { DEFAULT_RICH_TEXT_STYLE } from "./style-defaults";

/**
 * The element's `location` values, mapped back onto the editor's attach positions.
 *
 * The inverse of `ATTACH_POSITION_MAP` in `Graphty.tsx`, widened to cover the corner
 * values the element's enum allows and the editor has no word for.
 */
const LOCATION_TO_ATTACH_POSITION: Readonly<Record<string, TextAttachPosition>> = {
    bottom: "below",
    "bottom-left": "below",
    "bottom-right": "below",
    center: "center",
    left: "left",
    right: "right",
    top: "above",
    "top-left": "above",
    "top-right": "above",
};

/**
 * Reads one string field off an element-shaped style.
 *
 * The input is whatever the style manager holds, which is why nothing here trusts a
 * declared type: a layer may come from a file, from an algorithm's suggested styles or
 * from the app itself, and only the first of those went through the element's parser.
 * @param source - the element-shaped style.
 * @param key - the field to read.
 * @returns the string, or undefined when it is absent or of another type.
 */
function readString(source: Record<string, unknown>, key: string): string | undefined {
    const value = source[key];

    return typeof value === "string" ? value : undefined;
}

/**
 * Reads one numeric field off an element-shaped style.
 * @param source - the element-shaped style.
 * @param key - the field to read.
 * @returns the number, or undefined when it is absent or of another type.
 */
function readNumber(source: Record<string, unknown>, key: string): number | undefined {
    const value = source[key];

    return typeof value === "number" ? value : undefined;
}

/**
 * Reads one boolean field off an element-shaped style.
 * @param source - the element-shaped style.
 * @param key - the field to read.
 * @returns the boolean, or undefined when it is absent or of another type.
 */
function readBoolean(source: Record<string, unknown>, key: string): boolean | undefined {
    const value = source[key];

    return typeof value === "boolean" ? value : undefined;
}

/**
 * Turns an element-shaped rich-text style into the editor's nested one.
 *
 * Every field the element did not set takes the editor's default, so the result is always
 * whole and the editors can read into it without guarding. A style that is absent
 * altogether returns the default unchanged.
 * @param source - the layer's `style.label` or `style.tooltip`, as the element holds it.
 * @returns the editor-shaped style.
 * @public
 */
export function elementToEditorRichTextStyle(source: unknown): RichTextStyle {
    if (source === null || typeof source !== "object") {
        return DEFAULT_RICH_TEXT_STYLE;
    }

    const flat = source as Record<string, unknown>;
    const fallback = DEFAULT_RICH_TEXT_STYLE;

    const location = readString(flat, "location");
    const textPath = readString(flat, "textPath");
    const billboardMode = readNumber(flat, "billboardMode");

    const backgroundColor = readString(flat, "backgroundColor");
    const outlineEnabled = readBoolean(flat, "textOutline");
    const shadowEnabled = readBoolean(flat, "textShadow");
    const resolution = readNumber(flat, "resolution");
    const depthFade = readBoolean(flat, "depthFadeEnabled");

    /* `fontWeight` is a STRING on the element ("normal", "bold", "400") and a NUMBER in
       the editor, which is the one place the two models disagree on a type rather than a
       shape. A numeric string converts; a word keeps the editor's default rather than
       becoming NaN, which would render as an empty weight box. */
    const rawWeight = readString(flat, "fontWeight");
    const parsedWeight = rawWeight === undefined ? Number.NaN : Number(rawWeight);

    return {
        enabled: readBoolean(flat, "enabled") ?? fallback.enabled,
        text: readString(flat, "text") ?? fallback.text,
        // The editor's own `location` is not written down; a textPath is what it means.
        location: textPath === undefined ? "static" : "textPath",
        font: {
            family: readString(flat, "font") ?? fallback.font.family,
            size: readNumber(flat, "fontSize") ?? fallback.font.size,
            weight: Number.isFinite(parsedWeight) ? parsedWeight : fallback.font.weight,
            color: readString(flat, "textColor") ?? fallback.font.color,
        },
        position: {
            attachPosition:
                location === undefined
                    ? fallback.position.attachPosition
                    : (LOCATION_TO_ATTACH_POSITION[location] ?? fallback.position.attachPosition),
            offset: readNumber(flat, "attachOffset") ?? fallback.position.offset,
            /* Any non-zero billboard mode is billboarding; `convertRichTextStyle` writes 7
               (BABYLON.Mesh.BILLBOARDMODE_ALL) for on and 0 for off, and a file may carry
               any of the other axis modes, all of which are still "on" to the editor. */
            billboard: billboardMode === undefined ? fallback.position.billboard : billboardMode !== 0,
        },
        /* The opt-in decorations stay ABSENT when the element did not set them. An empty
           object here would read as "a background exists with no settings", which is a
           different claim from "there is no background" -- and it is the claim the
           editor's own `?.` guards are written against. */
        ...(backgroundColor === undefined
            ? {}
            : {
                  background: {
                      enabled: true,
                      color: backgroundColor,
                      padding: readNumber(flat, "backgroundPadding") ?? 0,
                      borderRadius: readNumber(flat, "cornerRadius") ?? 0,
                  },
              }),
        ...(outlineEnabled !== true && shadowEnabled !== true
            ? {}
            : {
                  effects: {
                      ...(outlineEnabled !== true
                          ? {}
                          : {
                                outline: {
                                    enabled: true,
                                    color: readString(flat, "textOutlineColor") ?? "#000000",
                                    width: readNumber(flat, "textOutlineWidth") ?? 0,
                                },
                            }),
                      ...(shadowEnabled !== true
                          ? {}
                          : {
                                shadow: {
                                    enabled: true,
                                    color: readString(flat, "textShadowColor") ?? "#000000",
                                    blur: readNumber(flat, "textShadowBlur") ?? 0,
                                    /* The element carries no shadow offset, so the editor's
                                       two offset fields open at zero rather than at a
                                       number nothing measured. */
                                    offsetX: 0,
                                    offsetY: 0,
                                },
                            }),
                  },
              }),
        ...(resolution === undefined && depthFade === undefined
            ? {}
            : {
                  advanced: {
                      resolution: resolution ?? fallback.advanced?.resolution ?? 0,
                      depthFade: depthFade ?? fallback.advanced?.depthFade ?? false,
                  },
              }),
    };
}
