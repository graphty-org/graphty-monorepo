/**
 * Resolving a parsed XGMML document (document.ts) into a sink: which nodes and edges a graph
 * holds, their ids, endpoints, direction, weights, containment, positions, graphics and attribute
 * columns. The `.cys` importer calls the same code with the session's tables and views merged into
 * the records first, so both readers share every rule.
 */

import { type ColumnDecl, type ColumnHandle, type GraphSink, INVALID_INDEX, type NodeId } from "@graphty/graph-format";

import { declareResolved } from "../../common/attributes.js";
import { DirectionResolver, type EdgeKind } from "../../common/direction.js";
import { IdCoercer } from "../../common/ids.js";
import { throwIfAborted } from "../../common/input.js";
import { type ResolvedImportOptions } from "../../common/options.js";
import { type ImportReportBuilder, type IssueLocation } from "../../common/report.js";
import { parseWeightText } from "../../common/weights.js";
import { ColumnSet } from "./columns.js";
import {
    CYTOSCAPE_ORIGIN_NAMESPACE,
    EDGE_ID_COLUMN,
    FORMAT,
    GRAPHICS_COLUMN,
    INTERACTION_COLUMN,
    LABEL_COLUMN,
    META_KEY,
    NESTED_NETWORK_COLUMN,
    NETWORK_POINTER_COLUMN,
    NETWORKS_COLUMN,
    PARENT_COLUMN,
    PARENTS_COLUMN,
    POSITION_COLUMN,
    SUBGRAPH_COLUMN,
    XGMML_ISSUE,
    XGMML_ORIGIN_NAMESPACE,
    Z_COLUMN,
} from "./constants.js";
import {
    attJson,
    type AttRec,
    type EdgeRec,
    type GraphRec,
    isCyTrue,
    type NodeRec,
    type XgmmlDocument,
} from "./document.js";
import { parseScalar } from "./values.js";

/** The XGMML-specific options, resolved. */
export interface XgmmlSettings {
    /** Resolve missing or unknown endpoints through `"a (pp) b"` edge labels. */
    readonly labelAliases: boolean;
    /** Decode Cytoscape's `\n` / `\t` in strings. */
    readonly cytoscapeEscapes: boolean;
    /** Where Cytoscape's z goes. */
    readonly zAs: "column" | "position";
}

/** What a session adds to the document's own rules. */
export interface EmitExtras {
    /** Ids of nodes the session's group bookkeeping lists as groups. */
    readonly groupNodes?: ReadonlySet<string> | undefined;
    /** The network name a cross-file pointer (`file.xgmml#id`) names, or null when unknown. */
    readonly resolvePointer?: ((href: string) => string | null) | undefined;
    /** Graph-level attributes and the graph name come from elsewhere: skip the graph's own. */
    readonly graphName?: string | null | undefined;
    /** Extra json graph columns. */
    readonly graphJson?: Readonly<Record<string, unknown>> | undefined;
    /** Extra entries of `meta.extra`. */
    readonly metaExtra?: Readonly<Record<string, unknown>> | undefined;
    /** The format name the report and metadata carry ("cys"). */
    readonly sourceFormat?: string | undefined;
    /** Prefix of every issue message (the session entry name). */
    readonly entry?: string | undefined;
    /**
     * A group member that is not in the graph being read (a collapsed group's member in a
     * session): the session records it instead of E_UNKNOWN_PARENT.
     */
    readonly onMissingMember?: ((group: string, member: string) => void) | undefined;
}

/** The dialect facts the rules depend on. */
export interface Dialect {
    /** The documentVersion as written, or null. */
    readonly versionText: string | null;
    /** The parsed version, or 0 when absent or unparseable. */
    readonly version: number;
    /** Cytoscape wrote the file (the `cy` namespace is in use). */
    readonly cytoscape: boolean;
    /** A Cytoscape 2.x document (Cytoscape dialect with a version below 3). */
    readonly cy2: boolean;
    /** The 3.x session network dialect (root `cy:registered="0"` with registered subnetworks). */
    readonly session: boolean;
    /** A session view document (root `cy:view="1"`). */
    readonly view: boolean;
}

/** The graph atts that are document metadata, not columns. */
const META_ATTS: ReadonlySet<string> = new Set(["documentVersion", "networkMetadata"]);

/** The root XML attributes that are structure, not graph columns. */
const GRAPH_STRUCTURE: ReadonlySet<string> = new Set([
    "id",
    "label",
    "directed",
    "xlink:href",
    "cy:documentVersion",
    "cy:view",
    "cy:registered",
    "cy:networkId",
    "cy:visualStyle",
    "cy:rendererId",
]);

/** Elements between two checks of the cancellation signal. */
const ABORT_CHECK_INTERVAL = 64;

/** Cytoscape's label alias shape: `source (interaction) target`. */
const ALIAS_SPLIT = /[()]/;

/**
 * The dialect of a document (`research-xgmml.md` section 2).
 * @param doc - the document
 * @param report - the report the unparseable-version warning goes to
 * @returns the dialect
 */
export function dialectOf(doc: XgmmlDocument, report: ImportReportBuilder): Dialect {
    const { root } = doc;
    let versionText = root.attrs.get("cy:documentVersion") ?? null;
    for (const att of root.atts) {
        if (att.name === "documentVersion" && att.value !== null) {
            versionText ??= att.value;
        }
    }
    let version = 0;
    if (versionText !== null) {
        version = Number(versionText.trim());
        if (!Number.isFinite(version) || version < 0 || versionText.trim().length === 0) {
            report.warning(
                "validation-error",
                XGMML_ISSUE.DOCUMENT_VERSION,
                `documentVersion "${versionText}" does not parse; the dialect is chosen from the content`,
                { line: root.line },
            );
            version = 0;
        }
    }
    const registered = root.subgraphs.some((g) => isCyTrue(g.registered));
    return {
        versionText,
        version,
        cytoscape: doc.cytoscape,
        cy2: doc.cytoscape && version < 3,
        session: root.registered !== null && !isCyTrue(root.registered) && registered,
        view: isCyTrue(root.attrs.get("cy:view")),
    };
}

/**
 * The graphs a document offers: the registered subnetworks of a session network document, else
 * the root.
 * @param doc - the document
 * @param dialect - its dialect
 * @returns the graphs, in document order
 */
export function graphsOf(doc: XgmmlDocument, dialect: Dialect): GraphRec[] {
    return dialect.session ? doc.root.subgraphs.filter((g) => isCyTrue(g.registered)) : [doc.root];
}

