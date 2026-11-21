/**
 * A node's or an edge's further labels in Style panel v2 (ledger E234, E265): graphty-element's label list
 * (`node.labels`, `edge.labels`), one row per entry. An entry's words are its fixed `text` or a binding on its
 * field address `<target>.labels.<id>.text`; its look is its own `style`, merged over the main label's. Every
 * write lands on the row's topmost layer the reader may edit, as any other line does.
 */

import { type Channel, type LabelEntry, labelFieldAddress, MAIN_LABEL_ID } from "@graphty/graphty-element/catalog";
import type { LabelStyle } from "@graphty/graphty-element/schema";
import type { Encoding } from "@graphty/graphty-element/session";

import type { RowContext } from "../PropertyRow";
import { type DataBinding, type Line, lineIn, writeLine } from "../row";
import { TEXT_THINGS } from "./labelRubric";

/**
 * The label list channel of a kind.
 * @param side - nodes or edges.
 * @returns `node.labels` or `edge.labels`.
 */
export function listChannel(side: "node" | "edge"): Channel {
    return TEXT_THINGS[side].label?.list ?? `${side}.labels`;
}

/**
 * The list the row writes, as written.
 * @param ctx - the row.
 * @returns its entries, or none.
 */
function listOf(ctx: RowContext): readonly LabelEntry[] {
    const value = lineIn(ctx, listChannel(ctx.side))?.value;
    return Array.isArray(value) ? (value as readonly LabelEntry[]) : [];
}

/**
 * The further labels the row sets, each a row of its own: every entry but the main label's and those switched off.
 * @param ctx - the row.
 * @returns their ids, in the list's order.
 */
export function entryIds(ctx: RowContext): readonly string[] {
    return listOf(ctx)
        .filter((entry) => entry.id !== MAIN_LABEL_ID && entry.off !== true)
        .map((entry) => entry.id);
}

/**
 * One further label as the row writes it.
 * @param ctx - the row.
 * @param id - its id.
 * @returns the entry, or undefined before its first write.
 */
export function entryOf(ctx: RowContext, id: string): LabelEntry | undefined {
    return listOf(ctx).find((entry) => entry.id === id);
}

/**
 * Where a further label's words come from, as a line: the binding on its text address, else its fixed text.
 * @param ctx - the row.
 * @param id - its id.
 * @returns the line, or undefined when it draws the main label's words.
 */
export function entryWords(ctx: RowContext, id: string): Line | undefined {
    const bound = lineIn(ctx, labelFieldAddress(ctx.side, id, "text") as Channel);
    if (bound !== undefined) {
        return bound;
    }
    const entry = entryOf(ctx, id);
    const line = lineIn(ctx, listChannel(ctx.side));
    return entry?.text === undefined || line === undefined ? undefined : { layer: line.layer, value: entry.text };
}

/** A change to one further label: its words (fixed text or a binding) and its style, undefined keeping each. */
export interface EntryChange {
    readonly text?: string;
    readonly binding?: DataBinding;
    /** Its whole style; an empty one takes the style off. */
    readonly style?: Readonly<LabelStyle>;
}

/**
 * A new id for a further label, one no label on the stack nor a row waiting for its first value uses.
 * @param ctx - the row.
 * @param waiting - ids already handed to rows that wait.
 * @returns the id.
 */
export function freshEntryId(ctx: RowContext, waiting: readonly string[]): string {
    const layer = ctx.layers[0] ?? ctx.session.styles.list().find((each) => each.target === ctx.side);
    const base = layer === undefined ? "label-2" : ctx.session.styles.newLabelId(layer.id);
    let n = 1;
    let id = base;
    while (waiting.includes(id)) {
        n++;
        id = `${base}-${String(n)}`;
    }
    return id;
}

/**
 * Writes one further label, adding it to the list when it is new, as one undo step.
 * @param ctx - the row.
 * @param id - its id.
 * @param change - what changes.
 * @returns when it is written.
 */
export async function writeEntry(ctx: RowContext, id: string, change: EntryChange): Promise<void> {
    const list = listOf(ctx);
    const now: LabelEntry = list.find((entry) => entry.id === id) ?? { id };
    const style = change.style ?? now.style;
    const text = change.binding === undefined ? (change.text ?? now.text) : undefined;
    const next: LabelEntry = {
        id,
        ...(text === undefined ? {} : { text }),
        ...(style === undefined || Object.keys(style).length === 0 ? {} : { style }),
    };
    const entries = list.some((entry) => entry.id === id)
        ? list.map((entry) => (entry.id === id ? next : entry))
        : [...list, next];
    const address = labelFieldAddress(ctx.side, id, "text");
    await ctx.session.transaction(`changing ${ctx.side} label`, async (tx) => {
        const layer = await writeLine(tx, ctx.row, ctx.side, listChannel(ctx.side), { value: entries }, ctx.fresh);
        if (change.binding === undefined && change.text === undefined) {
            return;
        }
        // Fixed words take the binding off; a binding goes on the layer that holds the entry.
        const own = tx.styles.get(layer);
        const encode: Record<string, unknown> = { ...own?.encode };
        if (change.binding === undefined) {
            Reflect.deleteProperty(encode, address);
        } else {
            encode[address] = change.binding;
        }
        await tx.styles.update(layer, { set: own?.set, encode: encode as Encoding }, { keepEmpty: true });
    });
}

/**
 * Takes one further label off every layer of the row the reader may edit, its bindings with it, as one undo step.
 * @param ctx - the row.
 * @param id - its id.
 * @returns when it is done.
 */
export async function removeEntry(ctx: RowContext, id: string): Promise<void> {
    const channel = listChannel(ctx.side);
    const prefix = `${ctx.side}.labels.${id}.`;
    await ctx.session.transaction(`removing ${ctx.side} label`, async (tx) => {
        for (const { id: layer } of ctx.layers.filter((each) => !each.locked)) {
            const own = tx.styles.get(layer);
            const held = own?.set?.[channel];
            const entries = Array.isArray(held) ? (held as readonly LabelEntry[]) : [];
            const keys = Object.keys(own?.encode ?? {}).filter((key) => key.startsWith(prefix));
            if (own === undefined || (!entries.some((entry) => entry.id === id) && keys.length === 0)) {
                continue;
            }
            const rest = entries.filter((entry) => entry.id !== id);
            const set: Record<string, unknown> = { ...own.set, [channel]: rest };
            if (rest.length === 0) {
                Reflect.deleteProperty(set, channel);
            }
            const encode: Record<string, unknown> = { ...own.encode };
            keys.forEach((key) => Reflect.deleteProperty(encode, key));
            await tx.styles.update(layer, { set, encode: encode as Encoding }, { keepEmpty: true });
        }
    });
}
