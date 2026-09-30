/**
 * @file The file writers a third party registered.
 *
 * A writer is a graph-io exporter (`GraphExporter`: `check`, `export`, `exportToString`) wrapped
 * with the element's catalogue entry for the format. Registering one puts the format in
 * `session.catalog.formats()` with `canExport: true`, reserves the element's own format ids,
 * validates the writer's options and makes `exportGraph(format)` reach it. Nothing here imports a
 * reader, a renderer or the DOM, so `./extend` stays usable from Node.
 *
 * A writer and a reader for the same id are two registrations of one format: they must agree on
 * what the format is called and what its files look like, and the catalogue publishes ONE entry
 * with both `canImport` and `canExport` true. A writer with no reader never takes part in
 * detection, so it can never make a dropped file fail with "no reader".
 */

import type { CommonExportOptions, GraphExporter } from "@graphty/graph-io";

import { GraphtyError } from "../errors";
import { registeredFormatById, registeredFormatDescriptors } from "./formatRegistry";
import { createPluginRegistry, type RegisterOptions } from "./pluginRegistry";
import { type FormatDescriptor, KNOWN_FORMAT_IDS, type OptionDescriptor } from "./types";

/** What `registerFormatWriter` accepts. */
export interface FormatWriterRegistration {
    /**
     * The format's catalogue entry, with `canExport: true`. When a reader for the same id is
     * registered, the two must agree on `plainName`, `extensions` and `mimeTypes`.
     */
    readonly descriptor: FormatDescriptor;
    /**
     * The options the writer accepts beside graph-io's common ones (`sanitizeIds`,
     * `onMixedDirection`). An export naming any other option is refused with `E_UNKNOWN_OPTION`.
     */
    readonly writerOptions?: readonly OptionDescriptor[];
    /** The graph-io exporter that does the writing. Its `format` must equal `descriptor.id`. */
    // The exporter's own option type is the author's business; the element hands it a record.
    readonly exporter: GraphExporter<Record<string, unknown> & CommonExportOptions>;
}

/** The options every writer takes from graph-io, whatever the format. */
export const COMMON_WRITER_OPTIONS: readonly OptionDescriptor[] = [
    {
        name: "sanitizeIds",
        plainName: "Unwritable Ids",
        technicalName: "sanitizeIds",
        type: "enum",
        values: [
            { value: "error", label: "Refuse the export" },
            { value: "mangle", label: "Rewrite them, keeping the original" },
        ],
        description:
            "What to do with a node id the format cannot hold, such as a text id in GML or GraphML. " +
            "Left unset, the export is refused with E_UNSUPPORTED.",
    },
    {
        name: "onMixedDirection",
        plainName: "Mixed Directions",
        technicalName: "onMixedDirection",
        type: "enum",
        values: [
            { value: "error", label: "Refuse the export" },
            { value: "directed", label: "Write every edge as directed" },
            { value: "undirected", label: "Write every edge as undirected" },
        ],
        description: "What to do with a graph of directed and undirected edges in a format that holds one kind.",
    },
];

const registry = createPluginRegistry<FormatWriterRegistration, FormatDescriptor>({
    kind: "writer",
    idOf: (entry) => entry.descriptor.id,
    descriptorOf: (entry) =>
        Object.freeze({
            ...entry.descriptor,
            writerOptions: [...(entry.writerOptions ?? []), ...COMMON_WRITER_OPTIONS],
        }),
    implementationOf: (entry) => entry.exporter,
    builtInIds: () => KNOWN_FORMAT_IDS,
});

/**
 * Refuse a registration, naming the field at fault.
 * @param field - The member of the registration that is wrong.
 * @param message - Why.
 * @throws Always: a `GraphtyError` with `E_BAD_COMMAND`.
 */
function refuse(field: string, message: string): never {
    throw new GraphtyError({
        code: "E_BAD_COMMAND",
        message,
        source: "registry",
        details: { kind: "format", field },
    });
}

/**
 * Check that a reader's descriptor and a writer's describe the same format.
 * @param reader - The reader's descriptor.
 * @param writer - The writer's descriptor.
 * @throws A `GraphtyError` with `E_BAD_COMMAND`, `field: "descriptor"`, when they disagree.
 */
function assertAgree(reader: FormatDescriptor, writer: FormatDescriptor): void {
    const same = (a: readonly string[], b: readonly string[]): boolean =>
        a.length === b.length && a.every((value, at) => value === b[at]);
    if (
        reader.plainName !== writer.plainName ||
        !same(reader.extensions, writer.extensions) ||
        !same(reader.mimeTypes, writer.mimeTypes)
    ) {
        refuse(
            "descriptor",
            `the reader and the writer registered as "${writer.id}" describe different formats; ` +
                "they must agree on plainName, extensions and mimeTypes, because the catalogue lists one format",
        );
    }
}

