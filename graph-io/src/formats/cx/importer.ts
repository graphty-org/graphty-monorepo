/**
 * The CX version 1 importer (design/graph-io/cytoscape-and-obo/design.md section 1.2; the feature
 * and error inventory is research-cx.md): the JSON exchange format of NDEx and Cytoscape's CX
 * support. A CX document is an array of aspect fragments (`nodes`, `edges`, `nodeAttributes`,
 * `cartesianLayout`, `cySubNetworks`, `cyGroups`, `cyVisualProperties`, ...) that refer to each
 * other by integer ids, in any order.
 *
 * The document is read through the streaming scanner of common/json-elements.ts, so its text is
 * never held as one string; the parsed aspect elements are collected and each graph is built at the
 * end, because a reference may precede what it names.
 *
 * Mapping: every edge is directed; ids follow the CX id rule (design section 1.0.2); `n` is the
 * `name` column (the label), `r` is `represents`, `i` is `interaction`; attributes become columns
 * typed by their `d` (Cytoscape's value rule: "" and "null" are unset, "NaN" is NaN in a double); a
 * subnetwork's values are the unscoped ones and its own (`s`), its own winning. A collection (several
 * `cySubNetworks`) holds one graph per subnetwork: `importAll()` returns them, `import()` reads the
 * one `graphIndex` / `graphName` picks, `listGraphs()` lists them. Positions come from the
 * subnetwork's view, y flipped to y-up, `z` into the `z` column; `cyGroups` give `parent` (or
 * `parents`); per-element visual properties are one column per property (origin namespace
 * "cx.bypass") and style rules are kept verbatim in `meta.extra.cx` and not applied
 * (W_STYLES_NOT_IMPORTED, issue #706); provenance aspects become extension tables and list columns.
 */

import {
    type ColumnDecl,
    type ColumnHandle,
    type Dtype,
    type GraphMetaPatch,
    type GraphSink,
    INVALID_INDEX,
    type NodeId,
    type ScalarDtype,
} from "@graphty/graph-format";

import { declareResolved, uniqueColumnName } from "../../common/attributes.js";
import {
    AMBIGUOUS_GRAPH_NAME_CODE,
    ASPECT_ORDER_CODE,
    BAD_ASPECT_BLOCK_CODE,
    BAD_VALUE_CODE,
    COLUMN_RENAMED_CODE,
    COUNT_MISMATCH_CODE,
    DANGLING_REFERENCE_CODE,
    DIRECTION_FORCED_CODE,
    DIRECTION_REFUSED_CODE,
    DUPLICATE_ATTRIBUTE_CODE,
    DUPLICATE_EDGE_ID_CODE,
    DUPLICATE_NODE_CODE,
    EMPTY_INPUT_CODE,
    ENCODING_FALLBACK_CODE,
    GRAPH_NOT_FOUND_CODE,
    ID_MERGED_CODE,
    ID_TEXT_TYPE_CODE,
    INVALID_ENCODING_CODE,
    INVALID_UTF8_CODE,
    MISSING_ENDPOINT_CODE,
    MISSING_ID_CODE,
    MULTIPLE_GRAPHS_CODE,
    NO_GRAPH_CODE,
    OPTION_IGNORED_CODE,
    PARENT_CYCLE_CODE,
    PRECISION_CODE,
    ROLE_TAKEN_CODE,
    SINK_OPTION_CODE,
    STATUS_FAILED_CODE,
    STATUS_WARNING_CODE,
    STYLES_NOT_IMPORTED_CODE,
    SYNTAX_CODE,
    TOO_LARGE_CODE,
    UNKNOWN_ATTR_TYPE_CODE,
    UNKNOWN_ENCODING_CODE,
    UNKNOWN_PARENT_CODE,
    WIDENED_CODE,
} from "../../common/codes.js";
import { DirectionResolver } from "../../common/direction.js";
import { IdCoercer } from "../../common/ids.js";
import { textChunks, throwIfAborted } from "../../common/input.js";
import {
    cxId,
    CxStructure,
    declareFresh,
    ExactInteger,
    flipY,
    inexactLiteral,
    isRecord,
    JsonScanError,
    plainJson,
    positionDecl,
    reportTooDeep,
    scanAspects,
    zDecl,
} from "../../common/json-elements.js";
import {
    chooseGraph,
    type ImportFormatDefaults,
    reportSinkOptions,
    reportUnusedOptions,
    type ResolvedImportOptions,
    resolveImportOptions,
} from "../../common/options.js";
import { ImportReportBuilder } from "../../common/report.js";
import { weightFromValue } from "../../common/weights.js";
import {
    type CommonImportOptions,
    type GraphChoiceOptions,
    type GraphImporter,
    type GraphListing,
    type ImportInput,
    type ImportReport,
} from "../../types.js";
import { zAsOption } from "../cx2/importer.js";

/** The format name. */
const CX_FORMAT = "cx";

/** The origin namespace of the per-element visual property columns. */
const CX_BYPASS_NAMESPACE = "cx.bypass";

/** The format-specific options of the CX importer. */
export interface CxImportOptions extends GraphChoiceOptions {
    /**
     * Where a node's `z` goes: "column" (default) keeps it in the f64 node column `z` (Cytoscape
     * writes a stacking order there); "position" makes it the third component of the position.
     */
    zAs?: "column" | "position" | undefined;
}

/**
 * The issue codes the CX importer records (design section 1.2), by name: the codes shared with
 * the other importers (src/common/codes.ts) and the CX-specific ones. A key is the code without
 * its severity and format prefixes.
 */
export const CX_ISSUE = Object.freeze({
    /** The input is empty (fatal). */
    EMPTY_INPUT: EMPTY_INPUT_CODE,
    /** The text is not JSON (fatal). */
    SYNTAX: SYNTAX_CODE,
    /** Invalid UTF-8 (fatal). */
    INVALID_UTF8: INVALID_UTF8_CODE,
    /** Invalid bytes in the encoding a BOM or the encoding option chose (fatal). */
    INVALID_ENCODING: INVALID_ENCODING_CODE,
    /** Bytes that are not UTF-8 were read as windows-1252. */
    ENCODING_FALLBACK: ENCODING_FALLBACK_CODE,
    /** An encoding the platform cannot decode was ignored. */
    UNKNOWN_ENCODING: UNKNOWN_ENCODING_CODE,
    /** The document is not a CX array, or it is CX2 (fatal; the message names CX2). */
    NOT_CX: "E_CX_NOT_CX",
    /** numberVerification holds another value than 2^48 - 1, or comes twice. */
    NUMBER_VERIFICATION: "W_CX_NUMBER_VERIFICATION",
    /** An old Cytoscape aspect name (visualProperties, subNetworks, ...) read under its cy name. */
    OLD_ASPECT_NAME: "W_CX_OLD_ASPECT_NAME",
    /** A cyGroups group whose id is not a node: the group node is added. */
    GROUP_NODE_ADDED: "W_CX_GROUP_NODE_ADDED",
    /** Nodes or edges of the root network that no subnetwork holds: Cytoscape shows them in no network; not read. */
    ROOT_ONLY: "W_CX_ROOT_ONLY",
    /** The producer marked the document as failed (fatal). */
    STATUS_FAILED: STATUS_FAILED_CODE,
    /** The producer marked the document as successful with an error text. */
    STATUS_WARNING: STATUS_WARNING_CODE,
    /** A member of the array that is not a one-key aspect block, or an element that is not an object. */
    BAD_ASPECT_BLOCK: BAD_ASPECT_BLOCK_CODE,
    /** An aspect after the post-metadata or after the status, a third metaData. */
    ASPECT_ORDER: ASPECT_ORDER_CODE,
    /** A metaData element count disagrees with what was read. */
    COUNT_MISMATCH: COUNT_MISMATCH_CODE,
    /** A value that does not parse as its data type; the cell is unset. */
    BAD_VALUE: BAD_VALUE_CODE,
    /** One attribute name with several data types: the column takes the wider one. */
    WIDENED: WIDENED_CODE,
    /** A data type CX does not define; the value is kept as text. */
    UNKNOWN_ATTR_TYPE: UNKNOWN_ATTR_TYPE_CODE,
    /** An attribute, layout, bypass, subnetwork member, view or provenance entry naming nothing. */
    DANGLING_REFERENCE: DANGLING_REFERENCE_CODE,
    /** The same attribute twice on one element (or n and a different name attribute); the later wins. */
    DUPLICATE_ATTRIBUTE: DUPLICATE_ATTRIBUTE_CODE,
    /** A group member naming no node. */
    UNKNOWN_PARENT: UNKNOWN_PARENT_CODE,
    /** A group membership that would close a parent cycle; dropped. */
    PARENT_CYCLE: PARENT_CYCLE_CODE,
    /** The style rules of cyVisualProperties are not applied (issue #706). */
    STYLES_NOT_IMPORTED: STYLES_NOT_IMPORTED_CODE,
    /** A node without an @id. */
    MISSING_ID: MISSING_ID_CODE,
    /** An edge without s or t. */
    MISSING_ENDPOINT: MISSING_ENDPOINT_CODE,
    /** A node id declared twice; the second merges into the first. */
    DUPLICATE_NODE: DUPLICATE_NODE_CODE,
    /** An edge id declared twice; the second edge is skipped. */
    DUPLICATE_EDGE_ID: DUPLICATE_EDGE_ID_CODE,
    /** An id that is not an integer. */
    INVALID_ID: "E_INVALID_ID",
    /** An edge endpoint naming no node of the graph (addMissingNodes false, the default). */
    UNKNOWN_NODE: "E_UNKNOWN_NODE",
    /** A weight that is not a number. */
    INVALID_WEIGHT: "E_INVALID_WEIGHT",
    /** An id spelled as a string or a non-integer literal; read as the integer. */
    ID_TEXT_TYPE: ID_TEXT_TYPE_CODE,
    /** An integer beyond 2^53: an id kept as its digits, a value stored as the nearest f64. */
    PRECISION: PRECISION_CODE,
    /** Two id texts merged under `ids: "number"`. */
    ID_MERGED: ID_MERGED_CODE,
    /** A collection read by import(): the other subnetworks are skipped. */
    MULTIPLE_GRAPHS: MULTIPLE_GRAPHS_CODE,
    /** graphIndex or graphName names no subnetwork (fatal). */
    GRAPH_NOT_FOUND: GRAPH_NOT_FOUND_CODE,
    /** graphName names several subnetworks (fatal). */
    AMBIGUOUS_GRAPH_NAME: AMBIGUOUS_GRAPH_NAME_CODE,
    /** The input holds no graph (fatal). */
    NO_GRAPH: NO_GRAPH_CODE,
    /** A column renamed because its name was taken. */
    COLUMN_RENAMED: COLUMN_RENAMED_CODE,
    /** A column that lost its role because another column holds it. */
    ROLE_TAKEN: ROLE_TAKEN_CODE,
    /** The sink refused the direction. */
    DIRECTION_REFUSED: DIRECTION_REFUSED_CODE,
    /** Edges forced to the policy's direction. */
    DIRECTION_FORCED: DIRECTION_FORCED_CODE,
    /** A common option CX has no use for. */
    OPTION_IGNORED: OPTION_IGNORED_CODE,
    /** A builder option the caller's sink does not honour. */
    SINK_OPTION: SINK_OPTION_CODE,
    /** The input is beyond a size limit (fatal). */
    TOO_LARGE: TOO_LARGE_CODE,
});

