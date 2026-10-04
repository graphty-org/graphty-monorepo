/**
 * The OBO exporter: writes a snapshot as an OBO 1.4 flat file, the text format of the Gene
 * Ontology and the OBO Foundry ontologies.
 *
 * Every node is a frame (`[Term]`, or `[Instance]` / `[Typedef]` from the `type` column) in node
 * order; every edge is a clause on its source's frame: `is_a: T` for the relation `is_a`,
 * `instance_of: T` on an Instance, `relationship: R T` for anything else, an edge without a
 * relation as `is_a` (the `relation` option). The columns of the OBO vocabulary
 * (src/common/ontology.ts: `name`, `namespace`, `def`, `synonym`, `xref`, ...) are written back
 * as their tags; any other node column becomes `property_value: <column> "<value>" xsd:<type>`
 * lines (with a `[Typedef]` declaring the column as a metadata relation), any other edge column a
 * qualifier of the edge's clause. A placeholder node (`graphty.placeholder`, a target no frame
 * declared) gets no frame, so the re-import makes it again. The header, the Typedefs and the
 * unknown frames an OBO import kept in `meta.extra.obo` are written back.
 *
 * check() predicts every difference the OBO importer produces on re-import: a vocabulary column
 * whose values the file cannot carry exactly is written as `property_value` lines instead and
 * reported, never written half right.
 */

import { type Column, GraphFormatError, type GraphSnapshot, type NodeId } from "@graphty/graph-format";

import {
    COLUMN_AS_PROPERTY_VALUE_CODE,
    GRAPH_COLUMN_AS_METADATA_CODE,
    NODE_ORDER_CODE,
    RELATION_ASSUMED_CODE,
    ROLE_ASSUMED_CODE,
    TYPEDEF_NODES_CODE,
} from "../../common/codes.js";
import { type PairFolding, pairFolding } from "../../common/direction.js";
import { capabilities, LOSS } from "../../common/export.js";
import { formatNumber } from "../../common/format.js";
import { OBO_NODE_COLUMNS, PLACEHOLDER_COLUMN, SYNONYM_SCOPES } from "../../common/ontology.js";
import {
    capabilityNotes,
    cellOf,
    emptyColumnNotes,
    fitsVocabulary,
    FRAME_KINDS,
    type FrameKind,
    framelessNodes,
    isQualifierRecord,
    movedNodes,
    type NoteFn,
    notePropertyColumn,
    slotColumn,
    textOf,
    UNWRITTEN_ROLES,
} from "../../common/ontology-export.js";
import { type ResolvedExportOptions, resolveExportOptions } from "../../common/options.js";
import { type ExplicitWeights, explicitWeights } from "../../common/weights.js";
import { encodeChunks, joinText } from "../../common/writer.js";
import { type CommonExportOptions, type ExportCapabilities, type GraphExporter, type LossNote } from "../../types.js";
import { BOOL_TAGS, DEPRECATED_TAGS, ID_LIST_TAGS, TEXT_TAGS, TYPEDEF_TAGS } from "./importer.js";
import {
    escapeOboQuoted,
    escapeOboValue,
    escapeOboWord,
    hasLineEnd,
    isOboWord,
    isQualifierName,
    NOT_IN_WORD,
    qualifierBlock,
    tokenize,
} from "./syntax.js";

/**
 * The format-specific options of the OBO exporter.
 * @category Built-in formats
 */
export interface OboExportOptions {
    /**
     * The relation written for an edge that has none of its own (no `relation` value): an OBO id
     * such as `is_a` or `part_of`. Reasoners and ROBOT read `is_a` as subclassing.
     * @defaultValue "is_a"
     */
    relation?: string | undefined;
    /**
     * The `ontology` id written in the header, such as `go` or `uberon`. It may hold letters,
     * digits and `_ . - /`; any other character makes checkExport() and the save throw
     * E_UNSUPPORTED. The default is the id an OBO import read, else the graph name with every other
     * character replaced by `_`, else no `ontology` line.
     * @defaultValue as read, else the graph name
     */
    ontology?: string | undefined;
}

/**
 * The loss notes the OBO exporter's check() returns, by name. A key is the code without its
 * severity and format prefixes.
 * @category Built-in formats
 */
export const OBO_LOSS = Object.freeze({
    /** A node column outside the OBO vocabulary (or one whose values a tag cannot carry exactly) reads back inside the `property_value` column. */
    COLUMN_AS_PROPERTY_VALUE: COLUMN_AS_PROPERTY_VALUE_CODE,
    /** An edge column (or the explicit weights) reads back inside the `qualifiers` column. */
    EDGE_COLUMN_AS_QUALIFIER: "W_OBO_EDGE_COLUMN_AS_QUALIFIER",
    /** Every edge is written from its source to its target: an undirected snapshot reads back directed. */
    UNDIRECTED_AS_DIRECTED: "W_OBO_UNDIRECTED_AS_DIRECTED",
    /** Two identical clauses on one frame (parallel edges with one relation and the same qualifiers, a repeated list item) read back as one. */
    DUPLICATE_CLAUSE: "W_OBO_DUPLICATE_CLAUSE",
    /** An edge without a relation is written with the `relation` option (default `is_a`). */
    RELATION_ASSUMED: RELATION_ASSUMED_CODE,
    /** A relation that is not an OBO id (empty, or holding a space, `!`, `{` or `}`) is written with `_` in place of those characters. */
    RELATION_RENAMED: "W_OBO_RELATION_RENAMED",
    /** The graph name is not an ontology id; the header `ontology` is written with `_` in place of the other characters. */
    ONTOLOGY_NAME: "W_OBO_ONTOLOGY_NAME",
    /** `[Typedef]` frames read back as nodes only under the importer's `typedefs: "nodes"`; by default they are metadata. */
    TYPEDEF_NODES: TYPEDEF_NODES_CODE,
    /** Edges are written on their source's frame, so a re-import lists them grouped by source, in node order. */
    EDGE_ORDER: "W_OBO_EDGE_ORDER",
    /** A graph column is written as a header `property_value` and reads back in `meta.extra.obo.header`, not as a column. */
    GRAPH_COLUMN_AS_METADATA: GRAPH_COLUMN_AS_METADATA_CODE,
    /** A carriage return or form feed in a text cannot be written; it is written as a line feed. */
    LINE_END: "W_OBO_LINE_END",
    /** The nodes read back in a different order. */
    NODE_ORDER: NODE_ORDER_CODE,
    /** A mutual pair is written as two clauses without its mark. */
    MUTUAL_EXPANDED: LOSS.MUTUAL_EXPANDED,
    /** Undirected edges of a directed snapshot under onMixedDirection "directed" / "undirected". */
    MIXED_DIRECTION: LOSS.MIXED_DIRECTION,
    /**
     * The graph has both directed and undirected edges and `onMixedDirection` is "error". An import stops; a save to a
     * format that holds one direction per file fails with E_DIRECTED. Pass "directed" or "undirected" to read or write
     * it anyway.
     */
    MIXED_DIRECTION_ERROR: LOSS.MIXED_DIRECTION_ERROR,
    /** OBO has no edge ids. */
    EDGE_IDS_DROPPED: LOSS.EDGE_IDS_DROPPED,
    /** OBO has no positions. */
    POSITIONS_DROPPED: LOSS.POSITIONS,
    /** OBO has no containment. */
    HIERARCHY_DROPPED: LOSS.HIERARCHY,
    /** OBO has no time. */
    TEMPORAL_DROPPED: LOSS.TEMPORAL,
    /** OBO has no visual columns. */
    VIZ_DROPPED: LOSS.VIZ,
    /** An attribute with a role the format has no place for is written as a plain attribute; the role is lost. */
    ROLE_DROPPED: LOSS.ROLE,
    /**
     * An attribute without a role is written where the format keeps a role (a `name` column as the label, say), and
     * reads back with that role.
     */
    ROLE_ASSUMED: ROLE_ASSUMED_CODE,
    /**
     * An attribute with a role (the label, say) is written where the format keeps that role, and reads back under the
     * name the format's importer gives it.
     */
    COLUMN_NAME_CHANGED: LOSS.COLUMN_NAME_CHANGED,
    /** A vocabulary column of the other text dtype (string for dict, dict for string) reads back as the vocabulary's. */
    DTYPE_UNSUPPORTED: LOSS.DTYPE,
    /** A column without a value on any written element reads back absent. */
    EMPTY_COLUMN_DROPPED: LOSS.EMPTY_COLUMN,
    /** A declared default: OBO has none. */
    DEFAULT_DROPPED: LOSS.DEFAULT,
    /** Declared options: OBO has no enumerations. */
    OPTIONS_DROPPED: LOSS.OPTIONS,
    /** An extension table OBO cannot carry. */
    EXTENSION_TABLE_DROPPED: LOSS.EXTENSION_TABLE,
    /**
     * Node ids the format cannot write, under `sanitizeIds: "error"`; the save fails with E_INVALID_ID. Pass
     * `sanitizeIds: "mangle"` to rewrite them.
     */
    ID_CHARSET: LOSS.ID_CHARSET,
    /** Node ids OBO cannot write as they are, under sanitizeIds "mangle": rewritten, the original kept. */
    ID_MANGLED: LOSS.ID_MANGLED,
    /** Numeric ids are written as text and read back as strings. */
    ID_TEXT_TYPE: LOSS.ID_TEXT_TYPE,
    /**
     * Two node ids would be written as the same text (the number 5 and the text "5"); the save fails with
     * E_INVALID_ID.
     */
    ID_TEXT_COLLISION: LOSS.ID_TEXT_COLLISION,
});

