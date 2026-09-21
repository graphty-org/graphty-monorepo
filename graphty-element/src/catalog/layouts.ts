/**
 * @file The layout catalogue: the arrangements the element offers, and the engines behind them.
 *
 * A public layout name says what the arrangement IS -- "force", "hierarchical", "circular" --
 * and never which library draws it. The element registers sixteen engines whose registered
 * names ARE their implementations ("ngraph", "d3", "forceatlas2"), and freezing those into the
 * public API makes swapping an implementation a rename every consumer can see. So the engine is
 * data on the descriptor instead: `LayoutDescriptor.engine` names the implementation the element
 * runs today, and replacing it is a catalogue edit rather than a breaking change.
 *
 * More than one engine can draw one arrangement. `force` is drawn by ngraph today and could be
 * drawn by any of four others, so each entry lists every engine that can serve it, the default
 * first, with a sentence on each saying why it is the default or what choosing it buys. The
 * descriptor a consumer reads carries the default engine and that engine's options; the rest of
 * the list is there for a consumer that wants to choose.
 *
 * Two names in the built-in layout list have no engine behind them yet, and two engines describe
 * an arrangement that list has no name for. Both are recorded here -- {@link UNSERVED_LAYOUT_IDS}
 * and the `spiral` and `planar` entries -- rather than left for a consumer to discover by asking
 * for a layout that never answers, or by never learning a capability exists.
 *
 * `sizeRating` is the largest graph the default engine is recommended for, read from its cost: a
 * placement that visits each node once rates "any", an iterative all-pairs force rates 2000.
 */

import type { OptionsSchema } from "../config/OptionsSchema";
import { ArfLayout } from "../layout/ArfLayoutEngine";
import { BfsLayout } from "../layout/BfsLayoutEngine";
import { BipartiteLayout } from "../layout/BipartiteLayoutEngine";
import { CircularLayout } from "../layout/CircularLayoutEngine";
import { D3GraphEngine } from "../layout/D3GraphLayoutEngine";
import { FixedLayout } from "../layout/FixedLayoutEngine";
import { ForceAtlas2Layout } from "../layout/ForceAtlas2LayoutEngine";
import { KamadaKawaiLayout } from "../layout/KamadaKawaiLayoutEngine";
import { MultipartiteLayout } from "../layout/MultipartiteLayoutEngine";
import { NGraphEngine } from "../layout/NGraphLayoutEngine";
import { PlanarLayout } from "../layout/PlanarLayoutEngine";
import { RandomLayout } from "../layout/RandomLayoutEngine";
import { ShellLayout } from "../layout/ShellLayoutEngine";
import { SpectralLayout } from "../layout/SpectralLayoutEngine";
import { SpiralLayout } from "../layout/SpiralLayoutEngine";
import { SpringLayout } from "../layout/SpringLayoutEngine";
import { optionsFromZod } from "./optionsFromZod";
import type { KNOWN_LAYOUT_IDS, LayoutDescriptor, LayoutId, OptionDescriptor } from "./types";

// ---------------------------------------------------------------------------------------------
// The shapes this module adds on top of LayoutDescriptor
// ---------------------------------------------------------------------------------------------

/**
 * One engine that can draw a semantic layout. Plain JSON, like every other descriptor: the
 * engine is named, never referenced.
 */
export interface LayoutImplementation {
    /** The registered engine name, exactly as `LayoutEngine.getRegisteredTypes` reports it. */
    engine: string;
    plainName: string;
    technicalName: string;
    kind: "live" | "batch";
    maxDimensions: 2 | 3;
    /** True for the engine the element runs when this layout is asked for by name. */
    isDefault: boolean;
    /** Why this engine is the default, or what choosing it over the default buys. */
    reason: string;
    options: readonly OptionDescriptor[];
}

/** An implementation as it is authored here. Which one is the default is decided by position. */
type LayoutImplementationSpec = Omit<LayoutImplementation, "isDefault">;

