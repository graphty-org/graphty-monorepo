/**
 * The XGMML document model: one pass of the shared XML tokenizer turns an XGMML document into
 * plain records (graphs, nodes, edges, atts, graphics) that keep everything the file says, with
 * forward references (`xlink:href`, an edge before its nodes) left as ids. The importer
 * (importer.ts) resolves the records into a sink once the outermost `</graph>` has closed, as
 * Cytoscape does, and the `.cys` importer reuses the same records for the network and view files
 * of a session.
 *
 * It recognizes the five shapes of `research-xgmml.md` section 2: the 1.0 draft, the Cytoscape
 * 2.x export and session, the 3.x export, the 3.x session network file (root `cy:registered="0"`)
 * and the 3.x session view file (root `cy:view="1"`).
 */

import { escapeXmlAttribute, escapeXmlText } from "../../common/escape.js";
import { type ImportReportBuilder } from "../../common/report.js";
import { isWhitespace, localName, type XmlHandler } from "../../common/xml.js";
import { XGMML_ISSUE, XGMML_NAMESPACE, XLINK_NAMESPACE } from "./constants.js";

/** One `<att>` and what it holds. */
export interface AttRec {
    /** The `name` (else `label`) attribute, or null. */
    name: string | null;
    /** The XGMML `type` as written, or null. */
    readonly type: string | null;
    /** Cytoscape's `cy:type`, or null. */
    readonly cyType: string | null;
    /** Cytoscape's `cy:elementType` of a list, or null. */
    readonly elementType: string | null;
    /** The `value` attribute, or null when absent. */
    readonly value: string | null;
    /** `cy:hidden` is 1, true or yes. */
    readonly hidden: boolean;
    /** `cy:equation` is 1, true or yes: the value is a formula. */
    readonly equation: boolean;
    /** The child atts (list items, record fields, graphics properties). */
    readonly children: AttRec[];
    /** The XML attributes besides the ones above (a 2.x bend handle's `x` and `y`). */
    readonly extra: Record<string, string>;
    /** Foreign XML inside the att (RDF), serialized, or null. */
    xml: string | null;
    /** Whether the att held a `<graph>`. */
    hasGraph: boolean;
    /** Non-whitespace character data inside the att. */
    text: string;
    /** The line of the `<att`. */
    readonly line: number;
    /** The table namespace of a `.cys` column, or null for an att of the document. */
    readonly namespace?: string | null | undefined;
}

/** A `<node>`. */
export interface NodeRec {
    readonly kind: "node";
    /** The id (the label when the id is missing), or null for an `xlink:href` reference. */
    readonly id: string | null;
    /** The `xlink:href` of a reference to a node declared elsewhere, or null. */
    readonly href: string | null;
    /** The `label` attribute (else `name`), or null. */
    readonly label: string | null;
    /** The `name` attribute when a label is also given, or null. */
    readonly name: string | null;
    /** The other XML attributes, as written. */
    readonly xmlAttrs: [string, string][];
    /** The atts, in document order. */
    readonly atts: AttRec[];
    /** The graphics values besides x, y and z, or null without `<graphics>`. */
    graphics: Record<string, unknown> | null;
    /** The x, y and z texts of the graphics (or its `<center>`), or null. */
    x: string | null;
    y: string | null;
    z: string | null;
    /** The graphs nested in the node's atts. */
    readonly nested: GraphRec[];
    /** The graph that declares (or references) the node. */
    readonly graph: GraphRec;
    /** The line of the `<node`. */
    readonly line: number;
    /** A session view's `cy:nodeId`, or null. */
    readonly viewId: string | null;
}

/** An `<edge>`. */
export interface EdgeRec {
    readonly kind: "edge";
    /** The id attribute, or null. */
    readonly id: string | null;
    /** The `xlink:href` of a reference to an edge declared elsewhere, or null. */
    readonly href: string | null;
    /** The source and target texts, or null when missing. */
    readonly source: string | null;
    readonly target: string | null;
    /** The label attribute, or null. */
    readonly label: string | null;
    /** The `name` attribute, or null. */
    readonly name: string | null;
    /** The `weight` attribute, or null. */
    readonly weight: string | null;
    /** The `cy:directed` attribute, or null. */
    readonly directed: string | null;
    /** The other XML attributes, as written. */
    readonly xmlAttrs: [string, string][];
    /** The atts, in document order. */
    readonly atts: AttRec[];
    /** The graphics values, or null. */
    graphics: Record<string, unknown> | null;
    /** The graph that declares (or references) the edge. */
    readonly graph: GraphRec;
    /** The line of the `<edge`. */
    readonly line: number;
    /** A session view's `cy:edgeId`, or null. */
    readonly viewId: string | null;
}