const USED_OPTIONS: ReadonlySet<keyof CommonImportOptions> = new Set<keyof CommonImportOptions>([
    "ids",
    "addMissingNodes",
    "duplicateEdges",
    "selfLoops",
    "onMixedDirection",
    "weightFrom",
    "weightDtype",
    "long",
    "errorLimit",
    "signal",
    "onProgress",
]);

/** CX has no undirected edge: defaultDirected never applies (reported W_OPTION_IGNORED). */
const FORMAT_DEFAULTS: ImportFormatDefaults = {
    ids: "keep",
    defaultDirected: true,
    weightFrom: "weight",
    addMissingNodes: false,
};

const ABORT_CHECK_INTERVAL = 64;

/** The numberVerification values a reader accepts: 2^48 - 1 and Java's Long.MAX_VALUE. */
const NUMBER_VERIFICATION_VALUES: ReadonlySet<string> = new Set(["281474976710655", "9223372036854775807"]);

/** Old Cytoscape aspect names and the names they are read under. */
const OLD_ASPECT_NAMES: Readonly<Record<string, string>> = {
    visualProperties: "cyVisualProperties",
    subNetworks: "cySubNetworks",
    networkRelations: "cyNetworkRelations",
    hiddenAttributes: "cyHiddenAttributes",
};

/** The aspects the importer reads into the graph (everything else is kept verbatim). */
const READ_ASPECTS: ReadonlySet<string> = new Set([
    "nodes",
    "edges",
    "nodeAttributes",
    "edgeAttributes",
    "networkAttributes",
    "cartesianLayout",
    "cySubNetworks",
    "cyNetworkRelations",
    "cyViews",
    "cyGroups",
    "cyVisualProperties",
    "cyTableColumn",
    "citations",
    "supports",
    "nodeCitations",
    "edgeCitations",
    "nodeSupports",
    "edgeSupports",
    "functionTerms",
    "reifiedEdges",
    "numberVerification",
    "metaData",
    "status",
]);

/** The aspects also kept verbatim in meta.extra.cx although they are read. */
const ALSO_KEPT: ReadonlySet<string> = new Set([
    "cySubNetworks",
    "cyNetworkRelations",
    "cyViews",
    "cyVisualProperties",
    "cyTableColumn",
    "numberVerification",
    "metaData",
]);

/** Cytoscape's table-cell style aspects (both spellings): style rules, kept and reported, never read. */
const TABLE_STYLE_ASPECTS: readonly string[] = ["tableVisualProperties", "cyTableVisualProperties"];

/** The first keys that make a head CX for sure, and the other aspect names a CX document may start with. */
const CX_FIRST_KEYS: readonly string[] = ["numberVerification", "metaData"];
const CX_ASPECT_KEYS: readonly string[] = [
    "nodes",
    "edges",
    "nodeAttributes",
    "edgeAttributes",
    "networkAttributes",
    "cartesianLayout",
    "@context",
    "cySubNetworks",
    "subNetworks",
    "cyNetworkRelations",
    "networkRelations",
    "cyVisualProperties",
    "visualProperties",
    "cyHiddenAttributes",
    "hiddenAttributes",
    "cyTableColumn",
    "cyGroups",
    "cyViews",
    "ndexStatus",
    "provenanceHistory",
    "citations",
    "supports",
    "functionTerms",
];

// ============================================================ values

/** The canonical CX scalar types. */
type CxScalar = "string" | "boolean" | "integer" | "long" | "double";

/** A CX data type. */
interface CxType {
    readonly scalar: CxScalar;
    readonly list: boolean;
}

/** The CX data types, with the Java reader's float aliases. */
const SCALARS: Readonly<Record<string, CxScalar>> = {
    string: "string",
    boolean: "boolean",
    integer: "integer",
    long: "long",
    double: "double",
    float: "double",
};

/**
 * Resolve a `d` value.
 * @param d - the data type (undefined: string)
 * @returns the type, or null when CX does not define it
 */
function cxType(d: unknown): CxType | null {
    if (d === undefined || d === null) {
        return { scalar: "string", list: false };
    }
    if (typeof d !== "string") {
        return null;
    }
    const list = d.startsWith("list_of_");
    const scalar = SCALARS[list ? d.slice("list_of_".length) : d] as CxScalar | undefined;
    return scalar === undefined ? null : { scalar, list };
}

/**
 * The type text of a type.
 * @param type - the type
 * @returns `list_of_double`, `string`, ...
 */
function typeText(type: CxType): string {
    return type.list ? `list_of_${type.scalar}` : type.scalar;
}

/** The widening rank of the scalar types (design 5.1 order; boolean and numbers widen to string). */
const RANK: Readonly<Record<CxScalar, number>> = { boolean: 0, integer: 1, long: 2, double: 3, string: 4 };

/**
 * Widen two types to one that holds both.
 * @param a - the type so far
 * @param b - another type
 * @returns the wider type, or null when they cannot share a column (a list and a scalar)
 */
function widenType(a: CxType, b: CxType): CxType | null {
    if (a.list !== b.list) {
        return null;
    }
    if (a.scalar === b.scalar) {
        return a;
    }
    const numeric = (s: CxScalar): boolean => s === "integer" || s === "long" || s === "double";
    if (numeric(a.scalar) && numeric(b.scalar)) {
        return RANK[a.scalar] > RANK[b.scalar] ? a : b;
    }
    return { scalar: "string", list: a.list };
}

/** What parseValue() returns for a value that does not parse. */
const BAD = Symbol("bad");

/** What parseValue() returns for a value Cytoscape reads as null ("", "null"). */
const UNSET = Symbol("unset");

const I32_MIN = -2147483648;
const I32_MAX = 2147483647;
const INTEGER_TEXT = /^-?[0-9]+$/;
const DECIMAL_TEXT = /^-?([0-9]+(\.[0-9]*)?|\.[0-9]+)([eE][+-]?[0-9]+)?$/;

/**
 * Whether a text is Cytoscape's null: the empty string or "null" in any case.
 * @param text - the text
 * @returns true for a null text
 */
function isNullText(text: string): boolean {
    return text === "" || text.toLowerCase() === "null";
}

/**
 * Parse one scalar value (or list item) of a CX attribute by its type, with Cytoscape's value
 * rule: "" and "null" are unset, "NaN" is NaN in a double (unset in an integer or long), native JSON
 * numbers and booleans are accepted, anything else that does not parse is BAD.
 * @param value - the value (never null)
 * @param scalar - the type
 * @param long - the importer's `long` option
 * @param onPrecision - called for a long beyond 2^53
 * @returns the value, UNSET or BAD
 */
function parseScalar(
    value: unknown,
    scalar: CxScalar,
    long: "f64" | "string",
    onPrecision: (digits: string) => void,
): unknown {
    if (value instanceof ExactInteger) {
        if (scalar === "string" || (scalar === "long" && long === "string")) {
            return value.digits;
        }
        if (scalar === "long" || scalar === "double") {
            if (scalar === "long") {
                onPrecision(value.digits);
            }
            return Number(value.digits);
        }
        return BAD;
    }
    if (typeof value === "number" || typeof value === "boolean") {
        return parseNative(value, scalar, long);
    }
    if (typeof value !== "string") {
        return BAD;
    }
    if (scalar === "string") {
        return value;
    }
    if (isNullText(value)) {
        return UNSET;
    }
    switch (scalar) {
        case "boolean": {
            const lower = value.toLowerCase();
            if (lower === "true" || lower === "false") {
                return lower === "true";
            }
            return BAD;
        }
        case "integer":
        case "long": {
            if (value === "NaN") {
                return UNSET;
            }
            if (!INTEGER_TEXT.test(value)) {
                return BAD;
            }
            const n = Number(value);
            if (scalar === "integer") {
                return n >= I32_MIN && n <= I32_MAX ? n : BAD;
            }
            if (long === "string") {
                return value;
            }
            if (!Number.isSafeInteger(n)) {
                onPrecision(value);
            }
            return n;
        }
        default: {
            if (value === "NaN" || value === "nan") {
                return NaN;
            }
            if (value === "Infinity" || value === "-Infinity") {
                return Number(value);
            }
            return DECIMAL_TEXT.test(value) ? Number(value) : BAD;
        }
    }
}

/**
 * Parse a native JSON number or boolean by a type.
 * @param value - the value
 * @param scalar - the type
 * @param long - the importer's `long` option
 * @returns the value or BAD
 */
function parseNative(value: number | boolean, scalar: CxScalar, long: "f64" | "string"): unknown {
    switch (scalar) {
        case "string":
            return String(value);
        case "boolean":
            return typeof value === "boolean" ? value : BAD;
        case "integer":
            return typeof value === "number" && Number.isInteger(value) && value >= I32_MIN && value <= I32_MAX
                ? value
                : BAD;
        case "long":
            if (typeof value !== "number" || !Number.isInteger(value)) {
                return BAD;
            }
            return long === "string" ? String(value) : value;
        default:
            return typeof value === "number" ? value : BAD;
    }
}

/**
 * Parse an attribute value by its type: a scalar, or a list whose items parse one by one (a null
 * item is NaN in a double list and BAD elsewhere).
 * @param value - the value (never null)
 * @param type - the type
 * @param long - the importer's `long` option
 * @param onPrecision - called for a long beyond 2^53
 * @returns the value, UNSET or BAD
 */
function parseValue(
    value: unknown,
    type: CxType,
    long: "f64" | "string",
    onPrecision: (digits: string) => void,
): unknown {
    if (Array.isArray(value) !== type.list) {
        return BAD;
    }
    if (!type.list) {
        return parseScalar(value, type.scalar, long, onPrecision);
    }
    const out: unknown[] = [];
    for (const item of value as unknown[]) {
        let parsed = item === null ? UNSET : parseScalar(item, type.scalar, long, onPrecision);
        if (parsed === UNSET) {
            parsed = type.scalar === "double" ? NaN : BAD;
        }
        if (parsed === BAD) {
            return BAD;
        }
        out.push(parsed);
    }
    return out;
}

/**
 * The column dtype of a type.
 * @param scalar - the scalar type
 * @param long - the importer's `long` option
 * @returns the dtype
 */
function scalarDtype(scalar: CxScalar, long: "f64" | "string"): ScalarDtype {
    switch (scalar) {
        case "boolean":
            return "bool";
        case "integer":
            return "i32";
        case "long":
            return long === "string" ? "string" : "f64";
        case "double":
            return "f64";
        default:
            return "string";
    }
}

/**
 * A parsed value converted to the column's type (a narrower value in a widened column).
 * @param value - the parsed value
 * @param type - the column's type
 * @returns the value to store
 */
function toColumn(value: unknown, type: CxType): unknown {
    if (type.scalar !== "string") {
        return value;
    }
    if (type.list) {
        return (value as unknown[]).map((item) => (typeof item === "string" ? item : String(item)));
    }
    return typeof value === "string" ? value : String(value);
}

/**
 * A short JSON rendering of a value for a message.
 * @param value - the value
 * @returns the text, at most 60 characters
 */
function shown(value: unknown): string {
    if (value instanceof ExactInteger) {
        return value.digits;
    }
    let text: string;
    try {
        text = JSON.stringify(value) ?? String(value);
    } catch {
        text = String(value);
    }
    return text.length > 60 ? `${text.slice(0, 57)}...` : text;
}

// ============================================================ the document as read

