/**
 * The CX2 importer (design/graph-io/cytoscape-and-obo/design.md section 1.3; the feature and error
 * inventory is research-cx2.md): the JSON exchange format of NDEx, Cytoscape 3.10+ and Cytoscape
 * Web. A CX2 document is one array: a descriptor (`CXVersion`), aspect blocks (`nodes`, `edges`,
 * `attributeDeclarations`, `networkAttributes`, `nodeBypasses`, `visualProperties`, opaque
 * aspects) and a final `status`.
 *
 * The document is read through the streaming scanner of common/json-elements.ts, so its text is
 * never held as one string; the parsed aspect elements are collected and the graph is built at the
 * end, which makes every aspect order the format allows (declarations after the nodes, edges
 * before their nodes) read the same.
 *
 * Mapping: every edge is directed (CX2 has no undirected edge); node ids follow the CX id rule
 * (design section 1.0.2); declared attributes become typed columns named by their full name, with
 * the alias in `origin.id` and the declared default in `meta.default`; `name` is the label; node
 * `x` / `y` become the position column with y flipped to y-up, `z` the `z` column; per-element
 * bypasses become one column per visual property (origin namespace "cx2.bypass"); style rules
 * (`visualProperties`, `visualEditorProperties`) and every opaque aspect are kept verbatim in
 * `meta.extra.cx2.opaque` and are not applied (W_STYLES_NOT_IMPORTED, issue #706).
 */

import {
    type ColumnDecl,
    type ColumnHandle,
    type Dtype,
    GraphFormatError,
    type GraphMetaPatch,
    type GraphSink,
    INVALID_INDEX,
    type NodeId,
    type ScalarDtype,
} from "@graphty/graph-format";

import { declareResolved, uniqueColumnName } from "../../common/attributes.js";
import {
    ASPECT_ORDER_CODE,
    BAD_ASPECT_BLOCK_CODE,
    BAD_DEFAULT_CODE,
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
    ID_MERGED_CODE,
    ID_TEXT_TYPE_CODE,
    INVALID_ENCODING_CODE,
    INVALID_UTF8_CODE,
    JSON_NONSTANDARD_NUMBER_CODE,
    MISSING_ENDPOINT_CODE,
    MISSING_ID_CODE,
    MULTI_ASPECT_FRAGMENT_CODE,
    OPTION_IGNORED_CODE,
    PRECISION_CODE,
    ROLE_TAKEN_CODE,
    SINGLE_OBJECT_ASPECT_CODE,
    SINK_OPTION_CODE,
    STATUS_FAILED_CODE,
    STATUS_WARNING_CODE,
    STYLES_NOT_IMPORTED_CODE,
    SYNTAX_CODE,
    TOO_LARGE_CODE,
    UNKNOWN_ATTR_TYPE_CODE,
    UNKNOWN_ELEMENT_CODE,
    UNKNOWN_ENCODING_CODE,
} from "../../common/codes.js";
import { DirectionResolver } from "../../common/direction.js";
import { IdCoercer } from "../../common/ids.js";
import { textChunks, throwIfAborted } from "../../common/input.js";
import {
    cxId,
    CxStructure,
    declareFresh,
    ExactInteger,
    fitsF32,
    flipY,
    headText,
    inexactLiteral,
    isRecord,
    JsonScanError,
    keptPrecision,
    plainJson,
    positionDecl,
    reportSharedBlock,
    reportTooDeep,
    scanAspects,
    setOwn,
    zDecl,
} from "../../common/json-elements.js";
import {
    type ImportFormatDefaults,
    reportSinkOptions,
    reportUnusedOptions,
    type ResolvedImportOptions,
    resolveImportOptions,
} from "../../common/options.js";
import { ImportReportBuilder } from "../../common/report.js";
import { weightFromValue } from "../../common/weights.js";
import { type CommonImportOptions, type GraphImporter, type ImportInput, type ImportReport } from "../../types.js";

/** The format name. */
export const CX2_FORMAT = "cx2";

/** The node attribute the exporter's `sanitizeIds: "mangle"` keeps an original id in. */
export const ORIGINAL_ID_ATTRIBUTE = "graphty:originalId";

/** The origin namespace of the per-element visual property columns. */
export const BYPASS_NAMESPACE = "cx2.bypass";

/** The format-specific options of the CX2 importer. */
export interface Cx2ImportOptions {
    /**
     * Where a node's `z` goes: "column" (default) keeps it in the f64 node column `z` (Cytoscape
     * writes a stacking order there); "position" makes it the third component of the position.
     */
    zAs?: "column" | "position" | undefined;
}

/**
 * The issue codes the CX2 importer records (design section 1.3), by name: the codes shared with
 * the other importers (src/common/codes.ts) and the CX2-specific ones. A key is the code without
 * its severity and format prefixes.
 */
export const CX2_ISSUE = Object.freeze({
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
    /** The document is not an array or does not start with a descriptor holding CXVersion (fatal). */
    NO_DESCRIPTOR: "E_CX2_NO_DESCRIPTOR",
    /** CXVersion names a major version other than 2 (fatal); "1.x" says the file is CX1. */
    VERSION: "E_CX2_VERSION",
    /** CXVersion is a 2.x other than "2.0" (or not a string); the document is read. */
    MINOR_VERSION: "W_CX2_MINOR_VERSION",
    /** The document has no status block, or a malformed one. */
    NO_STATUS: "E_CX2_NO_STATUS",
    /** The producer marked the document as failed (fatal). */
    STATUS_FAILED: STATUS_FAILED_CODE,
    /** The producer marked the document as successful with an error text. */
    STATUS_WARNING: STATUS_WARNING_CODE,
    /** An aspect appears in several blocks although the descriptor does not declare fragments. */
    UNDECLARED_FRAGMENTS: "W_CX2_UNDECLARED_FRAGMENTS",
    /** An attribute declared twice with two different types; the first declaration wins. */
    DECLARATION_CONFLICT: "E_CX2_DECLARATION_CONFLICT",
    /** An attribute value whose name no declaration covers; its column is inferred. */
    UNDECLARED_ATTRIBUTE: "W_CX2_UNDECLARED_ATTRIBUTE",
    /** A node or edge attribute named `id`, which the specification reserves. */
    RESERVED_KEY: "W_CX2_RESERVED_KEY",
    /** An alias that is another attribute's name or another attribute's alias; the alias is ignored. */
    ALIAS_CONFLICT: "E_CX2_ALIAS_CONFLICT",
    /** A network attribute declaration with an alias or a default, which CX2 forbids; both ignored. */
    NETWORK_DECLARATION: "W_CX2_NETWORK_DECLARATION",
    /** An aspect that holds one element holds several; the first is read. */
    EXTRA_ELEMENTS: "W_CX2_EXTRA_ELEMENTS",
    /** Some nodes have coordinates and others none, or a node has x without y. */
    PARTIAL_LAYOUT: "W_CX2_PARTIAL_LAYOUT",
    /** A full attribute name used where its alias is declared; read as the same attribute. */
    ALIAS_BYPASSED: "W_CX2_ALIAS_BYPASSED",
    /** A CX1 cartesianLayout aspect next to node coordinates; kept, not applied. */
    LEGACY_LAYOUT: "W_CX2_LEGACY_LAYOUT",
    /** An aspect CX2 defines as an array of elements written as one object; read as one element. */
    SINGLE_OBJECT_ASPECT: SINGLE_OBJECT_ASPECT_CODE,
    /** A member holding several aspects; each array-valued key is read as its own block. */
    MULTI_ASPECT_FRAGMENT: MULTI_ASPECT_FRAGMENT_CODE,
    /** The bare tokens NaN / Infinity / -Infinity (Python's json writes them), read as numbers. */
    JSON_NONSTANDARD_NUMBER: JSON_NONSTANDARD_NUMBER_CODE,
    /** The file's style rules are not applied (issue #706). */
    STYLES_NOT_IMPORTED: STYLES_NOT_IMPORTED_CODE,
    /** A member of the top-level array that is not a one-key aspect block, or an element that is not an object. */
    BAD_ASPECT_BLOCK: BAD_ASPECT_BLOCK_CODE,
    /** An aspect out of its place (after the post-metadata or the status, a third metaData, late declarations). */
    ASPECT_ORDER: ASPECT_ORDER_CODE,
    /** A metaData element count disagrees with what was read. */
    COUNT_MISMATCH: COUNT_MISMATCH_CODE,
    /** A value that does not match its declared type; the cell is unset. */
    BAD_VALUE: BAD_VALUE_CODE,
    /** A declared default that does not match its type. */
    BAD_DEFAULT: BAD_DEFAULT_CODE,
    /** A declared type CX2 does not define; the column is inferred from the values. */
    UNKNOWN_ATTR_TYPE: UNKNOWN_ATTR_TYPE_CODE,
    /** A bypass or a layout entry naming no node or edge. */
    DANGLING_REFERENCE: DANGLING_REFERENCE_CODE,
    /** The same attribute twice on one element (its alias and its full name). */
    DUPLICATE_ATTRIBUTE: DUPLICATE_ATTRIBUTE_CODE,
    /** A node without an id. */
    MISSING_ID: MISSING_ID_CODE,
    /** An edge without s or t. */
    MISSING_ENDPOINT: MISSING_ENDPOINT_CODE,
    /** A node id declared twice; the second merges into the first. */
    DUPLICATE_NODE: DUPLICATE_NODE_CODE,
    /** An edge id declared twice; the second edge is skipped. */
    DUPLICATE_EDGE_ID: DUPLICATE_EDGE_ID_CODE,
    /** An id that is not an integer. */
    INVALID_ID: "E_INVALID_ID",
    /** An edge endpoint naming no node (addMissingNodes false, the default). */
    UNKNOWN_NODE: "E_UNKNOWN_NODE",
    /** A weight that is not a number. */
    INVALID_WEIGHT: "E_INVALID_WEIGHT",
    /** An id spelled as a string or a non-integer literal; read as the integer. */
    ID_TEXT_TYPE: ID_TEXT_TYPE_CODE,
    /** An integer beyond 2^53: an id kept as its digits, a value stored as the nearest f64. */
    PRECISION: PRECISION_CODE,
    /** Two id texts merged under `ids: "number"`. */
    ID_MERGED: ID_MERGED_CODE,
    /** An element key CX2 does not define. */
    UNKNOWN_ELEMENT: UNKNOWN_ELEMENT_CODE,
    /** A column renamed because its name was taken. */
    COLUMN_RENAMED: COLUMN_RENAMED_CODE,
    /** A column that lost its role because another column holds it. */
    ROLE_TAKEN: ROLE_TAKEN_CODE,
    /** The sink refused the direction. */
    DIRECTION_REFUSED: DIRECTION_REFUSED_CODE,
    /** Edges forced to the policy's direction. */
    DIRECTION_FORCED: DIRECTION_FORCED_CODE,
    /** A common option CX2 has no use for. */
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
    "restoreMangledIds",
    "errorLimit",
    "signal",
    "onProgress",
]);

