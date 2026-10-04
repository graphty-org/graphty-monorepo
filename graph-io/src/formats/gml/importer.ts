/**
 * The GML importer (design sections 8.4 and 8.5, research note 07 section 2.2): reads a whole GML
 * text (GML awaits the whole text, 8.4), lexes it once into a typed token list, derives the column
 * schema of every node, edge and graph key in a first walk (GML types are lexical per value, so
 * the column dtype is the union of the value classes seen: `int` -> i32, `real` -> f64, `string`
 * -> string, a nested `[ ]` record -> json, a repeated key -> list; the class is recorded in
 * `origin.type` per column as 8.5 requires), then pushes scalars into the sink in a second walk:
 * every node block first, then every edge block, so node indices follow the file's node order
 * and forward edge references resolve.
 *
 * Conventions honored: NetworkX's `_networkx_list_start` marker and `"[]"` empty lists, `&#NN;`
 * character references in strings, `Creator` / `Version` top-level metadata, `directed 0|1` and
 * `multigraph 0|1` graph flags, comments, keys and values on one line or split across lines, and
 * a `graphics [ x y z ]` node record mapped to the `position` role (note 07 section 9) with the
 * remaining graphics keys kept as a json column.
 *
 * Node ids are the `id` keys under `nodeIdFrom: "id"`, the `label` under `"label"`, and the node's
 * ordinal under `"index"`; `source` / `target` always resolve through the `id` keys. The GML spec
 * types ids as integers; a string id (written by NetworkX and Gephi) is accepted under the `ids`
 * rule with one warning per file, and a real or record id is a validation error. A node's
 * `graphty_originalId` key written by the exporter's `sanitizeIds: "mangle"` restores the
 * original id under `restoreMangledIds` (the default).
 */

import {
    type ColumnDecl,
    type ColumnHandle,
    type ColumnRole,
    type Dtype,
    GraphFormatError,
    type GraphSink,
    INVALID_INDEX,
    type NodeId,
    type ScalarDtype,
} from "@graphty/graph-format";

import { declareResolved, DictHeuristic, uniqueColumnName } from "../../common/attributes.js";
import {
    COLUMN_RENAMED_CODE,
    DUPLICATE_NODE_CODE as SHARED_DUPLICATE_NODE_CODE,
    MISSING_ENDPOINT_CODE as SHARED_MISSING_ENDPOINT_CODE,
    MISSING_ID_CODE as SHARED_MISSING_ID_CODE,
    MULTIPLE_GRAPHS_CODE,
    NO_GRAPH_CODE as SHARED_NO_GRAPH_CODE,
    PRECISION_CODE as SHARED_PRECISION_CODE,
    ROLE_TAKEN_CODE as SHARED_ROLE_TAKEN_CODE,
    WIDENED_CODE as SHARED_WIDENED_CODE,
} from "../../common/codes.js";
import { DirectionResolver } from "../../common/direction.js";
import { IdCoercer } from "../../common/ids.js";
import { readText, throwIfAborted } from "../../common/input.js";
import {
    type ImportFormatDefaults,
    reportSinkOptions,
    reportUnusedOptions,
    type ResolvedImportOptions,
    resolveImportOptions,
} from "../../common/options.js";
import { ImportReportBuilder } from "../../common/report.js";
import { parseWeightText, weightFromValue } from "../../common/weights.js";
import { type CommonImportOptions, type GraphImporter, type ImportInput, type ImportReport } from "../../types.js";
import {
    EMPTY_LIST_TEXT,
    EMPTY_TUPLE_TEXT,
    GmlSyntaxError,
    type GmlTokens,
    LIST_START_MARKER,
    numberOfText,
    ORIGINAL_ID_KEY,
    parseRecord,
    scalarOrRecord,
    TOKEN_INT,
    TOKEN_OPEN,
    TOKEN_REAL,
    TOKEN_STRING,
    TOKEN_WORD,
    tokenizeGml,
} from "./syntax.js";

/**
 * The format-specific options of the GML importer.
 * @category Built-in formats
 */
export interface GmlImportOptions extends CommonImportOptions {
    /**
     * Read a node's `graphics [ x y z ]` record as its position; false keeps the whole record as a
     * JSON attribute named `graphics`.
     * @defaultValue true
     */
    positions?: boolean | undefined;
    /**
     * Store a text attribute whose values repeat a lot (fewer distinct values than half the rows)
     * as a dictionary column, which uses less memory and reads the same. Such a column reports
     * `meta.dtype` "dict" instead of "string". A column with a role, such as the `label` column,
     * always stays "string".
     * @defaultValue true
     */
    dictionaries?: boolean | undefined;
}

/**
 * The text holds no `graph [ ... ]` block.
 * @category Issue and loss codes
 */
export const NO_GRAPH_CODE = SHARED_NO_GRAPH_CODE;
/**
 * The text holds more than one `graph [ ... ]` block; import() reads the first, importAll() every one.
 * @category Issue and loss codes
 */
export const SECOND_GRAPH_CODE = MULTIPLE_GRAPHS_CODE;
/**
 * A node block has no `id` key.
 * @category Issue and loss codes
 */
export const MISSING_ID_CODE = SHARED_MISSING_ID_CODE;
/**
 * A node block has no `label` key under `nodeIdFrom: "label"`.
 * @category Issue and loss codes
 */
export const MISSING_LABEL_CODE = "E_GML_MISSING_LABEL";
/**
 * An edge block has no `source` or no `target` key.
 * @category Issue and loss codes
 */
export const MISSING_ENDPOINT_CODE = SHARED_MISSING_ENDPOINT_CODE;
/**
 * An `id`, `source` or `target` value is neither an integer nor a string.
 * @category Issue and loss codes
 */
export const ID_TYPE_CODE = "E_GML_ID_TYPE";
/**
 * Node ids, sources or targets are text, where GML expects integers. They are read under the `ids` option. Reported
 * once per file.
 * @category Issue and loss codes
 */
export const STRING_ID_CODE = "W_GML_STRING_ID";
/**
 * A node id (or label under `nodeIdFrom: "label"`) is declared twice; later keys overwrite.
 * @category Issue and loss codes
 */
export const DUPLICATE_NODE_CODE = SHARED_DUPLICATE_NODE_CODE;
/**
 * A structural key (`id`, `source`, `target`) appears twice in one block.
 * @category Issue and loss codes
 */
export const REPEATED_KEY_CODE = "E_GML_REPEATED_KEY";
/**
 * A `node` or `edge` key whose value is not a `[ ... ]` block.
 * @category Issue and loss codes
 */
export const ELEMENT_TYPE_CODE = "E_GML_ELEMENT_TYPE";
/**
 * A `directed` or `multigraph` flag that is not an integer.
 * @category Issue and loss codes
 */
export const FLAG_TYPE_CODE = "E_GML_FLAG_TYPE";
/**
 * A `directed` / `multigraph` flag that is not 0 or 1 (read as its truth value), one written as a quoted integer, or
 * one repeated.
 * @category Issue and loss codes
 */
export const FLAG_VALUE_CODE = "W_GML_FLAG_VALUE";

/** A flag written as a quoted integer, surrounding spaces allowed. */
const QUOTED_INT = /^\s*[+-]?[0-9]+\s*$/;
/**
 * A named entity in a string that is neither an XML nor an ISO-8859-1 HTML entity, or a numeric reference beyond
 * U+10FFFF; it is kept as written.
 * @category Issue and loss codes
 */
export const UNKNOWN_ENTITY_CODE = "W_GML_UNKNOWN_ENTITY";
/**
 * A node's `graphics` value cannot give a position as written (not a record, repeated in the node, or with an x / y /
 * z that is not one number); the value is kept in the graphics json column. Warned once per kind of problem, naming
 * the first node.
 * @category Issue and loss codes
 */
export const GRAPHICS_CODE = "W_GML_GRAPHICS";
/**
 * A `graph`, `node` or `edge` record inside a node or edge; kept as a json column, not read as structure.
 * @category Issue and loss codes
 */
export const NESTED_ELEMENT_CODE = "W_GML_NESTED_ELEMENT";
/**
 * YEd's group keys (`isGroup`, `gid`); kept as plain node columns, the hierarchy is not read as containment.
 * @category Issue and loss codes
 */
