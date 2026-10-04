/**
 * The `obographs` dialect of the JSON exporter: writes a snapshot as an OBO Graphs document
 * (`{ "graphs": [{ "id", "meta", "nodes", "edges", ... }] }`), the JSON form the Gene Ontology and
 * the OBO Foundry publish, and the form the JSON importer's `obographs` dialect reads back.
 *
 * Nodes carry `lbl` from the label column, `type` from the `type` column (Term as CLASS, Instance
 * as INDIVIDUAL, Typedef as PROPERTY) and a `meta` built from the OBO vocabulary columns
 * (src/common/ontology.ts: definition, comments, subsets, xrefs, synonyms, deprecated, and the
 * basicPropertyValues of namespace, alt_id, created_by, creation_date, replaced_by, consider and
 * property_value); any other node column becomes basicPropertyValues named after the column. Edges
 * are `{ sub, pred, obj }` with the edge's `meta` column and its other columns in `meta`. Ids are
 * written as IRIs (`GO:0008150` as `http://purl.obolibrary.org/obo/GO_0008150`, a relation by the
 * IRI of the property whose shorthand it is) whenever the importer compacts the IRI back to the
 * same id. The graph metadata, the PROPERTY nodes, the property edges and the axioms an OBO Graphs
 * import kept in `meta.extra.obographs` are written back.
 */

import { type Column, GraphFormatError, type GraphSnapshot, type NodeId } from "@graphty/graph-format";

import {
    COLUMN_AS_PROPERTY_VALUE_CODE,
    DIRECTION_DROPPED_CODE,
    GRAPH_COLUMN_AS_METADATA_CODE,
    NODE_ORDER_CODE,
    NONFINITE_AS_NULL_CODE,
    RELATION_ASSUMED_CODE,
    TYPEDEF_NODES_CODE,
} from "../../common/codes.js";
import { type PairFolding, pairFolding } from "../../common/direction.js";
import { LOSS } from "../../common/export.js";
import {
    compactOboIri,
    OBO_IN_OWL,
    OBO_NODE_COLUMNS,
    OBO_PURL,
    OBOGRAPHS_PREDICATE_TAGS,
    PLACEHOLDER_COLUMN,
    SYNONYM_SCOPES,
} from "../../common/ontology.js";
import {
    capabilityNotes,
    cellOf,
    emptyColumnNotes,
    fitsVocabulary,
    framelessNodes,
    movedNodes,
    type NoteFn,
    notePropertyColumn,
    slotColumn,
    textOf,
    UNWRITTEN_ROLES,
    valuesOf,
} from "../../common/ontology-export.js";
import { type ResolvedExportOptions } from "../../common/options.js";
import { agree, plural } from "../../common/plural.js";
import { type ExplicitWeights, explicitWeights } from "../../common/weights.js";
import { type LossNote } from "../../types.js";
import { dialectCapabilities, exponentIfUnsafe, isJsonObject } from "./dialect.js";
import { BUILTIN_PREDICATES, FRAME_TYPES, META_KEYS, NODE_KEYS, PROPERTY_PREDICATES } from "./obographs.js";

/**
 * The loss codes only the `obographs` dialect records.
 * @category Built-in formats
 */
export const OBOGRAPHS_LOSS = Object.freeze({
    /** An edge column (or the explicit weights) is written into the edge's `meta` and reads back inside the `meta` column. */
    EDGE_COLUMN_AS_META: "W_OBOGRAPHS_EDGE_COLUMN_AS_META",
    /** A node id or relation is written as an IRI the importer's default `oboIds: "curie"` reads back as a different id. */
    ID_CHANGED: "W_OBOGRAPHS_ID_CHANGED",
    /** A `property_value` with an xsd datatype: basicPropertyValues have no datatype, so it reads back without one. */
    DATATYPE_DROPPED: "W_OBOGRAPHS_DATATYPE_DROPPED",
});

/**
 * The codes the dialect shares with the other exporters, under the names JSON_LOSS gives them.
 * @category Built-in formats
 */
export const OBOGRAPHS_SHARED_LOSS = Object.freeze({
    /** A node column outside the OBO vocabulary reads back inside the `property_value` column. */
    COLUMN_AS_PROPERTY_VALUE: COLUMN_AS_PROPERTY_VALUE_CODE,
    /** An edge without a relation is written with the predicate `is_a`. */
    RELATION_ASSUMED: RELATION_ASSUMED_CODE,
    /** Typedef nodes are written as PROPERTY nodes, which read back as nodes only under `typedefs: "nodes"`. */
    TYPEDEF_NODES: TYPEDEF_NODES_CODE,
    /** A graph attribute is written into the graph's `meta` and reads back in `snapshot.meta.extra.obographs`. */
    GRAPH_COLUMN_AS_METADATA: GRAPH_COLUMN_AS_METADATA_CODE,
});

/** The settings of one export. */
interface ObographsSettings {
    readonly common: ResolvedExportOptions;
    readonly indent: string;
    /** The ontology IRI unprefixed ids are written under, or null for the kept or derived one. */
    readonly ontologyIri: string | null;
}

/** A planned export: the notes and the writer. */
interface ObographsPlan {
    readonly notes: LossNote[];
    /** The document's text parts. */
    write(): Generator<string, void, undefined>;
}