/**
 * A graphics coordinate as Java's `Double.parseDouble` reads Cytoscape's (no hex, no `_`), and
 * finite.
 * @param text - the text
 * @returns the number, or null when it does not parse or is not finite
 */
export function parseCoordinate(text: string): number | null {
    const parsed = parseScalar(text, "real", false);
    return parsed === null || !Number.isFinite(parsed.value) ? null : (parsed.value as number);
}

/**
 * The id a `#id` reference names, or null for a cross-file or malformed reference.
 * @param href - the xlink:href text
 * @returns the id
 */
function localRef(href: string): string | null {
    return href.startsWith("#") ? href.slice(1) : null;
}

/**
 * The nodes and edges a graph holds: its direct members, references resolved.
 * @param doc - the document
 * @param graph - the graph (a registered subnetwork), or null for the whole document
 * @returns the declared node and edge records it holds, references resolved, in order
 */
export function membersOf(
    doc: XgmmlDocument,
    graph: GraphRec | null,
): { readonly nodes: NodeRec[]; readonly edges: EdgeRec[]; readonly dangling: number } {
    if (graph === null) {
        return { nodes: doc.nodes, edges: doc.edges, dangling: 0 };
    }
    const nodeById = indexById(doc.nodes);
    const edgeById = indexById(doc.edges);
    const nodes: NodeRec[] = [];
    const edges: EdgeRec[] = [];
    let dangling = 0;
    for (const member of graph.members) {
        if (member.href === null) {
            if (member.kind === "node") {
                nodes.push(member);
            } else {
                edges.push(member);
            }
            continue;
        }
        const id = localRef(member.href);
        let target: NodeRec | EdgeRec | undefined;
        if (id !== null) {
            target = member.kind === "node" ? nodeById.get(id) : edgeById.get(id);
        }
        if (target === undefined) {
            dangling++;
        } else if (target.kind === "node") {
            nodes.push(target);
        } else {
            edges.push(target);
        }
    }
    return { nodes, edges, dangling };
}

/**
 * The first declaration of each id.
 * @param records - node or edge records
 * @returns id to record
 */
function indexById<T extends NodeRec | EdgeRec>(records: readonly T[]): Map<string, T> {
    const out = new Map<string, T>();
    for (const record of records) {
        if (record.id !== null && !out.has(record.id)) {
            out.set(record.id, record);
        }
    }
    return out;
}

/** Per-node state while emitting. */
interface NodeRow {
    readonly id: string;
    readonly records: NodeRec[];
    index: number;
    readonly row: number;
}

/**
 * Pushes one graph of a document into a sink.
 */
export class XgmmlEmitter {
    private readonly doc: XgmmlDocument;

    private readonly dialect: Dialect;

    private readonly sink: GraphSink;

    private readonly report: ImportReportBuilder;

    private readonly options: ResolvedImportOptions;

    private readonly settings: XgmmlSettings;

    private readonly extras: EmitExtras;

    private readonly coercer: IdCoercer;

    private readonly direction: DirectionResolver;

    private readonly nodeColumns: ColumnSet;

    private readonly edgeColumns: ColumnSet;

    private readonly graphColumns: ColumnSet;

    private readonly rows = new Map<string, NodeRow>();

    private readonly rowList: NodeRow[] = [];

    private readonly edgeIndex: number[] = [];

    private sinceCheck = 0;

    private aliasResolved = 0;

    private aliasInteractions = 0;

    private weighted = false;

    /**
     * Create an emitter for one graph.
     * @param doc - the document
     * @param dialect - its dialect
     * @param sink - the sink
     * @param report - the report
     * @param options - the resolved common options
     * @param settings - the XGMML options
     * @param extras - what a session adds
     */
    constructor(
        doc: XgmmlDocument,
        dialect: Dialect,
        sink: GraphSink,
        report: ImportReportBuilder,
        options: ResolvedImportOptions,
        settings: XgmmlSettings,
        extras: EmitExtras = {},
    ) {
        this.doc = doc;
        this.dialect = dialect;
        this.sink = sink;
        this.report = report;
        this.options = options;
        this.settings = settings;
        this.extras = extras;
        this.coercer = new IdCoercer(options.ids);
        this.direction = new DirectionResolver(sink, report, options.onMixedDirection);
        const base = { unescape: settings.cytoscapeEscapes, long: options.long };
        this.nodeColumns = new ColumnSet("node", report, {
            ...base,
            reserved: new Set([
                LABEL_COLUMN,
                POSITION_COLUMN,
                Z_COLUMN,
                GRAPHICS_COLUMN,
                PARENT_COLUMN,
                PARENTS_COLUMN,
                SUBGRAPH_COLUMN,
                NESTED_NETWORK_COLUMN,
                NETWORK_POINTER_COLUMN,
                NETWORKS_COLUMN,
            ]),
        });
        this.edgeColumns = new ColumnSet("edge", report, {
            ...base,
            reserved: new Set([EDGE_ID_COLUMN, LABEL_COLUMN, GRAPHICS_COLUMN]),
        });
        this.graphColumns = new ColumnSet("graph", report, { ...base, reserved: new Set([GRAPHICS_COLUMN]) });
    }

    /**
     * Push the graph: nodes, containment, positions, edges, columns, metadata.
     * @param graph - the subnetwork, or null for the whole document
     */
    emit(graph: GraphRec | null): void {
        const members = membersOf(this.doc, graph);
        if (members.dangling > 0) {
            this.report.warning(
                "validation-error",
                XGMML_ISSUE.DANGLING_REFERENCE,
                `${this.prefix()}${members.dangling} xlink:href member reference(s) name no node or edge of the document`,
                { line: graph?.line ?? null },
            );
        }
        const header = this.headerDirected();
        this.direction.setHeader(this.sinkDirection(members.edges, header), { line: this.doc.root.line });
        this.addNodes(members.nodes);
        if (graph === null) {
            this.checkReferences();
        }
        const containment = new Containment(this);
        containment.resolve(this.rowList, this.groupTest());
        this.writeNodeExtras(graph);
        this.addEdges(members.edges, header);
        this.finishAliases();
        this.writeGraph(graph);
        const nodeIndex = (row: number): number => this.rowList[row].index;
        this.nodeColumns.write(this.sink, nodeIndex);
        this.edgeColumns.write(this.sink, (row) => this.edgeIndex[row] ?? -1);
        containment.write();
        this.writeMeta(graph);
        throwIfAborted(this.options.signal);
    }