export const GROUPS_CODE = "W_GML_GROUPS";
/**
 * A key whose values mix numbers and strings; the column is string, the numbers kept as written.
 * @category Issue and loss codes
 */
export const WIDENED_CODE = SHARED_WIDENED_CODE;
/**
 * An integer above 2^53 was stored as the nearest JavaScript number, so its last digits may differ. Pass `long:
 * "string"` to keep every digit as text.
 * @category Issue and loss codes
 */
export const PRECISION_CODE = SHARED_PRECISION_CODE;
/**
 * Two attributes would have had the same name, so this one was renamed `<name>#<key>`.
 * @category Plugin helpers
 */
export const COLUMN_RENAMED_CODE_GML = COLUMN_RENAMED_CODE;
/**
 * You read into a graph builder that already has an attribute with this role, so this file's attribute is kept without
 * the role.
 * @category Issue and loss codes
 */
export const ROLE_TAKEN_CODE = SHARED_ROLE_TAKEN_CODE;
/**
 * Under `nodeIdFrom` "label" / "index" the integer `id` keys are not kept.
 * @category Issue and loss codes
 */
export const ID_DROPPED_CODE = "W_GML_ID_DROPPED";

const FORMAT_DEFAULTS: ImportFormatDefaults = { ids: "canonical", defaultDirected: false, weightFrom: "value" };

const KIND_INT = 1;
const KIND_REAL = 2;
const KIND_STRING = 4;
const KIND_RECORD = 8;

const I32_MIN = -2147483648;
const I32_MAX = 2147483647;

/** How many elements are pushed between abort-signal checks. */
const ABORT_CHECK_INTERVAL = 64;

/** The common options the GML importer reads (the rest is reported by reportUnusedOptions). */
const USED_OPTIONS: ReadonlySet<keyof CommonImportOptions> = new Set<keyof CommonImportOptions>([
    "ids",
    "nodeIdFrom",
    "addMissingNodes",
    "duplicateEdges",
    "selfLoops",
    "onMixedDirection",
    "defaultDirected",
    "weightFrom",
    "weightDtype",
    "restoreMangledIds",
    "errorLimit",
    "signal",
    "onProgress",
]);

/** The element sequence number of the graph block's own keys. */
const GRAPH_SEQ = -1;
/** The element sequence number of the top-level keys. */
const TOP_SEQ = -2;

/** The GML value class a column stores. */
type GmlKind = "int" | "real" | "string" | "record";

/** What the first walk learns about one key of one table. */
interface KeySchema {
    /** The key as written. */
    readonly key: string;
    /** The union of value classes seen (KIND_* bits). */
    kinds: number;
    /** Whether the key repeats within one element, or uses a list marker. */
    list: boolean;
    /** The element sequence the key was last seen in. */
    lastSeq: number;
    /** Whether an integer outside the i32 range was seen. */
    wide: boolean;
    /** Whether an integer beyond 2^53 was seen. */
    unsafe: boolean;
    /** The dictionary heuristic while every value is a string, else null. */
    dict: DictHeuristic | null;
    /** Node `graphics` only: some row has numeric x and y. */
    position: boolean;
    /** Node `graphics` only: some row keeps keys besides the position. */
    rest: boolean;
}

/** The column a key maps to in the second walk. */
interface ColumnPlan {
    /** The key as written. */
    readonly key: string;
    /** The column name (renamed `<name>#<key>` when the sink held the name with another shape). */
    name: string;
    /** The column dtype. */
    readonly dtype: Dtype;
    /** The list item dtype, or null. */
    readonly itemDtype: ScalarDtype | null;
    /** How scalar values (or list items) are converted. */
    readonly kind: GmlKind;
    /** Whether the column is a list. */
    readonly list: boolean;
    /** The role, or null. */
    readonly role: ColumnRole | null;
    /** Whether the values come from the top level of the file (graph table only). */
    readonly top: boolean;
    /** Node `graphics` with the position mapping: the position column plan, or null. */
    readonly position: ColumnPlan | null;
    /** Node `graphics` with the position mapping: the json column of the remaining keys, or null. */
    readonly rest: ColumnPlan | null;
    /** The handle once declared. */
    handle: ColumnHandle;
    /** Whether the declaration was attempted (a failed one reuses the sink's column or is null). */
    declared: boolean;
    /** The list items of the current element. */
    items: unknown[] | null;
    /** The element sequence the items belong to. */
    seq: number;
}

/** A table's plans by key. */
type PlanMap = Map<string, ColumnPlan>;

/** Where a node issue is recorded. */
interface IssueWhere {
    readonly line: number;
    readonly element: string;
}

/**
 * Whether a key is the label of a node or edge (text, never a NetworkX list marker).
 * @param domain - the table
 * @param key - the key
 * @returns true for a node or edge label
 */
function isLabel(domain: "node" | "edge" | "graph", key: string): boolean {
    return roleOf(domain, key) === "label";
}

/**
 * Whether a parsed value is a GML record.
 * @param value - the value
 * @returns true for a record object
 */
function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Whether a key gets a role in its table (design section 5.6 applied to GML keys).
 * @param domain - the table
 * @param key - the key
 * @returns the role, or null
 */
function roleOf(domain: "node" | "edge" | "graph", key: string): ColumnRole | null {
    if (key === "label" && domain !== "graph") {
        return "label";
    }
    if (domain === "edge") {
        if (key === "id") {
            return "id";
        }
        if (key === "key") {
            return "key";
        }
    }
    return null;
}

/** One import call. */
class GmlImport {
    private readonly sink: GraphSink;

    private readonly report: ImportReportBuilder;

    private readonly options: ResolvedImportOptions;

    private readonly positions: boolean;

    private readonly dictionaries: boolean;

    private readonly coercer: IdCoercer;

    private tokens: GmlTokens | null = null;

    /** How many `graph [ ... ]` blocks the text holds (known after the scan). */
    graphCount = 0;

    private resolver: DirectionResolver | null = null;

    private readonly nodeSchema = new Map<string, KeySchema>();

    private readonly edgeSchema = new Map<string, KeySchema>();

    private readonly graphSchema = new Map<string, KeySchema>();

    private readonly topSchema = new Map<string, KeySchema>();

    private readonly nodePlans: PlanMap = new Map();

    private readonly edgePlans: PlanMap = new Map();

    private readonly graphPlans: PlanMap = new Map();

    private readonly topPlans: PlanMap = new Map();

    private readonly graphNames = new Set<string>();

    private graphOpen = -1;

    private directedToken = -1;

    private multigraphToken = -1;

    private creatorToken = -1;

    private versionToken = -1;

    private nodeCount = 0;

    private edgeCount = 0;

    private weightKinds = 0;

    private hasOriginalId = false;

    private headerDirected = false;

    private seq = 0;

    private nodeOrdinal = 0;

    private elementsSinceCheck = 0;

    /** The sink id every file id maps to when they differ (label / index / restored ids), else null. */
    private idMap: Map<NodeId, NodeId> | null = null;

    /** The file ids of node blocks that were skipped: an edge naming one is skipped too, never given a new node. */
    private readonly skippedIds = new Set<NodeId>();

    /** Node indices declared by a node block of this import, for duplicate detection. */
    private declared = new Uint32Array(64);

    /** The list plans touched by the current node or edge. */
    private readonly touched: ColumnPlan[] = [];

    /** The list plans touched by the graph table's keys. */
    private readonly graphTouched: ColumnPlan[] = [];

    /** The sequence number of the current node or edge, which its list items belong to. */
    private seqNow = 0;

    /**
     * Create one import.
     * @param sink - the sink
     * @param report - the report
     * @param options - the resolved common options
     * @param format - the format-specific options
     * @param which - which `graph [ ... ]` block to read (0: the first)
     */
    constructor(
        sink: GraphSink,
        report: ImportReportBuilder,
        options: ResolvedImportOptions,
        format: GmlImportOptions | undefined,
        private readonly which = 0,
    ) {
        this.sink = sink;
        this.report = report;
        this.options = options;
        this.positions = format?.positions ?? true;
        this.dictionaries = format?.dictionaries ?? true;
        this.coercer = new IdCoercer(options.ids);
    }

