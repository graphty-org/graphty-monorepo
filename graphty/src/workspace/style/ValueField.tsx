import { ComboInput, CompactColorInput, PanelField } from "@graphty/compact-mantine";
import type { ChannelDescriptor } from "@graphty/graphty-element/catalog";
import { Text, TextInput } from "@mantine/core";
import React from "react";

import { channelWord, colorName, enumWords, GLYPH_TABLES, hexOf, isPercent, TWO_WORDS, valueFieldKind } from "./words";

/**
 * A select's choices, named as graphty-element's catalog names them.
 * @param descriptor - the property.
 * @returns the options.
 */
function choiceOptions(descriptor: ChannelDescriptor): { value: string; label: string }[] {
    const two = TWO_WORDS[descriptor.channel];
    if (two !== undefined) {
        return two.map(([value, word]) => ({ value: String(value), label: word }));
    }
    const glyphs = GLYPH_TABLES[descriptor.channel];
    return (descriptor.values ?? []).map((value) => {
        const glyph = glyphs?.find((g) => g.id === value);
        return {
            value,
            label: glyph?.plainName ?? enumWords(value),
        };
    });
}

/**
 * The picture graphty-element's catalog draws for a shape, a line pattern or an arrow: its own
 * static SVG, in currentColor; the app keeps no picture of its own.
 * @param props - Component props
 * @param props.channel - the property
 * @param props.value - the value it paints
 * @returns The picture, or nothing for a value the catalog draws none for
 */
export function CatalogGlyph({
    channel,
    value,
}: Readonly<{ channel: ChannelDescriptor["channel"]; value: unknown }>): React.JSX.Element | null {
    const glyph = GLYPH_TABLES[channel]?.find((g) => g.id === value);
    return glyph === undefined ? null : (
        <span aria-hidden dangerouslySetInnerHTML={{ __html: glyph.glyph }} style={{ display: "inline-flex" }} />
    );
}

/** Props for ValueField. */
interface ValueFieldProps {
    /** The property. */
    readonly descriptor: ChannelDescriptor;
    /** Its accessible name, such as "Group 3 shape". */
    readonly label: string;
    /** The value set here, or undefined when none is (the field then shows `shown`). */
    readonly value: unknown;
    /** What it paints now, shown while nothing is set here. */
    readonly shown: unknown;
    /** Whether the things the field stands for disagree: it reads "Mixed". */
    readonly mixed?: boolean;
    /** A chit alone (a color) or a narrow field, for a row of a list. */
    readonly compact?: boolean;
    /** The swatches a color's picker offers; left out, the picker's own set. */
    readonly swatches?: readonly string[];
    /** Writes a value, once per gesture. */
    readonly onChange: (value: string | number | boolean) => void;
}

/**
 * One value of one property, in the control its kind needs (see {@link valueFieldKind}). It writes
 * once per gesture: a color when the picker closes, a number on commit, a choice on pick, words on
 * Enter or blur.
 * @param props - Component props
 * @param props.descriptor - the property
 * @param props.label - its accessible name
 * @param props.value - the value set here
 * @param props.shown - what it paints now
 * @param props.mixed - whether the things it stands for disagree
 * @param props.compact - a chit or a narrow field, for a list row
 * @param props.swatches - the swatches a color's picker offers
 * @param props.onChange - writes a value
 * @returns The field, or a dash for a property no field draws
 */
export function ValueField({
    descriptor,
    label,
    value,
    shown,
    mixed = false,
    compact = false,
    swatches,
    onChange,
}: Readonly<ValueFieldProps>): React.JSX.Element {
    const kind = valueFieldKind(descriptor);
    const props = { descriptor, label, value, shown, mixed, compact, swatches, onChange };
    if (kind === "color") {
        return <ColorValueField {...props} />;
    }
    if (kind === "number") {
        return <NumberValueField {...props} />;
    }
    if (kind === "choice") {
        return <ChoiceValueField {...props} />;
    }
    if (kind === "text") {
        return <TextValueField {...props} />;
    }
    return (
        <Text size="xs" c="dimmed" aria-label={`${label}: ${channelWord(descriptor.channel)} has no field`}>
            -
        </Text>
    );
}

/** ValueField's props, with its defaults filled in. */
type KindFieldProps = Readonly<ValueFieldProps & { mixed: boolean; compact: boolean }>;

/**
 * A color: a chit for a row of a list, else a field.
 * @param props - ValueField's props
 * @returns The field
 */
function ColorValueField(props: KindFieldProps): React.JSX.Element {
    const { label, value, shown, mixed, compact, swatches, onChange } = props;
    const hex = hexOf(value) ?? undefined;
    const inForce = hex ?? hexOf(shown);
    return (
        <CompactColorInput
            variant={compact ? "chip" : "field"}
            aria-label={label}
            // A row's chip is named by the color it paints, in words, never "not set, #009E73";
            // a field's box says the word beside its hex.
            valueText={!mixed && inForce !== null ? colorName(inForce) : undefined}
            width={compact ? undefined : "100%"}
            color={mixed ? undefined : hex}
            defaultColor={hexOf(shown) ?? "#999999"}
            mixed={mixed}
            showOpacity={false}
            showReset={false}
            swatches={swatches}
            onChangeEnd={(next) => {
                if (next !== undefined) {
                    onChange(next.toUpperCase());
                }
            }}
        />
    );
}

