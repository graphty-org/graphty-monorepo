export type CSVVariant = "neo4j" | "gephi" | "cytoscape" | "adjacency-list" | "edge-list" | "node-list" | "generic";

export interface CSVVariantInfo {
    variant: CSVVariant;
    hasHeaders: boolean;
    delimiter: string;
    sourceColumn?: string;
    targetColumn?: string;
    idColumn?: string;
    labelColumn?: string;
    typeColumn?: string;
    interactionColumn?: string;
}

/**
 * The endpoint column pairs an edge list may be spelled with, in the order they are tried.
 *
 * The same three pairs, in the same order, that the element's own endpoint resolution uses, so a
 * CSV and a JSON file spelled the same way are read the same way.
 */
const ENDPOINT_PAIRS: readonly (readonly [string, string])[] = [
    ["source", "target"],
    ["src", "dst"],
    ["from", "to"],
];

/** The column separators a delimited file is sniffed for, a comma first so it wins a tie. */
const DELIMITERS = [",", "\t", ";", "|"] as const;

/**
 * Work out a delimited file's column separator from its first line.
 *
 * Papaparse's own guess is not used because it guesses from the rows it previews, and the one-row
 * preview that reads the header row sees too little to tell a tab from a comma: it answers "," and
 * the header `source<TAB>target` comes back as one column.
 * @param content - The file, or at least its first line.
 * @returns Whichever of comma, tab, semicolon and pipe appears most often outside quotes on the
 * first line, or a comma when none does.
 */
export function sniffDelimiter(content: string): string {
    const counts = new Map<string, number>();
    let quoted = false;
    for (const char of content) {
        if (char === '"') {
            quoted = !quoted;
        } else if (!quoted && (char === "\n" || char === "\r")) {
            break;
        } else if (!quoted && (DELIMITERS as readonly string[]).includes(char)) {
            counts.set(char, (counts.get(char) ?? 0) + 1);
        }
    }

    return DELIMITERS.reduce((best, candidate) =>
        (counts.get(candidate) ?? 0) > (counts.get(best) ?? 0) ? candidate : best,
    );
}

/**
 * Detect CSV variant from headers and sample data
 * @param headers - Array of column header names
 * @returns Information about the detected CSV variant including column mappings
 */
export function detectCSVVariant(headers: string[]): CSVVariantInfo {
    // Check Neo4j format: :ID, :LABEL, :TYPE, :START_ID, :END_ID
    if (headers.some((h) => /:(ID|LABEL|TYPE|START_ID|END_ID)/.test(h))) {
        return {
            variant: "neo4j",
            hasHeaders: true,
            delimiter: ",",
            sourceColumn: ":START_ID",
            targetColumn: ":END_ID",
            idColumn: headers.find((h) => h.endsWith(":ID")),
            labelColumn: ":LABEL",
            typeColumn: ":TYPE",
        };
    }

    // Check Gephi format: Source, Target, Type (case-sensitive)
    if (headers.includes("Source") && headers.includes("Target")) {
        return {
            variant: "gephi",
            hasHeaders: true,
            delimiter: ",",
            sourceColumn: "Source",
            targetColumn: "Target",
            typeColumn: "Type",
            labelColumn: "Label",
        };
    }

    // Check Cytoscape format: interaction column
    if (headers.includes("interaction")) {
        return {
            variant: "cytoscape",
            hasHeaders: true,
            delimiter: ",",
            sourceColumn: "source",
            targetColumn: "target",
            interactionColumn: "interaction",
        };
    }

    // Standard edge list, in the three spellings the element accepts for an endpoint pair, tried
    // in the same order it tries them: source/target, then src/dst, then from/to. Both halves of
    // a pair must be present, so a file with a `source` column and no `target` is not an edge
    // list on the strength of one of them.
    const endpointPair = ENDPOINT_PAIRS.find(([source, target]) => headers.includes(source) && headers.includes(target));
    if (endpointPair) {
        return {
            variant: "edge-list",
            hasHeaders: true,
            delimiter: ",",
            sourceColumn: endpointPair[0],
            targetColumn: endpointPair[1],
        };
    }

    // Node list
    if (headers.includes("id") || headers.includes("Id")) {
        return {
            variant: "node-list",
            hasHeaders: true,
            delimiter: ",",
            idColumn: headers.includes("id") ? "id" : "Id",
        };
    }

    // Everything else is a generic CSV with a header row, and its first line is a header row.
    //
    // An ADJACENCY LIST is never detected, only asked for: `{variant: "adjacency-list"}` or the
    // `adjacency-list` format name. Nothing in a header row distinguishes "node, neighbour,
    // neighbour" from an edge list whose columns happen to be spelled something else, so this
    // used to guess adjacency list for every file it did not otherwise recognise -- which ate the
    // header row of every such file as data, made the `node-list` and `generic` branches below it
    // unreachable, and turned a two-column file spelled `a,b` into a graph the element could
    // never report an endpoint failure for. A file whose columns nothing recognises now reaches
    // the element as records, and the element names the columns it could not read.
    return {
        variant: "generic",
        hasHeaders: true,
        delimiter: ",",
    };
}
