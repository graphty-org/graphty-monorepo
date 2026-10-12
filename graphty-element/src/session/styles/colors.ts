/**
 * @file The fixed colours a set of layers writes, and the patch that swaps one of them.
 *
 * "Fixed" is what an author typed: a channel's set value, a literal binding, and a value-table
 * (`map`) entry. A palette or a ramp is not listed: its colours are the palette's, not the
 * layer's. Two spellings of one colour (`#d55e00`, `#D55E00`, `rgb(213, 94, 0)`) are one colour,
 * compared by the hex {@link toColorValue} gives.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import type { Binding, Channel, ChannelValue, LayerId, LayerSpec, Rgba } from "../../catalog/types";
import { channelDescriptor, toColorValue } from "./channels";
import type { Layer } from "./Layer";

/** One place a layer writes a colour. */
export interface ColorWrite {
    /** The layer that writes it. */
    readonly layer: LayerId;
    /** The channel it is written to. */
    readonly channel: Channel;
    /**
     * The value whose value-table (`map`) entry it is, as the table spells it, which is what
     * `styles.setValueEntry` takes back; absent for a fixed value.
     */
    readonly value?: string | number | boolean;
}

/** One colour some layers write, with every place they write it. */
export interface StyleColor {
    /** The colour as `#rrggbb`, or `#rrggbbaa` when it is not opaque. */
    readonly color: string;
    /** Every place it is written, in paint order (bottom layer first). */
    readonly writes: readonly ColorWrite[];
}

/**
 * The hex a value normalizes to, when it is a colour.
 * @param value - Anything a layer wrote.
 * @returns `#rrggbb` or `#rrggbbaa`, or null.
 */
function hexOf(value: unknown): string | null {
    if (typeof value !== "string" && (typeof value !== "object" || value === null)) {
        return null;
    }

    return toColorValue(value as string | Rgba)?.hex ?? null;
}

/**
 * Whether a channel takes a colour.
 * @param channel - The channel.
 * @returns True for a colour channel.
 */
function isColorChannel(channel: string): channel is Channel {
    return channelDescriptor(channel)?.accepts === "color";
}

/**
 * Every fixed colour a layer writes, in the order the layer names them.
 * @param layer - The layer.
 * @returns Its writes, each with its normalized hex.
 */
function writesOf(layer: Layer): { hex: string; write: ColorWrite }[] {
    const found: { hex: string; write: ColorWrite }[] = [];
    const push = (value: unknown, channel: Channel, entry?: string): void => {
        const hex = hexOf(value);
        if (hex !== null) {
            found.push({ hex, write: { layer: layer.id, channel, ...(entry === undefined ? {} : { value: entry }) } });
        }
    };

    for (const [channel, value] of Object.entries(layer.set ?? {})) {
        if (isColorChannel(channel)) {
            push(value, channel);
        }
    }

    for (const [channel, binding] of Object.entries(layer.encode ?? {}) as [string, Binding | undefined][]) {
        if (binding === undefined || !isColorChannel(channel)) {
            continue;
        }

        if ("value" in binding) {
            push(binding.value, channel);
            continue;
        }

        for (const [entry, value] of Object.entries(binding.map ?? {})) {
            push(value, channel, entry);
        }
    }

    return found;
}

/**
 * The fixed colours some layers write, one entry per colour.
 * @param layers - The layers, bottom first.
 * @returns The colours, in the order they are first met.
 */
export function colorsOf(layers: readonly Layer[]): readonly StyleColor[] {
    const byHex = new Map<string, ColorWrite[]>();
    for (const layer of layers) {
        for (const { hex, write } of writesOf(layer)) {
            const list = byHex.get(hex) ?? [];
            list.push(write);
            byHex.set(hex, list);
        }
    }

    return Object.freeze([...byHex].map(([color, writes]) => Object.freeze({ color, writes: Object.freeze(writes) })));
}

/**
 * The patch that writes `to` wherever a layer writes `from` as a fixed colour.
 * @param layer - The layer.
 * @param from - The colour replaced, normalized.
 * @param to - The colour written, as the caller spelled it.
 * @returns The patch, or null when the layer does not write `from`.
 */
export function replaceColorPatch(layer: Layer, from: string, to: string): Pick<LayerSpec, "set" | "encode"> | null {
    let changed = false;
    const swap = (value: ChannelValue | string | number): ChannelValue => {
        if (hexOf(value) === from) {
            changed = true;
            return to;
        }

        return value;
    };

    const set = Object.fromEntries(
        Object.entries(layer.set ?? {}).map(([channel, value]) => [
            channel,
            isColorChannel(channel) ? swap(value) : value,
        ]),
    );
    const encode = Object.fromEntries(
        (Object.entries(layer.encode ?? {}) as [string, Binding | undefined][]).map(([channel, binding]) => {
            if (binding === undefined || !isColorChannel(channel)) {
                return [channel, binding];
            }

            if ("value" in binding) {
                return [channel, { ...binding, value: swap(binding.value) }];
            }

            return binding.map === undefined
                ? [channel, binding]
                : [
                      channel,
                      {
                          ...binding,
                          map: Object.fromEntries(
                              Object.entries(binding.map).map(([entry, value]) => [entry, swap(value)]),
                          ),
                      },
                  ];
        }),
    );

    if (!changed) {
        return null;
    }

    return {
        ...(layer.set === undefined ? {} : { set }),
        ...(layer.encode === undefined ? {} : { encode }),
    };
}