/** A parsed aspect element with where it came from. */
interface Held {
    readonly value: unknown;
    readonly line: number;
    /** Bit 1: @id, bit 2: s, bit 4: t was written as a non-integer literal. */
    readonly inexact: number;
}

/** Everything the scan collects. */
interface CxDocument {
    /** The read aspects by their (cy) name. */
    readonly aspects: Map<string, Held[]>;
    /** Attribute elements by table and attribute name. */
    readonly attributes: {
        readonly node: Map<string, Held[]>;
        readonly edge: Map<string, Held[]>;
        readonly network: Map<string, Held[]>;
    };
    /** Aspects kept verbatim in meta.extra.cx. */
    readonly kept: Map<string, unknown[]>;
    readonly structure: CxStructure;
}

/**
 * The elements of a read aspect.
 * @param doc - the document
 * @param name - the aspect
 * @returns the elements, empty when absent
 */
function aspect(doc: CxDocument, name: string): readonly Held[] {
    return doc.aspects.get(name) ?? [];
}

/**
 * The inexact-literal bits of an element.
 * @param text - the element's JSON text
 * @param keys - the id keys to check, bit 1, 2, 4 in order
 * @returns the bits
 */
function inexactBits(text: string, keys: readonly string[]): number {
    if (!/[0-9][.eE]/.test(text)) {
        return 0;
    }
    let bits = 0;
    keys.forEach((key, i) => {
        if (inexactLiteral(text, key)) {
            bits |= 1 << i;
        }
    });
    return bits;
}

/**
 * The attribute map of an attribute aspect.
 * @param doc - the document
 * @param name - the aspect name
 * @returns the map, or null for another aspect
 */
function attributeTable(doc: CxDocument, name: string): Map<string, Held[]> | null {
    switch (name) {
        case "nodeAttributes":
            return doc.attributes.node;
        case "edgeAttributes":
            return doc.attributes.edge;
        case "networkAttributes":
            return doc.attributes.network;
        default:
            return null;
    }
}

/**
 * Check a numberVerification element: 2^48 - 1 (or Java's Long.MAX_VALUE), and only one.
 * @param value - the element
 * @param count - how many numberVerification elements were read, this one included
 * @param report - the report
 * @param line - its line
 */
function checkNumberVerification(value: unknown, count: number, report: ImportReportBuilder, line: number): void {
    const raw = isRecord(value) ? value.longNumber : undefined;
    const digits = raw instanceof ExactInteger ? raw.digits : String(raw);
    if (count > 1 || !NUMBER_VERIFICATION_VALUES.has(digits)) {
        report.warning(
            "validation-error",
            CX_ISSUE.NUMBER_VERIFICATION,
            count > 1
                ? "a second numberVerification element; ignored"
                : `numberVerification holds ${shown(raw === undefined ? null : digits)}, not 281474976710655`,
            { line, element: "numberVerification" },
        );
    }
}

/**
 * Read the whole document through the streaming scanner, checking its structure.
 * @param input - the input
 * @param report - the report
 * @param options - the resolved options
 * @returns what was read
 */
async function readDocument(
    input: ImportInput,
    report: ImportReportBuilder,
    options: ResolvedImportOptions,
): Promise<CxDocument> {
    const structure = new CxStructure(report);
    const doc: CxDocument = {
        aspects: new Map(),
        attributes: { node: new Map(), edge: new Map(), network: new Map() },
        kept: new Map(),
        structure,
    };
    let sinceCheck = 0;
    let verifications = 0;
    const canonical = (name: string, line: number): string => {
        const renamed = OLD_ASPECT_NAMES[name] as string | undefined;
        if (renamed === undefined) {
            return name;
        }
        report.warnOnce(
            "coercion",
            CX_ISSUE.OLD_ASPECT_NAME,
            `the old aspect name "${name}" is read as "${renamed}"`,
            { line, element: name },
            `${CX_ISSUE.OLD_ASPECT_NAME}:${name}`,
        );
        return renamed;
    };
    const collect = (name: string, value: unknown, text: string, line: number, exact: boolean): void => {
        structure.element(name, value, line);
        if (ALSO_KEPT.has(name) || !READ_ASPECTS.has(name)) {
            if (!doc.kept.has(name)) {
                doc.kept.set(name, []);
            }
            doc.kept.get(name)?.push(exact ? plainJson(value) : value);
        }
        if (!READ_ASPECTS.has(name) || name === "metaData" || name === "status") {
            return;
        }
        if (name === "numberVerification") {
            checkNumberVerification(value, ++verifications, report, line);
            return;
        }
        let inexact = 0;
        if (name === "nodes") {
            inexact = inexactBits(text, ["@id"]);
        } else if (name === "edges") {
            inexact = inexactBits(text, ["@id", "s", "t"]);
        }
        const held: Held = { value, line, inexact };
        const table = attributeTable(doc, name);
        if (table !== null) {
            if (!isRecord(value) || typeof value.n !== "string") {
                report.error("missing-value", MISSING_ID_CODE, `a ${name} element has no attribute name n; skipped`, {
                    line,
                    element: name,
                });
                return;
            }
            const key = value.n;
            if (!table.has(key)) {
                table.set(key, []);
            }
            table.get(key)?.push(held);
            return;
        }
        if (!doc.aspects.has(name)) {
            doc.aspects.set(name, []);
        }
        doc.aspects.get(name)?.push(held);
    };
    try {
        for await (const event of scanAspects(textChunks(input, report, options))) {
            if (++sinceCheck >= ABORT_CHECK_INTERVAL) {
                sinceCheck = 0;
                throwIfAborted(options.signal);
            }
            switch (event.kind) {
                case "root":
                    report.fail(
                        CX_ISSUE.NOT_CX,
                        `a CX document is a JSON array of aspects; found ${isRecord(event.value) ? "an object" : shown(event.value)}`,
                        { line: event.line },
                    );
                    break;
                case "member": {
                    const { value } = event;
                    if (isRecord(value) && "CXVersion" in value) {
                        report.fail(
                            CX_ISSUE.NOT_CX,
                            `the document is CX2 (CXVersion ${shown(value.CXVersion)}), not CX version 1; read it with the cx2 importer`,
                            { line: event.line },
                        );
                    }
                    const keys = isRecord(value) ? Object.keys(value) : [];
                    if (isRecord(value) && keys.length === 1 && isRecord(value[keys[0]])) {
                        const name = canonical(keys[0], event.line);
                        structure.block(name, event.line);
                        collect(name, value[keys[0]], "", event.line, event.exact);
                        break;
                    }
                    report.error(
                        "parse-error",
                        BAD_ASPECT_BLOCK_CODE,
                        `a member of the document is ${keys.length > 1 ? `an object with ${keys.length} keys (${keys.join(", ")})` : shown(value)}, not a one-key aspect fragment; skipped`,
                        { line: event.line, element: keys[0] ?? null },
                    );
                    break;
                }
                case "block":
                    structure.block(canonical(event.aspect, event.line), event.line);
                    break;
                case "element": {
                    const name = OLD_ASPECT_NAMES[event.aspect] ?? event.aspect;
                    collect(name, event.value, event.text, event.line, event.exact);
                    break;
                }
                case "deep":
                    reportTooDeep(report, event);
                    break;
                case "extraKeys":
                    report.error(
                        "parse-error",
                        BAD_ASPECT_BLOCK_CODE,
                        `the "${event.aspect}" fragment holds more keys (${event.keys.join(", ")}); a fragment has one key, the others are skipped`,
                        { line: event.line, element: event.aspect },
                    );
                    break;
                default:
                    break;
            }
        }
    } catch (err) {
        if (err instanceof JsonScanError) {
            report.fail(err.empty ? EMPTY_INPUT_CODE : SYNTAX_CODE, err.message, { line: err.line });
        }
        throw err;
    }
    structure.checkCounts();
    return doc;
}

// ============================================================ graphs (subnetworks)

/** One graph of a document: the root network, or one subnetwork of a collection. */
interface GraphPlan {
    readonly index: number;
    readonly name: string | null;
    /** The subnetwork's id, or null for the root network. */
    readonly subnetwork: NodeId | null;
    /** The member node ids, or null for every node. */
    readonly nodes: ReadonlySet<NodeId> | null;
    /** The member edge ids, or null for every edge. */
    readonly edges: ReadonlySet<NodeId> | null;
    /** The views of the graph, the first one first. */
    readonly views: readonly NodeId[];
}

/**
 * An id of a reference, or null when it is not one.
 * @param raw - the parsed reference
 * @returns the id
 */
function refId(raw: unknown): NodeId | null {
    try {
        return cxId(raw).id;
    } catch {
        return null;
    }
}

/**
 * A member list: the ids of an array, or null for "all".
 * @param raw - the list
 * @returns the set, or null for every element
 */
function memberSet(raw: unknown): Set<NodeId> | null {
    if (raw === "all") {
        return null;
    }
    const out = new Set<NodeId>();
    if (Array.isArray(raw)) {
        for (const item of raw) {
            const id = refId(item);
            if (id !== null) {
                out.add(id);
            }
        }
    }
    return out;
}

/**
 * The graphs of a document, in the order Cytoscape opens them.
 * @param doc - the document
 * @returns one plan per graph (at least one)
 */
function graphPlans(doc: CxDocument): GraphPlan[] {
    const subs = new Map<NodeId, { nodes: Set<NodeId> | null; edges: Set<NodeId> | null }>();
    for (const { value } of aspect(doc, "cySubNetworks")) {
        const id = isRecord(value) ? refId(value["@id"]) : null;
        if (id !== null && isRecord(value) && !subs.has(id)) {
            subs.set(id, { nodes: memberSet(value.nodes), edges: memberSet(value.edges) });
        }
    }
    const relationNames = new Map<NodeId, string>();
    const order: NodeId[] = [];
    const views = new Map<NodeId, NodeId[]>();
    const addView = (sub: NodeId, view: NodeId): void => {
        const list = views.get(sub) ?? [];
        if (!list.includes(view)) {
            list.push(view);
        }
        views.set(sub, list);
    };
    for (const { value } of aspect(doc, "cyNetworkRelations")) {
        if (!isRecord(value)) {
            continue;
        }
        const child = refId(value.c);
        if (child === null) {
            continue;
        }
        if (value.r === "view") {
            const parent = refId(value.p);
            if (parent !== null) {
                addView(parent, child);
            }
            continue;
        }
        if (typeof value.name === "string") {
            relationNames.set(child, value.name);
        }
        if (subs.has(child) && !order.includes(child)) {
            order.push(child);
        }
    }
    for (const { value } of aspect(doc, "cyViews")) {
        const view = isRecord(value) ? refId(value["@id"]) : null;
        const sub = isRecord(value) ? refId(value.s) : null;
        if (view !== null && sub !== null) {
            addView(sub, view);
        }
    }
    for (const id of subs.keys()) {
        if (!order.includes(id)) {
            order.push(id);
        }
    }
    const networkName = (sub: NodeId | null): string | null => {
        let found: string | null = null;
        for (const { value } of doc.attributes.network.get("name") ?? []) {
            if (!isRecord(value) || typeof value.v !== "string") {
                continue;
            }
            const scope = value.s === undefined ? null : refId(value.s);
            if (scope === sub) {
                return value.v;
            }
            if (scope === null) {
                found ??= value.v;
            }
        }
        return found;
    };
    if (order.length <= 1) {
        const sub = order.length === 1 ? order[0] : null;
        const members = sub === null ? undefined : subs.get(sub);
        let graphViews = sub === null ? [] : (views.get(sub) ?? []);
        if (graphViews.length === 0) {
            graphViews = [...new Set([...views.values()].flat())];
        }
        if (graphViews.length === 0) {
            graphViews = layoutViews(doc);
        }
        return [
            {
                index: 0,
                name: (sub === null ? null : (relationNames.get(sub) ?? null)) ?? networkName(sub),
                subnetwork: sub,
                nodes: members?.nodes ?? null,
                edges: members?.edges ?? null,
                views: graphViews,
            },
        ];
    }
    return order.map((sub, index) => ({
        index,
        name: relationNames.get(sub) ?? networkName(sub),
        subnetwork: sub,
        nodes: subs.get(sub)?.nodes ?? null,
        edges: subs.get(sub)?.edges ?? null,
        views: views.get(sub) ?? [],
    }));
}

