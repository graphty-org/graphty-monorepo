/**
 * The XGMML importer (design `design/graph-io/cytoscape-and-obo/design.md` section 1.1;
 * `research-xgmml.md`): one reader for the 1.0 draft, the Cytoscape 2.x and 3.x exports and the
 * Cytoscape 3 session network files. The document is read in one pass of the shared XML tokenizer
 * into records (document.ts), and resolved into the sink once the outermost `</graph>` closes
 * (emit.ts), so forward references and edges before their nodes need nothing special.
 *
 * Direction follows the specification: the root `directed` (0 by the DTD, else the
 * `defaultDirected` option), then `cy:directed` per edge, overruling Cytoscape, which ignores the
 * root attribute. Ids are kept as written (`ids: "keep"`), so `"1"`, `"01"` and `" 1 "` stay three
 * nodes. Positions are stored y-up (Cytoscape writes screen coordinates). Graphics values are kept
 * as a json column, never interpreted (style import is issue #706).
 */

import { GraphFormatError, type GraphSink } from "@graphty/graph-format";

import { textChunks, throwIfAborted } from "../../common/input.js";
import {
    chooseGraph,
    graphChosen,
    type ImportFormatDefaults,
    reportSinkOptions,
    reportUnusedOptions,
    type ResolvedImportOptions,
    resolveImportOptions,
} from "../../common/options.js";
import { ImportReportBuilder } from "../../common/report.js";
import { isWhitespace, tokenizeXml, xmlDeclaredEncoding, type XmlRepairs, XmlSyntaxError } from "../../common/xml.js";
import {
    type CommonImportOptions,
    type GraphChoiceOptions,
    type GraphImporter,
    type GraphListing,
    type ImportInput,
    type ImportReport,
} from "../../types.js";
import { EXTENSIONS, FORMAT, MIME_TYPES, XGMML_ISSUE } from "./constants.js";
import { type GraphRec, type XgmmlDocument, XgmmlParser } from "./document.js";
import {
    type Dialect,
    dialectOf,
    type EmitExtras,
    graphsOf,
    membersOf,
    XgmmlEmitter,
    type XgmmlSettings,
} from "./emit.js";

/**
 * The format-specific options of the XGMML importer.
 * @category Built-in formats
 */
export interface XgmmlImportOptions extends GraphChoiceOptions, CommonImportOptions {
    /**
     * Find an edge end that is missing, or names no node, from Cytoscape's `"source (interaction)
     * target"` edge label, and fill a missing interaction from it. The default is on for files that
     * use Cytoscape's (`cy`) namespace, off for others.
     * @defaultValue on for Cytoscape files
     */
    labelAliases?: boolean | undefined;
    /**
     * Decode Cytoscape's two-character `\n` and `\t` escapes in text values. The default is on for
     * files that use Cytoscape's namespace, off for others.
     * @defaultValue on for Cytoscape files
     */
    cytoscapeEscapes?: boolean | undefined;
    /**
     * Read an `&` that is not followed by `;` within 7 characters as `&amp;`, with a warning for
     * each, instead of failing on the invalid XML.
     * @defaultValue false
     */
    repairBareAmpersands?: boolean | undefined;
    /**
     * Join two character references that each hold half of a character (`&#xD83D;&#xDE00;`) into
     * that character, with a warning for each pair, instead of failing.
     * @defaultValue false
     */
    pairSurrogateReferences?: boolean | undefined;
    /**
     * Where Cytoscape's `z` value (a drawing order, not a depth) goes: "column" keeps it as a node
     * attribute named `z`; "position" makes it the third coordinate of the position.
     * @defaultValue "column"
     */
    zAs?: "column" | "position" | undefined;
}

/** The per-format defaults: ids as written, undirected by the DTD, the edge `weight` attribute. */
const FORMAT_DEFAULTS: ImportFormatDefaults = {
    ids: "keep",
    defaultDirected: false,
    weightFrom: "weight",
    addMissingNodes: false,
};

/** The common options the XGMML importer reads. */
const USED_OPTIONS: ReadonlySet<keyof CommonImportOptions> = new Set<keyof CommonImportOptions>([
    "ids",
    "addMissingNodes",
    "duplicateEdges",
    "selfLoops",
    "onMixedDirection",
    "defaultDirected",
    "weightFrom",
    "weightDtype",
    "long",
    "errorLimit",
    "signal",
    "onProgress",
    "encoding",
]);

