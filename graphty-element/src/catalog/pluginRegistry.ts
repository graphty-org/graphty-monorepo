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
 * Build a registry for one extension point.
 * @param spec - How this kind of extension is read.
 * @returns The registry.
 */
export function createPluginRegistry<TEntry, TDescriptor>(
    spec: PluginRegistrySpec<TEntry, TDescriptor>,
): PluginRegistry<TEntry, TDescriptor> {
    const entries = new Map<string, TEntry>();
    const warned = new Set<string>();
    let cached: readonly TDescriptor[] | null = null;

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
            cached = null;
        },

        entries(): readonly TEntry[] {
            return Object.freeze([...entries.values()]);
        },

        descriptors(): readonly TDescriptor[] {
            cached ??= Object.freeze([...entries.values()].map((entry) => spec.descriptorOf(entry)));

            return cached;
        },

        byId(id: string): TEntry | undefined {
            return entries.get(id);
        },

        clearForTesting(): void {
            entries.clear();
            warned.clear();
            cached = null;
        },
    };
}