/** The node type of each OBO frame type. */
const NODE_TYPES: Readonly<Record<string, string>> = Object.freeze({
    Term: "CLASS",
    Instance: "INDIVIDUAL",
    Typedef: "PROPERTY",
});

/** The basicPropertyValues predicate of each OBO tag (the reverse of OBOGRAPHS_PREDICATE_TAGS). */
const TAG_PREDICATES: ReadonlyMap<string, string> = new Map(
    [...OBOGRAPHS_PREDICATE_TAGS].map(([pred, tag]) => [tag, pred] as const),
);

/** The OBO Graphs pred of the relations the importer reads from a built-in pred. */
const REVERSE_PREDICATES: Readonly<Record<string, string>> = Object.freeze({ is_a: "is_a", instance_of: "type" });

/** The vocabulary columns the dialect has a place for; every other node column is property values. */
const PLACED: ReadonlySet<string> = new Set([
    "type",
    "propertyType",
    "def",
    "def.xrefs",
    "comment",
    "subset",
    "xref",
    "synonym",
    "is_obsolete",
    "namespace",
    "created_by",
    "creation_date",
    "alt_id",
    "replaced_by",
    "consider",
    "property_value",
    "obo.unrecognized",
]);

/** The basicPropertyValues columns, in the order they are written. */
const PROPERTY_TAGS: readonly string[] = [
    "namespace",
    "alt_id",
    "created_by",
    "creation_date",
    "replaced_by",
    "consider",
];

/** An IRI with a scheme. */
const IRI = /^[A-Za-z][A-Za-z0-9+.-]*:\/\//;

/** A CURIE whose prefix the OBO PURL mapping keeps (no underscore). */
const CURIE = /^([A-Za-z][A-Za-z0-9.-]*):(.+)$/;

/** The keyed OBO Graphs records an import kept. */
interface Kept {
    readonly ids: "curie" | "iri";
    readonly graph: Record<string, unknown>;
    readonly document: Record<string, unknown>;
    readonly properties: Record<string, Record<string, unknown>>;
    readonly propertyEdges: unknown[];
}

/**
 * The records an OBO Graphs import kept under `meta.extra.obographs`.
 * @param snapshot - the snapshot
 * @returns the records, empty when the snapshot did not come from OBO Graphs
 */
function keptOf(snapshot: GraphSnapshot): Kept {
    const raw = snapshot.meta.extra.obographs;
    const r = isJsonObject(raw) ? raw : {};
    const properties: Record<string, Record<string, unknown>> = {};
    if (isJsonObject(r.properties)) {
        for (const [iri, entry] of Object.entries(r.properties)) {
            if (isJsonObject(entry)) {
                properties[iri] = entry;
            }
        }
    }
    return {
        ids: r.ids === "iri" ? "iri" : "curie",
        graph: isJsonObject(r.graph) ? r.graph : {},
        document: isJsonObject(r.document) ? r.document : {},
        properties,
        propertyEdges: Array.isArray(r.propertyEdges) ? r.propertyEdges : [],
    };
}

/**
 * The shorthand a property's meta declares (the importer names the property by it).
 * @param meta - the property's meta
 * @returns the shorthand, or null
 */
function shorthandOf(meta: unknown): string | null {
    if (!isJsonObject(meta) || !Array.isArray(meta.basicPropertyValues)) {
        return null;
    }
    for (const pv of meta.basicPropertyValues) {
        if (
            isJsonObject(pv) &&
            typeof pv.pred === "string" &&
            OBOGRAPHS_PREDICATE_TAGS.get(pv.pred) === "shorthand" &&
            typeof pv.val === "string"
        ) {
            return pv.val;
        }
    }
    return null;
}

/**
 * The ontology IRI unprefixed ids are written under: the option, the kept graph id, else the OBO
 * PURL of the ontology id (the kept OBO header's, or the graph name's).
 * @param snapshot - the snapshot
 * @param kept - the kept records
 * @param option - the ontologyIri option, or null
 * @returns the IRI
 */
function ontologyIriOf(snapshot: GraphSnapshot, kept: Kept, option: string | null): string {
    if (option !== null) {
        return option;
    }
    if (typeof kept.graph.id === "string") {
        return kept.graph.id;
    }
    const { obo } = snapshot.meta.extra;
    const header = isJsonObject(obo) && isJsonObject(obo.header) ? obo.header : {};
    const ontology =
        Array.isArray(header.ontology) && typeof header.ontology[0] === "string" ? header.ontology[0].trim() : null;
    const name = ontology ?? snapshot.meta.name;
    const id = name === null || name.length === 0 ? "graph" : name.replaceAll(/[^A-Za-z0-9_.\-/]/g, "_");
    return `${OBO_PURL}${id}.owl`;
}

/**
 * JSON text of a value with -0 kept and the non-finite numbers written as null (counted).
 * @param value - the value
 * @param nonfinite - the counter
 * @param nonfinite.count - the count
 * @returns the JSON text
 */
