/**
 * What the Export dialog says a file cannot hold.
 *
 * graphty-element reports each loss as a coded fact (`ExportResult.losses`: a code, the columns it
 * is about and a count) and writes no words for it; this table is where the app words them. A code
 * it has no words for -- a format's own, or one added in a later release -- gets a plain sentence
 * from its columns.
 */

import type { ExportLoss, ExportLossCode } from "@graphty/graphty-element";

/** A loss's params. */
type Params = ExportLoss["params"];

/**
 * The columns a loss names, quoted, for a sentence.
 * @param params - the loss's params.
 * @returns such as `"tags"` or `"tags", "meta" and "score"`.
 */
function columns(params: Params): string {
    const names = Array.isArray(params.columns) ? params.columns.map((name) => `"${String(name)}"`) : [];
    return names.length <= 1 ? (names[0] ?? "") : `${names.slice(0, -1).join(", ")} and ${names.at(-1) ?? ""}`;
}

/**
 * A count and its noun, singular for one.
 * @param params - the loss's params.
 * @param noun - the singular noun.
 * @returns such as "1 edge" or "3 edges"; the plural alone when the count is unknown.
 */
function some(params: Params, noun: string): string {
    const n = typeof params.count === "number" ? params.count : null;
    if (n === null) {
        return `${noun}s`;
    }

    return `${n.toLocaleString("en-US")} ${noun}${n === 1 ? "" : "s"}`;
}

/**
 * The verb after a count: "is" for one, "are" otherwise.
 * @param params - the loss's params.
 * @param one - the verb for one.
 * @param many - the verb for several.
 * @returns the verb.
 */
function verb(params: Params, one = "is", many = "are"): string {
    return params.count === 1 ? one : many;
}

/** The words for the codes a reader meets most: the shared ones, CSV's and the element's own. */
const WORDS: Partial<Readonly<Record<ExportLossCode, (params: Params) => string>>> = {
    W_COLUMN_DROPPED: (p) => `${columns(p)} is not written`,
    W_MIXED_DIRECTION: (p) => `${some(p, "undirected edge")} in a directed graph ${verb(p)} written with one direction`,
    E_MIXED_DIRECTION: (p) => `${some(p, "undirected edge")} in a directed graph cannot be written in this format`,
    W_MULTI_EDGES: (p) => `${some(p, "parallel edge")} cannot be kept`,
    W_SELF_LOOPS: (p) => `${some(p, "self-loop")} cannot be kept`,
    W_EDGE_IDS_GENERATED: () => "Edges get new ids",
    W_EDGE_IDS_DROPPED: (p) => `Edge ids (${columns(p)}) are not written`,
    W_ID_MANGLED: (p) => `${some(p, "node id")} ${verb(p)} rewritten`,
    E_ID_CHARSET: (p) => `${some(p, "node id")} cannot be written in this format`,
    W_ID_RENUMBERED: (p) => `${some(p, "node id")} ${verb(p)} replaced by numbers`,
    W_DTYPE_UNSUPPORTED: (p) => `${columns(p)} is written as another type`,
    W_LIST_UNSUPPORTED: (p) => `${columns(p)} holds lists, which are written as text`,
    W_JSON_UNSUPPORTED: (p) => `${columns(p)} holds nested values, which are written as text`,
    W_POSITIONS_DROPPED: () => "Node positions are not kept",
    W_VIZ_DROPPED: (p) => `Colors and sizes (${columns(p)}) are not kept`,
    W_GRAPH_ATTRIBUTES_DROPPED: (p) => `Graph attributes ${columns(p)} are not kept`,
    W_ROLE_DROPPED: (p) => `${columns(p)} is written as an ordinary column`,
    W_COLUMN_NAME_CHANGED: (p) => `${columns(p)} reads back under another name`,
    W_TEXT_INFERRED: (p) => `Text in ${columns(p)} may read back as numbers`,
    W_ID_TEXT_TYPE: (p) => `${some(p, "node id")} ${verb(p, "reads", "read")} back with another type`,
    E_ID_TEXT_COLLISION: (p) => `${some(p, "node id")} would be written as the same text`,
    W_WEIGHTS_DROPPED: () => "Edge weights are not kept",
    W_MUTUAL_EXPANDED: (p) => `${some(p, "mutual pair")} ${verb(p)} written as two edges each`,
    W_CSV_DIRECTION_DROPPED: (p) => `${some(p, "undirected edge")} ${verb(p, "reads", "read")} back as directed`,
    W_CSV_NODE_TABLE: (p) => `Node columns ${columns(p)} are in the node table, not this one`,
    W_CSV_ISOLATED_NODES: (p) => `${some(p, "node")} without edges ${verb(p)} only in the node table`,
    W_CSV_NODE_ORDER: () => "Nodes read back in another order",
    W_CSV_NONFINITE: (p) => `Infinite or missing numbers in ${columns(p)} read back as text`,
    W_CSV_RESERVED_NAME: (p) => `${columns(p)} has a reserved name and is not written`,
    W_GRAPHTY_COLUMN_DROPPED: (p) => `${columns(p)} is the app's own and is not written`,
    W_GRAPHTY_NOTES: (p) => `${some(p, "note")} ${verb(p)} not exported as notes`,
    W_GRAPHTY_TRUNCATED: (p) => `${some(p, "note text")} ${verb(p, "was", "were")} shortened to 64 KB`,
    W_GRAPHTY_CSV_NEUTRALIZED: (p) =>
        `${some(p, "cell")} that a spreadsheet would run ${verb(p, "starts", "start")} with an apostrophe`,
    W_WEIGHT_NOT_NUMERIC: (p) => `${some(p, "edge weight")} that ${verb(p)} not numbers ${verb(p)} not written`,
    W_RESULT_FIELD_DROPPED: (p) => `The result ${columns(p)} is not written`,
};

/**
 * What one loss means for the reader.
 * @param loss - one of `ExportResult.losses`.
 * @returns a sentence, with a plain one for a code this table has no words for.
 */
export function lossWords(loss: ExportLoss): string {
    const words = Object.hasOwn(WORDS, loss.code) ? WORDS[loss.code as ExportLossCode] : undefined;
    if (words !== undefined) {
        return words(loss.params);
    }

    const named = columns(loss.params);
    return named === "" ? "Part of the graph is not kept" : `Part of ${named} is not kept`;
}