/** An XGMML DOCTYPE (Cytoscape's file filter tests the same). */
const XGMML_DOCTYPE = /<!DOCTYPE\s+graph\s[^<>]*xgmml\.dtd/i;

/**
 * The XGMML option values, checked.
 * @param options - the caller's options
 * @param cytoscape - whether the document uses the Cytoscape namespace
 * @returns the settings; E_UNSUPPORTED for a value of the wrong type
 * @category Plugin helpers
 */
export function resolveSettings(options: XgmmlImportOptions | undefined, cytoscape: boolean): XgmmlSettings {
    const zAs = options?.zAs ?? "column";
    if (zAs !== "column" && zAs !== "position") {
        throw new GraphFormatError(
            "E_UNSUPPORTED",
            `option zAs: ${JSON.stringify(zAs)} is not "column" or "position"`,
            {
                option: "zAs",
                found: zAs,
            },
        );
    }
    return {
        labelAliases: booleanOption("labelAliases", options?.labelAliases, cytoscape),
        cytoscapeEscapes: booleanOption("cytoscapeEscapes", options?.cytoscapeEscapes, cytoscape),
        zAs,
    };
}

/**
 * One boolean option.
 * @param name - the option name
 * @param value - the caller's value
 * @param fallback - the default
 * @returns the value; E_UNSUPPORTED when not a boolean
 */
function booleanOption(name: string, value: unknown, fallback: boolean): boolean {
    if (value === undefined) {
        return fallback;
    }
    if (typeof value !== "boolean") {
        throw new GraphFormatError("E_UNSUPPORTED", `option ${name}: ${JSON.stringify(value)} is not a boolean`, {
            option: name,
            found: value,
        });
    }
    return value;
}

/**
 * Read an XGMML document into records. Fatal conditions (not XML, not a graph, empty) fail the
 * report.
 * @param input - the input
 * @param report - the report
 * @param common - the resolved common options
 * @param options - the XGMML options (for the repairs)
 * @returns the document
 */
export async function parseXgmml(
    input: ImportInput,
    report: ImportReportBuilder,
    common: ResolvedImportOptions,
    options: XgmmlImportOptions | undefined,
): Promise<XgmmlDocument> {
    const repairs: XmlRepairs = {
        bareAmpersand: booleanOption("repairBareAmpersands", options?.repairBareAmpersands, false)
            ? (line): void => {
                  report.warning("parse-error", XGMML_ISSUE.AMPERSAND_REPAIRED, "a bare & was read as &amp;", { line });
              }
            : undefined,
        surrogatePair: booleanOption("pairSurrogateReferences", options?.pairSurrogateReferences, false)
            ? (line): void => {
                  report.warning(
                      "parse-error",
                      XGMML_ISSUE.SURROGATE_PAIRED,
                      "two surrogate character references were joined into one character",
                      { line },
                  );
              }
            : undefined,
    };
    const parser = new XgmmlParser(report);
    const seen = { content: false };
    try {
        await tokenizeXml(
            watch(textChunks(input, report, { ...common, declaredEncoding: xmlDeclaredEncoding, xml: true }), seen),
            parser,
            repairs,
        );
    } catch (err) {
        if (err instanceof XmlSyntaxError) {
            if (!seen.content) {
                report.fail(XGMML_ISSUE.EMPTY_INPUT, "the input is empty");
            }
            report.fail(XGMML_ISSUE.XML_SYNTAX, err.message, { line: err.line });
        }
        throw err;
    }
    const doc = parser.document();
    if (!doc.xgmmlNamespace && !XGMML_DOCTYPE.test(doc.doctype ?? "")) {
        report.warning(
            "validation-error",
            XGMML_ISSUE.NO_NAMESPACE,
            "the root <graph> has neither the XGMML namespace nor an XGMML DOCTYPE; it is read as XGMML",
            { line: doc.root.line },
        );
    }
    return doc;
}

/**
 * Pass text chunks through while noting non-whitespace content.
 * @param chunks - the chunks
 * @param seen - where the content flag is kept
 * @param seen.content - whether non-whitespace text was seen
 * @yields the chunks unchanged
 * @returns nothing
 */
