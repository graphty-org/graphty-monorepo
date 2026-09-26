/**
 * @file The one registration policy all six extension points obey.
 *
 * Six points that each handled a duplicate differently would be six behaviours to learn and six
 * places for the policy to drift, so the policy is written once here and every registry is a
 * dozen lines over it. What a caller has to know is the same whichever point they are
 * registering into.
 *
 * THE POLICY, AND WHY EACH HALF OF IT IS WHAT IT IS.
 *
 * - Registering the IDENTICAL implementation under the same name again is a no-op. A bundler
 *   re-evaluating a module, or hot module replacement re-running it, must not turn one extension
 *   into two.
 * - Registering a DIFFERENT implementation under a name already taken replaces it and warns once
 *   on the console. The default is forgiving because hot module replacement re-registers
 *   constantly and a throw there would be noise; a build that wants the collision to be loud
 *   passes `{ strict: true }` and gets `E_DUPLICATE_PLUGIN`.
 * - Registering anything under an id the element itself ships is ALWAYS `E_DUPLICATE_PLUGIN`,
 *   strict or not. Replacing your own registration is a development convenience; replacing a
 *   built-in changes what an existing saved document means, and a document that painted with
 *   `viridis` yesterday has to paint with `viridis` today.
 * - An empty id is `E_BAD_COMMAND`, at the point the author can see it.
 *
 * THE IDENTITY PROMISE. `descriptors()` returns the same frozen array until the map changes.
 * This is a promise the catalogue depends on rather than a micro-optimisation: `session.catalog`
 * composes the built-in table with this one and returns the built-in array ITSELF while nothing
 * is registered, so two sessions that agree exactly compare equal instead of looking as though
 * they disagreed.
 *
 * THERE IS NO UNREGISTER. A descriptor is public API the moment something records it: a layer's
 * source names the palette, a saved document references the format, a run's result path is built
 * from the algorithm key. Taking one away at run time would leave those pointing at nothing.
 * {@link PluginRegistry.clearForTesting} exists so a suite can leave the registry as it found
 * it, and is named so nobody can mistake it for part of the contract.
 *
 * ONE STORE PER PAGE, NOT PER COPY. A page can evaluate graphty-element twice -- the self-contained
 * bundle beside an `./extend` import, two installs of the package, a dev server loading one module
 * under two URLs -- and the element deliberately survives that. Every registry therefore keeps its
 * state on `globalThis` under a `Symbol.for` key ({@link sharedStore}), so a registration made
 * through any copy reaches the element any other copy defined.
 *
 * NOTHING HERE IMPORTS A CLASS, a reader, an engine or a renderer. A registry holds whatever it
 * was handed at run time, which is what keeps `./catalog` and `./extend` resolvable in Node.
 */

import { GraphtyError } from "../errors";

/** How a second registration under an existing name behaves. */
export interface RegisterOptions {
    /**
     * Refuses a different implementation under a name already taken, instead of replacing it.
     *
     * The default is forgiving because hot module replacement re-registers constantly. A build
     * that wants the collision to be loud opts in.
     */
    readonly strict?: boolean;
}

/**
 * The extension points a registry can be built for. The list is closed.
 *
 * Exported only because `PluginRegistrySpec` names it and declaration emit requires every named
 * type in a published signature to be exported. It is not part of the plugin contract: a third
 * party registers through the six functions in `./extend` and never builds a registry.
 * @internal
 */
export type PluginKind = "algorithm" | "camera" | "format" | "layout" | "palette" | "sink";

/**
 * A set of registered extensions of one kind.
 *
 * Exported only because it is `createPluginRegistry`'s return type and declaration emit requires
 * it. Not part of the plugin contract.
 * @internal
 */
export interface PluginRegistry<TEntry, TDescriptor> {
    /**
     * Files one extension.
     * @param entry - The registration.
     * @param options - Whether a collision throws instead of replacing.
     */
    register(entry: TEntry, options?: RegisterOptions): void;
    /** Every registration, in registration order. */
    entries(): readonly TEntry[];
    /** What those registrations publish, in registration order. The same array until one changes. */
    descriptors(): readonly TDescriptor[];
    /** One registration, by the id it was filed under. */
    byId(id: string): TEntry | undefined;
    /** Forget everything. For tests, never for the element. */
    clearForTesting(): void;
}

/**
 * How one kind of extension is read: its id, what it publishes, and what counts as "the same".
 *
 * Exported only because it is `createPluginRegistry`'s parameter type and declaration emit
 * requires it. Not part of the plugin contract.
 * @internal
 */
export interface PluginRegistrySpec<TEntry, TDescriptor> {
    /** Which extension point this registry serves, which is what a failure names. */
    readonly kind: PluginKind;
    /** The id this entry is filed under. */
    idOf(entry: TEntry): string;
    /** What the catalogue publishes about it. */
    descriptorOf(entry: TEntry): TDescriptor;
    /**
     * The thing two registrations are compared on to decide whether the second is a re-import or
     * a genuinely different extension.
     *
     * It is the implementation rather than the whole entry because a registration object is
     * usually built fresh on each evaluation -- `registerPalette({ ... })` writes an object
     * literal -- while the thing that does the work (the class, the `compute` function, the
     * factory) is the module-level value that a re-import hands over unchanged.
     */
    implementationOf(entry: TEntry): unknown;
    /**
     * The ids the element itself ships, which no registration may take.
     *
     * A function rather than an array so a registry can be declared before the table it reserves
     * against has been built, which is what keeps this module free of every catalogue table.
     */
    builtInIds(): readonly string[];
}

