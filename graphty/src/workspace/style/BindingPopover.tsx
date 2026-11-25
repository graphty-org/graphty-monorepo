import {
    ComboInput,
    FieldRow,
    PanelField,
    PanelLabelsProvider,
    RampEditor,
    type RampEditorHandle,
    ResetButton,
    ToggleRow,
} from "@graphty/compact-mantine";
import { type ChannelDescriptor, toColorValue } from "@graphty/graphty-element/catalog";
import type { ChannelValue, LayerId, RuleTree } from "@graphty/graphty-element/schema";
import type { GraphSession, ReadableValue } from "@graphty/graphty-element/session";
import { ActionIcon, Box, Button, Group, Menu, Stack, Text, Tooltip } from "@mantine/core";
import React, { useState } from "react";

import { stylePanelV2On } from "../features";
import { GLYPHS } from "../glyphs";
import { count as countOf } from "../inspector/words";
import { formatNumber } from "../settings/numberFormat";
import { useWorkspace } from "../state/WorkspaceContext";
import { wholeNumbers } from "./cards";
import { GroupList, LayerGroupList } from "./Groups";
import { type DataBinding, type DataChoice, type LayerBinding, startingValue, topmostRow } from "./row";
import { focusLineNext } from "./useFocusLine";
import { SegmentsLine } from "./v2/RubricLine";
import { ValueField } from "./ValueField";
import { ValuePicker } from "./ValuePicker";
import {
    channelPhrase,
    channelWord,
    COMBINE_OPTIONS,
    COMBINE_WORDS,
    combineOf,
    enumWords,
    failureWords,
    LAYER_TOKEN,
    paletteWord,
    SCALE_WORDS,
} from "./words";

/** What `toColorValue` reads. */
type ColorInput = Parameters<typeof toColorValue>[0];

/** What the element's preview of a binding says. */
type Preview = ReturnType<GraphSession["styles"]["preview"]>;

/** The most distinct values a number may hold to be offered one color each: past it, colors stop telling apart. */
const PER_VALUE_MOST = 24;

/**
 * What a categorical color binding does with more values than its palette tells apart. Repeated
 * colors always come with a second cue, a node's shape or an edge's pattern, never color alone.
 */
const OVERFLOW_WORDS = {
    node: [
        { value: "other", label: "Fold into Other" },
        { value: "shape", label: "Repeat colors, change shape" },
        { value: "extend", label: "Extend the palette" },
    ],
    edge: [
        { value: "other", label: "Fold into Other" },
        { value: "pattern", label: "Repeat colors, change pattern" },
        { value: "extend", label: "Extend the palette" },
    ],
} as const;

/** Style panel v2's short words for what happens past the palette, as grouped buttons. */
const OVERFLOW_SHORT: Readonly<Record<string, string>> = {
    other: "Other",
    shape: "Shape",
    pattern: "Pattern",
    extend: "Extend",
};

/** How a number meets what the layers beneath painted, in today's words (`COMBINE_WORDS`). */
const COMBINE_SELECT = Object.entries(COMBINE_WORDS).map(([value, { word }]) => ({ value, label: word }));

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
        return formatNumber(value);
    }
    return typeof value === "string" ? value : (cssOf(value) ?? String(value));
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
        return session.styles.preview(binding, { channel, span: "data", ...(bins === undefined ? {} : { bins }) });
    } catch {
        return null;
    }
}

/** What the popover's binding reads: a value of the data, or the selected layers themselves. */
type BindingPopoverProps = {
    /** The bound property. */
    readonly descriptor: ChannelDescriptor;
    /** Reads another attribute or result instead. */
    readonly onSource: (choice: DataChoice) => void;
} & (
    | {
          /** The layer that holds the binding (several layers: the first one it is written to). */
          readonly layerId: LayerId;
          readonly binding: DataBinding;
          /** What the binding reads, in words. */
          readonly source: string;
          /** Several layers: the binding is held, and written to each when the popover closes. */
          readonly held?: boolean;
          /** Keeps a changed binding: written at once to one layer, held for several. */
          readonly onChange: (binding: DataBinding) => void;
          readonly layers?: undefined;
      }
    | {
          /** Several layers, each one group, in list order (top first): the source is Layer. */
          readonly layers: readonly LayerId[];
          readonly binding: LayerBinding;
          readonly onChange: (binding: LayerBinding) => void;
          readonly layerId?: undefined;
      }
);

/**
 * A control with its name as the small label above it (owner's input rules: every input is self describing):
 * grouped buttons of words say nothing of what they choose.
 * @param props - Component props
 * @param props.children - the control, named by its `label`
 * @returns The captioned control
 */
function Captioned({ children }: Readonly<{ children: React.ReactNode }>): React.JSX.Element {
    return (
        <PanelLabelsProvider showLabels>
            <FieldRow>{children}</FieldRow>
        </PanelLabelsProvider>
    );
}

