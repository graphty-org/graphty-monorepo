/**
 * @file Layout transitions: how nodes travel from one layout to the next.
 *
 * A transition is a registry, not a shader (design/rendering/shader-styles.md section 3.7): its
 * `move` says where a node is at progress `t` of the move, on the CPU, so every edge, label,
 * arrowhead and effect follows the node, and picking reads the layout's answer at once. The graph
 * names one with `layoutTransition` (`session.config.set({ layoutTransition: { transition } })`);
 * with none, a new layout's positions are drawn in one frame, as before.
 *
 * A bare id (`"glide"`) is reserved for the element's presets (`./presets`), so a future preset
 * never collides with a consumer's transition: everyone else's id is `"<namespace>/<name>"`.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import type { Vec3 } from "../camera/types";
import { createPluginRegistry, type RegisterOptions } from "../catalog/pluginRegistry";
import { isShaderId } from "../catalog/shaders";
import type { OptionDescriptor } from "../catalog/types";
import { GraphtyError } from "../errors";
import { TRANSITION_PRESETS } from "./presets";

/** What a transition knows about the node it moves, beside where it starts and ends. @since 3.36.0 */
export interface TransitionNode {
    /** The node's index in the graph. */
    readonly index: number;
    /** A number in 0..1 that is the same for this node on every run: jitter, stagger. */
    readonly seed: number;
    /**
     * How far the node is from the selection in hops: 0 for a selected node, rising to 1 at the
     * farthest node the selection reaches; 1 for a node it does not reach; undefined when nothing
     * is selected.
     */
    readonly hopFromSelection: number | undefined;
    /** How far the node starts from the middle of the graph: 0 at the middle, 1 at the farthest node. */
    readonly distanceFromCenter: number;
}

/** A drawing shown while a transition runs. `"particles"`: each node streams as a cloud of particles. @since 3.36.0 */
export type TransitionDrawable = "particles";

/** A transition, as the catalog lists it. @since 3.36.0 */
export interface TransitionDescriptor {
    /** `"<namespace>/<name>"`, or a bare id for the element's presets. */
    readonly id: string;
    /** The default name to show. */
    readonly plainName: string;
    /** What `layoutTransition.params` may set. */
    readonly params: readonly OptionDescriptor[];
    /** The drawing shown while it runs, when it has one. */
    readonly drawable?: TransitionDrawable;
}

/**
 * A transition to register: its catalog facts and how a node moves.
 * @since 3.36.0
 */
export interface TransitionRegistration {
    /** The catalog facts. `params` may be left out when it takes none. */
    readonly descriptor: Omit<TransitionDescriptor, "params" | "drawable"> & {
        readonly params?: readonly OptionDescriptor[];
    };
    /**
     * Where a node is at progress `t`, from 0 (where it was) to 1 (where the new layout puts it).
     * Called once per moving node per frame; the element draws `to` itself once `t` reaches 1.
     * @param t - The progress, 0..1, linear in time.
     * @param from - Where the node was when the layout changed.
     * @param to - Where the new layout puts it.
     * @param node - What else is known about the node.
     * @param params - `layoutTransition.params`, with every declared default filled in.
     * @returns Where to draw the node.
     */
    readonly move: (
        t: number,
        from: Vec3,
        to: Vec3,
        node: TransitionNode,
        params: Readonly<Record<string, unknown>>,
    ) => Vec3;
    /** A drawing shown while the transition runs. `"particles"` reads the params `particles` and `curl`. */
    readonly drawable?: TransitionDrawable;
}

/** A transition as the registry holds it: the registration and its frozen descriptor. */
export interface RegisteredTransition {
    readonly descriptor: TransitionDescriptor;
    readonly move: TransitionRegistration["move"];
}

/**
 * Check a registration and freeze its descriptor.
 * @param registration - The transition.
 * @param namespaced - Whether its id must carry a namespace.
 * @returns What the registry holds.
 * @throws A `GraphtyError` with `E_BAD_COMMAND` naming the member at fault.
 */