function json(value: unknown, nonfinite: { count: number }): string {
    if (typeof value === "number") {
        if (!Number.isFinite(value)) {
            nonfinite.count++;
            return "null";
        }
        return Object.is(value, -0) ? "-0" : exponentIfUnsafe(JSON.stringify(value));
    }
    if (Array.isArray(value)) {
        return `[${value.map((v: unknown) => json(v, nonfinite)).join(",")}]`;
    }
    if (isJsonObject(value)) {
        return `{${Object.entries(value)
            .filter(([, v]) => v !== undefined)
            .map(([k, v]) => `${JSON.stringify(k)}:${json(v, nonfinite)}`)
            .join(",")}}`;
    }
    return JSON.stringify(value) ?? "null";
}

/**
 * Whether a value is a non-empty array of strings.
 * @param value - the value
 * @param empty - whether an empty array is allowed
 * @returns true for such an array
 */
function strings(value: unknown, empty = false): value is string[] {
    return Array.isArray(value) && (empty || value.length > 0) && value.every((v) => typeof v === "string");
}

/** A synonym as the vocabulary holds it. */
interface Synonym {
    readonly text: string | null;
    readonly scope: string | null;
    readonly type: string | null;
    readonly xrefs: string[];
    /** The synonym's own `meta`, kept by the importer as it was. */
    readonly meta?: unknown;
}

/** One OBO Graphs export: the plan (ids, columns, notes) and the writer. */
class ObographsExport {
    readonly notes: LossNote[] = [];

    private readonly note: NoteFn = (code, message, column = null, count = null) => {
        this.notes.push(Object.freeze({ code, message, column, count }));
    };

    private readonly kept: Kept;

    private readonly ontologyIri: string;

    /** IRI to the shorthand the importer names it by. */
    private readonly shorthands = new Map<string, string>();

    /** Shorthand to the IRI of its property. */
    private readonly shorthandIris = new Map<string, string>();

    /** The IRI written for each node. */
    private readonly iris: string[] = [];

    /** The nodes whose IRI reads back as another id. */
    private readonly changedRows = new Set<number>();

    /** The Typedef nodes written with a shorthand, by node. */
    private readonly typedefShorthands = new Map<number, string>();

    private readonly written: number[] = [];

    private rows: number[] = [];

    private frameless: Uint8Array = new Uint8Array(0);

    private label: Column | null = null;

    private readonly placed = new Map<string, Column>();

    private readonly properties: Column[] = [];

    private metaColumn: Column | null = null;

    private readonly edgeColumns: Column[] = [];

    private readonly preds = new Map<number, string>();

    private readonly weights: ExplicitWeights;

    private readonly folding: PairFolding;

    private readonly fatal: GraphFormatError | null;

    private readonly nonfinite = { count: 0 };

    private readonly indent: string;

    /** The edges' endpoints. */
    private readonly ends: { readonly src: ArrayLike<number>; readonly dst: ArrayLike<number> };

    /**
     * Plan the export.
     * @param snapshot - the snapshot
     * @param settings - the resolved settings
     */
    constructor(
        private readonly snapshot: GraphSnapshot,
        settings: ObographsSettings,
    ) {
        this.kept = keptOf(snapshot);
        this.ontologyIri = ontologyIriOf(snapshot, this.kept, settings.ontologyIri);
        this.indent = settings.indent !== "" ? `\n${settings.indent}` : "";
        for (const [iri, entry] of Object.entries(this.kept.properties)) {
            const shorthand = shorthandOf(entry.meta);
            if (shorthand !== null) {
                this.shorthands.set(iri, shorthand);
                this.shorthandIris.set(shorthand, iri);
            }
        }
        this.folding = pairFolding(snapshot);
        this.ends = snapshot.edgeList();
        for (let e = 0; e < snapshot.edgeCount; e++) {
            if (!this.folding.folded(e)) {
                this.written.push(e);
            }
        }
        this.weights = explicitWeights(snapshot);
        this.planIds();
        this.planNodes();
        this.fatal =
            capabilityNotes(snapshot, settings.common, {
                caps: dialectCapabilities("obographs"),
                label: this.label,
                labelAssumed: slotColumn(snapshot.nodes, "label", "name").assumed,
                edgeSlot: "edge meta",
                note: this.note,
            }) ?? this.emptyIdError();
        this.planColumnNotes();
        this.planEdges(settings.common);
        emptyColumnNotes(snapshot, this.rows, this.frameless, this.written, this.note);
        // a dry run counts the non-finite numbers the document writes as null
        if (this.fatal === null) {
            for (const part of this.write()) {
                void part;
            }
        }
        if (this.nonfinite.count > 0) {
            this.note(
                NONFINITE_AS_NULL_CODE,
                `${this.nonfinite.count} NaN or infinite value${plural(this.nonfinite.count)} ${agree(this.nonfinite.count, "is", "are")} written as null`,
                null,
                this.nonfinite.count,
            );
        }
    }

    /**
     * The id the importer reads an IRI back as: the shorthand of the property it names, else the
     * compacted IRI.
     * @param iri - the IRI
     * @returns the id
     */
    private reread(iri: string): string {
        return this.shorthands.get(iri) ?? compactOboIri(iri);
    }

    /**
     * An id as an IRI: an IRI as it is, a CURIE as its OBO PURL, anything else under the
     * ontology IRI.
     * @param id - the id
     * @returns the IRI
     */
    private expand(id: string): string {
        if (IRI.test(id)) {
            return id;
        }
        const curie = CURIE.exec(id);
        if (curie !== null && !curie[1].includes("_")) {
            return `${OBO_PURL}${curie[1]}_${curie[2]}`;
        }
        return `${this.ontologyIri}#${id}`;
    }