/**
 * Register a writer for a file format.
 *
 * Follows the policy every registry has: a built-in id is refused with `E_DUPLICATE_PLUGIN`, the
 * same exporter registered twice is a no-op, and a different exporter under a taken id replaces
 * it with one warning, or throws with `{ strict: true }`.
 * @param registration - The descriptor, the exporter and the writer's options.
 * @param options - Whether a collision throws instead of replacing.
 * @throws A `GraphtyError` with `E_BAD_COMMAND` (`details.field` names the member at fault) or
 * `E_DUPLICATE_PLUGIN`.
 */
export function registerFormatWriter(registration: FormatWriterRegistration, options?: RegisterOptions): void {
    const { descriptor, exporter } = registration as Partial<FormatWriterRegistration>;
    if (typeof descriptor !== "object" || descriptor === null) {
        refuse("descriptor", "a writer registration needs a descriptor");
    }

    if (!descriptor.canExport) {
        refuse("descriptor.canExport", `the writer for "${descriptor.id}" must describe a format with canExport: true`);
    }

    if (
        typeof exporter !== "object" ||
        exporter === null ||
        typeof exporter.check !== "function" ||
        typeof exporter.export !== "function" ||
        typeof exporter.exportToString !== "function"
    ) {
        refuse(
            "exporter",
            `the writer for "${descriptor.id}" needs a graph-io exporter: check, export and exportToString`,
        );
    }

    if (exporter.format !== descriptor.id) {
        refuse(
            "exporter.format",
            `the exporter registered as "${descriptor.id}" names its format "${exporter.format}"; one format has one name`,
        );
    }

    const reader = registeredFormatById(descriptor.id);
    if (reader !== undefined) {
        assertAgree(reader.descriptor, descriptor);
    }

    registry.register(registration, options);
}

/**
 * Called by `DataSource.register` before it publishes a reader: a reader for an id a writer
 * already holds must describe the same format.
 * @param reader - The reader's descriptor.
 * @throws A `GraphtyError` with `E_BAD_COMMAND` when a writer for the id describes another format.
 */
export function assertReaderAgreesWithWriter(reader: FormatDescriptor): void {
    const writer = registry.byId(reader.id);
    if (writer !== undefined) {
        assertAgree(reader, writer.descriptor);
    }
}

/**
 * The writer registered for a format.
 * @param id - The format id.
 * @returns The registration, or undefined when nothing registered a writer for that id.
 */
export function registeredFormatWriter(id: string): FormatWriterRegistration | undefined {
    return registry.byId(id);
}

let merged: {
    readonly readers: readonly FormatDescriptor[];
    readonly writers: readonly FormatDescriptor[];
    readonly list: readonly FormatDescriptor[];
} | null = null;

/**
 * Every registered format as the catalogue lists it: the readers, each marked `canExport: true`
 * when a writer for it is registered, then the formats that only have a writer.
 *
 * The same array until a registration changes it, which is the identity promise
 * `session.catalog` composes against.
 * @returns The descriptors, in registration order.
 */
export function catalogFormatDescriptors(): readonly FormatDescriptor[] {
    const readers = registeredFormatDescriptors();
    const writers = registry.descriptors();
    if (writers.length === 0) {
        return readers;
    }

    if (merged?.readers !== readers || merged.writers !== writers) {
        const readerIds = new Set(readers.map((descriptor) => descriptor.id));
        const writerIds = new Set(writers.map((descriptor) => descriptor.id));
        const writerOptionsById = new Map(writers.map((descriptor) => [descriptor.id, descriptor.writerOptions]));
        const list = [
            ...readers.map((descriptor) =>
                writerIds.has(descriptor.id)
                    ? Object.freeze({
                          ...descriptor,
                          canExport: true,
                          writerOptions: writerOptionsById.get(descriptor.id),
                      })
                    : descriptor,
            ),
            ...writers
                .filter((descriptor) => !readerIds.has(descriptor.id))
                .map((descriptor) => Object.freeze({ ...descriptor, canImport: false })),
        ];
        merged = { readers, writers, list: Object.freeze(list) };
    }

    return merged.list;
}

/**
 * Forget every registered writer. FOR TESTS.
 */
export function clearRegisteredFormatWritersForTesting(): void {
    registry.clearForTesting();
}
