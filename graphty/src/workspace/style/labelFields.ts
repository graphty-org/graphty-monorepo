/**
 * The fields the Label settings pop-over draws, in their groups: what each is called, what it takes
 * and which line it shares. LabelSettings draws them; the coverage test reads which fields they are.
 */

import { LABEL_STYLE_DESCRIPTORS } from "@graphty/graphty-element/catalog";
import type { LabelStyle } from "@graphty/graphty-element/schema";

/** A field of the label style as the popover draws it. */
export type Field =
    | { readonly key: keyof LabelStyle; readonly word: string; readonly kind: "color" }
    | {
          readonly key: keyof LabelStyle;
          readonly word: string;
          readonly kind: "number";
          readonly step?: number;
          /** A fraction from 0 to 1, shown and typed as a percent. */
          readonly percent?: boolean;
      }
    | {
          readonly key: keyof LabelStyle;
          readonly word: string;
          readonly kind: "select";
          readonly options: readonly (readonly [string, string])[];
      }
    | { readonly key: keyof LabelStyle; readonly word: string; readonly kind: "switch" }
    | { readonly key: keyof LabelStyle; readonly word: string; readonly kind: "text" }
    | { readonly key: keyof LabelStyle; readonly word: string; readonly kind: "colors" };

/** One line of a group: a field, or a pair of related values side by side (margins, an offset). */
type FieldLine = Field | readonly [Field, Field];

/** A captioned group of fields; the first group has no caption. */
interface FieldGroup {
    readonly caption?: string;
    readonly fields: readonly FieldLine[];
}

const color = (key: keyof LabelStyle, word: string): Field => ({ key, word, kind: "color" });
const number = (key: keyof LabelStyle, word: string, step?: number): Field => ({ key, word, kind: "number", step });
const percent = (key: keyof LabelStyle, word: string): Field => ({ key, word, kind: "number", percent: true });
const choice = (key: keyof LabelStyle, word: string, options: readonly (readonly [string, string])[]): Field => ({
    key,
    word,
    kind: "select",
    options,
});
const toggle = (key: keyof LabelStyle, word: string): Field => ({ key, word, kind: "switch" });
const words = (key: keyof LabelStyle, word: string): Field => ({ key, word, kind: "text" });
const colors = (key: keyof LabelStyle, word: string): Field => ({ key, word, kind: "colors" });

/** The font families offered: the browser's generic families, which every platform has. */
const FONTS = [
    ["sans-serif", "Sans serif"],
    ["serif", "Serif"],
    ["monospace", "Monospace"],
] as const;

const SIDES = [
    ["top", "Top"],
    ["bottom", "Bottom"],
    ["left", "Left"],
    ["right", "Right"],
    ["auto", "Automatic"],
] as const;

/** How runs of different sizes in one line meet, by the values graphty-element takes for it. */
const RUN_ALIGN_WORDS: Readonly<Record<string, string>> = {
    baseline: "Baselines",
    hanging: "Tops",
    middle: "Middles",
};

/**
 * A choice's options as graphty-element lists the field's values, each in its word.
 * @param key - the field.
 * @param wordsOf - each value's word; a value with none reads as itself.
 * @returns the options.
 */
function valuesOf(key: keyof LabelStyle, wordsOf: Readonly<Record<string, string>>): [string, string][] {
    const values = LABEL_STYLE_DESCRIPTORS.find((d) => d.field === key)?.values ?? [];
    return values.map((value) => [value, wordsOf[value] ?? value]);
}

/** What a label's shift or gap is measured by: its whole box, or its words alone. */
const BOX_OR_WORDS = [
    ["box", "Box"],
    ["words", "Words"],
] as const;

/** What a label's box is sized to. */
const BOX_SIZES = [
    ["words", "Words"],
    ["words-at-side", "Words at side"],
    ["target-width", "Target width"],
] as const;

/** Which overlapping node label is kept first. */
const OVERLAP_ORDERS = [
    ["degree", "Most edges"],
    ["size", "Largest"],
] as const;

const BADGES = [
    ["notification", "Notification"],
    ["label", "Label"],
    ["label-success", "Success"],
    ["label-warning", "Warning"],
    ["label-danger", "Danger"],
    ["count", "Count"],
    ["icon", "Icon"],
    ["progress", "Progress"],
    ["dot", "Dot"],
] as const;

/**
 * Every field the popover shows, in its groups (design 2.3): text color and background first,
 * each with its opacity, then Type (with the text's size beside the unit it is in), Wrap, Box,
 * Letters, Placement, Visibility, Motion and distance, Badge. The position is on the entry itself.
 */