    // ------------------------------------------------------------------ shared helpers (also used by Containment)

    /**
     * The sink.
     * @returns the sink
     */
    get target(): GraphSink {
        return this.sink;
    }

    /**
     * The report.
     * @returns the report
     */
    get issues(): ImportReportBuilder {
        return this.report;
    }

    /**
     * The row of a node id in this graph.
     * @param id - the id text
     * @returns the row, or undefined
     */
    rowOf(id: string): NodeRow | undefined {
        return this.rows.get(id);
    }

    /**
     * The network name a cross-file pointer names, when a session can tell.
     * @param href - the pointer
     * @returns the name, or null
     */
    resolvePointer(href: string): string | null {
        return this.extras.resolvePointer?.(href) ?? null;
    }

    /**
     * Hand a group member the graph does not hold to the session, when one is reading.
     * @param group - the group node's id
     * @param member - the member's id
     * @returns true when the session took it
     */
    missingMember(group: string, member: string): boolean {
        if (this.extras.onMissingMember === undefined) {
            return false;
        }
        this.extras.onMissingMember(group, member);
        return true;
    }

    /**
     * The first graph of the document with an id.
     * @param id - the id
     * @returns the graph, or undefined
     */
    graphById(id: string): GraphRec | undefined {
        return this.doc.graphs.find((g) => g.id === id);
    }

    /**
     * The prefix of every message (the session entry), or "".
     * @returns the prefix
     */
    prefix(): string {
        return this.extras.entry === undefined ? "" : `${this.extras.entry}: `;
    }

    /**
     * Check the cancellation signal every few dozen elements.
     */
    checkAbort(): void {
        if (++this.sinceCheck >= ABORT_CHECK_INTERVAL) {
            this.sinceCheck = 0;
            throwIfAborted(this.options.signal);
        }
    }

    /**
     * Declare a column the importer owns on first use (the 5.6 rename rule applies).
     * @param domain - node or edge
     * @param decl - the declaration
     * @returns the handle, or null when the sink refused it (recorded)
     */
    declare(domain: "node" | "edge", decl: ColumnDecl): ColumnHandle | null {
        try {
            return declareResolved(this.sink, domain, decl, this.report, { element: decl.name }).handle;
        } catch (err) {
            this.report.recordError(err, { element: decl.name });
            return null;
        }
    }

    // ------------------------------------------------------------------ nodes

    /**
     * The header direction: the root's `directed` (0 by the DTD), else the defaultDirected option.
     * @returns whether the graph is directed by default
     */
    private headerDirected(): boolean {
        const text = this.doc.root.attrs.get("directed");
        if (text === undefined) {
            return this.options.defaultDirected;
        }
        return this.flag(text, this.options.defaultDirected, { line: this.doc.root.line, element: "directed" });
    }

    /** The direction of each edge, decided once (its warning is recorded once). */
    private readonly directions = new Map<EdgeRec, boolean>();

    /**
     * The direction of one edge: its cy:directed, else the header.
     * @param record - the edge
     * @param header - the header direction
     * @returns whether the edge is directed
     */
    private edgeDirection(record: EdgeRec, header: boolean): boolean {
        let directed = this.directions.get(record);
        if (directed === undefined) {
            const fallback = this.graphDirected(record.graph, header);
            directed =
                record.directed === null
                    ? fallback
                    : this.flag(record.directed, fallback, { line: record.line, element: record.id ?? record.label });
            this.directions.set(record, directed);
        }
        return directed;
    }

    /**
     * The default direction of the edges of a graph: the `directed` attribute of the graph or of
     * the nearest graph it is nested in that has one, else the header.
     * @param graph - the graph that holds the edge
     * @param header - the header direction
     * @returns whether the graph's edges are directed by default
     */
    private graphDirected(graph: GraphRec, header: boolean): boolean {
        for (let g: GraphRec | null = graph; g !== null && g !== this.doc.root; g = g.parent) {
            const text = g.attrs.get("directed");
            if (text !== undefined) {
                return this.flag(text, header, { line: g.line, element: "directed" });
            }
        }
        return header;
    }

    /**
     * The direction the sink starts with: the one every edge has when they all agree (a
     * Cytoscape file writes cy:directed on every edge and may omit the root attribute), else the
     * header, so a graph of one direction is never expanded into a mixed one.
     * @param edges - the edges of the graph
     * @param header - the header direction
     * @returns the sink direction
     */
    private sinkDirection(edges: readonly EdgeRec[], header: boolean): boolean {
        let first: boolean | null = null;
        for (const edge of edges) {
            const directed = this.edgeDirection(edge, header);
            if (first === null) {
                first = directed;
            } else if (first !== directed) {
                return header;
            }
        }
        return first ?? header;
    }

    /**
     * A 0 / 1 direction flag: true, false, yes and no are accepted with a warning; anything else
     * falls back.
     * @param text - the text
     * @param fallback - the direction for an unreadable value
     * @param where - the location
     * @returns the direction
     */
    private flag(text: string, fallback: boolean, where: IssueLocation): boolean {
        const t = text.trim();
        if (t === "1" || t === "0") {
            return t === "1";
        }
        const lower = t.toLowerCase();
        const readable = lower === "true" || lower === "yes" || lower === "false" || lower === "no";
        this.report.warnOnce(
            "validation-error",
            XGMML_ISSUE.BAD_DIRECTED,
            readable
                ? `${this.prefix()}directed="${text}" is not 0 or 1; read as ${lower === "true" || lower === "yes" ? "1" : "0"}`
                : `${this.prefix()}directed="${text}" is not 0 or 1; read as ${fallback ? "directed" : "undirected"}`,
            where,
            `${XGMML_ISSUE.BAD_DIRECTED}:${text}`,
        );
        return readable ? lower === "true" || lower === "yes" : fallback;
    }

    /**
     * Add every node record to the sink (one node per id; later declarations merge).
     * @param records - the node records
     */
    private addNodes(records: readonly NodeRec[]): void {
        for (const record of records) {
            const { id } = record;
            if (id === null) {
                continue;
            }
            const existing = this.rows.get(id);
            if (existing !== undefined) {
                existing.records.push(record);
                this.report.warning(
                    "validation-error",
                    XGMML_ISSUE.DUPLICATE_NODE,
                    `${this.prefix()}node "${id}" is declared twice; the declarations are merged`,
                    { line: record.line, element: id },
                );
                continue;
            }
            // -1 (not INVALID_INDEX, which is positive) marks a node the sink refused
            const row: NodeRow = { id, records: [record], index: -1, row: this.rowList.length };
            try {
                row.index = this.sink.addNode(this.nodeId(id, record.line));
                this.report.counts.nodes++;
            } catch (err) {
                this.report.counts.skippedNodes++;
                this.report.recordError(err, { line: record.line, element: id });
            }
            this.rows.set(id, row);
            this.rowList.push(row);
            this.checkAbort();
        }
    }

