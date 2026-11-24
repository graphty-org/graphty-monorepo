/**
 * A Style panel v2 row's name, shown above its control, and its name with its kind, which names its controls
 * ("Node card source"): ThingRow draws it and the Text "+" lists a label by it.
 */

import type { RowContext } from "../PropertyRow";
import type { KindMember } from "./kindGroups";
import { beneathEntry, entryName, entryOf, mainName } from "./labelEntries";
import { TEXT_THINGS } from "./labelRubric";
import type { ThingSpec } from "./things";

/**
 * A row's name and its name with its kind. A kind's row is named by its kind ("Glyph", "Target") everywhere, its
 * buttons too; a Label's look by its look ("Card", as "+" adds it, E196), its Text look keeping the thing's name; a
 * tooltip's or an external label's look keeps the thing's name. A further label is numbered, so each row's controls
 * have names of their own ("Node label 2 source").
 * @param ctx - the row.
 * @param thing - the thing.
 * @param kind - the kind it draws, if any.
 * @param entry - its further label, if any.
 * @param entry.id - the further label's id.
 * @param entry.n - its place among the labels.
 * @returns the name ("Card") and the title ("Node card").
 */
export function rowNames(
    ctx: RowContext,
    thing: ThingSpec,
    kind: KindMember | undefined,
    entry: { readonly id: string; readonly n: number } | undefined,
): { readonly name: string; readonly title: string } {
    const kindWord = ctx.side === "node" ? "Node" : "Edge";
    if (entry !== undefined) {
        // A further label's name is the reader's, else its look's and its number (labelEntries.ts).
        const name = entryName(ctx, entry.id, entry.n);
        const given = entryOf(ctx, entry.id)?.name ?? beneathEntry(ctx, entry.id)?.name;
        return { name, title: `${kindWord} ${given === undefined ? name.toLowerCase() : name}` };
    }
    // The main label goes by the name the reader gave it, else by its look's (a Glyph keeps its kind's).
    const given = thing.id === "label" && kind?.head === TEXT_THINGS[ctx.side].label.words ? mainName(ctx) : undefined;
    if (given !== undefined) {
        return { name: given, title: `${kindWord} ${given}` };
    }
    const named = kind !== undefined && kind.id !== "text" && (kind.look === undefined || thing.id === "label");
    const base = named ? kind.plainName : thing.name;
    return { name: base, title: `${kindWord} ${base.toLowerCase()}` };
}
