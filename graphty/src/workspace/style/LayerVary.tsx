import { StyleSelect } from "@graphty/compact-mantine";
import type { ChannelDescriptor } from "@graphty/graphty-element/catalog";
import type { Channel, ChannelValue, LayerId } from "@graphty/graphty-element/schema";
import type { GraphSession, StyleSequence } from "@graphty/graphty-element/session";
import { Button, Text } from "@mantine/core";
import React, { useState } from "react";

import { OVERFLOW_WORDS, Range } from "./BindingPopover";
import { appRange, groupPalettes } from "./row";
import { ValueField } from "./ValueField";
import { channelWord, hexOf, paletteWord, valueFieldKind } from "./words";

/** One layer's values: the property's, and the overflow's second cue's when it steps one. */
export type LayerValues = Readonly<Partial<Record<Channel, ChannelValue>>>;

/** What a property varied by Layer writes: the values of the first `count` layers in list order. */
export type LayerSequence = (count: number) => readonly LayerValues[];

/** What the sequence's binding reads beyond the palette: the parts this panel sets. */
type SequenceBinding = Parameters<GraphSession["styles"]["sequence"]>[0];

/**
 * A painted value as it is written back as a plain value: a color's hex, a number or words.
 * @param paint - what the element paints.
 * @returns the value, or undefined when it paints nothing.
 */
function literalOf(paint: unknown): ChannelValue | undefined {
    if (typeof paint === "number" || typeof paint === "string") {
        return paint;
    }
    return hexOf(paint)?.toUpperCase();
}

/**
 * The element's sequence for a binding, or null when it refuses it.
 * @param session - the element's session.
 * @param binding - the binding.
 * @param channel - the channel.
 * @param count - how many layers.
 * @returns the sequence, or null.
 */
function sequenceOf(
    session: GraphSession,
    binding: SequenceBinding,
    channel: Channel,
    count: number,
): StyleSequence | null {
    try {
        return session.styles.sequence(binding, { channel, count });
    } catch {
        return null;
    }
}

/** Props for LayerVary. */
interface LayerVaryProps {
    readonly session: GraphSession;
    readonly descriptor: ChannelDescriptor;
    /** The layers it gives a value each, in list order (top first), with their row names. */
    readonly layers: readonly { readonly id: LayerId; readonly name: string }[];
    /** Writes each layer its value. */
    readonly onApply: (sequence: LayerSequence) => void;
    readonly onCancel: () => void;
}

/**
 * Vary by Layer: the property's own per-value control -- a palette (and what happens past it) for a
 * color, a range for a number -- spread over the layers in list order by graphty-element's
 * `styles.sequence`; one line per layer with its new value, each editable; then Apply, which writes
 * each layer its own plain value, and Cancel.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.descriptor - the property
 * @param props.layers - the layers, top first
 * @param props.onApply - writes the values
 * @param props.onCancel - drops them
 * @returns The preview
 */
export function LayerVary({ session, descriptor, layers, onApply, onCancel }: LayerVaryProps): React.JSX.Element {
    const { channel } = descriptor;
    const isColor = descriptor.accepts === "color";
    const isNumber = valueFieldKind(descriptor) === "number";
    const palettes = isColor ? groupPalettes(session) : [];
    const [palette, setPalette] = useState<string | undefined>(palettes[0]?.id);
    const [overflow, setOverflow] = useState<string>("extend");
    const [range, setRange] = useState<[number, number] | undefined>(appRange(channel).range);
    // A line edited by hand keeps its value whatever the palette or range does.
    const [edits, setEdits] = useState<Readonly<Record<number, ChannelValue>>>({});
    const binding: SequenceBinding = {
        ...(palette === undefined ? {} : { palette }),
        ...(isColor ? { overflow: overflow as SequenceBinding["overflow"] } : {}),
        ...(range === undefined ? {} : { range: [range[0], range[1]] }),
    };
    const shown = sequenceOf(session, binding, channel, layers.length);
    const capacity = palettes.find((p) => p.id === palette)?.colors.length ?? Number.POSITIVE_INFINITY;
    const name = channelWord(channel);
    const sequence: LayerSequence = (count) => {
        const seq = sequenceOf(session, binding, channel, count);
        return Array.from({ length: count }, (_, at) => {
            const value = edits[at] ?? literalOf(seq?.values[at]);
            const cue = seq?.cue === null || seq?.cue === undefined ? undefined : literalOf(seq.cue.values[at]);
            return {
                ...(value === undefined ? {} : { [channel]: value }),
                ...(cue === undefined || seq?.cue === null || seq?.cue === undefined ? {} : { [seq.cue.channel]: cue }),
            };
        });
    };
    return (
        <div className="ws-bulk-vary" role="group" aria-label={`${name} by layer`}>
            {palettes.length === 0 ? null : (
                <StyleSelect
                    label="Palette"
                    value={palette}
                    defaultValue={palettes[0].id}
                    options={palettes.map((p) => ({
                        value: p.id,
                        label: paletteWord(p.id),
                        glyph: (
                            <span
                                aria-hidden
                                className="ws-bulk-vary-palette"
                                style={{ background: `linear-gradient(to right, ${p.colors.slice(0, 8).join(", ")})` }}
                            />
                        ),
                    }))}
                    onChange={(next) => {
                        setPalette(next);
                    }}
                />
            )}
            {isColor && layers.length > capacity ? (
                <StyleSelect
                    label="More layers than colors"
                    value={overflow}
                    defaultValue="extend"
                    placeholder=""
                    // Folding into Other would leave layers with no color of their own.
                    options={OVERFLOW_WORDS[descriptor.target].filter((o) => o.value !== "other")}
                    onChange={(next) => {
                        setOverflow(next ?? "extend");
                    }}
                />
            ) : null}
            {isNumber ? (
                <Range
                    key={String(range)}
                    descriptor={descriptor}
                    range={
                        range ??
                        (typeof shown?.values[0] === "number" && typeof shown.values.at(-1) === "number"
                            ? [shown.values[0], shown.values.at(-1) as number]
                            : undefined)
                    }
                    patch={(change) => {
                        if (change.range !== undefined) {
                            setRange([change.range[0], change.range[1]]);
                        }
                    }}
                />
            ) : null}
            <Text className="ws-bulk-words">Each layer gets its own value:</Text>
            <ul className="ws-bulk-vary-list">
                {layers.map((layer, at) => {
                    const value = edits[at] ?? literalOf(shown?.values[at]);
                    const cue = shown?.cue?.values[at];
                    return (
                        <li key={layer.id} data-layer={layer.id} aria-label={layer.name}>
                            <Text span truncate className="ws-bulk-vary-name ws-bulk-words">
                                {layer.name}
                            </Text>
                            {typeof cue === "string" ? (
                                <Text size="xs" span data-cue>
                                    {cue}
                                </Text>
                            ) : null}
                            <ValueField
                                compact
                                descriptor={descriptor}
                                label={`${name} of ${layer.name}`}
                                value={value}
                                shown={value}
                                onChange={(next) => {
                                    if (typeof next !== "boolean") {
                                        setEdits({ ...edits, [at]: next });
                                    }
                                }}
                            />
                        </li>
                    );
                })}
            </ul>
            <div className="ws-bulk-vary-actions">
                <Button
                    size="compact-xs"
                    disabled={shown === null}
                    onClick={() => {
                        onApply(sequence);
                    }}
                >
                    Apply
                </Button>
                <Button size="compact-xs" variant="subtle" onClick={onCancel}>
                    Cancel
                </Button>
            </div>
        </div>
    );
}