export function admitTransition(registration: TransitionRegistration, namespaced: boolean): RegisteredTransition {
    const given = (registration as Partial<TransitionRegistration> | undefined)?.descriptor;
    const refuse = (field: string): never => {
        throw new GraphtyError({
            code: "E_BAD_COMMAND",
            message: `The transition "${typeof given?.id === "string" ? given.id : ""}" was refused at ${field}.`,
            source: "registry",
            details: { kind: "transition", name: given?.id, field },
        });
    };

    if (typeof given !== "object") {
        refuse("descriptor");
    }

    if (!isShaderId(given?.id, namespaced)) {
        refuse("descriptor.id");
    }

    if (typeof given?.plainName !== "string" || given.plainName.trim() === "") {
        refuse("descriptor.plainName");
    }

    if (given?.params !== undefined && !Array.isArray(given.params)) {
        refuse("descriptor.params");
    }

    if (typeof registration.move !== "function") {
        refuse("move");
    }

    if (registration.drawable !== undefined && registration.drawable !== "particles") {
        refuse("drawable");
    }

    const { id, plainName, params = [] } = given as TransitionRegistration["descriptor"];
    return Object.freeze({
        descriptor: Object.freeze({
            id,
            plainName,
            params: Object.freeze(params.map((param) => Object.freeze({ ...param }))),
            ...(registration.drawable === undefined ? {} : { drawable: registration.drawable }),
        }),
        move: registration.move,
    });
}

const PRESETS: readonly RegisteredTransition[] = Object.freeze(
    TRANSITION_PRESETS.map((preset) => admitTransition(preset, false)),
);
const PRESET_DESCRIPTORS: readonly TransitionDescriptor[] = Object.freeze(PRESETS.map((preset) => preset.descriptor));

const registry = createPluginRegistry<RegisteredTransition, TransitionDescriptor>({
    kind: "transition",
    idOf: (entry) => entry.descriptor.id,
    descriptorOf: (entry) => entry.descriptor,
    implementationOf: (entry) => entry.move,
    builtInIds: () => PRESETS.map((preset) => preset.descriptor.id),
});

/**
 * Register a layout transition, so `layoutTransition` can name it and the catalog lists it.
 *
 * ```ts
 * registerTransition({
 *     descriptor: { id: "my/drop", plainName: "Drop" },
 *     move: (t, from, to) => ({ x: to.x, y: from.y + (to.y - from.y) * t * t, z: to.z }),
 * });
 * await element.session.config.set({ layoutTransition: { transition: "my/drop", seconds: 1 } });
 * ```
 * @param registration - The transition: its catalog facts and its `move`.
 * @param options - Whether a different transition under a taken id throws instead of replacing it.
 * @throws A `GraphtyError` with `E_BAD_COMMAND` naming the member at fault (`details.field`), or
 *   `E_DUPLICATE_PLUGIN` for a preset's id.
 * @since 3.36.0
 */
export function registerTransition(registration: TransitionRegistration, options?: RegisterOptions): void {
    registry.register(admitTransition(registration, true), options);
}

let listed:
    { readonly registered: readonly TransitionDescriptor[]; readonly all: readonly TransitionDescriptor[] } | undefined;

/**
 * Every transition the element can run: its presets first, then the registered ones.
 * @returns The descriptors.
 */
export function transitionDescriptors(): readonly TransitionDescriptor[] {
    const registered = registry.descriptors();
    if (PRESETS.length === 0) {
        return registered;
    }

    // The same array until a registration changes, as the registry's own list is.
    if (listed?.registered !== registered) {
        listed = { registered, all: Object.freeze([...PRESET_DESCRIPTORS, ...registered]) };
    }

    return listed.all;
}

/**
 * One transition by id.
 * @param id - The id.
 * @returns It, or undefined when the catalog does not list it.
 */
export function transitionById(id: string): RegisteredTransition | undefined {
    return PRESETS.find((preset) => preset.descriptor.id === id) ?? registry.byId(id);
}

/**
 * Forget every registered transition.
 *
 * FOR TESTS, and named so that a reader cannot mistake it for part of the plugin contract.
 */
export function clearRegisteredTransitionsForTesting(): void {
    registry.clearForTesting();
}
