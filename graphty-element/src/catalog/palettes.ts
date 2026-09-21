/**
 * @file The palette catalogue: the colour ramps the element paints with, anchors included.
 *
 * A palette descriptor carries its colours. That is the whole reason the catalogue exists in
 * this form: a consumer drawing a legend needs the same ten hexes the renderer used, and the
 * only ways to get them today are to import the renderer or to copy them. One consumer copied
 * the viridis anchors into its own source, which means a palette edited in the element repaints
 * the graph and leaves the legend beside it wrong, with nothing to notice the drift.
 *
 * So every descriptor below points at the element's own palette constant. Nothing here retypes a
 * hex, and a palette edited in `config/palettes` travels to every consumer that reads the
 * catalogue.
 *
 * `capacity` says how many distinct values a palette can carry, or null when the palette is a
 * continuous ramp whose colours are anchors to interpolate between rather than a fixed set.
 *
 * `colorblindSafe` lists only what the palette itself declares. An empty list means the palette
 * makes no claim, which is not the same as a palette known to fail -- and the one palette known
 * to fail, red to blue, is kept anyway, because a temperature metaphor sometimes outranks the
 * general rule and a catalogue that hides it just gets it reinvented.
 *
 * The last three are highlight pairs: the first colour is the highlighted state and the second
 * is everything else. Which elements get the second colour is a reader's decision, never an
 * algorithm's.
 */

import { BLUE_HIGHLIGHT, GREEN_SUCCESS, ORANGE_WARNING } from "../config/palettes/binary";
import {
    CARBON_COLORS,
    OKABE_ITO_COLORS,
    PASTEL_COLORS,
    TOL_MUTED_COLORS,
    TOL_VIBRANT_COLORS,
} from "../config/palettes/categorical";
import { BLUE_ORANGE_COLORS, PURPLE_GREEN_COLORS, RED_BLUE_COLORS } from "../config/palettes/diverging";
import {
    BLUES_COLORS,
    GREENS_COLORS,
    INFERNO_COLORS,
    ORANGES_COLORS,
    PLASMA_COLORS,
    VIRIDIS_COLORS,
} from "../config/palettes/sequential";
import type { PaletteDescriptor, PaletteId } from "./types";

/** Safe for every form of colour blindness a descriptor can name. */
const ALL_TYPES = ["deuteranopia", "protanopia", "tritanopia"] as const;

/** Every palette the element can paint with. */
export const PALETTE_DESCRIPTORS: readonly PaletteDescriptor[] = [
    {
        id: "viridis",
        plainName: "Purple to Yellow",
        kind: "sequential",
        colors: VIRIDIS_COLORS,
        capacity: null,
        colorblindSafe: ALL_TYPES,
    },
    {
        id: "plasma",
        plainName: "Blue to Yellow",
        kind: "sequential",
        colors: PLASMA_COLORS,
        capacity: null,
        colorblindSafe: ALL_TYPES,
    },
    {
        id: "inferno",
        plainName: "Black to Yellow",
        kind: "sequential",
        colors: INFERNO_COLORS,
        capacity: null,
        colorblindSafe: ALL_TYPES,
    },
    {
        id: "blues",
        plainName: "Shades of Blue",
        kind: "sequential",
        colors: BLUES_COLORS,
        capacity: null,
        colorblindSafe: ALL_TYPES,
    },
    {
        id: "greens",
        plainName: "Shades of Green",
        kind: "sequential",
        colors: GREENS_COLORS,
        capacity: null,
        colorblindSafe: [],
    },
    {
        id: "oranges",
        plainName: "Shades of Orange",
        kind: "sequential",
        colors: ORANGES_COLORS,
        capacity: null,
        colorblindSafe: [],
    },
    {
        id: "okabe-ito",
        plainName: "Eight Distinct Colours",
        kind: "categorical",
        colors: OKABE_ITO_COLORS,
        capacity: OKABE_ITO_COLORS.length,
        colorblindSafe: ALL_TYPES,
    },
    {
        id: "tol-vibrant",
        plainName: "Seven Bright Colours",
        kind: "categorical",
        colors: TOL_VIBRANT_COLORS,
        capacity: TOL_VIBRANT_COLORS.length,
        colorblindSafe: ALL_TYPES,
    },
    {
        id: "tol-muted",
        plainName: "Nine Soft Colours",
        kind: "categorical",
        colors: TOL_MUTED_COLORS,
        capacity: TOL_MUTED_COLORS.length,
        colorblindSafe: ALL_TYPES,
    },
    {
        id: "pastel",
        plainName: "Eight Pale Colours",
        kind: "categorical",
        colors: PASTEL_COLORS,
        capacity: PASTEL_COLORS.length,
        colorblindSafe: ALL_TYPES,
    },
    {
        id: "carbon",
        plainName: "Five Enterprise Colours",
        kind: "categorical",
        colors: CARBON_COLORS,
        capacity: CARBON_COLORS.length,
        colorblindSafe: [],
    },
    {
        id: "purple-green",
        plainName: "Purple to Green",
        kind: "diverging",
        colors: PURPLE_GREEN_COLORS,
        capacity: null,
        colorblindSafe: ALL_TYPES,
    },
    {
        id: "blue-orange",
        plainName: "Blue to Orange",
        kind: "diverging",
        colors: BLUE_ORANGE_COLORS,
        capacity: null,
        colorblindSafe: ALL_TYPES,
    },
    {
        id: "red-blue",
        plainName: "Red to Blue",
        kind: "diverging",
        colors: RED_BLUE_COLORS,
        capacity: null,
        colorblindSafe: [],
    },
    {
        id: "blue-highlight",
        plainName: "Blue Highlight",
        kind: "categorical",
        colors: [BLUE_HIGHLIGHT.highlighted, BLUE_HIGHLIGHT.muted],
        capacity: 2,
        colorblindSafe: ALL_TYPES,
    },
    {
        id: "green-highlight",
        plainName: "Green Highlight",
        kind: "categorical",
        colors: [GREEN_SUCCESS.highlighted, GREEN_SUCCESS.muted],
        capacity: 2,
        colorblindSafe: ALL_TYPES,
    },
    {
        id: "orange-highlight",
        plainName: "Orange Highlight",
        kind: "categorical",
        colors: [ORANGE_WARNING.highlighted, ORANGE_WARNING.muted],
        capacity: 2,
        colorblindSafe: ALL_TYPES,
    },
];

/**
 * Find one palette by its name.
 * @param id - The palette name, such as "viridis".
 * @returns The descriptor, or undefined when the element does not know that palette.
 */
export function paletteDescriptor(id: PaletteId): PaletteDescriptor | undefined {
    return PALETTE_DESCRIPTORS.find((descriptor) => descriptor.id === id);
}

/**
 * The palettes of one kind, which is what a palette picker offers once the encoding has decided
 * whether it is ranking values, dividing them around a midpoint, or naming groups.
 * @param kind - The kind of palette wanted.
 * @returns Every palette of that kind, in catalogue order.
 */
export function palettesOfKind(kind: PaletteDescriptor["kind"]): readonly PaletteDescriptor[] {
    return PALETTE_DESCRIPTORS.filter((descriptor) => descriptor.kind === kind);
}
