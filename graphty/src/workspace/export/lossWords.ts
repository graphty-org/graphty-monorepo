/**
 * The Export dialog's "cannot hold everything" lines, written by the app from each loss's code,
 * column and count. graph-io and graphty-element give every loss a stable code; their English
 * `message` is never shown or read here.
 */

import type { GraphSession } from "@graphty/graphty-element/session";

import { count } from "../data-place/words";
import { runName } from "../runWords";

/** The neutral facts of one loss: what the export could not carry. */
export interface LossFacts {
    readonly code: string;
    readonly column: string | null;
    readonly count: number | null;
}

/** A loss's facts as the words need them: the column already named in words, or null. */
interface Said {
    /** The column in words, such as `the group size from Louvain`; null when unnamed or unknown. */
    readonly column: string | null;
    readonly count: number | null;
}

type Words = (said: Said) => string;

/**
 * A count and its noun, or the noun alone when the count is unknown.
 * @param n - the count.
 * @param noun - the singular noun.
 * @param some - the words for an unknown count.
 * @returns such as "254 edges".
 */
const counted = (n: number | null, noun: string, some: string): string => (n === null ? some : count(n, noun));

const LOOK: Words = () => "The drawing's colors, sizes and shapes will not come back when this file is opened again.";
const DIRECTION: Words = () =>
    "The file does not say whether edges point one way, so when it is opened again every edge may read as one-way.";
const ONE_WAY: Words = () => "This format has one-way edges only, so every edge is written as one-way.";
const PRECISION: Words = () => "Some numbers are stored with less precision and may come back slightly rounded.";
const NUMBER_IDS: Words = () => "Node ids that are numbers come back as text.";
const ELSEWHERE: Words = ({ column }) =>
    `This format stores ${column ?? "one column"} inside another field, so it comes back mixed with other values, not as a column of its own.`;
const RENAMED: Words = ({ column }) =>
    `When this file is opened again, ${column ?? "one column"} comes back under a different name.`;

/** One sentence per code. A code with no entry gets {@link generic}. */
const WORDS: Readonly<Record<string, Words>> = {
    // Shared by every format.
    W_VIZ_DROPPED: LOOK,
    W_POSITIONS_DROPPED: () => "Where each node sits in the drawing will not come back when this file is opened again.",
    W_POSITION_Z_DROPPED: () => "This format keeps flat positions only, so the depth of a 3D drawing is lost.",
    W_GRAPH_ATTRIBUTES_DROPPED: ({ count: n }) =>
        `${upper(counted(n, "value", "Values"))} about the graph as a whole, not about one node or edge, ${n === 1 ? "is" : "are"} left out.`,
    W_COLUMN_DROPPED: ({ column }) => `This format has no place for ${column ?? "one column"}.`,
    W_LIST_UNSUPPORTED: ({ column }) =>
        `This format cannot keep lists, so ${column ?? "one column"} will not come back as a list.`,
    W_COMPONENTS_FLATTENED: () =>
        "Values made of several numbers, such as positions and colors, are written as plain lists.",
    W_DTYPE_UNSUPPORTED: PRECISION,
    W_INTEGRAL_F64_AS_I32: () => "Numbers such as 2.0 come back as whole numbers, such as 2.",
    W_PRECISION: PRECISION,
    W_EDGE_IDS_GENERATED: () => "Edges have no ids in this graph, so the file gives each one a made-up id.",
    W_EDGE_IDS_DROPPED: () => "Edge ids are left out.",
    W_WEIGHTS_DROPPED: () => "Edge weights are left out.",
    W_MULTI_EDGES: () => "This format holds one edge between two nodes, so repeated edges will not come back.",
    W_SELF_LOOPS: () => "Edges from a node to itself will not come back.",
    W_MIXED_DIRECTION: () => "Some edges point one way and some do not; this file writes them all the same way.",
    W_HIERARCHY_DROPPED: () => "Nodes placed inside other nodes are written side by side.",
    W_ID_MANGLED: ({ count: n }) =>
        `${upper(counted(n, "node id", "Node ids"))} this format cannot hold ${n === 1 ? "is" : "are"} renumbered; the originals are kept in the file.`,
    W_ID_RENUMBERED: () => "Nodes are numbered 1, 2, 3 and so on in this file, and their ids are kept as labels.",
    W_ID_TEXT_TYPE: NUMBER_IDS,
    W_NUMERIC_IDS_STRINGIFIED: NUMBER_IDS,
    W_DIRECTION_DROPPED: DIRECTION,
    W_ROLE_ASSUMED: ({ column }) =>
        `When this file is opened again, the node labels come from ${column ?? "one column"}.`,
    W_RELATION_ASSUMED: ({ count: n }) =>
        `${upper(counted(n, "edge", "Edges"))} with no kind of link ${n === 1 ? "is" : "are"} written as "is a" links.`,
    W_COLUMN_AS_PROPERTY_VALUE: ELSEWHERE,
    W_GRAPH_COLUMN_AS_METADATA: ELSEWHERE,
    W_OBOGRAPHS_EDGE_COLUMN_AS_META: ELSEWHERE,
    W_OBO_EDGE_COLUMN_AS_QUALIFIER: ELSEWHERE,
    W_ATTRIBUTE_RENAMED: RENAMED,
    W_COLUMN_NAME_CHANGED: RENAMED,
    W_COLUMN_RENAMED: RENAMED,
    // CSV.
    W_CSV_DIRECTION_DROPPED: DIRECTION,
    W_CSV_NODE_TABLE: ({ count: n }) =>
        `This table has no room for values about nodes: ${counted(n, "node column", "node columns")}, such as names and analysis results, ${n === 1 ? "is" : "are"} in the Nodes table. Export it too to keep them.`,
    W_CSV_NODE_ORDER: () => "Nodes may come back in a different order when this file is opened again.",
    W_CSV_EDGE_COLUMNS: () => "This table lists each node's neighbors only, so values about edges are left out.",
    W_CSV_ISOLATED_NODES: () => "Nodes with no edges are not in this table.",
    W_CSV_HEADERLESS: () => "Without a header row, some columns come back under other names or in the wrong place.",
    // One-way formats.
    W_NEO4J_UNDIRECTED_AS_DIRECTED: ONE_WAY,
    W_CX2_UNDIRECTED_AS_DIRECTED: ONE_WAY,
    W_CX_UNDIRECTED_AS_DIRECTED: ONE_WAY,
    W_OBO_UNDIRECTED_AS_DIRECTED: ONE_WAY,
    // Format details.
    W_GEXF_VIZ_DTYPE: PRECISION,
    W_PAJEK_LABEL_GAINED: () => "Each node's id is also written as its label.",
    W_XGMML_POSITION: () => "The depth of each position is stored apart and comes back as a column of its own.",
    // What a save refuses.
    E_ID_CHARSET: () => "This format numbers its nodes, and these node ids are not numbers.",
    E_GML_INVALID_KEY: ({ column }) => `This format cannot hold the name of ${column ?? "one column"}.`,
    // graphty-element's own.
    W_GRAPHTY_COLUMN_DROPPED: ({ column }) => `A reserved name keeps ${column ?? "one column"} out of the file.`,
    W_GRAPHTY_NOTES: ({ count: n }) =>
        `${upper(counted(n, "note", "Notes"))} ${n === 1 ? "is" : "are"} not saved as notes in this file.`,
    W_GRAPHTY_TRUNCATED: ({ count: n }) =>
        `${upper(counted(n, "long note", "Long notes"))} ${n === 1 ? "is" : "are"} cut short.`,
    W_GRAPHTY_CSV_NEUTRALIZED: ({ count: n }) =>
        `${upper(counted(n, "cell", "Cells"))} a spreadsheet would run as a formula ${n === 1 ? "starts" : "start"} with an apostrophe.`,
    W_WEIGHT_NOT_NUMERIC: ({ count: n }) =>
        `${upper(counted(n, "edge weight", "Edge weights"))} that ${n === 1 ? "is" : "are"} not a number ${n === 1 ? "is" : "are"} left out.`,
    W_RESULT_FIELD_DROPPED: ({ column }) => `The file could not hold ${column ?? "an analysis result"}.`,
};

