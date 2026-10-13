import {
    type ColorStop,
    CompactColorInput,
    GradientEditor,
    StyleNumberInput,
    StyleSelect,
} from "@graphty/compact-mantine";
import { channelsFor, labelLook } from "@graphty/graphty-element/catalog";
import type { LabelStyle } from "@graphty/graphty-element/schema";
import { Group, Stack, Text, TextInput } from "@mantine/core";
import React, { useId } from "react";

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
    | { readonly key: keyof LabelStyle; readonly word: string; readonly kind: "switch" }
    | { readonly key: keyof LabelStyle; readonly word: string; readonly kind: "text" }
    | { readonly key: keyof LabelStyle; readonly word: string; readonly kind: "colors" };

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
 * the entry itself.
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
            colors("gradientColors", "Gradient colors"),
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
            words("icon", "Icon"),
            choice("iconPosition", "Icon side", [
                ["left", "Left"],
                ["right", "Right"],
            ]),
            number("progress", "Progress", 0.05),
            toggle("smartOverflow", "Shorten large numbers"),
            number("maxNumber", "Largest number shown"),
            words("overflowSuffix", "After a shortened number"),
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
    /**
     * A field that can also vary by a value through a channel of its own (the text color, the
     * background): the channel's own field in its place while the channel is written, else the
     * vary glyph beside the style's field.
     */
    vary?: (key: keyof LabelStyle) => VaryField | undefined;
}

/** How a field varies: the channel's field in place of the style's, or the vary glyph beside it. */
export interface VaryField {
    readonly field?: React.ReactNode;
    readonly slot?: React.ReactNode;
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
 * @param props.vary - how the text color and background vary by a value
 * @returns The groups
 */
export function LabelSettings({ style, onChange, vary }: Readonly<LabelSettingsProps>): React.JSX.Element {
    const look: Readonly<Partial<Record<keyof LabelStyle, unknown>>> = labelLook(style.look ?? "default")?.style ?? {};
    return (
        <Stack gap={12} data-testid="label-settings">
            {LABEL_SETTINGS.map((group) => (
                <FieldGroupView key={group.caption ?? "colors"} caption={group.caption}>
                    {group.fields.map((field) => {
                        const varied = vary?.(field.key);
                        if (varied?.field !== undefined) {
                            return <React.Fragment key={field.key}>{varied.field}</React.Fragment>;
                        }
                        const control = (
                            <FieldControl
                                key={field.key}
                                field={field}
                                value={style[field.key]}
                                look={look[field.key]}
                                onChange={(value) => {
                                    onChange({ [field.key]: value });
                                }}
                            />
                        );
                        return varied?.slot === undefined ? (
                            control
                        ) : (
                            <Group key={field.key} gap={0} wrap="nowrap" align="flex-end">
                                <div style={{ flex: 1, minWidth: 0 }}>{control}</div>
                                {varied.slot}
                            </Group>
                        );
                    })}
                </FieldGroupView>
            ))}
        </Stack>
    );
}

/**
 * A group of fields under its caption, a heading the group is named by; the first group (the two
 * colors) has no caption and is named "Colors".
 * @param props - Component props
 * @param props.caption - the caption, if any
 * @param props.children - the fields
 * @returns The group
 */
function FieldGroupView({
    caption,
    children,
}: Readonly<{ caption: string | undefined; children: React.ReactNode }>): React.JSX.Element {
    const id = useId();
    return (
        <Stack
            gap={4}
            role="group"
            aria-label={caption === undefined ? "Colors" : undefined}
            aria-labelledby={caption === undefined ? undefined : id}
        >
            {caption === undefined ? null : (
                <Text id={id} component="h4" size="xs" fw={600} m={0}>
                    {caption}
                </Text>
            )}
            {children}
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
        case "text":
            return (
                <TextInput
                    // Keyed by the value, so Undo, Redo or another edit shows the new text.
                    key={typeof value === "string" ? value : ""}
                    size="xs"
                    label={field.word}
                    placeholder={typeof look === "string" ? look : "Default"}
                    defaultValue={typeof value === "string" ? value : ""}
                    onBlur={(event) => {
                        const next = event.currentTarget.value;
                        if (next !== (typeof value === "string" ? value : "")) {
                            onChange(next === "" ? undefined : next);
                        }
                    }}
                    onKeyDown={(event) => {
                        if (event.key === "Enter") {
                            event.currentTarget.blur();
                        }
                    }}
                />
            );
        case "colors":
            return <ColorsField word={field.word} value={value} look={look} onChange={onChange} />;
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

/** The gradient a label draws while neither the layer nor its look names colors. */
const UNSET_GRADIENT = ["#FFFFFF", "#000000"];

/**
 * A list of colors (a label's gradient) as the shared gradient editor: one stop per color,
 * evenly spaced, since the label's gradient has no positions. A change writes the colors in stop
 * order; a change of position alone writes nothing.
 * @param props - Component props
 * @param props.word - the field's name
 * @param props.value - the colors the layer writes, if any
 * @param props.look - the look's colors, if it names any
 * @param props.onChange - called with the new colors
 * @returns The field
 */
function ColorsField({
    word,
    value,
    look,
    onChange,
}: Readonly<{ word: string; value: unknown; look: unknown; onChange: (value: unknown) => void }>): React.JSX.Element {
    const list = (v: unknown): string[] | undefined =>
        Array.isArray(v) && v.every((c) => typeof c === "string") ? v : undefined;
    const shown = list(value) ?? list(look) ?? UNSET_GRADIENT;
    const stops: ColorStop[] = shown.map((color, i) => ({
        id: `stop-${String(i)}`,
        offset: shown.length === 1 ? 0 : i / (shown.length - 1),
        color,
    }));
    return (
        <div role="group" aria-label={word} data-set={list(value) === undefined ? undefined : ""}>
            <Text size="xs" component="div" aria-hidden>
                {word}
            </Text>
            <GradientEditor
                // Keyed by the colors, so Undo or another edit redraws the stops.
                key={shown.join(",")}
                defaultStops={stops}
                showDirection={false}
                onChange={(next) => {
                    const ordered = [...next].sort((a, b) => a.offset - b.offset).map((stop) => stop.color);
                    if (ordered.join(",") !== shown.join(",")) {
                        onChange(ordered);
                    }
                }}
            />
        </div>
    );
}