/** One semantic layout, with every engine that can draw it. */
export interface LayoutCatalogEntry {
    /** The descriptor a consumer reads: the default engine, and the default engine's options. */
    descriptor: LayoutDescriptor;
    /** Every engine that can draw this layout, the default first. */
    implementations: readonly LayoutImplementation[];
}

/** A built-in layout name that no registered engine draws yet. */
export interface UnservedLayout {
    id: (typeof KNOWN_LAYOUT_IDS)[number];
    reason: string;
}

// ---------------------------------------------------------------------------------------------
// Option emission
// ---------------------------------------------------------------------------------------------

/**
 * A seed is an integer as far as a Zod schema is concerned. Which integers are seeds is a
 * decision for whoever authors the descriptor, which is this file.
 */
const SEED_OVERRIDE: Readonly<Record<string, Partial<OptionDescriptor>>> = {
    seed: { type: "seed" },
};

/**
 * Emit one engine's options as plain JSON.
 * @param schema - The engine's Zod options schema.
 * @param overrides - Descriptor fields the schema cannot express, by option name.
 * @returns One option descriptor per option the engine declares.
 */
function engineOptions(
    schema: OptionsSchema,
    overrides: Readonly<Record<string, Partial<OptionDescriptor>>> = {},
): readonly OptionDescriptor[] {
    return optionsFromZod(schema, { overrides });
}

/**
 * Assemble one catalogue entry, taking the published descriptor's engine and options from the
 * default implementation so the two can never drift apart.
 * @param base - Everything about the layout that is not the implementation.
 * @param primary - The engine the element runs when this layout is asked for by name.
 * @param alternates - The other engines that can draw the same arrangement.
 * @returns The finished entry.
 */
function entry(
    base: Omit<LayoutDescriptor, "engine" | "options">,
    primary: LayoutImplementationSpec,
    alternates: readonly LayoutImplementationSpec[] = [],
): LayoutCatalogEntry {
    return {
        descriptor: { ...base, engine: primary.engine, options: primary.options },
        implementations: [
            { ...primary, isDefault: true },
            ...alternates.map((alternate) => ({ ...alternate, isDefault: false })),
        ],
    };
}

// ---------------------------------------------------------------------------------------------
// The engines, as implementations
// ---------------------------------------------------------------------------------------------

const ngraph: LayoutImplementationSpec = {
    engine: "ngraph",
    plainName: "NGraph Force",
    technicalName: "ngraph.forcelayout",
    kind: "live",
    maxDimensions: 3,
    reason:
        "The default: a Barnes-Hut simulation that runs live, accepts nodes and edges added " +
        "while it is running, and stays interactive on graphs of a hundred thousand nodes.",
    options: engineOptions(NGraphEngine.zodOptionsSchema, SEED_OVERRIDE),
};

const d3: LayoutImplementationSpec = {
    engine: "d3",
    plainName: "D3 Force",
    technicalName: "d3-force-3d",
    kind: "live",
    maxDimensions: 3,
    reason:
        "Choose it for d3's own tuning vocabulary -- alpha, alpha decay, velocity decay -- when " +
        "the arrangement has to match a d3 drawing elsewhere in the product.",
    options: engineOptions(D3GraphEngine.zodOptionsSchema),
};

const forceAtlas2: LayoutImplementationSpec = {
    engine: "forceatlas2",
    plainName: "ForceAtlas2",
    technicalName: "ForceAtlas2 (Gephi)",
    kind: "batch",
    maxDimensions: 3,
    reason:
        "Choose it for the Gephi look, and for the arrangement an accelerator reproduces first. " +
        "It runs a fixed number of iterations and stops rather than staying live.",
    options: engineOptions(ForceAtlas2Layout.zodOptionsSchema, SEED_OVERRIDE),
};

