/**
 * The layouts this application offers, read from graphty-element's catalogue.
 *
 * Nothing here describes a layout. Every label, description, dimension limit and option comes
 * out of `LAYOUT_CATALOG`, so a layout the element gains, loses or renames shows up here on the
 * next build instead of being retyped and drifting.
 *
 * One thing this module does decide, and it is a fact about the element rather than about a
 * layout: the element's layout registry answers to ENGINE names today ("d3", "ngraph",
 * "bfs"), not to the catalogue's public arrangement names ("force", "hierarchical"). So the
 * picker is keyed by engine, and each entry carries the arrangement it draws beside it. When
 * the element starts accepting arrangement names, `type` becomes `arrangement` and this comment
 * goes away.
 */
import {
    LAYOUT_CATALOG,
    type LayoutCatalogEntry,
    type LayoutImplementation,
    type OptionDescriptor,
} from "@graphty/graphty-element/catalog";

/** One layout engine the element can run, as the layout picker needs it. */
export interface LayoutMetadata {
    /** The name the element's layout registry answers to. */
    type: string;
    /** The engine's own name, for a reader who knows the literature. */
    label: string;
    /** What the arrangement does, from the catalogue entry this engine draws. */
    description: string;
    /** What this engine buys over the others that draw the same arrangement. */
    engineNote: string;
    /** The public name of the arrangement, for when the element accepts those. */
    arrangement: string;
    maxDimensions: 2 | 3;
    /** The arrangement's family: "force", "geometric", "hierarchical" or "special". */
    category: string;
    /** Whether the engine keeps running after the first placement. */
    kind: "live" | "batch";
    /** Every option the engine declares, in declaration order. */
    options: readonly OptionDescriptor[];
    /** Options the layout modal drives itself, so the options form must not offer them. */
    hiddenFields: readonly string[];
    /** Options that must be filled in before the layout can run at all. */
    requiredFields: readonly string[];
    /**
     * Structural inputs the arrangement reads -- a starting node, a grouping, an ordering --
     * that no published option can supply. The engine still runs, on its own default split.
     */
    unsupplied: readonly string[];
}

/**
 * The option types that name part of the graph rather than a value the reader types in.
 */
const STRUCTURAL_OPTION_TYPES: readonly OptionDescriptor["type"][] = ["node-id", "node-set", "partition", "ordering"];

/**
 * Options the layout modal owns and the options form must not draw.
 *
 * `dim` is driven by the modal's own 2D/3D radio, and drawing it twice lets the two disagree.
 * `scalingFactor` is the element's world-space multiplier rather than a property of the
 * arrangement, and it is the one option a reader changing a layout never means to change.
 */
const MODAL_OWNED_OPTIONS: readonly string[] = ["dim", "scalingFactor"];

/**
 * Which structural inputs one option covers.
 */
const INPUT_FOR_OPTION_TYPE: Readonly<Record<string, string>> = {
    "node-id": "node",
    "node-set": "partition",
    partition: "partition",
    ordering: "ordering",
};

/**
 * Turn one catalogue entry's engine into the picker's metadata.
 * @param entry - The catalogue entry the engine draws.
 * @param implementation - The engine itself.
 * @returns The metadata for that engine.
 */
function toMetadata(entry: LayoutCatalogEntry, implementation: LayoutImplementation): LayoutMetadata {
    const structural = implementation.options.filter((option) => STRUCTURAL_OPTION_TYPES.includes(option.type));
    const requiredFields = structural.filter((option) => option.default === undefined).map((option) => option.name);
    const covered = new Set(structural.map((option) => INPUT_FOR_OPTION_TYPE[option.type]));

    return {
        type: implementation.engine,
        label: implementation.plainName,
        description: entry.descriptor.description,
        engineNote: implementation.reason,
        arrangement: entry.descriptor.id,
        maxDimensions: implementation.maxDimensions,
        category: entry.descriptor.family,
        kind: implementation.kind,
        options: implementation.options,
        hiddenFields: MODAL_OWNED_OPTIONS.filter((name) =>
            implementation.options.some((option) => option.name === name),
        ),
        requiredFields,
        unsupplied: entry.descriptor.structuralInputs.filter((input) => !covered.has(input)),
    };
}

/**
 * Every layout engine the element registers, in catalogue order: the default engine of each
 * arrangement first, then its alternates.
 */
export const LAYOUT_METADATA: readonly LayoutMetadata[] = LAYOUT_CATALOG.flatMap((entry) =>
    entry.implementations.map((implementation) => toMetadata(entry, implementation)),
);

/**
 * Find one layout engine's metadata.
 * @param type - The name the element's layout registry answers to, such as "d3".
 * @returns The metadata, or undefined when the element registers no such engine.
 */
export function getLayoutMetadata(type: string): LayoutMetadata | undefined {
    return LAYOUT_METADATA.find((layout) => layout.type === type);
}

/**
 * The order the picker groups its categories in. Any family the catalogue gains that is not
 * named here is appended, so a new family is visible rather than silently dropped.
 */
const CATEGORY_ORDER: readonly string[] = ["force", "geometric", "hierarchical", "special"];

/**
 * Every category present in the catalogue, in display order.
 * @returns The category names, the known ones first.
 */
export function getLayoutCategories(): readonly string[] {
    const present = new Set(LAYOUT_METADATA.map((layout) => layout.category));
    const known = CATEGORY_ORDER.filter((category) => present.has(category));
    const extra = [...present].filter((category) => !CATEGORY_ORDER.includes(category)).sort();

    return [...known, ...extra];
}

/**
 * Turn a slug into a heading, so a category the catalogue gains gets a readable label without
 * anyone adding a row to a table.
 * @param slug - A lower-case, hyphen-separated name.
 * @returns The name with each word capitalised.
 */
function titleCase(slug: string): string {
    return slug
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}

/**
 * Display labels for each layout category the catalogue offers.
 *
 * The catalogue publishes a family as a slug and has no heading for it, so the heading is
 * derived. "force" reads as "Force-Directed" rather than "Force" because that is what the
 * family is called in every layout paper; the rest are the slug in title case.
 */
export const CATEGORY_LABELS: Readonly<Record<string, string>> = Object.fromEntries(
    getLayoutCategories().map((category) => [category, category === "force" ? "Force-Directed" : titleCase(category)]),
);
