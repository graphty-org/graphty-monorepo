/**
 * @file Text built from several values: the `{ template: [...] }` binding of a text channel.
 *
 * A template is one string per line. `{path}` reads a value with the same path dialect as a
 * `by` binding; `{path|count}` is how many distinct values that path holds over the layer's
 * elements; `{path|rank}` is this element's value's 1-based place among them, sorted. A line with
 * any value missing is left out, which is how a row about a result disappears before the result
 * exists. Every substituted value is escaped, so data can never inject label markup. The consumer
 * writes every word; nothing here adds one.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import type { Channel, Path } from "../../catalog/types";
import { GraphtyError } from "../../errors";
import { escapeLabelMarkup } from "../../utils/labelMarkup";
import { compareGroupKeys } from "../results/types";

/** The channels a template may write: the ones whose words are drawn as label markup. */
export const TEMPLATE_CHANNELS: readonly Channel[] = Object.freeze(["node.label", "edge.label", "node.tooltip"]);

/** What a placeholder asks of its path. */
type Placeholder = { readonly path: Path; readonly op: "value" | "count" | "rank" };

/** One parsed line: literal text and placeholders, in order. */
type Line = readonly (string | Placeholder)[];

/** A template with its placeholders found, and every path it reads. */
export interface ParsedTemplate {
    readonly lines: readonly Line[];
    /** Every path any placeholder reads, without repeats. */
    readonly paths: readonly Path[];
}

/** A placeholder: `{path}` or `{path|op}`. */
const PLACEHOLDER = /\{([^{}|]*)(?:\|([^{}]*))?\}/g;

/**
 * The refusal a malformed template gets.
 * @param message - What is wrong.
 * @param details - The offending values.
 * @returns The error to throw.
 */
function badTemplate(message: string, details: Readonly<Record<string, unknown>>): GraphtyError {
    return new GraphtyError({ code: "E_BAD_LAYER", message, source: "style", details });
}

/**
 * Find a template's placeholders.
 * @param template - The lines, as authored.
 * @returns The parsed template.
 * @throws A `GraphtyError` with code `E_BAD_LAYER` when the template is not a list of strings, a
 *   placeholder names no path, or it asks for something other than `count` or `rank`.
 */
export function parseTemplate(template: unknown): ParsedTemplate {
    if (!Array.isArray(template) || !template.every((line) => typeof line === "string")) {
        throw badTemplate('A template is a list of lines, such as ["<bold>{data.name}</bold>"].', { template });
    }

    const paths = new Set<Path>();
    const lines = template.map((text): Line => {
        const parts: (string | Placeholder)[] = [];
        let from = 0;

        for (const match of text.matchAll(PLACEHOLDER)) {
            const path = match[1].trim();
            const op = match[2]?.trim() ?? "value";

            if (path === "" || (op !== "value" && op !== "count" && op !== "rank")) {
                throw badTemplate(`"${match[0]}" is not a placeholder: write {path}, {path|count} or {path|rank}.`, {
                    line: text,
                    placeholder: match[0],
                });
            }

            parts.push(text.slice(from, match.index), { path, op });
            paths.add(path);
            from = match.index + match[0].length;
        }

        parts.push(text.slice(from));

        return parts.filter((part) => part !== "");
    });

    return { lines, paths: [...paths] };
}

/**
 * Whether a value counts as missing.
 * @param value - The value.
 * @returns True for undefined and null.
 */
function isMissing(value: unknown): value is null | undefined {
    return value === undefined || value === null;
}

/**
 * A value as the words a label shows: a list or a record as JSON, anything else as itself.
 * @param value - A value that is present.
 * @returns The text.
 */
function textOf(value: unknown): string {
    switch (typeof value) {
        case "string":
            return value;
        case "number":
        case "boolean":
        case "bigint":
            return String(value);
        default:
            return JSON.stringify(value) ?? "";
    }
}

/**
 * The distinct values of one column, sorted, so a rank is an index and a count a length.
 * @param column - The values.
 * @returns The sorted keys, and each key's 1-based place.
 */
function rankTable(column: Iterable<unknown>): { readonly count: number; readonly rank: Map<string, number> } {
    const distinct = new Set<string>();

    for (const value of column) {
        if (!isMissing(value)) {
            distinct.add(textOf(value));
        }
    }

    const sorted = [...distinct].sort(compareGroupKeys);

    return { count: sorted.length, rank: new Map(sorted.map((key, at) => [key, at + 1])) };
}