/**
 * What the OBO flat file keeps: a directed multigraph with self-loops and any id (the exporter's
 * own rule refuses whitespace, control characters, `!`, `{` and `}`). No column of the snapshot's own reads back as
 * a column: the file keeps the OBO vocabulary (`name`, `def`, `synonym`, ... with their own
 * types) and writes every other node column as property values and every edge column as
 * qualifiers, which check() reports column by column.
 * @category Built-in formats
 */
export const OBO_CAPABILITIES: ExportCapabilities = capabilities({
    mixedDirection: false,
    multiEdges: true,
    selfLoops: true,
    edgeIds: "none",
    idCharset: "any",
    dtypes: [],
    components: false,
    lists: false,
    json: false,
    defaults: false,
    options: false,
    hierarchy: false,
    temporal: "none",
    graphAttributes: false,
    positions: false,
    viz: false,
});

/** The roles OBO has a slot for, and the column names its importer gives them. */

/** The node column that keeps a rewritten id's original (restored by restoreMangledIds). */
const ORIGINAL_ID = "graphty:originalId";

/** The edge columns of the vocabulary. */
const RELATION_COLUMN = "relation";
const QUALIFIERS_COLUMN = "qualifiers";

/** The qualifier name the explicit weights are written under. */
const WEIGHT_QUALIFIER = "weight";

/** The relations a file may use without declaring them (the importer's built-ins). */
const BUILTIN_RELATIONS: ReadonlySet<string> = new Set([
    "is_a",
    "instance_of",
    "disjoint_from",
    "inverse_of",
    "union_of",
    "intersection_of",
]);

/** Marks where the edge clauses go in TAG_ORDER. */
const EDGES = "\u0000edges";

/** Marks where the unknown tags go in TAG_ORDER. */
const UNRECOGNIZED = "obo.unrecognized";

/** The order of the tags in a frame (the OBO 1.4 guide's, Term, Instance and Typedef tags merged). */
const TAG_ORDER: readonly string[] = [
    "is_anonymous",
    "name",
    "namespace",
    "alt_id",
    "def",
    "comment",
    "subset",
    "synonym",
    "xref",
    "builtin",
    "property_value",
    "domain",
    "range",
    "holds_over_chain",
    "is_anti_symmetric",
    "is_cyclic",
    "is_reflexive",
    "is_symmetric",
    "is_asymmetric",
    "is_transitive",
    "is_functional",
    "is_inverse_functional",
    EDGES,
    "intersection_of",
    "union_of",
    "equivalent_to",
    "disjoint_from",
    "inverse_of",
    "transitive_over",
    "equivalent_to_chain",
    "disjoint_over",
    "created_by",
    "creation_date",
    "is_obsolete",
    "replaced_by",
    "consider",
    "expand_assertion_to",
    "expand_expression_to",
    "is_metadata_tag",
    "is_class_level",
    UNRECOGNIZED,
];

/** The header tags in the 1.4 guide's order; every other kept header tag follows them. */
const HEADER_ORDER: readonly string[] = [
    "format-version",
    "data-version",
    "version",
    "date",
    "saved-by",
    "auto-generated-by",
    "import",
    "subsetdef",
    "synonymtypedef",
    "idspace",
    "default-relationship-id-prefix",
    "id-mapping",
    "default-namespace",
    "namespace-id-rule",
    "remark",
    "ontology",
];

/** Tags the importer applies (so an unknown tag of that name would not read back as unknown). */
const APPLIED_TAGS: ReadonlySet<string> = new Set([
    "id",
    "is_a",
    "instance_of",
    "relationship",
    "intersection_of",
    "holds_over_chain",
    "equivalent_to_chain",
    "def",
    "expand_assertion_to",
    "expand_expression_to",
    "synonym",
    "xref",
    "property_value",
    ...TEXT_TAGS,
    ...BOOL_TAGS,
    ...ID_LIST_TAGS,
    ...DEPRECATED_TAGS.keys(),
]);

/** The vocabulary node columns the flat file writes as tags (`type`, `name` and `propertyType` aside). */
const TAG_COLUMNS: ReadonlySet<string> = new Set(
    Object.keys(OBO_NODE_COLUMNS).filter((name) => name !== "type" && name !== "name" && name !== "propertyType"),
);

/** The xsd datatype of a dtype in a `property_value` line. */
const XSD: Readonly<Record<string, string>> = Object.freeze({
    string: "xsd:string",
    dict: "xsd:string",
    bool: "xsd:boolean",
    i32: "xsd:integer",
    u32: "xsd:integer",
    u8: "xsd:integer",
    f32: "xsd:double",
    f64: "xsd:double",
});

/** A node column written as `property_value` lines. */
interface PropertyColumn {
    readonly column: Column;
    /** The relation the lines name (the column name, or its id form). */
    readonly relation: string;
}

/** An edge column written as qualifiers. */
interface QualifierColumn {
    readonly column: Column;
    /** The qualifier name (the column name, or its written form). */
    readonly name: string;
}

/** Everything write() needs, computed once by plan(). */
interface Plan {
    readonly notes: LossNote[];
    readonly fatal: GraphFormatError | null;
    readonly options: { readonly relation: string; readonly ontology: string | null };
    /** The id written for each node. */
    readonly ids: readonly string[];
    /** The rewritten nodes' original ids, by node index. */
    readonly originals: ReadonlyMap<number, string>;
    /** 1 for a node written without a frame (a placeholder the re-import makes again). */
    readonly frameless: Uint8Array;
    /** The frame type of each node. */
    readonly kinds: readonly FrameKind[];
    /** The label column (written as `name`), or null. */
    readonly label: Column | null;
    /** The vocabulary columns written as their tags, by tag. */
    readonly tags: ReadonlyMap<string, Column>;
    /** The node columns written as `property_value` lines. */
    readonly properties: readonly PropertyColumn[];
    /** The written edges by source: edgeStart[i]..edgeStart[i + 1] in edgeOrder. */
    readonly edgeStart: Uint32Array;
    readonly edgeOrder: Uint32Array;
    /** The target of each edge. */
    readonly dst: ArrayLike<number>;
    /** The relation written for each edge. */
    readonly relations: readonly string[];
    /** The vocabulary `qualifiers` edge column, or null. */
    readonly qualifiers: Column | null;
    /** The other edge columns written as qualifiers. */
    readonly edgeColumns: readonly QualifierColumn[];
    readonly weights: ExplicitWeights;
    /** The header lines. */
    readonly header: readonly string[];
    /** The frames after the nodes (kept Typedefs, declared relations, unknown frames), as lines. */
    readonly tail: readonly string[];
}

/** Counts gathered while frames are written. */
interface FrameStats {
    /** Texts holding a carriage return or form feed. */
    lineEnds: number;
    /** Whether every `obo.qualifiers` entry found its clause. */
    qualifiersPlaced: boolean;
}

// ============================================================ values

/**
 * Whether a text survives as an unquoted tag value: the reader trims it, and the OBO grammar
 * (fastobo, owlapi) refuses an empty one.
 * @param text - the text
 * @returns true when the text is not empty and has no surrounding whitespace
 */
function isTrimmed(text: string): boolean {
    return text.length > 0 && text === text.trim();
}

/**
 * Whether a value is an array whose items all pass a test.
 * @param value - the value
 * @param item - the item test
 * @param nonEmpty - whether the array must have an item
 * @returns true when it is such an array
 */
function arrayOf(value: unknown, item: (v: unknown) => boolean, nonEmpty = true): value is unknown[] {
    return Array.isArray(value) && (!nonEmpty || value.length > 0) && value.every(item);
}

/**
 * Whether a value is a string the unquoted xref slot keeps (non-empty, no surrounding whitespace).
 * @param value - the value
 * @returns true for such a string
 */
function isXrefId(value: unknown): value is string {
    return typeof value === "string" && value.length > 0 && isTrimmed(value);
}

/**
 * Whether a value is an OBO word.
 * @param value - the value
 * @returns true for a string isOboWord() accepts
 */
function isWord(value: unknown): value is string {
    return typeof value === "string" && isOboWord(value);
}

/**
 * Whether an object has exactly the given keys, `qualifiers` optional (and then a qualifier record).
 * @param value - the value
 * @param keys - the required keys
 * @returns true when it has those keys and nothing else
 */
function hasKeys(value: unknown, keys: readonly string[]): value is Record<string, unknown> {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
        return false;
    }
    const own = Object.keys(value);
    const record = value as Record<string, unknown>;
    if (Object.prototype.hasOwnProperty.call(record, "qualifiers")) {
        if (!isQualifierRecord(record.qualifiers, isQualifierName)) {
            return false;
        }
        return own.length === keys.length + 1 && keys.every((k) => Object.prototype.hasOwnProperty.call(record, k));
    }
    return own.length === keys.length && keys.every((k) => Object.prototype.hasOwnProperty.call(record, k));
}

