import { CompactColorInput, StyleNumberInput, StyleSelect } from "@graphty/compact-mantine";
import { channelsFor, labelLook } from "@graphty/graphty-element/catalog";
import type { LabelStyle } from "@graphty/graphty-element/schema";
import { Stack, Text } from "@mantine/core";
import React from "react";

/** A field of the label style as the popover draws it. */
type Field =
    | { readonly key: keyof LabelStyle; readonly word: string; readonly kind: "color" }
    | { readonly key: keyof LabelStyle; readonly word: string; readonly kind: "number"; readonly step?: number }
    | {
          readonly key: keyof LabelStyle;
          readonly word: string;
          readonly kind: "select";
          readonly options: readonly (readonly [string, string])[];
      }
    | { readonly key: keyof LabelStyle; readonly word: string; readonly kind: "switch" };

/** A captioned group of fields; the first group has no caption. */
interface FieldGroup {
    readonly caption?: string;
    readonly fields: readonly Field[];
}

const color = (key: keyof LabelStyle, word: string): Field => ({ key, word, kind: "color" });
const number = (key: keyof LabelStyle, word: string, step?: number): Field => ({ key, word, kind: "number", step });
const choice = (key: keyof LabelStyle, word: string, options: readonly (readonly [string, string])[]): Field => ({
    key,
    word,
    kind: "select",
    options,
});
const toggle = (key: keyof LabelStyle, word: string): Field => ({ key, word, kind: "switch" });

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
 * then Type, Box, Letters, Placement, Motion and distance, Badge. The size and the position are on
 * the entry itself. ponytail: the gradient's colors, the icon glyph and the overflow suffix have no
 * field yet (a list of colors and two free texts); add them with a gradient editor and a text row.
 */