    /**
     * The IRI to write for an id: the first form that reads back as the id (the property of a
     * shorthand, the expanded IRI, the id itself); the id as it stands for a snapshot read with
     * oboIds "iri".
     * @param id - the id
     * @returns the IRI and whether it reads back as the id
     */
    private iriOf(id: string): { iri: string; exact: boolean } {
        const candidates =
            this.kept.ids === "iri"
                ? [id]
                : [this.shorthandIris.get(id), this.expand(id), id].filter((c): c is string => c !== undefined);
        const found = candidates.find((c) => this.reread(c) === id);
        return found === undefined ? { iri: candidates[0], exact: false } : { iri: found, exact: true };
    }

    /**
     * The pred to write for a relation: `is_a`, `type` for instance_of, the property of a
     * shorthand, the expanded IRI or the relation itself, whichever reads back as the relation.
     * @param r - the relation
     * @returns the pred and whether it reads back as the relation
     */
    private predOf(r: string): { pred: string; exact: boolean } {
        const reverse = REVERSE_PREDICATES[r];
        const candidates = [reverse, this.shorthandIris.get(r), this.expand(r), r].filter(
            (c): c is string => c !== undefined && !PROPERTY_PREDICATES.has(c),
        );
        const reread = (c: string): string => BUILTIN_PREDICATES[c] ?? this.shorthands.get(c) ?? compactOboIri(c);
        const found =
            this.kept.ids === "iri"
                ? candidates.find((c) => c === r && reread(c) === r)
                : candidates.find((c) => reread(c) === r);
        if (found !== undefined) {
            return { pred: found, exact: true };
        }
        return { pred: this.kept.ids === "iri" ? r : candidates[0], exact: false };
    }

    /**
     * An empty node id: OBO Graphs gives every node a non-empty id, and the importer skips a node
     * without one, so the export is refused.
     * @returns the error, or null when every id has text
     */
    private emptyIdError(): GraphFormatError | null {
        const { snapshot } = this;
        let count = 0;
        let first = -1;
        for (let i = 0; i < snapshot.nodeCount; i++) {
            if (String(snapshot.ids.idOf(i)) === "") {
                count++;
                first = first < 0 ? i : first;
            }
        }
        if (count === 0) {
            return null;
        }
        const message = `${count} node id${plural(count)} ${agree(count, "is", "are")} empty; an OBO Graphs node needs an id, so the save fails`;
        this.note(LOSS.ID_CHARSET, message, null, count);
        return new GraphFormatError("E_INVALID_ID", message, { reason: "charset", count, id: "", index: first });
    }

    /** The IRI of every node, the Typedefs named by a shorthand, and the numeric-id note. */
    private planIds(): void {
        const { snapshot } = this;
        const typeColumn = snapshot.nodes.get("type");
        let numeric = 0;
        for (let i = 0; i < snapshot.nodeCount; i++) {
            const id: NodeId = snapshot.ids.idOf(i);
            numeric += typeof id === "number" ? 1 : 0;
            const text = String(id);
            let { iri, exact } = this.iriOf(text);
            const typedef = typeColumn !== null && typeColumn.isSet(i) && typeColumn.value(i) === "Typedef";
            if (!exact && typedef && !IRI.test(text) && this.kept.ids === "curie") {
                // a Typedef named by its shorthand: written under an IRI with the shorthand declared
                iri = this.expand(text);
                this.shorthands.set(iri, text);
                this.shorthandIris.set(text, iri);
                this.typedefShorthands.set(i, text);
                exact = true;
            }
            this.iris.push(iri);
            if (!exact) {
                this.changedRows.add(i);
            }
        }
        if (numeric > 0) {
            this.note(
                LOSS.ID_TEXT_TYPE,
                `${numeric} numeric node id${plural(numeric)} ${agree(numeric, "is", "are")} written as text and read back as strings`,
                null,
                numeric,
            );
        }
    }