/**
 * Replace every character a word cannot hold with `_`.
 * @param text - the text
 * @returns a word
 */
function wordOf(text: string): string {
    const out = text.replace(new RegExp(NOT_IN_WORD.source, "gu"), "_");
    return out.length === 0 ? "_" : out;
}

/**
 * A qualifier record as name / value pairs (a list value as one pair per item).
 * @param record - a record isQualifierRecord() accepts
 * @returns the pairs
 */
function qualifierPairs(record: unknown): [string, string][] {
    const out: [string, string][] = [];
    for (const [name, value] of Object.entries(record as Record<string, string | string[]>)) {
        for (const item of Array.isArray(value) ? value : [value]) {
            out.push([name, item]);
        }
    }
    return out;
}

// ============================================================ the plan

/**
 * Resolve the OBO-specific options.
 * @param options - the caller's options
 * @returns the relation and the ontology; E_UNSUPPORTED for a value that is not an OBO id
 */
function resolveOboOptions(options: OboExportOptions | undefined): {
    readonly relation: string;
    readonly ontology: string | null;
} {
    const relation = options?.relation ?? "is_a";
    if (typeof relation !== "string" || !isOboWord(relation)) {
        throw new GraphFormatError("E_UNSUPPORTED", `option relation: ${JSON.stringify(relation)} is not an OBO id`, {
            option: "relation",
            found: relation,
        });
    }
    const ontology = options?.ontology ?? null;
    if (ontology !== null && (typeof ontology !== "string" || !/^[A-Za-z0-9_.\-/]+$/.test(ontology))) {
        throw new GraphFormatError(
            "E_UNSUPPORTED",
            `option ontology: ${JSON.stringify(ontology)} is not an ontology id (letters, digits, _ . - /)`,
            { option: "ontology", found: ontology },
        );
    }
    return { relation, ontology };
}

/**
 * The ids to write: each node's id text, or under "mangle" a word with `_` for the characters a
 * word cannot hold (and `_2`, `_3`... on a collision), the original kept.
 * @param snapshot - the snapshot
 * @param mode - the sanitizeIds option
 * @param note - records a note
 * @returns the ids, the originals and the fatal error, if any
 */
function planIds(
    snapshot: GraphSnapshot,
    mode: "error" | "mangle",
    note: NoteFn,
): { ids: string[]; originals: Map<number, string>; fatal: GraphFormatError | null } {
    const n = snapshot.nodeCount;
    const ids: string[] = new Array<string>(n);
    const bad: number[] = [];
    let numeric = 0;
    for (let i = 0; i < n; i++) {
        const id: NodeId = snapshot.ids.idOf(i);
        if (typeof id === "number") {
            numeric++;
        }
        ids[i] = String(id);
        if (!isOboWord(ids[i])) {
            bad.push(i);
        }
    }
    if (numeric > 0) {
        note(
            LOSS.ID_TEXT_TYPE,
            `${numeric} numeric node id(s) are written as text and read back as strings`,
            null,
            numeric,
        );
    }
    const originals = new Map<number, string>();
    let fatal: GraphFormatError | null = null;
    if (bad.length > 0) {
        if (mode === "error") {
            note(
                LOSS.ID_CHARSET,
                `${bad.length} node id(s) are not OBO ids (empty, or holding whitespace, a control character, "!", "{" or "}"); the save fails unless sanitizeIds is "mangle"`,
                null,
                bad.length,
            );
            fatal = new GraphFormatError(
                "E_INVALID_ID",
                `${bad.length} node id(s) cannot be written as OBO ids (first: ${JSON.stringify(ids[bad[0]])}); pass sanitizeIds: "mangle" to rewrite them`,
                { reason: "charset", count: bad.length, id: snapshot.ids.idOf(bad[0]), index: bad[0] },
            );
        } else {
            const badSet = new Set(bad);
            const used = new Set(ids.filter((_, i) => !badSet.has(i)));
            for (const i of bad) {
                const base = wordOf(ids[i]);
                let candidate = base;
                for (let k = 2; used.has(candidate); k++) {
                    candidate = `${base}_${k}`;
                }
                used.add(candidate);
                originals.set(i, ids[i]);
                ids[i] = candidate;
            }
            note(
                LOSS.ID_MANGLED,
                `${bad.length} node id(s) that are not OBO ids are rewritten with "_"; the originals are kept as ${ORIGINAL_ID} property values (JSON text; an import with restoreMangledIds: true reads them back as the ids)`,
                null,
                bad.length,
            );
        }
    }
    const seen = new Map<string, number>();
    for (let i = 0; i < n && fatal === null; i++) {
        const before = seen.get(ids[i]);
        if (before !== undefined) {
            note(
                LOSS.ID_TEXT_COLLISION,
                `node ids ${JSON.stringify(snapshot.ids.idOf(before))} and ${JSON.stringify(snapshot.ids.idOf(i))} have the same text; the save fails`,
                null,
                1,
            );
            fatal = new GraphFormatError("E_INVALID_ID", "two node ids have the same text; OBO keeps ids as text", {
                reason: "collision",
            });
        }
        seen.set(ids[i], i);
    }
    return { ids, originals, fatal };
}

/**
 * The written edges (the mirror halves of folded pairs left out) grouped by source, in node order
 * then edge order, and the direction notes.
 * @param snapshot - the snapshot
 * @param folding - the pair folding
 * @param common - the common options
 * @param note - records a note
 * @returns the edge list, the CSR by source and the targets
 */
function planEdges(
    snapshot: GraphSnapshot,
    folding: PairFolding,
    common: ResolvedExportOptions,
    note: NoteFn,
): { written: number[]; edgeStart: Uint32Array; edgeOrder: Uint32Array; dst: ArrayLike<number> } {
    const { src, dst } = snapshot.edgeList();
    const written: number[] = [];
    for (let e = 0; e < snapshot.edgeCount; e++) {
        if (!folding.folded(e)) {
            written.push(e);
        }
    }
    const edgeStart = new Uint32Array(snapshot.nodeCount + 1);
    for (const e of written) {
        edgeStart[src[e] + 1]++;
    }
    for (let i = 0; i < snapshot.nodeCount; i++) {
        edgeStart[i + 1] += edgeStart[i];
    }
    const fill = edgeStart.slice(0, snapshot.nodeCount);
    const edgeOrder = new Uint32Array(written.length);
    for (const e of written) {
        edgeOrder[fill[src[e]]++] = e;
    }
    let moved = 0;
    for (let k = 0; k < edgeOrder.length; k++) {
        if (edgeOrder[k] !== written[k]) {
            moved++;
        }
    }
    if (moved > 0) {
        note(
            OBO_LOSS.EDGE_ORDER,
            `${moved} edge(s) read back at another position: edges are written on their source's frame, grouped by source in node order`,
            null,
            moved,
        );
    }
    if (!snapshot.directed) {
        note(
            OBO_LOSS.UNDIRECTED_AS_DIRECTED,
            `the snapshot is undirected; every edge is written from its source to its target and reads back directed (${written.length} edge(s))`,
            null,
            written.length,
        );
    } else if (common.onMixedDirection !== "error") {
        const undirected = written.filter((e) => !folding.sourceDirected(e)).length;
        if (undirected > 0) {
            note(
                OBO_LOSS.UNDIRECTED_AS_DIRECTED,
                `${undirected} undirected edge(s) are written as one directed clause each; OBO has no undirected edge`,
                null,
                undirected,
            );
        }
    }
    if (folding.mutualCount > 0) {
        note(
            LOSS.MUTUAL_EXPANDED,
            `${folding.mutualCount} mutual pair(s) are written as two clauses; the mutual mark is lost`,
            null,
            folding.mutualCount,
        );
    }
    return { written, edgeStart, edgeOrder, dst };
}

/**
 * The frame types: the `type` column when every written node has one of Term, Instance or
 * Typedef, else Term for every node (and the column is a property value).
 * @param snapshot - the snapshot
 * @param frameless - the frameless flags
 * @returns the kinds and the type column used, or null
 */
function planKinds(snapshot: GraphSnapshot, frameless: Uint8Array): { kinds: FrameKind[]; type: Column | null } {
    const kinds = new Array<FrameKind>(snapshot.nodeCount).fill("Term");
    const type = snapshot.nodes.get("type");
    if (type === null || (type.dtype !== "dict" && type.dtype !== "string")) {
        return { kinds, type: null };
    }
    for (let i = 0; i < snapshot.nodeCount; i++) {
        if (frameless[i] === 1) {
            if (type.isSet(i)) {
                return { kinds: kinds.fill("Term"), type: null };
            }
            continue;
        }
        const value = cellOf(type, i);
        if (typeof value !== "string" || !FRAME_KINDS.has(value)) {
            return { kinds: kinds.fill("Term"), type: null };
        }
        kinds[i] = value as FrameKind;
    }
    return { kinds, type };
}

