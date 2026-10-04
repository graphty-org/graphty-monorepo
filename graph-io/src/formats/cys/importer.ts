/**
 * The Cytoscape session importer (design `design/graph-io/cytoscape-and-obo/design.md` sections
 * 1.4 and 3; `research-session-and-style.md`). A session is a zip of every network of a Cytoscape
 * desktop; the unit of import is the registered subnetwork (3.x) or the network (2.x), one
 * snapshot each: `import()` reads the one `graphIndex` / `graphName` picks (the first by default),
 * `importAll()` every one, and `listGraphs()` lists them from the network files alone.
 *
 * 3.x: the network file gives the topology (shared nodes through `xlink:href`, per-edge direction,
 * groups, nested-network pointers); the subnetwork's CyCSV tables give its columns (LOCAL_ATTRS as
 * they are, the SHARED_ATTRS columns `cytables.xml` joins in, HIDDEN and app tables as hidden
 * columns under their namespace); its first view gives positions (y flipped) and the `graphics`
 * column, further views `position@<n>` columns. 2.x: one full XGMML file per network, with
 * selection and hidden state from `cysession.xml`. Everything is resolved by the XGMML emitter, so
 * both readers share every column rule. Styles are not read (issue #706): W_STYLES_NOT_IMPORTED.
 */

import { GraphFormatError, type GraphSink, INVALID_INDEX } from "@graphty/graph-format";

import { declareResolved } from "../../common/attributes.js";
import { IdCoercer } from "../../common/ids.js";
import { decodeEntryName, throwIfAborted } from "../../common/input.js";
import {
    chooseGraph,
    type ImportFormatDefaults,
    reportSinkOptions,
    reportUnusedOptions,
    type ResolvedImportOptions,
    resolveImportOptions,
} from "../../common/options.js";
import { ImportReportBuilder } from "../../common/report.js";
import { startsLikeZip } from "../../common/zip.js";
import {
    type CommonImportOptions,
    type GraphChoiceOptions,
    type GraphImporter,
    type GraphListing,
    ImportError,
    type ImportInput,
    type ImportReport,
} from "../../types.js";
import { XGMML_ISSUE, XGMML_ORIGIN_NAMESPACE } from "../xgmml/constants.js";
import {
    type AttRec,
    type EdgeRec,
    type GraphRec,
    isCyTrue,
    type NodeRec,
    type XgmmlDocument,
} from "../xgmml/document.js";
import {
    type Dialect,
    dialectOf,
    type EmitExtras,
    membersOf,
    parseCoordinate,
    XgmmlEmitter,
    type XgmmlSettings,
} from "../xgmml/emit.js";
import { parseXgmml, resolveSettings } from "../xgmml/importer.js";
import {
    CYS_ISSUE,
    CYTOSCAPE_NAMESPACE,
    DEFAULT_MAX_UNCOMPRESSED,
    EXTENSIONS,
    FORMAT,
    HIDDEN_COLUMN,
    META_KEY,
    MIME_TYPES,
    SELECTED_COLUMN,
    VIEW_POSITION_PREFIX,
} from "./constants.js";
import {
    elementsNamed,
    listed,
    type NetworkEntry,
    openSession,
    parseXmlTree,
    readXmlTree,
    type Session,
    type SessionEntry,
    type TableEntry,
    urlDecode,
    type XmlNode,
} from "./session.js";
import { cellAtt, type CyTable, readCyTable, type VirtualColumn, virtualColumnsOf } from "./tables.js";

/** The format-specific options of the session importer. */
export interface CysImportOptions extends GraphChoiceOptions {
    /** Where Cytoscape's z (a stacking order) goes: the `z` column (default) or the position. */
    zAs?: "column" | "position" | undefined;
    /**
     * The most bytes one import may inflate, in total (default 2 GiB); an entry beyond it, or one
     * whose compression ratio is above 1000:1, is E_TOO_LARGE.
     */
    maxUncompressedBytes?: number | undefined;
}

/** The per-format defaults: SUIDs as written, edges directed unless they say otherwise, no weight. */
const FORMAT_DEFAULTS: ImportFormatDefaults = {
    ids: "keep",
    defaultDirected: true,
    weightFrom: null,
    addMissingNodes: false,
};

/** The common options the session importer reads. */
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
]);

/** One network the session holds: a registered subnetwork of a 3.x network file, or a 2.x network. */
type Choice = Choice3 | Choice2;

/** A registered subnetwork of a 3.x network file. */
interface Choice3 {
    readonly era: "3";
    readonly network: NetworkEntry;
    /** The subnetwork itself (two subnetworks can share an id). */
    readonly graph: GraphRec;
    readonly graphId: string;
    readonly name: string | null;
    readonly nodes: number;
    readonly edges: number;
}

/** A 2.x network and its `cysession.xml` record. */
interface Choice2 {
    readonly era: "2";
    readonly file: SessionEntry;
    readonly name: string;
    readonly record: XmlNode;
    readonly parent: string | null;
}

/** What every import call sets up. */
interface Prepared {
    readonly report: ImportReportBuilder;
    readonly common: ResolvedImportOptions;
    /** The options the entries inside are read with: no progress, no encoding override. */
    readonly inner: ResolvedImportOptions;
    readonly zAs: "column" | "position";
    readonly session: Session;
    readonly choices: readonly Choice[];
    /** The network file documents parsed for the listing, by entry name (3.x). */
    readonly docs: Map<string, Parsed>;
}

/** A parsed XGMML entry. */
interface Parsed {
    readonly doc: XgmmlDocument;
    readonly dialect: Dialect;
}

/**
 * The maxUncompressedBytes option, checked.
 * @param value - the caller's value
 * @returns the byte budget; E_UNSUPPORTED for anything but a positive number
 */
function budgetOption(value: unknown): number {
    if (value === undefined) {
        return DEFAULT_MAX_UNCOMPRESSED;
    }
    if (typeof value !== "number" || !(value > 0)) {
        throw new GraphFormatError(
            "E_UNSUPPORTED",
            `option maxUncompressedBytes: ${JSON.stringify(value)} is not a positive number`,
            {
                option: "maxUncompressedBytes",
                found: value,
            },
        );
    }
    return value;
}

/**
 * Resolve the options, open the archive and list its networks.
 * @param input - the input
 * @param sink - the sink, or null for listGraphs
 * @param options - the options
 * @returns what the import needs
 */