/** A `<graph>`: the root, a subnetwork, a group or a nested-network pointer. */
export interface GraphRec {
    /** The id attribute, or null. */
    readonly id: string | null;
    /** The label attribute, or null. */
    readonly label: string | null;
    /** The `xlink:href` of a pointer to a graph written elsewhere, or null. */
    readonly href: string | null;
    /** `cy:registered` as written, or null. */
    readonly registered: string | null;
    /** Every XML attribute, as written. */
    readonly attrs: ReadonlyMap<string, string>;
    /** The graph-level atts. */
    readonly atts: AttRec[];
    /** The graph's `<graphics>` values, or null. */
    graphics: Record<string, unknown> | null;
    /** The node whose att holds this graph, or null. */
    readonly owner: NodeRec | null;
    /** The graph this one is nested in, or null for the root. */
    readonly parent: GraphRec | null;
    /** The nodes and edges directly in this graph (declared or referenced), in document order. */
    readonly members: (NodeRec | EdgeRec)[];
    /** The graphs held by this graph's own atts (subnetworks of the root). */
    readonly subgraphs: GraphRec[];
    /** The line of the `<graph`. */
    readonly line: number;
}

/** A parsed document. */
export interface XgmmlDocument {
    /** The root graph. */
    readonly root: GraphRec;
    /** Every declared node (not references), in document order. */
    readonly nodes: NodeRec[];
    /** Every declared edge, in document order. */
    readonly edges: EdgeRec[];
    /** Every graph, root first. */
    readonly graphs: GraphRec[];
    /** The `cy` prefix is bound, or a `cy:` attribute is used: Cytoscape wrote the file. */
    readonly cytoscape: boolean;
    /** The root is in the XGMML namespace (default or prefixed). */
    readonly xgmmlNamespace: boolean;
    /** The RDF network metadata fields (`dc:title`, ...) by local name. */
    readonly rdf: Record<string, string>;
    /** The serialized `networkMetadata` RDF, or null. */
    readonly rdfXml: string | null;
    /** The DOCTYPE declaration as written, or null. */
    readonly doctype: string | null;
}

/** What the parser keeps about one open element. */
type Frame =
    | { readonly kind: "graph"; readonly graph: GraphRec }
    | { readonly kind: "node"; readonly node: NodeRec }
    | { readonly kind: "edge"; readonly edge: EdgeRec }
    | { readonly kind: "att"; readonly att: AttRec; readonly owner: "graph" | "node" | "edge" | "graphics" | "att" }
    | { readonly kind: "graphics"; readonly target: GraphicsTarget }
    | { readonly kind: "line"; readonly points: Record<string, string>[] }
    | {
          readonly kind: "capture";
          readonly att: AttRec;
          depth: number;
          /** Where the captured element starts in `att.xml`, and the namespaces in scope there. */
          start: number;
          scope: ReadonlyMap<string, string>;
      }
    | { readonly kind: "skip" };

/** What a `<graphics>` writes into. */
interface GraphicsTarget {
    graphics: Record<string, unknown> | null;
    x?: string | null;
    y?: string | null;
    z?: string | null;
}

/** The XML attributes the parser reads on `<node>`. */
const NODE_READ: ReadonlySet<string> = new Set(["id", "label", "name", "xlink:href", "cy:nodeId"]);

/** The XML attributes the parser reads on `<edge>`. */
const EDGE_READ: ReadonlySet<string> = new Set([
    "id",
    "label",
    "name",
    "source",
    "target",
    "weight",
    "cy:directed",
    "xlink:href",
    "cy:edgeId",
]);

/** The XML attributes an `<att>` uses as its own; any other is kept in `extra`. */
const ATT_READ: ReadonlySet<string> = new Set([
    "name",
    "label",
    "type",
    "value",
    "cy:type",
    "cy:elementType",
    "cy:hidden",
    "cy:equation",
    "cy:editable",
]);

/** Cytoscape's spellings of true (`1`, `true`, `yes`, any case). */
const TRUE_TEXT = /^(1|true|yes)$/i;

/**
 * Whether a Cytoscape flag text is true.
 * @param text - the text, or undefined
 * @returns true for 1, true or yes in any case
 */
export function isCyTrue(text: string | null | undefined): boolean {
    return text !== null && text !== undefined && TRUE_TEXT.test(text.trim());
}

/**
 * The name an XML attribute is known by, its `xlink` prefix normalised whatever prefix the file
 * binds XLink to (galFiltered.xgmml uses `ns1`), on the element itself or on any ancestor; an
 * unbound `xlink:` prefix is XLink too.
 * @param name - the attribute name as written
 * @param scope - the namespace prefixes in scope (prefix to URI, "" for the default)
 * @returns the name with `xlink:` for XLink attributes
 */
