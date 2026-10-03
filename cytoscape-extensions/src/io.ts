/**
 * `@graphty/cytoscape-extensions/io`: reading and writing Cytoscape graphs in the file formats of @graphty/graph-io.
 * cy.graphtyImport() and cy.graphtyExport() load this module on their first call, so a page that never imports or
 * exports a file never downloads the parsers.
 */

import {
    checkExport,
    type ExportGraphOptions,
    exportGraphToString,
    importGraph,
    type ImportGraphOptions,
    type ImportInput,
    type ImportReport,
    type LossNote,
} from "@graphty/graph-io";
import type { Collection, ElementDefinition } from "cytoscape";

import { elementsToSnapshot, snapshotToElements } from "./elements.js";

/** The formats graphtyImport reads; "auto" sniffs the format from the content (and `filename` when given). */
export type ImportFormat =
    | "auto"
    | "gexf"
    | "graphml"
    | "gml"
    | "dot"
    | "pajek"
    | "csv"
    | "json"
    | "neo4j"
    | "cx2"
    | "cx"
    | "obo";

/** The formats graphtyExport writes. */
export type ExportFormat = "gexf" | "graphml" | "gml" | "dot" | "pajek" | "csv" | "json" | "neo4j" | "cx2";

/** Options of graphtyImport: graph-io's import options (`filename`, `graphIndex`, format-specific ones, ...). */
export type ImportOptions = Omit<ImportGraphOptions, "format">;

/**
 * Options of graphtyExport: graph-io's export options for the format, plus whether to write a directed graph.
 * `sanitizeIds` defaults to "mangle" here (graph-io's default is "error"): GML and CX2 take only integer ids,
 * Cytoscape's are strings, so they are numbered and the original kept in an attribute graphtyImport restores.
 * JSON is written as Cytoscape JSON (`dialect: "cytoscape"`, the shape `cy.json()` and `cy.add()` use), which keeps
 * edge ids, compound parents and positions; pass `dialect: "node-link"` for the NetworkX shape.
 */
export interface ExportOptions extends ExportGraphOptions {
    /** Write the graph as directed. Default false. */
    readonly directed?: boolean | undefined;
    /**
     * Called before writing with what the format cannot hold (positions in GraphML, lists and objects in DOT,
     * ...), one note per column and kind of loss; not called when nothing is lost. Without it a loss is silent.
     */
    readonly onLoss?: ((notes: readonly LossNote[]) => void) | undefined;
}

/** A file read into Cytoscape element definitions. */
export interface ImportedElements {
    /** The nodes, then the edges. */
    readonly elements: ElementDefinition[];
    /** Whether the file's graph is directed: pass it as `directed` to the algorithms. */
    readonly directed: boolean;
    /** The format the input was read as. */
    readonly format: string;
    /** graph-io's report: counts, warnings, and what could not be represented. */
    readonly report: ImportReport;
}

/**
 * Reads a graph file into Cytoscape element definitions.
 * @param input - the file as text, bytes, a stream or chunks
 * @param format - the format, or "auto" to sniff it
 * @param options - graph-io's import options
 * @returns the elements, the direction, the format and graph-io's report
 * @throws ImportError (from graph-io) when the file cannot be read
 */
export async function importElements(
    input: ImportInput,
    format: ImportFormat = "auto",
    options: ImportOptions = {},
): Promise<ImportedElements> {
    const r = await importGraph(input, { ...options, format });
    return {
        elements: snapshotToElements(r.snapshot),
        directed: r.snapshot.directed,
        format: r.format,
        report: r.report,
    };
}

/**
 * Writes a collection as a graph file: every data field, each node's position and compound parent, and each
 * edge's id, as far as the format holds them (`onLoss` hears about the rest).
 * @param eles - the nodes and the edges between them
 * @param format - the format
 * @param options - graph-io's export options for the format, plus `directed`
 * @returns the file's text
 */
export function exportElements(eles: Collection, format: ExportFormat, options: ExportOptions = {}): Promise<string> {
    const { directed, onLoss, ...rest } = options;
    const snapshot = elementsToSnapshot(eles, { directed });
    const graphOptions = {
        sanitizeIds: "mangle" as const,
        ...(format === "json" ? { dialect: "cytoscape" } : {}),
        ...rest,
    };
    if (onLoss !== undefined) {
        const notes = checkExport(snapshot, format, graphOptions);
        if (notes.length > 0) {
            onLoss(notes);
        }
    }
    return exportGraphToString(snapshot, format, graphOptions);
}
