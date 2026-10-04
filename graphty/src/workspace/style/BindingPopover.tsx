import { ComboInput, CompactColorInput, StyleNumberInput } from "@graphty/compact-mantine";
import { type ChannelDescriptor, toColorValue } from "@graphty/graphty-element/catalog";
import type { LayerId } from "@graphty/graphty-element/schema";
import { Button, Checkbox, CloseButton, Group, Select, Stack, Text } from "@mantine/core";
import React, { useState } from "react";

import { useWorkspace } from "../state/WorkspaceContext";
import { FromDataList } from "./FromDataList";
import { type DataBinding, type DataChoice, startingValue } from "./row";
import { channelWord, enumWords, paletteWord } from "./words";

/** What `toColorValue` reads. */
type ColorInput = Parameters<typeof toColorValue>[0];

/**
 * The lists stay inside the popover, so picking from one is not a click outside that closes the
 * popover first (Mantine's rule for a Select in a Popover).
 */
const IN_POPOVER = { withinPortal: false } as const;

/** A scale's name in words; the element publishes the ids. */
const SCALE_WORDS: Readonly<Record<string, string>> = {
    linear: "Linear",
    log: "Logarithmic",
    neglog10: "Negative logarithmic",
    sqrt: "Square root",
    pow: "Power",
    bins: "Equal bins",
    quantile: "Quantiles",
    ordinal: "One color per value",
    passthrough: "As written",
};

/** Props for BindingPopover. */
interface BindingPopoverProps {
    /** The bound property. */
    descriptor: ChannelDescriptor;
    /** The layer that holds the binding, whose legend says what extent the data had. */
    layerId: LayerId;
    /** The binding as the layer holds it. */
    binding: DataBinding;
    /** What the binding reads, in words. */
    source: string;
    /** Writes a changed binding (applies live). */
    onChange: (binding: DataBinding) => void;
    /** Reads another attribute or result instead. */
    onSource: (choice: DataChoice) => void;
    /** Replaces the binding with one value. */
    onDetach: () => void;
    /** Closes the popover; the choices stay. */
    onClose: () => void;
}

/**
 * The Binding popover (tier1-design.md 5.T9): Source, Scale, Palette with reverse, Values from,
 * No value and Detach. Every change is written to the row's layer at once; Esc, the X and a
 * click outside all keep it.
 * @param props - Component props
 * @param props.descriptor - the bound property
 * @param props.layerId - the layer that holds the binding
 * @param props.binding - the binding
 * @param props.source - what it reads, in words
 * @param props.onChange - writes a changed binding
 * @param props.onSource - reads another attribute instead
 * @param props.onDetach - replaces the binding with one value
 * @param props.onClose - closes the popover
 * @returns The popover's body
 */