    /**
     * The coerced id of a node text.
     * @param text - the id text
     * @param line - the line
     * @returns the id
     */
    private nodeId(text: string, line: number): NodeId {
        const id = this.coercer.text(text);
        const merge = this.coercer.lastMerge;
        if (merge !== null) {
            this.report.warning(
                "coercion",
                XGMML_ISSUE.ID_MERGED,
                `id "${merge.text}" merged with "${merge.previousText}" as ${merge.id} under ids: "number"`,
                { line, element: text },
            );
        }
        return id;
    }

    /**
     * Whether a node's nested graph is a group (containment) rather than a nested-network
     * pointer: any graph in the 1.0 draft dialect, a 2.x node with `__groupState`, a 3.x node with
     * `__isGroup` true, or a node the session lists.
     * @returns the test
     */
    private groupTest(): (node: NodeRec) => boolean {
        const { groupNodes } = this.extras;
        const { cytoscape } = this.dialect;
        return (node: NodeRec): boolean => {
            if (!cytoscape) {
                return true;
            }
            if (node.id !== null && groupNodes?.has(node.id) === true) {
                return true;
            }
            return node.atts.some((a) => a.name === "__groupState" || (a.name === "__isGroup" && isCyTrue(a.value)));
        };
    }

    /**
     * W_DANGLING_REFERENCE for the `xlink:href` members of a generic document's non-group graphs
     * that name no node or edge (a group's are E_UNKNOWN_PARENT, reported by the containment).
     */
    private checkReferences(): void {
        const isGroup = this.groupTest();
        const edgeIds = new Set(this.doc.edges.map((e) => e.id));
        let dangling = 0;
        for (const graph of this.doc.graphs) {
            if (graph.owner !== null && isGroup(graph.owner)) {
                continue;
            }
            for (const member of graph.members) {
                if (member.href === null) {
                    continue;
                }
                const id = localRef(member.href);
                const known = id !== null && (member.kind === "node" ? this.rows.has(id) : edgeIds.has(id));
                if (!known) {
                    dangling++;
                }
            }
        }
        if (dangling > 0) {
            this.report.warning(
                "validation-error",
                XGMML_ISSUE.DANGLING_REFERENCE,
                `${this.prefix()}${dangling} xlink:href reference(s) name no node or edge of the document`,
            );
        }
    }

    /**
     * Write the per-node values: label, attributes, XML attributes, graphics, positions, nested
     * network pointers and subgraph memberships.
     * @param graph - the subnetwork, or null
     */
    private writeNodeExtras(graph: GraphRec | null): void {
        const labels: (string | undefined)[] = [];
        const positions = new Positions(this, this.dialect.cytoscape ? this.settings.zAs : "position");
        const graphics = new JsonColumn(this, "node", GRAPHICS_COLUMN, XGMML_ORIGIN_NAMESPACE, "graphics");
        const pointers = new Pointers(this, this.groupTest());
        for (const row of this.rowList) {
            const where = { line: row.records[0].line, element: row.id };
            const seen = new Set<string>();
            for (const record of row.records) {
                labels[row.row] ??= record.label ?? undefined;
                this.addElementColumns(this.nodeColumns, row.row, record, seen, where);
                positions.add(row, record);
                if (record.graphics !== null && Object.keys(record.graphics).length > 0) {
                    graphics.set(row.index, record.graphics);
                }
                pointers.add(row, record);
            }
            this.checkAbort();
        }
        this.writeLabels("node", labels, (row) => this.rowList[row].index);
        positions.write();
        pointers.write();
        if (graph === null) {
            this.writeNetworks();
        }
    }

    /**
     * Add an element's XML attributes (text grammar) and atts to a column set; atts of a later
     * duplicate declaration only fill names the earlier ones left unset.
     * @param columns - the column set
     * @param row - the row
     * @param record - the node or edge
     * @param seen - the names set by earlier declarations of the same node
     * @param where - the location
     */
    private addElementColumns(
        columns: ColumnSet,
        row: number,
        record: NodeRec | EdgeRec,
        seen: Set<string>,
        where: IssueLocation,
    ): void {
        const merging = seen.size > 0;
        const names = new Set<string>();
        if (record.name !== null) {
            if (!(merging && seen.has("name"))) {
                columns.addText(row, "name", record.name, where);
            }
            names.add("name");
        }
        for (const [key, value] of record.xmlAttrs) {
            if (!(merging && seen.has(key))) {
                columns.addText(row, key, value, where);
            }
            names.add(key);
        }
        for (const att of record.atts) {
            if (this.skipAtt(record, att) || (merging && att.name !== null && seen.has(att.name))) {
                continue;
            }
            if (record.kind === "node" && att.name === "__isGroup" && record.nested.length > 0 && isCyTrue(att.value)) {
                // the group is the containment itself (parent / parents and xgmml.subgraph)
                continue;
            }
            if (att.hasGraph && att.name === null) {
                continue;
            }
            columns.addAtt(row, att, where);
            if (att.name !== null) {
                names.add(att.name);
            }
        }
        for (const name of names) {
            seen.add(name);
        }
    }

    /**
     * Whether an att is not a column: an edge's weight att under weightFrom.
     * @param record - the element
     * @param att - the att
     * @returns true to skip it
     */
    private skipAtt(record: NodeRec | EdgeRec, att: AttRec): boolean {
        if (record.kind !== "edge" || att.name !== this.options.weightFrom) {
            return false;
        }
        if (record.weight === null || att.name !== "weight" || att.children.length > 0) {
            return record.weight === null;
        }
        // weight="2" and <att name="weight" value="3">: the attribute is THE weight
        this.report.warning(
            "validation-error",
            XGMML_ISSUE.DUPLICATE_ATTRIBUTE,
            `${this.prefix()}an edge has weight="${record.weight}" and a weight att "${att.value ?? ""}"; the weight attribute is the weight and the att is not read`,
            { line: att.line, element: record.id ?? record.label ?? "weight" },
        );
        return true;
    }