function normaliseName(name: string, scope: ReadonlyMap<string, string>): string {
    const colon = name.indexOf(":");
    if (colon <= 0) {
        return name;
    }
    const prefix = name.slice(0, colon);
    if (prefix === "xlink" || scope.get(prefix) === XLINK_NAMESPACE) {
        return `xlink:${name.slice(colon + 1)}`;
    }
    return name;
}

/** The namespaces in scope outside the root element. */
const NO_SCOPE: ReadonlyMap<string, string> = new Map();

/**
 * The tokenizer handler that builds an XgmmlDocument.
 */
export class XgmmlParser implements XmlHandler {
    private readonly report: ImportReportBuilder;

    private readonly frames: Frame[] = [];

    /** The namespace prefixes in scope at each open element (prefix to URI, "" for the default). */
    private readonly scopes: ReadonlyMap<string, string>[] = [];

    private rootGraph: GraphRec | null = null;

    private readonly nodes: NodeRec[] = [];

    private readonly edges: EdgeRec[] = [];

    private readonly graphs: GraphRec[] = [];

    private cytoscape = false;

    private xgmmlNamespace = false;

    /** The prefix of the root element (`xgmml` in `<xgmml:graph>`), or null when it has none. */
    private rootPrefix: string | null = null;

    private readonly rdf: Record<string, string> = {};

    private rdfXml: string | null = null;

    private doctypeText: string | null = null;

    /**
     * Create a parser.
     * @param report - the report issues are recorded in
     */
    constructor(report: ImportReportBuilder) {
        this.report = report;
    }

    /**
     * The parsed document.
     * @returns the document; E_NO_GRAPH (fatal) when no root graph was read
     */
    document(): XgmmlDocument {
        const root = this.rootGraph;
        if (root === null) {
            return this.report.fail(XGMML_ISSUE.NO_GRAPH, "the document has no <graph> element");
        }
        return {
            root,
            nodes: this.nodes,
            edges: this.edges,
            graphs: this.graphs,
            cytoscape: this.cytoscape,
            xgmmlNamespace: this.xgmmlNamespace,
            rdf: this.rdf,
            rdfXml: this.rdfXml,
            doctype: this.doctypeText,
        };
    }

    /**
     * The DOCTYPE declaration.
     * @param text - the declaration as written
     */
    doctype(text: string): void {
        this.doctypeText ??= text;
    }

    /**
     * An element starts.
     * @param rawName - the element name as written
     * @param rawAttrs - its attributes
     * @param line - the line
     */
    start(rawName: string, rawAttrs: ReadonlyMap<string, string>, line: number): void {
        this.enterScope(rawAttrs);
        const top = this.frames.length === 0 ? null : this.frames[this.frames.length - 1];
        if (top === null) {
            this.startRoot(rawName, rawAttrs, line);
            return;
        }
        if (top.kind === "skip") {
            this.frames.push(top);
            return;
        }
        if (top.kind === "capture") {
            this.capture(top, rawName, rawAttrs);
            return;
        }
        const attrs = this.normalise(rawAttrs);
        // an element of another namespace keeps its prefix, so no XGMML element name matches it
        const name = this.isXgmmlName(rawName) ? localName(rawName) : rawName;
        switch (top.kind) {
            case "graph":
                this.startInGraph(top.graph, rawName, name, attrs, line);
                return;
            case "node":
                this.startInElement(top.node, rawName, name, attrs, line);
                return;
            case "edge":
                this.startInElement(top.edge, rawName, name, attrs, line);
                return;
            case "att":
                this.startInAtt(top, rawName, name, attrs, line);
                return;
            case "graphics":
                this.startInGraphics(top.target, rawName, name, attrs, line);
                return;
            case "line":
                if (name === "point") {
                    top.points.push(Object.fromEntries(attrs));
                    this.frames.push({ kind: "skip" });
                    return;
                }
                this.unknownElement(rawName, line);
                return;
            default: {
                const kind: never = top;
                throw new Error(`unknown XGMML frame ${String(kind)}`);
            }
        }
    }

    /**
     * An element ends.
     * @param name - the element name
     * @param _line - the line
     */
    end(name: string, _line: number): void {
        this.scopes.pop();
        const frame = this.frames.pop();
        const below = this.frames.length === 0 ? null : this.frames[this.frames.length - 1];
        switch (frame?.kind) {
            case "capture":
                frame.att.xml = `${frame.att.xml ?? ""}</${name}>`;
                frame.depth--;
                if (frame.depth > 0) {
                    this.frames.push(frame);
                    this.rdfElement = null;
                    return;
                }
                frame.att.xml = bindPrefixes(frame.att.xml, frame.start, frame.scope);
                if (frame.att.name === "networkMetadata") {
                    this.rdfXml = frame.att.xml;
                }
                this.rdfElement = null;
                return;
            case "att":
                if (below?.kind === "graphics") {
                    this.graphicsAtt(below.target, frame.att);
                }
                return;
            case "line":
                if (below?.kind === "graphics") {
                    below.target.graphics = { ...(below.target.graphics ?? {}), Line: frame.points };
                }
                return;
            default:
        }
    }