/**
 * Whether a vocabulary column's values are written by its tag and read back unchanged, on every
 * written node (the vocabulary's dtype, the shape the importer builds, OBO words where the tag
 * takes an id, no surrounding space in an unquoted value, a Typedef tag on Typedef frames only).
 * @param name - the column (a TAG_COLUMNS name)
 * @param column - the column
 * @param rows - the written nodes
 * @param kinds - the frame types
 * @param scopes - the default scope of each declared synonym type
 * @returns true when the tag carries the column
 */
function tagCarries(
    name: string,
    column: Column,
    rows: readonly number[],
    kinds: readonly FrameKind[],
    scopes: ReadonlyMap<string, string | null>,
): boolean {
    const spec = OBO_NODE_COLUMNS[name];
    if (!fitsVocabulary(spec.dtype, column) || column.meta.components > 1) {
        return false;
    }
    const typedefOnly = TYPEDEF_TAGS.has(name);
    const valid = (v: unknown): boolean => {
        if (TEXT_TAGS.has(name)) {
            return typeof v === "string" && isTrimmed(v);
        }
        if (BOOL_TAGS.has(name)) {
            return typeof v === "boolean";
        }
        if (ID_LIST_TAGS.has(name)) {
            return arrayOf(v, isWord);
        }
        switch (name) {
            case "def":
                return typeof v === "string";
            case "def.xrefs":
                return arrayOf(v, isXrefId, false);
            case "xref":
                return arrayOf(v, isXrefId);
            case "xref.descriptions":
                return (
                    typeof v === "object" &&
                    v !== null &&
                    !Array.isArray(v) &&
                    Object.values(v).every((d) => typeof d === "string")
                );
            case "synonym":
                return arrayOf(
                    v,
                    (s) =>
                        hasKeys(s, ["text", "scope", "type", "xrefs"]) &&
                        typeof s.text === "string" &&
                        typeof s.scope === "string" &&
                        SYNONYM_SCOPES.has(s.scope) &&
                        (s.type === null || isWord(s.type)) &&
                        (s.type === null || (scopes.get(s.type) ?? s.scope) === s.scope) &&
                        arrayOf(s.xrefs, isXrefId, false),
                );
            case "intersection_of":
                return arrayOf(
                    v,
                    (x) =>
                        hasKeys(x, ["relation", "target"]) &&
                        (x.relation === null || isWord(x.relation)) &&
                        isWord(x.target),
                );
            case "property_value":
                return arrayOf(
                    v,
                    (x) =>
                        hasKeys(x, ["relation", "value", "datatype"]) &&
                        isWord(x.relation) &&
                        x.relation !== ORIGINAL_ID &&
                        typeof x.value === "string" &&
                        (x.datatype === null || isWord(x.datatype)),
                );
            case "holds_over_chain":
            case "equivalent_to_chain":
                return arrayOf(v, (pair) => arrayOf(pair, isWord) && pair.length === 2);
            case "expand_assertion_to":
            case "expand_expression_to":
                return arrayOf(
                    v,
                    (x) =>
                        hasKeys(x, ["template", "xrefs"]) &&
                        typeof x.template === "string" &&
                        arrayOf(x.xrefs, isXrefId, false),
                );
            case "obo.qualifiers":
                return (
                    typeof v === "object" &&
                    v !== null &&
                    !Array.isArray(v) &&
                    Object.values(v).every((entries) =>
                        arrayOf(
                            entries,
                            (entry) =>
                                hasKeys(entry, ["value"]) &&
                                Object.prototype.hasOwnProperty.call(entry, "qualifiers") &&
                                typeof entry.value === "string" &&
                                isQualifierRecord(entry.qualifiers, isQualifierName),
                        ),
                    )
                );
            default:
                return false;
        }
    };
    for (const i of rows) {
        if (!column.isSet(i)) {
            continue;
        }
        if (typedefOnly && kinds[i] !== "Typedef") {
            return false;
        }
        if (!valid(cellOf(column, i))) {
            return false;
        }
    }
    return true;
}

/**
 * Whether the `obo.unrecognized` column reads back unchanged: a record of tag to texts, each tag
 * one the importer does not apply on that frame type.
 * @param column - the column
 * @param rows - the written nodes
 * @param kinds - the frame types
 * @returns true when every cell is written as unknown tags and read back as the same
 */
function unrecognizedCarried(column: Column, rows: readonly number[], kinds: readonly FrameKind[]): boolean {
    if (column.dtype !== "json") {
        return false;
    }
    for (const i of rows) {
        const v = cellOf(column, i);
        if (v === undefined) {
            continue;
        }
        if (typeof v !== "object" || v === null || Array.isArray(v)) {
            return false;
        }
        for (const [tag, values] of Object.entries(v)) {
            const applied =
                (APPLIED_TAGS.has(tag) || TYPEDEF_TAGS.has(tag)) &&
                !(TYPEDEF_TAGS.has(tag) && kinds[i] !== "Typedef") &&
                !(tag === "instance_of" && kinds[i] !== "Instance");
            if (
                applied ||
                tag.length === 0 ||
                !isTrimmed(tag) ||
                !arrayOf(values, (t) => typeof t === "string" && isTrimmed(t))
            ) {
                return false;
            }
        }
    }
    return true;
}

/**
 * The default scope of each synonym type the kept header declares (null: none declared).
 * @param header - the kept header (tag to raw values)
 * @returns the scopes by type
 */
function synonymTypeScopes(header: Readonly<Record<string, readonly string[]>>): Map<string, string | null> {
    const out = new Map<string, string | null>();
    for (const raw of header.synonymtypedef ?? []) {
        const tokens = tokenize(raw);
        if (tokens.length > 0 && tokens[0].kind === "word") {
            const scope = tokens.slice(1).find((t) => t.kind === "word" && SYNONYM_SCOPES.has(t.text));
            out.set(tokens[0].text, scope?.text ?? null);
        }
    }
    return out;
}

/**
 * The record of an OBO import kept under `meta.extra.obo`, or empty records.
 * @param snapshot - the snapshot
 * @returns the header, the Typedefs and the unknown frames
 */
function keptObo(snapshot: GraphSnapshot): {
    header: Record<string, string[]>;
    typedefs: Record<string, Record<string, string[]>>;
    unknownFrames: { type: string; clauses: Record<string, string[]> }[];
} {
    const raw = snapshot.meta.extra.obo;
    const record =
        typeof raw === "object" && raw !== null && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
    const clauses = (value: unknown): Record<string, string[]> => {
        const out: Record<string, string[]> = {};
        if (typeof value === "object" && value !== null && !Array.isArray(value)) {
            for (const [tag, values] of Object.entries(value)) {
                if (Array.isArray(values)) {
                    out[tag] = values.filter((v): v is string => typeof v === "string");
                }
            }
        }
        return out;
    };
    const typedefs: Record<string, Record<string, string[]>> = {};
    if (typeof record.typedefs === "object" && record.typedefs !== null && !Array.isArray(record.typedefs)) {
        for (const [id, frame] of Object.entries(record.typedefs)) {
            typedefs[id] = clauses(frame);
        }
    }
    const unknownFrames = Array.isArray(record.unknownFrames)
        ? record.unknownFrames.flatMap((f: unknown) =>
              typeof f === "object" && f !== null && typeof (f as { type?: unknown }).type === "string"
                  ? [{ type: (f as { type: string }).type, clauses: clauses((f as { clauses?: unknown }).clauses) }]
                  : [],
          )
        : [];
    return { header: clauses(record.header), typedefs, unknownFrames };
}

/**
 * Plan an export: the notes, the fatal condition and what is written.
 * @param snapshot - the snapshot
 * @param options - the caller's options
 * @returns the plan
 */