    /**
     * Run the import over the tokens of a text.
     * @param tokens - the whole text, tokenized (tokenize())
     */
    run(tokens: GmlTokens): void {
        this.tokens = tokens;
        tokens.onUnknownEntity = (entity, line) => {
            this.report.warnOnce(
                "parse-error",
                UNKNOWN_ENTITY_CODE,
                `character entity ${entity} cannot be decoded; it is kept as written`,
                { line, element: entity },
                `${UNKNOWN_ENTITY_CODE}:${entity}`,
            );
        };
        this.scan();
        this.push();
    }

    // ============================================================ pass 1: the schema

    /**
     * Walk the top level: find the graph block, the metadata keys and the top-level attributes,
     * and derive every table's schema.
     */
    private scan(): void {
        const t = this.requireTokens();
        let scalarGraph = -1;
        for (let p = 0; p < t.count; p = t.nextPair(p)) {
            const key = t.textOf(p);
            const v = p + 1;
            const record = t.kind[v] === TOKEN_OPEN;
            if (key === "graph" && !record && scalarGraph < 0) {
                scalarGraph = v;
            }
            if (key === "graph" && record) {
                if (this.graphCount++ === this.which) {
                    this.graphOpen = v;
                    this.scanGraph(v);
                }
            } else if (key === "Creator" && !record && this.creatorToken < 0) {
                this.creatorToken = v;
            } else if (key === "Version" && !record && this.versionToken < 0) {
                this.versionToken = v;
            } else {
                this.observe(this.topSchema, "graph", key, v, TOP_SEQ);
            }
        }
        if (this.graphOpen < 0) {
            if (scalarGraph >= 0) {
                this.report.fail(
                    NO_GRAPH_CODE,
                    `the graph key at line ${t.line[scalarGraph]} holds ${describeValue(t, scalarGraph)}, not a [ ... ] block; the input contains no graph block`,
                    { line: t.line[scalarGraph] },
                );
            }
            this.report.fail(NO_GRAPH_CODE, "the input contains no graph [ ... ] block", { line: null });
        }
    }

    /**
     * Walk the graph block for the schema.
     * @param open - the index of the block's `[`
     */
    private scanGraph(open: number): void {
        const t = this.requireTokens();
        const close = t.match[open];
        for (let p = open + 1; p < close; p = t.nextPair(p)) {
            const key = t.textOf(p);
            const v = p + 1;
            switch (key) {
                case "node":
                    if (t.kind[v] === TOKEN_OPEN) {
                        this.nodeCount++;
                        this.scanElement("node", v);
                    }
                    break;
                case "edge":
                    if (t.kind[v] === TOKEN_OPEN) {
                        this.edgeCount++;
                        this.scanElement("edge", v);
                    }
                    break;
                case "directed":
                    if (this.directedToken < 0) {
                        this.directedToken = v;
                    }
                    break;
                case "multigraph":
                    if (this.multigraphToken < 0) {
                        this.multigraphToken = v;
                    }
                    break;
                default:
                    this.observe(this.graphSchema, "graph", key, v, GRAPH_SEQ);
            }
        }
    }

    /**
     * Walk one node or edge block for the schema.
     * @param domain - node or edge
     * @param open - the block's `[`
     */
    private scanElement(domain: "node" | "edge", open: number): void {
        const t = this.requireTokens();
        const close = t.match[open];
        const seq = this.seq++;
        const schema = domain === "node" ? this.nodeSchema : this.edgeSchema;
        const { weightFrom, restoreMangledIds } = this.options;
        for (let p = open + 1; p < close; p = t.nextPair(p)) {
            const key = t.textOf(p);
            const v = p + 1;
            if (domain === "node") {
                if (key === "id") {
                    continue;
                }
                if (key === ORIGINAL_ID_KEY && restoreMangledIds) {
                    this.hasOriginalId = true;
                    continue;
                }
            } else {
                if (key === "source" || key === "target" || key === "directed") {
                    continue;
                }
                if (key === weightFrom) {
                    this.weightKinds |= kindBit(t, v);
                    continue;
                }
            }
            this.observe(schema, domain, key, v, seq);
        }
    }

    /**
     * Record one value of one key in a table's schema.
     * @param schema - the table's schema
     * @param domain - the table
     * @param key - the key
     * @param v - the value token
     * @param seq - the element sequence number
     */
    private observe(
        schema: Map<string, KeySchema>,
        domain: "node" | "edge" | "graph",
        key: string,
        v: number,
        seq: number,
    ): void {
        const t = this.requireTokens();
        this.noteStructure(domain, key, v);
        let entry = schema.get(key);
        const graphics = domain === "node" && key === "graphics" && this.positions;
        if (entry === undefined) {
            entry = {
                key,
                kinds: 0,
                list: false,
                lastSeq: seq,
                wide: false,
                unsafe: false,
                dict: this.dictionaries && roleOf(domain, key) === null ? new DictHeuristic() : null,
                position: false,
                rest: false,
            };
            schema.set(key, entry);
        } else if (entry.lastSeq === seq) {
            entry.list = true;
            // a repeated graphics record: the extra records go to the json column
            entry.rest ||= graphics;
        } else {
            entry.lastSeq = seq;
        }
        if (graphics && t.kind[v] !== TOKEN_OPEN) {
            entry.rest = true;
        }
        switch (t.kind[v]) {
            case TOKEN_STRING: {
                const raw = t.textOf(v);
                // a label is text: "[]" there is a label, never NetworkX's empty list
                if (
                    raw === LIST_START_MARKER ||
                    (!isLabel(domain, key) && (raw === EMPTY_LIST_TEXT || raw === EMPTY_TUPLE_TEXT))
                ) {
                    entry.list = true;
                    return;
                }
                entry.kinds |= KIND_STRING;
                if (entry.dict !== null && !entry.dict.decided) {
                    entry.dict.observe(raw);
                }
                return;
            }
            case TOKEN_INT: {
                entry.kinds |= KIND_INT;
                const n = Number(t.textOf(v));
                if (n < I32_MIN || n > I32_MAX) {
                    entry.wide = true;
                    if (!Number.isSafeInteger(n)) {
                        entry.unsafe = true;
                    }
                }
                return;
            }
            case TOKEN_OPEN:
                entry.kinds |= KIND_RECORD;
                if (domain === "node" && key === "graphics" && this.positions) {
                    this.inspectGraphics(entry, v);
                }
                return;
            default: {
                entry.kinds |= KIND_REAL;
                const text = t.textOf(v);
                if (/[0-9]/.test(text) && !Number.isFinite(Number(text))) {
                    this.report.warnOnce(
                        "precision",
                        PRECISION_CODE,
                        `${domain} key "${key}" holds the real ${text}, beyond the f64 range; it is stored as ${numberOfText(text) > 0 ? "" : "-"}Infinity`,
                        { line: t.line[v], element: key },
                        `${PRECISION_CODE}:overflow:${domain}:${key}`,
                    );
                }
            }
        }
    }

    /**
     * Warn about keys of a node or edge whose meaning GML readers give but this import does not:
     * a nested graph / node / edge record, and yEd's group hierarchy.
     * @param domain - the table
     * @param key - the key
     * @param v - the value token
     */
    private noteStructure(domain: "node" | "edge" | "graph", key: string, v: number): void {
        const t = this.requireTokens();
        if (domain === "graph") {
            return;
        }
        if ((key === "graph" || key === "node" || key === "edge") && t.kind[v] === TOKEN_OPEN) {
            this.report.warnOnce(
                "unsupported",
                NESTED_ELEMENT_CODE,
                `a nested ${key} record inside a ${domain} is kept as the json column "${key}"; it is not read as structure`,
                { line: t.line[v], element: key },
                `${NESTED_ELEMENT_CODE}:${domain}:${key}`,
            );
        } else if (domain === "node" && (key === "isGroup" || key === "gid")) {
            this.report.warnOnce(
                "unsupported",
                GROUPS_CODE,
                "yEd group keys (isGroup, gid) are kept as plain node columns; the group hierarchy is not read as containment",
                { line: t.line[v], element: key },
            );
        }
    }

