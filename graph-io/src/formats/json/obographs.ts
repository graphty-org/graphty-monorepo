/**
 * The `obographs` dialect of the JSON importer (design sections 1.6 and 4.6): OBO Graphs JSON,
 * the form in which the Gene Ontology and every OBO Foundry ontology publish a ready-made graph
 * (`{ "graphs": [{ "nodes": [...], "edges": [{ "sub", "pred", "obj" }] }] }`).
 *
 * Nodes and their `meta` fill the OBO column vocabulary of src/common/ontology.ts, the same
 * columns the OBO importer gives the `.obo` file of the same ontology; ids are compacted from IRIs
 * to the identifiers the `.obo` writes (`oboIds: "curie"`, the default), and a relation is named by
 * its shorthand (`part_of`, not `http://purl.obolibrary.org/obo/BFO_0000050`). PROPERTY nodes and
 * the edges between properties are metadata unless `typedefs: "nodes"`, as `[Typedef]` frames are.
 * The axiom arrays and the graph and document metadata are kept verbatim in
 * `meta.extra.obographs`.
 */

import { type ColumnHandle, INVALID_INDEX, type NodeId } from "@graphty/graph-format";

import { declareResolved } from "../../common/attributes.js";
import {
    compactOboIri,
    OBO_NODE_COLUMNS,
    oboColumnDecl,
    OBOGRAPHS_PREDICATE_TAGS,
    PLACEHOLDER_COLUMN,
    synonymScopeOf,
} from "../../common/ontology.js";
import { hasKey, isJsonObject } from "./dialect.js";
import { chosenGraph, type ImportContext, JSON_ISSUE, type JsonRecord } from "./importer.js";

/** The node keys the schema defines; any other key goes to `obo.unrecognized`. */
const NODE_KEYS: ReadonlySet<string> = new Set(["id", "lbl", "type", "propertyType", "meta"]);

/** The edge keys the schema defines (`subj` is the outdated spelling of `sub`). */
const EDGE_KEYS: ReadonlySet<string> = new Set(["sub", "subj", "pred", "obj", "meta"]);

/** The `meta` keys mapped onto columns; any other key goes to `obo.unrecognized` as `meta.<key>`. */
const META_KEYS: ReadonlySet<string> = new Set([
    "definition",
    "comments",
    "subsets",
    "xrefs",
    "synonyms",
    "basicPropertyValues",
    "deprecated",
]);

/** The OBO frame type of an OBO Graphs node type. */
const FRAME_TYPES: Readonly<Record<string, string>> = Object.freeze({
    CLASS: "Term",
    INDIVIDUAL: "Instance",
    PROPERTY: "Typedef",
});

/** The OBO name of the predicates OBO Graphs writes without an IRI. */
const BUILTIN_PREDICATES: Readonly<Record<string, string>> = Object.freeze({
    is_a: "is_a",
    subPropertyOf: "is_a",
    type: "instance_of",
    inverseOf: "inverse_of",
});

/** Predicates that relate two properties (metadata under typedefs "metadata"). */
const PROPERTY_PREDICATES: ReadonlySet<string> = new Set(["subPropertyOf", "inverseOf"]);

/** Writes the OBO vocabulary columns, declaring each on first use. */
class ColumnWriter {
    private readonly ctx: ImportContext;

    private readonly handles = new Map<string, ColumnHandle>();

    /**
     * Create a writer.
     * @param ctx - the import context
     */
    constructor(ctx: ImportContext) {
        this.ctx = ctx;
    }

    /**
     * Write a node cell of the vocabulary.
     * @param name - the column
     * @param row - the node index
     * @param value - the value
     */
    node(name: string, row: number, value: unknown): void {
        this.ctx.sink.setNodeValue(this.handle("node", name), row, value);
    }

    /**
     * Write an edge cell of the vocabulary.
     * @param name - the column
     * @param row - the edge index
     * @param value - the value
     */
    edge(name: string, row: number, value: unknown): void {
        this.ctx.sink.setEdgeValue(this.handle("edge", name), row, value);
    }