    /**
     * Character data.
     * @param text - the text
     * @param line - the line
     */
    text(text: string, line: number): void {
        const top = this.frames.length === 0 ? null : this.frames[this.frames.length - 1];
        if (top === null || top.kind === "skip") {
            return;
        }
        if (top.kind === "capture") {
            top.att.xml = `${top.att.xml ?? ""}${escapeXmlText(text)}`;
            this.captureRdfText(text);
            return;
        }
        if (isWhitespace(text)) {
            return;
        }
        if (top.kind === "att") {
            top.att.text += text;
        }
        this.report.warnOnce(
            "validation-error",
            XGMML_ISSUE.STRAY_TEXT,
            top.kind === "att"
                ? "text inside <att> is ignored; an XGMML value is the value attribute"
                : "text where XGMML allows only elements was ignored",
            { line },
        );
    }

    // ------------------------------------------------------------------ structure

    /**
     * Open the namespace scope of an element: its parent's, plus the prefixes it declares.
     * @param attrs - the element's attributes as written
     */
    private enterScope(attrs: ReadonlyMap<string, string>): void {
        const parent = this.scopes.length === 0 ? NO_SCOPE : this.scopes[this.scopes.length - 1];
        let scope = parent;
        for (const [key, value] of attrs) {
            if (key === "xmlns" || key.startsWith("xmlns:")) {
                if (scope === parent) {
                    scope = new Map(parent);
                }
                (scope as Map<string, string>).set(key === "xmlns" ? "" : key.slice(6), value);
            }
        }
        this.scopes.push(scope);
    }

    /**
     * The namespace prefixes in scope at the innermost open element.
     * @returns prefix to URI
     */
    private get scope(): ReadonlyMap<string, string> {
        return this.scopes.length === 0 ? NO_SCOPE : this.scopes[this.scopes.length - 1];
    }

    /**
     * The XML attribute map with every XLink prefix written `xlink:`.
     * @param attrs - the attributes as written
     * @returns the normalised map
     */
    private normalise(attrs: ReadonlyMap<string, string>): Map<string, string> {
        const out = new Map<string, string>();
        const { scope } = this;
        for (const [key, value] of attrs) {
            out.set(normaliseName(key, scope), value);
        }
        return out;
    }

    /**
     * The root element: a `<graph>`, else the document is not XGMML.
     * @param rawName - the name as written
     * @param rawAttrs - its attributes
     * @param line - the line
     */
    private startRoot(rawName: string, rawAttrs: ReadonlyMap<string, string>, line: number): void {
        const local = localName(rawName);
        const prefix = rawName.includes(":") ? rawName.slice(0, rawName.indexOf(":")) : null;
        for (const key of rawAttrs.keys()) {
            if (key === "xmlns:cy" || key.startsWith("cy:")) {
                this.cytoscape = true;
            }
        }
        this.rootPrefix = prefix;
        const nsKey = prefix === null ? "xmlns" : `xmlns:${prefix}`;
        this.xgmmlNamespace = rawAttrs.get(nsKey) === XGMML_NAMESPACE;
        if (local !== "graph") {
            this.report.fail(
                XGMML_ISSUE.NO_GRAPH,
                `the root element is <${rawName}>, not <graph>; an XGMML graph embedded in another document is not read`,
                { line },
            );
        }
        const graph = this.newGraph(this.normalise(rawAttrs), line, null, null);
        this.rootGraph = graph;
        this.frames.push({ kind: "graph", graph });
    }

    /**
     * A graph record, registered in the document.
     * @param attrs - its attributes
     * @param line - the line
     * @param owner - the node whose att holds it, or null
     * @param parent - the graph it is nested in, or null
     * @returns the record
     */
    private newGraph(
        attrs: ReadonlyMap<string, string>,
        line: number,
        owner: NodeRec | null,
        parent: GraphRec | null,
    ): GraphRec {
        const graph: GraphRec = {
            id: attrs.get("id") ?? null,
            label: attrs.get("label") ?? null,
            href: attrs.get("xlink:href") ?? null,
            registered: attrs.get("cy:registered") ?? null,
            attrs,
            atts: [],
            graphics: null,
            owner,
            parent,
            members: [],
            subgraphs: [],
            line,
        };
        if (!this.cytoscape) {
            for (const key of attrs.keys()) {
                if (key.startsWith("cy:")) {
                    this.cytoscape = true;
                }
            }
        }
        this.graphs.push(graph);
        return graph;
    }