function plan(snapshot: GraphSnapshot, options: (OboExportOptions & CommonExportOptions) | undefined): Plan {
    const common = resolveExportOptions(options);
    const obo = resolveOboOptions(options);
    const notes: LossNote[] = [];
    const note: NoteFn = (code, message, column = null, count = null) => {
        notes.push(Object.freeze({ code, message, column, count }));
    };
    let fatal: GraphFormatError | null = null;

    const { ids, originals, fatal: idFatal } = planIds(snapshot, common.sanitizeIds, note);
    fatal ??= idFatal;
    const folding = pairFolding(snapshot);
    const { written, edgeStart, edgeOrder, dst } = planEdges(snapshot, folding, common, note);
    const frameless = framelessNodes(snapshot, written, {
        outgoingAllowed: false,
        changed: (i) => originals.has(i),
    });
    const moved = movedNodes(
        frameless,
        Array.from(edgeOrder, (e) => dst[e]),
    );
    if (moved > 0) {
        note(
            NODE_ORDER_CODE,
            `${moved} node(s) read back at another position: placeholder nodes have no frame and read back after the written nodes`,
            null,
            moved,
        );
    }
    const rows: number[] = [];
    for (let i = 0; i < snapshot.nodeCount; i++) {
        if (frameless[i] === 0) {
            rows.push(i);
        }
    }
    const { kinds, type } = planKinds(snapshot, frameless);
    const typedefNodes = rows.filter((i) => kinds[i] === "Typedef").length;
    if (typedefNodes > 0) {
        note(
            OBO_LOSS.TYPEDEF_NODES,
            `${typedefNodes} node(s) are written as [Typedef] frames; they read back as nodes only when imported with typedefs: "nodes", and then after the other nodes, with the [Typedef] frames that declare the relations`,
            "type",
            typedefNodes,
        );
    }

    const kept = keptObo(snapshot);
    const scopes = synonymTypeScopes(kept.header);
    // the label: the label column, or a role-less name column
    const labelSlot = slotColumn(snapshot.nodes, "label", "name");
    const labelColumn = labelSlot.column;
    const label =
        labelColumn !== null && rows.every((i) => !labelColumn.isSet(i) || isTrimmed(String(labelColumn.value(i))))
            ? labelColumn
            : null;
    const tags = planTags(snapshot, rows, kinds, scopes, label);
    fatal ??= capabilityNotes(snapshot, common, {
        caps: OBO_CAPABILITIES,
        label,
        labelAssumed: labelSlot.assumed,
        edgeSlot: "a qualifier",
        note,
    });
    oboColumnNotes(snapshot, label, tags, note);
    const properties = planProperties(snapshot, rows, frameless, label, tags, type, note);

    // edges
    const relationSlot = slotColumn(snapshot.edges, "kind", RELATION_COLUMN);
    const relations = planRelations(snapshot, written, relationSlot.column, obo.relation, note);
    if (relationSlot.assumed && relationSlot.column !== null) {
        note(
            ROLE_ASSUMED_CODE,
            `edge column "${RELATION_COLUMN}" is written as each clause's relation and reads back as the relation (role kind)`,
            RELATION_COLUMN,
            relationSlot.column.length - relationSlot.column.nullCount,
        );
    }
    const weights = explicitWeights(snapshot);
    const { qualifiers, edgeColumns } = planEdgeColumns(snapshot, written, relationSlot.column, weights, note);
    emptyColumnNotes(snapshot, rows, frameless, written, note);

    const p: Plan = {
        notes,
        fatal,
        options: obo,
        ids,
        originals,
        frameless,
        kinds,
        label,
        tags,
        properties,
        edgeStart,
        edgeOrder,
        dst,
        relations,
        qualifiers,
        edgeColumns,
        weights,
        header: [],
        tail: [],
    };
    // write every frame once: the duplicate clauses, the line ends and the qualifier placement
    let stats = simulate(p, rows);
    if (!stats.qualifiersPlaced) {
        tags.delete("obo.qualifiers");
        const column = snapshot.nodes.get("obo.qualifiers");
        if (column !== null) {
            properties.push({ column, relation: "obo.qualifiers" });
            notePropertyColumn(note, column, rows, "property_value lines (relation obo.qualifiers)");
        }
        stats = simulate(p, rows);
    }
    if (stats.duplicates > 0) {
        note(
            OBO_LOSS.DUPLICATE_CLAUSE,
            `${stats.duplicates} clause(s) repeat another clause of their frame word for word (parallel edges with one relation and the same qualifiers, a repeated list item) and read back as one`,
            null,
            stats.duplicates,
        );
    }
    const header = planHeader(snapshot, kept.header, obo, rows, tags, note, stats);
    const tail = planTail(kept, rows, kinds, ids, properties, relations, edgeOrder, tags.get("xref") ?? null);
    if (stats.lineEnds > 0) {
        note(
            OBO_LOSS.LINE_END,
            `${stats.lineEnds} text(s) hold a carriage return or form feed, which OBO cannot carry; written as a line feed`,
            null,
            stats.lineEnds,
        );
    }
    return { ...p, header, tail };
}

/**
 * The vocabulary columns written as their tags: each one tagCarries() accepts, then the pairs
 * resolved (def.xrefs needs def, a def needs its def.xrefs written when that column exists, the
 * xref descriptions need their xrefs written).
 * @param snapshot - the snapshot
 * @param rows - the written nodes
 * @param kinds - the frame types
 * @param scopes - the default scope of each declared synonym type
 * @param label - the label column (never a tag)
 * @returns the columns by tag
 */
function planTags(
    snapshot: GraphSnapshot,
    rows: readonly number[],
    kinds: readonly FrameKind[],
    scopes: ReadonlyMap<string, string | null>,
    label: Column | null,
): Map<string, Column> {
    const tags = new Map<string, Column>();
    for (const name of TAG_COLUMNS) {
        const column = snapshot.nodes.get(name);
        if (column === null || column === label || (column.meta.role !== null && column.meta.role !== "label")) {
            continue;
        }
        if (
            name === UNRECOGNIZED
                ? unrecognizedCarried(column, rows, kinds)
                : tagCarries(name, column, rows, kinds, scopes)
        ) {
            tags.set(name, column);
        }
    }
    // pairs: def.xrefs needs def; xref.descriptions needs its xrefs written
    const def = tags.get("def");
    const defXrefs = tags.get("def.xrefs");
    if (defXrefs !== undefined && (def === undefined || rows.some((i) => def.isSet(i) !== defXrefs.isSet(i)))) {
        tags.delete("def.xrefs");
    }
    if (def !== undefined && !tags.has("def.xrefs") && snapshot.nodes.get("def.xrefs") !== null) {
        // a def.xrefs column that is not written would read back as the empty list on every def
        tags.delete("def");
    }
    const descriptions = tags.get("xref.descriptions");
    if (descriptions !== undefined && !rows.every((i) => describedXrefsWritten(tags, descriptions, i))) {
        tags.delete("xref.descriptions");
    }

    return tags;
}

/**
 * Whether every described xref of a node is written in one of its xref slots (so the description
 * has a place).
 * @param tags - the columns written as tags
 * @param descriptions - the `xref.descriptions` column
 * @param row - the node
 * @returns true when every description has its xref
 */
function describedXrefsWritten(tags: ReadonlyMap<string, Column>, descriptions: Column, row: number): boolean {
    const map = cellOf(descriptions, row) as Record<string, string> | undefined;
    if (map === undefined) {
        return true;
    }
    const written = new Set<string>();
    const add = (values: unknown): void => {
        if (Array.isArray(values)) {
            for (const v of values) {
                if (typeof v === "string") {
                    written.add(v);
                }
            }
        }
    };
    for (const name of ["def.xrefs", "xref"]) {
        const column = tags.get(name);
        if (column !== undefined) {
            add(cellOf(column, row));
        }
    }
    for (const name of ["synonym", "expand_assertion_to", "expand_expression_to"]) {
        const column = tags.get(name);
        const items = column === undefined ? undefined : cellOf(column, row);
        if (Array.isArray(items)) {
            for (const item of items as { xrefs: unknown }[]) {
                add(item.xrefs);
            }
        }
    }
    return Object.keys(map).every((id) => written.has(id));
}

/**
 * The OBO-only column notes: the vocabulary column of the other text dtype, and the graph columns
 * written as header property values.
 * @param snapshot - the snapshot
 * @param label - the label column written as `name`, or null
 * @param tags - the vocabulary columns written as tags
 * @param note - records a note
 */
function oboColumnNotes(
    snapshot: GraphSnapshot,
    label: Column | null,
    tags: ReadonlyMap<string, Column>,
    note: NoteFn,
): void {
    for (const [name, column] of [...tags, ...(label === null ? [] : ([["name", label]] as const))]) {
        const want = name === "name" ? "string" : OBO_NODE_COLUMNS[name].dtype;
        if (
            ((want === "string" || want === "dict") && column.dtype !== want) ||
            (column.dtype === "list" && column.child.dtype !== "string")
        ) {
            note(
                LOSS.DTYPE,
                `node column "${column.meta.name}" holds ${column.dtype === "list" ? `${column.child.dtype} items` : column.dtype}; it reads back as ${column.dtype === "list" ? "string items" : want}`,
                column.meta.name,
                column.length - column.nullCount,
            );
        }
    }
    for (const column of snapshot.graph) {
        note(
            GRAPH_COLUMN_AS_METADATA_CODE,
            `graph column "${column.meta.name}" is written as a header property_value and reads back in meta.extra.obo.header, not as a column`,
            column.meta.name,
            column.length - column.nullCount,
        );
    }
}

/**
 * The node columns written as `property_value` lines: every column that is not written by a tag,
 * the label or the type, and not one OBO leaves out (positions, visual and temporal columns), each
 * with its note.
 * @param snapshot - the snapshot
 * @param rows - the written nodes
 * @param frameless - the frameless flags
 * @param label - the label column
 * @param tags - the columns written as tags
 * @param type - the type column
 * @param note - records a note
 * @returns the columns
 */
function planProperties(
    snapshot: GraphSnapshot,
    rows: readonly number[],
    frameless: Uint8Array,
    label: Column | null,
    tags: ReadonlyMap<string, Column>,
    type: Column | null,
    note: NoteFn,
): PropertyColumn[] {
    const out: PropertyColumn[] = [];
    const slotted = new Set<Column>([
        ...tags.values(),
        ...(label === null ? [] : [label]),
        ...(type === null ? [] : [type]),
    ]);
    for (const column of snapshot.nodes) {
        const { role, name } = column.meta;
        if (slotted.has(column) || (role !== null && UNWRITTEN_ROLES.has(role))) {
            continue;
        }
        if (name === PLACEHOLDER_COLUMN && rows.every((i) => !column.isSet(i)) && frameless.some((f) => f === 1)) {
            // read back from the frameless nodes alone
            continue;
        }
        const relation = isOboWord(name) && name !== ORIGINAL_ID ? name : wordOf(name.replace(/:/g, "_"));
        out.push({ column, relation });
        notePropertyColumn(note, column, rows, `property_value lines (relation ${relation})`);
    }
    return out;
}

