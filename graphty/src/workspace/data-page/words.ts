/**
 * Every word the Data page shows. graphty-element hands over codes and values; the page writes
 * the sentences (tier1-design.md sections 2.10 and T5).
 */

import { FORMAT_DESCRIPTORS, formatDescriptor } from "@graphty/graphty-element/catalog";
import { isGraphtyError, type TooLargeDetails } from "@graphty/graphty-element/session";

import type { PageRole } from "./choices";

/** Role menu words, by role and by what a table's rows are (section 2.10, "Sample grid"). */
const ROLE_WORDS: Readonly<Record<PageRole, string>> = {
    key: "Key",
    label: "Name",
    source: "From -> node",
    target: "To -> node",
    weight: "Weight",
    time: "Time",
    edgeId: "Edge id",
    attribute: "Attribute",
};

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
 * A file's name without its extension: what a new graph is called until the reader renames it.
 * @param name - the file name.
 * @returns "les-miserables" for "les-miserables.gml".
 */
export function baseName(name: string): string {
    return name.replace(/\.[^.]*$/, "") || name;
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