/**
 * The binding popover (tier3 design, section 4), the one for every source: a value of the data on
 * one layer or held for several, or the selected layers themselves (Vary by Layer, each layer one
 * group, from graphty-element's `styles.layerGroups`). In this order: the source and Change source;
 * for numbers read as a ramp, the ramp editor, its clamp and steps; for groups, a way to read the
 * value another way, the palette, the group list (the same rows for every source) and what happens
 * past the palette ("More values than colors", "More layers than colors"); Range for a number; No
 * value, for every source alike; Combine for a number. Stopping varying by data is the field's own Stop varying button beside the pill.
 * @param props - Component props
 * @returns The popover's body
 */
export function BindingPopover(props: Readonly<BindingPopoverProps>): React.JSX.Element | null {
    const { session } = useWorkspace();
    // A group's detail takes the popover over: what belongs to the whole binding steps aside.
    const [detail, setDetail] = useState(false);
    if (session === null) {
        return null;
    }
    const { descriptor, onSource } = props;
    const { channel } = descriptor;
    const isNumber = descriptor.accepts === "number";
    const name = channelWord(channel);
    const parts = props.layers === undefined ? dataParts(session, props, setDetail) : layerParts(session, props);
    const { binding, patch } = parts;
    const numberParts = isNumber && !detail;
    const v2 = stylePanelV2On(session);
    const rare = <RareChoices session={session} descriptor={descriptor} parts={parts} detail={detail} v2={v2} />;

    return (
        <Stack gap={8} role="group" aria-label={`${name} binding`}>
            <SourceHeader
                descriptor={descriptor}
                source={parts.source}
                byLayer={parts.noun === "layers"}
                inUse={parts.inUse}
                onSource={onSource}
            />
            {/* v2: what the number does with the value underneath, first (owner, 2026-11-23). */}
            {numberParts && v2 ? (
                <Beside other={parts.rampScale}>
                    <Captioned>
                        <SegmentsLine
                            label="Operation"
                            options={COMBINE_OPTIONS}
                            value={binding.combine ?? "replace"}
                            onPick={(mode) => {
                                patch({ combine: combineOf(mode) });
                            }}
                        />
                    </Captioned>
                </Beside>
            ) : null}
            {parts.ramp}
            {parts.categorical ? (
                <GroupsSection session={session} descriptor={descriptor} parts={parts} detail={detail} />
            ) : null}
            {numberParts ? (
                <Range
                    key={String(binding.range)}
                    descriptor={descriptor}
                    range={binding.range}
                    patch={patch}
                    captions={v2}
                />
            ) : null}
            {v2 ? null : rare}
            {numberParts && !v2 ? <CombineField name={name} binding={binding} patch={patch} /> : null}
            {v2 ? rare : null}
        </Stack>
    );
}

/**
 * The binding's rarer choices: No value, and in v2 the ramp's Scale and Clamp outliers and More values than colors
 * too, last, two to a line where they go together (Scale | Clamp outliers, More values than colors | No value), so
 * the dialog is at most 6 lines tall with no Advanced pop-over of its own (owner's input rules, 2026-11-24).
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.descriptor - the bound property
 * @param props.parts - what the source puts in the popover
 * @param props.detail - whether a group's detail has taken the popover over
 * @param props.v2 - Style panel v2
 * @returns The choices
 */
function RareChoices({
    session,
    descriptor,
    parts,
    detail,
    v2,
}: Readonly<{
    session: GraphSession;
    descriptor: ChannelDescriptor;
    parts: Parts;
    detail: boolean;
    v2: boolean;
}>): React.JSX.Element | null {
    const { binding, patch } = parts;
    const overflow =
        v2 && parts.categorical && !detail && overflowLine(session, descriptor, parts) ? (
            <OverflowField session={session} descriptor={descriptor} parts={parts} />
        ) : null;
    const noValue =
        detail || !parts.noValue ? null : (
            <NoValue
                session={session}
                descriptor={descriptor}
                missing={binding.missing ?? "skip"}
                patch={patch}
                segments={v2}
                // Its one value on its own line beside its choice, unless the line is already a pair.
                beside={overflow === null}
            />
        );
    if (!v2) {
        return noValue;
    }
    // What happens past the palette is a rare choice: it leaves the groups for the last line, beside No value.
    // A number's Scale is on its Operation line; a color ramp's has a line of its own.
    const isNumber = descriptor.accepts === "number";
    const rampScale = detail || isNumber ? null : parts.rampScale;
    const rampClamp = detail ? null : parts.rampClamp;
    if (rampScale === null && rampClamp === null && noValue === null && overflow === null) {
        return null;
    }
    return (
        <>
            {rampScale}
            {rampClamp}
            {overflow === null || noValue === null ? (overflow ?? noValue) : <Pair>{[overflow, noValue]}</Pair>}
        </>
    );
}

/**
 * Two choices that go together on one line, each half of it (owner's input rules: two inputs on a line where they
 * make sense together).
 * @param props - Component props
 * @param props.children - the two
 * @returns The line
 */