    /**
     * Note whether a node's graphics record carries a position (numeric x and y) and whether
     * anything besides the position remains.
     * @param entry - the graphics schema entry
     * @param open - the record's `[`
     */
    private inspectGraphics(entry: KeySchema, open: number): void {
        const t = this.requireTokens();
        const close = t.match[open];
        let x = false;
        let y = false;
        let other = false;
        for (let p = open + 1; p < close; p = t.nextPair(p)) {
            const key = t.textOf(p);
            const numeric = t.kind[p + 1] === TOKEN_INT || t.kind[p + 1] === TOKEN_REAL;
            if (key === "x" && numeric && !x) {
                x = true;
            } else if (key === "y" && numeric && !y) {
                y = true;
            } else if (!(key === "z" && numeric)) {
                other = true;
            }
        }
        const positioned = x && y;
        entry.position ||= positioned;
        entry.rest ||= positioned ? other : true;
    }

    // ============================================================ pass 2: the push

    /** Declare what the schema needs, set the header and push every element. */
    private push(): void {
        const { sink, report, options } = this;
        const t = this.requireTokens();
        sink.reserve(this.nodeCount, this.edgeCount);
        this.buildPlans();
        this.setMetadata();
        this.headerDirected = this.readFlag(this.directedToken, "directed") ?? options.defaultDirected;
        const resolver = new DirectionResolver(sink, report, options.onMixedDirection);
        resolver.setHeader(this.headerDirected, {
            line: this.directedToken >= 0 ? t.line[this.directedToken] : t.line[this.graphOpen],
        });
        this.resolver = resolver;
        if (options.nodeIdFrom !== "id" || this.hasOriginalId) {
            this.idMap = new Map();
        }
        if (options.nodeIdFrom !== "id") {
            report.loss(
                ID_DROPPED_CODE,
                `node ids taken from the ${options.nodeIdFrom}; the integer id keys are not kept as a column`,
                null,
                this.nodeCount,
            );
        }
        this.pushTopLevel();
        this.pushNodes();
        this.pushEdges();
    }

    /** Turn every schema entry into a column plan. */
    private buildPlans(): void {
        for (const [key, entry] of this.nodeSchema) {
            this.nodePlans.set(key, this.planOf("node", entry));
        }
        for (const [key, entry] of this.edgeSchema) {
            this.edgePlans.set(key, this.planOf("edge", entry));
        }
        for (const [key, entry] of this.graphSchema) {
            this.graphPlans.set(key, this.planOf("graph", entry));
        }
        for (const [key, entry] of this.topSchema) {
            this.topPlans.set(key, this.planOf("graph", entry, true));
        }
    }

    /**
     * The plan of one schema entry.
     * @param domain - the table
     * @param entry - the schema entry
     * @param top - whether the key is a top-level one (graph table)
     * @returns the plan
     */
    private planOf(domain: "node" | "edge" | "graph", entry: KeySchema, top = false): ColumnPlan {
        const kind = kindOf(entry);
        let scalar: ScalarDtype = dtypeOfKind(kind, entry);
        if (
            scalar === "string" &&
            !entry.list &&
            entry.dict !== null &&
            entry.kinds === KIND_STRING &&
            entry.dict.decide() === "dict"
        ) {
            scalar = "dict";
        }
        if (
            (entry.kinds & KIND_STRING) !== 0 &&
            (entry.kinds & (KIND_INT | KIND_REAL)) !== 0 &&
            (entry.kinds & KIND_RECORD) === 0
        ) {
            this.report.warnOnce(
                "coercion",
                WIDENED_CODE,
                `${domain} key "${entry.key}" mixes numbers and strings; the column is string and the numbers are kept as written`,
                { element: entry.key },
                `${WIDENED_CODE}:${domain}:${entry.key}`,
            );
        }
        if (entry.unsafe) {
            this.report.warnOnce(
                "precision",
                PRECISION_CODE,
                `${domain} key "${entry.key}" holds integers beyond 2^53; they are stored as the nearest f64`,
                { element: entry.key },
                `${PRECISION_CODE}:${domain}:${entry.key}`,
            );
        }
        const name = domain === "graph" ? this.uniqueGraphName(entry.key) : entry.key;
        let itemDtype: ScalarDtype | null = null;
        if (entry.list) {
            itemDtype = scalar === "dict" ? "string" : scalar;
        }
        const plan: ColumnPlan = {
            key: entry.key,
            name,
            dtype: entry.list ? "list" : scalar,
            itemDtype,
            kind,
            list: entry.list,
            role: roleOf(domain, entry.key),
            top,
            position: null,
            rest: null,
            handle: INVALID_INDEX as ColumnHandle,
            declared: false,
            items: null,
            seq: Number.NEGATIVE_INFINITY,
        };
        if (domain === "node" && entry.key === "graphics" && this.positions && (entry.kinds & KIND_RECORD) !== 0) {
            const taken = (candidate: string): boolean =>
                this.nodeSchema.has(candidate) || this.sink.nodeColumn(candidate) !== INVALID_INDEX;
            const position: ColumnPlan = {
                ...plan,
                name: uniqueColumnName("position", "graphics", taken),
                dtype: "f64",
                itemDtype: null,
                kind: "real",
                list: false,
                role: "position",
            };
            const rest: ColumnPlan | null = entry.rest
                ? { ...plan, dtype: "json", itemDtype: null, kind: "record", list: false }
                : null;
            return { ...plan, position, rest };
        }
        return plan;
    }

    /**
     * A graph column name not yet used by this import (top-level and in-graph keys share the table).
     * @param key - the key
     * @returns the name
     */
    private uniqueGraphName(key: string): string {
        const name = uniqueColumnName(key, key, (candidate) => this.graphNames.has(candidate));
        this.graphNames.add(name);
        if (name !== key) {
            this.report.warning(
                "coercion",
                COLUMN_RENAMED_CODE_GML,
                `the top-level key "${key}" and a key of the graph block share the graph column name; the top-level value is stored as "${name}"`,
                { element: key },
            );
        }
        return name;
    }

    /** Set the graph metadata: source format, creator, version, multigraph flag, weight origin. */
    private setMetadata(): void {
        const t = this.requireTokens();
        const { sink, options } = this;
        const textOf = (v: number): string => (t.kind[v] === TOKEN_STRING ? t.stringOf(v) : t.textOf(v));
        const multigraph = this.readFlag(this.multigraphToken, "multigraph");
        sink.setMeta({
            sourceFormat: "gml",
            creator: this.creatorToken >= 0 ? textOf(this.creatorToken) : undefined,
            sourceVersion: this.versionToken >= 0 ? textOf(this.versionToken) : undefined,
            declaredMultigraph: multigraph ?? undefined,
            weightOrigin:
                this.weightKinds !== 0 && options.weightFrom !== null
                    ? {
                          format: "gml",
                          id: options.weightFrom,
                          title: null,
                          type: this.weightKinds === KIND_INT ? "int" : "real",
                          namespace: null,
                      }
                    : undefined,
            // The header as written, so a reader can say which words set the direction and tell
            // `directed 0` from a file that relies on the specification's default.
            extra: this.directedToken >= 0 ? { gml: { directed: textOf(this.directedToken) } } : undefined,
        });
    }

    /**
     * Read a `directed` / `multigraph` flag token.
     * @param v - the value token, or -1 when absent
     * @param name - the flag name, for issues
     * @returns the flag, or null when absent or not an integer
     */
    private readFlag(v: number, name: string): boolean | null {
        if (v < 0) {
            return null;
        }
        const t = this.requireTokens();
        // Files in the wild write the flag as a quoted integer (`directed "1"`); read it, with a warning.
        const quoted = t.kind[v] === TOKEN_STRING && QUOTED_INT.test(t.stringOf(v));
        if (quoted) {
            this.report.warning(
                "validation-error",
                FLAG_VALUE_CODE,
                `flag "${name}" is written as the string ${describeValue(t, v)}; read as an integer`,
                { line: t.line[v], element: name },
            );
        } else if (t.kind[v] !== TOKEN_INT) {
            this.report.error(
                "validation-error",
                FLAG_TYPE_CODE,
                `flag "${name}" must be the integer 0 or 1, found ${describeValue(t, v)}`,
                { line: t.line[v], element: name },
            );
            return null;
        }
        const n = Number(quoted ? t.stringOf(v) : t.textOf(v));
        if (n !== 0 && n !== 1) {
            this.report.warning(
                "validation-error",
                FLAG_VALUE_CODE,
                `flag "${name}" is ${n}; read as ${n !== 0 ? "1" : "0"}`,
                { line: t.line[v], element: name },
            );
        }
        return n !== 0;
    }