    /**
     * A child of `<graph>`.
     * @param graph - the graph
     * @param rawName - the name as written
     * @param name - its local name
     * @param attrs - its attributes
     * @param line - the line
     */
    private startInGraph(
        graph: GraphRec,
        rawName: string,
        name: string,
        attrs: Map<string, string>,
        line: number,
    ): void {
        switch (name) {
            case "node":
                this.beginNode(graph, attrs, line);
                return;
            case "edge":
                this.beginEdge(graph, attrs, line);
                return;
            case "att": {
                const att = this.newAtt(attrs, line);
                graph.atts.push(att);
                this.beginAtt(att, attrs, "graph");
                return;
            }
            case "graphics":
                this.beginGraphics(graph, attrs, line);
                return;
            default:
                this.unknownElement(rawName, line);
        }
    }

    /**
     * A child of `<node>` or `<edge>`.
     * @param element - the node or edge
     * @param rawName - the name as written
     * @param name - its local name
     * @param attrs - its attributes
     * @param line - the line
     */
    private startInElement(
        element: NodeRec | EdgeRec,
        rawName: string,
        name: string,
        attrs: Map<string, string>,
        line: number,
    ): void {
        switch (name) {
            case "att": {
                const att = this.newAtt(attrs, line);
                element.atts.push(att);
                this.beginAtt(att, attrs, element.kind);
                return;
            }
            case "graphics":
                this.beginGraphics(element, attrs, line);
                return;
            default:
                this.unknownElement(rawName, line);
        }
    }

    /**
     * A child of `<att>`: a child att, a nested graph, or foreign XML.
     * @param frame - the att frame
     * @param rawName - the name as written
     * @param name - its local name
     * @param attrs - its attributes
     * @param line - the line
     */
    private startInAtt(
        frame: Extract<Frame, { kind: "att" }>,
        rawName: string,
        name: string,
        attrs: Map<string, string>,
        line: number,
    ): void {
        const { att } = frame;
        const xgmml = this.isXgmmlName(rawName);
        if (name === "att" && xgmml) {
            const child = this.newAtt(attrs, line);
            att.children.push(child);
            this.beginAtt(child, attrs, frame.owner === "graphics" ? "graphics" : "att");
            return;
        }
        if (name === "graph" && xgmml) {
            att.hasGraph = true;
            this.beginNestedGraph(frame, attrs, line);
            return;
        }
        // a second foreign element of the same att is appended to the first
        att.xml ??= "";
        const capture: Extract<Frame, { kind: "capture" }> = {
            kind: "capture",
            att,
            depth: 0,
            start: att.xml.length,
            scope: this.scope,
        };
        this.frames.push(capture);
        this.capture(capture, rawName, attrs);
    }

    /**
     * Whether an element name is XGMML's own (unprefixed, with the root's prefix as in a document
     * whose root is `<xgmml:graph>`, or with any prefix bound to the XGMML namespace) rather than
     * foreign XML such as `rdf:RDF` or `svg:node`.
     * @param rawName - the name as written
     * @returns true for an XGMML element name
     */
    private isXgmmlName(rawName: string): boolean {
        const colon = rawName.indexOf(":");
        if (colon < 0) {
            return true;
        }
        const prefix = rawName.slice(0, colon);
        return prefix === this.rootPrefix || this.scope.get(prefix) === XGMML_NAMESPACE;
    }

    /**
     * A `<graph>` inside an `<att>`: a subnetwork of the root, a group or nested-network pointer
     * of a node, or (in an edge) a graph with no model.
     * @param frame - the att frame
     * @param attrs - the graph's attributes
     * @param line - the line
     */
    private beginNestedGraph(frame: Extract<Frame, { kind: "att" }>, attrs: Map<string, string>, line: number): void {
        const holder = this.attHolder();
        if (holder === null || holder.kind === "edge" || frame.owner === "graphics") {
            this.report.warnOnce(
                "unsupported",
                XGMML_ISSUE.EDGE_NESTED_GRAPH,
                "a graph nested in an edge's (or a graphics) att has no model and was skipped with its content",
                { line },
            );
            this.frames.push({ kind: "skip" });
            return;
        }
        if (holder.kind === "node") {
            const graph = this.newGraph(attrs, line, holder.node, holder.node.graph);
            holder.node.nested.push(graph);
            this.frames.push({ kind: "graph", graph });
            return;
        }
        const graph = this.newGraph(attrs, line, null, holder.graph);
        holder.graph.subgraphs.push(graph);
        this.frames.push({ kind: "graph", graph });
    }

