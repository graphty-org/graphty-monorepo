import { labelTemplateLine, labelTemplateRow } from "@graphty/graphty-element/schema";
import type { GraphSession } from "@graphty/graphty-element/session";

import { type Line, sourceName } from "./row";

/**
 * A card's lines: the template's, or the one value a plain label reads, as one row.
 * @param line - the label line.
 * @returns the lines.
 */
export function cardLines(line: Line): readonly string[] {
    if (line.template !== undefined) {
        return line.template;
    }
    return line.binding === undefined ? [] : [labelTemplateLine({ text: "", path: line.binding.by })];
}

/**
 * What a card shows first, and how many rows follow: "name +2".
 * @param session - the element's session.
 * @param lines - the card's lines.
 * @returns the words.
 */
export function cardSummary(session: GraphSession, lines: readonly string[]): string {
    const first = lines.map(labelTemplateRow).find((row) => row !== null);
    const name = first === undefined ? (lines[0] ?? "Empty") : (sourceName(session, { by: first.path }) ?? first.path);
    return lines.length > 1 ? `${name} +${String(lines.length - 1)}` : name;
}