    /** The written nodes (placeholders aside), the node order, and the columns with a place. */
    private planNodes(): void {
        const { snapshot } = this;
        const { src, dst } = this.ends;
        this.frameless = framelessNodes(snapshot, this.written, {
            outgoingAllowed: true,
            changed: (i) => this.changedRows.has(i),
        });
        const moved = movedNodes(
            this.frameless,
            this.written.flatMap((e) => [src[e], dst[e]]),
        );
        if (moved > 0) {
            this.note(
                NODE_ORDER_CODE,
                `${moved} node${plural(moved)} ${agree(moved, "reads", "read")} back at another position: placeholder nodes are not written and read back after the written nodes`,
                null,
                moved,
            );
        }
        this.rows = [];
        for (let i = 0; i < snapshot.nodeCount; i++) {
            if (this.frameless[i] === 0) {
                this.rows.push(i);
            }
        }
        this.label = slotColumn(snapshot.nodes, "label", "name").column;
        const reproducible = (id: unknown): boolean => typeof id === "string" && this.iriOf(id).exact;
        for (const name of PLACED) {
            const column = snapshot.nodes.get(name);
            if (
                column !== null &&
                column !== this.label &&
                column.meta.role === null &&
                carries(name, column, this.rows, reproducible)
            ) {
                this.placed.set(name, column);
            }
        }
        const def = this.placed.get("def");
        const defXrefs = this.placed.get("def.xrefs");
        if (
            defXrefs !== undefined &&
            (def === undefined || this.rows.some((i) => def.isSet(i) !== defXrefs.isSet(i)))
        ) {
            this.placed.delete("def.xrefs");
        }
        if (def !== undefined && !this.placed.has("def.xrefs") && snapshot.nodes.get("def.xrefs") !== null) {
            this.placed.delete("def");
        }
        const slotted = new Set<Column>([...this.placed.values(), ...(this.label === null ? [] : [this.label])]);
        for (const column of snapshot.nodes) {
            const { role, name } = column.meta;
            if (slotted.has(column) || (role !== null && UNWRITTEN_ROLES.has(role))) {
                continue;
            }
            if (name === PLACEHOLDER_COLUMN && this.rows.every((i) => !column.isSet(i))) {
                continue;
            }
            this.properties.push(column);
            notePropertyColumn(this.note, column, this.rows, `basicPropertyValues (pred ${JSON.stringify(name)})`);
        }
    }

    /** The notes about node and graph columns: Typedef nodes, dtypes, datatypes, graph columns. */
    private planColumnNotes(): void {
        const { snapshot, rows, label, note } = this;
        const type = this.placed.get("type");
        const typedefs =
            type === undefined ? 0 : rows.filter((i) => type.isSet(i) && type.value(i) === "Typedef").length;
        if (typedefs > 0) {
            note(
                TYPEDEF_NODES_CODE,
                `${typedefs} node${plural(typedefs)} ${agree(typedefs, "is", "are")} written as PROPERTY nodes; they read back as nodes only when imported with typedefs: "nodes", and then their edges with them`,
                "type",
                typedefs,
            );
        }
        for (const [name, column] of [...this.placed, ...(label === null ? [] : ([["name", label]] as const))]) {
            const want = name === "name" ? "string" : OBO_NODE_COLUMNS[name].dtype;
            const listItems = column.dtype === "list" && column.child.dtype !== "string";
            if (((want === "string" || want === "dict") && column.dtype !== want) || listItems) {
                note(
                    LOSS.DTYPE,
                    `node column "${column.meta.name}" holds ${listItems ? "non-string items" : column.dtype}; it reads back as ${listItems ? "string items" : want}`,
                    column.meta.name,
                    column.length - column.nullCount,
                );
            }
        }
        let datatypes = 0;
        const pv = this.placed.get("property_value");
        if (pv !== undefined) {
            for (const i of rows) {
                for (const item of (cellOf(pv, i) ?? []) as { datatype: unknown }[]) {
                    datatypes += item.datatype === null ? 0 : 1;
                }
            }
        }
        if (datatypes > 0) {
            note(
                OBOGRAPHS_LOSS.DATATYPE_DROPPED,
                `${datatypes} property value${plural(datatypes)} ${agree(datatypes, "carries", "carry")} an xsd datatype; OBO Graphs basicPropertyValues have none, so they read back without it`,
                "property_value",
                datatypes,
            );
        }
        for (const column of snapshot.graph) {
            note(
                GRAPH_COLUMN_AS_METADATA_CODE,
                `graph column "${column.meta.name}" is written as a basicPropertyValue of the graph's meta and reads back in meta.extra.obographs, not as a column`,
                column.meta.name,
                column.length - column.nullCount,
            );
        }
    }

    /**
     * The edges' preds, meta and other columns, and their notes (relation, direction, ids that
     * change).
     * @param common - the common options
     */
    private planEdges(common: ResolvedExportOptions): void {
        const { snapshot, written, note } = this;
        const slot = slotColumn(snapshot.edges, "kind", "relation");
        const relation = slot.column;
        if (slot.assumed && relation !== null) {
            note(
                LOSS.ROLE_ASSUMED,
                `edge column "relation" has no role, so it is taken as the relation of each edge: it is written as each edge's pred, and reads back with the relation role ("kind")`,
                "relation",
                relation.length - relation.nullCount,
            );
        }
        const meta = snapshot.edges.get("meta");
        const metaOk =
            meta !== null &&
            meta.dtype === "json" &&
            meta.meta.role === null &&
            written.every((e) => !meta.isSet(e) || isJsonObject(cellOf(meta, e)));
        this.metaColumn = metaOk ? meta : null;
        for (const column of snapshot.edges) {
            const { role } = column.meta;
            if (
                column === relation ||
                column === this.metaColumn ||
                role === "id" ||
                (role !== null && UNWRITTEN_ROLES.has(role))
            ) {
                continue;
            }
            this.edgeColumns.push(column);
            const count = written.filter((e) => column.isSet(e)).length;
            if (count > 0) {
                note(
                    OBOGRAPHS_LOSS.EDGE_COLUMN_AS_META,
                    `edge column "${column.meta.name}" is written into each edge's meta and reads back inside the meta column`,
                    column.meta.name,
                    count,
                );
            }
        }
        const { weights } = this;
        const weighted = weights.weighted ? written.filter((e) => weights.isExplicit(e)).length : 0;
        if (weighted > 0) {
            note(
                OBOGRAPHS_LOSS.EDGE_COLUMN_AS_META,
                `${weighted} explicit edge weight${plural(weighted)} ${agree(weighted, "is", "are")} written as "weight" in each edge's meta and read back inside the meta column, not as weights`,
                snapshot.edges.byRole("weight")?.meta.name ?? null,
                weighted,
            );
        }
        this.planPreds(relation);
        this.directionNotes(common);
    }