    /**
     * The innermost node, edge or graph frame below the open atts.
     * @returns the frame, or null
     */
    private attHolder(): Extract<Frame, { kind: "graph" | "node" | "edge" }> | null {
        for (let i = this.frames.length - 1; i >= 0; i--) {
            const frame = this.frames[i];
            if (frame.kind === "graph" || frame.kind === "node" || frame.kind === "edge") {
                return frame;
            }
        }
        return null;
    }

    /**
     * Report an element XGMML does not define here and skip its subtree.
     * @param rawName - the name as written
     * @param line - the line
     */
    private unknownElement(rawName: string, line: number): void {
        this.report.warnOnce(
            "unsupported",
            XGMML_ISSUE.UNKNOWN_ELEMENT,
            `element <${rawName}> is not XGMML here and was skipped with its content`,
            { line, element: rawName },
            `${XGMML_ISSUE.UNKNOWN_ELEMENT}:${rawName}`,
        );
        this.frames.push({ kind: "skip" });
    }

    // ------------------------------------------------------------------ nodes and edges

    /**
     * Open a `<node>`.
     * @param graph - the graph it is in
     * @param attrs - its attributes
     * @param line - the line
     */
    private beginNode(graph: GraphRec, attrs: Map<string, string>, line: number): void {
        const href = attrs.get("xlink:href") ?? null;
        let id = attrs.get("id") ?? null;
        const labelAttr = attrs.get("label") ?? null;
        const nameAttr = attrs.get("name") ?? null;
        const label = labelAttr ?? nameAttr;
        if (href !== null && id !== null) {
            this.idAndHref("node", id, href, line);
        }
        if (href === null && id === null) {
            if (label === null || label.length === 0) {
                this.report.counts.skippedNodes++;
                this.report.error("missing-value", XGMML_ISSUE.MISSING_ID, "<node> without an id or a label", {
                    line,
                });
                this.frames.push({ kind: "skip" });
                return;
            }
            this.report.warning(
                "validation-error",
                XGMML_ISSUE.ID_FROM_LABEL,
                `<node> without an id: its label "${label}" is used as the id`,
                { line, element: label },
            );
            id = label;
        }
        const node: NodeRec = {
            kind: "node",
            id: href === null ? id : null,
            href,
            label,
            name: labelAttr !== null ? nameAttr : null,
            xmlAttrs: otherAttributes(attrs, NODE_READ),
            atts: [],
            graphics: null,
            x: null,
            y: null,
            z: null,
            nested: [],
            graph,
            line,
            viewId: attrs.get("cy:nodeId") ?? null,
        };
        graph.members.push(node);
        if (href === null) {
            this.nodes.push(node);
        }
        this.frames.push({ kind: "node", node });
    }

    /**
     * Open an `<edge>`.
     * @param graph - the graph it is in
     * @param attrs - its attributes
     * @param line - the line
     */
    private beginEdge(graph: GraphRec, attrs: Map<string, string>, line: number): void {
        const href = attrs.get("xlink:href") ?? null;
        const id = attrs.get("id") ?? null;
        if (href !== null && id !== null) {
            this.idAndHref("edge", id, href, line);
        }
        const edge: EdgeRec = {
            kind: "edge",
            id: href === null ? id : null,
            href,
            source: attrs.get("source") ?? null,
            target: attrs.get("target") ?? null,
            label: attrs.get("label") ?? null,
            name: attrs.get("name") ?? null,
            weight: attrs.get("weight") ?? null,
            directed: attrs.get("cy:directed") ?? null,
            xmlAttrs: otherAttributes(attrs, EDGE_READ),
            atts: [],
            graphics: null,
            graph,
            line,
            viewId: attrs.get("cy:edgeId") ?? null,
        };
        graph.members.push(edge);
        if (href === null) {
            this.edges.push(edge);
        }
        this.frames.push({ kind: "edge", edge });
    }

    /**
     * W_XGMML_ID_AND_HREF: an element that both declares an id and references another element.
     * @param kind - node or edge
     * @param id - the id
     * @param href - the reference
     * @param line - the line
     */
    private idAndHref(kind: string, id: string, href: string, line: number): void {
        this.report.warning(
            "validation-error",
            XGMML_ISSUE.ID_AND_HREF,
            `<${kind}> has both id "${id}" and xlink:href "${href}"; it is read as a reference to ${href} and the id is not used`,
            { line, element: id },
        );
    }

    // ------------------------------------------------------------------ atts

