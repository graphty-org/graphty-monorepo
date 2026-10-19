/**
 * `@graphty/cytoscape-extensions/io`: reading and writing Cytoscape graphs in the file formats of @graphty/graph-io.
 * cy.graphtyImport() and cy.graphtyExport() load this module on their first call, so a page that never imports or
 * exports a file never downloads the parsers.
 */

import type { GraphSnapshot } from "@graphty/graph-format";
import {
    checkExport,
    type CommonExportOptions,
    exportGraphToString,
    ImportError,
    importGraph,
    type ImportGraphOptions,
    type ImportInput,
    type ImportIssue,
    type ImportReport,
    type LossNote,
    registry,
} from "@graphty/graph-io";
import { extractPositions } from "@graphty/graph-io/positions";
import {
    type CytoscapeStylesheetRule,
    type ExtractedStyles,
    readCytoscapeStyles,
    STYLE_ISSUE,
    type StyleNote,
    toCytoscapeStylesheet,
} from "@graphty/graph-io/styles";
import type { Collection, Core, ElementDefinition } from "cytoscape";

import { elementsToSnapshot, exportedEdges, flipY, snapshotToElements } from "./elements.js";

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

/** One rule of a Cytoscape.js stylesheet: a selector and its properties. */
export type { CytoscapeStylesheetRule } from "@graphty/graph-io/styles";

/**
 * Options of graphtyImport: graph-io's import options (`filename`, `graphIndex`, format-specific ones, ...).
 * `styles: true` also reads the file's styles (its colors, sizes, shapes, ...) as a Cytoscape.js stylesheet,
 * returned as `stylesheet`; a property the file leaves to the program that wrote it gets that program's default
 * (`styles: { toolDefaults: false }` leaves them out).
 */
export type ImportOptions = Omit<ImportGraphOptions, "format"> & {
    /**
     * With `styles`, graphtyImport also appends the file's stylesheet to the core's own and gives each element the
     * per-element overrides that make it exact. Default false: the stylesheet is only returned.
     */
    readonly applyStyles?: boolean | undefined;
    /**
     * With `styles`, the value of the `graphty_import` data field every imported element gets and every rule of the
     * stylesheet tests, so a second import into the same core never restyles the first one's elements. Default: a
     * new one for each import.
     */
    readonly importId?: string | undefined;
};

/**
 * Options of graphtyExport: graph-io's export options for the format, plus whether to write a directed graph.
 * `sanitizeIds` defaults to "mangle" here (graph-io's default is "error"): GML and CX2 take only integer ids, so
 * when a node id is not a plain non-negative integer ("a", "-1", "007") the nodes are numbered and the original
 * kept in an attribute graphtyImport restores. When every id is one ("0", "17"), the ids are written as they are,
 * and "error" accepts them too.
 * JSON is written as Cytoscape JSON (`dialect: "cytoscape"`, the shape `cy.json()` and `cy.add()` use), which keeps
 * edge ids, compound parents and positions; pass `dialect: "node-link"` for the NetworkX shape.
 */
export interface ExportOptions extends CommonExportOptions {
    /**
     * Write the core's styles too: its stylesheet's rules, with what the core draws for each element as the truth
     * (a function-valued property is written per element and reported as W_STYLE_LAYER_FLATTENED). Each format
     * keeps as much of them as it can, so importing the file with `styles: true` draws the same; `onLoss` hears
     * about the rest (W_STYLE_ codes). Default false: without it `onLoss` hears W_STYLES_NOT_EXPORTED when the core
     * has a stylesheet of its own.
     */
    readonly styles?: boolean | undefined;
    /** Format-specific options, passed to graph-io as they are. */
    readonly [formatOption: string]: unknown;
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
    /**
     * With `styles`, the file's styles as a Cytoscape.js stylesheet scoped to this import; append it to the core's
     * rule by rule (`cy.style().selector(r.selector).style(r.style)` for each, then `cy.style().update()`). Absent
     * without `styles`.
     */
    readonly stylesheet?: CytoscapeStylesheetRule[];
    /**
     * With `styles`, per element (in the order of `elements`) the style overrides that make it draw exactly as the
     * file says where the stylesheet alone does not, or null; give them as each definition's `style`.
     */
    readonly bypass?: (Readonly<Record<string, string | number>> | null)[];
}

/** How many imports have read styles: the default import ids. */
let imports = 0;