const spring: LayoutImplementationSpec = {
    engine: "spring",
    plainName: "Spring",
    technicalName: "Fruchterman-Reingold",
    kind: "batch",
    maxDimensions: 3,
    reason:
        "Choose it when the arrangement must be reproducible from a seed: a fixed number of " +
        "iterations from a seeded start, then done.",
    options: engineOptions(SpringLayout.zodOptionsSchema, SEED_OVERRIDE),
};

const kamadaKawai: LayoutImplementationSpec = {
    engine: "kamada-kawai",
    plainName: "Kamada-Kawai",
    technicalName: "Kamada-Kawai stress majorization",
    kind: "batch",
    maxDimensions: 3,
    reason:
        "Choose it for a small graph whose drawn distances should match its graph distances. It " +
        "solves over every pair of nodes, so it is slow well before the other force engines are.",
    options: engineOptions(KamadaKawaiLayout.zodOptionsSchema),
};

const arf: LayoutImplementationSpec = {
    engine: "arf",
    plainName: "ARF",
    technicalName: "Attractive and Repulsive Forces",
    kind: "batch",
    maxDimensions: 2,
    reason:
        "The only registered force engine that is two-dimensional by nature, so a flat result " +
        "is what it computes rather than what it is flattened into afterwards.",
    options: engineOptions(ArfLayout.zodOptionsSchema, SEED_OVERRIDE),
};

const circular: LayoutImplementationSpec = {
    engine: "circular",
    plainName: "Circular",
    technicalName: "Circular layout",
    kind: "batch",
    maxDimensions: 3,
    reason: "The only engine that draws this arrangement.",
    options: engineOptions(CircularLayout.zodOptionsSchema),
};

const shell: LayoutImplementationSpec = {
    engine: "shell",
    plainName: "Shell",
    technicalName: "Shell layout",
    kind: "batch",
    maxDimensions: 2,
    reason: "The only engine that draws this arrangement.",
    options: engineOptions(ShellLayout.zodOptionsSchema),
};

const spiral: LayoutImplementationSpec = {
    engine: "spiral",
    plainName: "Spiral",
    technicalName: "Archimedean spiral layout",
    kind: "batch",
    maxDimensions: 2,
    reason: "The only engine that draws this arrangement.",
    options: engineOptions(SpiralLayout.zodOptionsSchema),
};

const spectral: LayoutImplementationSpec = {
    engine: "spectral",
    plainName: "Spectral",
    technicalName: "Laplacian eigenvector layout",
    kind: "batch",
    maxDimensions: 2,
    reason: "The only engine that draws this arrangement.",
    options: engineOptions(SpectralLayout.zodOptionsSchema),
};

const planar: LayoutImplementationSpec = {
    engine: "planar",
    plainName: "Planar",
    technicalName: "Planar embedding",
    kind: "batch",
    maxDimensions: 2,
    reason: "The only engine that draws this arrangement.",
    options: engineOptions(PlanarLayout.zodOptionsSchema, SEED_OVERRIDE),
};

const bfs: LayoutImplementationSpec = {
    engine: "bfs",
    plainName: "BFS Tree",
    technicalName: "Breadth-first tree layout",
    kind: "batch",
    maxDimensions: 2,
    reason:
        "The only engine that draws this arrangement. It orders each row by breadth-first " +
        "arrival and does not reduce edge crossings between rows.",
    options: engineOptions(BfsLayout.zodOptionsSchema),
};

const bipartite: LayoutImplementationSpec = {
    engine: "bipartite",
    plainName: "Bipartite",
    technicalName: "Bipartite layout",
    kind: "batch",
    maxDimensions: 2,
    reason: "The only engine that draws this arrangement.",
    options: engineOptions(BipartiteLayout.zodOptionsSchema),
};

const multipartite: LayoutImplementationSpec = {
    engine: "multipartite",
    plainName: "Multipartite",
    technicalName: "Multipartite layout",
    kind: "batch",
    maxDimensions: 2,
    reason: "The only engine that draws this arrangement.",
    options: engineOptions(MultipartiteLayout.zodOptionsSchema),
};