export function BindingPopover({
    descriptor,
    layerId,
    binding,
    source,
    onChange,
    onSource,
    onDetach,
    onClose,
}: BindingPopoverProps): React.JSX.Element | null {
    const { session } = useWorkspace();
    const [choosing, setChoosing] = useState(false);
    if (session === null) {
        return null;
    }
    const patch = (change: Partial<DataBinding>): void => {
        onChange({ ...binding, ...change });
    };
    const isColor = descriptor.accepts === "color";
    const isNumber = descriptor.accepts === "number";
    const scale = binding.scale ?? "linear";
    const scales = session.catalog
        .scales()
        .filter((s) => isColor || (isNumber && s.domainKind === "numeric"))
        .map((s) => ({ value: s.name, label: SCALE_WORDS[s.name] ?? enumWords(s.name) }));
    const categorical = scale === "ordinal" || scale === "passthrough";
    const palettes = session.catalog
        .palettes()
        .filter((p) => (categorical ? p.kind === "categorical" : p.kind !== "categorical"))
        .map((p) => ({ value: p.id, label: paletteWord(p.id) }));
    const numeric = !categorical && (isColor || isNumber);
    const missing = binding.missing ?? "skip";
    const name = channelWord(descriptor.channel);
    // The extent the element read the values against, from its legend for this layer and channel.
    const extent = session.styles
        .legend()
        .find((block) => block.layerId === layerId && block.channel === descriptor.channel)?.domain;

    return (
        <Stack gap={8} w={240} role="group" aria-label={`${name} binding`}>
            <Group justify="space-between" wrap="nowrap">
                <Text size="xs" fw={600}>
                    {name} from data
                </Text>
                <CloseButton size="sm" aria-label="Close binding" onClick={onClose} />
            </Group>
            <Group justify="space-between" wrap="nowrap">
                <Text size="xs">
                    Source: <strong>{source}</strong>
                </Text>
                <Button
                    size="compact-xs"
                    variant="subtle"
                    onClick={() => {
                        setChoosing(!choosing);
                    }}
                >
                    Change source
                </Button>
            </Group>
            {choosing ? (
                <FromDataList
                    target={descriptor.target}
                    channel={descriptor.channel}
                    inUse={[binding.by]}
                    onPick={(choice) => {
                        setChoosing(false);
                        onSource(choice);
                    }}
                    onClose={() => {
                        setChoosing(false);
                    }}
                />
            ) : null}
            {scales.length === 0 ? null : (
                <Select
                    size="xs"
                    label="Scale"
                    value={scale}
                    data={scales}
                    allowDeselect={false}
                    comboboxProps={IN_POPOVER}
                    onChange={(value) => {
                        // A palette suits one kind of scale; the element picks one for the new kind.
                        patch({ scale: value ?? "linear", palette: undefined });
                    }}
                />
            )}
            {isColor ? (
                <Select
                    size="xs"
                    label="Palette"
                    placeholder="Automatic"
                    value={binding.palette ?? null}
                    data={palettes}
                    allowDeselect={false}
                    comboboxProps={IN_POPOVER}
                    onChange={(value) => {
                        patch({ palette: value ?? undefined });
                    }}
                />
            ) : null}
            {numeric ? (
                <Checkbox
                    size="xs"
                    label="Reverse"
                    checked={binding.reverse === true}
                    onChange={(event) => {
                        patch({ reverse: event.currentTarget.checked });
                    }}
                />
            ) : null}
            {isNumber ? (
                <Range key={String(binding.range)} descriptor={descriptor} range={binding.range} patch={patch} />
            ) : null}
            {numeric ? <ValuesFrom binding={binding} extent={extent} patch={patch} /> : null}
            {isColor || isNumber ? <NoValue descriptor={descriptor} missing={missing} patch={patch} /> : null}
            <Button size="compact-xs" variant="default" onClick={onDetach}>
                Detach
            </Button>
        </Stack>
    );
}

/**
 * The range a size reads into. Both ends are written together, once the reader has given both:
 * with no range on the binding (a run's result, #915) one end alone would leave the other to be
 * made up here.
 * @param props - Component props
 * @param props.descriptor - the bound property
 * @param props.range - the binding's range, if it has one
 * @param props.patch - writes a change
 * @returns The two fields
 */
function Range({
    descriptor,
    range,
    patch,
}: {
    descriptor: ChannelDescriptor;
    range: DataBinding["range"];
    patch: (change: Partial<DataBinding>) => void;
}): React.JSX.Element {
    const [draft, setDraft] = useState<readonly [number | undefined, number | undefined]>(
        range ?? [undefined, undefined],
    );
    const set = (index: 0 | 1, value: string | number): void => {
        const next: [number | undefined, number | undefined] = [draft[0], draft[1]];
        next[index] = typeof value === "number" ? value : undefined;
        setDraft(next);
        const [low, high] = next;
        if (low !== undefined && high !== undefined) {
            patch({ range: [low, high] });
        }
    };
    return (
        <Group grow gap={8} role="group" aria-label="Range">
            {(["From", "To"] as const).map((label, index) => (
                <ComboInput
                    key={label}
                    label={label}
                    numeric
                    options={[]}
                    placeholder="Not set"
                    value={draft[index]}
                    min={descriptor.min}
                    max={descriptor.max}
                    onChange={(value) => {
                        set(index === 0 ? 0 : 1, value);
                    }}
                />
            ))}
        </Group>
    );
}