    /** Push the top-level attributes (every top-level key but graph, Creator and Version). */
    private pushTopLevel(): void {
        const t = this.requireTokens();
        for (let p = 0; p < t.count; p = t.nextPair(p)) {
            const v = p + 1;
            if (v === this.graphOpen || v === this.creatorToken || v === this.versionToken) {
                continue;
            }
            const plan = this.topPlans.get(t.textOf(p));
            if (plan !== undefined) {
                this.writeGraph(plan, v, TOP_SEQ);
            }
        }
        this.flushGraphLists();
    }

    /** Push every node block and the graph block's own attributes, in file order. */
    private pushNodes(): void {
        const t = this.requireTokens();
        const close = t.match[this.graphOpen];
        for (let p = this.graphOpen + 1; p < close; p = t.nextPair(p)) {
            const key = t.textOf(p);
            const v = p + 1;
            switch (key) {
                case "node":
                    if (t.kind[v] === TOKEN_OPEN) {
                        this.importNode(v);
                    } else {
                        this.badElement("node", p);
                        this.report.counts.skippedNodes++;
                    }
                    break;
                case "edge":
                    break;
                case "directed":
                case "multigraph":
                    if (v !== this.directedToken && v !== this.multigraphToken) {
                        this.report.warning(
                            "validation-error",
                            FLAG_VALUE_CODE,
                            `graph flag "${key}" repeated; the first value stands`,
                            { line: t.line[p], element: key },
                        );
                    }
                    break;
                default: {
                    const plan = this.graphPlans.get(key);
                    if (plan !== undefined) {
                        this.writeGraph(plan, v, GRAPH_SEQ);
                    }
                }
            }
        }
        this.flushGraphLists();
    }

    /** Push every edge block, in file order. */
    private pushEdges(): void {
        const t = this.requireTokens();
        const close = t.match[this.graphOpen];
        let ordinal = 0;
        for (let p = this.graphOpen + 1; p < close; p = t.nextPair(p)) {
            if (t.textOf(p) !== "edge") {
                continue;
            }
            const v = p + 1;
            if (t.kind[v] === TOKEN_OPEN) {
                this.importEdge(v, ordinal);
            } else {
                this.badElement("edge", p);
                this.report.counts.skippedEdges++;
            }
            ordinal++;
        }
    }

    /**
     * Record a `node` / `edge` key whose value is not a block.
     * @param what - node or edge
     * @param p - the key token
     */
    private badElement(what: string, p: number): void {
        const t = this.requireTokens();
        this.report.error(
            "validation-error",
            ELEMENT_TYPE_CODE,
            `${what} must be a [ ... ] block, found ${describeValue(t, p + 1)}`,
            { line: t.line[p], element: what },
        );
    }

    /**
     * Push one node block.
     * @param open - the block's `[`
     */
    private importNode(open: number): void {
        const t = this.requireTokens();
        const { sink, report, options } = this;
        const close = t.match[open];
        const line = t.line[open];
        const ordinal = this.nodeOrdinal++;
        this.checkAbort();
        let index: number;
        let sinkId: NodeId;
        let fileId: NodeId | undefined;
        try {
            let idTok = -1;
            let labelTok = -1;
            let originalTok = -1;
            for (let p = open + 1; p < close; p = t.nextPair(p)) {
                const key = t.textOf(p);
                if (key === "id") {
                    idTok = this.structuralToken(idTok, p, "id");
                } else if (key === "label") {
                    labelTok = labelTok < 0 ? p + 1 : labelTok;
                } else if (key === ORIGINAL_ID_KEY && options.restoreMangledIds) {
                    originalTok = originalTok < 0 ? p + 1 : originalTok;
                }
            }
            if (idTok < 0) {
                throw new GraphFormatError("E_INVALID_ID", "node has no id", { reason: "missing id" });
            }
            // the file id under the ids rule, so `id 1` and `source "1"` meet in idMap (except under
            // "keep", where the integer 1 and the string "1" are different ids by design)
            fileId = this.coerceFileId(idTok, this.fileIdOf(idTok, "id"));
            if (originalTok >= 0) {
                sinkId = this.restoredId(originalTok);
            } else {
                switch (options.nodeIdFrom) {
                    case "label":
                        if (labelTok < 0) {
                            throw new GraphFormatError("E_INVALID_ID", "node has no label", {
                                reason: "missing label",
                            });
                        }
                        sinkId = this.coerceValueToken(labelTok);
                        break;
                    case "index":
                        sinkId = ordinal;
                        break;
                    default:
                        sinkId = fileId;
                }
            }
            index = sink.addNode(sinkId);
            if (this.idMap !== null) {
                const before = this.idMap.get(fileId);
                if (before !== undefined && before !== sinkId) {
                    report.warning(
                        "merged",
                        DUPLICATE_NODE_CODE,
                        `file id ${JSON.stringify(fileId)} is declared twice (nodes ${JSON.stringify(before)} and ${JSON.stringify(sinkId)}); edges to it resolve to the later`,
                        { line, element: String(fileId) },
                    );
                }
                this.idMap.set(fileId, sinkId);
            }
        } catch (err) {
            this.recordNodeError(err, line);
            report.counts.skippedNodes++;
            if (fileId !== undefined) {
                this.skippedIds.add(fileId);
            }
            return;
        }
        if (this.isDeclared(index)) {
            report.warning(
                "merged",
                DUPLICATE_NODE_CODE,
                `node ${JSON.stringify(sinkId)} is declared twice; later keys overwrite`,
                { line, element: String(sinkId) },
            );
        } else {
            this.markDeclared(index);
            report.counts.nodes++;
        }
        this.beginElement(this.seq++);
        try {
            const graphics: number[] = [];
            let graphicsPlan: ColumnPlan | null = null;
            for (let p = open + 1; p < close; p = t.nextPair(p)) {
                const key = t.textOf(p);
                if (key === "id" || (key === ORIGINAL_ID_KEY && options.restoreMangledIds)) {
                    continue;
                }
                const plan = this.nodePlans.get(key);
                if (plan !== undefined && plan.position !== null) {
                    graphicsPlan = plan;
                    graphics.push(p + 1);
                } else if (plan !== undefined) {
                    this.writeNode(plan, index, p + 1);
                }
            }
            if (graphicsPlan !== null) {
                this.writeGraphics(graphicsPlan, index, graphics, {
                    line: t.line[graphics[0]],
                    element: String(sinkId),
                });
            }
            this.flushLists("node", index);
        } catch (err) {
            this.touched.length = 0;
            report.recordError(err, { line, element: String(sinkId) });
        }
    }

    /**
     * Push one edge block.
     * @param open - the block's `[`
     * @param ordinal - the edge's ordinal among edge blocks, for messages
     */
    private importEdge(open: number, ordinal: number): void {
        const t = this.requireTokens();
        const { sink, report, options } = this;
        const close = t.match[open];
        const line = t.line[open];
        const element = `edge #${ordinal}`;
        this.checkAbort();
        let edge: number;
        try {
            let sourceTok = -1;
            let targetTok = -1;
            let weightTok = -1;
            let directedTok = -1;
            for (let p = open + 1; p < close; p = t.nextPair(p)) {
                const key = t.textOf(p);
                if (key === "source") {
                    sourceTok = this.structuralToken(sourceTok, p, "source");
                } else if (key === "target") {
                    targetTok = this.structuralToken(targetTok, p, "target");
                } else if (key === "directed") {
                    directedTok = this.structuralToken(directedTok, p, "directed");
                } else if (key === options.weightFrom) {
                    weightTok = p + 1;
                }
            }
            if (sourceTok < 0 || targetTok < 0) {
                throw new GraphFormatError("E_UNKNOWN_NODE", `edge has no ${sourceTok < 0 ? "source" : "target"}`, {
                    reason: "missing endpoint",
                });
            }
            const source = this.endpoint(sourceTok, "source");
            const target = this.endpoint(targetTok, "target");
            const weight = weightTok >= 0 ? this.weightOf(weightTok) : undefined;
            const before = sink.edgeCount;
            const sourceNew = sink.indexOf(source) === INVALID_INDEX;
            const targetNew = source !== target && sink.indexOf(target) === INVALID_INDEX;
            // an edge-level `directed` key overrides the graph's flag for that edge (mixed graphs)
            const directed = this.readFlag(directedTok, "directed") ?? this.headerDirected;
            edge = this.requireResolver().addEdge(source, target, directed ? "directed" : "undirected", weight, {
                line,
                element,
            });
            report.counts.edges += sink.edgeCount - before;
            // endpoints the file never declares (addMissingNodes) are nodes of the sink too
            report.counts.nodes += (sourceNew ? 1 : 0) + (targetNew ? 1 : 0);
        } catch (err) {
            this.recordEdgeError(err, line, element);
            report.counts.skippedEdges++;
            return;
        }
        this.beginElement(this.seq++);
        try {
            for (let p = open + 1; p < close; p = t.nextPair(p)) {
                const key = t.textOf(p);
                if (key === "source" || key === "target" || key === "directed" || key === options.weightFrom) {
                    continue;
                }
                const plan = this.edgePlans.get(key);
                if (plan !== undefined) {
                    this.writeEdge(plan, edge, p + 1);
                }
            }
            this.flushLists("edge", edge);
        } catch (err) {
            this.touched.length = 0;
            report.recordError(err, { line, element });
        }
    }

