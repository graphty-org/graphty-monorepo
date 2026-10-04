/**
 * @file The format catalogue: the graph file formats the element can read and write.
 *
 * A descriptor says what a format is called, what its files are called, what a server calls it,
 * whether the element can read it, whether the element can write it, and what can be configured
 * about reading it. That is everything a file picker, a drag-and-drop target and an import dialog
 * need, and none of it requires importing a data source or a renderer.
 *
 * Every built-in format but CX version 1, Cytoscape sessions and OBO can be written:
 * `exportGraph(format)` hands the graph to the graph-io exporter of that format. A Neo4j
 * admin-import file is written as `csv` with `{ variant: "neo4j" }`, the same name the CSV reader
 * recognises it under. XGMML and CX2 are written with the graph's structure and attribute columns,
 * never its style layers.
 */

import type { CSVVariant } from "../data/CSVDataSource";
import { registeredFormatDescriptors } from "./formatRegistry";
import type { FormatDescriptor, KNOWN_FORMAT_IDS, OptionDescriptor } from "./types";
import { catalogFormatDescriptors, COMMON_WRITER_OPTIONS } from "./writerRegistry";

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
            "Where to find the node an edge ends at. Left unset, the element looks for target, then dst, then to.",
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
        name: "oboIds",
        plainName: "Ontology Ids",
        technicalName: "oboIds",
        type: "enum",
        values: [
            { value: "curie", label: "Short (GO:0008150)" },
            { value: "iri", label: "Full IRI" },
        ],
        default: "curie",
        description:
            "For an OBO Graphs document: write each term's id as a short prefixed id, or keep the " +
            "full IRI the file holds.",
    },
];

/**
 * Where Cytoscape's z goes. Cytoscape's z is a drawing order, not a depth, so it is kept as its own
 * `z` column unless the reader asks for it as a coordinate.
 */
const zAsOption: OptionDescriptor = {
    name: "zAs",
    plainName: "Cytoscape Z",
    technicalName: "zAs",
    type: "enum",
    values: [
        { value: "column", label: "Keep as a z attribute" },
        { value: "position", label: "Use as the z coordinate" },
    ],
    default: "column",
    description:
        "Cytoscape's z is a drawing order. Kept as a z attribute it leaves the drawing flat; as " +
        "the z coordinate it lifts nodes out of the plane.",
};

/** The network of a file that holds several, by name. */
const networkOption: OptionDescriptor = {
    name: "graphName",
    plainName: "Network",
    technicalName: "graphName",
    type: "string",
    description:
        "The name of the network to load from a file that holds several. Left unset, the first " +
        "network is loaded. listGraphs from the catalog lists them.",
};

const xgmmlOptions: readonly OptionDescriptor[] = [
    {
        name: "labelAliases",
        plainName: "Edge Label Endpoints",
        technicalName: "labelAliases",
        type: "boolean",
        description:
            'Find a missing edge endpoint from Cytoscape\'s "source (interaction) target" edge ' +
            "label. Left unset, on for Cytoscape files and off otherwise.",
    },
    {
        name: "repairBareAmpersands",
        plainName: "Repair Bare Ampersands",
        technicalName: "repairBareAmpersands",
        type: "boolean",
        default: false,
        description: "Read an & that starts no entity as text, as Cytoscape does for files its older versions wrote.",
    },
    networkOption,
    zAsOption,
];

const oboOptions: readonly OptionDescriptor[] = [
    {
        name: "obsolete",
        plainName: "Obsolete Terms",
        technicalName: "obsolete",
        type: "enum",
        values: [
            { value: "keep", label: "Keep" },
            { value: "drop", label: "Drop" },
        ],
        default: "keep",
        description: "Keep obsolete terms as nodes marked is_obsolete, or leave them and their edges out.",
    },
    {
        name: "typedefs",
        plainName: "Relations",
        technicalName: "typedefs",
        type: "enum",
        values: [
            { value: "metadata", label: "As metadata" },
            { value: "nodes", label: "As nodes" },
        ],
        default: "metadata",
        description: "Keep the relation definitions ([Typedef] frames) as metadata, or make them nodes too.",
    },
    {
        name: "addMissingNodes",
        plainName: "Undeclared Terms",
        technicalName: "addMissingNodes",
        type: "boolean",
        default: true,
        description:
            "Add a placeholder node for a term a relation names but the file never declares, or " +
            "drop the edge to it.",
    },
];

/**
 * Choices for an option, each value its own label.
 * @param values - The values.
 * @returns The choices.
 */
function choices(...values: string[]): { value: string; label: string }[] {
    return values.map((value) => ({ value, label: value }));
}