    /**
     * The handle of a column, declared on first use.
     * @param domain - node or edge
     * @param name - the column
     * @returns the handle
     */
    private handle(domain: "node" | "edge", name: string): ColumnHandle {
        const key = `${domain}:${name}`;
        const cached = this.handles.get(key);
        if (cached !== undefined) {
            return cached;
        }
        const { handle } = declareResolved(this.ctx.sink, domain, oboColumnDecl(domain, name), this.ctx.report);
        this.handles.set(key, handle);
        return handle;
    }
}

/** One import's view of the graph's ids and properties. */
interface Vocabulary {
    /** An IRI as the node id or relation name the snapshot uses. */
    readonly id: (iri: string) => string;
    /** A predicate as the relation name the edge column holds. */
    readonly relation: (pred: string) => string;
    /** Whether an IRI names a PROPERTY node. */
    readonly isProperty: (iri: string) => boolean;
    /** The PROPERTY nodes kept as metadata, by IRI. */
    readonly properties: Record<string, unknown>;
    /** The IRI each node id was read from, to tell a repeated node from two IRIs compacted to one id. */
    readonly sources: Map<string, string>;
}

/**
 * The id rule and the property table of one graph: PROPERTY nodes are found first, so an edge's
 * predicate is named by the shorthand of the property it names wherever that property stands.
 * @param nodes - the graph's node records
 * @param oboIds - "curie" or "iri"
 * @returns the vocabulary
 */
function vocabularyOf(nodes: readonly unknown[], oboIds: "curie" | "iri"): Vocabulary {
    const shorthands = new Map<string, string>();
    const propertyIds = new Set<string>();
    for (const node of nodes) {
        if (!isJsonObject(node) || typeof node.id !== "string" || node.type !== "PROPERTY") {
            continue;
        }
        propertyIds.add(node.id);
        const shorthand = basicValues(node.meta).find((pv) => OBOGRAPHS_PREDICATE_TAGS.get(pv.pred) === "shorthand");
        if (shorthand !== undefined) {
            shorthands.set(node.id, shorthand.val);
        }
    }
    const compact = (iri: string): string => (oboIds === "curie" ? compactOboIri(iri) : iri);
    return {
        id: (iri) => (oboIds === "curie" ? (shorthands.get(iri) ?? compactOboIri(iri)) : iri),
        relation: (pred) => BUILTIN_PREDICATES[pred] ?? shorthands.get(pred) ?? compact(pred),
        isProperty: (iri) => propertyIds.has(iri),
        properties: {},
        sources: new Map<string, string>(),
    };
}

/** One `basicPropertyValues` entry. */
interface PropertyValue {
    readonly pred: string;
    readonly val: string;
}

/**
 * The well-formed `basicPropertyValues` of a node's meta.
 * @param meta - the node's meta, or anything
 * @param bad - called for each entry that is skipped, or undefined to skip silently (the vocabulary scan)
 * @returns the entries with a string pred and val
 */
function basicValues(meta: unknown, bad?: (message: string) => void): PropertyValue[] {
    if (!isJsonObject(meta) || !Array.isArray(meta.basicPropertyValues)) {
        return [];
    }
    return meta.basicPropertyValues.filter((pv: unknown, i): pv is PropertyValue => {
        const ok = isJsonObject(pv) && typeof pv.pred === "string" && typeof pv.val === "string";
        if (!ok) {
            bad?.(`meta.basicPropertyValues[${i}] needs a string pred and val; it is skipped`);
        }
        return ok;
    });
}

/**
 * The strings of an array, or of an array of `{ val }` records; every other item is reported.
 * @param value - the array, or anything
 * @param what - the field's name for the messages
 * @param bad - called for each item that is skipped
 * @returns the strings
 */
