/**
 * The URL source's descriptor and params: catalog data, available without loading the source's code.
 */

import { type SourceDescriptor } from "../types.js";

/** A yes/no choice; unset leaves the importer's own default. */
const YES_NO = [
    { value: "yes", label: "Yes" },
    { value: "no", label: "No" },
] as const;

/**
 * What to load from a web address. Experimental.
 * @category Network sources
 */
export interface UrlParams {
    /** The address of a graph file, http or https ("https://example.com/buildings.csv"). */
    readonly url: string;
    /** The file's format; detected from its name, its type and its first bytes when not given. */
    readonly format?: string | undefined;
    /** CSV and TSV: the field delimiter; detected when not given. */
    readonly delimiter?: "," | "\t" | ";" | "|" | undefined;
    /** CSV and TSV: whether the first row is a header; decided from it when not given. */
    readonly header?: "yes" | "no" | undefined;
    /** CSV and TSV: what a row is; decided from the header when not given. */
    readonly table?: "edges" | "nodes" | "adjacency" | undefined;
    /** CSV and TSV edge lists: the column of each edge's first node, by name or 0-based position. */
    readonly sourceColumn?: string | undefined;
    /** CSV and TSV edge lists: the column of each edge's second node, by name or 0-based position. */
    readonly targetColumn?: string | undefined;
    /** CSV and TSV node lists: the column of each node's id, by name or 0-based position. */
    readonly idColumn?: string | undefined;
    /** Whether edges are directed when the file does not say; the format's default when not given. */
    readonly directed?: "yes" | "no" | undefined;
}

/**
 * The descriptor of the `url` source: a graph file at a web address. Experimental.
 * @category Network sources
 */
export const URL_DESCRIPTOR: SourceDescriptor = Object.freeze({
    plainName: "URL",
    kind: "file-host",
    version: 1,
    defaultEndpoint: null,
    endpointParam: "url",
    auth: ["basic", "bearer"],
    authRequired: "optional",
    params: [
        {
            name: "url",
            plainName: "URL",
            type: "url",
            required: true,
            description: "The address of a graph file (http or https).",
        },
        {
            name: "format",
            plainName: "Format",
            type: "enum",
            description: "Detected from the file name, its type and its first bytes when not given.",
            values: [
                { value: "csv", label: "CSV / TSV" },
                { value: "json", label: "JSON" },
                { value: "graphml", label: "GraphML" },
                { value: "gexf", label: "GEXF" },
                { value: "gml", label: "GML" },
                { value: "dot", label: "DOT" },
                { value: "pajek", label: "Pajek" },
                { value: "neo4j", label: "Neo4j CSV" },
                { value: "xgmml", label: "XGMML" },
                { value: "cx2", label: "CX2" },
                { value: "cx", label: "CX" },
                { value: "obo", label: "OBO" },
                { value: "cys", label: "Cytoscape session" },
            ],
        },
        {
            name: "delimiter",
            plainName: "Delimiter",
            type: "enum",
            advanced: true,
            description: "CSV and TSV only. Detected when not given.",
            values: [
                { value: ",", label: "Comma" },
                { value: "\t", label: "Tab" },
                { value: ";", label: "Semicolon" },
                { value: "|", label: "Pipe" },
            ],
        },
        {
            name: "header",
            plainName: "First row is headers",
            type: "enum",
            advanced: true,
            description: "CSV and TSV only. Decided from the first row when not given.",
            values: YES_NO,
        },
        {
            name: "table",
            plainName: "Rows are",
            type: "enum",
            advanced: true,
            description: "CSV and TSV only. Decided from the header when not given.",
            values: [
                { value: "edges", label: "Edges" },
                { value: "nodes", label: "Nodes" },
                { value: "adjacency", label: "Adjacency lists" },
            ],
        },
        {
            name: "sourceColumn",
            plainName: "Source column",
            type: "string",
            advanced: true,
            description: "CSV and TSV edge lists: the column of each edge's first node, by name or 0-based position.",
        },
        {
            name: "targetColumn",
            plainName: "Target column",
            type: "string",
            advanced: true,
            description: "CSV and TSV edge lists: the column of each edge's second node, by name or 0-based position.",
        },
        {
            name: "idColumn",
            plainName: "Id column",
            type: "string",
            advanced: true,
            description: "CSV and TSV node lists: the column of each node's id, by name or 0-based position.",
        },
        {
            name: "directed",
            plainName: "Directed",
            type: "enum",
            advanced: true,
            description: "Whether edges are directed when the file does not say.",
            values: YES_NO,
        },
    ],
});