/**
 * Values from: the data's own extent, or two numbers the reader types. Typing starts from the
 * extent the element read, so the ramp does not jump; with no extent reported there is nothing to
 * start from and the choice stays with the data.
 * @param props - Component props
 * @param props.binding - the binding
 * @param props.extent - the extent the element read the values against, if it reports one
 * @param props.patch - writes a change
 * @returns The control
 */
function ValuesFrom({
    binding,
    extent,
    patch,
}: {
    binding: DataBinding;
    extent: { readonly min: number; readonly max: number } | undefined;
    patch: (change: Partial<DataBinding>) => void;
}): React.JSX.Element {
    const domain = Array.isArray(binding.domain) ? binding.domain : null;
    return (
        <Stack gap={4}>
            <Checkbox
                size="xs"
                label="Values from the data"
                checked={domain === null}
                disabled={domain === null && extent === undefined}
                onChange={(event) => {
                    if (event.currentTarget.checked) {
                        patch({ domain: undefined });
                    } else if (extent !== undefined) {
                        patch({ domain: [extent.min, extent.max] });
                    }
                }}
            />
            {domain === null ? null : (
                <Group grow gap={8} role="group" aria-label="Values from">
                    <StyleNumberInput
                        label="Lowest"
                        value={domain[0]}
                        defaultValue={domain[0]}
                        onChange={(low) => {
                            patch({ domain: [low ?? domain[0], domain[1]] });
                        }}
                    />
                    <StyleNumberInput
                        label="Highest"
                        value={domain[1]}
                        defaultValue={domain[1]}
                        onChange={(high) => {
                            patch({ domain: [domain[0], high ?? domain[1]] });
                        }}
                    />
                </Group>
            )}
        </Stack>
    );
}

/**
 * No value: leave an element with no value as the layers beneath paint it, or give it one value.
 * @param props - Component props
 * @param props.descriptor - the bound property
 * @param props.missing - the binding's `missing`
 * @param props.patch - writes a change
 * @returns The control
 */
function NoValue({
    descriptor,
    missing,
    patch,
}: {
    descriptor: ChannelDescriptor;
    missing: NonNullable<DataBinding["missing"]>;
    patch: (change: Partial<DataBinding>) => void;
}): React.JSX.Element {
    const given = missing === "skip" ? null : missing.value;
    // One value starts where a new line of this property would: the element's default for it.
    const raw = startingValue(descriptor);
    const start: string | number =
        typeof raw === "number" || typeof raw === "string" ? raw : (toColorValue(raw as ColorInput)?.hex ?? "");
    let field: React.JSX.Element | null = null;
    if (given !== null && descriptor.accepts === "color") {
        field = (
            <CompactColorInput
                label="Value"
                color={typeof given === "string" ? given : undefined}
                defaultColor={String(start)}
                onColorChange={(color) => {
                    patch({ missing: { value: color ?? start } });
                }}
            />
        );
    } else if (given !== null) {
        field = (
            <StyleNumberInput
                label="Value"
                value={typeof given === "number" ? given : undefined}
                defaultValue={Number(start)}
                min={descriptor.min}
                max={descriptor.max}
                onChange={(value) => {
                    patch({ missing: { value: value ?? start } });
                }}
            />
        );
    }
    return (
        <Stack gap={4}>
            <Select
                size="xs"
                label="No value"
                value={given === null ? "skip" : "value"}
                allowDeselect={false}
                comboboxProps={IN_POPOVER}
                data={[
                    { value: "skip", label: "Leave as is" },
                    { value: "value", label: "Use one value" },
                ]}
                onChange={(choice) => {
                    patch({ missing: choice === "value" ? { value: start } : "skip" });
                }}
            />
            {field}
        </Stack>
    );
}