/**
 * The one instance of a piece of registry state on this page, whichever copy of graphty-element
 * asks for it.
 *
 * Keyed on `Symbol.for`, which is shared by every realm-local module graph, so two copies of this
 * module find the same value. The `v1` names the shape of what is stored, and that includes the
 * shape of every entry and descriptor inside it, not only the container: any change to an entry
 * or a descriptor that an older copy on the same page cannot read must bump the version, so the
 * two copies keep separate stores rather than misreading each other's.
 * @param kind - Which piece of state.
 * @param create - Builds it the first time any copy asks.
 * @returns The page's instance.
 */
export function sharedStore<T>(kind: string, create: () => T): T {
    const page = globalThis as Record<symbol, unknown>;
    const key = Symbol.for(`graphty.registry.v1.${kind}`);

    page[key] ??= create();

    return page[key] as T;
}

/**
 * A map from name to implementation (a class, a factory) that this copy of graphty-element reads
 * first and every other copy on the page reads after its own.
 *
 * THIS COPY'S OWN ENTRIES WIN, because they include its built-ins: a second copy's box shape is
 * built with the second copy's Babylon.js, and its degree algorithm extends the second copy's base
 * class, so handing those to this copy's element would mix two renderers in one scene. What a copy
 * does not have itself -- a plugin registered through another copy -- comes from the page's
 * shared map.
 */
export class SharedImplementationMap<V> {
    readonly #own = new Map<string, V>();
    readonly #page: Map<string, V>;

    /**
     * Join the page's shared map for this extension point, creating it if this copy is first.
     * @param kind - Which extension point, which names the page's shared map.
     */
    constructor(kind: string) {
        this.#page = sharedStore(`${kind}-implementations`, () => new Map<string, V>());
    }

    /**
     * File an implementation for this copy and for every other copy on the page.
     * @param name - The name it is filed under.
     * @param value - The implementation.
     */
    set(name: string, value: V): void {
        this.#own.set(name, value);
        this.#page.set(name, value);
    }

    /**
     * This copy's implementation, or else the one another copy filed.
     * @param name - The name.
     * @returns The implementation, or undefined when no copy filed one.
     */
    get(name: string): V | undefined {
        return this.#own.get(name) ?? this.#page.get(name);
    }

    /**
     * Whether THIS copy filed the name, which is what a built-in duplicate check asks: another
     * copy registering its own built-ins is not a collision.
     * @param name - The name.
     * @returns True when this copy filed it.
     */
    hasOwn(name: string): boolean {
        return this.#own.has(name);
    }

    /**
     * Every name any copy filed.
     * @returns The names, this copy's first.
     */
    keys(): IterableIterator<string> {
        return new Set([...this.#own.keys(), ...this.#page.keys()]).values();
    }
}

/**
 * Build a registry for one extension point.
 * @param spec - How this kind of extension is read.
 * @returns The registry.
 */
export function createPluginRegistry<TEntry, TDescriptor>(
    spec: PluginRegistrySpec<TEntry, TDescriptor>,
): PluginRegistry<TEntry, TDescriptor> {
    // Shared by every copy on the page, the descriptor cache included, so the identity promise
    // holds across copies and a registration through one copy invalidates every copy's cache.
    const store = sharedStore(spec.kind, () => ({
        entries: new Map<string, TEntry>(),
        warned: new Set<string>(),
        cached: null as readonly TDescriptor[] | null,
    }));
    const { entries, warned } = store;

    return {
        register(entry: TEntry, options?: RegisterOptions): void {
            const id = spec.idOf(entry);

            if (typeof id !== "string" || id === "") {
                throw new GraphtyError({
                    code: "E_BAD_COMMAND",
                    message: `a ${spec.kind} registration needs an id`,
                    source: "registry",
                    details: { kind: spec.kind, field: "id" },
                });
            }

            if (spec.builtInIds().includes(id)) {
                throw new GraphtyError({
                    code: "E_DUPLICATE_PLUGIN",
                    message:
                        `"${id}" is the id of a ${spec.kind} the element ships, and a built-in id may not be ` +
                        "taken: a saved document that named it yesterday has to mean the same thing today",
                    source: "registry",
                    details: { kind: spec.kind, name: id, builtIn: true },
                });
            }

            const existing = entries.get(id);
            if (existing !== undefined) {
                if (spec.implementationOf(existing) === spec.implementationOf(entry)) {
                    return;
                }

                if (options?.strict === true) {
                    throw new GraphtyError({
                        code: "E_DUPLICATE_PLUGIN",
                        message: `a ${spec.kind} named "${id}" is already registered`,
                        source: "registry",
                        details: { kind: spec.kind, name: id },
                    });
                }

                if (!warned.has(id)) {
                    warned.add(id);
                    console.warn(
                        `graphty: a second ${spec.kind} named "${id}" replaced the first. ` +
                            "Register one implementation per name, or pass { strict: true } to make this throw.",
                    );
                }
            }

            entries.set(id, entry);
            store.cached = null;
        },

        entries(): readonly TEntry[] {
            return Object.freeze([...entries.values()]);
        },

        descriptors(): readonly TDescriptor[] {
            store.cached ??= Object.freeze([...entries.values()].map((entry) => spec.descriptorOf(entry)));

            return store.cached;
        },

        byId(id: string): TEntry | undefined {
            return entries.get(id);
        },

        clearForTesting(): void {
            entries.clear();
            warned.clear();
            store.cached = null;
        },
    };
}