/** What `exportGraph` accepts per built-in format, beside the common options. */
const writerOptions: Readonly<Record<string, readonly OptionDescriptor[]>> = {
    json: [
        {
            name: "dialect",
            plainName: "JSON Shape",
            technicalName: "dialect",
            type: "enum",
            values: choices("node-link", "d3", "jgf", "cytoscape", "graphology", "vis"),
            description: "Which JSON graph shape to write. Left unset, graph-io writes node-link.",
        },
        { name: "indent", plainName: "Indent", technicalName: "indent", type: "integer", min: 0 },
    ],
    csv: [
        {
            name: "variant",
            plainName: "File Shape",
            technicalName: "variant",
            type: "enum",
            values: [
                { value: "generic", label: "Generic" },
                { value: "neo4j", label: "Neo4j Export" },
            ],
            description: "A Neo4j admin-import file, or a plain table (the default).",
        },
        {
            name: "dialect",
            plainName: "Header Names",
            technicalName: "dialect",
            type: "enum",
            values: choices("generic", "gephi"),
            default: "generic",
            description: "source,target,weight headers, or Gephi's Source,Target,Type,Weight.",
        },
        {
            name: "table",
            plainName: "Table",
            technicalName: "table",
            type: "enum",
            values: choices("edges", "nodes", "adjacency"),
            description: "Which table to write. Left unset, the edge table.",
        },
        { name: "delimiter", plainName: "Column Separator", technicalName: "delimiter", type: "string" },
        {
            name: "newline",
            plainName: "Line Ending",
            technicalName: "newline",
            type: "enum",
            values: [
                { value: "\n", label: "LF" },
                { value: "\r\n", label: "CRLF" },
            ],
        },
        { name: "header", plainName: "Header Row", technicalName: "header", type: "boolean" },
        {
            name: "neutraliseFormulas",
            plainName: "Neutralise Formulas",
            technicalName: "neutraliseFormulas",
            type: "boolean",
            default: true,
            description:
                "Prefix a text cell that starts with =, +, -, @, a tab or a carriage return with an " +
                "apostrophe, so a spreadsheet does not run it as a formula. Numbers are never touched. " +
                "Turn it off for a pipeline that reads the file with a CSV parser.",
        },
    ],
    graphml: [
        { name: "pretty", plainName: "Indent", technicalName: "pretty", type: "boolean" },
        {
            name: "edgedefault",
            plainName: "Default Edge Direction",
            technicalName: "edgedefault",
            type: "enum",
            values: choices("directed", "undirected"),
        },
    ],
    gexf: [
        {
            name: "version",
            plainName: "GEXF Version",
            technicalName: "version",
            type: "enum",
            values: choices("1.2", "1.3"),
        },
    ],
    gml: [
        { name: "weightKey", plainName: "Weight Key", technicalName: "weightKey", type: "string" },
        {
            name: "sanitizeKeys",
            plainName: "Unwritable Keys",
            technicalName: "sanitizeKeys",
            type: "enum",
            values: choices("error", "mangle"),
        },
    ],
    dot: [
        { name: "indent", plainName: "Indent", technicalName: "indent", type: "string" },
        { name: "name", plainName: "Graph Name", technicalName: "name", type: "string" },
        { name: "strict", plainName: "Strict Graph", technicalName: "strict", type: "boolean" },
    ],
    pajek: [{ name: "networkHeader", plainName: "Network Header", technicalName: "networkHeader", type: "boolean" }],
    xgmml: [
        {
            name: "cytoscapeEscapes",
            plainName: "Cytoscape Escapes",
            technicalName: "cytoscapeEscapes",
            type: "boolean",
            description: String.raw`Write a line break or a tab in a text value as Cytoscape's \n or \t.`,
        },
    ],
    cx2: [
        {
            name: "sanitizeIds",
            plainName: "Non-Integer Ids",
            technicalName: "sanitizeIds",
            type: "enum",
            values: [
                { value: "mangle", label: "Renumber, keeping the original" },
                { value: "error", label: "Refuse" },
            ],
            default: "mangle",
            description:
                "CX2 node ids are integers. Renumber other ids and keep each original in a " +
                "graphty:originalId attribute that reading the file back restores, or refuse the export.",
        },
    ],
};

/**
 * The options of a Neo4j admin-import export, `csv` with `{ variant: "neo4j" }`: graph-io's Neo4j
 * writer takes its own set, not the plain CSV writer's.
 */
export const NEO4J_WRITER_OPTIONS: readonly OptionDescriptor[] = [
    writerOptions.csv[0],
    {
        name: "part",
        plainName: "Tables",
        technicalName: "part",
        type: "enum",
        values: choices("all", "nodes", "relationships"),
    },
    { name: "delimiter", plainName: "Column Separator", technicalName: "delimiter", type: "string" },
    {
        name: "arrayDelimiter",
        plainName: "List Separator",
        technicalName: "arrayDelimiter",
        type: "enum",
        values: choices(";", ",", "|"),
    },
    { name: "quote", plainName: "Quote Character", technicalName: "quote", type: "string" },
    { name: "weightColumn", plainName: "Weight Property", technicalName: "weightColumn", type: "string" },
    { name: "idColumn", plainName: "Id Property", technicalName: "idColumn", type: "string" },
    ...writerOptions.csv.filter((option) => option.name === "neutraliseFormulas"),
    ...COMMON_WRITER_OPTIONS,
];