/**
 * A sentence with its first letter upper case.
 * @param text - the sentence.
 * @returns it, capitalized.
 */
function upper(text: string): string {
    return text.charAt(0).toLocaleUpperCase() + text.slice(1);
}

/**
 * The words for a code the app has none for: what kind of loss it is and the column, if any.
 * @param code - the code; "E_" means the format cannot write it at all.
 * @param said - the column in words.
 * @returns the sentence.
 */
function generic(code: string, said: Said): string {
    if (code.startsWith("E_")) {
        return said.column === null
            ? "Part of this graph cannot be written in this format."
            : `This format cannot write ${said.column}.`;
    }
    return said.column === null
        ? "Part of this graph will not come back exactly as it is when this file is opened again."
        : `When this file is opened again, ${said.column} may not come back exactly as it is.`;
}

/**
 * A loss's column in words: a result field by its plain name and its run's name, an attribute
 * the graph arrived with by its name; the element's own columns (positions, colors) are unnamed.
 * @param session - the element's session.
 * @param column - the column the loss names.
 * @returns the words, or null.
 */
export function columnWords(session: GraphSession, column: string): string | null {
    for (const run of session.runs.list()) {
        const field = run.result?.fields.find((each) => each.path === column);
        if (field !== undefined) {
            return `the ${field.plainName.toLocaleLowerCase()} from ${runName(session, run)}`;
        }
    }
    const attribute = session.data.attributes().find((each) => each.name === column);
    return attribute === undefined ? null : `the "${attribute.plainName}" column`;
}

/**
 * The lines an export's losses read as, one per distinct sentence: two losses that say the
 * same thing in words (node colors and edge colors) are one line.
 * @param losses - the export's losses.
 * @param nameColumn - a column in words, or null to leave it unnamed.
 * @returns the lines, in the losses' order.
 */
export function lossLines(losses: readonly LossFacts[], nameColumn: (column: string) => string | null): string[] {
    const lines = losses.map((loss) => {
        const said = { column: loss.column === null ? null : nameColumn(loss.column), count: loss.count };
        const words = WORDS[loss.code] as Words | undefined;
        return words === undefined ? generic(loss.code, said) : words(said);
    });
    return [...new Set(lines)];
}
