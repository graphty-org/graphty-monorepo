/**
 * The length units and tool names that file positions (and, after their rebase, file styles)
 * share. Loads in Node and imports nothing.
 */

/**
 * The unit a file's lengths are in. "px": screen pixels or typographic points (1 pt counts as
 * 1 px). "file": the file's own unit, with no known screen size (Pajek's unit square, NetworkX
 * coordinates, Graphviz input inches).
 * @category Positions
 */
export type LengthUnit = "px" | "file";

/**
 * The tool that wrote a file, when the file says. An open union: a tool graph-io does not know is
 * kept as its lowercase name.
 * @category Positions
 */
export type GraphTool = "yed" | "cytoscape" | "gephi" | "graphviz" | "pajek" | "networkx" | "tulip" | (string & {});

/** Creator texts that name a known tool, first match wins. */
const TOOLS: readonly (readonly [RegExp, GraphTool])[] = [
    [/yfiles|yed/i, "yed"],
    [/cytoscape/i, "cytoscape"],
    [/gephi/i, "gephi"],
    [/graphviz/i, "graphviz"],
    [/pajek/i, "pajek"],
    [/networkx/i, "networkx"],
    [/tulip/i, "tulip"],
];

/**
 * The tool a file's creator text names ("yFiles", "Gephi 0.7", "NetworkX 3.1"), or null.
 * @param creator - the creator text (`snapshot.meta.creator`)
 * @returns the tool, or null when the text names none graph-io knows
 */
export function toolOf(creator: string | null | undefined): GraphTool | null {
    if (creator === null || creator === undefined) {
        return null;
    }
    return TOOLS.find(([pattern]) => pattern.test(creator))?.[1] ?? null;
}