    /**
     * Write a label column (role label).
     * @param domain - node or edge
     * @param labels - the label of each row
     * @param index - the sink index of a row
     */
    private writeLabels(
        domain: "node" | "edge",
        labels: readonly (string | undefined)[],
        index: (row: number) => number,
    ): void {
        if (!labels.some((l) => l !== undefined)) {
            return;
        }
        const handle = this.declare(domain, {
            name: LABEL_COLUMN,
            dtype: "string",
            role: "label",
            nullable: true,
            origin: { format: FORMAT, id: null, title: null, type: "label", namespace: null },
        });
        if (handle === null) {
            return;
        }
        labels.forEach((label, row) => {
            const i = index(row);
            if (label !== undefined && i >= 0) {
                if (domain === "node") {
                    this.sink.setNodeValue(handle, i, label);
                } else {
                    this.sink.setEdgeValue(handle, i, label);
                }
            }
        });
    }

    /** The `xgmml.networks` membership of nodes in root-level subgraphs of a generic document. */
    private writeNetworks(): void {
        const { subgraphs } = this.doc.root;
        if (subgraphs.length === 0) {
            return;
        }
        const member = new Map<number, string[]>();
        for (const graph of subgraphs) {
            const name = graph.id ?? graph.label ?? "";
            for (const m of graph.members) {
                const id = m.kind === "node" ? (m.id ?? (m.href === null ? null : localRef(m.href))) : null;
                const row = id === null ? undefined : this.rows.get(id);
                if (row !== undefined && row.index >= 0) {
                    const list = member.get(row.index) ?? [];
                    list.push(name);
                    member.set(row.index, list);
                }
            }
        }
        if (member.size === 0) {
            return;
        }
        const handle = this.declare("node", {
            name: NETWORKS_COLUMN,
            dtype: "list",
            itemDtype: "string",
            nullable: true,
            origin: { format: FORMAT, id: null, title: null, type: "graph", namespace: XGMML_ORIGIN_NAMESPACE },
        });
        if (handle !== null) {
            for (const [index, list] of member) {
                this.sink.setNodeValue(handle, index, list);
            }
        }
    }

    // ------------------------------------------------------------------ edges

    /**
     * Push every edge record.
     * @param records - the edge records
     * @param header - the header direction
     */
    private addEdges(records: readonly EdgeRec[], header: boolean): void {
        const ids = new Set<string>();
        const dedupe = this.dialect.cy2 && this.doc.nodes.some((n) => n.nested.length > 0) ? new Set<string>() : null;
        let repeats = 0;
        let firstRepeat: IssueLocation | null = null;
        const labels: (string | undefined)[] = [];
        const edgeIds: (string | undefined)[] = [];
        const graphics: [number, Record<string, unknown>][] = [];
        let row = 0;
        for (const record of records) {
            const where = { line: record.line, element: record.id ?? record.label };
            // a repeat has the same id, or without one the same label and endpoints
            const key =
                record.id ??
                (record.label === null ? null : JSON.stringify([record.label, record.source, record.target]));
            if (dedupe !== null && key !== null) {
                if (dedupe.has(key)) {
                    repeats++;
                    firstRepeat ??= where;
                    continue;
                }
                dedupe.add(key);
            }
            const index = this.addEdge(record, header, ids, where);
            this.checkAbort();
            if (index < 0) {
                continue;
            }
            this.edgeIndex[row] = index;
            labels[row] = record.label ?? undefined;
            edgeIds[row] = record.id ?? undefined;
            this.addElementColumns(this.edgeColumns, row, record, new Set(), where);
            this.fillInteraction(record, row, where);
            if (record.graphics !== null && Object.keys(record.graphics).length > 0) {
                graphics.push([index, record.graphics]);
            }
            row++;
        }
        if (repeats > 0) {
            this.report.warning(
                "merged",
                XGMML_ISSUE.GROUP_DUPLICATE_EDGE,
                `${this.prefix()}the Cytoscape 2.x writer repeats the edges of a group; ${repeats} repeat(s) were dropped`,
                firstRepeat ?? undefined,
            );
        }
        this.writeEdgeIds(edgeIds);
        this.writeLabels("edge", labels, (r) => this.edgeIndex[r] ?? -1);
        const column = new JsonColumn(this, "edge", GRAPHICS_COLUMN, XGMML_ORIGIN_NAMESPACE, "graphics");
        for (const [index, value] of graphics) {
            column.set(index, value);
        }
    }

    /**
     * Push one edge: endpoints (with label aliases), duplicate id check, direction and weight.
     * @param record - the edge
     * @param header - the header direction
     * @param ids - the edge ids used so far
     * @param where - the location
     * @returns the edge index, or -1 when it was skipped
     */
    private addEdge(record: EdgeRec, header: boolean, ids: Set<string>, where: IssueLocation): number {
        const alias = this.settings.labelAliases ? aliasesOf(record.label) : null;
        let source: NodeId | null;
        let target: NodeId | null;
        try {
            source = this.endpoint(record.source, alias?.[0] ?? null, "source", where);
            target = this.endpoint(record.target, alias?.[2] ?? null, "target", where);
        } catch (err) {
            // an endpoint the id rule or the sink refuses (ids: "number", a caller's sink)
            this.report.counts.skippedEdges++;
            this.report.recordError(err, where);
            return -1;
        }
        if (source === null || target === null) {
            this.report.counts.skippedEdges++;
            return -1;
        }
        if (record.id !== null && ids.has(record.id)) {
            this.report.counts.skippedEdges++;
            this.report.error(
                "validation-error",
                XGMML_ISSUE.DUPLICATE_EDGE_ID,
                `${this.prefix()}edge id "${record.id}" is used twice; the second edge is skipped`,
                where,
            );
            return -1;
        }
        const directed = this.edgeDirection(record, header);
        const kind: EdgeKind = directed ? "directed" : "undirected";
        let weight: number | undefined;
        try {
            weight = this.weightOf(record);
            const before = this.sink.edgeCount;
            const e = this.direction.addEdge(source, target, kind, weight, where);
            this.report.counts.edges += this.sink.edgeCount - before;
            if (record.id !== null) {
                ids.add(record.id);
            }
            return e;
        } catch (err) {
            this.report.counts.skippedEdges++;
            this.report.recordError(err, where);
            return -1;
        }
    }

    /**
     * The weight of an edge: its `weight` XML attribute (or the att weightFrom names).
     * @param record - the edge
     * @returns the weight, or undefined
     */
    private weightOf(record: EdgeRec): number | undefined {
        const from = this.options.weightFrom;
        if (from === null) {
            return undefined;
        }
        let text: string | null = from === "weight" ? record.weight : null;
        if (text === null) {
            text = record.atts.find((a) => a.name === from && a.children.length === 0)?.value ?? null;
        }
        if (text === null) {
            return undefined;
        }
        const weight = parseWeightText(text);
        this.weighted ||= weight !== undefined;
        return weight;
    }