function Pair({ children }: Readonly<{ children: readonly [React.ReactNode, React.ReactNode] }>): React.JSX.Element {
    return (
        <Group grow gap={8} wrap="nowrap" align="flex-end" data-pair="">
            {children[0]}
            {children[1]}
        </Group>
    );
}

/**
 * A line with another choice beside it when there is one (a number's Operation and its Scale), else the line alone.
 * @param props - Component props
 * @param props.other - the choice beside it, or null
 * @param props.children - the line
 * @returns The line
 */
function Beside({
    other,
    children,
}: Readonly<{ other: React.ReactNode; children: React.ReactNode }>): React.JSX.Element {
    return other === null || other === undefined ? <>{children}</> : <Pair>{[children, other]}</Pair>;
}

/**
 * For groups: a way to read the value another way, the palette, the group list and what happens
 * past the palette.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.descriptor - the bound property
 * @param props.parts - what the source puts in the popover
 * @param props.detail - whether a group's detail has taken the popover over
 * @returns The section
 */
function GroupsSection({
    session,
    descriptor,
    parts,
    detail,
}: Readonly<{
    session: GraphSession;
    descriptor: ChannelDescriptor;
    parts: Parts;
    detail: boolean;
}>): React.JSX.Element {
    const { binding, patch } = parts;
    const isColor = descriptor.accepts === "color";
    const plain = isColor && !detail && !parts.asWritten;
    // "More values than colors" only when there are: more groups than the palette in force holds.
    // A choice made for it (a run's "Extend the palette") changes nothing while every group has a
    // color of its own, so it is not offered then either.
    const overflows = !stylePanelV2On(session) && overflowsPalette(session, binding, parts);
    return (
        <Stack gap={8}>
            {detail ? null : parts.readAs}
            {plain ? (
                <PaletteSelect
                    session={session}
                    channel={descriptor.channel}
                    value={binding.palette}
                    shown={parts.palette}
                    patch={patch}
                />
            ) : null}
            {parts.list}
            {plain && overflows ? <OverflowField session={session} descriptor={descriptor} parts={parts} /> : null}
        </Stack>
    );
}

/**
 * Whether the "More values than colors" line shows: a color read through a palette, its groups past it.
 * @param session - the element's session
 * @param descriptor - the bound property
 * @param parts - what the source puts in the popover
 * @returns whether it shows
 */
function overflowLine(session: GraphSession, descriptor: ChannelDescriptor, parts: Parts): boolean {
    return descriptor.accepts === "color" && !parts.asWritten && overflowsPalette(session, parts.binding, parts);
}

/**
 * Whether "More values than colors" applies: more groups than the palette in force holds. A choice
 * made for it (a run's "Extend the palette") changes nothing while every group has a color of its
 * own, so it is not offered then either.
 * @param session - the element's session
 * @param binding - the binding
 * @param parts - what the source puts in the popover
 * @returns whether the groups overflow the palette, or may
 */
function overflowsPalette(session: GraphSession, binding: LayerBinding, parts: Parts): boolean {
    const capacity = session.catalog.palettes().find((p) => p.id === (binding.palette ?? parts.palette))?.capacity;
    return parts.groups === undefined || capacity === undefined || capacity === null || parts.groups > capacity;
}

/**
 * What happens past the palette: "More values than colors", "More layers than colors".
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.descriptor - the bound property
 * @param props.parts - what the source puts in the popover
 * @returns The field
 */
function OverflowField({
    session,
    descriptor,
    parts,
}: Readonly<{ session: GraphSession; descriptor: ChannelDescriptor; parts: Parts }>): React.JSX.Element {
    const { binding, patch } = parts;
    const pick = (overflow: string): void => {
        // Keep the palette the groups are drawn in: with none named, the element picks its own for the new
        // overflow (a ramp for number groups), and "Extend the palette" would not extend the one shown.
        const shown = session.catalog.palettes().find((p) => p.kind === "categorical" && p.id === parts.palette)?.id;
        patch({ overflow: overflow as LayerBinding["overflow"], palette: binding.palette ?? shown });
    };
    if (stylePanelV2On(session)) {
        // Three choices are grouped buttons (design "Input rules"), with short words; the long ones are tooltips.
        return (
            <Captioned>
                <SegmentsLine
                    label={`More ${parts.noun} than colors`}
                    options={OVERFLOW_WORDS[descriptor.target].map((each) => ({
                        value: each.value,
                        name: OVERFLOW_SHORT[each.value] ?? each.label,
                        tip: each.label,
                    }))}
                    value={binding.overflow ?? "other"}
                    onPick={pick}
                />
            </Captioned>
        );
    }
    return (
        <PanelLabelsProvider showLabels>
            <FieldRow>
                <PanelField
                    label={`More ${parts.noun} than colors`}
                    kind="select"
                    width="fill"
                    data={[...OVERFLOW_WORDS[descriptor.target]]}
                    value={binding.overflow ?? "other"}
                    onChange={(overflow) => {
                        pick(String(overflow));
                    }}
                />
            </FieldRow>
        </PanelLabelsProvider>
    );
}

