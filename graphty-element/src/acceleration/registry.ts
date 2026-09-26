/**
 * @file The accelerator registry: where an accelerator factory is registered, and where the
 * element looks for one.
 *
 * Registration is a side effect of importing an entry point. `import
 * "@graphty/graphty-element/webgpu"` registers the WebGPU factory here and is the whole of a
 * consumer's integration; the element does the rest. Nothing in this file names a GPU type, a
 * DOM API or a renderer, so the registry is usable from Node and from a worker.
 *
 * The registry holds factories, never accelerators. Building an accelerator costs a device, so
 * it happens once, when a controller probes, and not at import time.
 */

import { sharedStore } from "../catalog/pluginRegistry";
import { GraphtyError } from "../errors";
import type { AcceleratorFactory } from "./types";

/** A factory under a name, as it sits in the registry. */
export interface AcceleratorRegistration {
    /** The name this factory is registered under. Unique within a registry. */
    readonly name: string;
    /** The kind of hardware the factory builds for, for diagnostics before anything is built. */
    readonly backend?: "webgpu" | (string & {});
    /** Builds the accelerator, or declines. */
    readonly factory: AcceleratorFactory;
}

/** How a second registration under an existing name behaves. */
export interface RegisterAcceleratorOptions {
    /**
     * Refuses a different implementation under a name already taken, instead of replacing it.
     *
     * The default is forgiving because hot module replacement re-registers constantly and a
     * throw there would be noise. A build that wants the collision to be loud opts in.
     */
    readonly strict?: boolean;
}

/**
 * A set of accelerator factories.
 *
 * There is one default instance, {@link acceleratorRegistry}, which is what the `./webgpu`
 * entry point registers into and what a controller reads when it is not given another. Tests
 * make their own so that one test's fake accelerator is invisible to the next.
 */
export class AcceleratorRegistry {
    readonly #entries = new Map<string, AcceleratorRegistration>();
    readonly #listeners = new Set<() => void>();
    readonly #warned = new Set<string>();

    /**
     * Registers a factory.
     *
     * Registering the identical factory under the same name again is a no-op, which is what
     * hot module replacement needs. A different factory under a taken name warns once and
     * wins, unless `strict` was asked for, in which case it throws `E_DUPLICATE_PLUGIN`.
     * @param registration - The name, the backend and the factory.
     * @param options - Whether a collision throws instead of replacing.
     * @throws A `GraphtyError` with `E_BAD_COMMAND` when the registration is malformed, or with
     * `E_DUPLICATE_PLUGIN` when `strict` was asked for and the name is taken by a different
     * factory.
     */
    register(registration: AcceleratorRegistration, options?: RegisterAcceleratorOptions): void {
        if (registration.name === "") {
            throw new GraphtyError({
                code: "E_BAD_COMMAND",
                message: "an accelerator registration needs a name",
                source: "registry",
                details: { field: "name" },
            });
        }

        if (typeof registration.factory !== "function") {
            throw new GraphtyError({
                code: "E_BAD_COMMAND",
                message: `the accelerator "${registration.name}" was registered without a factory function`,
                source: "registry",
                details: { field: "factory", name: registration.name },
            });
        }

        const existing = this.#entries.get(registration.name);
        if (existing !== undefined) {
            if (existing.factory === registration.factory) {
                return;
            }

            if (options?.strict === true) {
                throw new GraphtyError({
                    code: "E_DUPLICATE_PLUGIN",
                    message: `an accelerator named "${registration.name}" is already registered`,
                    source: "registry",
                    details: { kind: "accelerator", name: registration.name },
                });
            }

            if (!this.#warned.has(registration.name)) {
                this.#warned.add(registration.name);
                console.warn(
                    `graphty: a second accelerator named "${registration.name}" replaced the first. ` +
                        "Register one implementation per name, or pass { strict: true } to make this throw.",
                );
            }
        }

        this.#entries.set(registration.name, registration);
        this.#announce();
    }

    /**
     * Removes a factory.
     * @param name - The name it was registered under.
     * @returns True when something was removed.
     */
    remove(name: string): boolean {
        const removed = this.#entries.delete(name);
        if (removed) {
            this.#announce();
        }

        return removed;
    }

    /**
     * Reports whether a name is registered.
     * @param name - The name to look for.
     * @returns True when a factory is registered under it.
     */
    has(name: string): boolean {
        return this.#entries.has(name);
    }

    /**
     * Every registered factory, in registration order.
     *
     * A controller probes them in this order and attaches the first accelerator it gets, so the
     * order is the preference order.
     * @returns The registrations.
     */
    list(): readonly AcceleratorRegistration[] {
        return [...this.#entries.values()];
    }

    /**
     * Removes every factory.
     *
     * Written for tests, which need each test to start from an empty registry.
     */
    clear(): void {
        if (this.#entries.size === 0) {
            return;
        }

        this.#entries.clear();
        this.#warned.clear();
        this.#announce();
    }

    /**
     * Subscribes to registration changes.
     *
     * A controller that has already concluded "no accelerator is registered" listens here, so
     * that an `import "@graphty/graphty-element/webgpu"` evaluated after the element was
     * constructed still switches acceleration on without the consumer doing anything.
     * @param listener - Called after every change, with no arguments.
     * @returns The unsubscribe function.
     */
    onChange(listener: () => void): () => void {
        this.#listeners.add(listener);
        return () => {
            this.#listeners.delete(listener);
        };
    }

    /** Tells every listener that the set of registrations changed. */
    #announce(): void {
        for (const listener of [...this.#listeners]) {
            listener();
        }
    }
}

/**
 * The registry the element uses when it is not given another, and the one the `./webgpu` entry
 * point registers into.
 *
 * One per page rather than one per copy of graphty-element, so the `./webgpu` entry reaches the
 * element whichever copy defined it.
 */
export const acceleratorRegistry = sharedStore("accelerator", () => new AcceleratorRegistry());

/**
 * Registers an accelerator factory with the default registry.
 *
 * This is what an entry point or a plugin calls. A consumer never calls it to switch WebGPU on:
 * that is one import, and the import calls this.
 * @param registration - The name, the backend and the factory.
 * @param options - Whether a collision throws instead of replacing.
 */
export function registerAccelerator(registration: AcceleratorRegistration, options?: RegisterAcceleratorOptions): void {
    acceleratorRegistry.register(registration, options);
}