function strings(value: unknown, what: string, bad: (message: string) => void): string[] {
    if (value === undefined || value === null) {
        return [];
    }
    if (!Array.isArray(value)) {
        bad(`${what} must be an array; it is skipped`);
        return [];
    }
    return value.flatMap((item: unknown, i) => {
        if (typeof item === "string") {
            return [item];
        }
        if (isJsonObject(item) && typeof item.val === "string") {
            return [item.val];
        }
        bad(`${what}[${i}] is neither a string nor a record with a string val; it is skipped`);
        return [];
    });
}

/**
 * Read the chosen graph of an OBO Graphs document into the sink.
 * @param ctx - the import context
 * @param root - the document
 */
export function importObographs(ctx: ImportContext, root: JsonRecord): void {
    const graph = chosenGraph(ctx, root, "OBO Graphs");
    const nodes = sectionOf(ctx, graph, "nodes");
    const edges = sectionOf(ctx, graph, "edges");
    const vocabulary = vocabularyOf(nodes, ctx.json.oboIds);
    const columns = new ColumnWriter(ctx);
    ctx.reportNodeIdFrom("obographs", "the node ids");
    ctx.setHeader(true);
    ctx.sink.reserve(nodes.length, edges.length);
    for (let i = 0; i < nodes.length; i++) {
        readNode(ctx, columns, vocabulary, nodes[i], `nodes[${i}]`);
    }
    const propertyEdges = readEdges(ctx, columns, vocabulary, edges);
    const graphMeta: JsonRecord = {};
    for (const key of Object.keys(graph)) {
        if (key !== "nodes" && key !== "edges") {
            graphMeta[key] = graph[key];
        }
    }
    const document: JsonRecord = {};
    for (const key of Object.keys(root)) {
        if (key !== "graphs") {
            document[key] = root[key];
        }
    }
    const label = typeof graph.lbl === "string" ? graph.lbl : null;
    const name = label ?? (typeof graph.id === "string" ? graph.id : null);
    ctx.sink.setMeta({
        sourceFormat: "json",
        name,
        extra: {
            json: { dialect: "obographs" },
            obographs: {
                ids: ctx.json.oboIds,
                graph: graphMeta,
                document,
                properties: vocabulary.properties,
                propertyEdges,
            },
        },
    });
}

/**
 * A `nodes` or `edges` section: an array, absent (empty), or a fatal E_JSON_SHAPE.
 * @param ctx - the context
 * @param graph - the graph
 * @param key - the section
 * @returns the elements
 */
function sectionOf(ctx: ImportContext, graph: JsonRecord, key: string): readonly unknown[] {
    const value = graph[key];
    if (value === undefined || value === null) {
        return [];
    }
    if (!Array.isArray(value)) {
        return ctx.report.fail(JSON_ISSUE.SHAPE, `an OBO Graphs graph's ${key} must be an array`, { element: key });
    }
    return value;
}

/**
 * Read one node: a PROPERTY into the metadata (typedefs "metadata"), anything else into the sink
 * with its OBO columns.
 * @param ctx - the context
 * @param columns - the column writer
 * @param vocabulary - the graph's vocabulary
 * @param record - the node record
 * @param element - its name in messages
 */