/**
 * Combine for a number: how the value meets the layers beneath.
 * @param props - Component props
 * @param props.name - the property's word
 * @param props.binding - the binding
 * @param props.patch - writes a change
 * @returns The field
 */
function CombineField({
    name,
    binding,
    patch,
}: Readonly<{
    name: string;
    binding: LayerBinding;
    patch: (change: Partial<LayerBinding>) => void;
}>): React.JSX.Element {
    return (
        <PanelLabelsProvider showLabels>
            <FieldRow>
                <PanelField
                    label={`How ${name.toLowerCase()} meets the layers beneath`}
                    kind="select"
                    width="fill"
                    data={COMBINE_SELECT}
                    value={binding.combine ?? "replace"}
                    onChange={(mode) => {
                        patch({ combine: combineOf(String(mode)) });
                    }}
                />
            </FieldRow>
        </PanelLabelsProvider>
    );
}

/** What a source puts in the popover's sections. */
interface Parts {
    readonly binding: LayerBinding;
    readonly patch: (change: Partial<LayerBinding>) => void;
    /** What the binding reads, in words. */
    readonly source: string;
    /** The paths Change source lists first: the one read now. */
    readonly inUse: readonly string[];
    /** What one group is called, in "More values than colors". */
    readonly noun: "values" | "layers";
    /** How many groups the colors must cover, when known. */
    readonly groups: number | undefined;
    /** Whether the binding reads groups (a category), so the group list and the palette show. */
    readonly categorical: boolean;
    /** Whether a color reads the values as colors, with no palette. */
    readonly asWritten: boolean;
    /** The palette it paints with when it names none. */
    readonly palette: string | undefined;
    readonly ramp: React.ReactNode;
    /** v2: the ramp's Scale (and Steps for a stepped scale); null without a ramp. */
    readonly rampScale: React.ReactNode;
    /** v2: the ramp's Clamp outliers line, with its percentiles or Fit to the data on it; null without a ramp. */
    readonly rampClamp: React.ReactNode;
    readonly readAs: React.ReactNode;
    readonly list: React.ReactNode;
    /** Whether No value shows. */
    readonly noValue: boolean;
}

/**
 * The sections a value of the data fills: the element's preview of the binding decides ramp or
 * groups.
 * @param session - the element's session.
 * @param props - the popover's props, for a value of the data.
 * @param onDetailChange - told when it opens or closes.
 * @returns the parts.
 */
function dataParts(
    session: GraphSession,
    props: Extract<BindingPopoverProps, { readonly layers?: undefined }>,
    onDetailChange: (open: boolean) => void,
): Parts {
    const { descriptor, layerId, binding, source, held = false, onChange } = props;
    const { channel } = descriptor;
    const isColor = descriptor.accepts === "color";
    const patch = (change: Partial<LayerBinding>): void => {
        onChange({ ...binding, ...change });
    };
    const preview = previewOf(session, binding, channel);
    const categorical = preview?.domain === null;
    const readable = readableOf(session, binding, descriptor.target);
    const asWritten = binding.scale === "passthrough";
    const part = { session, descriptor, layerId, binding, source, patch };
    return {
        binding,
        patch,
        source,
        inUse: [binding.by],
        noun: "values",
        groups: categorical ? preview.bins.length : undefined,
        categorical,
        asWritten,
        palette:
            preview?.palette ??
            session.styles.legendOf(layerId).find((b) => b.channel === channel)?.palette?.name ??
            undefined,
        ramp:
            preview !== null && !categorical && (isColor || descriptor.accepts === "number") ? (
                <Ramp {...part} preview={preview} />
            ) : null,
        rampScale:
            preview !== null && !categorical && (isColor || descriptor.accepts === "number") ? (
                <RampScale {...part} preview={preview} />
            ) : null,
        rampClamp:
            preview !== null && !categorical && (isColor || descriptor.accepts === "number") ? (
                <ClampLine binding={binding} patch={patch} />
            ) : null,
        readAs: (
            <>
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
            </>
        ),
        list: (
            <GroupList
                session={session}
                descriptor={descriptor}
                layerId={layerId}
                binding={binding}
                source={source}
                onDetailChange={onDetailChange}
                beside={stylePanelV2On(session)}
                {...(held ? { onHeld: onChange } : {})}
            />
        ),
        noValue: preview !== null && (categorical || !isColor),
    };
}

/**
 * The sections the selected layers fill as the source: each layer one group, always.
 * @param session - the element's session.
 * @param props - the popover's props, for Layer.
 * @returns the parts.
 */
function layerParts(
    session: GraphSession,
    props: Extract<BindingPopoverProps, { readonly layers: readonly LayerId[] }>,
): Parts {
    const { descriptor, layers, binding, onChange } = props;
    let palette: string | undefined;
    try {
        palette = session.styles.sequence(binding, { channel: descriptor.channel, count: 1 }).palette ?? undefined;
    } catch {
        palette = undefined;
    }
    return {
        binding,
        patch: (change) => {
            onChange({ ...binding, ...change });
        },
        source: "Layer",
        inUse: [],
        noun: "layers",
        groups: layers.length,
        categorical: true,
        asWritten: false,
        palette,
        ramp: null,
        rampScale: null,
        rampClamp: null,
        readAs: null,
        list: (
            <LayerGroupList
                session={session}
                descriptor={descriptor}
                layers={layers}
                binding={binding}
                onChange={onChange}
            />
        ),
        noValue: true,
    };
}