async function* watch(
    chunks: AsyncIterable<string>,
    seen: { content: boolean },
): AsyncGenerator<string, void, undefined> {
    for await (const chunk of chunks) {
        seen.content ||= !isWhitespace(chunk);
        yield chunk;
    }
}

/** What an import call sets up before it emits. */
interface Prepared {
    readonly report: ImportReportBuilder;
    readonly common: ResolvedImportOptions;
    readonly doc: XgmmlDocument;
    readonly dialect: Dialect;
    readonly settings: XgmmlSettings;
    readonly graphs: readonly GraphRec[];
}

/**
 * Resolve the options, read the document and check it is a graph document.
 * @param input - the input
 * @param sink - the sink, or null for listGraphs
 * @param options - the options
 * @returns what the import needs
 */
async function prepare(
    input: ImportInput,
    sink: GraphSink | null,
    options: (XgmmlImportOptions & CommonImportOptions) | undefined,
): Promise<Prepared> {
    const common = resolveImportOptions(options, FORMAT_DEFAULTS);
    const report = new ImportReportBuilder(FORMAT, common.errorLimit);
    if (sink !== null) {
        reportSinkOptions(sink, options, report, true);
        reportUnusedOptions(options, report, USED_OPTIONS);
    }
    resolveSettings(options, false);
    const doc = await parseXgmml(input, report, common, options);
    const dialect = dialectOf(doc, report);
    if (dialect.view) {
        report.fail(
            XGMML_ISSUE.VIEW_DOCUMENT,
            "this is a Cytoscape session view file (cy:view): it holds positions keyed by view ids and no topology; open the session (.cys) instead",
            { line: doc.root.line },
        );
    }
    return {
        report,
        common,
        doc,
        dialect,
        settings: resolveSettings(options, doc.cytoscape),
        graphs: graphsOf(doc, dialect),
    };
}

/**
 * Emit one graph of a prepared document.
 * @param prepared - the prepared import
 * @param graph - the graph to read
 * @param sink - the sink
 * @param extras - what a session adds
 * @returns the report
 */
function emitOne(prepared: Prepared, graph: GraphRec, sink: GraphSink, extras?: EmitExtras): ImportReport {
    const { doc, dialect, report, common, settings } = prepared;
    const emitter = new XgmmlEmitter(doc, dialect, sink, report, common, settings, extras);
    emitter.emit(dialect.session ? graph : null);
    if (dialect.session) {
        reportRootOnly(prepared);
    }
    throwIfAborted(common.signal);
    return report.finish();
}

/**
 * W_XGMML_ROOT_ONLY_ELEMENTS: elements of a session network document no registered subnetwork
 * holds (group meta-edges, members of collapsed groups).
 * @param prepared - the prepared import
 */
function reportRootOnly(prepared: Prepared): void {
    const held = new Set<unknown>();
    for (const graph of prepared.graphs) {
        const members = membersOf(prepared.doc, graph);
        members.nodes.forEach((n) => held.add(n));
        members.edges.forEach((e) => held.add(e));
    }
    const nodes = prepared.doc.nodes.filter((n) => !held.has(n)).length;
    const edges = prepared.doc.edges.filter((e) => !held.has(e)).length;
    if (nodes + edges > 0) {
        prepared.report.warning(
            "unsupported",
            XGMML_ISSUE.ROOT_ONLY_ELEMENTS,
            `${nodes} node(s) and ${edges} edge(s) belong to no registered network (group meta-edges, collapsed group members) and were not read`,
        );
    }
}

/**
 * Import one graph of an XGMML document.
 * @param input - the document
 * @param sink - the sink
 * @param options - format-specific and common options
 * @returns the report; ImportError when the document cannot be read or the error limit is exceeded
 */
async function importXgmml(
    input: ImportInput,
    sink: GraphSink,
    options?: XgmmlImportOptions & CommonImportOptions,
): Promise<ImportReport> {
    const prepared = await prepare(input, sink, options);
    const index = chooseGraph(
        prepared.graphs.map((g) => graphName(g, prepared.doc)),
        options,
        prepared.report,
    );
    if (prepared.graphs.length > 1 && !graphChosen(options)) {
        prepared.report.warning(
            "unsupported",
            XGMML_ISSUE.MULTIPLE_GRAPHS,
            `the session network document holds ${prepared.graphs.length} registered networks; ${prepared.graphs.length - 1} were not read (importAllGraphs() reads every one; graphIndex or graphName chooses one)`,
        );
    }
    return emitOne(prepared, prepared.graphs[index], sink);
}