function readNode(
    ctx: ImportContext,
    columns: ColumnWriter,
    vocabulary: Vocabulary,
    record: unknown,
    element: string,
): void {
    if (!isJsonObject(record)) {
        ctx.badElement("node", element);
        return;
    }
    if (typeof record.id !== "string") {
        if (record.id === undefined) {
            ctx.coerceId(undefined, element);
        } else {
            badValue(ctx, `${element}.id must be a string; the node is skipped`);
        }
        ctx.countSkipped("node");
        return;
    }
    if (record.type === "PROPERTY" && ctx.json.typedefs === "metadata") {
        const shorthand = vocabulary.id(record.id) === record.id ? undefined : vocabulary.id(record.id);
        const entry: JsonRecord = {};
        for (const [key, value] of Object.entries({
            lbl: record.lbl,
            propertyType: record.propertyType,
            shorthand,
            meta: record.meta,
        })) {
            if (value !== undefined) {
                entry[key] = value;
            }
        }
        if (Object.prototype.hasOwnProperty.call(vocabulary.properties, record.id)) {
            ctx.report.warning(
                "merged",
                JSON_ISSUE.DUPLICATE_NODE,
                `${element}: property ${JSON.stringify(record.id)} already exists; the later record replaces it`,
                { element },
            );
        }
        vocabulary.properties[record.id] = entry;
        return;
    }
    const compacted = vocabulary.id(record.id);
    const earlier = vocabulary.sources.get(compacted);
    if (earlier !== undefined && earlier !== record.id) {
        ctx.report.warning(
            "coercion",
            JSON_ISSUE.ID_MERGED,
            `${element}: ${JSON.stringify(record.id)} and ${JSON.stringify(earlier)} both read as the id ${JSON.stringify(compacted)}; pass oboIds: "iri" to keep them apart`,
            { element },
        );
    }
    vocabulary.sources.set(compacted, record.id);
    const id = ctx.coerceId(compacted, element);
    const row = id === null ? -1 : ctx.pushNode(id, element);
    if (row < 0) {
        return;
    }
    try {
        writeNode(ctx, columns, vocabulary, record, row, element);
    } catch (err) {
        ctx.report.recordError(err, { element: record.id });
    }
}

/**
 * Write a node's fields and meta onto the OBO columns.
 * @param ctx - the context
 * @param columns - the column writer
 * @param vocabulary - the graph's vocabulary
 * @param record - the node record
 * @param row - the node index
 * @param element - its name in messages
 */
function writeNode(
    ctx: ImportContext,
    columns: ColumnWriter,
    vocabulary: Vocabulary,
    record: JsonRecord,
    row: number,
    element: string,
): void {
    const unrecognized: JsonRecord = {};
    const text = (key: string, column: string): void => {
        const value = record[key];
        if (typeof value === "string") {
            columns.node(column, row, column === "type" ? (FRAME_TYPES[value] ?? value) : value);
        } else if (value !== undefined && value !== null) {
            badValue(ctx, `${element}.${key} must be a string`);
        }
    };
    text("type", "type");
    text("lbl", "name");
    text("propertyType", "propertyType");
    for (const key of Object.keys(record)) {
        if (!NODE_KEYS.has(key)) {
            unrecognized[key] = record[key];
        }
    }
    const { meta } = record;
    if (isJsonObject(meta)) {
        writeMeta(columns, vocabulary, meta, row, unrecognized, (message) => {
            badValue(ctx, `${element}.${message}`);
        });
    } else if (meta !== undefined && meta !== null) {
        badValue(ctx, `${element}.meta must be an object`);
    }
    if (Object.keys(unrecognized).length > 0) {
        columns.node("obo.unrecognized", row, unrecognized);
    }
}

/**
 * Write a node's `meta` onto the OBO columns (design 4.6): definition, comments, subsets, xrefs,
 * synonyms, deprecated, and the basicPropertyValues mapped back to the OBO tag they came from.
 * @param columns - the column writer
 * @param vocabulary - the graph's vocabulary
 * @param meta - the meta record
 * @param row - the node index
 * @param unrecognized - where keys without a column go
 * @param bad - reports an item of the wrong type (E_BAD_VALUE); the item is skipped
 */