/**
 * A number; an opacity reads and types as a percent, as the property row does.
 * @param props - ValueField's props
 * @returns The field
 */
function NumberValueField(props: KindFieldProps): React.JSX.Element {
    const { descriptor, label, value, shown, mixed, compact, onChange } = props;
    const scale = isPercent(descriptor) ? 100 : 1;
    const toShown = (n: unknown): number | undefined =>
        typeof n === "number" ? Math.round(n * scale * 100) / 100 : undefined;
    const { min, max } = descriptor;
    return (
        <ComboInput
            label={label}
            width={compact ? 64 : "100%"}
            numeric
            options={[]}
            value={mixed ? "" : (toShown(value) ?? toShown(shown) ?? "")}
            mixed={mixed}
            suffix={scale === 100 ? "%" : undefined}
            min={min === undefined ? undefined : min * scale}
            max={max === undefined ? undefined : max * scale}
            step={scale === 1 && max !== undefined && max <= 1 ? 0.1 : 1}
            onChange={(next) => {
                if (typeof next === "number") {
                    onChange(next / scale);
                }
            }}
        />
    );
}

/**
 * A value as a choice's id.
 * @param v - the value.
 * @returns its id, or undefined when it is no choice.
 */
function choiceText(v: unknown): string | undefined {
    return typeof v === "string" || typeof v === "boolean" ? String(v) : undefined;
}

/**
 * A choice's accessible name. The value is in the name whether set or not, as the field shows it:
 * "Node shape, Cube"; an unset one is the default the field draws in italics: "Node shape, default
 * Icosphere".
 * @param label - the field's name.
 * @param mixed - whether the things it stands for disagree.
 * @param unsetDefault - the default in force, in words, when nothing is set here.
 * @param chosen - the choice set here, in words.
 * @returns the name.
 */
function choiceName(
    label: string,
    mixed: boolean,
    unsetDefault: string | undefined,
    chosen: string | undefined,
): string {
    if (mixed) {
        return `${label}, mixed`;
    }
    if (unsetDefault !== undefined) {
        return `${label}, default ${unsetDefault}`;
    }
    return chosen === undefined ? label : `${label}, ${chosen}`;
}

/**
 * A choice, with the catalog's picture for each choice in the open list and for the one drawn now.
 * @param props - ValueField's props
 * @returns The field
 */
function ChoiceValueField(props: KindFieldProps): React.JSX.Element {
    const { descriptor, label, value, shown, mixed, onChange } = props;
    const boolean = descriptor.accepts === "boolean";
    const options = choiceOptions(descriptor);
    // Nothing set here: the value shown is the one in force by default, and is read as that.
    const inForce = options.find((option) => option.value === choiceText(shown))?.label;
    const unset = value === undefined && !mixed && inForce !== undefined;
    const chosen = options.find((option) => option.value === choiceText(value))?.label;
    const glyphs =
        GLYPH_TABLES[descriptor.channel] === undefined
            ? undefined
            : Object.fromEntries(
                  options.map((o) => [
                      o.value,
                      <CatalogGlyph key={o.value} channel={descriptor.channel} value={o.value} />,
                  ]),
              );
    const pictured = glyphs === undefined || mixed ? undefined : (choiceText(value) ?? choiceText(shown));
    return (
        <PanelField
            label={choiceName(label, mixed, unset ? inForce : undefined, chosen)}
            kind="select"
            width="fill"
            data={options.map((o) => ({ value: o.value, label: o.label }))}
            // Unset, the field holds nothing and shows the default in force as its placeholder,
            // so the open list checks no choice as if it were set.
            value={mixed ? null : (choiceText(value) ?? null)}
            placeholder={unset ? inForce : undefined}
            mixed={mixed}
            optionGlyphs={glyphs}
            glyph={pictured === undefined ? undefined : <CatalogGlyph channel={descriptor.channel} value={pictured} />}
            onChange={(next) => {
                onChange(boolean ? next === "true" : String(next));
            }}
        />
    );
}

/**
 * Typed words, written on Enter or blur.
 * @param props - ValueField's props
 * @returns The field
 */
function TextValueField(props: KindFieldProps): React.JSX.Element {
    const { label, value, shown, mixed, onChange } = props;
    const words = typeof value === "string" ? value : "";
    let placeholder = typeof shown === "string" ? shown : "";
    if (mixed) {
        placeholder = "Mixed";
    }
    return (
        <TextInput
            // Keyed by the value, so Undo or another edit shows the new words.
            key={mixed ? "mixed-field" : words}
            size="xs"
            aria-label={label}
            defaultValue={mixed ? "" : words}
            placeholder={placeholder}
            onBlur={(event) => {
                const next = event.currentTarget.value;
                if (next !== "" && next !== words) {
                    onChange(next);
                }
            }}
            onKeyDown={(event) => {
                if (event.key === "Enter") {
                    event.currentTarget.blur();
                }
            }}
        />
    );
}
