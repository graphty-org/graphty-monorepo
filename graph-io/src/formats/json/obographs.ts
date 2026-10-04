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

/**
 * The node keys the schema defines; any other key goes to `obo.unrecognized`.
 * @category Plugin helpers
 */
export const NODE_KEYS: ReadonlySet<string> = new Set(["id", "lbl", "type", "propertyType", "meta"]);

/**
 * The `meta` keys mapped onto columns; any other key goes to `obo.unrecognized` as `meta.<key>`.
 * @category Plugin helpers
 */
export const META_KEYS: ReadonlySet<string> = new Set([
    "definition",
    "comments",
    "subsets",
    "xrefs",
    "synonyms",
    "basicPropertyValues",
    "deprecated",
]);

/**
 * The OBO frame type of an OBO Graphs node type.
 * @category Plugin helpers
 */
export const FRAME_TYPES: Readonly<Record<string, string>> = Object.freeze({
    CLASS: "Term",
    INDIVIDUAL: "Instance",
    PROPERTY: "Typedef",
});

/**
 * The OBO name of the predicates OBO Graphs writes without an IRI.
 * @category Plugin helpers
 */
export const BUILTIN_PREDICATES: Readonly<Record<string, string>> = Object.freeze({
    is_a: "is_a",
    subPropertyOf: "is_a",
    type: "instance_of",
    inverseOf: "inverse_of",
});

/**
 * Predicates that relate two properties (metadata under typedefs "metadata").
 * @category Plugin helpers
 */
export const PROPERTY_PREDICATES: ReadonlySet<string> = new Set(["subPropertyOf", "inverseOf"]);

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
    /** Whether an IRI names a PROPERTY node and no node of another type. */
    readonly isProperty: (iri: string) => boolean;
    /** Whether an IRI names a node that is not a PROPERTY (a class, an individual). */
    readonly isClass: (iri: string) => boolean;
    /** The PROPERTY nodes kept as metadata, by IRI (a null-prototype record: an IRI may be `__proto__`). */
    readonly properties: Record<string, unknown>;
    /** The first id as written of each node id as read (two ids may meet only after IRI compaction). */
    readonly written: Map<string, string>;
}

/** The axiom sections of an OBO Graphs graph, each an array (kept verbatim in the metadata). */
const AXIOM_KEYS: readonly string[] = [
    "logicalDefinitionAxioms",
    "equivalentNodesSets",
    "domainRangeAxioms",
    "propertyChainAxioms",
];

/** The edge keys the schema defines (`subj` is the README's outdated spelling of `sub`). */
const EDGE_KEYS: ReadonlySet<string> = new Set(["sub", "subj", "pred", "obj", "meta"]);

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
    const classIds = new Set<string>();
    for (const node of nodes) {
        if (!isJsonObject(node) || typeof node.id !== "string") {
            continue;
        }
        if (node.type !== "PROPERTY") {
            classIds.add(node.id);
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
        isProperty: (iri) => propertyIds.has(iri) && !classIds.has(iri),
        isClass: (iri) => classIds.has(iri),
        properties: Object.create(null) as Record<string, unknown>,
        written: new Map(),
    };
}

/** One `basicPropertyValues` entry. */
interface PropertyValue {
    readonly pred: string;
    readonly val: string;
    readonly meta?: unknown;
}

/**
 * The well-formed `basicPropertyValues` of a node's meta, each malformed entry reported when a
 * context is given (the vocabulary pre-pass reads them silently; writeMeta reports them).
 * @param meta - the node's meta, or anything
 * @param ctx - the context to report through, or null
 * @param element - the node's name in messages
 * @returns the entries with a string pred and val
 */
function basicValues(meta: unknown, ctx: ImportContext | null = null, element = ""): PropertyValue[] {
    if (!isJsonObject(meta) || meta.basicPropertyValues === undefined || meta.basicPropertyValues === null) {
        return [];
    }
    const path = `${element}.meta.basicPropertyValues`;
    if (!Array.isArray(meta.basicPropertyValues)) {
        if (ctx !== null) {
            badValue(ctx, `${path} must be an array; it is dropped`, path);
        }
        return [];
    }
    const out: PropertyValue[] = [];
    meta.basicPropertyValues.forEach((pv: unknown, j: number) => {
        if (isJsonObject(pv) && typeof pv.pred === "string" && typeof pv.val === "string") {
            out.push(pv as unknown as PropertyValue);
        } else if (ctx !== null) {
            badValue(ctx, `${path}[${j}] needs a string pred and a string val; it is dropped`, `${path}[${j}]`);
        }
    });
    return out;
}