function writeMeta(
    columns: ColumnWriter,
    vocabulary: Vocabulary,
    meta: JsonRecord,
    row: number,
    unrecognized: JsonRecord,
    bad: (message: string) => void,
): void {
    const { definition } = meta;
    if (isJsonObject(definition) && typeof definition.val === "string") {
        columns.node("def", row, definition.val);
        columns.node("def.xrefs", row, strings(definition.xrefs, "meta.definition.xrefs", bad));
    } else if (definition !== undefined && definition !== null) {
        bad("meta.definition needs a string val; it is skipped");
    }
    const comments = strings(meta.comments, "meta.comments", bad);
    if (comments.length > 0) {
        columns.node("comment", row, comments.join("\n"));
    }
    const subsets = strings(meta.subsets, "meta.subsets", bad).map((s) => vocabulary.id(s));
    if (subsets.length > 0) {
        columns.node("subset", row, subsets);
    }
    const xrefs = strings(meta.xrefs, "meta.xrefs", bad);
    if (xrefs.length > 0) {
        columns.node("xref", row, xrefs);
    }
    if (Array.isArray(meta.synonyms) && meta.synonyms.length > 0) {
        // each synonym keeps its index in meta.synonyms, so a message names the right one
        const synonyms: { readonly s: JsonRecord & { readonly val: string }; readonly i: number }[] = [];
        meta.synonyms.forEach((s: unknown, i) => {
            if (isJsonObject(s) && typeof s.val === "string") {
                synonyms.push({ s: s as JsonRecord & { readonly val: string }, i });
            } else {
                bad(`meta.synonyms[${i}] is not a record with a string val; it is skipped`);
            }
        });
        columns.node(
            "synonym",
            row,
            synonyms.map(({ s, i }) => ({
                text: s.val,
                scope: typeof s.pred === "string" ? synonymScopeOf(s.pred) : null,
                type: typeof s.synonymType === "string" ? vocabulary.id(s.synonymType) : null,
                xrefs: strings(s.xrefs, `meta.synonyms[${i}].xrefs`, bad),
            })),
        );
    }
    if (typeof meta.deprecated === "boolean") {
        columns.node("is_obsolete", row, meta.deprecated);
    } else if (meta.deprecated !== undefined && meta.deprecated !== null) {
        bad("meta.deprecated must be a boolean; it is skipped");
    }
    writePropertyValues(columns, vocabulary, basicValues(meta, bad), row);
    for (const key of Object.keys(meta)) {
        if (!META_KEYS.has(key)) {
            unrecognized[`meta.${key}`] = meta[key];
        }
    }
}

/**
 * Write the basicPropertyValues: the ones an OBO tag maps to onto that tag's column (lists for
 * alt_id, replaced_by, consider), the rest into `property_value`.
 * @param columns - the column writer
 * @param vocabulary - the graph's vocabulary
 * @param values - the entries
 * @param row - the node index
 */
function writePropertyValues(
    columns: ColumnWriter,
    vocabulary: Vocabulary,
    values: readonly PropertyValue[],
    row: number,
): void {
    const lists = new Map<string, string[]>();
    const others: JsonRecord[] = [];
    for (const { pred, val } of values) {
        const tag = OBOGRAPHS_PREDICATE_TAGS.get(pred);
        if (tag === "shorthand") {
            continue;
        }
        if (tag === undefined) {
            others.push({ relation: vocabulary.id(pred), value: val, datatype: null });
        } else if (OBO_NODE_COLUMNS[tag].dtype === "list") {
            const list = lists.get(tag) ?? [];
            list.push(tag === "alt_id" ? val : vocabulary.id(val));
            lists.set(tag, list);
        } else {
            columns.node(tag, row, val);
        }
    }
    for (const [tag, list] of lists) {
        columns.node(tag, row, list);
    }
    if (others.length > 0) {
        columns.node("property_value", row, others);
    }
}

/**
 * Report a field of the wrong JSON type (the field is left unset, the element kept).
 * @param ctx - the context
 * @param message - what is wrong
 */
function badValue(ctx: ImportContext, message: string): void {
    ctx.report.error("validation-error", JSON_ISSUE.BAD_VALUE, message);
}

/**
 * Read the edges: the ones between properties into the metadata (typedefs "metadata"), the rest
 * into the sink, making a placeholder node for an endpoint missing from `nodes`.
 * @param ctx - the context
 * @param columns - the column writer
 * @param vocabulary - the graph's vocabulary
 * @param edges - the edge records
 * @returns the property edges kept as metadata
 */