/**
 * The distinct views the layout entries name, in order of appearance.
 * @param doc - the document
 * @returns the view ids
 */
function layoutViews(doc: CxDocument): NodeId[] {
    const out: NodeId[] = [];
    for (const { value } of aspect(doc, "cartesianLayout")) {
        const view = isRecord(value) && value.view !== undefined ? refId(value.view) : null;
        if (view !== null && !out.includes(view)) {
            out.push(view);
        }
    }
    return out;
}

/**
 * How many elements a member set holds.
 * @param members - the set, or null for every element
 * @param total - the element count of the root network
 * @returns the count
 */
function memberCount(members: ReadonlySet<NodeId> | null, total: number): number {
    return members === null ? total : members.size;
}

// ============================================================ the build

/** One attribute column of the graph being built. */
interface AttributeColumn {
    readonly name: string;
    readonly type: CxType | null;
    /** null: values are kept as text (an unknown or conflicting type). */
    handle: ColumnHandle;
}

/** Reads one graph of a collected document into a sink. */
class CxReader {
    private readonly sink: GraphSink;

    private readonly report: ImportReportBuilder;

    private readonly options: ResolvedImportOptions;

    private readonly zAs: "column" | "position";

    private readonly doc: CxDocument;

    private readonly plan: GraphPlan;

    private readonly direction: DirectionResolver;

    private readonly coercer: IdCoercer;

    /** Every node id of the root network. */
    private readonly rootNodes = new Set<NodeId>();

    /** Every edge id of the root network. */
    private readonly rootEdges = new Set<NodeId>();

    /** CX node id -> sink node index, for this graph. */
    private readonly nodeRows = new Map<NodeId, number>();

    /** CX edge id -> sink edge index, for this graph. */
    private readonly edgeRows = new Map<NodeId, number>();

    /** The subnetwork ids of the document. */
    private readonly subnetworks = new Set<NodeId>();

    private readonly dangling = new Map<string, number>();

    private nameHandle: ColumnHandle = INVALID_INDEX as ColumnHandle;

    private representsHandle: ColumnHandle = INVALID_INDEX as ColumnHandle;

    private interactionHandle: ColumnHandle = INVALID_INDEX as ColumnHandle;

    private edgeIdHandle: ColumnHandle = INVALID_INDEX as ColumnHandle;

    private sinceCheck = 0;

    private idType: "integer" | "mixed" = "integer";

    private weighted = false;

    /**
     * Create the reader.
     * @param sink - the sink
     * @param report - the report
     * @param options - the resolved options
     * @param zAs - where z goes
     * @param doc - the collected document
     * @param plan - the graph to read
     */
    constructor(
        sink: GraphSink,
        report: ImportReportBuilder,
        options: ResolvedImportOptions,
        zAs: "column" | "position",
        doc: CxDocument,
        plan: GraphPlan,
    ) {
        this.sink = sink;
        this.report = report;
        this.options = options;
        this.zAs = zAs;
        this.doc = doc;
        this.plan = plan;
        this.direction = new DirectionResolver(sink, report, options.onMixedDirection);
        this.coercer = new IdCoercer(options.ids);
        for (const { value } of aspect(doc, "nodes")) {
            const id = isRecord(value) ? refId(value["@id"]) : null;
            if (id !== null) {
                this.rootNodes.add(id);
            }
        }
        for (const { value } of aspect(doc, "edges")) {
            const id = isRecord(value) ? refId(value["@id"]) : null;
            if (id !== null) {
                this.rootEdges.add(id);
            }
        }
        for (const { value } of aspect(doc, "cySubNetworks")) {
            const id = isRecord(value) ? refId(value["@id"]) : null;
            if (id !== null) {
                this.subnetworks.add(id);
            }
        }
    }

    /** Build the graph. */
    build(): void {
        const { report } = this;
        this.direction.setHeader(true);
        this.checkMembers();
        this.checkRootOnly();
        const nodeColumns = this.declareAttributes("node");
        this.readNodes();
        this.readGroups();
        this.writeAttributes("node", nodeColumns);
        this.readLayout();
        const edgeColumns = this.declareAttributes("edge");
        this.readEdges();
        this.writeAttributes("edge", edgeColumns);
        this.readNetworkAttributes();
        this.readVisualProperties();
        this.readProvenance();
        for (const [kind, count] of this.dangling) {
            report.warning("validation-error", DANGLING_REFERENCE_CODE, `${count} ${kind}(s) name nothing; ignored`, {
                element: kind,
            });
        }
        this.setMeta();
    }

    // ------------------------------------------------------------ helpers

    /**
     * Count a reference that names nothing.
     * @param kind - what referred
     */
    private dangle(kind: string): void {
        this.dangling.set(kind, (this.dangling.get(kind) ?? 0) + 1);
    }

    /** Check the cancellation signal every ABORT_CHECK_INTERVAL elements. */
    private checkAbort(): void {
        if (++this.sinceCheck >= ABORT_CHECK_INTERVAL) {
            this.sinceCheck = 0;
            throwIfAborted(this.options.signal);
        }
    }

    /**
     * Whether a node id belongs to this graph.
     * @param id - the CX id
     * @returns true for a member
     */
    private inGraph(id: NodeId): boolean {
        return this.plan.nodes === null || this.plan.nodes.has(id);
    }

    /**
     * The key of the node and edge row maps for a CX id as an aspect writes it: the id the `ids`
     * option makes of it, which is what idOf() stored the element under.
     * @param raw - the CX id
     * @returns the row key
     */
    private key(raw: NodeId): NodeId {
        return this.options.ids === "keep" ? raw : this.coercer.value(raw);
    }

    /**
     * Whether a scoped value applies to this graph: unscoped, or scoped to its subnetwork. A scope
     * naming no subnetwork is counted as dangling.
     * @param scope - the element's s
     * @returns 1 for an unscoped value, 2 for this graph's own, 0 for another graph's
     */
    private scopeOf(scope: unknown): 0 | 1 | 2 {
        if (scope === undefined || scope === null) {
            return 1;
        }
        const id = refId(scope);
        if (id !== null && id === this.plan.subnetwork) {
            return 2;
        }
        if (id === null || !this.subnetworks.has(id)) {
            this.dangle("attribute subnetwork reference");
        }
        return 0;
    }

    /**
     * The id of an element, by the CX id rule and the `ids` option.
     * @param raw - the parsed id
     * @param inexact - whether the literal was not a plain integer
     * @param element - the element name for issues
     * @param edgeId - whether this is an edge's own id (stored in the f64 id column, not kept as digits)
     * @returns the id, or null when it was reported
     */
    private idOf(raw: unknown, inexact: boolean, element: string, edgeId = false): NodeId | null {
        try {
            const parsed = cxId(raw, inexact);
            if (parsed.note === "text") {
                this.report.warnOnce(
                    "coercion",
                    ID_TEXT_TYPE_CODE,
                    `${element}: the id ${shown(raw)} is not written as an integer; read as ${String(parsed.id)}`,
                    { element },
                );
            } else if (parsed.note === "precision" && edgeId) {
                // the edge is told apart by its digits, but the id column is f64
                this.report.warnOnce(
                    "precision",
                    PRECISION_CODE,
                    `${element}: the edge id ${String(parsed.id)} is beyond 2^53; the id column holds the nearest double`,
                    { element },
                    `${PRECISION_CODE}:edge`,
                );
            } else if (parsed.note === "precision") {
                this.idType = "mixed";
                this.report.warnOnce(
                    "precision",
                    PRECISION_CODE,
                    `${element}: the id ${String(parsed.id)} is beyond 2^53; kept as its digits (a string id)`,
                    { element },
                );
            }
            return this.options.ids === "keep" ? parsed.id : this.coercer.value(parsed.id);
        } catch (err) {
            this.report.recordError(err, { element });
            return null;
        }
    }

    /**
     * Record a long value beyond 2^53 (once).
     * @param name - the attribute
     * @param digits - the value
     */
    private precision(name: string, digits: string): void {
        this.report.warnOnce(
            "precision",
            PRECISION_CODE,
            `"${name}": ${digits} is beyond 2^53; stored as the nearest double`,
            { element: name },
            `${PRECISION_CODE}:value`,
        );
    }

    /** Count the subnetwork members that name no node or edge. */
    private checkMembers(): void {
        for (const id of this.plan.nodes ?? []) {
            if (!this.rootNodes.has(id)) {
                this.dangle("subnetwork node member");
            }
        }
        for (const id of this.plan.edges ?? []) {
            if (!this.rootEdges.has(id)) {
                this.dangle("subnetwork edge member");
            }
        }
    }

    /**
     * Report the root network's nodes and edges that no subnetwork holds (W_CX_ROOT_ONLY): they
     * belong to no graph Cytoscape opens, so no graph of this file reads them.
     */
    private checkRootOnly(): void {
        const subs = aspect(this.doc, "cySubNetworks");
        if (subs.length === 0) {
            return;
        }
        const held = { nodes: new Set<NodeId>(), edges: new Set<NodeId>() };
        const all = { nodes: false, edges: false };
        for (const { value } of subs) {
            if (!isRecord(value)) {
                continue;
            }
            for (const key of ["nodes", "edges"] as const) {
                const members = memberSet(value[key]);
                if (members === null) {
                    all[key] = true;
                } else {
                    members.forEach((id) => held[key].add(id));
                }
            }
        }
        const lost = (key: "nodes" | "edges", root: ReadonlySet<NodeId>): number =>
            all[key] ? 0 : [...root].filter((id) => !held[key].has(id)).length;
        const nodes = lost("nodes", this.rootNodes);
        const edges = lost("edges", this.rootEdges);
        if (nodes + edges > 0) {
            this.report.warning(
                "unsupported",
                CX_ISSUE.ROOT_ONLY,
                `${nodes} node(s) and ${edges} edge(s) of the root network belong to no subnetwork (cySubNetworks); they are not read`,
                { element: "cySubNetworks" },
            );
        }
    }

    /**
     * The handle of a structural column, declared on first use.
     * @param domain - node or edge
     * @param current - the handle so far
     * @param decl - the declaration
     * @returns the handle
     */
    private structural(domain: "node" | "edge", current: ColumnHandle, decl: ColumnDecl): ColumnHandle {
        return current === INVALID_INDEX ? declareResolved(this.sink, domain, decl, this.report).handle : current;
    }

    // ------------------------------------------------------------ attribute columns

