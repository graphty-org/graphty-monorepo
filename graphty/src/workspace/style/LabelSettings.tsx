import {
    type ColorStop,
    colorWord,
    CompactColorInput,
    GradientEditor,
    LabelsProvider,
    PanelField,
    ResetButton,
} from "@graphty/compact-mantine";
import {
    channelsFor,
    LABEL_STYLE_DEFAULTS,
    LABEL_STYLE_DESCRIPTORS,
    labelLook,
} from "@graphty/graphty-element/catalog";
import type { LabelStyle } from "@graphty/graphty-element/schema";
import { Group, SimpleGrid, Stack, Text, TextInput } from "@mantine/core";
import React, { useId } from "react";

import { type Field, LABEL_SETTINGS } from "./labelFields";

/**
 * What a field reads while this layer sets nothing: the value it shows is the one in force by
 * default, so "Size, default 48", never "not set, 48" (which says nothing is there).
 */
const DEFAULT_WORDS = {
    fieldNotSet: (beneath: string): string => (beneath === "" ? "not set" : `default ${beneath}`),
};

/** The smallest number each field takes, as graphty-element describes it. */
const MINIMUM: Readonly<Partial<Record<keyof LabelStyle, number>>> = Object.fromEntries(
    LABEL_STYLE_DESCRIPTORS.flatMap((d) => (d.min === undefined ? [] : [[d.field, d.min]])),
);

/** The text color nothing above sets: the element's own label text color, else the label default. */
const labelColor = channelsFor("node").find((d) => d.channel === "node.labelColor")?.default;
const TEXT_COLOR = typeof labelColor === "string" ? labelColor.toUpperCase() : undefined;

/** What a field with nothing beneath it reads: the label draws none of it. */
const NONE = "None";

/** The value a select stores for "not set, and nothing beneath sets it". */
const DEFAULT = "";

/**
 * What lies beneath a field: the layer's look, then what the layers beneath write, then the
 * element's own default (`LABEL_STYLE_DEFAULTS`). Undefined where the label draws none.
 * @param key - the field.
 * @param look - the look's fields.
 * @param beneath - what the layers beneath write.
 * @returns the value.
 */
function underneath(
    key: keyof LabelStyle,
    look: Readonly<Partial<Record<keyof LabelStyle, unknown>>>,
    beneath: Readonly<Partial<Record<keyof LabelStyle, unknown>>>,
): unknown {
    const defaults: Readonly<Partial<Record<keyof LabelStyle, unknown>>> = LABEL_STYLE_DEFAULTS;
    return look[key] ?? beneath[key] ?? (key === "color" ? TEXT_COLOR : undefined) ?? defaults[key];
}

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
    /** What the layers beneath write for the label's style, shown where this layer sets nothing. */
    beneath?: LabelStyle;
    /**
     * A field that can also vary by a value through a channel of its own (the text color, the
     * background, the letter size): the channel's own field in its place while the channel is
     * written, else the vary glyph beside the style's field.
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
 * @param props.vary - how a field varies by a value through a channel of its own
 * @param props.beneath - what the layers beneath write for the label's style
 * @returns The groups
 */
export function LabelSettings({
    style,
    onChange,
    vary,
    beneath = {},
}: Readonly<LabelSettingsProps>): React.JSX.Element {
    const look: Readonly<Partial<Record<keyof LabelStyle, unknown>>> = labelLook(style.look ?? "default")?.style ?? {};
    // The gradient's shape and colors show once a gradient is on: an unset gradient draws none.
    const gradientOn = (style.gradient ?? underneath("gradient", look, beneath)) === true;
    const hidden = (field: Field): boolean =>
        !gradientOn &&
        (field.key === "gradientType" || field.key === "gradientDirection" || field.key === "gradientColors");
    const draw = (field: Field): React.ReactNode => {
        const varied = vary?.(field.key);
        if (varied?.field !== undefined) {
            return <React.Fragment key={field.key}>{varied.field}</React.Fragment>;
        }
        // A size on screen is in pixels and says so; a size in the scene has no unit to write.
        const unit = style.sizeMode ?? underneath("sizeMode", look, beneath);
        const control = (
            <FieldControl
                key={field.key}
                field={field}
                suffix={field.key === "sizePx" && unit === "screen" ? " px" : undefined}
                value={style[field.key]}
                fallback={underneath(field.key, look, beneath)}
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
    };
    return (
        <LabelsProvider labels={DEFAULT_WORDS}>
            <Stack gap={12} data-testid="label-settings">
                {LABEL_SETTINGS.map((group) => (
                    <FieldGroupView key={group.caption ?? "colors"} caption={group.caption}>
                        {group.fields.map((line) => {
                            if (!Array.isArray(line)) {
                                const field = line as Field;
                                return hidden(field) ? null : draw(field);
                            }
                            const [a, b] = line as readonly [Field, Field];
                            if (hidden(a)) {
                                return null;
                            }
                            return (
                                <SimpleGrid key={`${a.key}-${b.key}`} cols={2} spacing={8}>
                                    {draw(a)}
                                    {draw(b)}
                                </SimpleGrid>
                            );
                        })}
                    </FieldGroupView>
                ))}
            </Stack>
        </LabelsProvider>
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
                <Text id={id} component="h3" size="xs" fw={600} m={0}>
                    {caption}
                </Text>
            )}
            {children}
        </Stack>
    );
}

