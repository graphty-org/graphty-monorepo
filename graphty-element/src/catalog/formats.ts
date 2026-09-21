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
        default: ",",
        description: "The character between one column and the next.",
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
    {
        name: "sourceColumn",
        plainName: "Edge Start Column",
        technicalName: "sourceColumn",
        type: "string",
        description: "The column holding the node an edge starts at.",
    },
    {
        name: "targetColumn",
        plainName: "Edge End Column",
        technicalName: "targetColumn",
        type: "string",
        description: "The column holding the node an edge ends at.",
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
    {
        name: "edgeSrcIdPath",
        plainName: "Edge Start Field",
        technicalName: "edgeSrcIdPath",
        type: "string",
        description: "An expression selecting the node an edge starts at, out of the edge record.",
    },
    {
        name: "edgeDstIdPath",
        plainName: "Edge End Field",
        technicalName: "edgeDstIdPath",
        type: "string",
        description: "An expression selecting the node an edge ends at, out of the edge record.",
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
        options: jsonOptions,
    },
    {
        id: "csv",
        plainName: "CSV",
        extensions: [".csv", ".edges", ".edgelist"],
        mimeTypes: ["text/csv", "text/plain"],
        canImport: true,
        canExport: false,
        options: csvOptions,
    },
    {
        id: "graphml",
        plainName: "GraphML",
        extensions: [".graphml", ".xml"],
        mimeTypes: ["application/graphml+xml", "application/xml", "text/xml"],
        canImport: true,
        canExport: false,
        options: [],
    },
    {
        id: "gexf",
        plainName: "GEXF",
        extensions: [".gexf"],
        mimeTypes: ["application/gexf+xml", "application/xml", "text/xml"],
        canImport: true,
        canExport: false,
        options: [],
    },
    {
        id: "gml",
        plainName: "GML",
        extensions: [".gml"],
        mimeTypes: ["text/plain"],
        canImport: true,
        canExport: false,
        options: [],
    },
    {
        id: "dot",
        plainName: "DOT",
        extensions: [".dot", ".gv"],
        mimeTypes: ["text/vnd.graphviz", "text/plain"],
        canImport: true,
        canExport: false,
        options: [],
    },
    {
        id: "pajek",
        plainName: "Pajek NET",
        extensions: [".net", ".paj"],
        mimeTypes: ["text/plain"],
        canImport: true,
        canExport: false,
        options: [],
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
 * @param id - The format name, such as "graphml".
 * @returns The descriptor, or undefined when the element does not know that format.
 */
export function formatDescriptor(id: string): FormatDescriptor | undefined {
    return FORMAT_DESCRIPTORS.find((descriptor) => descriptor.id === id);
}

/**
 * Find the formats whose files carry a given extension, which is what a drop target asks after
 * reading a file name.
 * @param extension - The extension to look for, with its leading dot, in any case.
 * @returns Every descriptor that claims the extension, in catalogue order.
 */
export function formatsForExtension(extension: string): readonly FormatDescriptor[] {
    const wanted = extension.toLowerCase();

    return FORMAT_DESCRIPTORS.filter((descriptor) => descriptor.extensions.includes(wanted));
}
