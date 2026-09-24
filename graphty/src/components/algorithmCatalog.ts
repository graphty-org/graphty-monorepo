/**
 * The algorithms this application offers, read from graphty-element's catalogue.
 *
 * Nothing here describes an algorithm. Every name, description, category, cost and option comes
 * out of `BUILT_IN_ALGORITHMS`, so an algorithm the element gains, loses or renames shows up
 * here on the next build.
 *
 * The catalogue publishes twenty entries for the twenty-three algorithms the element's registry
 * answers to: the three shortest-path engines fold into one entry with a `method` parameter, and
 * the two component algorithms fold into one with a `strength` parameter. The registry has not
 * folded yet -- it still answers to "dijkstra" and "scc" -- so this list is built by expanding
 * each descriptor back over the `legacyKeys` it replaced. That keeps every capability the picker
 * used to offer, keeps saved state that names the old keys working, and carries the 2.0 key and
 * parameters on each entry so the fold is a one-line change when the registry catches up.
 */
import {
    BUILT_IN_ALGORITHMS,
    type BuiltInAlgorithmDescriptor,
    type CostClass,
    type LegacyAlgorithmKey,
    type OptionDescriptor,
} from "@graphty/graphty-element/catalog";

/**
 * An algorithm category, as the catalogue spells it: "centrality", "community", "path", "flow",
 * "structure" or whatever a later catalogue adds.
 */
export type AlgorithmCategory = string;

/** The namespace the element's algorithm registry files its built-ins under. */
const BUILT_IN_NAMESPACE = "graphty";

/** One algorithm the picker can offer and the element can run. */
export interface AlgorithmInfo {
    namespace: string;
    /** The key the element's algorithm registry answers to today. */
    type: string;
    /** The catalogue key this entry belongs to, once the registry folds. */
    key: string;
    /** The catalogue parameters that reproduce this entry, once the registry folds. */
    params: Readonly<Record<string, unknown>>;
    displayName: string;
    /** The name a reader who knows the literature would look for. */
    technicalName: string;
    category: AlgorithmCategory;
    description: string;
    costClass: CostClass;
    /** The complexity, in the catalogue's own words. */
    complexity: string;
    /** The options a form should draw: everything but the node pickers and the fold parameter. */
    options: readonly OptionDescriptor[];
    /** The node a run starts from, when it needs one named. */
    sourceOption?: OptionDescriptor;
    /** The node a run ends at, when it needs one named. */
    targetOption?: OptionDescriptor;
}

/**
 * Find the option that tells one folded entry apart from its siblings.
 *
 * A descriptor that replaced more than one registry key carries a parameter that says which of
 * them a run means -- `method` for the shortest-path engines, `strength` for the component
 * algorithms. The parameter is found by looking at what the siblings set rather than by naming
 * it here, so a later fold needs no edit.
 * @param descriptor - The descriptor to inspect.
 * @returns The distinguishing option, or undefined when the descriptor replaced one key.
 */
function foldOption(descriptor: BuiltInAlgorithmDescriptor): OptionDescriptor | undefined {
    if (descriptor.legacyKeys.length < 2) {
        return undefined;
    }

    const named = new Set(descriptor.legacyKeys.flatMap((legacy) => Object.keys(legacy.params ?? {})));

    return descriptor.options.find((option) => named.has(option.name) && option.values !== undefined);
}

/**
 * Name one entry of a folded descriptor, in words the picker can show beside its siblings.
 * @param descriptor - The descriptor the entry belongs to.
 * @param legacy - The registry key this entry runs.
 * @param fold - The option that tells the siblings apart, when there is one.
 * @returns The display name.
 */
function displayNameFor(
    descriptor: BuiltInAlgorithmDescriptor,
    legacy: LegacyAlgorithmKey,
    fold: OptionDescriptor | undefined,
): string {
    if (fold === undefined) {
        return descriptor.plainName;
    }

    const chosen = legacy.params?.[fold.name] ?? fold.default;
    const label = fold.values?.find((choice) => choice.value === chosen)?.label;

    return label === undefined ? descriptor.plainName : `${descriptor.plainName} (${label})`;
}

/**
 * Expand one descriptor into one entry per registry key it replaced.
 * @param descriptor - The catalogue descriptor.
 * @returns One entry per key the element's registry answers to.
 */
function entriesFor(descriptor: BuiltInAlgorithmDescriptor): AlgorithmInfo[] {
    const fold = foldOption(descriptor);
    const foldNames = new Set(descriptor.legacyKeys.flatMap((legacy) => Object.keys(legacy.params ?? {})));

    // A node picker is an option that names a node and that the reader is expected to fill in.
    // An advanced one -- the optional early-exit target on a traversal -- is not a picker.
    const pickers = descriptor.options.filter((option) => option.type === "node-id" && option.advanced !== true);
    const drawn = descriptor.options.filter(
        (option) => !pickers.includes(option) && !(fold !== undefined && foldNames.has(option.name)),
    );

    return descriptor.legacyKeys.map((legacy) => {
        const entry: AlgorithmInfo = {
            namespace: BUILT_IN_NAMESPACE,
            type: legacy.key,
            key: descriptor.key,
            params: legacy.params ?? {},
            displayName: displayNameFor(descriptor, legacy, fold),
            technicalName: descriptor.technicalName,
            category: descriptor.category,
            description: descriptor.description,
            costClass: descriptor.costClass,
            complexity: descriptor.complexity,
            options: drawn,
        };

        if (pickers[0] !== undefined) {
            entry.sourceOption = pickers[0];
        }

        if (pickers[1] !== undefined) {
            entry.targetOption = pickers[1];
        }

        return entry;
    });
}

/** Every algorithm the element's registry answers to, in the catalogue's own order. */
const ALGORITHM_CATALOG: readonly AlgorithmInfo[] = BUILT_IN_ALGORITHMS.flatMap(entriesFor);

/**
 * Every category the catalogue uses, in the order its algorithms are declared.
 * @returns The category names, first-seen first.
 */
export function getCategories(): AlgorithmCategory[] {
    return [...new Set(ALGORITHM_CATALOG.map((algorithm) => algorithm.category))];
}

/**
 * Every algorithm in one category.
 * @param category - The category to filter by.
 * @returns The algorithms in that category, in catalogue order.
 */
export function getAlgorithmsByCategory(category: AlgorithmCategory): AlgorithmInfo[] {
    return ALGORITHM_CATALOG.filter((algorithm) => algorithm.category === category);
}

/**
 * Find one algorithm by the key the element's registry answers to.
 * @param type - The registry key, such as "dijkstra".
 * @returns The entry, or undefined when the element registers no such algorithm.
 */
export function getAlgorithm(type: string): AlgorithmInfo | undefined {
    return ALGORITHM_CATALOG.find((algorithm) => algorithm.type === type);
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
 * Display labels for each algorithm category the catalogue offers.
 *
 * The catalogue publishes a category as a slug and has no heading for it, so the heading is
 * derived rather than listed.
 */
export const CATEGORY_DISPLAY_NAMES: Readonly<Record<string, string>> = Object.fromEntries(
    getCategories().map((category) => [category, titleCase(category)]),
);