    /**
     * An att record from its XML attributes.
     * @param attrs - the attributes
     * @param line - the line
     * @returns the record
     */
    private newAtt(attrs: Map<string, string>, line: number): AttRec {
        const extra: Record<string, string> = {};
        for (const [key, value] of attrs) {
            if (!ATT_READ.has(key) && key !== "xmlns" && !key.startsWith("xmlns:")) {
                extra[key] = value;
            }
        }
        return {
            name: attrs.get("name") ?? attrs.get("label") ?? null,
            type: attrs.get("type") ?? null,
            cyType: attrs.get("cy:type") ?? null,
            elementType: attrs.get("cy:elementType") ?? null,
            value: attrs.get("value") ?? null,
            hidden: isCyTrue(attrs.get("cy:hidden")),
            equation: isCyTrue(attrs.get("cy:equation")),
            children: [],
            extra,
            xml: null,
            hasGraph: false,
            text: "",
            line,
        };
    }

    /**
     * Open an `<att>`.
     * @param att - the record
     * @param _attrs - its attributes
     * @param owner - what holds it
     */
    private beginAtt(
        att: AttRec,
        _attrs: Map<string, string>,
        owner: "graph" | "node" | "edge" | "graphics" | "att",
    ): void {
        this.frames.push({ kind: "att", att, owner });
    }

    /**
     * Serialize one start tag of foreign XML into the capturing att.
     * @param frame - the capture frame
     * @param rawName - the name as written
     * @param attrs - its attributes
     */
    private capture(
        frame: Extract<Frame, { kind: "capture" }>,
        rawName: string,
        attrs: ReadonlyMap<string, string>,
    ): void {
        let tag = `<${rawName}`;
        for (const [key, value] of attrs) {
            tag += ` ${key}="${escapeXmlAttribute(value)}"`;
        }
        frame.att.xml = `${frame.att.xml ?? ""}${tag}>`;
        frame.depth++;
        if (frame.att.name === "networkMetadata") {
            const field = localName(rawName);
            this.rdfElement = field;
            if (this.rdf[field] !== undefined) {
                // a second <dc:title>: the first is kept, the two are never joined
                this.rdfElement = null;
                this.report.warning(
                    "validation-error",
                    XGMML_ISSUE.DUPLICATE_ATTRIBUTE,
                    `the network metadata gives <${rawName}> twice; the first ("${this.rdf[field]}") is kept`,
                    { line: frame.att.line, element: field },
                );
            }
        }
    }

    /** The local name of the RDF element whose text is being read, or null. */
    private rdfElement: string | null = null;

    /**
     * Keep the text of an RDF metadata field.
     * @param text - the text
     */
    private captureRdfText(text: string): void {
        if (this.rdfElement !== null && !isWhitespace(text)) {
            this.rdf[this.rdfElement] = (this.rdf[this.rdfElement] ?? "") + text;
        }
    }

    // ------------------------------------------------------------------ graphics

    /**
     * Open a `<graphics>`: x, y and z (draft and Cytoscape) are read as coordinates; every other
     * attribute is kept as written, merged key by key with an earlier `<graphics>`.
     * @param target - the node, edge or graph
     * @param attrs - its attributes
     * @param line - the line
     */
    private beginGraphics(target: GraphicsTarget, attrs: Map<string, string>, line: number): void {
        const graphics: Record<string, unknown> = { ...(target.graphics ?? {}) };
        for (const [key, value] of attrs) {
            if ("x" in target && (key === "x" || key === "y" || key === "z")) {
                if (target[key] !== null && target[key] !== undefined) {
                    this.duplicateGraphics(key, line);
                }
                target[key] = value;
            } else if (key !== "xmlns" && !key.startsWith("xmlns:")) {
                if (key in graphics) {
                    this.duplicateGraphics(key, line);
                }
                graphics[key] = value;
            }
        }
        target.graphics = graphics;
        this.frames.push({ kind: "graphics", target });
    }

    /**
     * A child of `<graphics>`: a visual-property att, a `<center>` or a `<Line>`.
     * @param target - the graphics target
     * @param rawName - the name as written
     * @param name - its local name
     * @param attrs - its attributes
     * @param line - the line
     */
    private startInGraphics(
        target: GraphicsTarget,
        rawName: string,
        name: string,
        attrs: Map<string, string>,
        line: number,
    ): void {
        switch (name) {
            case "att": {
                this.frames.push({ kind: "att", att: this.newAtt(attrs, line), owner: "graphics" });
                return;
            }
            case "center":
                if ("x" in target) {
                    target.x ??= attrs.get("x") ?? null;
                    target.y ??= attrs.get("y") ?? null;
                    target.z ??= attrs.get("z") ?? null;
                }
                this.frames.push({ kind: "skip" });
                return;
            case "Line":
            case "line":
                this.frames.push({ kind: "line", points: [] });
                return;
            default:
                this.unknownElement(rawName, line);
        }
    }

