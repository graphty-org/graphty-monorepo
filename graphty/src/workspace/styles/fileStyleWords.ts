/**
 * The app's words for what a load did with a file's styles: each note of the load report
 * (`LoadReport.styles.notes`) and each style layer made from the file (its `fileStyleOf` facts).
 * graphty-element returns codes and facts only; every sentence here is the app's.
 */

import type {
    ExportStyleLossCode,
    FileStyleCode,
    FileStyleNote,
    FileStyleOrigin,
} from "@graphty/graphty-element/session";

/** A style code a load reports: every style code but the ones only an export reports. */
type ImportStyleCode = Exclude<FileStyleCode, ExportStyleLossCode>;

/** What each load note means, as the start of a sentence. */
export const STYLE_NOTE_WORDS: Readonly<Record<ImportStyleCode, string>> = {
    W_STYLE_VALUE_TOO_LONG: "A style value was too long to read",
    W_STYLE_BAD_VALUE: "A style value could not be read",
    W_STYLE_UNKNOWN_VALUE: "A style value has no name graphty knows",
    W_STYLE_ALPHA_DROPPED: "A color's transparency has nowhere to go and was dropped",
    W_STYLE_COLOR_LIST: "A list of colors stands where one color belongs; it was not used",
    W_STYLE_GRADIENT: "A gradient fill is drawn as its first color",
    W_STYLE_UNFILLED: "A node the program draws unfilled has a fill color in the file",
    W_STYLE_NO_FILL: "A node fill the file marks as transparent",
    W_STYLE_NO_STROKE: "An edge line the file marks as absent",
    W_STYLE_SIZE_MINIMUM: "The program grows nodes to fit their labels, so a stated size is a minimum",
    W_STYLE_HTML_LABEL: "A formatted label is shown as plain text",
    W_STYLE_RECORD_LABEL: "A label in fields is shown with its fields joined",
    W_STYLE_EXTRA_LABELS: "An element has more than one label; the first is shown",
    W_STYLE_INHERIT_COLOR: "An edge color taken from its ends could not be kept",
    W_STYLE_NOT_CARRIED: "A style graphty has no counterpart for was not kept",
    W_STYLE_BAD_MAPPING: "A mapping in the file could not be read",
    W_STYLE_MAPPING_COLUMN_MISSING: "A mapping reads a column the file does not have",
    W_STYLE_REFERENCE_CYCLE: "Styles in the file refer to each other in a loop; the rest were read",
    W_STYLE_UNRESOLVED: "A style in the file refers to something the file does not hold",
    W_STYLE_NESTING: "Styles nested too deep were not read",
    W_STYLE_UNREADABLE: "A style section of the file could not be read",
    W_STYLE_NO_VIZMAP: "The session holds no visual styles, so the program's defaults are drawn",
    W_STYLE_VIEW_STYLE_MISSING: "The view names a visual style the file does not hold",
    W_STYLE_OTHER_STYLES: "The file holds other visual styles; only the one its view uses was read",
    W_STYLE_OTHER_VIEWS: "The file holds more than one view; only the first view's styles were read",
    W_STYLE_SELECTOR: "A selector the program treats as invalid matches every element",
    W_STYLE_SELECTOR_AS_COLUMN: "A selector too complex to keep is kept as a mark on the elements it matched",
    W_STYLE_STATE_ASSUMED: "A style for a passing state (selected, hovered) is drawn as it was when loaded",
    W_STYLE_RAMP_ROUNDED: "A color ramp matches the file only within the program's rounding",
    W_STYLE_LAYER_CAP: "Some of the file's rules were combined to keep the number of layers small",
    W_STYLE_BUDGET: "The file's styles took too long to explain; the rest are copied per element",
    W_STYLE_BLOCK_IGNORED: "The graphty layers saved in the file were not used; its other styles were",
    W_STYLES_NOT_IMPORTED: "The file has styles that were not imported",
    W_STYLE_NOT_DRAWN: "A style graphty does not draw was left out",
    W_STYLE_NO_COUNTERPART: "A style value with no counterpart in graphty was left out",
    W_STYLE_DRAWN_NEAREST: "A style is drawn as the nearest one graphty has",
    W_STYLE_COLUMN_ABSENT: "A style reads a column no element holds; it was left out",
    W_STYLE_TABLE_AS_VALUES: "A mapping too large to keep as a table is kept per element",
    W_STYLE_LAYERS_FOLDED: "Some style layers were combined to keep the number of layers small",
    W_STYLE_LABEL_CAPPED: "Label styles with many different values are drawn as the nearest kept one",
    W_STYLE_LAYER_REFUSED: "A style layer could not be added; the others were",
    W_STYLE_LAYER_SPEC_IGNORED: "A graphty layer saved in the file was rebuilt from the file's own styles",
    W_STYLE_NOT_UNDERSTOOD: "A style of a kind this version does not know was left out",
};

