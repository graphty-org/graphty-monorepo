/**
 * The list of network sources by id, apart from the code that reads them: registering and listing
 * a source loads no format and no source code. The default list behind `listSources()` and
 * `registerSource()` lives here rather than with the default registry, so a page that only offers
 * the sources (a start page, a form) does not load every format's importer.
 */

import { builtinSources } from "./builtins.js";
import { checkLazySource, checkSource } from "./define.js";
import { failAlone } from "./fail.js";
import { type GraphSource, type LazySource, type SourceDescriptor, type SourceInfo } from "./types.js";

/** A registered source: loaded, or a lazy one with its descriptor. */
export interface SourceEntry {
    /** The descriptor known without loading. */
    readonly descriptor: SourceDescriptor;
    /** The lazy registration, if any. */
    readonly lazy: LazySource | null;
    /** The loaded source. */
    source: GraphSource<never> | null;
    /** The load in flight. */
    loading: Promise<GraphSource<never>> | null;
}

/**
 * Whether a registration is a lazy source rather than a source.
 * @param value - the registration
 * @returns true for a LazySource
 */
function isLazy(value: GraphSource<never> | LazySource): value is LazySource {
    const v = value as { load?: unknown; records?: unknown; file?: unknown; import?: unknown };
    return typeof v.load === "function" && v.records === undefined && v.file === undefined && v.import === undefined;
}

/** The sources of one registry by id, in registration order. */
export class SourceCatalog {
    private readonly entries = new Map<string, SourceEntry>();

    /**
     * Register a source or a lazy source. A malformed one, or an id already taken, throws an
     * ImportError with E_SOURCE_INVALID.
     * @param source - the source
     */
    register(source: GraphSource<never> | LazySource): void {
        if (isLazy(source)) {
            checkLazySource(source);
        } else {
            checkSource(source);
        }
        if (this.entries.has(source.id)) {
            failAlone("E_SOURCE_INVALID", `a source with id ${source.id} is already registered`, {
                id: source.id,
                reason: "duplicate",
            });
        }
        const lazy = isLazy(source) ? source : null;
        this.entries.set(source.id, {
            descriptor: source.descriptor ?? { plainName: source.id, params: [] },
            lazy,
            source: lazy === null ? (source as GraphSource<never>) : null,
            loading: null,
        });
    }

    /**
     * Whether a source id is registered.
     * @param id - the id
     * @returns true when registered
     */
    has(id: string): boolean {
        return this.entries.has(id);
    }

    /**
     * Every registered source, without loading any code.
     * @returns one entry per source, in registration order
     */
    list(): readonly SourceInfo[] {
        return Object.freeze(
            [...this.entries].map(([id, e]) =>
                Object.freeze({ id, descriptor: e.descriptor, loaded: e.source !== null }),
            ),
        );
    }

    /**
     * The registration of one id.
     * @param id - the id
     * @returns the entry, or undefined when no source has the id
     */
    entry(id: string): SourceEntry | undefined {
        return this.entries.get(id);
    }

    /**
     * The registered ids.
     * @returns the ids, in registration order
     */
    ids(): string[] {
        return [...this.entries.keys()];
    }
}

/**
 * A list holding the built-in sources.
 * @returns the list
 */
function builtinCatalog(): SourceCatalog {
    const catalog = new SourceCatalog();
    for (const source of builtinSources()) {
        catalog.register(source);
    }
    return catalog;
}

/** The default registry's sources: what `listSources()` lists and `registerSource()` adds to. */
export const defaultCatalog: SourceCatalog = /* @__PURE__ */ builtinCatalog();

/**
 * Register a network source in the default registry, so loadFromSource() and graphty-element
 * find it by id. Throws an ImportError with E_SOURCE_INVALID for a malformed source or an id
 * already taken. Experimental.
 * @param source - the source, or a lazy source that loads its code on first use
 * @category Network sources
 */
export function registerSource<P>(source: GraphSource<P> | LazySource): void {
    defaultCatalog.register(source);
}

/**
 * Every source in the default registry with its descriptor (what a form asks for), loading no
 * source code. Experimental.
 * @returns one entry per source: id, descriptor, whether its code is loaded
 * @category Network sources
 */
export function listSources(): readonly SourceInfo[] {
    return defaultCatalog.list();
}