/** CX2 has no undirected edge: defaultDirected never applies (reported W_OPTION_IGNORED). */
const FORMAT_DEFAULTS: ImportFormatDefaults = {
    ids: "keep",
    defaultDirected: true,
    weightFrom: "weight",
    addMissingNodes: false,
};

const ABORT_CHECK_INTERVAL = 64;

/** The keys a node element defines. */
const NODE_KEYS: ReadonlySet<string> = new Set(["id", "x", "y", "z", "v"]);

/** The keys an edge element defines. */
const EDGE_KEYS: ReadonlySet<string> = new Set(["id", "s", "t", "v"]);

/** The aspects that hold one element. */
const SINGLE_ELEMENT_ASPECTS: readonly string[] = ["networkAttributes", "visualProperties", "visualEditorProperties"];

/** The aspects whose content is a style rule (design section 2). */
const STYLE_ASPECTS: readonly string[] = [
    "visualProperties",
    "visualEditorProperties",
    "cyVisualProperties",
    "tableVisualProperties",
    "cyTableVisualProperties",
];

/** The aspects the stream structure owns; never kept as opaque. */
const STRUCTURE_ASPECTS: ReadonlySet<string> = new Set(["metaData", "status"]);

/** The aspects CX2 defines as an array of elements, which a reader expects in that form. */
const ARRAY_ASPECTS: ReadonlySet<string> = new Set([
    "nodes",
    "edges",
    "attributeDeclarations",
    "networkAttributes",
    "nodeBypasses",
    "edgeBypasses",
    "status",
    "metaData",
]);

/** The canonical CX2 scalar types. */
type Cx2Scalar = "string" | "long" | "integer" | "double" | "boolean";

/** A declared CX2 type. */
interface Cx2Type {
    /** The canonical type text (`list_of_double`). */
    readonly d: string;
    /** The scalar (or item) type. */
    readonly scalar: Cx2Scalar;
    /** Whether the type is a list. */
    readonly list: boolean;
}

/** The type spellings CX2 defines, plus the Python spellings ndex2 writes. */
const SCALARS: ReadonlyMap<string, Cx2Scalar> = new Map([
    ["string", "string"],
    ["long", "long"],
    ["integer", "integer"],
    ["double", "double"],
    ["boolean", "boolean"],
    ["str", "string"],
    ["int", "integer"],
    ["bool", "boolean"],
    ["float", "double"],
]);

/**
 * Resolve a declared type text.
 * @param d - the `d` value
 * @returns the type, or null when CX2 does not define it
 */
export function cx2Type(d: string): Cx2Type | null {
    const list = d.startsWith("list_of_");
    const scalar = SCALARS.get(list ? d.slice("list_of_".length) : d);
    if (scalar === undefined) {
        return null;
    }
    return { d: list ? `list_of_${scalar}` : scalar, scalar, list };
}

/**
 * The column dtype of a scalar type.
 * @param scalar - the type
 * @param long - the importer's `long` option
 * @returns the dtype
 */
function scalarDtype(scalar: Cx2Scalar, long: "f64" | "string"): ScalarDtype {
    switch (scalar) {
        case "string":
            return "string";
        case "long":
            return long === "string" ? "string" : "f64";
        case "integer":
            return "i32";
        case "double":
            return "f64";
        case "boolean":
            return "bool";
        default: {
            const name: string = scalar;
            return name as ScalarDtype;
        }
    }
}

/** What convertScalar() returns for a value of the wrong type. */
const BAD = Symbol("bad");

const I32_MIN = -2147483648;
const I32_MAX = 2147483647;

/**
 * Convert one JSON value (or list item) by a declared scalar type.
 * @param value - the value (never null)
 * @param scalar - the type
 * @param long - the importer's `long` option
 * @param onPrecision - called for a long beyond 2^53
 * @returns the value to store, or BAD
 */
function convertScalar(
    value: unknown,
    scalar: Cx2Scalar,
    long: "f64" | "string",
    onPrecision: (digits: string) => void,
): unknown {
    switch (scalar) {
        case "string":
            return typeof value === "string" ? value : BAD;
        case "boolean":
            return typeof value === "boolean" ? value : BAD;
        case "double":
            if (value instanceof ExactInteger) {
                onPrecision(value.digits);
                return Number(value.digits);
            }
            return typeof value === "number" ? value : BAD;
        case "integer":
            return typeof value === "number" && Number.isInteger(value) && value >= I32_MIN && value <= I32_MAX
                ? value
                : BAD;
        case "long":
            if (value instanceof ExactInteger) {
                if (long === "string") {
                    return value.digits;
                }
                onPrecision(value.digits);
                return Number(value.digits);
            }
            if (typeof value === "number" && Number.isInteger(value)) {
                return long === "string" ? String(value) : value;
            }
            return BAD;
        default:
            return BAD;
    }
}

/**
 * Convert one attribute value by its declared type.
 * @param value - the value (never null)
 * @param type - the declared type
 * @param long - the importer's `long` option
 * @param onPrecision - called for a long beyond 2^53
 * @returns the value to store, or BAD
 */
function convertValue(
    value: unknown,
    type: Cx2Type,
    long: "f64" | "string",
    onPrecision: (digits: string) => void,
): unknown {
    if (!type.list) {
        return convertScalar(value, type.scalar, long, onPrecision);
    }
    if (!Array.isArray(value)) {
        return BAD;
    }
    const out: unknown[] = [];
    for (const item of value) {
        const converted = item === null ? BAD : convertScalar(item, type.scalar, long, onPrecision);
        if (converted === BAD) {
            return BAD;
        }
        out.push(converted);
    }
    return out;
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
    /** Bit 1: the id, bit 2: s, bit 4: t was written as a non-integer literal. */
    readonly inexact: number;
}

/** Everything the scan collects. */
interface Cx2Document {
    version: string;
    hasFragments: boolean;
    readonly nodes: Held[];
    readonly edges: Held[];
    readonly declarations: Held[];
    readonly networkAttributes: Held[];
    readonly nodeBypasses: Held[];
    readonly edgeBypasses: Held[];
    readonly cartesianLayout: Held[];
    /** Opaque aspects (including the style rules), verbatim, in order of first appearance. */
    readonly opaque: Map<string, unknown[]>;
    readonly structure: CxStructure;
}

/**
 * The inexact-literal bits of an element.
 * @param text - the element's JSON text
 * @param keys - the id keys to check, bit 1, 2, 4 in order
 * @param depth - the depth of the element's own keys in the text (2: a member's single object)
 * @returns the bits
 */
