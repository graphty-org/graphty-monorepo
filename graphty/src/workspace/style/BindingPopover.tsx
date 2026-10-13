import {
    ComboInput,
    CompactColorInput,
    RampEditor,
    type RampEditorHandle,
    StyleNumberInput,
    StyleSelect,
    ToggleIconButton,
    ToggleRow,
} from "@graphty/compact-mantine";
import { type ChannelDescriptor, toColorValue } from "@graphty/graphty-element/catalog";
import type { ChannelValue, LayerId, RuleTree } from "@graphty/graphty-element/schema";
import type { GraphSession, ReadableValue } from "@graphty/graphty-element/session";
import { ActionIcon, Box, Button, Group, Menu, Stack, Text, TextInput, Tooltip } from "@mantine/core";
import React, { useState } from "react";

import { swatchText } from "../canvas/legendWords";
import { GLYPHS } from "../glyphs";
import { count as countOf } from "../inspector/words";
import { useWorkspace } from "../state/WorkspaceContext";
import { type DataBinding, type DataChoice, startingValue } from "./row";
import { focusLineNext } from "./useFocusLine";
import { ValuePicker } from "./ValuePicker";
import { channelWord, colorName, enumWords, paletteWord } from "./words";

/** What `toColorValue` reads. */
type ColorInput = Parameters<typeof toColorValue>[0];

/** What the element's preview of a binding says. */
type Preview = ReturnType<GraphSession["styles"]["preview"]>;

/** One value of a categorical binding, as `styles.categories` lists it. */
type Category = ReturnType<GraphSession["styles"]["categories"]>[number];

/** The most distinct values a number may hold to be offered one color each: past it, colors stop telling apart. */
const PER_VALUE_MOST = 24;

/** Past this many category rows, a search field filters them (tier3 design, section 4). */
const SEARCH_PAST = 8;

/** A scale's name in words; the element publishes the ids. */
const SCALE_WORDS: Readonly<Record<string, string>> = {
    linear: "Linear",
    log: "Logarithmic",
    neglog10: "Negative logarithmic",
    sqrt: "Square root",
    pow: "Power",
    bins: "Equal bins",
    quantile: "Equal counts",
    ordinal: "One color per value",
    passthrough: "As written",
};

/** What a categorical color binding does with more values than its palette tells apart. */
const OVERFLOW_WORDS = [
    { value: "other", label: "Fold into Other" },
    { value: "shape", label: "Repeat colors, change shape" },
    { value: "extend", label: "Extend the palette" },
];

/** How a number meets what the layers beneath painted. */
const COMBINE_WORDS = [
    { value: "replace", label: "Replace" },
    { value: "multiply", label: "Multiply" },
    { value: "add", label: "Add" },
];

/**
 * A painted value as a CSS color, when it is a color.
 * @param paint - what the element paints
 * @returns the hex, or undefined
 */
function cssOf(paint: unknown): string | undefined {
    if (paint === null || paint === undefined || typeof paint === "number" || typeof paint === "boolean") {
        return undefined;
    }
    return toColorValue(paint as ColorInput)?.hex.slice(0, 7);
}

/**
 * A painted value as it is written back as a literal: a color's hex, or the number or text.
 * @param paint - what the element paints
 * @returns the value, or undefined when it paints nothing
 */
function literalOf(paint: unknown): ChannelValue | undefined {
    if (typeof paint === "number" || typeof paint === "string") {
        return paint;
    }
    return cssOf(paint)?.toUpperCase();
}

/**
 * A value in words for the reader: a color's hex, a number as the locale writes it.
 * @param value - the value
 * @returns the words
 */
function valueWords(value: unknown): string {
    if (typeof value === "number") {
        return value.toLocaleString();
    }
    return typeof value === "string" ? value : (cssOf(value) ?? String(value));
}

/**
 * The quiet last action that turns a varied field back into one value, naming the value it keeps:
 * "Use one color: orange", "Use one value: 2".
 * @param value - the value it keeps.
 * @returns the words.
 */
