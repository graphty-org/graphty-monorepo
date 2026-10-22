/**
 * Every word the Data page shows. graphty-element hands over codes and values; the page writes
 * the sentences (tier1-design.md sections 2.10 and T5).
 */

import { FORMAT_DESCRIPTORS, formatDescriptor } from "@graphty/graphty-element/catalog";
import { isGraphtyError, type LoadedSource, type TooLargeDetails } from "@graphty/graphty-element/session";

import type { PageRole } from "./choices";

/** Role menu words, by role and by what a table's rows are (section 2.10, "Sample grid"). */
const ROLE_WORDS: Readonly<Record<PageRole, string>> = {
    key: "Key",
    label: "Name",
    // Plain words, not "From -> node": the arrow read as code notation (tier 2 dry run).
    source: "From",
    target: "To",
    weight: "Weight",
    // Not "Time": beside Weight, a column of minutes read it as its own role (tier 2 pilot, T20).
    time: "Date or time",
    edgeId: "Edge id",
    attribute: "Attribute",
};

/** Joins names: "a and b", "a, b, and c". */
const AND = new Intl.ListFormat("en-US", { type: "conjunction" });

/**
 * A role's menu words.
 * @param role - the role.
 * @returns the words.
 */
export function roleWords(role: PageRole): string {
    return ROLE_WORDS[role];
}

/**
 * A count with the reader's digit grouping.
 * @param value - the count.
 * @returns "3,000".
 */
export function count(value: number): string {
    return value.toLocaleString("en-US");
}

/**
 * A count and its noun, singular for one.
 * @param value - the count.
 * @param noun - the singular noun.
 * @returns "1 row", "32 rows".
 */
export function plural(value: number, noun: string): string {
    return `${count(value)} ${noun}${value === 1 ? "" : "s"}`;
}

/**
 * The sample grid's caption: whether it shows the whole table or only its first rows.
 * @param shown - the rows the preview holds.
 * @param total - the rows in the table.
 * @returns "All 17 rows", "1 row", "The first 50 rows of 3,000".
 */
export function previewCaption(shown: number, total: number): string {
    if (shown < total) {
        return `The first ${plural(shown, "row")} of ${count(total)}`;
    }
    return total === 1 ? "1 row" : `All ${plural(total, "row")}`;
}

/**
 * How many edge rows a load leaves out, for a table's warning mark.
 * @param rows - the count.
 * @returns "1 row left out".
 */
export function leftOutWords(rows: number): string {
    return `${plural(rows, "row")} left out`;
}

/** A graph's size, as `data.statistics()` or a load report counts it. */
interface Size {
    readonly nodes: number;
    readonly edges: number;
}

/**
 * What a replacing load changes (tier2-design.md section 7).
 * @param was - the graph now.
 * @param now - what the load would make.
 * @returns "Was 20 nodes, 60 edges; now 22, 74".
 */
export function replaceWords(was: Size, now: Size): string {
    return `Was ${plural(was.nodes, "node")}, ${plural(was.edges, "edge")}; now ${count(now.nodes)}, ${count(now.edges)}`;
}

/**
 * The page's summary line: what the load makes, in words that follow the Direction choice.
 * @param names - what the tables are called, without extensions.
 * @param nodes - the nodes the load makes.
 * @param edges - the edges it makes, or null when no table holds edges.
 * @param directed - the Direction choice.
 * @returns "people and messages: 12 nodes, 22 edges; each edge goes one way".
 */
export function modelWords(
    names: readonly string[],
    nodes: number,
    edges: number | null,
    directed: boolean | "auto",
): string {
    const made = edges === null ? plural(nodes, "node") : `${plural(nodes, "node")}, ${plural(edges, "edge")}`;
    return withDirection(`${AND.format(names)}: ${made}`, edges, directed);
}

/**
 * The Add page's summary line: the graph as it is and what the file adds, each under its own
 * name, so the combined total is never read as the new file's.
 * @param graph - the open project's name.
 * @param was - the graph now.
 * @param names - what the new tables are called, without extensions.
 * @param added - what the load adds.
 * @param edges - whether the load makes edges.
 * @param directed - the Direction choice.
 * @returns "friends: 20 nodes, 41 edges; friends-v2 adds 0 nodes, 41 edges".
 */