async function prepare(
    input: ImportInput,
    sink: GraphSink | null,
    options: (CysImportOptions & CommonImportOptions) | undefined,
): Promise<Prepared> {
    const common = resolveImportOptions(options, FORMAT_DEFAULTS);
    const report = new ImportReportBuilder(FORMAT, common.errorLimit);
    if (sink !== null) {
        reportSinkOptions(sink, options, report, true);
        reportUnusedOptions(options, report, USED_OPTIONS);
    }
    const { zAs } = resolveSettings({ zAs: options?.zAs }, false);
    const maxBytes = budgetOption(options?.maxUncompressedBytes);
    const session = await openSession(input, report, common, maxBytes);
    const inner: ResolvedImportOptions = Object.freeze({ ...common, onProgress: null, encoding: null });
    const docs = new Map<string, Parsed>();
    const choices =
        session.layout.era === "3"
            ? await networks3(session, report, inner, docs)
            : await networks2(session, report, inner);
    return { report, common, inner, zAs, session, choices, docs };
}

/**
 * Read an XGMML entry. Its issues are relayed into the import's report with the entry name in
 * the message; a fatal one fails the import.
 * @param session - the session
 * @param entry - the entry
 * @param report - the import's report
 * @param inner - the options entries are read with
 * @returns the document and its dialect
 */
async function parseEntry(
    session: Session,
    entry: SessionEntry,
    report: ImportReportBuilder,
    inner: ResolvedImportOptions,
): Promise<Parsed> {
    return (await parseOptionalEntry(session, entry, report, inner, false)) as Parsed;
}

/**
 * Read an XGMML entry, its issues and counts relayed into the import's report (the entry name
 * in each message), parsing within what is left of the import's error limit. A fatal issue fails
 * the import, unless the entry is optional (a view): then it is recorded as an error and the
 * entry is skipped (null).
 * @param session - the session
 * @param entry - the entry
 * @param report - the import's report
 * @param inner - the options entries are read with
 * @param optional - whether the import can go on without the entry
 * @returns the document and its dialect, or null for an optional entry that cannot be read
 */
async function parseOptionalEntry(
    session: Session,
    entry: SessionEntry,
    report: ImportReportBuilder,
    inner: ResolvedImportOptions,
    optional: boolean,
): Promise<Parsed | null> {
    const scratch = new ImportReportBuilder(FORMAT, Math.max(0, report.errorLimit - report.errorCount));
    try {
        // a damaged entry (bad CRC, truncated deflate) fails the scratch report like a parse error
        const bytes = await session.read(entry, scratch);
        const doc = await parseXgmml(bytes, scratch, inner, undefined);
        const dialect = dialectOf(doc, scratch);
        relay(scratch.issues, report, entry.name);
        addCounts(scratch, report);
        return { doc, dialect };
    } catch (err) {
        if (!(err instanceof ImportError)) {
            throw err;
        }
        addCounts(scratch, report);
        const { issues } = scratch;
        if (scratch.truncated) {
            // the entry reached the import's error limit: relaying its errors aborts the import
            relay(issues, report, entry.name);
        }
        const fatal = issues.at(-1);
        relay(issues.slice(0, -1), report, entry.name);
        const message = `${entry.name}: ${fatal?.message ?? err.message}`;
        const where = { line: fatal?.line ?? null };
        if (fatal?.code === CYS_ISSUE.TOO_LARGE) {
            // the byte budget is a limit of the whole import, not damage to one entry
            report.error("unsupported", fatal.code, message);
            throw report.abort(message, { code: fatal.code });
        }
        if (optional) {
            report.error("parse-error", fatal?.code ?? CYS_ISSUE.CORRUPT, `${message}; the entry is not read`, where);
            return null;
        }
        return report.fail(fatal?.code ?? CYS_ISSUE.CORRUPT, message, where);
    }
}

/**
 * Add an entry's element counts (the nodes skipped while parsing it) to the import's.
 * @param from - the entry's report
 * @param to - the import's report
 */
function addCounts(from: ImportReportBuilder, to: ImportReportBuilder): void {
    for (const key of Object.keys(from.counts) as (keyof typeof from.counts)[]) {
        to.counts[key] += from.counts[key];
    }
}

/**
 * Record issues of an entry in the import's report, the entry name before each message.
 * @param issues - the issues
 * @param report - the import's report
 * @param entry - the entry name
 */
function relay(issues: ImportReport["issues"], report: ImportReportBuilder, entry: string): void {
    for (const issue of issues) {
        const where = { line: issue.line, element: issue.element };
        if (issue.severity === "error") {
            report.error(issue.category, issue.code, `${entry}: ${issue.message}`, where);
        } else {
            report.warning(issue.category, issue.code, `${entry}: ${issue.message}`, where);
        }
    }
}

// ---------------------------------------------------------------------------------------- 3.x

/**
 * The registered subnetworks of a 3.x session, in `network_list.xml` order (else entry order).
 * @param session - the session
 * @param report - the report
 * @param inner - the options entries are read with
 * @param docs - where the parsed network files are kept
 * @returns the networks
 */
