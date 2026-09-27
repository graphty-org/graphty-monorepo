/**
 * @file The algorithms a third party registered, as the catalogue sees them.
 *
 * WHY THIS EXISTS. The element's own twenty algorithms are a frozen table: they are known at
 * build time, they never differ between two sessions, and everything downstream is entitled to
 * assume that. A plugin is none of those things -- it arrives when somebody imports it -- and
 * for a long time the consequence was that a plugin could not be started as a run at all. The
 * run machinery resolves a key through the catalogue, the catalogue was the frozen table, and a
 * key that is not in it is refused. So a plugin could compute something and nothing could ask
 * for it: no progress, no cancellation, no cost estimate before the click, no ranking, no
 * summary, no reading, and no picture derived from its shape. Every capability the run model
 * exists to provide was available to the built-ins and to nobody else.
 *
 * WHY A GLOBAL REGISTRY KEEPS THE INVARIANT THAT MATTERS. `SESSION_CATALOG` is shared rather
 * than built per session, and its own comment gives the reason: two sessions that answered
 * differently would be a bug, not a feature. That reason survives here intact, because
 * registration is global exactly as `Algorithm.register` already is. Importing a plugin adds it
 * for the whole page, so every session still answers identically -- what changes is that the
 * answer is now "the built-ins plus whatever was imported" rather than "the built-ins".
 *
 * WHAT IS DELIBERATELY NOT HERE. No unregister, and no per-session override. A descriptor is
 * public API the moment a run records it: a layer's source names the algorithm, a saved document
 * references the key, and a journal entry replays it. Taking one away at run time would leave
 * those pointing at nothing, and letting two sessions disagree is the bug the shared catalogue
 * was arranged to prevent.
 *
 * THE DUPLICATE POLICY IS NOT WRITTEN HERE. It comes from `./pluginRegistry`, which every one of
 * the six extension points uses, so the answer to "what happens when I register twice" is the
 * same whichever point a consumer is registering into.
 *
 * Nothing here imports an algorithm class. `src/catalog/algorithms.ts` imports every built-in
 * class to publish its options, so a registry that algorithm classes write into has to be a
 * module those classes can import without closing a cycle -- which is why this is its own file
 * holding only data and type imports, and why the reserved built-in keys are read from
 * `KNOWN_ALGORITHMS` rather than from the descriptor table those classes build.
 */

import { GraphtyError } from "../errors";
import { createPluginRegistry, type RegisterOptions } from "./pluginRegistry";
import { type AlgorithmDescriptor, type AlgorithmKey, KNOWN_ALGORITHMS } from "./types";

/**
 * A registered algorithm: what the catalogue publishes about it, and where its class lives.
 *
 * The registry address is kept beside the descriptor rather than parsed back out of the key,
 * because the two are independent. A plugin's catalogue key is what a consumer types and what a
 * result path is built from; its namespace and type are what `Algorithm.register` filed the
 * class under. Making the key carry the address would force every plugin to name itself twice
 * in the same way and would break the moment one did not.
 */
export interface RegisteredAlgorithm {
    /** What the catalogue publishes about it. */
    readonly descriptor: AlgorithmDescriptor;
    /** The namespace the class is registered under. */
    readonly namespace: string;
    /** The type the class is registered under. */
    readonly type: string;
    /**
     * A cost model in seconds over a graph of n nodes and m edges, read from `static cost`.
     *
     * HERE RATHER THAN ON THE DESCRIPTOR, because a function is not plain JSON and the composed
     * catalogue has to survive `JSON.stringify` and a `postMessage`. Keeping the model beside
     * the class reference makes that true by type rather than by the discipline of a test, and a
     * plugin still supplies real arithmetic for the estimator to use.
     */
    readonly cost?: (n: number, m: number) => number;
    /**
     * A cost model in work units of the descriptor's cost class, read from `static costUnits`.
     *
     * The estimator divides it by this device's rate for that class, so calibration scales it.
     * Wins over {@link cost} when both are present.
     */
    readonly costUnits?: (n: number, m: number) => number;
    /**
     * The plugin's own version, read from `static version`.
     *
     * A saved run records the versions of the code that produced its numbers, and until this
     * existed a run of a third party's algorithm recorded nothing identifying it -- which is the
     * field's whole purpose.
     */
    readonly version?: string;
}

