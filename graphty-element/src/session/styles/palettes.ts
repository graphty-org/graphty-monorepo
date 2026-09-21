/**
 * @file Binding a palette to a scale: the one place a measurement becomes a colour.
 *
 * A scale says where a value sits. A palette says what that position looks like. This module is
 * the join, and it is a join with a cost rule: everything that can be worked out once per layer
 * -- the palette, the scale, the group count, the colour for a missing value, the ramp itself --
 * is worked out in {@link prepareRamp}, and what runs once per element is a scale call and an
 * array index.
 *
 * THE RAMP IS A TABLE. Interpolating a colour and writing it as a hex string once per element
 * costs 37 ms at fifty thousand nodes, against a whole-frame budget of 16 ms for a single-layer
 * edit; the same work done once per distinct colour costs 0.6 ms. The table is built lazily, so
 * a layer that paints six elements builds six colours. See {@link rampSteps} for why sampling
 * the ramp costs no colour.
 *
 * THE PALETTES ARE NOT RESTATED HERE. Every colour comes from the catalogue, which points at the
 * element's own palette constants, so a palette edited once travels to the renderer, the legend
 * and every consumer together. A hex typed into this file would be the drift the catalogue
 * exists to prevent.
 *
 * A CATEGORICAL PALETTE NEVER WRAPS. Asking a palette of eight colours to name twelve groups
 * fails at the edit with `E_CAP_EXCEEDED`, carrying the count and the capacity, so the layer can
 * be disabled with a reason a person can read. Wrapping would put group eight and group zero in
 * the same colour and say nothing, which is why one consumer refuses the element's community
 * layer today.
 *
 * A MISSING VALUE IS NOT PAINTED. A prepared ramp answers undefined for a value with no place on
 * the scale, and undefined means the element keeps whatever the layers below it painted. Painting
 * the unmeasured is a reader's choice, asked for by name through `missing`.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import { PALETTE_DESCRIPTORS, paletteDescriptor } from "../../catalog/palettes";
import type { PaletteDescriptor, PaletteId } from "../../catalog/types";
import { GraphtyError } from "../../errors";
import { interpolatePalette } from "../../utils/styleHelpers/color/interpolation";
import { type ColorValue, toColorValue } from "./channels";
import { groupCount, isScaleMiss, type ScaleContext, type ScaleRegistry } from "./scales";

/** The palette a colour binding uses when it does not name one. */
const DEFAULT_PALETTE: PaletteId = "viridis";

/** The scale a binding uses when it does not name one. */
const DEFAULT_SCALE = "linear";

/** The range a colour ramp reads positions in, whatever range the binding asked a channel for. */
const RAMP_RANGE: [number, number] = [0, 1];

/**
 * A colour binding as it is authored: which scale, which palette, and what to do with a value
 * that has no place on the scale.
 *
 * The scale's own options ride along, because they are the binding's options -- a domain, a
 * midpoint, a group count, a category list. `range` is not read: a colour ramp is positions, and
 * a numeric range belongs to a channel that carries numbers.
 */
export interface RampSpec extends Omit<ScaleContext, "palette" | "range"> {
    /** The scale name, built-in or registered. Defaults to "linear". */
    scale?: string;
    /** The palette. Defaults to "viridis". */
    palette?: PaletteId;
    /**
     * What to paint for a value with no place on the scale. "skip" -- the default -- paints
     * nothing at all, so the element keeps the colour the layers below it gave it.
     */
    missing?: "skip" | { value: string };
}

/** A colour binding with everything knowable worked out, ready to be asked once per element. */
export interface PreparedRamp {
    /** The palette the colours come from. */
    readonly palette: PaletteDescriptor;
    /** The scale's name, for the legend. */
    readonly scale: string;
    /** How many distinct colours the ramp uses, or 0 when it is a continuous interpolation. */
    readonly groups: number;
    /** The colour a missing value gets, or undefined when a missing value is not painted. */
    readonly missing: ColorValue | undefined;
    /**
     * The colour for one value.
     * @param value - The element's value for the bound path, including the absent value of an
     *   element the run never measured.
     * @returns The colour, or undefined when the element is not to be painted.
     */
    color(value: unknown): ColorValue | undefined;
}

/**
 * Whether a palette can name this many groups.
 *
 * A continuous palette has no capacity: its colours are anchors to interpolate between, so it
 * answers any number of groups by sampling.
 * @param palette - The palette.
 * @param distinct - How many distinct values the encoding found.
 * @returns Whether it fits, alongside the two numbers a message needs to say why it does not.
 */
export function paletteCapacity(
    palette: PaletteDescriptor,
    distinct: number,
): { fits: boolean; capacity: number | null; distinct: number } {
    const { capacity } = palette;

    return { fits: capacity === null || distinct <= capacity, capacity, distinct };
}

/**
 * Look a palette up, or say what the element does have.
 * @param id - The palette name.
 * @returns The descriptor.
 * @throws `E_BAD_LAYER` naming every palette the element knows, because a misspelled palette
 *   must not quietly become the default one.
 */
function requirePalette(id: PaletteId): PaletteDescriptor {
    const found = paletteDescriptor(id);
    if (found === undefined) {
        throw new GraphtyError({
            code: "E_BAD_LAYER",
            message: `There is no palette named "${id}".`,
            source: "style",
            details: { palette: id, available: PALETTE_DESCRIPTORS.map((descriptor) => descriptor.id) },
        });
    }

    if (found.colors.length === 0) {
        throw new GraphtyError({
            code: "E_BAD_LAYER",
            message: `The palette "${id}" has no colours in it.`,
            source: "style",
            details: { palette: id },
        });
    }

    return found;
}