async function networks3(
    session: Session,
    report: ImportReportBuilder,
    inner: ResolvedImportOptions,
    docs: Map<string, Parsed>,
): Promise<Choice3[]> {
    const { layout } = session;
    const choices: Choice3[] = [];
    for (const network of layout.networks) {
        const parsed = await parseEntry(session, network, report, inner);
        if (parsed.dialect.view) {
            report.fail(
                XGMML_ISSUE.VIEW_DOCUMENT,
                `${network.name}: this is a session view file (cy:view), not a network file; it holds no topology`,
                { line: parsed.doc.root.line },
            );
        }
        docs.set(network.name, parsed);
        for (const graph of registeredGraphs(parsed)) {
            if (graph.id === null) {
                report.error(
                    "missing-value",
                    XGMML_ISSUE.MISSING_ID,
                    `${network.name}: a registered subnetwork${graph.label === null ? "" : ` ("${graph.label}")`} has no id; its tables and views cannot be found and it is skipped`,
                    { line: graph.line },
                );
                continue;
            }
            const members = membersOf(parsed.doc, graph);
            choices.push({
                era: "3",
                network,
                graph,
                graphId: graph.id,
                name: graph.label ?? graph.id,
                nodes: new Set(members.nodes).size,
                edges: members.edges.length,
            });
        }
    }
    const known = new Set(choices.map((c) => c.graphId));
    const strayViews = layout.views.filter((v) => !known.has(v.network)).map((v) => v.name);
    const strayTables = layout.tables.filter(
        (t) =>
            !known.has(t.network) &&
            !layout.networks.some((n) => n.suid === t.network) &&
            !isGroupTable(t, session, docs),
    );
    if (strayViews.length > 0 || strayTables.length > 0) {
        report.warning(
            "validation-error",
            CYS_ISSUE.DANGLING_REFERENCE,
            `${strayViews.length + strayTables.length} view(s) or table(s) belong to a network the session does not hold and were not read: ${listed([...strayViews, ...strayTables.map((t) => t.name)])}`,
        );
    }
    if (layout.networkList === null) {
        return choices;
    }
    const tree = await parseXmlTree(await session.read(layout.networkList, report), layout.networkList.name, report, inner);
    if (typeof tree === "string") {
        // the list only orders the networks: without it they keep the order of their entries
        report.warning(
            "unsupported",
            CYS_ISSUE.ENTRY_SKIPPED,
            `${layout.networkList.name}: ${tree}; it is not read and the networks are listed in entry order`,
        );
        return choices;
    }
    const order = new Map<string, number>();
    for (const node of elementsNamed(tree, "network")) {
        const id = node.attrs.get("id");
        const position = Number(node.attrs.get("order"));
        if (id !== undefined && Number.isFinite(position)) {
            order.set(id, position);
        }
    }
    return choices
        .map((choice, index) => ({ choice, index }))
        .sort(
            (a, b) =>
                (order.get(a.choice.graphId) ?? Infinity) - (order.get(b.choice.graphId) ?? Infinity) ||
                a.index - b.index,
        )
        .map((c) => c.choice);
}

/**
 * Whether a table belongs to a graph declared in some network file (a group's network): those are
 * read with their network, not reported.
 * @param table - the table
 * @param session - the session
 * @param docs - the parsed network files
 * @returns true for a table of a known graph
 */
function isGroupTable(table: TableEntry, session: Session, docs: ReadonlyMap<string, Parsed>): boolean {
    for (const network of session.layout.networks) {
        if (docs.get(network.name)?.doc.graphs.some((g) => g.id === table.network) === true) {
            return true;
        }
    }
    return false;
}

/**
 * The registered subnetworks of a network file (`cy:registered` true under the root).
 * @param parsed - the network file
 * @returns the graphs
 */
function registeredGraphs(parsed: Parsed): GraphRec[] {
    const subnetworks = parsed.doc.root.subgraphs.filter((g) => isCyTrue(g.registered));
    // a registered root with no subnetworks (another tool's network file) is the network itself
    return subnetworks.length === 0 && isCyTrue(parsed.doc.root.registered) ? [parsed.doc.root] : subnetworks;
}

/**
 * Import one registered subnetwork of a 3.x session.
 * @param prepared - the prepared import
 * @param choice - the subnetwork
 * @param sink - the sink
 * @param parsed - its network file, parsed for this import (its records are filled in)
 */
async function import3(prepared: Prepared, choice: Choice3, sink: GraphSink, parsed: Parsed): Promise<void> {
    const { graph } = choice;
    const members = membersOf(parsed.doc, graph);
    const nodes = byId(members.nodes);
    const edges = byId(members.edges);
    // the records are shared by every network of the file: what this import adds is undone after
    const restore = saveRecords(graph, nodes, edges);
    try {
        await fill3(prepared, choice, sink, parsed, nodes, edges);
    } finally {
        restore();
    }
}

/**
 * The state of the records an import fills in (atts, coordinates, graphics), and a function that
 * puts it back.
 * @param graph - the subnetwork
 * @param nodes - its node records
 * @param edges - its edge records
 * @returns the restore function
 */
function saveRecords(
    graph: GraphRec,
    nodes: ReadonlyMap<string, NodeRec>,
    edges: ReadonlyMap<string, EdgeRec>,
): () => void {
    const saved = [...nodes.values()].map((n) => ({
        n,
        atts: n.atts.length,
        x: n.x,
        y: n.y,
        z: n.z,
        graphics: n.graphics,
    }));
    const savedEdges = [...edges.values()].map((e) => ({ e, atts: e.atts.length, graphics: e.graphics }));
    const graphAtts = graph.atts.length;
    const graphGraphics = graph.graphics;
    return (): void => {
        for (const { n, atts, x, y, z, graphics } of saved) {
            n.atts.length = atts;
            Object.assign(n, { x, y, z, graphics });
        }
        for (const { e, atts, graphics } of savedEdges) {
            e.atts.length = atts;
            e.graphics = graphics;
        }
        graph.atts.length = graphAtts;
        graph.graphics = graphGraphics;
    };
}

/**
 * Fill one subnetwork's records from its tables and views and emit it.
 * @param prepared - the prepared import
 * @param choice - the subnetwork
 * @param sink - the sink
 * @param parsed - its network file
 * @param nodes - its node records by id
 * @param edges - its edge records by id
 */