    /**
     * Resolve one endpoint: a node of this graph by id, else (under labelAliases) the label alias
     * by id or by unique node label; a missing endpoint is E_MISSING_ENDPOINT, an unknown one
     * E_UNKNOWN_NODE unless addMissingNodes adds it.
     * @param text - the source or target text, or null
     * @param alias - the label alias, or null
     * @param side - which end
     * @param where - the location
     * @returns the node id, or null when the edge cannot be added
     */
    private endpoint(text: string | null, alias: string | null, side: string, where: IssueLocation): NodeId | null {
        if (text !== null) {
            const row = this.rows.get(text);
            if (row !== undefined && row.index >= 0) {
                return this.coercer.text(text);
            }
        }
        if (alias !== null) {
            const resolved = this.aliasRow(alias);
            if (resolved !== null) {
                this.aliasResolved++;
                return this.coercer.text(resolved.id);
            }
        }
        if (text === null) {
            const ambiguous = alias !== null && this.aliasRow(alias) === null && this.labelRows?.get(alias) === null;
            this.report.error(
                "missing-value",
                XGMML_ISSUE.MISSING_ENDPOINT,
                ambiguous
                    ? `${this.prefix()}<edge> without a ${side}: its label alias "${alias}" is ambiguous (several nodes have that label); the edge is skipped`
                    : `${this.prefix()}<edge> without a ${side}`,
                where,
            );
            return null;
        }
        if (this.options.addMissingNodes) {
            const id = this.coercer.text(text);
            if (this.sink.indexOf(id) === INVALID_INDEX) {
                this.sink.addNode(id);
                this.report.counts.nodes++;
            }
            return id;
        }
        this.report.error(
            "validation-error",
            XGMML_ISSUE.UNKNOWN_NODE,
            `${this.prefix()}edge ${side} "${text}" is not a node of this graph; the edge is skipped`,
            where,
        );
        return null;
    }

    /** Node labels to rows, for label aliases; null marks a label two nodes share. */
    private labelRows: Map<string, NodeRow | null> | null = null;

    /**
     * The node a label alias names: by id, else by a label only one node has.
     * @param alias - the alias
     * @returns the row, or null
     */
    private aliasRow(alias: string): NodeRow | null {
        const byId = this.rows.get(alias);
        if (byId !== undefined && byId.index >= 0) {
            return byId;
        }
        if (this.labelRows === null) {
            this.labelRows = new Map();
            for (const row of this.rowList) {
                const { label } = row.records[0];
                if (label !== null && row.index >= 0) {
                    this.labelRows.set(label, this.labelRows.has(label) ? null : row);
                }
            }
        }
        return this.labelRows.get(alias) ?? null;
    }

    /**
     * Fill the interaction of an edge without one from its label alias, as Cytoscape does.
     * @param record - the edge
     * @param row - the edge row
     * @param where - the location
     */
    private fillInteraction(record: EdgeRec, row: number, where: IssueLocation): void {
        if (
            !this.settings.labelAliases ||
            this.dialect.session ||
            record.atts.some((a) => a.name === INTERACTION_COLUMN)
        ) {
            return;
        }
        const alias = aliasesOf(record.label);
        if (alias !== null) {
            this.edgeColumns.addText(row, INTERACTION_COLUMN, alias[1], where);
            this.aliasInteractions++;
        }
    }

    /** Report the label alias uses, once. */
    private finishAliases(): void {
        if (this.aliasResolved === 0 && this.aliasInteractions === 0) {
            return;
        }
        this.report.warning(
            "coercion",
            XGMML_ISSUE.LABEL_ALIAS,
            `${this.prefix()}Cytoscape label aliases ("a (pp) b"): ${this.aliasResolved} endpoint(s) resolved, ${this.aliasInteractions} interaction(s) filled from edge labels`,
        );
    }

    /**
     * Write the edge `id` column (role id, unique).
     * @param ids - the id of each row
     */
    private writeEdgeIds(ids: readonly (string | undefined)[]): void {
        if (!ids.some((id) => id !== undefined)) {
            return;
        }
        const handle = this.declare("edge", {
            name: EDGE_ID_COLUMN,
            dtype: "string",
            role: "id",
            unique: true,
            nullable: true,
            origin: { format: FORMAT, id: null, title: null, type: "id", namespace: null },
        });
        if (handle === null) {
            return;
        }
        ids.forEach((id, row) => {
            const e = this.edgeIndex[row];
            if (id !== undefined && e !== undefined) {
                try {
                    this.sink.setEdgeValue(handle, e, id);
                } catch (err) {
                    this.report.recordError(err, { element: id });
                }
            }
        });
    }

    // ------------------------------------------------------------------ graph and metadata

    /**
     * The graph table: the graph's atts and other XML attributes, and its graphics.
     * @param graph - the subnetwork, or null for the root
     */
    private writeGraph(graph: GraphRec | null): void {
        const g = graph ?? this.doc.root;
        const where = { line: g.line, element: g.id };
        if (graph === null) {
            for (const [key, value] of g.attrs) {
                if (!GRAPH_STRUCTURE.has(key) && key !== "xmlns" && !key.startsWith("xmlns:")) {
                    this.graphColumns.addText(0, key, value, where);
                }
            }
        }
        for (const att of g.atts) {
            if (att.name !== null && META_ATTS.has(att.name)) {
                continue;
            }
            if (att.hasGraph && att.name === null) {
                continue;
            }
            this.graphColumns.addAtt(0, att, where);
        }
        this.graphColumns.write(this.sink, () => 0);
        const json: Record<string, unknown> = { ...(this.extras.graphJson ?? {}) };
        if (g.graphics !== null && Object.keys(g.graphics).length > 0) {
            json[GRAPHICS_COLUMN] = g.graphics;
        }
        for (const [name, value] of Object.entries(json)) {
            this.sink.setGraphValue(name, value, {
                name,
                dtype: "json",
                nullable: true,
                origin: { format: FORMAT, id: null, title: null, type: name, namespace: XGMML_ORIGIN_NAMESPACE },
            });
        }
    }