function oneValueWords(value: ChannelValue): string {
    const hex = cssOf(value);
    return typeof value === "string" && hex !== undefined
        ? `Use one color: ${colorName(hex.toUpperCase())}`
        : `Use one value: ${valueWords(value)}`;
}

/**
 * What the element knows about the value a binding reads: its kind, how many distinct values it
 * holds, whether they are colors.
 * @param session - the element's session.
 * @param binding - the binding.
 * @param target - nodes or edges.
 * @returns the element's entry, or undefined.
 */
function readableOf(
    session: GraphSession,
    binding: DataBinding,
    target: ChannelDescriptor["target"],
): ReadableValue | undefined {
    return session.data.readableValues().find((v) => v.path === binding.by && v.on === target && v.end === undefined);
}

/**
 * The element's preview of a binding, or null when the element refuses it (a path that reads
 * nothing, a palette the channel cannot take): the popover then offers only what can fix it.
 * @param session - the element's session
 * @param binding - the binding
 * @param channel - the channel it paints
 * @param bins - how many bins
 * @returns the preview, or null
 */
function previewOf(
    session: GraphSession,
    binding: DataBinding,
    channel: ChannelDescriptor["channel"],
    bins?: number,
): Preview | null {
    try {
        return session.styles.preview(binding, { channel, ...(bins === undefined ? {} : { bins }) });
    } catch {
        return null;
    }
}

/** Props for BindingPopover. */
interface BindingPopoverProps {
    /** The bound property. */
    descriptor: ChannelDescriptor;
    /** The layer that holds the binding. */
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
    onFix: (value: ChannelValue) => void;
}

/**
 * The binding popover (tier3 design, section 4). For numbers: the ramp editor fed by the element's
 * preview of the binding, Range for sizes and widths, a clamp, the steps of a stepped ramp with
 * their counts and "New layer for <step>". For categories: the scheme, one row per value (chit,
 * name, count, eye) whose chit writes a value-table entry, "New layer for <value>", the overflow
 * choice. Both: no value, combine, and "Fix at <value>". Every change is written at once.
 * @param props - Component props
 * @param props.descriptor - the bound property
 * @param props.layerId - the layer that holds the binding
 * @param props.binding - the binding
 * @param props.source - what it reads, in words
 * @param props.onChange - writes a changed binding
 * @param props.onSource - reads another attribute instead
 * @param props.onFix - replaces the binding with one value
 * @returns The popover's body
 */