/**
 * What the binding reads, and Change source, which opens the value list in place to read another.
 * @param props - Component props
 * @param props.descriptor - the bound property
 * @param props.source - what it reads, in words
 * @param props.byLayer - the source is Layer: set off as the field's pill sets it off
 * @param props.inUse - the path it reads now, listed first; none for Layer
 * @param props.onSource - reads another attribute or result instead
 * @returns The line and, while choosing, the list
 */
function SourceHeader({
    descriptor,
    source,
    byLayer,
    inUse,
    onSource,
}: Readonly<{
    descriptor: ChannelDescriptor;
    source: string;
    byLayer: boolean;
    inUse: readonly string[];
    onSource: (choice: DataChoice) => void;
}>): React.JSX.Element {
    const [choosing, setChoosing] = useState(false);
    return (
        <>
            <Group justify="space-between" wrap="nowrap">
                <Text size="xs">
                    Source:{" "}
                    {byLayer ? (
                        // The marks are drawn, not spoken: a screen reader says "Layer".
                        <Text span inherit fw={600} c="var(--cm-text-component)" data-layer-source>
                            <span aria-hidden>{LAYER_TOKEN.slice(0, 1)}</span>
                            {LAYER_TOKEN.slice(1, -1)}
                            <span aria-hidden>{LAYER_TOKEN.slice(-1)}</span>
                        </Text>
                    ) : (
                        <strong>{source}</strong>
                    )}
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
                    channel={descriptor.channel}
                    inUse={inUse}
                    onPick={(choice) => {
                        setChoosing(false);
                        onSource(choice);
                    }}
                    onClose={() => {
                        setChoosing(false);
                    }}
                />
            ) : null}
        </>
    );
}

/**
 * The categorical palettes, each drawn as a strip.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.channel - the property the palette paints, which its reset names
 * @param props.value - the palette the binding names
 * @param props.shown - the palette it paints with when it names none
 * @param props.patch - writes the pick
 * @param props.inForceShown - unset, show the palette in force as the field's value (Style panel v2's rule that every
 *     input shows a value), not as its placeholder
 * @returns The select
 */