export function addWords(
    graph: string,
    was: Size,
    names: readonly string[],
    added: Size,
    edges: boolean,
    directed: boolean | "auto",
): string {
    const adds = edges ? `${plural(added.nodes, "node")}, ${plural(added.edges, "edge")}` : plural(added.nodes, "node");
    const text = `${graph}: ${plural(was.nodes, "node")}, ${plural(was.edges, "edge")}; ${AND.format(names)} adds ${adds}`;
    return withDirection(text, edges ? added.edges : null, directed);
}

/**
 * A summary line with the Direction choice after it, when there are edges for it to be about.
 * @param text - the line.
 * @param edges - the edges it speaks of, or null for none.
 * @param directed - the Direction choice.
 * @returns the line, with "; each edge goes one way" or "both ways" when the choice is made.
 */
function withDirection(text: string, edges: number | null, directed: boolean | "auto"): string {
    if (edges === null || edges === 0 || directed === "auto") {
        return text;
    }
    return `${text}; each edge goes ${directed ? "one way" : "both ways"}`;
}

/**
 * The Add page's line when the file's edges repeat edges the graph already holds (same two ends,
 * same direction), so a newer copy of a loaded file is not added on top of it unnoticed.
 * @param repeats - how many of the file's edges repeat one (`LoadReport.repeated.seen`).
 * @param graph - the open project's name.
 * @returns "41 edges in this file are already in friends. Load adds them a second time."
 */
export function repeatsWords(repeats: number, graph: string): string {
    const one = repeats === 1;
    return `${plural(repeats, "edge")} in this file ${one ? "is" : "are"} already in ${graph}. Load adds ${one ? "it" : "them"} a second time.`;
}

/**
 * The status line after a load: the graph's name as the header shows it, its size, and the
 * edge rows the load left out.
 * @param name - the project's name.
 * @param now - the graph after the load.
 * @param leftOut - the edge rows the load left out (`LoadedSource.leftOut.rows`), or 0.
 * @returns "people and messages: 12 nodes, 22 edges, 1 row left out".
 */
export function loadedWords(name: string, now: Size, leftOut: number): string {
    const size = `${name}: ${plural(now.nodes, "node")}, ${plural(now.edges, "edge")}`;
    return leftOut === 0 ? size : `${size}, ${leftOutWords(leftOut)}`;
}

/**
 * The status line after a replacing load.
 * @param name - the source that was replaced.
 * @param now - the graph after the load.
 * @param outOfDate - how many runs went out of date.
 * @returns "friends.csv replaced: 22 nodes, 74 edges. 3 runs out of date".
 */
export function replacedWords(name: string, now: Size, outOfDate: number): string {
    const size = `${name} replaced: ${plural(now.nodes, "node")}, ${plural(now.edges, "edge")}.`;
    return outOfDate === 0 ? size : `${size} ${plural(outOfDate, "run")} out of date`;
}

/**
 * A file's name without its extension: what a new graph is called until the reader renames it.
 * @param name - the file name.
 * @returns "les-miserables" for "les-miserables.gml".
 */
export function baseName(name: string): string {
    return name.replace(/\.[^.]*$/, "") || name;
}

/**
 * What a new graph is called: every file its loads read, without extensions.
 * @param sources - `data.sources()`.
 * @returns "players and passes" for a load of players.csv and passes.csv; undefined when no load names a file.
 */
export function graphName(sources: readonly LoadedSource[]): string | undefined {
    const files = sources
        .flatMap((load): readonly (string | undefined)[] => (load.tables.length > 0 ? load.tables : [load.name]))
        .filter((file): file is string => file !== undefined);
    return files.length === 0 ? undefined : AND.format(files.map(baseName));
}

/** One problem block (section 4, "Problem"): what happened and what to do. */
export interface Refusal {
    /** What happened. */
    readonly what: string;
    /** What to do. */
    readonly todo: string;
    /** Whether a setting on the page can fix it; when not, Choose another file... is the primary action. */
    readonly fixable: boolean;
}

/**
 * The details a GraphtyError carries, or an empty record.
 * @param error - the error.
 * @returns its details.
 */
function detailsOf(error: unknown): Readonly<Record<string, unknown>> {
    return isGraphtyError(error) ? (error.details ?? {}) : {};
}

/**
 * A list of names from a detail value, or an empty list.
 * @param value - the detail.
 * @returns the names.
 */
function names(value: unknown): string[] {
    return Array.isArray(value) ? value.filter((each): each is string => typeof each === "string") : [];
}

