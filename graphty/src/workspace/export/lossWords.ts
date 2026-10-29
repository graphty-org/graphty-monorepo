/**
 * What the Export dialog shows of what a file cannot hold, as compact rows.
 *
 * graphty-element reports each loss as a coded fact (`ExportResult.losses`: a code, the columns it
 * is about and a count) and writes no words for it; this table is where the app labels them. Every
 * code a built-in writer reports has a label or is listed as not worth showing (a test fails on a
 * code of the element's `EXPORT_LOSS_CODES` with neither); a registered writer's own code gets "Not kept".
 */

import type { ExportLoss } from "@graphty/graphty-element";
import { CHANNEL_DESCRIPTORS, type FormatDescriptor } from "@graphty/graphty-element/catalog";
import { EXPORT_STYLE_LOSS_CODES, type FileStyleReason } from "@graphty/graphty-element/session";

/** A loss's params. */
type Params = ExportLoss["params"];

/** What a loss's count counts, when it counts nodes or edges. */
type Kind = "node" | "edge" | null;

/** One row of the losses list. */
export interface LossRow {
    /** What is lost, in a few words: "Not written", "Node fill color not written". */
    readonly what: string;
    /** The columns it is about, drawn as chips. */
    readonly columns: readonly string[];
    /** How many are affected, or null when not counted. */
    readonly count: number | null;
    /** What the count counts: nodes or edges (drawn as a node or edge chip), or neither. */
    readonly kind: Kind;
    /** Whether it is about the graph's styles (a style loss code, or drawn colors and sizes). */
    readonly style: boolean;
}

/**
 * The style property a loss is about, as words.
 * @param params - the loss's params: `target` (node, edge or graph), `property` (a neutral
 * property such as `borderColor`) and, for one only graphty draws, `channel`.
 * @returns such as "node border color"; "styles" when the loss names no property.
 */