    /**
     * Type and declare the attribute columns of a table for this graph: each name's type is the
     * wider of the types its applicable elements and its cyTableColumn entries give (W_WIDENED when
     * they differ); a name with a type CX does not define keeps its values as text.
     * @param domain - node or edge
     * @returns the columns by attribute name
     */
    private declareAttributes(domain: "node" | "edge"): Map<string, AttributeColumn> {
        const columns = new Map<string, AttributeColumn>();
        const declared = this.tableColumns(domain === "node" ? "node_table" : "edge_table");
        const names = new Set<string>([...declared.keys(), ...this.doc.attributes[domain].keys()]);
        for (const name of names) {
            if (name === "" || (domain === "edge" && name === this.options.weightFrom)) {
                continue;
            }
            const types: CxType[] = [];
            let unknown = false;
            const tableType = declared.get(name);
            if (tableType !== undefined) {
                types.push(tableType);
            }
            for (const { value } of this.doc.attributes[domain].get(name) ?? []) {
                if (!isRecord(value) || this.scopePeek(value.s) === 0) {
                    continue;
                }
                const type = cxType(value.d);
                if (type === null) {
                    unknown = true;
                    continue;
                }
                if (!types.some((t) => t.scalar === type.scalar && t.list === type.list)) {
                    types.push(type);
                }
            }
            if (unknown) {
                this.report.warnOnce(
                    "unsupported",
                    UNKNOWN_ATTR_TYPE_CODE,
                    `a ${domain} attribute "${name}" declares a data type CX does not define; its values are kept as text`,
                    { element: name },
                    `${UNKNOWN_ATTR_TYPE_CODE}:${domain}:${name}`,
                );
                types.push({ scalar: "string", list: false });
            }
            let type: CxType | null = types[0] ?? { scalar: "string", list: false };
            for (const other of types.slice(1)) {
                type = type === null ? null : widenType(type, other);
            }
            if (types.length > 1) {
                this.report.warnOnce(
                    "coercion",
                    WIDENED_CODE,
                    `the ${domain} attribute "${name}" has the data types ${types.map(typeText).join(", ")}; the column holds ${type === null ? "their values as JSON" : typeText(type)}`,
                    { element: name },
                    `${WIDENED_CODE}:${domain}:${name}`,
                );
            }
            if (this.isStructural(domain, name)) {
                columns.set(name, {
                    name,
                    type: { scalar: "string", list: false },
                    handle: INVALID_INDEX as ColumnHandle,
                });
                continue;
            }
            columns.set(name, { name, type, handle: this.declareColumn(domain, name, type) });
        }
        return columns;
    }

    /**
     * Whether an attribute name is the column of a core field (n / r on nodes, i on edges).
     * @param domain - node or edge
     * @param name - the attribute name
     * @returns true for name, represents and interaction
     */
    private isStructural(domain: "node" | "edge", name: string): boolean {
        return domain === "node" ? name === "name" || name === "represents" : name === "interaction";
    }

    /**
     * The scope of a value without counting a dangling one (for typing, which runs before the values).
     * @param scope - the element's s
     * @returns as scopeOf()
     */
    private scopePeek(scope: unknown): 0 | 1 | 2 {
        if (scope === undefined || scope === null) {
            return 1;
        }
        const id = refId(scope);
        return id !== null && id === this.plan.subnetwork ? 2 : 0;
    }

    /**
     * The column types cyTableColumn declares for one table and this graph.
     * @param table - node_table, edge_table or network_table
     * @returns name -> type
     */
    private tableColumns(table: string): Map<string, CxType> {
        const out = new Map<string, CxType>();
        for (const { value } of aspect(this.doc, "cyTableColumn")) {
            if (!isRecord(value) || value.applies_to !== table || typeof value.n !== "string") {
                continue;
            }
            if (this.scopePeek(value.s) === 0) {
                continue;
            }
            const type = cxType(value.d);
            if (type !== null) {
                out.set(value.n, type);
            }
        }
        return out;
    }

    /**
     * Declare one attribute column.
     * @param domain - node or edge
     * @param name - the attribute name
     * @param type - the type, or null for a json column
     * @returns the handle
     */
    private declareColumn(domain: "node" | "edge", name: string, type: CxType | null): ColumnHandle {
        const { long } = this.options;
        const decl: ColumnDecl =
            type === null
                ? { name, dtype: "json", nullable: true, origin: { format: CX_FORMAT, id: null } }
                : {
                      name,
                      dtype: type.list ? "list" : scalarDtype(type.scalar, long),
                      ...(type.list ? { itemDtype: scalarDtype(type.scalar, long) } : {}),
                      nullable: true,
                      origin: { format: CX_FORMAT, id: null, type: typeText(type) },
                  };
        return declareResolved(this.sink, domain, decl, this.report).handle;
    }

    /**
     * Write the attribute values of a table: per element, its own subnetwork's value beats the
     * unscoped one; a repeated value of the same scope is the later one (W_DUPLICATE_ATTRIBUTE
     * when they differ).
     * @param domain - node or edge
     * @param columns - the columns from declareAttributes()
     */
    private writeAttributes(domain: "node" | "edge", columns: ReadonlyMap<string, AttributeColumn>): void {
        const rows = domain === "node" ? this.nodeRows : this.edgeRows;
        const root = domain === "node" ? this.rootNodes : this.rootEdges;
        for (const column of columns.values()) {
            const chosen = new Map<number, { scope: 1 | 2; value: unknown; d: unknown; line: number }>();
            for (const held of this.doc.attributes[domain].get(column.name) ?? []) {
                this.checkAbort();
                const { value, line } = held;
                if (!isRecord(value)) {
                    this.report.error(
                        "parse-error",
                        BAD_ASPECT_BLOCK_CODE,
                        `a ${domain}Attributes element is not an object`,
                        {
                            line,
                            element: `${domain}Attributes`,
                        },
                    );
                    continue;
                }
                const scope = this.scopeOf(value.s);
                if (scope === 0) {
                    continue;
                }
                const target = refId(value.po);
                const row = target === null ? undefined : rows.get(this.key(target));
                if (row === undefined) {
                    if (target === null || !root.has(target)) {
                        this.dangle(`${domain} attribute target`);
                    }
                    continue;
                }
                if (value.v === undefined) {
                    this.report.error(
                        "missing-value",
                        BAD_VALUE_CODE,
                        `a ${domain}Attributes element for "${column.name}" has no v; skipped`,
                        {
                            line,
                            element: column.name,
                        },
                    );
                    continue;
                }
                if (value.v === null) {
                    continue;
                }
                const previous = chosen.get(row);
                if (previous !== undefined && previous.scope > scope) {
                    continue;
                }
                if (
                    previous?.scope === scope &&
                    JSON.stringify(previous.value) !== JSON.stringify(plainJson(value.v))
                ) {
                    this.report.warnOnce(
                        "validation-error",
                        DUPLICATE_ATTRIBUTE_CODE,
                        `${domain} ${shown(value.po)} has the attribute "${column.name}" twice; the later value wins`,
                        { line, element: column.name },
                        `${DUPLICATE_ATTRIBUTE_CODE}:${domain}:${column.name}`,
                    );
                }
                chosen.set(row, { scope, value: value.v, d: value.d, line });
            }
            for (const [row, { value, d, line }] of chosen) {
                this.writeCell(domain, column, row, value, d, line);
            }
        }
    }

    /**
     * Parse and write one attribute cell. The core fields' attributes (name, represents,
     * interaction) go into their columns; a name attribute that differs from n wins with
     * W_DUPLICATE_ATTRIBUTE.
     * @param domain - node or edge
     * @param column - the column
     * @param row - the row
     * @param raw - the value
     * @param d - the data type the value was written with
     * @param line - its line
     */
    private writeCell(
        domain: "node" | "edge",
        column: AttributeColumn,
        row: number,
        raw: unknown,
        d: unknown,
        line: number,
    ): void {
        const element = `${domain} attribute "${column.name}"`;
        let value: unknown;
        if (column.type === null) {
            value = plainJson(raw, (digits) => {
                this.precision(column.name, digits);
            });
        } else {
            const own = cxType(d) ?? { scalar: "string", list: false };
            const parsed = parseValue(raw, own, this.options.long, (digits) => {
                this.precision(column.name, digits);
            });
            if (parsed === UNSET) {
                return;
            }
            if (parsed === BAD) {
                this.report.error(
                    "validation-error",
                    BAD_VALUE_CODE,
                    `${element}: ${shown(raw)} is not a ${typeText(own)}; the cell is unset`,
                    { line, element: column.name },
                );
                return;
            }
            value = toColumn(parsed, column.type);
        }
        let { handle } = column;
        if (this.isStructural(domain, column.name)) {
            handle = this.coreColumn(domain, column.name);
            const prior = this.coreValue(domain, row, column.name);
            if (prior !== undefined && prior !== value) {
                this.report.warnOnce(
                    "validation-error",
                    DUPLICATE_ATTRIBUTE_CODE,
                    `a ${domain} has "${column.name}" both as its core field and as an attribute with another value; the attribute wins`,
                    { line, element: column.name },
                    `${DUPLICATE_ATTRIBUTE_CODE}:core:${column.name}`,
                );
            }
        }
        try {
            if (domain === "node") {
                this.sink.setNodeValue(handle, row, value);
            } else {
                this.sink.setEdgeValue(handle, row, value);
            }
        } catch (err) {
            this.report.recordError(err, { line, element: column.name });
        }
    }

    /** The core field values written per row (n, r), to detect a differing name attribute. */
    private readonly coreValues = new Map<string, Map<number, string>>();

    /**
     * The core field value of a row.
     * @param domain - node or edge
     * @param row - the row
     * @param name - name, represents or interaction
     * @returns the value, or undefined
     */
    private coreValue(domain: "node" | "edge", row: number, name: string): string | undefined {
        return this.coreValues.get(`${domain}:${name}`)?.get(row);
    }

    /**
     * The column of a core field.
     * @param domain - node or edge
     * @param name - name, represents or interaction
     * @returns the handle
     */
    private coreColumn(domain: "node" | "edge", name: string): ColumnHandle {
        if (domain === "edge") {
            this.interactionHandle = this.structural("edge", this.interactionHandle, {
                name: "interaction",
                dtype: "string",
                nullable: true,
                origin: { format: CX_FORMAT, id: "i", type: "string" },
            });
            return this.interactionHandle;
        }
        if (name === "name") {
            this.nameHandle = this.structural("node", this.nameHandle, {
                name: "name",
                dtype: "string",
                role: "label",
                nullable: true,
                origin: { format: CX_FORMAT, id: "n", type: "string" },
            });
            return this.nameHandle;
        }
        this.representsHandle = this.structural("node", this.representsHandle, {
            name: "represents",
            dtype: "string",
            nullable: true,
            origin: { format: CX_FORMAT, id: "r", type: "string" },
        });
        return this.representsHandle;
    }

    // ------------------------------------------------------------ nodes, groups, layout

