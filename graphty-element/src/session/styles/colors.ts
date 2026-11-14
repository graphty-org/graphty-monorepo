/**
 * @file The fixed colours a set of layers writes, and the patch that swaps one of them.
 *
 * "Fixed" is what an author typed: a channel's set value, a literal binding, and a value-table
 * (`map`) entry. A palette or a ramp is not listed: its colours are the palette's, not the
 * layer's. Two spellings of one colour (`#d55e00`, `#D55E00`, `rgb(213, 94, 0)`) are one colour,
 * compared by the hex {@link toColorValue} gives.
 *
 * Two colours "fall on the same gray" when their CIE L* lightness differs by less than a threshold
 * ({@link grayCollisionsOf}): what a grayscale print or a reader without colour vision sees.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import type { Binding, Channel, ChannelValue, LayerId, LayerSpec, Rgba } from "../../catalog/types";
import { channelDescriptor, toColorValue } from "./channels";
import type { Layer } from "./Layer";
import { type LegendBlock, luminance } from "./legend";

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

        if (!("by" in binding)) {
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

            return !("by" in binding) || binding.map === undefined
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

/**
 * The smallest difference in lightness, in CIE L* units (0 black to 100 white), two colours keep
 * before `styles.grayCollisions()` lists them as falling on the same gray, unless the caller
 * gives a threshold of its own.
 */
export const DEFAULT_GRAY_THRESHOLD = 10;

/** One place a colour is drawn: the layer, the channel and, for a value table or palette row, the value. */
export interface StyleGrayUse {
    /** The layer that draws it. */
    readonly layer: LayerId;
    /** The channel it is drawn on, such as `node.color` or `edge.color`. */
    readonly channel: Channel;
    /** The data value painted this colour, for a row of a category encoding; absent for a fixed colour. */
    readonly value?: unknown;
}

/** One colour of a {@link StyleGrayCollision}. */
export interface StyleGrayColor {
    /** The colour as `#rrggbb`, or `#rrggbbaa` when it is not opaque. */
    readonly color: string;
    /** Its CIE L* lightness, 0 (black) to 100 (white): the gray it prints as. */
    readonly lightness: number;
    /** Every place the shown layers draw it, bottom layer first. */
    readonly uses: readonly StyleGrayUse[];
}

/** Two colours in use whose lightness differs by less than the threshold: they print as one gray. */
export interface StyleGrayCollision {
    /** The two colours, the darker first. */
    readonly colors: readonly [StyleGrayColor, StyleGrayColor];
    /** How far apart their lightness is, in CIE L* units (0 to 100). */
    readonly difference: number;
}

/** What `styles.grayCollisions()` checks against. */
export interface StyleGrayCollisionOptions {
    /**
     * Two colours whose CIE L* lightness (0 to 100) differs by less than this collide. Default 10.
     */
    readonly threshold?: number;
}

/**
 * The CIE L* lightness of a colour (D65 white), from its WCAG relative luminance.
 * @param color - The colour, each channel 0 to 255.
 * @param color.r - Red.
 * @param color.g - Green.
 * @param color.b - Blue.
 * @returns L*, 0 (black) to 100 (white).
 */
export function lightnessOf(color: { r: number; g: number; b: number }): number {
    const y = luminance(color);
    // CIE 1976: f(t) = cube root above (6/29)^3, a line below it.
    const f = y > 216 / 24_389 ? Math.cbrt(y) : (y * 24_389) / 27 / 116 + 16 / 116;
    return 116 * f - 16;
}

/**
 * The colours one legend block draws, each with where: none for a colour ramp, whose steps blend
 * on purpose, for a block painting nothing now, or for a channel that is not a colour; and no row
 * a layer above paints over.
 * @param block - The block.
 * @returns Each colour and its use.
 */
export function grayUsesOf(block: LegendBlock): { color: string; use: StyleGrayUse }[] {
    const ramp = block.kind === "sequential" || block.kind === "diverging";
    if (ramp || block.painted === 0 || !isColorChannel(block.channel)) {
        return [];
    }

    const use = { layer: block.layerId, channel: block.channel };
    return block.swatches
        .filter((swatch) => swatch.color !== undefined && swatch.paintedOverBy === undefined && swatch.hidden !== true)
        .map((swatch) => ({
            color: swatch.color ?? "",
            use: block.kind === "literal" ? use : { ...use, value: swatch.value },
        }));
}

/**
 * Every pair of distinct colours whose lightness differs by less than the threshold.
 * @param uses - Each colour drawn and where, in paint order; one colour may be listed many times.
 * @param threshold - The smallest L* difference that does not collide.
 * @returns The pairs, closest first.
 */
export function grayCollisionsOf(
    uses: readonly { readonly color: string; readonly use: StyleGrayUse }[],
    threshold: number,
): readonly StyleGrayCollision[] {
    const byHex = new Map<string, { lightness: number; uses: StyleGrayUse[] }>();
    for (const { color, use } of uses) {
        const value = toColorValue(color);
        if (value === null) {
            continue;
        }

        const entry = byHex.get(value.hex) ?? { lightness: lightnessOf(value), uses: [] };
        entry.uses.push(use);
        byHex.set(value.hex, entry);
    }

    const colors = [...byHex].map(([color, entry]) =>
        Object.freeze({ color, lightness: entry.lightness, uses: Object.freeze(entry.uses) }),
    );
    const found: StyleGrayCollision[] = [];
    // ponytail: every pair, quadratic in the colours in use -- a few dozen in any drawing a reader prints.
    for (let i = 0; i < colors.length; i++) {
        for (let j = i + 1; j < colors.length; j++) {
            const difference = Math.abs(colors[i].lightness - colors[j].lightness);
            if (difference < threshold) {
                const pair: [StyleGrayColor, StyleGrayColor] =
                    colors[i].lightness <= colors[j].lightness ? [colors[i], colors[j]] : [colors[j], colors[i]];
                found.push(Object.freeze({ colors: Object.freeze(pair), difference }));
            }
        }
    }

    found.sort((a, b) => a.difference - b.difference);
    return Object.freeze(found);
}