/**
 * Why a layer copies the file's values, or how it was built, by reason code. Every code in the
 * element's `FILE_STYLE_REASONS` has an entry (a test enumerates them).
 */
export const STYLE_REASON_WORDS: Readonly<Record<string, string>> = {
    NO_EXPLANATION: "no column explains them",
    STYLE_CLASS: "grouped by the styles elements share",
    LAYER_CAP: "combined to keep the number of layers small",
    SOURCE_NODE_COLOR: "each edge takes its source node's color, as the program draws it",
    EDGE_WEIGHT: "each edge is as thick as its weight, as the program draws it",
    NODE_NAME: "each node without a label shows its name, as the program draws it",
    FUNCTION: "the file computes them with a function",
    BUDGET: "they took too long to explain",
    SELECTOR: "the file's selector was too complex to keep",
    TABLE_SIZE: "the mapping table was too large to keep",
    SCALE: "the file's scale cannot be kept as one",
    CALCULATED: "they are calculated values",
    RESULT_PATH: "they come from a value the file does not hold",
};

/**
 * A count and its noun, singular for one.
 * @param n - the count.
 * @param noun - the singular noun.
 * @returns such as "1 node" or "9 values".
 */
function count(n: number, noun: string): string {
    return `${n.toLocaleString("en-US")} ${noun}${n === 1 ? "" : "s"}`;
}

/**
 * One load note in words: what happened, where and how often.
 * @param note - a note of `LoadReport.styles.notes`.
 * @returns one sentence.
 */
export function fileStyleNoteWords(note: FileStyleNote): string {
    const said: string | undefined = (STYLE_NOTE_WORDS as Readonly<Record<string, string>>)[note.code];
    const { property, target, count: times } = note.params;
    const what =
        typeof property === "string" ? ` (${property}${typeof target === "string" ? ` on ${target}s` : ""})` : "";
    const often = typeof times === "number" && times > 1 ? `, ${count(times, "time")}` : "";
    return `${said ?? "Something in the file's styles was not drawn as the file says"}${what}${often}.`;
}

/**
 * A style layer made from a file, in words, from its facts.
 * @param origin - the layer's `fileStyleOf` facts.
 * @param columnName - the name of the column the layer reads, when the caller knows it.
 * @returns such as "From the file, by Modularity Class (9 values)".
 */
export function fileStyleLayerWords(origin: FileStyleOrigin, columnName?: string): string {
    const by = columnName === undefined ? "" : `, by ${columnName}`;
    const reason: string | undefined = origin.reason === undefined ? undefined : STYLE_REASON_WORDS[origin.reason];
    const because = reason === undefined ? "" : `: ${reason}`;
    const elements = origin.elements === undefined ? "" : ` on ${count(origin.elements, "element")}`;
    switch (origin.role) {
        case "defaults":
            return origin.origin === "tool" ? "Defaults of the program that wrote the file" : "The file's defaults";
        case "group":
            return `A group from the file${elements}${origin.classes === undefined ? "" : `, ${count(origin.classes, "class")}`}${because}`;
        case "mapping":
            return `From the file${by}${origin.entries === undefined ? "" : ` (${count(origin.entries, "value")})`}`;
        case "passthrough":
            return `Copied from the file${by}${origin.distinctValues === undefined ? "" : `, ${count(origin.distinctValues, "distinct value")}`}${because}`;
        case "exceptions":
            return `Exceptions from the file${elements}${because}`;
        default:
            return `From the file${by}${because}`;
    }
}