/**
 * Writes a text field's words when they differ from its value; an empty field clears it.
 * @param next - the words in the field.
 * @param value - the value in force.
 * @param onChange - writes the value.
 */
function commitText(next: string, value: unknown, onChange: (value: unknown) => void): void {
    if (next !== (typeof value === "string" ? value : "")) {
        onChange(next === "" ? undefined : next);
    }
}

/** What every kind of field control takes. */
interface FieldControlProps {
    readonly value: unknown;
    readonly fallback: unknown;
    readonly suffix?: string;
    readonly onChange: (value: unknown) => void;
}

/**
 * One field: written here, or showing what lies beneath.
 * @param props - Component props
 * @param props.field - the field
 * @param props.value - what the layer writes, if anything
 * @param props.fallback - what lies beneath, if anything draws it
 * @param props.suffix - a number's unit, written after it
 * @param props.onChange - called with the new value, or undefined to clear it
 * @returns The control
 */
function FieldControl({
    field,
    value,
    fallback,
    suffix,
    onChange,
}: Readonly<FieldControlProps & { field: Field }>): React.JSX.Element {
    switch (field.kind) {
        case "text":
            return <TextFieldControl word={field.word} value={value} fallback={fallback} onChange={onChange} />;
        case "colors":
            return <ColorsField word={field.word} value={value} look={fallback} onChange={onChange} />;
        case "color":
            return <ColorFieldControl word={field.word} value={value} fallback={fallback} onChange={onChange} />;
        case "number":
            return (
                <NumberFieldControl
                    word={field.word}
                    step={field.step}
                    min={MINIMUM[field.key]}
                    value={value}
                    fallback={fallback}
                    suffix={suffix}
                    onChange={onChange}
                />
            );
        default:
            return <ChoiceFieldControl field={field} value={value} fallback={fallback} onChange={onChange} />;
    }
}

/**
 * A text field.
 * @param props - Component props
 * @param props.word - the field's name
 * @param props.value - what the layer writes, if anything
 * @param props.fallback - what lies beneath, if anything draws it
 * @param props.onChange - called with the new value, or undefined to clear it
 * @returns The control
 */
function TextFieldControl({
    word,
    value,
    fallback,
    onChange,
}: Readonly<FieldControlProps & { word: string }>): React.JSX.Element {
    const text = typeof value === "string" ? value : "";
    return (
        <TextInput
            // Keyed by the value, so Undo, Redo or another edit shows the new text.
            key={text}
            size="xs"
            variant="outlined"
            label={word}
            placeholder={typeof fallback === "string" ? fallback : NONE}
            defaultValue={text}
            // The not-set look every style field shares, while the box shows its placeholder.
            data-is-default={text === "" ? "true" : "false"}
            onBlur={(event) => {
                commitText(event.currentTarget.value, value, onChange);
            }}
            onKeyDown={(event) => {
                // Enter commits and keeps focus in the field (drawn again with the new
                // text, it takes focus back), never on the page.
                if (event.key === "Enter") {
                    commitText(event.currentTarget.value, value, onChange);
                }
            }}
        />
    );
}

/**
 * A color field.
 * @param props - Component props
 * @param props.word - the field's name
 * @param props.value - what the layer writes, if anything
 * @param props.fallback - what lies beneath, if anything draws it
 * @param props.onChange - called with the new value
 * @returns The control
 */
function ColorFieldControl({
    word,
    value,
    fallback,
    onChange,
}: Readonly<FieldControlProps & { word: string }>): React.JSX.Element {
    const written = typeof value === "string" ? value.slice(0, 7) : undefined;
    const beneath = typeof fallback === "string" ? fallback : undefined;
    return (
        <CompactColorInput
            label={word}
            width="100%"
            valueText={written === undefined ? undefined : colorWord(written)}
            color={written?.toUpperCase()}
            defaultColor={beneath === undefined ? "#FFFFFF" : beneath.slice(0, 7).toUpperCase()}
            emptyText={beneath === undefined ? NONE : undefined}
            // Nothing beneath sets it, so no color is drawn: the swatch is empty, as its name says.
            emptySwatch={beneath === undefined}
            showOpacity={false}
            onChangeEnd={(next) => {
                onChange(next);
            }}
        />
    );
}

/**
 * A number field: it shows the value set here, else the value beneath, else nothing.
 * @param props - Component props
 * @param props.word - the field's name
 * @param props.step - the field's step
 * @param props.min - the smallest number it takes, if it has one
 * @param props.value - what the layer writes, if anything
 * @param props.fallback - what lies beneath, if anything draws it
 * @param props.suffix - its unit, written after it
 * @param props.onChange - called with the new value, or undefined to clear it
 * @returns The control
 */