    /**
     * The pred of every written edge, with the relation and id notes.
     * @param relation - the relation column, or null
     */
    private planPreds(relation: Column | null): void {
        let assumed = 0;
        let relationChanges = 0;
        for (const e of this.written) {
            const value = relation === null ? undefined : cellOf(relation, e);
            if (typeof value !== "string") {
                assumed++;
                this.preds.set(e, "is_a");
                continue;
            }
            const { pred, exact } = this.predOf(value);
            this.preds.set(e, pred);
            relationChanges += exact ? 0 : 1;
        }
        if (assumed > 0) {
            this.note(
                RELATION_ASSUMED_CODE,
                `${assumed} edge${plural(assumed)} ${agree(assumed, "has", "have")} no relation; written with the pred is_a (an ontology reads is_a as subclassing)`,
                relation?.meta.name ?? null,
                assumed,
            );
        }
        const idChanges = this.rows.filter((i) => this.changedRows.has(i)).length;
        if (idChanges + relationChanges > 0) {
            this.note(
                OBOGRAPHS_LOSS.ID_CHANGED,
                `${idChanges} node id${plural(idChanges)} and ${relationChanges} relation${plural(relationChanges)} are written as IRIs the importer reads back as other ids under its default oboIds "curie"`,
                null,
                idChanges + relationChanges,
            );
        }
    }

    /**
     * The direction notes: every OBO Graphs edge is directed.
     * @param common - the common options
     */
    private directionNotes(common: ResolvedExportOptions): void {
        const { snapshot, written, folding, note } = this;
        if (!snapshot.directed) {
            note(
                DIRECTION_DROPPED_CODE,
                `the snapshot is undirected; OBO Graphs edges are directed and read back directed (${written.length} edge${plural(written.length)})`,
                null,
                written.length,
            );
        } else if (common.onMixedDirection !== "error") {
            const undirected = written.filter((e) => !folding.sourceDirected(e)).length;
            if (undirected > 0) {
                note(
                    DIRECTION_DROPPED_CODE,
                    `${undirected} undirected edge${plural(undirected)} ${agree(undirected, "is", "are")} written as one directed edge each`,
                    null,
                    undirected,
                );
            }
        }
        if (folding.mutualCount > 0) {
            note(
                LOSS.MUTUAL_EXPANDED,
                `${folding.mutualCount} mutual pair${plural(folding.mutualCount)} ${agree(folding.mutualCount, "is", "are")} written as two edges; the mutual mark is lost`,
                null,
                folding.mutualCount,
            );
        }
    }

    /**
     * A placed column's cell.
     * @param name - the vocabulary name
     * @param i - the node
     * @returns the value, or undefined
     */
    private at(name: string, i: number): unknown {
        const column = this.placed.get(name);
        return column === undefined ? undefined : cellOf(column, i);
    }

    /**
     * One node record as JSON.
     * @param i - the node
     * @returns the JSON text
     */
    private nodeRecord(i: number): string {
        const node: Record<string, unknown> = { id: this.iris[i] };
        const lbl = this.label === null ? undefined : cellOf(this.label, i);
        if (typeof lbl === "string") {
            node.lbl = lbl;
        }
        // without a type column every node is a class; the type also marks the document as OBO Graphs
        const untyped = this.snapshot.nodes.get("type") === null ? "Term" : undefined;
        const type = this.placed.has("type") ? this.at("type", i) : untyped;
        if (typeof type === "string") {
            node.type = NODE_TYPES[type] ?? type;
        }
        const propertyType = this.at("propertyType", i);
        if (propertyType !== undefined) {
            node.propertyType = propertyType;
        }
        const meta = this.nodeMeta(i);
        const extra = this.at("obo.unrecognized", i);
        if (isJsonObject(extra)) {
            for (const [key, value] of Object.entries(extra)) {
                if (key.startsWith("meta.")) {
                    meta[key.slice(5)] = value;
                } else {
                    node[key] = value;
                }
            }
        }
        if (Object.keys(meta).length > 0) {
            node.meta = meta;
        }
        return json(node, this.nonfinite);
    }

    /**
     * One node's meta: definition, comments, subsets, xrefs, synonyms, deprecated and the
     * basicPropertyValues.
     * @param i - the node
     * @returns the meta record
     */
    private nodeMeta(i: number): Record<string, unknown> {
        const meta: Record<string, unknown> = {};
        const def = this.at("def", i);
        if (typeof def === "string") {
            meta.definition = { val: def, xrefs: this.at("def.xrefs", i) ?? [] };
        }
        const comment = this.at("comment", i);
        if (typeof comment === "string") {
            meta.comments = [comment];
        }
        const subsets = this.at("subset", i);
        if (Array.isArray(subsets)) {
            meta.subsets = subsets.map((s) => this.iriOf(String(s)).iri);
        }
        const xrefs = this.at("xref", i);
        if (Array.isArray(xrefs)) {
            meta.xrefs = xrefs.map((val) => ({ val }));
        }
        const synonyms = this.at("synonym", i);
        if (Array.isArray(synonyms)) {
            meta.synonyms = (synonyms as Synonym[]).map((s) => this.synonymRecord(s));
        }
        const obsolete = this.at("is_obsolete", i);
        if (typeof obsolete === "boolean") {
            meta.deprecated = obsolete;
        }
        const values = this.propertyValues(i);
        if (values.length > 0) {
            meta.basicPropertyValues = values;
        }
        return meta;
    }

