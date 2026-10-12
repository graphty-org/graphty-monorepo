/**
 * `@graphty/cytoscape-extensions/io`: reading and writing Cytoscape graphs in the file formats of @graphty/graph-io.
 * cy.graphtyImport() and cy.graphtyExport() load this module on their first call, so a page that never imports or
 * exports a file never downloads the parsers.
 */

import {
    checkExport,
    type ExportGraphOptions,
    exportGraphToString,
    ImportError,
    importGraph,
    type ImportGraphOptions,
    type ImportInput,
    type ImportIssue,
    type ImportReport,
    type LossNote,
} from "@graphty/graph-io";
import type { Collection, ElementDefinition } from "cytoscape";

import { elementsToSnapshot, flipY, snapshotToElements } from "./elements.js";

/** One thing graphtyExport's format cannot hold: `code`, `message`, the data field (`column`) and how many values. */
export type { LossNote } from "@graphty/graph-io";

/**
 * The formats graphtyImport reads; "auto" sniffs the format from the content (and `filename` when given). "cys" is a
 * Cytoscape desktop session file, which must be passed as bytes.
 */
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
    | "xgmml"
    | "cx2"
    | "cx"
    | "obo"
    | "cys";

/** The formats graphtyExport writes. XGMML is the one Cytoscape desktop opens as a network file. */
export type ExportFormat = "gexf" | "graphml" | "gml" | "dot" | "pajek" | "csv" | "json" | "neo4j" | "xgmml" | "cx2";

/** Options of graphtyImport: graph-io's import options (`filename`, `graphIndex`, format-specific ones, ...). */
export type ImportOptions = Omit<ImportGraphOptions, "format">;

/**
 * Options of graphtyExport: graph-io's export options for the format, plus whether to write a directed graph.
 * `sanitizeIds` defaults to "mangle" here (graph-io's default is "error"): GML and CX2 take only integer ids, so
 * when a node id is not a plain non-negative integer ("a", "-1", "007") the nodes are numbered and the original
 * kept in an attribute graphtyImport restores. When every id is one ("0", "17"), the ids are written as they are,
 * and "error" accepts them too.
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
 * @throws ImportError (from graph-io) when the file cannot be read, or when it yields no node and reports an error
 */
export async function importElements(
    input: ImportInput | ArrayBuffer,
    format: ImportFormat = "auto",
    options: ImportOptions = {},
): Promise<ImportedElements> {
    // fetch().arrayBuffer() and File.arrayBuffer() give an ArrayBuffer, which graph-io does not take
    const r = await importGraph(input instanceof ArrayBuffer ? new Uint8Array(input) : input, { ...options, format });
    // most text sniffs as CSV, so a file that is not a graph at all reads as an empty one with errors
    if (r.snapshot.nodeCount === 0 && r.report.errorCount > 0) {
        const first = r.report.issues.find((i) => i.severity === "error");
        throw new ImportError(
            `nothing could be read from the input as ${r.format}: ${first?.code ?? "E_IMPORT"}: ${first?.message ?? ""}`,
            r.report,
            { format: r.format },
        );
    }
    const warnings: ImportIssue[] = [];
    const elements = snapshotToElements(
        r.snapshot,
        ({ domain, from, to }) =>
            warnings.push({
                category: "coercion",
                severity: "warning",
                code: "W_COLUMN_RENAMED",
                message: `${domain} attribute "${from}" renamed to "${to}": Cytoscape reserves the data field "${from}"`,
                line: null,
                element: from,
            }),
        (id, takenBy) =>
            warnings.push({
                category: "coercion",
                severity: "warning",
                code: "W_EDGE_ID_DROPPED",
                message: `edge id "${id}" is already the id of ${takenBy === "node" ? "a node" : "an earlier edge"}; Cytoscape gives this edge a new id`,
                line: null,
                element: id,
            }),
    );
    // graph-io stores positions with y growing upward; Cytoscape's y grows downward
    for (const el of elements) {
        if (el.position !== undefined) {
            el.position.y = flipY(el.position.y);
        }
    }
    const report =
        warnings.length === 0
            ? r.report
            : {
                  ...r.report,
                  issues: [...r.report.issues, ...warnings],
                  warningCount: r.report.warningCount + warnings.length,
              };
    return { elements, directed: r.snapshot.directed, format: r.format, report };
}

/**
 * Whether a graph-io loss note is a loss for a Cytoscape graph. graph-io's notes describe its own snapshot read back
 * by itself; graphtyImport restores some of what they report:
 * - W_ID_TEXT_TYPE: every id is turned back into a string;
 * - W_COLUMN_NAME_CHANGED on the edge `id`, the `parent` or the `position` (DOT reads them back as "key",
 *   "graphty.parent" and "pos"): they are read back by their role, as the edge id, `data.parent` and the position;
 * - W_ROLE_DROPPED on `label`: the values read back as `data.label`, and Cytoscape has no label role to lose.
 * @param n - the note
 * @returns false for a note about something graphtyImport gives back
 */
function lostForCytoscape(n: LossNote): boolean {
    if (n.code === "W_ID_TEXT_TYPE") {
        return false;
    }
    if (n.code === "W_COLUMN_NAME_CHANGED" && (n.column === "id" || n.column === "parent" || n.column === "position")) {
        return false;
    }
    return !(n.code === "W_ROLE_DROPPED" && n.column === "label");
}

/** The formats that hold only integer node ids: a graph whose ids are all integers is written with them as they are. */
const INTEGER_ID_FORMATS: ReadonlySet<ExportFormat> = new Set(["gml", "cx2"]);

/**
 * Writes a collection as a graph file: every data field, each node's position and compound parent, and each
 * edge's id, as far as the format holds them (`onLoss` hears about the rest).
 * @param eles - the nodes and the edges between them
 * @param format - the format
 * @param options - graph-io's export options for the format, plus `directed`
 * @returns the file's text; rejects (a TypeError) when `eles` is not a collection
 */
export async function exportElements(
    eles: Collection,
    format: ExportFormat,
    options: ExportOptions = {},
): Promise<string> {
    // importElements returns definitions, which this cannot read without a core to build them
    if (typeof (eles as Partial<Collection> | null)?.nodes !== "function") {
        throw new TypeError(
            "exportElements needs a Cytoscape collection; wrap element definitions with cytoscape({ headless: true, elements }).elements()",
        );
    }
    const { directed, onLoss, ...rest } = options;
    const snapshot = elementsToSnapshot(eles, {
        directed,
        integerIds: INTEGER_ID_FORMATS.has(format),
    });
    const graphOptions = {
        sanitizeIds: "mangle" as const,
        ...(format === "json" ? { dialect: "cytoscape" } : {}),
        ...rest,
    };
    if (onLoss !== undefined) {
        const notes = checkExport(snapshot, format, graphOptions).filter(lostForCytoscape);
        if (notes.length > 0) {
            onLoss(notes);
        }
    }
    return exportGraphToString(snapshot, format, graphOptions);
}