/**
 * Every algorithm a third party has registered a descriptor for, by catalogue key.
 *
 * Two registrations count as the same when they carry the same descriptor object, which is what
 * a module re-evaluated by a bundler hands over: `Algorithm.register` reads `static descriptor`
 * off the class, so the descriptor is the module-level value that survives a re-import while the
 * entry wrapping it is built fresh each time.
 */
const registry = createPluginRegistry<RegisteredAlgorithm, AlgorithmDescriptor>({
    kind: "algorithm",
    idOf: (entry) => entry.descriptor.key,
    descriptorOf: (entry) => entry.descriptor,
    implementationOf: (entry) => entry.descriptor,
    builtInIds: () => KNOWN_ALGORITHMS,
});

/**
 * Publish a registered algorithm to the catalogue.
 *
 * Called by `Algorithm.register` for a class that declares a descriptor, and by nothing else: a
 * descriptor that reached the catalogue without its class being registered would be an entry a
 * consumer can see, start, and then be told does not exist.
 * @param entry - The descriptor, the address its class is registered under, and its optional
 *   cost model and version.
 * @param options - Whether a collision throws instead of replacing.
 * @throws A `GraphtyError` with `E_BAD_COMMAND` when the descriptor carries no key or when its
 * key disagrees with the type the class registered under, or with `E_DUPLICATE_PLUGIN` when the
 * key is one the element ships or `strict` was asked for and the key is taken by a different
 * algorithm.
 */
export function publishAlgorithmDescriptor(entry: RegisteredAlgorithm, options?: RegisterOptions): void {
    /* ONE NAME, NOT TWO, AND IT IS REFUSED AT THE DOOR RATHER THAN DISCOVERED LATER. An
       algorithm names itself twice -- as the `type` its class is registered under and as the
       `key` its descriptor publishes -- and several parts of the element assume the two agree.
       The 1.10 "namespace:type" address derives a run's key from the type half, so a class whose
       two names differ computes the right numbers, publishes them under one name, and is then
       looked up under the other: the run succeeds and its suggested styling is silently missing,
       with nothing thrown and nothing logged. Refusing here means the author sees the mistake at
       import time, at the line that made it. */
    if (entry.descriptor.key !== entry.type) {
        throw new GraphtyError({
            code: "E_BAD_COMMAND",
            message:
                `the algorithm registered as "${entry.namespace}:${entry.type}" publishes the catalogue key ` +
                `"${entry.descriptor.key}". An algorithm has one name: make "descriptor.key" equal "static type".`,
            source: "registry",
            details: {
                kind: "algorithm",
                field: "descriptor.key",
                key: entry.descriptor.key,
                type: entry.type,
                namespace: entry.namespace,
            },
        });
    }

    registry.register(entry, options);
}

/**
 * The descriptors those algorithms publish, in registration order.
 *
 * What the catalogue appends to its own table, so a consumer reading `catalog.algorithms()` sees
 * one list and does not have to know which half an entry came from.
 *
 * THE SAME ARRAY UNTIL SOMETHING REGISTERS, which is a promise the catalogue depends on rather
 * than a micro-optimisation. Two sessions asking what the element can do must get back the same
 * data, and identity is how that is checked: a fresh array per call would make two sessions look
 * like they disagreed when they agree exactly.
 * @returns The descriptors.
 */
export function registeredAlgorithmDescriptors(): readonly AlgorithmDescriptor[] {
    return registry.descriptors();
}

/**
 * One registered algorithm, by the key its descriptor publishes.
 * @param key - The catalogue key.
 * @returns The entry, or undefined when nothing registered that key.
 */
export function registeredAlgorithmByKey(key: AlgorithmKey): RegisteredAlgorithm | undefined {
    return registry.byId(key);
}

/**
 * Forget every registered algorithm.
 *
 * FOR TESTS, and named so that a reader cannot mistake it for part of the plugin contract: a
 * suite that registers a plugin must be able to leave the registry as it found it, or the next
 * suite inherits an algorithm it never asked for. Nothing in the element calls this.
 */
export function clearRegisteredAlgorithmsForTesting(): void {
    registry.clearForTesting();
}
