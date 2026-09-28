/**
 * Palette extension point. NORMATIVE for shapes; behaviour in design/extensions/palette.md.
 * Entry point: @graphty/graphty-element/extend. Serialised form:
 * design/extensions/descriptors.schema.json#/$defs/PaletteDescriptor.
 */
import type { RegisterOptions } from "./common";

// =============================================================================================
// Published (graphty-element 2.6.1)
// =============================================================================================

/** The built-in palette ids. Reserved: no registration may take one. */
export declare const KNOWN_PALETTE_IDS: readonly [
    "viridis", "ylorbr", "plasma", "inferno", "blues", "greens", "oranges",
    "okabe-ito", "tol-vibrant", "tol-muted", "pastel", "carbon",
    "purple-green", "blue-orange", "red-blue",
    "blue-highlight", "green-highlight", "orange-highlight",
];

/** A palette id: a built-in name or a registered one. OPEN UNION. */
export type PaletteId = (typeof KNOWN_PALETTE_IDS)[number] | (string & {});

/** The colour-vision deficiencies a palette may claim to be safe for. CLOSED. */
export type ColorVisionDeficiency = "deuteranopia" | "protanopia" | "tritanopia";

/**
 * One palette. IMPLEMENTED BY EXTENSIONS (an author writes it).
 *
 * The whole extension is this object: nothing in the element ever asks a palette for behaviour.
 */
export interface PaletteDescriptor {
    /** Permanent id; see README.md section 4.3. */
    id: PaletteId;
    /** What a picker shows. Non-empty. */
    plainName: string;
    /**
     * sequential: a ramp from low to high, interpolated. diverging: a ramp through a neutral
     * middle anchor, interpolated. categorical: one anchor per group, never interpolated.
     */
    kind: "sequential" | "diverging" | "categorical";
    /**
     * The anchors, in order. As authored: any CSS colour the element can parse (hex, rgb(),
     * hsl(), oklch(), a named colour). As published by registerPalette: six-digit upper-case hex.
     */
    colors: readonly string[];
    /**
     * DERIVED. colors.length for categorical, null otherwise. An author MAY omit it; a value that
     * disagrees with the derived one is refused.
     */
    capacity: number | null;
    /** The author's claim. MAY be omitted (published as []). Taken on trust, not verified. */
    colorblindSafe: readonly ColorVisionDeficiency[];
}

/** What registerPalette accepts: the descriptor with the derived and optional members optional. */
export type PaletteRegistration = Omit<PaletteDescriptor, "capacity" | "colorblindSafe"> & {
    capacity?: number | null;
    colorblindSafe?: readonly ColorVisionDeficiency[];
};

/**
 * Register a palette. Synchronous. Throws GraphtyError:
 *   E_BAD_COMMAND (details.field names the member) for a malformed descriptor;
 *   E_DUPLICATE_PLUGIN for a built-in id, or for a different palette under a taken id with strict.
 *
 * NOTE: 2.6.1 types the parameter as PaletteDescriptor (capacity and colorblindSafe required by
 * the type while optional at run time). PaletteRegistration is the shape the run time accepts;
 * narrowing the published parameter type to it is additive for callers.
 */
export declare function registerPalette(descriptor: PaletteDescriptor, options?: RegisterOptions): void;

/** Every registered palette, as published (normalised and frozen), in registration order. */
export declare function registeredPaletteDescriptors(): readonly PaletteDescriptor[];

/** Tests only. Not part of the contract a consumer may call in production. */
export declare function clearRegisteredPalettesForTesting(): void;

// =============================================================================================
// Proposed (NOT built)
// =============================================================================================

/**
 * PROPOSED -- open decision "Palettes carried by a style document" (README.md section 12,
 * item 10). What applying a StyleDocument does with its `palettes` member.
 *   "register": each carried palette is registered under the ordinary policy, except that a
 *               DIFFERENT palette under an already registered id is refused with
 *               E_DUPLICATE_PLUGIN rather than replacing (a document never recolours another).
 *   "require":  today's behaviour: every carried palette must already be registered.
 */
export type DocumentPalettePolicy = "register" | "require";
