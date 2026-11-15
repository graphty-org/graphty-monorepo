/**
 * @file What the catalogue reads from the built-in algorithm and layout classes, without importing
 * them.
 *
 * The classes stay the one place their options, weight handling and scoping are written. This
 * module reads a JSON snapshot of those static fields (`engine-facts.json`) so `./session` and
 * `./catalog` describe every algorithm and layout without carrying their implementations, which
 * load only where a run or a layout needs them (#890).
 *
 * The snapshot is written from the classes by `test/catalog/engine-facts.test.ts`, which fails
 * when it disagrees with them. Run that test with `UPDATE_ENGINE_FACTS=1` to rewrite it.
 */

import ENGINE_FACTS from "./engine-facts.json";
import type { AlgorithmDescriptor, OptionDescriptor } from "./types";

/** The static fields the catalogue reads from one algorithm class. */
export interface AlgorithmClassFacts {
    /** Its Zod options schema, emitted by `optionsFromZod` with no overrides. */
    readonly options: readonly OptionDescriptor[];
    /** Its `static scopeInput`, when it declares one. */
    readonly scopeInput?: string;
    readonly weightMeaning: AlgorithmDescriptor["weightMeaning"];
    readonly loadedWeightByDefault: boolean;
}

/** The static fields the catalogue reads from one layout engine class. */
export interface LayoutClassFacts {
    /** Its Zod options schema, emitted by `optionsFromZod` with no overrides. */
    readonly options: readonly OptionDescriptor[];
    readonly honoursWeights: boolean;
    readonly scoped: boolean;
}

/** The whole snapshot, keyed by each class's `static type`. */
export interface EngineFacts {
    readonly algorithms: Readonly<Record<string, AlgorithmClassFacts>>;
    readonly layouts: Readonly<Record<string, LayoutClassFacts>>;
}

// A JSON import widens every literal to `string`; the drift test checks the content against the classes.
const FACTS = ENGINE_FACTS as unknown as EngineFacts;

/** Per-option descriptor fields a Zod schema cannot express, by option name. */
export type OptionOverrides = Readonly<Record<string, Partial<OptionDescriptor>>>;

/**
 * Apply overrides the way `optionsFromZod` does: each named option's fields replaced by the override's.
 * @param options - The emitted options.
 * @param overrides - The overrides, by option name.
 * @returns The options with their overrides applied.
 */
function withOverrides(options: readonly OptionDescriptor[], overrides: OptionOverrides): readonly OptionDescriptor[] {
    return options.map((option) => {
        const override = overrides[option.name];
        return override === undefined ? option : { ...option, ...override };
    });
}

/**
 * Look up one entry of the snapshot.
 * @param table - The algorithms or layouts table.
 * @param type - The class's `static type`.
 * @returns The entry.
 * @throws When the snapshot has no entry, which means it was not regenerated after a class was added.
 */
function factsOf<T>(table: Readonly<Record<string, T>>, type: string): T {
    const found = table[type];
    if (found === undefined) {
        throw new Error(
            `engine-facts.json has no entry for "${type}": run test/catalog/engine-facts.test.ts with UPDATE_ENGINE_FACTS=1`,
        );
    }

    return found;
}

/**
 * The static fields of one built-in algorithm class.
 * @param type - The class's `static type`, such as "pagerank".
 * @returns Its facts.
 */
export function algorithmFacts(type: string): AlgorithmClassFacts {
    return factsOf(FACTS.algorithms, type);
}

/**
 * One built-in algorithm class's options, as `optionsFromZod` emits them.
 * @param type - The class's `static type`.
 * @param overrides - Descriptor fields its Zod schema cannot express, by option name.
 * @returns Its option descriptors, in declaration order.
 */
export function algorithmOptions(type: string, overrides: OptionOverrides = {}): readonly OptionDescriptor[] {
    return withOverrides(algorithmFacts(type).options, overrides);
}

/**
 * The static fields of one built-in layout engine class, its options with overrides applied.
 * @param type - The engine's `static type`, such as "ngraph".
 * @param overrides - Descriptor fields its Zod schema cannot express, by option name.
 * @returns Its options, `honoursWeights` and `scoped`.
 */
export function layoutFacts(type: string, overrides: OptionOverrides = {}): LayoutClassFacts {
    const facts = factsOf(FACTS.layouts, type);
    return { ...facts, options: withOverrides(facts.options, overrides) };
}