    /**
     * The graph metadata: name, description and date from the RDF metadata, the format, version
     * and what the exporter needs.
     * @param graph - the subnetwork, or null
     */
    private writeMeta(graph: GraphRec | null): void {
        const g = graph ?? this.doc.root;
        const { rdf } = this.doc;
        const name = this.extras.graphName ?? g.label ?? rdf.title ?? g.id ?? undefined;
        this.sink.setMeta({
            name: name ?? undefined,
            description: rdf.description ?? undefined,
            created: rdf.date ?? undefined,
            sourceFormat: this.extras.sourceFormat ?? FORMAT,
            sourceVersion: this.dialect.versionText ?? undefined,
            weightOrigin: this.weighted
                ? { format: FORMAT, id: "weight", title: null, type: "weight", namespace: null }
                : undefined,
            extra: {
                [META_KEY]: {
                    graphId: g.id,
                    directed: this.doc.root.attrs.get("directed") ?? null,
                    rdf: Object.keys(rdf).length > 0 ? { ...rdf } : null,
                },
                ...(this.extras.metaExtra ?? {}),
            },
        });
    }
}

/**
 * The three parts of a Cytoscape edge label (`source (interaction) target`).
 * @param label - the label, or null
 * @returns source alias, interaction, target alias; null when the label has another shape
 */
export function aliasesOf(label: string | null): [string, string, string] | null {
    if (label === null) {
        return null;
    }
    const parts = label.split(ALIAS_SPLIT);
    return parts.length === 3 ? [parts[0].trim(), parts[1], parts[2].trim()] : null;
}

/**
 * A json column the importer owns, declared on first value.
 */
class JsonColumn {
    private handle: ColumnHandle | null | undefined;

    /**
     * Create the column.
     * @param emitter - the emitter
     * @param domain - node or edge
     * @param name - the column name
     * @param namespace - its origin namespace
     * @param type - its origin type
     * @param dtype - json (default) or string
     */
    constructor(
        private readonly emitter: XgmmlEmitter,
        private readonly domain: "node" | "edge",
        private readonly name: string,
        private readonly namespace: string,
        private readonly type: string,
        private readonly dtype: "json" | "string" = "json",
    ) {}

    /**
     * Set one value.
     * @param index - the node or edge index
     * @param value - the value
     */
    set(index: number, value: unknown): void {
        if (index < 0) {
            return;
        }
        if (this.handle === undefined) {
            this.handle = this.emitter.declare(this.domain, {
                name: this.name,
                dtype: this.dtype,
                nullable: true,
                origin: { format: FORMAT, id: null, title: null, type: this.type, namespace: this.namespace },
            });
        }
        if (this.handle === null) {
            return;
        }
        const sink = this.emitter.target;
        if (this.domain === "node") {
            sink.setNodeValue(this.handle, index, value);
        } else {
            sink.setEdgeValue(this.handle, index, value);
        }
    }
}

/**
 * Node positions: x and y (y negated: Cytoscape's screen y grows down, graph-io's grows up), z
 * as a coordinate in the draft dialect or under zAs "position", else as the `z` column.
 */
class Positions {
    private readonly values = new Map<number, [number, number, number]>();

    private readonly zValues = new Map<number, number>();

    private hasZ = false;

    /**
     * Create the collector.
     * @param emitter - the emitter
     * @param zAs - where z goes
     */
    constructor(
        private readonly emitter: XgmmlEmitter,
        private readonly zAs: "column" | "position",
    ) {}

    /**
     * Read one node record's coordinates.
     * @param row - the node row
     * @param record - the record
     */
    add(row: NodeRow, record: NodeRec): void {
        if (row.index < 0 || (record.x === null && record.y === null && record.z === null)) {
            return;
        }
        const where = { line: record.line, element: row.id };
        const x = this.number(record.x, where);
        const y = this.number(record.y, where);
        const z = this.number(record.z, where);
        if (z !== null) {
            this.hasZ = true;
            if (this.zAs === "column") {
                this.zValues.set(row.index, z);
            }
        }
        if (x !== null && y !== null) {
            const flipped = y === 0 ? 0 : -y;
            this.values.set(row.index, [x, flipped, this.zAs === "position" ? (z ?? 0) : 0]);
        }
    }

    /**
     * A coordinate.
     * @param text - the text, or null
     * @param where - the location
     * @returns the number, or null when absent or invalid (recorded)
     */
    private number(text: string | null, where: IssueLocation): number | null {
        if (text === null) {
            return null;
        }
        const n = parseCoordinate(text);
        if (n === null) {
            this.emitter.issues.error(
                "validation-error",
                XGMML_ISSUE.BAD_VALUE,
                `${this.emitter.prefix()}graphics coordinate "${text}" is not a number`,
                where,
            );
            return null;
        }
        return n;
    }

    /** Declare and write the position and z columns. */
    write(): void {
        const sink = this.emitter.target;
        if (this.values.size > 0) {
            const handle = this.emitter.declare("node", {
                name: POSITION_COLUMN,
                dtype: "f32",
                components: 3,
                role: "position",
                nullable: true,
                origin: { format: FORMAT, id: null, title: null, type: "graphics", namespace: XGMML_ORIGIN_NAMESPACE },
                extra: { sourceDims: this.zAs === "position" && this.hasZ ? 3 : 2, units: "file" },
            });
            if (handle !== null) {
                for (const [index, xyz] of this.values) {
                    sink.setNodeValue(handle, index, xyz);
                }
            }
        }
        if (this.zValues.size > 0) {
            const handle = this.emitter.declare("node", {
                name: Z_COLUMN,
                dtype: "f64",
                nullable: true,
                origin: {
                    format: FORMAT,
                    id: null,
                    title: null,
                    type: "graphics",
                    namespace: CYTOSCAPE_ORIGIN_NAMESPACE,
                },
            });
            if (handle !== null) {
                for (const [index, z] of this.zValues) {
                    sink.setNodeValue(handle, index, z);
                }
            }
        }
    }
}

/**
 * Nested-network pointers: a node-nested graph that is not a group names a network.
 */
class Pointers {
    private readonly names = new Map<number, string>();

    private readonly crossFile = new Map<number, string>();

    private dangling = 0;

    /**
     * Create the collector.
     * @param emitter - the emitter
     * @param isGroup - the group test
     */
    constructor(
        private readonly emitter: XgmmlEmitter,
        private readonly isGroup: (node: NodeRec) => boolean,
    ) {}