/**
 * Read the colour a missing value is painted, if any.
 * @param missing - The binding's missing policy.
 * @returns The colour, or undefined when a missing value is not painted.
 * @throws `E_BAD_LAYER` when a colour was asked for and is not a colour, which is a mistake in
 *   the layer rather than in the data and belongs at the edit.
 */
function missingColor(missing: RampSpec["missing"]): ColorValue | undefined {
    if (missing === undefined || missing === "skip") {
        return undefined;
    }

    const parsed = toColorValue(missing.value);
    if (parsed === null) {
        throw new GraphtyError({
            code: "E_BAD_LAYER",
            message: `"${missing.value}" is not a colour, so it cannot be what a missing value is painted.`,
            source: "style",
            details: { missing: missing.value },
        });
    }

    return parsed;
}

/**
 * How many steps a continuous ramp is sampled at.
 *
 * The ramp is a table, not a formula, because building a hex string once per element is the
 * per-element string work the repaint budget forbids: at fifty thousand nodes it is the
 * difference between a third of a frame and nothing measurable.
 *
 * The table is fine enough that sampling costs no colour. Five hundred and twelve steps per
 * segment means one step moves the ramp by a five-hundred-and-twelfth of the distance between
 * two neighbouring anchors, and two anchors are at most 255 units apart in any channel, so no
 * channel moves by as much as half a unit from one step to the next. The ends are exact: step
 * zero is the first anchor and the last step is the last.
 * @param anchors - How many colours the palette is written with.
 * @returns The number of steps, which is one fewer than the number of table entries.
 */
function rampSteps(anchors: number): number {
    return Math.max(512, 512 * (anchors - 1));
}

/**
 * Parse every colour in a palette, once.
 * @param palette - The palette.
 * @returns Its colours in order, each with its numbers alongside its string.
 * @throws `E_BAD_LAYER` naming the colour that will not parse. A palette with a typo in it is a
 *   mistake in the element's own catalogue, and finding it before anything is painted is better
 *   than finding it as a stripe of magenta across whichever elements happened to sample it.
 */
function parsedSwatches(palette: PaletteDescriptor): readonly ColorValue[] {
    return palette.colors.map((color) => {
        const parsed = toColorValue(color);
        if (parsed === null) {
            throw new GraphtyError({
                code: "E_BAD_LAYER",
                message: `The palette "${palette.id}" has a colour in it that is not a colour: "${color}".`,
                source: "style",
                details: { palette: palette.id, color },
            });
        }

        return parsed;
    });
}

/**
 * Work out everything a colour binding can know before it sees an element.
 * @param spec - The binding.
 * @param registry - The session's scales, so a plugin's scale is reachable here like a built-in.
 * @returns The prepared ramp.
 * @throws `E_UNKNOWN_SCALE` for a scale nobody registered, `E_BAD_LAYER` for a palette the
 *   element does not have or a missing colour that is not a colour, and `E_CAP_EXCEEDED` when a
 *   categorical palette is asked to name more groups than it has colours. All three are edit-time
 *   failures, so a layer is refused or disabled with a reason instead of painting something wrong.
 */
export function prepareRamp(spec: RampSpec, registry: ScaleRegistry): PreparedRamp {
    const { scale = DEFAULT_SCALE, palette: paletteId = DEFAULT_PALETTE, missing, ...options } = spec;
    const palette = requirePalette(paletteId);
    const map = registry.require(scale);
    const context: ScaleContext = { ...options, palette, range: RAMP_RANGE };
    const declared = groupCount(scale, context);
    const categorical = palette.kind === "categorical";
    const slots = categorical && declared === 0 ? palette.colors.length : declared;

    if (declared > 0) {
        const fit = paletteCapacity(palette, declared);
        if (!fit.fits) {
            throw new GraphtyError({
                code: "E_CAP_EXCEEDED",
                message: `The palette "${palette.id}" has ${String(fit.capacity)} colours and this encoding has ${String(declared)} groups.`,
                source: "style",
                details: { palette: palette.id, capacity: fit.capacity, groups: declared, scale },
            });
        }
    }

    const absent = missingColor(missing);
    const swatches = parsedSwatches(palette);
    const steps = rampSteps(palette.colors.length);
    const sampled = new Array<ColorValue | undefined>(steps + 1).fill(undefined);
    const { colors } = palette;
    const last = swatches.length - 1;

    return {
        palette,
        scale,
        groups: slots,
        missing: absent,
        color(value: unknown): ColorValue | undefined {
            const placed = map(value, context);
            if (typeof placed === "string") {
                // A registered scale that produces colours itself; the palette is not consulted.
                return toColorValue(placed) ?? absent;
            }

            if (isScaleMiss(placed)) {
                return absent;
            }

            if (categorical) {
                const index = slots > 1 ? Math.round(placed * (slots - 1)) : 0;

                return swatches[Math.max(0, Math.min(last, index))];
            }

            const step = Math.max(0, Math.min(steps, Math.round(placed * steps)));
            const cached = sampled[step];
            if (cached !== undefined) {
                return cached;
            }

            const mixed = toColorValue(interpolatePalette(step / steps, colors));
            if (mixed === null) {
                return absent;
            }

            sampled[step] = mixed;

            return mixed;
        },
    };
}