function NumberFieldControl({
    word,
    step,
    min,
    value,
    fallback,
    suffix,
    onChange,
}: Readonly<
    FieldControlProps & { word: string; step: number | undefined; min: number | undefined }
>): React.JSX.Element {
    const numberBeneath = typeof fallback === "number" ? fallback : null;
    const written = typeof value === "number";
    const shownNumber = written ? value : numberBeneath;
    return (
        <Captioned
            word={word}
            onReset={
                written
                    ? () => {
                          onChange(undefined);
                      }
                    : undefined
            }
        >
            <PanelField
                label={word}
                kind="number"
                width="fill"
                // Nothing set here: the value beneath shows in the field, or "None",
                // and the name reads it as the default it is: "Size, default 48".
                value={shownNumber}
                placeholder={shownNumber === null ? NONE : undefined}
                aria-label={
                    !written && numberBeneath !== null
                        ? `${word}, default ${String(numberBeneath)}${suffix ?? ""}`
                        : undefined
                }
                unit={suffix?.trim()}
                step={step}
                min={min}
                onChange={(next) => {
                    onChange(Number(next));
                }}
            />
        </Captioned>
    );
}

/** On and Off, a switch's choices. */
const SWITCH_OPTIONS: readonly (readonly [string, string])[] = [
    ["true", "On"],
    ["false", "Off"],
];

/**
 * A choice's options: its own, "None" first where nothing beneath sets it (the label draws none of
 * it), and a value written some other way (a font family list, a weight of 600) is still shown.
 * @param options - the field's own options.
 * @param value - what the layer writes, if anything.
 * @param fallback - what lies beneath, if anything draws it.
 * @returns the select's data.
 */
function choiceData(
    options: readonly (readonly [string, string])[],
    value: unknown,
    fallback: unknown,
): { value: string; label: string }[] {
    const all = fallback === undefined ? [[DEFAULT, NONE] as const, ...options] : options;
    const shown = [
        ...new Set(
            [value, fallback].flatMap((v) => (typeof v === "string" || typeof v === "number" ? [String(v)] : [])),
        ),
    ]
        .filter((v) => !all.some(([o]) => o === v))
        .map((v) => [v, v] as const);
    return [...all, ...shown].map(([v, label]) => ({ value: v, label }));
}

/**
 * A choice, or a switch read as On and Off.
 * @param props - Component props
 * @param props.field - the field
 * @param props.value - what the layer writes, if anything
 * @param props.fallback - what lies beneath, if anything draws it
 * @param props.onChange - called with the new value, or undefined to clear it
 * @returns The control
 */
function ChoiceFieldControl({
    field,
    value,
    fallback,
    onChange,
}: Readonly<FieldControlProps & { field: Extract<Field, { kind: "select" | "switch" }> }>): React.JSX.Element {
    const isSwitch = field.kind === "switch";
    const data = choiceData(isSwitch ? SWITCH_OPTIONS : field.options, value, fallback);
    const written = wordOf(value);
    const beneathWord = data.find((option) => option.value === (wordOf(fallback) ?? DEFAULT))?.label ?? "";
    return (
        <Captioned
            word={field.word}
            onReset={
                written === undefined
                    ? undefined
                    : () => {
                          onChange(undefined);
                      }
            }
        >
            <PanelField
                label={field.word}
                kind="select"
                width="fill"
                data={data}
                value={written ?? null}
                // Unset, it reads the value beneath, as the number fields do.
                placeholder={written === undefined ? beneathWord : undefined}
                onChange={(next) => {
                    if (next === DEFAULT) {
                        onChange(undefined);
                    } else if (isSwitch) {
                        onChange(next === "true");
                    } else {
                        onChange(String(next));
                    }
                }}
            />
        </Captioned>
    );
}

/**
 * A settings field under its caption, with a Reset beside it once the layer sets a value. The
 * field takes the width its column gives it: these columns are half a pop-out wide, narrower than
 * the panel rows FieldRow is measured for.
 * @param props - Component props
 * @param props.word - the caption, drawn only: the field names itself
 * @param props.onReset - clears the value, when one is set
 * @param props.children - the field
 * @returns The field
 */
function Captioned({
    word,
    onReset,
    children,
}: Readonly<{ word: string; onReset?: () => void; children: React.ReactNode }>): React.JSX.Element {
    return (
        <Stack gap={2} style={{ minWidth: 0 }}>
            <span className="cm-caption" aria-hidden="true" title={word}>
                {word}
            </span>
            <Group gap={4} wrap="nowrap">
                <div style={{ flex: 1, minWidth: 0, display: "flex" }}>{children}</div>
                {onReset === undefined ? null : <ResetButton label={word} onClick={onReset} />}
            </Group>
        </Stack>
    );
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
        <div // NOSONAR(S6819): an ARIA group naming the gradient's controls; a fieldset would draw its own border and padding
            role="group"
            aria-label={word}
            data-set={list(value) === undefined ? undefined : ""}
        >
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