/**
 * The relation written for each edge, with the notes of the assumed and renamed ones.
 * @param snapshot - the snapshot
 * @param written - the written edges
 * @param relation - the relation column, or null
 * @param fallback - the relation of an edge without one
 * @param note - records a note
 * @returns the relation per edge index
 */
function planRelations(
    snapshot: GraphSnapshot,
    written: readonly number[],
    relation: Column | null,
    fallback: string,
    note: NoteFn,
): string[] {
    const out = new Array<string>(snapshot.edgeCount).fill(fallback);
    let assumed = 0;
    let renamed = 0;
    for (const e of written) {
        const value = relation === null ? undefined : cellOf(relation, e);
        if (typeof value !== "string") {
            assumed++;
            continue;
        }
        if (isOboWord(value)) {
            out[e] = value;
        } else {
            out[e] = wordOf(value);
            renamed++;
        }
    }
    if (assumed > 0) {
        note(
            OBO_LOSS.RELATION_ASSUMED,
            `${assumed} edge(s) have no relation; written as ${fallback} (an ontology reads is_a as subclassing)`,
            relation?.meta.name ?? null,
            assumed,
        );
    }
    if (renamed > 0) {
        note(
            OBO_LOSS.RELATION_RENAMED,
            `${renamed} relation(s) are not OBO ids; written with "_" in place of the space, "!", "{" or "}"`,
            relation?.meta.name ?? null,
            renamed,
        );
    }
    return out;
}

/**
 * The edge columns written as qualifiers: the vocabulary `qualifiers` column when its cells are
 * qualifier records, every other edge column (and the explicit weights) as `name="value"` pairs,
 * each with its note.
 * @param snapshot - the snapshot
 * @param written - the written edges
 * @param relation - the relation column
 * @param weights - the explicit weights
 * @param note - records a note
 * @returns the qualifiers column and the other columns
 */