    /** Read the nodes of this graph. */
    private readNodes(): void {
        const { report, sink } = this;
        for (const held of aspect(this.doc, "nodes")) {
            this.checkAbort();
            const { value, line } = held;
            if (!isRecord(value)) {
                report.error(
                    "parse-error",
                    BAD_ASPECT_BLOCK_CODE,
                    `a nodes element is ${shown(value)}, not an object`,
                    {
                        line,
                        element: "nodes",
                    },
                );
                report.counts.skippedNodes++;
                continue;
            }
            if (value["@id"] === undefined || value["@id"] === null) {
                report.error("missing-value", MISSING_ID_CODE, "a node has no @id", { line, element: "nodes" });
                report.counts.skippedNodes++;
                continue;
            }
            const element = `node ${shown(value["@id"])}`;
            const id = this.idOf(value["@id"], (held.inexact & 1) !== 0, element);
            if (id === null) {
                report.counts.skippedNodes++;
                continue;
            }
            // membership lists hold CX ids as written, before the ids option coerces them
            if (!this.inGraph(refId(value["@id"]) ?? id)) {
                continue;
            }
            let row = this.nodeRows.get(id);
            if (row !== undefined) {
                report.warning(
                    "merged",
                    DUPLICATE_NODE_CODE,
                    `${element} is declared more than once; its fields are merged (the later values win)`,
                    { line, element },
                );
            } else {
                try {
                    row = sink.addNode(id);
                } catch (err) {
                    report.recordError(err, { line, element });
                    report.counts.skippedNodes++;
                    continue;
                }
                this.nodeRows.set(id, row);
                report.counts.nodes++;
            }
            this.writeCore("node", row, "name", value.n, element, line);
            this.writeCore("node", row, "represents", value.r, element, line);
        }
    }

    /**
     * Write a core string field (n, r, i).
     * @param domain - node or edge
     * @param row - the row
     * @param name - the column
     * @param raw - the value
     * @param element - the element name
     * @param line - its line
     */
    private writeCore(
        domain: "node" | "edge",
        row: number,
        name: string,
        raw: unknown,
        element: string,
        line: number,
    ): void {
        if (raw === undefined || raw === null) {
            return;
        }
        if (typeof raw !== "string") {
            this.report.error(
                "validation-error",
                BAD_VALUE_CODE,
                `${element}: ${name} is ${shown(raw)}, not a string`,
                {
                    line,
                    element,
                },
            );
            return;
        }
        const handle = this.coreColumn(domain, name);
        if (domain === "node") {
            this.sink.setNodeValue(handle, row, raw);
        } else {
            this.sink.setEdgeValue(handle, row, raw);
        }
        const key = `${domain}:${name}`;
        let values = this.coreValues.get(key);
        if (values === undefined) {
            values = new Map();
            this.coreValues.set(key, values);
        }
        values.set(row, raw);
    }

    /**
     * Read cyGroups: a group's members get the group node as their parent (parents when a node is in
     * several groups); a group whose id is not a node gets one (W_CX_GROUP_NODE_ADDED); collapsed is
     * a bool column on the group node.
     */
    private readGroups(): void {
        const groups = aspect(this.doc, "cyGroups");
        if (groups.length === 0) {
            return;
        }
        const parents = new Map<number, number[]>();
        const collapsed: [number, boolean][] = [];
        for (const { value, line } of groups) {
            if (!isRecord(value)) {
                continue;
            }
            const id = refId(value["@id"]);
            if (id === null) {
                this.report.error("missing-value", MISSING_ID_CODE, "a cyGroups element has no @id", {
                    line,
                    element: "cyGroups",
                });
                continue;
            }
            let groupRow = this.nodeRows.get(this.key(id));
            if (groupRow === undefined) {
                if (this.rootNodes.has(id) || !this.hasMemberIn(value.nodes)) {
                    continue;
                }
                try {
                    groupRow = this.sink.addNode(this.key(id));
                } catch (err) {
                    this.report.recordError(err, { line, element: String(id) });
                    continue;
                }
                this.nodeRows.set(this.key(id), groupRow);
                this.report.counts.nodes++;
                this.report.warning(
                    "coercion",
                    CX_ISSUE.GROUP_NODE_ADDED,
                    `group ${String(id)} is not a node; its group node is added`,
                    { line, element: String(id) },
                );
            }
            if (typeof value.n === "string" && this.coreValue("node", groupRow, "name") === undefined) {
                this.writeCore("node", groupRow, "name", value.n, `group ${String(id)}`, line);
            }
            if (typeof value.collapsed === "boolean") {
                collapsed.push([groupRow, value.collapsed]);
            }
            for (const raw of Array.isArray(value.nodes) ? (value.nodes as unknown[]) : []) {
                const member = refId(raw);
                const row = member === null ? undefined : this.nodeRows.get(this.key(member));
                if (row === undefined) {
                    if (member === null || !this.rootNodes.has(member)) {
                        this.report.error(
                            "missing-value",
                            UNKNOWN_PARENT_CODE,
                            `group ${String(id)}: the member ${shown(raw)} is not a node`,
                            { line, element: String(id) },
                        );
                    }
                    continue;
                }
                if (this.closesCycle(parents, row, groupRow)) {
                    this.report.error(
                        "validation-error",
                        PARENT_CYCLE_CODE,
                        `group ${String(id)}: making ${shown(raw)} a member would close a parent cycle; that membership is dropped`,
                        { line, element: String(id) },
                    );
                    continue;
                }
                const list = parents.get(row) ?? [];
                if (!list.includes(groupRow)) {
                    list.push(groupRow);
                }
                parents.set(row, list);
            }
        }
        this.writeParents(parents);
        if (collapsed.length > 0) {
            const { handle } = declareResolved(
                this.sink,
                "node",
                {
                    name: "collapsed",
                    dtype: "bool",
                    nullable: true,
                    origin: { format: CX_FORMAT, namespace: "cyGroups" },
                },
                this.report,
            );
            for (const [row, flag] of collapsed) {
                this.sink.setNodeValue(handle, row, flag);
            }
        }
    }

    /**
     * Whether a member list names a node of this graph.
     * @param raw - the list
     * @returns true when one member is in the graph
     */
    private hasMemberIn(raw: unknown): boolean {
        return (
            Array.isArray(raw) &&
            raw.some((item) => {
                const id = refId(item);
                return id !== null && this.nodeRows.has(this.key(id));
            })
        );
    }

    /**
     * Whether making `child` a member of `group` closes a cycle: the group already is, through its
     * own parents, below the child.
     * @param parents - the memberships so far
     * @param child - the member row
     * @param group - the group row
     * @returns true for a cycle
     */
    private closesCycle(parents: ReadonlyMap<number, readonly number[]>, child: number, group: number): boolean {
        const stack = [group];
        const seen = new Set<number>();
        while (stack.length > 0) {
            const row = stack.pop() as number;
            if (row === child) {
                return true;
            }
            if (seen.has(row)) {
                continue;
            }
            seen.add(row);
            stack.push(...(parents.get(row) ?? []));
        }
        return false;
    }

    /**
     * Write the group memberships: a parent column, or a parents list column when a node is in
     * several groups.
     * @param parents - member row -> group rows
     */
    private writeParents(parents: ReadonlyMap<number, readonly number[]>): void {
        if (parents.size === 0) {
            return;
        }
        const several = [...parents.values()].some((list) => list.length > 1);
        const decl: ColumnDecl = several
            ? { name: "parents", dtype: "list", itemDtype: "u32", role: "parents", refersTo: "node", nullable: true }
            : { name: "parent", dtype: "u32", role: "parent", refersTo: "node", nullable: true };
        const { handle } = declareResolved(this.sink, "node", decl, this.report);
        for (const [row, list] of parents) {
            this.sink.setNodeValue(handle, row, several ? list : list[0]);
        }
    }

    /**
     * Read cartesianLayout for this graph's views: the first view is the position (y flipped), z the
     * z column, every other view a position@n column.
     */
    private readLayout(): void {
        const entries = aspect(this.doc, "cartesianLayout");
        if (entries.length === 0) {
            return;
        }
        const { views } = this.plan;
        const knownViews = this.allViews();
        const columns = new Map<number, ColumnHandle>();
        const zHandle = { current: INVALID_INDEX as ColumnHandle };
        const seen = new Set<string>();
        const point: [number, number, number] = [0, 0, 0];
        for (const { value, line } of entries) {
            this.checkAbort();
            if (!isRecord(value)) {
                continue;
            }
            const view = value.view === undefined || value.view === null ? null : refId(value.view);
            if (view !== null && knownViews.size > 0 && !knownViews.has(view)) {
                this.dangle("layout view reference");
                continue;
            }
            const slot = view === null ? 0 : views.indexOf(view);
            if (slot < 0) {
                continue;
            }
            if (typeof value.x !== "number" || typeof value.y !== "number") {
                this.report.error(
                    "validation-error",
                    BAD_VALUE_CODE,
                    `a cartesianLayout element for node ${shown(value.node)} has no numeric x and y; skipped`,
                    { line, element: "cartesianLayout" },
                );
                continue;
            }
            const node = refId(value.node);
            const row = node === null ? undefined : this.nodeRows.get(this.key(node));
            if (row === undefined) {
                if (node === null || !this.rootNodes.has(node)) {
                    this.dangle("layout entry");
                }
                continue;
            }
            const key = `${slot}:${row}`;
            if (seen.has(key)) {
                this.report.warnOnce(
                    "validation-error",
                    DUPLICATE_ATTRIBUTE_CODE,
                    `node ${shown(value.node)} has two layout entries for one view; the later wins`,
                    { line, element: "cartesianLayout" },
                    `${DUPLICATE_ATTRIBUTE_CODE}:layout`,
                );
            }
            seen.add(key);
            const z = typeof value.z === "number" ? value.z : null;
            point[0] = value.x;
            point[1] = flipY(value.y);
            point[2] = slot === 0 && this.zAs === "position" && z !== null ? z : 0;
            this.sink.setNodeValue(this.layoutColumn(columns, slot, views), row, point);
            if (slot === 0 && z !== null && this.zAs === "column") {
                zHandle.current = this.structural("node", zHandle.current, zDecl(CX_FORMAT));
                this.sink.setNodeValue(zHandle.current, row, z);
            }
        }
    }

    /**
     * Every view id the document names.
     * @returns the set (empty when the document names none)
     */
    private allViews(): Set<NodeId> {
        const out = new Set<NodeId>();
        for (const { value } of aspect(this.doc, "cyNetworkRelations")) {
            if (isRecord(value) && value.r === "view") {
                const id = refId(value.c);
                if (id !== null) {
                    out.add(id);
                }
            }
        }
        for (const { value } of aspect(this.doc, "cyViews")) {
            const id = isRecord(value) ? refId(value["@id"]) : null;
            if (id !== null) {
                out.add(id);
            }
        }
        return out;
    }

    /**
     * The position column of a view slot, declared on first use.
     * @param columns - slot -> handle
     * @param slot - 0 for the position, n - 1 for position@n
     * @param views - the graph's views
     * @returns the handle
     */
    private layoutColumn(columns: Map<number, ColumnHandle>, slot: number, views: readonly NodeId[]): ColumnHandle {
        let handle = columns.get(slot);
        if (handle === undefined) {
            const base = positionDecl(CX_FORMAT, this.zAs === "position" && slot === 0 ? 3 : 2);
            const decl: ColumnDecl =
                slot === 0
                    ? base
                    : {
                          ...base,
                          name: `position@${slot + 1}`,
                          role: undefined,
                          origin: { format: CX_FORMAT, namespace: "cytoscape", id: String(views[slot]) },
                      };
            ({ handle } = declareResolved(this.sink, "node", decl, this.report));
            columns.set(slot, handle);
        }
        return handle;
    }

    // ------------------------------------------------------------ edges

