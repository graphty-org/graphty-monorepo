/**
 * The words a label row shows for its source in Style panel v2: where the words come from, and, when two labels
 * of one row read the same source, where each sits ("name, below"; ledger E265).
 */

import { MAIN_LABEL_ID } from "@graphty/graphty-element/catalog";
import type { LabelStyle } from "@graphty/graphty-element/schema";

import { cardSummary } from "../cardLines";
import type { RowContext } from "../PropertyRow";
import { type Line, lineIn, sourceName } from "../row";
import { positionWord } from "../words";
import { beneathEntry, entryIds, entryOf, entryWords } from "./labelEntries";
import { TEXT_THINGS, type TextThing } from "./labelRubric";

/**
 * A layer's label style as written, or an empty one.
 * @param line - the line that writes the style channel, if any.
 * @returns the style.
 */
export function styleOf(line: Line | undefined): Readonly<LabelStyle> {
    const value = line?.value;
    return typeof value === "object" && !Array.isArray(value) && !("r" in value) ? (value as LabelStyle) : {};
}

/**
 * Where the words come from, as the source field shows it: the value they read, a card's summary,
 * the typed words, or nothing.
 * @param ctx - the row.
 * @param words - the words line.
 * @returns the words.
 */
export function sourceText(ctx: RowContext, words: Line | undefined): string {
    if (words === undefined) {
        return "";
    }
    if (words.template !== undefined) {
        return cardSummary(ctx.session, words.template);
    }
    if (words.binding !== undefined) {
        return sourceName(ctx.session, words.binding) ?? words.binding.by;
    }
    return typeof words.value === "string" ? words.value : "";
}

/**
 * Where a label sits, in words, when another label of the row reads the same source ("above"), else nothing: two
 * labels of one source are told apart by place (ledger E265).
 * @param ctx - the row.
 * @param kind - the text thing.
 * @param entry - the further label's id, or undefined for the main label.
 * @returns the words, or "".
 */
export function sharedWhere(ctx: RowContext, kind: TextThing, entry: string | undefined): string {
    if (kind.words !== `${ctx.side}.label`) {
        return "";
    }
    const main = lineIn(ctx, kind.words);
    const mainStyle = styleOf(lineIn(ctx, kind.style));
    // A further label with no words of its own draws the main label's.
    const sourceOf = (id: string | undefined): string =>
        sourceText(ctx, id === undefined ? main : (entryWords(ctx, id) ?? main));
    const placeOf = (id: string | undefined): LabelStyle["location"] =>
        (id === undefined
            ? undefined
            : (entryOf(ctx, id)?.style?.location ?? beneathEntry(ctx, id)?.style?.location)) ?? mainStyle.location;
    const rows = [...(main === undefined ? [] : [undefined]), ...entryIds(ctx)];
    const mine = sourceOf(entry);
    const twins = rows.filter((id) => id !== entry && sourceOf(id) === mine);
    return mine === "" || twins.length === 0 ? "" : positionWord(placeOf(entry)).toLowerCase();
}

/**
 * What a label draws, in the words its row shows: its source, and its place when another label of the row reads
 * the same source ("name, below").
 * @param ctx - the row.
 * @param entry - the further label's id, or `MAIN_LABEL_ID` for the main label.
 * @returns the words, or "" when it has none yet.
 */
export function labelWords(ctx: RowContext, entry: string): string {
    const kind = TEXT_THINGS[ctx.side].label;
    const id = entry === MAIN_LABEL_ID ? undefined : entry;
    const source = sourceText(ctx, (id === undefined ? undefined : entryWords(ctx, id)) ?? lineIn(ctx, kind.words));
    const also = sharedWhere(ctx, kind, id);
    return also === "" || source === "" ? source : `${source}, ${also}`;
}