/**
 * Settle everything a template can know before it sees an element.
 * @param parsed - The parsed template.
 * @param columnOf - Every value one path holds over the layer's elements, for count and rank.
 * @returns The text for one element, read through `read`, or undefined when every line dropped.
 */
export function prepareTemplate(
    parsed: ParsedTemplate,
    columnOf: (path: Path) => Iterable<unknown>,
): (read: (path: Path) => unknown) => string | undefined {
    const tables = new Map<Path, ReturnType<typeof rankTable>>();
    for (const line of parsed.lines) {
        for (const part of line) {
            if (typeof part !== "string" && part.op !== "value" && !tables.has(part.path)) {
                tables.set(part.path, rankTable(columnOf(part.path)));
            }
        }
    }

    /**
     * One placeholder's text for one element.
     * @param part - The placeholder.
     * @param read - Reads the element's value at a path.
     * @returns The escaped text, or undefined when the value is missing.
     */
    const fill = (part: Placeholder, read: (path: Path) => unknown): string | undefined => {
        const value = read(part.path);
        if (isMissing(value)) {
            return undefined;
        }

        const table = tables.get(part.path);
        if (part.op === "count") {
            return String(table?.count);
        }

        if (part.op === "rank") {
            const rank = table?.rank.get(textOf(value));
            return rank === undefined ? undefined : String(rank);
        }

        return escapeLabelMarkup(textOf(value));
    };

    // A line with a placeholder that has nothing to fill it is left out whole.
    const fillLine = (line: (typeof parsed.lines)[number], read: (path: Path) => unknown): string | undefined => {
        let text = "";
        for (const part of line) {
            const filled = typeof part === "string" ? part : fill(part, read);
            if (filled === undefined) {
                return undefined;
            }

            text += filled;
        }

        return text;
    };

    return (read) => {
        const out: string[] = [];

        for (const line of parsed.lines) {
            const text = fillLine(line, read);
            if (text !== undefined) {
                out.push(text);
            }
        }

        return out.length === 0 ? undefined : out.join("\n");
    };
}

/**
 * One template line that reads one value: the words before it, and whether the line is bold.
 * `{ text: "Connections: ", path: "results.degree.value" }` is the line
 * `"Connections: {results.degree.value}"`; with `bold: true` it is wrapped in `<bold>`.
 */
export interface LabelTemplateRow {
    /** The words before the value, drawn as written (no markup). */
    readonly text: string;
    /** The path the value is read from, in the dialect of a `by` binding. */
    readonly path: Path;
    /** Whether the whole line is bold. @default false */
    readonly bold?: boolean;
}

/** A row line: optional `<bold>`, literal words (no markup but `<lt>`), one `{path}`, optional `</bold>`. */
const ROW_LINE = /^(<bold>)?((?:[^<{}]|<lt>)*)\{([^{}|]+)\}(<\/bold>)?$/;

/**
 * Read one template line as a row, when it is one: words, then one plain `{path}`, the whole
 * line bold or not. Any other line -- two values, `|count` or `|rank`, words after the value,
 * other markup -- is not a row and answers null, so an editor shows it as written.
 * @param line - One line of a `{ template }` binding.
 * @returns The row, or null when the line is not one.
 */
export function labelTemplateRow(line: string): LabelTemplateRow | null {
    const match = ROW_LINE.exec(line);
    const path = match?.[3].trim() ?? "";
    if (match === null || path === "" || (match[1] === undefined) !== (match[4] === undefined)) {
        return null;
    }

    return { text: match[2].replaceAll("<lt>", "<"), path, bold: match[1] !== undefined };
}

/**
 * Write a row as one template line; `labelTemplateRow` reads it back as the same row.
 * @param row - The row.
 * @returns The line.
 * @throws A `GraphtyError` with code `E_BAD_LAYER` when the words hold `{` or `}` (a template
 *   would read them as a placeholder) or the path is empty or holds `{`, `}` or `|`.
 */
export function labelTemplateLine(row: LabelTemplateRow): string {
    const path = row.path.trim();
    if (/[{}]/.test(row.text)) {
        throw badTemplate("A row's words cannot hold { or }.", { text: row.text });
    }

    if (path === "" || /[{}|]/.test(path)) {
        throw badTemplate("A row reads one path, such as data.name.", { path: row.path });
    }

    const line = `${escapeLabelMarkup(row.text)}{${path}}`;

    return row.bold === true ? `<bold>${line}</bold>` : line;
}