    // ============================================================ ids and weights

    /**
     * Note a structural key token, refusing a repeat.
     * @param previous - the token seen before, or -1
     * @param p - the key token
     * @param key - the key name
     * @returns the value token
     */
    private structuralToken(previous: number, p: number, key: string): number {
        if (previous >= 0) {
            throw new GraphFormatError("E_INVALID_ID", `key "${key}" appears twice in one block`, {
                reason: "duplicate key",
                key,
            });
        }
        return p + 1;
    }

    /**
     * The value of an id / source / target token: an integer (the GML spec's type) as a number, a
     * string (NetworkX and Gephi write them) as its text with one warning per file.
     * @param v - the value token
     * @param key - the key name, for the error
     * @returns the number or the string
     */
    private fileIdOf(v: number, key: string): number | string {
        const t = this.requireTokens();
        if (t.kind[v] === TOKEN_STRING) {
            this.report.warnOnce(
                "validation-error",
                STRING_ID_CODE,
                `${key} is the string "${t.textOf(v)}"; GML ids are integers, string ids are kept under the ids rule`,
                { line: t.line[v], element: t.stringOf(v) },
            );
            return t.stringOf(v);
        }
        if (t.kind[v] !== TOKEN_INT) {
            throw new GraphFormatError(
                "E_INVALID_ID",
                `${key} must be an integer or a string, found ${describeValue(t, v)}`,
                {
                    reason: "not an integer",
                    key,
                    value: t.kind[v] === TOKEN_OPEN ? "[...]" : t.textOf(v),
                },
            );
        }
        return Number(t.textOf(v));
    }

    /**
     * Coerce an id / source / target value under the `ids` rule: a string by its text, an integer
     * through coerceInteger().
     * @param v - the value token
     * @param id - its value (fileIdOf())
     * @returns the id
     */
    private coerceFileId(v: number, id: number | string): NodeId {
        return typeof id === "string" ? this.coercer.text(id) : this.coerceInteger(v, id);
    }

    /**
     * Coerce an integer id token under the `ids` rule: a safe integer passes as a typed number
     * (so `01` is 1 and `-0` is 0), a larger one goes through the text rule (a string under
     * "canonical"), and "string" keeps the text as written.
     * @param v - the value token
     * @param n - its numeric value
     * @returns the id
     */
    private coerceInteger(v: number, n: number): NodeId {
        if (Number.isSafeInteger(n) && this.coercer.mode !== "string") {
            return this.coercer.value(n);
        }
        return this.coercer.text(this.requireTokens().textOf(v));
    }

    /**
     * Coerce a label token under the `ids` rule: a string by its text, a number as a typed value.
     * @param v - the value token
     * @returns the id
     */
    private coerceValueToken(v: number): NodeId {
        const t = this.requireTokens();
        switch (t.kind[v]) {
            case TOKEN_STRING:
                return this.coercer.text(t.stringOf(v));
            case TOKEN_INT:
                return this.coerceInteger(v, Number(t.textOf(v)));
            case TOKEN_OPEN:
                throw new GraphFormatError("E_INVALID_ID", "label must be a string or a number, found a record", {
                    reason: "record label",
                });
            default:
                return this.coercer.value(numberOfText(t.textOf(v)));
        }
    }

    /**
     * The id a `graphty_originalId` key restores: typed, never coerced (the exporter wrote it exactly).
     * @param v - the value token
     * @returns the original id
     */
    private restoredId(v: number): NodeId {
        const t = this.requireTokens();
        switch (t.kind[v]) {
            case TOKEN_STRING:
                return t.stringOf(v);
            case TOKEN_OPEN:
                throw new GraphFormatError("E_INVALID_ID", `${ORIGINAL_ID_KEY} must be a string or a number`, {
                    reason: "record original id",
                });
            default:
                return numberOfText(t.textOf(v));
        }
    }

    /**
     * Resolve a source / target token to a sink id.
     * @param v - the value token
     * @param key - source or target
     * @returns the id
     */
    private endpoint(v: number, key: string): NodeId {
        const id = this.coerceFileId(v, this.fileIdOf(v, key));
        const mapped = this.idMap?.get(id);
        if (mapped !== undefined) {
            return mapped;
        }
        if (this.skippedIds.has(id)) {
            // the node block was skipped: creating the endpoint would bring the node back under
            // its raw file id (beside label ids under nodeIdFrom "label")
            throw new GraphFormatError(
                "E_UNKNOWN_NODE",
                `${key} ${JSON.stringify(id)} names a node block that was skipped after an error`,
                { reason: "skipped node", id },
            );
        }
        return id;
    }

    /**
     * The weight of an edge from its weight token.
     * @param v - the value token
     * @returns the weight; E_INVALID_WEIGHT for a record or non-numeric text
     */
    private weightOf(v: number): number | undefined {
        const t = this.requireTokens();
        switch (t.kind[v]) {
            case TOKEN_STRING:
                return parseWeightText(t.stringOf(v));
            case TOKEN_OPEN:
                throw new GraphFormatError("E_INVALID_WEIGHT", "edge weight is a record", { value: "[...]" });
            default:
                return weightFromValue(numberOfText(t.textOf(v)));
        }
    }

    /**
     * Record a node-level error under the GML code it implies.
     * @param err - the thrown value
     * @param line - the block's line
     */
    private recordNodeError(err: unknown, line: number): void {
        const { report } = this;
        if (err instanceof GraphFormatError && err.code === "E_INVALID_ID") {
            const { reason } = err.details;
            switch (reason) {
                case "missing id":
                    report.error("missing-value", MISSING_ID_CODE, err.message, { line, element: "node" });
                    return;
                case "missing label":
                    report.error("missing-value", MISSING_LABEL_CODE, err.message, { line, element: "node" });
                    return;
                case "duplicate key":
                    report.error("validation-error", REPEATED_KEY_CODE, err.message, { line, element: "node" });
                    return;
                case "not an integer":
                    report.error("validation-error", ID_TYPE_CODE, err.message, { line, element: "node" });
                    return;
                default:
                    break;
            }
        }
        report.recordError(err, { line, element: "node" });
    }

    /**
     * Record an edge-level error under the GML code it implies.
     * @param err - the thrown value
     * @param line - the block's line
     * @param element - the edge description
     */
    private recordEdgeError(err: unknown, line: number, element: string): void {
        const { report } = this;
        if (err instanceof GraphFormatError) {
            const { reason } = err.details;
            if (err.code === "E_UNKNOWN_NODE" && reason === "missing endpoint") {
                report.error("missing-value", MISSING_ENDPOINT_CODE, err.message, { line, element });
                return;
            }
            if (err.code === "E_INVALID_ID" && reason === "duplicate key") {
                report.error("validation-error", REPEATED_KEY_CODE, err.message, { line, element });
                return;
            }
            if (err.code === "E_INVALID_ID" && reason === "not an integer") {
                report.error("validation-error", ID_TYPE_CODE, err.message, { line, element });
                return;
            }
        }
        report.recordError(err, { line, element });
    }

