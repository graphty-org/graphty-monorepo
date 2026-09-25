/**
 * @file The format catalogue: the graph file formats the element can read and write.
 *
 * A descriptor says what a format is called, what its files are called, what a server calls it,
 * whether the element can read it, whether the element can write it, and what can be configured
 * about reading it. That is everything a file picker, a drag-and-drop target and an import dialog
 * need, and none of it requires importing a data source or a renderer.
 *
 * `canExport` is false everywhere today, and saying so is the point: the element registers seven
 * importers and no exporter, so a consumer that builds a "Save as" menu from this list builds an
 * empty one instead of an unimplemented one.
 */

import type { CSVVariant } from "../data/csv-variant-detection";
import { registeredFormatById, registeredFormatDescriptors } from "./formatRegistry";
import type { FormatDescriptor, KNOWN_FORMAT_IDS, OptionDescriptor } from "./types";

/** A built-in format name no registered data source reads. */
export interface UnservedFormat {
    id: (typeof KNOWN_FORMAT_IDS)[number];
    reason: string;
}

/**
 * The CSV shapes the reader recognises, with the label each one is offered under. Keyed by the
 * reader's own union, so a shape that is added or renamed there stops compiling here rather than
 * becoming a choice that selects nothing.
 */
const CSV_VARIANT_LABELS: Readonly<Record<CSVVariant, string>> = {
    "edge-list": "Edge List",
    "node-list": "Node List",
    "adjacency-list": "Adjacency List",
    neo4j: "Neo4j Export",
    gephi: "Gephi Export",
    cytoscape: "Cytoscape Export",
    generic: "Generic",
};

const csvOptions: readonly OptionDescriptor[] = [
    {
        name: "delimiter",
        plainName: "Column Separator",
        technicalName: "delimiter",
        type: "string",
        description:
            "The character between one column and the next. Worked out from the first line (comma, tab, semicolon or pipe) when it is not set.",
    },
    {
        name: "variant",
        plainName: "File Shape",
        technicalName: "variant",
        type: "enum",
        values: Object.entries(CSV_VARIANT_LABELS).map(([value, label]) => ({ value, label })),
        description: "Which CSV shape to read. Worked out from the header row when it is not set.",
    },
    {
        name: "idColumn",
        plainName: "Node Id Column",
        technicalName: "idColumn",
        type: "string",
        description: "The column holding each node's identity, when the file lists nodes.",
    },
];

/**
 * The endpoint options EVERY format accepts, under one pair of names.
 *
 * The catalogue used to publish `edgeSrcIdPath`/`edgeDstIdPath` for JSON, `sourceColumn`/
 * `targetColumn` for CSV, and nothing at all for the other five -- three names for one fact, and
 * five formats whose endpoints a reader could not name from a picker even though the element was
 * perfectly able to read them. Unset means the element decides for itself: it reads
 * `source`/`target`, then `src`/`dst`, then `from`/`to`, once per batch of edge records.
 */
const endpointOptions: readonly OptionDescriptor[] = [
    {
        name: "edgeSource",
        plainName: "Edge Start Field",
        technicalName: "edgeSource",
        type: "string",
        description:
            "Where to find the node an edge starts at. Left unset, the element looks for " +
            "source, then src, then from.",
    },
    {
        name: "edgeTarget",
        plainName: "Edge End Field",
        technicalName: "edgeTarget",
        type: "string",
        description:
            "Where to find the node an edge ends at. Left unset, the element looks for " +
            "target, then dst, then to.",
    },
];

const jsonOptions: readonly OptionDescriptor[] = [
    {
        name: "nodeIdPath",
        plainName: "Node Id Field",
        technicalName: "nodeIdPath",
        type: "string",
        description: "An expression selecting each node's identity out of the node record.",
    },
];

/** Every file format the element can read or write. */
export const FORMAT_DESCRIPTORS: readonly FormatDescriptor[] = [
    {
        id: "json",
        plainName: "JSON",
        extensions: [".json"],
        mimeTypes: ["application/json"],
        canImport: true,
        canExport: false,
        options: [...jsonOptions, ...endpointOptions],
    },
    {
        id: "csv",
        plainName: "CSV",
        extensions: [".csv", ".tsv", ".tab", ".edges", ".edgelist"],
        mimeTypes: ["text/csv", "text/tab-separated-values", "text/plain"],
        canImport: true,
        canExport: false,
        options: [...csvOptions, ...endpointOptions],
    },
    {
        id: "graphml",
        plainName: "GraphML",
        extensions: [".graphml", ".xml"],
        mimeTypes: ["application/graphml+xml", "application/xml", "text/xml"],
        canImport: true,
        canExport: false,
        options: endpointOptions,
    },
    {
        id: "gexf",
        plainName: "GEXF",
        // ".xml" is claimed here as well as by GraphML because both formats are XML and both are
        // routinely saved under the generic extension. Two claimants is what lets detection ask
        // each one's content sniffer which of them the file actually is, instead of a private
        // branch inside the detector hard-coding the two namespace strings -- which is the same
        // route a third party's XML dialect now takes.
        extensions: [".gexf", ".xml"],
        mimeTypes: ["application/gexf+xml", "application/xml", "text/xml"],
        canImport: true,
        canExport: false,
        options: endpointOptions,
    },
    {
        id: "gml",
        plainName: "GML",
        extensions: [".gml"],
        mimeTypes: ["text/plain"],
        canImport: true,
        canExport: false,
        options: endpointOptions,
    },
    {
        id: "dot",
        plainName: "DOT",
        extensions: [".dot", ".gv"],
        mimeTypes: ["text/vnd.graphviz", "text/plain"],
        canImport: true,
        canExport: false,
        options: endpointOptions,
    },
    {
        id: "pajek",
        plainName: "Pajek NET",
        extensions: [".net", ".paj"],
        mimeTypes: ["text/plain"],
        canImport: true,
        canExport: false,
        options: endpointOptions,
    },
];

/**
 * The built-in format names no registered data source reads. Listed rather than omitted, so a
 * consumer learns the gap from the catalogue instead of from a failed load.
 */
export const UNSERVED_FORMAT_IDS: readonly UnservedFormat[] = [
    { id: "sif", reason: "No data source reads the Cytoscape simple interaction format." },
    { id: "cx2", reason: "No data source reads the Cytoscape Exchange format." },
];

/**
 * Find one format's descriptor by its name.
 *
 * The element's own table is searched first and the registrations second, so a built-in name
 * always means what it has always meant and a registered format is still found by the name a
 * consumer typed or a saved document recorded. A lookup that missed registrations would leave the
 * extension point half-built: the format would appear in a picker and then fail when it was
 * chosen.
 * @param id - The format name, such as "graphml".
 * @returns The descriptor, or undefined when neither the element nor a registration knows that
 * format.
 */
export function formatDescriptor(id: string): FormatDescriptor | undefined {
    return FORMAT_DESCRIPTORS.find((descriptor) => descriptor.id === id) ?? registeredFormatById(id)?.descriptor;
}

/**
 * Find the formats whose files carry a given extension, which is what a drop target asks after
 * reading a file name.
 * @param extension - The extension to look for, with its leading dot, in any case.
 * @returns Every descriptor that claims the extension, the element's own first and registrations
 * after them in registration order.
 */
export function formatsForExtension(extension: string): readonly FormatDescriptor[] {
    const wanted = extension.toLowerCase();

    return [...FORMAT_DESCRIPTORS, ...registeredFormatDescriptors()].filter((descriptor) =>
        descriptor.extensions.includes(wanted),
    );
}