    /**
     * One synonym record.
     * @param s - the synonym
     * @returns the record
     */
    private synonymRecord(s: Synonym): Record<string, unknown> {
        const out: Record<string, unknown> = {
            pred: s.scope === null ? "hasSynonym" : `has${s.scope[0]}${s.scope.slice(1).toLowerCase()}Synonym`,
        };
        if (s.text !== null) {
            out.val = s.text;
        }
        if (s.xrefs.length > 0) {
            out.xrefs = s.xrefs;
        }
        if (s.type !== null) {
            out.synonymType = this.iriOf(s.type).iri;
        }
        if (s.meta !== undefined) {
            out.meta = s.meta;
        }
        return out;
    }

    /**
     * One node's basicPropertyValues: the tags OBO Graphs writes as annotations, the Typedef
     * shorthand, the property values, then the columns outside the vocabulary.
     * @param i - the node
     * @returns the records
     */
    private propertyValues(i: number): Record<string, unknown>[] {
        const values: Record<string, unknown>[] = [];
        for (const tag of PROPERTY_TAGS) {
            const v = this.at(tag, i);
            const pred = TAG_PREDICATES.get(tag) ?? tag;
            for (const item of valuesOf(v)) {
                const text = String(item);
                values.push({ pred, val: tag === "replaced_by" || tag === "consider" ? this.iriOf(text).iri : text });
            }
        }
        const shorthand = this.typedefShorthands.get(i);
        if (shorthand !== undefined) {
            values.push({ pred: `${OBO_IN_OWL}shorthand`, val: shorthand });
        }
        for (const item of (this.at("property_value", i) ?? []) as { relation: string; value: string }[]) {
            values.push({ pred: this.iriOf(item.relation).iri, val: item.value });
        }
        for (const column of this.properties) {
            const v = cellOf(column, i);
            if (v === undefined) {
                continue;
            }
            const pred = column.meta.name;
            if (column.dtype === "list") {
                for (const item of v as readonly unknown[]) {
                    values.push({ pred, val: textOf(item, column.child.dtype) });
                }
            } else {
                const nested = column.dtype === "json" || column.meta.components > 1;
                values.push({ pred, val: nested ? (JSON.stringify(v) ?? "null") : textOf(v, column.dtype) });
            }
        }
        return values;
    }

    /**
     * One edge record as JSON.
     * @param e - the edge
     * @returns the JSON text
     */
    private edgeRecord(e: number): string {
        const { src, dst } = this.ends;
        const edge: Record<string, unknown> = {
            sub: this.iris[src[e]],
            pred: this.preds.get(e),
            obj: this.iris[dst[e]],
        };
        const base = this.metaColumn === null ? undefined : cellOf(this.metaColumn, e);
        const meta: Record<string, unknown> = isJsonObject(base) ? { ...base } : {};
        for (const column of this.edgeColumns) {
            const v = cellOf(column, e);
            if (v !== undefined) {
                meta[column.meta.name] = v;
            }
        }
        if (this.weights.weighted && this.weights.isExplicit(e)) {
            meta.weight = this.weights.value(e);
        }
        if (Object.keys(meta).length > 0 || base !== undefined) {
            edge.meta = meta;
        }
        return json(edge, this.nonfinite);
    }

    /**
     * The graph record up to its nodes: the id, the label and the meta (the graph columns as
     * basicPropertyValues).
     * @returns the JSON text without its closing brace
     */
    private graphHead(): string {
        const { kept, snapshot } = this;
        const graph: Record<string, unknown> = {
            id: typeof kept.graph.id === "string" ? kept.graph.id : this.ontologyIri,
        };
        const lbl =
            kept.graph.lbl ??
            (snapshot.meta.name !== null && kept.graph.id === undefined ? snapshot.meta.name : undefined);
        if (lbl !== undefined) {
            graph.lbl = lbl;
        }
        const meta: Record<string, unknown> = isJsonObject(kept.graph.meta) ? { ...kept.graph.meta } : {};
        const values: unknown[] = Array.isArray(meta.basicPropertyValues)
            ? [...(meta.basicPropertyValues as unknown[])]
            : [];
        for (const column of snapshot.graph) {
            const v = cellOf(column, 0);
            const dtype = column.dtype === "list" ? column.child.dtype : column.dtype;
            for (const item of valuesOf(v)) {
                values.push({ pred: column.meta.name, val: typeof item === "string" ? item : textOf(item, dtype) });
            }
        }
        if (values.length > 0) {
            meta.basicPropertyValues = values;
        }
        if (Object.keys(meta).length > 0) {
            graph.meta = meta;
        }
        return json(graph, this.nonfinite).slice(0, -1);
    }