function readEdges(
    ctx: ImportContext,
    columns: ColumnWriter,
    vocabulary: Vocabulary,
    edges: readonly unknown[],
): unknown[] {
    const { report, sink } = ctx;
    const propertyEdges: unknown[] = [];
    const dangling: string[] = [];
    let dropped = 0;
    // the edge keys outside the schema, each reported once
    const unread = new Set<string>();
    const endpoint = (raw: string, element: string): NodeId | null => {
        const id = ctx.coerceId(vocabulary.id(raw), element);
        if (id === null || sink.indexOf(id) !== INVALID_INDEX) {
            return id;
        }
        dangling.push(raw);
        if (!ctx.options.addMissingNodes) {
            return null;
        }
        const row = ctx.pushNode(id, element);
        if (row >= 0) {
            columns.node(PLACEHOLDER_COLUMN, row, true);
        }
        return id;
    };
    for (let i = 0; i < edges.length; i++) {
        const element = `edges[${i}]`;
        const record = edges[i];
        if (!isJsonObject(record)) {
            ctx.badElement("edge", element);
            continue;
        }
        const subKey = hasKey(record, "sub") ? "sub" : "subj";
        if (subKey === "subj" && hasKey(record, "subj")) {
            report.warnOnce(
                "coercion",
                JSON_ISSUE.OBOGRAPHS_SUBJ,
                `${element} uses the outdated key subj; read as sub`,
                {
                    element,
                },
            );
        }
        const sub = record[subKey];
        const { obj, pred } = record;
        if (typeof sub !== "string" || typeof obj !== "string") {
            ctx.missingEndpoint(element, typeof sub === "string" ? "obj" : "sub");
            continue;
        }
        const between =
            (typeof pred === "string" && PROPERTY_PREDICATES.has(pred)) ||
            vocabulary.isProperty(sub) ||
            vocabulary.isProperty(obj);
        if (between && ctx.json.typedefs === "metadata") {
            propertyEdges.push(record);
            continue;
        }
        try {
            const u = endpoint(sub, `${element}.sub`);
            const v = endpoint(obj, `${element}.obj`);
            if (u === null || v === null) {
                dropped++;
                ctx.countSkipped("edge");
                continue;
            }
            const edge = ctx.pushEdge(u, v, "directed", undefined, element);
            if (typeof pred === "string") {
                columns.edge("relation", edge, vocabulary.relation(pred));
            } else if (pred === undefined || pred === null) {
                badValue(ctx, `${element} has no pred; its relation is unset`);
            } else {
                badValue(ctx, `${element}.pred must be a string; its relation is unset`);
            }
            if (isJsonObject(record.meta)) {
                columns.edge("meta", edge, record.meta);
            } else if (record.meta !== undefined && record.meta !== null) {
                badValue(ctx, `${element}.meta must be an object; it is skipped`);
            }
            for (const key of Object.keys(record)) {
                if (!EDGE_KEYS.has(key) && !unread.has(key)) {
                    unread.add(key);
                    report.warning(
                        "unsupported",
                        JSON_ISSUE.UNREAD_KEY,
                        `edge key ${key} is not an OBO Graphs field; dropped`,
                        {
                            element: key,
                        },
                    );
                }
            }
        } catch (err) {
            ctx.skip(err, "edge", element);
        }
    }
    if (dangling.length > 0) {
        const shown = [...new Set(dangling)].slice(0, 5).join(", ");
        const action = ctx.options.addMissingNodes
            ? "each became a placeholder node (graphty.placeholder)"
            : `${dropped} edge(s) to them were dropped (addMissingNodes false)`;
        report.warning(
            "validation-error",
            JSON_ISSUE.DANGLING_REFERENCE,
            `${new Set(dangling).size} edge endpoint(s) missing from nodes: ${shown}; ${action}`,
            { element: dangling[0] },
        );
    }
    return propertyEdges;
}