function inexactBits(text: string, keys: readonly string[], depth = 1): number {
    if (!/[0-9][.eE]/.test(text)) {
        return 0;
    }
    let bits = 0;
    keys.forEach((key, i) => {
        if (inexactLiteral(text, key, depth)) {
            bits |= 1 << i;
        }
    });
    return bits;
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
): Promise<Cx2Document> {
    const structure = new CxStructure(report);
    const doc: Cx2Document = {
        version: "",
        hasFragments: false,
        nodes: [],
        edges: [],
        declarations: [],
        networkAttributes: [],
        nodeBypasses: [],
        edgeBypasses: [],
        cartesianLayout: [],
        opaque: new Map(),
        structure,
    };
    let descriptor = false;
    let elementsSeen = false;
    let sinceCheck = 0;
    const opaquePrecision = keptPrecision(report, "meta.extra.cx2.opaque");
    const collect = (aspect: string, value: unknown, text: string, line: number, exact: boolean, depth = 1): void => {
        structure.element(aspect, value, line);
        switch (aspect) {
            case "nodes":
                elementsSeen = true;
                doc.nodes.push({ value, line, inexact: inexactBits(text, ["id"], depth) });
                return;
            case "edges":
                elementsSeen = true;
                doc.edges.push({ value, line, inexact: inexactBits(text, ["id", "s", "t"], depth) });
                return;
            case "attributeDeclarations":
                if (elementsSeen) {
                    report.warnOnce(
                        "validation-error",
                        ASPECT_ORDER_CODE,
                        "attributeDeclarations comes after the elements it types; the declarations are applied to them",
                        { line, element: aspect },
                        `${ASPECT_ORDER_CODE}:declarations`,
                    );
                }
                // not plainJson(): a long default beyond 2^53 keeps its digits for long: "string"
                doc.declarations.push({ value, line, inexact: 0 });
                return;
            case "networkAttributes":
                elementsSeen = true;
                doc.networkAttributes.push({ value, line, inexact: 0 });
                return;
            case "nodeBypasses":
                doc.nodeBypasses.push({ value, line, inexact: 0 });
                return;
            case "edgeBypasses":
                doc.edgeBypasses.push({ value, line, inexact: 0 });
                return;
            case "cartesianLayout":
                doc.cartesianLayout.push({ value, line, inexact: 0 });
                return;
            default:
                if (STRUCTURE_ASPECTS.has(aspect)) {
                    return;
                }
                if (!doc.opaque.has(aspect)) {
                    doc.opaque.set(aspect, []);
                }
                doc.opaque.get(aspect)?.push(exact ? plainJson(value, opaquePrecision) : value);
        }
    };
    try {
        for await (const event of scanAspects(textChunks(input, report, options), report)) {
            if (++sinceCheck >= ABORT_CHECK_INTERVAL) {
                sinceCheck = 0;
                throwIfAborted(options.signal);
            }
            switch (event.kind) {
                case "root":
                    report.fail(
                        CX2_ISSUE.NO_DESCRIPTOR,
                        `a CX2 document is a JSON array; found ${event.object ? "an object" : shown(event.value)}`,
                        { line: event.line },
                    );
                    break;
                case "member":
                    if (!descriptor) {
                        readDescriptor(event.value, event.line, doc, report);
                        descriptor = true;
                        break;
                    }
                    memberAspect(event.value, event.line, structure, report, (aspect, value) => {
                        collect(aspect, value, event.text, event.line, event.exact, 2);
                    });
                    break;
                case "block":
                    reportSharedBlock(report, event);
                    if (!descriptor) {
                        report.fail(
                            CX2_ISSUE.NO_DESCRIPTOR,
                            `the document starts with a "${event.aspect}" block, not a descriptor with CXVersion${event.aspect === "numberVerification" || event.aspect === "metaData" ? "; this looks like CX version 1 (read it with the cx importer)" : ""}`,
                            { line: event.line },
                        );
                    }
                    structure.block(event.aspect, event.line);
                    break;
                case "element":
                    collect(event.aspect, event.value, event.text, event.line, event.exact);
                    break;
                case "deep":
                    reportTooDeep(report, event);
                    if (!descriptor) {
                        readDescriptor(null, event.line, doc, report);
                    }
                    break;
                case "extraKeys":
                    report.error(
                        "parse-error",
                        BAD_ASPECT_BLOCK_CODE,
                        `the "${event.aspect}" block holds more keys (${event.keys.join(", ")}) whose values are not arrays; an aspect block has one key, the others are skipped`,
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
    if (!descriptor) {
        report.fail(CX2_ISSUE.NO_DESCRIPTOR, "the document is an empty array; a CX2 document starts with a descriptor");
    }
    return doc;
}

/**
 * Check the descriptor, the first member of the array.
 * @param value - the member
 * @param line - its line
 * @param doc - the document, which receives the version and the fragment flag
 * @param report - the report
 */
function readDescriptor(value: unknown, line: number, doc: Cx2Document, report: ImportReportBuilder): void {
    if (!isRecord(value) || !("CXVersion" in value)) {
        const keys = isRecord(value) ? Object.keys(value) : [];
        report.fail(
            CX2_ISSUE.NO_DESCRIPTOR,
            `the first member of the array is not a descriptor with CXVersion${keys.length > 0 ? ` (keys: ${keys.join(", ")})` : ""}`,
            { line },
        );
    }
    const raw = value.CXVersion;
    const text = typeof raw === "string" || typeof raw === "number" ? String(raw) : "";
    // the major version: "2.0", "2.1", "2.0.1", "2.1-beta", " 2.0" are all CX2
    const match = /^\s*([0-9]+)(?=$|[.\s-])/.exec(text);
    const major = match === null ? NaN : Number(match[1]);
    if (major === 1) {
        report.fail(
            CX2_ISSUE.VERSION,
            `CXVersion ${shown(raw)} is CX version 1, a different document shape; read it with the cx importer`,
            { line, element: "CXVersion" },
        );
    }
    if (major !== 2) {
        report.fail(CX2_ISSUE.VERSION, `CXVersion ${shown(raw)} is not a CX2 version`, { line, element: "CXVersion" });
    }
    doc.version = text;
    if (raw !== "2.0") {
        report.warning(
            "validation-error",
            CX2_ISSUE.MINOR_VERSION,
            `CXVersion ${shown(raw)} is not "2.0"; the document is read as CX2 2.0`,
            { line, element: "CXVersion" },
        );
    }
    for (const key of Object.keys(value)) {
        if (key === "hasFragments") {
            if (typeof value.hasFragments === "boolean") {
                doc.hasFragments = value.hasFragments;
            } else {
                report.error(
                    "validation-error",
                    BAD_VALUE_CODE,
                    `hasFragments is ${shown(value.hasFragments)}, not a boolean; read as false`,
                    { line, element: "hasFragments" },
                );
            }
        } else if (key !== "CXVersion") {
            report.warning("validation-error", UNKNOWN_ELEMENT_CODE, `the descriptor key "${key}" is not defined`, {
                line,
                element: key,
            });
        }
    }
}

/**
 * Read a member that is not a streamed block: a one-key object holding an object is a
 * one-element aspect (`{"ndexStatus": {...}}`); anything else is E_BAD_ASPECT_BLOCK.
 * @param value - the member
 * @param line - its line
 * @param structure - the structure checker
 * @param report - the report
 * @param collect - receives the aspect name and its one element
 */
function memberAspect(
    value: unknown,
    line: number,
    structure: CxStructure,
    report: ImportReportBuilder,
    collect: (aspect: string, value: unknown) => void,
): void {
    const keys = isRecord(value) ? Object.keys(value) : [];
    if (isRecord(value) && keys.length === 1 && isRecord(value[keys[0]])) {
        if (ARRAY_ASPECTS.has(keys[0])) {
            report.warning(
                "validation-error",
                CX2_ISSUE.SINGLE_OBJECT_ASPECT,
                `the "${keys[0]}" aspect is one object, not an array of elements; read as one element`,
                { line, element: keys[0] },
            );
        }
        structure.block(keys[0], line);
        collect(keys[0], value[keys[0]]);
        return;
    }
    report.error(
        "parse-error",
        BAD_ASPECT_BLOCK_CODE,
        `a member of the document is ${keys.length > 1 ? `an object with ${keys.length} keys (${keys.join(", ")})` : shown(value)}, not a one-key aspect block; skipped`,
        { line, element: keys[0] ?? null },
    );
}

// ============================================================ declarations

/** One declared attribute. */
interface Declaration {
    readonly name: string;
    /** The type: declared, or inferred from the values (null: nested or mixed values, a json column). */
    type: Cx2Type | null;
    alias: string | null;
    hasDefault: boolean;
    defaultValue: unknown;
    /** The default as written, while the type is still to be inferred (a type CX2 does not define). */
    readonly rawDefault: unknown;
    handle: ColumnHandle;
    /** Whether the file does not declare the attribute (W_CX2_UNDECLARED_ATTRIBUTE). */
    readonly undeclared: boolean;
}

/**
 * The scalar kind of one value for inference.
 * @param value - the value
 * @returns a CX2 scalar, or null for anything else
 */
function scalarKind(value: unknown): Cx2Scalar | null {
    switch (typeof value) {
        case "boolean":
            return "boolean";
        case "string":
            return "string";
        case "number":
            return Number.isInteger(value) && value >= I32_MIN && value <= I32_MAX ? "integer" : "double";
        default:
            return value instanceof ExactInteger ? "double" : null;
    }
}

/** What inference has seen of an attribute's values so far. */
interface Seen {
    /** The scalar kind so far (undefined: nothing yet, null: no CX2 type fits). */
    kind: Cx2Scalar | null | undefined;
    /** Whether the values are lists (undefined: nothing yet). */
    list: boolean | undefined;
}

/**
 * Widen two scalar kinds: integer and double give double; anything else that differs has no
 * CX2 type.
 * @param a - the kind so far
 * @param b - a new kind
 * @returns the widened kind
 */
function widenKind(a: Cx2Scalar | null | undefined, b: Cx2Scalar | null): Cx2Scalar | null {
    if (a === undefined || a === b) {
        return b;
    }
    if (a === null || b === null) {
        return null;
    }
    return (a === "integer" && b === "double") || (a === "double" && b === "integer") ? "double" : null;
}

/**
 * Observe one value of an undeclared attribute.
 * @param seen - the state
 * @param value - the value (never null)
 */
function observe(seen: Seen, value: unknown): void {
    const list = Array.isArray(value);
    if (seen.list !== undefined && seen.list !== list) {
        seen.kind = null;
        return;
    }
    seen.list = list;
    if (!list) {
        seen.kind = widenKind(seen.kind, scalarKind(value));
        return;
    }
    for (const item of value as unknown[]) {
        seen.kind = widenKind(seen.kind, item === null || Array.isArray(item) ? null : scalarKind(item));
    }
}

/**
 * The CX2 type inference settles on.
 * @param seen - the state
 * @returns the type, or null for a json column
 */
function inferredType(seen: Seen): Cx2Type | null {
    if (seen.kind === null) {
        return null;
    }
    const scalar = seen.kind ?? "string";
    return cx2Type(seen.list === true ? `list_of_${scalar}` : scalar);
}

/** The declarations of one table. */
class DeclarationTable {
    readonly byName = new Map<string, Declaration>();

    readonly byAlias = new Map<string, Declaration>();

    /**
     * The declaration a key of an element's `v` names.
     * @param key - the key
     * @returns the declaration and whether the key was its alias, or null
     */
    resolve(key: string): { readonly decl: Declaration; readonly viaAlias: boolean } | null {
        const viaAlias = this.byAlias.get(key);
        if (viaAlias !== undefined) {
            return { decl: viaAlias, viaAlias: true };
        }
        const decl = this.byName.get(key);
        return decl === undefined ? null : { decl, viaAlias: false };
    }
}

/** The three declaration tables of CX2 and what the declarations element holds besides. */
interface Declarations {
    readonly node: DeclarationTable;
    readonly edge: DeclarationTable;
    readonly network: DeclarationTable;
    /** Declarations for opaque aspects, kept verbatim. */
    readonly other: Record<string, unknown>;
}

/** The domain key of attributeDeclarations for each table. */
const DECLARATION_KEYS: ReadonlyMap<string, "node" | "edge" | "network"> = new Map([
    ["nodes", "node"],
    ["edges", "edge"],
    ["networkAttributes", "network"],
]);

/**
 * Whether an object has an own property (never one of Object.prototype, as `in` would find).
 * @param record - the object
 * @param key - the key
 * @returns true for an own property
 */
function hasOwn(record: Record<string, unknown>, key: string): boolean {
    return Object.prototype.hasOwnProperty.call(record, key);
}

// ============================================================ the build

/** Reads a collected document into a sink. */
class Cx2Reader {
    private readonly sink: GraphSink;

    private readonly report: ImportReportBuilder;

    private readonly options: ResolvedImportOptions;

    private readonly zAs: "column" | "position";

    private readonly doc: Cx2Document;

    private readonly direction: DirectionResolver;

    private readonly coercer: IdCoercer;

    private readonly decls: Declarations = {
        node: new DeclarationTable(),
        edge: new DeclarationTable(),
        network: new DeclarationTable(),
        other: {},
    };

    /** CX node id -> sink node index. */
    private readonly nodeRows = new Map<NodeId, number>();

    /** CX node id -> the id the sink holds it under (differs when a mangled id is restored). */
    private readonly sinkIds = new Map<NodeId, NodeId>();

    /** The original ids restored so far: a second node with one keeps its CX id. */
    private readonly restored = new Set<NodeId>();

    /** CX edge id -> sink edge index. */
    private readonly edgeRows = new Map<NodeId, number>();

    private positionHandle: ColumnHandle = INVALID_INDEX as ColumnHandle;

    private zHandle: ColumnHandle = INVALID_INDEX as ColumnHandle;

    private edgeIdHandle: ColumnHandle = INVALID_INDEX as ColumnHandle;

    /** The rows that have a position (a set: a duplicate node may carry coordinates twice). */
    private readonly positioned = new Set<number>();

    private sinceCheck = 0;

    private idType: "integer" | "mixed" | "string" = "integer";

    private weighted = false;

    private readonly dangling = new Map<string, number>();

    private readonly point: [number, number, number] = [0, 0, 0];

    /**
     * Create the reader.
     * @param sink - the sink
     * @param report - the report
     * @param options - the resolved options
     * @param zAs - where z goes
     * @param doc - the collected document
     */
    constructor(
        sink: GraphSink,
        report: ImportReportBuilder,
        options: ResolvedImportOptions,
        zAs: "column" | "position",
        doc: Cx2Document,
    ) {
        this.sink = sink;
        this.report = report;
        this.options = options;
        this.zAs = zAs;
        this.doc = doc;
        this.direction = new DirectionResolver(sink, report, options.onMixedDirection);
        this.coercer = new IdCoercer(options.ids);
    }

    /** Build the graph. */
    build(): void {
        const { doc, report } = this;
        this.direction.setHeader(true);
        this.readDeclarations();
        this.declareColumns();
        this.sink.reserve(doc.nodes.length, doc.edges.length);
        for (const held of doc.nodes) {
            this.readNode(held);
        }
        this.readLegacyLayout();
        if (this.positioned.size > 0 && this.positioned.size < this.nodeRows.size) {
            report.warnOnce(
                "missing-value",
                CX2_ISSUE.PARTIAL_LAYOUT,
                `${this.nodeRows.size - this.positioned.size} of ${this.nodeRows.size} node(s) have no coordinates; their positions are unset`,
                { element: "nodes" },
            );
        }
        for (const held of doc.edges) {
            this.readEdge(held);
        }
        this.readNetworkAttributes();
        this.readBypasses("node", doc.nodeBypasses);
        this.readBypasses("edge", doc.edgeBypasses);
        for (const [kind, count] of this.dangling) {
            report.warning(
                "validation-error",
                DANGLING_REFERENCE_CODE,
                `${count} ${kind} name(s) no element; ignored`,
                { element: kind },
            );
        }
        this.checkAspects();
        this.setMeta();
    }

    // ------------------------------------------------------------ declarations

    /** Merge every attributeDeclarations element (fragments in order) into the tables. */
    private readDeclarations(): void {
        const { report } = this;
        for (const held of this.doc.declarations) {
            if (!isRecord(held.value)) {
                report.error(
                    "parse-error",
                    BAD_ASPECT_BLOCK_CODE,
                    "an attributeDeclarations element is not an object",
                    {
                        line: held.line,
                        element: "attributeDeclarations",
                    },
                );
                continue;
            }
            for (const [key, table] of Object.entries(held.value)) {
                const domain = DECLARATION_KEYS.get(key);
                if (domain === undefined) {
                    report.warning(
                        "unsupported",
                        UNKNOWN_ELEMENT_CODE,
                        `attributeDeclarations holds the table "${key}", which CX2 does not define; kept in meta.extra.cx2.declarations, not applied`,
                        { line: held.line, element: key },
                    );
                    setOwn(
                        this.decls.other,
                        key,
                        plainJson(table, (digits) => {
                            this.precision(key, digits);
                        }),
                    );
                    continue;
                }
                if (!isRecord(table)) {
                    report.error(
                        "validation-error",
                        BAD_VALUE_CODE,
                        `the ${key} declarations are not an object; ignored`,
                        { line: held.line, element: key },
                    );
                    continue;
                }
                for (const [name, decl] of Object.entries(table)) {
                    this.declare(domain, name, decl, held.line);
                }
            }
        }
        for (const domain of ["node", "edge"] as const) {
            this.checkAliases(domain);
        }
        this.inferUndeclared("node", this.doc.nodes);
        this.inferUndeclared("edge", this.doc.edges);
    }

    /**
     * Type the attributes no declaration types (undeclared, or declared with a type CX2 does not
     * define) from their values, so every attribute column is declared with its CX2 type.
     * @param domain - node or edge
     * @param elements - the elements
     */
    private inferUndeclared(domain: "node" | "edge", elements: readonly Held[]): void {
        const table = this.decls[domain];
        const seen = new Map<string, Seen>();
        for (const { value } of elements) {
            if (!isRecord(value) || !isRecord(value.v)) {
                continue;
            }
            for (const [key, raw] of Object.entries(value.v)) {
                const resolved = table.resolve(key);
                if (key === "" || (resolved !== null && resolved.decl.type !== null) || raw === null || raw === undefined) {
                    continue;
                }
                const name = resolved?.decl.name ?? key;
                let state = seen.get(name);
                if (state === undefined) {
                    state = { kind: undefined, list: undefined };
                    seen.set(name, state);
                }
                observe(state, raw);
            }
        }
        for (const [name, state] of seen) {
            const type = inferredType(state);
            const decl = table.byName.get(name);
            if (decl !== undefined) {
                decl.type = type;
                if (decl.hasDefault && type !== null) {
                    // the default of a type CX2 does not define, converted now the values typed the column
                    decl.defaultValue = this.convertDefault(name, decl.rawDefault, type, { element: name });
                    decl.hasDefault = decl.defaultValue !== BAD;
                }
                continue;
            }
            table.byName.set(name, {
                name,
                type,
                alias: null,
                hasDefault: false,
                defaultValue: undefined,
                rawDefault: undefined,
                handle: INVALID_INDEX as ColumnHandle,
                undeclared: true,
            });
        }
    }

    /**
     * Add one declaration to a table.
     * @param domain - the table
     * @param name - the attribute name
     * @param raw - the declaration object
     * @param line - its line
     */
    private declare(domain: "node" | "edge" | "network", name: string, raw: unknown, line: number): void {
        const { report } = this;
        const table = this.decls[domain];
        const where = { line, element: name };
        if (name === "") {
            report.error(
                "validation-error",
                BAD_VALUE_CODE,
                `a ${domain} attribute declaration has an empty name; ignored`,
                where,
            );
            return;
        }
        if (!isRecord(raw)) {
            report.error(
                "validation-error",
                BAD_VALUE_CODE,
                `the declaration of "${name}" is not an object; ignored`,
                where,
            );
            return;
        }
        let type: Cx2Type | null;
        if (raw.d === undefined) {
            type = cx2Type("string");
            report.warning(
                "unsupported",
                UNKNOWN_ATTR_TYPE_CODE,
                `the declaration of "${name}" has no type; read as string (the Java reader's rule)`,
                where,
            );
        } else {
            type = typeof raw.d === "string" ? cx2Type(raw.d) : null;
            if (type === null) {
                report.warning(
                    "unsupported",
                    UNKNOWN_ATTR_TYPE_CODE,
                    `the type ${shown(raw.d)} of "${name}" is not a CX2 type; the column is inferred from its values`,
                    where,
                );
            }
        }
        const existing = table.byName.get(name);
        if (existing !== undefined) {
            if (existing.type?.d !== type?.d) {
                report.error(
                    "validation-error",
                    CX2_ISSUE.DECLARATION_CONFLICT,
                    `"${name}" is declared ${existing.type?.d ?? "untyped"} and again ${type?.d ?? "untyped"}; the first declaration wins`,
                    where,
                );
            }
            return;
        }
        if (raw.a !== undefined && raw.a !== null && typeof raw.a !== "string") {
            report.error(
                "validation-error",
                BAD_VALUE_CODE,
                `the alias ${shown(raw.a)} of "${name}" is not a string; ignored`,
                where,
            );
        }
        let alias = typeof raw.a === "string" ? raw.a : null;
        let hasDefault = raw.v !== undefined && raw.v !== null;
        if (domain === "network" && (raw.a !== undefined || raw.v !== undefined)) {
            report.warning(
                "validation-error",
                CX2_ISSUE.NETWORK_DECLARATION,
                `the network attribute "${name}" declares an alias or a default, which CX2 forbids; ignored`,
                where,
            );
            alias = null;
            hasDefault = false;
        }
        let defaultValue: unknown = undefined;
        if (hasDefault && type !== null) {
            defaultValue = this.convertDefault(name, raw.v, type, where);
            hasDefault = defaultValue !== BAD;
        }
        table.byName.set(name, {
            name,
            type,
            alias,
            hasDefault,
            defaultValue,
            rawDefault: hasDefault && type === null ? plainJson(raw.v) : undefined,
            handle: INVALID_INDEX as ColumnHandle,
            undeclared: false,
        });
    }

    /**
     * Convert a declared default; a numeric string for a numeric type (the specification's own
     * `"v": "0.0"`) is coerced, anything else that does not match drops the default.
     * @param name - the attribute
     * @param value - the default
     * @param type - its type
     * @param where - the location
     * @param where.line - the line
     * @param where.element - the attribute
     * @returns the default, or BAD when dropped
     */
    private convertDefault(
        name: string,
        value: unknown,
        type: Cx2Type,
        where: { line?: number; element: string },
    ): unknown {
        const converted = convertValue(value, type, this.options.long, (digits) => {
            this.precision(name, digits);
        });
        if (converted !== BAD) {
            return converted;
        }
        const numeric = type.scalar === "double" || type.scalar === "integer" || type.scalar === "long";
        if (
            !type.list &&
            numeric &&
            typeof value === "string" &&
            value.trim() !== "" &&
            Number.isFinite(Number(value))
        ) {
            const coerced = convertValue(Number(value), type, this.options.long, () => undefined);
            if (coerced !== BAD) {
                this.report.warning(
                    "validation-error",
                    BAD_DEFAULT_CODE,
                    `the default ${shown(value)} of "${name}" is a string, not a ${type.d}; read as ${shown(coerced)}`,
                    where,
                );
                return coerced;
            }
        }
        this.report.warning(
            "validation-error",
            BAD_DEFAULT_CODE,
            `the default ${shown(value)} of "${name}" is not a ${type.d}; the column has no default`,
            where,
        );
        return BAD;
    }

    /**
     * Check the aliases of a table in declaration order: an alias that is another attribute's
     * name or another attribute's alias is E_CX2_ALIAS_CONFLICT and ignored.
     * @param domain - the table
     */
    private checkAliases(domain: "node" | "edge"): void {
        const table = this.decls[domain];
        for (const decl of table.byName.values()) {
            const { alias } = decl;
            if (alias === null || alias === decl.name) {
                if (alias !== null) {
                    table.byAlias.set(alias, decl);
                }
                continue;
            }
            const other = table.byName.get(alias) ?? table.byAlias.get(alias);
            if (other !== undefined) {
                this.report.error(
                    "validation-error",
                    CX2_ISSUE.ALIAS_CONFLICT,
                    `the alias "${alias}" of the ${domain} attribute "${decl.name}" is also ${other.name === alias ? "an attribute's name" : `the alias of "${other.name}"`}; the alias is ignored`,
                    { element: decl.name },
                );
                decl.alias = null;
                continue;
            }
            table.byAlias.set(alias, decl);
        }
    }

    /** Declare the declared node and edge columns. */
    private declareColumns(): void {
        const restore = this.options.restoreMangledIds;
        for (const domain of ["node", "edge"] as const) {
            for (const decl of this.decls[domain].byName.values()) {
                if (domain === "node" && restore && decl.name === ORIGINAL_ID_ATTRIBUTE) {
                    continue;
                }
                if (domain === "edge" && decl.name === this.options.weightFrom) {
                    continue;
                }
                const column: ColumnDecl =
                    decl.type === null
                        ? {
                              name: decl.name,
                              dtype: "json",
                              nullable: true,
                              origin: { format: CX2_FORMAT, id: decl.alias },
                          }
                        : {
                              ...this.columnDecl(decl.type),
                              name: decl.name,
                              origin: { format: CX2_FORMAT, id: decl.alias, type: decl.type.d },
                          };
                if (decl.hasDefault) {
                    // a type nothing settled (no values) keeps its default as written, in the json column
                    column.default = decl.type === null ? decl.rawDefault : decl.defaultValue;
                }
                if (domain === "node" && decl.name === "name") {
                    column.role = "label";
                }
                decl.handle = declareResolved(this.sink, domain, column, this.report).handle;
            }
        }
    }

    /**
     * The edge id column, declared with the first edge.
     * @returns the handle
     */
    private edgeIdColumn(): ColumnHandle {
        if (this.edgeIdHandle === INVALID_INDEX) {
            const taken = (name: string): boolean => this.sink.edgeColumn(name) !== INVALID_INDEX;
            this.edgeIdHandle = declareResolved(
                this.sink,
                "edge",
                { name: uniqueColumnName("id", "cx2", taken), dtype: "f64", role: "id", nullable: true },
                this.report,
            ).handle;
        }
        return this.edgeIdHandle;
    }

    /**
     * The dtype part of a declared column.
     * @param type - the CX2 type
     * @returns the dtype and item dtype
     */
    private columnDecl(type: Cx2Type): { name: string; dtype: Dtype; itemDtype?: ScalarDtype; nullable: true } {
        const scalar = scalarDtype(type.scalar, this.options.long);
        return type.list
            ? { name: "", dtype: "list", itemDtype: scalar, nullable: true }
            : { name: "", dtype: scalar, nullable: true };
    }

    // ------------------------------------------------------------ ids

    /**
     * The id of an element, by the CX id rule and the `ids` option.
     * @param raw - the parsed id
     * @param inexact - whether the literal was not a plain integer
     * @param element - the element name for issues
     * @param line - the element's line
     * @param edgeId - whether this is an edge's own id (stored in the f64 id column, not kept as digits)
     * @returns the id, or null when it was reported
     */
    private idOf(raw: unknown, inexact: boolean, element: string, line: number, edgeId = false): NodeId | null {
        let id: NodeId;
        try {
            const parsed = cxId(raw, inexact);
            if (parsed.note === "text") {
                this.report.warnOnce(
                    "coercion",
                    ID_TEXT_TYPE_CODE,
                    `${element}: the id ${shown(raw)} is not written as an integer; read as ${String(parsed.id)}`,
                    { line, element },
                );
            } else if (parsed.note === "precision" && edgeId) {
                // the edge is told apart by its digits, but the id column is f64
                this.report.warnOnce(
                    "precision",
                    PRECISION_CODE,
                    `${element}: the edge id ${String(parsed.id)} is beyond 2^53; the id column holds the nearest double`,
                    { line, element },
                    `${PRECISION_CODE}:edge`,
                );
            } else if (parsed.note === "precision") {
                this.idType = "mixed";
                this.report.warnOnce(
                    "precision",
                    PRECISION_CODE,
                    `${element}: the id ${String(parsed.id)} is beyond 2^53; kept as its digits (a string id)`,
                    { line, element },
                );
            }
            id = this.options.ids === "keep" ? parsed.id : this.coercer.value(parsed.id);
        } catch (err) {
            this.report.recordError(err, { line, element });
            return null;
        }
        return id;
    }

    /**
     * Check the cancellation signal every ABORT_CHECK_INTERVAL elements.
     */
    private checkAbort(): void {
        if (++this.sinceCheck >= ABORT_CHECK_INTERVAL) {
            this.sinceCheck = 0;
            throwIfAborted(this.options.signal);
        }
    }

    /**
     * Report the keys of an element CX2 does not define, once per key.
     * @param record - the element
     * @param known - the keys it defines
     * @param what - nodes or edges
     * @param line - its line
     */
    private unknownKeys(record: Record<string, unknown>, known: ReadonlySet<string>, what: string, line: number): void {
        for (const key of Object.keys(record)) {
            if (!known.has(key)) {
                this.report.warnOnce(
                    "unsupported",
                    UNKNOWN_ELEMENT_CODE,
                    `the ${what} key "${key}" is not defined by CX2; its values are not read`,
                    { line, element: key },
                    `${UNKNOWN_ELEMENT_CODE}:${what}:${key}`,
                );
            }
        }
    }

    // ------------------------------------------------------------ nodes

    /**
     * Read one node element.
     * @param held - the element
     */
    private readNode(held: Held): void {
        this.checkAbort();
        const { report, sink } = this;
        const { value, line } = held;
        if (!isRecord(value)) {
            report.error("parse-error", BAD_ASPECT_BLOCK_CODE, `a nodes element is ${shown(value)}, not an object`, {
                line,
                element: "nodes",
            });
            report.counts.skippedNodes++;
            return;
        }
        this.unknownKeys(value, NODE_KEYS, "node", line);
        if (value.id === undefined || value.id === null) {
            report.error("missing-value", MISSING_ID_CODE, "a node has no id", { line, element: "nodes" });
            report.counts.skippedNodes++;
            return;
        }
        const element = `node ${shown(value.id)}`;
        const cx = this.idOf(value.id, (held.inexact & 1) !== 0, element, line);
        if (cx === null) {
            report.counts.skippedNodes++;
            return;
        }
        const attrs = isRecord(value.v) ? value.v : null;
        if (value.v !== undefined && value.v !== null && attrs === null) {
            report.error("validation-error", BAD_VALUE_CODE, `${element}: v is ${shown(value.v)}, not an object`, {
                line,
                element,
            });
        }
        let row = this.nodeRows.get(cx);
        if (row !== undefined) {
            report.warning(
                "merged",
                DUPLICATE_NODE_CODE,
                `${element} is declared more than once; its attributes are merged (the later values win)`,
                { line, element },
            );
        } else {
            let original = this.originalIdOf(attrs, element, line);
            if (original !== null && this.restored.has(original)) {
                report.warning(
                    "merged",
                    DUPLICATE_NODE_CODE,
                    `${element}: its original id ${shown(original)} is already another node's; it keeps its CX id`,
                    { line, element },
                );
                original = null;
            }
            if (original !== null) {
                this.restored.add(original);
            }
            this.idTypeOf(original ?? cx);
            try {
                row = sink.addNode(original ?? cx);
            } catch (err) {
                report.recordError(err, { line, element });
                report.counts.skippedNodes++;
                return;
            }
            this.nodeRows.set(cx, row);
            this.sinkIds.set(cx, original ?? cx);
            report.counts.nodes++;
        }
        this.readCoordinates(value, row, element, line);
        if (attrs !== null) {
            this.writeAttributes("node", row, attrs, element, line);
        }
    }

    /**
     * The original id the exporter's `sanitizeIds: "mangle"` kept, when it is to be restored.
     * @param attrs - the node's v
     * @param element - the element name for issues
     * @param line - its line
     * @returns the original id, or null
     */
    private originalIdOf(attrs: Record<string, unknown> | null, element: string, line: number): NodeId | null {
        if (attrs === null || !this.options.restoreMangledIds) {
            return null;
        }
        const alias = this.decls.node.byName.get(ORIGINAL_ID_ATTRIBUTE)?.alias ?? null;
        const raw = attrs[ORIGINAL_ID_ATTRIBUTE] ?? (alias === null ? undefined : attrs[alias]);
        if (raw !== undefined && raw !== null && typeof raw !== "string") {
            this.report.error(
                "validation-error",
                BAD_VALUE_CODE,
                `${element}: ${ORIGINAL_ID_ATTRIBUTE} is ${shown(raw)}, not a string; the node keeps its CX id`,
                { line, element },
            );
        }
        return typeof raw === "string" ? raw : null;
    }

    /**
     * Track the idType of the metadata.
     * @param id - a node id
     */
    private idTypeOf(id: NodeId): void {
        if (typeof id === "string" && this.idType === "integer") {
            this.idType = "mixed";
        }
    }

    /**
     * Read a node's x / y / z.
     * @param value - the node element
     * @param row - the node
     * @param element - the element name
     * @param line - its line
     */
    private readCoordinates(value: Record<string, unknown>, row: number, element: string, line: number): void {
        const coordinate = (key: "x" | "y" | "z"): number | null => {
            const raw = value[key];
            if (raw === undefined || raw === null) {
                return null;
            }
            if (typeof raw === "number") {
                return raw;
            }
            this.report.error("validation-error", BAD_VALUE_CODE, `${element}: ${key} is ${shown(raw)}, not a number`, {
                line,
                element,
            });
            return null;
        };
        const x = coordinate("x");
        const y = coordinate("y");
        const z = coordinate("z");
        if ((x === null) !== (y === null)) {
            this.report.warnOnce(
                "missing-value",
                CX2_ISSUE.PARTIAL_LAYOUT,
                `${element} has ${x === null ? "y without x" : "x without y"}; its coordinates are dropped`,
                { line, element },
                `${CX2_ISSUE.PARTIAL_LAYOUT}:half`,
            );
        }
        if (z !== null && x === null && y === null) {
            // the specification requires x and y with z
            this.report.warnOnce(
                "missing-value",
                CX2_ISSUE.PARTIAL_LAYOUT,
                `${element} has z without x and y; ${this.zAs === "column" ? "z is kept in the z column" : "with no position, z is dropped"}`,
                { line, element },
                `${CX2_ISSUE.PARTIAL_LAYOUT}:z`,
            );
        }
        if (x !== null && y !== null && (!fitsF32(x) || !fitsF32(y))) {
            this.report.error(
                "validation-error",
                BAD_VALUE_CODE,
                `${element}: the coordinates ${String(x)}, ${String(y)} are beyond what the f32 position column holds; the position is unset`,
                { line, element },
            );
        } else if (x !== null && y !== null) {
            this.setPosition(row, x, y, z);
        }
        if (z !== null && this.zAs === "column") {
            if (this.zHandle === INVALID_INDEX) {
                this.zHandle = declareResolved(this.sink, "node", zDecl(CX2_FORMAT), this.report).handle;
            }
            this.sink.setNodeValue(this.zHandle, row, z);
        }
    }

    /**
     * Write a node's position, y flipped to y-up.
     * @param row - the node
     * @param x - screen x
     * @param y - screen y
     * @param z - z, used only under zAs "position"
     */
    private setPosition(row: number, x: number, y: number, z: number | null): void {
        if (this.positionHandle === INVALID_INDEX) {
            this.positionHandle = declareResolved(
                this.sink,
                "node",
                positionDecl(CX2_FORMAT, this.zAs === "position" ? 3 : 2),
                this.report,
            ).handle;
        }
        this.point[0] = x;
        this.point[1] = flipY(y);
        this.point[2] = this.zAs === "position" && z !== null ? z : 0;
        this.sink.setNodeValue(this.positionHandle, row, this.point);
        this.positioned.add(row);
    }

    /** Apply a CX1 cartesianLayout aspect when no node carries coordinates; keep and warn otherwise. */
    private readLegacyLayout(): void {
        const { cartesianLayout } = this.doc;
        if (cartesianLayout.length === 0) {
            return;
        }
        if (this.positioned.size > 0) {
            this.doc.opaque.set(
                "cartesianLayout",
                cartesianLayout.map((h) => plainJson(h.value)),
            );
            this.report.warning(
                "unsupported",
                CX2_ISSUE.LEGACY_LAYOUT,
                `a CX1 cartesianLayout aspect (${cartesianLayout.length} element(s)) next to node coordinates; the node coordinates are used, the aspect is kept in meta.extra.cx2`,
                { element: "cartesianLayout" },
            );
            return;
        }
        // the first view named is the layout; a CX1 file with several views keeps the others
        let view: unknown;
        const seen = new Set<number>();
        for (const held of cartesianLayout) {
            const entry = held.value;
            if (!isRecord(entry) || typeof entry.x !== "number" || typeof entry.y !== "number") {
                this.report.error(
                    "validation-error",
                    BAD_VALUE_CODE,
                    "a cartesianLayout element has no numeric x and y; skipped",
                    { line: held.line, element: "cartesianLayout" },
                );
                continue;
            }
            const row = this.rowOf(this.nodeRows, entry.node);
            if (row === undefined) {
                this.dangle("cartesianLayout entry");
                continue;
            }
            view ??= entry.view ?? null;
            if ((entry.view ?? null) !== view) {
                this.doc.opaque.set(
                    "cartesianLayout",
                    cartesianLayout.map((h) => plainJson(h.value)),
                );
                this.report.warnOnce(
                    "validation-error",
                    DUPLICATE_ATTRIBUTE_CODE,
                    `the cartesianLayout aspect names several views; view ${shown(view)} is read, the aspect is kept in meta.extra.cx2`,
                    { line: held.line, element: "cartesianLayout" },
                    `${DUPLICATE_ATTRIBUTE_CODE}:layout:view`,
                );
                continue;
            }
            if (seen.has(row)) {
                this.report.warnOnce(
                    "validation-error",
                    DUPLICATE_ATTRIBUTE_CODE,
                    `node ${shown(entry.node)} has two cartesianLayout entries; the later wins`,
                    { line: held.line, element: "cartesianLayout" },
                    `${DUPLICATE_ATTRIBUTE_CODE}:layout`,
                );
            }
            seen.add(row);
            const z = typeof entry.z === "number" ? entry.z : null;
            this.setPosition(row, entry.x, entry.y, z);
            if (z !== null && this.zAs === "column") {
                if (this.zHandle === INVALID_INDEX) {
                    this.zHandle = declareResolved(this.sink, "node", zDecl(CX2_FORMAT), this.report).handle;
                }
                this.sink.setNodeValue(this.zHandle, row, z);
            }
        }
    }

    /**
     * The sink row of a referenced id.
     * @param rows - the id map
     * @param raw - the parsed reference
     * @returns the row, or undefined
     */
    private rowOf(rows: ReadonlyMap<NodeId, number>, raw: unknown): number | undefined {
        try {
            const { id } = cxId(raw);
            return rows.get(this.options.ids === "keep" ? id : this.coercer.value(id));
        } catch {
            return undefined;
        }
    }

    /**
     * Count a reference that names nothing.
     * @param kind - what referred
     */
    private dangle(kind: string): void {
        this.dangling.set(kind, (this.dangling.get(kind) ?? 0) + 1);
    }

    // ------------------------------------------------------------ attributes

    /**
     * Write the attributes of an element's v.
     * @param domain - node or edge
     * @param row - the row
     * @param attrs - the v object
     * @param element - the element name
     * @param line - its line
     */
    private writeAttributes(
        domain: "node" | "edge",
        row: number,
        attrs: Record<string, unknown>,
        element: string,
        line: number,
    ): void {
        const { report } = this;
        const table = this.decls[domain];
        for (const key of Object.keys(attrs)) {
            const value = attrs[key];
            if (key === "") {
                report.error(
                    "validation-error",
                    BAD_VALUE_CODE,
                    `${element}: v holds an attribute with an empty name; skipped`,
                    { line, element },
                );
                continue;
            }
            const resolved = table.resolve(key);
            const name = resolved?.decl.name ?? key;
            if (domain === "node" && this.options.restoreMangledIds && name === ORIGINAL_ID_ATTRIBUTE) {
                continue;
            }
            if (domain === "edge" && name === this.options.weightFrom) {
                continue;
            }
            if (key === "id") {
                report.warnOnce(
                    "validation-error",
                    CX2_ISSUE.RESERVED_KEY,
                    `${element}: the attribute name "id" is reserved in v; read as an ordinary attribute`,
                    { line, element },
                    `${CX2_ISSUE.RESERVED_KEY}:${domain}`,
                );
            }
            if (
                resolved !== null &&
                !resolved.viaAlias &&
                resolved.decl.alias !== null &&
                resolved.decl.alias !== key
            ) {
                if (hasOwn(attrs, resolved.decl.alias)) {
                    report.warning(
                        "validation-error",
                        DUPLICATE_ATTRIBUTE_CODE,
                        `${element}: "${name}" is given under its alias and its full name; the alias wins`,
                        { line, element },
                    );
                    continue;
                }
                report.warnOnce(
                    "coercion",
                    CX2_ISSUE.ALIAS_BYPASSED,
                    `${element}: the full name "${name}" is used although its alias "${resolved.decl.alias}" is declared; read as the same attribute`,
                    { line, element },
                    `${CX2_ISSUE.ALIAS_BYPASSED}:${domain}:${name}`,
                );
            }
            if (value === null || value === undefined) {
                continue;
            }
            if (resolved === null) {
                continue;
            }
            const { decl } = resolved;
            if (decl.undeclared) {
                report.warnOnce(
                    "validation-error",
                    CX2_ISSUE.UNDECLARED_ATTRIBUTE,
                    `the ${domain} attribute "${key}" is not declared; its type is inferred from the values`,
                    { line, element: key },
                    `${CX2_ISSUE.UNDECLARED_ATTRIBUTE}:${domain}:${key}`,
                );
            }
            const converted =
                decl.type === null
                    ? plainJson(value, (digits) => {
                          this.precision(name, digits);
                      })
                    : convertValue(value, decl.type, this.options.long, (digits) => {
                          this.precision(name, digits);
                      });
            if (converted === BAD) {
                report.error(
                    "validation-error",
                    BAD_VALUE_CODE,
                    `${element}: "${name}" is ${shown(value)}, not a ${decl.type?.d ?? "value"}; the cell is unset`,
                    { line, element },
                );
                continue;
            }
            try {
                if (domain === "node") {
                    this.sink.setNodeValue(decl.handle, row, converted);
                } else {
                    this.sink.setEdgeValue(decl.handle, row, converted);
                }
            } catch (err) {
                report.recordError(err, { line, element });
            }
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

    // ------------------------------------------------------------ edges

    /**
     * Read one edge element.
     * @param held - the element
     */
    private readEdge(held: Held): void {
        this.checkAbort();
        const { report, sink } = this;
        const { value, line } = held;
        if (!isRecord(value)) {
            report.error("parse-error", BAD_ASPECT_BLOCK_CODE, `an edges element is ${shown(value)}, not an object`, {
                line,
                element: "edges",
            });
            report.counts.skippedEdges++;
            return;
        }
        this.unknownKeys(value, EDGE_KEYS, "edge", line);
        if (value.id === undefined || value.id === null) {
            report.error("missing-value", MISSING_ID_CODE, "an edge has no id", { line, element: "edges" });
            report.counts.skippedEdges++;
            return;
        }
        const element = `edge ${shown(value.id)}`;
        for (const key of ["s", "t"] as const) {
            if (value[key] === undefined || value[key] === null) {
                report.error("missing-value", MISSING_ENDPOINT_CODE, `${element} has no ${key}`, { line, element });
                report.counts.skippedEdges++;
                return;
            }
        }
        const id = this.idOf(value.id, (held.inexact & 1) !== 0, element, line, true);
        const s = id === null ? null : this.idOf(value.s, (held.inexact & 2) !== 0, element, line);
        const t = s === null ? null : this.idOf(value.t, (held.inexact & 4) !== 0, element, line);
        if (id === null || s === null || t === null) {
            report.counts.skippedEdges++;
            return;
        }
        if (this.edgeRows.has(id)) {
            report.error(
                "validation-error",
                DUPLICATE_EDGE_ID_CODE,
                `${element} is declared more than once; the later edge is skipped`,
                { line, element },
            );
            report.counts.skippedEdges++;
            return;
        }
        const source = this.endpoint(s, element, line);
        const target = source === null ? null : this.endpoint(t, element, line);
        if (source === null || target === null) {
            report.counts.skippedEdges++;
            return;
        }
        const attrs = isRecord(value.v) ? value.v : null;
        if (value.v !== undefined && value.v !== null && attrs === null) {
            report.error("validation-error", BAD_VALUE_CODE, `${element}: v is ${shown(value.v)}, not an object`, {
                line,
                element,
            });
        }
        let weight: number | undefined;
        const weightKey = this.weightKey(attrs);
        try {
            weight = weightKey === null || attrs === null ? undefined : weightFromValue(plainJson(attrs[weightKey]));
        } catch (err) {
            report.recordError(err, { line, element });
            report.counts.skippedEdges++;
            return;
        }
        if (weight !== undefined) {
            this.weighted = true;
        }
        const before = sink.edgeCount;
        let edge: number;
        try {
            edge = this.direction.addEdge(source, target, "directed", weight, { line, element });
        } catch (err) {
            report.recordError(err, { line, element });
            report.counts.skippedEdges++;
            return;
        }
        report.counts.edges += sink.edgeCount - before;
        this.edgeRows.set(id, edge);
        sink.setEdgeValue(this.edgeIdColumn(), edge, typeof id === "number" ? id : Number(id));
        if (attrs !== null) {
            this.writeAttributes("edge", edge, attrs, element, line);
        }
    }

    /**
     * The key of an edge's v that holds the weight: weightFrom, or its declared alias.
     * @param attrs - the edge's v
     * @returns the key present in attrs, or null
     */
    private weightKey(attrs: Record<string, unknown> | null): string | null {
        const { weightFrom } = this.options;
        if (weightFrom === null || attrs === null) {
            return null;
        }
        const alias = this.decls.edge.byName.get(weightFrom)?.alias ?? null;
        if (alias !== null && hasOwn(attrs, alias)) {
            return alias;
        }
        return hasOwn(attrs, weightFrom) ? weightFrom : null;
    }

    /**
     * The sink id of an edge endpoint: a known node, or a node created under addMissingNodes.
     * @param cx - the endpoint's CX id
     * @param element - the edge name
     * @param line - its line
     * @returns the sink id, or null when the endpoint was reported
     */
    private endpoint(cx: NodeId, element: string, line: number): NodeId | null {
        const known = this.sinkIds.get(cx);
        if (known !== undefined) {
            return known;
        }
        if (!this.options.addMissingNodes) {
            this.report.error(
                "missing-value",
                CX2_ISSUE.UNKNOWN_NODE,
                `${element}: the endpoint ${String(cx)} is not a node; the edge is skipped`,
                { line, element },
            );
            return null;
        }
        try {
            this.nodeRows.set(cx, this.sink.addNode(cx));
        } catch (err) {
            this.report.recordError(err, { line, element });
            return null;
        }
        this.sinkIds.set(cx, cx);
        this.report.counts.nodes++;
        return cx;
    }

    // ------------------------------------------------------------ network attributes, bypasses

    /** Write the network attributes (the first element; others are reported). */
    private readNetworkAttributes(): void {
        const { networkAttributes } = this.doc;
        if (networkAttributes.length === 0) {
            return;
        }
        if (networkAttributes.length > 1) {
            this.report.warning(
                "validation-error",
                CX2_ISSUE.EXTRA_ELEMENTS,
                `networkAttributes holds ${networkAttributes.length} elements; the first is read`,
                { line: networkAttributes[1].line, element: "networkAttributes" },
            );
        }
        const { value, line } = networkAttributes[0];
        if (!isRecord(value)) {
            this.report.error("parse-error", BAD_ASPECT_BLOCK_CODE, "the networkAttributes element is not an object", {
                line,
                element: "networkAttributes",
            });
            return;
        }
        for (const [name, raw] of Object.entries(value)) {
            if (raw === null || raw === undefined) {
                continue;
            }
            const decl = this.decls.network.byName.get(name);
            const element = `networkAttributes.${name}`;
            if (decl === undefined) {
                this.report.warnOnce(
                    "validation-error",
                    CX2_ISSUE.UNDECLARED_ATTRIBUTE,
                    `the network attribute "${name}" is not declared; its column is inferred from the value`,
                    { line, element: name },
                    `${CX2_ISSUE.UNDECLARED_ATTRIBUTE}:network:${name}`,
                );
            }
            if (
                (name === "name" || name === "description") &&
                typeof raw === "string" &&
                decl?.type?.d !== "list_of_string"
            ) {
                // the graph's own name and description: GraphMeta, written back from there
                continue;
            }
            try {
                const seen: Seen = { kind: undefined, list: undefined };
                observe(seen, raw);
                const type = decl?.type ?? inferredType(seen);
                if (type === null) {
                    this.sink.setGraphValue(
                        name,
                        plainJson(raw, (digits) => {
                            this.precision(name, digits);
                        }),
                        {
                            dtype: "json",
                            origin: { format: CX2_FORMAT, id: null },
                        },
                    );
                    continue;
                }
                const converted = convertValue(raw, type, this.options.long, (digits) => {
                    this.precision(name, digits);
                });
                if (converted === BAD) {
                    this.report.error(
                        "validation-error",
                        BAD_VALUE_CODE,
                        `${element} is ${shown(raw)}, not a ${type.d}; unset`,
                        { line, element },
                    );
                    continue;
                }
                const scalar = scalarDtype(type.scalar, this.options.long);
                this.sink.setGraphValue(name, converted, {
                    dtype: type.list ? "list" : scalar,
                    ...(type.list ? { itemDtype: scalar } : {}),
                    origin: { format: CX2_FORMAT, id: null, type: type.d },
                });
            } catch (err) {
                this.report.recordError(err, { line, element });
            }
        }
    }

    /**
     * Write the per-element visual property values: one column per property, typed by its values.
     * @param domain - node or edge
     * @param entries - the bypass elements
     */
    private readBypasses(domain: "node" | "edge", entries: readonly Held[]): void {
        const rows = domain === "node" ? this.nodeRows : this.edgeRows;
        const columns = new Map<string, { rows: number[]; values: unknown[]; at: Map<number, number> }>();
        for (const held of entries) {
            this.checkAbort();
            const { value, line } = held;
            if (!isRecord(value) || !isRecord(value.v)) {
                this.report.error(
                    "parse-error",
                    BAD_ASPECT_BLOCK_CODE,
                    `a ${domain}Bypasses element is not an object with an id and a v object; skipped`,
                    { line, element: `${domain}Bypasses` },
                );
                continue;
            }
            const row = this.rowOf(rows, value.id);
            if (row === undefined) {
                this.dangle(`${domain} bypass`);
                continue;
            }
            for (const [property, raw] of Object.entries(value.v)) {
                if (raw === null || raw === undefined) {
                    continue;
                }
                if (property === "") {
                    this.report.error(
                        "validation-error",
                        BAD_VALUE_CODE,
                        `a ${domain}Bypasses element holds a visual property with an empty name; skipped`,
                        { line, element: `${domain}Bypasses` },
                    );
                    continue;
                }
                let column = columns.get(property);
                if (column === undefined) {
                    column = { rows: [], values: [], at: new Map() };
                    columns.set(property, column);
                }
                const plain = plainJson(raw);
                const index = column.at.get(row);
                if (index === undefined) {
                    column.at.set(row, column.rows.length);
                    column.rows.push(row);
                    column.values.push(plain);
                    continue;
                }
                if (JSON.stringify(column.values[index]) !== JSON.stringify(plain)) {
                    this.report.warnOnce(
                        "validation-error",
                        DUPLICATE_ATTRIBUTE_CODE,
                        `a ${domain} has the visual property "${property}" in two ${domain}Bypasses elements; the later wins`,
                        { line, element: property },
                        `${DUPLICATE_ATTRIBUTE_CODE}:bypass:${domain}:${property}`,
                    );
                }
                column.values[index] = plain;
            }
        }
        for (const [property, { rows: targets, values }] of columns) {
            const decl: ColumnDecl = {
                name: property,
                dtype: bypassDtype(values),
                nullable: true,
                // origin.id keeps the property's name: a column renamed for a clash is written back under it
                origin: { format: CX2_FORMAT, id: property, namespace: BYPASS_NAMESPACE },
            };
            const handle = declareFresh(this.sink, domain, decl, this.report);
            for (let i = 0; i < targets.length; i++) {
                if (domain === "node") {
                    this.sink.setNodeValue(handle, targets[i], values[i]);
                } else {
                    this.sink.setEdgeValue(handle, targets[i], values[i]);
                }
            }
        }
    }

    // ------------------------------------------------------------ aspects, status, metadata

    /** The style-rule loss, the single-element aspects, the status and the metadata counts. */
    private checkAspects(): void {
        const { doc, report } = this;
        const { structure } = doc;
        const styles: string[] = [];
        for (const aspect of STYLE_ASPECTS) {
            const elements = doc.opaque.get(aspect);
            if (elements !== undefined) {
                styles.push(describeStyle(aspect, elements));
            }
        }
        if (styles.length > 0) {
            report.warning(
                "unsupported",
                STYLES_NOT_IMPORTED_CODE,
                `the file's style rules are not applied (${styles.join("; ")}); they are kept in meta.extra.cx2.opaque (style import is issue #706)`,
                { element: STYLE_ASPECTS.filter((a) => doc.opaque.has(a)).join(",") },
            );
        }
        for (const aspect of SINGLE_ELEMENT_ASPECTS.slice(1)) {
            const count = doc.opaque.get(aspect)?.length ?? 0;
            if (count > 1) {
                report.warning(
                    "validation-error",
                    CX2_ISSUE.EXTRA_ELEMENTS,
                    `${aspect} holds ${count} elements where CX2 allows one; all are kept, a reader uses the first`,
                    { element: aspect },
                );
            }
        }
        if (!doc.hasFragments) {
            for (const [aspect, blocks] of structure.blocks) {
                if (blocks > 1 && !STRUCTURE_ASPECTS.has(aspect)) {
                    report.warnOnce(
                        "validation-error",
                        CX2_ISSUE.UNDECLARED_FRAGMENTS,
                        `"${aspect}" comes in ${blocks} blocks although the descriptor does not declare hasFragments; the blocks are joined in order`,
                        { element: aspect },
                    );
                }
            }
        }
        if (!structure.hasStatus) {
            report.error("validation-error", CX2_ISSUE.NO_STATUS, "the document ends without a status block", {
                element: "status",
            });
        } else if (!structure.statusWellFormed() || structure.counts.get("status") !== 1) {
            // the specification: exactly one status aspect holding exactly one element
            const count = structure.counts.get("status") ?? 0;
            report.error(
                "validation-error",
                CX2_ISSUE.NO_STATUS,
                `the status is malformed (${count === 1 ? shown(structure.status) : `${count} elements`}): a document ends with one status block holding one object with a boolean success`,
                { element: "status" },
            );
        }
        structure.checkCounts();
    }

    /** Record the metadata: source format and version, name, description, id type, the kept aspects. */
    private setMeta(): void {
        const { doc } = this;
        const attrs = doc.networkAttributes[0]?.value;
        const named = isRecord(attrs) ? attrs : {};
        const extra: Record<string, unknown> = {};
        if (doc.opaque.size > 0) {
            extra.opaque = Object.fromEntries(doc.opaque);
        }
        if (Object.keys(this.decls.other).length > 0) {
            extra.declarations = this.decls.other;
        }
        const { weightFrom } = this.options;
        const weightDecl = weightFrom === null ? undefined : this.decls.edge.byName.get(weightFrom);
        const patch: GraphMetaPatch = {
            sourceFormat: CX2_FORMAT,
            sourceVersion: doc.version,
            idType: this.idType,
            ...(typeof named.name === "string" ? { name: named.name } : {}),
            ...(typeof named.description === "string" ? { description: named.description } : {}),
            ...(this.weighted && weightFrom !== null
                ? {
                      weightOrigin: {
                          format: CX2_FORMAT,
                          id: weightDecl?.alias ?? null,
                          title: weightFrom,
                          type: weightDecl?.type?.d ?? null,
                          namespace: null,
                      },
                  }
                : {}),
            extra: { cx2: extra },
        };
        this.sink.setMeta(patch);
    }
}

/**
 * The dtype of a bypass column: f64 when every value is a number, bool when every one is a
 * boolean, string when every one is a string, json otherwise.
 * @param values - the values
 * @returns the dtype
 */
function bypassDtype(values: readonly unknown[]): Dtype {
    if (values.every((v) => typeof v === "number")) {
        return "f64";
    }
    if (values.every((v) => typeof v === "boolean")) {
        return "bool";
    }
    if (values.every((v) => typeof v === "string")) {
        return "string";
    }
    return "json";
}

/**
 * What a style aspect holds, for the W_STYLES_NOT_IMPORTED message.
 * @param aspect - the aspect name
 * @param elements - its elements
 * @returns a short description
 */
function describeStyle(aspect: string, elements: readonly unknown[]): string {
    const first = elements[0];
    if (aspect === "visualProperties" && isRecord(first)) {
        const count = (key: string): number => (isRecord(first[key]) ? Object.keys(first[key]).length : 0);
        const defaults = isRecord(first.default)
            ? Object.values(first.default).reduce<number>((n, v) => n + (isRecord(v) ? Object.keys(v).length : 0), 0)
            : 0;
        return `visualProperties: ${defaults} default(s), ${count("nodeMapping")} node mapping(s), ${count("edgeMapping")} edge mapping(s)`;
    }
    return `${aspect}: ${elements.length} element(s)`;
}

/**
 * Resolve the zAs option.
 * @param value - the option
 * @returns the mode; E_UNSUPPORTED for any other value
 */
export function zAsOption(value: unknown): "column" | "position" {
    if (value === undefined) {
        return "column";
    }
    if (value === "column" || value === "position") {
        return value;
    }
    throw new GraphFormatError("E_UNSUPPORTED", `option zAs: ${shown(value)} is not one of "column", "position"`, {
        option: "zAs",
        found: typeof value === "string" ? value : typeof value,
    });
}

/**
 * The CX2 importer plugin (design section 1.3).
 */
export const cx2Importer: GraphImporter<Cx2ImportOptions> = Object.freeze({
    format: CX2_FORMAT,
    extensions: Object.freeze([".cx2"]),
    mimeTypes: Object.freeze(["application/json"]),

    /**
     * Confidence that the head is CX2: 0.97 when the first member of a top-level array is an
     * object with a CXVersion key, in any key order.
     * @param head - the first bytes
     * @returns the confidence
     */
    sniff(head: Uint8Array): number {
        const text = headText(head);
        return /^\s*\[\s*\{(?:\s*"[^"]*"\s*:\s*(?:true|false|"[^"]*"|[0-9.]+)\s*,)*\s*"CXVersion"\s*:/.test(text)
            ? 0.97
            : 0;
    },

    /**
     * Read a CX2 document into the sink.
     * @param input - the text, bytes or stream
     * @param sink - the sink
     * @param options - format-specific and common options
     * @returns the import report; ImportError on a fatal error or beyond the error limit
     */
    async import(
        input: ImportInput,
        sink: GraphSink,
        options?: Cx2ImportOptions & CommonImportOptions,
    ): Promise<ImportReport> {
        const resolved = resolveImportOptions(options, FORMAT_DEFAULTS);
        const zAs = zAsOption(options?.zAs);
        const report = new ImportReportBuilder(CX2_FORMAT, resolved.errorLimit);
        reportSinkOptions(sink, options, report, true);
        reportUnusedOptions(options, report, USED_OPTIONS);
        const doc = await readDocument(input, report, resolved);
        new Cx2Reader(sink, report, resolved, zAs, doc).build();
        throwIfAborted(resolved.signal);
        return report.finish();
    },
});