/**
 * A style note as a report warning.
 * @param n - the note
 * @returns the issue
 */
function styleIssue(n: StyleNote): ImportIssue {
    return {
        category: "unsupported",
        severity: "warning",
        code: n.code,
        message: n.message,
        line: null,
        element: n.params.property,
    };
}

/**
 * Reads a graph file into Cytoscape element definitions.
 * Without `styles`, a GEXF `viz:color`, `viz:size`, `viz:shape` and `viz:thickness` also become data fields
 * (`data.color` as four numbers from 0 to 1, `data.size`, `data.shape`, `data.thickness`); these fields are
 * deprecated and are removed in the next major release: import with `styles: true`, whose stylesheet draws them.
 * With `styles: true` they are left out of data.
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
    const { applyStyles: _apply, importId, ...graphOptions } = options;
    const r = await importGraph(input instanceof ArrayBuffer ? new Uint8Array(input) : input, {
        ...graphOptions,
        format,
    });
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
        r.styles !== undefined && r.styles !== null,
    );
    // each format spells its coordinates its own way (yEd: a box's top-left corner, y down; Gephi: the
    // center, y up); graph-io's extractPositions reads them all as the center with y up, and Cytoscape's y
    // grows downward
    const positions = extractPositions(registry.importer(r.format), r.snapshot, r.report);
    for (let i = 0; i < r.snapshot.nodeCount; i++) {
        const el = elements[i];
        const x = positions?.usable === true ? positions.coords[3 * i] : Number.NaN;
        if (Number.isNaN(x)) {
            delete el.position;
        } else {
            el.position = { x, y: flipY(positions?.coords[3 * i + 1] ?? 0) };
        }
    }
    let styled: Pick<ImportedElements, "stylesheet" | "bypass"> = {};
    if (r.styles !== undefined && r.styles !== null) {
        imports++;
        const em = toCytoscapeStylesheet(r.styles, { importId: importId ?? String(imports) });
        const n = r.snapshot.nodeCount;
        const at = <T>(per: { node: readonly T[]; edge: readonly T[] }, i: number): T =>
            i < n ? per.node[i] : per.edge[i - n];
        elements.forEach((el, i) => Object.assign(el.data, at(em.elementData, i)));
        styled = { stylesheet: em.stylesheet, bypass: elements.map((_el, i) => at(em.bypass, i)) };
        warnings.push(...em.notes.map(styleIssue));
    }
    const report =
        warnings.length === 0
            ? r.report
            : {
                  ...r.report,
                  issues: [...r.report.issues, ...warnings],
                  warningCount: r.report.warningCount + warnings.length,
              };
    return { elements, directed: r.snapshot.directed, format: r.format, report, ...styled };
}

/** The loss notes about something graphtyImport always gives back (see lostForCytoscape). */
const CYTOSCAPE_KEEPS: ReadonlySet<string> = new Set([
    "W_ID_TEXT_TYPE",
    "W_ID_RENUMBERED",
    "W_CSV_NODE_ORDER",
    "W_STORAGE_CLASS_CHANGED",
]);

/**
 * Whether a graph-io loss note is a loss for a Cytoscape graph. graph-io's notes describe its own snapshot read back
 * by itself; graphtyImport restores some of what they report:
 * - W_ID_TEXT_TYPE: every id is turned back into a string;
 * - W_ID_RENUMBERED (Pajek) and W_CSV_NODE_ORDER: graphtyImport gives the nodes their original ids back, and a
 *   Cytoscape node is known by its id, not by its place in the file;
 * - W_STORAGE_CLASS_CHANGED: text stored as a dictionary or as plain strings reads back as the same strings;
 * - W_COLUMN_NAME_CHANGED on the edge `id`, the `parent` or the `position` (DOT reads them back as "key",
 *   "graphty.parent" and "pos"): they are read back by their role, as the edge id, `data.parent` and the position;
 * - W_ROLE_DROPPED on `label`: the values read back as `data.label`, and Cytoscape has no label role to lose.
 * @param n - the note
 * @returns false for a note about something graphtyImport gives back
 */
function lostForCytoscape(n: LossNote): boolean {
    if (CYTOSCAPE_KEEPS.has(n.code)) {
        return false;
    }
    if (n.code === "W_COLUMN_NAME_CHANGED" && (n.column === "id" || n.column === "parent" || n.column === "position")) {
        return false;
    }
    return !(n.code === "W_ROLE_DROPPED" && n.column === "label");
}