    /**
     * Read one node record's pointers.
     * @param row - the node row
     * @param record - the record
     */
    add(row: NodeRow, record: NodeRec): void {
        if (record.nested.length === 0 || this.isGroup(record) || row.index < 0) {
            return;
        }
        for (const graph of record.nested) {
            if (graph.href === null) {
                this.names.set(row.index, graph.label ?? graph.id ?? "");
                continue;
            }
            const id = localRef(graph.href);
            if (id === null) {
                const resolved = this.emitter.resolvePointer(graph.href);
                if (resolved !== null) {
                    this.names.set(row.index, resolved);
                } else {
                    this.crossFile.set(row.index, graph.href);
                }
                continue;
            }
            const target = this.emitter.graphById(id);
            if (target === undefined) {
                this.dangling++;
            } else {
                this.names.set(row.index, target.label ?? target.id ?? id);
            }
        }
    }

    /** Write the pointer columns and their warnings. */
    write(): void {
        const prefix = this.emitter.prefix();
        if (this.dangling > 0) {
            this.emitter.issues.warning(
                "validation-error",
                XGMML_ISSUE.DANGLING_REFERENCE,
                `${prefix}${this.dangling} nested-network pointer(s) name no graph of the document`,
            );
        }
        const names = new JsonColumn(
            this.emitter,
            "node",
            NESTED_NETWORK_COLUMN,
            CYTOSCAPE_ORIGIN_NAMESPACE,
            "nestedNetwork",
            "string",
        );
        for (const [index, name] of this.names) {
            names.set(index, name);
        }
        if (this.crossFile.size > 0) {
            this.emitter.issues.warning(
                "unsupported",
                XGMML_ISSUE.CROSS_FILE_REFERENCE,
                `${prefix}${this.crossFile.size} nested-network pointer(s) point into another file; each is kept as text in ${NETWORK_POINTER_COLUMN}`,
            );
            const column = new JsonColumn(
                this.emitter,
                "node",
                NETWORK_POINTER_COLUMN,
                XGMML_ORIGIN_NAMESPACE,
                "xlink:href",
                "string",
            );
            for (const [index, href] of this.crossFile) {
                column.set(index, href);
            }
        }
    }
}

/**
 * Group containment: every node (declared or referenced) in a group's nested graph has the group
 * node as a parent; a node in several groups gets the `parents` list instead of `parent`.
 */
class Containment {
    private readonly parents = new Map<number, number[]>();

    private readonly subgraphs = new Map<number, Record<string, unknown>>();

    /** The nodes that are some node's parent: only those can be an ancestor, so close a cycle. */
    private readonly groups = new Set<number>();

    /**
     * Create the resolver.
     * @param emitter - the emitter
     */
    constructor(private readonly emitter: XgmmlEmitter) {}

    /**
     * Collect the memberships of every group node of the graph.
     * @param rows - the node rows
     * @param isGroup - the group test
     */
    resolve(rows: readonly NodeRow[], isGroup: (node: NodeRec) => boolean): void {
        let unknown = 0;
        for (const row of rows) {
            for (const record of row.records) {
                if (row.index < 0 || record.nested.length === 0 || !isGroup(record)) {
                    continue;
                }
                for (const graph of record.nested) {
                    const atts = graph.atts.filter((a) => a.name !== null);
                    if (graph.id !== null || graph.label !== null || atts.length > 0) {
                        this.subgraphs.set(row.index, {
                            id: graph.id,
                            label: graph.label,
                            atts: Object.fromEntries(atts.map((a) => [a.name, attJson(a)])),
                        });
                    }
                    for (const member of graph.members) {
                        if (member.kind !== "node") {
                            continue;
                        }
                        const id = member.id ?? (member.href === null ? null : localRef(member.href));
                        const child = id === null ? undefined : this.emitter.rowOf(id);
                        if (child === undefined) {
                            if (id === null || !this.emitter.missingMember(row.id, id)) {
                                unknown++;
                            }
                            continue;
                        }
                        if (child.index >= 0) {
                            this.link(child.index, row.index, member.line);
                        }
                    }
                }
            }
        }
        if (unknown > 0) {
            this.emitter.issues.error(
                "missing-value",
                XGMML_ISSUE.UNKNOWN_PARENT,
                `${this.emitter.prefix()}${unknown} group member(s) name no node of this graph`,
            );
        }
    }

    /**
     * Add one membership unless it closes a parent cycle.
     * @param child - the member's index
     * @param parent - the group node's index
     * @param line - the line
     */
    private link(child: number, parent: number, line: number): void {
        if (child === parent || (this.groups.has(child) && this.isAncestor(child, parent))) {
            this.emitter.issues.error(
                "validation-error",
                XGMML_ISSUE.PARENT_CYCLE,
                `${this.emitter.prefix()}a group membership would make a node its own ancestor; that membership is dropped`,
                { line },
            );
            return;
        }
        const list = this.parents.get(child) ?? [];
        if (!list.includes(parent)) {
            list.push(parent);
        }
        this.parents.set(child, list);
        this.groups.add(parent);
    }

    /**
     * Whether a node is an ancestor of another through the memberships so far.
     * @param ancestor - the candidate ancestor
     * @param node - the node
     * @returns true when following parents from node reaches ancestor
     */
    private isAncestor(ancestor: number, node: number): boolean {
        const stack = [node];
        const seen = new Set<number>();
        while (stack.length > 0) {
            const n = stack.pop() as number;
            if (n === ancestor) {
                return true;
            }
            if (seen.has(n)) {
                continue;
            }
            seen.add(n);
            stack.push(...(this.parents.get(n) ?? []));
        }
        return false;
    }

    /** Declare and write the parent (or parents) and subgraph columns. */
    write(): void {
        const sink = this.emitter.target;
        if (this.parents.size > 0) {
            const multi = [...this.parents.values()].some((list) => list.length > 1);
            const handle = this.emitter.declare("node", {
                name: multi ? PARENTS_COLUMN : PARENT_COLUMN,
                dtype: multi ? "list" : "u32",
                itemDtype: multi ? "u32" : undefined,
                role: multi ? "parents" : "parent",
                refersTo: "node",
                nullable: true,
                origin: { format: FORMAT, id: null, title: null, type: "graph", namespace: null },
            });
            if (handle !== null) {
                for (const [child, list] of this.parents) {
                    sink.setNodeValue(handle, child, multi ? list : list[0]);
                }
            }
        }
        if (this.subgraphs.size > 0) {
            const column = new JsonColumn(this.emitter, "node", SUBGRAPH_COLUMN, XGMML_ORIGIN_NAMESPACE, "graph");
            for (const [index, value] of this.subgraphs) {
                column.set(index, value);
            }
        }
    }
}