/**
 * The strings of an array, or of an array of `{ val }` records, each item that is neither
 * reported (E_BAD_VALUE) and dropped, and a value that is not an array reported whole.
 * @param ctx - the context
 * @param value - the array, or anything (undefined and null: none)
 * @param path - the field's path in messages
 * @returns the strings
 */
function strings(ctx: ImportContext, value: unknown, path: string): string[] {
    if (value === undefined || value === null) {
        return [];
    }
    if (!Array.isArray(value)) {
        badValue(ctx, `${path} must be an array; it is dropped`, path);
        return [];
    }
    const out: string[] = [];
    value.forEach((item: unknown, j: number) => {
        if (typeof item === "string") {
            out.push(item);
        } else if (isJsonObject(item) && typeof item.val === "string") {
            out.push(item.val);
        } else {
            badValue(ctx, `${path}[${j}] is not a string or a { val } record; it is dropped`, `${path}[${j}]`);
        }
    });
    return out;
}

/**
 * Read the chosen graph of an OBO Graphs document into the sink.
 * @param ctx - the import context
 * @param root - the document
 * @category Plugin helpers
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
    for (const key of AXIOM_KEYS) {
        const axioms = graph[key];
        if (axioms !== undefined && axioms !== null && !Array.isArray(axioms)) {
            badValue(ctx, `the graph's ${key} must be an array; it is kept as written`, key);
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
    if (typeof record.id !== "string" || record.id.length === 0) {
        if (record.id === undefined) {
            ctx.coerceId(undefined, element);
        } else if (record.id === "") {
            ctx.report.error("missing-value", JSON_ISSUE.MISSING_ID, `${element} has an empty id; it is skipped`, {
                element,
            });
        } else {
            badValue(ctx, `${element}.id must be a string; the node is skipped`);
        }
        ctx.countSkipped("node");
        return;
    }
    if (typeof record.type === "string" && FRAME_TYPES[record.type] === undefined) {
        ctx.report.warnOnce(
            "unsupported",
            JSON_ISSUE.UNKNOWN_ELEMENT,
            `${element}: node type ${JSON.stringify(record.type)} is not CLASS, INDIVIDUAL or PROPERTY; kept as written`,
            { element: record.type },
            `${JSON_ISSUE.UNKNOWN_ELEMENT}:type:${record.type}`,
        );
    }
    if (record.type === "PROPERTY" && ctx.json.typedefs === "metadata") {
        readProperty(ctx, vocabulary, record, record.id, element);
        return;
    }
    const compacted = vocabulary.id(record.id);
    const id = ctx.coerceId(compacted, element);
    // two ids that differ only by IRI compaction (the PURL and its CURIE) meet here
    const earlier = vocabulary.written.get(compacted);
    if (earlier === undefined) {
        vocabulary.written.set(compacted, record.id);
    }
    const why =
        earlier === undefined || earlier === record.id
            ? ""
            : ` (${earlier} and ${record.id} meet only after IRI compaction; oboIds "iri" keeps them apart)`;
    const row = id === null ? -1 : ctx.pushNode(id, element, why);
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
 * Keep a PROPERTY node in the metadata (typedefs "metadata"), the first of a repeated id.
 * @param ctx - the context
 * @param vocabulary - the graph's vocabulary
 * @param record - the node record
 * @param iri - its id
 * @param element - its name in messages
 */
function readProperty(
    ctx: ImportContext,
    vocabulary: Vocabulary,
    record: JsonRecord,
    iri: string,
    element: string,
): void {
    if (Object.prototype.hasOwnProperty.call(vocabulary.properties, iri)) {
        ctx.report.warning(
            "merged",
            JSON_ISSUE.DUPLICATE_NODE,
            `${element}: property ${JSON.stringify(iri)} is declared again; the first declaration is kept`,
            { element },
        );
        return;
    }
    const shorthand = vocabulary.id(iri) === iri ? undefined : vocabulary.id(iri);
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
    vocabulary.properties[iri] = entry;
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
        writeMeta(ctx, columns, vocabulary, meta, row, unrecognized, element);
    } else if (meta !== undefined && meta !== null) {
        badValue(ctx, `${element}.meta must be an object`);
    }
    if (Object.keys(unrecognized).length > 0) {
        columns.node("obo.unrecognized", row, unrecognized);
    }
}

/**
 * Write a node's `meta` onto the OBO columns (design 4.6): definition, comments, subsets, xrefs,
 * synonyms, deprecated, and the basicPropertyValues mapped back to the OBO tag they came from. A
 * field of the wrong JSON type is reported and dropped; a nested `meta` (axiom annotations) of
 * a definition or a property value is kept in `obo.unrecognized`.
 * @param ctx - the context
 * @param columns - the column writer
 * @param vocabulary - the graph's vocabulary
 * @param meta - the meta record
 * @param row - the node index
 * @param unrecognized - where keys without a column go
 * @param element - the node's name in messages
 */