async function fill3(
    prepared: Prepared,
    choice: Choice3,
    sink: GraphSink,
    parsed: Parsed,
    nodes: ReadonlyMap<string, NodeRec>,
    edges: ReadonlyMap<string, EdgeRec>,
): Promise<void> {
    const { report, inner, session } = prepared;
    const { layout } = session;
    const { doc, dialect } = parsed;
    const { graph } = choice;
    const members = membersOf(doc, graph);
    // each network reads its tables into its own report, so a shared table's issues, and a
    // table that fails the import, land in every network that reads it.
    // ponytail: a table shared by several networks is inflated and parsed once per network (the
    // byte budget is charged once); cache the parse and relay its issues if importAll gets slow
    const tables = new Map<string, Promise<CyTable | null>>();
    const tableOf = (path: string): Promise<CyTable | null> => {
        let pending = tables.get(path);
        if (pending === undefined) {
            const entry = layout.tables.find((t) => t.tablePath === path);
            pending =
                entry === undefined
                    ? Promise.resolve(null)
                    : session.read(entry, report).then((bytes) => readCyTable(bytes, path, entry.name, report, inner));
            tables.set(path, pending);
        }
        return pending;
    };
    const virtuals = layout.cytables === null ? [] : await readVirtuals(session, layout.cytables, report, inner);
    // a row of an element the file declares outside this network (a collapsed group's member, a
    // meta-edge) is Cytoscape's bookkeeping, not a stale row
    const declared = new Set<string>([
        ...doc.nodes.flatMap((n) => (n.id === null ? [] : [n.id])),
        ...doc.edges.flatMap((e) => (e.id === null ? [] : [e.id])),
    ]);
    let unmatched = 0;
    for (const entry of layout.tables.filter((t) => t.network === choice.graphId && t.element !== null)) {
        throwIfAborted(inner.signal);
        const table = await tableOf(entry.tablePath);
        if (table === null) {
            continue;
        }
        const local = entry.namespace === "LOCAL_ATTRS";
        const shared = entry.namespace === "SHARED_ATTRS";
        const namespace = local ? null : entry.namespace;
        const hidden = !local && !shared;
        const target = (key: string): AttRec[] | undefined => {
            if (entry.element === "network") {
                return key === choice.graphId ? graph.atts : undefined;
            }
            return (entry.element === "node" ? nodes : edges).get(key)?.atts;
        };
        for (const [key, cells] of table.rows) {
            const atts = target(key);
            if (atts === undefined) {
                if (!declared.has(key)) {
                    unmatched++;
                }
                continue;
            }
            const line = table.lines.get(key) ?? 0;
            for (let i = 1; i < table.columns.length && i < cells.length; i++) {
                const att = cellAtt(table.columns[i], cells[i], line, namespace, hidden);
                if (att !== null) {
                    atts.push(att);
                }
            }
        }
        for (const virtual of await virtualColumnsOf(table, virtuals, tableOf, report)) {
            // a shared column named like a local one is renamed; the local one keeps the name
            const owned = table.columns.some((c) => c.name === virtual.column.name);
            let ns = namespace;
            if (local) {
                ns = owned ? "SHARED_ATTRS" : null;
            }
            for (const [key, text] of virtual.values) {
                const att = cellAtt(virtual.column, text, table.lines.get(key) ?? 0, ns, hidden);
                if (att !== null) {
                    target(key)?.push(att);
                }
            }
        }
    }
    if (unmatched > 0) {
        report.warning(
            "parse-error",
            CYS_ISSUE.TABLE_ROW,
            `${unmatched} table row(s) of network ${choice.graphId} name no node, edge or network of it (stale rows); they are not read`,
        );
    }
    const { visualStyle, extraViews, extraIds } = await readViews(prepared, choice, nodes, edges);
    const cyMeta = sessionMeta(prepared, {
        collection: doc.root.label ?? choice.network.title,
        network: choice.graphId,
        parentNetwork: parentNetwork(graph, prepared.choices),
        visualStyle,
    });
    const groups: { group: string; members: string[] }[] = [];
    cyMeta.groups = groups;
    const extras: EmitExtras = {
        sourceFormat: FORMAT,
        entry: choice.network.name,
        graphName: localName(graph) ?? choice.name,
        metaExtra: { [META_KEY]: cyMeta },
        groupNodes: new Set(
            members.nodes
                .filter((n) => n.atts.some((a) => a.name === "__isGroup" && isCyTrue(a.value)))
                .flatMap((n) => (n.id === null ? [] : [n.id])),
        ),
        resolvePointer: pointerResolver(prepared, doc),
        onMissingMember: (group, member): void => {
            const record = groups.find((g) => g.group === group);
            if (record === undefined) {
                groups.push({ group, members: [member] });
            } else if (!record.members.includes(member)) {
                record.members.push(member);
            }
        },
    };
    const settings: XgmmlSettings = { labelAliases: false, cytoscapeEscapes: false, zAs: prepared.zAs };
    new XgmmlEmitter(doc, dialect, sink, report, prepared.inner, settings, extras).emit(graph);
    if (groups.length > 0) {
        report.warning(
            "unsupported",
            CYS_ISSUE.COLLAPSED_GROUP,
            `${groups.length} collapsed group(s) hold ${groups.reduce((n, g) => n + g.members.length, 0)} member(s) that are not in the network; they are listed in meta.extra.cytoscape.groups`,
        );
    }
    reportRootOnly(parsed, report, choice.network.name);
    writeViewPositions(sink, extraViews, extraIds, report, prepared.inner);
}

/**
 * Read a subnetwork's views: the first (the lowest view SUID, whatever the order of the entries)
 * fills the records' coordinates and graphics, each further one gives positions only. A view that
 * cannot be read is recorded and skipped.
 * @param prepared - the prepared import
 * @param choice - the subnetwork
 * @param nodes - its node records by id
 * @param edges - its edge records by id
 * @returns the first view's style, and the positions and SUIDs of the further views
 */
async function readViews(
    prepared: Prepared,
    choice: Choice3,
    nodes: ReadonlyMap<string, NodeRec>,
    edges: ReadonlyMap<string, EdgeRec>,
): Promise<{
    visualStyle: string | null;
    extraViews: Map<string, [number, number, number]>[];
    extraIds: string[];
}> {
    const { report, inner, session } = prepared;
    const views = session.layout.views
        .filter((v) => v.network === choice.graphId)
        .sort((a, b) => a.view.length - b.view.length || (a.view < b.view ? -1 : Number(a.view > b.view)));
    let visualStyle: string | null = null;
    const extraViews: Map<string, [number, number, number]>[] = [];
    const extraIds: string[] = [];
    let first = true;
    for (const view of views) {
        const viewDoc = (await parseOptionalEntry(session, view, report, inner, true))?.doc;
        if (viewDoc === undefined) {
            continue;
        }
        if (first) {
            first = false;
            visualStyle = viewDoc.root.attrs.get("cy:visualStyle") ?? null;
            applyView(viewDoc, choice.graph, nodes, edges, report, view.name);
        } else {
            extraViews.push(viewPositions(viewDoc, prepared.zAs, nodes, report, view.name));
            extraIds.push(view.view);
        }
    }
    return { visualStyle, extraViews, extraIds };
}

/**
 * The virtual columns of `tables/cytables.xml`.
 * @param session - the session
 * @param entry - the cytables.xml entry
 * @param report - the report
 * @param inner - the options entries are read with
 * @returns the virtual columns in document order
 */