/**
 * Import every graph of an XGMML document: each registered subnetwork of a session network
 * document, else the one graph.
 * @param input - the document
 * @param sinkFor - a sink per graph
 * @param options - format-specific and common options
 * @returns one report per graph
 */
async function importAllXgmml(
    input: ImportInput,
    sinkFor: (index: number) => GraphSink,
    options?: XgmmlImportOptions & CommonImportOptions,
): Promise<ImportReport[]> {
    const first = await prepare(input, null, options);
    // the document is read once; every graph's report starts from what reading it recorded
    const parsed = first.report.fork();
    const reports: ImportReport[] = [];
    for (let i = 0; i < first.graphs.length; i++) {
        const sink = sinkFor(i);
        const prepared = i === 0 ? first : { ...first, report: parsed.fork() };
        reportSinkOptions(sink, options, prepared.report, true);
        reportUnusedOptions(options, prepared.report, USED_OPTIONS);
        reports.push(emitOne(prepared, prepared.graphs[i], sink));
    }
    return reports;
}

/**
 * List the graphs of an XGMML document without importing them.
 * @param input - the document
 * @param options - the options
 * @returns one listing per graph
 */
async function listXgmmlGraphs(
    input: ImportInput,
    options?: XgmmlImportOptions & CommonImportOptions,
): Promise<readonly GraphListing[]> {
    const prepared = await prepare(input, null, options);
    return prepared.graphs.map((graph, index) => {
        const members = membersOf(prepared.doc, prepared.dialect.session ? graph : null);
        return Object.freeze({
            index,
            name: graphName(graph, prepared.doc),
            nodes: new Set(members.nodes.map((n) => n.id)).size,
            edges: members.edges.length,
        });
    });
}

/**
 * The name of a graph: its label, else the RDF title (root only), else its id.
 * @param graph - the graph
 * @param doc - the document
 * @returns the name, or null
 */
function graphName(graph: GraphRec, doc: XgmmlDocument): string | null {
    return graph.label ?? (graph === doc.root ? (doc.rdf.title ?? null) : null) ?? graph.id ?? null;
}

/**
 * Confidence that a head of bytes is XGMML: 0.95 for a root `graph` in the XGMML namespace or an
 * XGMML DOCTYPE (Cytoscape's file filter tests the same two things, and a session view file still
 * scores so its failure names it), 0.5 for a root local name `graph` without either.
 * @param head - the first bytes
 * @returns the confidence
 */
function sniffXgmml(head: Uint8Array): number {
    let encoding = "utf-8";
    if ((head[0] === 0xff && head[1] === 0xfe) || (head[0] === 0x3c && head[1] === 0 && head[2] === 0x3f)) {
        encoding = "utf-16le";
    } else if ((head[0] === 0xfe && head[1] === 0xff) || (head[0] === 0 && head[1] === 0x3c && head[2] === 0)) {
        encoding = "utf-16be";
    }
    const text = new TextDecoder(encoding, { fatal: false }).decode(head);
    if (!/^\uFEFF?\s*</.test(text)) {
        return 0;
    }
    if (XGMML_DOCTYPE.test(text)) {
        return 0.95;
    }
    const root = /<(?!\?|!)([A-Za-z_][\w.-]*:)?([A-Za-z_][\w.-]*)[\s/>]/.exec(text.replace(/<!--[\s\S]*?(-->|$)/g, ""));
    if (root === null || root[2] !== "graph") {
        return 0;
    }
    const tagEnd = text.indexOf(">", root.index);
    const tag = text.slice(root.index, tagEnd < 0 ? undefined : tagEnd);
    return tag.includes("http://www.cs.rpi.edu/XGMML") ? 0.95 : 0.5;
}

/**
 * The XGMML importer.
 * @category Built-in formats
 */
export const xgmmlImporter: GraphImporter<XgmmlImportOptions> = Object.freeze({
    format: FORMAT,
    extensions: EXTENSIONS,
    mimeTypes: MIME_TYPES,
    sniff: sniffXgmml,
    import: importXgmml,
    importAll: importAllXgmml,
    listGraphs: listXgmmlGraphs,
});