export function PaletteSelect({
    session,
    channel,
    value,
    shown,
    patch,
    inForceShown = false,
}: Readonly<{
    session: GraphSession;
    channel: ChannelDescriptor["channel"];
    value: string | undefined;
    shown: string | undefined;
    patch: (change: { palette: string | undefined }) => void;
    inForceShown?: boolean;
}>): React.JSX.Element {
    const palettes = session.catalog.palettes().filter((p) => p.kind === "categorical");
    const inForce = shown ?? palettes.at(0)?.id;
    const strips = Object.fromEntries(
        palettes.map((p) => [
            p.id,
            <span
                key={p.id}
                aria-hidden
                style={{
                    display: "block",
                    width: 16,
                    height: 8,
                    marginBlock: 4,
                    borderRadius: 2,
                    background: `linear-gradient(to right, ${p.colors.slice(0, 8).join(", ")})`,
                }}
            />,
        ]),
    );
    // Unset, the field holds nothing: the palette in force is its placeholder and its name says
    // it is not set, so the open list checks no palette as if one were chosen.
    const name = value === undefined && inForce !== undefined ? `Palette, not set, ${paletteWord(inForce)}` : "Palette";
    return (
        <Stack gap={2}>
            <span className="cm-field-label" aria-hidden="true">
                Palette
            </span>
            <FieldRow
                trailing={
                    value !== undefined && (
                        <ResetButton
                            label="Palette"
                            fullLabel={`Reset the ${channelPhrase(channel)} palette to default`}
                            onClick={() => {
                                patch({ palette: undefined });
                            }}
                        />
                    )
                }
            >
                <PanelField
                    label={name}
                    kind="select"
                    width="fill"
                    data={palettes.map((p) => ({ value: p.id, label: paletteWord(p.id) }))}
                    value={value ?? (inForceShown ? (inForce ?? null) : null)}
                    placeholder={value === undefined && inForce !== undefined ? paletteWord(inForce) : undefined}
                    glyph={strips[value ?? inForce ?? ""]}
                    optionGlyphs={strips}
                    onChange={(palette) => {
                        patch({ palette: String(palette) });
                    }}
                />
            </FieldRow>
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
    patch: (change: Partial<LayerBinding>) => void;
}

/**
 * Adds a layer whose rule is one value or one step of what the binding reads, and opens it: "New
 * layer from selection" with the rule filled in, so it goes where that door puts one, on top of
 * the stack, and nothing above paints over it (a binding on Everything has every run's layer above
 * it). It starts on the
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
        { above: topmostRow(session)?.id ?? layerId },
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
            store.set({ inspected: { kind: "layer-row", id }, announcement: `Layer ${name} added on top` });
            focusLineNext(session, channel);
        })
        .catch((error: unknown) => {
            store.set({ notice: { message: failureWords("The layer", "added", error), error: true } });
        });
}

/**
 * The numeric scales a ramp can read through, in words.
 * @param session - the element's session
 * @returns the scales
 */
function numericScales(session: GraphSession): { value: string; label: string }[] {
    return session.catalog
        .scales()
        .filter((s) => s.domainKind === "numeric")
        .map((s) => ({ value: s.name, label: SCALE_WORDS[s.name] ?? enumWords(s.name) }));
}

/**
 * A stepped scale's Steps field. An element, not a component, so a `FieldRow` reads its caption from it.
 * @param binding - the binding.
 * @param preview - the element's preview of it.
 * @param patch - writes a change.
 * @returns The field.
 */
function stepsField(
    binding: DataBinding,
    preview: PartProps["preview"],
    patch: (change: Partial<DataBinding>) => void,
): React.JSX.Element {
    return (
        <PanelField
            label="Steps"
            kind="number"
            width="fill"
            value={binding.bins ?? preview.stepCounts.length}
            min={2}
            max={12}
            decimalScale={0}
            onChange={(bins) => {
                patch({ bins: Number(bins) });
            }}
        />
    );
}

/**
 * Clamp outliers' switch or checkbox: on, it clamps at the 2nd and 98th percentiles.
 * @param clamp - the clamp, if on.
 * @param patch - writes a change.
 * @param control - a switch, or a checkbox (Style panel v2).
 * @returns The toggle.
 */
function clampToggle(
    clamp: DataBinding["clamp"],
    patch: (change: Partial<DataBinding>) => void,
    control: "switch" | "checkbox",
): React.JSX.Element {
    return (
        <ToggleRow
            label="Clamp outliers"
            control={control}
            checked={clamp !== undefined}
            onChange={(on) => {
                patch(on ? { clamp: [2, 98], domain: undefined } : { clamp: undefined });
            }}
        />
    );
}

/**
 * The clamp's two percentile fields. Elements, not components, so a `FieldRow` reads their captions.
 * @param clamp - the clamp.
 * @param patch - writes a change.
 * @returns The lowest and the highest percentile.
 */
function percentileFields(
    clamp: NonNullable<DataBinding["clamp"]>,
    patch: (change: Partial<DataBinding>) => void,
): React.JSX.Element[] {
    return [
        <PanelField
            key="low"
            label="Lowest percentile"
            kind="number"
            width="fill"
            value={clamp[0]}
            min={0}
            max={clamp[1]}
            onChange={(low) => {
                patch({ clamp: [Number(low), clamp[1]] });
            }}
        />,
        <PanelField
            key="high"
            label="Highest percentile"
            kind="number"
            width="fill"
            value={clamp[1]}
            min={clamp[0]}
            max={100}
            onChange={(high) => {
                patch({ clamp: [clamp[0], Number(high)] });
            }}
        />,
    ];
}

/**
 * v2: a ramp's Scale, and for a stepped scale its Steps beside it, on one line (a number's is beside its Operation).
 * Its reset clears both.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.binding - the binding
 * @param props.preview - the element's preview of it
 * @param props.patch - writes a change
 * @returns The line
 */
function RampScale({ session, binding, preview, patch }: Readonly<PartProps>): React.JSX.Element {
    const scale = binding.scale ?? preview.scale;
    const stepped = scale === "bins" || scale === "quantile";
    return (
        <PanelLabelsProvider showLabels>
            <FieldRow
                trailing={
                    (binding.scale !== undefined || binding.bins !== undefined) && (
                        <ResetButton
                            label="Scale"
                            onClick={() => {
                                patch({ scale: undefined, bins: undefined });
                            }}
                        />
                    )
                }
            >
                <PanelField
                    label="Scale"
                    kind="select"
                    width="fill"
                    // Unset, it shows the scale in force.
                    data={numericScales(session)}
                    value={scale}
                    onChange={(next) => {
                        patch({ scale: String(next), palette: binding.palette });
                    }}
                />
                {stepped ? stepsField(binding, preview, patch) : null}
            </FieldRow>
        </PanelLabelsProvider>
    );
}

/**
 * v2: Clamp outliers on one line with what it brings: its two percentiles once on, or Fit to the data once the
 * ramp's extent is set by hand (a clamp and a hand-set extent exclude each other), so the link dialog never grows a
 * line for them (owner's input rules: at most 6 components tall).
 * @param props - Component props
 * @param props.binding - the binding
 * @param props.patch - writes a change
 * @returns The line
 */
function ClampLine({
    binding,
    patch,
}: Readonly<{ binding: DataBinding; patch: (change: Partial<DataBinding>) => void }>): React.JSX.Element {
    const { clamp, domain } = binding;
    return (
        <Group gap={8} wrap="nowrap" align="flex-end" data-clamp-line="">
            {clampToggle(clamp, patch, "checkbox")}
            {clamp === undefined ? null : (
                <PanelLabelsProvider showLabels>
                    <FieldRow groupLabel="Clamp at percentiles" style={{ flex: "1 1 auto", minWidth: 0 }}>
                        {percentileFields(clamp, patch)}
                    </FieldRow>
                </PanelLabelsProvider>
            )}
            {domain === undefined || domain === "auto" ? null : <FitToData patch={patch} />}
        </Group>
    );
}

/**
 * Fit to the data: takes back an extent set by hand on the ramp.
 * @param props - Component props
 * @param props.patch - writes a change
 * @returns The button
 */
function FitToData({ patch }: Readonly<{ patch: (change: Partial<DataBinding>) => void }>): React.JSX.Element {
    return (
        <Button
            size="compact-xs"
            variant="subtle"
            onClick={() => {
                patch({ domain: undefined });
            }}
        >
            Fit to the data
        </Button>
    );
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
function Ramp({
    session,
    descriptor,
    layerId,
    binding,
    source,
    preview,
    patch,
}: Readonly<PartProps>): React.JSX.Element {
    const { store } = useWorkspace();
    const isColor = descriptor.accepts === "color";
    const domain = preview.domain ?? [0, 0];
    const scale = binding.scale ?? preview.scale;
    const scales = numericScales(session);
    // v2: Scale and Clamp outliers are on lines of their own (RampScale, ClampLine).
    const v2 = stylePanelV2On(session);
    const palettes = session.catalog.palettes().filter((p) => p.kind !== "categorical");
    const shownPalette = session.styles.legendOf(layerId).find((block) => block.channel === descriptor.channel)
        ?.palette?.name;
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
                // Inside a binding every field shows what it paints now, a default included.
                scales={v2 ? undefined : scales}
                onScaleChange={(next) => {
                    patch({ scale: next, palette: binding.palette });
                }}
                {...(isColor
                    ? {
                          palette: binding.palette,
                          defaultPalette: preview.palette ?? shownPalette ?? palettes[0]?.id,
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
                              const start = cssOf(startingValue(descriptor, session)) ?? "#999999";
                              patch({ missing: paint ? { value: start } : "skip" });
                          },
                      }
                    : {})}
            />
            {/* v2: Fit to the data and Steps are on the Clamp outliers and Scale lines (ClampLine, RampScale). */}
            {!v2 && binding.domain !== undefined && binding.domain !== "auto" ? <FitToData patch={patch} /> : null}
            {v2 ? null : <Clamp binding={binding} patch={patch} />}
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
            {!v2 && (scale === "bins" || scale === "quantile") ? (
                <PanelLabelsProvider showLabels>
                    <FieldRow
                        trailing={
                            binding.bins !== undefined && (
                                <ResetButton
                                    label="Steps"
                                    onClick={() => {
                                        patch({ bins: undefined });
                                    }}
                                />
                            )
                        }
                    >
                        {stepsField(binding, preview, patch)}
                    </FieldRow>
                </PanelLabelsProvider>
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
}: Readonly<{
    binding: DataBinding;
    patch: (change: Partial<DataBinding>) => void;
}>): React.JSX.Element {
    const { clamp } = binding;
    return (
        <Stack gap={4}>
            {clampToggle(clamp, patch, "switch")}
            {clamp === undefined ? null : (
                <Group grow gap={8} role="group" aria-label="Clamp at percentiles">
                    {percentileFields(clamp, patch).map((field) => (
                        <PanelLabelsProvider key={field.key} showLabels>
                            <FieldRow>{field}</FieldRow>
                        </PanelLabelsProvider>
                    ))}
                </Group>
            )}
        </Stack>
    );
}

/**
 * One step, in the order of Figma's paint rows: its name and count, then its actions -- Select
 * these, and "New layer for <step>". Every control is named with the source and the value, so a list of them reads apart.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.target - nodes or edges
 * @param props.source - what the binding reads, in words
 * @param props.name - the value or the step in words
 * @param props.count - how many elements it paints
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
    where,
    onNewLayer,
}: Readonly<{
    session: GraphSession;
    target: ChannelDescriptor["target"];
    source: string;
    name: string;
    count: number;
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
        void session.selection.apply(
            { scope: { define: { kind: "rule", where: rule, reading: "clipped" } } },
            "replace",
            { cause: "user" },
        );
    };
    return (
        // One line: the name, the count with its unit, then fixed 24 px columns (an empty Clear
        // column, actions), so the columns line up row to row.
        <Group role="listitem" aria-label={`${name}, ${counted}`} gap={4} wrap="nowrap">
            <Text size="xs" truncate style={{ flex: 1, minWidth: 0 }}>
                {name}
            </Text>
            <Text size="xs" c="dimmed" style={{ flex: "none" }}>
                {counted}
            </Text>
            <Box w={24} style={{ flex: "none" }} data-clear-column />
            <Menu withinPortal={false} position="bottom-end">
                <Menu.Target>
                    {/* An icon alone, so it says its name on hover. */}
                    <Tooltip label={`${full} actions`}>
                        <ActionIcon variant="subtle" size="sm" aria-label={`${full} actions`}>
                            <GLYPHS.more size={14} aria-hidden />
                        </ActionIcon>
                    </Tooltip>
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
 * @param props.captions - Style panel v2: the names are compact-mantine's captions above the boxes
 * @returns The two fields
 */
function Range({
    descriptor,
    range,
    patch,
    captions = false,
}: Readonly<{
    descriptor: ChannelDescriptor;
    range: DataBinding["range"];
    patch: (change: Partial<DataBinding>) => void;
    /** Style panel v2: the names are compact-mantine's captions above the boxes. */
    captions?: boolean;
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
    const labels = [`${channelWord(descriptor.channel)} from`, `${channelWord(descriptor.channel)} to`] as const;
    const box = (label: string, index: 0 | 1): React.JSX.Element => (
        <ComboInput
            label={label}
            numeric
            variant="outlined"
            options={[]}
            placeholder="Not set"
            value={draft[index]}
            min={descriptor.min}
            max={descriptor.max}
            onChange={(value) => {
                set(index, value);
            }}
        />
    );
    if (captions) {
        // v2: compact-mantine's captions above the pair (owner, 2026-11-24: names above, never the app's own).
        return (
            <PanelLabelsProvider showLabels>
                <FieldRow groupLabel="Range">
                    {box(labels[0], 0)}
                    {box(labels[1], 1)}
                </FieldRow>
            </PanelLabelsProvider>
        );
    }
    return (
        <Group grow gap={8} role="group" aria-label="Range">
            {/* Named for what it sets: "Size from", "Size to", never "Paints" on a size. */}
            {labels.map((label, index) => (
                // A visible label over each box, as the ramp's "Values from" and "Values to" have.
                <label key={label} style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                    <span className="cm-field-label">{label}</span>
                    {box(label, index === 0 ? 0 : 1)}
                </label>
            ))}
        </Group>
    );
}

/**
 * No value: leave an element with no value as the layers beneath paint it, or give it one value.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.descriptor - the bound property
 * @param props.missing - the binding's `missing`
 * @param props.patch - writes a change
 * @param props.segments - draws the two choices as grouped buttons (Style panel v2)
 * @param props.beside - Style panel v2: its one value beside its choice on the same line, not under it
 * @returns The control
 */
function NoValue({
    session,
    descriptor,
    missing,
    patch,
    segments,
    beside = false,
}: Readonly<{
    session: GraphSession;
    descriptor: ChannelDescriptor;
    missing: NonNullable<DataBinding["missing"]>;
    patch: (change: Partial<LayerBinding>) => void;
    /** Style panel v2: two choices are grouped buttons (design "Input rules"). */
    segments: boolean;
    /** Style panel v2: its one value beside its choice on the same line (so the dialog stays 6 lines tall). */
    beside?: boolean;
}>): React.JSX.Element {
    const given = missing === "skip" ? null : missing.value;
    // One value starts where a new line of this property would: the element's default for it.
    const raw = startingValue(descriptor, session);
    const start: string | number =
        typeof raw === "number" || typeof raw === "string" ? raw : (toColorValue(raw as ColorInput)?.hex ?? "");
    // The field the property's own row draws: a color, a number, a shape or pattern, or words.
    const field =
        given === null ? null : (
            <ValueField
                descriptor={descriptor}
                label="Value"
                value={given}
                shown={start}
                onChange={(value) => {
                    patch({ missing: { value: typeof value === "boolean" ? String(value) : value } });
                }}
            />
        );
    const pick = (choice: string): void => {
        patch({ missing: choice === "value" ? { value: start } : "skip" });
    };
    if (segments) {
        const choice = (
            <Captioned>
                <SegmentsLine
                    label="No value"
                    options={[
                        { value: "skip", name: "Leave as is" },
                        { value: "value", name: "One value" },
                    ]}
                    value={given === null ? "skip" : "value"}
                    onPick={pick}
                />
            </Captioned>
        );
        if (beside && field !== null) {
            return <Pair>{[choice, <Captioned key="value">{field}</Captioned>]}</Pair>;
        }
        return (
            <Stack gap={4}>
                {choice}
                {field}
            </Stack>
        );
    }
    return (
        <Stack gap={4}>
            <PanelLabelsProvider showLabels>
                <FieldRow>
                    <PanelField
                        label="No value"
                        kind="select"
                        width="fill"
                        // Always a choice in force: "Leave as is" is a choice, not a missing one.
                        data={[
                            { value: "skip", label: "Leave as is" },
                            { value: "value", label: "Use one value" },
                        ]}
                        value={given === null ? "skip" : "value"}
                        onChange={(choice) => {
                            pick(String(choice));
                        }}
                    />
                </FieldRow>
            </PanelLabelsProvider>
            {field}
        </Stack>
    );
}