    /**
     * The graph keys after the edges (the kept axioms and other keys).
     * @returns the JSON text from the comma to the closing brace
     */
    private graphTail(): string {
        const rest: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(this.kept.graph)) {
            if (key !== "id" && key !== "lbl" && key !== "meta" && key !== "nodes" && key !== "edges") {
                rest[key] = value;
            }
        }
        const text = json(rest, this.nonfinite);
        return text === "{}" ? "}" : `,${text.slice(1)}`;
    }

    /**
     * The kept PROPERTY nodes no written node stands for.
     * @returns their JSON texts
     */
    private propertyNodes(): string[] {
        const writtenIris = new Set(this.rows.map((i) => this.iris[i]));
        const out: string[] = [];
        for (const [iri, entry] of Object.entries(this.kept.properties)) {
            if (writtenIris.has(iri)) {
                continue;
            }
            const node: Record<string, unknown> = { id: iri, lbl: entry.lbl, type: "PROPERTY" };
            node.propertyType = entry.propertyType;
            node.meta = entry.meta;
            out.push(json(node, this.nonfinite));
        }
        return out;
    }

    /**
     * The document's text parts.
     * @yields the graph head, one part per node and edge, the tail
     * @returns nothing
     */
    *write(): Generator<string, void, undefined> {
        if (this.fatal !== null) {
            throw this.fatal;
        }
        const { indent } = this;
        yield `{"graphs":[${this.graphHead()},"nodes":[`;
        let first = true;
        const item = (text: string): string => {
            const out = `${first ? "" : ","}${indent}${text}`;
            first = false;
            return out;
        };
        for (const i of this.rows) {
            yield item(this.nodeRecord(i));
        }
        for (const node of this.propertyNodes()) {
            yield item(node);
        }
        yield `],"edges":[`;
        first = true;
        for (const e of this.written) {
            yield item(this.edgeRecord(e));
        }
        for (const edge of this.kept.propertyEdges) {
            yield item(json(edge, this.nonfinite));
        }
        yield `]${this.graphTail()}]`;
        const document = json(this.kept.document, this.nonfinite);
        yield document === "{}" ? "}\n" : `,${document.slice(1)}\n`;
    }
}

/**
 * Plan an OBO Graphs export.
 * @param snapshot - the snapshot
 * @param settings - the resolved settings
 * @returns the notes and the writer
 * @category Plugin helpers
 */
export function planObographs(snapshot: GraphSnapshot, settings: ObographsSettings): ObographsPlan {
    const plan = new ObographsExport(snapshot, settings);
    return { notes: plan.notes, write: () => plan.write() };
}

/**
 * Whether a vocabulary column is written into its OBO Graphs place and read back unchanged on
 * every written node.
 * @param name - the column name (a PLACED name)
 * @param column - the column
 * @param rows - the written nodes
 * @param reproducible - whether an id is written as an IRI that reads back as itself
 * @returns true when the place carries the column
 */
function carries(
    name: string,
    column: Column,
    rows: readonly number[],
    reproducible: (id: unknown) => boolean,
): boolean {
    const spec = OBO_NODE_COLUMNS[name];
    if (!fitsVocabulary(spec.dtype, column) || column.meta.components > 1) {
        return false;
    }
    const valid = (v: unknown): boolean => {
        switch (name) {
            case "type":
                return typeof v === "string" && !Object.hasOwn(FRAME_TYPES, v);
            case "propertyType":
            case "def":
            case "comment":
            case "namespace":
            case "created_by":
            case "creation_date":
                return typeof v === "string";
            case "is_obsolete":
                return typeof v === "boolean";
            case "def.xrefs":
                return strings(v, true);
            case "xref":
            case "alt_id":
                return strings(v);
            case "subset":
            case "replaced_by":
            case "consider":
                return strings(v) && v.every(reproducible);
            case "synonym":
                return (
                    Array.isArray(v) &&
                    v.length > 0 &&
                    v.every(
                        (s) =>
                            isJsonObject(s) &&
                            Object.keys(s).length === ("meta" in s ? 5 : 4) &&
                            (s.text === null || typeof s.text === "string") &&
                            (s.scope === null || (typeof s.scope === "string" && SYNONYM_SCOPES.has(s.scope))) &&
                            (s.type === null || reproducible(s.type)) &&
                            strings(s.xrefs, true),
                    )
                );
            case "property_value":
                return (
                    Array.isArray(v) &&
                    v.length > 0 &&
                    v.every(
                        (x) =>
                            isJsonObject(x) &&
                            Object.keys(x).length === 3 &&
                            reproducible(x.relation) &&
                            !OBOGRAPHS_PREDICATE_TAGS.has(String(x.relation)) &&
                            typeof x.value === "string" &&
                            (x.datatype === null || typeof x.datatype === "string"),
                    )
                );
            case "obo.unrecognized":
                return (
                    isJsonObject(v) &&
                    Object.keys(v).every((key) =>
                        key.startsWith("meta.") ? !META_KEYS.has(key.slice(5)) && key.length > 5 : !NODE_KEYS.has(key),
                    )
                );
            default:
                return false;
        }
    };
    return rows.every((i) => !column.isSet(i) || valid(cellOf(column, i)));
}