/**
 * The options `exportGraph` accepts for a built-in format.
 * @param id - The format.
 * @returns Its writer options, the common ones included.
 */
function writerOptionsOf(id: string): readonly OptionDescriptor[] {
    return [...(writerOptions[id] ?? []), ...COMMON_WRITER_OPTIONS];
}

/** Every file format the element can read or write. */
export const FORMAT_DESCRIPTORS: readonly FormatDescriptor[] = [
    {
        id: "json",
        plainName: "JSON",
        extensions: [".json"],
        mimeTypes: ["application/json"],
        canImport: true,
        canExport: true,
        options: [...jsonOptions, ...endpointOptions],
        writerOptions: writerOptionsOf("json"),
    },
    {
        id: "csv",
        plainName: "CSV",
        extensions: [".csv", ".tsv", ".tab", ".edges", ".edgelist"],
        mimeTypes: ["text/csv", "text/tab-separated-values", "text/plain"],
        canImport: true,
        canExport: true,
        options: [...csvOptions, ...endpointOptions],
        writerOptions: writerOptionsOf("csv"),
    },
    {
        id: "graphml",
        plainName: "GraphML",
        extensions: [".graphml", ".xml"],
        mimeTypes: ["application/graphml+xml", "application/xml", "text/xml"],
        canImport: true,
        canExport: true,
        options: endpointOptions,
        writerOptions: writerOptionsOf("graphml"),
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
        canExport: true,
        options: endpointOptions,
        writerOptions: writerOptionsOf("gexf"),
    },
    {
        id: "gml",
        plainName: "GML",
        extensions: [".gml"],
        mimeTypes: ["text/plain"],
        canImport: true,
        canExport: true,
        options: endpointOptions,
        writerOptions: writerOptionsOf("gml"),
    },
    {
        id: "dot",
        plainName: "DOT",
        extensions: [".dot", ".gv"],
        mimeTypes: ["text/vnd.graphviz", "text/plain"],
        canImport: true,
        canExport: true,
        options: endpointOptions,
        writerOptions: writerOptionsOf("dot"),
    },
    {
        id: "pajek",
        plainName: "Pajek NET",
        extensions: [".net", ".paj"],
        mimeTypes: ["text/plain"],
        canImport: true,
        canExport: true,
        options: endpointOptions,
        writerOptions: writerOptionsOf("pajek"),
    },
    {
        id: "xgmml",
        plainName: "XGMML",
        // ".xml" is claimed by GraphML and GEXF too; detection asks each one's content sniffer.
        extensions: [".xgmml", ".xml"],
        mimeTypes: ["application/xgmml", "text/xgmml", "text/xgmml+xml", "application/xml", "text/xml"],
        canImport: true,
        canExport: true,
        options: xgmmlOptions,
        writerOptions: writerOptionsOf("xgmml"),
    },
    {
        id: "cx2",
        plainName: "CX2",
        extensions: [".cx2"],
        mimeTypes: ["application/json"],
        canImport: true,
        canExport: true,
        options: [zAsOption],
        writerOptions: writerOptionsOf("cx2"),
    },
    {
        id: "cx",
        plainName: "CX",
        extensions: [".cx"],
        mimeTypes: ["application/json"],
        canImport: true,
        canExport: false,
        options: [networkOption, zAsOption],
    },
    {
        id: "cys",
        plainName: "Cytoscape Session",
        extensions: [".cys"],
        mimeTypes: ["application/zip"],
        canImport: true,
        canExport: false,
        options: [networkOption, zAsOption],
    },
    {
        id: "obo",
        plainName: "OBO",
        extensions: [".obo"],
        mimeTypes: ["text/obo", "application/obo"],
        canImport: true,
        canExport: false,
        options: oboOptions,
    },
];

/**
 * The built-in format names no registered data source reads. Listed rather than omitted, so a
 * consumer learns the gap from the catalogue instead of from a failed load, and a load that names
 * one fails with the reason given here.
 *
 * "sif" is deprecated (issue #306): it is removed from `FormatId` at the next major release unless
 * graph-io gains a reader for it first.
 */
export const UNSERVED_FORMAT_IDS: readonly UnservedFormat[] = [
    {
        id: "sif",
        reason:
            "No data source reads the Cytoscape simple interaction format. " +
            "The name is deprecated and is removed at the next major release unless a reader lands.",
    },
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
    return (
        FORMAT_DESCRIPTORS.find((descriptor) => descriptor.id === id) ??
        catalogFormatDescriptors().find((descriptor) => descriptor.id === id)
    );
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