    // ============================================================ values

    /**
     * Write one node value.
     * @param plan - the key's plan
     * @param index - the node index
     * @param v - the value token
     */
    private writeNode(plan: ColumnPlan, index: number, v: number): void {
        if (plan.list) {
            this.collectItem(plan, v, this.seqNow, this.touched);
            return;
        }
        this.sink.setNodeValue(this.handleOf(plan, "node"), index, this.scalarOf(plan, v));
    }

    /**
     * Write one edge value.
     * @param plan - the key's plan
     * @param edge - the edge index
     * @param v - the value token
     */
    private writeEdge(plan: ColumnPlan, edge: number, v: number): void {
        if (plan.list) {
            this.collectItem(plan, v, this.seqNow, this.touched);
            return;
        }
        this.sink.setEdgeValue(this.handleOf(plan, "edge"), edge, this.scalarOf(plan, v));
    }

    /**
     * Write one graph value.
     * @param plan - the key's plan
     * @param v - the value token
     * @param seq - TOP_SEQ or GRAPH_SEQ
     */
    private writeGraph(plan: ColumnPlan, v: number, seq: number): void {
        if (plan.list) {
            this.collectItem(plan, v, seq, this.graphTouched);
            return;
        }
        this.sink.setGraphValue(plan.name, this.scalarOf(plan, v), graphDecl(plan));
    }

    /**
     * Write a node's graphics values: the position column from the x / y / z of the first record,
     * everything else (the remaining keys, a value that is not a record, a repeated record) to the
     * json column, with a warning when the value cannot give a position as written.
     * @param plan - the graphics plan
     * @param index - the node index
     * @param vs - the value tokens of the node's graphics keys, in order
     * @param where - the line and the node, for issues
     */
    private writeGraphics(plan: ColumnPlan, index: number, vs: readonly number[], where: IssueWhere): void {
        const t = this.requireTokens();
        const { sink } = this;
        const values = vs.map((v) => (t.kind[v] === TOKEN_OPEN ? parseRecord(t, v) : this.scalarOf(plan, v)));
        const first = values[0];
        const positionPlan = plan.position;
        let rest: unknown = first;
        if (isRecord(first) && positionPlan !== null) {
            const { x, y, z } = first;
            if (typeof x === "number" && typeof y === "number") {
                sink.setNodeValue(this.handleOf(positionPlan, "node"), index, [x, y, typeof z === "number" ? z : 0]);
                delete first.x;
                delete first.y;
                if (typeof z === "number") {
                    delete first.z;
                }
                rest = Object.keys(first).length > 0 ? first : undefined;
            }
            if ("x" in first || "y" in first || "z" in first) {
                this.graphicsWarning(
                    "coordinate",
                    `node ${where.element}'s graphics x / y / z is not one number each`,
                    where,
                );
            }
        } else if (!isRecord(first)) {
            this.graphicsWarning("scalar", `node ${where.element}'s graphics is not a record`, where);
        }
        if (values.length > 1) {
            this.graphicsWarning(
                "repeated",
                `node ${where.element} has ${values.length} graphics records; the position comes from the first`,
                where,
            );
            rest = values;
        }
        if (rest !== undefined && plan.rest !== null) {
            sink.setNodeValue(this.handleOf(plan.rest, "node"), index, rest);
        }
    }

    /**
     * Warn once per kind of graphics problem.
     * @param kind - the problem
     * @param what - the message start, naming the node
     * @param where - the line and the node
     */
    private graphicsWarning(kind: string, what: string, where: IssueWhere): void {
        this.report.warnOnce(
            "validation-error",
            GRAPHICS_CODE,
            `${what}; the value is kept in the graphics json column (warned once for every such node)`,
            where,
            `${GRAPHICS_CODE}:${kind}`,
        );
    }

    /**
     * Collect one list item.
     * @param plan - the list plan
     * @param v - the value token
     * @param seq - the sequence number of the element the item belongs to
     * @param touched - the plans touched by that element
     */
    private collectItem(plan: ColumnPlan, v: number, seq: number, touched: ColumnPlan[]): void {
        const t = this.requireTokens();
        if (plan.seq !== seq) {
            plan.seq = seq;
            plan.items = [];
            touched.push(plan);
        }
        if (t.kind[v] === TOKEN_STRING) {
            const raw = t.textOf(v);
            if (raw === LIST_START_MARKER || raw === EMPTY_LIST_TEXT || raw === EMPTY_TUPLE_TEXT) {
                return;
            }
        }
        (plan.items as unknown[]).push(this.scalarOf(plan, v));
    }

    /**
     * Start a node or edge: later list items belong to it.
     * @param seq - the element's sequence number
     */
    private beginElement(seq: number): void {
        this.seqNow = seq;
        this.touched.length = 0;
    }

    /**
     * Write the lists collected for the current node or edge.
     * @param domain - node or edge
     * @param row - the row
     */
    private flushLists(domain: "node" | "edge", row: number): void {
        const { sink, touched } = this;
        for (const plan of touched) {
            const handle = this.handleOf(plan, domain);
            if (domain === "node") {
                sink.setNodeValue(handle, row, plan.items);
            } else {
                sink.setEdgeValue(handle, row, plan.items);
            }
            plan.items = null;
        }
        touched.length = 0;
    }

    /** Write the lists collected for the graph table. */
    private flushGraphLists(): void {
        const { sink, graphTouched } = this;
        for (const plan of graphTouched) {
            sink.setGraphValue(plan.name, plan.items, graphDecl(plan));
            plan.items = null;
        }
        graphTouched.length = 0;
    }

    /**
     * The JS value of a scalar value token (or list item) under a plan's storage class.
     * @param plan - the plan
     * @param v - the value token
     * @returns the value to push
     */
    private scalarOf(plan: ColumnPlan, v: number): unknown {
        const t = this.requireTokens();
        const kind = t.kind[v];
        switch (plan.kind) {
            case "int":
                return Number(t.textOf(v));
            case "real":
                return numberOfText(t.textOf(v));
            case "string":
                return kind === TOKEN_STRING ? t.stringOf(v) : t.textOf(v);
            default:
                return kind === TOKEN_STRING ? t.stringOf(v) : scalarOrRecord(t, v);
        }
    }

    /**
     * The handle of a plan's column, declaring it on first use. A declaration the sink refuses
     * because a column of the name exists with another declaration falls back to that column
     * (reported once); a taken role is dropped (reported once).
     * @param plan - the plan
     * @param domain - node or edge
     * @returns the handle
     */
    private handleOf(plan: ColumnPlan, domain: "node" | "edge"): ColumnHandle {
        if (plan.declared) {
            return plan.handle;
        }
        plan.declared = true;
        const { sink, report } = this;
        const decl: ColumnDecl = {
            name: plan.name,
            dtype: plan.dtype,
            nullable: true,
            origin: { format: "gml", id: plan.key, title: null, type: originTypeOf(plan), namespace: null },
        };
        if (plan.list) {
            decl.itemDtype = plan.itemDtype ?? "string";
        }
        if (plan.role === "position") {
            decl.components = 3;
        }
        if (plan.role !== null) {
            decl.role = plan.role;
        }
        const resolved = declareResolved(sink, domain, decl, report, { element: plan.name });
        plan.handle = resolved.handle;
        if (resolved.renamed) {
            plan.name = resolved.decl.name;
        }
        return plan.handle;
    }

    // ============================================================ bookkeeping

    /**
     * Whether a node index was declared by a node block of this import.
     * @param index - the node index
     * @returns true when declared
     */
    private isDeclared(index: number): boolean {
        const word = index >>> 5;
        return word < this.declared.length && ((this.declared[word] >>> (index & 31)) & 1) === 1;
    }

    /**
     * Mark a node index as declared.
     * @param index - the node index
     */
    private markDeclared(index: number): void {
        const word = index >>> 5;
        if (word >= this.declared.length) {
            const grown = new Uint32Array(Math.max(word + 1, this.declared.length * 2));
            grown.set(this.declared);
            this.declared = grown;
        }
        this.declared[word] |= 1 << (index & 31);
    }