const fixed: LayoutImplementationSpec = {
    engine: "fixed",
    plainName: "Fixed",
    technicalName: "Fixed layout",
    kind: "batch",
    maxDimensions: 3,
    reason: "The only engine that draws this arrangement.",
    options: engineOptions(FixedLayout.zodOptionsSchema),
};

const random: LayoutImplementationSpec = {
    engine: "random",
    plainName: "Random",
    technicalName: "Random layout",
    kind: "batch",
    maxDimensions: 3,
    reason: "The only engine that draws this arrangement.",
    options: engineOptions(RandomLayout.zodOptionsSchema, SEED_OVERRIDE),
};

// ---------------------------------------------------------------------------------------------
// The catalogue
// ---------------------------------------------------------------------------------------------

/** Every arrangement the element can place a graph with, and every engine that can draw it. */
export const LAYOUT_CATALOG: readonly LayoutCatalogEntry[] = [
    entry(
        {
            id: "force",
            plainName: "Spread Out",
            technicalName: "Force-directed layout",
            description:
                "Pulls connected nodes together and pushes unconnected ones apart until the " +
                "shape stops moving, in three dimensions.",
            family: "force",
            kind: "live",
            maxDimensions: 3,
            sizeRating: "any",
            structuralInputs: [],
        },
        ngraph,
        [d3, forceAtlas2, spring, kamadaKawai],
    ),
    entry(
        {
            id: "force-2d",
            plainName: "Spread Out, Flat",
            technicalName: "Force-directed layout, two-dimensional",
            description: "The same pull and push as Spread Out, worked out on a single plane.",
            family: "force",
            kind: "batch",
            maxDimensions: 2,
            sizeRating: 2000,
            structuralInputs: [],
        },
        arf,
    ),
    entry(
        {
            id: "circular",
            plainName: "Ring",
            technicalName: "Circular layout",
            description: "Places every node on one circle, in the order the nodes were loaded.",
            family: "geometric",
            kind: "batch",
            maxDimensions: 3,
            sizeRating: "any",
            structuralInputs: [],
        },
        circular,
    ),
    entry(
        {
            id: "shell",
            plainName: "Concentric Rings",
            technicalName: "Shell layout",
            description: "Places each group of nodes on its own ring, around a shared centre.",
            family: "geometric",
            kind: "batch",
            maxDimensions: 2,
            sizeRating: "any",
            structuralInputs: ["partition"],
        },
        shell,
    ),
    entry(
        {
            id: "spiral",
            plainName: "Spiral",
            technicalName: "Archimedean spiral layout",
            description: "Places nodes one after another along a spiral winding out from the centre.",
            family: "geometric",
            kind: "batch",
            maxDimensions: 2,
            sizeRating: "any",
            structuralInputs: [],
        },
        spiral,
    ),
    entry(
        {
            id: "spectral",
            plainName: "Natural Grouping",
            technicalName: "Spectral layout",
            description:
                "Places nodes from the graph's own structure, so densely connected groups land " +
                "near each other without any grouping being named.",
            family: "geometric",
            kind: "batch",
            maxDimensions: 2,
            sizeRating: 2000,
            structuralInputs: [],
        },
        spectral,
    ),
    entry(
        {
            id: "planar",
            plainName: "No Crossings",
            technicalName: "Planar embedding",
            description:
                "Places nodes so that no two edges cross, for the graphs where that is possible.",
            family: "geometric",
            kind: "batch",
            maxDimensions: 2,
            sizeRating: 2000,
            structuralInputs: [],
        },
        planar,
    ),
    entry(
        {
            id: "random",
            plainName: "Scattered",
            technicalName: "Random layout",
            description: "Puts every node somewhere at random, which is where a live layout starts.",
            family: "geometric",
            kind: "batch",
            maxDimensions: 3,
            sizeRating: "any",
            structuralInputs: [],
        },
        random,
    ),
    entry(
        {
            id: "hierarchical",
            plainName: "Tree",
            technicalName: "Layered layout",
            description:
                "Puts nodes in rows by how many steps they are from a starting node, so the " +
                "graph reads as a tree growing away from it.",
            family: "hierarchical",
            kind: "batch",
            maxDimensions: 2,
            sizeRating: "any",
            structuralInputs: ["node"],
        },
        bfs,
    ),
    entry(
        {
            id: "bipartite",
            plainName: "Two Columns",
            technicalName: "Bipartite layout",
            description:
                "Puts one named set of nodes in one column and everything else in a second, for " +
                "a graph whose edges only ever run between the two.",
            family: "hierarchical",
            kind: "batch",
            maxDimensions: 2,
            sizeRating: "any",
            structuralInputs: ["partition"],
        },
        bipartite,
    ),
    entry(
        {
            id: "layers",
            plainName: "Columns by Group",
            technicalName: "Multipartite layout",
            description: "Puts each group of nodes in its own column, in the order the groups are given.",
            family: "hierarchical",
            kind: "batch",
            maxDimensions: 2,
            sizeRating: "any",
            structuralInputs: ["partition"],
        },
        multipartite,
    ),
    entry(
        {
            id: "fixed",
            plainName: "Keep Positions",
            technicalName: "Fixed layout",
            description: "Leaves every node exactly where the loaded data placed it.",
            family: "special",
            kind: "batch",
            maxDimensions: 3,
            sizeRating: "any",
            structuralInputs: [],
        },
        fixed,
    ),
];