function writeMeta(
    ctx: ImportContext,
    columns: ColumnWriter,
    vocabulary: Vocabulary,
    meta: JsonRecord,
    row: number,
    unrecognized: JsonRecord,
    element: string,
): void {
    const path = `${element}.meta`;
    const { definition } = meta;
    if (isJsonObject(definition)) {
        const xrefs = strings(ctx, definition.xrefs, `${path}.definition.xrefs`);
        if (typeof definition.val === "string") {
            columns.node("def", row, definition.val);
            columns.node("def.xrefs", row, xrefs);
        } else {
            badValue(ctx, `${path}.definition has no string val; it is dropped`, `${path}.definition.val`);
        }
        if (definition.meta !== undefined) {
            unrecognized["meta.definition.meta"] = definition.meta;
        }
    } else if (definition !== undefined && definition !== null) {
        badValue(ctx, `${path}.definition must be an object with a val; it is dropped`, `${path}.definition`);
    }
    const comments = strings(ctx, meta.comments, `${path}.comments`);
    if (comments.length > 0) {
        columns.node("comment", row, comments.join("\n"));
    }
    const subsets = strings(ctx, meta.subsets, `${path}.subsets`).map((s) => vocabulary.id(s));
    if (subsets.length > 0) {
        columns.node("subset", row, subsets);
    }
    const xrefs = strings(ctx, meta.xrefs, `${path}.xrefs`);
    if (xrefs.length > 0) {
        columns.node("xref", row, xrefs);
    }
    const synonyms = synonymsOf(ctx, vocabulary, meta.synonyms, `${path}.synonyms`);
    if (synonyms.length > 0) {
        columns.node("synonym", row, synonyms);
    }
    if (typeof meta.deprecated === "boolean") {
        columns.node("is_obsolete", row, meta.deprecated);
    } else if (meta.deprecated !== undefined && meta.deprecated !== null) {
        badValue(ctx, `${path}.deprecated must be a boolean; it is dropped`, `${path}.deprecated`);
    }
    writePropertyValues(ctx, columns, vocabulary, meta, row, unrecognized, element);
    for (const key of Object.keys(meta)) {
        if (!META_KEYS.has(key)) {
            unrecognized[`meta.${key}`] = meta[key];
        }
    }
}

/**
 * The synonyms of a node's meta as the OBO `synonym` items: each entry that is not an object or
 * has no string val reported and dropped, a predicate that is not one of the four scopes kept with
 * scope null (W_UNKNOWN_ELEMENT once per predicate), a nested `meta` kept on the item.
 * @param ctx - the context
 * @param vocabulary - the graph's vocabulary
 * @param value - the `synonyms` field
 * @param path - its path in messages
 * @returns the items
 */
function synonymsOf(ctx: ImportContext, vocabulary: Vocabulary, value: unknown, path: string): JsonRecord[] {
    if (value === undefined || value === null) {
        return [];
    }
    if (!Array.isArray(value)) {
        badValue(ctx, `${path} must be an array; it is dropped`, path);
        return [];
    }
    const out: JsonRecord[] = [];
    value.forEach((s: unknown, j: number) => {
        const at = `${path}[${j}]`;
        if (!isJsonObject(s)) {
            badValue(ctx, `${at} is not an object; it is dropped`, at);
            return;
        }
        if (typeof s.val !== "string") {
            badValue(ctx, `${at} has no string val; it is dropped`, `${at}.val`);
            return;
        }
        const scope = typeof s.pred === "string" ? synonymScopeOf(s.pred) : null;
        if (scope === null && typeof s.pred === "string") {
            ctx.report.warnOnce(
                "unsupported",
                JSON_ISSUE.UNKNOWN_ELEMENT,
                `${at}: synonym predicate ${JSON.stringify(s.pred)} is not one of the four scopes; kept with scope null`,
                { element: s.pred },
                `${JSON_ISSUE.UNKNOWN_ELEMENT}:pred:${s.pred}`,
            );
        }
        const item: JsonRecord = { text: s.val, scope, type: null, xrefs: strings(ctx, s.xrefs, `${at}.xrefs`) };
        if (typeof s.synonymType === "string") {
            item.type = vocabulary.id(s.synonymType);
        } else if (s.synonymType !== undefined && s.synonymType !== null) {
            badValue(ctx, `${at}.synonymType must be a string; it is dropped`, `${at}.synonymType`);
        }
        if (s.meta !== undefined) {
            item.meta = s.meta;
        }
        out.push(item);
    });
    return out;
}