/**
 * The refusal for a typed element error on a source (section 2.10, "Refusals").
 * @param error - what `prepare`, `report` or `load` rejected with.
 * @param source - what the reader calls the source: the file name or the URL.
 * @returns the problem block's words.
 */
export function refusalFor(error: unknown, source: string): Refusal {
    const code = isGraphtyError(error) ? error.code : undefined;
    const details = detailsOf(error);
    switch (code) {
        case "E_EMPTY_LOAD":
            return {
                what: `${source} holds no nodes or edges.`,
                todo: "Choose a file with data in it.",
                fixable: false,
            };
        case "E_UNKNOWN_FORMAT":
            return {
                what: `graphty could not tell what kind of file ${source} is.`,
                todo: "Pick its format in File settings, or choose another file.",
                fixable: true,
            };
        case "E_PARSE_FAILED":
            // Not at first release: the element reports neither the row nor a fix yet (#803).
            return {
                what: `${source} could not be read as ${typeof details.format === "string" ? formatName(details.format) : "the format it was read as"}.`,
                todo: "Check the file, or pick another format in File settings.",
                fixable: true,
            };
        case "E_FETCH_FAILED":
            return {
                what: `${source} could not be fetched.`,
                todo: "Check the address and your connection, then try again.",
                fixable: false,
            };
        case "E_EDGE_ENDPOINTS_UNRESOLVED":
            return {
                what: `No columns say which nodes each edge links. The file has: ${names(details.columns).join(", ")}.`,
                todo: "Set From and To on the two linking columns.",
                fixable: true,
            };
        case "E_ID_MISSING":
            return {
                what: `Some rows of ${source} have no id.`,
                todo: "Choose another Key column, or fix the file.",
                fixable: true,
            };
        case "E_DUPLICATE_ID":
            return {
                what:
                    typeof details.id === "string"
                        ? `${source} holds the id ${details.id} more than once.`
                        : `${source} holds the same id more than once.`,
                todo: "Choose another Key column, or fix the file.",
                fixable: true,
            };
        case "E_UNKNOWN_ATTRIBUTE": {
            const candidates = names(details.candidates);
            return {
                what: "A role names a column this file does not have.",
                todo: candidates.length > 0 ? `Did you mean ${candidates.join(" or ")}?` : "Choose the column again.",
                fixable: true,
            };
        }
        case "E_BAD_COMMAND":
            return {
                what: "These roles cannot be loaded together.",
                todo: "An edge needs exactly one From and one To column; a load takes one node table and one edge table.",
                fixable: true,
            };
        case "E_TOO_LARGE":
            // Temporary: GraphtyError details are untyped, so this code's details cannot be read
            // as the element's TooLargeDetails without a cast (#868). Delete the cast with #868.
            return tooLargeRefusal(details as unknown as TooLargeDetails);
        default:
            return {
                what: `${source} could not be read.`,
                todo: "Choose another file.",
                fixable: false,
            };
    }
}

/**
 * The refusal for a load past the element's limit (section 2.10, "too large to draw").
 * @param details - the report's `tooLarge`.
 * @returns the problem block's words.
 */
export function tooLargeRefusal(details: TooLargeDetails): Refusal {
    const noun = details.of === "edges" ? "edge" : "node";
    return {
        what: `This load would make ${plural(details.count, noun)}; graphty draws at most ${count(details.limit)}.`,
        todo: "Leave out unmatched rows if there are any, or choose a smaller file.",
        fixable: false,
    };
}

/**
 * A format's name, from graphty-element's format catalog.
 * @param type - the draft's `type`.
 * @returns "CSV", "GraphML", ...
 */
export function formatName(type: string): string {
    return formatDescriptor(type)?.plainName ?? type;
}

/** The formats File settings offers: every format graphty-element reads. */
export const READABLE_FORMATS = FORMAT_DESCRIPTORS.filter((format) => format.canImport).map((format) => ({
    value: format.id,
    label: format.plainName,
}));

/** The CSV separators File settings offers; "" is auto. */
export const SEPARATORS = [
    { value: "", label: "Auto" },
    { value: ",", label: "Comma" },
    { value: "\t", label: "Tab" },
    { value: ";", label: "Semicolon" },
    { value: "|", label: "Pipe" },
] as const;

/** What each answer to an edge naming no node does, shown as its tooltip. */
export const UNMATCHED_HINTS = {
    add: "Make a node for each missing name",
    "leave-out": "Skip the rows whose end names no node",
} as const;