async function readVirtuals(
    session: Session,
    entry: SessionEntry,
    report: ImportReportBuilder,
    inner: ResolvedImportOptions,
): Promise<VirtualColumn[]> {
    const tree = await parseXmlTree(await session.read(entry, report), entry.name, report, inner);
    if (typeof tree === "string") {
        // only the shared columns are lost: every table's own columns are still read
        report.error("parse-error", CYS_ISSUE.TABLE, `${entry.name}: ${tree}; its virtual columns are not read`);
        return [];
    }
    const out: VirtualColumn[] = [];
    for (const node of elementsNamed(tree, "virtualColumn")) {
        const missing = ["name", "targetTable", "sourceTable", "sourceColumn"].filter((k) => !node.attrs.has(k));
        if (missing.length > 0) {
            report.error(
                "parse-error",
                CYS_ISSUE.TABLE,
                `${entry.name}: a virtual column${node.attrs.has("name") ? ` "${node.attrs.get("name") ?? ""}"` : ""} has no ${missing.join(", ")}; the column is not read`,
            );
            continue;
        }
        const a = (key: string): string => node.attrs.get(key) ?? "";
        out.push({
            name: a("name"),
            targetTable: a("targetTable"),
            sourceTable: a("sourceTable"),
            sourceColumn: a("sourceColumn"),
            sourceJoinKey: node.attrs.get("sourceJoinKey") ?? "SUID",
            targetJoinKey: node.attrs.get("targetJoinKey") ?? "SUID",
        });
    }
    return out;
}

/**
 * Records by id.
 * @param records - node or edge records
 * @returns the first record of each id
 */
function byId<T extends NodeRec | EdgeRec>(records: readonly T[]): Map<string, T> {
    const out = new Map<string, T>();
    for (const record of records) {
        if (record.id !== null && !out.has(record.id)) {
            out.set(record.id, record);
        }
    }
    return out;
}

/**
 * Copy a view's coordinates and graphics onto the network's records (by `cy:nodeId` and
 * `cy:edgeId`), and its network graphics onto the graph. A view element naming nothing of the
 * network is counted in one W_DANGLING_REFERENCE.
 * @param view - the view document
 * @param graph - the subnetwork
 * @param nodes - its node records by id
 * @param edges - its edge records by id
 * @param report - the report
 * @param entry - the view entry name
 */
function applyView(
    view: XgmmlDocument,
    graph: GraphRec,
    nodes: ReadonlyMap<string, NodeRec>,
    edges: ReadonlyMap<string, EdgeRec>,
    report: ImportReportBuilder,
    entry: string,
): void {
    let dangling = 0;
    const seen = new Set<string>();
    for (const node of view.nodes) {
        const target = node.viewId === null ? undefined : nodes.get(node.viewId);
        if (target === undefined) {
            dangling++;
            continue;
        }
        duplicateViewNode(seen, node, report, entry);
        target.x = node.x;
        target.y = node.y;
        target.z = node.z;
        if (node.graphics !== null) {
            target.graphics = { ...(target.graphics ?? {}), ...node.graphics };
        }
    }
    for (const edge of view.edges) {
        const target = edge.viewId === null ? undefined : edges.get(edge.viewId);
        if (target === undefined) {
            dangling++;
            continue;
        }
        if (edge.graphics !== null) {
            target.graphics = { ...(target.graphics ?? {}), ...edge.graphics };
        }
    }
    if (view.root.graphics !== null) {
        graph.graphics = { ...(graph.graphics ?? {}), ...view.root.graphics };
    }
    if (dangling > 0) {
        report.warning(
            "validation-error",
            CYS_ISSUE.DANGLING_REFERENCE,
            `${entry}: ${dangling} view element(s) name no node or edge of the network; they are not read`,
        );
    }
}

/**
 * W_DUPLICATE_NODE for a view element that repeats a node an earlier one of the view gave.
 * @param seen - the model node ids seen so far in the view
 * @param node - the view element
 * @param report - the report
 * @param entry - the view entry name
 */
function duplicateViewNode(seen: Set<string>, node: NodeRec, report: ImportReportBuilder, entry: string): void {
    const id = node.viewId as string;
    if (seen.has(id)) {
        report.warning(
            "validation-error",
            XGMML_ISSUE.DUPLICATE_NODE,
            `${entry}: the view gives node "${id}" twice; the later element is used`,
            { line: node.line, element: id },
        );
    }
    seen.add(id);
}

/**
 * The positions of a further view, by model node id, read by the first view's rules: y flipped
 * to y-up, z in the position only under zAs "position", a coordinate that does not parse
 * E_BAD_VALUE (the position is unset; a bad z is 0), an element naming no node of the network
 * counted in one W_DANGLING_REFERENCE.
 * @param view - the view document
 * @param zAs - where z goes
 * @param nodes - the network's node records by id
 * @param report - the report
 * @param entry - the view entry name
 * @returns the positions
 */
function viewPositions(
    view: XgmmlDocument,
    zAs: "column" | "position",
    nodes: ReadonlyMap<string, NodeRec>,
    report: ImportReportBuilder,
    entry: string,
): Map<string, [number, number, number]> {
    const out = new Map<string, [number, number, number]>();
    const seen = new Set<string>();
    let dangling = 0;
    const coordinate = (text: string | null, node: NodeRec): number | null => {
        if (text === null) {
            return null;
        }
        const n = parseCoordinate(text);
        if (n === null) {
            report.error(
                "validation-error",
                XGMML_ISSUE.BAD_VALUE,
                `${entry}: graphics coordinate "${text}" is not a number`,
                {
                    line: node.line,
                    element: node.viewId,
                },
            );
        }
        return n;
    };
    for (const node of view.nodes) {
        if (node.viewId === null || !nodes.has(node.viewId)) {
            dangling++;
            continue;
        }
        duplicateViewNode(seen, node, report, entry);
        const x = coordinate(node.x, node);
        const y = coordinate(node.y, node);
        const z = zAs === "position" ? coordinate(node.z, node) : null;
        if (x !== null && y !== null) {
            out.set(node.viewId, [x, y === 0 ? 0 : -y, z ?? 0]);
        } else {
            out.delete(node.viewId);
        }
    }
    if (dangling > 0) {
        report.warning(
            "validation-error",
            CYS_ISSUE.DANGLING_REFERENCE,
            `${entry}: ${dangling} view element(s) name no node of the network; they are not read`,
        );
    }
    return out;
}