export function property(params: Params): string {
    // a property only graphty draws is its channel, whose catalog name already says node or edge
    if (typeof params.channel === "string" && Object.hasOwn(CHANNEL_DESCRIPTORS, params.channel)) {
        return CHANNEL_DESCRIPTORS[params.channel as keyof typeof CHANNEL_DESCRIPTORS].plainName.toLowerCase();
    }
    const bare = typeof params.channel === "string" ? params.channel : params.property;
    if (typeof bare !== "string") {
        return "styles";
    }
    const name = bare.replaceAll(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
    const words = name === "fill" ? "fill color" : name;
    return typeof params.target === "string" ? `${params.target} ${words}` : words;
}

/**
 * The capital-first form of a phrase.
 * @param text - the phrase.
 * @returns it, with its first letter upper case.
 */
function capital(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * The node or edge a style loss counts.
 * @param params - the loss's params.
 * @returns node, edge or null.
 */
function target(params: Params): Kind {
    return params.target === "node" || params.target === "edge" ? params.target : null;
}

/** Why a layer is written as its values, by the reason code `W_STYLE_LAYER_FLATTENED` carries. */
const FLATTENED_BECAUSE: Readonly<Record<Extract<FileStyleReason, "SCALE" | "RESULT_PATH">, string>> = {
    SCALE: "palette not kept",
    RESULT_PATH: "reads a result",
};

/** A code's label and what its count counts. */
type Label = readonly [what: string | ((params: Params) => string), kind?: Kind | ((params: Params) => Kind)];

const N = "node";
const E = "edge";
const UNDIRECTED: Label = ["Undirected edges read back as directed", E];
const NESTED_AS_TEXT: Label = ["Nested values written as text"];
const NONFINITE_TEXT: Label = ["Infinite values read back as text"];
const NONFINITE_EMPTY: Label = ["Infinite values read back empty"];
const EDGE_IDS_TEXT: Label = ["Edge ids read back as text", E];
const POSITION_CHANGED: Label = ["Positions changed", N];
const POSITION_DROPPED: Label = ["Positions not written", N];
const PARENT_LOOP: Label = ["Parent loops written at top level", N];
const NODE_ORDER: Label = ["Node order changes"];
const TYPE_GAINED: Label = ["Gains a type column"];
const RESERVED: Label = ["Reserved name, not written"];

/** The labels of every code a built-in writer reports, but those in NOT_SHOWN. */
const LABELS: Readonly<Record<string, Label>> = {
    // the shared codes
    W_COLUMN_DROPPED: ["Not written"],
    W_MIXED_DIRECTION: ["Undirected edges written as directed", E],
    E_MIXED_DIRECTION: ["Mixed directions not allowed", E],
    W_MULTI_EDGES: ["Parallel edges dropped", E],
    W_SELF_LOOPS: ["Self-loops dropped", E],
    W_EDGE_IDS_GENERATED: ["New edge ids", E],
    W_EDGE_IDS_DROPPED: ["Edge ids not written", E],
    W_ID_MANGLED: ["Ids rewritten", N],
    E_ID_CHARSET: ["Ids not allowed", N],
    W_ID_RENUMBERED: ["Ids replaced by numbers", N],
    W_DTYPE_UNSUPPORTED: ["Written as another type"],
    W_COMPONENTS_FLATTENED: ["Split into separate values"],
    W_LIST_UNSUPPORTED: ["Lists written as text"],
    W_JSON_UNSUPPORTED: NESTED_AS_TEXT,
    W_DEFAULT_DROPPED: ["Default not written"],
    W_OPTIONS_DROPPED: ["Allowed values not written"],
    W_HIERARCHY_DROPPED: ["Parents not written", N],
    W_PARENTS_DROPPED: ["Extra parents not written", N],
    W_TEMPORAL_DROPPED: ["Time not written"],
    W_TEMPORAL_TEXT_DROPPED: ["Original time text not written"],
    W_SPELLS_DROPPED: ["Time spans not written"],
    W_DYNAMIC_VALUES_DROPPED: ["Values over time not written"],
    W_OPEN_INTERVAL: ["Open time spans not written"],
    W_EXTENSION_TABLE_DROPPED: ["Extra table not written"],
    W_POSITIONS_DROPPED: POSITION_DROPPED,
    W_VIZ_DROPPED: ["Colors and sizes not written"],
    W_GRAPH_ATTRIBUTES_DROPPED: ["Graph attributes not written"],
    W_ROLE_DROPPED: ["Written as an ordinary column"],
    W_ROLE_ASSUMED: ["Reads back with a role"],
    W_COLUMN_NAME_CHANGED: ["Reads back renamed"],
    W_TEXT_INFERRED: ["Text reads back as numbers"],
    W_ID_TEXT_TYPE: ["Ids read back as another type", N],
    E_ID_TEXT_COLLISION: ["Ids collide as text", N],
    W_WEIGHTS_DROPPED: ["Weights not written", E],
    W_WEIGHT_KEY_CLASH: ["Reads back as the edge weight"],
    W_MUTUAL_EXPANDED: ["Mutual pairs written as two edges", E],
    W_MUTUAL_AS_UNDIRECTED: ["Mutual pairs written as one edge", E],
    W_DIRECTION_DROPPED: ["Direction not written", E],
    W_EMPTY_COLUMN_DROPPED: ["Empty, not written"],
    W_NONFINITE_AS_NULL: NONFINITE_EMPTY,
    W_NODE_ORDER: NODE_ORDER,
    W_RESERVED_KEY: RESERVED,
    W_GRAPH_COLUMN_AS_METADATA: ["Reads back as metadata"],
    W_COLUMN_AS_PROPERTY_VALUE: ["Reads back as property values"],
    W_RELATION_ASSUMED: ["Edges without a relation written as is_a", E],
    W_TYPEDEF_NODES: ["Relation nodes hidden on reading", N],
    W_VALUE_UNWRITABLE: ["Some values not written"],
    E_XML_ILLEGAL_CHAR: ["Control characters not allowed"],
    // CSV
    W_CSV_DIRECTION_DROPPED: UNDIRECTED,
    W_CSV_NODE_TABLE: ["Nodes table only"],
    W_CSV_ISOLATED_NODES: ["Nodes without edges: nodes table only", N],
    W_CSV_NODE_ORDER: NODE_ORDER,
    W_CSV_NONFINITE: NONFINITE_TEXT,
    W_CSV_RESERVED_NAME: RESERVED,
    W_CSV_ROLE_NAME: ["Role not recognized on reading"],
    W_CSV_TEXT_ROLE: ["Reads back as text"],
    W_CSV_EDGE_COLUMNS: ["Edge columns not written", E],
    W_CSV_HEADERLESS: ["Unnamed without a header"],
    // CX, CX2, Cytoscape sessions, XGMML
    W_CX_UNDIRECTED_AS_DIRECTED: UNDIRECTED,
    W_CX2_UNDIRECTED_AS_DIRECTED: UNDIRECTED,
    W_CX_JSON_AS_STRING: NESTED_AS_TEXT,
    W_CX2_JSON_AS_STRING: NESTED_AS_TEXT,
    W_CX2_NONFINITE_AS_NULL: NONFINITE_EMPTY,
    W_CYS_JSON_AS_STRING: NESTED_AS_TEXT,
    W_CYS_LIST_ITEMS: ["Some list items change"],
    W_CYS_POSITION: POSITION_CHANGED,
    W_CYS_TEXT_AS_EQUATION: ["Leading = is a formula in Cytoscape"],
    W_CYS_UNSET_AS_EMPTY_STRING: ["Empty cells read back as empty text"],
    W_XGMML_JSON_AS_STRING: NESTED_AS_TEXT,
    W_XGMML_POSITION: POSITION_CHANGED,
    W_XGMML_EDGE_ID_TEXT: EDGE_IDS_TEXT,
    W_XGMML_PARENT_CYCLE: PARENT_LOOP,
    W_XGMML_BACKSLASH_ESCAPE: ["Backslash escapes read back as breaks"],
    W_XGMML_INTERACTION_FROM_LABEL: ["Labels gain an interaction column", E],
    // DOT
    E_DOT_TRAILING_BACKSLASH: ["Backslash before a quote not allowed"],
    W_DOT_NON_FINITE: NONFINITE_TEXT,
    W_DOT_ATTRIBUTE_CLASH: ["Name clash, not written"],
    W_DOT_POSITION_SHAPE: POSITION_DROPPED,
    W_DOT_CLUSTER_MARKED: ["Parents read back as clusters", N],
    W_DOT_CHARSET_REWRITTEN: ["Charset written as UTF-8"],
    // GEXF
    W_GEXF_KIND_DROPPED: ["Edge kind not written", E],
    W_GEXF_EDGE_ID_TEXT: EDGE_IDS_TEXT,
    W_TIMESTAMP_AS_INTERVAL: ["Timestamps written as spans"],
    W_LIST_SEPARATOR: ["Items holding | split apart"],
    W_ROLE_SHAPE: ["Written as an ordinary column"],
    W_TEMPORAL_TABLE_SHAPE: ["Time table not written"],
    W_ATTRIBUTE_RENAMED: ["Reads back renamed"],
    W_DECLARED_TYPE: ["Written as the nearest type"],
    // GML
    E_GML_NESTED_ARRAY: ["Nested lists not allowed"],
    E_GML_INVALID_KEY: ["Name not allowed"],
    E_GML_RESERVED_KEY: ["Reserved name"],
    E_GML_GRAPHICS_CONFLICT: ["Graphics cannot hold the position", N],
    W_GML_RECORD_NUMBER_TYPE: ["Number types not kept"],
    W_GML_RECORD_BOOLEAN: ["True and false written as 1 and 0"],
    W_GML_RECORD_NULL: ["Empty nested values not written"],
    W_GML_JSON_ARRAY: ["Nested lists read back as lists"],
    W_GML_KEY_MANGLED: ["Name rewritten"],
    W_GML_POSITION_COMPONENTS: ["Only x, y and z written"],
    W_GML_GRAPHICS_OVERRIDDEN: ["Graphics position replaced", N],
    // GraphML
    E_GRAPHML_YFILES_TREE: ["yEd graphics not valid"],
    W_GRAPHML_HIERARCHY_REORDERED: NODE_ORDER,
    W_GRAPHML_PARENT_CYCLE: PARENT_LOOP,
    W_GRAPHML_EDGE_ID_TEXT: EDGE_IDS_TEXT,
    W_GRAPHML_YFILES_GRAPHICS_STALE: ["Outdated yEd graphics not written"],
    // JSON and OBO Graphs
    W_NUMERIC_IDS_STRINGIFIED: ["Number ids read back as text", N],
    W_POSITION_Z_DROPPED: ["Depth (z) not written", N],
    W_JSON_STYLE_KEY_REPLACED: ["Replaced by the drawn style"],
    W_OBOGRAPHS_EDGE_COLUMN_AS_META: ["Reads back inside meta"],
    W_OBOGRAPHS_ID_CHANGED: ["Ids read back changed", N],
    W_OBOGRAPHS_DATATYPE_DROPPED: ["Datatype not written"],
    W_OBOGRAPHS_TYPE_GAINED: TYPE_GAINED,
    // Neo4j
    W_NEO4J_IGNORED_COLUMNS: ["Ignored columns skipped"],
    W_NEO4J_UNDIRECTED_AS_DIRECTED: UNDIRECTED,
    E_NEO4J_WEIGHT_COLUMN_TAKEN: ["Weight column name taken"],
    E_NEO4J_ID_COLUMN_TAKEN: ["Id column name taken"],
    W_NEO4J_MULTIPLE_ID_PROPERTIES: ["Only the first id written", N],
    W_NEO4J_DECLARED_TYPE_CHANGED: ["Integers written as decimals"],
    W_NEO4J_ARRAY_DELIMITER: ["Items holding the delimiter split apart"],
    // OBO
    W_OBO_EDGE_COLUMN_AS_QUALIFIER: ["Reads back as qualifiers"],
    W_OBO_UNDIRECTED_AS_DIRECTED: UNDIRECTED,
    W_OBO_DUPLICATE_CLAUSE: ["Duplicates read back as one"],
    W_OBO_RELATION_RENAMED: ["Relations rewritten", E],
    W_OBO_ONTOLOGY_NAME: ["Graph name rewritten"],
    W_OBO_TYPE_GAINED: TYPE_GAINED,
    W_OBO_EDGE_ORDER: ["Edge order changes", E],
    W_OBO_LINE_END: ["Line ends rewritten"],
    // Pajek
    E_PAJEK_TEXT: ["Quotes and line breaks not allowed"],
    W_PAJEK_KEY_DROPPED: ["Name not allowed, not written"],
    W_PAJEK_LABEL_AS_TEXT: ["Labels read back as text", N],
    W_PAJEK_NONFINITE_AS_TEXT: NONFINITE_TEXT,
    W_PAJEK_POSITION_STRIDE: POSITION_DROPPED,
    W_PAJEK_FIRST_MODE_DROPPED: ["Written as one-mode"],
    W_PAJEK_SHAPE_AS_PARAMETER: ["Shapes read back as text"],
    W_PAJEK_LABEL_GAINED: ["Ids read back as labels", N],
    // graphty-element's own
    W_GRAPHTY_COLUMN_DROPPED: ["App column, not written"],
    W_GRAPHTY_NOTES: ["Notes not exported"],
    W_GRAPHTY_TRUNCATED: ["Notes cut to 64 KB"],
    W_GRAPHTY_CSV_NEUTRALIZED: ["Formulas prefixed with an apostrophe"],
    W_WEIGHT_NOT_NUMERIC: ["Weights that are not numbers not written", E],
    W_RESULT_FIELD_DROPPED: ["Result not written"],
    // styles
    W_STYLE_NOT_WRITTEN: [(p) => `${capital(property(p))} not written`, target],
    W_STYLE_APPROXIMATED: [(p) => `${capital(property(p))} approximated`, target],
    W_STYLE_RULES_NOT_KEPT: ["Style rules written as values"],
    W_STYLE_LAYER_FLATTENED: [
        (p) => {
            const layer = typeof p.layer === "string" ? `"${p.layer}"` : "Layer";
            const why =
                typeof p.reason === "string" && Object.hasOwn(FLATTENED_BECAUSE, p.reason)
                    ? `: ${FLATTENED_BECAUSE[p.reason as keyof typeof FLATTENED_BECAUSE]}`
                    : "";
            return `${layer} written as ${property(p)}${why}`;
        },
        target,
    ],
    W_STYLES_NOT_EXPORTED: ["Style layers not written"],
    E_STYLES_MISMATCH: ["Styles belong to another graph"],
};

/**
 * The codes a built-in writer reports that change nothing a reader would notice -- the values
 * read back the same, with another storage, precision or byte layout -- so they get no row.
 */
export const NOT_SHOWN: ReadonlySet<string> = new Set([
    "W_STORAGE_CLASS_CHANGED",
    "W_INTEGRAL_F64_AS_I32",
    "W_OPTIONS_GAINED",
    "W_GEXF_VIZ_DTYPE",
    "W_XGMML_WIDENED_TYPE",
    "W_GRAPHML_YFILES_JSON",
]);

/**
 * Whether the app has a label for a code, or keeps it off the list on purpose.
 * @param code - a loss code.
 * @returns true when it does.
 */
export function isLabeled(code: string): boolean {
    return Object.hasOwn(LABELS, code) || NOT_SHOWN.has(code);
}

/**
 * One loss as a row.
 * @param loss - one of `ExportResult.losses`.
 * @returns its row; null for a code not shown, or a loss of nothing (a count of 0).
 */
export function lossRow(loss: ExportLoss): LossRow | null {
    const { params } = loss;
    if (NOT_SHOWN.has(loss.code) || params.count === 0) {
        return null;
    }
    const [what, kind = null] = Object.hasOwn(LABELS, loss.code) ? LABELS[loss.code] : (["Not kept"] as Label);
    return {
        what: typeof what === "string" ? what : what(params),
        columns: Array.isArray(params.columns) ? params.columns.map(String) : [],
        count: typeof params.count === "number" ? params.count : null,
        kind: typeof kind === "function" ? kind(params) : kind,
        // graph-io's drawn colors and sizes, as a format's own columns, count with the styles.
        style: isStyleLoss(loss) || loss.code === "W_VIZ_DROPPED",
    };
}

/** The most parts the one-line summary names before it counts the rest. */
const SUMMARY_PARTS = 3;

/**
 * The lower-case-first form of a label, for the middle of a line.
 * @param text - the label.
 * @returns it, its first letter lower case.
 */
function lower(text: string): string {
    return text.charAt(0).toLowerCase() + text.slice(1);
}

/**
 * What a file loses, as one counted line (tier 4, R14): each loss that is not about styles by its
 * label (with how many columns it is about), then the style losses as one count -- "positions not
 * written, 9 style settings" -- the rest counted as "N more". The rows themselves sit behind a
 * Details disclosure.
 * @param rows - the loss rows.
 * @returns the line.
 */
export function lossSummary(rows: readonly LossRow[]): string {
    const styles = rows.filter((row) => row.style);
    const parts = rows
        .filter((row) => !row.style)
        .map((row) => {
            const { length } = row.columns;
            if (length === 0) {
                return lower(row.what);
            }
            return `${lower(row.what)}: ${String(length)} ${length === 1 ? "column" : "columns"}`;
        });
    if (styles.length === 1) {
        parts.push(lower(styles[0].what));
    } else if (styles.length > 1) {
        parts.push(`${String(styles.length)} style settings`);
    }
    if (parts.length <= SUMMARY_PARTS) {
        return parts.join(", ");
    }
    return [...parts.slice(0, SUMMARY_PARTS - 1), `${String(parts.length - SUMMARY_PARTS + 1)} more`].join(", ");
}

/**
 * The rows of a list of losses: one per label and kind, the columns of repeats gathered into it
 * (five `W_VIZ_DROPPED` losses, one per column, are one row with five column chips).
 * @param losses - the export's losses.
 * @returns the rows, in first-reported order.
 */
export function lossRows(losses: readonly ExportLoss[]): LossRow[] {
    const rows = new Map<string, LossRow>();
    for (const loss of losses) {
        const row = lossRow(loss);
        if (row === null) {
            continue;
        }
        const key = `${row.what}|${String(row.kind)}`;
        const seen = rows.get(key);
        rows.set(
            key,
            seen === undefined
                ? row
                : {
                      ...seen,
                      columns: [...new Set([...seen.columns, ...row.columns])],
                      count:
                          seen.count === null || row.count === null
                              ? (seen.count ?? row.count)
                              : Math.max(seen.count, row.count),
                  },
        );
    }
    return [...rows.values()];
}

/**
 * Whether a loss is about the graph's styles.
 * @param loss - one of `ExportResult.losses`.
 * @returns true for one of the element's `EXPORT_STYLE_LOSS_CODES`.
 */
export function isStyleLoss(loss: ExportLoss): boolean {
    return (EXPORT_STYLE_LOSS_CODES as readonly string[]).includes(loss.code);
}

/**
 * The style losses the warning lists: all of them, less the rules not kept by a format that
 * writes no styles at all, where the sentence after the list already says none come back.
 * @param format - the format, from the element's catalog.
 * @param losses - the export's style losses.
 * @returns the losses to list.
 */
export function listedStyleLosses(
    format: FormatDescriptor | undefined,
    losses: readonly ExportLoss[],
): readonly ExportLoss[] {
    const none = (format?.styles?.write ?? "none") === "none";
    return none ? losses.filter((loss) => loss.code !== "W_STYLE_RULES_NOT_KEPT") : losses;
}

/**
 * What opening the file in graphty again gives back of the style layers.
 * @param format - the format, from the element's catalog.
 * @param losses - the export's losses.
 * @returns a short label.
 */
export function layersBackWords(format: FormatDescriptor | undefined, losses: readonly ExportLoss[]): string {
    const write = format?.styles?.write ?? "none";
    if (write === "none") {
        return "Reopened: no styles";
    }
    if (write === "values" || losses.some((loss) => loss.code === "W_STYLE_RULES_NOT_KEPT")) {
        return "Reopened: colors and sizes, no layers";
    }
    return losses.some((loss) => loss.code === "W_STYLE_LAYER_FLATTENED")
        ? "Reopened: other layers as layers"
        : "Reopened: layers as layers";
}