export function BindingPopover({
    descriptor,
    layerId,
    binding,
    source,
    onChange,
    onSource,
    onFix,
}: Readonly<BindingPopoverProps>): React.JSX.Element | null {
    const { session } = useWorkspace();
    const [choosing, setChoosing] = useState(false);
    if (session === null) {
        return null;
    }
    const patch = (change: Partial<DataBinding>): void => {
        onChange({ ...binding, ...change });
    };
    const { channel } = descriptor;
    const isColor = descriptor.accepts === "color";
    const isNumber = descriptor.accepts === "number";
    const preview = previewOf(session, binding, channel);
    const categorical = preview?.domain === null;
    const name = channelWord(channel);
    // The one value "Fix at" keeps: what the binding paints at the middle of its scale, or for its
    // largest group -- the element's own answer, from a one-bin preview.
    const middle = categorical ? preview.bins[0]?.paints : previewOf(session, binding, channel, 1)?.bins[0]?.paints;
    const fixed = literalOf(middle);

    return (
        <Stack gap={8} role="group" aria-label={`${name} binding`}>
            <Group justify="space-between" wrap="nowrap">
                <Text size="xs">
                    Source: <strong>{source}</strong>
                </Text>
                <Button
                    size="compact-xs"
                    variant="default"
                    aria-expanded={choosing}
                    onClick={() => {
                        setChoosing(!choosing);
                    }}
                >
                    Change source
                </Button>
            </Group>
            {choosing ? (
                <ValuePicker
                    title="Change source"
                    target={descriptor.target}
                    channel={channel}
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
            {preview !== null && !categorical && (isColor || isNumber) ? (
                <Ramp
                    session={session}
                    descriptor={descriptor}
                    layerId={layerId}
                    binding={binding}
                    source={source}
                    preview={preview}
                    patch={patch}
                />
            ) : null}
            {preview !== null && categorical ? (
                <Categories
                    session={session}
                    descriptor={descriptor}
                    layerId={layerId}
                    binding={binding}
                    source={source}
                    preview={preview}
                    patch={patch}
                />
            ) : null}
            {isNumber ? (
                <Range key={String(binding.range)} descriptor={descriptor} range={binding.range} patch={patch} />
            ) : null}
            {(isColor || isNumber) && (categorical || !isColor) ? (
                <NoValue descriptor={descriptor} missing={binding.missing ?? "skip"} patch={patch} />
            ) : null}
            {isNumber ? (
                <StyleSelect
                    label="Combine"
                    aria-label={`How ${name.toLowerCase()} meets the layers beneath`}
                    value={binding.combine}
                    defaultValue="replace"
                    options={COMBINE_WORDS}
                    onChange={(mode) => {
                        patch({ combine: mode === "multiply" || mode === "add" ? mode : undefined });
                    }}
                />
            ) : null}
            {fixed === undefined ? null : (
                <QuietButton
                    onClick={() => {
                        onFix(fixed);
                    }}
                >
                    {oneValueWords(fixed)}
                </QuietButton>
            )}
        </Stack>
    );
}

/** What the ramp and the category list share. */
interface PartProps {
    session: GraphSession;
    descriptor: ChannelDescriptor;
    layerId: LayerId;
    binding: DataBinding;
    source: string;
    preview: Preview;
    patch: (change: Partial<DataBinding>) => void;
}

/**
 * Adds a layer directly above the binding's layer whose rule is one value or one step of what the
 * binding reads, and opens it: "New layer from selection" with the rule filled in. It starts on the
 * color (or number) that value paints now, so nothing changes until the reader edits it: the
 * element refuses a layer that writes nothing.
 * @param session - the element's session
 * @param layerId - the binding's layer
 * @param channel - the bound channel
 * @param name - the new layer's name
 * @param where - its rule
 * @param paint - what the value or the step paints now
 * @returns the new layer's id, once it is in the stack
 */
async function layerFor(
    session: GraphSession,
    layerId: LayerId,
    channel: ChannelDescriptor["channel"],
    name: string,
    where: RuleTree,
    paint: unknown,
): Promise<LayerId> {
    const target = session.styles.get(layerId)?.target ?? "node";
    const value = literalOf(paint);
    const layer = await session.styles.add(
        {
            name,
            target,
            selector: { match: "rule", where },
            ...(value === undefined ? {} : { set: { [channel]: value } }),
        },
        { above: layerId },
    );
    return layer.id;
}

/**
 * Makes the layer for one value or step (`layerFor`), opens it, hands focus to its line and says
 * so: the popover and the row it was opened from go away with the layer that is no longer shown.
 * @param session - the element's session
 * @param store - the workspace store
 * @param layerId - the binding's layer
 * @param channel - the bound channel
 * @param name - the new layer's name
 * @param where - its rule
 * @param paint - what the value or the step paints now
 */
function openLayerFor(
    session: GraphSession,
    store: ReturnType<typeof useWorkspace>["store"],
    layerId: LayerId,
    channel: ChannelDescriptor["channel"],
    name: string,
    where: RuleTree,
    paint: unknown,
): void {
    layerFor(session, layerId, channel, name, where, paint)
        .then((id) => {
            store.set({ inspected: { kind: "layer-row", id }, announcement: `Layer ${name} added above` });
            focusLineNext(channel);
        })
        .catch(() => {
            store.set({ notice: { message: "The layer could not be added" } });
        });
}

/**
 * A numeric binding: the ramp editor, a clamp, and for a stepped scale its steps with counts.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.descriptor - the bound property
 * @param props.layerId - the binding's layer
 * @param props.binding - the binding
 * @param props.source - what it reads, in words
 * @param props.preview - the element's preview of it
 * @param props.patch - writes a change
 * @returns The ramp
 */
function Ramp({ session, descriptor, layerId, binding, source, preview, patch }: PartProps): React.JSX.Element {
    const { store } = useWorkspace();
    const isColor = descriptor.accepts === "color";
    const domain = preview.domain ?? [0, 0];
    const scale = binding.scale ?? preview.scale;
    const scales = session.catalog
        .scales()
        .filter((s) => s.domainKind === "numeric")
        .map((s) => ({ value: s.name, label: SCALE_WORDS[s.name] ?? enumWords(s.name) }));
    const palettes = session.catalog.palettes().filter((p) => p.kind !== "categorical");
    const shownPalette = session.styles
        .legend()
        .find((block) => block.layerId === layerId && block.channel === descriptor.channel)?.palette?.name;
    const diverging = palettes.find((p) => p.id === (binding.palette ?? shownPalette))?.kind === "diverging";
    const stepped = preview.steps.length > 0;
    // A number with few distinct values (College football's conference codes) can take one color
    // each, through the ordinal scale and a categorical palette, extended past its colors.
    const readable = readableOf(session, binding, descriptor.target);
    const perValue =
        isColor &&
        readable?.kind === "number" &&
        readable.valueCount !== undefined &&
        readable.valueCount > 1 &&
        readable.valueCount <= PER_VALUE_MOST;
    // Steps from the element's cut points: the first runs from below, the last to above.
    const steps = stepped
        ? preview.stepCounts.map((count, at) => ({
              from: at === 0 ? undefined : preview.steps[at - 1],
              to: at === preview.steps.length ? undefined : preview.steps[at],
              count,
          }))
        : [];
    const stepWords = (from: number | undefined, to: number | undefined): string => {
        if (from === undefined) {
            return `below ${valueWords(to)}`;
        }
        return to === undefined ? `${valueWords(from)} and above` : `${valueWords(from)} to ${valueWords(to)}`;
    };

    return (
        <Stack gap={8}>
            <RampEditor
                label={`${channelWord(descriptor.channel)} by ${source}`}
                bins={preview.bins.map((bin) => ({
                    from: bin.from ?? 0,
                    to: bin.to ?? 0,
                    count: bin.count,
                    paint: isColor ? cssOf(bin.paints) : undefined,
                    label: `${valueWords(bin.from)} to ${valueWords(bin.to)}: ${String(bin.count)}`,
                }))}
                domain={[domain[0], domain[1]]}
                onDomainChange={(next) => {
                    // A domain and a clamp both set the extent; the element takes one.
                    patch({ domain: next, clamp: undefined });
                }}
                midpoint={diverging ? (binding.midpoint ?? (domain[0] + domain[1]) / 2) : undefined}
                onMidpointChange={(midpoint) => {
                    patch({ midpoint });
                }}
                clamp={
                    binding.clamp === undefined
                        ? undefined
                        : { low: domain[0], high: domain[1], below: preview.below, above: preview.above }
                }
                steps={[...preview.steps]}
                step={wholeNumbers(session, binding.by) ? 1 : undefined}
                // The handle's name is the editor's own ("Ramp start"); its value is said in the data's terms.
                describe={(_handle: RampEditorHandle, value) => `${source} ${valueWords(value)}`}
                labels={{ from: "Values from", to: "Values to" }}
                scale={binding.scale}
                defaultScale={preview.scale}
                scales={scales}
                onScaleChange={(next) => {
                    patch({ scale: next, palette: binding.palette });
                }}
                {...(isColor
                    ? {
                          palette: binding.palette,
                          defaultPalette: shownPalette ?? palettes[0]?.id,
                          palettes: palettes.map((p) => ({
                              value: p.id,
                              label: paletteWord(p.id),
                              stops: [...p.colors],
                          })),
                          onPaletteChange: (palette: string | undefined) => {
                              patch({ palette });
                          },
                          reverse: binding.reverse === true,
                          onReverseChange: (reverse: boolean) => {
                              patch({ reverse: reverse || undefined });
                          },
                          noValue: { count: preview.noValue, paint: cssOf(preview.noValuePaints) ?? null },
                          onNoValueChange: (paint: boolean) => {
                              const start = cssOf(startingValue(descriptor)) ?? "#999999";
                              patch({ missing: paint ? { value: start } : "skip" });
                          },
                      }
                    : {})}
            />
            {binding.domain !== undefined && binding.domain !== "auto" ? (
                <Button
                    size="compact-xs"
                    variant="subtle"
                    onClick={() => {
                        patch({ domain: undefined });
                    }}
                >
                    Fit to the data
                </Button>
            ) : null}
            <Clamp binding={binding} patch={patch} />
            {perValue ? (
                <QuietButton
                    onClick={() => {
                        patch({
                            scale: "ordinal",
                            overflow: "extend",
                            palette: undefined,
                            reverse: undefined,
                            domain: undefined,
                            clamp: undefined,
                            midpoint: undefined,
                            bins: undefined,
                        });
                    }}
                >
                    One color per value
                </QuietButton>
            ) : null}
            {scale === "bins" || scale === "quantile" ? (
                <StyleNumberInput
                    label="Steps"
                    value={binding.bins}
                    defaultValue={preview.stepCounts.length}
                    min={2}
                    max={12}
                    onChange={(bins) => {
                        patch({ bins });
                    }}
                />
            ) : null}
            {steps.length === 0 ? null : (
                <Stack gap={2} role="list" aria-label="Steps">
                    {steps.map((step) => {
                        const words = stepWords(step.from, step.to);
                        return (
                            <ValueRow
                                key={words}
                                session={session}
                                target={descriptor.target}
                                source={source}
                                name={words}
                                count={step.count}
                                // ponytail: a range rule is inclusive at both ends, the scale puts a
                                // value on a cut in the step above; data on a cut is in both layers.
                                where={{
                                    kind: "range",
                                    attribute: binding.by,
                                    ...(step.from === undefined ? {} : { min: step.from }),
                                    ...(step.to === undefined ? {} : { max: step.to }),
                                }}
                                onNewLayer={(where) => {
                                    openLayerFor(
                                        session,
                                        store,
                                        layerId,
                                        descriptor.channel,
                                        `${source} ${words}`,
                                        where,
                                        // The step's paint: the first bar inside it.
                                        preview.bins.find((bin) => (bin.from ?? 0) >= (step.from ?? -Infinity))?.paints,
                                    );
                                }}
                            />
                        );
                    })}
                </Stack>
            )}
        </Stack>
    );
}

/**
 * Whether what a binding reads holds whole numbers only (a count, a rank), so its ramp steps by 1.
 * @param session - the element's session
 * @param path - what the binding reads
 * @returns true for an integer column or run result
 */
function wholeNumbers(session: GraphSession, path: string): boolean {
    if (session.data.attributes().some((column) => column.path === path && column.type === "integer")) {
        return true;
    }
    return session.runs
        .list()
        .some((run) => run.fields.some((f) => f.type === "integer" && session.results.path(run.id, f.name) === path));
}

/**
 * The clamp: cut the extent at two percentiles, so outliers paint as the ends. The ramp shades
 * and counts what falls outside.
 * @param props - Component props
 * @param props.binding - the binding
 * @param props.patch - writes a change
 * @returns The control
 */
function Clamp({
    binding,
    patch,
}: Readonly<{ binding: DataBinding; patch: (change: Partial<DataBinding>) => void }>): React.JSX.Element {
    const { clamp } = binding;
    return (
        <Stack gap={4}>
            <ToggleRow
                label="Clamp outliers"
                control="switch"
                checked={clamp !== undefined}
                onChange={(on) => {
                    patch(on ? { clamp: [2, 98], domain: undefined } : { clamp: undefined });
                }}
            />
            {clamp === undefined ? null : (
                <Group grow gap={8} role="group" aria-label="Clamp at percentiles">
                    <StyleNumberInput
                        label="Lowest percentile"
                        value={clamp[0]}
                        defaultValue={clamp[0]}
                        min={0}
                        max={clamp[1]}
                        onChange={(low) => {
                            patch({ clamp: [low ?? clamp[0], clamp[1]] });
                        }}
                    />
                    <StyleNumberInput
                        label="Highest percentile"
                        value={clamp[1]}
                        defaultValue={clamp[1]}
                        min={clamp[0]}
                        max={100}
                        onChange={(high) => {
                            patch({ clamp: [clamp[0], high ?? clamp[1]] });
                        }}
                    />
                </Group>
            )}
        </Stack>
    );
}

/**
 * A categorical binding: its scheme, one row per value, and what happens past the palette.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.descriptor - the bound property
 * @param props.layerId - the binding's layer
 * @param props.binding - the binding
 * @param props.source - what it reads, in words
 * @param props.preview - the element's preview of it
 * @param props.patch - writes a change
 * @returns The scheme and its rows
 */
function Categories({ session, descriptor, layerId, binding, source, preview, patch }: PartProps): React.JSX.Element {
    const { store } = useWorkspace();
    const [search, setSearch] = useState("");
    const { channel } = descriptor;
    const isColor = descriptor.accepts === "color";
    const categories = session.styles.categories(layerId, channel);
    const palettes = session.catalog.palettes().filter((p) => p.kind === "categorical");
    const block = session.styles.legend().find((b) => b.layerId === layerId && b.channel === channel);
    const shownPalette = block?.palette?.name;
    // What each value paints, from the element's preview: an entry's own value, else the palette's.
    const paints = new Map(preview.bins.map((bin) => [String(bin.value), bin.paints]));
    // Each value by the name the canvas key gives it: a run's group as "Group 3", by its rank.
    const names = new Map(
        (block?.swatches ?? [])
            .filter((swatch) => swatch.role !== "other")
            .map((swatch) => [String(swatch.value), block === undefined ? "" : swatchText(block, swatch)]),
    );
    const nameOf = (value: unknown): string => names.get(String(value)) ?? String(value);
    const readable = readableOf(session, binding, descriptor.target);
    const asWritten = binding.scale === "passthrough";
    const needle = search.trim().toLowerCase();
    const shown = categories.filter(
        (c) =>
            needle === "" ||
            String(c.value).toLowerCase().includes(needle) ||
            nameOf(c.value).toLowerCase().includes(needle),
    );
    const fail = (): void => {
        store.set({ notice: { message: `${channelWord(channel)} could not be changed` } });
    };
    const entry = (value: Category["value"], next: string | number | undefined): void => {
        Promise.resolve(session.styles.setValueEntry(layerId, channel, value as string | number | boolean, next)).catch(
            fail,
        );
    };

    return (
        <Stack gap={8}>
            {isColor && readable?.kind === "number" && binding.scale === "ordinal" ? (
                <QuietButton
                    onClick={() => {
                        patch({ scale: undefined, palette: undefined, overflow: undefined });
                    }}
                >
                    Use a ramp
                </QuietButton>
            ) : null}
            {isColor && readable?.valuesAreColors === true ? (
                <QuietButton
                    onClick={() => {
                        patch(
                            asWritten
                                ? { scale: undefined }
                                : { scale: "passthrough", palette: undefined, overflow: undefined },
                        );
                    }}
                >
                    {asWritten ? "Use a palette" : "Use the values as colors"}
                </QuietButton>
            ) : null}
            {isColor && !asWritten ? (
                <StyleSelect
                    label="Palette"
                    value={binding.palette}
                    defaultValue={shownPalette ?? palettes[0]?.id ?? ""}
                    options={palettes.map((p) => ({
                        value: p.id,
                        label: paletteWord(p.id),
                        glyph: (
                            <span
                                aria-hidden
                                style={{
                                    display: "block",
                                    width: 16,
                                    height: 8,
                                    marginBlock: 4,
                                    borderRadius: 2,
                                    background: `linear-gradient(to right, ${p.colors.slice(0, 8).join(", ")})`,
                                }}
                            />
                        ),
                    }))}
                    onChange={(palette) => {
                        patch({ palette });
                    }}
                />
            ) : null}
            {categories.length > SEARCH_PAST ? (
                <TextInput
                    size="xs"
                    aria-label={`Search ${source} values`}
                    placeholder="Search values"
                    value={search}
                    onChange={(event) => {
                        setSearch(event.currentTarget.value);
                    }}
                />
            ) : null}
            <Stack gap={2} role="list" aria-label={`${source} values`}>
                {shown.map((category) => {
                    const word = String(category.value);
                    const name = nameOf(category.value);
                    const painted = paints.get(word);
                    let chit: React.ReactNode = null;
                    if (isColor) {
                        chit = (
                            <CompactColorInput
                                variant="chip"
                                aria-label={`${source} ${name} color`}
                                color={typeof category.entry === "string" ? category.entry : undefined}
                                defaultColor={cssOf(painted) ?? "#999999"}
                                showOpacity={false}
                                showReset={false}
                                onChangeEnd={(next) => {
                                    if (next !== undefined) {
                                        entry(category.value, next.toUpperCase());
                                    }
                                }}
                            />
                        );
                    } else if (descriptor.accepts === "number") {
                        chit = (
                            <Box w={64}>
                                <StyleNumberInput
                                    label={`${source} ${name} ${channelWord(channel).toLowerCase()}`}
                                    value={typeof category.entry === "number" ? category.entry : undefined}
                                    defaultValue={typeof painted === "number" ? painted : 1}
                                    min={descriptor.min}
                                    max={descriptor.max}
                                    onChange={(next) => {
                                        entry(category.value, next);
                                    }}
                                />
                            </Box>
                        );
                    }
                    return (
                        <ValueRow
                            key={word}
                            session={session}
                            target={descriptor.target}
                            source={source}
                            name={name}
                            count={category.count}
                            chit={chit}
                            hidden={category.hidden}
                            onHide={(hide) => {
                                Promise.resolve(
                                    session.styles.setValueHidden(
                                        layerId,
                                        channel,
                                        category.value as string | number | boolean,
                                        hide,
                                    ),
                                ).catch(fail);
                            }}
                            onClear={
                                category.entry === undefined
                                    ? undefined
                                    : () => {
                                          entry(category.value, undefined);
                                      }
                            }
                            where={{ kind: "categories", attribute: binding.by, values: [word] }}
                            onNewLayer={(where) => {
                                openLayerFor(session, store, layerId, channel, `${source} ${name}`, where, painted);
                            }}
                        />
                    );
                })}
            </Stack>
            {isColor && !asWritten ? (
                <StyleSelect
                    label="More values than colors"
                    value={binding.overflow}
                    defaultValue="other"
                    options={OVERFLOW_WORDS}
                    onChange={(overflow) => {
                        patch({ overflow: overflow as DataBinding["overflow"] });
                    }}
                />
            ) : null}
        </Stack>
    );
}

/**
 * One value or one step, in the order of Figma's paint rows: its chit, name and count, then its
 * eye, the minus that clears its entry, and its actions -- Select these, and "New layer for
 * <value>". Every control is named with the source and the value, so a list of them reads apart.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.target - nodes or edges
 * @param props.source - what the binding reads, in words
 * @param props.name - the value or the step in words
 * @param props.count - how many elements it paints
 * @param props.chit - the field that edits its entry
 * @param props.hidden - whether it is hidden
 * @param props.onHide - hides or shows it
 * @param props.onClear - clears its entry, when it has one
 * @param props.where - the rule that matches its elements
 * @param props.onNewLayer - makes a layer of that rule
 * @returns The row
 */
function ValueRow({
    session,
    target,
    source,
    name,
    count,
    chit,
    hidden,
    onHide,
    onClear,
    where,
    onNewLayer,
}: Readonly<{
    session: GraphSession;
    target: ChannelDescriptor["target"];
    source: string;
    name: string;
    count: number;
    chit?: React.ReactNode;
    hidden?: boolean;
    onHide?: (hide: boolean) => void;
    onClear?: () => void;
    where: RuleTree;
    onNewLayer: (where: RuleTree) => void;
}>): React.JSX.Element {
    const full = `${source} ${name}`;
    const counted = countOf(count, target);
    const select = (): void => {
        // An edge's value selects its edges with their end nodes, as the Values tab's rows do.
        const rule: RuleTree =
            target === "edge" && (where.kind === "range" || where.kind === "categories")
                ? { ...where, nodes: "ends" }
                : where;
        void session.selection.apply({ scope: { define: { kind: "rule", where: rule, reading: "clipped" } } });
    };
    return (
        // One line: the chip, the name, the count with its unit, then fixed 24 px columns (eye,
        // Clear, actions), so the columns line up row to row whether or not a row has its Clear.
        <Group role="listitem" aria-label={`${name}, ${counted}`} gap={4} wrap="nowrap">
            {chit === undefined || chit === null ? null : <Box style={{ flex: "none", display: "flex" }}>{chit}</Box>}
            <Text size="xs" truncate style={{ flex: 1, minWidth: 0 }}>
                {name}
            </Text>
            <Text size="xs" c="dimmed" style={{ flex: "none" }}>
                {counted}
            </Text>
            {onHide === undefined ? null : (
                <ToggleIconButton
                    variant="swap"
                    label={`Hide ${full}`}
                    checked={hidden === true}
                    icon={<GLYPHS.show size={14} />}
                    checkedIcon={<GLYPHS.hide size={14} />}
                    onChange={onHide}
                />
            )}
            <Box w={24} style={{ flex: "none" }} data-clear-column>
                {onClear === undefined ? null : (
                    <Tooltip label="Clear: back to the palette">
                        <ActionIcon
                            variant="subtle"
                            size="sm"
                            aria-label={`Back to the palette: ${full}`}
                            onClick={onClear}
                        >
                            <GLYPHS.remove size={14} aria-hidden />
                        </ActionIcon>
                    </Tooltip>
                )}
            </Box>
            <Menu withinPortal={false} position="bottom-end">
                <Menu.Target>
                    <ActionIcon variant="subtle" size="sm" aria-label={`${full} actions`}>
                        <GLYPHS.more size={14} aria-hidden />
                    </ActionIcon>
                </Menu.Target>
                <Menu.Dropdown>
                    <Menu.Item onClick={select}>{`Select these ${counted}`}</Menu.Item>
                    <Menu.Item
                        onClick={() => {
                            onNewLayer(where);
                        }}
                    >{`New layer for ${name}`}</Menu.Item>
                </Menu.Dropdown>
            </Menu>
        </Group>
    );
}

/**
 * A quiet text action of the popover, at its start edge: a way to read the same value another way.
 * @param props - Component props
 * @param props.children - its words
 * @param props.onClick - what it does
 * @returns The button
 */
function QuietButton({
    children,
    onClick,
}: Readonly<{ children: React.ReactNode; onClick: () => void }>): React.JSX.Element {
    return (
        <Button size="compact-xs" variant="subtle" style={{ alignSelf: "flex-start" }} onClick={onClick}>
            {children}
        </Button>
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
}: Readonly<{
    descriptor: ChannelDescriptor;
    range: DataBinding["range"];
    patch: (change: Partial<DataBinding>) => void;
}>): React.JSX.Element {
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
            {["Paints from", "Paints to"].map((label, index) => (
                <ComboInput
                    key={label}
                    label={label}
                    numeric
                    variant="outlined"
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
}: Readonly<{
    descriptor: ChannelDescriptor;
    missing: NonNullable<DataBinding["missing"]>;
    patch: (change: Partial<DataBinding>) => void;
}>): React.JSX.Element {
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
                // Once per gesture, so a drag in the picker is one undo step.
                onChangeEnd={(color) => {
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
            <StyleSelect
                label="No value"
                value={given === null ? undefined : "value"}
                defaultValue="skip"
                options={[
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