    /** Check the abort signal every ABORT_CHECK_INTERVAL elements. */
    private checkAbort(): void {
        if (++this.elementsSinceCheck >= ABORT_CHECK_INTERVAL) {
            this.elementsSinceCheck = 0;
            throwIfAborted(this.options.signal);
        }
    }

    /**
     * The tokens, which exist after run() lexed the text.
     * @returns the tokens
     */
    private requireTokens(): GmlTokens {
        if (this.tokens === null) {
            throw new GraphFormatError("E_UNSUPPORTED", "the GML text was not lexed", { reason: "no tokens" });
        }
        return this.tokens;
    }

    /**
     * The direction resolver, which exists once the header was set.
     * @returns the resolver
     */
    private requireResolver(): DirectionResolver {
        if (this.resolver === null) {
            throw new GraphFormatError("E_DIRECTED", "the header was not set", { reason: "no resolver" });
        }
        return this.resolver;
    }
}

/**
 * The KIND_* bit of a value token.
 * @param t - the tokens
 * @param v - the value token
 * @returns the bit
 */
function kindBit(t: GmlTokens, v: number): number {
    switch (t.kind[v]) {
        case TOKEN_INT:
            return KIND_INT;
        case TOKEN_STRING:
            return KIND_STRING;
        case TOKEN_OPEN:
            return KIND_RECORD;
        default:
            return KIND_REAL;
    }
}

/**
 * The storage class of a schema entry: the widest value class seen.
 * @param entry - the entry
 * @returns the class
 */
function kindOf(entry: KeySchema): GmlKind {
    if ((entry.kinds & KIND_RECORD) !== 0) {
        return "record";
    }
    if ((entry.kinds & KIND_STRING) !== 0) {
        return "string";
    }
    if ((entry.kinds & KIND_REAL) !== 0) {
        return "real";
    }
    return "int";
}

/**
 * The scalar dtype of a storage class.
 * @param kind - the class
 * @param entry - the entry (a wide int keeps origin int but stores f64)
 * @returns the dtype
 */
function dtypeOfKind(kind: GmlKind, entry: KeySchema): ScalarDtype {
    switch (kind) {
        case "int":
            return entry.wide ? "f64" : "i32";
        case "real":
            return "f64";
        case "string":
            return "string";
        default:
            return "json";
    }
}

/**
 * The origin.type text of a plan: the GML value class of its values (`int` for wide integers
 * stored as f64 too, so the exporter writes them without a decimal point).
 * @param plan - the plan
 * @returns the type text
 */
function originTypeOf(plan: ColumnPlan): string {
    return plan.kind;
}

/**
 * The declaration patch of a graph column.
 * @param plan - the plan
 * @returns the decl for setGraphValue
 */
function graphDecl(plan: ColumnPlan): ColumnDecl {
    const decl: ColumnDecl = {
        name: plan.name,
        dtype: plan.dtype,
        nullable: true,
        origin: { format: "gml", id: plan.key, title: null, type: originTypeOf(plan), namespace: null },
    };
    if (plan.list) {
        decl.itemDtype = plan.itemDtype ?? "string";
    }
    if (plan.top) {
        decl.extra = { gmlTopLevel: true };
    }
    return decl;
}

/**
 * A short description of a value token for messages.
 * @param t - the tokens
 * @param v - the value token
 * @returns the description
 */
function describeValue(t: GmlTokens, v: number): string {
    switch (t.kind[v]) {
        case TOKEN_OPEN:
            return "a record";
        case TOKEN_STRING:
            return `the string "${t.textOf(v)}"`;
        case TOKEN_REAL:
            return `the real ${t.textOf(v)}`;
        case TOKEN_WORD:
            return `the word ${t.textOf(v)}`;
        default:
            return t.textOf(v);
    }
}

const SNIFF_GRAPH_START = /^(?:\s|#[^\n]*\n)*graph\s*\[/;
const SNIFF_GRAPH_ANYWHERE = /(?:^|\s)graph\s*\[/;
const SNIFF_KEY_START = /^(?:\s|#[^\n]*\n)*[A-Za-z_][0-9A-Za-z_]*\s+(?:"|[+-]?[0-9.]|\[)/;

/**
 * Confidence that a head of bytes is GML: a `graph [` opener, or key-value text with a `graph [`
 * somewhere in the head.
 * @param head - the first bytes of the input
 * @returns 0.95 for a leading `graph [`, 0.85 for key-value text containing one, 0.4 for key-value text, 0 otherwise
 */
function sniffGml(head: Uint8Array): number {
    let text = new TextDecoder("utf-8", { fatal: false }).decode(head);
    if (text.charCodeAt(0) === 0xfeff) {
        text = text.slice(1);
    }
    if (SNIFF_GRAPH_START.test(text)) {
        return 0.95;
    }
    if (SNIFF_KEY_START.test(text)) {
        return SNIFF_GRAPH_ANYWHERE.test(text) ? 0.85 : 0.4;
    }
    return 0;
}

/**
 * The GML importer plugin.
 * @category Built-in formats
 */
export const gmlImporter: GraphImporter<GmlImportOptions> = Object.freeze({
    format: "gml",
    extensions: Object.freeze([".gml"]),
    mimeTypes: Object.freeze(["text/x-gml", "text/plain"]),
    sniff: sniffGml,
    /**
     * Read a GML text into a sink.
     * @param input - the text, bytes or stream
     * @param sink - the sink
     * @param options - format-specific and common options
     * @returns the report
     */
    async import(
        input: ImportInput,
        sink: GraphSink,
        options?: GmlImportOptions & CommonImportOptions,
    ): Promise<ImportReport> {
        const resolved = resolveImportOptions(options, FORMAT_DEFAULTS);
        const report = new ImportReportBuilder("gml", resolved.errorLimit);
        reportSinkOptions(sink, options, report);
        reportUnusedOptions(options, report, USED_OPTIONS);
        const tokens = tokenize(await readText(input, report, resolved), report);
        throwIfAborted(resolved.signal);
        const gml = new GmlImport(sink, report, resolved, options);
        gml.run(tokens);
        if (gml.graphCount > 1) {
            report.warning(
                "unsupported",
                SECOND_GRAPH_CODE,
                `the input holds ${gml.graphCount - 1} more graph block(s) after the first; the first is read (graphIndex or graphName chooses another; importAllGraphs() reads every one)`,
            );
        }
        // an abort raised during the last few elements (after the last periodic check) still rejects
        throwIfAborted(resolved.signal);
        return report.finish();
    },

    /**
     * Read every `graph [ ... ]` block of a GML text, each into its own sink; the top-level keys
     * (Creator, Version, ...) apply to each.
     * @param input - the text, bytes or stream
     * @param sinkFor - the sink of the graph with this index, called before its first push
     * @param options - format-specific and common options
     * @returns one report per graph block
     */
    async importAll(
        input: ImportInput,
        sinkFor: (index: number) => GraphSink,
        options?: GmlImportOptions & CommonImportOptions,
    ): Promise<ImportReport[]> {
        const resolved = resolveImportOptions(options, FORMAT_DEFAULTS);
        const first = new ImportReportBuilder("gml", resolved.errorLimit);
        reportUnusedOptions(options, first, USED_OPTIONS);
        const tokens = tokenize(await readText(input, first, resolved), first);
        const reports: ImportReport[] = [];
        let count = 1;
        for (let i = 0; i < count; i++) {
            throwIfAborted(resolved.signal);
            const report = i === 0 ? first : new ImportReportBuilder("gml", resolved.errorLimit);
            const sink = sinkFor(i);
            reportSinkOptions(sink, options, report);
            const gml = new GmlImport(sink, report, resolved, options, i);
            gml.run(tokens);
            count = gml.graphCount;
            reports.push(report.finish());
        }
        throwIfAborted(resolved.signal);
        return reports;
    },
});

/**
 * Tokenize a GML text; a syntax error is fatal.
 * @param text - the whole text
 * @param report - where the syntax error is recorded
 * @returns the tokens
 */
function tokenize(text: string, report: ImportReportBuilder): GmlTokens {
    try {
        return tokenizeGml(text);
    } catch (err) {
        if (err instanceof GmlSyntaxError) {
            report.fail(err.code, err.message, { line: err.line });
        }
        throw err;
    }
}