/** What this module reads of a core's style, which Cytoscape's typings leave out. */
interface LiveStyle {
    json(): unknown[];
}

/**
 * The core a collection belongs to (`eles.cy()`, which Cytoscape's typings leave out).
 * @param eles - the collection
 * @returns the core
 */
function coreOf(eles: Collection): Core {
    return (eles as unknown as { cy(): Core }).cy();
}

/**
 * A core's style.
 * @param cy - the core
 * @returns the style, or undefined when the core has styles disabled (headless without `styleEnabled`)
 */
function styleOf(cy: Core): LiveStyle | undefined {
    return cy.style() as unknown as LiveStyle | undefined;
}

/**
 * The styles of a collection as its core draws them: the core's stylesheet, with each element's `ele.style()` as
 * the truth.
 * @param eles - the collection
 * @param snapshot - the collection as elementsToSnapshot() wrote it
 * @returns the styles, or null when the core has styles disabled (a headless core without `styleEnabled`)
 */
function coreStyles(eles: Collection, snapshot: GraphSnapshot): ExtractedStyles | null {
    const style = styleOf(coreOf(eles));
    if (style === undefined) {
        return null;
    }
    const nodes = eles.nodes();
    const edges = exportedEdges(eles);
    return readCytoscapeStyles({
        elements: { nodes: nodes.jsons(), edges: edges.jsons() },
        style: style.json(),
        rendered: [...nodes.map((n) => n.style()), ...edges.map((e) => e.style())],
        snapshot,
    });
}

/**
 * W_STYLE_LAYER_FLATTENED for each property written per element instead of as a rule (a function-valued one).
 * @param extracted - the core's styles
 * @returns the notes
 */
function flattened(extracted: ExtractedStyles): LossNote[] {
    return extracted.styles.notes
        .filter((n) => n.code === STYLE_ISSUE.LAYER_FLATTENED)
        .map((n) => ({
            code: n.code,
            message: n.message,
            column: null,
            count: n.params.count,
            ...(n.params.target === "node" || n.params.target === "edge"
                ? { style: { target: n.params.target, property: n.params.property as never } }
                : {}),
        }));
}

/**
 * W_STYLES_NOT_EXPORTED when the core has a stylesheet of its own (one a new core does not have), or when styles were
 * asked for and the core has none to give (a headless core without `styleEnabled`).
 * @param cy - the core
 * @param asked - whether the export asked for the styles
 * @returns the note, or none
 */
function notExported(cy: Core, asked: boolean): LossNote[] {
    const style = styleOf(cy);
    if (style === undefined) {
        return asked
            ? [
                  {
                      code: STYLE_ISSUE.NOT_EXPORTED,
                      message:
                          "no styles are written: the core has styles disabled; create it with { styleEnabled: true }",
                      column: null,
                      count: null,
                  },
              ]
            : [];
    }
    const fresh = new (cy.constructor as new (options: object) => Core)({ headless: true, styleEnabled: true });
    const own = JSON.stringify(style.json()) !== JSON.stringify(styleOf(fresh)?.json());
    fresh.destroy();
    return own
        ? [
              {
                  code: STYLE_ISSUE.NOT_EXPORTED,
                  message: "the core's stylesheet is not written; export with { styles: true } to write it",
                  column: null,
                  count: null,
              },
          ]
        : [];
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
    const { directed, onLoss, styles, ...rest } = options;
    const snapshot = elementsToSnapshot(eles, {
        directed,
        format,
        integerIds: INTEGER_ID_FORMATS.has(format),
    });
    const extracted = styles === true ? coreStyles(eles, snapshot) : null;
    const graphOptions = {
        sanitizeIds: "mangle" as const,
        ...(format === "json" ? { dialect: "cytoscape" } : {}),
        ...rest,
        ...(extracted === null ? {} : { styles: extracted }),
    };
    if (onLoss !== undefined) {
        const notes = [
            ...(extracted === null ? notExported(coreOf(eles), styles === true) : flattened(extracted)),
            ...checkExport(snapshot, format, graphOptions).filter(lostForCytoscape),
        ];
        if (notes.length > 0) {
            onLoss(notes);
        }
    }
    return exportGraphToString(snapshot, format, graphOptions);
}