/**
 * Write each further view's positions as a `position@<n>` column (n from 2), no role.
 * @param sink - the sink
 * @param views - the positions of each further view
 * @param viewIds - each view's SUID
 * @param report - the report
 * @param common - the id rule
 */
function writeViewPositions(
    sink: GraphSink,
    views: readonly Map<string, [number, number, number]>[],
    viewIds: readonly string[],
    report: ImportReportBuilder,
    common: ResolvedImportOptions,
): void {
    const coercer = new IdCoercer(common.ids);
    views.forEach((positions, i) => {
        const name = `${VIEW_POSITION_PREFIX}${i + 2}`;
        const { handle } = declareResolved(
            sink,
            "node",
            {
                name,
                dtype: "f32",
                components: 3,
                nullable: true,
                origin: {
                    format: FORMAT,
                    id: viewIds[i],
                    title: null,
                    type: "graphics",
                    namespace: XGMML_ORIGIN_NAMESPACE,
                },
                extra: { sourceDims: 2, units: "file" },
            },
            report,
            { element: name },
        );
        for (const [id, xyz] of positions) {
            let index: number;
            try {
                index = sink.indexOf(coercer.text(id));
            } catch {
                continue; // an id the id rule refuses was refused, and recorded, as a node already
            }
            if (index !== INVALID_INDEX) {
                sink.setNodeValue(handle, index, xyz);
            }
        }
    });
}

/**
 * The network's name from its own table (the LOCAL `name` att), else null.
 * @param graph - the subnetwork with its table atts
 * @returns the name
 */
function localName(graph: GraphRec): string | null {
    const att = graph.atts.find((a) => a.name === "name" && (a.namespace ?? null) === null);
    return att?.value ?? null;
}

/**
 * The name of the network a subnetwork was made from: the hidden `__parentNetwork.SUID` (or the
 * pre-3.4 `Cy2 Parent Network.SUID`), named when the session holds it.
 * @param graph - the subnetwork with its table atts
 * @param choices - the session's networks
 * @returns the parent's name, its SUID when unnamed, or null
 */
function parentNetwork(graph: GraphRec, choices: readonly Choice[]): string | null {
    const att = graph.atts.find((a) => a.name === "__parentNetwork.SUID" || a.name === "Cy2 Parent Network.SUID");
    if (att?.value === undefined || att.value === null || att.value.length === 0) {
        return null;
    }
    const suid = att.value;
    const named = choices.find((c) => c.era === "3" && c.graphId === suid);
    return named?.name ?? suid;
}

/**
 * The resolver of nested-network pointers into other network files of the session
 * (`207-Set+2.xgmml#223`): the target graph's label. Only the files a pointer names are read.
 * @param prepared - the prepared import
 * @param doc - the network file being read
 * @returns the resolver
 */
function pointerResolver(prepared: Prepared, doc: XgmmlDocument): (href: string) => string | null {
    const names = new Map<string, string>();
    for (const graph of doc.graphs) {
        const { href } = graph;
        const hash = href?.indexOf("#") ?? -1;
        if (href === null || hash <= 0 || names.has(href)) {
            continue;
        }
        const file = urlDecode(href.slice(0, hash));
        const id = href.slice(hash + 1);
        const network = prepared.session.layout.networks.find(
            (n) => urlDecode(n.path.slice("networks/".length)) === file,
        );
        const parsed = network === undefined ? undefined : prepared.docs.get(network.name);
        const target = parsed?.doc.graphs.find((g) => g.id === id);
        if (target !== undefined) {
            names.set(href, target.label ?? id);
        }
    }
    return (href) => names.get(href) ?? null;
}

/**
 * W_XGMML_ROOT_ONLY_ELEMENTS for elements of a network file no registered subnetwork holds.
 * @param parsed - the network file
 * @param report - the report
 * @param entry - the entry name
 */
function reportRootOnly(parsed: Parsed, report: ImportReportBuilder, entry: string): void {
    const held = new Set<unknown>();
    for (const graph of registeredGraphs(parsed)) {
        const members = membersOf(parsed.doc, graph);
        members.nodes.forEach((n) => held.add(n));
        members.edges.forEach((e) => held.add(e));
    }
    const nodes = parsed.doc.nodes.filter((n) => !held.has(n)).length;
    const edges = parsed.doc.edges.filter((e) => !held.has(e)).length;
    if (nodes + edges > 0) {
        report.warning(
            "unsupported",
            XGMML_ISSUE.ROOT_ONLY_ELEMENTS,
            `${entry}: ${nodes} node(s) and ${edges} edge(s) belong to no registered network (group meta-edges, collapsed group members) and were not read`,
        );
    }
}

// ---------------------------------------------------------------------------------------- 2.x

/**
 * The networks of a 2.x session: every network of `cysession.xml`'s tree except `Network Root`,
 * in the order of their files in the archive.
 * @param session - the session
 * @param report - the report
 * @param inner - the options entries are read with
 * @returns the networks
 */