function planEdgeColumns(
    snapshot: GraphSnapshot,
    written: readonly number[],
    relation: Column | null,
    weights: ExplicitWeights,
    note: NoteFn,
): { qualifiers: Column | null; edgeColumns: QualifierColumn[] } {
    let qualifiers = snapshot.edges.get(QUALIFIERS_COLUMN);
    if (
        qualifiers !== null &&
        (qualifiers.dtype !== "json" ||
            qualifiers.meta.role !== null ||
            !written.every((e) => !qualifiers?.isSet(e) || isQualifierRecord(cellOf(qualifiers, e), isQualifierName)))
    ) {
        qualifiers = null;
    }
    const edgeColumns: QualifierColumn[] = [];
    const count = (column: Column): number => written.filter((e) => column.isSet(e)).length;
    for (const column of snapshot.edges) {
        const { role, name } = column.meta;
        if (
            column === relation ||
            column === qualifiers ||
            role === "id" ||
            (role !== null && UNWRITTEN_ROLES.has(role))
        ) {
            continue;
        }
        const written2 = isQualifierName(name) ? name : wordOf(name.replace(/[=",[\]\\]/g, "_"));
        edgeColumns.push({ column, name: written2 });
        const n = count(column);
        if (n > 0) {
            note(
                OBO_LOSS.EDGE_COLUMN_AS_QUALIFIER,
                `edge column "${name}" is written as the qualifier ${written2} and reads back inside the qualifiers column${qualifiers === null ? "" : " (merged with its values)"}`,
                name,
                n,
            );
        }
    }
    if (weights.weighted) {
        const n = written.filter((e) => weights.isExplicit(e)).length;
        if (n > 0) {
            note(
                OBO_LOSS.EDGE_COLUMN_AS_QUALIFIER,
                `${n} explicit edge weight(s) are written as the qualifier ${WEIGHT_QUALIFIER} and read back inside the qualifiers column, not as weights`,
                snapshot.edges.byRole("weight")?.meta.name ?? null,
                n,
            );
        }
    }
    return { qualifiers, edgeColumns };
}

/**
 * The header lines: the kept header in the guide's order with the missing fields filled from the
 * metadata, and the graph columns as `property_value` lines.
 * @param snapshot - the snapshot
 * @param kept - the kept header
 * @param obo - the OBO options
 * @param obo.ontology - the ontology option, or null
 * @param rows - the written nodes
 * @param tags - the columns written as tags
 * @param note - records a note
 * @param stats - the line-end counter
 * @returns the lines
 */
function planHeader(
    snapshot: GraphSnapshot,
    kept: Readonly<Record<string, readonly string[]>>,
    obo: { readonly ontology: string | null },
    rows: readonly number[],
    tags: ReadonlyMap<string, Column>,
    note: NoteFn,
    stats: FrameStats,
): string[] {
    const { meta } = snapshot;
    const values = new Map<string, string[]>(Object.entries(kept).map(([tag, v]) => [tag, v.map(rawValue)]));
    const filled = new Set<string>();
    const fill = (tag: string, value: string | null): void => {
        if (value !== null && !values.has(tag)) {
            values.set(tag, [value]);
            filled.add(tag);
        }
    };
    // a file read from OBO keeps its own header; any other graph gets the fields its metadata has
    if (meta.sourceFormat !== "obo") {
        fill("format-version", "1.4");
        fill("date", oboDate(meta.created));
        fill("saved-by", meta.creator === null ? null : escapeOboValue(meta.creator));
    }
    if (obo.ontology !== null) {
        if (!values.has("ontology")) {
            filled.add("ontology");
        }
        values.set("ontology", [obo.ontology]);
    } else if (meta.name !== null && meta.name.length > 0) {
        if (/^[A-Za-z0-9_.\-/]+$/.test(meta.name)) {
            fill("ontology", meta.name);
        } else if (!values.has("ontology")) {
            const slug = meta.name.replace(/[^A-Za-z0-9_.-]/g, "_");
            note(
                OBO_LOSS.ONTOLOGY_NAME,
                `the graph name ${JSON.stringify(meta.name)} is not an ontology id; written as ${slug}`,
                null,
                null,
            );
            values.set("ontology", [slug]);
            filled.add("ontology");
        }
    }
    // a default namespace applies to every frame without one: keep it only when none lacks one
    const namespace = tags.get("namespace");
    if (values.has("default-namespace") && (namespace === undefined || rows.some((i) => !namespace.isSet(i)))) {
        values.delete("default-namespace");
    }
    const lines: string[] = [];
    // the filled fields in the guide's order, then the kept ones as the file had them
    const tagsInOrder = [
        ...HEADER_ORDER.filter((t) => filled.has(t)),
        ...[...values.keys()].filter((t) => !filled.has(t)),
    ];
    for (const tag of tagsInOrder) {
        for (const value of values.get(tag) ?? []) {
            lines.push(`${escapeTag(tag)}: ${value}`);
        }
    }
    if (lines.length === 0 && rows.length === 0) {
        // a file of nothing reads back as an empty input: the version line makes it an empty ontology
        lines.push("format-version: 1.4");
    }
    for (const column of snapshot.graph) {
        const relation = isOboWord(column.meta.name) ? column.meta.name : wordOf(column.meta.name);
        for (const line of propertyLines({ column, relation }, 0, stats)) {
            lines.push(`property_value: ${line}`);
        }
    }
    return lines;
}

/**
 * A kept raw value made safe for one line (a line break in metadata a caller built becomes `\n`).
 * @param raw - the raw value
 * @returns the value to write
 */
function rawValue(raw: string): string {
    return raw.replace(/\r\n|\r|\n|\f/g, "\\n");
}

/**
 * A tag name escaped for the left of its colon.
 * @param tag - the tag
 * @returns the escaped tag
 */
function escapeTag(tag: string): string {
    return escapeOboValue(tag).replace(/:/g, "\\:");
}

/**
 * An ISO date (`yyyy-MM-ddTHH:mm...`) as the OBO header date `dd:MM:yyyy HH:mm`.
 * @param iso - the date, or null
 * @returns the header text, or null when the date is not of that form
 */
function oboDate(iso: string | null): string | null {
    const m = iso === null ? null : /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(iso);
    if (m === null) {
        return null;
    }
    return `${m[3]}:${m[2]}:${m[1]} ${m[4] ?? "00"}:${m[5] ?? "00"}`;
}

/**
 * The frames after the nodes: the kept Typedefs (unless a node is that Typedef), a declaration of
 * every relation and property-value relation no Typedef declares, and the kept unknown frames.
 * @param kept - the kept records
 * @param kept.typedefs - the kept Typedef frames
 * @param kept.unknownFrames - the kept unknown frames
 * @param rows - the written nodes
 * @param kinds - the frame types
 * @param ids - the written ids
 * @param properties - the property-value columns
 * @param relations - the relation per edge
 * @param edges - the written edges
 * @param xref - the xref column written as tags (a Typedef node's xrefs declare relations), or null
 * @returns the lines
 */
function planTail(
    kept: {
        typedefs: Record<string, Record<string, string[]>>;
        unknownFrames: { type: string; clauses: Record<string, string[]> }[];
    },
    rows: readonly number[],
    kinds: readonly FrameKind[],
    ids: readonly string[],
    properties: readonly PropertyColumn[],
    relations: readonly string[],
    edges: Iterable<number>,
    xref: Column | null,
): string[] {
    const lines: string[] = [];
    const declared = new Set<string>(BUILTIN_RELATIONS);
    for (const i of rows) {
        if (kinds[i] === "Typedef") {
            declared.add(ids[i]);
            const xrefs = xref === null ? undefined : cellOf(xref, i);
            for (const x of Array.isArray(xrefs) ? xrefs : []) {
                declared.add(String(x));
            }
        }
    }
    for (const [id, clauses] of Object.entries(kept.typedefs)) {
        if (declared.has(id) && !BUILTIN_RELATIONS.has(id)) {
            continue;
        }
        declared.add(id);
        lines.push("", "[Typedef]", `id: ${escapeOboWord(id)}`);
        for (const [tag, values] of Object.entries(clauses)) {
            if (tag !== "id") {
                for (const value of values) {
                    lines.push(`${escapeTag(tag)}: ${rawValue(value)}`);
                }
            }
        }
        for (const xref of clauses.xref ?? []) {
            declared.add(xref.trim());
        }
    }
    const declare = (relation: string, metadata: boolean): void => {
        if (declared.has(relation)) {
            return;
        }
        declared.add(relation);
        lines.push("", "[Typedef]", `id: ${escapeOboWord(relation)}`, `name: ${escapeOboValue(relation)}`);
        if (metadata) {
            lines.push("is_metadata_tag: true");
        }
    };
    const used = new Set<string>();
    for (const e of edges) {
        used.add(relations[e]);
    }
    for (const { column, relation } of properties) {
        if (rows.some((i) => column.isSet(i))) {
            declare(relation, true);
        }
    }
    for (const relation of used) {
        declare(relation, false);
    }
    for (const frame of kept.unknownFrames) {
        lines.push("", `[${frame.type.replace(/[\]\r\n]/g, "_")}]`);
        for (const [tag, values] of Object.entries(frame.clauses)) {
            for (const value of values) {
                lines.push(`${escapeTag(tag)}: ${rawValue(value)}`);
            }
        }
    }
    return lines;
}

// ============================================================ the frames

/** Hands out the `obo.qualifiers` entries of one frame to the clauses they belong to, in order. */
class QualifierCursor {
    private readonly entries: Record<string, { value: string; qualifiers: unknown }[]>;

    private readonly next = new Map<string, number>();

    /**
     * Create a cursor.
     * @param cell - the frame's `obo.qualifiers` cell, or undefined
     */
    constructor(cell: unknown) {
        this.entries = (cell ?? {}) as Record<string, { value: string; qualifiers: unknown }[]>;
    }

    /**
     * The qualifier block of a clause: the next entry of its tag when that entry is for this value.
     * @param tag - the tag (or `<tag>.xrefs` for an xref inside a list)
     * @param value - the clause's value as the column holds it
     * @returns the block with a leading space, or ""
     */
    block(tag: string, value: string): string {
        const list = Object.prototype.hasOwnProperty.call(this.entries, tag) ? this.entries[tag] : undefined;
        const k = this.next.get(tag) ?? 0;
        if (list === undefined || k >= list.length || list[k].value !== value) {
            return "";
        }
        this.next.set(tag, k + 1);
        return qualifierBlock(qualifierPairs(list[k].qualifiers));
    }

    /**
     * Whether every entry found its clause.
     * @returns true when all were placed
     */
    placed(): boolean {
        return Object.entries(this.entries).every(([tag, list]) => (this.next.get(tag) ?? 0) === list.length);
    }
}

/** The per-frame writer state. */
interface FrameState {
    readonly p: Plan;
    readonly row: number;
    readonly cursor: QualifierCursor;
    /** The xrefs whose description was written already. */
    readonly described: Set<string>;
    readonly stats: FrameStats;
}

/**
 * Count a text that loses a line end, and return it.
 * @param s - the frame state's stats
 * @param text - the text
 * @returns the text
 */
function counted(s: FrameStats, text: string): string {
    if (hasLineEnd(text)) {
        s.lineEnds++;
    }
    return text;
}

/**
 * One xref as written inside a list or after `xref:`: its id, its description the first time the
 * frame names it, and its own qualifiers.
 * @param f - the frame state
 * @param id - the xref id
 * @param listTag - the `<tag>.xrefs` key of its qualifiers, or null after `xref:`
 * @returns the text
 */
function xrefText(f: FrameState, id: string, listTag: string | null): string {
    let out = escapeOboValue(counted(f.stats, id));
    const descriptions = f.p.tags.get("xref.descriptions");
    const map =
        descriptions === undefined ? undefined : (cellOf(descriptions, f.row) as Record<string, string> | undefined);
    if (map !== undefined && Object.prototype.hasOwnProperty.call(map, id) && !f.described.has(id)) {
        f.described.add(id);
        out += ` "${escapeOboQuoted(counted(f.stats, map[id]))}"`;
    }
    if (listTag !== null) {
        out += f.cursor.block(listTag, id);
    }
    return out;
}

/**
 * An xref list: `[A:1, B:2 "description"]`.
 * @param f - the frame state
 * @param ids - the xref ids
 * @param tag - the clause's tag
 * @returns the list
 */
function xrefList(f: FrameState, ids: readonly string[], tag: string): string {
    return `[${ids.map((id) => xrefText(f, id, `${tag}.xrefs`)).join(", ")}]`;
}

/**
 * The `property_value` values of one cell of a property column: `relation "value" xsd:type` per
 * value (a list item each, JSON text for nested values).
 * @param prop - the column and its relation
 * @param row - the row
 * @param stats - the line-end counter
 * @returns the values after `property_value: `
 */
function propertyLines(prop: PropertyColumn, row: number, stats: FrameStats): string[] {
    const { column, relation } = prop;
    const value = cellOf(column, row);
    if (value === undefined) {
        return [];
    }
    const head = escapeOboWord(relation);
    const one = (v: unknown, dtype: string): string => {
        let text: string;
        let xsd = XSD[dtype] ?? "xsd:string";
        if (typeof v === "number" && xsd === "xsd:double") {
            text = xsdDouble(v, dtype);
        } else if (typeof v === "string" || typeof v === "boolean" || typeof v === "number") {
            text = textOf(v, dtype);
        } else {
            text = JSON.stringify(v) ?? "null";
            xsd = "xsd:string";
        }
        return `${head} "${escapeOboQuoted(counted(stats, text))}" ${xsd}`;
    };
    if (column.dtype === "list") {
        return (value as readonly unknown[]).map((item) => one(item, column.child.dtype));
    }
    if (column.dtype === "json" || column.meta.components > 1) {
        return [one(value, "json")];
    }
    return [one(value, column.dtype)];
}

/**
 * A double as xsd:double writes it: INF, -INF and NaN for the non-finite values.
 * @param v - the value
 * @param dtype - the column dtype (f32 values use their shortest text)
 * @returns the text
 */
function xsdDouble(v: number, dtype: string): string {
    if (Number.isNaN(v)) {
        return "NaN";
    }
    if (!Number.isFinite(v)) {
        return v > 0 ? "INF" : "-INF";
    }
    return formatNumber(v, dtype === "f32" ? "f32" : "f64");
}

/**
 * The qualifier block of one edge: the `qualifiers` record, then the other columns and the weight.
 * @param f - the frame state
 * @param e - the edge
 * @returns the block with a leading space, or ""
 */
function edgeQualifiers(f: FrameState, e: number): string {
    const { p } = f;
    const pairs: [string, string][] = [];
    if (p.qualifiers !== null) {
        const record = cellOf(p.qualifiers, e);
        if (record !== undefined) {
            pairs.push(...qualifierPairs(record));
        }
    }
    for (const { column, name } of p.edgeColumns) {
        const value = cellOf(column, e);
        if (value === undefined) {
            continue;
        }
        if (column.dtype === "list") {
            for (const item of value as readonly unknown[]) {
                pairs.push([name, textOf(item, column.child.dtype)]);
            }
        } else {
            pairs.push([
                name,
                column.dtype === "json" ? (JSON.stringify(value) ?? "null") : textOf(value, column.dtype),
            ]);
        }
    }
    const weight = p.weights.text(e);
    if (weight !== null) {
        pairs.push([WEIGHT_QUALIFIER, weight]);
    }
    for (const [, value] of pairs) {
        counted(f.stats, value);
    }
    return qualifierBlock(pairs);
}

/**
 * The clauses of one tag column on a frame.
 * @param f - the frame state
 * @param tag - the tag
 * @param column - the column
 * @param out - the lines
 */
function tagLines(f: FrameState, tag: string, column: Column, out: string[]): void {
    const value = cellOf(column, f.row);
    if (value === undefined) {
        return;
    }
    const { cursor, stats } = f;
    const push = (text: string, stored: string, raw = false): void => {
        out.push(`${tag}: ${raw ? text : escapeOboValue(counted(stats, text))}${cursor.block(tag, stored)}`);
    };
    if (TEXT_TAGS.has(tag)) {
        push(value as string, value as string);
        return;
    }
    if (BOOL_TAGS.has(tag)) {
        push(value ? "true" : "false", value ? "true" : "false", true);
        return;
    }
    if (ID_LIST_TAGS.has(tag)) {
        for (const id of value as string[]) {
            push(escapeOboWord(id), id, true);
        }
        return;
    }
    switch (tag) {
        case "def": {
            const xrefs = f.p.tags.get("def.xrefs");
            const ids = (xrefs === undefined ? [] : (cellOf(xrefs, f.row) ?? [])) as string[];
            out.push(
                `def: "${escapeOboQuoted(counted(stats, value as string))}" ${xrefList(f, ids, "def")}${cursor.block("def", value as string)}`,
            );
            return;
        }
        case "xref":
            for (const id of value as string[]) {
                out.push(`xref: ${xrefText(f, id, null)}${cursor.block("xref", id)}`);
            }
            return;
        case "synonym":
            for (const s of value as {
                text: string;
                scope: string;
                type: string | null;
                xrefs: string[];
                qualifiers?: unknown;
            }[]) {
                const type = s.type === null ? "" : ` ${escapeOboWord(s.type)}`;
                const block = s.qualifiers === undefined ? "" : qualifierBlock(qualifierPairs(s.qualifiers));
                out.push(
                    `synonym: "${escapeOboQuoted(counted(stats, s.text))}" ${s.scope}${type} ${xrefList(f, s.xrefs, "synonym")}${block}`,
                );
            }
            return;
        case "intersection_of":
            for (const x of value as { relation: string | null; target: string; qualifiers?: unknown }[]) {
                const relation = x.relation === null ? "" : `${escapeOboWord(x.relation)} `;
                const block = x.qualifiers === undefined ? "" : qualifierBlock(qualifierPairs(x.qualifiers));
                out.push(`intersection_of: ${relation}${escapeOboWord(x.target)}${block}`);
            }
            return;
        case "property_value":
            for (const x of value as {
                relation: string;
                value: string;
                datatype: string | null;
                qualifiers?: unknown;
            }[]) {
                const block = x.qualifiers === undefined ? "" : qualifierBlock(qualifierPairs(x.qualifiers));
                const literal =
                    x.datatype === null && isOboWord(x.value)
                        ? escapeOboWord(x.value)
                        : `"${escapeOboQuoted(counted(stats, x.value))}"${x.datatype === null ? "" : ` ${escapeOboWord(x.datatype)}`}`;
                out.push(`property_value: ${escapeOboWord(x.relation)} ${literal}${block}`);
            }
            return;
        case "holds_over_chain":
        case "equivalent_to_chain":
            for (const [a, b] of value as [string, string][]) {
                out.push(`${tag}: ${escapeOboWord(a)} ${escapeOboWord(b)}${cursor.block(tag, `${a} ${b}`)}`);
            }
            return;
        case "expand_assertion_to":
        case "expand_expression_to":
            for (const x of value as { template: string; xrefs: string[]; qualifiers?: unknown }[]) {
                const block = x.qualifiers === undefined ? "" : qualifierBlock(qualifierPairs(x.qualifiers));
                out.push(
                    `${tag}: "${escapeOboQuoted(counted(stats, x.template))}" ${xrefList(f, x.xrefs, tag)}${block}`,
                );
            }
            return;
        case UNRECOGNIZED:
            for (const [unknown, values] of Object.entries(value as Record<string, string[]>)) {
                for (const v of values) {
                    out.push(`${escapeTag(unknown)}: ${escapeOboValue(counted(stats, v))}`);
                }
            }
            return;
        default:
            // def.xrefs, xref.descriptions and obo.qualifiers are written with the clauses they belong to
            return;
    }
}

/**
 * The lines of one node's frame.
 * @param p - the plan
 * @param row - the node
 * @param stats - the counters
 * @returns the lines, the frame header first
 */
function frameLines(p: Plan, row: number, stats: FrameStats): string[] {
    const qualifiersColumn = p.tags.get("obo.qualifiers");
    const f: FrameState = {
        p,
        row,
        cursor: new QualifierCursor(qualifiersColumn === undefined ? undefined : cellOf(qualifiersColumn, row)),
        described: new Set(),
        stats,
    };
    const out = [`[${p.kinds[row]}]`, `id: ${escapeOboWord(p.ids[row])}`];
    for (const tag of TAG_ORDER) {
        if (tag === "name") {
            const name = p.label === null ? undefined : cellOf(p.label, row);
            if (typeof name === "string") {
                const text = name;
                out.push(`name: ${escapeOboValue(counted(stats, text))}${f.cursor.block("name", text)}`);
            }
            continue;
        }
        if (tag === "property_value") {
            const original = p.originals.get(row);
            if (original !== undefined) {
                // as JSON text, so a carriage return in the original survives
                out.push(`property_value: ${ORIGINAL_ID} "${escapeOboQuoted(JSON.stringify(original))}" xsd:string`);
            }
            const column = p.tags.get(tag);
            if (column !== undefined) {
                tagLines(f, tag, column, out);
            }
            for (const prop of p.properties) {
                for (const line of propertyLines(prop, row, stats)) {
                    out.push(`property_value: ${line}`);
                }
            }
            continue;
        }
        if (tag === EDGES) {
            for (let k = p.edgeStart[row]; k < p.edgeStart[row + 1]; k++) {
                const e = p.edgeOrder[k];
                const target = escapeOboWord(p.ids[p.dst[e]]);
                const relation = p.relations[e];
                const block = edgeQualifiers(f, e);
                if (relation === "is_a" || (relation === "instance_of" && p.kinds[row] === "Instance")) {
                    out.push(`${relation}: ${target}${block}`);
                } else {
                    out.push(`relationship: ${escapeOboWord(relation)} ${target}${block}`);
                }
            }
            continue;
        }
        const column = p.tags.get(tag);
        if (column !== undefined) {
            tagLines(f, tag, column, out);
        }
    }
    stats.qualifiersPlaced &&= f.cursor.placed();
    return out;
}

/**
 * Write every frame once without keeping the text: count the clauses that repeat another of their
 * frame (the importer reads them as one), the line ends and whether the qualifiers were placed.
 * @param p - the plan
 * @param rows - the written nodes
 * @returns the counts
 */
function simulate(p: Plan, rows: readonly number[]): FrameStats & { duplicates: number } {
    const stats = { lineEnds: 0, qualifiersPlaced: true, duplicates: 0 };
    for (const i of rows) {
        const lines = frameLines(p, i, stats);
        const seen = new Set<string>();
        for (let k = 2; k < lines.length; k++) {
            if (seen.has(lines[k])) {
                stats.duplicates++;
            }
            seen.add(lines[k]);
        }
    }
    return stats;
}

/**
 * The text parts of the file: the header, one frame per written node, the tail frames.
 * @param p - the plan
 * @yields the header and one part per frame
 * @returns nothing
 */
function* write(p: Plan): Generator<string, void, undefined> {
    if (p.fatal !== null) {
        throw p.fatal;
    }
    yield p.header.map((line) => `${line}\n`).join("");
    const stats: FrameStats = { lineEnds: 0, qualifiersPlaced: true };
    for (let i = 0; i < p.ids.length; i++) {
        if (p.frameless[i] === 0) {
            yield `\n${frameLines(p, i, stats).join("\n")}\n`;
        }
    }
    if (p.tail.length > 0) {
        yield `${p.tail.join("\n")}\n`;
    }
}

/**
 * The text parts of an export, planned when the first part is asked for, so a refused option
 * rejects the export instead of throwing from the call.
 * @param snapshot - the snapshot
 * @param options - format-specific and common options
 * @yields the parts
 * @returns nothing
 */
function* written(
    snapshot: GraphSnapshot,
    options: (OboExportOptions & CommonExportOptions) | undefined,
): Generator<string, void, undefined> {
    yield* write(plan(snapshot, options));
}

/**
 * The OBO exporter plugin.
 * @category Built-in formats
 */
export const oboExporter: GraphExporter<OboExportOptions> = Object.freeze({
    format: "obo",
    capabilities: OBO_CAPABILITIES,

    /**
     * Pre-flight: what export() would lose, without writing anything.
     * @param snapshot - the snapshot
     * @param options - format-specific and common options
     * @returns the notes, empty when the export is exact
     */
    check(snapshot: GraphSnapshot, options?: OboExportOptions & CommonExportOptions): readonly LossNote[] {
        return Object.freeze([...plan(snapshot, options).notes]);
    },

    /**
     * Write the file as UTF-8 chunks.
     * @param snapshot - the snapshot
     * @param options - format-specific and common options
     * @returns the chunks
     */
    export(snapshot: GraphSnapshot, options?: OboExportOptions & CommonExportOptions): AsyncIterable<Uint8Array> {
        return encodeChunks(written(snapshot, options));
    },

    /**
     * Write the file as one string.
     * @param snapshot - the snapshot
     * @param options - format-specific and common options
     * @returns the file
     */
    exportToString(snapshot: GraphSnapshot, options?: OboExportOptions & CommonExportOptions): Promise<string> {
        return joinText(written(snapshot, options));
    },
});