    /** Read the edges of this graph. */
    private readEdges(): void {
        const { report, sink } = this;
        const members = this.plan.edges;
        for (const held of aspect(this.doc, "edges")) {
            this.checkAbort();
            const { value, line } = held;
            if (!isRecord(value)) {
                report.error(
                    "parse-error",
                    BAD_ASPECT_BLOCK_CODE,
                    `an edges element is ${shown(value)}, not an object`,
                    {
                        line,
                        element: "edges",
                    },
                );
                report.counts.skippedEdges++;
                continue;
            }
            if (value["@id"] === undefined || value["@id"] === null) {
                report.error("missing-value", MISSING_ID_CODE, "an edge has no @id", { line, element: "edges" });
                report.counts.skippedEdges++;
                continue;
            }
            const element = `edge ${shown(value["@id"])}`;
            const id = this.idOf(value["@id"], (held.inexact & 1) !== 0, element, true);
            if (id === null) {
                report.counts.skippedEdges++;
                continue;
            }
            if (members !== null && !members.has(refId(value["@id"]) ?? id)) {
                continue;
            }
            if (value.s === undefined || value.s === null || value.t === undefined || value.t === null) {
                report.error(
                    "missing-value",
                    MISSING_ENDPOINT_CODE,
                    `${element} has no ${value.s === undefined || value.s === null ? "s" : "t"}`,
                    {
                        line,
                        element,
                    },
                );
                report.counts.skippedEdges++;
                continue;
            }
            const s = this.idOf(value.s, (held.inexact & 2) !== 0, element);
            const t = s === null ? null : this.idOf(value.t, (held.inexact & 4) !== 0, element);
            if (s === null || t === null) {
                report.counts.skippedEdges++;
                continue;
            }
            if (this.edgeRows.has(id)) {
                report.error(
                    "validation-error",
                    DUPLICATE_EDGE_ID_CODE,
                    `${element} is declared more than once; the later edge is skipped`,
                    { line, element },
                );
                report.counts.skippedEdges++;
                continue;
            }
            if (!this.endpoint(s, element, line) || !this.endpoint(t, element, line)) {
                report.counts.skippedEdges++;
                continue;
            }
            let weight: number | undefined;
            try {
                weight = this.weightOf(id);
            } catch (err) {
                report.recordError(err, { line, element });
                report.counts.skippedEdges++;
                continue;
            }
            const before = sink.edgeCount;
            let edge: number;
            try {
                edge = this.direction.addEdge(s, t, "directed", weight, { line, element });
            } catch (err) {
                report.recordError(err, { line, element });
                report.counts.skippedEdges++;
                continue;
            }
            if (weight !== undefined) {
                this.weighted = true;
            }
            report.counts.edges += sink.edgeCount - before;
            this.edgeRows.set(id, edge);
            this.edgeIdHandle = this.structural("edge", this.edgeIdHandle, {
                name: uniqueColumnName("id", "cx", (n) => sink.edgeColumn(n) !== INVALID_INDEX),
                dtype: "f64",
                role: "id",
                nullable: true,
            });
            sink.setEdgeValue(this.edgeIdHandle, edge, typeof id === "number" ? id : Number(id));
            this.writeCore("edge", edge, "interaction", value.i, element, line);
        }
    }

    /**
     * Whether an endpoint is a node of this graph; under addMissingNodes it is created.
     * @param id - the endpoint
     * @param element - the edge name
     * @param line - its line
     * @returns false when the edge is to be skipped (reported)
     */
    private endpoint(id: NodeId, element: string, line: number): boolean {
        if (this.nodeRows.has(id)) {
            return true;
        }
        if (!this.options.addMissingNodes) {
            this.report.error(
                "missing-value",
                CX_ISSUE.UNKNOWN_NODE,
                `${element}: the endpoint ${String(id)} is not a node of the graph; the edge is skipped`,
                { line, element },
            );
            return false;
        }
        try {
            this.nodeRows.set(id, this.sink.addNode(id));
        } catch (err) {
            this.report.recordError(err, { line, element });
            return false;
        }
        this.report.counts.nodes++;
        return true;
    }

    /** The weight attribute values of the edges, by edge id (built once). */
    private weights: Map<NodeId, unknown> | null = null;

    /**
     * The weight of an edge: its weightFrom attribute, parsed as a number.
     * @param id - the edge id
     * @returns the weight, or undefined; E_INVALID_WEIGHT for a non-number
     */
    private weightOf(id: NodeId): number | undefined {
        const { weightFrom } = this.options;
        if (weightFrom === null) {
            return undefined;
        }
        if (this.weights === null) {
            this.weights = new Map();
            for (const { value } of this.doc.attributes.edge.get(weightFrom) ?? []) {
                if (isRecord(value) && this.scopePeek(value.s) !== 0) {
                    const po = refId(value.po);
                    if (po !== null && value.v !== undefined && value.v !== null) {
                        this.weights.set(this.key(po), plainJson(value.v));
                    }
                }
            }
        }
        const raw = this.weights.get(id);
        if (typeof raw === "string" && isNullText(raw)) {
            return undefined;
        }
        return weightFromValue(raw);
    }

    // ------------------------------------------------------------ network, visual properties, provenance

    /** Write the network attributes (unscoped and this subnetwork's, its own winning) as graph columns. */
    private readNetworkAttributes(): void {
        for (const [name, elements] of this.doc.attributes.network) {
            let chosen: Record<string, unknown> | null = null;
            let chosenScope = 0;
            for (const { value } of elements) {
                if (!isRecord(value)) {
                    continue;
                }
                const scope = this.scopeOf(value.s);
                if (scope !== 0 && scope >= chosenScope) {
                    chosen = value;
                    chosenScope = scope;
                }
            }
            if (chosen === null || chosen.v === undefined || chosen.v === null || name === "") {
                continue;
            }
            const type = cxType(chosen.d);
            if (type === null) {
                this.report.warnOnce(
                    "unsupported",
                    UNKNOWN_ATTR_TYPE_CODE,
                    `the network attribute "${name}" declares a data type CX does not define; kept as text`,
                    { element: name },
                    `${UNKNOWN_ATTR_TYPE_CODE}:network:${name}`,
                );
            }
            const effective = type ?? { scalar: "string", list: false };
            const parsed = parseValue(chosen.v, effective, this.options.long, (digits) => {
                this.precision(name, digits);
            });
            if (parsed === UNSET) {
                continue;
            }
            if (parsed === BAD) {
                this.report.error(
                    "validation-error",
                    BAD_VALUE_CODE,
                    `the network attribute "${name}" is ${shown(chosen.v)}, not a ${typeText(effective)}; unset`,
                    { element: name },
                );
                continue;
            }
            if ((name === "name" || name === "description") && typeof parsed === "string") {
                continue;
            }
            const scalar = scalarDtype(effective.scalar, this.options.long);
            try {
                this.sink.setGraphValue(name, parsed, {
                    dtype: effective.list ? "list" : scalar,
                    ...(effective.list ? { itemDtype: scalar } : {}),
                    origin: { format: CX_FORMAT, id: null, type: typeText(effective) },
                });
            } catch (err) {
                this.report.recordError(err, { element: name });
            }
        }
    }

    /**
     * Read cyVisualProperties for this graph's views: per-element and network values become columns
     * (origin namespace cx.bypass); defaults, mappings and dependencies are style rules, kept and not
     * applied.
     */
    private readVisualProperties(): void {
        const entries = aspect(this.doc, "cyVisualProperties");
        // Cytoscape's table-cell styles: a visual property aspect graph-io keeps but does not read
        const tableStyles = TABLE_STYLE_ASPECTS.reduce((n, name) => n + (this.doc.kept.get(name)?.length ?? 0), 0);
        // the graph's own view (its first): the one its positions come from; the others stay in meta.extra.cx
        const views = new Set(this.plan.views.slice(0, 1));
        const columns = { node: new Map<string, [number, string][]>(), edge: new Map<string, [number, string][]>() };
        const network = new Map<string, string>();
        let defaults = 0;
        let mappings = 0;
        let dependencies = 0;
        for (const { value } of entries) {
            if (!isRecord(value)) {
                continue;
            }
            const view = value.view === undefined || value.view === null ? null : refId(value.view);
            if (view !== null && views.size > 0 && !views.has(view)) {
                continue;
            }
            const properties = isRecord(value.properties) ? value.properties : {};
            mappings += isRecord(value.mappings) ? Object.keys(value.mappings).length : 0;
            dependencies += isRecord(value.dependencies) ? Object.keys(value.dependencies).length : 0;
            switch (value.properties_of) {
                case "nodes":
                case "edges": {
                    const domain = value.properties_of === "nodes" ? "node" : "edge";
                    const target = refId(value.applies_to);
                    const rows = domain === "node" ? this.nodeRows : this.edgeRows;
                    const row = target === null ? undefined : rows.get(this.key(target));
                    if (row === undefined) {
                        if (target === null || !(domain === "node" ? this.rootNodes : this.rootEdges).has(target)) {
                            this.dangle(`${domain} visual property entry`);
                        }
                        continue;
                    }
                    for (const [property, raw] of Object.entries(properties)) {
                        const list = columns[domain].get(property) ?? [];
                        list.push([row, typeof raw === "string" ? raw : JSON.stringify(raw)]);
                        columns[domain].set(property, list);
                    }
                    break;
                }
                case "network":
                    for (const [property, raw] of Object.entries(properties)) {
                        network.set(property, typeof raw === "string" ? raw : JSON.stringify(raw));
                    }
                    break;
                default:
                    defaults += Object.keys(properties).length;
                    break;
            }
        }
        for (const domain of ["node", "edge"] as const) {
            for (const [property, cells] of columns[domain]) {
                const handle = declareFresh(
                    this.sink,
                    domain,
                    {
                        name: property,
                        dtype: "string",
                        nullable: true,
                        origin: { format: CX_FORMAT, id: null, namespace: CX_BYPASS_NAMESPACE },
                    },
                    this.report,
                );
                for (const [row, text] of cells) {
                    if (domain === "node") {
                        this.sink.setNodeValue(handle, row, text);
                    } else {
                        this.sink.setEdgeValue(handle, row, text);
                    }
                }
            }
        }
        for (const [property, text] of network) {
            try {
                this.sink.setGraphValue(property, text, {
                    dtype: "string",
                    origin: { format: CX_FORMAT, id: null, namespace: CX_BYPASS_NAMESPACE },
                });
            } catch (err) {
                this.report.recordError(err, { element: property });
            }
        }
        if (defaults + mappings + dependencies + tableStyles > 0) {
            const parts = [
                `cyVisualProperties: ${defaults} default(s), ${mappings} mapping(s), ${dependencies} dependenc(ies)`,
            ];
            if (tableStyles > 0) {
                parts.push(`${tableStyles} table style element(s)`);
            }
            this.report.warning(
                "unsupported",
                STYLES_NOT_IMPORTED_CODE,
                `the file's style rules are not applied (${parts.join("; ")}); they are kept in meta.extra.cx (style import is issue #706)`,
                { element: "cyVisualProperties" },
            );
        }
    }