async function networks2(
    session: Session,
    report: ImportReportBuilder,
    inner: ResolvedImportOptions,
): Promise<Choice2[]> {
    const { layout } = session;
    if (layout.cysession === null) {
        return report.fail(CYS_ISSUE.NOT_SESSION, "the session has no cysession.xml");
    }
    const tree = await readXmlTree(await session.read(layout.cysession, report), layout.cysession.name, report, inner);
    const documentVersion = tree.attrs.get("documentVersion") ?? "";
    if (documentVersion.length > 0 && !/^\d+(\.\d+)*$/.test(documentVersion.trim())) {
        report.warning(
            "validation-error",
            XGMML_ISSUE.DOCUMENT_VERSION,
            `${layout.cysession.name}: documentVersion "${documentVersion}" does not parse; the session is read as Cytoscape 2.x`,
        );
    }
    if (documentVersion.startsWith("3")) {
        report.fail(
            CYS_ISSUE.VERSION,
            `cysession.xml has documentVersion ${documentVersion} and no version marker: the 2011 Cytoscape 3.0 pre-release layout, which no released Cytoscape reads`,
        );
    }
    const byDecoded = new Map<string, SessionEntry>();
    for (const [path, entry] of layout.files) {
        byDecoded.set(path, entry);
        byDecoded.set(urlDecode(path), entry);
    }
    const order = [...layout.files.values()];
    const choices: Choice2[] = [];
    const missing: string[] = [];
    const named = new Set<SessionEntry>();
    for (const record of elementsNamed(tree, "network")) {
        const given = record.attrs.get("id");
        const filename = record.attrs.get("filename") ?? (given === undefined ? undefined : `${given}.xgmml`);
        if (given === "Network Root") {
            continue;
        }
        if (filename === undefined) {
            sessionRecord(
                report,
                layout.cysession.name,
                "a <network> has neither an id nor a filename; it is not read",
            );
            continue;
        }
        const id = given ?? urlDecode(filename.replace(/\.xgmml$/i, ""));
        if (given === undefined) {
            sessionRecord(
                report,
                layout.cysession.name,
                `a <network> for ${filename} has no id; it is named "${id}" after its file`,
            );
        }
        const file = byDecoded.get(filename);
        if (file === undefined) {
            missing.push(filename);
            continue;
        }
        if (named.has(file)) {
            sessionRecord(
                report,
                layout.cysession.name,
                `the <network> "${id}" names ${filename}, which an earlier record already names; it is not read a second time`,
            );
            continue;
        }
        named.add(file);
        const parent = record.children.find((c) => c.name === "parent")?.attrs.get("id") ?? null;
        choices.push({
            era: "2",
            file,
            name: id,
            record,
            parent: parent === "Network Root" || parent === "NULL" ? null : parent,
        });
    }
    if (missing.length > 0) {
        report.warning(
            "validation-error",
            CYS_ISSUE.DANGLING_REFERENCE,
            `cysession.xml names ${missing.length} network file(s) the session does not hold: ${listed(missing)}`,
        );
    }
    const unnamed = order.filter((e) => !named.has(e)).map((e) => e.name);
    if (unnamed.length > 0) {
        report.warning(
            "unsupported",
            CYS_ISSUE.ENTRY_SKIPPED,
            `${unnamed.length} network file(s) are not in cysession.xml's network tree and were not read: ${listed(unnamed)}`,
        );
    }
    return choices.sort((a, b) => order.indexOf(a.file) - order.indexOf(b.file));
}

/**
 * W_CYS_SESSION_RECORD: a cysession.xml network record without an id, or one naming a file an
 * earlier record names.
 * @param report - the report
 * @param entry - the cysession.xml entry name
 * @param message - what is wrong and what is done
 */
function sessionRecord(report: ImportReportBuilder, entry: string, message: string): void {
    report.warning("validation-error", CYS_ISSUE.SESSION_RECORD, `${entry}: ${message}`);
}

/**
 * Import one network of a 2.x session.
 * @param prepared - the prepared import
 * @param choice - the network
 * @param sink - the sink
 */
async function import2(prepared: Prepared, choice: Choice2, sink: GraphSink): Promise<void> {
    const { report, inner, session } = prepared;
    const { doc, dialect } = await parseEntry(session, choice.file, report, inner);
    let unmatched = 0;
    for (const [list, column] of [
        ["selectedNodes", SELECTED_COLUMN],
        ["hiddenNodes", HIDDEN_COLUMN],
    ] as const) {
        unmatched += mark(doc.nodes, idsIn(choice.record, list), column);
    }
    for (const [list, column] of [
        ["selectedEdges", SELECTED_COLUMN],
        ["hiddenEdges", HIDDEN_COLUMN],
    ] as const) {
        unmatched += mark(doc.edges, idsIn(choice.record, list), column);
    }
    if (unmatched > 0) {
        report.warning(
            "validation-error",
            CYS_ISSUE.DANGLING_REFERENCE,
            `cysession.xml lists ${unmatched} selected or hidden name(s) that ${choice.file.name} does not hold; they are not read`,
        );
    }
    const cyMeta = sessionMeta(prepared, {
        collection: null,
        network: choice.name,
        parentNetwork: choice.parent,
        visualStyle: choice.record.attrs.get("visualStyle") ?? null,
    });
    const extras: EmitExtras = {
        sourceFormat: FORMAT,
        entry: choice.file.name,
        graphName: choice.name,
        metaExtra: { [META_KEY]: cyMeta },
    };
    const settings: XgmmlSettings = { labelAliases: true, cytoscapeEscapes: true, zAs: prepared.zAs };
    new XgmmlEmitter(doc, dialect, sink, report, inner, settings, extras).emit(null);
}

/**
 * The element ids a `cysession.xml` network record lists under one key (`selectedNodes`, ...).
 * @param record - the network record
 * @param list - the list element's name
 * @returns the ids (2.x node names, edge identifiers)
 */
function idsIn(record: XmlNode, list: string): Set<string> {
    const out = new Set<string>();
    for (const holder of record.children.filter((c) => c.name === list)) {
        for (const item of holder.children) {
            const id = item.attrs.get("id");
            if (id !== undefined) {
                out.add(id);
            }
        }
    }
    return out;
}

/**
 * Give the records 2.x lists by name (a node's name is its label; an edge is named by its id or
 * label) a true cell in a bool column of the cytoscape namespace.
 * @param records - the node or edge records
 * @param ids - the listed names
 * @param column - the column
 * @returns how many listed names match no record
 */
function mark(records: readonly (NodeRec | EdgeRec)[], ids: ReadonlySet<string>, column: string): number {
    if (ids.size === 0) {
        return 0;
    }
    const matched = new Set<string>();
    for (const record of records) {
        if (record.id !== null && ids.has(record.id)) {
            matched.add(record.id);
        }
        if (record.label !== null && ids.has(record.label)) {
            matched.add(record.label);
        }
        if ((record.id !== null && ids.has(record.id)) || (record.label !== null && ids.has(record.label))) {
            record.atts.push({
                name: column,
                type: null,
                cyType: "Boolean",
                elementType: null,
                value: "true",
                hidden: false,
                equation: false,
                children: [],
                extra: {},
                xml: null,
                hasGraph: false,
                text: "",
                line: record.line,
                namespace: CYTOSCAPE_NAMESPACE,
            });
        }
    }
    return ids.size - matched.size;
}

// ---------------------------------------------------------------------------------------- shared