const LABEL_SETTINGS: readonly FieldGroup[] = [
    { fields: [color("color", "Text color"), color("background", "Background")] },
    {
        caption: "Type",
        fields: [
            choice("font", "Font", FONTS),
            choice("weight", "Weight", [
                ["normal", "Regular"],
                ["bold", "Bold"],
            ]),
            number("lineHeight", "Line height", 0.1),
            choice("textAlign", "Alignment", [
                ["left", "Left"],
                ["center", "Center"],
                ["right", "Right"],
            ]),
        ],
    },
    {
        caption: "Box",
        fields: [
            number("padding", "Padding"),
            number("cornerRadius", "Corners"),
            number("borderWidth", "Border width"),
            color("borderColor", "Border color"),
            number("marginTop", "Margin above"),
            number("marginBottom", "Margin below"),
            number("marginLeft", "Margin left"),
            number("marginRight", "Margin right"),
            toggle("gradient", "Gradient"),
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
    },
    {
        caption: "Letters",
        fields: [
            color("outline", "Outline"),
            number("outlineWidth", "Outline width"),
            toggle("shadow", "Shadow"),
            color("shadowColor", "Shadow color"),
            number("shadowBlur", "Shadow blur"),
            number("shadowOffsetX", "Shadow right"),
            number("shadowOffsetY", "Shadow down"),
        ],
    },
    {
        caption: "Placement",
        fields: [
            number("attachOffset", "Offset", 0.1),
            toggle("pointer", "Pointer"),
            choice("pointerDirection", "Pointer side", SIDES),
            number("pointerWidth", "Pointer width"),
            number("pointerHeight", "Pointer length"),
            number("pointerOffset", "Pointer offset"),
            toggle("pointerCurve", "Curved pointer"),
            toggle("onTop", "Draw over the graph"),
            toggle("pickable", "Clicking picks the node"),
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
            number("depthFadeNear", "Full strength within"),
            number("depthFadeFar", "Gone beyond"),
        ],
    },
    {
        caption: "Badge",
        fields: [
            choice("badge", "Badge", BADGES),
            choice("iconPosition", "Icon side", [
                ["left", "Left"],
                ["right", "Right"],
            ]),
            number("progress", "Progress", 0.05),
            toggle("smartOverflow", "Shorten large numbers"),
            number("maxNumber", "Largest number shown"),
        ],
    },
];

/**
 * What a color field shows while neither the layer nor the look sets it: for the text, the
 * element's own label text color; for a background, border or shadow, white as a neutral swatch.
 */
const UNSET_COLOR = "#FFFFFF";
const labelColor = channelsFor("node").find((d) => d.channel === "node.labelColor")?.default;
const TEXT_COLOR = typeof labelColor === "string" ? labelColor.toUpperCase() : UNSET_COLOR;

/**
 * A color field's placeholder while neither the layer nor its look sets it.
 * @param key - the field.
 * @returns the color.
 */
function unsetColor(key: keyof LabelStyle): string {
    return key === "color" ? TEXT_COLOR : UNSET_COLOR;
}

/** The value a select stores for "not set and the look sets nothing": the field's own default. */
const DEFAULT = "";

/**
 * A field's value as a select stores it.
 * @param value - the value, if any.
 * @returns the text, or undefined for no value.
 */
function wordOf(value: unknown): string | undefined {
    return typeof value === "string" || typeof value === "number" || typeof value === "boolean"
        ? String(value)
        : undefined;
}

/** Props for LabelSettings. */
interface LabelSettingsProps {
    /** What the entry's layer writes for the label's style. */
    style: LabelStyle;
    /** Called with the fields to change; a field given as undefined is cleared back to the look. */
    onChange: (patch: Partial<LabelStyle>) => void;
}

/**
 * The Label settings popover's body (design 2.3): captioned groups, no tabs. The look is what lies
 * beneath: a field this layer does not write shows the look's value as its placeholder, and a
 * field it writes has its reset, which clears it back to the look's value. The fields are
 * compact-mantine's set-or-inherited controls, so "written here" and "from the look" look the same
 * as everywhere else those controls are used.
 * @param props - Component props
 * @param props.style - the label style the layer writes
 * @param props.onChange - called with the fields to change
 * @returns The groups
 */
export function LabelSettings({ style, onChange }: Readonly<LabelSettingsProps>): React.JSX.Element {
    const look: Readonly<Partial<Record<keyof LabelStyle, unknown>>> = labelLook(style.look ?? "default")?.style ?? {};
    return (
        <Stack gap={12} data-testid="label-settings">
            {LABEL_SETTINGS.map((group) => (
                <Stack key={group.caption ?? "colors"} gap={4} role="group" aria-label={group.caption ?? "Colors"}>
                    {group.caption === undefined ? null : (
                        <Text size="xs" fw={600}>
                            {group.caption}
                        </Text>
                    )}
                    {group.fields.map((field) => (
                        <FieldControl
                            key={field.key}
                            field={field}
                            value={style[field.key]}
                            look={look[field.key]}
                            onChange={(value) => {
                                onChange({ [field.key]: value });
                            }}
                        />
                    ))}
                </Stack>
            ))}
        </Stack>
    );
}

/**
 * One field: written here, or showing the look's value.
 * @param props - Component props
 * @param props.field - the field
 * @param props.value - what the layer writes, if anything
 * @param props.look - the look's value, if it sets one
 * @param props.onChange - called with the new value, or undefined to clear it
 * @returns The control
 */
function FieldControl({
    field,
    value,
    look,
    onChange,
}: Readonly<{ field: Field; value: unknown; look: unknown; onChange: (value: unknown) => void }>): React.JSX.Element {
    switch (field.kind) {
        case "color":
            return (
                <CompactColorInput
                    label={field.word}
                    width="100%"
                    color={typeof value === "string" ? value.slice(0, 7).toUpperCase() : undefined}
                    defaultColor={typeof look === "string" ? look.slice(0, 7).toUpperCase() : unsetColor(field.key)}
                    showOpacity={false}
                    onChangeEnd={(next) => {
                        onChange(next);
                    }}
                />
            );
        case "number":
            return (
                <StyleNumberInput
                    label={field.word}
                    value={typeof value === "number" ? value : undefined}
                    defaultValue={typeof look === "number" ? look : 0}
                    emptyText={typeof look === "number" ? undefined : "Default"}
                    step={field.step}
                    onChange={(next) => {
                        onChange(next);
                    }}
                />
            );
        default: {
            const options: readonly (readonly [string, string])[] =
                field.kind === "switch"
                    ? [
                          ["true", "On"],
                          ["false", "Off"],
                      ]
                    : field.options;
            // A field the look leaves alone reads "Default": the element's own value.
            const all = look === undefined ? [[DEFAULT, "Default"] as const, ...options] : options;
            // A value written some other way (a font family list, a weight of 600) is still shown.
            const shown = [
                ...new Set(
                    [value, look].flatMap((v) => (typeof v === "string" || typeof v === "number" ? [String(v)] : [])),
                ),
            ]
                .filter((v) => !all.some(([o]) => o === v))
                .map((v) => [v, v] as const);
            return (
                <StyleSelect
                    label={field.word}
                    value={wordOf(value)}
                    defaultValue={wordOf(look) ?? DEFAULT}
                    options={[...all, ...shown].map(([v, label]) => ({ value: v, label }))}
                    onChange={(next) => {
                        if (next === undefined || next === DEFAULT) {
                            onChange(undefined);
                        } else if (field.kind === "switch") {
                            onChange(next === "true");
                        } else {
                            onChange(next);
                        }
                    }}
                />
            );
        }
    }
}
