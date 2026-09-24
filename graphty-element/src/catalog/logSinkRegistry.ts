/**
 * @file The log destinations a third party registered, by name.
 *
 * WHY A NAMED FACTORY AND NOT ONLY A LIVE OBJECT. A sink can already be attached by handing
 * `GraphtyLogger.addSink` an object, and that route works. It is also the whole of what a third
 * party had, and it is not what the element gives its own destinations: the built-in remote sink
 * is turned on by a STRING in a config object, so a settings panel can record it, a URL parameter
 * can name it, and stored configuration can bring it back on the next page load. A destination
 * reachable only by holding a live JavaScript object has none of that -- no key, no config field,
 * nothing a saved settings panel could write down.
 *
 * A named factory closes that. With one registered, a configuration can say
 * `{ sinks: [{ use: "acme-collector", options: { url: "..." } }] }`, stored configuration can
 * round-trip it, and `E_UNKNOWN_SINK` names it when nothing registered it.
 *
 * The registry holds factories, never sinks. Building a sink may open a connection or start a
 * timer, so it happens when a configuration asks for one and not at import time.
 */

import { GraphtyError } from "../errors";
import type { Sink } from "../logging/types";
import { createPluginRegistry, type RegisterOptions } from "./pluginRegistry";
import { KNOWN_LOG_SINK_IDS, type LogSinkDescriptor, type LogSinkId } from "./types";

/** One log destination a third party registered: what a settings panel reads, and how to build it. */
export interface LogSinkRegistration {
    /** What the catalogue publishes about it, including the options its factory accepts. */
    readonly descriptor: LogSinkDescriptor;
    /**
     * Builds the destination.
     *
     * Called with the options resolved against the descriptor's declared defaults, so a factory
     * reads plain data and never validates its own inputs.
     */
    readonly create: (options: Readonly<Record<string, unknown>>) => Sink;
}

const registry = createPluginRegistry<LogSinkRegistration, LogSinkDescriptor>({
    kind: "sink",
    idOf: (entry) => entry.descriptor.id,
    descriptorOf: (entry) => entry.descriptor,
    implementationOf: (entry) => entry.create,
    builtInIds: () => KNOWN_LOG_SINK_IDS,
});

/**
 * Register a log destination so a configuration can turn it on by name.
 * @param registration - The descriptor and the factory that builds the sink.
 * @param options - Whether a collision with an existing registration throws instead of replacing.
 * @throws A `GraphtyError` with `E_BAD_COMMAND` when the registration is malformed, naming the
 * field, or with `E_DUPLICATE_PLUGIN` when the id is one the element ships.
 */
export function registerLogSink(registration: LogSinkRegistration, options?: RegisterOptions): void {
    const descriptor = registration.descriptor as LogSinkDescriptor | undefined;

    if (descriptor === undefined || typeof descriptor !== "object") {
        throw new GraphtyError({
            code: "E_BAD_COMMAND",
            message: "registerLogSink takes a registration with a descriptor",
            source: "registry",
            details: { kind: "sink", field: "descriptor" },
        });
    }

    if (typeof registration.create !== "function") {
        throw new GraphtyError({
            code: "E_BAD_COMMAND",
            message: `the log destination "${String(descriptor.id)}" was registered without a create function`,
            source: "registry",
            details: { kind: "sink", name: String(descriptor.id), field: "create" },
        });
    }

    registry.register(registration, options);
}

/**
 * What those destinations publish, in registration order.
 *
 * The same array until something registers, which is the identity promise `session.catalog`
 * composes against.
 * @returns The descriptors.
 */
export function registeredLogSinkDescriptors(): readonly LogSinkDescriptor[] {
    return registry.descriptors();
}

/**
 * One registered log destination, by its id.
 * @param id - The destination name, as a configuration would write it.
 * @returns The registration, or undefined when nothing registered that name.
 */
export function registeredLogSinkById(id: LogSinkId): LogSinkRegistration | undefined {
    return registry.byId(id);
}

/**
 * Forget every registered log destination.
 *
 * FOR TESTS, and named so that a reader cannot mistake it for part of the plugin contract.
 */
export function clearRegisteredLogSinksForTesting(): void {
    registry.clearForTesting();
}