    /**
     * Keep a visual-property att of a `<graphics>` in its record, as written. A session view's
     * `<att name="z">` repeats z and is read as z when the attributes gave none.
     * @param target - the graphics target
     * @param att - the att
     */
    private graphicsAtt(target: GraphicsTarget, att: AttRec): void {
        if (att.name === "z" && "z" in target && att.children.length === 0) {
            target.z ??= att.value;
            return;
        }
        if (att.name === null) {
            this.report.warnOnce(
                "validation-error",
                XGMML_ISSUE.BAD_ATT,
                "a graphics <att> without a name was skipped",
                { line: att.line },
                `${XGMML_ISSUE.BAD_ATT}:graphics-name`,
            );
            return;
        }
        if (target.graphics !== null && att.name in target.graphics) {
            this.duplicateGraphics(att.name, att.line);
        }
        target.graphics = { ...(target.graphics ?? {}), [att.name]: attJson(att) };
    }

    /**
     * W_DUPLICATE_ATTRIBUTE for a graphics property given twice on one element (once per name).
     * @param key - the property
     * @param line - the line
     */
    private duplicateGraphics(key: string, line: number): void {
        this.report.warnOnce(
            "validation-error",
            XGMML_ISSUE.DUPLICATE_ATTRIBUTE,
            `the graphics property "${key}" is given twice on one element; the later value is kept`,
            { line, element: key },
            `${XGMML_ISSUE.DUPLICATE_ATTRIBUTE}:graphics:${key}`,
        );
    }
}

/**
 * Whether an att's children are list items rather than named fields: they have no names, repeat
 * the parent's name (Cytoscape 3 lists), or are several that share one name (2.x bend handles).
 * @param att - the att
 * @returns true for a list
 */
export function isListLike(att: AttRec): boolean {
    const names = new Set(att.children.map((c) => c.name));
    if (names.size !== 1) {
        return false;
    }
    const [only] = names;
    return only === null || only === att.name || att.children.length > 1;
}

/**
 * A graphics att as plain data, values as written: an att with children is an array when they
 * are list items (isListLike), else a record by name; a childless att is its value,
 * else its other XML attributes (a 2.x bend handle's x and y), else null.
 * @param att - the att
 * @returns the value
 */
export function attJson(att: AttRec): unknown {
    if (att.children.length === 0) {
        if (att.value !== null) {
            return att.value;
        }
        return Object.keys(att.extra).length > 0 ? { ...att.extra } : null;
    }
    if (isListLike(att)) {
        return att.children.map(attJson);
    }
    const out: Record<string, unknown> = {};
    for (const child of att.children) {
        out[child.name ?? ""] = attJson(child);
    }
    return out;
}

/**
 * Declare on a captured element the namespace prefixes the captured XML uses but does not bind
 * itself, so the stored XML is namespace-well-formed on its own.
 * @param xml - the captured XML of the att
 * @param start - where the captured element starts in it
 * @param scope - the namespaces in scope at the captured element
 * @returns the XML with the declarations added to the captured element's start tag
 */
function bindPrefixes(xml: string, start: number, scope: ReadonlyMap<string, string>): string {
    const segment = xml.slice(start);
    const used = new Set<string>();
    for (const match of segment.matchAll(/<\/?([A-Za-z_][\w.-]*):|\s([A-Za-z_][\w.-]*):[\w.-]+="/g)) {
        used.add(match[1] ?? match[2]);
    }
    let declarations = "";
    for (const prefix of used) {
        const uri = scope.get(prefix);
        if (prefix !== "xmlns" && prefix !== "xml" && uri !== undefined && !segment.includes(` xmlns:${prefix}="`)) {
            declarations += ` xmlns:${prefix}="${escapeXmlAttribute(uri)}"`;
        }
    }
    if (declarations.length === 0) {
        return xml;
    }
    const nameEnd = xml.slice(start).search(/[\s>]/);
    const at = start + (nameEnd < 0 ? segment.length : nameEnd);
    return `${xml.slice(0, at)}${declarations}${xml.slice(at)}`;
}

/**
 * The XML attributes of an element the parser does not read itself, without namespace
 * declarations.
 * @param attrs - the attributes
 * @param read - the names the parser reads
 * @returns the others, in document order
 */
function otherAttributes(attrs: ReadonlyMap<string, string>, read: ReadonlySet<string>): [string, string][] {
    const out: [string, string][] = [];
    for (const [key, value] of attrs) {
        if (!read.has(key) && key !== "xmlns" && !key.startsWith("xmlns:")) {
            out.push([key, value]);
        }
    }
    return out;
}