/**
 * Write the basicPropertyValues: the ones an OBO tag maps to onto that tag's column (lists for
 * alt_id, replaced_by, consider; the first value of a single-valued tag, a repeat warned as the
 * .obo importer warns it), the rest into `property_value`.
 * @param ctx - the context
 * @param columns - the column writer
 * @param vocabulary - the graph's vocabulary
 * @param meta - the node's meta
 * @param row - the node index
 * @param unrecognized - where the nested meta of a mapped value goes
 * @param element - the node's name in messages
 */
function writePropertyValues(
    ctx: ImportContext,
    columns: ColumnWriter,
    vocabulary: Vocabulary,
    meta: JsonRecord,
    row: number,
    unrecognized: JsonRecord,
    element: string,
): void {
    const lists = new Map<string, string[]>();
    const singles = new Map<string, string>();
    const others: JsonRecord[] = [];
    const values = basicValues(meta, ctx, element);
    values.forEach(({ pred, val, meta: nested }, j) => {
        const tag = OBOGRAPHS_PREDICATE_TAGS.get(pred);
        if (tag === "shorthand") {
            return;
        }
        if (tag === undefined) {
            const item: JsonRecord = { relation: vocabulary.id(pred), value: val, datatype: null };
            if (nested !== undefined) {
                item.meta = nested;
            }
            others.push(item);
            return;
        }
        if (nested !== undefined) {
            unrecognized[`meta.basicPropertyValues[${j}].meta`] = nested;
        }
        if (OBO_NODE_COLUMNS[tag].dtype === "list") {
            const list = lists.get(tag) ?? [];
            list.push(tag === "alt_id" ? val : vocabulary.id(val));
            lists.set(tag, list);
        } else if (singles.get(tag) === val) {
            // an identical value counts once, as an identical .obo clause does
        } else if (singles.has(tag)) {
            ctx.report.warning(
                "validation-error",
                JSON_ISSUE.DUPLICATE_ATTRIBUTE,
                `${element}: a second ${tag} (${JSON.stringify(val)}); the first is kept`,
                { element: tag },
            );
        } else {
            singles.set(tag, val);
            columns.node(tag, row, val);
        }
    });
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
 * @param element - the field's path, when known
 */
function badValue(ctx: ImportContext, message: string, element?: string): void {
    ctx.report.error(
        "validation-error",
        JSON_ISSUE.BAD_VALUE,
        message,
        element === undefined ? undefined : { element },
    );
}

/**
 * An edge's subject: `sub`, else the README's outdated `subj` (warned once), and a warning when
 * both are present and differ; every key outside the schema warned once per key name.
 * @param ctx - the context
 * @param record - the edge record
 * @param element - its name in messages
 * @returns the subject value, unchecked
 */
function subjectOf(ctx: ImportContext, record: JsonRecord, element: string): unknown {
    const { report } = ctx;
    for (const key of Object.keys(record)) {
        if (!EDGE_KEYS.has(key)) {
            report.warnOnce(
                "unsupported",
                JSON_ISSUE.UNREAD_KEY,
                `${element}: the key ${JSON.stringify(key)} is not part of an OBO Graphs edge; it is not read`,
                { element: `${element}.${key}` },
                `${JSON_ISSUE.UNREAD_KEY}:edge:${key}`,
            );
        }
    }
    if (!hasKey(record, "sub")) {
        if (hasKey(record, "subj")) {
            report.warnOnce(
                "coercion",
                JSON_ISSUE.OBOGRAPHS_SUBJ,
                `${element} uses the outdated key subj; read as sub`,
                {
                    element,
                },
            );
        }
        return record.subj;
    }
    if (hasKey(record, "subj") && record.subj !== record.sub) {
        report.warning(
            "coercion",
            JSON_ISSUE.OBOGRAPHS_SUBJ,
            `${element} has both sub and the outdated subj, which differ; sub is read and subj ignored`,
            { element },
        );
    }
    return record.sub;
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
        const sub = subjectOf(ctx, record, element);
        const { obj, pred } = record;
        if (typeof sub !== "string" || typeof obj !== "string" || sub.length === 0 || obj.length === 0) {
            ctx.missingEndpoint(element, typeof sub === "string" && sub.length > 0 ? "obj" : "sub");
            continue;
        }
        // only an edge between two properties is property metadata; one that touches a class stays
        const between =
            (vocabulary.isProperty(sub) && vocabulary.isProperty(obj)) ||
            (typeof pred === "string" &&
                PROPERTY_PREDICATES.has(pred) &&
                !vocabulary.isClass(sub) &&
                !vocabulary.isClass(obj));
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
            } else {
                badValue(ctx, `${element} has no pred; its relation is unset`);
            }
            if (isJsonObject(record.meta)) {
                columns.edge("meta", edge, record.meta);
            } else if (record.meta !== undefined && record.meta !== null) {
                badValue(ctx, `${element}.meta must be an object; it is dropped`, `${element}.meta`);
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
