/**
 * @file The file formats a third party registered.
 *
 * WHAT WAS MISSING. A reader could be registered -- `DataSource.register` filed the class in a
 * map and a consumer could name it -- and the FORMAT could not. No descriptor, no extensions, no
 * media types, no content sniffer, so a registered reader was invisible to every picker and to
 * detection: a consumer had to know the format's name already and type it, and dropping a file
 * of that format on the element found nothing.
 *
 * WHAT IS HELD HERE. Only the catalogue half and the sniffer: the descriptor a picker reads, the
 * registry type the class was filed under, and the optional `detect`. The reader class itself
 * stays in `DataSource`'s own map. Nothing in this module imports a reader, which is what keeps
 * `./catalog` free of the import machinery -- a picker reading `catalog.formats()` pays for no
 * parser.
 *
 * ONE ACT, NOT TWO. `DataSource.register` publishes here; there is no separate
 * `registerFormat(descriptor)`. A descriptor filed without its class would be a catalogue entry
 * a consumer can see, select, and then be told does not exist.
 */

import { createPluginRegistry, type RegisterOptions } from "./pluginRegistry";
import { type FormatDescriptor, type FormatId, KNOWN_FORMAT_IDS } from "./types";

/** One format a third party registered: what a picker reads, and how a file is recognised. */
export interface RegisteredFormat {
    /** What the catalogue publishes about it. */
    readonly descriptor: FormatDescriptor;
    /** The name `DataSource.register` filed the reader class under. Equal to `descriptor.id`. */
    readonly type: string;
    /**
     * Reads the first bytes of a file and says whether this format claims it.
     *
     * Optional, and asked only after every built-in detector has been asked, so a plugin can
     * claim a file the element could not already read but can never take one a built-in claims.
     * A detector that throws is caught and treated as "no": a sniffer is a guess about somebody
     * else's bytes, and a guess that fails is an answer rather than a failed import.
     */
    readonly detect?: (sample: string) => boolean;
}

const registry = createPluginRegistry<RegisteredFormat, FormatDescriptor>({
    kind: "format",
    idOf: (entry) => entry.descriptor.id,
    descriptorOf: (entry) => entry.descriptor,
    implementationOf: (entry) => entry.descriptor,
    builtInIds: () => KNOWN_FORMAT_IDS,
});

/**
 * Publish a registered format to the catalogue and to detection.
 *
 * Called by `DataSource.register` for a class that declares a descriptor, and by nothing else.
 * @param entry - The descriptor, the registry type and the optional sniffer.
 * @param options - Whether a collision throws instead of replacing.
 * @throws A `GraphtyError` with `E_BAD_COMMAND` when the descriptor carries no id, or with
 * `E_DUPLICATE_PLUGIN` when the id is one the element ships.
 */
export function publishFormatDescriptor(entry: RegisteredFormat, options?: RegisterOptions): void {
    registry.register(entry, options);
}

/**
 * Every format a third party has registered, in registration order.
 *
 * Detection reads this, and the order is the order a plugin's sniffer is asked in.
 * @returns The entries.
 */
export function registeredFormats(): readonly RegisteredFormat[] {
    return registry.entries();
}

/**
 * What those formats publish, in registration order.
 *
 * The same array until something registers, which is the identity promise `session.catalog`
 * composes against.
 * @returns The descriptors.
 */
export function registeredFormatDescriptors(): readonly FormatDescriptor[] {
    return registry.descriptors();
}

/**
 * One registered format, by its id.
 * @param id - The format name.
 * @returns The entry, or undefined when nothing registered that name.
 */
export function registeredFormatById(id: FormatId): RegisteredFormat | undefined {
    return registry.byId(id);
}

/**
 * Forget every registered format.
 *
 * FOR TESTS, and named so that a reader cannot mistake it for part of the plugin contract. It
 * clears the catalogue half only: a suite that also registered a reader class clears that
 * through `DataSource`.
 */
export function clearRegisteredFormatsForTesting(): void {
    registry.clearForTesting();
}
