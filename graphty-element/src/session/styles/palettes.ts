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
 * fails with `E_CAP_EXCEEDED`, carrying the count and the capacity. Wrapping would put group
 * eight and group zero in the same colour and say nothing, which is why one consumer refuses the
 * element's community layer today.
 *
 * THE REFUSAL IS FOR A PALETTE THE CALLER NAMED, NEVER FOR ONE THE ELEMENT PICKED. A binding
 * that names no palette gets one chosen HERE, against the group count the column actually holds,
 * so the element can never hand itself a palette too small for its own data. That distinction is
 * the whole of {@link defaultPaletteFor} and it exists because the element got it wrong: a
 * community run that found ten groups was planned onto an eight-colour palette by a step that
 * could not yet know there were ten, the capacity check refused it one step later, and the layer
 * sat in the stack enabled, correct, and painting nothing.
 *
 * A MISSING VALUE IS NOT PAINTED. A prepared ramp answers undefined for a value with no place on
 * the scale, and undefined means the element keeps whatever the layers below it painted. Painting
 * the unmeasured is a reader's choice, asked for by name through `missing`.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import { knownPaletteIds, paletteDescriptor, palettesOfKind } from "../../catalog/palettes";
import type { BindingOverflow, PaletteDescriptor, PaletteId } from "../../catalog/types";
import { GraphtyError } from "../../errors";
import { interpolatePalette } from "../../utils/styleHelpers/color/interpolation";
import { type ColorValue, toColorValue } from "./channels";
import { groupCount, isScaleMiss, type ScaleContext, type ScaleRegistry } from "./scales";

/**
 * The palette a colour binding uses when it does not name one and reads a measurement.
 *
 * Paul Tol's YlOrBr, one hue family from orange to dark brown, because a ramp inside one hue
 * family reads as "how much". Viridis, the default before it, sweeps from purple through green
 * to yellow, and a hue sweep makes a sparse set of nodes read as separate groups rather than as
 * amounts (Reda & Szafir 2021; Tseng et al. 2024). It is trimmed to the steps that stand off the
 * element's light background by at least 2:1, so the palest node is still visible. Viridis stays
 * in the catalogue for a binding that names it. `test/catalog/default-palette-quality.test.ts`
 * measures whatever this is.
 */
const DEFAULT_PALETTE: PaletteId = "ylorbr";

/**
 * The palette a colour binding uses when it does not name one and reads groups.
 *
 * Okabe-Ito as published: eight distinct colours, safe for every form of colour blindness the
 * catalogue names, with yellow last because it barely shows on a light background. It is the
 * first choice rather than the only one: a partition with more groups than it has colours gets a
 * larger palette from {@link defaultPaletteFor}, and every partition that fits keeps this one, so
 * a picture that is right today does not change colour because the rule grew a branch.
 */
const DEFAULT_CATEGORICAL_PALETTE: PaletteId = "okabe-ito";

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
    /**
     * The palette.
     *
     * Left off, the element picks one: a ramp for a measurement, and for groups the smallest
     * catalogue palette that can name them all. Named, it is used as named and refused with
     * `E_CAP_EXCEEDED` if it has too few colours for the groups in the column.
     */
    palette?: PaletteId;
    /**
     * What to paint for a value with no place on the scale. "skip" -- the default -- paints
     * nothing at all, so the element keeps the colour the layers below it gave it.
     */
    missing?: "skip" | { value: string };
    /**
     * What to do with more groups than the palette has colours. Set, a palette the element picks
     * is the preferred categorical one rather than a bigger one, and a named palette is not
     * refused: "shape" wraps its colours and "extend" continues past them. "other" expects the
     * caller to have folded the column down to {@link overflowCapacity} groups already, because
     * which groups fold is decided by their sizes and a ramp never sees a size.
     */
    overflow?: BindingOverflow;
}

/**
 * How many groups keep a colour (or a colour and a shape) of their own under an overflow policy.
 *
 * The capacity is the palette's: the one the binding names, else the preferred categorical one,
 * because a binding with an overflow policy is painted through that palette rather than a larger
 * one. A continuous palette has no capacity and folds nothing.
 * @param named - The palette the binding names, if any.
 * @returns The palette's capacity, or null when nothing folds.
 */