/** The descriptors alone, which is what `catalog.layouts()` publishes. */
export const LAYOUT_DESCRIPTORS: readonly LayoutDescriptor[] = LAYOUT_CATALOG.map((e) => e.descriptor);

/**
 * The built-in layout names no registered engine draws yet. Listed rather than omitted, because
 * a name that is in the type and missing from the catalogue is otherwise discovered by asking
 * for it and getting an error.
 */
export const UNSERVED_LAYOUT_IDS: readonly UnservedLayout[] = [
    {
        id: "radial",
        reason:
            "No engine arranges a graph in rings by distance from a chosen node. The spiral " +
            "layout winds outward but orders nodes by position in the list, not by the graph, " +
            "so it answers a different question and is published under its own name instead.",
    },
    {
        id: "grid",
        reason: "No engine places nodes on a regular lattice.",
    },
];

// ---------------------------------------------------------------------------------------------
// Lookups
// ---------------------------------------------------------------------------------------------

/**
 * Find one layout's descriptor by its public name.
 * @param id - The layout name.
 * @returns The descriptor, or undefined when nothing in the catalogue answers to that name.
 */
export function layoutDescriptor(id: LayoutId): LayoutDescriptor | undefined {
    return LAYOUT_DESCRIPTORS.find((descriptor) => descriptor.id === id);
}

/**
 * Find one layout's whole entry, including the engines that are not the default.
 * @param id - The layout name.
 * @returns The entry, or undefined when nothing in the catalogue answers to that name.
 */
export function layoutEntry(id: LayoutId): LayoutCatalogEntry | undefined {
    return LAYOUT_CATALOG.find((candidate) => candidate.descriptor.id === id);
}

/**
 * Find the public layout name an engine serves, which is the question a consumer holding a
 * 1.x engine name needs answered to migrate.
 * @param engine - A registered engine name, such as "ngraph".
 * @returns The layout name, or undefined when no catalogue entry lists that engine.
 */
export function layoutIdForEngine(engine: string): LayoutId | undefined {
    const found = LAYOUT_CATALOG.find((candidate) =>
        candidate.implementations.some((implementation) => implementation.engine === engine),
    );

    return found?.descriptor.id;
}