/** The session facts of `meta.extra.cytoscape`. */
interface SessionMeta {
    sessionVersion: string;
    collection: string | null;
    network: string;
    parentNetwork: string | null;
    visualStyle: string | null;
    skippedEntries: string[];
    groups?: { group: string; members: string[] }[];
}

/**
 * The session facts of one network, and the once-per-import warnings about what is not read
 * (styles, other entries).
 * @param prepared - the prepared import
 * @param facts - the network's facts
 * @param facts.collection - the root network's name (3.x)
 * @param facts.network - the network's id
 * @param facts.parentNetwork - the network it was made from
 * @param facts.visualStyle - the style its view uses
 * @returns the record
 */
function sessionMeta(
    prepared: Prepared,
    facts: { collection: string | null; network: string; parentNetwork: string | null; visualStyle: string | null },
): SessionMeta {
    const { layout } = prepared.session;
    const { report } = prepared;
    if (layout.styles.length > 0) {
        report.warning(
            "unsupported",
            CYS_ISSUE.STYLES_NOT_IMPORTED,
            `the session's styles (${layout.styles.map((s) => s.path).join(", ")}) are not applied: style import is issue #706`,
        );
    }
    if (layout.skipped.length > 0) {
        report.warning(
            "unsupported",
            CYS_ISSUE.ENTRY_SKIPPED,
            `${layout.skipped.length} entries hold no graph data and were not read (apps, global tables, properties, images): ${listed(layout.skipped)}`,
        );
    }
    return {
        sessionVersion: layout.version,
        ...facts,
        skippedEntries: [...layout.skipped],
    };
}

/**
 * Import one network of a prepared session into a sink.
 * @param prepared - the prepared import
 * @param index - the network
 * @param sink - the sink
 * @returns the report
 */
async function importChoice(prepared: Prepared, index: number, sink: GraphSink): Promise<ImportReport> {
    const choice = prepared.choices[index];
    if (choice.era === "3") {
        const parsed = prepared.docs.get(choice.network.name) as Parsed;
        await import3(prepared, choice, sink, parsed);
    } else {
        await import2(prepared, choice, sink);
    }
    throwIfAborted(prepared.common.signal);
    return prepared.report.finish();
}

/**
 * Import one network of a session.
 * @param input - the session bytes
 * @param sink - the sink
 * @param options - format-specific and common options
 * @returns the report; ImportError when the session cannot be read or the error limit is exceeded
 */
async function importCys(
    input: ImportInput,
    sink: GraphSink,
    options?: CysImportOptions & CommonImportOptions,
): Promise<ImportReport> {
    const prepared = await prepare(input, sink, options);
    const index = chooseGraph(
        prepared.choices.map((c) => c.name),
        options,
        prepared.report,
    );
    if (prepared.choices.length > 1) {
        prepared.report.warning(
            "unsupported",
            CYS_ISSUE.MULTIPLE_GRAPHS,
            `the session holds ${prepared.choices.length} networks; ${prepared.choices.length - 1} were not read (use importAll, graphIndex or graphName)`,
        );
    }
    const report = await importChoice(prepared, index, sink);
    prepared.session.done();
    return report;
}

/**
 * Import every network of a session, each into its own sink with its own report.
 * @param input - the session bytes
 * @param sinkFor - a sink per network
 * @param options - format-specific and common options
 * @returns one report per network
 */
async function importAllCys(
    input: ImportInput,
    sinkFor: (index: number) => GraphSink,
    options?: CysImportOptions & CommonImportOptions,
): Promise<ImportReport[]> {
    // the archive is opened and its network files parsed once: one byte budget, one progress,
    // and every network's report starts from what reading the session recorded
    const first = await prepare(input, null, options);
    const opened = first.report.fork();
    const reports: ImportReport[] = [];
    for (let i = 0; i < first.choices.length; i++) {
        const sink = sinkFor(i);
        const prepared = i === 0 ? first : { ...first, report: opened.fork() };
        reportSinkOptions(sink, options, prepared.report, true);
        reportUnusedOptions(options, prepared.report, USED_OPTIONS);
        reports.push(await importChoice(prepared, i, sink));
    }
    first.session.done();
    return reports;
}

/**
 * List the networks of a session from its network files, without reading tables or views.
 * @param input - the session bytes
 * @param options - the options
 * @returns one listing per network; node and edge counts for 3.x sessions only
 */
async function listCysGraphs(
    input: ImportInput,
    options?: CysImportOptions & CommonImportOptions,
): Promise<readonly GraphListing[]> {
    const prepared = await prepare(input, null, options);
    return prepared.choices.map((choice, index) =>
        Object.freeze({
            index,
            name: choice.name,
            nodes: choice.era === "3" ? choice.nodes : null,
            edges: choice.era === "3" ? choice.edges : null,
        }),
    );
}

/**
 * A session's marker or folder name in the head of the archive, or an entry only a session has
 * (Cytoscape's app state, a network, view or table file), for a session whose folder was renamed.
 */
const SESSION_NAME =
    /CytoscapeSession|cysession\.xml|\d+\.\d+\.\d+\.version|(^|\/)apps\/org\.cytoscape\.|(^|\/)(networks|views)\/\d+-[^/]*\.xgmml|(^|\/)tables\/\d+-[^/]*\/[^/]+\.cytable/;

/**
 * Confidence that a head of bytes is a Cytoscape session: 0.95 for a zip whose head names the
 * session folder, its version marker or cysession.xml; 0 for any other zip, so an `.xlsx`, a
 * `.docx` or a zipped GraphML ranks as no format rather than as a broken session. The zip may
 * start after a short stub (a self-extracting archive) within the head.
 * @param head - the first bytes
 * @returns the confidence
 */
export function sniffCys(head: Uint8Array): number {
    for (let at = 0; at + 4 <= head.byteLength; at++) {
        if (startsLikeZip(head.subarray(at))) {
            return SESSION_NAME.test(decodeEntryName(head.subarray(at))) ? 0.95 : 0;
        }
    }
    return 0;
}

/** The Cytoscape session importer. */
export const cysImporter: GraphImporter<CysImportOptions> = Object.freeze({
    format: FORMAT,
    extensions: EXTENSIONS,
    mimeTypes: MIME_TYPES,
    sniff: sniffCys,
    import: importCys,
    importAll: importAllCys,
    listGraphs: listCysGraphs,
});