export function overflowCapacity(named: PaletteId | undefined): number | null {
    return paletteDescriptor(named ?? DEFAULT_CATEGORICAL_PALETTE)?.capacity ?? null;
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
 * Look a palette up, or say what this page does have.
 *
 * `E_UNKNOWN_PALETTE` RATHER THAN `E_BAD_LAYER`, because the two answer different questions. A
 * layer that names a palette is well formed; what is wrong is that nothing on this page answers
 * to the name, which is the same failure a consumer already switches on for an unknown algorithm,
 * layout or format. A reader who registered their own palette and misspelled it gets the family
 * of code that tells them to register it or pick another, and `details.candidates` is what a
 * settings panel shows them.
 * @param id - The palette name.
 * @returns The descriptor.
 * @throws `E_UNKNOWN_PALETTE` naming every palette that can be painted with here, because a
 *   misspelled palette must not quietly become the default one.
 */
function requirePalette(id: PaletteId): PaletteDescriptor {
    const found = paletteDescriptor(id);
    if (found === undefined) {
        const available = knownPaletteIds();

        throw new GraphtyError({
            code: "E_UNKNOWN_PALETTE",
            message: `There is no palette named "${id}".`,
            source: "style",
            details: { palette: id, available, candidates: available },
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
 * The palette a binding that names none is painted through.
 *
 * DERIVED FROM THE CATALOGUE'S DECLARED CAPACITIES, not from a list of names written here. A
 * palette added to the catalogue with room for twelve groups becomes the answer for twelve groups
 * with nothing edited in this file, and a rule spelled "okabe-ito, then tol-muted, then ylorbr"
 * would have been wrong the day that happened while still looking right.
 *
 * The order of preference, and what each one is for:
 *
 * - A scale that reads a measurement gets the continuous default. Ranking values is what a ramp
 *   is for.
 * - A scale that names groups gets {@link DEFAULT_CATEGORICAL_PALETTE} whenever it fits, so every
 *   picture that paints today keeps the colours it has.
 * - More groups than that: the SMALLEST categorical palette that can still name them all, which
 *   spends the fewest extra colours to keep nominal values looking nominal.
 * - More groups than any categorical palette in the catalogue: the continuous default, sampled at
 *   one colour per group. This is a compromise and is worth naming as one -- community ids are
 *   handed out in discovery order, so a light-to-dark ramp across them suggests a rank that does
 *   not exist. It is taken anyway because the alternatives are worse: wrapping says two groups
 *   are one group, and refusing leaves the reader a blank frame where an algorithm did finish.
 *   The escape the element does NOT take here is lumping the rare groups into an "other" bucket:
 *   that discards a distinction the algorithm drew, which is a reader's decision, and the reader
 *   can still ask for it by name through the binding's `other`, or through `overflow: "other"`,
 *   which is what `encode()` writes by default.
 * @param registry - The session's scales, so a plugin's scale answers the same question as a
 *   built-in one.
 * @param scale - The scale's name.
 * @param groups - How many distinct groups the column actually holds; 0 for a continuous scale.
 * @returns The palette's id.
 */
function defaultPaletteFor(registry: ScaleRegistry, scale: string, groups: number): PaletteId {
    if (registry.describe(scale)?.domainKind !== "categorical") {
        return DEFAULT_PALETTE;
    }

    const preferred = paletteDescriptor(DEFAULT_CATEGORICAL_PALETTE);

    if (groups === 0 || (preferred !== undefined && paletteCapacity(preferred, groups).fits)) {
        return DEFAULT_CATEGORICAL_PALETTE;
    }

    const tightestFit = [...palettesOfKind("categorical")]
        .filter((candidate) => paletteCapacity(candidate, groups).fits)
        .sort(
            (left, right) =>
                (left.capacity ?? Number.POSITIVE_INFINITY) - (right.capacity ?? Number.POSITIVE_INFINITY),
        );

    return tightestFit[0]?.id ?? DEFAULT_PALETTE;
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
 *   palette the CALLER named is asked to name more groups than it has colours. A palette the
 *   element chose for itself always fits, because it is chosen from the group count below.
 */
export function prepareRamp(spec: RampSpec, registry: ScaleRegistry): PreparedRamp {
    const { scale = DEFAULT_SCALE, palette: named, missing, overflow, ...options } = spec;
    const map = registry.require(scale);

    // Counted before the palette is looked up, because the count is what decides which palette a
    // binding that named none is painted through. `groupCount` reads the scale's own options --
    // the categories, the bins, the thresholds -- and never the palette, so asking it first costs
    // nothing and is not circular.
    const counting: ScaleContext = { ...options, range: RAMP_RANGE };
    const declared = groupCount(scale, counting);
    // A binding that says what to do with too many groups is painted through the preferred palette
    // and handles the rest itself -- except "extend", whose whole point is the larger palette.
    const folds = overflow === "other" || overflow === "shape";
    const palette = requirePalette(named ?? defaultPaletteFor(registry, scale, folds ? 0 : declared));
    const context: ScaleContext = { ...counting, palette };
    const categorical = palette.kind === "categorical";
    const slots = categorical && declared === 0 ? palette.colors.length : declared;

    // "shape" wraps and "extend" continues, so only "other" -- already folded -- and no policy at
    // all are held to the palette's capacity.
    if (declared > 0 && (overflow === undefined || overflow === "other")) {
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
    const extraColors = paletteDescriptor(DEFAULT_PALETTE)?.colors ?? colors;
    /**
     * The colour of the k-th group past a named categorical palette's capacity under "extend":
     * the sequential default sampled once per extra group. Distinct from each other, not
     * guaranteed distinct from the palette's own colours.
     * @param extra - Which extra group, from 0.
     * @param extras - How many extra groups there are.
     * @returns The colour, or the missing colour when the sample does not parse.
     */
    const extension = (extra: number, extras: number): ColorValue | undefined =>
        toColorValue(interpolatePalette(extras > 1 ? extra / (extras - 1) : 0, extraColors)) ?? absent;

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
                const index = Math.max(0, slots > 1 ? Math.round(placed * (slots - 1)) : 0);

                if (index > last && overflow === "shape") {
                    return swatches[index % swatches.length];
                }

                if (index > last && overflow === "extend") {
                    return extension(index - last - 1, slots - swatches.length);
                }

                return swatches[Math.min(last, index)];
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