export const LABEL_SETTINGS: readonly FieldGroup[] = [
    {
        fields: [
            [color("color", "Text color"), percent("opacity", "Text opacity")],
            [color("background", "Background"), percent("backgroundOpacity", "Background opacity")],
        ],
    },
    {
        caption: "Type",
        fields: [
            choice("font", "Font", FONTS),
            [
                choice("weight", "Weight", [
                    ["normal", "Regular"],
                    ["bold", "Bold"],
                ]),
                toggle("italic", "Italic"),
            ],
            [
                choice("textAlign", "Alignment", [
                    ["left", "Left"],
                    ["center", "Center"],
                    ["right", "Right"],
                ]),
                choice("runAlign", "Line alignment", valuesOf("runAlign", RUN_ALIGN_WORDS)),
            ],
            // The size beside the unit it is measured in: a unit with no number beside it names nothing.
            [
                number("sizePx", "Size"),
                choice("sizeMode", "Size in", [
                    ["screen", "Screen pixels"],
                    ["world", "Scene units"],
                ]),
            ],
            [number("letterSize", "Letter size"), number("rotation", "Rotation")],
            number("lineHeight", "Line height", 0.1),
        ],
    },
    {
        caption: "Wrap",
        fields: [
            [number("wrapWidth", "Wrap width"), number("maxLines", "Max lines")],
            [toggle("wrapEllipsis", "Ellipsis"), toggle("wrapAnywhere", "Wrap anywhere")],
            [toggle("wrapTrailingSpace", "Trailing space"), number("wrapSpaceCount", "Space count")],
            toggle("keepBlankLines", "Keep blank lines"),
        ],
    },
    {
        caption: "Box",
        fields: [
            [number("padding", "Padding"), number("cornerRadius", "Corners")],
            [number("boxPadding", "Box padding"), choice("box", "Box size", BOX_SIZES)],
            [number("borderWidth", "Border width"), color("borderColor", "Border color")],
            percent("borderOpacity", "Border opacity"),
            [toggle("panelShadow", "Panel shadow"), toggle("closeButton", "Close button")],
            [color("panelShadowColor", "Panel shadow color"), number("panelShadowBlur", "Panel shadow blur")],
            [number("panelShadowOffsetX", "Panel shadow right"), number("panelShadowOffsetY", "Panel shadow down")],
            [number("marginTop", "Margin above"), number("marginBottom", "Margin below")],
            [number("marginLeft", "Margin left"), number("marginRight", "Margin right")],
            toggle("gradient", "Gradient"),
            [
                choice("gradientType", "Gradient shape", [
                    ["linear", "Linear"],
                    ["radial", "Radial"],
                ]),
                choice("gradientDirection", "Gradient direction", [
                    ["vertical", "Vertical"],
                    ["horizontal", "Horizontal"],
                    ["diagonal", "Diagonal"],
                ]),
            ],
            colors("gradientColors", "Gradient colors"),
        ],
    },
    {
        caption: "Letters",
        fields: [
            [color("outline", "Outline"), number("outlineWidth", "Outline width")],
            percent("outlineOpacity", "Outline opacity"),
            [toggle("shadow", "Shadow"), color("shadowColor", "Shadow color")],
            number("shadowBlur", "Shadow blur"),
            [number("shadowOffsetX", "Shadow right"), number("shadowOffsetY", "Shadow down")],
        ],
    },
    {
        caption: "Placement",
        fields: [
            number("attachOffset", "Offset", 0.1),
            [number("offsetX", "Right"), number("offsetY", "Down")],
            [number("shiftX", "Shift right", 0.1), number("shiftY", "Shift down", 0.1)],
            [choice("shiftOf", "Shift of", BOX_OR_WORDS), choice("gapOf", "Gap of", BOX_OR_WORDS)],
            [toggle("pointer", "Pointer"), choice("pointerDirection", "Pointer side", SIDES)],
            [number("pointerWidth", "Pointer width"), number("pointerHeight", "Pointer length")],
            [number("pointerOffset", "Pointer offset"), toggle("pointerCurve", "Curved pointer")],
            toggle("onTop", "Draw over the graph"),
            toggle("keepInView", "Keep in view"),
            toggle("pickable", "Clicking picks the node"),
        ],
    },
    {
        caption: "Visibility",
        fields: [
            number("minScreenSize", "Smallest size on screen"),
            // Node labels only: graphty-element hides no edge label by these.
            choice("declutter", "Overlap order", OVERLAP_ORDERS),
            number("minNodeScreenSize", "Hide on nodes smaller than"),
        ],
    },
    {
        caption: "Motion and distance",
        fields: [
            choice("animation", "Animation", [
                ["none", "None"],
                ["pulse", "Pulse"],
                ["bounce", "Bounce"],
                ["shake", "Shake"],
                ["glow", "Glow"],
                ["fill", "Fill"],
            ]),
            number("animationSpeed", "Animation speed", 0.1),
            toggle("depthFade", "Fade with distance"),
            [number("depthFadeNear", "Full strength within"), number("depthFadeFar", "Gone beyond")],
        ],
    },
    {
        caption: "Badge",
        fields: [
            choice("badge", "Badge", BADGES),
            [
                words("icon", "Icon"),
                choice("iconPosition", "Icon side", [
                    ["left", "Left"],
                    ["right", "Right"],
                ]),
            ],
            number("progress", "Progress", 0.05),
            toggle("smartOverflow", "Shorten large numbers"),
            [number("maxNumber", "Largest number shown"), words("overflowSuffix", "After a shortened number")],
        ],
    },
];

/** Every field the popover draws, by name. */
export const LABEL_SETTINGS_FIELDS: readonly (keyof LabelStyle)[] = LABEL_SETTINGS.flatMap((group) =>
    group.fields.flat().map((field) => field.key),
);
