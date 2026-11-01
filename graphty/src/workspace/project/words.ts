/** The words Recent projects shows for an entry, and why a load did not open. */

import { type CodedFactParam, isGraphtyError } from "@graphty/graphty-element/session";

import { codeWords } from "../server/words";
import { formatCount } from "../settings/numberFormat";
import { modelWords } from "../style/words";

const THIS_YEAR = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
});
const OTHER_YEAR = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
});

/**
 * A project's size as the element last reported it.
 * @param nodes - its node count, or null.
 * @returns "77 nodes", or an empty string.
 */
export function sizeWords(nodes: number | null): string {
    if (nodes === null) {
        return "";
    }
    return `${formatCount(nodes)} ${nodes === 1 ? "node" : "nodes"}`;
}

const DAY_MS = 24 * 3600 * 1000;
const MONTH_DAY = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
const MONTH_DAY_YEAR = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" });

/**
 * When a project was last saved or opened, as a reader says it: "2 hours ago", "Yesterday",
 * "Oct 9", or with the year when it is not this year's.
 * @param at - ms since the epoch.
 * @param now - the time to count from.
 * @returns the words.
 */
export function agoWords(at: number, now: number = Date.now()): string {
    const minutes = Math.floor((now - at) / 60_000);
    if (minutes < 1) {
        return "Just now";
    }
    if (minutes < 60) {
        return `${String(minutes)} ${minutes === 1 ? "minute" : "minutes"} ago`;
    }
    const then = new Date(at);
    const today = new Date(now);
    const midnight = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    if (at >= midnight) {
        const hours = Math.floor(minutes / 60);
        return `${String(hours)} ${hours === 1 ? "hour" : "hours"} ago`;
    }
    if (at >= midnight - DAY_MS) {
        return "Yesterday";
    }
    return then.getFullYear() === today.getFullYear() ? MONTH_DAY.format(then) : MONTH_DAY_YEAR.format(then);
}

/**
 * When a project was last saved or opened, as a note's time is written ("Oct 9, 5:58 AM"), with
 * the year only when it is not this year. It never breaks across lines: a Recent row that wraps
 * moves the whole date down rather than leave "AM" alone on a line.
 * @param at - ms since the epoch.
 * @param now - the time to compare the year with.
 * @returns the date and time, its spaces non-breaking.
 */
export function whenWords(at: number, now = Date.now()): string {
    const sameYear = new Date(at).getFullYear() === new Date(now).getFullYear();
    return (sameYear ? THIS_YEAR : OTHER_YEAR).format(at).replaceAll(/\s/g, "\u00a0");
}

/** A GraphtyError's details. */
type Details = Readonly<Record<string, unknown>>;

/**
 * A detail that is a non-empty string.
 * @param value - the detail.
 * @returns the string, or undefined.
 */
function text(value: unknown): string | undefined {
    return typeof value === "string" && value !== "" ? value : undefined;
}

/**
 * A detail that is a finite number.
 * @param value - the detail.
 * @returns the number, or undefined.
 */
function num(value: unknown): number | undefined {
    return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

/**
 * A load past the element's limit, its counts in the reader's Number format.
 * @param details - the error's details (`TooLargeDetails` for a load).
 * @returns "it would make 2,000,000 nodes; graphty draws at most 1,000,000".
 */
function tooLarge(details: Details): string {
    const count = num(details.count);
    const limit = num(details.limit);
    if (count === undefined || limit === undefined) {
        return "it is too large";
    }
    const of = details.of === "edges" ? "edges" : "nodes";
    return `it would make ${formatCount(count)} ${of}; graphty draws at most ${formatCount(limit)}`;
}

/** Why a load did not open, by the element's code (graph-io's arrive as these): a clause after "could not be opened: ". */
const LOAD_REASONS: Readonly<Record<string, (details: Details) => string>> = {
    E_UNKNOWN_FORMAT: () => "graphty cannot tell what kind of file it is",
    E_BAD_DOCUMENT: () => "it is not a graphty project file",
    E_UNSUPPORTED_VERSION: () => "it was saved by a newer graphty; update graphty to open it",
    E_UNSUPPORTED: () => "it needs a part this graphty cannot read yet",
    E_PROJECT_FILE_AS_DATA: () => "it is a graphty project; open it with Open",
    E_TOO_LARGE: tooLarge,
    E_OUT_OF_MEMORY: () => "this browser ran out of memory reading it",
    E_FETCH_FAILED: (details) => {
        const status = num(details.status);
        return status === undefined
            ? "the download failed; check your connection and try again"
            : `the download failed (HTTP ${String(status)})`;
    },
    E_EMPTY_LOAD: () => "it holds no nodes or edges",
    E_EDGE_ENDPOINTS_UNRESOLVED: () => "no columns say which nodes each edge links",
    E_ID_MISSING: () => "some rows have no id",
    E_DUPLICATE_ID: (details) => {
        const id = text(details.id);
        return id === undefined ? "it holds the same id more than once" : `it holds the id ${id} more than once`;
    },
    E_DUPLICATE_EDGE: () => "it holds the same edge more than once",
    E_UNKNOWN_DATASET: () => "graphty has no dataset by that name",
    E_UNKNOWN_GENERATOR: () => "graphty has no generator by that name",
    E_OPTION_RANGE: (details) => {
        const option = text(details.option);
        return option === undefined ? "a setting is out of range" : `${option} is out of range`;
    },
    E_MISSING_PACKAGE: (details) => {
        const name = text(details.package);
        return name === undefined ? "it needs a package graphty does not have" : `it needs the ${name} package`;
    },
    E_AUTOSAVE_ENTRY_TAKEN: () => "another tab has this work open",
    E_AUTOSAVE_UNKNOWN_ENTRY: () => "this browser no longer keeps that work",
    E_SUPERSEDED: () => "another load took its place",
    E_DISPOSED: () => "the project closed before it finished",
};

/**
 * Why a file or graph did not open or add, in the app's words, from the element's code and
 * details; never the element's message, which is for people debugging (#5362). graphty-element
 * refuses a file it could not read whole with `E_PARSE_FAILED` and the line it broke at; nothing
 * of it is kept.
 * @param name - what the reader calls it.
 * @param error - what the element threw.
 * @param verb - "opened" or "added".
 * @returns the notice's sentence.
 */
export function notReadWords(name: string, error: unknown, verb: "opened" | "added"): string {
    if (!isGraphtyError(error)) {
        return `${name} could not be ${verb}.`;
    }
    const { code, details } = error;
    if (code === "E_PARSE_FAILED") {
        const line = num(details.line);
        const where = line === undefined ? "" : ` near line ${formatCount(line)}`;
        return `${name} could not be ${verb}: the file is incomplete or damaged${where}, so nothing was read. Ask for the file again.`;
    }
    const params = details as Readonly<Record<string, CodedFactParam>>;
    if (code.startsWith("E_MODEL_")) {
        return `${name} could not be ${verb}. ${modelWords({ code, params })}`;
    }
    if (code.startsWith("E_SOURCE_")) {
        return `${name} could not be ${verb}: ${codeWords({ code, params })}.`;
    }
    const reason = LOAD_REASONS[code];
    return reason === undefined
        ? `${name} could not be ${verb} (${code}).`
        : `${name} could not be ${verb}: ${reason(details)}.`;
}