    /**
     * Read the provenance aspects: citations and supports as extension tables cx:citations and
     * cx:supports, the node / edge links to them as list columns, functionTerms as a json column,
     * reifiedEdges as a u32 column referring to edges.
     */
    private readProvenance(): void {
        for (const name of ["citations", "supports"] as const) {
            this.extensionTable(`cx:${name}`, aspect(this.doc, name));
        }
        for (const [aspectName, domain, column] of [
            ["nodeCitations", "node", "citations"],
            ["edgeCitations", "edge", "citations"],
            ["nodeSupports", "node", "supports"],
            ["edgeSupports", "edge", "supports"],
        ] as const) {
            this.linkColumn(aspectName, domain, column);
        }
        const terms: [number, unknown][] = [];
        for (const { value } of aspect(this.doc, "functionTerms")) {
            if (!isRecord(value)) {
                continue;
            }
            const po = refId(value.po);
            const row = po === null ? undefined : this.nodeRows.get(this.key(po));
            if (row === undefined) {
                if (po === null || !this.rootNodes.has(po)) {
                    this.dangle("functionTerms entry");
                }
                continue;
            }
            const { po: _po, ...term } = value;
            terms.push([row, plainJson(term)]);
        }
        this.writeColumn("node", "functionTerm", "json", null, terms);
        const reified: [number, number][] = [];
        for (const { value } of aspect(this.doc, "reifiedEdges")) {
            if (!isRecord(value)) {
                continue;
            }
            const node = refId(value.node);
            const edge = refId(value.edge);
            const row = node === null ? undefined : this.nodeRows.get(this.key(node));
            const edgeRow = edge === null ? undefined : this.edgeRows.get(this.key(edge));
            if (row === undefined || edgeRow === undefined) {
                if (node === null || !this.rootNodes.has(node) || edge === null || !this.rootEdges.has(edge)) {
                    this.dangle("reifiedEdges entry");
                }
                continue;
            }
            reified.push([row, edgeRow]);
        }
        if (reified.length > 0) {
            const { handle } = declareResolved(
                this.sink,
                "node",
                {
                    name: "reifiedEdge",
                    dtype: "u32",
                    refersTo: "edge",
                    nullable: true,
                    origin: { format: CX_FORMAT, namespace: "reifiedEdges" },
                },
                this.report,
            );
            for (const [row, edge] of reified) {
                this.sink.setNodeValue(handle, row, edge);
            }
        }
    }

    /**
     * An extension table of a provenance aspect: an f64 `id` column and one json column per field.
     * @param name - the table name
     * @param elements - the elements
     */
    private extensionTable(name: string, elements: readonly Held[]): void {
        const records = elements.map((h) => h.value).filter(isRecord);
        if (records.length === 0) {
            return;
        }
        const fields = [...new Set(records.flatMap((r) => Object.keys(r)).filter((k) => k !== "@id"))];
        const decls: ColumnDecl[] = [
            { name: "id", dtype: "f64", nullable: true },
            ...fields.map((field): ColumnDecl => ({ name: field, dtype: "json", nullable: true })),
        ];
        const table = this.sink.addExtensionTable(name, decls);
        for (const record of records) {
            const id = refId(record["@id"]);
            this.sink.addExtensionRow(table, [
                id === null ? null : Number(id),
                ...fields.map((field) => (record[field] === undefined ? null : plainJson(record[field]))),
            ]);
        }
    }

    /**
     * A list column of the citation or support ids a node or edge links to.
     * @param aspectName - nodeCitations, edgeCitations, nodeSupports or edgeSupports
     * @param domain - node or edge
     * @param column - citations or supports
     */
    private linkColumn(aspectName: string, domain: "node" | "edge", column: "citations" | "supports"): void {
        const rows = domain === "node" ? this.nodeRows : this.edgeRows;
        const root = domain === "node" ? this.rootNodes : this.rootEdges;
        const links = new Map<number, number[]>();
        for (const { value } of aspect(this.doc, aspectName)) {
            if (!isRecord(value)) {
                continue;
            }
            const targets = Array.isArray(value.po) ? (value.po as unknown[]) : [value.po];
            const ids = (Array.isArray(value[column]) ? (value[column] as unknown[]) : [])
                .map(refId)
                .filter((id): id is NodeId => id !== null)
                .map(Number);
            for (const raw of targets) {
                const target = refId(raw);
                const row = target === null ? undefined : rows.get(this.key(target));
                if (row === undefined) {
                    if (target === null || !root.has(target)) {
                        this.dangle(`${aspectName} entry`);
                    }
                    continue;
                }
                links.set(row, [...(links.get(row) ?? []), ...ids]);
            }
        }
        this.writeColumn(domain, column, "list", "f64", [...links]);
    }

    /**
     * Declare a column and write its cells (nothing when there are none).
     * @param domain - node or edge
     * @param name - the column name
     * @param dtype - the dtype
     * @param itemDtype - the list item dtype, or null
     * @param cells - row and value pairs
     */
    private writeColumn(
        domain: "node" | "edge",
        name: string,
        dtype: Dtype,
        itemDtype: ScalarDtype | null,
        cells: readonly (readonly [number, unknown])[],
    ): void {
        if (cells.length === 0) {
            return;
        }
        const decl: ColumnDecl = {
            name,
            dtype,
            ...(itemDtype === null ? {} : { itemDtype }),
            nullable: true,
            origin: { format: CX_FORMAT, namespace: "provenance" },
        };
        const { handle } = declareResolved(this.sink, domain, decl, this.report);
        for (const [row, value] of cells) {
            if (domain === "node") {
                this.sink.setNodeValue(handle, row, value);
            } else {
                this.sink.setEdgeValue(handle, row, value);
            }
        }
    }

    /** Record the metadata: source format, name, description, id type, the kept aspects. */
    private setMeta(): void {
        const describe = (key: string): string | null => {
            let found: string | null = null;
            for (const { value } of this.doc.attributes.network.get(key) ?? []) {
                if (isRecord(value) && typeof value.v === "string") {
                    const scope = this.scopePeek(value.s);
                    if (scope === 2) {
                        return value.v;
                    }
                    if (scope === 1) {
                        found ??= value.v;
                    }
                }
            }
            return found;
        };
        const extra: Record<string, unknown> = Object.fromEntries(this.doc.kept);
        const groups = aspect(this.doc, "cyGroups").map((h) => plainJson(h.value));
        if (groups.length > 0) {
            extra.groups = groups;
        }
        if (this.plan.subnetwork !== null) {
            extra.subnetwork = this.plan.subnetwork;
        }
        const { weightFrom } = this.options;
        const name = this.plan.name ?? describe("name");
        const description = describe("description");
        const patch: GraphMetaPatch = {
            sourceFormat: CX_FORMAT,
            sourceVersion: "1",
            idType: this.idType,
            ...(name === null ? {} : { name }),
            ...(description === null ? {} : { description }),
            ...(this.weighted && weightFrom !== null
                ? { weightOrigin: { format: CX_FORMAT, id: null, title: weightFrom, type: "double", namespace: null } }
                : {}),
            extra: { cx: extra },
        };
        this.sink.setMeta(patch);
    }
}

// ============================================================ the plugin

/**
 * Read a document, then build the graphs `pick` selects.
 * @param input - the input
 * @param options - the caller's options
 * @param sinkFor - the sink of graph i, or null to skip it
 * @param pick - which graph indexes to build, given the plans and the first report
 * @returns one report per built graph
 */
async function run(
    input: ImportInput,
    options: (CxImportOptions & CommonImportOptions) | undefined,
    sinkFor: (index: number) => GraphSink,
    pick: (plans: readonly GraphPlan[], report: ImportReportBuilder) => readonly number[],
): Promise<ImportReport[]> {
    const resolved = resolveImportOptions(options, FORMAT_DEFAULTS);
    const zAs = zAsOption(options?.zAs);
    const first = new ImportReportBuilder(CX_FORMAT, resolved.errorLimit);
    reportUnusedOptions(options, first, USED_OPTIONS);
    const doc = await readDocument(input, first, resolved);
    const plans = graphPlans(doc);
    const chosen = pick(plans, first);
    const reports: ImportReport[] = [];
    chosen.forEach((index, k) => {
        const report = k === 0 ? first : new ImportReportBuilder(CX_FORMAT, resolved.errorLimit);
        const sink = sinkFor(index);
        reportSinkOptions(sink, options, report, true);
        new CxReader(sink, report, resolved, zAs, doc, plans[index]).build();
        throwIfAborted(resolved.signal);
        reports.push(report.finish());
    });
    return reports;
}

/**
 * The CX version 1 importer plugin (design section 1.2).
 */
export const cxImporter: GraphImporter<CxImportOptions> = Object.freeze({
    format: CX_FORMAT,
    extensions: Object.freeze([".cx"]),
    mimeTypes: Object.freeze(["application/json"]),

    /**
     * Confidence that the head is CX version 1: 0.95 when a top-level array starts with an object
     * whose first key is numberVerification or metaData (Cytoscape's file filter), 0.7 for another
     * CX aspect name.
     * @param head - the first bytes
     * @returns the confidence
     */
    sniff(head: Uint8Array): number {
        const text = new TextDecoder("utf-8").decode(head.subarray(0, 1024)).replace(/^\uFEFF/, "");
        const match = /^\s*\[\s*\{\s*"((?:[^"\\]|\\.)*)"\s*:/.exec(text);
        if (match === null) {
            return 0;
        }
        if (CX_FIRST_KEYS.includes(match[1])) {
            return 0.95;
        }
        return CX_ASPECT_KEYS.includes(match[1]) ? 0.7 : 0;
    },

    /**
     * Read one graph of a CX document into the sink: the root network, or the subnetwork
     * graphIndex / graphName picks (the first by default; W_MULTIPLE_GRAPHS names the others).
     * @param input - the text, bytes or stream
     * @param sink - the sink
     * @param options - format-specific and common options
     * @returns the import report; ImportError on a fatal error or beyond the error limit
     */
    async import(
        input: ImportInput,
        sink: GraphSink,
        options?: CxImportOptions & CommonImportOptions,
    ): Promise<ImportReport> {
        const [report] = await run(
            input,
            options,
            () => sink,
            (plans, first) => {
                const index = chooseGraph(
                    plans.map((p) => p.name),
                    options,
                    first,
                );
                if (plans.length > 1) {
                    first.warning(
                        "unsupported",
                        MULTIPLE_GRAPHS_CODE,
                        `the collection holds ${plans.length} subnetworks; graph ${index} is read and ${plans.length - 1} skipped (importAll() reads every one)`,
                    );
                }
                return [index];
            },
        );
        return report;
    },

    /**
     * Read every graph of a CX document: one per subnetwork of a collection, in the order of
     * cyNetworkRelations; the root network for any other document.
     * @param input - the text, bytes or stream
     * @param sinkFor - the sink of the graph with this index, called before its first push
     * @param options - format-specific and common options
     * @returns one report per graph
     */
    importAll(
        input: ImportInput,
        sinkFor: (index: number) => GraphSink,
        options?: CxImportOptions & CommonImportOptions,
    ): Promise<ImportReport[]> {
        return run(input, options, sinkFor, (plans) => plans.map((p) => p.index));
    },

    /**
     * List the graphs of a CX document with their names and member counts.
     * @param input - the text, bytes or stream
     * @param options - format-specific and common options
     * @returns one listing per graph
     */
    async listGraphs(
        input: ImportInput,
        options?: CxImportOptions & CommonImportOptions,
    ): Promise<readonly GraphListing[]> {
        const resolved = resolveImportOptions(options, FORMAT_DEFAULTS);
        const report = new ImportReportBuilder(CX_FORMAT, resolved.errorLimit);
        const doc = await readDocument(input, report, resolved);
        const nodes = aspect(doc, "nodes").length;
        const edges = aspect(doc, "edges").length;
        return graphPlans(doc).map((plan) =>
            Object.freeze({
                index: plan.index,
                name: plan.name,
                nodes: memberCount(plan.nodes, nodes),
                edges: memberCount(plan.edges, edges),
            }),
        );
    },
});
